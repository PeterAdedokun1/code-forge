import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, User, Heart, X } from 'lucide-react';

interface CallAlertSimulatorProps {
    patientName: string;
    nurseName?: string;
    onClose?: () => void;
}

export const CallAlertSimulator = ({
    patientName,
    nurseName = 'Nurse Adaeze',
    onClose
}: CallAlertSimulatorProps) => {
    const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
    const [callDuration, setCallDuration] = useState(0);
    const [showTranscript, setShowTranscript] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Call transcript simulation
    const CALL_SCRIPT = [
        { speaker: 'nurse', text: `Hello, good afternoon. Am I speaking with ${patientName}?`, delay: 2000 },
        { speaker: 'patient', text: 'Yes, na me be this.', delay: 5000 },
        { speaker: 'nurse', text: `My name is ${nurseName}, I am a community health nurse assigned to you through the MIMI platform. How are you feeling today?`, delay: 8000 },
        { speaker: 'patient', text: 'My head dey pain me and my body dey swell.', delay: 13000 },
        { speaker: 'nurse', text: 'I see. Our monitoring system flagged your symptoms. Your latest risk score is high. Have you checked your blood pressure recently?', delay: 17000 },
        { speaker: 'patient', text: 'No, I never check am.', delay: 22000 },
        { speaker: 'nurse', text: 'Okay Mama, I need you to go to the nearest hospital today. I have already sent an alert to Lagos University Teaching Hospital. They are expecting you. Can you get there?', delay: 25000 },
        { speaker: 'patient', text: 'Yes, my husband fit carry me go.', delay: 31000 },
        { speaker: 'nurse', text: 'That is wonderful. I will send the directions to your phone. Please go as soon as possible. Call me if you need anything. Take care, Mama. 💕', delay: 35000 },
    ];

    const [visibleLines, setVisibleLines] = useState(0);

    // Auto-connect after ringing
    useEffect(() => {
        if (callState === 'ringing') {
            const timeout = setTimeout(() => {
                setCallState('connected');
                setShowTranscript(true);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [callState]);

    // Timer for call duration
    useEffect(() => {
        if (callState === 'connected') {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [callState]);

    // Progressive transcript reveal
    useEffect(() => {
        if (callState !== 'connected') return;

        const timeouts: ReturnType<typeof setTimeout>[] = [];

        CALL_SCRIPT.forEach((line, index) => {
            const timeout = setTimeout(() => {
                setVisibleLines(index + 1);
            }, line.delay);
            timeouts.push(timeout);
        });

        // Auto-end call after script finishes
        const endTimeout = setTimeout(() => {
            setCallState('ended');
            if (timerRef.current) clearInterval(timerRef.current);
        }, 40000);
        timeouts.push(endTimeout);

        return () => timeouts.forEach(t => clearTimeout(t));
    }, [callState]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndCall = () => {
        setCallState('ended');
        if (timerRef.current) clearInterval(timerRef.current);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
                {/* Call Header */}
                <div className={`p-8 text-center text-white ${callState === 'ringing' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                        callState === 'connected' ? 'bg-gradient-to-br from-pink-500 to-purple-600' :
                            'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}

                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${callState === 'ringing' ? 'bg-white/20 animate-pulse' : 'bg-white/20'
                        }`}>
                        {callState === 'ended' ? (
                            <PhoneOff className="w-10 h-10" />
                        ) : (
                            <User className="w-10 h-10" />
                        )}
                    </div>

                    <h2 className="text-xl font-bold">{nurseName}</h2>
                    <p className="text-white/80 text-sm mt-1">Community Health Nurse</p>

                    {callState === 'ringing' && (
                        <div className="mt-4 flex items-center justify-center space-x-2">
                            <Phone className="w-4 h-4 animate-bounce" />
                            <span className="text-sm animate-pulse">Calling {patientName}...</span>
                        </div>
                    )}

                    {callState === 'connected' && (
                        <div className="mt-4">
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-sm">Connected • {formatDuration(callDuration)}</span>
                            </div>
                        </div>
                    )}

                    {callState === 'ended' && (
                        <div className="mt-4">
                            <p className="text-sm">Call ended • {formatDuration(callDuration)}</p>
                        </div>
                    )}
                </div>

                {/* Transcript */}
                {showTranscript && (
                    <div className="p-4 max-h-64 overflow-y-auto space-y-3">
                        <p className="text-xs text-gray-500 text-center mb-2">Live Transcript</p>
                        {CALL_SCRIPT.slice(0, visibleLines).map((line, index) => (
                            <div
                                key={index}
                                className={`flex ${line.speaker === 'nurse' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                            >
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${line.speaker === 'nurse'
                                        ? 'bg-pink-50 text-gray-800 border border-pink-100'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    <p className="text-xs font-semibold mb-0.5 text-pink-600">
                                        {line.speaker === 'nurse' ? `🩺 ${nurseName}` : `👩 ${patientName}`}
                                    </p>
                                    <p className="text-xs">{line.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Call Controls */}
                <div className="p-6 flex justify-center space-x-6">
                    {callState !== 'ended' ? (
                        <button
                            onClick={handleEndCall}
                            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all transform hover:scale-105"
                        >
                            <PhoneOff className="w-7 h-7" />
                        </button>
                    ) : (
                        <div className="flex flex-col items-center space-y-4 w-full">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full">
                                <div className="flex items-start space-x-3">
                                    <Heart className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">Follow-up Complete</p>
                                        <p className="text-xs text-green-700 mt-1">
                                            {nurseName} has connected with {patientName}. Hospital has been notified and directions have been shared. Human connection made. 💕
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
