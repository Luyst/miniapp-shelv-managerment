'use client';

import { useState, useEffect } from 'react';
import { supabase, Shelf } from '@/lib/supabase';
import { Plus, Package, Hash, Tag } from 'lucide-react';

export default function ShelfManager() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [newShelfCode, setNewShelfCode] = useState('');
  const [newShelfName, setNewShelfName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchShelves();
  }, []);

  async function fetchShelves() {
    const { data, error } = await supabase
      .from('shelves')
      .select('*')
      .order('code', { ascending: true });
    
    if (data) setShelves(data);
    if (error) console.error('Error fetching shelves:', error);
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
      alert('Error creating shelf: ' + error.message);
    }
    setLoading(false);
  }

  return (
    <section className="animate-fade-in">
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
          <div key={shelf.id} className="premium-card flex flex-col justify-between">
            <div>
              <span className="text-primary font-mono text-sm font-bold uppercase tracking-wider">{shelf.code}</span>
              <p className="text-lg font-semibold mt-1">{shelf.name || 'Chưa đặt tên'}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
              <span>Đã tạo: {new Date(shelf.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {shelves.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-muted-foreground glass">
            Chưa có kệ nào được tạo.
          </div>
        )}
      </div>
    </section>
  );
}
