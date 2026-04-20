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

  // Filter and then group
  const filteredShelves = shelves.filter(s => 
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic Grouping Logic: Default to 'CHUNG' if no category
  const groupedShelves: Record<string, typeof shelves> = {};
  filteredShelves.forEach(shelf => {
    const group = shelf.name && /^[\d\s]+$/.test(shelf.name) ? shelf.name : (shelf.itemCount > 0 ? 'DỰ ÁN' : 'KHÁC');
    if (!groupedShelves[group]) groupedShelves[group] = [];
    groupedShelves[group].push(shelf);
  });

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto p-4 md:p-10">
        {/* Header Section (Image 1 top) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <div className="bg-blue-50 p-2 rounded-xl">
                 <MapPin className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Sơ đồ vị trí kệ</h1>
            </div>
            <p className="text-slate-400 font-semibold text-sm">Quản lý và theo dõi sức chứa kho hàng.</p>
          </div>
          <div className="flex gap-4">
            <button className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
              <ArrowRightLeft className="w-5 h-5" /> Chuyển Kệ
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#b91c1c] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-red-800 transition-all shadow-xl shadow-red-900/10"
            >
              <Plus className="w-5 h-5" /> Thêm Kệ
            </button>
          </div>
        </header>

        {/* Filter bar Section (Image 1 sub-header) */}
        <div className="bg-slate-50/50 p-4 rounded-[2.5rem] border-2 border-slate-50 mb-12 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-80 relative">
             <select className="appearance-none w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm">
                <option>Cty - Kho CBS HCM</option>
             </select>
             <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
          <div className="flex-1 w-full relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
            <input 
              type="text" 
              placeholder="Tìm tên kệ hoặc phân khu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-16 pr-8 py-4 font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Dynamic Groups (Image 1 main area) */}
        {Object.entries(groupedShelves).sort((a,b) => b[1].length - a[1].length).map(([groupName, groupShelves]) => (
          <div key={groupName} className="mb-16">
            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-slate-800">{groupName}</h2>
              <span className="text-[11px] font-black uppercase text-blue-600 bg-blue-50/50 border border-blue-100 px-3 py-1 rounded-full">{groupShelves.length} VỊ TRÍ</span>
            </div>
            
            <div className="bg-slate-50/30 border-2 border-slate-50 rounded-[3rem] p-10 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8">
              {groupShelves.map((shelf) => (
                <Link 
                  href={`/shelves/${shelf.code}`}
                  key={shelf.id}
                  className={`relative group h-56 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center transition-all duration-500 hover:-translate-y-2 ${
                    shelf.itemCount > 0 
                      ? 'bg-[#0f172a] text-white shadow-2xl shadow-slate-900/40' 
                      : 'bg-white text-slate-900 border-2 border-white hover:border-slate-100 shadow-xl shadow-slate-200/20'
                  }`}
                >
                  <p className="font-black text-2xl tracking-tighter mb-4">{shelf.code}</p>
                  {shelf.name && (
                    <p className={`text-[11px] font-bold uppercase leading-tight line-clamp-3 px-2 ${shelf.itemCount > 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                      {shelf.name}
                    </p>
                  )}
                  <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5 text-slate-500" />
                  </div>
                </Link>
              ))}
              {groupShelves.length === 0 && (
                <div className="col-span-full py-20 flex items-center justify-center text-slate-300 italic text-lg font-bold">Không có dữ liệu</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for adding shelf */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Thêm Kệ Mới</h2>
            <p className="text-slate-400 font-bold text-sm mb-8">Nhập thông tin để tạo vị trí lưu trữ mới.</p>
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1">Mã định danh (VD: A-01)</label>
                <input 
                  autoFocus
                  placeholder="Nhập mã kệ..." 
                  value={newShelfCode}
                  onChange={(e) => setNewShelfCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xl text-slate-800 placeholder:text-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1">Tên / Dự án (Tùy chọn)</label>
                <input 
                  placeholder="Nhập tên hoặc phân khu..." 
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 placeholder:text-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all">Hủy</button>
                <button disabled={isCreating} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  {isCreating ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
