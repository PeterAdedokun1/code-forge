/**
 * LoginPage — Beautiful auth page with login/signup toggle.
 *
 * Uses Supabase Auth for email + password authentication.
 */

import { useState, type FormEvent } from 'react';
import { Heart, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';

type Mode = 'login' | 'signup';

export const LoginPage = () => {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (mode === 'signup' && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            if (mode === 'login') {
                const { error: authError } = await signIn(email, password);
                if (authError) setError(authError);
            } else {
                const { error: authError } = await signUp(email, password);
                if (authError) {
                    setError(authError);
                } else {
                    setSignupSuccess(true);
                }
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError('');
        setSignupSuccess(false);
    };

    if (signupSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-fadeIn">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Check Your Email! 📧</h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        We've sent a confirmation link to <strong className="text-pink-600">{email}</strong>.
                        Please click it to activate your account, then come back here to log in.
                    </p>
                    <button
                        onClick={() => { setMode('login'); setSignupSuccess(false); }}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-pink-500/30"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col items-center justify-center p-4">
            {/* Floating decorative elements */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-pink-200/40 rounded-full blur-2xl" />
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-200/40 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-blue-200/40 rounded-full blur-2xl" />

            {/* Logo + Greeting */}
            <div className="mb-8 text-center relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-pink-500/40 ring-4 ring-white">
                    <Heart className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    MIMI
                </h1>
                <p className="text-gray-500 text-sm mt-1">Maternal Intelligence Medical Interface</p>
            </div>

            {/* Auth Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10 border border-white/50">
                <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-500 text-sm text-center mb-6">
                    {mode === 'login'
                        ? 'Sign in to continue your pregnancy journey'
                        : 'Start your journey with MIMI'}
                </p>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 animate-fadeIn">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="mama@example.com"
                                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password (signup only) */}
                    {mode === 'signup' && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-500/30 disabled:shadow-none flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button
                            onClick={toggleMode}
                            className="text-pink-600 font-semibold hover:text-pink-700 transition-colors"
                        >
                            {mode === 'login' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-gray-400 text-center relative z-10">
                Built with 💕 for maternal health in Nigeria
            </p>
        </div>
    );
};
