/**
 * MIMI Risk Engine — Rule-Based Maternal Risk Classifier
 * 
 * Pillar 2: The Intelligence Factor
 * 
 * Extracts symptoms from conversation text, scores them,
 * and classifies the patient's risk level. Designed to 
 * demonstrate real-time risk monitoring during a voice conversation.
 */

export interface SymptomDetection {
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  weight: number;
  matched: string; // the phrase that matched
}

export interface RiskAssessmentResult {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  detectedSymptoms: SymptomDetection[];
  recommendations: string[];
  escalationRequired: boolean;
  riskFactors: string[];
}

// Weighted symptom rules with keyword patterns
const SYMPTOM_RULES: Array<{
  name: string;
  keywords: string[];
  baseWeight: number;
  severity: 'mild' | 'moderate' | 'severe';
  category: string;
}> = [
  // Pre-eclampsia indicators (HIGH severity)
  {
    name: 'Severe Headache',
    keywords: ['headache', 'head dey pain', 'head ache', 'head dey spin', 'my head', 'migraine', 'head pain'],
    baseWeight: 15,
    severity: 'severe',
    category: 'pre-eclampsia'
  },
  {
    name: 'Blurred Vision',
    keywords: ['blurred vision', 'blur', 'eye dey shake', 'see double', 'vision problem', 'eye pain', 'seeing spots', 'flashing light'],
    baseWeight: 20,
    severity: 'severe',
    category: 'pre-eclampsia'
  },
  {
    name: 'Swelling (Edema)',
    keywords: ['swelling', 'swollen', 'feet big', 'hand swollen', 'face swollen', 'body swelling', 'puffy', 'edema', 'feet dey swell'],
    baseWeight: 15,
    severity: 'moderate',
    category: 'pre-eclampsia'
  },
  {
    name: 'High Blood Pressure',
    keywords: ['blood pressure', 'bp high', 'hypertension', 'bp dey high', 'pressure high'],
    baseWeight: 20,
    severity: 'severe',
    category: 'pre-eclampsia'
  },

  // Bleeding/Emergency indicators
  {
    name: 'Vaginal Bleeding',
    keywords: ['bleeding', 'blood', 'spotting', 'blood coming', 'blood dey come', 'hemorrhage'],
    baseWeight: 25,
    severity: 'severe',
    category: 'emergency'
  },
  {
    name: 'Severe Abdominal Pain',
    keywords: ['abdominal pain', 'stomach pain', 'belly pain', 'cramp', 'belle dey pain', 'tummy pain', 'sharp pain'],
    baseWeight: 18,
    severity: 'severe',
    category: 'emergency'
  },

  // Infection indicators
  {
    name: 'Fever',
    keywords: ['fever', 'hot', 'temperature', 'body hot', 'body dey hot', 'chills', 'shivering'],
    baseWeight: 12,
    severity: 'moderate',
    category: 'infection'
  },
  {
    name: 'Painful Urination',
    keywords: ['painful urination', 'burning pee', 'urine pain', 'uti', 'pee dey pain'],
    baseWeight: 10,
    severity: 'moderate',
    category: 'infection'
  },

  // General warning signs
  {
    name: 'Dizziness',
    keywords: ['dizzy', 'dizziness', 'faint', 'head dey spin', 'lightheaded', 'vertigo', 'woozy'],
    baseWeight: 10,
    severity: 'moderate',
    category: 'general'
  },
  {
    name: 'Nausea/Vomiting',
    keywords: ['nausea', 'vomiting', 'throwing up', 'dey vomit', 'feeling sick', 'nauseous'],
    baseWeight: 8,
    severity: 'mild',
    category: 'general'
  },
  {
    name: 'Fatigue',
    keywords: ['tired', 'fatigue', 'weak', 'no energy', 'body dey weak', 'exhausted'],
    baseWeight: 5,
    severity: 'mild',
    category: 'general'
  },
  {
    name: 'Reduced Fetal Movement',
    keywords: ['baby not moving', 'baby no dey move', 'no kick', 'baby quiet', 'less movement', 'reduced movement'],
    baseWeight: 22,
    severity: 'severe',
    category: 'fetal'
  },
  {
    name: 'Difficulty Breathing',
    keywords: ['breathing', 'breathless', 'short of breath', 'can\'t breathe', 'no fit breathe', 'chest tight'],
    baseWeight: 15,
    severity: 'severe',
    category: 'emergency'
  },
  {
    name: 'Chest Pain',
    keywords: ['chest pain', 'chest hurt', 'chest dey pain', 'heart pain'],
    baseWeight: 18,
    severity: 'severe',
    category: 'emergency'
  }
];

// Duration amplifiers — if user mentions how long symptoms lasted
const DURATION_KEYWORDS: Array<{ keywords: string[]; multiplier: number }> = [
  { keywords: ['today', 'just now', 'just started'], multiplier: 1.0 },
  { keywords: ['yesterday', 'since yesterday', '1 day', 'one day'], multiplier: 1.2 },
  { keywords: ['2 days', 'two days', 'few days', '3 days', 'three days'], multiplier: 1.5 },
  { keywords: ['1 week', 'one week', 'a week', 'last week'], multiplier: 1.8 },
  { keywords: ['weeks', '2 weeks', 'long time'], multiplier: 2.0 }
];

/**
 * Extract symptoms from conversation text
 */
