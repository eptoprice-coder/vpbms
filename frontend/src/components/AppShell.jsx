'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, Tags, ClipboardList, BarChart3,
  MessageCircle, History, Contact, Menu, Sun, Moon, LogOut, Search, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import EptomartLogo from '@/components/ui/EptomartLogo';
import PoweredBy from '@/components/ui/PoweredBy';

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
  const [pwOpen, setPwOpen] = useState(false);
  const nav = role === 'admin' ? ADMIN_NAV : VENDOR_NAV;

  const handleLogout = () => {
    // Clear the session and leave immediately — logout should feel instant no matter
    // how slow (or asleep) the backend is. Tell the server in the background; if that
    // call fails or is slow, it doesn't block the user from leaving.
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('vpbms_token');
    clearAuth();
    toast.success('Logged out.');
    router.push('/login');
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="relative min-h-screen bg-gray-50 dark:bg-navy-950 flex overflow-hidden">
        {/* ambient aurora backdrop */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.18] dark:opacity-100" aria-hidden="true">
          <div className="aurora-blob aurora-1 w-[30rem] h-[30rem] -top-40 left-1/4" />
          <div className="aurora-blob aurora-2 w-[26rem] h-[26rem] -bottom-32 right-0" />
          <div className="hidden dark:block absolute inset-0 bg-grid-faint" />
        </div>

        {/* Sidebar - desktop */}
        <aside className="relative hidden md:flex md:flex-col w-64 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-navy-900/70 backdrop-blur-xl">
          <SidebarContent nav={nav} pathname={pathname} vendor={role !== 'admin' ? vendor : null} />
        </aside>

        {/* Sidebar - mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-navy-900 shadow-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
              <SidebarContent nav={nav} pathname={pathname} vendor={role !== 'admin' ? vendor : null} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="relative flex-1 flex flex-col min-w-0">
          {/* pt uses the device safe-area so content never sits under the phone's status bar (PWA) */}
          <header
            className="min-h-20 flex items-center justify-between px-4 md:px-6 border-b border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-navy-900/70 backdrop-blur-xl sticky top-0 z-30"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
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
              <button onClick={() => setPwOpen(true)} className="btn-secondary px-2 py-2" title="Change password">
                <KeyRound size={18} />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
                </div>
                {role !== 'admin' && (
                  vendor?.settings?.logo ? (
                    <img
                      src={vendor.settings.logo}
                      alt={vendor?.businessName || 'Vendor logo'}
                      className="h-10 w-10 rounded-xl object-cover border border-white/20 shadow-[0_0_16px_-4px_rgba(34,197,94,0.5)]"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-brand-600 dark:text-brand-300 border border-white/15" title={vendor?.businessName}>
                      <span className="text-sm font-bold">{(vendor?.businessName || user?.name || '?').charAt(0).toUpperCase()}</span>
                    </div>
                  )
                )}
              </div>
              <button onClick={handleLogout} className="btn-secondary px-2 py-2" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
        </div>

        <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      </div>
    </div>
  );
}

// Vendors (and admins) can replace their password themselves — e.g. using the
// temporary password shared by the Eptomart admin after a reset.
function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.current || !form.next) return toast.error('Fill in all fields.');
    if (form.next.length < 6) return toast.error('New password must be at least 6 characters.');
    if (form.next !== form.confirm) return toast.error('New passwords do not match.');
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.next });
      toast.success('Password changed. Use it from your next login.');
      setForm({ current: '', next: '', confirm: '' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Password"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Change Password'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          If your admin shared a temporary password, enter it as your current password and pick a new one.
        </p>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Current / temporary password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className="input-field pr-10" value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">New password (min 6 characters)</label>
          <input type={show ? 'text' : 'password'} className="input-field" value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Confirm new password</label>
          <input type={show ? 'text' : 'password'} className="input-field" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

function SidebarContent({ nav, pathname, vendor, onNavigate }) {
  return (
    <>
      <div className="h-20 flex items-center gap-3 px-5 border-b border-gray-100 dark:border-navy-800">
        {vendor ? (
          <>
            {vendor.settings?.logo ? (
              <img src={vendor.settings.logo} alt={vendor.businessName} className="h-11 w-11 rounded-xl object-cover border border-white/20" />
            ) : (
              <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-brand-600 dark:text-brand-300 border border-white/15">
                <span className="text-base font-bold">{(vendor.businessName || '?').charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{vendor.businessName}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">Partner Hub</div>
            </div>
          </>
        ) : (
          <EptomartLogo size={48} />
        )}
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
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-100 active:scale-[0.97] ${
                active
                  ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-md active:from-brand-700 active:to-accent-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-navy-800 active:bg-brand-100 dark:active:bg-navy-700'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100 dark:border-navy-800">
        <PoweredBy compact />
      </div>
    </>
  );
}
