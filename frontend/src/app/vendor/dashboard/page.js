'use client';
import { useEffect, useState } from 'react';
import { Package, TrendingUp, Contact, Send, Clock, RefreshCw, Sparkles } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import { useAuthStore } from '@/store/authStore';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function VendorDashboard() {
  const { ready } = useRequireAuth('vendor');
  const { user, vendor } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      setStats((await api.get('/dashboard/vendor')).data.data);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line

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
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
          <button onClick={load} disabled={refreshing} className="btn-premium self-start md:self-center">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
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
    </AppShell>
  );
}
