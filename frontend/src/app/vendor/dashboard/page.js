'use client';
import { useEffect, useState } from 'react';
import { Package, TrendingUp, Contact, Send, Clock, RefreshCw } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function VendorDashboard() {
  const { ready } = useRequireAuth('vendor');
  const [stats, setStats] = useState(null);

  const load = async () => setStats((await api.get('/dashboard/vendor')).data.data);
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line

  if (!ready || !stats) return <AppShell role="vendor"><div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" /></AppShell>;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <button onClick={load} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Package} label="Today's Products" value={stats.todaysProducts} />
        <StatCard icon={TrendingUp} label="Today's Price Updates" value={stats.todaysPriceUpdates} />
        <StatCard icon={Contact} label="Customers" value={stats.customers} />
        <StatCard icon={Send} label="Messages Sent Today" value={stats.messagesSentToday} />
        <StatCard icon={Clock} label="Pending Messages" value={stats.pendingMessages} accent="orange" />
        <StatCard icon={Clock} label="Last Updated" value={stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : '—'} />
      </div>
    </AppShell>
  );
}
