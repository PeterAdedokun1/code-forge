/**
 * MedicationTracker — Daily medication adherence tracker.
 *
 * Tracks folic acid and iron supplement intake with streaks and calendar view.
 */

import { useState, useMemo } from 'react';
import { Pill, Flame, CheckCircle, Circle, Calendar, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMimi } from '../context/MimiProvider';

export const MedicationTracker = () => {
    const { medLog, toggleMed, getMedStreak } = useMimi();
    const [weekOffset, setWeekOffset] = useState(0);

    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const streak = getMedStreak();

    // Generate week days
    const weekDays = useMemo(() => {
        const days: { key: string; label: string; dayName: string; isToday: boolean }[] = [];
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1 + weekOffset * 7);

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            days.push({
                key,
                label: d.getDate().toString(),
                dayName: d.toLocaleDateString('en', { weekday: 'short' }),
                isToday: key === todayKey,
            });
        }
        return days;
    }, [weekOffset, todayKey]);

    const getEntry = (date: string) =>
        medLog.find((e) => e.date === date) || { date, folicAcid: false, iron: false };

    // Streak flame color


    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50 p-4">
            <div className="max-w-md mx-auto space-y-4">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center">
                        <Pill className="w-6 h-6 mr-2 text-pink-500" />
                        Medication Tracker
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Track your daily supplements to keep you and baby healthy
                    </p>
                </div>

                {/* Streak Banner */}
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                <Flame className={`w-8 h-8 ${streak >= 7 ? 'text-white' : 'text-white/70'}`} />
                            </div>
                            <div>
                                <p className="text-3xl font-black">{streak}</p>
                                <p className="text-sm text-white/80">day streak</p>
                            </div>
                        </div>
                        {streak >= 7 && (
                            <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
                                <Award className="w-4 h-4" />
                                <span className="text-xs font-semibold">
                                    {streak >= 30 ? 'Champion! 🏆' : streak >= 14 ? 'Amazing! ⭐' : 'Great! 🔥'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Today's Medications */}
                <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                    <h2 className="font-bold text-gray-800">Today's Medications</h2>

                    {/* Folic Acid */}
                    <button
                        onClick={() => toggleMed(todayKey, 'folicAcid')}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${getEntry(todayKey).folicAcid
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-pink-300'
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEntry(todayKey).folicAcid ? 'bg-green-100' : 'bg-pink-100'
                                }`}>
                                <Pill className={`w-5 h-5 ${getEntry(todayKey).folicAcid ? 'text-green-600' : 'text-pink-600'
                                    }`} />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-800">Folic Acid</p>
                                <p className="text-xs text-gray-500">400μg daily — prevents neural tube defects</p>
                            </div>
                        </div>
                        {getEntry(todayKey).folicAcid ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                            <Circle className="w-6 h-6 text-gray-300" />
                        )}
                    </button>

                    {/* Iron */}
                    <button
                        onClick={() => toggleMed(todayKey, 'iron')}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${getEntry(todayKey).iron
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-pink-300'
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEntry(todayKey).iron ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                <Pill className={`w-5 h-5 ${getEntry(todayKey).iron ? 'text-green-600' : 'text-red-600'
                                    }`} />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-800">Iron Supplement</p>
                                <p className="text-xs text-gray-500">27mg daily — prevents anemia</p>
                            </div>
                        </div>
                        {getEntry(todayKey).iron ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                            <Circle className="w-6 h-6 text-gray-300" />
                        )}
                    </button>
                </div>

                {/* Weekly Calendar */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-800 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-pink-500" />
                            This Week
                        </h2>
                        <div className="flex space-x-1">
                            <button
                                onClick={() => setWeekOffset((w) => w - 1)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="px-2 py-1 text-xs text-pink-600 hover:bg-pink-50 rounded-lg transition-colors font-medium"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={weekOffset >= 0}
                            >
                                <ChevronRight className={`w-4 h-4 ${weekOffset >= 0 ? 'text-gray-300' : 'text-gray-600'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map((day) => {
                            const entry = getEntry(day.key);
                            const bothTaken = entry.folicAcid && entry.iron;
                            const someTaken = entry.folicAcid || entry.iron;

                            return (
                                <div
                                    key={day.key}
                                    className={`text-center p-2 rounded-xl transition-all ${day.isToday
                                        ? 'ring-2 ring-pink-400 bg-pink-50'
                                        : 'bg-gray-50'
                                        }`}
                                >
                                    <p className="text-[10px] text-gray-500 mb-1">{day.dayName}</p>
                                    <p className={`text-sm font-bold ${day.isToday ? 'text-pink-600' : 'text-gray-700'}`}>
                                        {day.label}
                                    </p>
                                    <div className="mt-1">
                                        {bothTaken ? (
                                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                        ) : someTaken ? (
                                            <div className="w-4 h-4 mx-auto bg-yellow-400 rounded-full" />
                                        ) : (
                                            <div className="w-4 h-4 mx-auto bg-gray-200 rounded-full" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span>All taken</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                            <span>Partial</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-gray-200 rounded-full" />
                            <span>Missed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
