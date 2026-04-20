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
  AlertCircle,
  MoreVertical
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

  if (!shelf) return <div className="p-20 text-center font-bold animate-pulse text-slate-300">Đang tải dữ liệu kệ...</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans select-none">
      {/* Header (Image 2 top) */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-slate-50 sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-8">
          <button onClick={() => router.push('/')} className="bg-slate-50 p-2.5 rounded-full hover:bg-slate-100 transition-all border border-slate-100">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shadow-inner shadow-red-500/5">
                <Package className="text-red-500 w-7 h-7" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Quản lý Kệ {shelf.code}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shelf.name || 'VỊ TRÍ KHO'}</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-slate-100/50 p-1.5 rounded-2xl flex gap-1 border border-slate-100">
             <button className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${status === 'EMPTY' ? 'bg-white shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100' : 'text-slate-400'}`}>TRỐNG</button>
             <button className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${status === 'PARTIAL' ? 'bg-white shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100' : 'text-slate-400'}`}>CÒN CHỖ</button>
             <button className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${status === 'FULL' ? 'bg-[#1e293b] text-white shadow-xl shadow-slate-900/40' : 'text-slate-400'}`}>FULL</button>
          </div>
          <button className="bg-white border-2 border-red-50 p-3 text-red-500 rounded-2xl hover:bg-red-50 transition-all shadow-sm">
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/20">
        {/* Main Content: Shelf Inventory Table (Image 2 Left) */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10">
             <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Hàng trong kệ ({shelfItems.length})</h2>
             <div className="h-0.5 flex-1 bg-slate-50 mx-6"></div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/40 border-b border-slate-50">
                  <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10">Sản phẩm / SKU</th>
                  <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số lượng</th>
                  <th className="py-6"></th>
                </tr>
              </thead>
              <tbody>
                {shelfItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50/50">
                    <td className="py-8 pl-4 pr-6">
                      <div className="flex items-start gap-6">
                         <ChevronRight className="w-5 h-5 text-slate-100 mt-1" />
                         <div className="min-w-0 pr-4">
                            <p className="font-black text-slate-800 text-[16px] leading-tight mb-2 line-clamp-2">{item.product_name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">{item.inventory_code}</p>
                         </div>
                      </div>
                    </td>
                    <td className="py-8 text-center">
                      <span className="text-2xl font-black text-slate-800 tracking-tighter">1</span>
                    </td>
                    <td className="py-8 text-right pr-10">
                      <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-3 text-slate-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                         <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {shelfItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-44 text-center text-slate-200 font-bold uppercase tracking-widest text-xs">Kệ đang trống • Hãy chọn sản phẩm và quét để nhập</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Scanning Panel (Image 2 Right) */}
        <aside className="w-full lg:w-[540px] bg-white border-l border-slate-50 flex flex-col shadow-[-40px_0_100px_-40px_rgba(30,41,59,0.05)]">
           {/* Scan Area */}
           <div className="p-10 border-b border-slate-50 bg-white pt-12">
              <form onSubmit={handleScan} className="relative group">
                 <input 
                   ref={scanInputRef}
                   disabled={!selectedProduct}
                   value={scanValue}
                   onChange={(e) => setScanValue(e.target.value)}
                   placeholder="Quét Barcode / Serial..."
                   className={`w-full bg-slate-50 border-4 py-6 pl-16 pr-8 rounded-[2rem] text-xl font-black transition-all shadow-inner ${
                     selectedProduct ? 'border-red-600 ring-[12px] ring-red-500/5 bg-white' : 'border-slate-50 opacity-40 cursor-not-allowed'
                   } focus:outline-none placeholder:text-slate-200 text-slate-900 group-hover:border-red-600/50`}
                 />
                 <Barcode className={`absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 ${selectedProduct ? 'text-red-600' : 'text-slate-100'}`} />
                 {isSubmitting && <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin rounded-full h-6 w-6 border-4 border-red-600 border-t-transparent"></div>}
              </form>
              {!selectedProduct && (
                <div className="mt-4 flex items-center justify-center gap-3 text-[11px] font-black text-red-500 uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4" /> Chọn sản phẩm sẳn có trước khi quét
                </div>
              )}
           </div>

           {/* Product Catalog */}
           <div className="p-10 flex-1 flex flex-col overflow-hidden">
              <div className="mb-10 text-center">
                 <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Sản có trên sàn (2194)</h2>
                 <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
                    <input 
                      type="text" 
                      placeholder="Tìm tên hoặc mã hàng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-16 pr-8 py-4 text-sm font-black shadow-inner focus:outline-none focus:border-blue-500/20 focus:bg-white transition-all placeholder:text-slate-200"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
                 {products.map((p) => (
                   <button 
                     key={p.id}
                     onClick={() => setSelectedProduct(p)}
                     className={`w-full text-left p-6 rounded-[2rem] border-4 transition-all duration-300 relative group flex items-start gap-6 ${
                       selectedProduct?.id === p.id 
                         ? 'border-red-600 bg-white shadow-2xl shadow-red-900/10' 
                         : 'border-white bg-[#fafbfc] hover:border-slate-50 hover:bg-white shadow-sm'
                     }`}
                   >
                     <ChevronRight className={`w-5 h-5 mt-1 transition-colors ${selectedProduct?.id === p.id ? 'text-red-600' : 'text-slate-100'}`} />
                     <div className="flex-1 min-w-0 pr-10">
                        <p className="font-black text-slate-800 text-[14px] leading-tight mb-2 uppercase line-clamp-2">{p.short_description}</p>
                        <p className="text-[11px] font-black text-slate-400 tracking-widest font-mono">{p.inventory_code}</p>
                     </div>
                     <div className="bg-red-50 text-red-600 text-[11px] font-black w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 absolute top-6 right-6 group-hover:scale-110 transition-all shadow-sm">
                        1
                     </div>
                   </button>
                 ))}
              </div>
           </div>

           {/* Active Selection Overlay (Image 2 Bottom Style) */}
           {selectedProduct && (
             <div className="p-10 bg-slate-900 border-t-8 border-red-600 animate-in slide-in-from-bottom-full duration-700 ease-out z-40">
                <div className="flex items-center gap-4 mb-6">
                   <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-900/20">
                      <Package className="text-white w-6 h-6" />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 opacity-60">Sản phẩm đang được chọn</p>
                      <h3 className="text-white font-black truncate text-lg tracking-tight uppercase leading-none">{selectedProduct.short_description}</h3>
                   </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[11px] font-black hover:bg-red-600 hover:text-white transition-all uppercase tracking-[0.2em] shadow-lg">
                  Hủy chọn & Đổi hàng
                </button>
             </div>
           )}
        </aside>
      </div>
    </div>
  );
}
