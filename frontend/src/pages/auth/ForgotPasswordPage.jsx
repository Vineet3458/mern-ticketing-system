import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifeBuoy, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api.js';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg('');
    setError('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg(res.data.message || 'OTP sent to your registered phone and email.');
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request reset OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 sm:p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reset Password</h2>
          <p className="text-xs text-slate-500 mt-1">Enter your registered email to receive a reset code on your mobile & email</p>
        </div>

        {msg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="name@bitmax.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Sending...' : 'Send Reset OTP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
