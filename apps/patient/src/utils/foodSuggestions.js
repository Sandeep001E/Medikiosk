// Database of Food & Dietary Suggestions mapped to Active Medication classes and prescription context.

export const DRUG_DIET_RULES = [
  {
    medicationKeywords: ['paracetamol', 'crocin', 'dolo', 'acetaminophen'],
    category: 'Analgesics / Antipyretics',
    recommended: [
      'Warm fluids like ginger tea, vegetable soups, and coconut water',
      'Soft, easily digestible foods like khichdi, porridge, and dahlia',
      'Vitamin C rich fruits (oranges, amla, pomegranates) to boost immunity'
    ],
    avoid: [
      'Strictly avoid alcohol or ethanol-containing beverages (risk of liver toxicity)',
      'Heavy, greasy, or deeply fried foods that strain digestion'
    ],
    generalAdvice: 'Stay well-hydrated with 2.5 - 3 liters of clean water daily while on fever/pain medication.'
  },
  {
    medicationKeywords: ['amoxicillin', 'azithromycin', 'cefixime', 'ciprofloxacin', 'antibiotic'],
    category: 'Antibiotics',
    recommended: [
      'Probiotic-rich foods like fresh curd (dahi), buttermilk (chaas), or kefir to preserve gut flora',
      'Fiber-rich vegetables, lentils, and steamed greens after completing antibiotic dosage',
      'Adequate water and warm liquids'
    ],
    avoid: [
      'Avoid high-calcium dairy or iron supplements within 2 hours of taking Ciprofloxacin or Doxycycline',
      'Excessive refined sugars which can disrupt gut microbiome'
    ],
    generalAdvice: 'Take antibiotics with or after food as directed to minimize stomach irritation, and complete the full prescribed course.'
  },
  {
    medicationKeywords: ['pantoprazole', 'omeprazole', 'rabeprazole', 'ranitidine', 'antacid'],
    category: 'PPIs & Antacids (Acidity)',
    recommended: [
      'Cold milk, cucumber slices, watermelon, and coconut water to soothe stomach lining',
      'Boiled oats, steamed idli, and plain rice',
      'Small, frequent meal portions rather than large heavy meals'
    ],
    avoid: [
      'Spicy chilies, pickles, citrus juices (lemon, orange), and raw tomatoes during acute acidity',
      'Caffeinated tea, coffee, carbonated sodas, and late-night snacking'
    ],
    generalAdvice: 'Usually taken 30 minutes BEFORE breakfast on an empty stomach for maximum acid protection.'
  },
  {
    medicationKeywords: ['metformin', 'glimepiride', 'insulin', 'vildagliptin'],
    category: 'Antidiabetic Medications',
    recommended: [
      'Low Glycemic Index (GI) foods: whole grains (ragi, oats, brown rice), sprouts, and green leafy vegetables',
      'Protein sources like sprouts, paneer, boiled legumes, and pulses',
      'High-fiber salads eaten before main meals'
    ],
    avoid: [
      'Refined white sugar, sweets, packaged fruit juices, and refined flour (maida)',
      'Skipping meals while taking antidiabetic medication (risk of hypoglycemia/low blood sugar)'
    ],
    generalAdvice: 'Always carry a quick glucose source (candy or glucose tablets) in case of sudden lightheadedness or sweating.'
  },
  {
    medicationKeywords: ['atorvastatin', 'rosuvastatin', 'cholesterol'],
    category: 'Lipid Lowering / Statins',
    recommended: [
      'Heart-healthy fats: walnuts, almonds, flaxseeds, and mustard/olive oil in moderation',
      'Soluble fiber rich foods: oats, barley, apples, and psyllium husk (isabgol)',
      'Steamed veggies and fish (if non-vegetarian)'
    ],
    avoid: [
      'Grapefruit and grapefruit juice (interferes with statin metabolism)',
      'Trans-fats, saturated fats, deep-fried snacks, and palm oil'
    ],
    generalAdvice: 'Consistency is key. Statins work best alongside a balanced, low-fat Mediterranean or traditional Indian diet.'
  },
  {
    medicationKeywords: ['amlodipine', 'telmisartan', 'enalapril', 'losartan', 'bp'],
    category: 'Antihypertensives (High BP)',
    recommended: [
      'Potassium-rich fruits: bananas, spinach, coconut water, and sweet potatoes',
      'Garlic, flaxseeds, and lemon water',
      'Low-sodium homemade meals cooked with herbs'
    ],
    avoid: [
      'High sodium items: papad, pickles (achaar), packaged chips, soy sauce, and processed cheeses',
      'Excessive liquorice or caffeine'
    ],
    generalAdvice: 'Maintain a salt intake of less than 5g (1 teaspoon) per day to help control blood pressure levels.'
  },
  {
    medicationKeywords: ['iron', 'ferrous', 'autrin', 'hemfer'],
    category: 'Iron Supplements',
    recommended: [
      'Vitamin C rich foods (lemon juice, oranges, amla) consumed alongside iron to boost absorption',
      'Beetroots, pomegranate, spinach, dates, and jaggery'
    ],
    avoid: [
      'Tea, coffee, and dairy products (milk/cheese) within 1 hour of taking iron tablets (reduces absorption)'
    ],
    generalAdvice: 'Iron supplements are best absorbed on an empty stomach or with a glass of lemon water.'
  }
];

export function getFoodSuggestionsForPrescriptions(prescriptions = []) {
  if (!prescriptions || prescriptions.length === 0) {
    return [
      {
        category: 'General Healthy Diet',
        recommended: [
          'Balanced meals with whole grains (millets, brown rice, whole wheat rotis)',
          '5 servings of fresh fruits and colorful vegetables daily',
          'Adequate hydration (8-10 glasses of water daily)'
        ],
        avoid: ['Excessive salt, refined sugars, and deep-fried processed snacks'],
        generalAdvice: 'A balanced Indian diet rich in lentils, curd, and seasonal vegetables supports overall immunity.'
      }
    ];
  }

  const suggestions = [];
  const processedCategories = new Set();

  prescriptions.forEach(p => {
    const medName = (p.name || p.medicineName || '').toLowerCase();
    
    DRUG_DIET_RULES.forEach(rule => {
      const match = rule.medicationKeywords.some(kw => medName.includes(kw));
      if (match && !processedCategories.has(rule.category)) {
        processedCategories.add(rule.category);
        suggestions.push({
          medicationName: p.name || p.medicineName,
          ...rule
        });
      }
    });
  });

  if (suggestions.length === 0) {
    suggestions.push({
      medicationName: prescriptions[0]?.name || 'Active Medication',
      category: 'General Clinical Support Diet',
      recommended: [
        'Fresh home-cooked meals with moderate spices',
        'Adequate hydration throughout the day',
        'Steamed vegetables, dahl, and fresh fruit'
      ],
      avoid: ['Ultra-processed foods, excess salt, and unpasteurized drinks'],
      generalAdvice: 'Take medications with plain water unless otherwise specified by your doctor.'
    });
  }

  return suggestions;
}
