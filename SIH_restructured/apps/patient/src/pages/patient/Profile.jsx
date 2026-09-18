import React, { useState } from 'react';
import { User, ShieldCheck, Mail, Phone, Calendar, MapPin, Heart, AlertTriangle, Edit2, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { currentUser, updatePatientProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [emergencyContact, setEmergencyContact] = useState(currentUser?.emergencyContact || '');
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || 'B+');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updatedData = {
      phone,
      address,
      emergencyContact,
      bloodGroup
    };

    updatePatientProfile(updatedData);

    if (currentUser?.id) {
      try {
        await fetch(`/api/patient/profile/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        setSavedSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch (err) {
        console.error('Failed to update profile:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Banner Header */}
      <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md text-white font-extrabold text-3xl flex items-center justify-center border border-white/30 shadow-inner">
            {currentUser?.fullName ? currentUser.fullName.charAt(0) : 'P'}
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {currentUser?.fullName || 'Patient Profile'}
              </h1>
              {currentUser?.isAbhaVerified && (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-black text-[10px] uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-emerald-950" />
                  <span>ABHA Verified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-sky-200 mt-1 font-mono">
              ABHA ID: {currentUser?.abhaId || 'Not Assigned'} ({currentUser?.abhaAddress || 'user@abha'})
            </p>
            <p className="text-xs text-sky-100/80 mt-1">
              Registered Patient • National Health Authority Registry
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/20"
          >
            Cancel
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile information updated successfully!</span>
        </div>
      )}

      {/* Main Profile Form & Cards */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <User className="w-5 h-5 text-sky-600" />
            <span>Patient Information & Health Profile</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Full Name (Immutable from ABHA) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Full Name (NHA Verified)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                disabled
                value={currentUser?.fullName || 'Patient'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
              />
            </div>
          </div>

          {/* ABHA ID (Immutable) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Verified ABHA ID / Number
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3" />
              <input
                type="text"
                disabled
                value={currentUser?.abhaId || ''}
                className="w-full pl-10 pr-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-mono font-bold text-emerald-900"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                disabled
                value={currentUser?.dob || 'Not specified'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Gender
            </label>
            <input
              type="text"
              disabled
              value={currentUser?.gender || 'Not specified'}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                disabled
                value={currentUser?.email || 'Not specified'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Phone Number (Editable) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contact Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isEditing 
                    ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-sky-500' 
                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}
              />
            </div>
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Blood Group
            </label>
            <div className="relative">
              <Heart className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
              <select
                disabled={!isEditing}
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isEditing 
                    ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-sky-500' 
                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Emergency Contact Person & Phone
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isEditing 
                  ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-sky-500' 
                  : 'bg-slate-100 border border-slate-200 text-slate-700'
              }`}
            />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Residential Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                disabled={!isEditing}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isEditing 
                    ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-sky-500' 
                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Known Allergies & Chronic Conditions */}
        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Known Drug / Environmental Allergies</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(currentUser?.allergies && currentUser.allergies.length > 0) ? (
                currentUser.allergies.map((a, idx) => (
                  <span key={idx} className="text-xs font-bold bg-rose-100 text-rose-900 px-2.5 py-1 rounded-lg border border-rose-200">
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No allergies recorded</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200">
            <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
              <Heart className="w-4 h-4 text-sky-600" />
              <span>Chronic Medical Conditions</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(currentUser?.chronicConditions && currentUser.chronicConditions.length > 0) ? (
                currentUser.chronicConditions.map((c, idx) => (
                  <span key={idx} className="text-xs font-bold bg-sky-100 text-sky-900 px-2.5 py-1 rounded-lg border border-sky-200">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No chronic conditions recorded</span>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        )}

      </form>

    </div>
  );
}
