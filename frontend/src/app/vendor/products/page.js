'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, Save, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function VendorProductsPage() {
  const { ready } = useRequireAuth('vendor');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({}); // { vendorProductId: { newPrice, quantityAvailable } }
  const [saving, setSaving] = useState(false);

  const load = async () => setProducts((await api.get('/vendor/products', { params: { search } })).data.data);
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line
  useEffect(() => { if (ready) { const t = setTimeout(load, 300); return () => clearTimeout(t); } }, [search]); // eslint-disable-line

  const setEdit = (id, field, value) => setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveAll = async () => {
    const updates = Object.entries(edits)
      .filter(([, v]) => v.newPrice !== undefined && v.newPrice !== '')
      .map(([vendorProductId, v]) => ({ vendorProductId, newPrice: v.newPrice, quantityAvailable: v.quantityAvailable }));
    if (!updates.length) return toast.error('No price changes to save.');

    setSaving(true);
    try {
      const { data } = await api.put('/vendor/products/bulk-update', { updates });
      toast.success(`Updated ${data.updated} product price(s).`);
      setEdits({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const exportFile = (format) => window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/vendor/products/history/export?format=${format}`, '_blank');

  const columns = useMemo(() => [
    { header: 'Product', accessorKey: 'product.name', cell: (i) => (
      <div><div className="font-medium">{i.row.original.product?.name}</div><div className="text-xs text-gray-400">{i.row.original.product?.tamilName}</div></div>
    )},
    { header: 'Unit', accessorKey: 'product.unit', cell: (i) => i.row.original.product?.unit },
    { header: 'Qty Available', accessorKey: 'quantityAvailable', cell: (i) => {
      const row = i.row.original;
      const editVal = edits[row._id]?.quantityAvailable;
      return (
        <input type="number" className="input-field w-24" defaultValue={row.quantityAvailable}
          onChange={(e) => setEdit(row._id, 'quantityAvailable', e.target.value)} />
      );
    }},
    { header: 'Current Price (₹)', accessorKey: 'currentPrice' },
    { header: 'New Price (₹)', id: 'newPrice', cell: (i) => {
      const row = i.row.original;
      return (
        <input type="number" step="0.01" className="input-field w-28" placeholder={String(row.currentPrice)}
          onChange={(e) => setEdit(row._id, 'newPrice', e.target.value)} />
      );
    }},
    { header: 'Difference', id: 'difference', cell: (i) => {
      const row = i.row.original;
      const newPrice = edits[row._id]?.newPrice;
      if (newPrice === undefined || newPrice === '') return <span className="text-gray-300">—</span>;
      const diff = Number(newPrice) - row.currentPrice;
      return <span className={diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>;
    }},
    { header: 'Last Updated', accessorKey: 'lastUpdated', cell: (i) => i.row.original.lastUpdated ? new Date(i.row.original.lastUpdated).toLocaleString() : '—' },
    { header: 'Status', accessorKey: 'status', cell: (i) => (
      <span className={`px-2 py-1 rounded-full text-xs ${i.row.original.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{i.row.original.status}</span>
    )},
  ], [edits]);

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Products & Prices</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
          <button onClick={() => exportFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
          <button onClick={saveAll} disabled={saving} className="btn-primary"><Save size={16} /> Update Prices</button>
        </div>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input className="input-field pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} data={products} pageSize={15} />
    </AppShell>
  );
}
