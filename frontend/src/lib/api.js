import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : '/api',
  timeout: 20000, // if the server doesn't answer in 20s, fail loudly instead of hanging forever
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vpbms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      localStorage.removeItem('vpbms_token');
      localStorage.removeItem('vpbms_auth');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // No response at all (timeout, or the server is asleep/unreachable) — say so instead
    // of leaving the button looking like it did nothing.
    if (typeof window !== 'undefined' && !err.response) {
      const message = err.code === 'ECONNABORTED'
        ? 'The server is taking a while to respond (it may be waking up). Please try again in a few seconds.'
        : 'Could not reach the server. Check your connection and try again.';
      toast.error(message);
    }
    return Promise.reject(err);
  }
);

// Downloads a file from an authenticated endpoint. window.open() can't send the
// Authorization header, so exports go through axios as a blob.
// Installed PWAs on phones (especially iPhone) cannot use normal browser downloads,
// so on devices that support it we hand the file to the system share sheet instead
// (user can pick "Save to Files", WhatsApp, etc.). Desktop falls back to a real download.
export const downloadFile = async (path, filename) => {
  let res;
  try {
    res = await api.get(path, { responseType: 'blob' });
  } catch (err) {
    // Server sent a JSON error as a blob — surface the real message.
    let msg = 'Download failed. Please try again.';
    try {
      const text = await err.response?.data?.text?.();
      if (text) msg = JSON.parse(text).message || msg;
    } catch (_) { /* keep generic */ }
    const e = new Error(msg);
    e.original = err;
    throw e;
  }

  const dispo = res.headers['content-disposition'];
  const match = dispo && /filename="?([^";]+)"?/.exec(dispo);
  // Caller-provided name wins (it includes the vendor name); server name is the fallback.
  const name = filename || (match && match[1]) || 'download';
  const blob = res.data;

  // Phone / PWA path only: share sheet handles files where downloads can't.
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isMobile) {
    try {
      const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return; // user closed the share sheet — not an error
      // fall through to classic download
    }
  }

  // Desktop (and mobile fallback): plain anchor download — no library needed.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const exportExt = (format) => (format === 'excel' ? 'xlsx' : 'pdf');

// "Fresh Mart Vegetables" -> "Fresh-Mart-Vegetables" for use in filenames.
export const fileSlug = (name) => String(name || '').trim().replace(/[^\w஀-௿ -]/g, '').replace(/\s+/g, '-') || 'vendor';

export default api;
