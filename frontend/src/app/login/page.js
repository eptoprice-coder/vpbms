'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Lock, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ username: '', password: '', remember: false });
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Enter username and password.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (typeof window !== 'undefined') localStorage.setItem('vpbms_token', data.token);
      setAuth({ token: data.token, user: data.user, vendor: data.vendor });
      toast.success(`Welcome back, ${data.user.name}`);
      router.push(data.user.role === 'super_admin' ? '/admin/dashboard' : '/vendor/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotUsername) return toast.error('Enter your username.');
    try {
      const { data } = await api.post('/auth/forgot-password', { username: forgotUsername });
      toast.success(data.message);
      setForgotOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md glass-card p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg mb-3">
            <Leaf className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-semibold">Vendor Price Broadcast</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to manage your daily prices</p>
        </div>

        {!forgotOpen ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  className="input-field pl-10"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. freshmart"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                />
                Remember me
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-brand-700 hover:underline">
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Enter your username. Your Super Admin will help you reset your password.</p>
            <input className="input-field" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} placeholder="Username" />
            <div className="flex gap-2">
              <button onClick={handleForgot} className="btn-primary flex-1 justify-center">Request Reset</button>
              <button onClick={() => setForgotOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
