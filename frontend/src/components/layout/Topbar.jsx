import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, User, ChevronDown, Crown, Zap, Settings, Shield } from 'lucide-react';
import { logoutUser } from '../../features/auth/authSlice.js';
import { RoleBadge } from '../common/RoleBadge.jsx';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/tickets': 'Tickets',
  '/tickets/create': 'Create Ticket',
  '/categories': 'Categories',
  '/profile': 'My Profile',
  '/admin/users': 'User Administration',
  '/admin/categories': 'Categories',
};

export const Topbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const pageTitle = PAGE_TITLES[location.pathname] || 'Operations';
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';

  const avatarGradient = isAdmin
    ? 'from-purple-600 to-purple-500'
    : isAgent
    ? 'from-blue-600 to-blue-500'
    : 'from-slate-800 to-slate-700';

  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-extrabold text-slate-900 text-base leading-none">{pageTitle}</h2>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">BitMax Support Platform</p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">

        {/* Verified badge */}
        {user?.isVerified && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-bold text-emerald-700">
            <Shield className="w-3 h-3" />
            Verified
          </div>
        )}

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGradient} text-white font-black flex items-center justify-center text-sm shadow-md`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                <span>{user?.name || 'User'}</span>
                {isAdmin && <Crown className="w-3 h-3 text-purple-500" />}
                {isAgent && <Zap className="w-3 h-3 text-blue-500" />}
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                {user?.email}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100/80 py-2 z-40 anim-fade-in">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100 mb-1">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${avatarGradient} text-white font-black flex items-center justify-center text-base shadow-md flex-shrink-0`}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                    <div className="mt-1">
                      <RoleBadge role={user?.role} />
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span>My Profile & Settings</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors border-t border-slate-100 mt-1"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
