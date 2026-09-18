import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Activity, Stethoscope, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { loginPatient, loginDoctor } = useAuth();
  const navigate = useNavigate();

  const [abhaIdInput, setAbhaIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleMode, setRoleMode] = useState('patient'); // 'patient' or 'doctor'
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          abhaId: abhaIdInput.trim(),
          email: abhaIdInput.trim(),
          password,
          role: roleMode
        })
      });
      const data = await res.json();

      if (data.success) {
        if (roleMode === 'doctor') {
          loginDoctor(data.user);
          navigate('/doctor');
        } else {
          loginPatient(data.user);
          navigate('/dashboard');
        }
      } else {
        setErrorMsg(data.message || 'Invalid Ayushman Bharat ID or password');
      }
    } catch (err) {
      setErrorMsg('Login server request failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2B4A8A] text-white shadow-xl shadow-[#2B4A8A]/25 mb-4 transform hover:scale-105 transition-transform">
          <Activity className="w-9 h-9 stroke-[2.5]" />
        </div>
        
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#2B4A8A] text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ayushman Bharat Digital Mission (ABDM)</span>
        </div>

        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Medikiosk Health Kiosk
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 font-medium">
          Sign in with your <strong>Ayushman Bharat ID (ABHA)</strong> & Password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl border border-slate-200/80 sm:px-10 space-y-6">
          
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setRoleMode('patient');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                roleMode === 'patient'
                  ? 'bg-[#2B4A8A] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Ayushman Patient</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleMode('doctor');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                roleMode === 'doctor'
                  ? 'bg-[#2B4A8A] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Portal</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* AYUSHMAN BHARAT ID INPUT */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {roleMode === 'doctor' ? 'Doctor Workstation Email / Reg' : 'Ayushman Bharat ID (ABHA ID)'}
                </label>
                {roleMode === 'patient' && (
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    14-Digit or @abha
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-3.5 text-[#2B4A8A]">
                  {roleMode === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  required
                  value={abhaIdInput}
                  onChange={(e) => setAbhaIdInput(e.target.value)}
                  placeholder={roleMode === 'doctor' ? 'dr.ananya@medikiosk.in' : 'e.g. 12-3456-7890-1234 or name@abha'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              {roleMode === 'patient' && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Enter your Ayushman Bharat Health Account number (ABHA ID).
                </p>
              )}
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-[#2B4A8A] hover:bg-[#223B6E] text-white font-bold text-sm shadow-lg shadow-[#2B4A8A]/25 hover:shadow-xl transform active:scale-98 transition-all disabled:opacity-70"
              >
                <span>
                  {isLoading
                    ? 'Authenticating...'
                    : roleMode === 'doctor'
                    ? 'Sign In to Doctor Workstation'
                    : 'Sign In with Ayushman Bharat ID'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* LINK TO SIGNUP */}
          {roleMode === 'patient' && (
            <div className="text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
              Don't have an account?{' '}
              <Link to="/signup" className="font-extrabold text-[#2B4A8A] hover:underline">
                Sign Up with Basic Details & Ayushman Bharat ID
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
