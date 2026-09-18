import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Printer,
  Search,
  Dna,
  HeartPulse,
  Pill,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  Stethoscope,
  Phone,
  User,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ReportedProblemSummaryModal from '../../components/ReportedProblemSummaryModal';

export default function ReportedProblemHistory() {
  const { currentUser, t } = useAuth();
  const [problemLogs, setProblemLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentInitialText, setAssessmentInitialText] = useState('');
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const printAreaRef = useRef(null);

  const storageKey = currentUser?.id ? `medikiosk_problem_summaries_${currentUser.id}` : 'medikiosk_problem_summaries';

  // Fetch real problem logs from Firebase / backend API
  const fetchProblemLogs = async () => {
    if (!currentUser?.id) {
      setProblemLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/patient/problem-logs/${currentUser.id}`);
      let logs = [];
      if (res.ok) {
        const data = await res.json();
        logs = Array.isArray(data) ? data : (data.logs || []);
      }

      // Also merge with user-scoped local storage backup if available
      try {
        const local = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(local) && local.length > 0) {
          const ids = new Set(logs.map(l => l.id));
          local.forEach(item => {
            // ONLY merge if it explicitly belongs to the current user!
            if (!ids.has(item.id) && item.patientId === currentUser.id) {
              logs.push(item);
            }
          });
        }
      } catch (e) {
        console.warn('Local storage sync error:', e);
      }

      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
      setProblemLogs(logs);
    } catch (err) {
      console.error('Error fetching problem logs:', err);
      // Fallback to user-scoped local storage if network fails
      try {
        const local = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setProblemLogs(Array.isArray(local) ? local.filter(l => l.patientId === currentUser.id) : []);
      } catch (e) {
        setProblemLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Permanently delete a problem log from backend and local state
  const handleDeleteProblem = async (problemId) => {
    if (!currentUser?.id || !problemId) return;
    setDeletingId(problemId);
    try {
      const res = await fetch(`/api/patient/problem-logs/${currentUser.id}/${problemId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from problemLogs state
        setProblemLogs((prev) => prev.filter((p) => p.id !== problemId));
        // Remove from scoped localStorage
        try {
          const local = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const updated = local.filter((p) => p.id !== problemId);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {}
        setDeleteConfirmItem(null);
        window.dispatchEvent(new CustomEvent('patient-data-refresh'));
      } else {
        alert(data.message || 'Failed to delete reported problem record.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      // If server error, still update local state cleanly
      setProblemLogs((prev) => prev.filter((p) => p.id !== problemId));
      try {
        const local = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify(local.filter((p) => p.id !== problemId)));
      } catch (e) {}
      setDeleteConfirmItem(null);
      window.dispatchEvent(new CustomEvent('patient-data-refresh'));
    } finally {
      setDeletingId(null);
    }
  };

  // Fetch active prescriptions for new assessments
  const fetchPrescriptions = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/prescriptions/${currentUser.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.prescriptions)) {
        setActivePrescriptions(data.prescriptions);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

  useEffect(() => {
    fetchProblemLogs();
    fetchPrescriptions();

    const handleRefresh = () => {
      fetchProblemLogs();
      fetchPrescriptions();
    };

    window.addEventListener('patient-data-refresh', handleRefresh);
    return () => window.removeEventListener('patient-data-refresh', handleRefresh);
  }, [currentUser]);

  // Handle direct print of report
  const handlePrintReport = (report) => {
    setSelectedReport(report);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Filter logs by search query
  const filteredLogs = problemLogs.filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const summary = item.aiSummary || item.summary || {};
    const title = (summary.reportTitle || item.problemTitle || '').toLowerCase();
    const chiefComplaint = (summary.chiefComplaint || item.rawTranscript || '').toLowerCase();
    const id = (item.id || '').toLowerCase();
    return title.includes(query) || chiefComplaint.includes(query) || id.includes(query);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-1 text-xs font-bold text-blue-200 hover:text-white transition-colors bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('backToDashboard', 'Back to Dashboard')}</span>
            </Link>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[11px] font-extrabold uppercase tracking-wider border border-blue-400/30">
              {t('abdmClinicalVault', 'ABDM Clinical Vault')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('reportedProblemHistory', 'Reported Problem History')}
          </h1>
          <p className="text-sm text-blue-100 max-w-2xl font-medium">
            Archived clinical problem assessments, permanent conditions & genetic cross-checks, running medications, and verified medical summary reports.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchProblemLogs();
              fetchPrescriptions();
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all shadow-xs"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setAssessmentInitialText('');
              setIsAssessmentModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-[#2B4A8A] hover:bg-blue-50 font-black text-xs shadow-lg shadow-black/10 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-[#2B4A8A]" />
            <span>+ {t('newProblemAssessment', 'New Problem Assessment')}</span>
          </button>
        </div>
      </div>

      {/* Search and Stats Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchReportedProblems', 'Search by problem, symptoms, or Report ID...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]/20 focus:border-[#2B4A8A] transition-all"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs font-bold text-slate-500 w-full sm:w-auto justify-end">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            {problemLogs.length} {t('totalRecordsSaved', 'Total Saved Records')}
          </span>
          {searchQuery.trim() && (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#2B4A8A]">
              {filteredLogs.length} {t('matchingResults', 'Matching')}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      {loading && problemLogs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="inline-block p-4 bg-blue-50 rounded-full text-[#2B4A8A] mb-4">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {t('loadingProblemHistory', 'Loading Reported Problem History from Firebase...')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">Connecting to secure clinical database...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="inline-block p-4 bg-slate-100 rounded-full text-slate-400 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800">
            {searchQuery.trim()
              ? t('noMatchingReportsFound', 'No Matching Reported Problems Found')
              : t('noReportedProblemsYet', 'No Reported Problem Summaries Saved Yet')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto font-medium">
            {searchQuery.trim()
              ? t('tryDifferentSearch', 'Try searching for different symptom keywords, disease names, or Report IDs.')
              : t('generateFirstProblemAssessmentDesc', 'Click "+ New Problem Assessment" to record your symptoms. MediKiosk AI will cross-analyze against your genetic conditions, permanent conditions, and running medications.')}
          </p>
          {!searchQuery.trim() && (
            <button
              type="button"
              onClick={() => {
                setAssessmentInitialText('');
                setIsAssessmentModalOpen(true);
              }}
              className="mt-5 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2B4A8A] text-white text-xs font-black shadow-md hover:bg-[#223B6E] transition-all"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>{t('generateFirstSummary', 'Generate First Problem Summary')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLogs.map((item) => {
            const summary = item.aiSummary || item.summary || {};
            const title = summary.reportTitle || item.problemTitle || item.rawTranscript || 'Reported Problem Summary';
            const chiefComplaint = summary.chiefComplaint || item.rawTranscript || '';
            const genCount = summary.geneticDiseases?.length || (currentUser?.geneticConditions?.length || 0);
            const permCount = summary.permanentDiseases?.length || (currentUser?.chronicConditions?.length || 0);
            const runCount = summary.runningPrescriptions?.length || (activePrescriptions?.length || 0);
            const alertCount = summary.redAlerts?.length || 0;
            const dateStr = item.timestamp || item.createdAt
              ? new Date(item.timestamp || item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : t('recentReport', 'Recent Report');

            return (
              <div
                key={item.id}
                className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:border-[#2B4A8A]/40 hover:shadow-xl hover:shadow-blue-900/5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Top / ID & Date */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shadow-xs shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">
                          {dateStr}
                        </span>
                        <span className="text-xs font-mono font-black text-[#2B4A8A]">
                          {(item.id || '').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                      {t('abdmVerified', 'ABDM Verified')}
                    </span>
                  </div>

                  {/* Problem Title & Chief Complaint */}
                  <h3 className="text-base font-black text-slate-900 line-clamp-1 group-hover:text-[#2B4A8A] transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed font-medium">
                    {chiefComplaint}
                  </p>

                  {summary.historyOfPresentIllness && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                      <p className="text-[10px] font-black uppercase text-amber-900 mb-1">History of Present Illness (Summarized)</p>
                      <p className="text-[11px] text-slate-700 font-semibold line-clamp-3 leading-relaxed">
                        {summary.historyOfPresentIllness}
                      </p>
                    </div>
                  )}

                  {/* Badges / Clinical Cross-Checks */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-bold">
                      <Dna className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{genCount} {t('genetic', 'Genetic')}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-100 text-violet-800 text-[10px] font-bold">
                      <HeartPulse className="w-3.5 h-3.5 text-violet-600" />
                      <span>{permCount} {t('permanent', 'Permanent')}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{runCount} {t('runningMeds', 'Running Meds')}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{alertCount} {t('redAlerts', 'Red Alerts')}</span>
                    </span>
                  </div>

                  {/* Ayurveda Dashavidha Pariksha Tag */}
                  {(item.ayurvedaDashavidhaProfile || item.summary?.ayurvedaDashavidhaProfile || item.aiSummary?.ayurvedaDashavidhaProfile) && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-black">
                        🌿 Dashavidha Assessed
                      </span>
                      {(() => {
                        const ay = item.ayurvedaDashavidhaProfile || item.summary?.ayurvedaDashavidhaProfile || item.aiSummary?.ayurvedaDashavidhaProfile;
                        return (
                          <>
                            {ay.agniAharaShakti?.agniStatus && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                Agni: {ay.agniAharaShakti.agniStatus.split(' ')[0]}
                              </span>
                            )}
                            {ay.prakritiVikriti?.doshaImbalanceTendency && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                Dosha: {ay.prakritiVikriti.doshaImbalanceTendency}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Analysis Status Banner */}
                  <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-700 flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5 truncate">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Clinical Contraindications & Medication Cross-Analysis</span>
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0 ml-2">
                      Analyzed
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(item)}
                    className="flex items-center space-x-1.5 text-xs font-black text-[#2B4A8A] hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{t('viewFullSummary', 'View Full Summary File')}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handlePrintReport(item)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="Download or Print PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('printPdf', 'Print PDF')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmItem(item)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      title="Delete this problem record"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>{t('delete', 'Delete')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================
          FULL REPORT CLINICAL DETAIL MODAL
          ================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] p-5 sm:p-6 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <FileText className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                      ABDM Clinical Report
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[9px] font-black uppercase border border-emerald-400/30">
                      Verified
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight">
                    {selectedReport.aiSummary?.reportTitle || selectedReport.problemTitle || 'Reported Problem Clinical Summary'}
                  </h2>
                  <p className="text-[11px] text-blue-100 font-mono mt-0.5">
                    ID: {(selectedReport.id || '').toUpperCase()} | Date: {
                      selectedReport.timestamp || selectedReport.createdAt
                        ? new Date(selectedReport.timestamp || selectedReport.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : 'Saved Report'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
                  title="Print Report"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Printable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800" ref={printAreaRef}>
              {(() => {
                const s = selectedReport.aiSummary || selectedReport.summary || {};
                const pt = s.patientDetails || {};

                return (
                  <>
                    {/* Patient Demographic Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center space-x-2 text-xs font-black text-[#2B4A8A] uppercase tracking-wider mb-3">
                        <User className="w-4 h-4" />
                        <span>Patient Information</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px]">Full Name</span>
                          <span className="font-extrabold text-slate-900">{pt.fullName || currentUser?.fullName || 'Patient'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px]">ABHA ID</span>
                          <span className="font-mono font-bold text-[#2B4A8A]">{pt.abhaId || currentUser?.abhaId || 'Not Available'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px]">Age / Gender</span>
                          <span className="font-bold text-slate-900">{pt.age || '30'} yrs / {pt.gender || currentUser?.gender || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px]">Blood Group</span>
                          <span className="font-extrabold text-rose-600">{pt.bloodGroup || currentUser?.bloodGroup || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Chief Complaint & Clinical Impression */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-[#2B4A8A] pl-4 py-1">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Chief Complaint</h4>
                        <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                          {s.chiefComplaint || selectedReport.rawTranscript || 'Clinical symptom complaint recorded.'}
                        </p>
                      </div>

                      {s.historyOfPresentIllness && (
                        <div className="border-l-4 border-indigo-400 pl-4 py-1">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">History of Present Illness</h4>
                          <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed">
                            {s.historyOfPresentIllness}
                          </p>
                        </div>
                      )}

                      {s.clinicalImpressionForDoctor && (
                        <div className="border-l-4 border-amber-500 pl-4 py-1 bg-amber-50/50 p-3 rounded-r-xl">
                          <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-amber-600" />
                            Clinical Impression for Doctor
                          </h4>
                          <p className="text-xs font-semibold text-amber-950 mt-1 leading-relaxed">
                            {s.clinicalImpressionForDoctor}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Genetic & Permanent Conditions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Genetic Conditions */}
                      <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl p-4">
                        <div className="flex items-center space-x-2 text-xs font-black text-indigo-900 uppercase tracking-wider mb-2">
                          <Dna className="w-4 h-4 text-indigo-600" />
                          <span>Genetic Diseases ({s.geneticDiseases?.length || 0})</span>
                        </div>
                        {Array.isArray(s.geneticDiseases) && s.geneticDiseases.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {s.geneticDiseases.map((g, idx) => (
                              <span key={idx} className="px-2 py-1 rounded-md bg-white border border-indigo-200 text-indigo-900 text-xs font-bold shadow-2xs">
                                {typeof g === 'string' ? g : g.name || 'Genetic Condition'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-indigo-600 font-medium">None declared</p>
                        )}
                      </div>

                      {/* Permanent Diseases */}
                      <div className="border border-violet-100 bg-violet-50/50 rounded-2xl p-4">
                        <div className="flex items-center space-x-2 text-xs font-black text-violet-900 uppercase tracking-wider mb-2">
                          <HeartPulse className="w-4 h-4 text-violet-600" />
                          <span>Permanent Conditions ({s.permanentDiseases?.length || 0})</span>
                        </div>
                        {Array.isArray(s.permanentDiseases) && s.permanentDiseases.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {s.permanentDiseases.map((p, idx) => (
                              <span key={idx} className="px-2 py-1 rounded-md bg-white border border-violet-200 text-violet-900 text-xs font-bold shadow-2xs">
                                {typeof p === 'string' ? p : p.name || 'Chronic Condition'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-violet-600 font-medium">None declared</p>
                        )}
                      </div>
                    </div>

                    {/* Running Medications */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                      <div className="flex items-center space-x-2 text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        <span>Currently Running Prescriptions & Regimens</span>
                      </div>
                      {Array.isArray(s.runningPrescriptions) && s.runningPrescriptions.length > 0 ? (
                        <div className="divide-y divide-slate-200">
                          {s.runningPrescriptions.map((med, idx) => (
                            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-black text-slate-900">{med.name}</span>
                                <span className="text-[11px] text-slate-500 block font-medium">
                                  {med.dosage} • {med.frequency} • {med.timing}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 font-mono">
                                {med.prescribedBy || 'Prescribed Regimen'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">No active medications registered at time of assessment.</p>
                      )}
                    </div>

                    {/* Clinical Red Alerts */}
                    {Array.isArray(s.redAlerts) && s.redAlerts.length > 0 && (
                      <div className="border border-rose-200 bg-rose-50/60 rounded-2xl p-4">
                        <div className="flex items-center space-x-2 text-xs font-black text-rose-900 uppercase tracking-wider mb-3">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Clinical Red Alerts & Contraindications ({s.redAlerts.length})</span>
                        </div>
                        <div className="space-y-2">
                          {s.redAlerts.map((alert, idx) => (
                            <div key={idx} className="bg-white border border-rose-200 rounded-xl p-3 shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black text-rose-900">
                                  {alert.title || alert.category || 'Clinical Warning'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  alert.level === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {alert.level || 'WARNING'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 font-medium">
                                {alert.description || alert.oneLine || alert.actionNeeded}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ayurveda Dashavidha Pariksha Section */}
                    {(() => {
                      const ay = s.ayurvedaDashavidhaProfile || selectedReport.ayurvedaDashavidhaProfile;
                      if (!ay) return null;
                      return (
                        <div className="border-2 border-amber-300 bg-amber-50/60 rounded-2xl p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                              🌿 Ayurveda Dashavidha Pariksha (10-Fold Clinical Evaluation)
                            </span>
                            <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                              Ayurvedic Record
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-800 block">Agni & Ahara Shakti</span>
                              <p className="text-xs font-bold text-slate-900 mt-0.5">{ay.agniAharaShakti?.agniStatus || 'Samagni'}</p>
                              <p className="text-[10px] text-slate-500">{ay.agniAharaShakti?.appetiteStatus || 'Normal'}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-800 block">Koshta & Elimination</span>
                              <p className="text-xs font-bold text-slate-900 mt-0.5">{ay.koshtaElimination?.koshtaType || 'Madhyama'}</p>
                              <p className="text-[10px] text-slate-500">{ay.koshtaElimination?.bowelRegularity || 'Regular'}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-800 block">Sattva & Nidra</span>
                              <p className="text-xs font-bold text-slate-900 mt-0.5">{ay.sattvaNidra?.sleepQuality || 'Good'}</p>
                              <p className="text-[10px] text-slate-500">{ay.sattvaNidra?.mentalResilience || 'Madhyama'}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-800 block">Prakriti / Vikriti</span>
                              <p className="text-xs font-bold text-slate-900 mt-0.5">{ay.prakritiVikriti?.doshaImbalanceTendency || 'Pitta-Vata'}</p>
                              <p className="text-[10px] text-slate-500">{ay.prakritiVikriti?.thermalReaction || 'Moderate'}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-800 block">Vyayama Shakti</span>
                              <p className="text-xs font-bold text-slate-900 mt-0.5">{ay.vyayamaShakti?.physicalStamina || 'Madhyama'}</p>
                              <p className="text-[10px] text-slate-500">{ay.vyayamaShakti?.fatigueOnset || 'Normal'}</p>
                            </div>
                          </div>

                          {ay.ayurvedicClinicalImpression && (
                            <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                              <strong className="text-amber-900 block font-bold mb-0.5">Ayurvedic Impression:</strong>
                              {ay.ayurvedicClinicalImpression}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Past Prescriptions Extracted from Reports & OCR */}
                    {(() => {
                      const ocrRx = s.pastPrescriptionsFromOcr || selectedReport.pastPrescriptionsFromOcr;
                      if (!Array.isArray(ocrRx) || ocrRx.length === 0) return null;
                      return (
                        <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                            <span className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-[#2B4A8A]" />
                              Past Prescriptions Extracted from Reports & OCR ({ocrRx.length})
                            </span>
                            <span className="text-[10px] font-extrabold text-[#2B4A8A] bg-blue-100 px-2 py-0.5 rounded-full">
                              Digitized Records
                            </span>
                          </div>

                          <div className="space-y-2">
                            {ocrRx.map((rx, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-xl border border-blue-200 text-xs shadow-2xs">
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
                                    {rx.sourceReportTitle} {rx.reportDate ? `(${rx.reportDate})` : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium">
                                  {rx.timing && <span className="mr-2">Timing: {rx.timing}</span>}
                                  {rx.instructions && <span>Instructions: {rx.instructions}</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2B4A8A] text-white font-black text-xs hover:bg-[#223B6E] shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official ABDM PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Problem Record</h3>
                <p className="text-xs text-slate-500">Permanently remove from clinical history</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">"{deleteConfirmItem.aiSummary?.reportTitle || deleteConfirmItem.problemTitle || 'this reported problem'}"</strong>? This will permanently remove the record from your account and the Firestore database.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deletingId === deleteConfirmItem.id}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProblem(deleteConfirmItem.id)}
                disabled={deletingId === deleteConfirmItem.id}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingId === deleteConfirmItem.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          NEW REPORTED PROBLEM ASSESSMENT MODAL
          ================================================== */}
      <ReportedProblemSummaryModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        currentUser={currentUser}
        activePrescriptions={activePrescriptions}
        initialProblem={assessmentInitialText}
        onSaveSuccess={() => {
          fetchProblemLogs();
        }}
      />
    </div>
  );
}
