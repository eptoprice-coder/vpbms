'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Save, Download, Plus, PackageX, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import UnitSelect from '@/components/ui/UnitSelect';
import { useRequireAuth } from '@/hooks/useAuth';
import api, { downloadFile, exportExt } from '@/lib/api';

// Isolated so typing a price only re-renders this single cell, not the whole
// table's column definitions — keeping columns stable is what keeps the input focused.
function PriceEditCell({ row, onChange }) {
  const [value, setValue] = useState('');
  const diff = value === '' ? null : Number(value) - row.currentPrice;
  const validDiff = diff !== null && !Number.isNaN(diff);

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.01"
        className="input-field w-20 px-2"
        placeholder={String(row.currentPrice)}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(row._id, 'newPrice', e.target.value);
        }}
      />
      {validDiff && (
        <span className={`text-[11px] whitespace-nowrap ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// Availability toggle — one tap marks a product out of stock / back in stock.
function AvailabilityCell({ row, onToggled }) {
  const [busy, setBusy] = useState(false);
  const available = row.status === 'active';
  const toggle = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/vendor/products/${row._id}/availability`);
      onToggled(row._id, data.data.status);
      toast.success(data.data.status === 'active' ? 'Marked as available.' : 'Marked as unavailable — it will appear under "Not Available" in your broadcast.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={available ? 'Mark as out of stock' : 'Mark as available'}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-colors ${
        available
          ? 'bg-green-100 text-green-700 dark:bg-brand-500/20 dark:text-brand-300 hover:bg-green-200'
          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 hover:bg-red-200'
      }`}
    >
      {available ? <PackageCheck size={12} /> : <PackageX size={12} />}
      {available ? 'In stock' : 'No stock'}
    </button>
  );
}

export default function VendorProductsPage() {
  const { ready } = useRequireAuth('vendor');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all | active | inactive
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', tamilName: '', unit: 'kg', currentPrice: '' });
  const editsRef = useRef({}); // { vendorProductId: { newPrice } } — a ref so typing never re-renders the table

  const load = async () => setProducts((await api.get('/vendor/products', { params: { search } })).data.data);
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line
  useEffect(() => { if (ready) { const t = setTimeout(load, 300); return () => clearTimeout(t); } }, [search]); // eslint-disable-line

  const setEdit = useCallback((id, field, value) => {
    editsRef.current[id] = { ...editsRef.current[id], [field]: value };
  }, []);

  const saveAll = async () => {
    const updates = Object.entries(editsRef.current)
      .filter(([, v]) => v.newPrice !== undefined && v.newPrice !== '')
      .map(([vendorProductId, v]) => ({ vendorProductId, newPrice: v.newPrice }));
    if (!updates.length) return toast.error('No price changes to save.');

    setSaving(true);
    try {
      const { data } = await api.put('/vendor/products/bulk-update', { updates });
      toast.success(`Updated ${data.updated} product price(s).`);
      editsRef.current = {};
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => { setAddForm({ name: '', tamilName: '', unit: 'kg', currentPrice: '' }); setAddModalOpen(true); };

  const submitAdd = async () => {
    if (!addForm.name || !addForm.unit) return toast.error('Product name and unit are required.');
    try {
      await api.post('/vendor/products', addForm);
      toast.success('Product added.');
      setAddModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product.');
    }
  };

  const exportFile = (format) =>
    downloadFile(`/vendor/products/history/export?format=${format}`, `price-history.${exportExt(format)}`)
      .catch((e) => toast.error(e.message || 'Download failed.'));

  const onAvailabilityToggled = useCallback((id, status) => {
    setProducts((ps) => ps.map((p) => (p._id === id ? { ...p, status } : p)));
  }, []);

  // Columns are created once and never depend on live edit state — that stability
  // is what prevents the New Price input from losing focus while typing.
  // Fixed widths + wrapping keep Product, Current, New Price, and Stock on one
  // mobile screen with no horizontal scrolling.
  const columns = useMemo(() => [
    { header: 'Product', accessorKey: 'product.name', meta: { width: '34%', wrap: true }, cell: (i) => (
      <div>
        <div className="font-medium leading-snug break-words">{i.row.original.product?.name}</div>
        <div className="text-xs text-gray-400 break-words leading-snug">
          {i.row.original.product?.tamilName}{i.row.original.product?.tamilName ? ' · ' : ''}per {i.row.original.product?.unit}
        </div>
      </div>
    )},
    { header: 'Current (₹)', accessorKey: 'currentPrice', meta: { width: '15%', wrap: true }, cell: (i) => (
      <span className="font-semibold tabular-nums">{i.row.original.currentPrice}</span>
    )},
    { header: 'New Price (₹)', id: 'newPrice', meta: { width: '28%', wrap: true }, cell: (i) => <PriceEditCell row={i.row.original} onChange={setEdit} /> },
    { header: 'Stock', accessorKey: 'status', meta: { width: '23%', wrap: true }, cell: (i) => (
      <AvailabilityCell row={i.row.original} onToggled={onAvailabilityToggled} />
    )},
    { header: 'Last Updated', accessorKey: 'lastUpdated', meta: { className: 'hidden lg:table-cell', width: '14rem' }, cell: (i) => i.row.original.lastUpdated ? new Date(i.row.original.lastUpdated).toLocaleString() : '—' },
  ], [setEdit, onAvailabilityToggled]);

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Products & Prices</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
          <button onClick={() => exportFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
          <button onClick={openAdd} className="btn-premium px-4 py-2"><Plus size={16} /> Add Product</button>
          <button onClick={saveAll} disabled={saving} className="btn-primary"><Save size={16} /> Update Prices</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[12rem] max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input className="input-field pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {[['all', 'All'], ['active', 'In stock'], ['inactive', 'No stock']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStockFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              stockFilter === v
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-white/10'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={stockFilter === 'all' ? products : products.filter((p) => p.status === stockFilter)}
        pageSize={15}
        compact
      />

      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Product"
        footer={<><button className="btn-secondary" onClick={() => setAddModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={submitAdd}>Add</button></>}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Product Name</label>
            <input className="input-field" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Cauliflower" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tamil Name (optional)</label>
            <input className="input-field" value={addForm.tamilName} onChange={(e) => setAddForm({ ...addForm, tamilName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unit</label>
              <UnitSelect value={addForm.unit} onChange={(unit) => setAddForm({ ...addForm, unit })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Starting Price (₹, optional)</label>
              <input type="number" step="0.01" className="input-field" value={addForm.currentPrice} onChange={(e) => setAddForm({ ...addForm, currentPrice: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-gray-400">New products are added to your own price sheet immediately and can be priced right away or later from this page.</p>
        </div>
      </Modal>
    </AppShell>
  );
}
