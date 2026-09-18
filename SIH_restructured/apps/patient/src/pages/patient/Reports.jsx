import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  X,
  Save,
  Search,
  RefreshCw,
  UserRound,
  Stethoscope,
  Activity,
  Pill,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function PrescriptionOcrTable({ content, defaultRawTextOpen = false }) {
  const [showRawText, setShowRawText] = useState(defaultRawTextOpen);
  if (!content) return null;

  const doctorName = content.doctorName && content.doctorName.trim() !== '' ? content.doctorName.trim() : 'Not available';
  const patientName = content.patientName && content.patientName.trim() !== '' ? content.patientName.trim() : 'Not available';
  const date = content.date && content.date.trim() !== '' ? content.date.trim() : 'Not available';
  const problem = content.diagnosis && content.diagnosis.trim() !== '' ? content.diagnosis.trim() : 'Not available';
  const hospital = (content.hospitalName || content.hospital)?.trim();
  const rawText = content.rawText || '';

  const rawMedicines = Array.isArray(content.medicines) && content.medicines.length > 0 ? content.medicines : [];
  const medicines = rawMedicines.length > 0 ? rawMedicines : [
    { name: 'Not available', dosage: 'Not available', frequency: 'Not available', timing: 'Not available', duration: 'Not available' }
  ];

  return (
    <div className="space-y-4">
      {/* 1. DOCUMENT HEADER SUMMARY */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#2B4A8A] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2B4A8A] block">
              Digitized Prescription Document
            </span>
            <p className="font-extrabold text-sm text-slate-900">
              {doctorName !== 'Not available' ? doctorName : 'Attending Physician'}
              {hospital && hospital !== 'Not available' ? ` • ${hospital}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-blue-100 text-[#2B4A8A] text-xs font-bold border border-blue-200">
            Date: {date}
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            Patient: {patientName}
          </span>
        </div>
      </div>

      {/* 2. STRUCTURED PRESCRIPTION TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-[#2B4A8A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pill className="w-4 h-4 text-sky-200" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Structured Prescription OCR Table
            </span>
          </div>
          <span className="text-[11px] text-blue-100 font-medium">
            {rawMedicines.length} Medication(s) Extracted
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="px-3.5 py-3 whitespace-nowrap">Doctor Name</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Patient Name</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Date</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Problem / Diagnosis</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Medication</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Dosage</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Frequency</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Timing</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {medicines.map((med, idx) => (
                <tr key={idx} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                  <td className="px-3.5 py-3 font-bold text-[#2B4A8A] whitespace-nowrap">
                    {doctorName}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {patientName}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                    {date}
                  </td>
                  <td className="px-3.5 py-3 text-slate-800 max-w-[200px]" title={problem}>
                    <span className="line-clamp-2">{problem}</span>
                  </td>
                  <td className="px-3.5 py-3 font-extrabold text-slate-900 whitespace-nowrap">
                    {med.name || 'Unclear'}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${med.dosage && med.dosage !== 'Not available' ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'text-slate-400'}`}>
                      {med.dosage || 'Not available'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${med.frequency && med.frequency !== 'Not available' ? 'bg-blue-50 text-[#2B4A8A] border border-blue-200' : 'text-slate-400'}`}>
                      {med.frequency || 'Not available'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${med.timing && med.timing !== 'Not available' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-400'}`}>
                      {med.timing || 'Not available'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${med.duration && med.duration !== 'Not available' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'text-slate-400'}`}>
                      {med.duration || 'Not available'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. RAW OCR TEXT ACCORDION / TOGGLE */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRawText(!showRawText)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#2B4A8A] hover:bg-slate-100/80 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Raw OCR Text Output (Transcribed OCR)</span>
          </span>
          <span className="text-[11px] text-blue-700 font-semibold">
            {showRawText ? 'Hide Raw Text ▲' : 'Show Raw Text ▼'}
          </span>
        </button>

        {showRawText && (
          <div className="p-4 border-t border-slate-200 bg-white">
            <pre className="whitespace-pre-wrap break-words text-xs font-mono text-slate-800 leading-relaxed max-h-[350px] overflow-y-auto">
              {rawText || 'No raw OCR transcription available.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const { currentUser, sarvamApiKey, geminiApiKey } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Scanner
  const [showScanModal, setShowScanModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrError, setOcrError] = useState('');

  // Actual OCR result
  const [digitizedData, setDigitizedData] = useState(null);
  const [selectedReportView, setSelectedReportView] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // --------------------------------------------------
  // LOAD REPORTS
  // --------------------------------------------------

  useEffect(() => {
    fetchReports();

    return () => {
      stopCamera();
    };
  }, [currentUser]);

  const fetchReports = async () => {
    setLoading(true);

    try {
      const patientId = currentUser?.id;

      if (!patientId) {
        setReports([]);
        return;
      }

      const response = await fetch(`/api/reports/${patientId}`);

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = await response.json();

      if (data.success) {
        setReports(data.reports || []);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  const startCamera = async () => {
    setOcrError('');
    setCapturedImage(null);
    setDigitizedData(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }

      // Stop any existing camera first.
      stopCamera();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment',
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
          audio: false,
        });

      cameraStreamRef.current = stream;

      setIsCameraActive(true);

      // The modal must already be rendered before
      // assigning the stream to the video element.
      requestAnimationFrame(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          try {
            await videoRef.current.play();
          } catch (playError) {
            console.warn(
              'Video autoplay warning:',
              playError
            );
          }
        }
      });
    } catch (error) {
      console.error('Camera access error:', error);

      setIsCameraActive(false);

      setOcrError(
        'Camera permission was denied or the camera could not be opened. You can upload the prescription image instead.'
      );
    }
  };

  const stopCamera = () => {
    // Stop the stored stream.
    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      cameraStreamRef.current = null;
    }

    // Also stop the video element stream if present.
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;

      stream.getTracks().forEach((track) => {
        track.stop();
      });

      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };

  // --------------------------------------------------
  // CAPTURE REAL PAPER IMAGE
  // --------------------------------------------------

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setOcrError('Camera is not ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setOcrError(
        'Camera image is not ready yet. Please wait a moment and try again.'
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      setOcrError(
        'Unable to capture the camera image.'
      );
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Real photograph from the camera.
    const imageDataUrl = canvas.toDataURL(
      'image/jpeg',
      0.92
    );

    setCapturedImage(imageDataUrl);

    stopCamera();

    // Send the actual image to Sarvam.
    processOcrDigitization(imageDataUrl);
  };

  // --------------------------------------------------
  // UPLOAD IMAGE
  // --------------------------------------------------

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setOcrError(
        'Please select a JPG, JPEG, or PNG image.'
      );
      return;
    }

    setOcrError('');
    setDigitizedData(null);

    stopCamera();

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const imageDataUrl =
        loadEvent.target?.result;

      if (!imageDataUrl) {
        setOcrError(
          'Unable to read the selected image.'
        );
        return;
      }

      setCapturedImage(imageDataUrl);

      processOcrDigitization(imageDataUrl);
    };

    reader.onerror = () => {
      setOcrError(
        'Unable to read the selected image.'
      );
    };

    reader.readAsDataURL(file);

    // Allow selecting the same file again.
    event.target.value = '';
  };

  // --------------------------------------------------
  // SEND ACTUAL IMAGE TO BACKEND FOR OCR DIGITIZATION
  // --------------------------------------------------

  const processOcrDigitization = async (imageDataUrl) => {
    setIsProcessingOcr(true);
    setOcrError('');
    setDigitizedData(null);

    try {
      const imageResponse = await fetch(imageDataUrl);
      if (!imageResponse.ok) {
        throw new Error('Unable to prepare prescription image file.');
      }
      const imageBlob = await imageResponse.blob();

      const formData = new FormData();
      formData.append('document', imageBlob, `prescription-${Date.now()}.jpg`);
      formData.append('language', 'en-IN');

      const headers = {};
      if (geminiApiKey) {
        headers['x-gemini-key'] = geminiApiKey;
      }
      if (sarvamApiKey) {
        headers['x-sarvam-key'] = sarvamApiKey;
      }

      const apiResponse = await fetch('/api/flash/ocr', {
        method: 'POST',
        headers,
        body: formData,
      });

      const responseText = await apiResponse.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('OCR response parse note:', parseErr);
      }

      if (!apiResponse.ok) {
        throw new Error(data?.error || data?.message || `Server returned error status: ${apiResponse.status}`);
      }

      if (data && data.success && data.digitizedData) {
        setDigitizedData(data.digitizedData);
        return;
      } else {
        throw new Error(data?.error || data?.message || 'Prescription OCR digitization could not identify text in image.');
      }
    } catch (error) {
      console.warn('OCR request error:', error);
      setOcrError(error.message || 'Error occurred during processing. Please ensure the prescription is clearly visible, focused, and well-lit.');
      setDigitizedData(null);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // --------------------------------------------------
  // SAVE DIGITIZED DOCUMENT
  // --------------------------------------------------

  const handleSaveDigitizedRecord = async () => {
    if (!digitizedData) {
      return;
    }

    const patientId = currentUser?.id || '';
    const rawText = digitizedData.rawText || digitizedData.text || '';
    const rxDate = (digitizedData.date && digitizedData.date !== 'Not available')
      ? digitizedData.date
      : new Date().toISOString().split('T')[0];

    const newReport = {
      id: 'rep-' + Date.now(),
      patientId,
      title: (digitizedData.diagnosis && digitizedData.diagnosis !== 'Not available')
        ? `Prescription - ${digitizedData.diagnosis}`
        : `Digitized Prescription - ${new Date().toLocaleDateString()}`,
      date: rxDate,
      doctorName: digitizedData.doctorName || 'Not available',
      hospital: digitizedData.hospitalName || 'Not available',
      type: 'HANDWRITTEN_RX',
      digitizedContent: {
        rawText,
        doctorName: digitizedData.doctorName || 'Not available',
        hospitalName: digitizedData.hospitalName || 'Not available',
        patientName: digitizedData.patientName || currentUser?.fullName || 'Not available',
        date: rxDate,
        diagnosis: digitizedData.diagnosis || 'Not available',
        medicines: digitizedData.medicines || [],
        source: digitizedData.source || 'Gemini Flash Vision OCR',
        language: digitizedData.language || 'en-IN',
        outputFormat: 'table',
      },
      imageUrl: capturedImage,
      verified: true
    };

    // 1. Save to Reports repository
    try {
      await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          title: newReport.title,
          doctorName: newReport.doctorName,
          hospital: newReport.hospital,
          type: newReport.type,
          digitizedContent: newReport.digitizedContent,
          imageUrl: capturedImage,
        }),
      });
    } catch (error) {
      console.warn('Report save note:', error);
    }

    // 2. Automatically add to Prescriptions page and Firebase
    try {
      const rxPayload = {
        patientId,
        doctorName: digitizedData.doctorName || 'Not available',
        hospital: digitizedData.hospitalName || 'Not available',
        date: rxDate,
        diagnosis: (digitizedData.diagnosis && digitizedData.diagnosis !== 'Not available') ? digitizedData.diagnosis : 'Prescribed Regimen',
        medicines: (digitizedData.medicines || []).map((m, idx) => ({
          id: 'med-' + Date.now() + '-' + idx,
          name: m.name || 'Unclear',
          dosage: m.dosage || 'Not available',
          frequency: m.frequency || 'Not available',
          timing: m.timing || 'Not available',
          duration: m.duration || 'Not available',
          instructions: m.instructions || '',
          startDate: rxDate,
          endDate: 'Course active',
          reminders: [
            { label: 'Morning Dose', time: '08:00 AM', taken: false },
            { label: 'Night Dose', time: '08:00 PM', taken: false }
          ]
        })),
        status: 'ACTIVE',
        rawText,
        imageUrl: capturedImage || ''
      };

      await fetch('/api/prescriptions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rxPayload)
      });
    } catch (rxErr) {
      console.warn('Prescription save note:', rxErr);
    }

    // Always update client state so document appears immediately
    setReports(prev => [newReport, ...prev]);
    window.dispatchEvent(new CustomEvent('patient-data-refresh'));
    await fetchReports();
    closeScanModal();
  };

  // --------------------------------------------------
  // CLOSE SCANNER
  // --------------------------------------------------

  const closeScanModal = () => {
    stopCamera();

    setShowScanModal(false);
    setCapturedImage(null);
    setDigitizedData(null);
    setOcrError('');
    setIsProcessingOcr(false);
  };

  // --------------------------------------------------
  // RETAKE
  // --------------------------------------------------

  const retakePhoto = () => {
    setCapturedImage(null);
    setDigitizedData(null);
    setOcrError('');

    startCamera();
  };

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredReports =
    reports.filter((report) => {
      const query =
        searchTerm.toLowerCase();

      return (
        report.title
          ?.toLowerCase()
          .includes(query) ||
        report.doctorName
          ?.toLowerCase()
          .includes(query) ||
        report.hospital
          ?.toLowerCase()
          .includes(query) ||
        report.digitizedContent?.rawText
          ?.toLowerCase()
          .includes(query)
      );
    });

  // --------------------------------------------------
  // OPEN SCANNER
  // --------------------------------------------------

  const openScanner = () => {
    setShowScanModal(true);
    setCapturedImage(null);
    setDigitizedData(null);
    setOcrError('');

    // Start camera after modal has rendered.
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="bg-gradient-to-r from-[#2B4A8A] via-[#223B6E] to-[#1A2D54] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">

        <div>
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
            <FileText className="w-4 h-4" />

            <span>
              Digital Medical Record Repository
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Digitized Medical Reports & Prescriptions
          </h1>
        </div>

        {/* SCAN BUTTON */}

        <button
          type="button"
          onClick={openScanner}
          className="flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-[#80bfff] hover:bg-white text-black hover:text-black font-black text-sm shadow-xl shadow-[#2B4A8A]/20 transform active:scale-95 transition-all self-start md:self-auto shrink-0"
        >
          <Camera className="w-5 h-5 stroke-[2.5]" />

          <span>
            Scan Handwritten Prescription
          </span>
        </button>
      </div>

      {/* ================================================= */}
      {/* SEARCH */}
      {/* ================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search digitized prescriptions..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2B4A8A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {filteredReports.length} Document(s)
        </div>
      </div>

      {/* ================================================= */}
      {/* REPORTS */}
      {/* ================================================= */}

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          Loading digitized reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 text-slate-500 space-y-3">

          <FileText className="w-12 h-12 text-slate-300 mx-auto" />

          <p className="font-bold text-slate-700">
            No medical reports found.
          </p>

          <p className="text-xs">
            Click "Scan Handwritten Prescription" above
            to digitize your prescription.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all space-y-4 flex flex-col justify-between"
            >

              <div className="space-y-3">

                <div className="flex items-start justify-between">

                  <div className="flex items-center space-x-2">

                    <div className="p-2 rounded-xl bg-blue-50 text-[#2B4A8A]">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div>

                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#2B4A8A]">
                        {report.type ===
                          'HANDWRITTEN_RX'
                          ? 'Gemini Flash Digitized'
                          : 'Medical Report'}
                      </span>

                      <p className="text-xs text-slate-400 mt-0.5">
                        {report.date}
                      </p>

                    </div>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {report.title}
                </h3>

                {(report.doctorName ||
                  report.hospital) && (
                    <p className="text-xs font-semibold text-slate-700">

                      {report.doctorName}

                      {report.doctorName &&
                        report.hospital &&
                        ' • '}

                      <span className="text-slate-500">
                        {report.hospital}
                      </span>
                    </p>
                  )}

                {report.digitizedContent?.rawText && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">

                    <strong className="text-slate-900 block mb-1">
                      Digitized Text:
                    </strong>

                    <p className="line-clamp-5 whitespace-pre-wrap">
                      {
                        report.digitizedContent
                          .rawText
                      }
                    </p>

                  </div>
                )}

              </div>

              {/* VIEW */}

              <div className="pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedReportView(report)
                  }
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#2B4A8A] text-slate-700 text-xs font-bold transition-all"
                >
                  <Eye className="w-4 h-4" />

                  <span>
                    View Digitized Prescription
                  </span>
                </button>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================= */}
      {/* SCANNER MODAL */}
      {/* ================================================= */}

      {showScanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">

          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 my-8">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between pb-4 border-b border-slate-100">

              <div className="flex items-center space-x-3 text-[#2B4A8A] font-bold text-lg">

                <div className="p-2 rounded-xl bg-blue-50 text-[#2B4A8A]">
                  <Camera className="w-5 h-5" />
                </div>

                <span>
                  Scan Handwritten Prescription
                </span>
              </div>

              <button
                type="button"
                onClick={closeScanModal}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* ================================================= */}
            {/* CAMERA / UPLOAD */}
            {/* ================================================= */}

            {/* ================================================= */}
            {/* CAMERA / UPLOAD / PREVIEW */}
            {/* ================================================= */}

            {!digitizedData &&
              !isProcessingOcr && (
                <div className="space-y-5">

                  {/* IF IMAGE CAPTURED / UPLOADED BUT NOT YET DIGITIZED OR ERRORED */}

                  {capturedImage ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[380px]">
                        <img
                          src={capturedImage}
                          alt="Uploaded prescription preview"
                          className="w-full h-full object-contain max-h-[380px]"
                        />
                      </div>

                      {ocrError && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 font-medium">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Digitization Notice:</p>
                            <p>{ocrError}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => processOcrDigitization(capturedImage)}
                          className="w-full sm:w-auto px-6 py-3 bg-[#2B4A8A] hover:bg-[#223B6E] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Retry Digitization with Gemini Flash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedImage(null);
                            setOcrError('');
                          }}
                          className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                        >
                          Select Different Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* CAMERA */}

                      {isCameraActive ? (
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-[#2B4A8A] shadow-inner">

                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />

                          <canvas
                            ref={canvasRef}
                            className="hidden"
                          />

                          {/* SCANNING FRAME */}

                          <div className="absolute inset-5 border-2 border-dashed border-[#80bfff] pointer-events-none rounded-xl">

                            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
                              Place the prescription inside the frame
                            </div>

                          </div>

                          {/* CAPTURE BUTTON */}

                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 px-7 py-3 bg-[#80bfff] hover:bg-white text-black font-black text-sm rounded-full shadow-2xl flex items-center space-x-2 transition-all transform active:scale-95"
                          >

                            <Camera className="w-5 h-5" />

                            <span>
                              Capture Prescription
                            </span>

                          </button>

                        </div>
                      ) : (
                        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-4">

                          <Camera className="w-10 h-10 text-[#2B4A8A] mx-auto" />

                          <div>
                            <p className="text-sm text-slate-700 font-bold">
                              Camera is not active
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              Start the camera or upload a prescription image.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-5 py-2.5 bg-[#2B4A8A] hover:bg-[#223B6E] text-white text-xs font-bold rounded-xl transition-all"
                          >
                            Start Camera
                          </button>

                        </div>
                      )}

                      {/* ERROR */}

                      {ocrError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">

                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />

                          <span>
                            {ocrError}
                          </span>

                        </div>
                      )}

                      {/* DIVIDER */}

                      {/* DIVIDER */}
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200" />
                        <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase">
                          OR Upload Prescription File
                        </span>
                        <div className="flex-grow border-t border-slate-200" />
                      </div>

                      {/* UPLOAD FILE BUTTON */}
                      <div className="flex items-center justify-center">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center space-x-2 px-6 py-3 bg-[#80bfff] hover:bg-white border border-[#80bfff] hover:border-[#2B4A8A] text-black text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Prescription Image</span>
                        </button>
                      </div>
                    </>
                  )}

                </div>
              )}

            {/* ================================================= */}
            {/* PROCESSING */}
            {/* ================================================= */}

            {isProcessingOcr && (
              <div className="p-10 text-center space-y-5 bg-blue-50 rounded-2xl border border-blue-100">

                <RefreshCw className="w-10 h-10 text-[#2B4A8A] animate-spin mx-auto" />

                <div>

                  <h4 className="text-base font-bold text-[#2B4A8A]">
                    Digitizing Prescription...
                  </h4>

                  <p className="text-xs text-blue-700 mt-2">
                    Gemini 3.6 Flash Vision is reading the prescription image and converting the handwritten content into digital Markdown text.
                  </p>

                </div>

                <div className="text-[11px] text-blue-600 font-semibold">
                  Please keep this window open.
                </div>

              </div>
            )}

            {/* ================================================= */}
            {/* OCR RESULT */}
            {/* ================================================= */}

            {digitizedData &&
              !isProcessingOcr && (
                <div className="space-y-5">

                  {/* SUCCESS */}

                  {/* SUCCESS HEADER */}
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 font-bold text-sm text-[#2B4A8A]">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Document OCR Digitization Complete</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full bg-blue-100 text-[#2B4A8A] border border-blue-200">
                        {digitizedData.source || digitizedData.provider || 'Multimodal OCR'}
                      </span>
                    </div>
                  </div>

                  {/* STRUCTURED PRESCRIPTION OCR TABLE */}
                  <PrescriptionOcrTable content={digitizedData} defaultRawTextOpen={false} />

                  {/* ORIGINAL + TEXT */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* ORIGINAL */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Original Prescription Image
                      </h4>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[500px]">
                        <img
                          src={capturedImage}
                          alt="Captured handwritten prescription"
                          className="w-full h-full object-contain max-h-[500px]"
                        />
                      </div>
                    </div>

                    {/* OCR TEXT */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Digitized Markdown Text (Editable)</span>
                        <span className="text-[10px] text-slate-400 lowercase">click inside to edit</span>
                      </h4>
                      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-inner">
                        <textarea
                          value={digitizedData.rawText || ''}
                          onChange={(event) =>
                            setDigitizedData({
                              ...digitizedData,
                              rawText: event.target.value,
                            })
                          }
                          rows={17}
                          className="w-full p-4 text-xs font-mono text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-[#2B4A8A]"
                          placeholder="Extracted prescription markdown will appear here..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* SOURCE */}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">

                    <div className="flex items-center gap-2">

                      <Sparkles className="w-4 h-4 text-[#2B4A8A]" />

                      <span className="font-semibold">
                        Text extracted from the uploaded/captured prescription image using Gemini 2.5 Flash Vision.
                      </span>

                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-100">

                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Retake / Scan Again
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDigitizedRecord}
                      className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-[#2B4A8A] hover:bg-[#223B6E] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >

                      <Save className="w-4 h-4" />

                      <span>
                        Save to Medical Record
                      </span>

                    </button>

                  </div>

                </div>
              )}

          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* FULL REPORT VIEW */}
      {/* ================================================= */}

      {selectedReportView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">

          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 my-8">

            <div className="flex items-center justify-between pb-4 border-b border-slate-100">

              <div className="flex items-center space-x-2.5 text-[#2B4A8A] font-bold text-lg">

                <FileText className="w-5 h-5" />

                <span>
                  {selectedReportView.title}
                </span>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReportView(null)
                }
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* STRUCTURED PRESCRIPTION OCR TABLE */}
            <PrescriptionOcrTable
              content={
                selectedReportView.digitizedContent || {
                  patientName: selectedReportView.patientName,
                  doctorName: selectedReportView.doctorName,
                  hospitalName: selectedReportView.hospital,
                  date: selectedReportView.date,
                  diagnosis: selectedReportView.diagnosis,
                  medicines: selectedReportView.medicines,
                  rawText: selectedReportView.rawText || selectedReportView.digitizedContent?.rawText,
                }
              }
              defaultRawTextOpen={false}
            />

            {/* ORIGINAL DOCUMENT IMAGE */}
            {selectedReportView.imageUrl && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Original Prescription Document
                </h4>
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[500px]">
                  <img
                    src={selectedReportView.imageUrl}
                    alt="Original prescription"
                    className="w-full max-h-[500px] object-contain"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">

              <button
                type="button"
                onClick={() =>
                  setSelectedReportView(null)
                }
                className="px-5 py-2.5 bg-[#2B4A8A] hover:bg-[#223B6E] text-white font-bold text-xs rounded-xl"
              >
                Close View
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}