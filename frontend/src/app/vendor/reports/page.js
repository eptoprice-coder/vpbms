'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import { TrendingUp, Send, UserPlus, Clock } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import api, { downloadFile, exportExt } from '@/lib/api';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function VendorReportsPage() {
  const { ready } = useRequireAuth('vendor');
  const [range, setRange] = useState('today');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);

  const load = async () => {
    const params = range === 'custom' ? { from: custom.from, to: custom.to } : { range };
    const { data: res } = await api.get('/vendor/reports', { params });
    setData(res.data);
  };

  useEffect(() => { if (ready) load(); }, [ready, range]); // eslint-disable-line

  const exportFile = (format) => {
    const params = new URLSearchParams({ format, ...(range === 'custom' ? custom : { range }) });
    downloadFile(`/vendor/reports/export?${params.toString()}`, `report.${exportExt(format)}`).catch(() => {});
  };

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">My Reports</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
          <button onClick={() => exportFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)} className={`btn-secondary ${range === r.key ? 'ring-2 ring-brand-500' : ''}`}>{r.label}</button>
        ))}
        <input type="date" className="input-field w-auto" value={custom.from} onChange={(e) => { setCustom({ ...custom, from: e.target.value }); setRange('custom'); }} />
        <input type="date" className="input-field w-auto" value={custom.to} onChange={(e) => { setCustom({ ...custom, to: e.target.value }); setRange('custom'); }} />
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Price Updates" value={data.priceUpdates} />
            <StatCard icon={Send} label="Messages Sent" value={data.messagesSent} />
            <StatCard icon={UserPlus} label="Customers Added" value={data.customersAdded} />
            <StatCard icon={Clock} label="Last Login" value={data.lastLogin ? new Date(data.lastLogin).toLocaleString() : '—'} />
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold mb-3">Activity Log</h2>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.activity.map((a) => (
                <li key={a._id} className="py-2 text-sm flex justify-between">
                  <span>{a.description}</span>
                  <span className="text-gray-400 text-xs">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
              {!data.activity.length && <p className="text-sm text-gray-400 py-2">No activity in this period.</p>}
            </ul>
          </div>
        </>
      )}
    </AppShell>
  );
}
