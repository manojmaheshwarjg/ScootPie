import React, { useRef } from 'react';
import Image from 'next/image';
import { ExternalLink, ChevronLeft, ChevronRight, Check, Shirt, Video, Loader2, Play } from 'lucide-react';
import { TryOnResult, Product } from '../types';
import { ScannerLoader } from './ScannerLoader';

interface TryOnGalleryProps {
  results: TryOnResult[];
  onSave: (result: TryOnResult) => void;
  onWear: (result: TryOnResult) => void;
  onGenerateVideo: (resultId: string) => void; // New prop
  savedItemIds: Set<string>;
  currentOutfitId?: string; 
}

export const TryOnGallery: React.FC<TryOnGalleryProps> = ({ 
    results, 
    onSave, 
    onWear, 
    onGenerateVideo,
    savedItemIds, 
    currentOutfitId 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
        const width = scrollRef.current.offsetWidth;
        scrollRef.current.scrollBy({
            left: dir === 'left' ? -width : width,
            behavior: 'smooth'
        });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white text-black w-full overflow-hidden">
      <div className="flex-1 relative bg-[#F4F4F4] overflow-hidden flex flex-col">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        </div>

        {results.length === 0 ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10">
            <div className="border-2 border-black bg-white p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md mx-auto">
              <h3 className="font-serif text-4xl mb-6 italic">No Generations</h3>
              <div className="h-px w-full bg-black mb-6"></div>
              <p className="font-mono text-xs text-gray-500 uppercase leading-relaxed tracking-wide">
                Studio is idle.<br/>
                Enter a prompt to initialize generation sequence.
              </p>
              <div className="mt-8 flex justify-center">
                 <div className="w-3 h-3 bg-black rounded-full animate-bounce delay-100"></div>
                 <div className="w-3 h-3 bg-black rounded-full animate-bounce delay-200 ml-2"></div>
                 <div className="w-3 h-3 bg-black rounded-full animate-bounce delay-300 ml-2"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative flex items-center w-full min-h-0">
            {/* Navigation Buttons (Desktop) */}
            <button 
                onClick={() => scroll('left')}
                className="hidden md:flex absolute left-4 z-20 w-12 h-12 bg-white border-2 border-black items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
                onClick={() => scroll('right')}
                className="hidden md:flex absolute right-4 z-20 w-12 h-12 bg-white border-2 border-black items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Swipe Container */}
            <div 
                ref={scrollRef}
                className="w-full h-full overflow-x-auto snap-x snap-mandatory flex items-center px-6 md:px-[15%] gap-6 no-scrollbar py-6"
            >
                {results.map((result, idx) => {
                    const isSaved = savedItemIds.has(result.id);
                    const isWorn = currentOutfitId === result.id;
                    const hasVideo = !!result.videoUrl;
                    const isGeneratingVideo = result.videoStatus === 'generating';
                    
                    return (
                    <div 
                        key={result.id} 
                        className={`w-full md:w-[400px] flex-shrink-0 snap-center h-full flex flex-col bg-white border-2 transition-transform duration-300
                            ${isWorn ? 'border-accent shadow-[12px_12px_0px_0px_#f97316]' : 'border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]'}
                        `}
                    >
                         {/* Header */}
                        <div className={`p-4 border-b-2 flex justify-between items-center bg-white flex-shrink-0 ${isWorn ? 'border-accent' : 'border-black'}`}>
                            <span className="font-mono text-[10px] uppercase text-gray-500 tracking-widest">
                                {isWorn ? 'EQUIPPED' : `GEN #${results.length - idx}`}
                            </span>
                            <div className="flex gap-2">
                                <div className={`w-2 h-2 rounded-full border ${isWorn ? 'border-accent bg-accent' : 'border-black bg-white'}`}></div>
                                <div className={`w-2 h-2 rounded-full border ${isWorn ? 'border-accent bg-accent' : 'border-black bg-black'}`}></div>
                            </div>
                        </div>

                        {/* Image/Video Container */}
                        <div className={`relative flex-1 overflow-hidden bg-gray-100 border-b-2 ${isWorn ? 'border-accent' : 'border-black'} min-h-0`}>
                             {hasVideo ? (
                                 <video 
                                    src={result.videoUrl} 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline
                                    className="w-full h-full object-cover"
                                 />
                             ) : (
                                 <>
                                    {/* Base Image */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center blur-md opacity-30 scale-110"
                                        style={{ backgroundImage: `url(${result.imageUrl})` }}
                                    />
                                    <Image
                                        src={result.imageUrl}
                                        alt={result.product.name}
                                        fill
                                        className="relative object-contain z-10"
                                    />
                                    
                                    {/* OVERLAY: Scanner Loader when Generating Video */}
                                    {isGeneratingVideo && (
                                       <div className="absolute inset-0 z-40 bg-black">
                                           <ScannerLoader 
                                                imageUrl={result.imageUrl} 
                                                text="RECORDING RUNWAY..." 
                                                className="w-full h-full"
                                           />
                                       </div>
                                    )}
                                 </>
                             )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white flex-shrink-0 relative z-20">
                           <div className="flex justify-between items-start mb-3">
                               <div className="pr-2 overflow-hidden">
                                  <h4 className="font-serif text-lg leading-none mb-1 truncate">{result.product.name}</h4>
                                  <p className="font-mono text-[10px] uppercase text-gray-500 tracking-wider truncate">{result.product.brand}</p>
                                  {/* Mini tags for other items in outfit */}
                                  {result.outfit.length > 1 && (
                                      <div className="mt-2 flex gap-1 flex-wrap">
                                        {result.outfit.filter(i => i.id !== result.product.id).map(i => (
                                            <span key={i.id} className="text-[8px] border border-gray-200 px-1 rounded text-gray-400">
                                                + {i.brand}
                                            </span>
                                        ))}
                                      </div>
                                  )}
                               </div>
                               <span className="font-mono text-xs font-bold border-b-2 border-accent text-accent whitespace-nowrap">
                                 {result.product.price}
                               </span>
                           </div>

                           <div className="grid grid-cols-4 gap-2">
                              {/* WEAR THIS Button */}
                              <button
                                onClick={() => onWear(result)}
                                disabled={isWorn}
                                className={`col-span-1 border-2 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1 h-8
                                    ${isWorn 
                                        ? 'border-accent bg-accent text-white cursor-default' 
                                        : 'border-black hover:bg-gray-100'
                                    }`}
                                title="Equip to current outfit"
                              >
                                {isWorn ? <Check className="w-3 h-3" /> : <Shirt className="w-3 h-3" />}
                              </button>

                              {/* Save Button */}
                              <button 
                                onClick={() => onSave(result)}
                                disabled={isSaved}
                                className={`col-span-1 border-2 border-black font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1 h-8
                                    ${isSaved 
                                        ? 'bg-black text-white cursor-default' 
                                        : 'hover:bg-black hover:text-white'
                                    }`}
                                title="Save to Archive"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              
                              {/* Runway Video Button */}
                              <button 
                                onClick={() => onGenerateVideo(result.id)}
                                disabled={hasVideo || isGeneratingVideo}
                                className={`col-span-1 border-2 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1 h-8
                                    ${hasVideo 
                                        ? 'border-accent text-accent bg-white' 
                                        : 'border-black bg-black text-white hover:bg-accent hover:border-accent'
                                    }
                                    ${isGeneratingVideo ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                title={hasVideo ? "Video Ready" : "Generate Runway Video"}
                              >
                                {isGeneratingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : hasVideo ? <Play className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                              </button>

                              {/* Buy Button */}
                              <a 
                                href={result.product.url || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="col-span-1 bg-accent text-white border-2 border-accent font-mono text-[10px] uppercase tracking-widest hover:bg-white hover:text-accent transition-colors flex items-center justify-center gap-1 h-8"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                           </div>
                        </div>
                    </div>
                )})}
                {/* Spacer for end of scroll */}
                <div className="w-6 flex-shrink-0 md:w-[15%]"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};