import React, { useState } from 'react';
import {
  X,
  Pill,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Save,
  Send,
  Stethoscope,
  Clock,
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

const COMMON_MEDICATIONS = [
  { name: 'Paracetamol 650mg', dosage: '650mg', frequency: '1-0-1', timing: 'After meals', duration: '3 days', instructions: 'Take SOS for fever > 100°F or body aches' },
  { name: 'Amoxicillin 500mg', dosage: '500mg', frequency: '1-0-1', timing: 'After meals', duration: '5 days', instructions: 'Complete full antibiotic course' },
  { name: 'Cetirizine 10mg', dosage: '10mg', frequency: '0-0-1', timing: 'At bedtime', duration: '5 days', instructions: 'May cause drowsiness; avoid driving' },
  { name: 'Pantoprazole 40mg', dosage: '40mg', frequency: '1-0-0', timing: 'Before breakfast (empty stomach)', duration: '7 days', instructions: 'Take with warm water 30 mins before food' },
  { name: 'Azithromycin 500mg', dosage: '500mg', frequency: '1-0-0', timing: 'After meals', duration: '3 days', instructions: 'Take once daily at the same hour' },
  { name: 'Metformin 500mg', dosage: '500mg', frequency: '1-0-1', timing: 'After meals', duration: '30 days', instructions: 'Monitor fasting blood glucose regularly' },
  { name: 'ORS (Oral Rehydration Salts)', dosage: '1 sachet in 1L water', frequency: 'SOS', timing: 'Throughout the day', duration: '2 days', instructions: 'Sip frequently to maintain hydration' }
];

export default function IssuePrescriptionModal({
  isOpen,
  onClose,
  patient,
  doctorInfo,
  onPrescriptionIssued
}) {
  if (!isOpen || !patient) return null;

  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([
    {
      name: '',
      dosage: '',
      frequency: '1-0-1',
      timing: 'After meals',
      duration: '5 days',
      instructions: 'As advised by doctor'
    }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const doc = doctorInfo || {
    id: 'doc-501',
    name: 'Dr. Ananya Rao',
    qualification: 'MBBS, MD (General Medicine)',
    regNumber: 'KMC-45892',
    hospital: 'Manipal Hospital, Bengaluru'
  };

  const patientAllergies = Array.isArray(patient.allergies) ? patient.allergies : [];

  const handleAddMedicine = () => {
    setMedicines(prev => [
      ...prev,
      {
        name: '',
        dosage: '',
        frequency: '1-0-1',
        timing: 'After meals',
        duration: '5 days',
        instructions: 'As advised by doctor'
      }
    ]);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length === 1) return;
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    setMedicines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleQuickAdd = (preset) => {
    if (medicines.length === 1 && !medicines[0].name.trim()) {
      setMedicines([{ ...preset }]);
    } else {
      setMedicines(prev => [...prev, { ...preset }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validMedicines = medicines.filter(m => m.name.trim() !== '');
    if (validMedicines.length === 0) {
      setErrorMsg('Please specify at least one medication name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: patient.id,
        doctorName: doc.name,
        hospital: doc.hospital,
        diagnosis: diagnosis.trim() || 'Clinical Treatment Plan',
        medicines: validMedicines
      };

      const res = await fetch('/api/doctor/create-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to issue prescription.');
      }

      setSuccessMsg(`Prescription successfully issued and transmitted live to ${patient.fullName}!`);
      if (onPrescriptionIssued) {
        onPrescriptionIssued(data.prescription);
      }

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error creating prescription:', err);
      setErrorMsg(err.message || 'Network error while creating prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn text-slate-900">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Pill className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  DIGITAL RX DISPENSARY
                </span>
                <span className="text-xs font-mono text-blue-200 font-semibold">{patient.id}</span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                Issue Clinical Prescription for {patient.fullName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Patient Demographics & Doctor Info Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">PATIENT DETAILS</span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">{patient.fullName}</p>
              <p className="text-slate-600 font-mono text-[11px]">ABHA: {patient.abhaId || 'N/A'} • {patient.gender || 'Not specified'} {patient.bloodGroup ? `• ${patient.bloodGroup}` : ''}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">PRESCRIBING PHYSICIAN</span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">{doc.name}</p>
              <p className="text-slate-600 font-mono text-[11px]">Reg: {doc.regNumber} • {doc.hospital}</p>
            </div>
          </div>

          {/* Known Allergies Warning */}
          {patientAllergies.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-rose-950 uppercase tracking-wider text-[10px] block">
                  PATIENT ALLERGY CAUTION
                </span>
                <p className="text-rose-800 font-bold mt-0.5">
                  Documented allergies: {patientAllergies.map(a => typeof a === 'string' ? a : (a.allergen || a.name || 'Allergy')).join(', ')}.
                </p>
                <p className="text-rose-600 text-[11px] mt-0.5">
                  Ensure prescribed regimen has no contraindications or cross-allergen sensitivities.
                </p>
              </div>
            </div>
          )}

          {/* Diagnosis / Clinical Indication */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Diagnosis / Clinical Indication
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g., Acute Febrile Illness, Upper Respiratory Tract Infection, Hypertension Maintenance"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white transition-all"
            />
          </div>

          {/* Quick Prescribing Suggestions */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Quick Medication Templates (Click to Add)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MEDICATIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAdd(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#2B4A8A] border border-slate-200 hover:border-blue-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#2B4A8A]" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Medicines List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-[#2B4A8A]" />
                <span>Prescribed Medications ({medicines.length})</span>
              </span>

              <button
                type="button"
                onClick={handleAddMedicine}
                className="flex items-center space-x-1 text-xs font-extrabold text-[#2B4A8A] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            {medicines.map((med, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-[#2B4A8A]">
                    Medicine #{idx + 1}
                  </span>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Medicine Name *
                    </label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol, Amoxicillin"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Dosage (mg / ml / tab)
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      placeholder="e.g. 650mg, 1 tablet"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Frequency
                    </label>
                    <select
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A] cursor-pointer"
                    >
                      <option value="1-0-1">1-0-1 (Morning & Night)</option>
                      <option value="1-0-0">1-0-0 (Morning only)</option>
                      <option value="0-0-1">0-0-1 (Night only)</option>
                      <option value="1-1-1">1-1-1 (Thrice daily)</option>
                      <option value="SOS">SOS (As needed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Timing
                    </label>
                    <select
                      value={med.timing}
                      onChange={(e) => handleMedicineChange(idx, 'timing', e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A] cursor-pointer"
                    >
                      <option value="After meals">After meals</option>
                      <option value="Before meals">Before meals</option>
                      <option value="Empty stomach">Empty stomach</option>
                      <option value="At bedtime">At bedtime</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                      placeholder="e.g. 5 days, 1 month"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Special Instructions / Notes
                  </label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                    placeholder="e.g. Drink plenty of warm water; stop if rash occurs"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Prescription will be digitally stamped and transmitted live over SSE to the patient.
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2B4A8A] to-blue-700 hover:from-[#223B6E] hover:to-blue-800 text-white font-black text-xs transition-all shadow-md shadow-[#2B4A8A]/20 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                <span>{submitting ? 'Issuing Prescription...' : 'Issue & Transmit Live'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
