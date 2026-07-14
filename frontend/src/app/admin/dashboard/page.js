'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Contact, TrendingUp, MessageSquare, Sparkles, Crown } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, CartesianGrid } from 'recharts';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const COLORS = ['#22c55e', '#4ade80', '#f97316', '#fb923c', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#06b6d4'];

const tooltipStyle = {
  background: 'rgba(13, 22, 40, 0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 32px rgba(5,9,20,0.5)',
};

export default function AdminDashboard() {
  const { ready } = useRequireAuth('super_admin');
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const [s, c] = await Promise.all([api.get('/dashboard/admin'), api.get('/dashboard/admin/charts?days=14')]);
      setStats(s.data.data);
      setCharts(c.data.data);
    })();
  }, [ready]);

  if (!ready || !stats) return <AppShell role="admin"><LoadingSkeleton /></AppShell>;

  return (
    <AppShell role="admin">
      {/* Hero */}
      <div className="premium-card p-6 md:p-8 mb-6 animate-rise">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Sparkles size={12} className="text-accent-400" /> Command Center
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-gradient-animated">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Network-wide view of vendors, prices, and broadcasts.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard className="animate-rise delay-1" icon={Users} label="Total Vendors" value={stats.totalVendors} />
        <StatCard className="animate-rise delay-2" icon={UserCheck} label="Active Vendors" value={stats.activeVendors} accent="green" />
        <StatCard className="animate-rise delay-3" icon={UserX} label="Inactive Vendors" value={stats.inactiveVendors} accent="red" />
        <StatCard className="animate-rise delay-4" icon={Contact} label="Total Customers" value={stats.totalCustomers} />
        <StatCard className="animate-rise delay-5" icon={TrendingUp} label="Today's Price Updates" value={stats.todaysPriceUpdates} />
        <StatCard className="animate-rise delay-6" icon={MessageSquare} label="Today's Messages" value={stats.todaysMessages} accent="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="premium-card premium-card-hover p-5 animate-rise delay-2">
          <h2 className="relative text-sm font-semibold mb-3">Daily Price Updates (14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts?.priceUpdates || []}>
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} stroke="rgba(128,128,128,0.4)" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="rgba(128,128,128,0.4)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2.5} fill="url(#gradGreen)"
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#4ade80', strokeWidth: 2, fill: '#22c55e' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card premium-card-hover p-5 animate-rise delay-3">
          <h2 className="relative text-sm font-semibold mb-3">Daily Messages Sent (14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts?.messages || []}>
              <defs>
                <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} stroke="rgba(128,128,128,0.4)" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="rgba(128,128,128,0.4)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
              <Bar dataKey="count" fill="url(#gradBar)" radius={[8, 8, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card premium-card-hover p-5 animate-rise delay-4">
          <h2 className="relative text-sm font-semibold mb-3">Category-wise Vendor Activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts?.categoryActivity || []} dataKey="count" nameKey="_id" innerRadius={45} outerRadius={80} paddingAngle={3} label>
                {(charts?.categoryActivity || []).map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(5,9,20,0.4)" strokeWidth={1} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card premium-card-hover p-5 animate-rise delay-5">
          <h2 className="relative text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Crown size={14} className="text-accent-400" /> Top Vendors (by messages sent)
          </h2>
          <ul className="relative space-y-2">
            {(stats.topVendors || []).map((v, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
                <span className="flex items-center gap-2.5">
                  <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                    i === 0 ? 'bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-[0_0_16px_-4px_rgba(249,115,22,0.6)]'
                    : i === 1 ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300'
                  }`}>{i + 1}</span>
                  {v.vendor}
                </span>
                <span className="font-semibold tabular-nums">{v.messagesSent}</span>
              </li>
            ))}
            {!stats.topVendors?.length && <p className="text-sm text-gray-400">No data yet.</p>}
          </ul>
        </div>
      </div>

      <div className="premium-card p-5 animate-rise delay-6">
        <h2 className="relative text-sm font-semibold mb-3">Recent Activity</h2>
        <ul className="relative divide-y divide-gray-100 dark:divide-white/5">
          {(stats.recentActivity || []).map((a) => (
            <li key={a._id} className="py-2 text-sm flex justify-between gap-4">
              <span>
                <span className="font-medium">{a.user?.name || 'System'}</span> — {a.description}
              </span>
              <span className="text-gray-400 text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 bg-gray-200 dark:bg-navy-800/60 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-navy-800/60 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-gray-200 dark:bg-navy-800/60 rounded-2xl" />
    </div>
  );
}
