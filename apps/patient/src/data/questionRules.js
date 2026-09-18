// Deterministic pre-defined structured follow-up question sets.
// STRICT REQUIREMENT: NO AI is used to generate these questions.

export const QUESTION_CATEGORIES = {
  FEVER: {
    id: 'fever',
    keywords: ['fever', 'temperature', 'chills', 'buukhar', 'feverish', 'sweating', 'hot'],
    title: 'Fever & Infection Assessment',
    questions: [
      {
        id: 'onset',
        text: 'When did your fever first begin?',
        type: 'select',
        options: ['Less than 24 hours ago', '1 to 3 days ago', '4 to 7 days ago', 'More than a week ago']
      },
      {
        id: 'temperature_range',
        text: 'What is your recorded body temperature range (if measured)?',
        type: 'select',
        options: ['Mild (99.5°F - 101°F)', 'High (101°F - 103°F)', 'Very High (>103°F)', 'Not measured / unsure']
      },
      {
        id: 'pattern',
        text: 'How does the temperature behave throughout the day?',
        type: 'select',
        options: ['Continuous high fever', 'Spikes in evening/night', 'Intermittent with chills', 'Fluctuating']
      },
      {
        id: 'associated_symptoms',
        text: 'Which accompanying symptoms are you experiencing?',
        type: 'multiselect',
        options: ['Severe Headache', 'Body Ache / Joint Pain', 'Shivering / Rigors', 'Cough or Sore Throat', 'Nausea / Vomiting', 'Skin Rash']
      },
      {
        id: 'current_meds',
        text: 'Have you taken any fever-reducing medication (e.g. Paracetamol)?',
        type: 'text',
        placeholder: 'e.g. Paracetamol 650mg 4 hours ago, or None'
      }
    ]
  },
  PAIN: {
    id: 'pain',
    keywords: ['pain', 'ache', 'hurts', 'injury', 'swelling', 'joint', 'headache', 'backache', 'dard'],
    title: 'Pain & Musculoskeletal Assessment',
    questions: [
      {
        id: 'location',
        text: 'Where is the exact location of the pain?',
        type: 'select',
        options: ['Head / Neck', 'Chest / Upper back', 'Abdomen / Stomach', 'Lower Back / Spine', 'Joints (Knee, Shoulder, Elbow)', 'Muscle / Limb']
      },
      {
        id: 'severity',
        text: 'Rate the pain severity on a scale of 1 to 10:',
        type: 'select',
        options: ['1-3 (Mild, noticeable)', '4-6 (Moderate, affects work)', '7-8 (Severe, difficult to sleep)', '9-10 (Extremely severe / Unbearable)']
      },
      {
        id: 'type_of_pain',
        text: 'How would you describe the sensation of the pain?',
        type: 'select',
        options: ['Sharp / Stabbing', 'Dull / Throbbing', 'Burning Sensation', 'Cramping / Colicky', 'Tightness / Pressure']
      },
      {
        id: 'aggravating_factors',
        text: 'Does movement, eating, or rest affect the pain?',
        type: 'select',
        options: ['Worse with movement/exercise', 'Worse after eating', 'Worse when lying down', 'Constant regardless of rest']
      },
      {
        id: 'previous_occurrences',
        text: 'Have you had this type of pain before?',
        type: 'select',
        options: ['First time ever', 'Occasional recurring issue', 'Chronic ongoing problem']
      }
    ]
  },
  RESPIRATORY: {
    id: 'respiratory',
    keywords: ['cough', 'cold', 'breath', 'breathing', 'wheezing', 'sore throat', 'kaasi', 'saans', 'phlegm', 'chest congestion'],
    title: 'Respiratory & Throat Assessment',
    questions: [
      {
        id: 'cough_type',
        text: 'Is your cough dry or producing phlegm/mucus?',
        type: 'select',
        options: ['Dry cough', 'Productive cough with clear phlegm', 'Productive cough with yellow/green phlegm', 'Blood-tinged cough']
      },
      {
        id: 'breathlessness',
        text: 'Are you experiencing shortness of breath or difficulty breathing?',
        type: 'select',
        options: ['No breathlessness', 'Only during exertion / stair walking', 'Even while resting', 'Wheezing sound present']
      },
      {
        id: 'duration',
        text: 'How long have these respiratory symptoms persisted?',
        type: 'select',
        options: ['1 to 3 days', '4 to 7 days', '1 to 3 weeks', 'More than 3 weeks']
      },
      {
        id: 'throat_nasal',
        text: 'Are you experiencing throat or nasal symptoms?',
        type: 'multiselect',
        options: ['Sore throat / Difficulty swallowing', 'Blocked nose / Runny nose', 'Loss of smell or taste', 'Ear pain / Sinus pressure']
      }
    ]
  },
  DIGESTIVE: {
    id: 'digestive',
    keywords: ['stomach', 'digestion', 'diarrhea', 'vomiting', 'nausea', 'acidity', 'gas', 'constipation', 'pet', 'loose motion'],
    title: 'Gastrointestinal & Digestive Assessment',
    questions: [
      {
        id: 'primary_digestive_issue',
        text: 'What is your primary digestive symptom?',
        type: 'select',
        options: ['Abdominal pain / Cramps', 'Loose motions / Diarrhea', 'Vomiting / Nausea', 'Severe acidity / Heartburn', 'Bloating & Constipation']
      },
      {
        id: 'frequency',
        text: 'How frequent are bowel movements or vomiting episodes today?',
        type: 'select',
        options: ['1 to 2 times', '3 to 5 times', 'More than 5 times', 'Unable to keep fluids down']
      },
      {
        id: 'food_history',
        text: 'Did you consume outside food, unusual meals, or suspect food contamination?',
        type: 'select',
        options: ['Yes, consumed street/outside food recently', 'No, regular home-cooked food', 'Unsure']
      },
      {
        id: 'hydration',
        text: 'Are you able to drink water and oral rehydration solutions (ORS)?',
        type: 'select',
        options: ['Yes, drinking normally', 'Slightly reduced fluid intake', 'Feeling very dehydrated / Dry mouth']
      }
    ]
  },
  SKIN: {
    id: 'skin',
    keywords: ['rash', 'itching', 'skin', 'redness', 'swelling', 'allergy', 'boil', 'spot', 'khujli'],
    title: 'Dermatological & Allergy Assessment',
    questions: [
      {
        id: 'skin_location',
        text: 'Where on your body is the skin issue located?',
        type: 'select',
        options: ['Face / Neck', 'Arms / Hands', 'Legs / Feet', 'Chest / Back / Stomach', 'All over body']
      },
      {
        id: 'appearance',
        text: 'How does the skin condition appear?',
        type: 'select',
        options: ['Red patches / Hives', 'Small itchy bumps / Pimples', 'Blisters with fluid', 'Dry, scaly, peeling skin', 'Swollen localized area']
      },
      {
        id: 'allergy_trigger',
        text: 'Have you been exposed to new soaps, medicines, food items, or insect bites?',
        type: 'text',
        placeholder: 'e.g. New antibiotic medicine, plant touch, insect bite, cosmetic'
      }
    ]
  },
  GENERAL: {
    id: 'general',
    keywords: ['weakness', 'fatigue', 'dizziness', 'tiredness', 'fainting', 'weight loss', 'sugar', 'blood pressure'],
    title: 'General Health & Symptom Assessment',
    questions: [
      {
        id: 'onset',
        text: 'When did you first notice this problem?',
        type: 'select',
        options: ['Today / Sudden onset', 'Past few days', 'Past few weeks', 'Ongoing chronic issue']
      },
      {
        id: 'impact',
        text: 'How is this affecting your daily routine activities?',
        type: 'select',
        options: ['Mildly - can perform daily work', 'Moderately - resting often', 'Severely - bedridden / unable to work']
      },
      {
        id: 'existing_conditions',
        text: 'Do you have any pre-existing health conditions?',
        type: 'multiselect',
        options: ['Diabetes Mellitus', 'Hypertension (High BP)', 'Asthma / COPD', 'Heart Disease', 'Thyroid Disorder', 'None']
      }
    ]
  }
};

