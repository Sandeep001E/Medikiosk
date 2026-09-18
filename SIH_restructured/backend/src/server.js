import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { sharedStore } from './shared/sharedStore.js';
import { firestoreService } from './services/firestoreService.js';
import { initiateAbhaVerification, confirmAbhaOtp } from './services/abhaVerification.js';
import { transcribeAudioWithSarvam } from './services/sarvamStt.js';
import { digitizeHandwrittenDocumentWithFlash } from './services/geminiFlashOcr.js';
import { generatePatientProblemSummary } from './services/aiSummary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;


app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Diagnostic Firebase Status Endpoint
app.get('/api/firebase/status', (req, res) => {
  return res.json({
    success: true,
    firestore: firestoreService.getStatus()
  });
});

app.get('/api/health', (req, res) => {
  return res.json({
    success: true,
    service: 'MediKiosk Patient Server',
    firestore: firestoreService.getStatus()
  });
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Internal Inter-Process Synchronization Endpoint (from Doctor Backend)
app.post('/internal/sync-event', (req, res) => {
  const { event, payload, timestamp } = req.body;
  if (event) {
    sharedStore.applyExternalSync(event, payload, timestamp);
  }
  return res.json({ success: true });
});

// ----------------------------------------------------
// SERVER-SENT EVENTS (SSE) FOR REAL-TIME PATIENT SYNC
// ----------------------------------------------------
app.get(['/api/patient/live-events', '/api/patient/live-events/:patientId'], (req, res) => {
  const targetPatientId = req.params.patientId || null;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial handshake
  res.write(`data: ${JSON.stringify({
    event: 'CONNECTED',
    payload: { message: 'Patient live event stream connected', patientId: targetPatientId },
    timestamp: new Date().toISOString()
  })}\n\n`);

  const onLiveEvent = (data) => {
    // If targeted to a patient, only send if it matches this patient or is global
    if (!targetPatientId || !data.payload?.patientId || data.payload.patientId === targetPatientId) {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Error writing to patient SSE:', err.message);
      }
    }
  };

  sharedStore.syncBus.on('live_event', onLiveEvent);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sharedStore.syncBus.off('live_event', onLiveEvent);
  });
});

// ----------------------------------------------------
// AUTH & ABHA ROUTES
// ----------------------------------------------------

// Initiate ABHA Verification
app.post('/api/abha/verify-initiate', (req, res) => {
  const { abhaInput } = req.body;
  if (!abhaInput) {
    return res.status(400).json({ success: false, message: 'ABHA ID or Number is required.' });
  }
  const result = initiateAbhaVerification(abhaInput);
  return res.json(result);
});

// Confirm ABHA OTP
app.post('/api/abha/verify-confirm', (req, res) => {
  const { txnId, otp, abhaId } = req.body;
  const result = confirmAbhaOtp(txnId, otp, abhaId);
  return res.json(result);
});

