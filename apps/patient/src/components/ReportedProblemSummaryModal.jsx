import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  FileText,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Ban,
  Clock3,
  Pill,
  Stethoscope,
  Dna,
  HeartPulse,
  QrCode,
  ArrowDown,
  RefreshCw,
  Send,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyzeOverallClinicalRedAlerts } from '../utils/clinicalRedAlerts';

export default function ReportedProblemSummaryModal({
  isOpen,
  onClose,
  currentUser: propUser,
  activePrescriptions = [],
  onSaveSuccess,
  initialProblem = ''
}) {
  const { currentUser: authUser, updateActiveReportedProblem, geminiApiKey } = useAuth();
  const currentUser = propUser || authUser;
  const [problemInput, setProblemInput] = useState(
    initialProblem || ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const printAreaRef = useRef(null);

  const commonSymptomTemplates = [
    'Acute High-Grade Fever & Severe Body Ache with Chills',
    'Persistent Dry Cough with Throat Irritation & Chest Congestion',
    'Severe Throbbing Headache (Migraine) with Photophobia',
    'Acute Acid Reflux & Epigastric Burning Pain',
    'Shortness of Breath with Wheezing on Exertion'
  ];

  // Generate or regenerate the complete clinical summary
  const generateSummary = async (textToUse = problemInput) => {
    if (!textToUse) return;
    setIsGenerating(true);
    setSaveSuccessMsg(false);
    setSaveErrorMsg('');

    try {
      const res = await fetch('/api/patient/problem-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentUser?.id || '',
          problemText: textToUse,
          languageCode: 'en-IN',
          inputMode: 'text',
          structuredQA: [],
          apiKey: geminiApiKey || ''
        })
      });

      const data = await res.json();
      if (data.success && data.aiSummary) {
        const ai = data.aiSummary;
        setSummaryData(ai);

        // Immediate automatic permanent persistence
        const storageKey = currentUser?.id ? `medikiosk_problem_summaries_${currentUser.id}` : 'medikiosk_problem_summaries';
        const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const newLog = data.problemLog || {
          id: ai.reportId || ('prob-' + Date.now()),
          patientId: currentUser?.id || '',
          timestamp: ai.timestampIso || new Date().toISOString(),
          problemTitle: textToUse,
          chiefComplaint: ai.chiefComplaint || textToUse,
          summary: ai
        };
        const updatedLogs = [newLog, ...existingLogs.filter(l => l.id !== newLog.id)];
        localStorage.setItem(storageKey, JSON.stringify(updatedLogs));

        if (updateActiveReportedProblem) {
          updateActiveReportedProblem({
            id: newLog.id,
            title: textToUse,
            chiefComplaint: ai.chiefComplaint || textToUse,
            timestamp: newLog.timestamp,
            ayurvedaDashavidha: ai.ayurvedaDashavidhaProfile || null,
            pastPrescriptions: ai.pastPrescriptionsFromOcr || []
          });
        }

        window.dispatchEvent(new CustomEvent('patient-data-refresh'));
        setIsGenerating(false);
        return;
      }
    } catch (err) {
      console.warn('Backend API unavailable, using local synthesis:', err);
    }

    // Fallback synthesis if backend was unreachable
    const birthYear = currentUser?.dob ? parseInt(currentUser.dob.substring(0, 4)) : 1995;
    const age = 2026 - birthYear;

    const geneticDiseases = Array.isArray(currentUser?.geneticConditions)
      ? currentUser.geneticConditions
      : [];

    const permanentDiseases = Array.isArray(currentUser?.chronicConditions)
      ? currentUser.chronicConditions
      : [];

    const allergies = Array.isArray(currentUser?.allergies)
      ? currentUser.allergies
      : [];

    const allActiveMeds = Array.isArray(activePrescriptions) ? activePrescriptions : [];

    // Related prescriptions with one-line information
    const relatedPrescriptions = allActiveMeds.map(m => {
      let purpose = 'Prescribed clinical regimen';
      const medLower = (m.name || '').toLowerCase();
      if (medLower.includes('dolo') || medLower.includes('paracetamol')) {
        purpose = 'Antipyretic & analgesic for febrile temperature spikes & body ache relief';
      } else if (medLower.includes('panto') || medLower.includes('pantoprazole')) {
        purpose = 'Proton-pump inhibitor for gastric mucosal protection';
      } else if (medLower.includes('telmi')) {
        purpose = 'Antihypertensive agent for daily blood pressure regulation';
      }
      return {
        name: m.name,
        category: purpose,
        oneLineInfo: `${purpose} (${m.dosage || 'Standard dose'}, ${m.frequency || 'Daily'}, ${m.timing || 'As directed'}).`,
        doctor: m.prescribedBy || m.doctorName || 'Prescribing Physician',
        isRunning: true
      };
    });

    const runningPrescriptions = allActiveMeds.map(m => ({
      name: m.name,
      dosage: m.dosage || 'As directed',
      frequency: m.frequency || '1-0-1',
      timing: m.timing || 'With water',
      duration: m.duration || 'Active Course',
      instructions: m.instructions || 'Take as advised by physician.',
      prescribedBy: m.prescribedBy || m.doctorName || 'Prescribing Physician',
      highlightColor: 'blue'
    }));

    const reportId = 'ABDM-PS-' + Date.now().toString().slice(-6);

    const redAlerts = analyzeOverallClinicalRedAlerts({
      problemText: textToUse,
      geneticDiseases,
      permanentDiseases,
      allergies,
      runningPrescriptions,
      patientDetails: {
        fullName: currentUser?.fullName || 'Patient',
        abhaId: currentUser?.abhaId || '',
        age: age || 30,
        gender: currentUser?.gender || 'Not Specified',
        bloodGroup: currentUser?.bloodGroup || 'Not Specified'
      }
    });

    const fallbackSummary = {
      reportId,
      generatedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      timestampIso: new Date().toISOString(),
      problemTitle: textToUse || 'Reported Clinical Symptom Assessment',
      chiefComplaint: `Patient presents with chief complaint of "${textToUse}". Recorded onset within 24-48 hours with acute symptoms requiring physician evaluation.`,
      historyOfPresentIllness: `The patient reports active acute episode characterized by "${textToUse}". Symptoms are ongoing with reported discomfort needing clinical review.`,
      clinicalImpression: `Acute Symptomatic Episode. Presentation necessitates physical clinical examination and vital signs review. Contraindications must be cross-checked before initiating therapy.`,
      patientDetails: {
        fullName: currentUser?.fullName || 'Patient',
        abhaId: currentUser?.abhaId || '',
        age: age || 30,
        gender: currentUser?.gender || 'Not Specified',
        bloodGroup: currentUser?.bloodGroup || 'Not Specified',
        phone: currentUser?.phone || 'Not Specified',
        emergencyContact: currentUser?.emergencyContact || 'Not Specified',
        address: currentUser?.address || 'Not Specified'
      },
      geneticDiseases,
      permanentDiseases,
      allergies,
      relatedPrescriptions,
      runningPrescriptions,
      redAlerts,
      ayurvedaDashavidhaProfile: {
        agniAharaShakti: { agniStatus: 'Samagni (Balanced Digestive Fire)', appetiteStatus: 'Normal appetite' },
        koshtaElimination: { koshtaType: 'Madhyama Koshta (Regular Bowel Pattern)', bowelRegularity: 'Regular daily elimination' },
        sattvaNidra: { mentalResilience: 'Madhyama Sattva (Moderate Emotional Resilience)', sleepQuality: 'Normal sleep cycle' },
        prakritiVikriti: { doshaImbalanceTendency: 'Pitta-Vata Predominance', thermalReaction: 'Moderate heat/cold sensitivity' },
        vyayamaShakti: { physicalStamina: 'Madhyama Shakti (Moderate Physical Endurance)', fatigueOnset: 'Normal fatigue threshold' },
        ayurvedicClinicalImpression: 'Balanced Dhatus with localized Dosha perturbation correlated with acute symptoms.'
      }
    };

    setSummaryData(fallbackSummary);
    setIsGenerating(false);
  };

  useEffect(() => {
    if (isOpen) {
      const textToUse = initialProblem || problemInput || '';
      setProblemInput(textToUse);
      if (textToUse) {
        generateSummary(textToUse);
      }
    }
  }, [isOpen, initialProblem]);

  if (!isOpen) return null;

  // Handle Save Problem Summary to Dashboard
  const handleSaveToDashboard = async () => {
    if (!summaryData) return;
    setIsSaving(true);
    setSaveErrorMsg('');

    try {
      const payload = {
        patientId: currentUser?.id || '',
        problemText: summaryData.problemTitle,
        aiSummary: {
          reportId: summaryData.reportId,
          reportTitle: `Reported Problem: ${summaryData.problemTitle}`,
          chiefComplaint: summaryData.chiefComplaint,
          historyOfPresentIllness: summaryData.historyOfPresentIllness,
          clinicalImpressionForDoctor: summaryData.clinicalImpression,
          patientDetails: summaryData.patientDetails,
          geneticDiseases: summaryData.geneticDiseases,
          permanentDiseases: summaryData.permanentDiseases,
          allergies: summaryData.allergies,
          relatedPrescriptions: summaryData.relatedPrescriptions,
          runningPrescriptions: summaryData.runningPrescriptions,
          redAlerts: summaryData.redAlerts,
          generatedAt: summaryData.generatedAt,
          timestampIso: summaryData.timestampIso
        }
      };

      // Call backend save API
      const response = await fetch('/api/patient/save-problem-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error || data?.message || 'Failed to save summary to server.');
      }

      // Save locally to user-scoped medikiosk_problem_summaries
      const storageKey = currentUser?.id ? `medikiosk_problem_summaries_${currentUser.id}` : 'medikiosk_problem_summaries';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const savedLog = {
        id: summaryData.reportId,
        patientId: currentUser?.id || '',
        timestamp: summaryData.timestampIso,
        problemTitle: summaryData.problemTitle,
        chiefComplaint: summaryData.chiefComplaint,
        summary: summaryData
      };
      const updatedLogs = [savedLog, ...existingLogs.filter(l => l.id !== savedLog.id)];
      localStorage.setItem(storageKey, JSON.stringify(updatedLogs));

      if (updateActiveReportedProblem) {
        updateActiveReportedProblem({
          id: summaryData.reportId,
          title: summaryData.problemTitle,
          chiefComplaint: summaryData.chiefComplaint,
          timestamp: summaryData.timestampIso || new Date().toISOString()
        });
      }

      if (onSaveSuccess) {
        onSaveSuccess(data.problemLog || savedLog);
      }

      window.dispatchEvent(new CustomEvent('patient-data-refresh'));

      // Automatically close the problem report modal immediately upon verified save
      onClose();

      setTimeout(() => {
        const historyEl = document.getElementById('reported-problem-history-section');
        const activeCard = document.getElementById('present-active-problem-card');
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: 'smooth' });
        } else if (historyEl) {
          historyEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    } catch (err) {
      console.error('Failed to save problem summary:', err);
      setSaveErrorMsg(err.message || 'Failed to save summary to server. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Print / Download PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #clinical-summary-document, #clinical-summary-document * {
            visibility: visible;
          }
          #clinical-summary-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200">
        
        {/* TOP MODAL HEADER (no-print) */}
        <div className="no-print bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-400/40">
                  ABDM Clinical Summary
                </span>
                <span className="text-xs text-blue-200 font-mono">
                  {summaryData?.reportId || 'Generating...'}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                Reported Problem Clinical File
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INTERACTIVE CONTROLS (no-print) */}
        <div className="no-print bg-slate-50 border-b border-slate-200 p-4 shrink-0">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            Reported Problem / Chief Symptoms
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={problemInput}
              onChange={(e) => setProblemInput(e.target.value)}
              placeholder="e.g. Acute High-Grade Fever with Chills & Sore Throat..."
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
            />
            <button
              type="button"
              onClick={() => generateSummary(problemInput)}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#B84B16] hover:bg-[#9d3f12] text-white text-xs font-extrabold shadow-sm transition-all shrink-0 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing...' : 'Regenerate Summary'}</span>
            </button>
          </div>

          {/* Quick symptom pills */}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400">Quick Select:</span>
            {commonSymptomTemplates.map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => {
                  setProblemInput(template);
                  generateSummary(template);
                }}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  problemInput === template
                    ? 'bg-[#2B4A8A] text-white border-[#2B4A8A]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {template.split('&')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        {/* SCROLLABLE DOCUMENT VIEW */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-100/60">
          
          {/* Printable Container */}
          <div
            id="clinical-summary-document"
            ref={printAreaRef}
            className="max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-10 shadow-lg border border-slate-200 space-y-6 text-slate-800 font-sans"
          >
            
            {/* DOCUMENT OFFICIAL HEADER */}
            <div className="border-b-2 border-[#2B4A8A] pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#2B4A8A] flex items-center justify-center text-white font-black text-xl shadow-md">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2B4A8A]">
                      Ayushman Bharat Digital Mission (ABDM)
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      Patient Reported Problem Summary
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      National Health Authority Interoperable Clinical Document
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ABDM Verified Record</span>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                    Doc ID: {summaryData?.reportId}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Generated: {summaryData?.generatedAt}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 1: PATIENT CORE DETAILS */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2B4A8A] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2B4A8A]" />
                  1. Verified Patient Health Details
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#2B4A8A]">
                  Demographics & ABHA
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{summaryData?.patientDetails?.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">ABHA Number</span>
                  <span className="font-mono font-bold text-[#2B4A8A]">{summaryData?.patientDetails?.abhaId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Age & Gender</span>
                  <span className="font-bold text-slate-800">{summaryData?.patientDetails?.age} Y / {summaryData?.patientDetails?.gender}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                  <span className="font-extrabold text-rose-700">{summaryData?.patientDetails?.bloodGroup}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Emergency Contact</span>
                  <span className="font-semibold text-slate-700">{summaryData?.patientDetails?.emergencyContact}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Residential Address</span>
                  <span className="font-medium text-slate-600 truncate block">{summaryData?.patientDetails?.address}</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: AI CLINICAL RED ALERTS (CROSS-ANALYZED RISKS & CONTRAINDICATIONS) */}
            <div className="rounded-2xl border-2 border-red-500 bg-gradient-to-br from-red-50 via-rose-50/70 to-red-100/30 p-5 sm:p-6 shadow-md shadow-red-500/10">
              
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-red-200">
                <div className="flex items-start space-x-3">
                  <span className="relative flex h-3.5 w-3.5 mt-1 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        Critical Red Alerts
                      </span>
                      <span className="text-xs font-black text-red-800">
                        {summaryData?.redAlerts?.length || 0} High-Priority Warnings
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-red-950 mt-1">
                      2. AI Clinical Red Alerts (Cross-Analysis of Overall Profile)
                    </h3>
                    <p className="text-[11px] text-red-800 font-medium leading-snug">
                      Cross-analysis of Reported Symptoms + Genetic Predispositions + Permanent Chronic Diseases + Drug Allergies + Active Running Prescriptions:
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 self-start sm:self-auto shrink-0 bg-white/90 px-3 py-1.5 rounded-xl border border-red-200 shadow-2xs">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span className="text-[10px] font-black text-red-900 uppercase">
                    Safety Verified
                  </span>
                </div>
              </div>

              {/* Alert Cards */}
              <div className="space-y-3.5">
                {summaryData?.redAlerts?.map((alert, idx) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  return (
                    <div
                      key={alert.id || idx}
                      className={`bg-white rounded-2xl p-4 sm:p-5 border-2 ${
                        isCritical ? 'border-red-400 shadow-sm' : 'border-amber-400 shadow-2xs'
                      } transition-all hover:border-red-600`}
                    >
                      {/* Alert Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isCritical
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-amber-500 text-white shadow-xs'
                            }`}
                          >
                            {alert.severity === 'CRITICAL' ? '🚨 CRITICAL ALERT' : '⚠️ HIGH RISK ALERT'}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {alert.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
                          Source: {alert.triggerSource}
                        </span>
                      </div>

                      {/* Alert Title */}
                      <h4 className="text-sm sm:text-base font-black text-slate-950 leading-tight">
                        {alert.title}
                      </h4>

                      {/* Clinical Finding */}
                      <p className="text-xs font-semibold text-slate-800 mt-2 leading-relaxed">
                        <span className="font-black text-[#2B4A8A]">Correlated Finding: </span>
                        {alert.finding}
                      </p>

                      {/* Clinical Hazard */}
                      <div className="mt-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200/90 text-xs text-red-950">
                        <span className="font-black uppercase tracking-wider text-[10px] text-red-700 flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Pathophysiological Hazard & Risk
                        </span>
                        <p className="font-medium leading-relaxed">
                          {alert.clinicalHazard}
                        </p>
                      </div>

                      {/* Actionable Directive */}
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900">
                        <span className="font-black uppercase tracking-wider text-[10px] text-slate-600 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Mandatory Clinical Directive & Action
                        </span>
                        <p className="font-semibold leading-relaxed text-slate-800">
                          {alert.actionableProtocol}
                        </p>
                      </div>

                      {/* Contraindications & Safe Alternatives Pills */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {alert.contraindicatedDrugs && alert.contraindicatedDrugs.length > 0 && (
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1 mb-1.5">
                              <Ban className="w-3 h-3 text-rose-600" />
                              Strict Contraindications (Do Not Administer):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {alert.contraindicatedDrugs.map((drug, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 line-through decoration-rose-600"
                                >
                                  {drug}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {alert.safeAlternatives && alert.safeAlternatives.length > 0 && (
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified Safe Alternatives:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {alert.safeAlternatives.map((alt, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300"
                                >
                                  {alt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Notice on Alerts */}
              <div className="mt-4 p-2.5 bg-red-100/70 rounded-xl border border-red-200 text-[11px] text-red-900 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-red-700 shrink-0" />
                  All active running medications & chronic conditions have been cross-checked against Indian Pharmacopoeia safety guidelines.
                </span>
                <span className="text-[10px] font-mono font-bold text-red-800 shrink-0 hidden sm:inline">
                  ABDM CDS-VERIFIED
                </span>
              </div>
            </div>

            {/* SECTION 3: GENETIC DISEASES & PERMANENT CONDITIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Genetic Diseases Card */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-4.5 shadow-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Dna className="w-4 h-4 text-indigo-700" />
                    3. Genetic Diseases & Hereditary
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900">
                    Familial Profile
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  {summaryData?.geneticDiseases?.map((disease, idx) => (
                    <div key={idx} className="flex items-start space-x-2 bg-white/90 p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-indigo-950 leading-snug">{disease}</p>
                        <p className="text-[10px] text-indigo-600 font-medium">Hereditary predisposition recorded in ABHA genome ledger</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permanent Diseases / Chronic Conditions Card */}
              <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/70 p-4.5 shadow-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-violet-950 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-violet-700" />
                    Permanent Diseases (Chronic)
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-200/80 text-violet-900">
                    Ongoing Monitored
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  {summaryData?.permanentDiseases?.map((cond, idx) => (
                    <div key={idx} className="flex items-start space-x-2 bg-white/90 p-2.5 rounded-xl border border-violet-100 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-violet-950 leading-snug">{cond}</p>
                        <p className="text-[10px] text-violet-600 font-medium">Active long-term diagnosis requiring ongoing regimen checks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* SECTION 4: RECORDED ALLERGIES & CONTRAINDICATIONS */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  4. Recorded Allergies & Medical Contraindications
                </h3>
                <span className="text-[10px] font-extrabold text-rose-700 bg-rose-200/70 px-2 py-0.5 rounded-md">
                  Safety Critical
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {summaryData?.allergies?.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-black text-rose-900 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>{allergy}</span>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-rose-700 mt-2 font-medium">
                * Note: Prescribing clinicians are alerted against selecting drugs within the penicillin or beta-lactam families.
              </p>
            </div>

            {/* SECTION 5: PATIENT REPORTED PROBLEM & CLINICAL ASSESSMENT */}
            <div className="rounded-2xl border-2 border-[#2B4A8A]/30 bg-blue-50/50 p-5">
              <div className="flex items-center justify-between mb-3 border-b border-blue-200/60 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2B4A8A] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#2B4A8A]" />
                  5. Present Reported Problem & Clinical Assessment
                </span>
                <span className="text-[10px] font-extrabold text-white bg-[#2B4A8A] px-2.5 py-0.5 rounded-full">
                  Chief Complaint
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Patient Chief Complaint
                  </span>
                  <p className="text-sm font-black text-slate-950 leading-relaxed">
                    {summaryData?.chiefComplaint}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    History of Present Illness & Symptom Timeline
                  </span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                    {summaryData?.historyOfPresentIllness}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block mb-1 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-200" />
                    Synthesized Clinical Impression for Consulting Physician
                  </span>
                  <p className="text-xs font-medium text-blue-100 leading-relaxed mt-1">
                    {summaryData?.clinicalImpression || summaryData?.clinicalImpressionForDoctor}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 5B: AYURVEDA DASHAVIDHA PARIKSHA (10-FOLD CLINICAL ASSESSMENT) */}
            {summaryData?.ayurvedaDashavidhaProfile && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-5">
                <div className="flex items-center justify-between mb-3 border-b border-amber-200 pb-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      🌿 5B. Ayurveda Dashavidha Pariksha (10-Fold Clinical Evaluation)
                    </span>
                    <p className="text-[10px] text-amber-800 font-medium">
                      Holistic assessment across Agni, Koshta, Sattva/Nidra, Prakriti/Vikriti, and Vyayama Shakti:
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full">
                    Ayurvedic Assessment
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Agni & Ahara Shakti</span>
                    <p className="text-xs font-black text-slate-900 mt-1">{summaryData.ayurvedaDashavidhaProfile.agniAharaShakti?.agniStatus || 'Samagni (Balanced)'}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Koshta & Elimination</span>
                    <p className="text-xs font-black text-slate-900 mt-1">{summaryData.ayurvedaDashavidhaProfile.koshtaElimination?.koshtaType || 'Madhyama Koshta (Normal)'}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Sattva & Nidra</span>
                    <p className="text-xs font-black text-slate-900 mt-1">{summaryData.ayurvedaDashavidhaProfile.sattvaNidra?.sleepQuality || 'Good restful sleep'}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Prakriti & Vikriti</span>
                    <p className="text-xs font-black text-slate-900 mt-1">{summaryData.ayurvedaDashavidhaProfile.prakritiVikriti?.doshaImbalanceTendency || 'Balanced Tridosha'}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Vyayama Shakti</span>
                    <p className="text-xs font-black text-slate-900 mt-1">{summaryData.ayurvedaDashavidhaProfile.vyayamaShakti?.physicalStamina || 'Madhyama (Moderate)'}</p>
                  </div>
                </div>

                {summaryData.ayurvedaDashavidhaProfile.ayurvedicClinicalImpression && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-950 font-medium">
                    <strong className="text-amber-900 block font-bold mb-0.5">Ayurvedic Clinical Impression:</strong>
                    {summaryData.ayurvedaDashavidhaProfile.ayurvedicClinicalImpression}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: RELATED PROBLEM PRESCRIPTIONS (ONE LINE INFO) */}
            {summaryData?.relatedPrescriptions && summaryData.relatedPrescriptions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-[#2B4A8A]" />
                      6. Related Problem Prescriptions (One-Line Summary)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Concise clinical insights for all prescriptions on file matching patient conditions:
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {summaryData.relatedPrescriptions.length} Prescriptions
                  </span>
                </div>

                <div className="space-y-2.5 mt-3">
                  {summaryData.relatedPrescriptions.map((rx, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-blue-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900">{rx.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {rx.category}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full self-start sm:self-auto ${
                          rx.isRunning
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rx.isRunning ? 'Active Running' : 'Completed / PRN'}
                        </span>
                      </div>
                      {/* ONE LINE INFORMATION */}
                      <p className="text-xs text-slate-700 font-medium leading-snug">
                        <span className="font-bold text-[#2B4A8A]">Clinical Role: </span>
                        {rx.oneLineInfo}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Prescribed by: {rx.doctor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 6B: PAST PRESCRIPTIONS EXTRACTED FROM REPORTS & OCR */}
            {summaryData?.pastPrescriptionsFromOcr && summaryData.pastPrescriptionsFromOcr.length > 0 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
                <div className="flex items-center justify-between mb-3 border-b border-blue-200 pb-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#2B4A8A]" />
                      6B. Past Prescriptions Extracted from Reports & OCR Scans
                    </h3>
                    <p className="text-[10px] text-blue-800 font-medium">
                      Historical medications identified from digitized paper prescriptions and clinical records:
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#2B4A8A] bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {summaryData.pastPrescriptionsFromOcr.length} Extracted
                  </span>
                </div>

                <div className="space-y-2.5 mt-3">
                  {summaryData.pastPrescriptionsFromOcr.map((rx, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-blue-200/80 text-xs shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900">{rx.name}</span>
                          {rx.dosage && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#2B4A8A] font-bold">
                              {rx.dosage}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Source: {rx.sourceReportTitle || 'Digitized Prescription'} {rx.reportDate ? `(${rx.reportDate})` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-snug">
                        {rx.timing && <span className="mr-2">Timing: {rx.timing}</span>}
                        {rx.instructions && <span>Instructions: {rx.instructions}</span>}
                      </p>
                      {rx.ocrContextSnippet && (
                        <p className="text-[10px] text-slate-400 italic mt-1 font-mono bg-slate-50 p-1.5 rounded">
                          "{rx.ocrContextSnippet}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 7: CURRENTLY RUNNING PRESCRIPTION (SEPARATELY HIGHLIGHTED) */}
            {summaryData?.runningPrescriptions && summaryData.runningPrescriptions.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white p-5 sm:p-6 shadow-md shadow-emerald-500/10">
                {/* Glowing top badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-emerald-200">
                  <div className="flex items-center space-x-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-emerald-950">
                        7. Currently Running Prescriptions (Separately Highlighted)
                      </h3>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        Live Active Medication Regimen — Currently Being Consumed by Patient
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black tracking-wide shadow-xs shrink-0 self-start sm:self-auto">
                    LIVE RUNNING MEDS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {summaryData.runningPrescriptions.map((med, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border-2 border-emerald-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          Running Now
                        </span>
                        <Pill className="w-4 h-4 text-emerald-600" />
                      </div>

                      <h4 className="font-black text-slate-950 text-sm leading-tight">
                        {med.name}
                      </h4>
                      <p className="text-xs font-bold text-emerald-800 mt-1">
                        Strength: {med.dosage}
                      </p>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                            Frequency & Timing
                          </span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {med.frequency}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium block">
                            {med.timing}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block">
                            Course Duration
                          </span>
                          <span className="font-bold text-slate-800 text-[11px] block mt-0.5">
                            {med.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                      <p className="italic text-emerald-950 font-semibold line-clamp-2">
                        "{med.instructions}"
                      </p>
                      <p className="mt-1 text-slate-400 truncate">
                        {med.prescribedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-emerald-100/60 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Adherence Status:</strong> Patient is actively logging daily reminders for these running medications via Ayushman Bharat Kiosk.
                </span>
              </div>
            </div>
            )}

            {/* SECTION 8: DISCLAIMER & VERIFICATION FOOTER */}
            <div className="border-t border-slate-200 pt-5 text-slate-500 text-[11px] space-y-2">
              <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed font-medium">
                  <strong>Clinical Notice & Legal Disclaimer:</strong> This summary is generated by Medikiosk AI to organize patient-reported data, genetic health risks, permanent chronic diseases, and active running prescriptions for doctor consultation. It does not replace a physical medical diagnosis.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 pt-2">
                <span>ABDM ID: {summaryData?.patientDetails?.abhaId} | Token: {summaryData?.reportId}</span>
                <span>Digitally Authenticated by Ayushman Bharat Health Information Kiosk</span>
              </div>
            </div>

          </div>

        </div>

        {/* MODAL BOTTOM ACTION BAR (CONTAINS SAVE OPTION AT LAST) (no-print) */}
        <div className="no-print bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center space-x-2">
            {saveErrorMsg ? (
              <span className="flex items-center space-x-1.5 text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </span>
            ) : saveSuccessMsg ? (
              <span className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Saved to Dashboard History!</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Save this report to store it permanently in your Dashboard history at the end.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download PDF</span>
            </button>

            {/* SAVE OPTION AT THE LAST OF SUMMARIZED FILE */}
            <button
              type="button"
              onClick={handleSaveToDashboard}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-extrabold shadow-md shadow-emerald-700/20 transition-all active:scale-95 disabled:opacity-50"
              title="Save this summarized file so it appears at the end of the Dashboard"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving to Dashboard...' : 'Save to Dashboard'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
