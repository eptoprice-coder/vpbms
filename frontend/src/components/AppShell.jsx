'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, Tags, ClipboardList, BarChart3,
  MessageCircle, History, Contact, Menu, Sun, Moon, LogOut, Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import EptomartLogo from '@/components/ui/EptomartLogo';

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/vendors', label: 'Vendors', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/products', label: 'Product Master', icon: Package },
  { href: '/admin/activity', label: 'Activity Monitor', icon: ClipboardList },
];

const VENDOR_NAV = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/products', label: 'Products & Prices', icon: Package },
  { href: '/vendor/customers', label: 'Customers', icon: Contact },
  { href: '/vendor/whatsapp', label: 'Send Price List', icon: MessageCircle },
  { href: '/vendor/history', label: 'History', icon: History },
  { href: '/vendor/reports', label: 'Reports', icon: BarChart3 },
];

export default function AppShell({ role, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, vendor, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = role === 'admin' ? ADMIN_NAV : VENDOR_NAV;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (e) { /* ignore */ }
    localStorage.removeItem('vpbms_token');
    clearAuth();
    toast.success('Logged out.');
    router.push('/login');
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-navy-950 flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-navy-900/70 backdrop-blur-xl">
          <SidebarContent nav={nav} pathname={pathname} />
        </aside>

        {/* Sidebar - mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-navy-900 shadow-xl">
              <SidebarContent nav={nav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-20 flex items-center justify-between px-4 md:px-6 border-b border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-navy-900/70 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button className="md:hidden text-gray-500" onClick={() => setMobileOpen(true)}>
                <Menu size={22} />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <Search size={16} />
                <span>{role === 'admin' ? 'Super Admin Console' : vendor?.businessName || 'Vendor Console'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="btn-secondary px-2 py-2" title="Toggle theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
              <button onClick={handleLogout} className="btn-secondary px-2 py-2" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ nav, pathname, onNavigate }) {
  return (
    <>
      <div className="h-20 flex items-center px-5 border-b border-gray-100 dark:border-navy-800">
        <EptomartLogo size={48} />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-navy-800'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100 dark:border-navy-800 text-[11px] text-gray-400">
        Powered by{' '}
        <span className="font-semibold bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
          Eptomart
        </span>
      </div>
    </>
  );
}
