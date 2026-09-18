import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileText,
  Globe,
  ShieldCheck,
  Stethoscope,
  FolderHeart,
  Pill,
  ScanLine,
  Share2,
  QrCode,
  UserRound,
  Activity,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  Send,
  Languages,
  Shield,
  Dna,
  HeartPulse,
  Printer,
  Download,
  Save,
  PlusCircle,
  ExternalLink,
  X,
  Trash2,
  AlertTriangle,
  Ban
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getStructuredQuestionsForText } from '../../data/questionRules';
import { indianLanguages } from '../../utils/translations';
import ReportedProblemSummaryModal from '../../components/ReportedProblemSummaryModal';
import DoctorQrScannerModal from '../../components/DoctorQrScannerModal';
import PatientShareQrModal from '../../components/PatientShareQrModal';
import { analyzeOverallClinicalRedAlerts } from '../../utils/clinicalRedAlerts';

export default function Dashboard() {
  const {
    currentUser,
    uiLanguage,
    setUiLanguage,
    voiceLanguage,
    setVoiceLanguage,
    t,
    selectedLanguage,
    setSelectedLanguage,
    sarvamApiKey,
    activeReportedProblem,
    updateActiveReportedProblem,
    removeActiveReportedProblem
  } = useAuth();

  // --------------------------------------------------
  // PROBLEM REPORTING STATE
  // --------------------------------------------------

  const [inputMode, setInputMode] = useState('voice');
  const [problemText, setProblemText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [sttLoading, setSttLoading] = useState(false);

  // --------------------------------------------------
  // STRUCTURED Q&A STATE
  // --------------------------------------------------

  const [activeCategory, setActiveCategory] = useState(null);
  const [qaAnswers, setQaAnswers] = useState({});
  const [qaStep, setQaStep] = useState(0);
  const [isQaCompleted, setIsQaCompleted] = useState(false);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);

  // --------------------------------------------------
  // AI SUMMARY STATE
  // --------------------------------------------------

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState(null);

  // --------------------------------------------------
  // REPORTED PROBLEM MODAL & HISTORY STATE
  // --------------------------------------------------

  const [isReportedProblemModalOpen, setIsReportedProblemModalOpen] = useState(false);
  const [reportedProblemInitialText, setReportedProblemInitialText] = useState('');
  const [problemLogsHistory, setProblemLogsHistory] = useState([]);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineSavedSuccess, setInlineSavedSuccess] = useState(false);
  const [inlineSaveError, setInlineSaveError] = useState('');

  // --------------------------------------------------
  // DOCTOR SCANNER MODAL STATE & PATIENT QR MODAL
  // --------------------------------------------------

  const [showDoctorQrScannerModal, setShowDoctorQrScannerModal] = useState(false);
  const [showPatientQrModal, setShowPatientQrModal] = useState(false);

  const getProblemDaysActive = (timestamp) => {
    if (!timestamp) return 1;
    const diffHours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return 1;
    if (diffHours < 48) return 2;
    return 3;
  };

  const getProblemHoursRemaining = (timestamp) => {
    if (!timestamp) return 72;
    const diffHours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.round(72 - diffHours));
  };

  const handleOpenReportNewSymptom = (defaultText = '') => {
    setReportedProblemInitialText(defaultText || '');
    setIsReportedProblemModalOpen(true);
  };

  const handleScrollToHealthCheckin = () => {
    setInputMode('text');
    resetForm();
    setTimeout(() => {
      const section = document.getElementById('health-checkin-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
      const textarea = document.getElementById('problem-input-field');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  // --------------------------------------------------
  // DASHBOARD STATE
  // --------------------------------------------------

  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);

  const assessmentRef = useRef(null);
  const summaryRef = useRef(null);

  // --------------------------------------------------
  // QUICK SYMPTOMS
  // --------------------------------------------------

  const quickSymptoms = [
    { key: 'fever', label: 'Fever' },
    { key: 'headache', label: 'Headache' },
    { key: 'cough', label: 'Cough' },
    { key: 'cold', label: 'Cold' },
    { key: 'bodyPain', label: 'Body Pain' },
    { key: 'stomachPain', label: 'Stomach Pain' },
    { key: 'breathingDifficulty', label: 'Breathing Difficulty' },
    { key: 'weakness', label: 'Weakness' }
  ];

  // --------------------------------------------------
  // LOAD ACTIVE PRESCRIPTIONS
  // --------------------------------------------------

  useEffect(() => {
    const loadPrescriptions = async () => {
      if (!currentUser?.id) {
        setActivePrescriptions([]);
        return;
      }

      setPrescriptionsLoading(true);

      try {
        const response = await fetch(
          `/api/prescriptions/${currentUser.id}`
        );

        if (!response.ok) {
          throw new Error('Failed to load prescriptions');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.prescriptions)) {
          setActivePrescriptions(
            data.prescriptions.filter(
              (prescription) =>
                prescription.status === 'ACTIVE'
            )
          );
        } else {
          setActivePrescriptions([]);
        }
      } catch (error) {
        console.error(
          'Failed to load patient prescriptions:',
          error
        );

        setActivePrescriptions([]);
      } finally {
        setPrescriptionsLoading(false);
      }
    };

    loadPrescriptions();

    const handleLiveRefresh = () => {
      loadPrescriptions();
      loadProblemLogsHistory();
    };
    window.addEventListener('patient-data-refresh', handleLiveRefresh);
    return () => window.removeEventListener('patient-data-refresh', handleLiveRefresh);
  }, [currentUser?.id]);

  // --------------------------------------------------
  // LOAD REPORTED PROBLEM LOGS & PDF HISTORY
  // --------------------------------------------------

  const loadProblemLogsHistory = async () => {
    try {
      const patientId = currentUser?.id;
      const storageKey = patientId ? `medikiosk_problem_summaries_${patientId}` : 'medikiosk_problem_summaries';
      if (!patientId) {
        const localSaved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setProblemLogsHistory(localSaved);
        return;
      }
      const res = await fetch(`/api/patient/problem-logs/${patientId}`);
      let serverLogs = [];
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          serverLogs = data.logs;
        } else if (Array.isArray(data)) {
          serverLogs = data;
        }
      }
      const localSaved = JSON.parse(localStorage.getItem(storageKey) || '[]');

      const combined = [...localSaved];
      serverLogs.forEach((sLog) => {
        if (!combined.some((item) => item.id === sLog.id)) {
          combined.push(sLog);
        }
      });

      combined.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setProblemLogsHistory(combined);
    } catch (err) {
      console.warn('Failed to load server problem logs, loading local:', err);
      const storageKey = currentUser?.id ? `medikiosk_problem_summaries_${currentUser.id}` : 'medikiosk_problem_summaries';
      const localSaved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setProblemLogsHistory(localSaved);
    }
  };

  useEffect(() => {
    loadProblemLogsHistory();
  }, [currentUser?.id]);

  // Handle URL param ?openReportedProblem=true and custom events from sidebar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openReportedProblem') === 'true') {
      setIsReportedProblemModalOpen(true);
    }

    const handleOpenModal = () => {
      setIsReportedProblemModalOpen(true);
    };

    window.addEventListener('open-reported-problem-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-reported-problem-modal', handleOpenModal);
    };
  }, []);

  // --------------------------------------------------
  // BROWSER SPEECH RECOGNITION
  // --------------------------------------------------

  useEffect(() => {
    if (
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window
    ) {
      const SpeechClass =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      const recognition = new SpeechClass();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLanguage || selectedLanguage || 'hi-IN';

      recognition.onresult = (event) => {
        let currentTranscript = '';

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          currentTranscript +=
            event.results[i][0].transcript;
        }

        if (currentTranscript) {
          setProblemText(currentTranscript);
        }
      };

      recognition.onerror = (e) => {
        console.warn(
          'Browser STT notice:',
          e
        );

        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognitionInstance(recognition);
    }
  }, [voiceLanguage, selectedLanguage]);

  // --------------------------------------------------
  // ASSESSMENT SCROLL
  // --------------------------------------------------

  useEffect(() => {
    if (!activeCategory) {
      return undefined;
    }

    setIsAssessmentLoading(true);

    const timer = window.setTimeout(() => {
      setIsAssessmentLoading(false);

      requestAnimationFrame(() => {
        assessmentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [activeCategory]);

  // --------------------------------------------------
  // SUMMARY SCROLL
  // --------------------------------------------------

  useEffect(() => {
    if (!aiSummaryResult) {
      return;
    }

    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }, [aiSummaryResult]);

  // --------------------------------------------------
  // TOGGLE RECORDING
  // --------------------------------------------------

  const toggleRecording = async () => {
    if (isRecording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }

      setIsRecording(false);
      return;
    }

    setProblemText('');
    setIsRecording(true);

    if (recognitionInstance) {
      try {
        recognitionInstance.lang = voiceLanguage || selectedLanguage || 'hi-IN';
        recognitionInstance.start();
      } catch (err) {
        console.warn(
          'Speech recognition re-start notice:',
          err
        );
      }
    }

    if (sarvamApiKey) {
      setSttLoading(true);

      setTimeout(async () => {
        try {
          const res = await fetch(
            '/api/sarvam/stt',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-sarvam-key': sarvamApiKey
              },
              body: JSON.stringify({
                languageCode: voiceLanguage || selectedLanguage || 'hi-IN'
              })
            }
          );

          const data = await res.json();

          if (
            data.success &&
            data.transcript
          ) {
            setProblemText(data.transcript);
          }
        } catch (e) {
          console.error(
            'Sarvam STT call failed:',
            e
          );
        } finally {
          setSttLoading(false);
        }
      }, 3000);
    }
  };

  // --------------------------------------------------
  // SUBMIT PROBLEM
  // --------------------------------------------------

  const handleProblemSubmit = () => {
    if (!problemText.trim()) {
      return;
    }

    const matchedCategory =
      getStructuredQuestionsForText(problemText);

    setActiveCategory(matchedCategory);
    setQaAnswers({});
    setQaStep(0);
    setIsQaCompleted(false);
    setIsAssessmentLoading(false);
    setAiSummaryResult(null);
  };

  // --------------------------------------------------
  // SELECT QUICK SYMPTOM
  // --------------------------------------------------

  const handleQuickSymptom = (symptom) => {
    setProblemText((previous) => {
      if (!previous.trim()) {
        return symptom;
      }

      return `${previous}, ${symptom}`;
    });
  };

  // --------------------------------------------------
  // ANSWER QUESTION
  // --------------------------------------------------

  const handleAnswerSelect = (
    questionId,
    value
  ) => {
    setQaAnswers((previous) => ({
      ...previous,
      [questionId]: value
    }));
  };

  // --------------------------------------------------
  // NEXT QUESTION
  // --------------------------------------------------

  const handleNextQa = () => {
    if (
      qaStep <
      activeCategory.questions.length - 1
    ) {
      setQaStep((previous) => previous + 1);
    } else {
      setIsQaCompleted(true);
      generateAiSummary();
    }
  };

  // --------------------------------------------------
  // GENERATE AI SUMMARY
  // --------------------------------------------------

  const generateAiSummary = async () => {
    setIsGeneratingSummary(true);

    try {
      const structuredQAList =
        activeCategory.questions.map((q) => ({
          id: q.id,
          section: q.section || '',
          question: q.text,
          answer: Array.isArray(
            qaAnswers[q.id]
          )
            ? qaAnswers[q.id].join(', ')
            : qaAnswers[q.id] ||
            'Not answered'
        }));

      const res = await fetch(
        '/api/patient/problem-summary',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patientId:
              currentUser?.id ||
              '',
            problemText,
            languageCode:
              voiceLanguage || selectedLanguage || 'hi-IN',
            inputMode,
            structuredQA:
              structuredQAList
          })
        }
      );

      const data = await res.json();

      if (data.success) {
        setAiSummaryResult(data.aiSummary);

        // Immediate permanent persistence to user-scoped localStorage
        try {
          const storageKey = currentUser?.id ? `medikiosk_problem_summaries_${currentUser.id}` : 'medikiosk_problem_summaries';
          const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const newLog = data.problemLog || {
            id: data.aiSummary.reportId || ('prob-' + Date.now()),
            patientId: currentUser?.id || '',
            timestamp: data.aiSummary.timestampIso || new Date().toISOString(),
            problemTitle: problemText || data.aiSummary.reportTitle || 'Reported Clinical Symptom Assessment',
            chiefComplaint: data.aiSummary.chiefComplaint || problemText,
            summary: data.aiSummary
          };
          const updatedLogs = [newLog, ...existingLogs.filter((l) => l.id !== newLog.id)];
          localStorage.setItem(storageKey, JSON.stringify(updatedLogs));
        } catch (e) {
          console.warn('Could not store to local storage:', e);
        }

        if (updateActiveReportedProblem) {
          updateActiveReportedProblem({
            id: data.aiSummary.reportId || ('prob-' + Date.now()),
            title: problemText || data.aiSummary.reportTitle || 'Reported Clinical Symptom Assessment',
            chiefComplaint: data.aiSummary.chiefComplaint || problemText,
            timestamp: new Date().toISOString(),
            ayurvedaDashavidha: data.aiSummary.ayurvedaDashavidhaProfile || null,
            pastPrescriptions: data.aiSummary.pastPrescriptionsFromOcr || []
          });
        }

        loadProblemLogsHistory();
        window.dispatchEvent(new CustomEvent('patient-data-refresh'));
      }
    } catch (err) {
      console.error(
        'Failed to generate AI summary:',
        err
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // --------------------------------------------------
  // RESET REPORTING FLOW
  // --------------------------------------------------

  const resetForm = () => {
    setProblemText('');
    setActiveCategory(null);
    setQaAnswers({});
    setQaStep(0);
    setIsQaCompleted(false);
    setAiSummaryResult(null);
  };

  // --------------------------------------------------
  // PATIENT DISPLAY DATA
  // --------------------------------------------------

  const patientName =
    currentUser?.fullName ||
    currentUser?.name ||
    'Patient';

  const patientInitial =
    patientName
      .trim()
      .charAt(0)
      .toUpperCase() || 'P';

  const abhaId =
    currentUser?.abhaId || 'Not connected';

  const chronicConditions = Array.isArray(currentUser?.chronicConditions)
    ? currentUser.chronicConditions
    : [];

  const geneticConditions = Array.isArray(currentUser?.geneticConditions)
    ? currentUser.geneticConditions
    : [];

  const allergies = Array.isArray(currentUser?.allergies)
    ? currentUser.allergies
    : [];

  const healthProfileCount =
    chronicConditions.length +
    geneticConditions.length +
    allergies.length;

  const firstActiveMedicine =
    activePrescriptions?.[0]
      ?.medicines?.[0];

  const activeRedAlerts = React.useMemo(() => {
    if (!activeReportedProblem) return [];
    if (Array.isArray(activeReportedProblem.clinicalRedAlerts) && activeReportedProblem.clinicalRedAlerts.length > 0) {
      return activeReportedProblem.clinicalRedAlerts;
    }
    if (Array.isArray(activeReportedProblem.summary?.redAlerts) && activeReportedProblem.summary.redAlerts.length > 0) {
      return activeReportedProblem.summary.redAlerts;
    }
    return analyzeOverallClinicalRedAlerts({
      problemText: activeReportedProblem.title || activeReportedProblem.chiefComplaint || '',
      geneticDiseases: geneticConditions,
      permanentDiseases: chronicConditions,
      allergies: allergies,
      runningPrescriptions: (activePrescriptions || []).flatMap(rx => rx.medicines || []),
      patientDetails: {
        fullName: patientName,
        abhaId,
        gender: currentUser?.gender || '',
        age: currentUser?.age || (currentUser?.dob ? 2026 - parseInt(currentUser.dob.substring(0, 4)) : '')
      }
    });
  }, [activeReportedProblem, geneticConditions, chronicConditions, allergies, activePrescriptions, patientName, abhaId, currentUser]);

  const handleSaveInlineSummary = async () => {
    if (!aiSummaryResult) return;
    setInlineSaving(true);
    setInlineSaveError('');
    try {
      const patientId = currentUser?.id || '';

      const runningPrescriptions = (activePrescriptions || []).flatMap(rx =>
        (rx.medicines || []).map(m => ({
          name: m.name || m.medicineName || '',
          dosage: m.dosage || m.dose || '',
          frequency: m.frequency || '',
          timing: m.timing || '',
          duration: m.duration || '',
          instructions: m.instructions || '',
          prescribedBy: rx.doctorName ? `Dr. ${rx.doctorName} ${rx.hospitalName ? `(${rx.hospitalName})` : ''}`.trim() : (rx.doctor || '')
        }))
      );

      const relatedPrescriptions = (activePrescriptions || []).flatMap(rx =>
        (rx.medicines || []).map(m => ({
          name: m.name || m.medicineName || '',
          category: rx.diagnosis || '',
          oneLineInfo: [m.name, m.dosage, m.frequency, m.timing].filter(Boolean).join(' - '),
          doctor: rx.doctorName ? `Dr. ${rx.doctorName} ${rx.hospitalName ? `(${rx.hospitalName})` : ''}`.trim() : (rx.doctor || ''),
          isRunning: true
        }))
      );

      const payload = {
        patientId,
        problemText: problemText || aiSummaryResult.chiefComplaint,
        aiSummary: {
          reportId: 'ABDM-PS-' + Date.now().toString().slice(-6),
          reportTitle: `Reported Problem: ${(problemText || aiSummaryResult.chiefComplaint || 'Clinical Assessment').substring(0, 45)}`,
          chiefComplaint: aiSummaryResult.chiefComplaint,
          historyOfPresentIllness: aiSummaryResult.historyOfPresentIllness,
          clinicalImpressionForDoctor: aiSummaryResult.clinicalImpressionForDoctor,
          patientDetails: {
            fullName: currentUser?.fullName || currentUser?.name || patientName,
            abhaId: currentUser?.abhaId || abhaId || '',
            gender: currentUser?.gender || 'Not specified',
            age: currentUser?.age || (currentUser?.dob ? 2026 - parseInt(currentUser.dob.substring(0, 4)) : ''),
            bloodGroup: currentUser?.bloodGroup || 'Not specified'
          },
          geneticDiseases: geneticConditions,
          permanentDiseases: chronicConditions,
          allergies: allergies,
          relatedPrescriptions,
          runningPrescriptions,
          timestampIso: new Date().toISOString()
        }
      };

      const res = await fetch('/api/patient/save-problem-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || data?.message || 'Failed to save problem summary to server.');
      }

      const newLog = data.problemLog || {
        id: payload.aiSummary.reportId,
        patientId: payload.patientId,
        timestamp: payload.aiSummary.timestampIso,
        problemTitle: payload.problemText,
        chiefComplaint: payload.aiSummary.chiefComplaint,
        summary: payload.aiSummary
      };

      const storageKey = payload.patientId ? `medikiosk_problem_summaries_${payload.patientId}` : 'medikiosk_problem_summaries';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedLogs = [newLog, ...existingLogs.filter((l) => l.id !== newLog.id)];
      localStorage.setItem(storageKey, JSON.stringify(updatedLogs));

      if (updateActiveReportedProblem) {
        updateActiveReportedProblem({
          id: newLog.id,
          title: newLog.problemTitle || payload.problemText,
          chiefComplaint: newLog.chiefComplaint,
          timestamp: newLog.timestamp || new Date().toISOString()
        });
      }

      loadProblemLogsHistory();
      window.dispatchEvent(new CustomEvent('patient-data-refresh'));

      // Automatically close the problem report/summary panel upon successful save
      setAiSummaryResult(null);
      resetAssessment();
      setProblemText('');
      setInlineSavedSuccess(false);

      setTimeout(() => {
        const activeCard = document.getElementById('present-active-problem-card');
        const historyEl = document.getElementById('reported-problem-history-section');
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: 'smooth' });
        } else if (historyEl) {
          historyEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    } catch (e) {
      console.error('Failed to save inline summary:', e);
      setInlineSaveError(e.message || 'Failed to save summary to server. Please check your connection and try again.');
    } finally {
      setInlineSaving(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {/* ==================================================
            MAIN DASHBOARD
            ================================================== */}

      <main className="min-w-0 flex-1 overflow-x-hidden">

        <div className="w-full px-4 pt-0 pb-6 sm:px-6 lg:px-8 lg:pb-8">

          {/* ==================================================
                WELCOME AREA
                ================================================== */}
          <section className="mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {t('hi', 'Hi')} {patientName.split(' ')[0]}
              </h2>
            </div>
          </section>

          {/* ==================================================
                MAIN DASHBOARD GRID
                LEFT: Reported Problem + Are You Okay
                RIGHT: Active Medication + Quick Actions
                ================================================== */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">

            {/* ==================================================
                  LEFT COLUMN
                  ================================================== */}
            <div className="min-w-0 space-y-6">

              {/* ==================================================
                HIGHLIGHTED PRESENT ACTIVE OR LAST REPORTED PROBLEM (ABOVE)
                ================================================== */}
              {activeReportedProblem ? (
                <section
                  id="present-active-problem-card"
                  className="rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50/50 p-6 sm:p-7 shadow-lg shadow-amber-900/10 relative overflow-hidden transition-all animate-fadeIn"
                >
                  {/* Background ambient glow */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-orange-400/15 blur-3xl" />

                  <div className="relative z-10">
                    {/* Header Status Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-amber-200/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                          {t('activeReportedProblem', 'PRESENT ACTIVE REPORTED PROBLEM')}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-[10px] font-extrabold border border-amber-300">
                          Active • Day {getProblemDaysActive(activeReportedProblem.timestamp)} of 3
                        </span>
                        <span className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5 text-amber-600" />
                          Auto-expires in {getProblemHoursRemaining(activeReportedProblem.timestamp)}h
                        </span>
                      </div>

                      {/* Manual Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeActiveReportedProblem()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-300 hover:border-rose-300 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Remove active problem immediately"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('removeManually', 'Remove Manually')}</span>
                      </button>
                    </div>

                    {/* Problem Title & Chief Complaint */}
                    <div className="mt-4">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
                        {activeReportedProblem.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1.5 leading-relaxed">
                        {activeReportedProblem.chiefComplaint ||
                          'Patient reports active symptoms requiring clinical attention, vitals review, and treatment tracking.'}
                      </p>
                    </div>

                    {/* AI Clinical Red Alerts Banner (Overall Analysis) */}
                    <div className="mt-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-600/15 border-2 border-red-500/40 p-3.5 sm:p-4 backdrop-blur-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-red-300/40">
                        <div className="flex items-center space-x-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-red-950 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            {t('clinicalRedAlertsDetected', 'Clinical Red Alerts Detected (Cross-Profile Analysis)')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setReportedProblemInitialText(activeReportedProblem.title);
                            setIsReportedProblemModalOpen(true);
                          }}
                          className="text-[11px] font-black text-red-700 hover:text-red-900 underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                          <span>{t('reviewSafetyBreakdown', 'Review Full Safety Breakdown')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* High visibility alert badges */}
                      {activeRedAlerts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {activeRedAlerts.slice(0, 3).map((alert, idx) => (
                            <div key={idx} className="bg-white/95 rounded-xl p-2.5 border border-red-200 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded">{alert.category || alert.title || t('allergyAlert', 'Allergy Alert')}</span>
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              </div>
                              <p className="text-[11px] font-extrabold text-slate-900 mt-1">{alert.title || alert.drug || alert.finding || 'Clinical Alert'}</p>
                              <p className="text-[10px] text-red-700 font-semibold mt-0.5">{alert.warning || alert.actionableProtocol || alert.severity || t('strictlyContraindicated', 'Strictly Contraindicated')}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white/95 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>No contraindications, allergy risks, or critical red alerts detected for this record.</span>
                        </div>
                      )}
                    </div>

                    {/* Linked Running Prescriptions (Separately Highlighted) */}
                    <div className="mt-5 rounded-2xl bg-white/90 border border-amber-200/90 p-4 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-emerald-600" />
                          {t('activeRunningPrescriptions', 'Active Running Prescriptions for Condition')}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {activePrescriptions.length} {t('currentlyPrescribed', 'Prescription(s)')}
                        </span>
                      </div>

                      {activePrescriptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {activePrescriptions.flatMap((rx) => (rx.medicines || []).map((m) => ({ ...m, rxDoctor: rx.doctorName }))).slice(0, 6).map((med, idx) => (
                            <div key={idx} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900">{med.name}</span>
                                <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Active</span>
                              </div>
                              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                {med.dosage || ''} {med.frequency ? `• ${med.frequency}` : ''} {med.timing ? `• ${med.timing}` : ''}
                              </p>
                              <p className="text-[10px] text-emerald-800 font-bold mt-1">
                                {med.instructions || med.duration || (med.rxDoctor ? `Dr. ${med.rxDoctor}` : 'Active Medication')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
                          No active running prescriptions recorded for this patient.
                        </div>
                      )}
                    </div>

                    {/* Ayurveda Dashavidha Pariksha Quick Tags */}
                    {activeReportedProblem.ayurvedaDashavidha && (
                      <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                            🌿 Ayurveda Dashavidha Pariksha
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {activeReportedProblem.ayurvedaDashavidha.agniAharaShakti?.agniStatus && (
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-950 font-extrabold shadow-2xs">
                              Agni: {activeReportedProblem.ayurvedaDashavidha.agniAharaShakti.agniStatus}
                            </span>
                          )}
                          {activeReportedProblem.ayurvedaDashavidha.koshtaElimination?.koshtaType && (
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-950 font-extrabold shadow-2xs">
                              Koshta: {activeReportedProblem.ayurvedaDashavidha.koshtaElimination.koshtaType}
                            </span>
                          )}
                          {activeReportedProblem.ayurvedaDashavidha.prakritiVikriti?.doshaImbalanceTendency && (
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-950 font-extrabold shadow-2xs">
                              Dosha: {activeReportedProblem.ayurvedaDashavidha.prakritiVikriti.doshaImbalanceTendency}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setReportedProblemInitialText(activeReportedProblem.title);
                          setIsReportedProblemModalOpen(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2B4A8A] to-[#223B6E] hover:from-[#223B6E] hover:to-[#1A2D54] text-white text-xs font-black shadow-md shadow-[#2B4A8A]/20 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-blue-200" />
                        <span>{t('viewSummaryFile', 'View / Print Summarized Information File')}</span>
                      </button>
                    </div>
                  </div>
                </section>
              ) : problemLogsHistory.length > 0 ? (
                <section
                  id="last-reported-problem-card"
                  className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 p-6 sm:p-7 shadow-sm relative overflow-hidden transition-all"
                >
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                          {t('lastReportedProblem', 'LAST REPORTED CLINICAL PROBLEM')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {t('recordedOn', 'Recorded on')}{' '}
                          {new Date(problemLogsHistory[0].timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {problemLogsHistory[0].problemTitle || problemLogsHistory[0].rawTranscript || 'Past Clinical Assessment'}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-2">
                        {problemLogsHistory[0].chiefComplaint ||
                          problemLogsHistory[0].summary?.chiefComplaint ||
                          'Previous clinical assessment archived in health records history.'}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setReportedProblemInitialText(
                            problemLogsHistory[0].problemTitle || problemLogsHistory[0].rawTranscript || ''
                          );
                          setIsReportedProblemModalOpen(true);
                        }}
                        className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2B4A8A] border border-blue-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t('viewArchivedSummary', 'View Archived Summary File')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDoctorQrScannerModal(true)}
                        className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        <ScanLine className="w-3.5 h-3.5 text-[#2B4A8A]" />
                        <span>{t('scanDoctorQr', 'Scan Doctor QR & Share')}</span>
                      </button>

                    </div>
                  </div>
                </section>
              ) : (
                <section
                  id="no-reported-problem-card"
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2B4A8A] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {t('noActiveEpisode', 'No Active Clinical Problem Reported')}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {t('clickToStartAssessment', 'You can report symptoms using voice or text below to generate an ABDM clinical summary file.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDoctorQrScannerModal(true)}
                      className="shrink-0 flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 text-[#2B4A8A] border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Scan doctor's QR code in clinic to transmit your health records"
                    >
                      <ScanLine className="w-4 h-4 text-[#2B4A8A]" />
                      <span>{t('scanDoctorQr', 'Scan Doctor QR')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenReportNewSymptom('')}
                      className="shrink-0 flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2B4A8A] text-white text-xs font-black hover:bg-[#223B6E] transition-colors shadow-sm cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-white" />
                      <span>{t('reportNewSymptom', 'Report New Symptom')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScrollToHealthCheckin}
                      className="shrink-0 flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#2B4A8A]" />
                      <span>{t('typeSpeakBelow', 'Type / Speak Below')}</span>
                    </button>
                  </div>
                </section>
              )}

              {/* ==================================================
                  WHAT ARE YOU EXPERIENCING
                  ================================================== */}

              <div
                id="health-checkin-section"
                className="overflow-hidden rounded-3xl bg-[#2B4A8A] shadow-xl shadow-[#2B4A8A]/15 scroll-mt-6"
              >

                <div className="relative p-6 sm:p-8">

                  <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

                  <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-300/10 blur-3xl" />

                  <div className="relative z-10">

                    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                          {t('areYouOkay', 'ARE YOU OKAY?')}
                        </h3>
                      </div>

                      {/* INTERACTIVE VOICE LANGUAGE SELECTOR DIRECTLY IN CARD */}
                      <div className="shrink-0 rounded-2xl border border-white/20 bg-white/15 px-3.5 py-2 backdrop-blur-sm shadow-inner hover:bg-white/20 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center">
                            <Mic className="h-4 w-4 text-emerald-300 shrink-0" />
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                            </span>
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[8px] font-black uppercase tracking-wider text-blue-200 leading-none">
                              {t('voiceLanguageLabel', 'Voice Language')}
                            </span>
                            <select
                              value={voiceLanguage}
                              onChange={(e) => setVoiceLanguage(e.target.value)}
                              className="bg-transparent text-xs font-black text-white outline-none cursor-pointer pr-1 mt-0.5"
                              title="Select speech recognition language"
                            >
                              {indianLanguages.map((language) => (
                                <option
                                  key={language.code}
                                  value={language.code}
                                  className="text-slate-900 bg-white font-semibold"
                                >
                                  {language.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* INPUT MODE SWITCH */}

                    <div className="mb-5 flex w-fit items-center rounded-xl border border-white/15 bg-black/10 p-1">

                      <button
                        type="button"
                        onClick={() =>
                          setInputMode('voice')
                        }
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition-all ${inputMode === 'voice'
                          ? 'bg-white text-[#2B4A8A] shadow-sm'
                          : 'text-blue-100 hover:bg-white/10'
                          }`}
                      >
                        <Mic className="h-3.5 w-3.5" />
                        {t('voiceMode', 'Voice')}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setInputMode('text')
                        }
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition-all ${inputMode === 'text'
                          ? 'bg-white text-[#2B4A8A] shadow-sm'
                          : 'text-blue-100 hover:bg-white/10'
                          }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {t('textMode', 'Type')}
                      </button>

                    </div>

                    {/* VOICE MODE */}

                    {inputMode === 'voice' ? (
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-6">

                        <div className="flex flex-col items-center justify-center text-center">

                          <div className="relative mb-5">

                            {isRecording && (
                              <>
                                <div className="absolute -inset-5 rounded-full bg-red-400/20 animate-ping" />
                                <div className="absolute -inset-3 rounded-full border border-red-300/30" />
                              </>
                            )}

                            <button
                              type="button"
                              onClick={toggleRecording}
                              className={`relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-white/20 text-white shadow-2xl transition-all active:scale-95 sm:h-28 sm:w-28 ${isRecording
                                ? 'bg-red-500 shadow-red-900/40'
                                : 'bg-[#80bfff] shadow-[#80bfff]/30 hover:bg-white hover:text-slate-950'
                                }`}
                            >
                              {isRecording ? (
                                <>
                                  <MicOff className="h-9 w-9" />
                                  <span className="mt-1 text-[9px] font-black uppercase tracking-wider">
                                    Stop
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Mic className="h-9 w-9" />
                                  <span className="mt-1 text-[9px] font-black uppercase tracking-wider">
                                    {t('speak', 'Speak')}
                                  </span>
                                </>
                              )}
                            </button>

                          </div>

                          <p className="text-sm font-bold text-white">
                            {isRecording
                              ? t('listening', 'Listening...')
                              : `${t('tapToSpeak', 'Tap the microphone and describe your health problem in')} ${indianLanguages.find((l) => l.code === voiceLanguage)?.name || 'Hindi'}`}
                          </p>
                        </div>
                        {/* TRANSCRIPT */}

                        <div className="mt-5">

                          {sttLoading && (
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-blue-100">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Processing speech...
                            </div>
                          )}

                          <textarea
                            id="problem-input-field-voice"
                            rows={3}
                            value={problemText}
                            onChange={(e) =>
                              setProblemText(
                                e.target.value
                              )
                            }
                            placeholder={`${t('tapToSpeak', 'Your spoken words will appear here in')} ${indianLanguages.find((l) => l.code === voiceLanguage)?.name || 'Hindi'}...`}
                            className="w-full resize-none rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#80bfff]"
                          />

                        </div>

                      </div>
                    ) : (
                      /* TEXT MODE */

                      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-6">

                        <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-100">
                          {t('describeFeeling', 'Describe your symptoms')}
                        </label>

                        <textarea
                          id="problem-input-field"
                          rows={5}
                          value={problemText}
                          onChange={(e) =>
                            setProblemText(
                              e.target.value
                            )
                          }
                          placeholder={t('describeFeeling', 'Describe how you are feeling (e.g., severe headache, persistent dry cough, high fever)...')}
                          className="w-full resize-none rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#80bfff]"
                        />

                      </div>
                    )}

                    {/* QUICK SYMPTOMS */}

                    <div className="mt-5">

                      <div className="mb-2.5 flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-200">
                          {t('quickSelectSymptoms', 'Quick symptoms')}
                        </span>

                        <span className="h-px flex-1 bg-white/10" />
                      </div>

                      <div className="flex flex-wrap gap-2">

                        {quickSymptoms.map((item) => {
                          const localizedLabel = t(item.key, item.label);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() =>
                                handleQuickSymptom(
                                  localizedLabel
                                )
                              }
                              className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white transition-all hover:border-white/30 hover:bg-white hover:text-[#2B4A8A]"
                            >
                              {localizedLabel}
                            </button>
                          );
                        })}

                      </div>

                    </div>

                    {/* SUBMIT */}

                    {problemText.trim() && (
                      <div className="mt-6 flex justify-end">

                        <button
                          type="button"
                          onClick={
                            handleProblemSubmit
                          }
                          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-[#2B4A8A] shadow-lg transition-all hover:bg-blue-50 active:scale-95"
                        >
                          <Send className="h-4 w-4" />
                          <span>
                            {t('startHealthAssessment', 'Start Health Assessment')}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </button>

                      </div>
                    )}

                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            {/* ==================================================
                  RIGHT COLUMN
                  ================================================== */}

            <div className="min-w-0 space-y-6">

              {/* ACTIVE MEDICATION */}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5 flex items-start justify-between">

                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">
                      {t('activeMedication', 'Active Medication')}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {t('currentTreatment', 'Current treatment')}
                    </h3>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2B4A8A]">
                    <Pill className="h-5 w-5" />
                  </div>

                </div>

                {prescriptionsLoading ? (
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                    <div className="mt-5 h-8 w-full animate-pulse rounded bg-slate-200" />
                  </div>
                ) : firstActiveMedicine ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B4A8A] text-white">
                        <Pill className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-950">
                          {firstActiveMedicine.name ||
                            'Current medication'}
                        </h4>

                        <p className="mt-1 text-[11px] font-semibold text-slate-500">
                          {firstActiveMedicine.dosage ||
                            'Dosage recorded'}
                        </p>
                      </div>

                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          {t('frequency', 'Frequency')}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-800">
                          {firstActiveMedicine.frequency ||
                            'As prescribed'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          {t('duration', 'Duration')}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-800">
                          {firstActiveMedicine.duration ||
                            'As prescribed'}
                        </p>
                      </div>

                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#2B4A8A]">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>
                        {t('followInstructions', 'Follow the instructions on your prescription')}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">

                    <Pill className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      No active medication
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                  (window.location.href =
                    '/reports')
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-extrabold text-slate-600 transition-all hover:border-[#2B4A8A] hover:text-[#2B4A8A]"
                >
                  {t('viewHealthRecords', 'View Health Records')}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

              </div>

              {/* ==================================================
                    QUICK ACTIONS
                    ================================================== */}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">
                    Quick Actions
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {t('manageYourCare', 'Manage your care')}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  {/* DOCTOR'S SCANNER (FEATURED IN MANAGE YOUR CARE) */}
                  <button
                    type="button"
                    onClick={() => setShowDoctorQrScannerModal(true)}
                    className="col-span-2 group relative overflow-hidden rounded-2xl border-2 border-[#2B4A8A] bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] p-4 text-left text-white shadow-lg shadow-[#2B4A8A]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-98 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 border border-white/30 text-white backdrop-blur-xs shadow-inner group-hover:scale-105 transition-transform shrink-0">
                          <ScanLine className="h-6 w-6 text-emerald-300 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-400/40">
                              Active QR Scanner
                            </span>
                          </div>
                          <p className="text-sm font-black text-white tracking-tight">
                            {t('doctorsScanner', "Doctor's Scanner")}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-black px-3.5 py-2 rounded-xl bg-white text-[#2B4A8A] group-hover:bg-blue-50 transition-colors shadow-xs">
                        Open Scanner →
                      </span>
                    </div>
                  </button>
                </div>

              </div>


            </div>

          </section>

          {/* ==================================================
                STRUCTURED ASSESSMENT
                ================================================== */}

          {activeCategory && (
            <section
              ref={assessmentRef}
              aria-live="polite"
              className="mt-6 scroll-mt-6 rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-8"
            >

              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <div className="flex flex-wrap items-center gap-2">

                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#2B4A8A]">
                      Structured Assessment
                    </span>

                    <span className="text-xs font-semibold text-slate-400">
                      Category: {activeCategory.title}
                    </span>

                  </div>

                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    Follow-up Symptom Questions
                  </h3>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  Question {qaStep + 1} of{' '}
                  {activeCategory.questions.length}
                </div>

              </div>

              {isAssessmentLoading ? (
                <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-blue-100 bg-blue-50 px-5 py-8 text-center">

                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#2B4A8A] border-t-transparent" />
                    <MessageSquare className="h-5 w-5 text-[#2B4A8A]" />
                  </div>

                  <p className="mt-5 text-sm font-black text-slate-900">
                    Preparing your personalised assessment
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Matching your current concern with the appropriate follow-up questions.
                  </p>

                </div>
              ) : !isQaCompleted ? (
                <div className="mt-6 max-w-2xl space-y-6">

                  {(() => {
                    const q =
                      activeCategory.questions[
                      qaStep
                      ];

                    const currentAnswer =
                      qaAnswers[q.id];

                    return (
                      <div
                        key={q.id}
                        className="space-y-4"
                      >
                        {q.section && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 border border-amber-300">
                              🌿 {q.section}
                            </span>
                            <span className="text-[11px] font-bold text-amber-800">
                              {q.description || 'Ayurvedic Clinical Pariksha'}
                            </span>
                          </div>
                        )}

                        <h4 className="text-base font-black text-slate-800">
                          {q.text}
                        </h4>

                        {q.type === 'select' && (
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {q.options.map(
                              (option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    handleAnswerSelect(
                                      q.id,
                                      option
                                    )
                                  }
                                  className={`rounded-xl border p-3.5 text-left text-xs font-bold transition-all ${currentAnswer ===
                                    option
                                    ? 'border-[#2B4A8A] bg-blue-50 text-[#2B4A8A] ring-2 ring-blue-100'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                  {option}
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {q.type ===
                          'multiselect' && (
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {q.options.map(
                                (option) => {
                                  const selectedList =
                                    Array.isArray(
                                      currentAnswer
                                    )
                                      ? currentAnswer
                                      : [];

                                  const isSelected =
                                    selectedList.includes(
                                      option
                                    );

                                  const toggleMulti =
                                    () => {
                                      let next = [
                                        ...selectedList
                                      ];

                                      if (
                                        isSelected
                                      ) {
                                        next =
                                          next.filter(
                                            (item) =>
                                              item !==
                                              option
                                          );
                                      } else {
                                        next.push(
                                          option
                                        );
                                      }

                                      handleAnswerSelect(
                                        q.id,
                                        next
                                      );
                                    };

                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={
                                        toggleMulti
                                      }
                                      className={`rounded-xl border p-3.5 text-left text-xs font-bold transition-all ${isSelected
                                        ? 'border-[#2B4A8A] bg-blue-50 text-[#2B4A8A] ring-2 ring-blue-100'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                      {option}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          )}

                        {q.type === 'text' && (
                          <input
                            type="text"
                            value={
                              currentAnswer || ''
                            }
                            onChange={(e) =>
                              handleAnswerSelect(
                                q.id,
                                e.target.value
                              )
                            }
                            placeholder={
                              q.placeholder ||
                              'Type your answer here...'
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#2B4A8A]"
                          />
                        )}

                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">

                    <button
                      type="button"
                      disabled={qaStep === 0}
                      onClick={() =>
                        setQaStep(
                          (previous) =>
                            previous - 1
                        )
                      }
                      className="px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30"
                    >
                      Previous Question
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleNextQa
                      }
                      className="flex items-center gap-2 rounded-xl bg-[#2B4A8A] px-5 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-[#223B6E]"
                    >
                      <span>
                        {qaStep ===
                          activeCategory.questions
                            .length -
                          1
                          ? 'Complete & Generate Summary'
                          : 'Next Question'}
                      </span>

                      <ChevronRight className="h-4 w-4" />
                    </button>

                  </div>

                </div>
              ) : null}

            </section>
          )}

          {/* ==================================================
                AI SUMMARY LOADING
                ================================================== */}

          {isGeneratingSummary && (
            <div className="mt-6 rounded-3xl border border-blue-100 bg-white p-8 text-center shadow-xl">

              <Sparkles className="mx-auto h-10 w-10 animate-spin text-[#2B4A8A]" />

              <h3 className="mt-4 text-lg font-black text-slate-900">
                Synthesizing Clinical Summary with AI...
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-xs font-medium leading-relaxed text-slate-500">
                Analyzing your reported symptoms, structured answers, active prescriptions, and digitized medical documents to construct a clinical summary for your consulting doctor.
              </p>

            </div>
          )}

          {/* ==================================================
                AI SUMMARY RESULT
                ================================================== */}

          {aiSummaryResult && (
            <div
              ref={summaryRef}
              className="mt-6 scroll-mt-6 rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-8"
            >

              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-[#2B4A8A] p-2.5 text-white shadow-md">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      AI Patient Problem Clinical Summary
                    </h3>

                    <p className="text-xs font-medium text-slate-500">
                      Prepared for Doctor Consultation & Clinical Review
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-1.5 self-start text-xs font-black text-[#2B4A8A] hover:underline sm:self-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Report Another Concern
                </button>

              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    1. Chief Complaint
                  </h4>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {aiSummaryResult.chiefComplaint}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    2. Active Medication Context
                  </h4>

                  <pre className="mt-2 whitespace-pre-line font-sans text-xs leading-relaxed text-slate-800">
                    {
                      aiSummaryResult.medicationContext
                    }
                  </pre>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    3. History of Present Illness & Symptom Log
                  </h4>

                  <pre className="mt-2 whitespace-pre-line font-sans text-xs leading-relaxed text-slate-800">
                    {
                      aiSummaryResult.historyOfPresentIllness
                    }
                  </pre>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    4. Verified ABHA & Digitized Medical Document History
                  </h4>

                  <pre className="mt-2 whitespace-pre-line font-sans text-xs leading-relaxed text-slate-800">
                    {
                      aiSummaryResult.relevantHistory
                    }
                  </pre>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:col-span-2">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#2B4A8A]">
                    <Stethoscope className="h-4 w-4" />
                    5. Clinical Synthesis for Consulting Physician
                  </h4>

                  <p className="mt-2 text-xs font-bold leading-relaxed text-[#2B4A8A]">
                    {
                      aiSummaryResult.clinicalImpressionForDoctor
                    }
                  </p>
                </div>

                {/* 5B. AYURVEDA DASHAVIDHA PARIKSHA PROFILE */}
                {aiSummaryResult.ayurvedaDashavidhaProfile && (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5 md:col-span-2 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          🌿 5B. Ayurveda Dashavidha Pariksha (10-Fold Clinical Assessment)
                        </h4>
                        <p className="text-[11px] text-amber-800 font-medium">
                          Holistic evaluation across digestive fire, bowel habits, psychological endurance, dosha balance, and vitality:
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                        Ayurvedic Synthesis
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Agni & Ahara Shakti</span>
                        <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.agniAharaShakti?.agniStatus || 'Samagni'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{aiSummaryResult.ayurvedaDashavidhaProfile.agniAharaShakti?.appetiteStatus || 'Normal'}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Koshta & Bowels</span>
                        <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.koshtaElimination?.koshtaType || 'Madhyama'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{aiSummaryResult.ayurvedaDashavidhaProfile.koshtaElimination?.bowelRegularity || 'Regular'}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Sattva & Nidra</span>
                        <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.sattvaNidra?.sleepQuality || 'Good sleep'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{aiSummaryResult.ayurvedaDashavidhaProfile.sattvaNidra?.mentalResilience || 'Madhyama'}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Prakriti / Vikriti</span>
                        <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.prakritiVikriti?.doshaImbalanceTendency || 'Pitta-Vata'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{aiSummaryResult.ayurvedaDashavidhaProfile.prakritiVikriti?.thermalReaction || 'Moderate'}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Vyayama Shakti</span>
                        <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.vyayamaShakti?.physicalStamina || 'Madhyama'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{aiSummaryResult.ayurvedaDashavidhaProfile.vyayamaShakti?.fatigueOnset || 'Normal endurance'}</p>
                      </div>
                    </div>

                    {aiSummaryResult.ayurvedaDashavidhaProfile.ayurvedicClinicalImpression && (
                      <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                        <strong className="text-amber-900 block font-bold mb-0.5">Ayurvedic Clinical Impression:</strong>
                        {aiSummaryResult.ayurvedaDashavidhaProfile.ayurvedicClinicalImpression}
                      </div>
                    )}
                  </div>
                )}

                {/* 5C. PAST PRESCRIPTIONS EXTRACTED FROM REPORTS & OCR */}
                {aiSummaryResult.pastPrescriptionsFromOcr && aiSummaryResult.pastPrescriptionsFromOcr.length > 0 && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 md:col-span-2 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#2B4A8A]" />
                          5C. Past Prescriptions Extracted from Reports & OCR Scans
                        </h4>
                        <p className="text-[11px] text-blue-800 font-medium">
                          Historical medications and regimens extracted from previously uploaded clinical documents:
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2B4A8A] text-[10px] font-black border border-blue-200">
                        {aiSummaryResult.pastPrescriptionsFromOcr.length} Extracted
                      </span>
                    </div>

                    <div className="space-y-2">
                      {aiSummaryResult.pastPrescriptionsFromOcr.map((rx, idx) => (
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

              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">

                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <p className="font-black">
                    Medical Disclaimer Notice
                  </p>

                  <p className="mt-1 font-medium leading-relaxed">
                    {aiSummaryResult.disclaimer}
                  </p>
                </div>

              </div>

              {/* CLINICAL HANDOVER */}

              <section
                className="mt-6 overflow-hidden rounded-2xl border-2 border-[#2B4A8A]/15 bg-slate-50"
                aria-label="Patient clinical handover summary"
              >

                <div className="flex flex-col gap-3 border-b border-[#2B4A8A]/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">

                    <div className="rounded-xl bg-[#2B4A8A] p-2 text-white">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Patient Summary File
                      </h4>

                      <p className="text-xs font-medium text-slate-500">
                        A concise handover for the consulting clinician
                      </p>
                    </div>

                  </div>

                  <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                    Assessment completed
                  </span>

                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2">

                  <div className="rounded-xl border border-slate-200 bg-white p-4">

                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Patient basics
                    </h5>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">

                      <div>
                        <dt className="text-slate-400">
                          Name
                        </dt>

                        <dd className="mt-0.5 font-bold text-slate-900">
                          {currentUser?.fullName ||
                            'Not recorded'}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-400">
                          ABHA ID
                        </dt>

                        <dd className="mt-0.5 font-bold text-slate-900">
                          {currentUser?.abhaId ||
                            'Not recorded'}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-400">
                          Date of birth / gender
                        </dt>

                        <dd className="mt-0.5 font-bold text-slate-900">
                          {currentUser?.dob ||
                            'Not recorded'}
                          {currentUser?.gender
                            ? ` / ${currentUser.gender}`
                            : ''}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-400">
                          Blood group
                        </dt>

                        <dd className="mt-0.5 font-bold text-slate-900">
                          {currentUser?.bloodGroup ||
                            'Not recorded'}
                        </dd>
                      </div>

                    </dl>

                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Permanent health conditions
                    </h5>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {chronicConditions.length > 0 ? (
                        chronicConditions.map((condition) => (
                          <span
                            key={condition}
                            className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800 ring-1 ring-violet-200"
                          >
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          No chronic conditions recorded
                        </span>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                        <Dna className="w-3 h-3 text-indigo-600" />
                        Genetic Diseases & Predispositions
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {geneticConditions.length > 0 ? (
                          geneticConditions.map((gCond, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800 ring-1 ring-indigo-200"
                            >
                              {gCond}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            No genetic conditions recorded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                        Recorded allergies
                      </p>

                      <p className="mt-1 text-xs font-semibold text-rose-800">
                        {allergies.length ? allergies.join(', ') : 'No allergies recorded'}
                      </p>
                    </div>
                  </div>

                  {/* RELATED PRESCRIPTIONS (ONE-LINE INFO) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                    <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-[#2B4A8A]" />
                        Prescriptions Related to Problem (One-Line Summary)
                      </h5>
                      <span className="text-[10px] font-bold text-slate-400">Clinical Reference</span>
                    </div>

                    <div className="space-y-2 mt-2">
                      {activePrescriptions.length > 0 ? (
                        activePrescriptions.flatMap((rx) => (rx.medicines || []).map((m) => ({ ...m, rxDoctor: rx.doctorName, rxHospital: rx.hospitalName }))).map((med, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <span className="font-extrabold text-slate-900">{med.name}: </span>
                            <span className="text-slate-700 font-medium">{med.dosage || ''} {med.frequency ? `• ${med.frequency}` : ''} {med.timing ? `• ${med.timing}` : ''} {med.instructions ? `(${med.instructions})` : ''}</span>
                            {med.rxDoctor && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">Prescribed by: Dr. {med.rxDoctor} {med.rxHospital ? `(${med.rxHospital})` : ''}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">
                          No related prescriptions recorded for this patient.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CURRENTLY RUNNING PRESCRIPTIONS (SEPARATELY HIGHLIGHTED) */}
                  <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-5 lg:col-span-2 shadow-sm">
                    <div className="flex items-center justify-between mb-3 border-b border-emerald-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h5 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                          Currently Running Prescriptions (Separately Highlighted)
                        </h5>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                        {activePrescriptions.length} Active Regimen
                      </span>
                    </div>

                    {activePrescriptions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {activePrescriptions.flatMap((rx) => rx.medicines || []).map((med, idx) => (
                          <div key={idx} className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase block w-fit">
                              Running Now
                            </span>
                            <p className="font-black text-slate-900 text-xs mt-1">{med.name}</p>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {med.dosage || ''} {med.frequency ? `• ${med.frequency}` : ''} {med.timing ? `• ${med.timing}` : ''}
                            </p>
                            {med.instructions && (
                              <p className="text-[10px] text-slate-400 mt-1 italic">"{med.instructions}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/70 border border-emerald-200 text-xs text-emerald-800 text-center font-medium">
                        No active medications currently in running regimen.
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Previous issues and available records
                    </h5>

                    <pre className="mt-2 whitespace-pre-line font-sans text-xs leading-relaxed text-slate-700">
                      {aiSummaryResult.relevantHistory}
                    </pre>
                  </div>

                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 lg:col-span-2">
                    <div className="flex items-center gap-2 text-amber-900">
                      <AlertCircle className="h-4 w-4" />
                      <h5 className="text-[11px] font-black uppercase tracking-wider">
                        Present chief problem — attention required
                      </h5>
                    </div>

                    <p className="mt-2 text-sm font-black leading-relaxed text-slate-900">
                      {problemText}
                    </p>

                    <p className="mt-2 border-t border-amber-200 pt-2 text-xs font-semibold leading-relaxed text-amber-950">
                      {aiSummaryResult.chiefComplaint}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Assessment responses
                    </h5>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {activeCategory?.questions.map((question) => (
                        <div
                          key={question.id}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-xs"
                        >
                          <p className="font-semibold text-slate-500">
                            {question.text}
                          </p>

                          <p className="mt-1 font-bold text-slate-900">
                            {Array.isArray(qaAnswers[question.id])
                              ? qaAnswers[question.id].join(', ')
                              : qaAnswers[question.id] || 'Not answered'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SAVE & PRINT ACTIONS FOR SUMMARIZED FILE */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white p-4 lg:col-span-2 rounded-xl mt-2">
                    <div className="flex items-center space-x-2">
                      {inlineSaveError ? (
                        <span className="flex items-center space-x-1.5 text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{inlineSaveError}</span>
                        </span>
                      ) : inlineSavedSuccess ? (
                        <span className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Saved to Dashboard History below!</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">
                          Save this clinical summary to store in your dashboard PDF history at the end.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setReportedProblemInitialText(problemText || aiSummaryResult.chiefComplaint);
                          setIsReportedProblemModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#2B4A8A]" />
                        <span>Open PDF File</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveInlineSummary}
                        disabled={inlineSaving}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Save className={`w-3.5 h-3.5 ${inlineSaving ? 'animate-spin' : ''}`} />
                        <span>{inlineSaving ? 'Saving...' : 'Save to Dashboard'}</span>
                      </button>
                    </div>
                  </div>

                </div>

              </section>

            </div>
          )}



          {/* ==================================================
              REPORTED PROBLEM FULL CLINICAL SUMMARY MODAL
              ================================================== */}
          <ReportedProblemSummaryModal
            isOpen={isReportedProblemModalOpen}
            onClose={() => setIsReportedProblemModalOpen(false)}
            currentUser={currentUser}
            activePrescriptions={activePrescriptions}
            initialProblem={reportedProblemInitialText}
            onSaveSuccess={(newLog) => {
              loadProblemLogsHistory();
            }}
          />



          {/* ==================================================
              DOCTOR QR SCANNER & SUMMARY SHARING MODAL
              ================================================== */}
          <DoctorQrScannerModal
            isOpen={showDoctorQrScannerModal}
            onClose={() => setShowDoctorQrScannerModal(false)}
            preselectedProblem={activeReportedProblem}
          />

          {/* ==================================================
              PATIENT REAL-TIME CONSULTATION QR MODAL
              ================================================== */}
          <PatientShareQrModal
            isOpen={showPatientQrModal}
            onClose={() => setShowPatientQrModal(false)}
            activeProblemId={activeReportedProblem?.id}
          />

        </div>
      </main>
    </div>
  );
}