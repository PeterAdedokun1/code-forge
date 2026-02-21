/**
 * AuthProvider — Supabase authentication context.
 *
 * Handles sign-up, login, logout, session persistence,
 * and user profile loading from the `profiles` table.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { supabase, type Profile } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────

interface AuthState {
    /** true while we're checking if a session exists on mount */
    loading: boolean;
    /** Supabase Auth user object (null = not logged in) */
    user: User | null;
    /** The profile row from the `profiles` table (null = needs onboarding) */
    profile: Profile | null;
    /** Sign up with email + password */
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    /** Log in with email + password */
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    /** Log out */
    signOut: () => Promise<void>;
    /** Create or update the user's profile row */
    saveProfile: (data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: string | null }>;
    /** Re-fetch the profile (e.g. after editing) */
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// ── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    // ── Fetch profile from DB ──
    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows found (profile not yet created)
                console.error('Profile fetch error:', error.message);
            }
            setProfile(data ?? null);
        } catch (err) {
            console.error('Profile fetch exception:', err);
            setProfile(null);
        }
    }, []);

    // ── Listen for auth changes ──
    useEffect(() => {
        // 1. Check existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // 2. Subscribe to auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            async (_event: string, session: Session | null) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    // ── Sign up ──
    const signUp = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        return { error: null };
    }, []);

    // ── Sign in ──
    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return { error: null };
    }, []);

    // ── Sign out ──
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    }, []);

    // ── Save / upsert profile ──
    const saveProfile = useCallback(
        async (data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => {
            if (!user) return { error: 'Not authenticated' };

            const { error } = await supabase.from('profiles').upsert(
                {
                    id: user.id,
                    ...data,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );

            if (error) return { error: error.message };

            // Refresh local profile
            await fetchProfile(user.id);
            return { error: null };
        },
        [user, fetchProfile]
    );

    // ── Refresh ──
    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id);
    }, [user, fetchProfile]);

    const value: AuthState = {
        loading,
        user,
        profile,
        signUp,
        signIn,
        signOut,
        saveProfile,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}
