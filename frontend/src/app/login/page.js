'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import EptomartLogo from '@/components/ui/EptomartLogo';

const PARTICLES = [
  { left: '8%', size: 3, duration: 16, delay: 0 },
  { left: '18%', size: 2, duration: 22, delay: 4 },
  { left: '31%', size: 4, duration: 18, delay: 9 },
  { left: '46%', size: 2, duration: 25, delay: 2 },
  { left: '58%', size: 3, duration: 20, delay: 12 },
  { left: '69%', size: 2, duration: 17, delay: 6 },
  { left: '81%', size: 4, duration: 23, delay: 10 },
  { left: '92%', size: 2, duration: 19, delay: 3 },
];

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
    // "dark" wrapper forces dark-theme styles here regardless of the user's saved theme —
    // this page is always rendered on the navy background.
    <div className="dark relative min-h-screen flex flex-col items-center justify-center bg-navy-950 p-4 overflow-hidden">
      {/* ambient background */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="aurora-blob aurora-1 w-[34rem] h-[34rem] -top-40 -left-32" />
        <div className="aurora-blob aurora-2 w-[30rem] h-[30rem] -bottom-32 -right-24" />
        <div className="aurora-blob aurora-3 w-[38rem] h-[38rem] top-1/3 left-1/3" />
        <div className="absolute inset-0 bg-grid-faint" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle bottom-0"
            style={{ left: p.left, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
          />
        ))}
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,9,20,0.8)_100%)]" />
      </div>

      <div className="relative w-full max-w-md premium-card p-8 animate-rise">
        {/* soft glow behind the card content */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative flex flex-col items-center mb-8">
          <div className="relative animate-rise delay-1">
            {/* soft halo behind the transparent logo */}
            <div className="absolute inset-0 scale-150 rounded-full blur-2xl opacity-60 pointer-events-none" aria-hidden="true"
              style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.35), rgba(249,115,22,0.2) 55%, transparent 75%)' }}
            />
            <EptomartLogo size={110} className="relative" />
          </div>
          <h1 className="text-[1.7rem] font-extrabold tracking-tight mt-5 text-white animate-rise delay-2">
            Eptomart <span className="text-gradient-animated">Partner Hub</span>
          </h1>
          <p className="text-[0.925rem] text-gray-300 mt-2 flex items-center gap-1.5 animate-rise delay-3">
            <Sparkles size={14} className="text-accent-400" />
            Sign in to manage your daily prices
          </p>
        </div>

        {!forgotOpen ? (
          <form onSubmit={handleSubmit} className="relative space-y-5">
            <div className="animate-rise delay-3">
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block tracking-wider uppercase">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-3 text-gray-500 transition-colors group-focus-within:text-brand-400" size={18} />
                <input
                  className="input-premium pl-11"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. freshmart"
                  autoFocus
                />
              </div>
            </div>
            <div className="animate-rise delay-4">
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block tracking-wider uppercase">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 text-gray-500 transition-colors group-focus-within:text-accent-400" size={18} />
                <input
                  type="password"
                  className="input-premium pl-11"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm animate-rise delay-5">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-brand-500"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                />
                Remember me
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-accent-400 hover:text-accent-300 transition-colors hover:underline underline-offset-4">
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-premium w-full animate-rise delay-6">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="relative space-y-4 animate-rise">
            <p className="text-sm text-gray-400">Enter your username. Your Super Admin will help you reset your password.</p>
            <input className="input-premium" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} placeholder="Username" />
            <div className="flex gap-2">
              <button onClick={handleForgot} className="btn-premium flex-1">Request Reset</button>
              <button onClick={() => setForgotOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <p className="relative text-xs text-gray-400 mt-7 animate-rise delay-6">
        Powered by <span className="font-semibold text-gradient-animated">Eptomart</span>
      </p>
    </div>
  );
}
