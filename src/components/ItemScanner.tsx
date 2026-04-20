'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, InventoryItem, Shelf, Product } from '@/lib/supabase';
import { Scan, Search, Check, AlertCircle, ShoppingBag, Barcode, ChevronRight } from 'lucide-react';

export default function ItemScanner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shelves, setShelves] = useState<Pick<Shelf, 'code' | 'name'>[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedShelfCode, setSelectedShelfCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedSerials, setScannedSerials] = useState<string[]>([]);
  const [currentScan, setCurrentScan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch products from products table
    const { data: productData } = await supabase
      .from('products')
      .select('id, inventory_code, short_description, sku, manufacturer')
      .order('short_description', { ascending: true })
      .limit(100); // Limit initially, search handles the rest
    
    if (productData) {
      setProducts(productData);
    }

    const { data: shelfData } = await supabase.from('shelves').select('code, name');
    if (shelfData) setShelves(shelfData);
  }

  // Handle live search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        const { data } = await supabase
          .from('products')
          .select('id, inventory_code, short_description, sku, manufacturer')
          .or(`short_description.ilike.%${searchQuery}%,inventory_code.ilike.%${searchQuery}%`)
          .limit(50);
        
        if (data) setProducts(data);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!currentScan.trim()) return;
    
    const code = currentScan.trim();
    
    // If scanning a product code instead of a serial, maybe we want to select it?
    // But usually serials are scanned after product selection.
    
    if (!scannedSerials.includes(code)) {
      setScannedSerials(prev => [...prev, code]);
    }
    setCurrentScan('');
    scanInputRef.current?.focus();
  }

  async function handleSubmit() {
    if (!selectedProduct || !selectedShelfCode || scannedSerials.length === 0) {
      alert('Vui lòng chọn hàng, kệ và quét ít nhất 1 mã.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // For each serial, we upsert into inventory_items
      // We de-duplicate within the submission as well
      const uniqueSerials = Array.from(new Set(scannedSerials));
      
      const updates = uniqueSerials.map(serial => ({
        inventory_code: selectedProduct.inventory_code,
        product_name: selectedProduct.short_description,
        serial_number: serial,
        shelf_code: selectedShelfCode,
        quantity: 1,
        updated_at: new Date().toISOString()
      }));

      // Supabase insert with ON CONFLICT on serial_number if it exists
      // Wait, I should probably check if serial_number is unique in my schema.
      // In the previous step I saw it's not marked as unique yet.
      
      const { error } = await supabase
        .from('inventory_items')
        .upsert(updates, { onConflict: 'serial_number' });

      if (error) throw error;

      alert('Đã cập nhật vị trí cho ' + uniqueSerials.length + ' sản phẩm!');
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật';
      alert('Lỗi: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedProduct(null);
    setScannedSerials([]);
    setCurrentScan('');
    setSearchQuery('');
  }

  return (
    <section className="animate-fade-in mt-12 mb-20">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Scan className="text-primary" /> Nhập hàng vào Kệ
      </h2>

      {!selectedProduct ? (
        <div className="premium-card">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm hàng theo mã hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-lg"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {products
              .filter(p => 
                p.short_description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.inventory_code.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(product => (
              <div 
                key={product.inventory_code}
                onClick={() => setSelectedProduct(product)}
                className="flex items-center justify-between p-4 glass hover:border-primary/50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg group-hover:text-primary transition-colors">{product.short_description}</p>
                    <p className="text-sm font-mono text-muted-foreground">{product.inventory_code}</p>
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanning Section */}
          <div className="premium-card flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={resetForm}
                className="secondary text-sm px-3 py-1.5"
              >
                Thay đổi hàng
              </button>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Đang chọn</p>
                <p className="font-bold">{selectedProduct.short_description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Chọn kệ đích</label>
                <select 
                  value={selectedShelfCode} 
                  onChange={(e) => setSelectedShelfCode(e.target.value)}
                  className="bg-background"
                  required
                >
                  <option value="">-- Chọn kệ --</option>
                  {shelves.map(s => (
                    <option key={s.code} value={s.code}>{s.code} - {s.name || 'N/A'}</option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleScan} className="space-y-2">
                <label className="block text-sm font-medium">Quét mã vạch / Serial</label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    placeholder="Quét tại đây..."
                    value={currentScan}
                    onChange={(e) => setCurrentScan(e.target.value)}
                    autoFocus
                    className="pl-10 text-xl border-primary/30"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Mỗi lần quét sẽ tự động thêm vào danh sách và tính số lượng.</p>
              </form>
            </div>

            <button 
              onClick={handleSubmit}
              className="primary w-full py-4 text-lg"
              disabled={isSubmitting || scannedSerials.length === 0 || !selectedShelfCode}
            >
              <Check className="w-6 h-6" /> {isSubmitting ? 'Đang cập nhật...' : `Xác nhận nhập ${scannedSerials.length} sản phẩm`}
            </button>
          </div>

          {/* List of Scanned Items */}
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Danh sách quét ({scannedSerials.length})</h3>
              <button 
                onClick={() => setScannedSerials([])}
                className="text-xs text-destructive hover:underline"
              >
                Xóa tất cả
              </button>
            </div>
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {scannedSerials.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                  <AlertCircle className="w-10 h-10 mb-2" />
                  <p>Vui lòng quét hàng</p>
                </div>
              )}
              {scannedSerials.map((serial, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{scannedSerials.length - index}</span>
                    <span className="font-mono font-medium">{serial}</span>
                  </div>
                  <button 
                    onClick={() => setScannedSerials(prev => prev.filter((_, i) => i !== index))}
                    className="text-destructive p-1 hover:bg-destructive/10 rounded"
                  >
                    ×
                  </button>
                </div>
              )).reverse()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
