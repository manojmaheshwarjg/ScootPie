'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check if we have a valid session from the reset link
        const checkSession = async () => {
            if (!supabase) {
                setIsValidSession(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            setIsValidSession(!!session);
        };

        checkSession();

        // Listen for auth state changes (user coming from reset email)
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setIsValidSession(true);
                }
            });

            return () => subscription.unsubscribe();
        }
    }, []);

    const handleResetPassword = async () => {
        if (!supabase) {
            setMessage({ type: 'error', text: 'Authentication unavailable' });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords don't match" });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password });

        setIsLoading(false);
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Password updated successfully! Redirecting...' });
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    };

    if (isValidSession === null) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (isValidSession === false) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="font-serif text-2xl mb-4">Invalid or Expired Link</h1>
                    <p className="text-gray-500 mb-6">This password reset link is invalid or has expired. Please request a new one.</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        Return to Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-12">
                    <div className="inline-block w-12 h-12 bg-accent rounded-sm shadow-[0_0_20px_rgba(249,115,22,0.5)] mb-2 rotate-3"></div>
                    <h1 className="font-serif text-5xl mb-6 tracking-tight italic font-bold">Scootpie</h1>
                    <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">AI Virtual Stylist</p>
                </div>

                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-serif text-2xl text-white">Set New Password 🔐</h3>
                            <p className="text-gray-500 text-sm mt-1">Enter your new password below</p>
                        </div>

                        {message ? (
                            <div className={`p-4 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} border rounded-lg`}>
                                {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                                <span className="text-sm">{message.text}</span>
                            </div>
                        ) : null}

                        {(!message || message.type === 'error') && (
                            <>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono uppercase text-gray-500">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Min 6 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-accent focus:outline-none transition-colors pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono uppercase text-gray-500">Confirm New Password</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-accent focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleResetPassword}
                                    disabled={isLoading || !password || !confirmPassword}
                                    className="w-full py-4 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
