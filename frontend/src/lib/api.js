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
// Authorization header, so exports must go through axios as a blob.
export const downloadFile = async (path, filename) => {
  const res = await api.get(path, { responseType: 'blob' });
  // Prefer the server-suggested filename if provided
  const dispo = res.headers['content-disposition'];
  const match = dispo && /filename="?([^";]+)"?/.exec(dispo);
  const { saveAs } = await import('file-saver');
  saveAs(res.data, (match && match[1]) || filename);
};

export const exportExt = (format) => (format === 'excel' ? 'xlsx' : 'pdf');

export default api;
