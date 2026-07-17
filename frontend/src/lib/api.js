import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : '/api',
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
  const name = (match && match[1]) || filename;
  const blob = res.data;

  // Phone / PWA path: share sheet handles files where downloads can't.
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

  const { saveAs } = await import('file-saver');
  saveAs(blob, name);
};

export const exportExt = (format) => (format === 'excel' ? 'xlsx' : 'pdf');

export default api;
