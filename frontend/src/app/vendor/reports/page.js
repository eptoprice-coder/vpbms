'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/ui/StatCard';
import { TrendingUp, Send, UserPlus, Clock } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import api, { downloadFile, exportExt, fileSlug } from '@/lib/api';

const toDateInput = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function VendorReportsPage() {
  const { ready } = useRequireAuth('vendor');
  const { vendor } = useAuthStore();
  const [range, setRange] = useState('today');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);

  // Custom dates are only meaningful between profile creation and today.
  const minDate = vendor?.createdAt ? toDateInput(vendor.createdAt) : undefined;
  const maxDate = toDateInput(new Date());

  // Clamp a picked date into [minDate, maxDate] — covers browsers/typed input
  // that ignore the min/max attributes.
  const clampDate = (v) => {
    if (!v) return v;
    if (minDate && v < minDate) {
      toast.error(`Reports start from your profile creation date (${new Date(vendor.createdAt).toLocaleDateString('en-IN')}).`);
      return minDate;
    }
    if (v > maxDate) {
      toast.error('Future dates cannot be selected.');
      return maxDate;
    }
    return v;
  };

  const setCustomDate = (key, value) => {
    const v = clampDate(value);
    setCustom((c) => {
      const next = { ...c, [key]: v };
      // keep from ≤ to
      if (next.from && next.to && next.from > next.to) {
        if (key === 'from') next.to = next.from; else next.from = next.to;
      }
      return next;
    });
    setRange('custom');
  };

  const load = async () => {
    const params = range === 'custom' ? { from: custom.from, to: custom.to } : { range };
    const { data: res } = await api.get('/vendor/reports', { params });
    setData(res.data);
  };

  useEffect(() => { if (ready) load(); }, [ready, range, custom.from, custom.to]); // eslint-disable-line

  const exportFile = (format) => {
    const params = new URLSearchParams({ format, ...(range === 'custom' ? custom : { range }) });
    downloadFile(`/vendor/reports/export?${params.toString()}`, `${fileSlug(vendor?.businessName)}-report.${exportExt(format)}`)
      .catch((e) => toast.error(e.message || 'Download failed.'));
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
        <input type="date" className="input-field w-auto" value={custom.from} min={minDate} max={custom.to || maxDate}
          onChange={(e) => setCustomDate('from', e.target.value)} />
        <input type="date" className="input-field w-auto" value={custom.to} min={custom.from || minDate} max={maxDate}
          onChange={(e) => setCustomDate('to', e.target.value)} />
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
