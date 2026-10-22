import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { LifeBuoy, Lock, Mail, Phone, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { PhoneInput } from '../../components/common/PhoneInput.jsx';
import {
  loginPassword,
  requestLoginOtp,
  clearError,
  setPendingEmail,
} from '../../features/auth/authSlice.js';

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP Login Mode: 'phone' (default) or 'email'
  const [otpMethod, setOtpMethod] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginPassword({ email: email.trim(), password }));
    if (!result.error) {
      navigate('/dashboard');
    } else if (result.payload && typeof result.payload === 'string' && result.payload.includes('not verified')) {
      const devOtp = sessionStorage.getItem('lastDevOtp');
      setTimeout(() => {
        navigate('/verify-otp', {
          state: {
            email: email.trim(),
            identifier: email.trim(),
            type: 'register',
            devOtp,
          },
        });
      }, 1200);
    }
  };

  const handleOtpRequest = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    const isPhoneMode = otpMethod === 'phone';
    const payload = isPhoneMode
      ? { phone: phone.trim() }
      : { email: otpEmail.trim() };

    const targetIdentifier = isPhoneMode ? phone.trim() : otpEmail.trim();

    const result = await dispatch(requestLoginOtp(payload));
    if (!result.error) {
      const devOtp = result.payload?.devOtp;
      dispatch(setPendingEmail(targetIdentifier));
      setOtpSentMsg(
        isPhoneMode
          ? 'OTP dispatched to your registered mobile. Redirecting to verification...'
          : 'OTP dispatched to your registered email. Redirecting to verification...'
      );
      setTimeout(() => {
        navigate('/verify-otp', {
          state: {
            identifier: targetIdentifier,
            type: 'login',
            method: isPhoneMode ? 'phone' : 'email',
            devOtp,
          },
        });
      }, 700);
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            BitMax<span className="text-blue-600">.</span>Desk
          </h2>
          <p className="text-xs text-slate-500 mt-1">Enterprise Support & Ticketing</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              dispatch(clearError());
              setOtpSentMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'password'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('otp');
              dispatch(clearError());
              setOtpSentMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'otp'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mobile OTP Login
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {otpSentMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{otpSentMsg}</span>
          </div>
        )}

        {activeTab === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpRequest} className="space-y-4">
            {/* Delivery channel toggle */}
            <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOtpMethod('phone')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  otpMethod === 'phone'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile SMS</span>
              </button>
              <button
                type="button"
                onClick={() => setOtpMethod('email')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  otpMethod === 'email'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Code</span>
              </button>
            </div>

            {otpMethod === 'phone' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Mobile Number
                </label>
                <PhoneInput
                  id="login-phone"
                  value={phone}
                  onChange={setPhone}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A 6-digit OTP will be sent via SMS to this number.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Dispatching OTP...' : 'Send Real Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Register Link */}
        <div className="text-center mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
