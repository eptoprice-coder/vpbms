'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Save, Download, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

// Isolated so typing a price only re-renders this single cell, not the whole
// table's column definitions — keeping columns stable is what keeps the input focused.
function PriceEditCell({ row, onChange }) {
  const [value, setValue] = useState('');
  const diff = value === '' ? null : Number(value) - row.currentPrice;
  const validDiff = diff !== null && !Number.isNaN(diff);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        className="input-field w-28"
        placeholder={String(row.currentPrice)}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(row._id, 'newPrice', e.target.value);
        }}
      />
      {validDiff && (
        <span className={`text-xs whitespace-nowrap ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default function VendorProductsPage() {
  const { ready } = useRequireAuth('vendor');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
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

  const exportFile = (format) => window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/vendor/products/history/export?format=${format}`, '_blank');

  const toggleAvailability = async (vendorProductId) => {
    try {
      await api.patch(`/vendor/products/${vendorProductId}/availability`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability.');
    }
  };

  // Columns are created once and never depend on live edit state — that stability
  // is what prevents the New Price input from losing focus while typing.
  const columns = useMemo(() => [
    { header: 'Product', accessorKey: 'product.name', cell: (i) => (
      <div><div className="font-medium">{i.row.original.product?.name}</div><div className="text-xs text-gray-400">{i.row.original.product?.tamilName}</div></div>
    )},
    { header: 'Current Price (₹)', accessorKey: 'currentPrice' },
    { header: 'New Price (₹)', id: 'newPrice', cell: (i) => <PriceEditCell row={i.row.original} onChange={setEdit} /> },
    { header: 'Unit', accessorKey: 'product.unit', cell: (i) => i.row.original.product?.unit },
    { header: 'Last Updated', accessorKey: 'lastUpdated', cell: (i) => i.row.original.lastUpdated ? new Date(i.row.original.lastUpdated).toLocaleString() : '—' },
    { header: 'Status', accessorKey: 'status', cell: (i) => {
      const row = i.row.original;
      const active = row.status === 'active';
      return (
        <button
          onClick={() => toggleAvailability(row._id)}
          title="Click to toggle availability"
          className={`px-2 py-1 rounded-full text-xs transition-colors ${active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          {row.status}
        </button>
      );
    }},
  ], [setEdit]);

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Products & Prices</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
          <button onClick={() => exportFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
          <button onClick={openAdd} className="btn-secondary"><Plus size={16} /> Add Product</button>
          <button onClick={saveAll} disabled={saving} className="btn-primary"><Save size={16} /> Update Prices</button>
        </div>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input className="input-field pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} data={products} pageSize={15} />

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
              <input className="input-field" value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} placeholder="kg" />
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
