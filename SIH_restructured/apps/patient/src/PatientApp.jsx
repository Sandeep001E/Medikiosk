import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Activity,
  Pill,
  FileText,
  User,
  ShieldCheck,
  Stethoscope,
  LogOut,
  Key,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Bell,
  Wifi,
  Clock,
  Globe
} from 'lucide-react';

// Patient Portal Pages
import Login from './pages/patient/Login';
import Register from './pages/patient/Register';
import Dashboard from './pages/patient/Dashboard';
import ReportedProblemHistory from './pages/patient/ReportedProblemHistory';
import Prescriptions from './pages/patient/Prescriptions';
import Reports from './pages/patient/Reports';
import Profile from './pages/patient/Profile';

// AI Config Modal
import SarvamKeyModal from './components/SarvamKeyModal';
import { useLiveSync } from './shared/useLiveSync';
import { indianLanguages } from './utils/translations';

function PatientLayout() {
  const {
    currentUser,
    logout,
    geminiApiKey,
    sarvamApiKey,
    activeReportedProblem,
    removeActiveReportedProblem,
    uiLanguage,
    setUiLanguage,
    t
  } = useAuth();

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveNotification, setLiveNotification] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Connect to real-time Server-Sent Events from Patient Backend (Port 5005)
  const sseUrl = currentUser?.id
    ? `/api/patient/live-events/${currentUser.id}`
    : '/api/patient/live-events';

  const { isConnected } = useLiveSync(sseUrl, (data) => {
    if (!data || !data.event) return;

    if (data.event === 'PRESCRIPTION_ADDED') {
      const rx = data.payload?.prescription;
      const docName = data.payload?.doctorName || rx?.doctorName || 'Your Doctor';
      const medNames = rx?.medicines?.map(m => m.name).join(', ') || 'New medications';

      setLiveNotification({
        title: `New Prescription Issued by ${docName}`,
        message: `Prescribed: ${medNames}. Added to your active prescriptions in real-time.`,
        type: 'prescription',
        timestamp: new Date().toLocaleTimeString()
      });

      // Notify open components to refresh data
      window.dispatchEvent(new CustomEvent('patient-data-refresh', { detail: data }));
    } else if (data.event === 'REPORT_DIGITIZED') {
      setLiveNotification({
        title: 'Diagnostic Report Saved',
        message: data.payload?.report?.title || 'Your clinical document has been digitized.',
        type: 'report',
        timestamp: new Date().toLocaleTimeString()
      });
      window.dispatchEvent(new CustomEvent('patient-data-refresh', { detail: data }));
    }
  });

  // Auto-dismiss toast notification after 8 seconds
  useEffect(() => {
    if (liveNotification) {
      const timer = setTimeout(() => setLiveNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [liveNotification]);

  // If user is not logged in, redirect to Ayushman login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleOpenReportedProblem = () => {
    setMobileMenuOpen(false);
    navigate('/dashboard?openReportedProblem=true');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-reported-problem-modal'));
    }, 50);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getProblemDaysActive = (timestamp) => {
    if (!timestamp) return 1;
    const diffHours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return 1;
    if (diffHours < 48) return 2;
    return 3;
  };

  const navItems = [
    { to: '/dashboard', label: t('dashboard', 'Dashboard'), icon: Activity },
    { to: '/problem-history', label: t('problemHistory', 'Problem History'), icon: Clock },
    { to: '/prescriptions', label: t('prescriptions', 'Prescriptions'), icon: Pill },
    { to: '/reports', label: t('reportsOcr', 'Reports & OCR'), icon: FileText },
    { to: '/profile', label: t('profile', 'Profile'), icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* REAL-TIME LIVE TOAST NOTIFICATION */}
      {liveNotification && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-bounce-short">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-300/40 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white tracking-tight">{liveNotification.title}</h4>
                <span className="text-[10px] text-emerald-200 font-mono">{liveNotification.timestamp}</span>
              </div>
              <p className="text-xs text-emerald-50 mt-1 leading-snug">{liveNotification.message}</p>
            </div>
            <button
              onClick={() => setLiveNotification(null)}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="h-[76px] bg-white border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">

        {/* Left: Brand Logo */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 md:hidden rounded-xl text-slate-500 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <NavLink
            to="/dashboard"
            className="flex items-center shrink-0"
            title="National Health Authority"
          >
            <img
              src="nha-logo.png"
              alt="National Health Authority"
              className="h-20 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-black text-[#2B4A8A] tracking-tight leading-none">
                Medikiosk
              </h1>
            </div>
          </NavLink>
        </div>

        {/* Right: Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">

          {/* Reported Problem */}
          <div className="relative hidden lg:flex items-center">
            <button
              type="button"
              onClick={handleOpenReportedProblem}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-bold text-xs shadow-xs ${activeReportedProblem
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border-amber-300'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-[#2B4A8A] border-blue-200/90'
                }`}
              title={
                activeReportedProblem
                  ? `Active Concern: ${activeReportedProblem.title}`
                  : t('reportAProblem', 'Report a Problem')
              }
            >
              <Sparkles
                className={`w-4 h-4 shrink-0 ${activeReportedProblem
                  ? 'text-amber-600 animate-pulse'
                  : 'text-[#2B4A8A]'
                  }`}
              />

              <div className="text-left leading-tight max-w-[170px]">
                <span className="text-xs font-black block truncate">
                  {activeReportedProblem
                    ? activeReportedProblem.title
                    : t('reportAProblem', 'Reported Problem')}
                </span>

                <span className="text-[10px] text-slate-500 font-mono">
                  {activeReportedProblem
                    ? `Day ${getProblemDaysActive(activeReportedProblem.timestamp)} of 3 active`
                    : `ABHA: ${currentUser.abhaId || '12-3456-7890-1234'}`}
                </span>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            {activeReportedProblem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeActiveReportedProblem();
                }}
                className="ml-1 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Remove active problem manually"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* UI LANGUAGE */}
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-2.5 py-1.5 shadow-xs hover:border-[#2B4A8A] transition-all">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#2B4A8A] shrink-0">
              <Globe className="h-4 w-4" />
            </div>

            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-[8px] font-black uppercase tracking-wider text-blue-900">
                {t('uiLanguageLabel', 'UI Language')}
              </span>

              <select
                value={uiLanguage}
                onChange={(e) => setUiLanguage(e.target.value)}
                className="max-w-[120px] bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1 py-0.5"
                title="Change UI Language - reflects across the entire portal"
              >
                {indianLanguages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Compact selector for very small screens */}
            <select
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value)}
              className="sm:hidden max-w-[82px] bg-transparent text-[10px] font-bold text-slate-800 outline-none cursor-pointer"
              title="Change UI Language"
              aria-label="Change UI Language"
            >
              {indianLanguages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all shadow-xs"
            title="Log out and return to Ayushman login screen"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('logout', 'Log Out')}</span>
          </button>

        </div>
      </header>
      <div className="flex flex-1 min-h-[calc(100vh-76px)]">

        <aside className="w-[270px] min-w-[270px] max-w-[270px] h-[calc(100vh-76px)] bg-white border-r border-slate-200 p-5 hidden md:flex flex-col justify-between shrink-0 shadow-xs sticky top-[76px] overflow-y-auto">

          <div className="space-y-6">
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                      ? 'bg-[#2B4A8A] text-white shadow-md shadow-[#2B4A8A]/25'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-[#2B4A8A]'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>

                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Account</span>
            </button>
          </div>

        </aside>
        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-xs flex">
            <div className="w-[280px] bg-white h-full p-5 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <span className="font-bold text-[#2B4A8A] text-sm">Patient Menu</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-[#2B4A8A] text-white' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* MAIN PAGE VIEW */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/problem-history" element={<ReportedProblemHistory />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>

      </div>

      {/* AI Config Modal */}
      {showKeyModal && <SarvamKeyModal onClose={() => setShowKeyModal(false)} />}
    </div>
  );
}

export default function PatientApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<PatientLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
