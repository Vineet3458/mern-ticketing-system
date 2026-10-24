import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  LifeBuoy, User, Mail, Lock, ArrowRight, AlertCircle,
  Eye, EyeOff, CheckCircle2, ShieldCheck, Zap
} from 'lucide-react';
import { registerUser, clearError, setPendingEmail } from '../../features/auth/authSlice.js';
import { PhoneInput } from '../../components/common/PhoneInput.jsx';

const PasswordStrength = ({ password }) => {
  const checks = [
    { label: '6+ characters', pass: password.length >= 6 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special character', pass: /[!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][score] || '';
  const barColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][score] || '';

  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= score ? barColor : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map(({ label, pass }) => (
            <span key={label} className={`text-[10px] flex items-center gap-0.5 font-medium ${pass ? 'text-emerald-600' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-2.5 h-2.5" />
              {label}
            </span>
          ))}
        </div>
        <span className={`text-[10px] font-bold ${barColor.replace('bg-', 'text-')}`}>{strengthLabel}</span>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('customer');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(registerUser({ name, email, phone, password, role }));
    if (!result.error) {
      dispatch(setPendingEmail(email));
      navigate('/verify-otp', { state: { email, type: 'register' } });
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Brand header */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 px-5 sm:px-8 py-6 text-white text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm items-center justify-center mb-3 shadow-lg">
              <LifeBuoy className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Create Account</h1>
            <p className="text-blue-100 text-xs mt-1">Join the BitMax Support Network</p>
          </div>

          <div className="p-5 sm:p-8">
            {error && (
              <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs flex items-start gap-2 anim-slide-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="jane.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  ⚠ Temporary/disposable email services are not allowed.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                <PhoneInput
                  id="register-phone"
                  value={phone}
                  onChange={setPhone}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { value: 'customer', label: 'Customer', desc: 'Raise & track tickets', icon: User },
                    { value: 'agent', label: 'Support Agent', desc: 'Respond & resolve', icon: Zap },
                  ].map(({ value, label, desc, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                        role === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${role === value ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold ${role === value ? 'text-blue-800' : 'text-slate-700'}`}>{label}</span>
                      <span className="text-[10px] text-slate-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-100 disabled:opacity-50 disabled:scale-100"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Creating Account...' : 'Continue with OTP Verification'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <Link to="/login" className="font-bold text-blue-600 hover:underline">
                  Sign In →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
