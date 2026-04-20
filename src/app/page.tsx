'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, Shelf } from '@/lib/supabase';
import { 
  Search, 
  MapPin, 
  Plus, 
  ArrowRightLeft,
  ChevronDown,
  MoreVertical
} from 'lucide-react';

export default function Dashboard() {
  const [shelves, setShelves] = useState<(Shelf & { itemCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShelfCode, setNewShelfCode] = useState('');
  const [newShelfName, setNewShelfName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchShelves();
  }, []);

  async function fetchShelves() {
    setLoading(true);
    const { data: shelfData } = await supabase.from('shelves').select('*').order('code');
    if (shelfData) {
      const { data: counts } = await supabase.from('inventory_items').select('shelf_code');
      const countMap: Record<string, number> = {};
      counts?.forEach(c => { if(c.shelf_code) countMap[c.shelf_code] = (countMap[c.shelf_code] || 0) + 1; });
      setShelves(shelfData.map(s => ({ ...s, itemCount: countMap[s.code] || 0 })));
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newShelfCode) return;
    setIsCreating(true);
    const { error } = await supabase.from('shelves').insert({ code: newShelfCode, name: newShelfName });
    if (!error) {
      setIsModalOpen(false);
      setNewShelfCode('');
      setNewShelfName('');
      fetchShelves();
    }
    setIsCreating(false);
  }

  const filteredShelves = shelves.filter(s => 
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShelves: Record<string, typeof shelves> = {};
  filteredShelves.forEach(shelf => {
    const group = shelf.name && /^[\d\s]+$/.test(shelf.name) ? shelf.name : (shelf.itemCount > 0 ? 'DỰ ÁN' : 'KHÁC');
    if (!groupedShelves[group]) groupedShelves[group] = [];
    groupedShelves[group].push(shelf);
  });

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-20">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Section - Smaller scale */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <div className="bg-blue-50 p-1.5 rounded-lg">
                 <MapPin className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Sơ đồ vị trí kệ</h1>
            </div>
            <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Quản lý và theo dõi sức chứa kho hàng.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
              <ArrowRightLeft className="w-4 h-4" /> Chuyển Kệ
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#b91c1c] text-white px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-red-800 transition-all shadow-lg shadow-red-900/10"
            >
              <Plus className="w-4 h-4" /> Thêm Kệ
            </button>
          </div>
        </header>

        {/* Filter bar - More compact */}
        <div className="bg-slate-200/50 p-3 rounded-2xl border border-slate-200/50 mb-10 flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-64 relative text-sm">
             <select className="appearance-none w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm">
                <option>Cty - Kho CBS HCM</option>
             </select>
             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
          <div className="flex-1 w-full relative text-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Tìm tên kệ hoặc phân khu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-6 py-3 font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Groups - Reduced spacing */}
        {Object.entries(groupedShelves).sort((a,b) => b[1].length - a[1].length).map(([groupName, groupShelves]) => (
          <div key={groupName} className="mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{groupName}</h2>
              <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{groupShelves.length} VỊ TRÍ</span>
            </div>
            
            <div className="bg-slate-100/30 border border-slate-200/30 rounded-[2rem] p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {groupShelves.map((shelf) => (
                <Link 
                  href={`/shelves/${shelf.code}`}
                  key={shelf.id}
                  className={`relative group h-40 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-105 ${
                    shelf.itemCount > 0 
                      ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-900/20' 
                      : 'bg-white text-slate-900 border border-slate-200 hover:border-blue-500/50 shadow-sm'
                  }`}
                >
                  <p className="font-black text-xl tracking-tighter mb-2">{shelf.code}</p>
                  {shelf.name && (
                    <p className={`text-[9px] font-bold uppercase leading-tight line-clamp-2 px-1 ${shelf.itemCount > 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                      {shelf.name}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Compact */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-1">Thêm Kệ Mới</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-6">Nhập thông tin kệ.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">Mã định danh</label>
                <input 
                  autoFocus
                  placeholder="A-01..." 
                  value={newShelfCode}
                  onChange={(e) => setNewShelfCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-lg text-slate-800 placeholder:text-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">Tên / Dự án</label>
                <input 
                  placeholder="Tên dự án..." 
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 placeholder:text-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Hủy</button>
                <button disabled={isCreating} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  {isCreating ? '...' : 'TẠO KỆ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
