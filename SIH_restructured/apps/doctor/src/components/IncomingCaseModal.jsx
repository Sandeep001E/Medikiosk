import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  Pill,
  Dna,
  HeartPulse,
  ShieldAlert,
  FileText,
  User,
  Clock,
  Plus,
  Save,
  CheckCircle2,
  Tag,
  Stethoscope,
  Sparkles,
  Printer,
  ShieldCheck,
  CheckSquare,
  Paperclip,
  Eye
} from 'lucide-react';

export default function IncomingCaseModal({ isOpen, onClose, caseItem, onSaveNote }) {
  if (!isOpen || !caseItem) return null;

  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);

  const quickNotes = [
    'Advised 3 days complete rest and oral rehydration',
    'Paracetamol 650mg SOS for fever spikes > 100.5°F',
    'Follow-up in OPD after 48 hours if fever persists',
    'CBC, Platelets and Dengue NS1 screening requested',
    'Strictly avoid Penicillin / Beta-lactam derivatives',
    'Low sodium diet & regular BP monitoring'
  ];

  const handleAddQuickTag = (tag) => {
    setNoteText(prev => prev ? `${prev}\n• ${tag}` : `• ${tag}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSaving(true);
    try {
      await onSaveNote(caseItem.id, noteText);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setNoteText('');
      }, 2000);
    } catch (err) {
      console.error('Failed to save doctor note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const summary = caseItem.summaryData || {};
  const patient = summary.patientDetails || {};
  const redAlerts = summary.clinicalRedAlerts || summary.redAlerts || [];

  const extraReports = caseItem.extraReports || summary.extraReports || [];
  const ayurvedaProfile = summary.ayurvedaDashavidhaProfile || caseItem.ayurvedaDashavidha || summary.ayurvedaDashavidha || null;
  const pastOcrPrescriptions = summary.pastPrescriptionsFromOcr || caseItem.pastPrescriptions || summary.pastPrescriptions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] text-slate-900">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Stethoscope className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                  Transmitted Clinical Summary
                </span>
                <span className="text-xs font-mono text-blue-200 font-semibold">{caseItem.consentToken || caseItem.id}</span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                Patient Case Review: {patient.fullName || caseItem.patientName || 'Patient'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print File</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Patient Demographics Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#2B4A8A] text-white font-black text-xl flex items-center justify-center shadow-xs">
                {(patient.fullName || caseItem.patientName || 'P').charAt(0)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-base text-slate-900">{patient.fullName || caseItem.patientName || 'Patient'}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500 font-semibold">ABHA: {patient.abhaId || 'ABHA Not Provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-slate-600">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GENDER & AGE</span>
                <span className="font-extrabold text-sm text-slate-900">{patient.gender || 'Not specified'}, Age {patient.age || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BLOOD GROUP</span>
                <span className="font-extrabold text-sm text-rose-600">{patient.bloodGroup || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TRANSMITTED</span>
                <span className="font-bold text-slate-700">{caseItem.timestamp ? new Date(caseItem.timestamp).toLocaleTimeString() : 'Recent'}</span>
              </div>
            </div>
          </div>

          {/* 1. CHIEF COMPLAINT & REPORTED PROBLEM */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Patient Reported Chief Complaint</span>
            </div>
            <p className="text-base font-black text-amber-950">
              {summary.reportTitle || summary.problemTitle || summary.chiefComplaint || caseItem.rawTranscript || 'Reported Medical Concern'}
            </p>
            {summary.historyOfPresentIllness && (
              <p className="text-slate-700 leading-relaxed pt-1 text-xs">
                {summary.historyOfPresentIllness}
              </p>
            )}
          </div>

          {/* 2. CLINICAL RED ALERTS & CONTRAINDICATIONS */}
          {redAlerts && redAlerts.length > 0 ? (
            <div className="p-4 rounded-2xl bg-red-50/80 border-2 border-red-400 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-red-950 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
                  <span>AI Clinical Red Alerts & Drug Safety Flags</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                  CRITICAL WARNINGS
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {redAlerts.map((alert, idx) => {
                  const title = typeof alert === 'string' ? alert : (alert.title || alert.finding || alert.category || 'Clinical Red Alert');
                  const hazard = typeof alert === 'object' ? (alert.clinicalHazard || alert.actionableProtocol) : null;
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-red-200 text-red-900 font-semibold flex items-start space-x-2 shadow-2xs">
                      <span className="text-red-600 font-black">•</span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-red-950">{title}</span>
                        {hazard && <p className="text-[11px] text-slate-600 font-normal mt-0.5 leading-snug">{hazard}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>No Critical Red Alerts or Known Drug Contraindications Detected</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                CLEAR
              </span>
            </div>
          )}

          {/* 3. RUNNING PRESCRIPTIONS & GENETIC / PERMANENT DISEASES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Running Prescriptions */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-extrabold uppercase tracking-wider text-xs">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Active Running Prescriptions</span>
              </div>
              <div className="space-y-2">
                {summary.runningPrescriptions && summary.runningPrescriptions.length > 0 ? (
                  summary.runningPrescriptions.map((med, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                      <div>
                        <strong className="text-slate-900 font-bold block">{typeof med === 'string' ? med : (med.name || 'Medication')}</strong>
                        <span className="text-[11px] text-slate-500">{typeof med === 'object' ? `${med.frequency || '1-0-1'} • ${med.timing || 'As directed'}` : ''}</span>
                      </div>
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">{(typeof med === 'object' && med.duration) ? med.duration : 'Active'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    No active running prescriptions on record
                  </p>
                )}
              </div>
            </div>

            {/* Genetic & Permanent Diseases */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-indigo-900 font-extrabold uppercase tracking-wider text-xs">
                <Dna className="w-4 h-4 text-indigo-600" />
                <span>Genetic & Permanent Conditions</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-0.5">
                    Genetic Predispositions
                  </span>
                  <p className="text-slate-700 font-medium">
                    {Array.isArray(summary.geneticDiseases) && summary.geneticDiseases.length > 0
                      ? summary.geneticDiseases.map(g => typeof g === 'string' ? g : (g.name || g.title || JSON.stringify(g))).join(' • ')
                      : (typeof summary.geneticDiseases === 'string' ? summary.geneticDiseases : 'None documented')}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block mb-0.5">
                    Permanent Conditions & Allergies
                  </span>
                  <p className="text-slate-700 font-medium">
                    {Array.isArray(summary.permanentDiseases) && summary.permanentDiseases.length > 0
                      ? summary.permanentDiseases.map(p => typeof p === 'string' ? p : (p.name || p.title || JSON.stringify(p))).join(' • ')
                      : (typeof summary.permanentDiseases === 'string' ? summary.permanentDiseases : 'None documented')}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* 3B. AYURVEDA DASHAVIDHA PARIKSHA (10-FOLD CLINICAL EVALUATION) */}
          {ayurvedaProfile && (
            <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    🌿 Ayurveda Dashavidha Pariksha (10-Fold Assessment)
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Ayurvedic clinical analysis of digestive fire (Agni), bowel habits (Koshta), psychological resilience (Sattva), constitution (Prakriti/Vikriti), and physical capacity (Vyayama Shakti).
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Ayurveda Pariksha
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Agni & Ahara Shakti</span>
                  <p className="text-xs font-black text-slate-900 mt-1">{ayurvedaProfile.agniAharaShakti?.agniStatus || 'Samagni (Balanced)'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{ayurvedaProfile.agniAharaShakti?.appetiteStatus || 'Normal appetite'}</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Koshta & Elimination</span>
                  <p className="text-xs font-black text-slate-900 mt-1">{ayurvedaProfile.koshtaElimination?.koshtaType || 'Madhyama Koshta'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{ayurvedaProfile.koshtaElimination?.bowelRegularity || 'Regular bowels'}</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Sattva & Sleep Quality</span>
                  <p className="text-xs font-black text-slate-900 mt-1">{ayurvedaProfile.sattvaNidra?.sleepQuality || 'Good restful sleep'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{ayurvedaProfile.sattvaNidra?.mentalResilience || 'Madhyama Sattva'}</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Prakriti / Vikriti Tendency</span>
                  <p className="text-xs font-black text-slate-900 mt-1">{ayurvedaProfile.prakritiVikriti?.doshaImbalanceTendency || 'Pitta-Vata'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{ayurvedaProfile.prakritiVikriti?.thermalReaction || 'Moderate heat/cold tolerance'}</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Vyayama Shakti & Vitality</span>
                  <p className="text-xs font-black text-slate-900 mt-1">{ayurvedaProfile.vyayamaShakti?.physicalStamina || 'Madhyama Shakti'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{ayurvedaProfile.vyayamaShakti?.fatigueOnset || 'Normal endurance'}</p>
                </div>
              </div>

              {ayurvedaProfile.ayurvedicClinicalImpression && (
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                  <strong className="text-amber-900 block font-bold mb-0.5">Ayurvedic Clinical Impression:</strong>
                  {ayurvedaProfile.ayurvedicClinicalImpression}
                </div>
              )}
            </div>
          )}

          {/* 3C. PAST PRESCRIPTIONS EXTRACTED FROM REPORTS & OCR */}
          {pastOcrPrescriptions && pastOcrPrescriptions.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border-2 border-blue-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#2B4A8A] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#2B4A8A]" />
                    Past Prescriptions Extracted from Reports & OCR ({pastOcrPrescriptions.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Digitized medications identified across historical prescriptions and clinical reports on record:
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2B4A8A] text-[10px] font-black uppercase">
                  OCR Synthesized
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pastOcrPrescriptions.map((rx, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <strong className="text-slate-950 font-extrabold">{rx.name}</strong>
                        {rx.dosage && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#2B4A8A] font-bold border border-blue-200">
                            {rx.dosage}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-700 font-medium">
                        {rx.timing && <span className="mr-2">Timing: {rx.timing}</span>}
                        {rx.instructions && <span>Instructions: {rx.instructions}</span>}
                      </p>
                      {rx.ocrContextSnippet && (
                        <p className="text-[10px] text-slate-400 italic mt-1 font-mono bg-white p-1 rounded border border-slate-100">
                          "{rx.ocrContextSnippet}"
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2 block border-t border-slate-100 pt-1">
                      Source: {rx.sourceReportTitle || 'Digitized Prescription'} {rx.reportDate ? `(${rx.reportDate})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. EXTRA ATTACHED DIAGNOSTIC REPORTS & SCANS (TRANSMITTED VIA BRIDGE) */}
          {extraReports && extraReports.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border-2 border-blue-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#2B4A8A] font-black text-xs uppercase tracking-wider">
                  <Paperclip className="w-4 h-4 text-[#2B4A8A]" />
                  <span>Attached Extra Diagnostic Reports & Scans ({extraReports.length})</span>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Transmitted Across Bridge
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extraReports.map((report, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-black text-xs text-slate-900 leading-snug">{report.title}</h5>
                          <p className="text-[10px] text-slate-500 font-medium">{report.hospital || report.doctorName} • {report.date}</p>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                          {report.type}
                        </span>
                      </div>
                      {report.findings && (
                        <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 mt-2 italic leading-relaxed">
                          "{report.findings}"
                        </p>
                      )}
                    </div>

                    {report.imageUrl && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setViewingReport(report)}
                          className="flex items-center space-x-1.5 text-xs font-bold text-[#2B4A8A] hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Original Document / Scan</span>
                        </button>
                        <span className="text-[9px] text-slate-400 font-mono">Verified OCR</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. PREVIOUS DOCTOR CLINICAL NOTES */}
          {caseItem.doctorNotes && caseItem.doctorNotes.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
              <h4 className="font-extrabold text-xs text-[#2B4A8A] uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                <span>Physician Consultation Notes on this File ({caseItem.doctorNotes.length})</span>
              </h4>
              <div className="space-y-2">
                {caseItem.doctorNotes.map((note, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-blue-100 text-slate-800 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-black text-[#2B4A8A]">{note.doctorName || 'Consulting Physician'}</span>
                      <span className="font-mono">{note.timestamp ? new Date(note.timestamp).toLocaleString() : 'Just now'}</span>
                    </div>
                    <p className="whitespace-pre-line text-xs leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ADD DOCTOR NOTE ENGINE */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border-2 border-blue-300 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#2B4A8A] font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#2B4A8A]" />
                <span>Add Physician Clinical Observation & Note</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">Consulting Physician (Verified)</span>
            </div>

            {/* Quick Note Pills */}
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((qNote, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddQuickTag(qNote)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 text-[10px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#2B4A8A]" />
                  <span>{qNote}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="space-y-3 pt-1">
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter clinical notes, diagnosis, medication adjustments, or dietary instructions for this patient..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
              />

              <div className="flex items-center justify-between">
                {saveSuccess ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Doctor note saved and attached to patient's file!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">Notes are saved and appended to this clinical history file.</span>
                )}

                <button
                  type="submit"
                  disabled={isSaving || !noteText.trim()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2B4A8A] hover:bg-[#223B6E] text-white font-extrabold text-xs transition-all shadow-md shadow-[#2B4A8A]/20 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Note...' : 'Save Doctor Note'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
          >
            Close Case File
          </button>
        </div>

      </div>

      {/* DOCUMENT IMAGE / FULL REPORT PREVIEW MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-black text-base text-slate-900">{viewingReport.title}</h4>
                <p className="text-xs text-slate-500">{viewingReport.hospital || viewingReport.doctorName} • {viewingReport.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-96">
              <img
                src={viewingReport.imageUrl}
                alt={viewingReport.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-slate-800 space-y-1">
              <strong className="text-[#2B4A8A] font-black uppercase tracking-wider block">Digitized Clinical Findings & OCR:</strong>
              <p className="leading-relaxed">{viewingReport.findings}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="px-5 py-2 rounded-xl bg-[#2B4A8A] text-white text-xs font-bold shadow-xs hover:bg-blue-900 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