/**
 * Standardized Ayurveda Dashavidha Pariksha (दशविध परीक्षा) Clinical Assessment Questions
 */
export const AYURVEDA_DASHAVIDHA_QUESTIONS = [
  {
    id: 'ayur_agni_ahara',
    section: 'Ayurveda Dashavidha Pariksha',
    text: 'How is your current appetite and digestive fire (Agni & Ahara Shakti)?',
    type: 'select',
    options: [
      'Normal & Balanced appetite (Samagni)',
      'Irregular with gas, bloating, or erratic hunger (Vishamagni / Vata)',
      'Intense hunger with burning sensation / acidity (Tikshnagni / Pitta)',
      'Low appetite, feel heavy/sluggish after small meals (Mandagni / Kapha)'
    ]
  },
  {
    id: 'ayur_koshta_bowel',
    section: 'Ayurveda Dashavidha Pariksha',
    text: 'How is your bowel movement regularity and stool tendency (Koshta)?',
    type: 'select',
    options: [
      'Regular daily formed bowel movement (Madhyama Koshta)',
      'Hard, dry, constipated, or irregular (Krura Koshta / Vata)',
      'Soft, loose, frequent, or urgent burning stools (Mridu Koshta / Pitta)',
      'Sluggish, mucus-laden, heavy feeling (Kapha Koshta)'
    ]
  },
  {
    id: 'ayur_sattva_nidra',
    section: 'Ayurveda Dashavidha Pariksha',
    text: 'How is your sleep quality and mental stress level (Sattva & Nidra)?',
    type: 'select',
    options: [
      'Sound, restful sleep with calm mental state (Pravara Sattva)',
      'Light, easily interrupted sleep with anxiety / restlessness (Vata)',
      'Difficulty falling asleep due to active thoughts / body heat (Pitta)',
      'Excessive heavy sleep, waking up feeling tired / sluggish (Kapha)'
    ]
  },
  {
    id: 'ayur_thermal_prakriti',
    section: 'Ayurveda Dashavidha Pariksha',
    text: 'How does your body react to temperature and climate (Prakriti & Vikriti)?',
    type: 'select',
    options: [
      'Comfortable in most climates / Moderate tolerance',
      'Intolerant to cold weather, cold breeze, chills easily (Vata tendency)',
      'Intolerant to heat, excessive sweating, prefers cold air (Pitta tendency)',
      'Intolerant to damp, rainy, or cold humid weather (Kapha tendency)'
    ]
  },
  {
    id: 'ayur_vyayama_shakti',
    section: 'Ayurveda Dashavidha Pariksha',
    text: 'What is your physical energy and stamina level (Vyayama Shakti)?',
    type: 'select',
    options: [
      'Good physical stamina, can walk or exercise normally',
      'Moderate stamina, tires after routine exertion',
      'Low stamina, feel fatigued or exhausted very quickly'
    ]
  }
];

/**
 * Returns structured questions based on keywords present in reported symptom text,
 * always combined with the Ayurveda Dashavidha Pariksha clinical examination.
 */
export function getStructuredQuestionsForText(text = '') {
  const normalized = text.toLowerCase();
  
  let baseCategory = QUESTION_CATEGORIES.GENERAL;
  for (const key in QUESTION_CATEGORIES) {
    const cat = QUESTION_CATEGORIES[key];
    const matched = cat.keywords.some(kw => normalized.includes(kw));
    if (matched) {
      baseCategory = cat;
      break;
    }
  }
  
  return {
    id: baseCategory.id,
    keywords: baseCategory.keywords,
    title: `${baseCategory.title} + Ayurveda Dashavidha Pariksha`,
    questions: [
      ...baseCategory.questions.map(q => ({ ...q, section: 'Reported Problem Assessment' })),
      ...AYURVEDA_DASHAVIDHA_QUESTIONS
    ]
  };
}
