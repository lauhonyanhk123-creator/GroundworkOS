import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, Briefcase, FileText, Receipt, Calendar,
  Users, HardHat, FolderOpen, BarChart3, Settings,
  Menu, Bell, X, Truck, Search,
} from 'lucide-react';
import { GlobalSearch } from '../ui/GlobalSearch';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { gap: true },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { gap: true },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Subcontractors', href: '/subcontractors', icon: HardHat },
  { gap: true },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Plant', href: '/plant', icon: Truck },
  { gap: true },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const currentPage = navigation.find(
    item => 'href' in item && (location === item.href || (item.href !== '/' && location.startsWith(item.href)))
  );
  const pageTitle = currentPage && 'name' in currentPage ? currentPage.name : 'Dashboard';

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a', color: '#e2e2e2' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ backgroundColor: '#0f0f0f', borderRight: '1px solid #1a1a1a' }}>

        <div className="h-14 flex items-center justify-between px-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ border: '1.5px solid #FFD600' }}>
              <span className="text-xs font-bold" style={{ color: '#FFD600', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>G</span>
            </div>
            <span className="text-base font-bold tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e2e2e2', letterSpacing: '0.02em' }}>
              GROUNDWORK<span style={{ color: '#FFD600' }}>OS</span>
            </span>
          </Link>
          <button className="lg:hidden p-1 rounded" onClick={() => setSidebarOpen(false)} style={{ color: '#5a5a5a' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navigation.map((item, index) => {
            if ('gap' in item) {
              return <div key={`g-${index}`} className="h-4" />;
            }
            const isActive = item.href === '/' ? location === '/' : location === item.href || location.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 relative no-underline mb-0.5',
                  isActive ? 'text-[#e2e2e2]' : 'text-[#5a5a5a] hover:text-[#a0a0a0] hover:bg-[#161616]'
                )}
                style={isActive ? { backgroundColor: '#1a1a1a' } : undefined}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full" style={{ backgroundColor: '#FFD600' }} />}
                <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: isActive ? 500 : 400 }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1f1f1f', color: '#e2e2e2', border: '1px solid #2a2a2a' }}>
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium" style={{ color: '#e2e2e2' }}>GroundworkOS Ltd</p>
              <p className="text-xs" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 flex-shrink-0" style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded" onClick={() => setSidebarOpen(true)} style={{ color: '#5a5a5a' }}>
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold" style={{ color: '#e2e2e2', fontFamily: "'Barlow', sans-serif" }}>{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors"
              style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a', color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}
            >
              <Search className="w-3 h-3" />
              <span>Search</span>
              <kbd className="flex items-center px-1 py-0.5 rounded text-xs" style={{ backgroundColor: '#1a1a1a', color: '#3a3a3a', border: '1px solid #222', fontSize: '10px' }}>⌘K</kbd>
            </button>
            <button className="relative p-2 rounded-md hover:bg-[#161616] transition-colors" style={{ color: '#5a5a5a' }}>
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
