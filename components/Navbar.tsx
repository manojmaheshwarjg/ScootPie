
import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Lock, MessageCircle, LogOut, User, Zap, Flame, Box, Menu, X } from 'lucide-react';
import { AppView } from '../types';

interface NavbarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  hasPhoto: boolean;
  isGuest?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, hasPhoto, isGuest, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => handleNavClick(view)}
      className={`
        px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] transition-all border w-full md:w-auto
        ${currentView === view 
            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
            : 'bg-zinc-900/50 text-gray-500 border-white/10 hover:border-white/30 hover:text-gray-300 hover:bg-zinc-900/80'}
      `}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );

  return (
    <nav className="h-16 bg-black/60 backdrop-blur-xl text-white flex items-center justify-between pl-4 pr-4 lg:pl-8 lg:pr-8 border-b border-white/5 supports-[backdrop-filter]:bg-black/40 relative z-[60]">
      {/* Left: Brand / Back */}
      <div className="flex items-center gap-6 z-[60]">
        {hasPhoto && currentView !== AppView.ONBOARDING && (
           <button 
             onClick={() => setView(AppView.ONBOARDING)}
             className="flex items-center gap-2 hover:text-accent transition-colors group"
           >
             <div className="border border-white/30 rounded-full p-1 group-hover:border-accent">
                <ArrowLeft className="w-3 h-3" />
             </div>
             <span className="font-mono text-[10px] uppercase tracking-widest hidden md:inline">Back</span>
           </button>
        )}
        
        {(!hasPhoto || currentView === AppView.ONBOARDING) ? (
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded-sm shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                <h1 className="text-lg font-bold tracking-tight font-serif italic text-white/90">Scootpie</h1>
             </div>
        ) : null}
      </div>

      {/* Center Navigation (Desktop) */}
      {hasPhoto && (
        <div className="hidden md:flex items-center justify-center gap-3 h-full">
            <NavItem view={AppView.STUDIO} icon={Sparkles} label="Studio" />
            <NavItem view={AppView.DISCOVER} icon={Flame} label="Discover" />
            <NavItem view={AppView.INSPIRATION} icon={Zap} label="Get The Look" />
            <NavItem view={AppView.THREE_D} icon={Box} label="3D Fit" />
            <NavItem view={AppView.CHAT} icon={MessageCircle} label="Stylist" />
            <NavItem view={AppView.WARDROBE} icon={Lock} label="Archive" />
        </div>
      )}

      {/* Right: Avatar, Auth & Mobile Toggle */}
      <div className="flex items-center gap-3 z-[60]">
        <div className="hidden lg:flex flex-col items-end">
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">{isGuest ? 'Guest Access' : 'Pro Member'}</span>
            <span className="font-mono text-[9px] text-accent uppercase tracking-widest">{isGuest ? 'Read Only' : 'Aura_Lvl: Infinite'}</span>
        </div>
        
        <div className="group relative">
            <div className={`w-8 h-8 flex items-center justify-center text-white font-serif font-bold italic text-sm border rounded-md shadow-[0_0_20px_rgba(249,115,22,0.3)] cursor-pointer transition-colors
                ${isGuest ? 'bg-zinc-800 border-white/10' : 'bg-accent border-white/20'}
            `}>
               {isGuest ? <User className="w-4 h-4" /> : 'S'}
            </div>
            
            <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button 
                    onClick={onLogout}
                    className="w-full text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                    <LogOut className="w-3 h-3" />
                    {isGuest ? 'Sign In' : 'Sign Out'}
                </button>
            </div>
        </div>

        {/* Mobile Menu Toggle */}
        {hasPhoto && (
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-8 h-8 flex items-center justify-center text-white hover:text-accent transition-colors"
            >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && hasPhoto && (
        <div className="absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-black/95 backdrop-blur-xl z-50 flex flex-col p-6 gap-4 animate-in slide-in-from-top-4 duration-200">
            <p className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Navigation</p>
            <NavItem view={AppView.STUDIO} icon={Sparkles} label="Studio" />
            <NavItem view={AppView.DISCOVER} icon={Flame} label="Discover" />
            <NavItem view={AppView.INSPIRATION} icon={Zap} label="Get The Look" />
            <NavItem view={AppView.THREE_D} icon={Box} label="3D Fit" />
            <NavItem view={AppView.CHAT} icon={MessageCircle} label="Stylist" />
            <NavItem view={AppView.WARDROBE} icon={Lock} label="Archive" />
            
            <div className="mt-auto border-t border-white/10 pt-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 flex items-center justify-center text-white font-serif font-bold italic text-lg border rounded-md
                        ${isGuest ? 'bg-zinc-800 border-white/10' : 'bg-accent border-white/20'}
                    `}>
                    {isGuest ? <User className="w-5 h-5" /> : 'S'}
                    </div>
                    <div>
                        <p className="font-mono text-xs text-white uppercase tracking-widest">{isGuest ? 'Guest Access' : 'Pro Member'}</p>
                        <p className="font-mono text-[10px] text-accent uppercase tracking-widest">{isGuest ? 'Read Only' : 'Aura_Lvl: Infinite'}</p>
                    </div>
                 </div>
                 <button 
                    onClick={onLogout}
                    className="w-full py-3 bg-zinc-900 border border-white/10 rounded text-xs font-mono uppercase tracking-widest text-gray-400 hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    {isGuest ? 'Sign In' : 'Sign Out'}
                </button>
            </div>
        </div>
      )}
    </nav>
  );
};
