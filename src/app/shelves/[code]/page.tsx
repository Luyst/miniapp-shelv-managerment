'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Shelf, InventoryItem, Product } from '@/lib/supabase';
import { 
  ChevronLeft, 
  Trash2, 
  Barcode, 
  Search, 
  ChevronRight,
  Package,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ShelfDetail() {
  const { code } = useParams();
  const router = useRouter();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [shelfItems, setShelfItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'EMPTY' | 'PARTIAL' | 'FULL'>('EMPTY');

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchShelfData();
    fetchProducts();
  }, []);

  async function fetchShelfData() {
    const { data: shelfData } = await supabase
      .from('shelves')
      .select('*')
      .eq('code', code)
      .single();
    
    if (shelfData) {
      setShelf(shelfData);
      fetchItems();
    }
  }

  async function fetchItems() {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('shelf_code', code);
    
    if (data) {
      setShelfItems(data);
      if (data.length === 0) setStatus('EMPTY');
      else if (data.length > 5) setStatus('FULL');
      else setStatus('PARTIAL');
    }
  }

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, inventory_code, short_description')
      .limit(50);
    if (data) setProducts(data);
  }

  // Handle live search for products
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const { data } = await supabase
          .from('products')
          .select('id, inventory_code, short_description')
          .or(`short_description.ilike.%${searchQuery}%,inventory_code.ilike.%${searchQuery}%`)
          .limit(20);
        if (data) setProducts(data);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !scanValue.trim()) return;

    setIsSubmitting(true);
    const sn = scanValue.trim();

    try {
      const { error } = await supabase
        .from('inventory_items')
        .upsert({
          inventory_code: selectedProduct.inventory_code,
          product_name: selectedProduct.short_description,
          serial_number: sn,
          shelf_code: code as string,
          quantity: 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'serial_number' });

      if (error) throw error;
      
      setScanValue('');
      fetchItems();
      // Optional: keep focus for rapid scanning
      scanInputRef.current?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      alert('Lỗi khi quét: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (!error) fetchItems();
  };

  if (!shelf) return <div className="p-20 text-center animate-pulse">Đang tải thông tin kệ...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] animate-fade-in flex flex-col">
      {/* Header equivalent to top of Image 2 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="p-2 hover:bg-slate-50 rounded-full border border-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Package className="text-red-500 w-6 h-6" />
             </div>
             <h1 className="text-2xl font-black tracking-tight">Quản lý Kệ {shelf.code}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg flex">
             <button className={`px-4 py-1.5 text-xs font-bold rounded ${status === 'EMPTY' ? 'bg-white shadow text-slate-700' : 'text-slate-400'}`}>TRỐNG</button>
             <button className={`px-4 py-1.5 text-xs font-bold rounded ${status === 'PARTIAL' ? 'bg-white shadow text-slate-700' : 'text-slate-400'}`}>CÒN CHỖ</button>
             <button className={`px-4 py-1.5 text-xs font-bold rounded ${status === 'FULL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}>FULL</button>
          </div>
          <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Items in shelf (Image 2 style) */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Hàng trong kệ ({shelfItems.length})</h2>
           </div>

           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm / SKU</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số lượng</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {shelfItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                           <ChevronRight className="w-4 h-4 text-slate-300" />
                           <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm leading-snug">{item.product_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-tighter truncate">{item.inventory_code}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                           <span className="font-black text-lg text-slate-700">1</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right w-16">
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shelfItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center text-slate-400 italic">Kệ này hiện đang trống. Hãy thêm sản phẩm ở bên phải.</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>

        {/* Right Sidebar: Scanning and Selection (Image 2 style) */}
        <aside className="w-full lg:w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-10">
          <div className="p-6 border-b border-slate-100">
            <form onSubmit={handleScan} className="relative">
              <input
                ref={scanInputRef}
                type="text"
                placeholder="Quét Barcode / Serial..."
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                className={`pl-12 pr-4 py-4 text-lg font-medium rounded-xl border-2 transition-all ${
                  selectedProduct ? 'border-red-500/30' : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'
                }`}
                disabled={!selectedProduct}
              />
              <Barcode className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 ${selectedProduct ? 'text-red-500' : 'text-slate-300'}`} />
              {isSubmitting && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </form>
            {!selectedProduct && (
              <p className="text-[10px] text-center font-bold text-red-500 mt-2 uppercase tracking-tight flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> Chọn sản phẩm trước khi quét
              </p>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col overflow-hidden">
             <div className="mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Sẵn có trên sàn (2194)</p>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input
                     type="text"
                     placeholder="Tìm sản phẩm..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-10 py-2 text-sm bg-slate-50 border-slate-100"
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all relative flex items-start gap-3 ${
                      selectedProduct?.id === p.id 
                        ? 'border-red-500 bg-red-50/10' 
                        : 'border-slate-50 bg-white hover:border-slate-200'
                    }`}
                  >
                    <ChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 ${selectedProduct?.id === p.id ? 'text-red-500' : 'text-slate-100'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-[13px] leading-tight mb-2 pr-8">{p.short_description}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter truncate uppercase">{p.inventory_code}</p>
                    </div>
                    <div className="bg-red-50 text-red-500 text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 absolute top-4 right-4 group-hover:scale-110 transition-transform">
                       1
                    </div>
                  </button>
                ))}
             </div>
          </div>

          {selectedProduct && (
            <div className="p-6 bg-slate-900 animate-slide-up">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Đang chọn sản phẩm</p>
               <h3 className="text-white font-bold truncate mb-4">{selectedProduct.short_description}</h3>
               <button 
                 onClick={() => setSelectedProduct(null)}
                 className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
               >
                 Hủy chọn
               </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
