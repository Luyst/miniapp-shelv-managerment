'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, Shelf } from '@/lib/supabase';
import { 
  Search, 
  Map as MapIcon, 
  Search as SearchIcon, 
  Filter, 
  RefreshCw, 
  Warehouse,
  ChevronDown
} from 'lucide-react';

export const dynamic = 'force-dynamic';

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

  async function handleCreateShelf(e: React.FormEvent) {
    e.preventDefault();
    if (!newShelfCode) return;
    
    setIsCreating(true);
    const { error } = await supabase
      .from('shelves')
      .insert({ code: newShelfCode, name: newShelfName });
    
    if (!error) {
      setNewShelfCode('');
      setNewShelfName('');
      setIsModalOpen(false);
      fetchShelves();
    } else {
      alert('Lỗi tạo kệ: ' + error.message);
    }
    setIsCreating(false);
  }

  async function fetchShelves() {
    setLoading(true);
    const { data: shelfData } = await supabase
      .from('shelves')
      .select('*')
      .order('code', { ascending: true });
    
    if (shelfData) {
      // Get item counts for occupancy calculation
      const { data: countData } = await supabase
        .from('inventory_items')
        .select('shelf_code');
      
      const counts: Record<string, number> = {};
      countData?.forEach(item => {
        if (item.shelf_code) {
          counts[item.shelf_code] = (counts[item.shelf_code] || 0) + 1;
        }
      });

      const shelvesWithCounts = shelfData.map(s => ({
        ...s,
        itemCount: counts[s.code] || 0
      }));
      setShelves(shelvesWithCounts);
    }
    setLoading(false);
  }

  const filteredShelves = shelves.filter(s => 
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const zones = ['Zone A: High-Velocity Picks', 'Zone B: Bulk Storage'];
  
  // Logic to determine status badge
  const getStatus = (count: number) => {
    if (count === 0) return { label: 'EMPTY', class: 'badge-empty' };
    if (count > 5) return { label: 'FULL', class: 'badge-full' };
    return { label: `${count * 20}%`, class: 'badge-partial' };
  };

  // Group shelves by Zone (A, B, etc.)
  const groupedShelves: Record<string, typeof filteredShelves> = {};
  filteredShelves.forEach(shelf => {
    const zoneLetter = shelf.code.split('-')[0] || 'Misc';
    const zoneName = `Zone ${zoneLetter}: ${zoneLetter === 'A' ? 'High-Velocity Picks' : zoneLetter === 'B' ? 'Bulk Storage' : 'Standard Storage'}`;
    if (!groupedShelves[zoneName]) groupedShelves[zoneName] = [];
    groupedShelves[zoneName].push(shelf);
  });

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in pb-32">
      {/* Header section equivalent to the top of Image 1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-2">
            Sơ đồ Vị trí Kệ <span className="text-slate-400 font-normal">(Shelves)</span>
          </h1>
          <p className="text-slate-500 mt-1">Quản lý sức chứa và định vị hàng hóa trong hệ thống logistics.</p>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
          <button className="text-sm px-4 py-2 bg-slate-50 border border-slate-200 rounded shadow-sm font-bold">2D Grid</button>
          <button className="text-sm px-4 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">3D View</button>
        </div>
      </div>

      {/* Filter Bar equivalent to the gray bar in Image 1 */}
      <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 w-full lg:w-auto min-w-[300px]">
          <Warehouse className="text-slate-400 w-5 h-5" />
          <span className="font-semibold text-slate-700 flex-1">Warehouse A - Ho Chi Minh City</span>
          <ChevronDown className="text-slate-400 w-4 h-4" />
        </div>
        
        <div className="relative flex-1 w-full">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by SKU, Zone, or Level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-3 bg-white border-slate-200"
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button className="secondary flex-1 lg:flex-none">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button onClick={fetchShelves} className="primary flex-1 lg:flex-none whitespace-nowrap">
            Refresh Map
          </button>
          <button onClick={() => setIsModalOpen(true)} className="primary px-4">
             Tạo Kệ
          </button>
        </div>
      </div>

      {/* Create Shelf Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <h2 className="text-2xl font-black mb-6">Tạo Kệ Mới</h2>
            <form onSubmit={handleCreateShelf} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Mã Kệ (Ví dụ: A-01)</label>
                <input 
                  autoFocus
                  required
                  value={newShelfCode}
                  onChange={(e) => setNewShelfCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã kệ..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tên / Ghi chú (Optional)</label>
                <input 
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="Nhập tên kệ..."
                />
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="secondary flex-1">Hủy</button>
                <button type="submit" disabled={isCreating} className="primary flex-1">
                  {isCreating ? 'Đang tạo...' : 'Tạo Kệ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Board equivalent to the 4 cards in Image 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="premium-card bg-white border-l-4 border-l-slate-900 border-border">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Capacity</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-slate-900">94%</span>
            <span className="text-xs font-bold text-green-500 mb-1">+2.4% vs LW</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-slate-900 h-full" style={{ width: '94%' }}></div>
          </div>
        </div>

        <div className="premium-card bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active SKU</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-slate-900">42</span>
            <span className="text-xs font-bold text-blue-500 mb-1">Optimal</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-none">Across 12 zones</p>
        </div>

        <div className="premium-card bg-slate-50/30">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Empty Shelves</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{shelves.filter(s => s.itemCount === 0).length}</span>
            <span className="text-xs font-bold text-slate-500 mb-1">Available</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-none">Zone C focus required</p>
        </div>

        <div className="premium-card bg-slate-900 text-white relative overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Audit Score</p>
          <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 rounded-full border-4 border-slate-700 flex items-center justify-center">
                <span className="font-bold">A+</span>
             </div>
             <p className="text-xs text-slate-400">Excellent maintenance record</p>
          </div>
          <div className="absolute top-0 right-0 p-4 font-black text-6xl opacity-5 text-white select-none">SCORE</div>
        </div>
      </div>

      {/* Shelf Sections equivalent to Zone A, Zone B in Image 1 */}
      {Object.entries(groupedShelves).sort().map(([zoneName, zoneShelves], idx) => (
        <section key={zoneName} className="mb-12">
          <div className="flex items-center gap-4 mb-6 relative">
            <h2 className="text-2xl font-black text-slate-800">{zoneName}</h2>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">LEVEL {idx * 4 + 1}-{idx * 4 + 4}</span>
            <div className="flex-1 border-b border-slate-100 ml-4"></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {zoneShelves.map((shelf) => {
              const status = getStatus(shelf.itemCount);
              return (
                <Link 
                  href={`/shelves/${shelf.code}`}
                  key={shelf.id} 
                  className={`premium-card p-4 h-32 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-all group ${status.class === 'badge-damaged' ? 'bg-red-50 border-red-100' : 'bg-slate-900'}`}
                  style={{
                    backgroundColor: status.class === 'badge-full' ? '#1e293b' : 
                                    status.class === 'badge-empty' ? '#ffffff' : 
                                    status.class === 'badge-damaged' ? '#fee2e2' : '#f8fafc',
                    borderColor: status.class === 'badge-empty' ? '#e2e8f0' : 'transparent',
                    boxShadow: status.class === 'badge-empty' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <p className={`text-[10px] font-black tracking-tighter mb-4 ${status.class === 'badge-full' ? 'text-slate-400' : 'text-slate-500'}`}>{shelf.code}</p>
                  <span className={`text-sm font-black tracking-widest ${
                    status.class === 'badge-full' ? 'text-white' : 
                    status.class === 'badge-empty' ? 'text-blue-600' : 
                    status.class === 'badge-damaged' ? 'text-red-700' : 'text-slate-700'
                  }`}>
                    {status.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {filteredShelves.length === 0 && !loading && (
        <div className="py-20 text-center text-slate-400 bg-white border border-slate-100 rounded-xl border-dashed">
          No shelves found. Click "Tạo Kệ" to add one.
        </div>
      )}

      {/* Legend equivalent to the floating box in Image 1 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-2xl rounded-xl p-3 flex items-center gap-6 z-20 animate-scale-in">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-900 rounded-sm"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Full Storage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-400 rounded-sm"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-slate-200 rounded-sm"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded-sm"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Maintenance</span>
        </div>
      </div>
    </main>
  );
}