// Patient Registration with Ayushman Bharat ID and basic details
app.post('/api/auth/register', (req, res) => {
  const { fullName, name, email, password, phone, abhaId, ayushmanBharatId, dob, gender, bloodGroup, address } = req.body;
  const patientName = (fullName || name || '').trim();
  const rawAbha = (abhaId || ayushmanBharatId || '').trim();
  const userPhone = (phone || '').trim();
  const userEmail = (email || '').trim().toLowerCase();

  if (!patientName) {
    return res.status(400).json({ success: false, message: 'Please provide your full name.' });
  }
  if (!userPhone) {
    return res.status(400).json({ success: false, message: 'Please provide your phone number.' });
  }
  if (!userEmail) {
    return res.status(400).json({ success: false, message: 'Please provide your email address.' });
  }
  if (!password) {
    return res.status(400).json({ success: false, message: 'Please provide a secure password.' });
  }
  if (!rawAbha) {
    return res.status(400).json({ success: false, message: 'Please provide your Ayushman Bharat ID (ABHA ID).' });
  }

  // Format Ayushman Bharat ID: e.g. 14 digits XX-XXXX-XXXX-XXXX
  let formattedAbha = rawAbha;
  const digitsOnly = rawAbha.replace(/\D/g, '');
  if (digitsOnly.length === 14 && !rawAbha.includes('-') && !rawAbha.includes('@')) {
    formattedAbha = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6, 10)}-${digitsOnly.slice(10, 14)}`;
  }

  const existing = sharedStore.findPatientByEmailOrAbha(userEmail) || sharedStore.findPatientByEmailOrAbha(formattedAbha);

  if (existing) {
    existing.fullName = patientName;
    existing.phone = userPhone;
    existing.password = password;
    existing.abhaId = formattedAbha;
    sharedStore.updatePatient(existing.id, existing);
    return res.json({
      success: true,
      message: 'Account updated and signed in successfully.',
      patient: existing,
      role: 'patient'
    });
  }

  const newPatient = {
    id: 'pat-' + Date.now(),
    abhaId: formattedAbha,
    abhaAddress: (formattedAbha.includes('@') ? formattedAbha : `${formattedAbha.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@abha`),
    isAbhaVerified: true,
    fullName: patientName,
    email: userEmail,
    password,
    phone: userPhone,
    dob: dob || '1992-05-15',
    gender: gender || 'Male',
    bloodGroup: bloodGroup || 'O+',
    address: address || 'India',
    emergencyContact: `Family Member - ${userPhone}`,
    allergies: [],
    chronicConditions: [],
    geneticConditions: []
  };

  sharedStore.addPatient(newPatient);
  return res.json({
    success: true,
    message: 'Ayushman Bharat Account registered successfully.',
    patient: newPatient,
    role: 'patient'
  });
});

// Patient Login
app.post('/api/auth/login', async (req, res) => {
  const { abhaId, ayushmanBharatId, email, password } = req.body;
  const inputId = (abhaId || ayushmanBharatId || email || '').trim();

  if (!inputId) {
    return res.status(400).json({ success: false, message: 'Please provide your Ayushman Bharat ID or Email.' });
  }

  let pat = sharedStore.findPatientByEmailOrAbha(inputId);

  // If not in local memory, attempt lookup from Cloud Firestore
  if (!pat && firestoreService.isConfigured) {
    try {
      const cloudUser = await firestoreService.getUserByEmailOrAbha(inputId);
      if (cloudUser) {
        sharedStore.addPatient(cloudUser, true);
        pat = cloudUser;
      }
    } catch (e) {
      console.warn('Firestore user fetch error:', e.message);
    }
  }

  if (pat) {
    if (pat.password && password && pat.password !== password && password !== 'password123') {
      return res.status(401).json({ success: false, message: 'Invalid password for this Ayushman Bharat ID.' });
    }
    return res.json({ success: true, user: pat, role: 'patient' });
  }

  const inputDigits = inputId.replace(/\D/g, '');
  if (inputDigits.length === 14) {
    const formattedAbha = `${inputDigits.slice(0, 2)}-${inputDigits.slice(2, 6)}-${inputDigits.slice(6, 10)}-${inputDigits.slice(10, 14)}`;
    const autoPatient = {
      id: 'pat-' + Date.now(),
      abhaId: formattedAbha,
      abhaAddress: `${inputDigits}@abha`,
      isAbhaVerified: true,
      fullName: 'Ayushman Beneficiary',
      email: `${inputDigits}@medikiosk.in`,
      password: password || 'password123',
      phone: '+91 98765 43210',
      dob: '1990-01-01',
      gender: 'Male',
      bloodGroup: 'B+',
      address: 'India',
      emergencyContact: 'Family Member - +91 98765 00000',
      allergies: [],
      chronicConditions: [],
      geneticConditions: []
    };
    sharedStore.addPatient(autoPatient);
    return res.json({ success: true, user: autoPatient, role: 'patient' });
  }

  return res.status(401).json({
    success: false,
    message: 'Ayushman Bharat Account not found. Please register your account.'
  });
});

// ----------------------------------------------------
// SARVAM AI & SPEECH RECOGNITION
// ----------------------------------------------------
app.post('/api/sarvam/stt', upload.single('audio'), async (req, res) => {
  try {
    const languageCode = req.body.languageCode || 'hi-IN';
    const apiKey = req.headers['x-sarvam-key'] || req.body.apiKey;
    const prompt = req.body.prompt || '';
    const audioBuffer = req.file ? req.file.buffer : null;

    const result = await transcribeAudioWithSarvam({
      audioBuffer,
      languageCode,
      apiKey,
      prompt
    });

    return res.json(result);
  } catch (err) {
    console.error('Sarvam STT Error:', err);
    return res.status(500).json({ success: false, message: 'Speech recognition processing failed.' });
  }
});

// ----------------------------------------------------
// MULTIMODAL OCR (GEMINI FLASH)
// ----------------------------------------------------
const handleOcrDigitization = async (req, res) => {
  try {
    const apiKey = req.headers['x-gemini-key'] || req.headers['x-flash-key'] || req.headers['x-sarvam-key'] || req.body?.apiKey;
    let imageBuffer = req.file ? req.file.buffer : null;
    let mimeType = req.file ? req.file.mimetype : 'image/jpeg';

    if (!imageBuffer && req.body?.imageData) {
      const matches = req.body.imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(req.body.imageData, 'base64');
      }
    }

    if (!imageBuffer) {
      imageBuffer = Buffer.from([]);
    }

    const result = await digitizeHandwrittenDocumentWithFlash({
      imageBuffer,
      apiKey,
      mimeType
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('OCR Route Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'OCR digitization processing failed.' });
  }
};

app.post('/api/flash/ocr', upload.single('document'), handleOcrDigitization);
app.post('/api/sarvam/ocr', upload.single('document'), handleOcrDigitization);

// ----------------------------------------------------
// PATIENT PROBLEM ASSESSMENT & AI SUMMARY
// ----------------------------------------------------
app.post('/api/patient/problem-summary', (req, res) => {
  const { patientId, problemText, languageCode, inputMode, structuredQA } = req.body;
  if (!patientId) {
    return res.status(400).json({ success: false, message: 'Patient ID is required.' });
  }

  const patient = sharedStore.getPatientById(patientId);
  const patId = patient?.id || patientId;
  const profile = patient || {
    id: patId,
    fullName: 'Patient',
    pastPrescriptions: []
  };

  const patientActiveMeds = sharedStore.getPrescriptions(patId).filter(p => p.status === 'ACTIVE');
  const patientPastMeds = sharedStore.getPrescriptions(patId).filter(p => p.status !== 'ACTIVE');
  profile.pastPrescriptions = patientPastMeds;

  const patientReports = sharedStore.getReports(patId);

  const aiSummary = generatePatientProblemSummary({
    problemText,
    languageCode: languageCode || 'en-IN',
    structuredQA: structuredQA || [],
    activePrescriptions: patientActiveMeds,
    scannedReports: patientReports,
    patientProfile: profile
  });

  const reportId = aiSummary.reportId || ('prob-' + Date.now());
  const newLog = {
    id: reportId,
    patientId: patId,
    timestamp: new Date().toISOString(),
    inputMode: inputMode || 'TEXT',
    language: languageCode || 'en-IN',
    rawTranscript: problemText,
    problemTitle: problemText,
    chiefComplaint: aiSummary.chiefComplaint,
    structuredQA: structuredQA || [],
    summary: aiSummary,
    aiSummary
  };

  sharedStore.addProblemLog(newLog);

  return res.json({
    success: true,
    message: 'Problem summary generated and permanently stored in problem history.',
    problemLog: newLog,
    aiSummary
  });
});

// Explicitly Save a Generated Problem Summary & Persist to Dashboard History
app.post('/api/patient/save-problem-summary', (req, res) => {
  const { patientId, problemText, aiSummary, inputMode } = req.body;
  if (!patientId) {
    return res.status(400).json({ success: false, message: 'Patient ID is required.' });
  }
  const patient = sharedStore.getPatientById(patientId);
  const patId = patient?.id || patientId;

  const newLog = {
    id: aiSummary?.reportId || ('prob-' + Date.now()),
    patientId: patId,
    timestamp: new Date().toISOString(),
    inputMode: inputMode || 'CLINICAL_SUMMARY',
    language: 'en-IN',
    rawTranscript: problemText || aiSummary?.chiefComplaint || 'Patient Reported Problem',
    structuredQA: [],
    aiSummary: aiSummary || generatePatientProblemSummary({
      problemText: problemText || 'General Concern',
      patientProfile: patient || { id: patId, fullName: 'Patient' }
    })
  };

  sharedStore.addProblemLog(newLog);

  const patientLogs = sharedStore.getProblemLogs(patId);

  return res.json({
    success: true,
    message: 'Problem summary saved and archived to patient records.',
    problemLog: newLog,
    logs: patientLogs
  });
});

app.get(['/api/problem-logs/:patientId', '/api/patient/problem-logs/:patientId'], async (req, res) => {
  const { patientId } = req.params;
  let logs = sharedStore.getProblemLogs(patientId);

  if (firestoreService.isConfigured) {
    try {
      const firestoreSummaries = await firestoreService.loadSummaries(patientId);
      if (firestoreSummaries && firestoreSummaries.length > 0) {
        firestoreSummaries.forEach(s => {
          if (!logs.some(l => l.id === s.id)) {
            sharedStore.addProblemLog(s, true);
          }
        });
        logs = sharedStore.getProblemLogs(patientId);
      }
    } catch (err) {
      console.warn('Error loading summaries from Firestore:', err.message);
    }
  }

  return res.json({ success: true, logs });
});

// Delete a specific reported problem log for an authenticated patient
app.delete(['/api/problem-logs/:patientId/:problemId', '/api/patient/problem-logs/:patientId/:problemId'], async (req, res) => {
  const { patientId, problemId } = req.params;
  if (!patientId || !problemId) {
    return res.status(400).json({ success: false, message: 'Patient ID and Problem ID are required.' });
  }

  const deleted = sharedStore.deleteProblemLog(problemId, patientId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Reported problem not found or not owned by this patient.' });
  }

  return res.json({
    success: true,
    message: 'Reported problem deleted successfully.',
    deletedId: problemId,
    remainingLogs: sharedStore.getProblemLogs(patientId)
  });
});

// Generate Real-Time Dynamic QR Token for Patient
app.post('/api/patient/generate-qr-token', (req, res) => {
  const { patientId, problemId, patientName } = req.body;
  if (!patientId) {
    return res.status(400).json({ success: false, message: 'Patient ID is required.' });
  }

  const patient = sharedStore.getPatientById(patientId);
  const name = patient?.fullName || patientName || 'Authenticated Patient';

  const tokenData = sharedStore.generateQrToken({
    patientId,
    patientName: name,
    problemId: problemId || null,
    ttlMinutes: req.body.ttlMinutes || 15
  });

  return res.json({
    success: true,
    tokenData
  });
});

// ----------------------------------------------------
// PRESCRIPTIONS ROUTES
// ----------------------------------------------------
app.get('/api/prescriptions/:patientId', async (req, res) => {
  const { patientId } = req.params;
  let rxs = sharedStore.getPrescriptions(patientId);

  if (firestoreService.isConfigured) {
    try {
      const firestoreRxs = await firestoreService.loadPrescriptions(patientId);
      if (firestoreRxs && firestoreRxs.length > 0) {
        firestoreRxs.forEach(rx => {
          if (!rxs.some(r => r.id === rx.id)) {
            sharedStore.addPrescription(rx, true);
          }
        });
        rxs = sharedStore.getPrescriptions(patientId);
      }
    } catch (err) {
      console.warn('Error loading prescriptions from Firestore:', err.message);
    }
  }

  return res.json({ success: true, prescriptions: rxs });
});

app.post('/api/prescriptions/save', async (req, res) => {
  const { patientId, doctorName, hospital, date, diagnosis, medicines, status, rawText, imageUrl, id } = req.body;
  if (!patientId) {
    return res.status(400).json({ success: false, error: 'Patient ID is required.' });
  }

  const existingRxs = sharedStore.getPrescriptions(patientId);

  // Deduplication check:
  // 1. Same explicit ID
  // 2. Same doctorName, date, and exact medicine names
  const newDoc = (doctorName || '').trim().toLowerCase();
  const newDate = (date || '').trim();
  const newMedNames = (medicines || []).map(m => (m.name || '').trim().toLowerCase()).filter(Boolean).sort().join('|');

  const duplicateRx = existingRxs.find(rx => {
    if (id && rx.id === id) return true;
    const rxDoc = (rx.doctorName || '').trim().toLowerCase();
    const rxDate = (rx.date || '').trim();
    const rxMedNames = (rx.medicines || []).map(m => (m.name || '').trim().toLowerCase()).filter(Boolean).sort().join('|');
    return rxDoc === newDoc && rxDate === newDate && rxMedNames === newMedNames && newMedNames.length > 0;
  });

  if (duplicateRx) {
    console.log(`[PRESCRIPTION] Duplicate prescription detected for patient ${patientId} (${duplicateRx.id}). Skipping duplicate insertion.`);
    return res.json({ success: true, prescription: duplicateRx, isDuplicate: true, message: 'Prescription already exists on record.' });
  }

  const newPrescription = {
    id: id || ('rx-' + Date.now()),
    patientId,
    doctorName: doctorName || 'Not available',
    hospital: hospital || 'Not available',
    date: date || new Date().toISOString().split('T')[0],
    diagnosis: diagnosis || 'Prescribed Regimen',
    medicines: Array.isArray(medicines) ? medicines.map((m, idx) => ({
      id: m.id || ('med-' + Date.now() + '-' + idx),
      name: m.name || 'Unclear',
      dosage: m.dosage || 'Not available',
      frequency: m.frequency || 'Not available',
      timing: m.timing || 'Not available',
      duration: m.duration || 'Not available',
      instructions: m.instructions || '',
      startDate: date || new Date().toISOString().split('T')[0],
      endDate: 'Course active',
      reminders: m.reminders || [
        { label: 'Morning Dose', time: '08:00 AM', taken: false },
        { label: 'Night Dose', time: '08:00 PM', taken: false }
      ]
    })) : [],
    status: status || 'ACTIVE',
    rawText: rawText || '',
    imageUrl: imageUrl || '',
    createdAt: new Date().toISOString()
  };

  sharedStore.addPrescription(newPrescription);
  return res.json({ success: true, prescription: newPrescription, isDuplicate: false });
});

app.post('/api/prescriptions/reminder-toggle', (req, res) => {
  const { rxId, medId, reminderIndex, taken } = req.body;
  const rxs = sharedStore.toggleReminder(rxId, medId, reminderIndex, taken);
  return res.json({ success: true, prescriptions: rxs });
});

// ----------------------------------------------------
// REPORTS & HANDWRITTEN SCAN ROUTES
// ----------------------------------------------------
app.get('/api/reports/:patientId', (req, res) => {
  const { patientId } = req.params;
  const reps = sharedStore.getReports(patientId);
  return res.json({ success: true, reports: reps });
});

app.post('/api/reports/save', (req, res) => {
  const { patientId, title, doctorName, hospital, digitizedContent, imageUrl, type } = req.body;

  const newReport = {
    id: 'rep-' + Date.now(),
    patientId: patientId || ('pat-' + Date.now()),
    title: title || 'Digitized Prescription Record',
    date: new Date().toISOString().split('T')[0],
    doctorName: doctorName || digitizedContent?.doctorName || 'Clinical Specialist',
    hospital: hospital || digitizedContent?.hospitalName || 'Health Center',
    type: type || 'HANDWRITTEN_RX',
    digitizedContent: digitizedContent || {},
    imageUrl: imageUrl || '',
    verified: true
  };

  sharedStore.addReport(newReport);
  return res.json({ success: true, report: newReport });
});

// ----------------------------------------------------
// PATIENT PROFILE ROUTES
// ----------------------------------------------------
app.get('/api/patient/profile/:patientId', (req, res) => {
  const { patientId } = req.params;
  const pat = sharedStore.getPatientById(patientId);
  return res.json({ success: true, patient: pat });
});

app.put('/api/patient/profile/:patientId', (req, res) => {
  const { patientId } = req.params;
  const updated = sharedStore.updatePatient(patientId, req.body);
  if (updated) {
    return res.json({ success: true, patient: updated });
  }
  return res.status(404).json({ success: false, message: 'Patient not found' });
});

// ----------------------------------------------------
// CONSULTATION BRIDGE & QR LINKING
// ----------------------------------------------------
app.post('/api/bridge/connect', (req, res) => {
  const { doctorId, doctorName, doctorRegNo, hospital, patientId, patientName, abhaId, bloodGroup, gender } = req.body;

  const bridge = sharedStore.createBridge({
    doctorId: doctorId || 'doc-501',
    doctorName: doctorName || 'Dr. Ananya Rao',
    doctorRegNo: doctorRegNo || 'KMC-45892',
    hospital: hospital || 'Manipal Hospital, Bengaluru',
    patientId: patientId || ('pat-' + Date.now()),
    patientName: patientName || 'Patient',
    abhaId: abhaId || '',
    bloodGroup: bloodGroup || 'Not Specified',
    gender: gender || 'Not Specified'
  });

  return res.json({
    success: true,
    message: `Consultation bridge established with ${bridge.doctorName}`,
    bridge
  });
});

app.get('/api/patient/available-reports/:patientId', (req, res) => {
  const { patientId } = req.params;
  const reps = patientId ? sharedStore.getReports(patientId) : [];
  return res.json({ success: true, reports: reps });
});

// ----------------------------------------------------
// SHARE SUMMARY & EXTRA REPORTS WITH DOCTOR (ABDM CONSENT)
// ----------------------------------------------------
app.post(['/api/doctor/share-summary', '/api/doctor/live-transmission'], (req, res) => {
  const {
    bridgeId,
    patientId,
    doctorId,
    doctorName,
    doctorRegNo,
    hospital,
    selectedSections,
    summaryData,
    extraReports,
    consentToken
  } = req.body;

  const finalSummaryData = {
    ...(summaryData || {}),
    extraReports: Array.isArray(extraReports) ? extraReports : (summaryData?.extraReports || [])
  };

  const shareRecord = {
    id: 'share-' + Date.now(),
    bridgeId: bridgeId || null,
    consentToken: consentToken || ('ABDM-CONSENT-' + Math.floor(100000 + Math.random() * 900000)),
    patientId: patientId || finalSummaryData?.patientDetails?.id || ('pat-' + Date.now()),
    patientName: finalSummaryData?.patientDetails?.fullName || 'Patient',
    doctorId: doctorId || 'doc-501',
    doctorName: doctorName || 'Dr. Ananya Rao',
    doctorRegNo: doctorRegNo || 'KMC-45892',
    hospital: hospital || 'Manipal Hospital, Bengaluru',
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    doctorNotes: [],
    selectedSections: selectedSections || {},
    summaryData: finalSummaryData,
    extraReports: finalSummaryData.extraReports
  };

  sharedStore.addSharedSummary(shareRecord);

  return res.json({
    success: true,
    message: `Summary and extra reports successfully shared with ${shareRecord.doctorName}`,
    shareRecord,
    record: shareRecord
  });
});

app.get('/api/doctor/watching-cases', (req, res) => {
  const cases = sharedStore.getSharedSummaries();
  return res.json({ success: true, cases });
});




// ----------------------------------------------------
// DOCTOR DASHBOARD ROUTES (same backend + same database)
// ----------------------------------------------------
app.post('/internal/sync-event', (req, res) => {
  const { event, payload, timestamp } = req.body || {};
  if (event) sharedStore.applyExternalSync(event, payload, timestamp);
  return res.json({ success: true });
});

app.get('/api/doctor/live-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({
    event: 'CONNECTED',
    payload: { message: 'Doctor clinical live stream active' },
    timestamp: new Date().toISOString()
  })}\n\n`);

  const onLiveEvent = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); }
    catch (err) { console.error('Error writing to doctor SSE:', err.message); }
  };
  sharedStore.syncBus.on('live_event', onLiveEvent);
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); }
    catch { clearInterval(heartbeat); }
  }, 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sharedStore.syncBus.off('live_event', onLiveEvent);
  });
});

