import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pill, Clock, CheckCircle2, AlertCircle, Utensils, Calendar, ShieldAlert, Sparkles, Bell, Check, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFoodSuggestionsForPrescriptions } from '../../utils/foodSuggestions';

export default function Prescriptions() {
  const { currentUser, t } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch patient prescriptions
  useEffect(() => {
    fetchPrescriptions();

    const handleLiveRefresh = () => {
      fetchPrescriptions();
    };
    window.addEventListener('patient-data-refresh', handleLiveRefresh);
    return () => window.removeEventListener('patient-data-refresh', handleLiveRefresh);
  }, [currentUser]);

  const fetchPrescriptions = async () => {
    if (!currentUser?.id) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle reminder checkmark
  const handleToggleReminder = async (rxId, medId, reminderIndex, currentTaken) => {
    try {
      await fetch('/api/prescriptions/reminder-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rxId,
          medId,
          reminderIndex,
          taken: !currentTaken
        })
      });
      fetchPrescriptions();
    } catch (e) {
      console.error('Failed to update reminder:', e);
    }
  };

  // Active medicines flattened
  const activePrescriptionList = prescriptions.filter(p => p.status === 'ACTIVE');
  const allActiveMedicines = activePrescriptionList.flatMap(p => p.medicines || []);
  
  // Dietary food suggestions engine
  const foodSuggestions = getFoodSuggestionsForPrescriptions(allActiveMedicines);

  // Medication compliance statistics
  const totalRemindersToday = allActiveMedicines.flatMap(m => m.reminders || []);
  const takenRemindersCount = totalRemindersToday.filter(r => r.taken).length;
  const compliancePercentage = totalRemindersToday.length > 0 
    ? Math.round((takenRemindersCount / totalRemindersToday.length) * 100) 
    : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Banner */}
      <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-sky-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Pill className="w-4 h-4 text-sky-300" />
            <span>{t('activeMedication', 'Medication & Dosage Manager')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('activeRunningPrescriptions', 'Active Prescriptions & Medication Reminders')}
          </h1>
          <p className="mt-1 text-sm text-sky-100/90 max-w-xl">
            {t('followInstructions', 'Track your currently running prescriptions, daily dosage schedules, and personalized dietary guidance.')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Link
            to="/reports"
            className="flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl bg-[#80bfff] hover:bg-white text-black font-extrabold text-xs shadow-md transition-all shrink-0 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan New Prescription</span>
          </Link>

          {/* Daily Compliance Widget */}
          <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/20 text-center min-w-[180px]">
            <span className="text-xs font-semibold text-sky-200 block mb-1">Today's Dosage Adherence</span>
            <div className="text-3xl font-extrabold text-white">
              {takenRemindersCount} / {totalRemindersToday.length}
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-500"
                style={{ width: `${compliancePercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-300 font-bold mt-1 inline-block">
              {compliancePercentage}% Completed Today
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          Loading active prescriptions...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLUMNS: ACTIVE PRESCRIPTIONS & MEDICATION REMINDERS */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Pill className="w-5 h-5 text-sky-600" />
                <span>{t('currentlyPrescribed', 'Currently Running Prescriptions')} ({activePrescriptionList.length})</span>
              </h2>
            </div>

            {activePrescriptionList.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 text-slate-500">
                No active prescriptions found on record.
              </div>
            ) : (
              activePrescriptionList.map((rx) => (
                <div key={rx.id} className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
                  
                  {/* Rx Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                          Active Prescribed Course
                        </span>
                        {rx.diagnosis && rx.diagnosis !== 'Not available' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2B4A8A] border border-blue-200 text-[10px] font-bold">
                            Problem: {rx.diagnosis}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {rx.doctorName || 'Attending Physician'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {rx.hospital && rx.hospital !== 'Not available' ? `${rx.hospital} • ` : ''}
                        Issued on: <strong>{rx.date || 'Not available'}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span>Rx Ref: #{rx.id}</span>
                    </div>
                  </div>

                  {/* Medicines Cards */}
                  <div className="space-y-4">
                    {rx.medicines.map((med) => (
                      <div key={med.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-4">
                        
                        {/* Medicine Top Details */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                              <span>{med.name}</span>
                            </h4>
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              <span className="bg-white px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200 text-slate-700">
                                <strong>Dosage:</strong> {med.dosage || 'Not available'}
                              </span>
                              <span className="bg-blue-50 text-[#2B4A8A] px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200">
                                <strong>Frequency:</strong> {med.frequency || 'Not available'}
                              </span>
                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                                <strong>Timing:</strong> {med.timing || 'Not available'}
                              </span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-lg inline-block">
                              Duration: {med.duration || 'Not available'}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {med.startDate || rx.date || 'Active'}
                            </p>
                          </div>
                        </div>

                        {/* Special Instructions */}
                        {med.instructions && med.instructions !== 'Not available' && (
                          <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60 font-medium">
                            <strong className="text-slate-900">Doctor Instructions:</strong> {med.instructions}
                          </div>
                        )}

                        {/* MEDICATION REMINDERS INTERACTIVE CHECKLIST */}
                        <div className="pt-2 border-t border-slate-200/60">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2">
                            <Bell className="w-3.5 h-3.5 text-sky-600" />
                            <span>Today's Dosage Reminders:</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {med.reminders?.map((rem, rIdx) => (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() => handleToggleReminder(rx.id, med.id, rIdx, rem.taken)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                  rem.taken
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-50/50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <Clock className={`w-4 h-4 ${rem.taken ? 'text-emerald-600' : 'text-slate-400'}`} />
                                  <span>{rem.label} ({rem.time})</span>
                                </div>

                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                                  rem.taken ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-slate-100'
                                }`}>
                                  {rem.taken && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              ))
            )}

          </div>

          {/* RIGHT COLUMN: CONTEXTUAL FOOD SUGGESTIONS & DIETARY GUIDELINES */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-sky-100 space-y-6">
              
              <div className="pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-emerald-700 font-bold text-base">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <span>Medication Food Suggestions</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Contextual dietary recommendations based on your active prescription medicines.
                </p>
              </div>

              <div className="space-y-5">
                {foodSuggestions.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      {item.medicationName && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.medicationName}
                        </span>
                      )}
                    </div>

                    {/* Recommended Foods */}
                    <div>
                      <h5 className="text-xs font-bold text-emerald-800 mb-1 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recommended Foods:</span>
                      </h5>
                      <ul className="space-y-1 text-xs text-slate-700 pl-4 list-disc">
                        {item.recommended.map((rec, rIdx) => (
                          <li key={rIdx}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Foods to Avoid */}
                    <div>
                      <h5 className="text-xs font-bold text-rose-800 mb-1 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Foods / Drinks to Avoid:</span>
                      </h5>
                      <ul className="space-y-1 text-xs text-slate-700 pl-4 list-disc">
                        {item.avoid.map((avd, aIdx) => (
                          <li key={aIdx}>{avd}</li>
                        ))}
                      </ul>
                    </div>

                    {/* General Clinical Advice */}
                    {item.generalAdvice && (
                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60">
                        "{item.generalAdvice}"
                      </p>
                    )}

                  </div>
                ))}
              </div>

              {/* Supportive Disclaimer Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-[11px] text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Supportive Dietary Guidance</p>
                  <p>
                    Food suggestions are provided for general supportive awareness and do NOT override any specific dietary restrictions or instructions given by your doctor.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
