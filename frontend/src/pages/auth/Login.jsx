import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, Route, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.identifier, form.password, rememberMe);
      if (data?.user?.role === 'driver') {
        navigate('/driver/me');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh relative overflow-y-auto bg-gradient-to-br from-slate-50 via-rose-50 to-red-50">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_12%_10%,rgba(239,68,68,0.12),transparent),radial-gradient(55%_55%_at_88%_90%,rgba(251,113,133,0.10),transparent)]" />

      <div className="relative z-10 min-h-dvh w-full max-w-7xl mx-auto px-0 py-0 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid min-h-dvh grid-cols-1 rounded-none sm:rounded-3xl border-y border-red-100/70 sm:border bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.12)] lg:grid-cols-5 lg:overflow-hidden">
          <section className="relative hidden lg:flex lg:col-span-3 p-10 flex-col justify-between border-r border-red-100 bg-gradient-to-br from-red-100 via-rose-50 to-white">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
                <ShieldCheck size={14} />
                Secure Operations Portal
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight text-gray-900">Smart Route Management for Modern Fleet Operations</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-600">
                Centralized control for schedules, buses, drivers, and maintenance across SLTB depots with live operational visibility.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Route, title: 'Real-time Route Oversight', desc: 'Track route performance and on-time operations from a unified control dashboard.' },
                { icon: CalendarCheck, title: 'Schedule Reliability', desc: 'Manage timetables with conflict-free planning and operational intelligence.' },
                { icon: ShieldCheck, title: 'Role-based Access Control', desc: 'Secure sign-in and granular permissions for administrators and managers.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white flex-shrink-0">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="col-span-1 lg:col-span-2 p-4 sm:p-8 lg:p-10 bg-white overflow-y-auto pt-4 sm:pt-8">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="min-h-full flex flex-col justify-between rounded-3xl border border-red-100/80 bg-gradient-to-b from-white to-rose-50/30 px-3 py-4 sm:p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-800 flex items-center justify-center shadow-lg ring-4 ring-red-50">
                    <Bus size={19} className="text-white" />
                  </div>
                  <div>
                    <p className="text-base font-black text-gray-900 leading-tight">SLTB SRMSS</p>
                    <p className="text-[11px] text-gray-500">Sri Lanka Transport Board</p>
                  </div>
                </div>
                <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600">
                  Premium Access
                </span>
              </div>

              <div className="mt-4 sm:mt-7">
                <h2 className="text-[34px] leading-none sm:text-3xl font-black text-gray-900">Welcome back</h2>
                <p className="mt-2 text-sm text-gray-500">Sign in to continue to your command dashboard.</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Username or Email</label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      value={form.identifier}
                      onChange={onChange}
                      placeholder="username or you@sltb.lk"
                      className="input pl-10 bg-white border-gray-200 focus:border-red-400 focus:ring-red-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password</label>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={form.password}
                      onChange={onChange}
                      placeholder="Enter your password"
                      className="input pl-10 pr-11 bg-white border-gray-200 focus:border-red-400 focus:ring-red-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-400 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-gray-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="mt-2 w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-red-500 to-red-700 px-5 py-3 text-base font-black tracking-wide text-white shadow-[0_14px_30px_rgba(220,38,38,0.34)] hover:brightness-105 hover:shadow-[0_16px_34px_rgba(220,38,38,0.42)] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={17} />
                    </>
                  )}
                </motion.button>
              </form>

              <p className="mt-auto pt-4 sm:pt-6 text-center text-[11px] text-gray-400 hidden sm:block">
                © {new Date().getFullYear()} SLTB SRMSS · Smart Route Management & Scheduling System
              </p>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}
