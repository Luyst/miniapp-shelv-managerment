import ShelfManager from '@/components/ShelfManager';
import ItemScanner from '@/components/ItemScanner';
import { LayoutDashboard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="container min-h-screen">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between py-12 gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <LayoutDashboard className="w-8 h-8" />
            <span className="font-bold tracking-widest text-sm uppercase">Mini App</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">
            SHELF MANAGER
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Hệ thống quản lý kệ hàng và nhập kho quét mã chuyên dụng.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass p-4 flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
              <span className="font-bold text-sm">Supabase Sync Live</span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-16">
        <ShelfManager />
        
        <div className="border-t border-white/5 pt-16">
          <ItemScanner />
        </div>
      </div>

      <footer className="py-20 text-center text-muted-foreground text-sm border-t border-white/5">
        <p>© 2026 Shelf Manager Mini-App • Built with Next.js & Supabase</p>
      </footer>
    </main>
  );
}
