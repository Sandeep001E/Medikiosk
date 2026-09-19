import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Sparkles,
  Plus,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  HeartPulse,
  Pill,
  Dna,
  Stethoscope,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  User,
  Radio,
  Paperclip,
  Flame,
  Activity,
  Calendar,
  Layers,
  Check
} from 'lucide-react';

import IncomingCaseModal from './components/IncomingCaseModal';
import IssuePrescriptionModal from './components/IssuePrescriptionModal';

export default function DoctorDashboard({
  liveTransmissions = [],
  onSaveDoctorNote,
  onOpenQrModal,
  doctorInfo,
  activeBridge
}) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordsFilter, setRecordsFilter] = useState('ALL'); // 'ALL' or 'PATIENT'
  const [patientSearch, setPatientSearch] = useState('');

  // Selected Card for Full Summary File View & Doctor Notes
  const [selectedCaseForView, setSelectedCaseForView] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  // When liveTransmissions arrive or update, re-fetch patients if list is empty
  useEffect(() => {
    if (liveTransmissions.length > 0 && patients.length === 0) {
      fetchPatients();
    }
  }, [liveTransmissions]);

  // When selectedPatientId changes, fetch their specific case from backend
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientCase(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/doctor/patients');
      const data = await res.json();
      if (data.success && Array.isArray(data.patients)) {
        setPatients(data.patients);
        if (data.patients.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data.patients[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchPatientCase = async (patId) => {
    setLoading(true);
    setPatientData(null);
    try {
      const res = await fetch(`/api/doctor/patient-case/${patId}`);
      const data = await res.json();
      if (data.success) {
        setPatientData(data);
      }
    } catch (err) {
      console.error('Error fetching patient case:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAlertSnippet = (alert) => {
    if (!alert) return 'No immediate contraindications flagged';
    if (typeof alert === 'string') return alert;
    return alert.title || alert.finding || alert.clinicalHazard || alert.description || 'Clinical alert flagged';
  };

  // Combine live transmissions with server problem logs
  const liveIds = new Set(liveTransmissions.map((t) => t.id));
  const serverReports = (patientData?.problemLogs || [])
    .filter((log) => !liveIds.has(log.id))
    .map((log) => {
      const rawAlert = (log.summary?.clinicalRedAlerts || log.summary?.redAlerts)?.[0];
      return {
        id: log.id,
        patientId: log.patientId || selectedPatientId,
        consentToken: log.id,
        timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
        title: log.problemTitle || log.title || log.summary?.reportTitle || 'Reported Clinical Assessment',
        rawTranscript: log.chiefComplaint || log.summary?.chiefComplaint || 'Reported by patient',
        description: log.chiefComplaint || log.summary?.chiefComplaint || 'Clinical health summary stored in patient history.',
        geneticCount: log.summary?.geneticDiseases?.length || 0,
        permanentCount: log.summary?.permanentDiseases?.length || 0,
        runningMedsCount: log.summary?.runningPrescriptions?.length || 0,
        redAlertsCount: (log.summary?.clinicalRedAlerts || log.summary?.redAlerts || []).length,
        redAlertSnippet: formatAlertSnippet(rawAlert),
        doctorNotes: log.doctorNotes || [],
        extraReports: log.extraReports || log.summary?.extraReports || [],
        summaryData: log.summary || log.aiSummary || {},
        patientName: patientData?.patient?.fullName || 'Patient',
        ayurvedaDashavidha: log.summary?.ayurvedaDashavidhaProfile || log.aiSummary?.ayurvedaDashavidhaProfile || null,
        pastPrescriptions: log.summary?.pastPrescriptionsFromOcr || log.aiSummary?.pastPrescriptionsFromOcr || []
      };
    });

  const combinedReports = [
    ...liveTransmissions.map((t) => {
      const rawAlert = (t.summaryData?.clinicalRedAlerts || t.summaryData?.redAlerts)?.[0];
      return {
        id: t.id,
        patientId: t.patientId || t.summaryData?.patientDetails?.id,
        consentToken: t.consentToken || 'ABDM-QR-TRANSMITTED',
        timestamp: t.timestamp || new Date().toISOString(),
        title: t.summaryData?.reportTitle || t.summaryData?.problemTitle || t.summaryData?.chiefComplaint || 'Transmitted Clinical Assessment',
        rawTranscript: t.summaryData?.chiefComplaint || 'Transmitted via QR scan',
        description: t.summaryData?.chiefComplaint || t.summaryData?.reportTitle || t.summaryData?.problemTitle || 'Clinical health summary transmitted by patient via doctor QR scan in clinic.',
        geneticCount: t.summaryData?.geneticDiseases?.length || 0,
        permanentCount: t.summaryData?.permanentDiseases?.length || 0,
        runningMedsCount: t.summaryData?.runningPrescriptions?.length || 0,
        redAlertsCount: (t.summaryData?.clinicalRedAlerts || t.summaryData?.redAlerts || []).length,
        redAlertSnippet: formatAlertSnippet(rawAlert),
        doctorNotes: t.doctorNotes || [],
        extraReports: t.extraReports || t.summaryData?.extraReports || [],
        summaryData: t.summaryData || {},
        patientName: t.patientName || t.summaryData?.patientDetails?.fullName || 'Patient',
        ayurvedaDashavidha: t.summaryData?.ayurvedaDashavidhaProfile || t.ayurvedaDashavidhaProfile || null,
        pastPrescriptions: t.summaryData?.pastPrescriptionsFromOcr || t.pastPrescriptionsFromOcr || []
      };
    }),
    ...serverReports
  ];

  // Derive dynamic active patient from selected patient ID, or live transmission, or roster
  const activePatientFromList = patients.find((p) => p.id === selectedPatientId);
  const activePatientFromLive = liveTransmissions.find(
    (t) => t.patientId === selectedPatientId || t.id === selectedPatientId
  );

  const activePatient =
    activePatientFromList ||
    (activePatientFromLive
      ? {
          id: activePatientFromLive.patientId,
          fullName: activePatientFromLive.patientName || activePatientFromLive.summaryData?.patientDetails?.fullName || '',
          abhaId: activePatientFromLive.summaryData?.patientDetails?.abhaId || activePatientFromLive.abhaId || '',
          gender: activePatientFromLive.summaryData?.patientDetails?.gender || 'Not Specified',
          age: activePatientFromLive.summaryData?.patientDetails?.age || null,
          bloodGroup: activePatientFromLive.summaryData?.patientDetails?.bloodGroup || 'Not Specified',
          chronicConditions: activePatientFromLive.summaryData?.permanentDiseases || [],
          allergies: activePatientFromLive.summaryData?.allergies || [],
          geneticConditions: activePatientFromLive.summaryData?.geneticDiseases || [],
          runningPrescriptions: activePatientFromLive.summaryData?.runningPrescriptions || [],
          latestSummary: activePatientFromLive.summaryData || {}
        }
      : (activeBridge && activeBridge.patientId === selectedPatientId)
      ? {
          id: activeBridge.patientId,
          fullName: activeBridge.patientName || '',
          abhaId: activeBridge.abhaId || '',
          gender: activeBridge.gender || 'Not Specified',
          bloodGroup: activeBridge.bloodGroup || 'Not Specified',
          chronicConditions: [],
          allergies: []
        }
      : (patients[0] || (liveTransmissions[0]?.summaryData?.patientDetails ? { ...liveTransmissions[0].summaryData.patientDetails, id: liveTransmissions[0].patientId } : null)));

  // Find the active patient's most recent clinical summary
  const matchingLiveSummary = liveTransmissions.find(
    (t) =>
      t.patientId === activePatient?.id ||
      t.summaryData?.patientDetails?.id === activePatient?.id ||
      (t.patientName && t.patientName.toLowerCase() === activePatient?.fullName?.toLowerCase()) ||
      (t.summaryData?.patientDetails?.fullName &&
        t.summaryData.patientDetails.fullName.toLowerCase() === activePatient?.fullName?.toLowerCase())
  )?.summaryData;

  const matchingServerSummary =
    patientData?.patient?.id === activePatient?.id
      ? (patientData?.problemLogs?.[0]?.summary || patientData?.problemLogs?.[0]?.aiSummary)
      : null;

  const activeSummary =
    matchingLiveSummary ||
    matchingServerSummary ||
    activePatient?.latestSummary ||
    null;

  // Derive dynamic clinical fields based on active patient's summarized information
  const dynamicConditions =
    (activeSummary?.permanentDiseases && activeSummary.permanentDiseases.length > 0)
      ? activeSummary.permanentDiseases
      : (activePatient?.chronicConditions || activePatient?.permanentDiseases || []);

  const dynamicAllergies =
    (activeSummary?.allergies && activeSummary.allergies.length > 0)
      ? activeSummary.allergies
      : (activePatient?.allergies || []);

  const dynamicGenetic =
    (activeSummary?.geneticDiseases && activeSummary.geneticDiseases.length > 0)
      ? activeSummary.geneticDiseases
      : (activePatient?.geneticConditions || []);

  const dynamicRunningMeds =
    (activeSummary?.runningPrescriptions && activeSummary.runningPrescriptions.length > 0)
      ? activeSummary.runningPrescriptions
      : (activePatient?.runningPrescriptions || patientData?.prescriptions || []);

  const dynamicOcrPrescriptions =
    activeSummary?.pastPrescriptionsFromOcr || activeSummary?.pastPrescriptions || [];

  const dynamicDashavidha =
    activeSummary?.ayurvedaDashavidhaProfile || null;

  const dynamicRedAlerts =
    activeSummary?.clinicalRedAlerts || activeSummary?.redAlerts || [];

  const dynamicChiefComplaint =
    activeSummary?.chiefComplaint ||
    activeSummary?.problemTitle ||
    activeSummary?.reportTitle ||
    (patientData?.latestProblem
      ? (patientData.latestProblem.rawTranscript || patientData.latestProblem.aiSummary?.chiefComplaint)
      : null);

  const isMockPatient = (id, name) => {
    const cleanId = (id || '').toLowerCase();
    const cleanName = (name || '').toLowerCase();
    return (
      cleanId === 'pat-001' ||
      cleanId.startsWith('pat-test') ||
      cleanName === 'patient' ||
      cleanName.includes('test patient') ||
      cleanName === 'demo patient'
    );
  };

  // Filtered reports for the records list (excluding any mock data)
  const validReports = combinedReports.filter(r => !isMockPatient(r.patientId, r.patientName));
  const displayedReports = recordsFilter === 'PATIENT' && activePatient?.id
    ? validReports.filter((r) => r.patientId === activePatient.id)
    : validReports;

  // Filtered patients for switcher search (excluding any mock patients)
  const filteredPatients = patients
    .filter(p => !isMockPatient(p.id, p.fullName))
    .filter((p) =>
      (p.fullName || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.abhaId || '').toLowerCase().includes(patientSearch.toLowerCase())
    );

  const formatDate = (isoString) => {
    if (!isoString) return new Date().toLocaleDateString('en-IN');
    const d = new Date(isoString);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    return `${day} ${month} ${year}, ${time}`;
  };

  return (
    <div className="space-y-6">

      {/* =======================================================
          0. DYNAMIC PATIENT SELECTION TOOLBAR (USER SWITCHER)
          ======================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2B4A8A] flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              CLINICAL PATIENT SELECTOR
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              Active Patient Workstation
            </span>
          </div>
        </div>

        {/* Horizontal Patient Chips / Pills List */}
        <div className="flex-1 overflow-x-auto flex items-center space-x-2 py-1 scrollbar-thin">
          {patients.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              Awaiting patient records or live QR transmission...
            </span>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = activePatient?.id === p.id;
              const hasLive = liveTransmissions.some((t) => t.patientId === p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(p.id);
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#2B4A8A] text-white border-[#2B4A8A] shadow-md shadow-[#2B4A8A]/25 scale-102'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#2B4A8A]/10 text-[#2B4A8A]'
                    }`}
                  >
                    {p.fullName ? p.fullName.charAt(0) : 'P'}
                  </span>
                  <span>{p.fullName}</span>
                  {p.bloodGroup && p.bloodGroup !== 'Not Specified' && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {p.bloodGroup}
                    </span>
                  )}
                  {hasLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Live Transmitted Case Active" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Search Input for fast roster filtering */}
        {patients.length > 4 && (
          <div className="relative shrink-0 w-full sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Find patient..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2B4A8A] transition-all"
            />
          </div>
        )}
      </div>

      {/* =======================================================
          1. TOP CANOPY & PATIENT DEMOGRAPHICS CARD
          ======================================================= */}
      <div className="relative">
        {/* Subtle decorative curved header canopy in Deep Slate Navy #2B4A8A */}
        <div className="h-16 w-[96%] mx-auto bg-gradient-to-r from-[#223B6E] via-[#2B4A8A] to-[#182A4E] rounded-3xl -mb-10 shadow-md opacity-95" />

        {/* Patient Demographics Card */}
        <div className="relative rounded-3xl bg-white p-6 shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {activePatient ? (
            <>
              {/* Left: Avatar, Patient Name & Dynamic Selector */}
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#2B4A8A] text-white font-black text-2xl flex items-center justify-center shadow-md shadow-[#2B4A8A]/20 shrink-0">
                  {activePatient.fullName ? activePatient.fullName.charAt(0) : 'P'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {activePatient.fullName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ACTIVE WORKSTATION
                    </span>
                    {liveTransmissions.some((t) => t.patientId === activePatient.id) && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2B4A8A] font-extrabold text-[10px] tracking-wider uppercase border border-blue-200">
                        LIVE TRANSMISSION
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs text-slate-400 font-mono font-medium">
                      ABHA: {activePatient.abhaId || 'N/A'}
                    </p>
                    {(activeSummary?.patientDetails?.age || activePatient.age) ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <p className="text-xs text-slate-500 font-semibold">
                          Age: {activeSummary?.patientDetails?.age || activePatient.age} yrs
                        </p>
                      </>
                    ) : null}
                    {filteredPatients.length > 1 && (
                      <select
                        value={selectedPatientId || ''}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="text-[11px] font-bold text-[#2B4A8A] bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                        title="Switch patient"
                      >
                        {filteredPatients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.bloodGroup || 'Blood: N/A'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: 4 Demographic Stat Columns (Bound directly to user's summarized info) */}
              <div className="grid grid-cols-4 gap-4 sm:gap-8 text-center sm:text-left border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    GENDER
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 mt-1 block truncate">
                    {activeSummary?.patientDetails?.gender || activePatient.gender || 'Not Specified'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    BLOOD GROUP
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 mt-1 block">
                    {activeSummary?.patientDetails?.bloodGroup || activePatient.bloodGroup || 'Not Specified'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    CONDITIONS
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 mt-1 block">
                    {dynamicConditions.length}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    ALLERGIES
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 mt-1 block">
                    {dynamicAllergies.length}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full py-1">
              <div className="flex items-center space-x-4">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#2B4A8A] to-blue-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-[#2B4A8A]/20 shrink-0">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Clinical Workstation Standby</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2B4A8A] text-[10px] font-black border border-blue-200">
                      LIVE SSE
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Awaiting patient consultation bridge. Have patient scan your consultation QR code to link case.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenQrModal}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2B4A8A] hover:bg-blue-900 text-white text-xs font-black shadow-md shadow-[#2B4A8A]/20 transition-all hover:scale-102 cursor-pointer shrink-0"
              >
                <QrCode className="w-4 h-4" />
                <span>Show Consultation QR Code</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =======================================================
          2. DYNAMIC ACTIVE PATIENT CLINICAL SUMMARY SHOWCASE
          ======================================================= */}
      {activePatient && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
          {/* Card Header in Deep Navy #2B4A8A */}
          <div className="bg-gradient-to-r from-[#223B6E] via-[#2B4A8A] to-[#1D3360] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs shrink-0">
                <Sparkles className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                    ACTIVE PATIENT SUMMARY
                  </span>
                  <span className="text-xs font-mono text-blue-200 font-semibold">
                    {activePatient.fullName}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-0.5">
                  Synthesized Clinical Profile & Assessment
                </h3>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Pill className="w-3.5 h-3.5" />
                <span>+ Issue Prescription</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetCase = combinedReports.find((r) => r.patientId === activePatient.id) || combinedReports[0];
                  if (targetCase) setSelectedCaseForView(targetCase);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Doctor Note</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Body: Synthesized Chief Complaint, Dashavidha, Alerts, & Meds */}
          <div className="p-6 space-y-5">
            {/* Row 1: Synthesized Chief Complaint Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#2B4A8A] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    REPORTED CHIEF COMPLAINT
                  </span>
                  {activeSummary?.problemTitle && (
                    <span className="text-xs font-bold text-slate-700">
                      {activeSummary.problemTitle}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800 italic leading-relaxed">
                  {dynamicChiefComplaint ? `"${dynamicChiefComplaint}"` : 'No acute problem complaint recorded for this patient yet.'}
                </p>
              </div>

              {/* Safety Red Alert Pill */}
              <div className="shrink-0">
                {dynamicRedAlerts.length > 0 ? (
                  <div className="px-3 py-2 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center space-x-2 shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{dynamicRedAlerts.length} Red Flag Safety Alert{dynamicRedAlerts.length === 1 ? '' : 's'}</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-2 shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No Contraindications Flagged</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: 4 Clinical Summarized Data Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Permanent / Chronic Diseases */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    PERMANENT CONDITIONS
                  </span>
                  <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
                    {dynamicConditions.length}
                  </span>
                </div>
                <div>
                  {dynamicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dynamicConditions.map((c, i) => (
                        <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                          {typeof c === 'string' ? c : (c.name || c.title || 'Condition')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">None documented</span>
                  )}
                </div>
              </div>

              {/* Card 2: Drug Allergies */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    KNOWN ALLERGIES
                  </span>
                  <span className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-black">
                    {dynamicAllergies.length}
                  </span>
                </div>
                <div>
                  {dynamicAllergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dynamicAllergies.map((a, i) => (
                        <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                          {typeof a === 'string' ? a : (a.allergen || a.name || 'Allergy')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No allergies reported</span>
                  )}
                </div>
              </div>

              {/* Card 3: Genetic Conditions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    GENETIC TRAITS
                  </span>
                  <span className="w-7 h-7 rounded-xl bg-blue-100 text-[#2B4A8A] flex items-center justify-center text-xs font-black">
                    {dynamicGenetic.length}
                  </span>
                </div>
                <div>
                  {dynamicGenetic.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dynamicGenetic.map((g, i) => (
                        <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-[#2B4A8A] border border-blue-200">
                          {typeof g === 'string' ? g : (g.name || g.title || 'Genetic')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No genetic markers</span>
                  )}
                </div>
              </div>

              {/* Card 4: Running Prescriptions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    RUNNING MEDICATIONS
                  </span>
                  <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                    {dynamicRunningMeds.length}
                  </span>
                </div>
                <div>
                  {dynamicRunningMeds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dynamicRunningMeds.map((m, i) => (
                        <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {typeof m === 'string' ? m : (m.name || 'Medicine')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No active medications</span>
                  )}
                </div>
              </div>

            </div>

            {/* Row 3: Ayurveda Dashavidha Pariksha Matrix (If present in summary) */}
            {dynamicDashavidha && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🌿</span>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      Ayurveda Dashavidha Pariksha (10-Fold Clinical Assessment)
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-300">
                    AYUSH / TRADITIONAL PROTOCOL
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {dynamicDashavidha.agni && (
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">AGNI (DIGESTION)</span>
                      <span className="font-extrabold text-amber-900 block mt-0.5 truncate">{dynamicDashavidha.agni}</span>
                    </div>
                  )}
                  {dynamicDashavidha.koshta && (
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">KOSHTA (BOWEL)</span>
                      <span className="font-extrabold text-amber-900 block mt-0.5 truncate">{dynamicDashavidha.koshta}</span>
                    </div>
                  )}
                  {dynamicDashavidha.sattvaAndNidra && (
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">SATTVA & NIDRA</span>
                      <span className="font-extrabold text-amber-900 block mt-0.5 truncate">{dynamicDashavidha.sattvaAndNidra}</span>
                    </div>
                  )}
                  {dynamicDashavidha.doshaTendency && (
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">DOSHA TENDENCY</span>
                      <span className="font-extrabold text-amber-900 block mt-0.5 truncate">{dynamicDashavidha.doshaTendency}</span>
                    </div>
                  )}
                  {dynamicDashavidha.vyayamaShakti && (
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">VYAYAMA (PHYSICAL)</span>
                      <span className="font-extrabold text-amber-900 block mt-0.5 truncate">{typeof dynamicDashavidha.vyayamaShakti === 'object' ? dynamicDashavidha.vyayamaShakti?.physicalStamina : dynamicDashavidha.vyayamaShakti}</span>
                    </div>
                  )}
                </div>

                {dynamicDashavidha.summaryNarrative && (
                  <p className="text-xs text-amber-900 font-medium italic border-t border-amber-200/80 pt-2">
                    {dynamicDashavidha.summaryNarrative}
                  </p>
                )}
              </div>
            )}

            {/* Row 4: OCR Extracted Prescriptions (If present) */}
            {dynamicOcrPrescriptions.length > 0 && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#2B4A8A]" />
                    <h4 className="text-xs font-black text-[#2B4A8A] uppercase tracking-wider">
                      Digitized Past Prescriptions (OCR Extracted) ({dynamicOcrPrescriptions.length})
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-[#2B4A8A] border border-blue-300">
                    GEMINI FLASH MULTIMODAL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dynamicOcrPrescriptions.slice(0, 2).map((rx, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-blue-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{rx.doctorName || 'Previous Physician'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{rx.date || 'Past Record'}</span>
                      </div>
                      <p className="text-slate-500 line-clamp-2 text-[11px]">{rx.diagnosis || rx.rawText || 'Prescription history'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* =======================================================
          3. MAIN CLINICAL RECORDS SECTION CONTAINER
          ======================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Header Row: Title & Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-[#2B4A8A] font-extrabold text-[10px] uppercase tracking-wider">
                CLINICAL HISTORY & RECORDS
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {displayedReports.length} Saved Records
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Reported Problem Summaries & PDF History
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1.5">
              Archived patient reported problem clinical summaries, genetic disease profiles, and printable PDF documents
            </p>
          </div>

          {/* Filter Tabs & Deep Navy Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Tabs to toggle All Consultations vs This Patient's */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setRecordsFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  recordsFilter === 'ALL'
                    ? 'bg-white text-[#2B4A8A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Consultations ({combinedReports.length})
              </button>
              {activePatient && (
                <button
                  type="button"
                  onClick={() => setRecordsFilter('PATIENT')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    recordsFilter === 'PATIENT'
                      ? 'bg-white text-[#2B4A8A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {activePatient.fullName}'s Records (
                  {combinedReports.filter((r) => r.patientId === activePatient.id).length})
                </button>
              )}
            </div>

            {activePatient && (
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 hover:scale-102 active:scale-98 cursor-pointer transition-all"
              >
                <Pill className="w-3.5 h-3.5" />
                <span>+ Issue Prescription</span>
              </button>
            )}

            <button
              type="button"
              disabled={combinedReports.length === 0}
              onClick={() => {
                const targetCase =
                  displayedReports.find((r) => r.patientId === activePatient?.id) ||
                  displayedReports[0] ||
                  combinedReports[0];
                if (targetCase) setSelectedCaseForView(targetCase);
              }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                combinedReports.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#2B4A8A] hover:bg-blue-900 text-white shadow-md shadow-[#2B4A8A]/25 hover:scale-102 active:scale-98 cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Doctor Note</span>
            </button>
          </div>
        </div>

        {/* 2-Column Cards Grid or Empty Standby State */}
        {displayedReports.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2B4A8A] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-black text-slate-800">
              {recordsFilter === 'PATIENT'
                ? `No Recorded Problem Logs for ${activePatient?.fullName}`
                : 'Awaiting Transmitted Case Summaries'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md font-medium">
              {recordsFilter === 'PATIENT'
                ? `When ${activePatient?.fullName} transmits a new problem summary via QR code, it will dynamically appear here.`
                : 'No clinical summaries have been received yet. When a patient scans your consultation QR code and shares their medical summary, it will automatically arrive here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedReports.map((report) => {
              const isThisPatient = activePatient?.id === report.patientId;
              const hasNotes = report.doctorNotes && report.doctorNotes.length > 0;

              return (
                <div
                  key={report.id}
                  onClick={() => {
                    if (report.patientId && report.patientId !== selectedPatientId) {
                      setSelectedPatientId(report.patientId);
                    }
                  }}
                  className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer ${
                    isThisPatient
                      ? 'border-[#2B4A8A]/50 ring-2 ring-[#2B4A8A]/10'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div>
                    {/* Top Row: Pink File Icon, Date/Time, Token ID, ABDM Verified Badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            {formatDate(report.timestamp)}
                          </p>
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-mono text-blue-900 font-bold tracking-tight">
                              {report.id}
                            </p>
                            <span className="text-[10px] text-slate-400 font-bold">
                              • {report.patientName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
                        ABDM VERIFIED
                      </span>
                    </div>

                    {/* Card Title & Problem Description */}
                    <div className="mt-4">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                        {report.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed line-clamp-2">
                        Patient reports: "{report.description}"
                      </p>
                    </div>

                    {/* 4 Badges Row (Genetic, Permanent, Running Meds, Red Alerts) */}
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-semibold flex items-center gap-1">
                        <span>🧬</span>
                        <span>{report.geneticCount} Genetic</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 text-[11px] font-semibold flex items-center gap-1">
                        <span>🩺</span>
                        <span>{report.permanentCount} Permanent</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{report.runningMedsCount} Running Meds</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-semibold flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{report.redAlertsCount} Red Alerts</span>
                      </span>

                      {report.ayurvedaDashavidha && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black flex items-center gap-1">
                          <span>🌿</span>
                          <span>Dashavidha Pariksha</span>
                        </span>
                      )}

                      {report.pastPrescriptions && report.pastPrescriptions.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-[#2B4A8A] border border-blue-300 text-[11px] font-black flex items-center gap-1">
                          <span>📄</span>
                          <span>{report.pastPrescriptions.length} OCR Prescriptions</span>
                        </span>
                      )}
                    </div>

                    {/* Red Flag Alert Strip with Red Dot & ANALYZED Badge */}
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-rose-950">
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                        <span className="truncate">
                          {typeof report.redAlertSnippet === 'string'
                            ? report.redAlertSnippet
                            : (report.redAlertSnippet?.title || report.redAlertSnippet?.finding || 'Clinical alert flagged')}
                        </span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white text-rose-600 border border-rose-200 shrink-0 shadow-2xs">
                        ANALYZED
                      </span>
                    </div>

                    {/* Attached Extra Reports Badge (From QR Consultation Bridge) */}
                    {report.extraReports && report.extraReports.length > 0 && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[#2B4A8A]">
                          <Paperclip className="w-3.5 h-3.5 text-[#2B4A8A] shrink-0" />
                          <span>Attached Reports ({report.extraReports.length})</span>
                        </div>
                        <div className="flex items-center gap-1 overflow-hidden max-w-[200px]">
                          {report.extraReports.slice(0, 2).map((rep, idx) => (
                            <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-[#2B4A8A] border border-blue-200 truncate">
                              {rep.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recorded Doctor Clinical Note Strip (If notes exist) */}
                    {hasNotes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#2B4A8A] font-black">
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Doctor Clinical Note ({report.doctorNotes.length})</span>
                          </span>
                          <span className="font-mono text-slate-500">{report.doctorNotes[0].doctorName}</span>
                        </div>
                        <p className="text-slate-700 italic line-clamp-2">"{report.doctorNotes[0].content}"</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: View Full Summary File & Print PDF */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCaseForView(report);
                      }}
                      className="flex items-center space-x-1.5 text-xs font-bold text-[#2B4A8A] hover:underline cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#2B4A8A]" />
                      <span>View Full Summary File</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.print();
                      }}
                      className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* =======================================================
          4. FULL CLINICAL SUMMARY FILE MODAL WITH DOCTOR NOTES
          ======================================================= */}
      <IncomingCaseModal
        isOpen={!!selectedCaseForView}
        onClose={() => setSelectedCaseForView(null)}
        caseItem={selectedCaseForView}
        onSaveNote={onSaveDoctorNote}
      />

      {/* =======================================================
          5. ISSUE PRESCRIPTION MODAL
          ======================================================= */}
      <IssuePrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        patient={activePatient}
        doctorInfo={doctorInfo}
        onPrescriptionIssued={(newRx) => {
          if (activePatient?.id) {
            fetchPatientCase(activePatient.id);
          }
        }}
      />

    </div>
  );
}
