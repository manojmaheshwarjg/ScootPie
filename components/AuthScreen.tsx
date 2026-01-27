import React, { useState } from 'react';
import { Chrome, Smartphone, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLogin: (method: 'google' | 'phone') => void;
  onSkip: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSkip }) => {
  const [phoneMode, setPhoneMode] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (!supabase) {
        alert("Authentication unavailable: Supabase is not configured.");
        return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      },
    });

    if (error) {
      console.error(error);
      setIsLoading(false);
    }
    // Supabase will handle the redirect
  };

  const handleMagicLink = async () => {
    if (!supabase) {
        alert("Authentication unavailable: Supabase is not configured.");
        return;
    }
    
    if (!email) return;
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      }
    });

    setIsLoading(false);
    if (error) {
        setMessage(error.message);
    } else {
        setMessage("Check your email for the login link!");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block w-12 h-12 bg-accent rounded-sm shadow-[0_0_20px_rgba(249,115,22,0.5)] mb-2 rotate-3"></div>
          <h1 className="font-serif text-5xl mb-6 tracking-tight italic font-bold">Scootpie</h1>
          <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">AI Virtual Stylist • Global Access</p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative">
          {!phoneMode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-zinc-900 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all rounded-sm group shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] hover:translate-x-[1px] hover:translate-y-[1px] flex items-center justify-center gap-3 relative overflow-hidden"
              >
                {isLoading ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Chrome className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4 absolute right-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <button 
                onClick={() => setPhoneMode(true)}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-black border border-white/20 text-white font-medium rounded-lg flex items-center justify-center gap-3 hover:border-accent hover:text-accent transition-colors group"
              >
                <Smartphone className="w-5 h-5" />
                <span className="font-mono text-sm uppercase tracking-wide">Use Email Magic Link</span>
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0c0c0c] px-2 text-gray-500 font-mono">Or</span>
                </div>
              </div>

              <button 
                onClick={onSkip}
                className="w-full py-2 text-gray-500 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <button 
                 onClick={() => { setPhoneMode(false); setMessage(null); }}
                 className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-[10px] uppercase tracking-widest mb-6"
               >
                 <ChevronRight className="w-3 h-3 rotate-180" /> Back
               </button>

               <div className="space-y-6">
                  <div>
                      <h3 className="font-serif text-2xl text-white">Magic Link</h3>
                      <p className="text-gray-500 text-sm mt-1">We&apos;ll send you a login link.</p>
                  </div>
                  
                  {message ? (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-sm rounded">
                          {message}
                      </div>
                  ) : (
                      <>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-gray-500">Email Address</label>
                            <input 
                                type="email" 
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-accent focus:outline-none transition-colors"
                            />
                        </div>

                        <button 
                            onClick={handleMagicLink}
                            disabled={isLoading || !email}
                            className="w-full py-4 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Link"}
                        </button>
                      </>
                  )}
               </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-600 font-mono">By continuing you agree to our Terms of Service & Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};