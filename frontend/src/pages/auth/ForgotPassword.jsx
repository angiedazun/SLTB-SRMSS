import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to send reset email. Please try again.'
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
        className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary-400/20 blur-[80px]"
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
                <p className="text-xs text-gray-400">Password Recovery</p>
              </div>
            </div>

            {sent ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-6">
                  We sent a password reset link to <span className="font-medium text-gray-700">{email}</span>
                </p>
                <Link to="/login" className="btn-primary inline-flex">
                  <ArrowLeft size={15} /> Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot Password?</h2>
                <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-2xl mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@sltb.lk"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 justify-center">
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                    ) : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <Link to="/login" className="text-sm text-gray-500 hover:text-primary-400 flex items-center justify-center gap-1.5 transition-colors">
                    <ArrowLeft size={14} /> Back to Sign In
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
