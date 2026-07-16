'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UnitSelect from '@/components/ui/UnitSelect';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function ProductMasterPage() {
  const { ready } = useRequireAuth('super_admin');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(empty());

  function empty() { return { name: '', tamilName: '', category: '', unit: 'kg', defaultQuantity: 0, status: 'active' }; }

  const load = async () => {
    const [p, c] = await Promise.all([
      api.get('/products', { params: { search, category: categoryFilter } }),
      api.get('/categories'),
    ]);
    setProducts(p.data.data);
    setCategories(c.data.data);
  };

  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line
  useEffect(() => { if (ready) { const t = setTimeout(load, 300); return () => clearTimeout(t); } }, [search, categoryFilter]); // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, category: p.category?._id }); setModalOpen(true); };

  const submit = async () => {
    try {
      if (editing) await api.put(`/products/${editing._id}`, form);
      else await api.post('/products', form);
      toast.success('Product saved.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const doDelete = async () => {
    await api.delete(`/products/${confirmTarget._id}`);
    toast.success('Product deleted.');
    setConfirmTarget(null);
    load();
  };

  const columns = useMemo(() => [
    { header: 'Product', accessorKey: 'name' },
    { header: 'Tamil Name', accessorKey: 'tamilName' },
    { header: 'Category', accessorKey: 'category.name', cell: (i) => i.row.original.category?.name },
    { header: 'Unit', accessorKey: 'unit' },
    { header: 'Default Qty', accessorKey: 'defaultQuantity' },
    { header: 'Status', accessorKey: 'status', cell: (i) => (
      <span className={`px-2 py-1 rounded-full text-xs ${i.row.original.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{i.row.original.status}</span>
    )},
    { header: 'Actions', id: 'actions', cell: (i) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(i.row.original)} className="btn-secondary px-2 py-1"><Edit size={14} /></button>
        <button onClick={() => setConfirmTarget(i.row.original)} className="btn-danger px-2 py-1"><Trash2 size={14} /></button>
      </div>
    )},
  ], []);

  if (!ready) return null;

  return (
    <AppShell role="admin">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Product Master</h1>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Product</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input className="input-field pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field max-w-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={products} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'New Product'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit}>Save</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Product Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Tamil Name</label><input className="input-field" value={form.tamilName} onChange={(e) => setForm({ ...form, tamilName: e.target.value })} /></div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Unit</label><UnitSelect value={form.unit} onChange={(unit) => setForm({ ...form, unit })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Default Quantity</label><input type="number" className="input-field" value={form.defaultQuantity} onChange={(e) => setForm({ ...form, defaultQuantity: e.target.value })} /></div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} title="Delete Product" message={`Delete "${confirmTarget?.name}"?`} onConfirm={doDelete} onCancel={() => setConfirmTarget(null)} />
    </AppShell>
  );
}
