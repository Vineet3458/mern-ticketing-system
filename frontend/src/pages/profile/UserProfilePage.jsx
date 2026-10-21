import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  User, Mail, Phone, Save, CheckCircle2, AlertCircle,
  ShieldCheck, Lock, Smartphone, ArrowRight, RefreshCw
} from 'lucide-react';
import { RoleBadge } from '../../components/common/RoleBadge.jsx';
import { PhoneInput } from '../../components/common/PhoneInput.jsx';
import api from '../../services/api.js';
import { fetchUserProfile } from '../../features/auth/authSlice.js';

const InfoCard = ({ icon: Icon, label, value, verified, verifiedLabel }) => (
  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm flex-shrink-0">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate">{value || '—'}</p>
    </div>
    {verified !== undefined && (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${
        verified
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-amber-700 bg-amber-50 border-amber-200'
      }`}>
        {verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {verified ? verifiedLabel || 'Verified' : 'Unverified'}
      </span>
    )}
  </div>
);

/**
 * Converts stored E.164 phone ("+919876543210") into
 * a human-readable display: "🇮🇳 +91 98765 43210"
 */
const formatDisplayPhone = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  const national = digits.startsWith('91') && digits.length === 12
    ? digits.slice(2)
    : digits.slice(-10);
  if (national.length !== 10) return raw;
  return `🇮🇳 +91 ${national.slice(0, 5)} ${national.slice(5)}`;
};

export const UserProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Phone OTP verification flow
  const [phoneOtpStep, setPhoneOtpStep] = useState('idle'); // idle | sent | verified
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);

  const showSuccess = (msg) => { setSuccessMsg(msg); setErrorMsg(''); };
  const showError = (msg) => { setErrorMsg(msg); setSuccessMsg(''); };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.patch('/users/profile', { name, phone });
      await dispatch(fetchUserProfile());
      showSuccess('Profile updated successfully!');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!user?.phone) return;
    setPhoneOtpLoading(true);
    setPhoneOtpError('');
    try {
      const res = await api.post('/auth/phone/send-otp', { phone: user.phone });
      setPhoneOtpStep('sent');
      setPhoneOtpTimer(60);

      // Countdown
      const interval = setInterval(() => {
        setPhoneOtpTimer(t => {
          if (t <= 1) { clearInterval(interval); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      setPhoneOtpError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    setPhoneOtpLoading(true);
    setPhoneOtpError('');
    try {
      await api.post('/auth/phone/verify-otp', { phone: user.phone, otp: phoneOtpCode });
      await dispatch(fetchUserProfile());
      setPhoneOtpStep('verified');
      setPhoneOtpCode('');
      showSuccess('📱 Phone number verified successfully!');
    } catch (err) {
      setPhoneOtpError(err.response?.data?.message || 'Invalid OTP code.');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your personal settings and verifications.</p>
      </div>

      {/* Avatar Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-slate-500/20 flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h2 className="text-lg font-black text-slate-900">{user?.name}</h2>
              <RoleBadge role={user?.role} />
            </div>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Member since {joinedDate}</p>
          </div>
        </div>

        {/* Quick Status */}
        <div className="grid grid-cols-2 gap-2 mt-5 pt-5 border-t border-slate-100">
          <InfoCard icon={Mail} label="Email" value={user?.email} verified={user?.isVerified} />
          <InfoCard icon={Phone} label="Phone" value={formatDisplayPhone(user?.phone)} verified={user?.isPhoneVerified} verifiedLabel="Phone ✓" />
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Profile Edit Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-8">
        <h3 className="text-sm font-extrabold text-slate-900 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Edit Profile
        </h3>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email <span className="text-slate-400 font-normal">(read-only)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <PhoneInput
              id="profile-phone"
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-100 disabled:opacity-50 disabled:scale-100"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isUpdating ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Phone Verification Card */}
      {!user?.isPhoneVerified && (
        <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-8">
          <h3 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            Verify Mobile Number
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Receive an OTP on{' '}
            <strong className="font-mono tracking-wide">{formatDisplayPhone(user?.phone)}</strong>{' '}
            to verify your phone number.
          </p>

          {phoneOtpError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{phoneOtpError}</span>
            </div>
          )}

          {phoneOtpStep === 'idle' && (
            <button
              type="button"
              onClick={handleSendPhoneOtp}
              disabled={phoneOtpLoading || !user?.phone}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-100 disabled:opacity-50 disabled:scale-100"
            >
              <Smartphone className="w-3.5 h-3.5" />
              {phoneOtpLoading ? 'Sending OTP...' : 'Send OTP to Phone'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {phoneOtpStep === 'sent' && (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                  Enter 6-digit code sent to{' '}
                  <span className="font-mono">{formatDisplayPhone(user?.phone)}</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={phoneOtpCode}
                  onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-2xl font-black tracking-[10px] border-2 border-slate-200 rounded-xl py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {phoneOtpTimer > 0
                    ? `Resend in ${phoneOtpTimer}s`
                    : (
                      <button type="button" onClick={handleSendPhoneOtp} disabled={phoneOtpLoading} className="text-emerald-600 font-bold underline flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Resend Code
                      </button>
                    )
                  }
                </span>
                <button
                  type="submit"
                  disabled={phoneOtpLoading || phoneOtpCode.length < 6}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {phoneOtpLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Phone Already Verified Card */}
      {user?.isPhoneVerified && (
        <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800">Mobile Number Verified</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              <span className="font-mono tracking-wide">{formatDisplayPhone(user?.phone)}</span>{' '}was verified on{' '}
              {user?.phoneVerifiedAt
                ? new Date(user.phoneVerifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'N/A'}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
