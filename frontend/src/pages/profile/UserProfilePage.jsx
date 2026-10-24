import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { User, Mail, Phone, Save, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpRequested, setPhoneOtpRequested] = useState(false);
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState('');
  const [isRequestingPhoneOtp, setIsRequestingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentEmailOtp, setCurrentEmailOtp] = useState('');
  const [newEmailOtp, setNewEmailOtp] = useState('');
  const [emailChangePending, setEmailChangePending] = useState(false);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [isVerifyingEmailChange, setIsVerifyingEmailChange] = useState(false);

  const showSuccess = (msg) => { setSuccessMsg(msg); setErrorMsg(''); };
  const showError = (msg) => { setErrorMsg(msg); setSuccessMsg(''); };

  const handleRequestPhoneOtp = async () => {
    setIsRequestingPhoneOtp(true);
    setPhoneVerificationMessage('');
    setPhoneOtp('');
    try {
      const res = await api.post('/auth/phone/send-otp', { phone: user.phone });
      if (res.data.data.testOtp) {
        console.info(`[Mobile verification test OTP] ${res.data.data.testOtp}`);
      }
      setPhoneOtpRequested(true);
      setPhoneVerificationMessage(res.data.message);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate mobile verification code.');
    } finally {
      setIsRequestingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    setIsVerifyingPhoneOtp(true);
    try {
      const res = await api.post('/auth/phone/verify-otp', { phone: user.phone, otp: phoneOtp });
      await dispatch(fetchUserProfile());
      setPhoneOtpRequested(false);
      setPhoneOtp('');
      setPhoneVerificationMessage(res.data.message);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to verify mobile number.');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setIsRequestingEmailChange(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.post('/users/profile/email-change', { email: newEmail });
      setEmailChangePending(true);
      setCurrentEmailOtp('');
      setNewEmailOtp('');
      showSuccess(res.data.message);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send email change verification codes.');
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    setIsVerifyingEmailChange(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.post('/users/profile/email-change/verify', {
        currentEmailOtp,
        newEmailOtp,
      });
      await dispatch(fetchUserProfile());
      setEmailChangePending(false);
      setNewEmail('');
      setCurrentEmailOtp('');
      setNewEmailOtp('');
      showSuccess(res.data.message);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to verify the email change.');
    } finally {
      setIsVerifyingEmailChange(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.patch('/users/profile', { name, phone });
      await dispatch(fetchUserProfile());
      setPhoneOtpRequested(false);
      setPhoneOtp('');
      setPhoneVerificationMessage('');
      showSuccess('Profile updated successfully!');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your personal settings.</p>
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
          <InfoCard icon={Phone} label="Phone" value={formatDisplayPhone(user?.phone)} />
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
      <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-4 sm:p-8">
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
              Current Work Email
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
            <p className="text-[11px] text-slate-500 mt-1">
              To update your sign-in email, verify codes sent to both your current and new email addresses.
            </p>
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

      <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-6">
        <h3 className="text-sm font-extrabold text-slate-900 mb-2">Change Sign-in Email</h3>
        <p className="text-xs text-slate-500 mb-4">
          We will send separate verification codes to your current email and the new address.
        </p>
        <form onSubmit={handleRequestEmailChange} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            maxLength={100}
            autoComplete="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setEmailChangePending(false);
              setCurrentEmailOtp('');
              setNewEmailOtp('');
            }}
            placeholder="Enter your new email address"
            aria-label="New sign-in email address"
            className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isRequestingEmailChange || isVerifyingEmailChange || !newEmail.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
          >
            {isRequestingEmailChange ? 'Sending...' : emailChangePending ? 'Resend Codes' : 'Send Verification Codes'}
          </button>
        </form>
        {emailChangePending && (
          <form onSubmit={handleVerifyEmailChange} className="mt-4 space-y-3">
            <p className="text-xs text-slate-600">
              Enter the 6-digit code sent to <strong>{user?.email}</strong> and the code sent to <strong>{newEmail}</strong>.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={currentEmailOtp}
                onChange={(e) => setCurrentEmailOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Current email code"
                aria-label="Current email verification code"
                className="text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={newEmailOtp}
                onChange={(e) => setNewEmailOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="New email code"
                aria-label="New email verification code"
                className="text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifyingEmailChange || currentEmailOtp.length !== 6 || newEmailOtp.length !== 6}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
            >
              {isVerifyingEmailChange ? 'Verifying...' : 'Verify and Change Email'}
            </button>
          </form>
        )}
      </div>

      {!user?.isPhoneVerified && (
        <div className="bg-white rounded-3xl border border-slate-200/80 card-shadow p-6">
          <h3 className="text-sm font-extrabold text-slate-900 mb-2">Verify Mobile Number</h3>
          <p className="text-xs text-slate-500 mb-4">
            Generate a mobile verification code. In development, it will be logged in the browser console.
          </p>
          {phoneVerificationMessage && (
            <p className="text-xs text-emerald-700 mb-3">{phoneVerificationMessage}</p>
          )}
          <button
            type="button"
            onClick={handleRequestPhoneOtp}
            disabled={isRequestingPhoneOtp || isVerifyingPhoneOtp}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            {isRequestingPhoneOtp ? 'Generating...' : 'Generate Verification Code'}
          </button>
          {phoneOtpRequested && (
            <form onSubmit={handleVerifyPhoneOtp} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                aria-label="Mobile verification code"
                className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isVerifyingPhoneOtp || phoneOtp.length !== 6}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
              >
                {isVerifyingPhoneOtp ? 'Verifying...' : 'Verify Phone'}
              </button>
            </form>
          )}
        </div>
      )}

    </div>
  );
};
