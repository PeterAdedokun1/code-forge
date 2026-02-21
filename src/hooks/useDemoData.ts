import { useState } from 'react';
import { Patient } from '../components/CHEWDashboard';
import { Alert } from '../components/HospitalAlert';

interface DemoPatient {
  id: string;
  name: string;
  age: number;
  gestationalWeek: number;
  dueDate: string;
  riskLevel: 'low' | 'medium' | 'high';
  recentSymptoms: Array<{
    symptom: string;
    date: string;
    severity: 'mild' | 'moderate' | 'severe';
  }>;
  upcomingReminders: Array<{
    type: string;
    description: string;
    date: string;
  }>;
  folicAcidAdherence: number;
  lastCheckup: string;
  location: string;
  phone: string;
}

const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: '1',
    name: 'Amina Ibrahim',
    age: 28,
    gestationalWeek: 32,
    dueDate: '2026-04-15',
    riskLevel: 'high',
    location: 'Ajegunle, Lagos',
    phone: '+234-800-123-4567',
    recentSymptoms: [
      { symptom: 'Severe headache', date: 'Today', severity: 'severe' },
      { symptom: 'Blurred vision', date: 'Today', severity: 'severe' },
      { symptom: 'Swollen hands and feet', date: 'Yesterday', severity: 'moderate' }
    ],
    upcomingReminders: [
      { type: 'Blood Pressure Check', description: 'Check your blood pressure today', date: 'Today' },
      { type: 'Doctor Appointment', description: 'Follow-up with Dr. Okafor', date: 'Tomorrow, 10:00 AM' }
    ],
    folicAcidAdherence: 85,
    lastCheckup: '5 days ago'
  },
  {
    id: '2',
    name: 'Funke Adeyemi',
    age: 24,
    gestationalWeek: 24,
    dueDate: '2026-06-20',
    riskLevel: 'medium',
    location: 'Ibadan, Oyo',
    phone: '+234-800-234-5678',
    recentSymptoms: [
      { symptom: 'Occasional headaches', date: '3 days ago', severity: 'mild' },
      { symptom: 'Mild dizziness', date: '5 days ago', severity: 'mild' }
    ],
    upcomingReminders: [
      { type: 'Medication Reminder', description: 'Take your folic acid', date: 'Daily' },
      { type: 'Antenatal Visit', description: 'Monthly checkup', date: 'Next week' }
    ],
    folicAcidAdherence: 92,
    lastCheckup: '3 weeks ago'
  },
  {
    id: '3',
    name: 'Zainab Mohammed',
    age: 31,
    gestationalWeek: 36,
    dueDate: '2026-03-28',
    riskLevel: 'medium',
    location: 'Kano, Kano',
    phone: '+234-800-345-6789',
    recentSymptoms: [
      { symptom: 'High blood pressure', date: 'Yesterday', severity: 'moderate' }
    ],
    upcomingReminders: [
      { type: 'Blood Pressure Monitoring', description: 'Daily BP check required', date: 'Daily' }
    ],
    folicAcidAdherence: 78,
    lastCheckup: '1 week ago'
  },
  {
    id: '4',
    name: 'Chiamaka Okonkwo',
    age: 22,
    gestationalWeek: 16,
    dueDate: '2026-08-10',
    riskLevel: 'low',
    location: 'Enugu, Enugu',
    phone: '+234-800-456-7890',
    recentSymptoms: [],
    upcomingReminders: [
      { type: 'Folic Acid', description: 'Take your daily supplement', date: 'Daily' },
      { type: 'Antenatal Class', description: 'First-time mothers class', date: 'Friday, 3:00 PM' }
    ],
    folicAcidAdherence: 95,
    lastCheckup: '2 weeks ago'
  },
  {
    id: '5',
    name: 'Blessing Okoro',
    age: 26,
    gestationalWeek: 28,
    dueDate: '2026-05-05',
    riskLevel: 'low',
    location: 'Surulere, Lagos',
    phone: '+234-800-567-8901',
    recentSymptoms: [],
    upcomingReminders: [
      { type: 'Ultrasound Scan', description: 'Third trimester scan', date: 'Next Monday' }
    ],
    folicAcidAdherence: 88,
    lastCheckup: '2 weeks ago'
  }
];

const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-1',
    patientId: '1',
    patientName: 'Amina Ibrahim',
    age: 28,
    gestationalWeek: 32,
    riskType: 'Pre-eclampsia Warning Signs',
    symptoms: [
      'Severe persistent headache for 2+ days',
      'Blurred vision and seeing spots',
      'Significant swelling in hands and face',
      'High blood pressure (160/110)'
    ],
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    location: {
      address: '12 Boundary Road, Ajegunle, Lagos',
      coordinates: { lat: 6.4641, lng: 3.3698 },
      eta: '25 minutes'
    },
    status: 'pending',
    priority: 'critical'
  },
  {
    id: 'alert-2',
    patientId: '3',
    patientName: 'Zainab Mohammed',
    age: 31,
    gestationalWeek: 36,
    riskType: 'Hypertension',
    symptoms: [
      'Blood pressure 150/95',
      'History of hypertension',
      'Mild swelling in ankles'
    ],
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    location: {
      address: 'Sabon Gari, Kano',
      coordinates: { lat: 12.0022, lng: 8.5919 }
    },
    status: 'pending',
    priority: 'high'
  }
];

export const useDemoData = () => {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [currentPatientId, setCurrentPatientId] = useState('1');
  const [patients] = useState<DemoPatient[]>(DEMO_PATIENTS);
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);

  const currentPatient = patients.find(p => p.id === currentPatientId);

  const chewPatients: Patient[] = patients.map(p => ({
    id: p.id,
    name: p.name,
    age: p.age,
    gestationalWeek: p.gestationalWeek,
    riskLevel: p.riskLevel,
    lastConversation: p.lastCheckup,
    pendingActions: p.riskLevel === 'high' ? 2 : p.riskLevel === 'medium' ? 1 : 0,
    location: p.location,
    phone: p.phone,
    riskHistory: generateRiskHistory(p.riskLevel),
    recentSymptoms: p.recentSymptoms.map(s => s.symptom)
  }));

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
  };

  const switchPatient = (patientId: string) => {
    setCurrentPatientId(patientId);
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, status: 'acknowledged' as const } : a
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  return {
    isDemoMode,
    toggleDemoMode,
    currentPatient,
    patients,
    chewPatients,
    alerts,
    switchPatient,
    acknowledgeAlert,
    dismissAlert
  };
};

function generateRiskHistory(currentLevel: 'low' | 'medium' | 'high') {
  const baseScore = currentLevel === 'high' ? 75 : currentLevel === 'medium' ? 45 : 15;
  const dates = ['Week 28', 'Week 29', 'Week 30', 'Week 31', 'Week 32'];

  return dates.map((date, index) => ({
    date,
    score: baseScore + (index * 5) + Math.random() * 10 - 5
  }));
}
