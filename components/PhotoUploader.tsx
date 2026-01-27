

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Camera, ArrowRight, Check, Video, X, Chrome, ChevronLeft } from 'lucide-react';
import { UserPhoto } from '../types';

interface PhotoUploaderProps {
  onPhotoUploaded: (photo: UserPhoto) => void;
  onOpenWaitlist: () => void;
  onCancel?: () => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onPhotoUploaded, onOpenWaitlist, onCancel }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Staging state for photo before gender selection
  const [tempPhotoData, setTempPhotoData] = useState<string | null>(null);

  // Webcam State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
      let stream: MediaStream | null = null;
      let mounted = true;

      const startCamera = async () => {
          if (isCameraOpen) {
              try {
                  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                  if (mounted && videoRef.current) {
                      videoRef.current.srcObject = stream;
                      await videoRef.current.play();
                      setError(null);
                  }
              } catch (err: any) {
                  console.error("Camera Error:", err);
                  if (mounted) {
                      let msg = "Camera access unavailable.";
                      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                          msg = "Permission denied. Please check your browser settings.";
                      } else if (err.name === 'NotFoundError') {
                          msg = "No camera found.";
                      }
                      setError(msg);
                      setIsCameraOpen(false);
                  }
              }
          }
      };

      startCamera();

      return () => {
          mounted = false;
          if (stream) {
              stream.getTracks().forEach(t => t.stop());
          }
      };
  }, [isCameraOpen]);

  const capturePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg');
              setTempPhotoData(dataUrl);
              setIsCameraOpen(false);
          }
      }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid format. JPG or PNG only.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setTempPhotoData(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenderSelect = (gender: 'mens' | 'womens' | 'unisex') => {
    if (tempPhotoData) {
      onPhotoUploaded({
        id: crypto.randomUUID(),
        data: tempPhotoData,
        isPrimary: true,
        gender: gender
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden bg-transparent text-white">
      
      {/* Left Panel: Hero Content */}
      <div className="relative p-6 md:p-10 lg:p-20 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 bg-transparent z-30 overflow-hidden">
        
        <div className="space-y-6 md:space-y-8 relative z-30">
          <div className="flex items-center gap-4">
              {onCancel && (
                  <button onClick={onCancel} className="p-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                  </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-accent/10 backdrop-blur-md shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-accent">
                    {onCancel ? 'Add New Model' : 'Try it free • Works everywhere'}
                </span>
              </div>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-white leading-[1.15] tracking-tight relative drop-shadow-2xl max-w-xl">
                {onCancel ? (
                    <>Expand your <span className="italic text-accent relative inline-block">Studio</span> roster</>
                ) : (
                    <>Your body, every outfit, <span className="italic text-accent relative inline-block">instantly</span></>
                )}
            </h2>
            
            <p className="text-sm md:text-base text-gray-400 max-w-md font-light leading-relaxed drop-shadow-md border-l-2 border-white/20 pl-4 md:pl-6">
                {onCancel 
                    ? "Upload a new photo to generate fits for different body types or styles." 
                    : "Virtual try-on for any store you shop. Stop guessing, start seeing."
                }
            </p>

            {!onCancel && (
                <button 
                    onClick={onOpenWaitlist}
                    className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all rounded-sm group shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] hover:translate-x-[1px] hover:translate-y-[1px]"
                >
                    <Chrome className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
                    <span>Try our Chrome Extension</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-auto" />
                </button>
            )}
          </div>
        </div>

        <div className="mt-8 md:mt-12 grid grid-cols-3 gap-4 md:gap-6 border-t border-white/10 pt-6 relative z-30 lg:bg-transparent">
            <div className="backdrop-blur-sm bg-black/20 p-3 rounded-lg border border-white/5">
                <h4 className="font-serif text-lg md:text-xl text-white">Global</h4>
                <p className="font-mono text-[9px] md:text-[10px] uppercase text-gray-400 mt-1">Sourcing</p>
            </div>
             <div className="backdrop-blur-sm bg-black/20 p-3 rounded-lg border border-white/5">
                <h4 className="font-serif text-lg md:text-xl text-white">Instant</h4>
                <p className="font-mono text-[9px] md:text-[10px] uppercase text-gray-400 mt-1">Rendering</p>
            </div>
             <div className="backdrop-blur-sm bg-black/20 p-3 rounded-lg border border-white/5">
                <h4 className="font-serif text-lg md:text-xl text-white">Open</h4>
                <p className="font-mono text-[9px] md:text-[10px] uppercase text-gray-400 mt-1">Access</p>
            </div>
        </div>
      </div>

      {/* Right Panel: Action Area */}
      <div className="bg-zinc-950/40 backdrop-blur-2xl p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden z-40 border-l border-white/5">
        {/* Background Pattern (Matched opacity 0.1 to ChatStylist) */}
        <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        <div className="w-full max-w-sm relative">
            
            {!tempPhotoData && !isCameraOpen ? (
                // STEP 1: UPLOAD
                <>
                    <div className="mb-8 text-center">
                        <h3 className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">Initialize Session</h3>
                        <h2 className="font-serif text-3xl text-white">Source Material</h2>
                    </div>

                    <div 
                        className={`
                            group relative h-[300px] md:h-[380px] bg-black/40 backdrop-blur-md border-2 border-white/10 p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(249,115,22,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:border-white/30 hover:bg-black/60 overflow-hidden
                            ${isDragging ? 'bg-zinc-900/80 border-accent' : ''}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                        
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900/50 relative z-10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-accent/50 group-hover:bg-accent/10">
                            <Camera className="w-8 h-8 text-gray-400 group-hover:text-accent transition-colors" />
                        </div>
                        
                        <div className="space-y-2 relative z-10">
                            <p className="font-serif text-lg md:text-xl text-white group-hover:text-accent transition-colors">Upload Base Image</p>
                            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest group-hover:text-gray-400">
                            or click to browse
                            </p>
                        </div>
                    </div>
                    
                    {/* Camera Button */}
                    <button 
                        onClick={() => setIsCameraOpen(true)}
                        className="w-full mt-4 py-3 bg-white text-black font-mono text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-colors flex items-center justify-center gap-2 border-2 border-black hover:border-accent"
                    >
                        <Video className="w-4 h-4" /> Access Optic
                    </button>
                </>
            ) : isCameraOpen ? (
                 // STEP 1.5: CAMERA CAPTURE
                 <div className="relative h-[450px] bg-black border-2 border-white/20 rounded-lg overflow-hidden flex flex-col">
                     <video ref={videoRef} className="flex-1 w-full h-full object-cover" autoPlay playsInline muted />
                     <canvas ref={canvasRef} className="hidden" />
                     
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-20">
                         <button 
                           onClick={() => setIsCameraOpen(false)}
                           className="w-12 h-12 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-red-500/50 transition-colors"
                         >
                             <X className="w-5 h-5" />
                         </button>
                         <button 
                           onClick={capturePhoto}
                           className="w-16 h-16 rounded-full border-4 border-white bg-transparent flex items-center justify-center hover:scale-105 transition-transform"
                         >
                             <div className="w-12 h-12 bg-white rounded-full"></div>
                         </button>
                     </div>
                 </div>
            ) : (
                // STEP 2: GENDER SELECTION
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="mb-8 text-center">
                        <h3 className="font-mono text-xs uppercase tracking-widest text-accent mb-2">Configuration</h3>
                        <h2 className="font-serif text-3xl text-white">Select Archetype</h2>
                    </div>
                    
                    <div className="h-[420px] bg-black/60 backdrop-blur-md border-2 border-white/10 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] flex flex-col justify-center space-y-3">
                         <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                             <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/20">
                                 <Image src={tempPhotoData!} alt="Preview" fill className="object-cover" />
                             </div>
                             <div className="flex-1">
                                <p className="font-serif text-lg text-white">Image Acquired.</p>
                                <button onClick={() => setTempPhotoData(null)} className="text-[10px] font-mono uppercase underline text-gray-500 hover:text-white">Reset Source</button>
                             </div>
                         </div>

                         <button 
                            onClick={() => handleGenderSelect('mens')}
                            className="w-full py-4 border border-transparent bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20 transition-all flex items-center justify-between px-6 group text-white"
                         >
                            <span className="font-mono text-sm uppercase tracking-widest font-bold">Menswear</span>
                            <span className="opacity-0 group-hover:opacity-100">👔</span>
                         </button>
                         
                         <button 
                            onClick={() => handleGenderSelect('womens')}
                            className="w-full py-4 border border-transparent bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20 transition-all flex items-center justify-between px-6 group text-white"
                         >
                            <span className="font-mono text-sm uppercase tracking-widest font-bold">Womenswear</span>
                            <span className="opacity-0 group-hover:opacity-100">👗</span>
                         </button>

                         <button 
                            onClick={() => handleGenderSelect('unisex')}
                            className="w-full py-4 border border-transparent bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20 transition-all flex items-center justify-between px-6 group text-white"
                         >
                            <span className="font-mono text-sm uppercase tracking-widest font-bold">Unisex / Neutral</span>
                            <span className="opacity-0 group-hover:opacity-100">✨</span>
                         </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-6 text-center text-red-400 font-mono text-xs bg-red-900/20 p-3 border border-red-900/50 backdrop-blur-sm">
                {error}
                </div>
            )}
            
            {!tempPhotoData && !isCameraOpen && (
                <p className="mt-8 text-center font-mono text-[10px] text-gray-500 max-w-xs mx-auto">
                    Full body shot recommended for max fidelity. <br/> JPG or PNG only.
                </p>
            )}
        </div>
      </div>
    </div>
  );
};