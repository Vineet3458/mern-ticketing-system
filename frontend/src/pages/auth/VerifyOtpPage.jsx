import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import {
  verifyOtp,
  verifyLoginOtp,
  requestLoginOtp,
  clearError,
} from '../../features/auth/authSlice.js';

export const VerifyOtpPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, error, otpPendingEmail } = useSelector((state) => state.auth);

  const identifier = location.state?.identifier || location.state?.email || otpPendingEmail || '';
  const typeParam = location.state?.type || 'register';
  const isEmail = identifier.includes('@');

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const devOtp = location.state?.devOtp || sessionStorage.getItem('lastDevOtp') || '';

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (devOtp) {
      console.log(
        '%c╔══════════════════════════════════════════════════════════════════════╗\n' +
        `║  🔑 [TESTING OTP READY]: ${String(devOtp).padEnd(42)}║\n` +
        '╚══════════════════════════════════════════════════════════════════════╝',
        'color: #10b981; font-weight: bold; font-family: monospace; font-size: 14px; background: #0f172a; padding: 4px;'
      );
    }
  }, [devOtp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    let result;
    if (typeParam === 'login') {
      result = await dispatch(
        verifyLoginOtp({
          ...(isEmail ? { email: identifier } : { phone: identifier }),
          otp: otp.trim(),
        })
      );
    } else {
      result = await dispatch(verifyOtp({ email: identifier, otp: otp.trim(), type: 'register' }));
    }

    if (!result.error) {
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    dispatch(clearError());
    setResendStatus('Dispatching fresh verification code...');

    try {
      const payload = isEmail ? { email: identifier } : { phone: identifier };
      await dispatch(requestLoginOtp(payload));
      setTimer(60);
      setCanResend(false);
      setResendStatus('A new OTP has been dispatched.');
    } catch {
      setResendStatus('Failed to dispatch code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security Check</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter the 6-digit verification code sent to{' '}
            <strong className="text-slate-800">{identifier || 'your device'}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="mb-4 bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs text-center font-medium">
            {resendStatus}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="otp-input w-full text-center text-2xl font-bold py-3 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all tracking-[10px] font-mono"
            />
            {devOtp && (
              <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-blue-700">Test OTP:</span>
                  <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-600 tracking-wider">
                    {devOtp}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying...' : 'Verify Code & Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400">
            {canResend ? "Didn't receive the OTP code?" : `Resend available in ${timer}s`}
          </p>
          <button
            type="button"
            disabled={!canResend}
            onClick={handleResend}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:hover:text-blue-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${!canResend ? 'animate-spin' : ''}`} />
            <span>Request New Code</span>
          </button>
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};
