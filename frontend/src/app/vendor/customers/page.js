'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, Download, Search } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useRequireAuth } from '@/hooks/useAuth';
import api, { downloadFile, exportExt } from '@/lib/api';

const GROUPS = ['Hotels', 'Retail Shops', 'Wholesalers', 'Restaurants', 'Street Vendors', 'Supermarkets', 'Other'];

export default function CustomersPage() {
  const { ready } = useRequireAuth('vendor');
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [selected, setSelected] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [form, setForm] = useState(empty());
  const fileRef = useRef(null);

  function empty() { return { name: '', mobile: '', businessName: '', location: '', group: 'Other', remarks: '', status: 'active' }; }

  const load = async () => setCustomers((await api.get('/vendor/customers', { params: { search, group } })).data.data);
  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line
  useEffect(() => { if (ready) { const t = setTimeout(load, 300); return () => clearTimeout(t); } }, [search, group]); // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm(c); setModalOpen(true); };

  const submit = async () => {
    try {
      if (editing) await api.put(`/vendor/customers/${editing._id}`, form);
      else await api.post('/vendor/customers', form);
      toast.success('Customer saved.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const doDelete = async () => {
    await api.delete(`/vendor/customers/${confirmTarget._id}`);
    toast.success('Customer deleted.');
    setConfirmTarget(null);
    load();
  };

  const doBulkDelete = async () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    const { data } = await api.delete('/vendor/customers/bulk', { data: { ids } });
    toast.success(`Deleted ${data.deleted} customer(s).`);
    setSelected({});
    setConfirmBulk(false);
    load();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((r) => ({
          name: r.name || r.Name, mobile: r.mobile || r.Mobile, businessName: r.businessName || r.Business,
          location: r.location || r.Location, group: r.group || r.Group || 'Other', remarks: r.remarks || r.Remarks,
        }));
        try {
          const { data } = await api.post('/vendor/customers/import', { customers: rows });
          toast.success(`Imported ${data.imported}, skipped ${data.skipped}.`);
          load();
        } catch (err) {
          toast.error('Import failed.');
        }
      },
    });
    e.target.value = '';
  };

  const exportFile = (format) =>
    downloadFile(`/vendor/customers/export?format=${format}`, `customers.${exportExt(format)}`)
      .catch((e) => toast.error(e.message || 'Download failed.'));

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const columns = useMemo(() => [
    { header: '', id: 'select', cell: (i) => (
      <input type="checkbox" checked={!!selected[i.row.original._id]} onChange={(e) => setSelected((s) => ({ ...s, [i.row.original._id]: e.target.checked }))} />
    )},
    { header: 'Name', accessorKey: 'name' },
    { header: 'Mobile', accessorKey: 'mobile' },
    { header: 'Business', accessorKey: 'businessName' },
    { header: 'Location', accessorKey: 'location' },
    { header: 'Group', accessorKey: 'group', cell: (i) => <span className="px-2 py-1 rounded-full text-xs bg-brand-100 text-brand-700">{i.row.original.group}</span> },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Actions', id: 'actions', cell: (i) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(i.row.original)} className="btn-secondary px-2 py-1"><Edit size={14} /></button>
        <button onClick={() => setConfirmTarget(i.row.original)} className="btn-danger px-2 py-1"><Trash2 size={14} /></button>
      </div>
    )},
  ], [selected]);

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Customer Management</h1>
        <div className="flex gap-2 flex-wrap">
          <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleImportFile} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload size={16} /> Import CSV</button>
          <button onClick={() => exportFile('excel')} className="btn-secondary"><Download size={16} /> Excel</button>
          <button onClick={() => exportFile('pdf')} className="btn-secondary"><Download size={16} /> PDF</button>
          {selectedCount > 0 && <button onClick={() => setConfirmBulk(true)} className="btn-danger"><Trash2 size={16} /> Delete ({selectedCount})</button>}
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Customer</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input className="input-field pl-9" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field max-w-xs" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All groups</option>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={customers} pageSize={15} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit}>Save</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Mobile</label><input className="input-field" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Business Name</label><input className="input-field" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Location</label><input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Group</label>
            <select className="input-field" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}>
              {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Remarks</label><input className="input-field" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} title="Delete Customer" message={`Delete "${confirmTarget?.name}"?`} onConfirm={doDelete} onCancel={() => setConfirmTarget(null)} />
      <ConfirmDialog open={confirmBulk} title="Delete Selected Customers" message={`Delete ${selectedCount} selected customer(s)?`} onConfirm={doBulkDelete} onCancel={() => setConfirmBulk(false)} />
    </AppShell>
  );
}
