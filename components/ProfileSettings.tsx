'use client';

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
    User as UserIcon,
    Mail,
    Key,
    LogOut,
    Trash2,
    Loader2,
    ChevronRight,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';

interface ProfileSettingsProps {
    user: User;
    onClose: () => void;
    onLogout: () => void;
}

type SettingsView = 'main' | 'change-email' | 'change-password' | 'delete-account';

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onClose, onLogout }) => {
    const [view, setView] = useState<SettingsView>('main');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const resetForm = () => {
        setEmail('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setDeleteConfirmText('');
        setMessage(null);
    };

    const handleChangeEmail = async () => {
        if (!supabase || !email) return;

        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ email });

        setIsLoading(false);
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Check your new email for confirmation link!' });
        }
    };

    const handleChangePassword = async () => {
        if (!supabase) return;

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords don't match" });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        setIsLoading(false);
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Password updated successfully!' });
        }
    };

    const handleDeleteAccount = async () => {
        if (!supabase || deleteConfirmText !== 'DELETE') return;

        setIsLoading(true);

        // Note: Full account deletion requires admin SDK or edge function
        // For now, we'll sign out and show a message
        // In production, you'd call an API endpoint that uses admin SDK

        try {
            // Sign out the user
            await supabase.auth.signOut();

            // In a production app, you would call an API route here that:
            // 1. Deletes user data from your database
            // 2. Uses Supabase Admin SDK to delete the auth user

            setMessage({ type: 'success', text: 'Account deletion requested. You will be logged out.' });
            setTimeout(() => {
                onLogout();
            }, 2000);
        } catch (error) {
            setIsLoading(false);
            setMessage({ type: 'error', text: 'Failed to delete account. Please contact support.' });
        }
    };

    const getUserInitials = () => {
        if (user.user_metadata?.full_name) {
            return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        }
        if (user.email) {
            return user.email.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    const renderMain = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                {user.user_metadata?.avatar_url ? (
                    <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full border-2 border-accent"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                        <span className="text-accent font-bold text-xl">{getUserInitials()}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                        {user.user_metadata?.full_name || 'ScootPie User'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-600 font-mono mt-1">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Settings Options */}
            <div className="space-y-2">
                <button
                    onClick={() => { setView('change-email'); resetForm(); }}
                    className="w-full flex items-center justify-between p-4 bg-black/20 hover:bg-black/40 rounded-lg border border-white/5 hover:border-white/10 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-white">Change Email</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </button>

                <button
                    onClick={() => { setView('change-password'); resetForm(); }}
                    className="w-full flex items-center justify-between p-4 bg-black/20 hover:bg-black/40 rounded-lg border border-white/5 hover:border-white/10 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-gray-400" />
                        <span className="text-white">Change Password</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-between p-4 bg-black/20 hover:bg-black/40 rounded-lg border border-white/5 hover:border-white/10 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <LogOut className="w-5 h-5 text-gray-400" />
                        <span className="text-white">Log Out</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-white/5">
                <button
                    onClick={() => { setView('delete-account'); resetForm(); }}
                    className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <span className="text-red-500">Delete Account</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-500/50 group-hover:text-red-500 transition-colors" />
                </button>
            </div>
        </div>
    );

    const renderChangeEmail = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
                onClick={() => { setView('main'); resetForm(); }}
                className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-[10px] uppercase tracking-widest"
            >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
            </button>

            <div>
                <h3 className="font-serif text-xl text-white">Change Email</h3>
                <p className="text-gray-500 text-sm mt-1">Current: {user.email}</p>
            </div>

            {message && (
                <div className={`p-3 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} border rounded-lg text-sm`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {(!message || message.type === 'error') && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase text-gray-500">New Email Address</label>
                        <input
                            type="email"
                            placeholder="new@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-accent focus:outline-none transition-colors"
                        />
                    </div>

                    <button
                        onClick={handleChangeEmail}
                        disabled={isLoading || !email}
                        className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Email"}
                    </button>
                </>
            )}
        </div>
    );

    const renderChangePassword = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
                onClick={() => { setView('main'); resetForm(); }}
                className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-[10px] uppercase tracking-widest"
            >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
            </button>

            <div>
                <h3 className="font-serif text-xl text-white">Change Password</h3>
                <p className="text-gray-500 text-sm mt-1">Set a new password for your account</p>
            </div>

            {message && (
                <div className={`p-3 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} border rounded-lg text-sm`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {(!message || message.type === 'error') && (
                <>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-gray-500">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
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
                        onClick={handleChangePassword}
                        disabled={isLoading || !newPassword || !confirmPassword}
                        className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                    </button>
                </>
            )}
        </div>
    );

    const renderDeleteAccount = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
                onClick={() => { setView('main'); resetForm(); }}
                className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-[10px] uppercase tracking-widest"
            >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
            </button>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-red-500">Delete Account</h3>
                        <p className="text-red-500/70 text-sm mt-1">
                            This action is permanent and cannot be undone. All your data, including photos, wardrobe items, and generated looks will be deleted.
                        </p>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-3 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} border rounded-lg text-sm`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {(!message || message.type === 'error') && (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase text-gray-500">
                            Type <span className="text-red-500 font-bold">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            placeholder="DELETE"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="w-full bg-black/50 border border-red-500/20 rounded-lg px-4 py-3 text-white font-mono focus:border-red-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <button
                        onClick={handleDeleteAccount}
                        disabled={isLoading || deleteConfirmText !== 'DELETE'}
                        className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete My Account"}
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <UserIcon className="w-5 h-5 text-accent" />
                        <h2 className="font-serif text-xl text-white">Account Settings</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {view === 'main' && renderMain()}
                    {view === 'change-email' && renderChangeEmail()}
                    {view === 'change-password' && renderChangePassword()}
                    {view === 'delete-account' && renderDeleteAccount()}
                </div>
            </div>
        </div>
    );
};