export function detectSymptoms(text: string): SymptomDetection[] {
  const lowerText = text.toLowerCase();
  const detected: SymptomDetection[] = [];
  const alreadyDetected = new Set<string>();

  for (const rule of SYMPTOM_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword) && !alreadyDetected.has(rule.name)) {
        alreadyDetected.add(rule.name);
        detected.push({
          symptom: rule.name,
          severity: rule.severity,
          weight: rule.baseWeight,
          matched: keyword
        });
        break;
      }
    }
  }

  return detected;
}

/**
 * Detect duration multiplier from text
 */
function getDurationMultiplier(text: string): number {
  const lowerText = text.toLowerCase();
  let maxMultiplier = 1.0;

  for (const duration of DURATION_KEYWORDS) {
    for (const keyword of duration.keywords) {
      if (lowerText.includes(keyword)) {
        maxMultiplier = Math.max(maxMultiplier, duration.multiplier);
      }
    }
  }

  return maxMultiplier;
}

/**
 * Generate recommendations based on detected symptoms
 */
function generateRecommendations(symptoms: SymptomDetection[], riskLevel: 'low' | 'medium' | 'high'): string[] {
  const recommendations: string[] = [];
  const categories = new Set(
    SYMPTOM_RULES
      .filter(r => symptoms.some(s => s.symptom === r.name))
      .map(r => r.category)
  );

  if (riskLevel === 'high') {
    recommendations.push('⚠️ Please visit the nearest hospital immediately');
    recommendations.push('📞 Contact your community health worker (CHEW) right away');
  }

  if (categories.has('pre-eclampsia')) {
    recommendations.push('🩸 Check your blood pressure as soon as possible');
    recommendations.push('💊 Continue taking any prescribed medication');
    recommendations.push('🛏️ Rest and avoid strenuous activity');
  }

  if (categories.has('emergency')) {
    recommendations.push('🚑 Do not delay seeking medical attention');
    recommendations.push('📋 Note down when symptoms started');
  }

  if (categories.has('infection')) {
    recommendations.push('💧 Stay hydrated — drink plenty of water');
    recommendations.push('🩺 See a doctor for proper testing');
  }

  if (riskLevel === 'medium') {
    recommendations.push('📅 Schedule a check-up within the next 24-48 hours');
    recommendations.push('📝 Keep a symptom diary and monitor any changes');
  }

  if (riskLevel === 'low') {
    recommendations.push('✅ Continue your regular prenatal care routine');
    recommendations.push('💊 Remember to take your folic acid daily');
    recommendations.push('🏃‍♀️ Stay active with gentle exercise');
  }

  return recommendations;
}

/**
 * Main risk assessment function.
 * 
 * Takes the full conversation history and computes a risk score.
 * Uses all messages combined so that symptoms mentioned in earlier
 * messages are still accounted for.
 */
export function assessRisk(conversationText: string, gestationalWeek?: number): RiskAssessmentResult {
  const symptoms = detectSymptoms(conversationText);
  const durationMultiplier = getDurationMultiplier(conversationText);

  // Calculate raw score
  let rawScore = symptoms.reduce((sum, s) => sum + s.weight, 0);

  // Apply duration multiplier
  rawScore *= durationMultiplier;

  // Gestational week risk amplifier (higher weeks = higher risk for same symptoms)
  if (gestationalWeek) {
    if (gestationalWeek >= 34) rawScore *= 1.3;
    else if (gestationalWeek >= 28) rawScore *= 1.15;
    else if (gestationalWeek >= 20) rawScore *= 1.05;
  }

  // Compound risk: multiple severe symptoms together are more dangerous
  const severeCount = symptoms.filter(s => s.severity === 'severe').length;
  if (severeCount >= 3) rawScore *= 1.5;
  else if (severeCount >= 2) rawScore *= 1.3;

  // Pre-eclampsia compound: headache + swelling + high BP
  const preeclampsiaSymptoms = ['Severe Headache', 'Swelling (Edema)', 'High Blood Pressure', 'Blurred Vision'];
  const preeclampsiaCount = symptoms.filter(s => preeclampsiaSymptoms.includes(s.symptom)).length;
  if (preeclampsiaCount >= 3) rawScore = Math.max(rawScore, 85);

  // Normalize to 0-100
  const score = Math.min(Math.round(rawScore), 100);

  // Classify risk level
  let level: 'low' | 'medium' | 'high';
  if (score >= 60) level = 'high';
  else if (score >= 30) level = 'medium';
  else level = 'low';

  // Extract risk factor descriptions
  const riskFactors = symptoms.map(s => {
    const rule = SYMPTOM_RULES.find(r => r.name === s.symptom);
    return `${s.symptom} (${s.severity}) — ${rule?.category || 'general'}`;
  });

  const recommendations = generateRecommendations(symptoms, level);
  const escalationRequired = level === 'high' || severeCount >= 2;

  return {
    score,
    level,
    detectedSymptoms: symptoms,
    recommendations,
    escalationRequired,
    riskFactors
  };
}

/**
 * Quick risk check for a single message (incremental scoring)
 */
export function quickSymptomCheck(message: string): {
  hasSymptoms: boolean;
  symptoms: string[];
  urgency: 'none' | 'monitor' | 'alert';
} {
  const detected = detectSymptoms(message);

  if (detected.length === 0) {
    return { hasSymptoms: false, symptoms: [], urgency: 'none' };
  }

  const hasSevere = detected.some(s => s.severity === 'severe');
  const urgency = hasSevere ? 'alert' : 'monitor';

  return {
    hasSymptoms: true,
    symptoms: detected.map(s => s.symptom),
    urgency
  };
}
