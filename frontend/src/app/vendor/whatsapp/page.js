'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle, Send, Copy, Printer, CheckCircle2, XCircle, Users2, Plus, X,
  Search, ArrowRight, RotateCcw, Share2, Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function WhatsappSendPage() {
  const { ready } = useRequireAuth('vendor');
  const [message, setMessage] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupInput, setGroupInput] = useState('');
  const [queue, setQueue] = useState([]); // [{ historyId, type, name, mobile, waLink, status }]
  const [cursor, setCursor] = useState(0); // guided-send pointer
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.get('/vendor/customers', { params: { limit: 500 } }).then((r) => setCustomers(r.data.data));
    // Auto-prepare today's price list so the page is ready to go in one step.
    api.post('/vendor/whatsapp/prepare')
      .then(({ data }) => setMessage((m) => m || data.message))
      .catch(() => {});
  }, [ready]);

  const prepare = async () => {
    setPreparing(true);
    try {
      const { data } = await api.post('/vendor/whatsapp/prepare');
      setMessage(data.message);
      toast.success(`Price list ready — ${data.itemCount} item(s).`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to prepare message.');
    } finally {
      setPreparing(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name?.toLowerCase().includes(q) || String(c.mobile).includes(q));
  }, [customers, search]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const toggleSelect = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () => setSelected(Object.fromEntries(customers.map((c) => [c._id, true])));
  const clearAll = () => setSelected({});

  const addGroup = () => {
    const name = groupInput.trim();
    if (!name) return;
    if (groups.includes(name)) return toast.error('Group already added.');
    setGroups((g) => [...g, name]);
    setGroupInput('');
  };
  const removeGroup = (name) => setGroups((g) => g.filter((x) => x !== name));

  const startSending = async () => {
    const customerIds = Object.keys(selected).filter((id) => selected[id]);
    if (!message.trim()) return toast.error('Prepare or write a message first.');
    if (!customerIds.length && !groups.length) return toast.error('Select customers or add a group.');
    setSending(true);
    try {
      const { data } = await api.post('/vendor/whatsapp/send', { message, customerIds, groups });
      setQueue(data.data.map((d) => ({ ...d, status: 'pending' })));
      setCursor(0);
      toast.success(`Queue ready — ${data.data.length} recipient(s).`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to prepare sends.');
    } finally {
      setSending(false);
    }
  };

  const markStatus = async (item, status) => {
    try {
      await api.patch(`/vendor/whatsapp/history/${item.historyId}/status`, { status });
      setQueue((q) => q.map((x) => (x.historyId === item.historyId ? { ...x, status } : x)));
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  // Guided send: one tap opens WhatsApp with the message ready, marks it sent, and advances.
  const sendCurrent = () => {
    const item = queue[cursor];
    if (!item) return;
    window.open(item.waLink, '_blank', 'noopener,noreferrer');
    markStatus(item, 'sent');
    setCursor((c) => Math.min(c + 1, queue.length));
  };
  const skipCurrent = () => {
    const item = queue[cursor];
    if (item) markStatus(item, 'failed');
    setCursor((c) => Math.min(c + 1, queue.length));
  };

  // Native share (mobile/PWA): opens the system share sheet — pick any WhatsApp chat or group.
  const shareNative = async () => {
    if (!message.trim()) return toast.error('Prepare or write a message first.');
    if (navigator.share) {
      try { await navigator.share({ text: message }); } catch (e) { /* user cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
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
  const done = queue.length > 0 && cursor >= queue.length;
  const current = queue[cursor];
  const progress = queue.length ? Math.round((cursor / queue.length) * 100) : 0;

  if (!ready) return null;

  return (
    <AppShell role="vendor">
      <div className="premium-card p-6 mb-6 animate-rise">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gradient-animated">Send WhatsApp Price List</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Prepare once, then send to every customer and group with one tap each.
            </p>
          </div>
          <button onClick={shareNative} className="btn-secondary self-start md:self-center">
            <Share2 size={16} /> Share to any chat
          </button>
        </div>
      </div>

      {/* Guided sender — appears once the queue is built */}
      {queue.length > 0 && !done && current && (
        <div className="premium-card p-6 mb-6 animate-rise">
          <div className="relative">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-semibold">Sending {cursor + 1} of {queue.length}</span>
              <span className="text-gray-400">{sentCount} sent · {failedCount} skipped</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden mb-5">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="text-lg font-bold flex items-center gap-2">
                  {current.type === 'group' && <Users2 size={18} className="text-accent-400" />}
                  {current.name}
                </div>
                <div className="text-sm text-gray-400">
                  {current.type === 'group' ? 'WhatsApp opens with the message ready — just pick this group and hit send.' : current.mobile}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={skipCurrent} className="btn-secondary">Skip</button>
                <button onClick={sendCurrent} className="btn-premium px-6">
                  Open WhatsApp <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="premium-card p-6 mb-6 animate-rise text-center">
          <CheckCircle2 size={40} className="mx-auto text-brand-500 mb-2" />
          <h2 className="text-lg font-bold">All done!</h2>
          <p className="text-sm text-gray-400 mt-1">{sentCount} sent · {failedCount} skipped</p>
          <button onClick={() => { setQueue([]); setCursor(0); }} className="btn-secondary mx-auto mt-4">
            <RotateCcw size={14} /> Start a new broadcast
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message */}
        <div className="premium-card premium-card-hover p-5 animate-rise delay-1">
          <div className="relative flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2"><MessageCircle size={16} className="text-brand-500" /> Message</h2>
            <button onClick={prepare} disabled={preparing} className="btn-premium text-xs px-3 py-2">
              <Wand2 size={14} /> {preparing ? 'Preparing…' : 'Prepare Price List'}
            </button>
          </div>
          <textarea
            className="input-field h-64 font-mono text-sm relative"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Today's price list loads here automatically — or type your own message."
          />
          <div className="relative flex gap-2 mt-3">
            <button onClick={copyMessage} className="btn-secondary text-xs"><Copy size={14} /> Copy</button>
            <button onClick={printMessage} className="btn-secondary text-xs"><Printer size={14} /> Print</button>
          </div>
        </div>

        {/* Recipients */}
        <div className="premium-card premium-card-hover p-5 animate-rise delay-2">
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Customers ({selectedCount} selected)</h2>
              <div className="flex gap-2">
                <button onClick={selectAll} className="btn-secondary text-xs">Select All</button>
                <button onClick={clearAll} className="btn-secondary text-xs">Clear</button>
              </div>
            </div>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="input-field pl-9" placeholder="Search name or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredCustomers.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" className="accent-brand-500" checked={!!selected[c._id]} onChange={() => toggleSelect(c._id)} />
                  <span className="flex-1">{c.name} <span className="text-gray-400 text-xs">({c.mobile})</span></span>
                </label>
              ))}
              {!filteredCustomers.length && <p className="text-sm text-gray-400 p-2">No customers found.</p>}
            </div>

            {/* Groups */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Users2 size={15} className="text-accent-400" /> WhatsApp Groups ({groups.length})
              </h2>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Group name, e.g. Daily Buyers"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
                />
                <button onClick={addGroup} className="btn-secondary px-3"><Plus size={16} /></button>
              </div>
              {groups.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {groups.map((g) => (
                    <span key={g} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300 border border-accent-500/25">
                      <Users2 size={12} /> {g}
                      <button onClick={() => removeGroup(g)} className="hover:text-red-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                Group sends open WhatsApp with the message ready — you pick the group and tap send. WhatsApp doesn&apos;t allow apps to post into groups directly.
              </p>
            </div>

            <button onClick={startSending} disabled={sending} className="btn-premium w-full mt-4">
              <Send size={16} /> Start Broadcast ({selectedCount + groups.length})
            </button>
          </div>
        </div>
      </div>

      {/* Full queue with per-recipient controls */}
      {queue.length > 0 && (
        <div className="premium-card p-5 mt-4 animate-rise">
          <div className="relative">
            <h2 className="text-sm font-semibold mb-3">Broadcast Queue</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {queue.map((item, i) => (
                <div key={item.historyId} className={`flex items-center justify-between rounded-xl p-3 border transition-colors ${
                  i === cursor && !done ? 'border-brand-500/50 bg-brand-500/5' : 'border-gray-100 dark:border-white/5'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === 'group' && <Users2 size={15} className="text-accent-400 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.mobile}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.status === 'sent' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300'
                      : item.status === 'failed' ? 'bg-red-500/15 text-red-600 dark:text-red-300'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                    }`}>{item.status}</span>
                    <button onClick={() => window.open(item.waLink, '_blank', 'noopener,noreferrer')} className="btn-secondary text-xs">Open</button>
                    {item.status !== 'sent'
                      ? <button onClick={() => markStatus(item, 'sent')} className="btn-secondary text-xs text-brand-600 dark:text-brand-400"><CheckCircle2 size={13} /></button>
                      : <button onClick={() => markStatus(item, 'failed')} className="btn-secondary text-xs text-red-500"><XCircle size={13} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
