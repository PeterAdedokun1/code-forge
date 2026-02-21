/**
 * KickCounter — Baby kick tracking tool.
 *
 * Medical guidance: 10 kicks in 2 hours = healthy.
 * Provides a simple tap-to-count interface with timer and history.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Baby, Clock, CheckCircle, History, Play, Square, RotateCcw, TrendingUp } from 'lucide-react';
import { useMimi } from '../context/MimiProvider';

export const KickCounter = () => {
    const { kickSessions, addKickSession } = useMimi();
    const [counting, setCounting] = useState(false);
    const [kicks, setKicks] = useState(0);
    const [elapsed, setElapsed] = useState(0); // seconds
    const [showHistory, setShowHistory] = useState(false);
    const [complete, setComplete] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    const TARGET_KICKS = 10;
    const MAX_MINUTES = 120; // 2 hours

    const startCounting = useCallback(() => {
        setCounting(true);
        setKicks(0);
        setElapsed(0);
        setComplete(false);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
    }, []);

    const stopCounting = useCallback(() => {
        setCounting(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        // Save session
        if (kicks > 0) {
            addKickSession({
                id: `kick_${Date.now()}`,
                date: new Date().toISOString(),
                kicks,
                durationMinutes: Math.ceil(elapsed / 60),
                complete: kicks >= TARGET_KICKS,
            });
        }
    }, [kicks, elapsed, addKickSession]);

    const recordKick = useCallback(() => {
        if (!counting) return;
        const newKicks = kicks + 1;
        setKicks(newKicks);

        // Vibrate feedback
        if (navigator.vibrate) navigator.vibrate(50);

        if (newKicks >= TARGET_KICKS) {
            setComplete(true);
            stopCounting();
        }
    }, [counting, kicks, stopCounting]);

    const resetCounter = () => {
        setCounting(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setKicks(0);
        setElapsed(0);
        setComplete(false);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = Math.min(kicks / TARGET_KICKS, 1);
    const circumference = 2 * Math.PI * 80;

    // Recent sessions (last 7)
    const recentSessions = [...kickSessions].reverse().slice(0, 7);

    if (showHistory) {
        return (
            <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50 p-4">
                <div className="max-w-md mx-auto space-y-4">
                    <button
                        onClick={() => setShowHistory(false)}
                        className="text-pink-600 hover:text-pink-700 font-medium text-sm"
                    >
                        ← Back to Counter
                    </button>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4">
                            <History className="w-5 h-5 mr-2 text-pink-500" />
                            Kick History
                        </h2>

                        {recentSessions.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No sessions recorded yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentSessions.map((session) => {
                                    const date = new Date(session.date);
                                    return (
                                        <div
                                            key={session.id}
                                            className={`p-4 rounded-xl border-2 ${session.complete
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-yellow-200 bg-yellow-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-800">
                                                        {session.kicks} kicks in {session.durationMinutes} min
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                {session.complete ? (
                                                    <div className="flex items-center text-green-600 text-xs font-semibold">
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Healthy
                                                    </div>
                                                ) : (
                                                    <div className="text-yellow-600 text-xs font-semibold">
                                                        Incomplete
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50 p-4">
            <div className="max-w-md mx-auto space-y-4">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 flex items-center">
                                <Baby className="w-6 h-6 mr-2 text-pink-500" />
                                Kick Counter
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Count {TARGET_KICKS} kicks within {MAX_MINUTES / 60} hours = healthy baby
                            </p>
                        </div>
                        <button
                            onClick={() => setShowHistory(true)}
                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <History className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Counter circle */}
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
                    {/* Circular progress */}
                    <div className="relative w-48 h-48 mb-6">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                            <circle
                                cx="90" cy="90" r="80"
                                fill="none"
                                stroke="#F3E8FF"
                                strokeWidth="10"
                            />
                            <circle
                                cx="90" cy="90" r="80"
                                fill="none"
                                stroke={complete ? '#22C55E' : '#EC4899'}
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - progress)}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-5xl font-black ${complete ? 'text-green-500' : 'text-pink-500'}`}>
                                {kicks}
                            </span>
                            <span className="text-sm text-gray-500 mt-1">of {TARGET_KICKS} kicks</span>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center space-x-2 text-gray-600 mb-6">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-lg">{formatTime(elapsed)}</span>
                    </div>

                    {/* Complete celebration */}
                    {complete && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4 w-full text-center animate-fadeIn">
                            <div className="flex items-center justify-center space-x-2 text-green-700 mb-1">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-bold">Baby is active! 🎉</span>
                            </div>
                            <p className="text-xs text-green-600">
                                {kicks} kicks in {Math.ceil(elapsed / 60)} minutes — that's great!
                            </p>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex space-x-3 w-full">
                        {!counting && !complete && (
                            <button
                                onClick={startCounting}
                                className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/30"
                            >
                                <Play className="w-5 h-5" />
                                <span>Start Counting</span>
                            </button>
                        )}

                        {counting && (
                            <>
                                <button
                                    onClick={recordKick}
                                    className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/30 active:scale-95"
                                >
                                    <Baby className="w-6 h-6" />
                                    <span>TAP FOR KICK</span>
                                </button>
                                <button
                                    onClick={stopCounting}
                                    className="w-14 h-14 bg-gray-200 hover:bg-gray-300 rounded-xl flex items-center justify-center transition-colors"
                                >
                                    <Square className="w-5 h-5 text-gray-600" />
                                </button>
                            </>
                        )}

                        {complete && (
                            <button
                                onClick={resetCounter}
                                className="flex-1 py-4 bg-white border-2 border-pink-500 text-pink-600 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-pink-50 transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>New Session</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick stats */}
                {recentSessions.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-pink-500" />
                            <p className="text-sm font-semibold text-gray-700">Recent Activity</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-pink-50 rounded-xl">
                                <p className="text-2xl font-bold text-pink-600">{recentSessions.length}</p>
                                <p className="text-xs text-gray-500">Sessions</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-xl">
                                <p className="text-2xl font-bold text-green-600">
                                    {recentSessions.filter((s) => s.complete).length}
                                </p>
                                <p className="text-xs text-gray-500">Healthy</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-xl">
                                <p className="text-2xl font-bold text-purple-600">
                                    {recentSessions.reduce((a, s) => a + s.kicks, 0)}
                                </p>
                                <p className="text-xs text-gray-500">Total Kicks</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info card */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 text-white">
                    <h3 className="font-bold mb-2">💡 When to count kicks</h3>
                    <ul className="text-sm text-white/90 space-y-1 list-disc ml-4">
                        <li>Start from <strong>week 28</strong> of pregnancy</li>
                        <li>Count after meals when baby is most active</li>
                        <li>Lie on your left side for best results</li>
                        <li>If fewer than 10 kicks in 2 hours, contact your doctor</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
