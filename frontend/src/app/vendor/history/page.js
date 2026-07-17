'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, LineChart as LineChartIcon } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import PriceTrendChart from '@/components/ui/PriceTrendChart';
import { useRequireAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import api, { downloadFile, exportExt } from '@/lib/api';

export default function HistoryPage() {
  const { ready } = useRequireAuth('vendor');
  const [tab, setTab] = useState('price');
  const [priceHistory, setPriceHistory] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msgStatus, setMsgStatus] = useState(''); // '' | sent | pending | failed

  useEffect(() => {
    if (!ready) return;
    api.get('/vendor/products/history').then((r) => setPriceHistory(r.data.data));
    api.get('/vendor/whatsapp/history').then((r) => setMessageHistory(r.data.data));
  }, [ready]);

  const exportPriceFile = (format) =>
    downloadFile(`/vendor/products/history/export?format=${format}`, `price-history.${exportExt(format)}`)
      .catch((e) => toast.error(e.message || 'Download failed.'));

  // Unique products present in the history, for the trend selector.
  const products = useMemo(() => {
    const map = new Map();
    priceHistory.forEach((h) => {
      if (h.product?._id && !map.has(h.product._id)) map.set(h.product._id, h.product);
    });
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [priceHistory]);

  // Date-range filter applies to both tabs.
  const inRange = (d) => {
    const t = new Date(d).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 24 * 3600 * 1000 - 1) return false; // inclusive of the "to" day
    return true;
  };

  const rangedPriceHistory = useMemo(() => priceHistory.filter((h) => inRange(h.createdAt)), [priceHistory, from, to]); // eslint-disable-line
  const selectedEntries = useMemo(
    () => (selectedProduct ? rangedPriceHistory.filter((h) => h.product?._id === selectedProduct) : []),
    [rangedPriceHistory, selectedProduct]
  );
  const selectedProductObj = products.find((p) => p._id === selectedProduct);
  const visibleHistory = selectedProduct ? selectedEntries : rangedPriceHistory;

  const visibleMessages = useMemo(
    () => messageHistory.filter((m) => inRange(m.createdAt) && (!msgStatus || m.status === msgStatus)),
    [messageHistory, from, to, msgStatus] // eslint-disable-line
  );

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
    { header: 'Recipient', accessorKey: 'customer.name', cell: (i) => {
      const r = i.row.original;
      return r.recipientType === 'group' ? <span>👥 {r.groupName || 'Group'}</span> : r.customer?.name;
    }},
    { header: 'Mobile', accessorKey: 'customer.mobile', cell: (i) => {
      const r = i.row.original;
      return r.recipientType === 'group' ? 'Group' : r.customer?.mobile;
    }},
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

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 block">From</label>
          <input type="date" className="input-field w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 block">To</label>
          <input type="date" className="input-field w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {tab === 'messages' && (
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</label>
            <select className="input-field w-auto" value={msgStatus} onChange={(e) => setMsgStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        )}
        {(from || to || msgStatus) && (
          <button onClick={() => { setFrom(''); setTo(''); setMsgStatus(''); }} className="btn-secondary text-xs">
            Clear filters
          </button>
        )}
      </div>

      {tab === 'price' && (
        <div className="premium-card p-5 mb-4 animate-rise">
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <LineChartIcon size={16} className="text-brand-500" /> Price Trend
              </h2>
              <select
                className="input-field sm:max-w-xs sm:ml-auto"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Select a product to view its trend…</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}{p.unit ? ` (per ${p.unit})` : ''}</option>
                ))}
              </select>
            </div>
            {selectedProduct ? (
              <PriceTrendChart
                entries={selectedEntries}
                productName={selectedProductObj?.name}
                unit={selectedProductObj?.unit}
              />
            ) : (
              <p className="text-sm text-gray-400 py-6 text-center">
                Pick a product above to see how its price has moved over time.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'price' ? <DataTable columns={priceColumns} data={visibleHistory} pageSize={15} /> : <DataTable columns={messageColumns} data={visibleMessages} pageSize={15} />}
    </AppShell>
  );
}
