import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, LogOut, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DoctorNavbar() {
  const { currentUser, logout, setRole } = useAuth();
  const navigate = useNavigate();

  const switchToPatientPortal = () => {
    setRole('patient');
    navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1A2D54] border-b border-[#13203C] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#2B4A8A] border border-blue-400/30 flex items-center justify-center text-white">
              <Stethoscope className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  Medikiosk
                </span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 font-bold border border-blue-400/30">
                  Doctor Clinical Workstation
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium">Ayushman Bharat Digital Mission Compatible</p>
            </div>
          </div>

          {/* Doctor Info & Switcher */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-3 bg-[#2B4A8A]/80 px-3 py-1.5 rounded-xl border border-blue-400/30">
              <div className="w-8 h-8 rounded-full bg-white text-[#2B4A8A] flex items-center justify-center font-bold text-sm">
                DR
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {currentUser?.name || 'Consulting Physician'}
                </p>
                <p className="text-[10px] text-blue-200">
                  {currentUser?.regNumber ? `Reg: ${currentUser.regNumber}` : (currentUser?.hospital || 'Clinical Workstation')}
                </p>
              </div>
            </div>

            {/* Switch to Patient Portal */}
            <button
              onClick={switchToPatientPortal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#2B4A8A] text-xs font-bold transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Switch to Patient Portal</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 rounded-lg text-blue-200 hover:text-rose-400 hover:bg-[#13203C] transition-colors"
              title="Log Out Doctor Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
