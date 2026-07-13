'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Send, Copy, Printer, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function WhatsappSendPage() {
  const { ready } = useRequireAuth('vendor');
  const [message, setMessage] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState({});
  const [queue, setQueue] = useState([]); // [{ customerId, name, mobile, waLink, historyId, status }]
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.get('/vendor/customers', { params: { limit: 500 } }).then((r) => setCustomers(r.data.data));
  }, [ready]);

  const prepare = async () => {
    setPreparing(true);
    try {
      const { data } = await api.post('/vendor/whatsapp/prepare');
      setMessage(data.message);
      toast.success(`Price list prepared with ${data.itemCount} item(s).`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to prepare message.');
    } finally {
      setPreparing(false);
    }
  };

  const toggleSelect = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () => setSelected(Object.fromEntries(customers.map((c) => [c._id, true])));
  const clearAll = () => setSelected({});

  const send = async () => {
    const customerIds = Object.keys(selected).filter((id) => selected[id]);
    if (!message.trim()) return toast.error('Prepare or write a message first.');
    if (!customerIds.length) return toast.error('Select at least one customer.');

    try {
      const { data } = await api.post('/vendor/whatsapp/send', { message, customerIds });
      setQueue(data.data.map((d) => ({ ...d, status: 'pending' })));
      toast.success(`Ready to send to ${data.data.length} customer(s). Click each WhatsApp link below.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to prepare sends.');
    }
  };

  const openLink = (item) => {
    window.open(item.waLink, '_blank', 'noopener,noreferrer');
  };

  const markStatus = async (item, status) => {
    try {
      await api.patch(`/vendor/whatsapp/history/${item.historyId}/status`, { status });
      setQueue((q) => q.map((x) => (x.historyId === item.historyId ? { ...x, status } : x)));
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    toast.success('Message copied.');
  };

  const printMessage = () => {
    const w = window.open('', '_blank');
    w.document.write(`<pre style="font-family: sans-serif; white-space: pre-wrap;">${message}</pre>`);
    w.print();
  };

  const sentCount = queue.filter((q) => q.status === 'sent').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;
  const pendingCount = queue.filter((q) => q.status === 'pending').length;

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <h1 className="text-xl font-semibold mb-4">Send WhatsApp Price List</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2"><MessageCircle size={16} /> Message</h2>
            <button onClick={prepare} disabled={preparing} className="btn-primary text-xs">Prepare Price List</button>
          </div>
          <textarea
            className="input-field h-64 font-mono text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Click 'Prepare Price List' to auto-generate from today's prices, or type your own message."
          />
          <div className="flex gap-2 mt-3">
            <button onClick={copyMessage} className="btn-secondary text-xs"><Copy size={14} /> Copy</button>
            <button onClick={printMessage} className="btn-secondary text-xs"><Printer size={14} /> Print</button>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Select Customers ({Object.values(selected).filter(Boolean).length})</h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-secondary text-xs">Select All</button>
              <button onClick={clearAll} className="btn-secondary text-xs">Clear</button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {customers.map((c) => (
              <label key={c._id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-gray-800 cursor-pointer">
                <input type="checkbox" checked={!!selected[c._id]} onChange={() => toggleSelect(c._id)} />
                <span className="flex-1">{c.name} <span className="text-gray-400 text-xs">({c.mobile})</span></span>
              </label>
            ))}
          </div>
          <button onClick={send} className="btn-primary w-full justify-center mt-4"><Send size={16} /> Send via WhatsApp</button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="glass-card p-5 mt-4">
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={16} /> Sent: {sentCount}</span>
            <span className="flex items-center gap-1 text-amber-500"><Clock size={16} /> Pending: {pendingCount}</span>
            <span className="flex items-center gap-1 text-red-600"><XCircle size={16} /> Failed: {failedCount}</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.historyId} className="flex items-center justify-between border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.mobile}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'sent' ? 'bg-green-100 text-green-700' : item.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{item.status}</span>
                  <button onClick={() => openLink(item)} className="btn-secondary text-xs">Open WhatsApp</button>
                  <button onClick={() => markStatus(item, 'sent')} className="btn-secondary text-xs text-green-600">Mark Sent</button>
                  <button onClick={() => markStatus(item, 'failed')} className="btn-secondary text-xs text-red-600">Mark Failed</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
