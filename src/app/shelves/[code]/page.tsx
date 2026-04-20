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
    const { data } = await supabase.from('shelves').select('*').eq('code', code).single();
    if (data) {
      setShelf(data);
      fetchItems();
    }
  }

  async function fetchItems() {
    const { data } = await supabase.from('inventory_items').select('*').eq('shelf_code', code);
    if (data) {
      setShelfItems(data);
      if (data.length === 0) setStatus('EMPTY');
      else if (data.length > 5) setStatus('FULL');
      else setStatus('PARTIAL');
    }
  }

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').limit(20);
    if (data) setProducts(data);
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .or(`short_description.ilike.%${searchQuery}%,inventory_code.ilike.%${searchQuery}%`)
          .limit(20);
        if (data) setProducts(data);
      } else {
        fetchProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !scanValue) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('inventory_items').upsert({
      inventory_code: selectedProduct.inventory_code,
      product_name: selectedProduct.short_description,
      serial_number: scanValue,
      shelf_code: code as string,
      quantity: 1
    }, { onConflict: 'serial_number' });
    
    if (!error) {
      setScanValue('');
      fetchItems();
      scanInputRef.current?.focus();
    } else {
      alert('Lỗi: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (!error) fetchItems();
  };

  if (!shelf) return <div className="p-10 text-center font-bold animate-pulse text-slate-300 text-sm">Đang tải...</div>;

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-50">
      {/* Header - More Compact */}
      <header className="px-6 py-3 flex items-center justify-between border-b border-slate-200 bg-white z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="bg-slate-50 p-1.5 rounded-lg hover:bg-slate-100 transition-all border border-slate-200">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Package className="text-red-500 w-6 h-6" />
             </div>
             <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-0.5">Kệ {shelf.code}</h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{shelf.name || 'VỊ TRÍ KHO'}</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-0.5 border border-slate-200">
             <button className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${status === 'EMPTY' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>TRỐNG</button>
             <button className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${status === 'PARTIAL' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>CÒN CHỖ</button>
             <button className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${status === 'FULL' ? 'bg-[#1e293b] text-white shadow' : 'text-slate-400'}`}>FULL</button>
          </div>
          <button className="bg-white border border-red-50 p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content: Left Scrollable Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hàng trong kệ ({shelfItems.length})</h2>
             <div className="h-px flex-1 bg-slate-200/50 mx-4"></div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-6">Sản phẩm / SKU</th>
                  <th className="py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Số lượng</th>
                  <th className="py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shelfItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                    <td className="py-4 pl-4 pr-4">
                      <div className="flex items-start gap-4">
                         <ChevronRight className="w-4 h-4 text-slate-200 mt-1" />
                         <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{item.product_name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mt-1">{item.inventory_code}</p>
                         </div>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-lg font-black text-slate-800">1</span>
                    </td>
                    <td className="py-4 text-right pr-6">
                      <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all">
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {shelfItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-32 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Kệ trống</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fixed Right Sidebar: 100vh - header height */}
        <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col h-full shrink-0">
           {/* Section 1: Scan Bar (Fixed at top of sidebar) */}
           <div className="p-6 border-b border-slate-100 bg-white shrink-0">
              <form onSubmit={handleScan} className="relative">
                 <input 
                   ref={scanInputRef}
                   disabled={!selectedProduct}
                   value={scanValue}
                   onChange={(e) => setScanValue(e.target.value)}
                   placeholder="Quét Barcode / Serial..."
                   className={`w-full bg-slate-50 border-2 py-4 pl-12 pr-6 rounded-xl text-base font-bold transition-all ${
                     selectedProduct ? 'border-red-600 ring-4 ring-red-500/5 bg-white' : 'border-slate-50 opacity-50'
                   } focus:outline-none placeholder:text-slate-200 text-slate-900`}
                 />
                 <Barcode className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 ${selectedProduct ? 'text-red-600' : 'text-slate-100'}`} />
                 {isSubmitting && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>}
              </form>
           </div>

           {/* Section 2: Catalog (Scrollable) */}
           <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 pb-2">
                 <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-center">Sản có trên sàn (2194)</h2>
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Tìm tên hoặc mã hàng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-200"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-2">
                 {products.map((p) => (
                   <button 
                     key={p.id}
                     onClick={() => setSelectedProduct(p)}
                     className={`w-full text-left p-4 rounded-xl border-2 transition-all relative group flex items-start gap-4 ${
                       selectedProduct?.id === p.id 
                         ? 'border-red-600 bg-white shadow-md' 
                         : 'border-white bg-slate-50/50 hover:bg-white hover:border-slate-100'
                     }`}
                   >
                     <ChevronRight className={`w-4 h-4 mt-0.5 transition-colors ${selectedProduct?.id === p.id ? 'text-red-600' : 'text-slate-100'}`} />
                     <div className="flex-1 min-w-0 pr-6">
                        <p className="font-bold text-slate-700 text-xs leading-tight mb-1 line-clamp-2">{p.short_description}</p>
                        <p className="text-[9px] font-black text-slate-400 tracking-wider font-mono uppercase">{p.inventory_code}</p>
                     </div>
                   </button>
                 ))}
              </div>
           </div>

           {/* Section 3: Active Selection Layer (Fixed at bottom) */}
           {selectedProduct && (
             <div className="p-6 bg-slate-900 border-t-4 border-red-600 animate-in slide-in-from-bottom-full duration-500 shrink-0">
                <div className="flex items-center gap-3 mb-4">
                   <div className="bg-red-600 p-2 rounded-lg">
                      <Package className="text-white w-4 h-4" />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Sản phẩm đang chọn</p>
                      <h3 className="text-white font-bold truncate text-sm leading-tight uppercase">{selectedProduct.short_description}</h3>
                   </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="w-full bg-slate-800 text-slate-400 py-3 rounded-lg text-[9px] font-black hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest">
                  Hủy chọn
                </button>
             </div>
           )}
        </aside>
      </div>
    </div>
  );
}
