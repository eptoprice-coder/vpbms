'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function HistoryPage() {
  const { ready } = useRequireAuth('vendor');
  const [tab, setTab] = useState('price');
  const [priceHistory, setPriceHistory] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);

  useEffect(() => {
    if (!ready) return;
    api.get('/vendor/products/history').then((r) => setPriceHistory(r.data.data));
    api.get('/vendor/whatsapp/history').then((r) => setMessageHistory(r.data.data));
  }, [ready]);

  const exportPriceFile = (format) => window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/vendor/products/history/export?format=${format}`, '_blank');

  const priceColumns = useMemo(() => [
    { header: 'Date', accessorKey: 'createdAt', cell: (i) => new Date(i.row.original.createdAt).toLocaleString() },
    { header: 'Product', accessorKey: 'product.name', cell: (i) => i.row.original.product?.name },
    { header: 'Old Price', accessorKey: 'oldPrice' },
    { header: 'New Price', accessorKey: 'newPrice' },
    { header: 'Difference', accessorKey: 'difference', cell: (i) => {
      const d = i.row.original.difference;
      return <span className={d > 0 ? 'text-red-600' : d < 0 ? 'text-green-600' : ''}>{d > 0 ? '+' : ''}{d}</span>;
    }},
    { header: 'Updated By', accessorKey: 'updatedBy.name', cell: (i) => i.row.original.updatedBy?.name },
  ], []);

  const messageColumns = useMemo(() => [
    { header: 'Date', accessorKey: 'createdAt', cell: (i) => new Date(i.row.original.createdAt).toLocaleString() },
    { header: 'Customer', accessorKey: 'customer.name', cell: (i) => i.row.original.customer?.name },
    { header: 'Mobile', accessorKey: 'customer.mobile', cell: (i) => i.row.original.customer?.mobile },
    { header: 'Status', accessorKey: 'status', cell: (i) => (
      <span className={`px-2 py-1 rounded-full text-xs ${i.row.original.status === 'sent' ? 'bg-green-100 text-green-700' : i.row.original.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{i.row.original.status}</span>
    )},
    { header: 'Message Preview', accessorKey: 'message', cell: (i) => <span className="text-xs text-gray-500 line-clamp-1">{i.row.original.message?.slice(0, 60)}...</span> },
  ], []);

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">History</h1>
        <div className="flex gap-2">
          <button className={`btn-secondary ${tab === 'price' ? 'ring-2 ring-brand-500' : ''}`} onClick={() => setTab('price')}>Price Updates</button>
          <button className={`btn-secondary ${tab === 'messages' ? 'ring-2 ring-brand-500' : ''}`} onClick={() => setTab('messages')}>Messages Sent</button>
          {tab === 'price' && (
            <>
              <button onClick={() => exportPriceFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
              <button onClick={() => exportPriceFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
            </>
          )}
        </div>
      </div>

      {tab === 'price' ? <DataTable columns={priceColumns} data={priceHistory} pageSize={15} /> : <DataTable columns={messageColumns} data={messageHistory} pageSize={15} />}
    </AppShell>
  );
}
