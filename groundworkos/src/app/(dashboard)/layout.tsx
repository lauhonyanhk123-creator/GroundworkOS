'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Receipt,
  Calendar,
  Users,
  HardHat,
  FolderOpen,
  Shield,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { section: 'Operations' },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { section: 'People' },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Subcontractors', href: '/subcontractors', icon: HardHat },
  { section: 'Compliance' },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'H&S / RAMS', href: '/safety', icon: Shield },
  { name: 'Plant', href: '/plant', icon: Truck },
  { section: 'Finance' },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Xero Sync', href: '/xero', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[220px] bg-surface border-r border-border flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className="w-8 h-8 bg-yellow"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 2px,
                  rgba(0,0,0,0.3) 2px,
                  rgba(0,0,0,0.3) 4px
                )`,
              }}
            />
            <span className="text-xl font-condensed font-bold tracking-tight">
              GROUNDWORK<span className="text-yellow">OS</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div
                  key={`section-${index}`}
                  className="px-3 py-2 mt-4 first:mt-0"
                >
                  <span className="text-xs font-mono text-muted uppercase tracking-wider">
                    {item.section}
                  </span>
                </div>
              );
            }

            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 mx-1 rounded text-sm transition-colors relative',
                  isActive
                    ? 'text-text bg-surface-2'
                    : 'text-muted hover:text-text hover:bg-surface-2'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-yellow rounded-r" />
                )}
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-mono text-muted">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">User</p>
              <p className="text-xs text-muted truncate">user@company.co.uk</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted hover:text-danger"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-2 opacity-10"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              #FFD600,
              #FFD600 10px,
              #0c0c0c 10px,
              #0c0c0c 20px
            )`,
          }}
        />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-surface-2 rounded"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-condensed font-semibold">
              <span className="text-yellow">/</span> Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-surface-2 border border-border rounded px-3 py-1.5">
              <span className="text-xs text-muted font-mono">AI</span>
              <span className="text-xs text-muted">Search or ask...</span>
            </div>
            <button className="relative p-2 hover:bg-surface-2 rounded">
              <Bell className="w-5 h-5 text-muted" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
