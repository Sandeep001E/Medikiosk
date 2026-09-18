import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockPatients, mockDoctors, mockPrescriptions, mockReports, mockProblemLogs } from '../data/mockDatabase.js';
import { firestoreService } from '../services/firestoreService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '..', 'data', 'persistedState.json');

class SharedStore {
  constructor() {
    this.syncBus = new EventEmitter();
    this.syncBus.setMaxListeners(200);
    this.peerPort = null;

    // Load persisted state from disk if exists, otherwise initialize from mock data
    const loaded = this.loadFromDisk();
    this.patients = Array.isArray(loaded?.patients) ? loaded.patients : [...mockPatients];
    this.doctors = Array.isArray(loaded?.doctors) && loaded.doctors.length > 0 ? loaded.doctors : [...mockDoctors];
    this.prescriptions = Array.isArray(loaded?.prescriptions) ? loaded.prescriptions : [...mockPrescriptions];
    this.reports = Array.isArray(loaded?.reports) ? loaded.reports : [...mockReports];
    this.problemLogs = Array.isArray(loaded?.problemLogs) ? loaded.problemLogs : [...mockProblemLogs];
    this.sharedSummaries = Array.isArray(loaded?.sharedSummaries) ? loaded.sharedSummaries : [];
    this.activeBridges = Array.isArray(loaded?.activeBridges) ? loaded.activeBridges : [];

    // Asynchronously bootstrap cloud records from Firestore if configured
    this.bootstrapFromFirestore();
  }

  async bootstrapFromFirestore() {
    if (firestoreService.isConfigured) {
      try {
        const cloudUsers = await firestoreService.loadAllUsers();
        if (cloudUsers.length > 0) {
          cloudUsers.forEach(u => {
            if (!this.patients.some(p => p.id === u.id)) {
              this.patients.push(u);
            }
          });
        }
        const cloudSummaries = await firestoreService.loadSharedSummaries();
        if (cloudSummaries.length > 0) {
          cloudSummaries.forEach(s => {
            if (!this.sharedSummaries.some(cs => cs.id === s.id)) {
              this.sharedSummaries.push(s);
            }
          });
        }
      } catch (err) {
        console.warn('[SHARED-STORE] Error during Firestore bootstrap:', err.message);
      }
    }
  }

