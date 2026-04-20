'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, InventoryItem, Shelf } from '@/lib/supabase';
import { Scan, Search, Check, AlertCircle, ShoppingBag, Barcode, ChevronRight } from 'lucide-react';

export default function ItemScanner() {
  const [products, setProducts] = useState<Pick<InventoryItem, 'inventory_code' | 'product_name'>[]>([]);
  const [shelves, setShelves] = useState<Pick<Shelf, 'code' | 'name'>[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Pick<InventoryItem, 'inventory_code' | 'product_name'> | null>(null);
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
    // Fetch unique products based on inventory_code
    const { data: items } = await supabase
      .from('inventory_items')
      .select('inventory_code, product_name')
      .order('product_name', { ascending: true });
    
    if (items) {
      // De-duplicate for selection
      const uniqueProducts: Pick<InventoryItem, 'inventory_code' | 'product_name'>[] = [];
      const seen = new Set<string>();
      items.forEach(item => {
        if (!seen.has(item.inventory_code)) {
          seen.add(item.inventory_code);
          uniqueProducts.push(item);
        }
      });
      setProducts(uniqueProducts);
    }

    const { data: shelfData } = await supabase.from('shelves').select('code, name');
    if (shelfData) setShelves(shelfData);
  }

  const filteredProducts = products.filter(p => 
    p.inventory_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!currentScan.trim()) return;
    
    if (!scannedSerials.includes(currentScan.trim())) {
      setScannedSerials(prev => [...prev, currentScan.trim()]);
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
      const updates = scannedSerials.map(serial => ({
        inventory_code: selectedProduct.inventory_code,
        product_name: selectedProduct.product_name,
        serial_number: serial,
        shelf_code: selectedShelfCode,
        quantity: 1, // Assumed 1 per serial
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('inventory_items').insert(updates);

      if (error) throw error;

      alert('Cập nhật thành công!');
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
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
            {filteredProducts.map(product => (
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
                    <p className="font-bold text-lg group-hover:text-primary transition-colors">{product.product_name}</p>
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
                <p className="font-bold">{selectedProduct.product_name}</p>
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
