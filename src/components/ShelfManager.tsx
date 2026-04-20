'use client';

import { useState, useEffect } from 'react';
import { supabase, Shelf, InventoryItem } from '@/lib/supabase';
import { Plus, Package, Hash, Tag, Info, X } from 'lucide-react';

export default function ShelfManager() {
  const [shelves, setShelves] = useState<(Shelf & { itemCount?: number })[]>([]);
  const [newShelfCode, setNewShelfCode] = useState('');
  const [newShelfName, setNewShelfName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [shelfItems, setShelfItems] = useState<InventoryItem[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    fetchShelves();
  }, []);

  async function fetchShelves() {
    const { data: shelfData, error: shelfError } = await supabase
      .from('shelves')
      .select('*')
      .order('code', { ascending: true });
    
    if (shelfError) {
      console.error('Error fetching shelves:', shelfError);
      return;
    }

    // Fetch counts from inventory_items
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

  async function createShelf(e: React.FormEvent) {
    e.preventDefault();
    if (!newShelfCode) return;

    setLoading(true);
    const { error } = await supabase
      .from('shelves')
      .insert([{ code: newShelfCode, name: newShelfName }]);

    if (!error) {
      setNewShelfCode('');
      setNewShelfName('');
      fetchShelves();
    } else {
      alert('Lỗi tạo kệ: ' + error.message);
    }
    setLoading(false);
  }

  async function viewShelfDetails(shelf: Shelf) {
    setSelectedShelf(shelf);
    setIsDetailLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('shelf_code', shelf.code);
    
    if (data) setShelfItems(data);
    if (error) console.error('Error fetching items:', error);
    setIsDetailLoading(false);
  }

  return (
    <section className="animate-fade-in relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="text-primary" /> Quản lý Kệ
        </h2>
      </div>

      <form onSubmit={createShelf} className="premium-card mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">Mã Kệ</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="VD: KE-01"
              value={newShelfCode}
              onChange={(e) => setNewShelfCode(e.target.value.toUpperCase())}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">Tên Kệ (Tùy chọn)</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="VD: Kệ hàng A"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <button type="submit" className="primary w-full" disabled={loading}>
          <Plus className="w-5 h-5" /> {loading ? 'Đang tạo...' : 'Tạo Kệ Mới'}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shelves.map((shelf) => (
          <div 
            key={shelf.id} 
            className="premium-card flex flex-col justify-between hover:border-primary/50 cursor-pointer transition-all group"
            onClick={() => viewShelfDetails(shelf)}
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-primary font-mono text-sm font-bold uppercase tracking-wider">{shelf.code}</span>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {shelf.itemCount} sp
                </span>
              </div>
              <p className="text-lg font-semibold mt-1 group-hover:text-primary transition-colors">{shelf.name || 'Chưa đặt tên'}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Đã tạo: {new Date(shelf.created_at).toLocaleDateString()}</span>
              <Info className="w-3 h-3 group-hover:text-primary" />
            </div>
          </div>
        ))}
        {shelves.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-muted-foreground glass">
            Chưa có kệ nào được tạo.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedShelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedShelf(null)} />
          <div className="relative premium-card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Chi tiết Kệ {selectedShelf.code}</h3>
                <p className="text-sm text-muted-foreground">{selectedShelf.name}</p>
              </div>
              <button 
                onClick={() => setSelectedShelf(null)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {isDetailLoading ? (
                <div className="py-20 text-center animate-pulse text-muted-foreground">Đang tải danh sách hàng...</div>
              ) : shelfItems.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">Kệ này hiện đang trống.</div>
              ) : (
                <div className="space-y-3">
                  {shelfItems.map((item) => (
                    <div key={item.id} className="glass p-4">
                      <p className="font-bold">{item.product_name}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground font-mono">
                        <span>INV: {item.inventory_code}</span>
                        <span>SN: {item.serial_number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
