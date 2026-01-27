import React from 'react';
import Image from 'next/image';

interface ScannerLoaderProps {
  imageUrl?: string;
  text?: string;
  className?: string;
  variant?: 'fullscreen' | 'contained';
}

export const ScannerLoader: React.FC<ScannerLoaderProps> = ({ imageUrl, text = "PROCESSING", className = "" }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center overflow-hidden ${className}`}>
        {/* Background Backdrop - Semi-transparent so we don't block the view completely */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 transition-all duration-500" />

        {/* Optional: Render the image inside if provided (for standalone usage), otherwise parent handles background */}
        {imageUrl && (
            <div className="absolute inset-0 z-0">
                <Image src={imageUrl} alt="Processing image" fill className="object-cover opacity-50" />
            </div>
        )}

        {/* Scanline - Sleeker, thinner, glowing */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_20px_rgba(249,115,22,0.8)] absolute top-0 animate-scan opacity-80" />
        </div>

        {/* Status Pill - Floating Center */}
        <div className="relative z-30">
             <div className="bg-black/80 border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-xl">
                 {/* Equalizer Animation */}
                 <div className="flex gap-0.5 h-3 items-end">
                    <div className="w-1 bg-accent h-full animate-[bounce_1s_infinite]"></div>
                    <div className="w-1 bg-accent h-2/3 animate-[bounce_1.2s_infinite]"></div>
                    <div className="w-1 bg-accent h-1/3 animate-[bounce_0.8s_infinite]"></div>
                 </div>
                 
                 <div className="h-3 w-px bg-white/20"></div>

                 <p className="font-mono text-[10px] text-white uppercase tracking-[0.15em] font-medium animate-pulse">
                    {text}
                 </p>
             </div>
        </div>
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 z-10 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
    </div>
  );
};