import React, { useState } from 'react';
import { X, Mail, ArrowRight, Chrome, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
        if (supabase) {
            const { error } = await supabase
                .from('waitlist')
                .insert([{ email, created_at: new Date().toISOString() }]);

            if (error) {
                if (error.code === '23505') { // Unique violation
                     toast.info("You're already on the list!");
                     setIsSubmitted(true);
                } else {
                    console.error('Waitlist error:', error);
                    toast.error("Could not join waitlist. Please try again.");
                }
            } else {
                setIsSubmitted(true);
            }
        } else {
            // Fallback for demo/no-backend mode
            console.warn("Supabase not configured. Simulating waitlist join.");
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsSubmitted(true);
        }

        if (isSubmitted || !supabase) {
            setTimeout(() => {
                onClose();
                setIsSubmitted(false);
                setEmail('');
            }, 2500);
        }
    } catch (err) {
        console.error(err);
        toast.error("Something went wrong.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
         
         {/* Decorative Background Elements */}
         <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent/20 rounded-full blur-[80px] pointer-events-none"></div>
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>

         <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-20"
         >
             <X className="w-5 h-5" />
         </button>

         <div className="relative z-10 flex flex-col items-center text-center">
            {/* Icon Group */}
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 border border-white/10 relative group">
                <Chrome className="w-8 h-8 text-white group-hover:text-blue-400 transition-colors" />
                {/* ScootPie Logo Badge */}
                <div className="absolute -bottom-2 -right-2 bg-zinc-900 p-1 rounded-full">
                    <div className="w-6 h-6 bg-accent rounded-sm shadow-[0_0_10px_rgba(249,115,22,0.8)] rotate-12 flex items-center justify-center">
                    </div>
                </div>
            </div>

            <h3 className="font-serif text-3xl text-white mb-2 italic">Still Cooking...</h3>
            <p className="font-mono text-xs text-accent uppercase tracking-widest mb-6 border-b border-accent/20 pb-1">Chrome Extension Beta</p>
            
            <p className="text-gray-300 text-sm leading-relaxed mb-8 max-w-[280px]">
                We're building the ultimate tool to let you shop and try on clothes from <span className="text-white font-bold underline decoration-accent/50 underline-offset-2">any store</span> across the internet instantly.
            </p>

            {isSubmitted ? (
                <div className="w-full py-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-3 h-3 bg-accent rounded-[1px] shadow-[0_0_5px_rgba(249,115,22,0.5)] rotate-12"></div>
                    <span>You're on the list!</span>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="w-full space-y-3">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                        <input 
                            type="email" 
                            placeholder="enter@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-3.5 pl-10 pr-4 text-white font-mono text-sm focus:border-accent focus:outline-none transition-all focus:bg-black"
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-white text-black font-mono text-xs uppercase tracking-widest font-bold rounded-lg hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Join Waitlist <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>
            )}
            
            <p className="mt-8 text-[9px] text-gray-600 font-mono uppercase tracking-wider">
                Early access members get free premium credits.
            </p>
         </div>
      </div>
    </div>
  );
};