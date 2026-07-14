'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Edit, Ban, Trash2, KeyRound, BarChart3, Camera, Store, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PriceTrendChart from '@/components/ui/PriceTrendChart';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function VendorsPage() {
  const { ready } = useRequireAuth('super_admin');
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return { username: '', password: '', name: '', email: '', phone: '', businessName: '', category: '', address: '', location: '', whatsappNumber: '', logo: '' };
  }

  const logoFileRef = useRef(null);

  // Downscale any uploaded image to a compact square data URL.
  const handleLogoFile = (file) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      setForm((f) => ({ ...f, logo: canvas.toDataURL('image/png') }));
    };
    img.src = url;
  };

  const load = async () => {
    const [v, c] = await Promise.all([api.get('/admin/vendors', { params: { search } }), api.get('/categories')]);
    setVendors(v.data.data);
    setCategories(c.data.data);
  };

  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line
  useEffect(() => { if (ready) { const t = setTimeout(load, 300); return () => clearTimeout(t); } }, [search]); // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      username: v.user?.username || '', password: '', name: v.user?.name || '', email: v.user?.email || '',
      phone: v.user?.phone || '', businessName: v.businessName, category: v.category?._id || '',
      address: v.address || '', location: v.location || '', whatsappNumber: v.whatsappNumber || '',
      logo: v.settings?.logo || '',
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      if (editing) {
        await api.put(`/admin/vendors/${editing._id}`, form);
        toast.success('Vendor updated.');
      } else {
        await api.post('/admin/vendors', form);
        toast.success('Vendor created.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const toggleStatus = async (v) => {
    await api.patch(`/admin/vendors/${v._id}/disable`);
    toast.success(`Vendor ${v.status === 'active' ? 'disabled' : 'enabled'}.`);
    load();
  };

  const doDelete = async () => {
    await api.delete(`/admin/vendors/${confirmTarget._id}`);
    toast.success('Vendor deleted.');
    setConfirmTarget(null);
    load();
  };

  const resetPassword = async (v) => {
    const { data } = await api.post(`/admin/vendors/${v._id}/reset-password`);
    toast.success(`Temp password: ${data.tempPassword}`, { duration: 8000 });
  };

  const columns = useMemo(() => [
    { header: 'Vendor', accessorKey: 'businessName', cell: (i) => {
      const v = i.row.original;
      return (
        <div className="flex items-center gap-2.5">
          {v.settings?.logo ? (
            <img src={v.settings.logo} alt="" className="h-8 w-8 rounded-lg object-cover border border-white/15 shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-brand-600 dark:text-brand-300 text-xs font-bold shrink-0">
              {(v.businessName || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium">{v.businessName}</div>
            <div className="text-xs text-gray-400">@{v.user?.username}</div>
          </div>
        </div>
      );
    }},
    { header: 'Category', accessorKey: 'category.name', cell: (i) => i.row.original.category?.name },
    { header: 'Status', accessorKey: 'status', cell: (i) => (
      <span className={`px-2 py-1 rounded-full text-xs ${i.row.original.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {i.row.original.status}
      </span>
    )},
    { header: 'Customers', accessorKey: 'customerCount' },
    { header: 'Msgs Sent', accessorKey: 'messagesSent' },
    { header: 'Last Login', accessorKey: 'user.lastLogin', cell: (i) => i.row.original.user?.lastLogin ? new Date(i.row.original.user.lastLogin).toLocaleString() : '—' },
    { header: 'Actions', id: 'actions', cell: (i) => {
      const v = i.row.original;
      return (
        <div className="flex gap-1">
          <button onClick={() => openEdit(v)} className="btn-secondary px-2 py-1" title="Edit"><Edit size={14} /></button>
          <button onClick={() => toggleStatus(v)} className="btn-secondary px-2 py-1" title="Disable/Enable"><Ban size={14} /></button>
          <button onClick={() => resetPassword(v)} className="btn-secondary px-2 py-1" title="Reset Password"><KeyRound size={14} /></button>
          <button onClick={() => setReportTarget(v)} className="btn-secondary px-2 py-1" title="View Reports"><BarChart3 size={14} /></button>
          <button onClick={() => setConfirmTarget(v)} className="btn-danger px-2 py-1" title="Delete"><Trash2 size={14} /></button>
        </div>
      );
    }},
  ], []);

  if (!ready) return null;

  return (
    <AppShell role="admin">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Vendor Management</h1>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Vendor</button>
      </div>

      <input className="input-field max-w-sm mb-4" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <DataTable columns={columns} data={vendors} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Vendor' : 'Create Vendor'}
        maxWidth="max-w-xl"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit}>Save</button></>}
      >
        <div className="col-span-2 flex items-center gap-4 mb-4">
          <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-white/20 shrink-0">
            {form.logo ? (
              <img src={form.logo} alt="Vendor logo" className="h-full w-full object-cover" />
            ) : (
              <span className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-brand-600 dark:text-brand-300"><Store size={24} /></span>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              <button type="button" onClick={() => logoFileRef.current?.click()} className="btn-secondary text-xs"><Camera size={14} /> Upload logo</button>
              {form.logo && (
                <button type="button" onClick={() => setForm({ ...form, logo: '' })} className="btn-secondary text-xs text-red-500"><X size={14} /> Remove</button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Shown in the vendor&apos;s app header and dashboard.</p>
          </div>
          <input ref={logoFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => { handleLogoFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} disabled={!!editing} />
          {!editing && <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />}
          <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Business Name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="WhatsApp Number" value={form.whatsappNumber} onChange={(v) => setForm({ ...form, whatsappNumber: v })} />
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete Vendor"
        message={`Delete "${confirmTarget?.businessName}"? This cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => setConfirmTarget(null)}
      />

      <Modal open={!!reportTarget} onClose={() => setReportTarget(null)} title={`Reports — ${reportTarget?.businessName}`} maxWidth="max-w-2xl">
        <VendorReportPanel vendorId={reportTarget?._id} />
      </Modal>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = 'text', disabled }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input type={type} className="input-field" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function VendorReportPanel({ vendorId }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    if (!vendorId) return;
    setSelectedProduct('');
    api.get(`/admin/vendors/${vendorId}/reports`).then((r) => setData(r.data.data));
    api.get(`/admin/vendors/${vendorId}/price-history`).then((r) => setHistory(r.data.data));
  }, [vendorId]);

  const products = useMemo(() => {
    const map = new Map();
    history.forEach((h) => {
      if (h.product?._id && !map.has(h.product._id)) map.set(h.product._id, h.product);
    });
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [history]);

  const entries = useMemo(
    () => (selectedProduct ? history.filter((h) => h.product?._id === selectedProduct) : []),
    [history, selectedProduct]
  );
  const productObj = products.find((p) => p._id === selectedProduct);

  if (!data) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="glass-card p-3 text-center"><div className="text-xl font-semibold">{data.priceUpdates}</div><div className="text-gray-400 text-xs">Price Updates</div></div>
        <div className="glass-card p-3 text-center"><div className="text-xl font-semibold">{data.messagesSent}</div><div className="text-gray-400 text-xs">Messages Sent</div></div>
        <div className="glass-card p-3 text-center"><div className="text-xl font-semibold">{data.customers}</div><div className="text-gray-400 text-xs">Customers</div></div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold">Product Price Trend</h3>
          <select
            className="input-field sm:max-w-xs sm:ml-auto"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}{p.unit ? ` (per ${p.unit})` : ''}</option>
            ))}
          </select>
        </div>
        {selectedProduct ? (
          <PriceTrendChart entries={entries} productName={productObj?.name} unit={productObj?.unit} />
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            {products.length ? 'Pick a product to see its price movement.' : 'No price history recorded for this vendor yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
