import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Ban,
  Bot,
  Volume2
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
    geminiApiKey,
    activeReportedProblem,
    updateActiveReportedProblem,
    removeActiveReportedProblem
  } = useAuth();
  const navigate = useNavigate();

  // --------------------------------------------------
  // PROBLEM REPORTING STATE
  // --------------------------------------------------

  const [inputMode, setInputMode] = useState('voice');
  const [problemText, setProblemText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [sttLoading, setSttLoading] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [chatInputValue, setChatInputValue] = useState('');

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
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

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
  const chatScrollRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [qaStep, chatInputValue, activeCategory, problemText, isAssessmentLoading, isGeneratingSummary]);

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

      const combined = [...serverLogs];
      const sIds = new Set(serverLogs.map(l => l.id));
      localSaved.forEach((item) => {
        if (!sIds.has(item.id) && item.patientId === patientId) {
          combined.push(item);
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
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        if (fullTranscript) {
          setChatInputValue(fullTranscript);
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
  // AI VOICE TTS FOR QUESTIONS
  // --------------------------------------------------
  useEffect(() => {
    if (activeCategory && !isAssessmentLoading && !isQaCompleted && !isAiMuted) {
      const currentQuestion = activeCategory.questions[qaStep];
      if (currentQuestion && currentQuestion.text) {
        window.speechSynthesis.cancel();

        // Let's use translated text if available, but for now just currentQuestion.text
        const textToSpeak = t(currentQuestion.id, currentQuestion.text);

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = voiceLanguage || selectedLanguage || 'hi-IN';

        // Auto-start recording after AI finishes asking the question
        utterance.onend = () => {
          setIsRecording(true);
          if (recognitionInstance) {
            try {
              recognitionInstance.lang = voiceLanguage || selectedLanguage || 'hi-IN';
              recognitionInstance.start();
            } catch (err) { }
          }
        };

        window.speechSynthesis.speak(utterance);
      }
    }

    // Auto-focus the input box whenever a new question is asked
    if (activeCategory && !isAssessmentLoading && !isQaCompleted) {
      setTimeout(() => {
        document.getElementById('chat-input')?.focus();
      }, 300);
    }
  }, [activeCategory, qaStep, isAssessmentLoading, isQaCompleted, isAiMuted, voiceLanguage, selectedLanguage, t]);

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
            setChatInputValue(data.transcript);
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

  const handleProblemSubmit = async (textToSubmit) => {
    const text = textToSubmit || problemText;
    if (!text.trim()) {
      return;
    }
    setProblemText(text);

    setIsAssessmentLoading(true);

    try {
      const res = await fetch('/api/patient/dynamic-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: text,
          languageCode: voiceLanguage || selectedLanguage || 'hi-IN',
          apiKey: geminiApiKey || ''
        })
      });
      const data = await res.json();

      let matchedCategory;
      if (data.success && data.category) {
        matchedCategory = data.category;
        const ayurQuestions = getStructuredQuestionsForText('').questions.filter(q => q.section === 'Ayurveda Dashavidha Pariksha');
        matchedCategory.questions = [...matchedCategory.questions, ...ayurQuestions];
      } else {
        throw new Error("Dynamic questions failed, falling back");
      }

      setActiveCategory(matchedCategory);
      setQaAnswers({});
      setQaStep(0);
      setIsQaCompleted(false);
      setAiSummaryResult(null);
    } catch (e) {
      console.error('Error fetching dynamic questions:', e);
      let matchedCategory = getStructuredQuestionsForText(text);
      const pTextLower = text.toLowerCase();
      if (pTextLower.includes('stomach') || pTextLower.includes('head') || pTextLower.includes('leg') || pTextLower.includes('chest') || pTextLower.includes('back')) {
        matchedCategory.questions = matchedCategory.questions.filter(q => !q.text.toLowerCase().includes('exact location'));
      }

      // Translate fallback questions dynamically using free API
      try {
        const targetLang = (voiceLanguage || selectedLanguage || 'en-IN').split('-')[0];
        if (targetLang !== 'en') {
          for (let q of matchedCategory.questions) {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(q.text)}`);
            const data = await res.json();
            if (data && data[0] && data[0][0] && data[0][0][0]) {
              q.text = data[0][0][0];
            }

            if (q.options) {
              for (let i = 0; i < q.options.length; i++) {
                const optRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(q.options[i])}`);
                const optData = await optRes.json();
                if (optData && optData[0] && optData[0][0] && optData[0][0][0]) {
                  q.options[i] = optData[0][0][0];
                }
              }
            }
          }
        }
      } catch (transErr) {
        console.warn('Fallback translation failed', transErr);
      }

      setActiveCategory(matchedCategory);
      setQaAnswers({});
      setQaStep(0);
      setIsQaCompleted(false);
      setAiSummaryResult(null);
    } finally {
      setIsAssessmentLoading(false);
    }
  };

  // --------------------------------------------------
  // SELECT QUICK SYMPTOM
  // --------------------------------------------------

  const handleQuickSymptom = (symptom) => {
    setChatInputValue((previous) => {
      if (!previous.trim()) {
        return symptom;
      }
      return `${previous}, ${symptom}`;
    });
  };

  // --------------------------------------------------
  // ANSWER QUESTION & CHAT SUBMIT
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

  const handleChatSubmit = () => {
    if (!chatInputValue.trim()) return;

    if (isRecording) {
      if (recognitionInstance) recognitionInstance.stop();
      setIsRecording(false);
    }

    if (!activeCategory) {
      handleProblemSubmit(chatInputValue);
    } else {
      const currentQ = activeCategory.questions[qaStep];
      handleAnswerSelect(currentQ.id, chatInputValue);
      handleNextQa();
    }
    setChatInputValue('');
  };

  const handleNextQa = () => {
    if (
      qaStep <
      activeCategory.questions.length - 1
    ) {
      setQaStep((previous) => previous + 1);
    } else {
      setIsQaCompleted(true);
      // generateAiSummary is called via useEffect below
    }
  };

  // Trigger summary generation when all questions answered
  React.useEffect(() => {
    if (isQaCompleted && !isGeneratingSummary && !aiSummaryResult) {
      generateAiSummary();
    }
  }, [isQaCompleted, isGeneratingSummary, aiSummaryResult]);

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
              structuredQAList,
            apiKey: geminiApiKey || ''
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
            pastPrescriptions: data.aiSummary.pastPrescriptionsFromOcr || [],
            summary: data.aiSummary
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
          ...aiSummaryResult,
          reportTitle: aiSummaryResult.reportTitle || `Reported Problem: ${(problemText || aiSummaryResult.chiefComplaint || 'Clinical Assessment').substring(0, 45)}`,
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
          timestamp: newLog.timestamp || new Date().toISOString(),
          ayurvedaDashavidha: payload.aiSummary.ayurvedaDashavidhaProfile || null,
          pastPrescriptions: payload.aiSummary.pastPrescriptionsFromOcr || [],
          summary: payload.aiSummary
        });
      }

      loadProblemLogsHistory();
      window.dispatchEvent(new CustomEvent('patient-data-refresh'));

      // Automatically close the problem report/summary panel upon successful save
      setAiSummaryResult(null);
      setActiveCategory(null);
      setQaAnswers({});
      setQaStep(0);
      setIsQaCompleted(false);
      setProblemText('');
      setInlineSavedSuccess(true);

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

  const handleDeleteProblemLog = async (logId, e) => {
    if (e) e.stopPropagation();
    if (!currentUser?.id || !logId) return;
    if (!window.confirm('Are you sure you want to delete this reported problem log?')) return;
    try {
      const res = await fetch(`/api/patient/problem-logs/${currentUser.id}/${logId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const storageKey = currentUser?.id ? `medikiosk_problem_summaries_${currentUser.id}` : 'medikiosk_problem_summaries';
        const localSaved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = localSaved.filter((item) => item.id !== logId);
        localStorage.setItem(storageKey, JSON.stringify(filtered));

        if (activeReportedProblem?.id === logId) {
          removeActiveReportedProblem();
        }

        loadProblemLogsHistory();
        window.dispatchEvent(new CustomEvent('patient-data-refresh'));
      }
    } catch (err) {
      console.error('Failed to delete problem log:', err);
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
                  className="relative overflow-hidden rounded-3xl border-2 border-[#B84B16] bg-[#B84B16] p-6 shadow-lg shadow-[#B84B16]/25 transition-all animate-fadeIn sm:p-7"
                >
                  {/* Background ambient glow */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />

                  <div className="relative z-10">
                    {/* Header Status Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                        </span>
                        <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                          {t('activeReportedProblem', 'PRESENT ACTIVE REPORTED PROBLEM')}
                        </span>
                        <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-extrabold text-white">
                          Active • Day {getProblemDaysActive(activeReportedProblem.timestamp)} of 3
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-white/90">
                          <Clock3 className="h-3.5 w-3.5 text-white" />
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
                      <h3 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl">
                        {activeReportedProblem.title}
                      </h3>
                      <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/90 sm:text-sm">
                        {activeReportedProblem.chiefComplaint ||
                          'Patient reports active symptoms requiring clinical attention, vitals review, and treatment tracking.'}
                      </p>

                      {activeReportedProblem.summary && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                            className="flex cursor-pointer items-center space-x-1.5 rounded-xl border border-white/60 bg-white px-3 py-1.5 text-[11px] font-bold text-[#B84B16] shadow-xs transition-all hover:bg-orange-50 active:scale-95"
                          >
                            <span>{isSummaryExpanded ? 'Hide Summarized Information' : 'View Summarized Information'}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSummaryExpanded ? 'rotate-90' : ''}`} />
                          </button>

                          {isSummaryExpanded && (
                            <div className="animate-fadeIn mt-3 space-y-2">
                              {activeReportedProblem.summary.historyOfPresentIllness && (
                                <div className="rounded-xl bg-white/70 border border-amber-200 p-3 shadow-2xs">
                                  <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-wider mb-1">
                                    History of Present Illness (Summarized)
                                  </h4>
                                  <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                                    {activeReportedProblem.summary.historyOfPresentIllness}
                                  </p>
                                </div>
                              )}

                              {activeReportedProblem.summary.clinicalImpressionForDoctor && (
                                <div className="rounded-xl bg-white/70 border border-amber-200 p-3 shadow-2xs">
                                  <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-wider mb-1">
                                    Clinical Impression
                                  </h4>
                                  <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                                    {activeReportedProblem.summary.clinicalImpressionForDoctor}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI Clinical Red Alerts Banner (Overall Analysis) */}
                    {false && activeRedAlerts.length > 0 && (
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
                      </div>
                    )}

                    {/* Linked Running Prescriptions (Separately Highlighted) */}
                    {false && (
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
                    )}

                    {/* Ayurveda Dashavidha Pariksha Quick Tags */}
                    {false && activeReportedProblem.ayurvedaDashavidha && (
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
                    {false && (
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
                    )}
                  </div>
                </section>
              ) : (
                <section
                  id="no-reported-problem-card"
                  className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="grid w-full grid-cols-1 items-center gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                    {/* Episode information */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2B4A8A]">
                        <ShieldCheck className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs font-black uppercase tracking-wider text-slate-900">
                          {t('noActiveEpisode', 'No Active Clinical Problem Reported')}
                        </h4>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
                          {t('clickToStartAssessment', 'You can report symptoms using voice or text below to generate an ABDM clinical summary file.')}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:items-center xl:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowDoctorQrScannerModal(true)}
                        title="Scan doctor's QR code in clinic to transmit your health records"
                        className="flex min-w-0 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-[#2B4A8A] transition-all duration-200 hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98] sm:w-auto sm:min-w-[175px] xl:min-w-0"
                      >
                        <ScanLine className="h-4 w-4 shrink-0 text-[#2B4A8A]" />
                        <span className="truncate">{t('scanDoctorQr', 'Scan Doctor QR')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReportNewSymptom('')}
                        className="flex min-w-0 w-full items-center justify-center gap-2 rounded-xl bg-[#2B4A8A] px-3.5 py-2.5 text-xs font-black text-white shadow-sm transition-all duration-200 hover:bg-[#223B6E] hover:shadow-md active:scale-[0.98] sm:w-auto sm:min-w-[175px] xl:min-w-0"
                      >
                        <PlusCircle className="h-4 w-4 shrink-0 text-white" />
                        <span className="truncate">{t('reportNewSymptom', 'Report New Symptom')}</span>
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* ==================================================
                  CHATBOT UI
                  ================================================== */}

              <div
                id="chatbot-section"
                className="overflow-hidden rounded-3xl bg-white shadow-xl border border-slate-200 scroll-mt-6 flex flex-col h-[600px]"
              >
                {/* Chat Header */}
                <div className="bg-[#2B4A8A] px-4 py-2.5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1 text-white border border-white/20">
                      <Globe className="w-3.5 h-3.5 text-blue-200" />
                      <select
                        value={voiceLanguage}
                        onChange={(e) => setVoiceLanguage(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer pr-4 appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem top 50%', backgroundSize: '0.65rem auto' }}
                        title="Select UI/Voice language"
                      >
                        {indianLanguages.map((language) => (
                          <option key={language.code} value={language.code} className="text-slate-900 bg-white">
                            {language.name} ({language.name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAiMuted(!isAiMuted);
                        if (!isAiMuted) window.speechSynthesis.cancel();
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase transition-all ${isAiMuted ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}
                    >
                      {isAiMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      AI Voice: {isAiMuted ? 'OFF' : 'ON'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Reset Assessment"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Chat History */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 bg-white space-y-5">
                  {(() => {
                    const messages = [];

                    const fallbackT = {
                      'en-IN': {
                        welcome: 'Hello! I am your Medikiosk AI Health Assistant. Please click the mic button and speak your health concern.',
                        listen: 'Listen',
                        analyzing: 'Generating follow-up questions...',
                        summary: 'Generating your clinical summary file based on your responses...'
                      },
                      'hi-IN': {
                        welcome: 'नमस्ते! मैं आपका मेडिकियोस्क एआई स्वास्थ्य सहायक हूं। कृपया माइक बटन दबाएं और अपनी स्वास्थ्य समस्या बताएं।',
                        listen: 'प्रश्न सुनें',
                        analyzing: 'अनुवर्ती प्रश्न उत्पन्न कर रहा है...',
                        summary: 'आपकी प्रतिक्रियाओं के आधार पर आपकी नैदानिक ​​सारांश फ़ाइल तैयार कर रहा है...'
                      },
                      'te-IN': {
                        welcome: 'నమస్కారం! నేను మీ మెడికియోస్క్ AI ఆరోగ్య సహాయకుడిని. దయచేసి మైక్ బటన్‌ను నొక్కి మీ ఆరోగ్య సమస్యను మాట్లాడండి.',
                        listen: 'ప్రశ్న వినండి',
                        analyzing: 'తదుపరి ప్రశ్నలను రూపొందిస్తున్నాము...',
                        summary: 'మీ ప్రతిస్పందనల ఆధారంగా మీ క్లినికల్ సారాంశం ఫైల్‌ను రూపొందిస్తున్నాము...'
                      }
                    };
                    const lang = fallbackT[voiceLanguage] || fallbackT['en-IN'];

                    // 1. Welcome
                    messages.push({
                      id: 'welcome',
                      sender: 'ai',
                      text: t('chatbotWelcome', lang.welcome),
                      showListen: true
                    });

                    // 2. User Problem
                    if (activeCategory || isAssessmentLoading) {
                      messages.push({
                        id: 'user_problem',
                        sender: 'user',
                        text: problemText
                      });
                    }

                    // 3. Loading questions
                    if (isAssessmentLoading) {
                      messages.push({
                        id: 'loading_q',
                        sender: 'ai',
                        isLoading: true,
                        text: t('analyzingSymptoms', lang.analyzing)
                      });
                    }

                    // 4. Questions
                    if (activeCategory) {
                      activeCategory.questions.forEach((q, index) => {
                        if (index <= qaStep) {
                          messages.push({
                            id: `ai_${q.id}`,
                            sender: 'ai',
                            text: q.text,
                            isCurrentQuestion: index === qaStep && !isQaCompleted,
                            options: q.options,
                            type: q.type,
                            questionId: q.id
                          });

                          if (qaAnswers[q.id]) {
                            messages.push({
                              id: `user_${q.id}`,
                              sender: 'user',
                              text: Array.isArray(qaAnswers[q.id]) ? qaAnswers[q.id].join(', ') : qaAnswers[q.id]
                            });
                          }
                        }
                      });
                    }

                    // 5. Generating summary
                    if (isGeneratingSummary) {
                      messages.push({
                        id: 'generating_summary',
                        sender: 'ai',
                        isLoading: true,
                        text: t('generatingClinicalSummary', lang.summary)
                      });
                    }

                    return messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                        {msg.sender === 'ai' && (
                          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
                            <Bot className="w-4 h-4 text-[#2B4A8A]" />
                          </div>
                        )}
                        <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          {msg.sender === 'ai' && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 mb-1">
                              AI Health Assistant
                            </span>
                          )}
                          <div className={`p-3.5 text-[13px] font-medium leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-[#2B4A8A] text-white rounded-2xl rounded-tr-sm' : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl rounded-tl-sm'}`}>
                            {msg.isLoading ? (
                              <div className="flex items-center gap-2 text-slate-500 font-bold">
                                <Sparkles className="w-4 h-4 animate-spin text-[#2B4A8A]" />
                                {msg.text}
                              </div>
                            ) : (
                              <>
                                {msg.text}
                                {msg.showListen && (
                                  <button className="mt-2.5 text-[10px] font-black text-[#2B4A8A] flex items-center gap-1.5 uppercase tracking-wider hover:underline" onClick={() => {/* Text to speech logic could go here */ }}>
                                    <Volume2 className="w-3.5 h-3.5" /> {t('listenToQuestion', lang.listen)}
                                  </button>
                                )}

                                {msg.isCurrentQuestion && msg.type === 'select' && msg.options && (
                                  <div className="mt-3 flex flex-col gap-2">
                                    {msg.options.map((opt, i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          handleAnswerSelect(msg.questionId, opt);
                                          handleNextQa();
                                        }}
                                        className="text-left px-3 py-2 rounded-lg border border-[#2B4A8A]/30 bg-white hover:bg-blue-50 text-[#2B4A8A] text-xs font-bold transition-colors"
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Chat Input Bottom */}
                <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 shrink-0">
                  <div className="flex items-end gap-3">
                    {/* Text Input Container */}
                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-2 pl-5 flex items-center shadow-sm">
                      <input
                        id="chat-input"
                        type="text"
                        value={chatInputValue}
                        onChange={(e) => setChatInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleChatSubmit(); }}
                        placeholder={`${(() => {
                          const fallbackT = {
                            'en-IN': { typeIn: 'Type problem in' },
                            'hi-IN': { typeIn: 'अपनी समस्या टाइप करें' },
                            'te-IN': { typeIn: 'సమస్యను టైప్ చేయండి' }
                          };
                          const lang = fallbackT[voiceLanguage] || fallbackT['en-IN'];
                          return t('orTypeProblemIn', lang.typeIn);
                        })()} ${indianLanguages.find(l => l.code === voiceLanguage)?.name || 'English'}...`}
                        className="flex-1 bg-transparent text-[14px] font-medium outline-none text-slate-700 placeholder:text-slate-400 py-2"
                      />

                      <button
                        type="button"
                        onClick={handleChatSubmit}
                        disabled={!chatInputValue.trim()}
                        className="p-3 ml-2 rounded-full text-white bg-[#B84B16] hover:bg-[#9d3f12] disabled:opacity-30 disabled:bg-slate-200 disabled:text-slate-500 transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    {/* BIG MIC BUTTON */}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${isRecording ? 'bg-red-500 shadow-red-900/40 hover:bg-red-600' : 'bg-[#2B4A8A] shadow-[#2B4A8A]/30 hover:bg-[#1A2D54]'}`}
                    >
                      {isRecording && (
                        <>
                          <div className="absolute -inset-2 animate-ping rounded-full bg-red-400/30" />
                          <div className="absolute -inset-1 rounded-full border border-red-300/40" />
                        </>
                      )}
                      {isRecording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                    </button>
                  </div>

                  {/* Quick Symptoms (Only show if not answering a question) */}
                  {!activeCategory && (
                    <div className="flex items-center gap-2.5 mt-4 overflow-x-auto no-scrollbar pb-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider shrink-0">Quick Symptoms:</span>
                      {quickSymptoms.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleQuickSymptom(t(item.key, item.label))}
                          className="shrink-0 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-[#2B4A8A] hover:bg-blue-50 hover:text-[#2B4A8A] transition-all shadow-xs"
                        >
                          {t(item.key, item.label)}
                        </button>
                      ))}
                    </div>
                  )}
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
                  onClick={() => navigate('/reports')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-extrabold text-slate-600 transition-all hover:border-[#B84B16] hover:text-[#B84B16]"
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
                    className="col-span-2 group relative overflow-hidden rounded-2xl border-2 border-[#B84B16] bg-[#B84B16] p-4 text-left text-white shadow-lg shadow-[#B84B16]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-98 cursor-pointer"
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

              {false && (
                <>

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

                      <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
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
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Koshta & Bowels</span>
                            <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.koshtaElimination?.koshtaType || 'Madhyama'}</p>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Sattva & Nidra</span>
                            <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.sattvaNidra?.sleepQuality || 'Good sleep'}</p>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Prakriti / Vikriti</span>
                            <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.prakritiVikriti?.doshaImbalanceTendency || 'Pitta-Vata'}</p>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Vyayama Shakti</span>
                            <p className="text-xs font-black text-slate-900 mt-1">{aiSummaryResult.ayurvedaDashavidhaProfile.vyayamaShakti?.physicalStamina || 'Madhyama'}</p>
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

                </>
              )}

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
                  {activePrescriptions.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                      <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-[#2B4A8A]" />
                          Prescriptions Related to Problem (One-Line Summary)
                        </h5>
                        <span className="text-[10px] font-bold text-slate-400">Clinical Reference</span>
                      </div>

                      <div className="space-y-2 mt-2">
                        {activePrescriptions.flatMap((rx) => (rx.medicines || []).map((m) => ({ ...m, rxDoctor: rx.doctorName, rxHospital: rx.hospitalName }))).map((med, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <span className="font-extrabold text-slate-900">{med.name}: </span>
                            <span className="text-slate-700 font-medium">{med.dosage || ''} {med.frequency ? `• ${med.frequency}` : ''} {med.timing ? `• ${med.timing}` : ''} {med.instructions ? `(${med.instructions})` : ''}</span>
                            {med.rxDoctor && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">Prescribed by: Dr. {med.rxDoctor} {med.rxHospital ? `(${med.rxHospital})` : ''}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CURRENTLY RUNNING PRESCRIPTIONS (SEPARATELY HIGHLIGHTED) */}
                  {activePrescriptions.length > 0 && (
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
                    </div>
                  )}

                  {/* PREVIOUS ISSUES AND AVAILABLE RECORDS */}
                  {currentUser?.reports && currentUser.reports.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Previous issues and available records
                      </h5>

                      <pre className="mt-2 whitespace-pre-line font-sans text-xs leading-relaxed text-slate-700">
                        {aiSummaryResult.relevantHistory}
                      </pre>
                    </div>
                  )}

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
                      History of Present Illness (AI Synthesized)
                    </h5>

                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {aiSummaryResult.historyOfPresentIllness}
                    </p>
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
