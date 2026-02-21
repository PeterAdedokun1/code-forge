/**
 * PregnancyTimeline — Visual week-by-week pregnancy journey.
 *
 * Shows baby development milestones, upcoming events, and what to expect.
 */

import { Heart, Baby, Stethoscope, AlertCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useMimi } from '../context/MimiProvider';

interface Milestone {
    week: number;
    title: string;
    babySize: string;
    description: string;
    tips: string[];
    icon: 'heart' | 'baby' | 'stethoscope' | 'alert';
    category: 'development' | 'checkup' | 'warning';
}

const MILESTONES: Milestone[] = [
    { week: 4, title: 'Heart begins to beat', babySize: 'Poppy seed', description: 'The neural tube and heart are forming. You may start feeling tired.', tips: ['Start folic acid if you haven\'t', 'Avoid alcohol and smoking'], icon: 'heart', category: 'development' },
    { week: 8, title: 'First prenatal visit', babySize: 'Raspberry', description: 'Baby has tiny fingers and toes. Book your first antenatal appointment.', tips: ['Get blood tests done', 'Begin prenatal vitamins'], icon: 'stethoscope', category: 'checkup' },
    { week: 12, title: 'End of first trimester', babySize: 'Lime', description: 'Risk of miscarriage drops significantly. Baby can move!', tips: ['First ultrasound scan', 'Share the news if you wish'], icon: 'baby', category: 'development' },
    { week: 16, title: 'Baby can hear you', babySize: 'Avocado', description: 'Baby\'s ears are developed enough to hear your voice and heartbeat.', tips: ['Talk or sing to your baby', 'Start wearing comfortable clothes'], icon: 'baby', category: 'development' },
    { week: 20, title: 'Anatomy scan', babySize: 'Banana', description: 'Halfway there! The detailed anatomy scan checks all organs.', tips: ['Find out baby\'s sex if you want', 'Start planning the nursery'], icon: 'stethoscope', category: 'checkup' },
    { week: 24, title: 'Viability milestone', babySize: 'Corn on the cob', description: 'Baby could survive outside the womb with medical help from this point.', tips: ['Watch for signs of preterm labor', 'Glucose screening test soon'], icon: 'alert', category: 'warning' },
    { week: 28, title: 'Third trimester begins', babySize: 'Coconut', description: 'Baby\'s eyes can open! Start counting kicks daily.', tips: ['Begin daily kick counts', 'Anti-D injection if Rh-negative', 'More frequent check-ups now'], icon: 'baby', category: 'development' },
    { week: 32, title: 'Baby is practicing breathing', babySize: 'Squash', description: 'Lungs are maturing. Baby is head-down in most cases.', tips: ['Watch for pre-eclampsia signs', 'Pack your hospital bag', 'Know the signs of labor'], icon: 'alert', category: 'warning' },
    { week: 36, title: 'Almost full term', babySize: 'Honeydew melon', description: 'Baby is gaining weight rapidly. Weekly check-ups begin.', tips: ['Weekly antenatal visits', 'Finalize birth plan', 'Keep hospital bag ready'], icon: 'stethoscope', category: 'checkup' },
    { week: 40, title: 'Due date! 🎉', babySize: 'Watermelon', description: 'Baby is fully developed and ready to meet you!', tips: ['Stay calm and patient', 'Know when to go to hospital', 'Call your health worker when labor starts'], icon: 'heart', category: 'development' },
];

const iconMap = {
    heart: Heart,
    baby: Baby,
    stethoscope: Stethoscope,
    alert: AlertCircle,
};

const categoryColors = {
    development: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-300', dot: 'bg-pink-500' },
    checkup: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300', dot: 'bg-blue-500' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300', dot: 'bg-amber-500' },
};

export const PregnancyTimeline = () => {
    const { currentPatient } = useMimi();
    const currentWeek = currentPatient?.gestationalWeek || 28;
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

    // Find the closest milestone to current week
    const currentMilestoneIdx = MILESTONES.findIndex((m) => m.week >= currentWeek);
    const progressPercent = Math.min((currentWeek / 40) * 100, 100);

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50 p-4 pb-24">
            <div className="max-w-md mx-auto space-y-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center space-x-2 mb-3">
                        <Calendar className="w-5 h-5" />
                        <h1 className="text-xl font-bold">Your Pregnancy Journey</h1>
                    </div>
                    <div className="flex items-baseline space-x-2 mb-3">
                        <span className="text-4xl font-black">Week {currentWeek}</span>
                        <span className="text-pink-200">of 40</span>
                    </div>

                    {/* Progress bar */}
                    <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-white rounded-full h-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-pink-200">
                        <span>1st trimester</span>
                        <span>2nd trimester</span>
                        <span>3rd trimester</span>
                    </div>
                </div>

                {/* Current week highlight */}
                {currentMilestoneIdx >= 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-pink-200">
                        <div className="flex items-center space-x-2 text-pink-600 mb-2">
                            <Baby className="w-5 h-5" />
                            <span className="text-sm font-semibold">Coming Up</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">
                            Week {MILESTONES[currentMilestoneIdx].week}: {MILESTONES[currentMilestoneIdx].title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Baby is about the size of a <strong>{MILESTONES[currentMilestoneIdx].babySize}</strong>
                        </p>
                    </div>
                )}

                {/* Timeline */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="font-bold text-gray-800 mb-4">Milestones</h2>

                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                        <div className="space-y-1">
                            {MILESTONES.map((milestone, idx) => {
                                const colors = categoryColors[milestone.category];
                                const Icon = iconMap[milestone.icon];
                                const isPast = milestone.week <= currentWeek;
                                const isCurrent = idx === currentMilestoneIdx;
                                const isExpanded = expandedWeek === milestone.week;

                                return (
                                    <div key={milestone.week}>
                                        <button
                                            onClick={() => setExpandedWeek(isExpanded ? null : milestone.week)}
                                            className={`w-full text-left relative flex items-start space-x-4 p-3 rounded-xl transition-all ${isCurrent
                                                    ? 'bg-pink-50 ring-2 ring-pink-300'
                                                    : isExpanded
                                                        ? 'bg-gray-50'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            {/* Dot */}
                                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPast ? colors.bg : 'bg-gray-100'
                                                }`}>
                                                <Icon className={`w-4 h-4 ${isPast ? colors.text : 'text-gray-400'}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className={`text-xs font-semibold ${isPast ? 'text-pink-600' : 'text-gray-400'}`}>
                                                            Week {milestone.week}
                                                        </span>
                                                        <h4 className={`font-semibold text-sm ${isPast ? 'text-gray-800' : 'text-gray-500'}`}>
                                                            {milestone.title}
                                                        </h4>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="ml-12 mr-3 mb-3 animate-fadeIn">
                                                <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
                                                    <p className="text-sm text-gray-700 mb-2">{milestone.description}</p>
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        🍎 Baby is the size of a <strong>{milestone.babySize}</strong>
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {milestone.tips.map((tip, i) => (
                                                            <li key={i} className="text-xs text-gray-600 flex items-start space-x-1">
                                                                <span>•</span>
                                                                <span>{tip}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
