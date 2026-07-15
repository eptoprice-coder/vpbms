'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle, Send, Copy, Printer, CheckCircle2, XCircle, Users2, Plus, X,
  Search, ArrowRight, RotateCcw, Share2, Wand2, FileText, PackageX, Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { useRequireAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

const isAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

// Rewrites a wa.me link to force a specific WhatsApp app on Android
// (com.whatsapp = WhatsApp, com.whatsapp.w4b = WhatsApp Business).
function linkForApp(waLink, app) {
  if (!isAndroid() || !app || app === 'default') return waLink;
  try {
    const u = new URL(waLink);
    const phone = u.pathname.replace(/\//g, '');
    const text = u.searchParams.get('text') || '';
    const pkg = app === 'w4b' ? 'com.whatsapp.w4b' : 'com.whatsapp';
    return `intent://send?phone=${phone}&text=${encodeURIComponent(text)}#Intent;scheme=whatsapp;package=${pkg};end`;
  } catch {
    return waLink;
  }
}

export default function WhatsappSendPage() {
  const { ready } = useRequireAuth('vendor');
  const { vendor } = useAuthStore();
  const [message, setMessage] = useState('');
  const [payload, setPayload] = useState(null); // structured prepare response (items, header, timestamp info)
  const [products, setProducts] = useState([]);
  const [productSel, setProductSel] = useState({}); // all active products pre-selected
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState({}); // all customers pre-selected
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupInput, setGroupInput] = useState('');
  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  // Which WhatsApp app to use on Android when two are installed.
  const [waApp, setWaApp] = useState('ask'); // 'ask' | 'default' (WhatsApp) | 'w4b' (Business)
  const [chosenApp, setChosenApp] = useState(null); // per-broadcast choice
  const [chooserOpen, setChooserOpen] = useState(false);
  const [rememberApp, setRememberApp] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // fn to run once an app is chosen

  const shareFormat = payload?.shareFormat || vendor?.settings?.shareFormat || 'text';

  useEffect(() => {
    setWaApp(localStorage.getItem('vpbms_wa_app') || 'ask');
  }, []);

  useEffect(() => {
    if (!ready) return;
    api.get('/vendor/customers', { params: { limit: 500 } }).then((r) => {
      setCustomers(r.data.data);
      // Everyone selected by default — vendor unchecks who to skip.
      setSelected(Object.fromEntries(r.data.data.map((c) => [c._id, true])));
    });
    api.get('/vendor/products').then((r) => {
      const list = r.data.data;
      setProducts(list);
      // All in-stock priced items pre-selected — vendor removes what they don't want to send.
      setProductSel(Object.fromEntries(list.filter((p) => p.status === 'active' && p.currentPrice > 0).map((p) => [p._id, true])));
    });
  }, [ready]);

  const includedIds = useMemo(() => Object.keys(productSel).filter((id) => productSel[id]), [productSel]);
  const sellableProducts = useMemo(() => products.filter((p) => p.status === 'active' && p.currentPrice > 0), [products]);
  const unavailableProducts = useMemo(() => products.filter((p) => p.status === 'inactive'), [products]);

  const prepare = async () => {
    if (!includedIds.length) return toast.error('Keep at least one item selected.');
    setPreparing(true);
    try {
      const { data } = await api.post('/vendor/whatsapp/prepare', { includeIds: includedIds });
      setMessage(data.message);
      setPayload(data);
      toast.success(`Price list ready — ${data.itemCount} item(s)${data.unavailable?.length ? `, ${data.unavailable.length} marked unavailable` : ''}.`);
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

  // ——— WhatsApp app choice ———
  const needsChooser = () => isAndroid() && waApp === 'ask' && !chosenApp;
  const withApp = (fn) => {
    if (needsChooser()) {
      setPendingAction(() => fn);
      setChooserOpen(true);
    } else {
      fn(chosenApp || (waApp !== 'ask' ? waApp : 'default'));
    }
  };
  const chooseApp = (app) => {
    setChosenApp(app);
    setChooserOpen(false);
    if (rememberApp) {
      localStorage.setItem('vpbms_wa_app', app);
      setWaApp(app);
    }
    if (pendingAction) { pendingAction(app); setPendingAction(null); }
  };
  const setAppPref = (v) => { setWaApp(v); localStorage.setItem('vpbms_wa_app', v); setChosenApp(null); };

  // ——— broadcast ———
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

  const openWa = (waLink, app) => {
    const href = linkForApp(waLink, app);
    if (href.startsWith('intent://')) window.location.href = href;
    else window.open(href, '_blank', 'noopener,noreferrer');
  };

  const sendCurrent = () => withApp((app) => {
    const item = queue[cursor];
    if (!item) return;
    openWa(item.waLink, app);
    markStatus(item, 'sent');
    setCursor((c) => Math.min(c + 1, queue.length));
  });
  const skipCurrent = () => {
    const item = queue[cursor];
    if (item) markStatus(item, 'failed');
    setCursor((c) => Math.min(c + 1, queue.length));
  };

  // ——— PDF price list (admin-selected format) ———
  const buildPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 14;

    // Header band
    doc.setFillColor(5, 9, 20);
    doc.rect(0, 0, pageW, 34, 'F');
    if (vendor?.settings?.logo) {
      try { doc.addImage(vendor.settings.logo, 'PNG', 12, 6, 22, 22); } catch (e) { /* logo optional */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.text(payload?.businessName || vendor?.businessName || 'Price List', vendor?.settings?.logo ? 40 : 14, 15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(payload?.header || 'Daily Price List', vendor?.settings?.logo ? 40 : 14, 22);
    doc.setFontSize(9);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, vendor?.settings?.logo ? 40 : 14, 28);

    y = 42;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Product', 'Price (₹)', 'Unit']],
      body: (payload?.items || []).map((it, i) => [i + 1, it.name, `₹${it.price}`, it.unit]),
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });
    y = doc.lastAutoTable.finalY + 8;

    if (payload?.unavailable?.length) {
      doc.setFontSize(11);
      doc.setTextColor(190, 30, 30);
      doc.setFont(undefined, 'bold');
      doc.text('Not Available Today', 14, y);
      y += 2;
      autoTable(doc, {
        startY: y + 2,
        head: [['Product']],
        body: payload.unavailable.map((it) => [it.name]),
        theme: 'plain',
        headStyles: { textColor: [190, 30, 30], fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 10, cellPadding: 2 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    doc.text(payload?.footer || 'Thank you.', 14, y + 2);

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('Powered by Eptomart · An Eptosi Group Company', pageW / 2, pageH - 8, { align: 'center' });

    return { doc, filename: `price-list-${now.toISOString().slice(0, 10)}.pdf` };
  };

  const sharePdf = async () => {
    if (!payload?.items?.length) return toast.error('Prepare the price list first.');
    const { doc, filename } = await buildPdf();
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        doc.save(filename);
        toast('PDF downloaded — attach it in WhatsApp.', { icon: '📄' });
      }
      // record the broadcast
      const { data } = await api.post('/vendor/whatsapp/send', { message: `[PDF] ${payload.header} — ${payload.itemCount} items`, groups: ['PDF Broadcast'] });
      await api.patch(`/vendor/whatsapp/history/${data.data[0].historyId}/status`, { status: 'sent' });
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Could not share the PDF.');
    }
  };

  const downloadPdf = async () => {
    if (!payload?.items?.length) return toast.error('Prepare the price list first.');
    const { doc, filename } = await buildPdf();
    doc.save(filename);
  };

  const shareNative = async () => {
    if (!message.trim()) return toast.error('Prepare or write a message first.');
    if (navigator.share) {
      try { await navigator.share({ text: message }); } catch (e) { /* cancelled */ }
    } else {
      withApp((app) => openWa(`https://wa.me/?text=${encodeURIComponent(message)}`, app));
    }
  };

  const copyMessage = () => { navigator.clipboard.writeText(message); toast.success('Message copied.'); };
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
              Everything is pre-selected — remove what you don&apos;t want, prepare, and send.
              {shareFormat === 'pdf' && <span className="ml-1 font-semibold text-accent-500">PDF format (set by admin).</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            {isAndroid() && (
              <select className="input-field w-auto text-xs" value={waApp} onChange={(e) => setAppPref(e.target.value)} title="Which WhatsApp app to open">
                <option value="ask">Ask which WhatsApp</option>
                <option value="default">Always WhatsApp</option>
                <option value="w4b">Always WA Business</option>
              </select>
            )}
            <button onClick={shareNative} className="btn-secondary">
              <Share2 size={16} /> Share to any chat
            </button>
          </div>
        </div>
      </div>

      {/* Guided sender */}
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
                  {current.type === 'group' ? 'WhatsApp opens with the message ready — pick this group and hit send.' : current.mobile}
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
          <button onClick={() => { setQueue([]); setCursor(0); setChosenApp(null); }} className="btn-secondary mx-auto mt-4">
            <RotateCcw size={14} /> Start a new broadcast
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: items */}
        <div className="premium-card premium-card-hover p-5 animate-rise delay-1">
          <div className="relative">
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-brand-500 text-white text-[11px] flex items-center justify-center font-bold">1</span>
              Items ({includedIds.length} of {sellableProducts.length})
            </h2>
            <p className="text-[11px] text-gray-400 mb-2">All items are included by default — untick to leave one out today.</p>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {sellableProducts.map((p) => (
                <label key={p._id} className="flex items-center gap-2 text-sm p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" className="accent-brand-500" checked={!!productSel[p._id]}
                    onChange={() => setProductSel((s) => ({ ...s, [p._id]: !s[p._id] }))} />
                  <span className="flex-1 truncate">{p.product?.name}</span>
                  <span className="text-xs text-gray-400 tabular-nums">₹{p.currentPrice}/{p.product?.unit}</span>
                </label>
              ))}
              {!sellableProducts.length && <p className="text-sm text-gray-400 p-2">No priced products yet.</p>}
            </div>
            {unavailableProducts.length > 0 && (
              <p className="text-[11px] text-red-500/90 mt-2 flex items-center gap-1">
                <PackageX size={12} /> {unavailableProducts.length} out-of-stock item(s) will be listed as &quot;Not Available&quot;.
              </p>
            )}
            <button onClick={prepare} disabled={preparing} className="btn-premium w-full mt-3 text-sm">
              <Wand2 size={15} /> {preparing ? 'Preparing…' : 'Prepare Price List'}
            </button>
          </div>
        </div>

        {/* Step 2: message */}
        <div className="premium-card premium-card-hover p-5 animate-rise delay-2">
          <div className="relative">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-brand-500 text-white text-[11px] flex items-center justify-center font-bold">2</span>
              <MessageCircle size={15} className="text-brand-500" /> Message
              {shareFormat === 'pdf' && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-500">
                  <FileText size={11} /> PDF
                </span>
              )}
            </h2>
            <textarea
              className="input-field h-52 font-mono text-xs"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Select items and tap 'Prepare Price List' — or type your own message."
            />
            <div className="flex gap-2 mt-2">
              <button onClick={copyMessage} className="btn-secondary text-xs"><Copy size={13} /> Copy</button>
              <button onClick={printMessage} className="btn-secondary text-xs"><Printer size={13} /> Print</button>
              {shareFormat === 'pdf' && (
                <button onClick={downloadPdf} className="btn-secondary text-xs"><FileText size={13} /> PDF</button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: recipients */}
        <div className="premium-card premium-card-hover p-5 animate-rise delay-3">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-brand-500 text-white text-[11px] flex items-center justify-center font-bold">3</span>
                Recipients ({selectedCount})
              </h2>
              <div className="flex gap-1.5">
                <button onClick={selectAll} className="btn-secondary text-[11px] px-2 py-1">All</button>
                <button onClick={clearAll} className="btn-secondary text-[11px] px-2 py-1">None</button>
              </div>
            </div>
            <div className="relative mb-1.5">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input className="input-field pl-8 text-sm py-1.5" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {filteredCustomers.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" className="accent-brand-500" checked={!!selected[c._id]} onChange={() => toggleSelect(c._id)} />
                  <span className="flex-1 truncate">{c.name} <span className="text-gray-400 text-xs">({c.mobile})</span></span>
                </label>
              ))}
              {!filteredCustomers.length && <p className="text-sm text-gray-400 p-2">No customers found.</p>}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <div className="flex gap-1.5">
                <input
                  className="input-field flex-1 text-sm py-1.5"
                  placeholder="Group name…"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
                />
                <button onClick={addGroup} className="btn-secondary px-2.5"><Plus size={15} /></button>
              </div>
              {groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {groups.map((g) => (
                    <span key={g} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300 border border-accent-500/25">
                      <Users2 size={11} /> {g}
                      <button onClick={() => removeGroup(g)} className="hover:text-red-500"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {shareFormat === 'pdf' ? (
              <button onClick={sharePdf} className="btn-premium w-full mt-3 text-sm">
                <FileText size={15} /> Share PDF via WhatsApp
              </button>
            ) : (
              <button onClick={startSending} disabled={sending} className="btn-premium w-full mt-3 text-sm">
                <Send size={15} /> Start Broadcast ({selectedCount + groups.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full queue */}
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
                    <button onClick={() => withApp((app) => openWa(item.waLink, app))} className="btn-secondary text-xs">Open</button>
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

      {/* WhatsApp app chooser (Android with both apps installed) */}
      <Modal open={chooserOpen} onClose={() => { setChooserOpen(false); setPendingAction(null); }} title="Which WhatsApp?" maxWidth="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Smartphone size={16} /> Choose the app to send from:
          </p>
          <button onClick={() => chooseApp('default')} className="btn-secondary w-full justify-center py-3 text-sm font-semibold">
            <MessageCircle size={16} className="text-green-600" /> WhatsApp
          </button>
          <button onClick={() => chooseApp('w4b')} className="btn-secondary w-full justify-center py-3 text-sm font-semibold">
            <MessageCircle size={16} className="text-teal-600" /> WhatsApp Business
          </button>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" className="accent-brand-500" checked={rememberApp} onChange={(e) => setRememberApp(e.target.checked)} />
            Remember my choice
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}
