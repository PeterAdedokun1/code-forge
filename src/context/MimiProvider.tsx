/**
 * MimiProvider — Global state context for the entire app.
 *
 * Replaces per-page useDemoData() calls so that all pages share
 * the same patient, alerts, language, settings, and risk state.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Patient } from '../components/CHEWDashboard';
import { Alert } from '../components/HospitalAlert';
import { getSelectedLanguageCode, setSelectedLanguage as setLanguageInStore } from '../lib/languageStore';

// ── Types ────────────────────────────────────────────────────────

export interface DemoPatient {
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

export interface KickSession {
    id: string;
    date: string;          // ISO
    kicks: number;
    durationMinutes: number;
    complete: boolean;      // true if 10 kicks reached
}

export interface MedEntry {
    date: string;           // YYYY-MM-DD
    folicAcid: boolean;
    iron: boolean;
}

interface MimiState {
    // Demo / patient
    isDemoMode: boolean;
    toggleDemoMode: () => void;
    currentPatient: DemoPatient | undefined;
    patients: DemoPatient[];
    chewPatients: Patient[];
    switchPatient: (id: string) => void;

    // Alerts
    alerts: Alert[];
    acknowledgeAlert: (id: string) => void;
    dismissAlert: (id: string) => void;

    // Language
    languageCode: string;
    changeLanguage: (code: string) => void;

    // Online
    isOnline: boolean;

    // Kick counter
    kickSessions: KickSession[];
    addKickSession: (session: KickSession) => void;

    // Medication tracker
    medLog: MedEntry[];
    toggleMed: (date: string, med: 'folicAcid' | 'iron') => void;
    getMedStreak: () => number;

    // SOS
    sosTriggered: boolean;
    triggerSOS: () => void;
    clearSOS: () => void;
}

const MimiContext = createContext<MimiState | null>(null);

// ── Demo Data ────────────────────────────────────────────────────

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
            { symptom: 'Swollen hands and feet', date: 'Yesterday', severity: 'moderate' },
        ],
        upcomingReminders: [
            { type: 'Blood Pressure Check', description: 'Check your blood pressure today', date: 'Today' },
            { type: 'Doctor Appointment', description: 'Follow-up with Dr. Okafor', date: 'Tomorrow, 10:00 AM' },
        ],
        folicAcidAdherence: 85,
        lastCheckup: '5 days ago',
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
            { symptom: 'Mild dizziness', date: '5 days ago', severity: 'mild' },
        ],
        upcomingReminders: [
            { type: 'Medication Reminder', description: 'Take your folic acid', date: 'Daily' },
            { type: 'Antenatal Visit', description: 'Monthly checkup', date: 'Next week' },
        ],
        folicAcidAdherence: 92,
        lastCheckup: '3 weeks ago',
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
            { symptom: 'High blood pressure', date: 'Yesterday', severity: 'moderate' },
        ],
        upcomingReminders: [
            { type: 'Blood Pressure Monitoring', description: 'Daily BP check required', date: 'Daily' },
        ],
        folicAcidAdherence: 78,
        lastCheckup: '1 week ago',
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
            { type: 'Antenatal Class', description: 'First-time mothers class', date: 'Friday, 3:00 PM' },
        ],
        folicAcidAdherence: 95,
        lastCheckup: '2 weeks ago',
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
            { type: 'Ultrasound Scan', description: 'Third trimester scan', date: 'Next Monday' },
        ],
        folicAcidAdherence: 88,
        lastCheckup: '2 weeks ago',
    },
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
            'High blood pressure (160/110)',
        ],
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        location: {
            address: '12 Boundary Road, Ajegunle, Lagos',
            coordinates: { lat: 6.4641, lng: 3.3698 },
            eta: '25 minutes',
        },
        status: 'pending',
        priority: 'critical',
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
            'Mild swelling in ankles',
        ],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        location: {
            address: 'Sabon Gari, Kano',
            coordinates: { lat: 12.0022, lng: 8.5919 },
        },
        status: 'pending',
        priority: 'high',
    },
];

function generateRiskHistory(currentLevel: 'low' | 'medium' | 'high') {
    const baseScore = currentLevel === 'high' ? 75 : currentLevel === 'medium' ? 45 : 15;
    const dates = ['Week 28', 'Week 29', 'Week 30', 'Week 31', 'Week 32'];
    return dates.map((date, index) => ({
        date,
        score: baseScore + index * 5 + Math.random() * 10 - 5,
    }));
}

// ── localStorage helpers ─────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota */ }
}

