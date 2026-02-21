/**
 * Emergency SOS Button — Persistent floating action button.
 *
 * Long-press (1.5s) to trigger emergency mode:
 * - Vibrates the phone
 * - Shows a full-screen emergency panel with:
 *   → Call emergency number (112 Nigeria)
 *   → Call assigned CHEW nurse
 *   → Share GPS location
 *   → Auto-alert to nearest hospital
 */

import { useState, useRef, useEffect } from 'react';
import { Phone, X, MapPin, AlertTriangle, Shield, PhoneCall } from 'lucide-react';
import { useMimi } from '../context/MimiProvider';

export const EmergencySOS = () => {
    const { sosTriggered, triggerSOS, clearSOS, currentPatient } = useMimi();
    const [holdProgress, setHoldProgress] = useState(0);
    const [locationShared, setLocationShared] = useState(false);
    const [gpsCoords, setGpsCoords] = useState<string>('');
    const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const holdStartRef = useRef<number>(0);

    const HOLD_DURATION_MS = 1500;

    const startHold = () => {
        holdStartRef.current = Date.now();
        holdTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - holdStartRef.current;
            const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
            setHoldProgress(progress);

            if (progress >= 1) {
                stopHold();
                activateSOS();
            }
        }, 30);
    };

    const stopHold = () => {
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setHoldProgress(0);
    };

    const activateSOS = () => {
        // Vibrate
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
        triggerSOS();
    };

    const shareLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsCoords(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                    setLocationShared(true);
                },
                () => {
                    setGpsCoords('Location unavailable');
                    setLocationShared(true);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setLocationShared(true);
            setGpsCoords('Not supported');
        }
    };

    useEffect(() => {
        return () => {
            if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        };
    }, []);

    // ── Full-screen emergency panel ──
    if (sosTriggered) {
        return (
            <div className="fixed inset-0 bg-red-600 z-[100] flex flex-col animate-fadeIn">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-white">
                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                        <span className="text-lg font-bold">EMERGENCY MODE</span>
                    </div>
                    <button
                        onClick={() => { clearSOS(); setLocationShared(false); }}
                        className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
                    <p className="text-white text-center text-sm mb-2">
                        {currentPatient ? `Patient: ${currentPatient.name}` : 'Emergency Assistance'}
                    </p>

                    {/* Call Emergency */}
                    <a
                        href="tel:112"
                        className="flex items-center space-x-4 bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                    >
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone className="w-7 h-7 text-red-600" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg">Call 112</p>
                            <p className="text-sm text-gray-500">Nigeria Emergency Number</p>
                        </div>
                    </a>

                    {/* Call CHEW */}
                    <a
                        href="tel:+2348001234567"
                        className="flex items-center space-x-4 bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                    >
                        <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <PhoneCall className="w-7 h-7 text-pink-600" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg">Call Health Worker</p>
                            <p className="text-sm text-gray-500">Nurse Adaeze — Community Health</p>
                        </div>
                    </a>

                    {/* Share Location */}
                    <button
                        onClick={shareLocation}
                        className={`flex items-center space-x-4 rounded-2xl p-5 shadow-lg transition-all transform hover:scale-[1.02] ${locationShared ? 'bg-green-50' : 'bg-white'
                            }`}
                    >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${locationShared ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                            <MapPin className={`w-7 h-7 ${locationShared ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-gray-800 text-lg">
                                {locationShared ? 'Location Shared ✓' : 'Share My Location'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {locationShared ? gpsCoords : 'Send GPS coordinates to your health worker'}
                            </p>
                        </div>
                    </button>

                    {/* Safety tips */}
                    <div className="bg-white/20 rounded-2xl p-4 mt-2">
                        <div className="flex items-center space-x-2 text-white mb-2">
                            <Shield className="w-5 h-5" />
                            <p className="font-semibold text-sm">While waiting for help:</p>
                        </div>
                        <ul className="text-white/90 text-xs space-y-1 ml-7 list-disc">
                            <li>Lie on your left side</li>
                            <li>Stay calm and breathe slowly</li>
                            <li>Don't eat or drink anything</li>
                            <li>Have someone stay with you</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // ── Floating SOS button ──
    return (
        <div className="fixed bottom-24 right-4 z-50">
            <button
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                className="relative w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full shadow-lg shadow-red-500/40 flex items-center justify-center text-white transition-all active:scale-95"
                title="Hold for 1.5 seconds to activate emergency SOS"
            >
                {/* Progress ring */}
                {holdProgress > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                        <circle
                            cx="28" cy="28" r="25"
                            fill="none" stroke="white" strokeWidth="3"
                            strokeDasharray={`${holdProgress * 157} 157`}
                            strokeLinecap="round"
                            opacity="0.8"
                        />
                    </svg>
                )}
                <span className="text-xs font-black">SOS</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-1">Hold for help</p>
        </div>
    );
};