  setPeerPort(port) {
    this.peerPort = port;
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read persisted state, fallback to mock DB:', err.message);
    }
    return null;
  }

  saveToDisk() {
    try {
      const data = {
        patients: this.patients,
        doctors: this.doctors,
        prescriptions: this.prescriptions,
        reports: this.reports,
        problemLogs: this.problemLogs,
        sharedSummaries: this.sharedSummaries
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not save state to disk:', err.message);
    }
  }

  // --- Patients ---
  getPatients() {
    return this.patients;
  }

  getPatientById(id) {
    return this.patients.find(p => p.id === id) || this.patients[0];
  }

  findPatientByEmailOrAbha(identifier) {
    const raw = (identifier || '').trim().toLowerCase();
    const digitsOnly = raw.replace(/\D/g, '');
    return this.patients.find(p =>
      (p.email && p.email.toLowerCase() === raw) ||
      (p.abhaId && p.abhaId.toLowerCase() === raw) ||
      (p.abhaAddress && p.abhaAddress.toLowerCase() === raw) ||
      (digitsOnly.length >= 10 && p.abhaId && p.abhaId.replace(/\D/g, '') === digitsOnly)
    );
  }

  addPatient(patient, isExternal = false) {
    if (!this.patients.some(p => p.id === patient.id)) {
      this.patients.push(patient);
      this.saveToDisk();
      firestoreService.saveUser(patient);
      if (!isExternal) {
        this.emitSync('PATIENT_REGISTERED', { patient });
      }
    }
    return patient;
  }

  updatePatient(id, data, isExternal = false) {
    const index = this.patients.findIndex(p => p.id === id);
    if (index !== -1) {
      this.patients[index] = { ...this.patients[index], ...data };
      this.saveToDisk();
      firestoreService.saveUser(this.patients[index]);
      if (!isExternal) {
        this.emitSync('PATIENT_PROFILE_UPDATED', { patient: this.patients[index], patientId: id });
      }
      return this.patients[index];
    }
    return null;
  }

  // --- Doctors ---
  getDoctors() {
    return this.doctors;
  }

  findDoctor(emailOrId) {
    const raw = (emailOrId || '').trim().toLowerCase();
    return this.doctors.find(d =>
      d.id.toLowerCase() === raw || (d.email && d.email.toLowerCase() === raw)
    ) || this.doctors[0];
  }

  addDoctor(doc) {
    this.doctors.push(doc);
    this.saveToDisk();
    return doc;
  }

  // --- Problem Logs ---
  getProblemLogs(patientId) {
    if (patientId) {
      return this.problemLogs.filter(p => p.patientId === patientId);
    }
    return this.problemLogs;
  }

  addProblemLog(log, isExternal = false) {
    if (!this.problemLogs.some(p => p.id === log.id)) {
      this.problemLogs.unshift(log);
      this.saveToDisk();
      firestoreService.saveSummary(log);
      if (!isExternal) {
        this.emitSync('PATIENT_PROBLEM_UPDATED', {
          patientId: log.patientId,
          problemLog: log,
          patientName: this.getPatientById(log.patientId)?.fullName || 'Patient'
        });
      }
    }
    return log;
  }

  deleteProblemLog(problemId, patientId, isExternal = false) {
    const index = this.problemLogs.findIndex(
      p => p.id === problemId && (!patientId || p.patientId === patientId)
    );
    if (index !== -1) {
      const removed = this.problemLogs.splice(index, 1)[0];
      this.saveToDisk();
      firestoreService.deleteSummary(problemId, patientId);
      if (!isExternal) {
        this.emitSync('PROBLEM_LOG_DELETED', {
          problemId,
          patientId: removed.patientId
        });
      }
      return removed;
    }
    return null;
  }

  // --- Prescriptions ---
  getPrescriptions(patientId) {
    if (patientId) {
      return this.prescriptions.filter(p => p.patientId === patientId);
    }
    return this.prescriptions;
  }

  addPrescription(prescription, isExternal = false) {
    if (!this.prescriptions.some(p => p.id === prescription.id)) {
      this.prescriptions.unshift(prescription);
      this.saveToDisk();
      firestoreService.savePrescription(prescription);
      if (!isExternal) {
        this.emitSync('PRESCRIPTION_ADDED', {
          patientId: prescription.patientId,
          prescription,
          doctorName: prescription.doctorName || 'Doctor'
        });
      }
    }
    return prescription;
  }

  toggleReminder(rxId, medId, reminderIndex, taken, isExternal = false) {
    const rx = this.prescriptions.find(p => p.id === rxId);
    if (rx) {
      const med = rx.medicines.find(m => m.id === medId);
      if (med && med.reminders && med.reminders[reminderIndex]) {
        med.reminders[reminderIndex].taken = taken;
        this.saveToDisk();
        if (!isExternal) {
          this.emitSync('REMINDER_TOGGLED', {
            patientId: rx.patientId,
            rxId,
            medId,
            reminderIndex,
            taken
          });
        }
      }
    }
    return this.prescriptions;
  }

  // --- Diagnostic Reports & OCR ---
  getReports(patientId) {
    if (patientId) {
      return this.reports.filter(r => r.patientId === patientId);
    }
    return this.reports;
  }

  addReport(report, isExternal = false) {
    if (!this.reports.some(r => r.id === report.id)) {
      this.reports.unshift(report);
      this.saveToDisk();
      firestoreService.saveReport(report);
      if (!isExternal) {
        this.emitSync('REPORT_DIGITIZED', {
          patientId: report.patientId,
          report,
          patientName: this.getPatientById(report.patientId)?.fullName || 'Patient'
        });
      }
    }
    return report;
  }

  // --- Consultation Bridge & QR Linking ---
  createBridge(bridgeData, isExternal = false) {
    const bridge = {
      id: bridgeData.id || ('bridge-' + Date.now()),
      doctorId: bridgeData.doctorId || 'doc-501',
      doctorName: bridgeData.doctorName || 'Dr. Ananya Rao',
      doctorRegNo: bridgeData.doctorRegNo || 'KMC-45892',
      hospital: bridgeData.hospital || 'Manipal Hospital, Bengaluru',
      patientId: bridgeData.patientId || ('pat-' + Date.now()),
      patientName: bridgeData.patientName || 'Patient',
      abhaId: bridgeData.abhaId || '',
      status: 'CONNECTED',
      connectedAt: bridgeData.connectedAt || new Date().toISOString(),
      ...bridgeData
    };

    // Keep unique by id or replace if same patient-doctor pair exists
    this.activeBridges = this.activeBridges.filter(b => b.id !== bridge.id);
    this.activeBridges.unshift(bridge);

    if (!isExternal) {
      this.emitSync('BRIDGE_CONNECTED', { bridge });
    }
    return bridge;
  }

  getActiveBridges(doctorId) {
    if (doctorId) {
      return this.activeBridges.filter(b => b.doctorId === doctorId);
    }
    return this.activeBridges;
  }

  getLatestBridge() {
    return this.activeBridges[0] || null;
  }

  // --- Shared Summaries & ABDM Consent ---
  getSharedSummaries() {
    return this.sharedSummaries;
  }

  addSharedSummary(record, isExternal = false) {
    if (!this.sharedSummaries.some(s => s.id === record.id)) {
      this.sharedSummaries.unshift(record);
      
      // Update any active bridge for this patient to DATA_TRANSMITTED
      const bridge = this.activeBridges.find(b => b.patientId === record.patientId);
      if (bridge) {
        bridge.status = 'DATA_TRANSMITTED';
        bridge.summaryRecordId = record.id;
      }

      this.saveToDisk();
      firestoreService.saveSharedSummary(record);
      if (!isExternal) {
        this.emitSync('SUMMARY_SHARED', {
          patientId: record.patientId,
          doctorId: record.doctorId,
          record
        });
      }
    }
    return record;
  }

  addDoctorNote(caseId, note, isExternal = false) {
    let caseRecord = this.sharedSummaries.find(s => s.id === caseId);
    if (caseRecord) {
      if (!caseRecord.doctorNotes) {
        caseRecord.doctorNotes = [];
      }
      caseRecord.doctorNotes.unshift(note);
      this.saveToDisk();
      firestoreService.updateDoctorNotes(caseId, caseRecord.doctorNotes);
      if (!isExternal) {
        this.emitSync('NOTE_ADDED', { caseId, note, caseRecord });
      }
      return caseRecord;
    }

    const problemRecord = this.problemLogs.find(p => p.id === caseId);
    if (problemRecord) {
      if (!problemRecord.doctorNotes) {
        problemRecord.doctorNotes = [];
      }
      problemRecord.doctorNotes.unshift(note);
      this.saveToDisk();
      if (!isExternal) {
        this.emitSync('NOTE_ADDED', { caseId, note, caseRecord: problemRecord });
      }
      return problemRecord;
    }

    return null;
  }

  // --- Dynamic QR Tokens ---
  generateQrToken({ patientId, patientName, problemId, ttlMinutes = 15 }) {
    const token = 'ABDM-QR-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const tokenData = {
      token,
      patientId,
      patientName: patientName || 'Patient',
      problemId: problemId || null,
      createdAt: new Date().toISOString(),
      expiresAt,
      claimed: false
    };
    if (!this.qrTokens) this.qrTokens = [];
    this.qrTokens.unshift(tokenData);
    firestoreService.saveQrToken(tokenData);
    return tokenData;
  }

  getQrToken(token) {
    if (!token) return null;
    if (!this.qrTokens) this.qrTokens = [];
    const found = this.qrTokens.find(t => t.token === token);
    if (found) {
      if (new Date(found.expiresAt) < new Date()) {
        return null; // Expired
      }
      return found;
    }
    return null;
  }

  // --- Apply sync event received from peer server process ---
  applyExternalSync(event, payload, timestamp) {
    switch (event) {
      case 'BRIDGE_CONNECTED':
        if (payload?.bridge) {
          this.createBridge(payload.bridge, true);
        }
        break;
      case 'NOTE_ADDED':
        if (payload?.caseId && payload?.note) {
          this.addDoctorNote(payload.caseId, payload.note, true);
        }
        break;
      case 'PRESCRIPTION_ADDED':
        if (payload?.prescription) {
          this.addPrescription(payload.prescription, true);
        }
        break;
      case 'PATIENT_PROBLEM_UPDATED':
        if (payload?.problemLog) {
          this.addProblemLog(payload.problemLog, true);
        }
        break;
      case 'PROBLEM_LOG_DELETED':
        if (payload?.problemId) {
          this.deleteProblemLog(payload.problemId, payload.patientId, true);
        }
        break;
      case 'REPORT_DIGITIZED':
        if (payload?.report) {
          this.addReport(payload.report, true);
        }
        break;
      case 'PATIENT_PROFILE_UPDATED':
        if (payload?.patientId && payload?.patient) {
          this.updatePatient(payload.patientId, payload.patient, true);
        }
        break;
      case 'REMINDER_TOGGLED':
        if (payload?.rxId) {
          this.toggleReminder(payload.rxId, payload.medId, payload.reminderIndex, payload.taken, true);
        }
        break;
      case 'SUMMARY_SHARED':
        if (payload?.record) {
          this.addSharedSummary(payload.record, true);
        }
        break;
      default:
        break;
    }

    // Broadcast to local SSE clients
    const eventData = {
      event,
      payload,
      timestamp: timestamp || new Date().toISOString()
    };
    this.syncBus.emit('live_event', eventData);
    this.syncBus.emit(event, payload);
  }

  // --- Real-Time Event Broadcast to Local SSE & Peer Server Process ---
  emitSync(event, payload) {
    const timestamp = new Date().toISOString();
    const eventData = {
      event,
      payload,
      timestamp
    };

    // 1. Emit locally to all SSE clients connected to this process
    this.syncBus.emit('live_event', eventData);
    this.syncBus.emit(event, payload);

    // 2. Notify peer server process via HTTP
    if (this.peerPort) {
      fetch(`http://127.0.0.1:${this.peerPort}/internal/sync-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      }).catch(err => {
        console.warn(`[SYNC] Failed to notify peer on ${this.peerPort}:`, err.message);
      });
    }
  }

  onSync(event, callback) {
    this.syncBus.on(event, callback);
  }

  offSync(event, callback) {
    this.syncBus.off(event, callback);
  }
}

export const sharedStore = new SharedStore();
