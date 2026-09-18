import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, Pill, FileText, User, ShieldCheck, Stethoscope, Key, Globe, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SarvamKeyModal from './SarvamKeyModal';

export default function Navbar() {
  const { currentUser, logout, selectedLanguage, setSelectedLanguage, sarvamApiKey, geminiApiKey, setRole } = useAuth();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Prescriptions', path: '/prescriptions', icon: Pill },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const languages = [
    { code: 'hi-IN', name: 'हिंदी (Hindi)' },
    { code: 'en-IN', name: 'English (India)' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)' },
    { code: 'mr-IN', name: 'मराठी (Marathi)' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)' }
  ];

  const switchToDoctorPortal = () => {
    setRole('doctor');
    navigate('/doctor');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <NavLink to="/dashboard" className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#2B4A8A] flex items-center justify-center shadow-md text-white">
                  <Activity className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xl font-bold text-[#2B4A8A] tracking-tight">
                    Medikiosk
                  </span>
                  <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-[#2B4A8A] font-bold border border-blue-200">
                    Patient Portal
                  </span>
                </div>
              </NavLink>
            </div>

            {/* STRICT PATIENT PORTAL NAVIGATION: Dashboard | Prescriptions | Reports | Profile */}
            <nav className="flex items-center space-x-1 md:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-[#2B4A8A] shadow-sm border border-blue-200'
                          : 'text-slate-600 hover:text-[#2B4A8A] hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Controls & Actions */}
            <div className="flex items-center space-x-3">
              {/* Language Selector */}
              <div className="relative hidden md:flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
                <Globe className="w-3.5 h-3.5 text-[#2B4A8A]" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent focus:outline-none text-slate-800 font-medium cursor-pointer"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI & OCR Key Configuration Button */}
              <button
                onClick={() => setShowKeyModal(true)}
                title="Configure Gemini Vision OCR & Sarvam AI Keys"
                className={`hidden lg:flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  geminiApiKey || sarvamApiKey
                    ? 'bg-blue-50 text-[#2B4A8A] border-blue-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>
                  {geminiApiKey && sarvamApiKey
                    ? 'Gemini + Sarvam Active'
                    : geminiApiKey
                    ? 'Gemini OCR Active'
                    : sarvamApiKey
                    ? 'Sarvam Active'
                    : 'AI Settings'}
                </span>
              </button>

              {/* Verified ABHA Badge */}
              {currentUser?.isAbhaVerified && (
                <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#2B4A8A] text-xs font-semibold border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2B4A8A]" />
                  <span>ABHA Verified</span>
                </div>
              )}

              {/* Doctor Portal Switch Button */}
              <button
                onClick={switchToDoctorPortal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#2B4A8A] hover:bg-[#223B6E] text-white text-xs font-bold shadow-sm transition-all"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Doctor Portal</span>
              </button>

              {/* Logout */}
              {currentUser && (
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sarvam Key Modal */}
      {showKeyModal && <SarvamKeyModal onClose={() => setShowKeyModal(false)} />}
    </>
  );
}
