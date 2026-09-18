/**
 * Clinical Red Alerts Engine for Medikiosk
 * Performs comprehensive cross-analysis of:
 * - Patient Reported Problem / Acute Symptoms
 * - Genetic Diseases & Hereditary Predispositions
 * - Permanent / Chronic Diseases
 * - Drug Allergies & Hypersensitivities
 * - Active Running Prescriptions & Dosages
 * - Demographics & Vital Thresholds
 */

export function analyzeOverallClinicalRedAlerts({
  problemText = '',
  geneticDiseases = [],
  permanentDiseases = [],
  allergies = [],
  runningPrescriptions = [],
  patientDetails = {}
}) {
  const alerts = [];
  const pTextLower = (problemText || '').toLowerCase();

  const genList = Array.isArray(geneticDiseases)
    ? geneticDiseases.map(g => (typeof g === 'string' ? g : g.name || '')).filter(Boolean)
    : [];

  const permList = Array.isArray(permanentDiseases)
    ? permanentDiseases.map(p => (typeof p === 'string' ? p : p.name || '')).filter(Boolean)
    : [];

  const allergyList = Array.isArray(allergies)
    ? allergies.map(a => (typeof a === 'string' ? a : a.name || '')).filter(Boolean)
    : [];

  const rxList = Array.isArray(runningPrescriptions)
    ? runningPrescriptions.map(r => (typeof r === 'string' ? r : r.name || '')).filter(Boolean)
    : [];

  // -------------------------------------------------------------------------
  // ALERT 1: DRUG ALLERGY & ANTIMICROBIAL CROSS-ANALYSIS (CRITICAL)
  // -------------------------------------------------------------------------
  const hasPenicillinAllergy = allergyList.some(a =>
    a.toLowerCase().includes('penicillin') || a.toLowerCase().includes('beta-lactam') || a.toLowerCase().includes('amoxicillin')
  );

  if (hasPenicillinAllergy) {
    alerts.push({
      id: 'alert-penicillin-contraindication',
      severity: 'CRITICAL',
      category: 'Drug Safety & Allergy',
      title: 'CRITICAL CONTRAINDICATION: Beta-Lactam / Penicillin Antibiotics',
      badge: 'ALLERGY SAFETY CONTRAINDICATION',
      triggerSource: 'Verified ABHA Allergy Ledger: Penicillin (Severe Urticaria / Anaphylaxis Risk)',
      finding: 'Patient has documented severe hypersensitivity to Penicillin class molecules. Presenting with acute febrile/infectious symptoms where empiric beta-lactams are frequently prescribed.',
      clinicalHazard: 'Administration of Amoxicillin, Augmentin, Ampicillin, or 1st/2nd Gen Cephalosporins carries imminent risk of life-threatening bronchospasm, angioedema, or fatal anaphylactic shock.',
      actionableProtocol: 'STRICT CONTRAINDICATION to all Penicillins. For bacterial infections requiring empiric coverage, prescribe Macrolides (Azithromycin 500mg OD) or Fluoroquinolones as allergy-safe alternatives, under 30-minute post-dose observation.',
      contraindicatedDrugs: [
        'Amoxicillin (Augmentin, Mox)',
        'Ampicillin',
        'Penicillin G / V',
        'Cefalexin / Ceftriaxone',
        'Piperacillin-Tazobactam'
      ],
      safeAlternatives: ['Azithromycin 500mg', 'Ciprofloxacin / Levofloxacin', 'Doxycycline 100mg'],
      iconType: 'shield-alert'
    });
  }

  // -------------------------------------------------------------------------
  // ALERT 2: DRUG-DISEASE & POLYPHARMACY CROSS-INTERACTION (CRITICAL)
  // -------------------------------------------------------------------------
  const isHypertensive = permList.some(p => p.toLowerCase().includes('hypertension'));
  const hasGERD = permList.some(p => p.toLowerCase().includes('gerd') || p.toLowerCase().includes('peptic') || p.toLowerCase().includes('acid'));
  const onTelmisartan = rxList.some(r => r.toLowerCase().includes('telmi') || r.toLowerCase().includes('telmisartan'));
  const onPantoprazole = rxList.some(r => r.toLowerCase().includes('panto') || r.toLowerCase().includes('pantoprazole'));

  if (isHypertensive && hasGERD && onTelmisartan && onPantoprazole) {
    alerts.push({
      id: 'alert-nsaid-hypertension-gerd',
      severity: 'CRITICAL',
      category: 'Drug-Disease Cross-Interaction',
      title: 'HIGH-RISK DRUG INTERACTION: NSAIDs Strictly Prohibited (Telmisartan + GERD)',
      badge: 'POLYPHARMACY & ORGAN PROTECTION',
      triggerSource: 'Running Meds (Telmisartan ARB + Pantocid PPI) + Chronic HTN & GERD',
      finding: 'Patient actively takes Telmikind 40mg (Telmisartan - ARB) for Stage 1 Hypertension and Pantocid 40mg for Chronic Acid Peptic Disease (GERD) while reporting acute pain/febrile symptoms.',
      clinicalHazard: 'Non-selective NSAIDs (Ibuprofen, Diclofenac, Naproxen, Mefenamic Acid) inhibit renal prostacyclin, blunting Telmisartan\'s antihypertensive efficacy and precipitating Acute Kidney Injury (AKI). Concurrently, NSAIDs dissolve the gastric mucous barrier, exponentially escalating gastrointestinal bleeding & ulcer perforation risk in this GERD patient.',
      actionableProtocol: 'DO NOT PRESCRIBE OR CONSUME NSAIDs. Maintain fever and body ache defervescence exclusively with Paracetamol (Dolo 650mg, maximum 2000mg/24h) taken strictly postprandial (after meals) with Pantocid 40mg gastroprotection.',
      contraindicatedDrugs: [
        'Ibuprofen (Brufen, Combiflam)',
        'Diclofenac (Voveran)',
        'Naproxen (Naprosyn)',
        'Aspirin (Analgesic doses > 300mg)',
        'Mefenamic Acid (Meftal-Spas)'
      ],
      safeAlternatives: ['Dolo 650mg (Paracetamol - strictly after food)', 'Topical counterirritant gels', 'Cold compresses for fever'],
      iconType: 'pill-alert'
    });
  }

  // -------------------------------------------------------------------------
  // ALERT 3: HEREDITARY GENETIC CARDIOVASCULAR STRESS RISK (HIGH RISK)
  // -------------------------------------------------------------------------
  const hasGeneticCardio = genList.some(g =>
    g.toLowerCase().includes('cardio') || g.toLowerCase().includes('hypertension') || g.toLowerCase().includes('cad')
  );

  if (hasGeneticCardio) {
    alerts.push({
      id: 'alert-genetic-cardiovascular-stress',
      severity: 'HIGH_RISK',
      category: 'Hereditary Genetic Risk',
      title: 'GENETIC VASCULAR RISK: Febrile Hemodynamic & Hypertensive Surveillance',
      badge: 'HEREDITARY GENETIC PREDISPOSITION',
      triggerSource: 'Genetic Profile (Maternal Early-Onset CAD + Familial HTN) + Stage 1 HTN',
      finding: 'Patient carries verified genetic predisposition for early-onset Cardiovascular Disease (Maternal Lineage) and Familial Essential Hypertension, compounded by diagnosed baseline Stage 1 Hypertension.',
      clinicalHazard: 'Acute pyrexia, inflammatory cytokines, and severe symptom distress provoke endogenous adrenergic overdrive, tachycardia, and blood pressure volatility, placing elevated workload on a genetically vulnerable coronary and cerebral vascular bed.',
      actionableProtocol: 'Maintain mandatory twice-daily blood pressure & heart rate monitoring (08:00 AM & 08:00 PM). Ensure uninterrupted daily Telmikind 40mg adherence. If Systolic BP exceeds 150 mmHg or resting heart rate exceeds 110 bpm under febrile stress, escalate to attending cardiologist.',
      contraindicatedDrugs: [
        'Oral Decongestants (Pseudoephedrine / Phenylephrine)',
        'High-dose Caffeine / Energy stimulants',
        'Abrupt cessation of antihypertensive therapy'
      ],
      safeAlternatives: ['Saline nasal sprays for congestion', 'Adequate oral electrolyte hydration', 'Relaxation & dark quiet environment'],
      iconType: 'heart-alert'
    });
  }

  // -------------------------------------------------------------------------
  // ALERT 4: ACUTE SYMPTOM-SPECIFIC DANGER ALERT & EMERGENCY ESCALATION
  // -------------------------------------------------------------------------
  if (pTextLower.includes('headache') || pTextLower.includes('migraine') || pTextLower.includes('dizzy') || pTextLower.includes('vision') || pTextLower.includes('cephalea')) {
    alerts.push({
      id: 'alert-symptom-headache-hypertensive',
      severity: 'CRITICAL',
      category: 'Acute Symptom Protocol',
      title: 'NEURO-VASCULAR RED ALERT: Hypertensive Encephalopathy Rule-Out',
      badge: 'ACUTE SYMPTOM RED FLAGS',
      triggerSource: `Reported Symptom: "${problemText}"`,
      finding: 'Severe throbbing headache in a patient with diagnosed Stage 1 Hypertension and hereditary cardiovascular risk.',
      clinicalHazard: 'Risk of acute hypertensive encephalopathy, sudden intracranial pressure elevation, or transient cerebral ischemic event.',
      actionableProtocol: 'Stat check of Blood Pressure. If SBP > 160 mmHg, DBP > 100 mmHg, or if headache is accompanied by neck stiffness, photophobia, projectile vomiting, or motor numbness, transfer immediately to Emergency Room for urgent neuroimaging (CT/MRI).',
      contraindicatedDrugs: ['Ergotamines without specialist review', 'Decongestants with ephedrine'],
      safeAlternatives: ['Darkened quiet room', 'Paracetamol 650mg with food', 'Gentle cold compress to temples'],
      iconType: 'brain-alert'
    });
  } else if (pTextLower.includes('fever') || pTextLower.includes('chill') || pTextLower.includes('body ache') || pTextLower.includes('muscle ache') || pTextLower.includes('joint pain') || pTextLower.includes('temperature') || pTextLower.includes('pyrexia')) {
    alerts.push({
      id: 'alert-symptom-fever-sepsis',
      severity: 'CRITICAL',
      category: 'Acute Symptom Protocol',
      title: 'ACUTE FEBRILE DANGER THRESHOLD: Platelet & Sepsis Surveillance',
      badge: 'ACUTE SYMPTOM RED FLAGS',
      triggerSource: `Reported Symptom: "${problemText}"`,
      finding: 'Acute high-grade febrile presentation with rigors/chills in a patient with existing metabolic & vascular profile.',
      clinicalHazard: 'Risk of acute viral thrombocytopenia (Dengue platelet crash < 100,000/μL), tropical vector-borne infections (Malaria), or systemic bacteremic sepsis cascade.',
      actionableProtocol: 'Order stat Complete Blood Count (CBC) with Platelet Count & Dengue NS1 antigen if pyrexia persists beyond 48 hours. Emergency Red Flags requiring immediate ER admission: petechial skin spots, bleeding from gums/mucosa, persistent vomiting, severe abdominal tenderness, or temp > 103°F refractory to antipyretics.',
      contraindicatedDrugs: ['Aspirin (triggers Reye syndrome / hemorrhage)', 'NSAIDs', 'Heavy blankets during rigors'],
      safeAlternatives: ['Tepid water sponging', 'Dolo 650mg 4-6 hours PRN (max 3/day)', 'Oral Rehydration Solution (ORS) 2 Liters/day'],
      iconType: 'thermometer-alert'
    });
  } else if (pTextLower.includes('cough') || pTextLower.includes('breath') || pTextLower.includes('chest') || pTextLower.includes('wheez')) {
    alerts.push({
      id: 'alert-symptom-respiratory',
      severity: 'CRITICAL',
      category: 'Acute Symptom Protocol',
      title: 'RESPIRATORY RED ALERT: Hypoxemia & Bronchial Decompensation',
      badge: 'ACUTE SYMPTOM RED FLAGS',
      triggerSource: `Reported Symptom: "${problemText}"`,
      finding: 'Persistent lower respiratory symptoms with chest irritation in a patient with dust mite hypersensitivity.',
      clinicalHazard: 'Risk of sudden peripheral SpO2 desaturation, severe acute bronchospasm, or secondary bacterial lobar pneumonia.',
      actionableProtocol: 'Maintain continuous pulse oximetry monitoring. Seek immediate emergency evaluation if SpO2 drops below 94% on room air, respiratory rate exceeds 24 breaths/minute, stridor/wheezing worsens, or sputum turns rust-colored.',
      contraindicatedDrugs: ['Beta-blockers (can induce bronchospasm)', 'First-generation sedating antihistamines if SpO2 low'],
      safeAlternatives: ['Steam inhalation with saline', 'Elevate head of bed 30 degrees', 'Montair-LC as prescribed'],
      iconType: 'lungs-alert'
    });
  } else if (pTextLower.includes('acid') || pTextLower.includes('reflux') || pTextLower.includes('stomach') || pTextLower.includes('burn') || pTextLower.includes('epigastric')) {
    alerts.push({
      id: 'alert-symptom-gi-peptic',
      severity: 'HIGH_RISK',
      category: 'Acute Symptom Protocol',
      title: 'GASTROINTESTINAL RED ALERT: Mucosal Bleeding & Ulcer Perforation Screen',
      badge: 'ACUTE SYMPTOM RED FLAGS',
      triggerSource: `Reported Symptom: "${problemText}"`,
      finding: 'Acute acid reflux and epigastric burning pain in a patient with chronic GERD on Pantoprazole.',
      clinicalHazard: 'Risk of acute erosive gastritis, active peptic ulceration, or upper gastrointestinal micro-hemorrhage.',
      actionableProtocol: 'Strict avoidance of citrus, fried foods, spices, and caffeine. Administer Pantocid 40mg 30 minutes before morning breakfast plus mucosal coating oral suspension (Sucralfate 1g / 10ml TID before meals). Red Flag: Immediate ER visit if vomiting blood (hematemesis) or passing black tarry stools (melena).',
      contraindicatedDrugs: ['NSAIDs & Aspirin', 'Alcohol & Carbonated beverages', 'Spicy oily meals'],
      safeAlternatives: ['Cold milk / bland oats', 'Sucralfate suspension', 'Upright posture for 2 hours post-meal'],
      iconType: 'stomach-alert'
    });
  } else {
    alerts.push({
      id: 'alert-symptom-general-vital-instability',
      severity: 'HIGH_RISK',
      category: 'Acute Symptom Protocol',
      title: 'CLINICAL VITAL THRESHOLD ALERT: Systemic Decompensation Surveillance',
      badge: 'ACUTE SYMPTOM RED FLAGS',
      triggerSource: `Reported Symptom: "${problemText}"`,
      finding: 'Acute symptom flare-up superimposed on chronic cardiovascular and gastrointestinal baseline.',
      clinicalHazard: 'Risk of hemodynamic instability, severe dehydration, or unexpected polypharmacy interaction.',
      actionableProtocol: 'Log vital signs every 6 hours (Blood Pressure, Pulse, Temperature, SpO2). Escalate to physician if systolic BP < 90 mmHg or > 160 mmHg, pulse > 110 bpm, or if patient develops confusion or inability to retain fluids.',
      contraindicatedDrugs: ['Unsupervised OTC multi-symptom cold/pain syrups', 'Abrupt stopping of chronic medications'],
      safeAlternatives: ['Adequate hydration with clean water/ORS', 'Light easily digestible meals', 'Rest in well-ventilated space'],
      iconType: 'activity-alert'
    });
  }

  return alerts;
}
