// Google Cloud Firestore Integration Service for MediKiosk
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

class FirestoreService {
  constructor() {
    this.isConfigured = false;
    this.db = null;
    this.app = null;
    this.projectId = null;

    this.init();
  }

  init() {
    const apiKey = process.env.FIREBASE_API_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (apiKey && projectId && projectId.trim() !== '') {
      try {
        const firebaseConfig = {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
          projectId: projectId,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
          appId: process.env.FIREBASE_APP_ID || ''
        };

        const existingApps = getApps();
        this.app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig, 'medikiosk-firestore');
        this.db = getFirestore(this.app);
        this.projectId = projectId;
        this.isConfigured = true;
        console.log(`[FIRESTORE] Connected to Firebase Project: ${projectId}`);
      } catch (err) {
        console.error('[FIRESTORE] Initialization error:', err.message);
        this.isConfigured = false;
      }
    } else {
      console.log('[FIRESTORE] Firebase credentials not configured in .env (Running in local persistence mode)');
      this.isConfigured = false;
    }
  }

  getStatus() {
    return {
      connected: this.isConfigured,
      projectId: this.projectId || null,
      collections: ['users', 'summaries', 'reportedProblems', 'reports', 'sharedSummaries', 'doctorSubmissions', 'prescriptions', 'medications', 'qrTokens', 'qrSessions'],
      message: this.isConfigured
        ? `Connected to Firestore project ${this.projectId}`
        : 'Firebase not configured in .env. Operating with local fallback.'
    };
  }

  // --- Users & Authentication Credentials ---
  async saveUser(user) {
    if (!this.isConfigured || !user || !user.id) return null;
    try {
      const docRef = doc(this.db, 'users', user.id);
      const payload = {
        id: user.id,
        abhaId: user.abhaId || '',
        abhaAddress: user.abhaAddress || '',
        fullName: user.fullName || 'Ayushman Beneficiary',
        email: user.email || '',
        password: user.password || '',
        phone: user.phone || '',
        dob: user.dob || '',
        gender: user.gender || 'Not Specified',
        bloodGroup: user.bloodGroup || 'Not Specified',
        address: user.address || '',
        emergencyContact: user.emergencyContact || '',
        allergies: user.allergies || [],
        chronicConditions: user.chronicConditions || [],
        geneticConditions: user.geneticConditions || [],
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`[FIRESTORE] Saved user: ${user.fullName} (${user.id}) to 'users' collection`);
      return payload;
    } catch (err) {
      console.warn('[FIRESTORE] Error saving user:', err.message);
      return null;
    }
  }

  async getUserByEmailOrAbha(identifier) {
    if (!this.isConfigured || !identifier) return null;
    try {
      const raw = identifier.trim().toLowerCase();

      // Check by email
      const qEmail = query(collection(this.db, 'users'), where('email', '==', raw));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        return emailSnap.docs[0].data();
      }

      // Check by abhaId
      const qAbha = query(collection(this.db, 'users'), where('abhaId', '==', identifier.trim()));
      const abhaSnap = await getDocs(qAbha);
      if (!abhaSnap.empty) {
        return abhaSnap.docs[0].data();
      }

      return null;
    } catch (err) {
      console.warn('[FIRESTORE] Error fetching user:', err.message);
      return null;
    }
  }

  async loadAllUsers() {
    if (!this.isConfigured) return [];
    try {
      const snap = await getDocs(collection(this.db, 'users'));
      const list = [];
      snap.forEach(docSnap => list.push(docSnap.data()));
      console.log(`[FIRESTORE] Loaded ${list.length} users from Firestore`);
      return list;
    } catch (err) {
      console.warn('[FIRESTORE] Error loading all users:', err.message);
      return [];
    }
  }

  // --- Clinical Problem Summaries ---
  async saveSummary(problemLog) {
    if (!this.isConfigured || !problemLog || !problemLog.id) return null;
    try {
      const docRef = doc(this.db, 'summaries', problemLog.id);
      const payload = {
        id: problemLog.id,
        patientId: problemLog.patientId,
        timestamp: problemLog.timestamp || new Date().toISOString(),
        inputMode: problemLog.inputMode || 'TEXT',
        language: problemLog.language || 'en-IN',
        rawTranscript: problemLog.rawTranscript || '',
        aiSummary: problemLog.aiSummary || {},
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`[FIRESTORE] Saved summary: ${problemLog.id} to 'summaries' collection`);
      return payload;
    } catch (err) {
      console.warn('[FIRESTORE] Error saving summary:', err.message);
      return null;
    }
  }

  async loadSummaries(patientId) {
    if (!this.isConfigured) return [];
    try {
      let q;
      if (patientId) {
        q = query(collection(this.db, 'summaries'), where('patientId', '==', patientId));
      } else {
        q = collection(this.db, 'summaries');
      }
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(docSnap => list.push(docSnap.data()));
      return list;
    } catch (err) {
      console.warn('[FIRESTORE] Error loading summaries:', err.message);
      return [];
    }
  }

  async loadSharedSummaries() {
    return this.loadSummaries();
  }

  async deleteSummary(summaryId, patientId) {
    if (!this.isConfigured || !summaryId) return false;
    try {
      const docRef = doc(this.db, 'summaries', summaryId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (patientId && data.patientId && data.patientId !== patientId) {
          console.warn(`[FIRESTORE] Unauthorized delete attempt for summary ${summaryId} by patient ${patientId}`);
          return false;
        }
        await deleteDoc(docRef);
        console.log(`[FIRESTORE] Deleted summary: ${summaryId} from 'summaries' collection`);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[FIRESTORE] Error deleting summary:', err.message);
      return false;
    }
  }

  // --- Diagnostic Reports & Scans ---
  async saveReport(report) {
    if (!this.isConfigured || !report || !report.id) return null;
    try {
      const docRef = doc(this.db, 'reports', report.id);
      const payload = {
        id: report.id,
        patientId: report.patientId,
        title: report.title || 'Diagnostic Report',
        date: report.date || new Date().toISOString().split('T')[0],
        doctorName: report.doctorName || '',
        hospital: report.hospital || '',
        type: report.type || 'REPORT',
        digitizedContent: report.digitizedContent || {},
        imageUrl: report.imageUrl || '',
        verified: report.verified ?? true,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`[FIRESTORE] Saved report: ${report.title} (${report.id}) to 'reports' collection`);
      return payload;
    } catch (err) {
      console.warn('[FIRESTORE] Error saving report:', err.message);
      return null;
    }
  }

  async loadReports(patientId) {
    if (!this.isConfigured) return [];
    try {
      let q;
      if (patientId) {
        q = query(collection(this.db, 'reports'), where('patientId', '==', patientId));
      } else {
        q = collection(this.db, 'reports');
      }
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(docSnap => list.push(docSnap.data()));
      return list;
    } catch (err) {
      console.warn('[FIRESTORE] Error loading reports:', err.message);
      return [];
    }
  }

  // --- Consultation Bridge & Shared Summaries ---
  async saveSharedSummary(shareRecord) {
    if (!this.isConfigured || !shareRecord || !shareRecord.id) return null;
    try {
      const docRef = doc(this.db, 'sharedSummaries', shareRecord.id);
      const payload = {
        ...shareRecord,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`[FIRESTORE] Saved consultation case: ${shareRecord.id} to 'sharedSummaries' collection`);
      return payload;
    } catch (err) {
      console.warn('[FIRESTORE] Error saving shared summary:', err.message);
      return null;
    }
  }

  async loadSharedSummaries() {
    if (!this.isConfigured) return [];
    try {
      const snap = await getDocs(collection(this.db, 'sharedSummaries'));
      const list = [];
      snap.forEach(docSnap => list.push(docSnap.data()));
      console.log(`[FIRESTORE] Loaded ${list.length} shared summaries from Firestore`);
      return list;
    } catch (err) {
      console.warn('[FIRESTORE] Error loading shared summaries:', err.message);
      return [];
    }
  }

  async updateDoctorNotes(caseId, doctorNotes) {
    if (!this.isConfigured || !caseId) return null;
    try {
      const docRef = doc(this.db, 'sharedSummaries', caseId);
      await updateDoc(docRef, {
        doctorNotes: doctorNotes || [],
        updatedAt: new Date().toISOString()
      });
      console.log(`[FIRESTORE] Updated doctor notes on case ${caseId}`);
      return true;
    } catch (err) {
      console.warn('[FIRESTORE] Error updating doctor notes:', err.message);
      return false;
    }
  }

  // --- Prescriptions ---
  async savePrescription(prescription) {
    if (!this.isConfigured || !prescription || !prescription.id) return null;
    try {
      const docRef = doc(this.db, 'prescriptions', prescription.id);
      const payload = {
        id: prescription.id,
        patientId: prescription.patientId,
        doctorName: prescription.doctorName || 'Not available',
        hospital: prescription.hospital || 'Not available',
        date: prescription.date || new Date().toISOString().split('T')[0],
        diagnosis: prescription.diagnosis || 'Prescribed Regimen',
        medicines: prescription.medicines || [],
        status: prescription.status || 'ACTIVE',
        rawText: prescription.rawText || '',
        imageUrl: prescription.imageUrl || '',
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`[FIRESTORE] Saved prescription: ${prescription.id} (${prescription.doctorName}) to 'prescriptions' collection`);
      return payload;
    } catch (err) {
      console.warn('[FIRESTORE] Error saving prescription:', err.message);
      return null;
    }
  }

  async loadPrescriptions(patientId) {
    if (!this.isConfigured) return [];
    try {
      let q;
      if (patientId) {
        q = query(collection(this.db, 'prescriptions'), where('patientId', '==', patientId));
      } else {
        q = collection(this.db, 'prescriptions');
      }
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(docSnap => list.push(docSnap.data()));
      console.log(`[FIRESTORE] Loaded ${list.length} prescriptions from Firestore`);
      return list;
    } catch (err) {
      console.warn('[FIRESTORE] Error loading prescriptions:', err.message);
      return [];
    }
  }

  // --- QR Tokens & Consultation Sessions ---
  async saveQrToken(tokenData) {
    if (!this.isConfigured || !tokenData || !tokenData.token) return null;
    try {
      const docRef = doc(this.db, 'qrTokens', tokenData.token);
      await setDoc(docRef, { ...tokenData, updatedAt: new Date().toISOString() }, { merge: true });
      return tokenData;
    } catch (err) {
      console.warn('[FIRESTORE] Error saving QR token:', err.message);
      return null;
    }
  }

  async loadQrToken(token) {
    if (!this.isConfigured || !token) return null;
    try {
      const docRef = doc(this.db, 'qrTokens', token);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.warn('[FIRESTORE] Error loading QR token:', err.message);
      return null;
    }
  }
}

export const firestoreService = new FirestoreService();
