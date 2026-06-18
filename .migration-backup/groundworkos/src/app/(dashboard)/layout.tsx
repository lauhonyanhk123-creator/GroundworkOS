'use client';

import { useState, useCallback, useEffect } from 'react';
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
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanySwitcher } from '@/components/ui/company-switcher';

interface CompanyOption {
  id: string;
  name: string;
}

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
  { section: 'Finance' },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUserEmail(data.user?.email ?? '');
      if (!data.user) return;

      try {
        const { data: userCompanies, error: companiesError } = await supabase
          .from('user_companies')
          .select('company_id, companies:company_id(id, name)')
          .eq('user_id', data.user.id);

        if (companiesError) throw companiesError;
        if (!userCompanies) return;

        // A signed-in user with no company cannot use any page — send them to
        // company set-up instead of letting every page error with "No company
        // found". (Only on a confirmed empty list, never on a fetch failure.)
        if (userCompanies.length === 0) {
          router.replace('/onboarding');
          return;
        }

        const options: CompanyOption[] = (userCompanies as Array<{ company_id: string; companies: unknown }>)
          .map((uc) => {
            const co = uc.companies as { id: string; name: string } | null;
            return { id: uc.company_id, name: co?.name ?? uc.company_id };
          });

        setCompanies(options);

        // Determine current company from cookie or default to first
        const cookieMatch = document.cookie.match(/(?:^|; )selected_company_id=([^;]*)/);
        const cookieCompanyId = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        const validId = options.find(o => o.id === cookieCompanyId)?.id ?? options[0]?.id ?? '';
        setCurrentCompanyId(validId);
      } catch (err) {
        console.error('[DashboardLayout] Failed to load companies:', err);
      }
    });
  }, [router]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  const currentPage = navigation.find(
    (item) => 'href' in item && (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
  const pageTitle = currentPage && 'name' in currentPage ? currentPage.name : 'Dashboard';

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
            <div className="w-8 h-8 bg-yellow hazard-stripe-diagonal" />
            <span className="text-xl font-condensed font-bold tracking-tight">
              GROUNDWORK<span className="text-yellow">OS</span>
            </span>
          </Link>
        </div>

        {companies.length > 1 && currentCompanyId && (
          <div className="px-2 pt-3 border-b border-border">
            <CompanySwitcher companies={companies} currentCompanyId={currentCompanyId} />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={`section-${index}`} className="px-3 py-2 mt-4 first:mt-0">
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
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">
                {userEmail ? userEmail.split('@')[0] : '—'}
              </p>
              <p className="text-xs text-muted truncate">{userEmail || '—'}</p>
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

        <div className="absolute bottom-0 left-0 right-0 h-2 opacity-10 hazard-stripe-horizontal" />
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
              <span className="text-yellow">/</span> {pageTitle}
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
