'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import EptomartLogo from '@/components/ui/EptomartLogo';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy-950 p-4">
      <div className="w-full max-w-md glass-card p-8 bg-navy-900/70 border-navy-700/50">
        <div className="flex flex-col items-center mb-6">
          <EptomartLogo size={48} showTagline className="flex-col text-center mb-2" />
          <h1 className="text-lg font-semibold text-white mt-3">Vendor Price Broadcast</h1>
          <p className="text-sm text-gray-400">Sign in to manage your daily prices</p>
        </div>

        {!forgotOpen ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-500" size={18} />
                <input
                  className="input-field pl-10 bg-navy-800 border-navy-600 text-white placeholder:text-gray-500 focus:ring-accent-500"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. freshmart"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-gray-500" size={18} />
                <input
                  type="password"
                  className="input-field pl-10 bg-navy-800 border-navy-600 text-white placeholder:text-gray-500 focus:ring-accent-500"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                />
                Remember me
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-accent-400 hover:underline">
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700">
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Enter your username. Your Super Admin will help you reset your password.</p>
            <input className="input-field bg-navy-800 border-navy-600 text-white placeholder:text-gray-500" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} placeholder="Username" />
            <div className="flex gap-2">
              <button onClick={handleForgot} className="btn-primary flex-1 justify-center bg-gradient-to-r from-brand-600 to-accent-600">Request Reset</button>
              <button onClick={() => setForgotOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-6">
        Powered by <span className="font-semibold bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">Eptomart</span>
      </p>
    </div>
  );
}
