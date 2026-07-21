'use client';
import { useEffect, useRef, useState } from 'react';
import { Package, TrendingUp, Contact, Send, Clock, RefreshCw, Sparkles, Camera, Palette, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Downscale any uploaded image to a compact square data URL so it stays fast to store and load.
function fileToLogoDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // cover-fit crop to square
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function VendorDashboard() {
  const { ready } = useRequireAuth('vendor');
  const { token, user, vendor, setAuth } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brand, setBrand] = useState({ messageHeader: '', messageFooter: '' });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setRefreshing(true);
    try {
      setStats((await api.get('/dashboard/vendor')).data.data);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line

  const openBrand = () => {
    setBrand({
      messageHeader: vendor?.settings?.messageHeader || '',
      messageFooter: vendor?.settings?.messageFooter || '',
    });
    setBrandOpen(true);
  };

  const saveVendor = (data) => setAuth({ token, user, vendor: data });

  const uploadLogo = async (file) => {
    if (!file) return;
    try {
      const logo = await fileToLogoDataUrl(file);
      const { data } = await api.patch('/vendor/profile', { logo });
      saveVendor(data.data);
      toast.success('Logo updated — looking sharp!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo.');
    }
  };

  const saveBrand = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/vendor/profile', brand);
      saveVendor(data.data);
      setBrandOpen(false);
      toast.success('Brand style saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const logo = vendor?.settings?.logo;

  if (!ready || !stats) {
    return (
      <AppShell role="vendor">
        <div className="animate-pulse space-y-4">
          <div className="h-28 bg-gray-200 dark:bg-navy-800/60 rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-navy-800/60 rounded-2xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="vendor">
      {/* Hero banner */}
      <div className="premium-card p-6 md:p-8 mb-6 animate-rise">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Vendor logo with one-tap upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className="relative group shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_24px_-6px_rgba(34,197,94,0.45)] focus:outline-none focus:ring-2 focus:ring-brand-500 active:scale-95 transition-transform duration-100"
              title="Upload your logo"
            >
              {logo ? (
                <img src={logo} alt="Your logo" className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-brand-600 dark:text-brand-300">
                  <Store size={26} />
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }} />

            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-accent-400" /> {greeting()}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">
                <span className="text-gradient-animated">{vendor?.businessName || user?.name || 'Dashboard'}</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                Here&apos;s how your price broadcasts are performing today.
              </p>
            </div>
          </div>
          <div className="flex gap-2 self-start md:self-center">
            <button onClick={openBrand} className="btn-secondary" title="Personalize your brand">
              <Palette size={16} /> Personalize
            </button>
            <button onClick={load} disabled={refreshing} className="btn-premium">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard className="animate-rise delay-1" icon={Package} label="Today's Products" value={stats.todaysProducts} />
        <StatCard className="animate-rise delay-2" icon={TrendingUp} label="Today's Price Updates" value={stats.todaysPriceUpdates} />
        <StatCard className="animate-rise delay-3" icon={Contact} label="Customers" value={stats.customers} />
        <StatCard className="animate-rise delay-4" icon={Send} label="Messages Sent Today" value={stats.messagesSentToday} />
        <StatCard className="animate-rise delay-5" icon={Clock} label="Pending Messages" value={stats.pendingMessages} accent="orange" />
        <StatCard className="animate-rise delay-6" icon={Clock} label="Last Updated" value={stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : '—'} />
      </div>

      {/* Personalize modal */}
      <Modal
        open={brandOpen}
        onClose={() => setBrandOpen(false)}
        title="Personalize your brand"
        footer={
          <>
            <button onClick={() => setBrandOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveBrand} disabled={saving} className="btn-premium px-5">{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/20 shrink-0">
              {logo ? (
                <img src={logo} alt="Your logo" className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-brand-600 dark:text-brand-300"><Store size={24} /></span>
              )}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs"><Camera size={14} /> Upload logo</button>
              <p className="text-[11px] text-gray-400 mt-1.5">Shown in your header and dashboard. Square images look best.</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Price list header</label>
            <input className="input-field" value={brand.messageHeader}
              onChange={(e) => setBrand({ ...brand, messageHeader: e.target.value })}
              placeholder="🌿 Fresh Market Price List" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Price list footer</label>
            <input className="input-field" value={brand.messageFooter}
              onChange={(e) => setBrand({ ...brand, messageFooter: e.target.value })}
              placeholder="Thank you." />
          </div>
          <p className="text-[11px] text-gray-400">The header and footer appear on every WhatsApp price list you broadcast.</p>
        </div>
      </Modal>
    </AppShell>
  );
}
