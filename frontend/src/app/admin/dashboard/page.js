'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Contact, TrendingUp, MessageSquare } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#06b6d4'];

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
      <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={Users} label="Total Vendors" value={stats.totalVendors} />
        <StatCard icon={UserCheck} label="Active Vendors" value={stats.activeVendors} accent="green" />
        <StatCard icon={UserX} label="Inactive Vendors" value={stats.inactiveVendors} accent="red" />
        <StatCard icon={Contact} label="Total Customers" value={stats.totalCustomers} />
        <StatCard icon={TrendingUp} label="Today's Price Updates" value={stats.todaysPriceUpdates} />
        <StatCard icon={MessageSquare} label="Today's Messages" value={stats.todaysMessages} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Daily Price Updates (14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts?.priceUpdates || []}>
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Daily Messages Sent (14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts?.messages || []}>
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Category-wise Vendor Activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts?.categoryActivity || []} dataKey="count" nameKey="_id" outerRadius={80} label>
                {(charts?.categoryActivity || []).map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Top Vendors (by messages sent)</h2>
          <ul className="space-y-2">
            {(stats.topVendors || []).map((v, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                <span>{i + 1}. {v.vendor}</span>
                <span className="font-medium">{v.messagesSent}</span>
              </li>
            ))}
            {!stats.topVendors?.length && <p className="text-sm text-gray-400">No data yet.</p>}
          </ul>
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {(stats.recentActivity || []).map((a) => (
            <li key={a._id} className="py-2 text-sm flex justify-between">
              <span>
                <span className="font-medium">{a.user?.name || 'System'}</span> — {a.description}
              </span>
              <span className="text-gray-400 text-xs">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

function LoadingSkeleton() {
  return <div className="animate-pulse space-y-4"><div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" /><div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" /></div>;
}