// ── Provider ─────────────────────────────────────────────────────

export function MimiProvider({ children }: { children: ReactNode }) {
    // Demo
    const [isDemoMode, setIsDemoMode] = useState(true);
    const [currentPatientId, setCurrentPatientId] = useState('1');
    const [patients] = useState<DemoPatient[]>(DEMO_PATIENTS);
    const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);

    // Language
    const [languageCode, setLanguageCode] = useState(getSelectedLanguageCode);

    // Online
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Kick counter
    const [kickSessions, setKickSessions] = useState<KickSession[]>(() =>
        loadJSON('mimi_kick_sessions', [])
    );

    // Medication tracker
    const [medLog, setMedLog] = useState<MedEntry[]>(() =>
        loadJSON('mimi_med_log', [])
    );

    // SOS
    const [sosTriggered, setSosTriggered] = useState(false);

    // ── online listener ──
    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    // ── language listener ──
    useEffect(() => {
        const handler = (e: Event) => {
            const code = (e as CustomEvent).detail;
            setLanguageCode(code);
        };
        window.addEventListener('mimi-language-changed', handler);
        return () => window.removeEventListener('mimi-language-changed', handler);
    }, []);

    // Persist kick sessions
    useEffect(() => { saveJSON('mimi_kick_sessions', kickSessions); }, [kickSessions]);
    useEffect(() => { saveJSON('mimi_med_log', medLog); }, [medLog]);

    // ── Derived ──
    const currentPatient = patients.find((p) => p.id === currentPatientId);

    const chewPatients: Patient[] = patients.map((p) => ({
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
        recentSymptoms: p.recentSymptoms.map((s) => s.symptom),
    }));

    // ── Actions ──
    const toggleDemoMode = useCallback(() => setIsDemoMode((v) => !v), []);
    const switchPatient = useCallback((id: string) => setCurrentPatientId(id), []);

    const acknowledgeAlert = useCallback((alertId: string) => {
        setAlerts((prev) =>
            prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' as const } : a))
        );
    }, []);

    const dismissAlert = useCallback((alertId: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }, []);

    const changeLanguage = useCallback((code: string) => {
        setLanguageInStore(code);
        setLanguageCode(code);
    }, []);

    const addKickSession = useCallback((session: KickSession) => {
        setKickSessions((prev) => [...prev, session]);
    }, []);

    const toggleMed = useCallback((date: string, med: 'folicAcid' | 'iron') => {
        setMedLog((prev) => {
            const existing = prev.find((e) => e.date === date);
            if (existing) {
                return prev.map((e) =>
                    e.date === date ? { ...e, [med]: !e[med] } : e
                );
            }
            return [...prev, { date, folicAcid: med === 'folicAcid', iron: med === 'iron' }];
        });
    }, []);

    const getMedStreak = useCallback(() => {
        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const entry = medLog.find((e) => e.date === key);
            if (entry && entry.folicAcid) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    }, [medLog]);

    const triggerSOS = useCallback(() => {
        setSosTriggered(true);
        // Auto-clear after 30 seconds
        setTimeout(() => setSosTriggered(false), 30000);
    }, []);

    const clearSOS = useCallback(() => setSosTriggered(false), []);

    const value: MimiState = {
        isDemoMode, toggleDemoMode,
        currentPatient, patients, chewPatients, switchPatient,
        alerts, acknowledgeAlert, dismissAlert,
        languageCode, changeLanguage,
        isOnline,
        kickSessions, addKickSession,
        medLog, toggleMed, getMedStreak,
        sosTriggered, triggerSOS, clearSOS,
    };

    return <MimiContext.Provider value={value}>{children}</MimiContext.Provider>;
}

export function useMimi(): MimiState {
    const ctx = useContext(MimiContext);
    if (!ctx) throw new Error('useMimi must be used within <MimiProvider>');
    return ctx;
}
