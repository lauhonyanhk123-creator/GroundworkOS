import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, Briefcase, FileText, Receipt, Calendar,
  Users, HardHat, FolderOpen, BarChart3, Settings,
  Menu, Bell, X, Truck, ChevronRight,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { section: 'Operations' },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { section: 'People' },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Subcontractors', href: '/subcontractors', icon: HardHat },
  { section: 'Site & Compliance' },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Plant', href: '/plant', icon: Truck },
  { section: 'Finance' },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = navigation.find(
    item => 'href' in item && (location === item.href || (item.href !== '/' && location.startsWith(item.href)))
  );
  const pageTitle = currentPage && 'name' in currentPage ? currentPage.name : 'Dashboard';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0c0c0c', color: '#e8e8e8' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-56 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ backgroundColor: '#141414', borderRight: '1px solid #2a2a2a' }}>

        <div className="h-14 flex items-center justify-between px-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ backgroundColor: '#FFD600' }}>
              <div className="w-full h-full hazard-stripe-diagonal rounded-sm" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>
              GROUNDWORK<span style={{ color: '#FFD600' }}>OS</span>
            </span>
          </Link>
          <button className="lg:hidden p-1 rounded" onClick={() => setSidebarOpen(false)} style={{ color: '#666666' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={`s-${index}`} className="px-3 py-2 mt-3 first:mt-0">
                  <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{item.section}</span>
                </div>
              );
            }
            const isActive = item.href === '/' ? location === '/' : location === item.href || location.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 mx-0.5 rounded text-sm transition-colors relative no-underline',
                  isActive ? 'text-[#e8e8e8]' : 'text-[#666666] hover:text-[#e8e8e8]'
                )}
                style={isActive ? { backgroundColor: '#1c1c1c' } : undefined}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ backgroundColor: '#FFD600' }} />}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span style={{ fontFamily: "'Barlow', sans-serif" }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded" style={{ backgroundColor: '#1c1c1c' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold" style={{ backgroundColor: '#2a2a2a', color: '#FFD600' }}>
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: '#e8e8e8', fontFamily: "'Barlow', sans-serif" }}>GroundworkOS Ltd</p>
              <p className="text-xs font-mono" style={{ color: '#444444' }}>Admin</p>
            </div>
          </div>
        </div>

        <div className="h-1 opacity-30 hazard-stripe-horizontal" />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 flex-shrink-0" style={{ backgroundColor: '#141414', borderBottom: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded" onClick={() => setSidebarOpen(true)} style={{ color: '#666666' }}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 text-sm" style={{ color: '#666666', fontFamily: "'DM Mono', monospace" }}>
              <span style={{ color: '#FFD600' }}>/</span>
              <span style={{ color: '#e8e8e8', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{pageTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded text-xs" style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#444444', fontFamily: "'DM Mono', monospace" }}>
              <span style={{ color: '#FFD600' }}>AI</span>
              <span>Ask anything...</span>
            </div>
            <button className="relative p-2 rounded hover:bg-[#1c1c1c]" style={{ color: '#666666' }}>
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ff4444' }} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
