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
  ChevronDown,
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
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

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
    if (data) setShelfItems(data);
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

  const toggleExpand = (code: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) newExpanded.delete(code);
    else newExpanded.add(code);
    setExpandedCodes(newExpanded);
  };

  // Aggregation logic
  const aggregatedItems = shelfItems.reduce((acc, item) => {
    const existing = acc.find(a => a.inventory_code === item.inventory_code);
    if (existing) {
      existing.count += 1;
      existing.items.push(item);
    } else {
      acc.push({
        inventory_code: item.inventory_code,
        product_name: item.product_name,
        count: 1,
        items: [item]
      });
    }
    return acc;
  }, [] as { inventory_code: string; product_name: string; count: number; items: InventoryItem[] }[]);

  if (!shelf) return <div className="p-10 text-center font-bold animate-pulse text-slate-300 text-sm italic">Đang tải dữ liệu...</div>;

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="px-6 py-3 flex items-center justify-between border-b border-slate-200 bg-white z-40 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="bg-slate-50 p-1.5 rounded-lg hover:bg-slate-100 transition-all border border-slate-200">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Package className="text-red-500 w-6 h-6" />
             </div>
             <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-0.5 uppercase">Kệ {shelf.code}</h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{shelf.name || 'HÀNG TRONG KỆ'}</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-wider">
             Tổng cộng: {shelfItems.length} sản phẩm
           </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Shelf Items (Scrollable) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
           <div className="p-6 pb-2 shrink-0">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Hàng trong kệ ({aggregatedItems.length} loại)</h2>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-4">
              {aggregatedItems.map((group) => (
                <div key={group.inventory_code} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Summary Row */}
                  <div 
                    onClick={() => toggleExpand(group.inventory_code)}
                    className="p-5 flex items-center justify-between cursor-pointer group hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 pr-10">
                       <div className="mt-1 transition-transform duration-300" style={{ transform: expandedCodes.has(group.inventory_code) ? 'rotate(90deg)' : 'none' }}>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
                       </div>
                       <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2 uppercase">{group.product_name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mt-1">{group.inventory_code}</p>
                       </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-center min-w-[60px] shadow-inner">
                       <span className="text-lg font-black text-slate-800 leading-none">{group.count}</span>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {expandedCodes.has(group.inventory_code) && (
                    <div className="border-t border-slate-50 bg-slate-50/20 px-5 divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between group/item">
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/item:bg-red-400"></div>
                             <span className="text-[11px] font-bold text-slate-500 font-mono">SERIAL: {item.serial_number}</span>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100">
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {aggregatedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-32 text-slate-300">
                   <Package className="w-12 h-12 mb-4 opacity-50" />
                   <p className="text-xs font-bold uppercase tracking-widest italic">Kệ chưa có hàng hóa</p>
                </div>
              )}
           </div>
        </div>

        {/* Right Side: Sidebar (Fixed) */}
        <aside className="w-[440px] bg-white flex flex-col h-full shrink-0 shadow-[-10px_0_30px_-10px_rgba(30,41,59,0.03)]">
           <div className="p-6 border-b border-slate-100 shrink-0">
              <form onSubmit={handleScan} className="relative">
                 <input 
                   ref={scanInputRef}
                   disabled={!selectedProduct}
                   value={scanValue}
                   onChange={(e) => setScanValue(e.target.value)}
                   placeholder="Quét Barcode / Serial..."
                   className={`w-full bg-slate-50 border-2 py-4 pl-12 pr-6 rounded-xl text-base font-bold transition-all ${
                     selectedProduct ? 'border-red-600 ring-4 ring-red-500/5 bg-white' : 'border-slate-50 opacity-40 cursor-not-allowed'
                   } focus:outline-none placeholder:text-slate-200 text-slate-900 shadow-inner`}
                 />
                 <Barcode className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 ${selectedProduct ? 'text-red-600' : 'text-slate-100'}`} />
                 {isSubmitting && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>}
              </form>
              {!selectedProduct && (
                 <p className="mt-3 text-[9px] font-black text-red-500 uppercase tracking-widest text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Chọn hàng trước khi quét
                 </p>
              )}
           </div>

           <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 pb-2 shrink-0">
                 <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-center">Sản có trên sàn (2194)</h2>
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                    <input 
                      type="text" 
                      placeholder="Tìm theo tên hoặc SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-200 shadow-sm"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-3">
                 {products.map((p) => (
                   <button 
                     key={p.id}
                     onClick={() => setSelectedProduct(p)}
                     className={`w-full text-left p-4 rounded-xl border-2 transition-all relative group flex items-start gap-4 ${
                       selectedProduct?.id === p.id 
                         ? 'border-red-600 bg-white shadow-md' 
                         : 'border-white bg-slate-50/50 hover:bg-white hover:border-slate-100 shadow-sm'
                     }`}
                   >
                     <div className={`mt-0.5 p-1 rounded ${selectedProduct?.id === p.id ? 'bg-red-50 text-red-600' : 'text-slate-200'}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                     </div>
                     <div className="flex-1 min-w-0 pr-6">
                        <p className="font-extrabold text-slate-700 text-[11px] leading-tight mb-1 uppercase line-clamp-2">{p.short_description}</p>
                        <p className="text-[9px] font-black text-slate-400 tracking-wider font-mono uppercase truncate">{p.inventory_code}</p>
                     </div>
                   </button>
                 ))}
              </div>
           </div>

           {selectedProduct && (
             <div className="p-6 bg-slate-900 border-t-4 border-red-600 animate-in slide-in-from-bottom-full duration-500 shrink-0 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                   <div className="bg-red-600 p-2 rounded-lg">
                      <Package className="text-white w-4 h-4" />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 opacity-60">Sản phẩm đang được chọn</p>
                      <h3 className="text-white font-bold truncate text-sm leading-tight uppercase tracking-tight">{selectedProduct.short_description}</h3>
                   </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="w-full bg-slate-800 text-slate-400 py-3 rounded-lg text-[9px] font-black hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest">
                  Hủy chọn & Đổi hàng
                </button>
             </div>
           )}
        </aside>
      </div>
    </div>
  );
}
