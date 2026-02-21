/**
 * OnboardingPage — First-time profile setup after signup.
 *
 * Collects essential health data: name, age, gestational week,
 * due date, location, phone. Saves to Supabase `profiles` table.
 */

import { useState, type FormEvent } from 'react';
import { Heart, User, Calendar, MapPin, Phone, Baby, Loader2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';

export const OnboardingPage = () => {
    const { saveProfile, signOut } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fields
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [gestationalWeek, setGestationalWeek] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [location, setLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [language, setLanguage] = useState('en');

    const totalSteps = 3;

    const validateStep = (s: number): string | null => {
        switch (s) {
            case 1:
                if (!fullName.trim()) return 'Please enter your name';
                if (!age || +age < 15 || +age > 50) return 'Please enter a valid age (15–50)';
                return null;
            case 2:
                if (!gestationalWeek || +gestationalWeek < 0 || +gestationalWeek > 42) return 'Enter gestational week (0–42)';
                if (!dueDate) return 'Please enter your due date';
                return null;
            case 3:
                if (!location.trim()) return 'Please enter your location';
                if (!phone.trim()) return 'Please enter your phone number';
                return null;
            default:
                return null;
        }
    };

    const nextStep = () => {
        const err = validateStep(step);
        if (err) {
            setError(err);
            return;
        }
        setError('');
        setStep(step + 1);
    };

    const prevStep = () => {
        setError('');
        setStep(step - 1);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const err = validateStep(step);
        if (err) {
            setError(err);
            return;
        }

        setLoading(true);
        setError('');

        const { error: saveError } = await saveProfile({
            full_name: fullName.trim(),
            age: +age,
            gestational_week: +gestationalWeek,
            due_date: dueDate,
            location: location.trim(),
            phone: phone.trim(),
            language_preference: language,
            medical_history: {},
            folic_acid_adherence: 0,
            last_checkup: new Date().toISOString(),
        });

        if (saveError) {
            setError(saveError);
        }
        setLoading(false);
    };

    const progressPercent = (step / totalSteps) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col items-center justify-center p-4">
            {/* Header */}
            <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30">
                    <Heart className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Set Up Your Profile</h1>
                <p className="text-gray-500 text-sm mt-1">Tell MIMI about yourself so she can help you better</p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md mb-6">
                <div className="flex items-center justify-between mb-2">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s <= step
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                        >
                            {s}
                        </div>
                    ))}
                </div>
                <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/50">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 animate-fadeIn">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex items-center space-x-2 mb-4">
                                <User className="w-5 h-5 text-pink-500" />
                                <h2 className="text-lg font-bold text-gray-800">Personal Information</h2>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Amina Ibrahim"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="e.g. 28"
                                    min={15}
                                    max={50}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Language</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800"
                                >
                                    <option value="en">🇬🇧 English</option>
                                    <option value="pcm">🇳🇬 Nigerian Pidgin</option>
                                    <option value="yo">🟢 Yoruba</option>
                                    <option value="ha">🟡 Hausa</option>
                                    <option value="ig">🔴 Igbo</option>
                                    <option value="fr">🇫🇷 French</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Pregnancy Info */}
                    {step === 2 && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex items-center space-x-2 mb-4">
                                <Baby className="w-5 h-5 text-pink-500" />
                                <h2 className="text-lg font-bold text-gray-800">Pregnancy Details</h2>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Current Gestational Week
                                </label>
                                <input
                                    type="number"
                                    value={gestationalWeek}
                                    onChange={(e) => setGestationalWeek(e.target.value)}
                                    placeholder="e.g. 28"
                                    min={0}
                                    max={42}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Ask your doctor if you're unsure. This helps MIMI personalize your journey.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Due Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Helpful info */}
                            <div className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                                <p className="text-xs text-gray-600">
                                    💡 <strong>Tip:</strong> Your due date is usually calculated as 40 weeks from the
                                    first day of your last menstrual period. Your doctor can confirm this with an ultrasound.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Contact Info */}
                    {step === 3 && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex items-center space-x-2 mb-4">
                                <MapPin className="w-5 h-5 text-pink-500" />
                                <h2 className="text-lg font-bold text-gray-800">Contact & Location</h2>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. Ajegunle, Lagos"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    This helps find nearby hospitals during emergencies.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. +234-800-123-4567"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Reassurance */}
                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                <p className="text-xs text-gray-600">
                                    🔒 Your information is securely stored and only shared with your assigned health worker.
                                    You can update these details anytime in Settings.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex space-x-3 mt-6">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-50 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Back</span>
                            </button>
                        )}

                        {step < totalSteps ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-pink-500/30 flex items-center justify-center space-x-2"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-pink-500/30 disabled:shadow-none flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>Complete Setup</span>
                                        <Heart className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>

                {/* Sign out link */}
                <div className="mt-4 text-center">
                    <button
                        onClick={signOut}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Sign out and use a different account
                    </button>
                </div>
            </div>
        </div>
    );
};
