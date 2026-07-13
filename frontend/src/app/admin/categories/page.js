'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function CategoriesPage() {
  const { ready } = useRequireAuth('super_admin');
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: 'Package', status: 'active' });

  const load = async () => setCategories((await api.get('/categories')).data.data);
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', icon: 'Package', status: 'active' }); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm(c); setModalOpen(true); };

  const submit = async () => {
    try {
      if (editing) await api.put(`/categories/${editing._id}`, form);
      else await api.post('/categories', form);
      toast.success('Category saved.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/categories/${confirmTarget._id}`);
      toast.success('Category deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
    setConfirmTarget(null);
    load();
  };

  const columns = useMemo(() => [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Icon', accessorKey: 'icon' },
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
        <h1 className="text-xl font-semibold">Product Categories</h1>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Category</button>
      </div>
      <DataTable columns={columns} data={categories} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit}>Save</button></>}>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Description</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Icon (Lucide icon name)</label><input className="input-field" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} title="Delete Category" message={`Delete "${confirmTarget?.name}"?`} onConfirm={doDelete} onCancel={() => setConfirmTarget(null)} />
    </AppShell>
  );
}
