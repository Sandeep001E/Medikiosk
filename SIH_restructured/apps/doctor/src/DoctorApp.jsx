import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  Activity,
  Stethoscope,
  Bell,
  X,
  ShieldCheck,
  Radio,
  Sparkles,
  QrCode,
  Key,
  LogOut,
  ChevronRight
} from 'lucide-react';
import DoctorDashboard from './DoctorDashboard';
import { useDoctorLiveSync } from './useDoctorLiveSync';
import DoctorQrModal from './components/DoctorQrModal';

function DoctorLayout() {
  const [liveAlert, setLiveAlert] = useState(null);
  const [liveTransmissions, setLiveTransmissions] = useState([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const doctorInfo = {
    id: 'doc-501',
    name: 'Dr. Ananya Rao',
    qualification: 'MBBS, MD (General Medicine)',
    regNumber: 'KMC-45892',
    hospital: 'Manipal Hospital, Bengaluru',
    specialty: 'Internal Medicine & Chronic Care'
  };

  // Fetch initial transmitted cases from doctor backend
  useEffect(() => {
    fetch('/api/doctor/watching-cases')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.cases)) {
          setLiveTransmissions(data.cases);
        }
      })
      .catch(err => console.warn('Could not fetch initial watching cases:', err));
  }, []);

  const [activeBridge, setActiveBridge] = useState(null);

  // Real-time SSE connection to Doctor Backend (Port 5006)
  const { isConnected } = useDoctorLiveSync('/api/doctor/live-events', (data) => {
    if (!data || !data.event) return;

    if (data.event === 'BRIDGE_CONNECTED') {
      const bridge = data.payload?.bridge;
      const pName = bridge?.patientName || 'Patient';
      const abha = bridge?.abhaId || '';

      setActiveBridge(bridge);
      setLiveAlert({
        title: `🔗 Consultation Bridge Active: ${pName}`,
        message: `Patient (ABHA: ${abha}) scanned your QR code and linked consultation desk. Selecting summary & extra reports...`,
        type: 'bridge_connected',
        timestamp: new Date().toLocaleTimeString()
      });
    } else if (data.event === 'SUMMARY_SHARED') {
      const record = data.payload?.record;
      const pName = record?.summaryData?.patientDetails?.fullName || record?.patientName || 'Patient';
      const complaint = record?.summaryData?.problemTitle || record?.summaryData?.chiefComplaint || 'Patient health summary';
      const extraCount = record?.extraReports?.length || record?.summaryData?.extraReports?.length || 0;

      setLiveAlert({
        title: `📥 Summary & ${extraCount} Report${extraCount === 1 ? '' : 's'} Received: ${pName}`,
        message: `"${complaint}" - Received across the consultation bridge!`,
        type: 'qr_transmission',
        timestamp: new Date().toLocaleTimeString()
      });

      if (record) {
        setLiveTransmissions(prev => {
          if (prev.some(c => c.id === record.id)) return prev;
          return [record, ...prev];
        });
      }
    } else if (data.event === 'NOTE_ADDED') {
      const updatedCase = data.payload?.caseRecord;
      if (updatedCase) {
        setLiveTransmissions(prev =>
          prev.map(c => c.id === updatedCase.id ? updatedCase : c)
        );
      }
    }
  });

  // Auto-dismiss alert after 9 seconds
  useEffect(() => {
    if (liveAlert) {
      const timer = setTimeout(() => setLiveAlert(null), 9000);
      return () => clearTimeout(timer);
    }
  }, [liveAlert]);

  // Save clinical note handler
  const handleSaveDoctorNote = async (caseId, noteText) => {
    const res = await fetch('/api/doctor/add-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        noteText,
        doctorId: doctorInfo.id,
        doctorName: doctorInfo.name
      })
    });

    const data = await res.json();
    if (data.success && data.caseRecord) {
      setLiveTransmissions(prev =>
        prev.map(c => c.id === caseId ? data.caseRecord : c)
      );
    }
    return data;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">

      {/* REAL-TIME LIVE TOAST NOTIFICATION */}
      {liveAlert && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-bounce-short">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-blue-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-300/40 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
              <QrCode className="w-5 h-5 animate-pulse text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white tracking-tight">{liveAlert.title}</h4>
                <span className="text-[10px] text-emerald-200 font-mono">{liveAlert.timestamp}</span>
              </div>
              <p className="text-xs text-emerald-50 mt-1 leading-snug line-clamp-2">{liveAlert.message}</p>
              <div className="mt-2 text-[10px] font-bold text-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Live Patient QR Exchange
              </div>
            </div>
            <button
              onClick={() => setLiveAlert(null)}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER (MATCHING SCREENSHOT NAVBAR DESIGN) */}
      <header className="h-[76px] bg-white border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">

        {/* Left: Brand Logo & Portal Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#2B4A8A] flex items-center justify-center shadow-md shadow-[#2B4A8A]/20 text-white">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#2B4A8A] tracking-tight leading-none">
              Medikiosk
            </h1>

          </div>
        </div>

        {/* Right: Active Watching Badge, Doctor QR Launcher, AI Keys & Logout (Identical to Screenshot) */}
        <div className="flex items-center space-x-2 sm:space-x-3">


          {/* Show Doctor QR Button */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            title="Display Doctor QR Code for patient scanning"
            className="flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-[#2B4A8A] hover:bg-blue-100 transition-all shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Doctor QR</span>
          </button>
          {/* Log Out Button (Exact from Screenshot) */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSTATION PAGE VIEW */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Routes>
          <Route
            path="/"
            element={
              <DoctorDashboard
                liveTransmissions={liveTransmissions}
                onSaveDoctorNote={handleSaveDoctorNote}
                onOpenQrModal={() => setShowQrModal(true)}
                doctorInfo={doctorInfo}
                activeBridge={activeBridge}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Doctor QR Modal */}
      <DoctorQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        doctorInfo={doctorInfo}
      />

      {/* AI Key Info Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-extrabold text-sm text-[#2B4A8A]">Doctor Clinical Decision AI</span>
              <button onClick={() => setShowKeyModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600">
              Doctor Clinical Workstation is linked with Gemini Vision Multimodal OCR and Sarvam AI models to synthesize patient-reported symptoms, identify cross-drug contraindications, and flag red alerts.
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold">
              ✓ Server-side Gemini & Sarvam API endpoints active on Port 5006.
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2B4A8A] text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

class DoctorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('DoctorApp error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xl max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-black text-xl">
              !
            </div>
            <h2 className="text-xl font-black text-slate-900">Clinical Workstation Recovered</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {this.state.error?.message || 'A temporary rendering state occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-5 py-2.5 rounded-xl bg-[#2B4A8A] text-white font-bold text-xs shadow-md hover:bg-blue-900 transition-all cursor-pointer"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DoctorApp() {
  return (
    <DoctorErrorBoundary>
      <BrowserRouter>
        <DoctorLayout />
      </BrowserRouter>
    </DoctorErrorBoundary>
  );
}
