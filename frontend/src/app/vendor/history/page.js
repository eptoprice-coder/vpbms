'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

// yyyy-mm-dd, matching the format <input type="date"> expects/returns.
const toInputDate = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Client-side mirror of the backend's validateVendorDateRange — keeps the UI from
// even attempting a search until the range is valid, per the same three rules
// the API enforces.
const validateRange = (accountStart, from, to, today) => {
  if (!from || !to) return null;
  if (from < accountStart) return 'Date cannot be earlier than your account creation date.';
  if (from > today || to > today) return 'Future dates are not allowed.';
  if (to < from) return "'To Date' cannot be earlier than 'From Date'.";
  return null;
};

export default function HistoryPage() {
  const { ready } = useRequireAuth('vendor');
  const { vendor } = useAuthStore();
  const [tab, setTab] = useState('price');
  const [priceHistory, setPriceHistory] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);

  const today = useMemo(() => toInputDate(new Date()), []);
  const accountStart = useMemo(
    () => (vendor?.createdAt ? toInputDate(vendor.createdAt) : today),
    [vendor?.createdAt, today]
  );

  const [fromDate, setFromDate] = useState(accountStart);
  const [toDate, setToDate] = useState(today);
  const [dateError, setDateError] = useState('');

  // Once the vendor's actual account creation date loads in, snap the default
  // "From Date" to it (initial render may not have `vendor` yet).
  useEffect(() => {
    setFromDate(accountStart);
  }, [accountStart]);

  const loadHistory = async (from, to) => {
    try {
      const [p, m] = await Promise.all([
        api.get('/vendor/products/history', { params: { from, to } }),
        api.get('/vendor/whatsapp/history', { params: { from, to } }),
      ]);
      setPriceHistory(p.data.data);
      setMessageHistory(m.data.data);
      setDateError('');
    } catch (err) {
      // Backend enforces the same rules — surface its message if something slipped past client validation.
      setDateError(err.response?.data?.message || 'Failed to load history for this date range.');
    }
  };

  useEffect(() => {
    if (!ready) return;
    const err = validateRange(accountStart, fromDate, toDate, today);
    setDateError(err || '');
    if (!err) loadHistory(fromDate, toDate);
  }, [ready, fromDate, toDate]); // eslint-disable-line

  const handleFromChange = (value) => {
    setFromDate(value);
    // If the existing "To Date" is now before the new "From Date", pull it forward automatically.
    if (toDate && value > toDate) setToDate(value);
  };

  const handleToChange = (value) => {
    setToDate(value);
  };

  const isValid = !dateError;

  const exportPriceFile = (format) => {
    if (!isValid) return;
    const params = new URLSearchParams({ format, from: fromDate, to: toDate });
    window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/vendor/products/history/export?${params.toString()}`, '_blank');
  };

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
              <button onClick={() => exportPriceFile('excel')} disabled={!isValid} className="btn-secondary"><Download size={16} /> Excel</button>
              <button onClick={() => exportPriceFile('pdf')} disabled={!isValid} className="btn-secondary"><Download size={16} /> PDF</button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">From Date</label>
          <input
            type="date"
            className="input-field w-auto"
            value={fromDate}
            min={accountStart}
            max={today}
            onChange={(e) => handleFromChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">To Date</label>
          <input
            type="date"
            className="input-field w-auto"
            value={toDate}
            min={fromDate || accountStart}
            max={today}
            onChange={(e) => handleToChange(e.target.value)}
          />
        </div>
      </div>

      {dateError && (
        <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
          <AlertCircle size={16} />
          {dateError}
        </div>
      )}

      {isValid && (tab === 'price' ? <DataTable columns={priceColumns} data={priceHistory} pageSize={15} /> : <DataTable columns={messageColumns} data={messageHistory} pageSize={15} />)}
    </AppShell>
  );
}
