import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle, KeyRound } from 'lucide-react';
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

  const { isLoading, error, devOtp, otpPendingEmail } = useSelector((state) => state.auth);

  const emailParam = location.state?.email || location.state?.identifier || otpPendingEmail || '';
  const typeParam = location.state?.type || 'register';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // If devOtp is available, auto-fill for frictionless testing
  useEffect(() => {
    if (devOtp) {
      setOtp(devOtp);
    }
  }, [devOtp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    let result;
    if (typeParam === 'login') {
      const isEmail = emailParam.includes('@');
      result = await dispatch(
        verifyLoginOtp({
          ...(isEmail ? { email: emailParam } : { phone: emailParam }),
          otp,
        })
      );
    } else {
      result = await dispatch(verifyOtp({ email: emailParam, otp, type: 'register' }));
    }

    if (!result.error) {
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    dispatch(clearError());
    setResendStatus('Sending fresh code...');

    try {
      await dispatch(requestLoginOtp({ email: emailParam }));
      setTimer(60);
      setCanResend(false);
      setResendStatus('New code sent successfully.');
    } catch {
      setResendStatus('Failed to resend code.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security Check</h2>
          <p className="text-xs text-slate-500 mt-1">
            We sent a 6-digit code to <strong className="text-slate-800">{emailParam || 'your email'}</strong>
          </p>
        </div>

        {/* Demo Helper Banner */}
        {devOtp && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Demo OTP: <strong>{devOtp}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setOtp(devOtp)}
              className="text-[11px] font-bold text-blue-600 underline"
            >
              Paste
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="mb-4 bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs text-center">
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
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center text-2xl font-bold tracking-[8px] border border-slate-200 rounded-xl py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length < 6}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Resend Code
              </button>
            ) : (
              <span>Resend in {timer}s</span>
            )}
          </div>
          <Link to="/login" className="font-semibold text-slate-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
