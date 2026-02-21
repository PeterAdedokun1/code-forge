import { useState } from 'react';
import { MapPin, Navigation, Phone, Clock, Star, Send, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';

interface Hospital {
    id: string;
    name: string;
    type: 'hospital' | 'clinic' | 'health_center';
    distance: string;
    eta: string;
    address: string;
    phone: string;
    rating: number;
    status: 'available' | 'limited' | 'full';
    specialties: string[];
    verified: boolean;
    coordinates: { lat: number; lng: number };
}

interface HospitalMapProps {
    patientName?: string;
    patientLocation?: string;
    onSendAlert?: (hospitalId: string) => void;
    onBack?: () => void;
}

const MOCK_HOSPITALS: Hospital[] = [
    {
        id: 'h1',
        name: 'Lagos University Teaching Hospital',
        type: 'hospital',
        distance: '3.2 km',
        eta: '15 min',
        address: 'Idi-Araba, Surulere, Lagos',
        phone: '+234-802-345-6789',
        rating: 4.5,
        status: 'available',
        specialties: ['Obstetrics', 'Gynaecology', 'Neonatal Care', 'Emergency'],
        verified: true,
        coordinates: { lat: 6.5170, lng: 3.3573 }
    },
    {
        id: 'h2',
        name: 'Island Maternity Hospital',
        type: 'hospital',
        distance: '5.1 km',
        eta: '22 min',
        address: 'Lagos Island, Lagos',
        phone: '+234-803-456-7890',
        rating: 4.2,
        status: 'available',
        specialties: ['Maternity', 'Obstetrics', 'Antenatal Care'],
        verified: true,
        coordinates: { lat: 6.4530, lng: 3.3956 }
    },
    {
        id: 'h3',
        name: 'Ajeromi General Hospital',
        type: 'hospital',
        distance: '1.8 km',
        eta: '8 min',
        address: 'Ajegunle, Lagos',
        phone: '+234-804-567-8901',
        rating: 3.8,
        status: 'limited',
        specialties: ['General Medicine', 'Maternity', 'Emergency'],
        verified: true,
        coordinates: { lat: 6.4527, lng: 3.3439 }
    },
    {
        id: 'h4',
        name: 'EKO Hospital Ikeja',
        type: 'hospital',
        distance: '8.5 km',
        eta: '35 min',
        address: 'Mobolaji Bank Anthony Way, Ikeja, Lagos',
        phone: '+234-805-678-9012',
        rating: 4.7,
        status: 'available',
        specialties: ['Obstetrics', 'Gynaecology', 'High-Risk Pregnancy', 'NICU'],
        verified: true,
        coordinates: { lat: 6.6018, lng: 3.3515 }
    }
];

export const HospitalMap = ({
    patientName = 'Patient',
    patientLocation = 'Ajegunle, Lagos',
    onSendAlert,
    onBack
}: HospitalMapProps) => {
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [alertSent, setAlertSent] = useState<Set<string>>(new Set());
    const [directionsSent, setDirectionsSent] = useState<Set<string>>(new Set());

    const handleSendAlert = (hospital: Hospital) => {
        setAlertSent(prev => new Set(prev).add(hospital.id));
        if (onSendAlert) onSendAlert(hospital.id);

        // Simulate alert sent
        setTimeout(() => {
            setDirectionsSent(prev => new Set(prev).add(hospital.id));
        }, 1500);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">Available</span>;
            case 'limited':
                return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-semibold">Limited</span>;
            default:
                return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-semibold">Full</span>;
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star
                        key={i}
                        className={`w-3 h-3 ${i <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                ))}
                <span className="text-xs text-gray-600 ml-1">{rating}</span>
            </div>
        );
    };

    if (selectedHospital) {
        const isAlertSent = alertSent.has(selectedHospital.id);
        const hasDirections = directionsSent.has(selectedHospital.id);

        return (
            <div className="max-w-lg mx-auto p-4 space-y-4">
                <button
                    onClick={() => setSelectedHospital(null)}
                    className="text-pink-600 hover:text-pink-700 font-medium text-sm"
                >
                    ← Back to hospitals
                </button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Hospital Map Mock */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 overflow-hidden">
                        {/* Simplified map with roads */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                            {/* Roads */}
                            <line x1="0" y1="100" x2="400" y2="100" stroke="#E5E7EB" strokeWidth="8" />
                            <line x1="200" y1="0" x2="200" y2="200" stroke="#E5E7EB" strokeWidth="6" />
                            <line x1="50" y1="50" x2="350" y2="150" stroke="#E5E7EB" strokeWidth="4" />
                            <line x1="100" y1="0" x2="100" y2="200" stroke="#F3F4F6" strokeWidth="3" />
                            <line x1="300" y1="0" x2="300" y2="200" stroke="#F3F4F6" strokeWidth="3" />

                            {/* Route line (dashed) */}
                            <line x1="150" y1="130" x2="270" y2="70" stroke="#EC4899" strokeWidth="3" strokeDasharray="8,4">
                                <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
                            </line>

                            {/* Patient location */}
                            <circle cx="150" cy="130" r="8" fill="#EC4899" opacity="0.3">
                                <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="150" cy="130" r="6" fill="#EC4899" />
                            <text x="110" y="155" fontSize="10" fill="#BE185D" fontWeight="bold">You</text>

                            {/* Hospital location */}
                            <rect x="258" y="55" width="24" height="24" rx="4" fill="#7C3AED" />
                            <text x="265" y="72" fontSize="12" fill="white" fontWeight="bold">H</text>
                            <text x="235" y="50" fontSize="9" fill="#6D28D9" fontWeight="bold">{selectedHospital.name.split(' ')[0]}</text>
                        </svg>

                        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
                            <div className="flex items-center space-x-1 text-xs">
                                <Navigation className="w-3 h-3 text-pink-500" />
                                <span className="font-semibold text-gray-700">{selectedHospital.eta} drive</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selectedHospital.name}</h2>
                                <div className="flex items-center space-x-2 mt-1">
                                    {getStatusBadge(selectedHospital.status)}
                                    {selectedHospital.verified && (
                                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold flex items-center space-x-1">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>Verified</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                            {renderStars(selectedHospital.rating)}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                <span>{selectedHospital.address}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                <span>{selectedHospital.distance} away • {selectedHospital.eta}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                <span>{selectedHospital.phone}</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Specialties</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedHospital.specialties.map((spec, i) => (
                                    <span key={i} className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                onClick={() => handleSendAlert(selectedHospital)}
                                disabled={isAlertSent}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all
                  ${isAlertSent
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/30 transform hover:scale-[1.02]'
                                    }`}
                            >
                                {isAlertSent ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        <span>{hasDirections ? 'Alert Sent & Directions Shared' : 'Sending Alert...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>Send Alert & Directions</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => window.open(`tel:${selectedHospital.phone}`)}
                                className="w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 bg-white border-2 border-pink-500 text-pink-600 hover:bg-pink-50 transition-colors"
                            >
                                <Phone className="w-5 h-5" />
                                <span>Call Hospital</span>
                            </button>
                        </div>

                        {isAlertSent && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fadeIn">
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">Alert Sent Successfully!</p>
                                        <p className="text-xs text-green-700 mt-1">
                                            {selectedHospital.name} has been notified about {patientName}'s emergency.
                                            Directions from {patientLocation} have been shared.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto p-4 space-y-4">
            {onBack && (
                <button
                    onClick={onBack}
                    className="text-pink-600 hover:text-pink-700 font-medium text-sm"
                >
                    ← Back
                </button>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center space-x-3 mb-2">
                    <AlertTriangle className="w-6 h-6" />
                    <h1 className="text-xl font-bold">Find Nearest Hospital</h1>
                </div>
                <p className="text-pink-100 text-sm">
                    Showing verified hospitals near {patientLocation}
                </p>
            </div>

            {/* Map Overview */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="relative h-52 bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220">
                        {/* Grid roads */}
                        <line x1="0" y1="70" x2="400" y2="70" stroke="#E5E7EB" strokeWidth="5" />
                        <line x1="0" y1="140" x2="400" y2="140" stroke="#E5E7EB" strokeWidth="5" />
                        <line x1="80" y1="0" x2="80" y2="220" stroke="#E5E7EB" strokeWidth="4" />
                        <line x1="200" y1="0" x2="200" y2="220" stroke="#E5E7EB" strokeWidth="5" />
                        <line x1="320" y1="0" x2="320" y2="220" stroke="#E5E7EB" strokeWidth="4" />
                        <line x1="0" y1="180" x2="400" y2="30" stroke="#F3F4F6" strokeWidth="3" />

                        {/* Patient marker */}
                        <circle cx="200" cy="120" r="12" fill="#EC4899" opacity="0.2">
                            <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="200" cy="120" r="8" fill="#EC4899" stroke="white" strokeWidth="3" />

                        {/* Hospital markers */}
                        <g className="cursor-pointer" onClick={() => setSelectedHospital(MOCK_HOSPITALS[0])}>
                            <rect x="268" y="58" width="20" height="20" rx="3" fill="#7C3AED" />
                            <text x="273" y="73" fontSize="11" fill="white" fontWeight="bold">H</text>
                        </g>
                        <g className="cursor-pointer" onClick={() => setSelectedHospital(MOCK_HOSPITALS[1])}>
                            <rect x="310" y="128" width="20" height="20" rx="3" fill="#7C3AED" />
                            <text x="315" y="143" fontSize="11" fill="white" fontWeight="bold">H</text>
                        </g>
                        <g className="cursor-pointer" onClick={() => setSelectedHospital(MOCK_HOSPITALS[2])}>
                            <rect x="128" y="98" width="20" height="20" rx="3" fill="#F59E0B" />
                            <text x="133" y="113" fontSize="11" fill="white" fontWeight="bold">H</text>
                        </g>
                        <g className="cursor-pointer" onClick={() => setSelectedHospital(MOCK_HOSPITALS[3])}>
                            <rect x="85" y="35" width="20" height="20" rx="3" fill="#7C3AED" />
                            <text x="90" y="50" fontSize="11" fill="white" fontWeight="bold">H</text>
                        </g>
                    </svg>

                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center space-x-2 text-xs">
                            <div className="w-3 h-3 bg-pink-500 rounded-full" />
                            <span className="text-gray-700">Your location</span>
                            <div className="w-3 h-3 bg-purple-600 rounded" />
                            <span className="text-gray-700">Hospital</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hospital list */}
            <div className="space-y-3">
                {MOCK_HOSPITALS.map((hospital) => {
                    const isAlertSentForHospital = alertSent.has(hospital.id);

                    return (
                        <div
                            key={hospital.id}
                            onClick={() => setSelectedHospital(hospital)}
                            className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border border-gray-100"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start space-x-3">
                                    <div className={`p-2 rounded-lg ${hospital.status === 'available' ? 'bg-purple-100' : 'bg-yellow-100'
                                        }`}>
                                        <Building2 className={`w-5 h-5 ${hospital.status === 'available' ? 'text-purple-600' : 'text-yellow-600'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-sm">{hospital.name}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{hospital.address}</p>
                                    </div>
                                </div>
                                {getStatusBadge(hospital.status)}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-xs text-gray-600">
                                    <span className="flex items-center space-x-1">
                                        <Navigation className="w-3 h-3 text-pink-500" />
                                        <span>{hospital.distance}</span>
                                    </span>
                                    <span className="flex items-center space-x-1">
                                        <Clock className="w-3 h-3 text-pink-500" />
                                        <span>{hospital.eta}</span>
                                    </span>
                                    {hospital.verified && (
                                        <span className="flex items-center space-x-1 text-blue-600">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>Verified</span>
                                        </span>
                                    )}
                                </div>
                                {renderStars(hospital.rating)}
                            </div>

                            {isAlertSentForHospital && (
                                <div className="mt-2 bg-green-50 rounded-lg px-3 py-1.5 flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-xs text-green-700 font-medium">Alert sent</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
