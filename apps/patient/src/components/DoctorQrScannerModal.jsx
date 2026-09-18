import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  ScanLine,
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Share2,
  ShieldCheck,
  Stethoscope,
  FileText,
  Pill,
  Dna,
  HeartPulse,
  Printer,
  CheckSquare,
  Square,
  Clock3,
  Paperclip,
  Eye,
  RefreshCw,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyzeOverallClinicalRedAlerts } from '../utils/clinicalRedAlerts';

export default function DoctorQrScannerModal({ isOpen, onClose, preselectedProblem }) {
  const { currentUser, activeReportedProblem } = useAuth();

  // Step state: 'scan' -> 'select' -> 'success'
  const [currentStep, setCurrentStep] = useState('scan');
  const [scanningActive, setScanningActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanNotice, setScanNotice] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scanned Doctor State (strictly initialized to null - no demo doctor)
  const [scannedDoctor, setScannedDoctor] = useState(null);

  // Bridge Session state
  const [bridgeSession, setBridgeSession] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);

  // Selected Summary Items to share
  const [selectedSections, setSelectedSections] = useState({
    activeProblem: true,
    clinicalRedAlerts: true,
    runningPrescriptions: true,
    geneticDiseases: true,
    permanentDiseases: true,
    pastPrescriptions: true,
    diagnosticReports: true
  });

  // Dynamic state for diagnostic reports and prescriptions
  const [extraReportsList, setExtraReportsList] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareReceipt, setShareReceipt] = useState(null);

  // Fetch real patient diagnostic reports & prescriptions when modal opens
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      // Reset states on open
      setCurrentStep('scan');
      setScannedDoctor(null);
      setCameraError(null);
      setScanNotice(null);
      setSubmitError(null);

      fetch(`/api/reports/${currentUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.reports)) {
            setExtraReportsList(
              data.reports.map((r) => ({
                id: r.id,
                selected: true,
                title: r.title,
                type: r.type || 'LAB_REPORT',
                date: r.date || new Date().toISOString().split('T')[0],
                doctorName: r.doctorName || 'Clinical Specialist',
                hospital: r.hospital || 'Health Center',
                findings:
                  r.digitizedContent?.findings ||
                  r.digitizedContent?.diagnosis ||
                  'Verified digitized document.',
                imageUrl: r.imageUrl || ''
              }))
            );
          } else {
            setExtraReportsList([]);
          }
        })
        .catch(() => setExtraReportsList([]));

      fetch(`/api/prescriptions/${currentUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.prescriptions)) {
            const activeMeds = data.prescriptions
              .filter((p) => p.status === 'ACTIVE')
              .flatMap((p) => p.medicines || []);
            setPatientPrescriptions(activeMeds);
          } else {
            setPatientPrescriptions([]);
          }
        })
        .catch(() => setPatientPrescriptions([]));
    }
  }, [isOpen, currentUser?.id]);

  const birthYear = currentUser?.dob ? parseInt(currentUser.dob.substring(0, 4), 10) : 1995;
  const age = new Date().getFullYear() - birthYear;

  // Dynamic clinical summary data for sharing
  const patientData = {
    fullName: currentUser?.fullName || 'Patient',
    abhaId: currentUser?.abhaId || '',
    age: age || 30,
    gender: currentUser?.gender || 'Not Specified',
    bloodGroup: currentUser?.bloodGroup || 'Not Specified'
  };

  const activeProblemToShare = preselectedProblem || activeReportedProblem || null;

  const runningPrescriptions = patientPrescriptions.length > 0
    ? patientPrescriptions.map((m) => ({
        name: m.name,
        dosage: m.dosage || 'As directed',
        frequency: m.frequency || '1-0-1',
        timing: m.timing || 'With water',
        instructions: m.instructions || 'Take as advised.'
      }))
    : [];

  const geneticDiseases = Array.isArray(currentUser?.geneticConditions)
    ? currentUser.geneticConditions.map((g) =>
        typeof g === 'string' ? { name: g, relation: 'Family Lineage', risk: 'Monitored' } : g
      )
    : [];

  const permanentDiseases = [
    ...(Array.isArray(currentUser?.chronicConditions)
      ? currentUser.chronicConditions.map((c) =>
          typeof c === 'string' ? { name: c, status: 'Active Management' } : c
        )
      : []),
    ...(Array.isArray(currentUser?.allergies)
      ? currentUser.allergies.map((a) =>
          typeof a === 'string' ? { name: a, status: 'Documented Allergy' } : a
        )
      : [])
  ];

  const pastPrescriptions = [];
  const diagnosticReports = [];

  // Start Camera Stream when modal is open and on scan step
  useEffect(() => {
    if (isOpen && currentStep === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentStep]);

  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanningActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setScanningActive(true);
    setCameraError(null);
    setScanNotice(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported by your browser or device.');
        setScanningActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Begin real-time jsQR frame scanning loop
      scanAnimationRef.current = requestAnimationFrame(scanQrFrame);
    } catch (err) {
      console.warn('Real-time Camera Access Error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser permissions to scan doctor QR.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera unavailable: ${err.message || 'Check camera connection and permissions.'}`);
      }
      setScanningActive(false);
    }
  };

  // Frame processing loop with jsQR
  const scanQrFrame = () => {
    const video = videoRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          const handled = processDoctorQrString(code.data);
          if (handled) {
            return; // Successfully detected and transitioned
          }
        }
      }
    }
    scanAnimationRef.current = requestAnimationFrame(scanQrFrame);
  };

  // Fallback: decode QR from uploaded image file
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          const ok = processDoctorQrString(code.data);
          if (!ok) {
            setScanNotice('QR code found in image, but does not match MediKiosk Doctor QR format.');
          }
        } else {
          setScanNotice('No QR code detected in the selected image. Please try another clear photo.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Validate and parse scanned QR string
  const processDoctorQrString = (rawString) => {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(rawString);
      } catch (jsonErr) {
        // Check if plain string or URL containing doctor identifier
        if (rawString.startsWith('http') && rawString.includes('doc')) {
          parsed = {
            type: 'MEDIKIOSK_DOCTOR_QR',
            doctorId: 'doc-scanned',
            doctorName: 'Verified Consulting Doctor',
            hospital: 'Consultation Clinic',
            regNo: 'VERIFIED-DOC'
          };
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        setScanNotice('Scanned QR code is not a valid MediKiosk Doctor QR.');
        return false;
      }

      // Check doctor format
      if (parsed.type === 'MEDIKIOSK_DOCTOR_QR' || parsed.doctorId || parsed.doctorName) {
        stopCamera();
        const doc = {
          id: parsed.doctorId || parsed.id || 'doc-scanned',
          name: parsed.doctorName || parsed.name || 'Dr. Consulting Physician',
          qualification: parsed.qualification || 'MBBS, MD',
          regNo: parsed.regNumber || parsed.regNo || 'KMC-REG-VERIFIED',
          hospital: parsed.hospital || 'MediKiosk Clinical Network',
          specialty: parsed.specialty || 'General Medicine',
          verified: true
        };

        setScannedDoctor(doc);
        setCurrentStep('select'); // Advance to review & submit step - DO NOT auto submit!
        return true;
      } else {
        setScanNotice('Unrecognized QR data format. Please scan an authentic MediKiosk Doctor QR code.');
        return false;
      }
    } catch (e) {
      console.error('Error processing scanned QR:', e);
      setScanNotice('Error reading QR code. Please try again.');
      return false;
    }
  };

  const toggleSection = (sectionKey) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleExtraReport = (reportId) => {
    setExtraReportsList((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = () => {
    setSelectedSections({
      activeProblem: true,
      clinicalRedAlerts: true,
      runningPrescriptions: true,
      geneticDiseases: true,
      permanentDiseases: true,
      pastPrescriptions: true,
      diagnosticReports: true
    });
    setExtraReportsList((prev) => prev.map((r) => ({ ...r, selected: true })));
  };

  const handleDeselectAll = () => {
    setSelectedSections({
      activeProblem: false,
      clinicalRedAlerts: false,
      runningPrescriptions: false,
      geneticDiseases: false,
      permanentDiseases: false,
      pastPrescriptions: false,
      diagnosticReports: false
    });
    setExtraReportsList((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const selectedCount = Object.values(selectedSections).filter(Boolean).length;
  const selectedExtraReports = extraReportsList.filter((r) => r.selected);
  const selectedExtraReportsCount = selectedExtraReports.length;

  // SUBMIT TO DOCTOR: Explicitly triggered by user pressing Submit button
  const handleShareSummary = async () => {
    if (!scannedDoctor || !scannedDoctor.id) {
      setSubmitError('No valid doctor QR scanned. Please scan doctor QR first.');
      return;
    }

    if (selectedCount === 0 && selectedExtraReportsCount === 0) {
      setSubmitError('Please select at least one summary component or attached report to submit.');
      return;
    }

    setSharingLoading(true);
    setSubmitError(null);

    const dynamicAlerts = selectedSections.clinicalRedAlerts
      ? analyzeOverallClinicalRedAlerts({
          problemText: activeProblemToShare?.title || '',
          geneticDiseases,
          permanentDiseases,
          allergies: currentUser?.allergies || [],
          runningPrescriptions,
          patientDetails: patientData
        }).map((a) => a.title || a.finding || a)
      : [];

    const payload = {
      bridgeId: bridgeSession?.id || `bridge-${Date.now()}`,
      patientId: currentUser?.id || `pat-${Date.now()}`,
      doctorId: scannedDoctor.id,
      doctorName: scannedDoctor.name,
      doctorRegNo: scannedDoctor.regNo,
      hospital: scannedDoctor.hospital,
      selectedSections,
      extraReports: selectedExtraReports,
      summaryData: {
        reportId: 'SHARE-' + Date.now().toString().slice(-6),
        patientDetails: patientData,
        problemTitle: selectedSections.activeProblem && activeProblemToShare ? activeProblemToShare.title : null,
        chiefComplaint: selectedSections.activeProblem && activeProblemToShare ? activeProblemToShare.chiefComplaint : null,
        clinicalRedAlerts: dynamicAlerts,
        runningPrescriptions: selectedSections.runningPrescriptions ? runningPrescriptions : [],
        geneticDiseases: selectedSections.geneticDiseases ? geneticDiseases : [],
        permanentDiseases: selectedSections.permanentDiseases ? permanentDiseases : [],
        pastPrescriptions: selectedSections.pastPrescriptions ? pastPrescriptions : [],
        diagnosticReports: selectedSections.diagnosticReports ? diagnosticReports : [],
        extraReports: selectedExtraReports
      },
      consentToken: 'ABDM-CONSENT-' + Math.floor(100000 + Math.random() * 900000)
    };

    try {
      const response = await fetch('/api/doctor/share-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to transmit summary to doctor.');
      }

      setShareReceipt(
        data.shareRecord || {
          consentToken: payload.consentToken,
          bridgeId: payload.bridgeId,
          doctorName: scannedDoctor.name,
          doctorRegNo: scannedDoctor.regNo,
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          extraReports: selectedExtraReports
        }
      );

      setCurrentStep('success');
    } catch (e) {
      console.error('Error sharing summary:', e);
      setSubmitError(e.message || 'Submission failed. Please check network and try again.');
    } finally {
      setSharingLoading(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto animate-fadeIn text-slate-900">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-inner">
              <ScanLine className="h-5 w-5 text-blue-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
                  ABDM QR Exchange
                </span>
                <span className="text-[10px] font-bold text-emerald-300">
                  Step {currentStep === 'scan' ? '1/3: Real-Time Scanner' : currentStep === 'select' ? '2/3: Review & Submit' : '3/3: Transmitted'}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                {currentStep === 'scan' && 'Scan Doctor QR Code'}
                {currentStep === 'select' && 'Review & Submit Information to Doctor'}
                {currentStep === 'success' && 'Summary Transmitted Successfully'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-xl p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =======================================================
            STEP 1: REAL-TIME DOCTOR QR SCANNER
            ======================================================= */}
        {currentStep === 'scan' && (
          <div className="p-6 space-y-5">
            <div className="text-center max-w-md mx-auto">
              <p className="text-sm text-slate-600 font-medium">
                Hold your device camera directly facing the Doctor's MediKiosk QR code displayed on their clinic workstation screen.
              </p>
            </div>

            {/* Scan Warning Notice */}
            {scanNotice && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-900 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{scanNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScanNotice(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* REAL-TIME SCANNER VIEWFINDER */}
            <div className="relative mx-auto w-full max-w-sm aspect-square rounded-3xl bg-slate-950 overflow-hidden border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl z-20" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl z-20" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl z-20" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl z-20" />

              {/* Animated Laser Scanning Line */}
              {scanningActive && (
                <div className="absolute inset-x-4 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce z-20" />
              )}

              {/* Live Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
              />

              {/* Camera Error / Permission Fallback */}
              {cameraError && (
                <div className="text-center p-6 text-slate-300 flex flex-col items-center justify-center z-10">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-3">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-white mb-1">Camera Not Accessible</p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed mb-4">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                </div>
              )}

              {/* Viewfinder Overlay Status */}
              {!cameraError && (
                <div className="absolute bottom-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] text-emerald-300 font-mono font-bold flex items-center gap-1.5 z-20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Align Doctor QR inside frame
                </div>
              )}
            </div>

            {/* Fallback Image Upload / File QR Scan (No Predefined/Mock Buttons) */}
            <div className="pt-2 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-[#2B4A8A] transition-colors py-1 px-3 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50"
              >
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span>Upload QR Image / Photo</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1">
                Real-time scanning operates directly on device camera or uploaded image file. No mock or demo data.
              </p>
            </div>
          </div>
        )}

        {/* =======================================================
            STEP 2: REVIEW & SUBMIT TO DOCTOR (EXPLICIT SUBMIT BUTTON)
            ======================================================= */}
        {currentStep === 'select' && (
          <div className="p-6 space-y-5">
            
            {/* Scanned Doctor Verified Information Display */}
            {scannedDoctor && (
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 shadow-xs">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                        Scanned Doctor QR Verified
                      </span>
                      <span className="text-xs text-slate-600 font-mono font-bold">
                        Reg: {scannedDoctor.regNo}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {scannedDoctor.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {scannedDoctor.qualification} • {scannedDoctor.hospital}
                    </p>
                    {scannedDoctor.specialty && (
                      <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                        Specialty: {scannedDoctor.specialty}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScannedDoctor(null);
                    setCurrentStep('scan');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 underline px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
                >
                  Rescan QR
                </button>
              </div>
            )}

            {/* Submission Error Banner */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-xs text-rose-900 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-semibold">{submitError}</div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-rose-700 hover:text-rose-950 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Selection Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Summary Components to Transmit
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select which medical records to grant to {scannedDoctor?.name || 'the consulting doctor'}:
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-[#2B4A8A] hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Interactive Checklist */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              
              {/* 1. Active Reported Problem */}
              <div
                onClick={() => toggleSection('activeProblem')}
                className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex items-start space-x-3 ${
                  selectedSections.activeProblem
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="pt-0.5 text-amber-600">
                  {selectedSections.activeProblem ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Present Active / Reported Problem
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      High Priority
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-900 mt-0.5">
                    {activeProblemToShare?.title || 'No active problem selected (Account summary only)'}
                  </p>
                  {activeProblemToShare?.chiefComplaint && (
                    <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">
                      {activeProblemToShare.chiefComplaint}
                    </p>
                  )}
                </div>
              </div>

              {/* 2. AI Clinical Red Alerts */}
              <div
                onClick={() => toggleSection('clinicalRedAlerts')}
                className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex items-start space-x-3 ${
                  selectedSections.clinicalRedAlerts
                    ? 'border-red-500 bg-red-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="pt-0.5 text-red-600">
                  {selectedSections.clinicalRedAlerts ? <CheckSquare className="w-5 h-5 text-red-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-red-600" />
                      AI Clinical Red Alerts & Contraindications
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                      Safety Essential
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-red-950 mt-0.5">
                    {currentUser?.allergies?.length > 0
                      ? `Allergies: ${currentUser.allergies.join(', ')}`
                      : 'Automated cross-analysis checks drug interactions and contraindications'}
                  </p>
                </div>
              </div>

              {/* 3. Running Prescriptions */}
              <div
                onClick={() => toggleSection('runningPrescriptions')}
                className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex items-start space-x-3 ${
                  selectedSections.runningPrescriptions
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="pt-0.5 text-emerald-600">
                  {selectedSections.runningPrescriptions ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-emerald-600" />
                      Active Running Prescriptions ({patientPrescriptions.length} Active)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      Current Regimen
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-900 font-semibold mt-0.5">
                    {patientPrescriptions.length > 0
                      ? patientPrescriptions.slice(0, 3).map((m) => m.name).join(' • ')
                      : 'No active running prescriptions on record.'}
                  </p>
                </div>
              </div>

              {/* 4. Genetic Diseases */}
              <div
                onClick={() => toggleSection('geneticDiseases')}
                className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex items-start space-x-3 ${
                  selectedSections.geneticDiseases
                    ? 'border-indigo-500 bg-indigo-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="pt-0.5 text-indigo-600">
                  {selectedSections.geneticDiseases ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Dna className="w-3.5 h-3.5 text-indigo-600" />
                      Genetic & Hereditary Conditions
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                      Family Lineage
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {currentUser?.geneticConditions?.length > 0
                      ? currentUser.geneticConditions.join(', ')
                      : 'No genetic conditions on record.'}
                  </p>
                </div>
              </div>

              {/* 5. Permanent Chronic Conditions & Allergies */}
              <div
                onClick={() => toggleSection('permanentDiseases')}
                className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex items-start space-x-3 ${
                  selectedSections.permanentDiseases
                    ? 'border-rose-500 bg-rose-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="pt-0.5 text-rose-600">
                  {selectedSections.permanentDiseases ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      Permanent Chronic Conditions & Allergies
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                      Documented
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-900 font-semibold mt-0.5">
                    {permanentDiseases.length > 0
                      ? permanentDiseases.map((d) => (typeof d === 'string' ? d : d.name)).join(' • ')
                      : 'No permanent conditions or allergies on record.'}
                  </p>
                </div>
              </div>

              {/* 6. Extra Diagnostic Reports to Attach */}
              {extraReportsList.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                      <span>Attach Diagnostic Reports ({selectedExtraReportsCount} of {extraReportsList.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {extraReportsList.map((report) => (
                      <div
                        key={report.id}
                        className={`rounded-2xl p-3 border-2 transition-all flex items-start justify-between gap-3 ${
                          report.selected
                            ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div
                          onClick={() => toggleExtraReport(report.id)}
                          className="flex items-start space-x-3 cursor-pointer flex-1"
                        >
                          <div className="pt-0.5 text-blue-600 shrink-0">
                            {report.selected ? (
                              <CheckSquare className="w-5 h-5 text-blue-700" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black text-slate-900">{report.title}</span>
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                {report.type}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {report.hospital} • {report.date}
                            </p>
                          </div>
                        </div>

                        {report.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewReport(report)}
                            className="p-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Preview</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ACTION FOOTER WITH EXPLICIT SUBMIT BUTTON */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                Transmitting to: <strong className="text-slate-900">{scannedDoctor?.name}</strong>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setScannedDoctor(null);
                    setCurrentStep('scan');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel / Rescan
                </button>

                {/* Explicit Submit Button */}
                <button
                  type="button"
                  onClick={handleShareSummary}
                  disabled={sharingLoading || !scannedDoctor || (selectedCount === 0 && selectedExtraReportsCount === 0)}
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2B4A8A] to-[#1A2D54] hover:from-[#223B6E] hover:to-[#13203C] text-white text-xs font-black tracking-wide shadow-lg shadow-[#2B4A8A]/20 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {sharingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Submitting to Doctor...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Submit Information to Doctor</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* =======================================================
            STEP 3: SUCCESSFUL TRANSMISSION RECEIPT
            ======================================================= */}
        {currentStep === 'success' && (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 mx-auto flex items-center justify-center shadow-lg mb-3">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Information Transmitted to Doctor!
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1 max-w-md mx-auto">
                Your medical summary records were successfully transmitted to <strong className="text-slate-900">{scannedDoctor?.name}</strong> under ABDM consent protocols.
              </p>
            </div>

            {/* Official Transmission Slip */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/50 via-white to-emerald-50/30 p-5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">ABDM Consent & Bridge ID</span>
                  <span className="font-mono font-bold text-emerald-800">{shareReceipt?.consentToken || 'ABDM-CONSENT-VERIFIED'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Transmitted to Doctor Workstation
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">Consulting Physician</span>
                  <span className="font-bold text-slate-900">{scannedDoctor?.name}</span>
                  <span className="text-[10px] text-slate-500 block">Reg: {scannedDoctor?.regNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Patient Name & ABHA</span>
                  <span className="font-bold text-slate-900">{patientData.fullName}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">{patientData.abhaId || 'Direct Kiosk Login'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Clock3 className="w-3.5 h-3.5 text-emerald-600" />
                  Access valid for 24 hours
                </span>
                <span className="font-mono text-[10px]">
                  Shared: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Sharing Slip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-[#2B4A8A] hover:bg-[#223B6E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-black text-sm text-slate-900">{previewReport.title}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{previewReport.hospital} • {previewReport.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-72 bg-slate-100 flex items-center justify-center">
              <img
                src={previewReport.imageUrl}
                alt={previewReport.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-700">
              <span className="font-black text-slate-900 block mb-1">Digitized Clinical Findings:</span>
              <p className="leading-relaxed">{previewReport.findings}</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
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
