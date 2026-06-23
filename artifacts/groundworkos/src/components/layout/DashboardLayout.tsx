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

  const currentItem = navigation.find(
    item => 'href' in item && typeof item.href === 'string' && (location === item.href || (item.href !== '/' && location.startsWith(item.href)))
  );
  const pageTitle = currentItem && 'name' in currentItem ? currentItem.name : 'Dashboard';

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
    <div className="min-h-screen flex" style={{ backgroundColor: '#f0ede8', color: '#181410' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ backgroundColor: 'rgba(24,20,16,0.4)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-56 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ backgroundColor: '#fafaf8', borderRight: '1px solid #d9d4ce' }}>

        <div className="h-13 flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #d9d4ce' }}>
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{
              border: '1.5px solid #1b5e78',
              borderRadius: '4px',
            }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '14px',
                color: '#1b5e78',
                lineHeight: 1,
              }}>G</span>
            </div>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              color: '#181410',
              letterSpacing: '0.04em',
            }}>
              GROUNDWORK<span style={{ color: '#1b5e78' }}>OS</span>
            </span>
          </Link>
          <button className="lg:hidden p-1 rounded" onClick={() => setSidebarOpen(false)} style={{ color: '#7a7469' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navigation.map((item, index) => {
            if ('gap' in item) {
              return <div key={`g-${index}`} className="my-1" style={{ borderBottom: '1px solid #ece8e3', margin: '6px 8px' }} />;
            }
            const isActive = item.href === '/' ? location === '/' : location === item.href || location.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 relative no-underline mb-0.5"
                style={{
                  padding: '6px 10px',
                  borderRadius: '5px',
                  fontSize: '13px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#1b5e78' : '#4a4540',
                  backgroundColor: isActive ? '#e8f3f7' : 'transparent',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#eeeae4'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r" style={{
                    width: '3px', height: '16px', backgroundColor: '#1b5e78',
                  }} />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" style={{ opacity: isActive ? 1 : 0.65 }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3" style={{ borderTop: '1px solid #d9d4ce' }}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
              backgroundColor: '#1b5e78',
              color: '#ffffff',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#181410', fontFamily: "'Space Grotesk', sans-serif" }}>GroundworkOS Ltd</p>
              <p className="text-xs" style={{ color: '#7a7469', fontFamily: "'JetBrains Mono', monospace" }}>Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 flex-shrink-0" style={{
          backgroundColor: '#fafaf8',
          borderBottom: '1px solid #d9d4ce',
        }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded" onClick={() => setSidebarOpen(true)} style={{ color: '#7a7469' }}>
              <Menu className="w-5 h-5" />
            </button>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '17px',
              letterSpacing: '-0.01em',
              color: '#181410',
            }}>{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
              style={{
                backgroundColor: '#eeeae4',
                border: '1px solid #d9d4ce',
                color: '#7a7469',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
              }}
            >
              <Search className="w-3 h-3" />
              <span>Search</span>
              <kbd style={{
                backgroundColor: '#fafaf8',
                color: '#8a8377',
                border: '1px solid #d9d4ce',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
              }}>⌘K</kbd>
            </button>
            <button className="relative p-2 rounded transition-colors" style={{ color: '#7a7469' }}>
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
