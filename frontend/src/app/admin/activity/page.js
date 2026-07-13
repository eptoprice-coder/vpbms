'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'PRICE_UPDATED', 'CUSTOMER_ADDED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED',
  'WHATSAPP_SENT', 'WHATSAPP_FAILED', 'PRODUCT_UPDATED', 'VENDOR_CREATED', 'VENDOR_UPDATED',
  'VENDOR_DISABLED', 'VENDOR_DELETED', 'PASSWORD_RESET',
];

export default function ActivityPage() {
  const { ready } = useRequireAuth('super_admin');
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState('');

  const load = async () => setLogs((await api.get('/admin/activity', { params: { action } })).data.data);
  useEffect(() => { if (ready) load(); }, [ready, action]); // eslint-disable-line

  const exportFile = (format) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/activity/export?format=${format}`, '_blank');
  };

  const columns = useMemo(() => [
    { header: 'Date', accessorKey: 'createdAt', cell: (i) => new Date(i.row.original.createdAt).toLocaleString() },
    { header: 'User', accessorKey: 'user.name', cell: (i) => i.row.original.user?.name || 'System' },
    { header: 'Vendor', accessorKey: 'vendor.businessName', cell: (i) => i.row.original.vendor?.businessName || '—' },
    { header: 'Action', accessorKey: 'action', cell: (i) => <span className="px-2 py-1 rounded-full text-xs bg-brand-100 text-brand-700">{i.row.original.action}</span> },
    { header: 'Description', accessorKey: 'description' },
  ], []);

  if (!ready) return null;

  return (
    <AppShell role="admin">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Activity Monitoring</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
          <button onClick={() => exportFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-3">This audit trail is permanent and cannot be deleted.</p>
      <select className="input-field max-w-xs mb-4" value={action} onChange={(e) => setAction(e.target.value)}>
        <option value="">All actions</option>
        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <DataTable columns={columns} data={logs} pageSize={15} />
    </AppShell>
  );
}
