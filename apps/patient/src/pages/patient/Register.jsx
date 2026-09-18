import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Activity, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { loginPatient } = useAuth();
  const navigate = useNavigate();

  // Form Fields as requested: Name, Phone, Email, Password, and Ayushman Bharat ID
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [abhaId, setAbhaId] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);



  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!fullName.trim() || !phone.trim() || !email.trim() || !password || !abhaId.trim()) {
      setErrorMsg('Please fill in all required fields (Name, Phone, Email, Password, and Ayushman Bharat ID).');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          abhaId: abhaId.trim(),
        })
      });

      const data = await res.json();

      if (data.success && data.patient) {
        // Automatically authenticate and navigate to dashboard
        loginPatient(data.patient);
        navigate('/dashboard');
      } else {
        setErrorMsg(data.message || 'Registration failed. Please verify your details.');
      }
    } catch (err) {
      setErrorMsg('Registration server error. Please try again.');
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
          <span>Ayushman Bharat Health Account (ABHA)</span>
        </div>

        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Create Patient Account
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 font-medium">
          Sign up with your basic details and Ayushman Bharat ID
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl border border-slate-200/80 sm:px-10 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* 1. FULL NAME */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 2. PHONE & 3. EMAIL (SIDE BY SIDE ON TABLET/DESKTOP) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PHONE */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* 4. PASSWORD */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min. 6 characters)"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
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

            {/* 5. AYUSHMAN BHARAT ID (ABHA ID) */}
            <div>
              <div className="mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ayushman Bharat ID (ABHA ID) <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-[#2B4A8A] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="Enter 14-digit ABHA ID or abha address"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Enter your 14-digit Ayushman Bharat Health Account number or ABHA address.
              </p>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-[#2B4A8A] hover:bg-[#223B6E] text-white font-bold text-sm shadow-lg shadow-[#2B4A8A]/25 hover:shadow-xl transform active:scale-98 transition-all disabled:opacity-70"
              >
                <span>{isLoading ? 'Creating Account...' : 'Sign Up & Continue to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* LINK TO LOGIN */}
          <div className="text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
            Already have an Ayushman Bharat Account?{' '}
            <Link to="/login" className="font-extrabold text-[#2B4A8A] hover:underline">
              Sign In with Ayushman Bharat ID
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
