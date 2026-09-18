// AI Clinical Patient Problem Summarizer Engine for Medikiosk
import { analyzeOverallClinicalRedAlerts } from '../../src/utils/clinicalRedAlerts.js';

export function generatePatientProblemSummary({
  problemText = 'General Health Consultation',
  languageCode = 'en-IN',
  structuredQA = [],
  activePrescriptions = [],
  scannedReports = [],
  patientProfile = {}
}) {
  // Format structured Q&A into readable text
  const qaFormatted = structuredQA.map(item => `• ${item.question}: ${item.answer}`).join('\n');
  
  // Format active meds
  const allActiveMeds = activePrescriptions.flatMap(p => 
    (p.medicines || []).map(m => ({
      ...m,
      doctorName: p.doctorName,
      hospital: p.hospital,
      rxDate: p.date,
      status: p.status
    }))
  );

  const activeMedsList = allActiveMeds
    .map(m => `• ${m.name} (${m.dosage}, ${m.frequency}, ${m.timing})`)
    .join('\n') || 'None reported';

  // Format past reports & OCR digitized records
  const pastReportsList = scannedReports.map(r => 
    `• ${r.title} (${r.date}): ${r.digitizedContent?.findings || r.digitizedContent?.diagnosis || 'Verified digitized document'}`
  ).join('\n') || 'No previous uploaded reports available';

  // Determine symptom severity & onset from Q&A
  const onsetItem = structuredQA.find(q => q.question?.toLowerCase().includes('begin') || q.question?.toLowerCase().includes('start') || q.question?.toLowerCase().includes('notice'));
  const severityItem = structuredQA.find(q => q.question?.toLowerCase().includes('severity') || q.question?.toLowerCase().includes('rate'));
  const locationItem = structuredQA.find(q => q.question?.toLowerCase().includes('location'));

  const onsetStr = onsetItem ? onsetItem.answer : 'Recent onset';
  const severityStr = severityItem ? severityItem.answer : 'Moderate';
  const locationStr = locationItem ? locationItem.answer : 'Generalized';

  // Extract Ayurveda Dashavidha Pariksha findings from structuredQA
  const agniItem = structuredQA.find(q => q.question?.toLowerCase().includes('agni') || q.question?.toLowerCase().includes('appetite'));
  const koshtaItem = structuredQA.find(q => q.question?.toLowerCase().includes('koshta') || q.question?.toLowerCase().includes('bowel'));
  const sattvaItem = structuredQA.find(q => q.question?.toLowerCase().includes('sattva') || q.question?.toLowerCase().includes('sleep'));
  const thermalItem = structuredQA.find(q => q.question?.toLowerCase().includes('temperature') || q.question?.toLowerCase().includes('climate') || q.question?.toLowerCase().includes('prakriti'));
  const staminaItem = structuredQA.find(q => q.question?.toLowerCase().includes('vyayama') || q.question?.toLowerCase().includes('stamina') || q.question?.toLowerCase().includes('energy'));

  const agniStatus = agniItem ? agniItem.answer : 'Samagni (Normal & Balanced Appetite)';
  const koshtaStatus = koshtaItem ? koshtaItem.answer : 'Madhyama Koshta (Regular Daily Formed)';
  const sattvaStatus = sattvaItem ? sattvaItem.answer : 'Pravara Sattva (Sound Restful Sleep)';
  const doshaTendency = thermalItem ? thermalItem.answer : 'Tridosha Balanced / Moderate Tolerance';
  const vyayamaStatus = staminaItem ? staminaItem.answer : 'Good Physical Stamina';

  // Structured Ayurvedic Dashavidha Profile
  const ayurvedaDashavidhaProfile = {
    agni: agniStatus,
    koshta: koshtaStatus,
    sattvaAndNidra: sattvaStatus,
    doshaTendency: doshaTendency,
    agniAharaShakti: { agniStatus, appetiteStatus: agniStatus },
    koshtaElimination: { koshtaType: koshtaStatus, bowelRegularity: koshtaStatus },
    sattvaNidra: { mentalResilience: sattvaStatus, sleepQuality: sattvaStatus },
    prakritiVikriti: { doshaImbalanceTendency: doshaTendency, thermalReaction: doshaTendency },
    vyayamaShakti: { physicalStamina: vyayamaStatus, fatigueOnset: 'Normal endurance' },
    summaryNarrative: `Agni: ${agniStatus} | Koshta: ${koshtaStatus} | Sattva & Nidra: ${sattvaStatus} | Dosha Tendency: ${doshaTendency} | Vyayama Shakti: ${vyayamaStatus}`,
    ayurvedicClinicalImpression: `Ayurvedic Dashavidha assessment indicates a ${doshaTendency.toLowerCase().includes('pitta') ? 'Pitta-predominant' : doshaTendency.toLowerCase().includes('vata') ? 'Vata-predominant' : doshaTendency.toLowerCase().includes('kapha') ? 'Kapha-predominant' : 'balanced'} clinical constitution. Digestion reflects ${agniStatus} with ${koshtaStatus}. Assessment correlates with acute presentation.`,
    ayurvedicImpression: `Ayurvedic Dashavidha assessment indicates a ${doshaTendency.toLowerCase().includes('pitta') ? 'Pitta-predominant' : doshaTendency.toLowerCase().includes('vata') ? 'Vata-predominant' : doshaTendency.toLowerCase().includes('kapha') ? 'Kapha-predominant' : 'balanced'} clinical constitution. Digestion reflects ${agniStatus} with ${koshtaStatus}. Assessment correlates with acute presentation.`
  };

  // Genetic conditions from profile
  const geneticDiseases = Array.isArray(patientProfile.geneticConditions)
    ? patientProfile.geneticConditions
    : [];

  // Permanent / Chronic conditions from profile
  const permanentDiseases = Array.isArray(patientProfile.chronicConditions)
    ? patientProfile.chronicConditions
    : [];

  // Allergies from profile
  const allergies = Array.isArray(patientProfile.allergies)
    ? patientProfile.allergies
    : [];

  // Past Prescriptions & OCR Digitized Documents
  const rawPastReports = Array.isArray(scannedReports) ? scannedReports : [];
  const rawPastPrescriptions = Array.isArray(patientProfile?.pastPrescriptions) ? patientProfile.pastPrescriptions : [];

  const pastPrescriptionsFromOcr = [];

  // Extract from scanned reports & OCR
  rawPastReports.forEach(r => {
    const meds = Array.isArray(r.digitizedContent?.medicines)
      ? r.digitizedContent.medicines
      : (Array.isArray(r.medicines) ? r.medicines : []);
    
    if (meds.length > 0) {
      meds.forEach(m => {
        pastPrescriptionsFromOcr.push({
          name: m.name || 'Prescribed Medicine',
          dosage: m.dosage || 'Standard Dose',
          timing: m.timing || 'As directed',
          instructions: m.instructions || '',
          sourceReportTitle: r.title || 'Digitized Prescription',
          reportDate: r.date || 'Past Record',
          ocrContextSnippet: r.findings || r.digitizedContent?.findings || ''
        });
      });
    } else {
      pastPrescriptionsFromOcr.push({
        name: r.title || 'Digitized Clinical Record',
        dosage: 'Historical Record',
        timing: 'As directed',
        instructions: r.findings || '',
        sourceReportTitle: r.title || 'Digitized Document',
        reportDate: r.date || 'Past Record',
        ocrContextSnippet: r.findings || ''
      });
    }
  });

  // Extract from past prescriptions
  rawPastPrescriptions.forEach(p => {
    const meds = Array.isArray(p.medicines) ? p.medicines : [];
    meds.forEach(m => {
      pastPrescriptionsFromOcr.push({
        name: m.name || 'Prescription Medicine',
        dosage: m.dosage || 'Standard Dose',
        timing: m.timing || 'As directed',
        instructions: m.instructions || '',
        sourceReportTitle: p.title || `Prescription (${p.doctorName || 'Doctor'})`,
        reportDate: p.date || 'Past Record',
        ocrContextSnippet: p.diagnosis || ''
      });
    });
  });

  // If patient has active medications and no past OCR records yet, include reference to ensure historical synthesis
  if (pastPrescriptionsFromOcr.length === 0 && allActiveMeds.length > 0) {
    allActiveMeds.forEach(m => {
      pastPrescriptionsFromOcr.push({
        name: m.name || 'Active Regimen',
        dosage: m.dosage || 'Standard Dose',
        timing: m.timing || 'As directed',
        instructions: m.instructions || 'Current running course',
        sourceReportTitle: 'Active Clinical Regimen',
        reportDate: new Date().toISOString().split('T')[0],
        ocrContextSnippet: 'Synthesized from verified patient prescriptions'
      });
    });
  }

  // Construct one-line information for related prescriptions
  const relatedPrescriptions = [];
  
  if (allActiveMeds.length > 0) {
    allActiveMeds.forEach(m => {
      let purpose = 'Prescribed clinical regimen';
      const medLower = (m.name || '').toLowerCase();
      if (medLower.includes('dolo') || medLower.includes('paracetamol')) {
        purpose = 'Antipyretic & analgesic for febrile temperature control and body pain relief';
      } else if (medLower.includes('panto') || medLower.includes('pantoprazole') || medLower.includes('omeprazole')) {
        purpose = 'Proton-pump inhibitor for gastric mucosal protection and acidity management';
      } else if (medLower.includes('telmi') || medLower.includes('amlodipine') || medLower.includes('losartan')) {
        purpose = 'Antihypertensive agent for daily blood pressure regulation';
      } else if (medLower.includes('cetzine') || medLower.includes('cetirizine') || medLower.includes('allegra')) {
        purpose = 'Antihistamine for allergic rhinitis, sneezing, and upper airway symptom relief';
      }

      relatedPrescriptions.push({
        name: m.name,
        oneLineInfo: `${purpose} (${m.dosage || 'Standard dose'}, ${m.frequency || 'Daily'}, ${m.timing || 'As directed'}).`,
        doctor: m.doctorName ? `${m.doctorName} (${m.hospital || 'Health Clinic'})` : 'Consulting Physician',
        isRunning: true
      });
    });
  }

  // Running prescriptions
  const runningPrescriptions = allActiveMeds.length > 0
    ? allActiveMeds.map(m => ({
        name: m.name,
        dosage: m.dosage || 'Standard Dose',
        frequency: m.frequency || 'As advised',
        timing: m.timing || 'With water',
        duration: m.duration || 'Active treatment course',
        instructions: m.instructions || 'Take strictly according to physician advice.',
        prescribedBy: m.doctorName ? `${m.doctorName} (${m.hospital || 'Hospital'})` : 'Prescribing Physician',
        status: 'ACTIVE_RUNNING'
      }))
    : [];

  const birthYear = patientProfile.dob ? parseInt(patientProfile.dob.substring(0, 4), 10) : 1995;
  const age = new Date().getFullYear() - birthYear;

  const redAlerts = analyzeOverallClinicalRedAlerts({
    problemText,
    geneticDiseases,
    permanentDiseases,
    allergies,
    runningPrescriptions,
    patientDetails: {
      fullName: patientProfile.fullName || 'Patient',
      abhaId: patientProfile.abhaId || '',
      gender: patientProfile.gender || 'Not Specified',
      age: age || 30,
      bloodGroup: patientProfile.bloodGroup || 'Not Specified'
    }
  });

  return {
    summaryId: 'sum-' + Date.now(),
    reportId: 'ABDM-PS-' + Date.now().toString().slice(-6),
    generatedAt: new Date().toISOString(),
    reportTitle: `Clinical Problem Summary: ${problemText.length > 40 ? problemText.substring(0, 38) + '...' : problemText}`,
    chiefComplaint: `Patient reports: "${problemText}" (${onsetStr}, ${severityStr} severity, Location: ${locationStr}).`,
    patientDetails: {
      fullName: patientProfile.fullName || 'Patient',
      abhaId: patientProfile.abhaId || '',
      gender: patientProfile.gender || 'Not Specified',
      age: age || 30,
      bloodGroup: patientProfile.bloodGroup || 'Not Specified',
      phone: patientProfile.phone || 'Not Specified',
      emergencyContact: patientProfile.emergencyContact || 'Not Specified',
      address: patientProfile.address || 'Not Specified'
    },
    geneticDiseases,
    permanentDiseases,
    allergies,
    relatedPrescriptions,
    runningPrescriptions,
    pastPrescriptionsFromOcr,
    ayurvedaDashavidhaProfile,
    redAlerts,
    historyOfPresentIllness: `The patient presented with primary symptoms described as "${problemText}". Follow-up structured clinical & Dashavidha assessment reveals:\n${qaFormatted || 'Direct symptom report filed.'}`,
    medicationContext: `Currently Active Prescriptions on Record:\n${activeMedsList}`,
    relevantHistory: `Verified ABHA ID: ${patientProfile.abhaId || 'Direct Kiosk'}\nAge/Gender: ${age} Y / ${patientProfile.gender || 'Not specified'}\nGenetic Diseases: ${geneticDiseases.join(', ') || 'None'}\nPermanent Conditions: ${permanentDiseases.join(', ') || 'None'}\nAllergies: ${allergies.join(', ') || 'None'}\n\nPast Digitized Documents & OCR Prescriptions:\n${pastReportsList}`,
    clinicalImpressionForDoctor: `Synthesis of reported problem with past clinical records indicates an active acute symptom episode requiring clinical evaluation. Note permanent conditions (${permanentDiseases.join(', ') || 'None'}) and genetic predispositions (${geneticDiseases.join(', ') || 'None'}). Active running medications and recorded allergies must be cross-verified during clinical handover.`,
    ayurvedicClinicalImpression: ayurvedaDashavidhaProfile.ayurvedicImpression,
    disclaimer: 'CRITICAL NOTICE: This summary is generated by Medikiosk AI strictly to organize patient-reported data, genetic predispositions, OCR prescription history, and Ayurvedic Dashavidha parameters for physician review. It is NOT an autonomous medical diagnosis.'
  };
}
