import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Lock, Eye, EyeOff, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Reset failed. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100" />
      <motion.div
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-red-400/20 blur-[80px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-4xl shadow-glass-lg overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.7)',
          }}
        >
          <div className="px-8 py-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
                <Bus size={22} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">SLTB SRMSS</p>
                <p className="text-xs text-gray-400">Set New Password</p>
              </div>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                <p className="text-sm text-gray-500 mb-1">Your password has been updated successfully.</p>
                <p className="text-xs text-gray-400 mb-6">Redirecting to sign in…</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 px-6 py-2.5 text-sm font-bold text-white shadow hover:brightness-105 transition-all"
                >
                  <ArrowLeft size={15} /> Go to Sign In
                </Link>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">Create New Password</h2>
                    <p className="text-xs text-gray-500">Must be at least 6 characters</p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-2xl mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Min. 6 characters"
                        className="input pl-10 pr-11"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder="Re-enter password"
                        className="input pl-10 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 py-3 text-base font-bold text-white shadow-[0_10px_24px_rgba(220,38,38,0.35)] hover:brightness-105 transition-all disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Updating…
                      </>
                    ) : (
                      'Set New Password'
                    )}
                  </motion.button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowLeft size={13} /> Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