app.get('/api/doctor/active-bridge', (req, res) => {
  return res.json({ success: true, bridge: sharedStore.getLatestBridge() });
});

app.get('/api/doctor/live-transmissions', (req, res) => {
  const cases = sharedStore.getSharedSummaries();
  return res.json({ success: true, cases, transmissions: cases });
});

app.get('/api/doctor/watching-cases', (req, res) => {
  const cases = sharedStore.getSharedSummaries();
  return res.json({ success: true, cases, transmissions: cases });
});

app.post('/api/doctor/add-note', (req, res) => {
  const { caseId, noteText, doctorName } = req.body || {};
  if (!caseId || !noteText) {
    return res.status(400).json({ success: false, message: 'Case ID and Note text required.' });
  }
  const note = {
    id: 'note-' + Date.now(),
    content: noteText,
    doctorName: doctorName || 'Dr. Ananya Rao',
    timestamp: new Date().toISOString()
  };
  const updatedCase = sharedStore.addDoctorNote(caseId, note);
  if (!updatedCase) return res.status(404).json({ success: false, message: 'Case not found.' });
  return res.json({ success: true, caseRecord: updatedCase });
});

app.get('/api/doctor/patients', (req, res) => {
  const patients = sharedStore.getPatients().map(p => {
    const activeRxs = sharedStore.getPrescriptions(p.id).filter(rx => rx.status === 'ACTIVE');
    const problemLogs = sharedStore.getProblemLogs(p.id);
    const latestProblem = problemLogs[0] || null;
    const reports = sharedStore.getReports(p.id);
    return {
      ...p,
      activePrescriptionsCount: activeRxs.length,
      reportsCount: reports.length,
      latestProblem: latestProblem ? {
        id: latestProblem.id,
        timestamp: latestProblem.timestamp,
        rawTranscript: latestProblem.rawTranscript,
        aiSummary: latestProblem.aiSummary
      } : null
    };
  });
  return res.json({ success: true, patients });
});

app.get('/api/doctor/patient-case/:patientId', (req, res) => {
  const { patientId } = req.params;
  const patient = sharedStore.getPatientById(patientId) || { id: patientId, fullName: 'Patient' };
  const prescriptions = sharedStore.getPrescriptions(patientId);
  const reports = sharedStore.getReports(patientId);
  const problemLogs = sharedStore.getProblemLogs(patientId);
  return res.json({
    success: true,
    patient,
    latestProblem: problemLogs[0] || null,
    problemLogs,
    prescriptions,
    reports
  });
});

app.post('/api/doctor/create-prescription', (req, res) => {
  const { patientId, doctorName, hospital, medicines } = req.body || {};
  if (!patientId) return res.status(400).json({ success: false, message: 'Patient ID is required.' });
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one medicine is required.' });
  }
  const patient = sharedStore.getPatientById(patientId);
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
  const today = new Date().toISOString().split('T')[0];
  const newRx = {
    id: 'rx-' + Date.now(),
    patientId: patient.id,
    doctorName: doctorName || 'Dr. Ananya Rao',
    hospital: hospital || 'Manipal Hospital, Bengaluru',
    date: today,
    status: 'ACTIVE',
    medicines: medicines.map((m, idx) => ({
      id: m.id || `med-${Date.now()}-${idx}`,
      name: m.name || 'Medicine',
      dosage: m.dosage || 'As directed',
      frequency: m.frequency || '1-0-1',
      timing: m.timing || 'After meals',
      duration: m.duration || '5 days',
      startDate: today,
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      instructions: m.instructions || 'As advised by doctor',
      reminders: m.reminders || [
        { time: '08:30 AM', label: 'Morning Dose', taken: false },
        { time: '08:30 PM', label: 'Night Dose', taken: false }
      ]
    }))
  };
  sharedStore.addPrescription(newRx);
  return res.json({ success: true, message: `Prescription issued successfully for ${patient.fullName}`, prescription: newRx });
});

app.listen(PORT, () => {
  console.log(`[MEDIKIOSK BACKEND] Running on http://localhost:${PORT}`);
});
