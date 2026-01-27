

import React, { useState, useRef } from 'react';
import { Upload, Zap, ExternalLink, RefreshCw, ShoppingBag, Loader2, Shirt, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { analyzeInspirationImage, generateStealTheLook } from '../services/gemini';
import { InspirationAnalysis, TryOnResult, Product } from '../types';
import { ScannerLoader } from './ScannerLoader';

interface InspirationScannerProps {
    userPhoto: string;
    onNewTryOn: (result: TryOnResult) => void;
}

type Tier = 'luxury' | 'mid' | 'budget';
type TransferMode = 'full' | 'top' | 'bottom';

export const InspirationScanner: React.FC<InspirationScannerProps> = ({ userPhoto, onNewTryOn }) => {
    const [inspoImage, setInspoImage] = useState<string | null>(null);
    
    // Split state: Data Analysis vs Image Generation
    const [isAnalyzingData, setIsAnalyzingData] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    const [analysisResult, setAnalysisResult] = useState<InspirationAnalysis | null>(null);
    const [generatedTryOn, setGeneratedTryOn] = useState<string | null>(null);
    const [selectedTier, setSelectedTier] = useState<Tier>('mid');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setInspoImage(base64);
            // Start Data Analysis Immediately (Metadata)
            analyzeMetadata(base64);
        };
        reader.readAsDataURL(file);
    };

    const analyzeMetadata = async (base64: string) => {
        setIsAnalyzingData(true);
        setAnalysisResult(null);
        try {
            const analysis = await analyzeInspirationImage(base64);
            setAnalysisResult(analysis);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzingData(false);
        }
    };

    const handleGenerate = async (mode: TransferMode) => {
        if (!inspoImage || isGeneratingImage) return;

        setIsGeneratingImage(true);
        setGeneratedTryOn(null);

        try {
            const tryOnImg = await generateStealTheLook(userPhoto, inspoImage, mode);
            setGeneratedTryOn(tryOnImg);

            // Persist Result
            if (tryOnImg) {
                // Determine price from analysis if available, otherwise generic
                const price = analysisResult?.totalCost.mid || "N/A";
                const itemCount = analysisResult?.items.length || "Unknown";

                const product: Product = {
                    id: `inspo-${Date.now()}`,
                    name: `Style Transfer (${mode.toUpperCase()})`,
                    brand: "ScootPie AI",
                    price: price, 
                    category: 'one-piece',
                    description: `Style transfer from uploaded inspiration. Mode: ${mode}. Contains approx ${itemCount} items.`,
                    imageUrl: inspoImage, // The source image is the "product" thumbnail
                    source: 'generated'
                };
    
                const result: TryOnResult = {
                    id: crypto.randomUUID(),
                    productId: product.id,
                    product: product,
                    outfit: [product],
                    imageUrl: tryOnImg,
                    timestamp: Date.now()
                };
                
                // Save to main app state
                onNewTryOn(result);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const reset = () => {
        setInspoImage(null);
        setAnalysisResult(null);
        setGeneratedTryOn(null);
        setIsAnalyzingData(false);
        setIsGeneratingImage(false);
    };

    // --- RENDER HELPERS ---

    if (!inspoImage) {
        // EMPTY STATE / UPLOAD
        // Use overflow-y-auto to allow scrolling if content is too tall (fixes nav bar overlap issue)
        return (
            <div className="h-full w-full overflow-y-auto bg-zinc-950 relative custom-scrollbar">
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px', position: 'fixed' }}></div>
                
                <div className="min-h-full flex flex-col items-center justify-center p-8 md:p-12 relative z-10">
                    <div className="relative z-10 max-w-2xl w-full text-center my-auto">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/10 rounded-full mb-8 border border-accent/20 animate-pulse">
                            <Zap className="w-10 h-10 text-accent" />
                        </div>
                        
                        <h2 className="text-5xl md:text-7xl font-serif italic text-white mb-6 tracking-tighter">
                            Get the Look
                        </h2>
                        <p className="font-mono text-sm md:text-base text-gray-400 mb-12 max-w-lg mx-auto leading-relaxed">
                            Upload any photo—celebrity, runway, or social media. 
                            We'll identify the pieces, find dupes at your price point, and <span className="text-white font-bold">show you wearing it</span> instantly.
                        </p>

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="group relative h-64 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-zinc-900/50 transition-all bg-zinc-900/20"
                        >
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                             <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl border border-white/5">
                                 <Upload className="w-8 h-8 text-gray-400 group-hover:text-white" />
                             </div>
                             <span className="font-mono text-xs uppercase tracking-widest text-gray-500 group-hover:text-white">Drop Inspiration Image Here</span>
                        </div>

                        <div className="mt-12 flex justify-center gap-8 opacity-50">
                            <div className="text-center">
                                <h4 className="font-serif text-2xl text-white">$2400</h4>
                                <p className="font-mono text-[9px] uppercase text-gray-500">Luxury</p>
                            </div>
                            <div className="text-center">
                                <h4 className="font-serif text-2xl text-white text-accent">$450</h4>
                                <p className="font-mono text-[9px] uppercase text-gray-500">Mid-Range</p>
                            </div>
                            <div className="text-center">
                                <h4 className="font-serif text-2xl text-white">$85</h4>
                                <p className="font-mono text-[9px] uppercase text-gray-500">Budget</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // RESULTS / WORKSPACE VIEW
    return (
        <div className="h-full flex flex-col md:flex-row bg-black text-white relative">
            
            {/* LEFT: VISUAL COMPARISON */}
            <div className="w-full md:w-1/2 h-[50vh] md:h-full relative border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
                 <div className="flex-1 flex relative">
                     {/* Original Inspo */}
                     <div className="w-1/2 h-full relative border-r border-white/10 group overflow-hidden">
                         <img src={inspoImage} className="w-full h-full object-cover" />
                         <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 z-10">
                             <span className="font-mono text-[9px] uppercase tracking-widest text-white">Reference</span>
                         </div>
                     </div>
                     
                     {/* Right Side of Visual: Either Selection UI OR Generated Result */}
                     <div className="w-1/2 h-full relative group bg-zinc-900 overflow-hidden">
                         
                         {isGeneratingImage ? (
                             // LOADING STATE
                             <div className="absolute inset-0 z-10 bg-zinc-900">
                                 <ScannerLoader 
                                    imageUrl={userPhoto} 
                                    text="TRANSFERRING STYLE..." 
                                    className="w-full h-full opacity-80"
                                 />
                             </div>
                         ) : generatedTryOn ? (
                             // SUCCESS STATE
                             <>
                                <img src={generatedTryOn} className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700" />
                                <div className="absolute top-4 right-4 bg-accent text-white px-3 py-1 rounded-full border border-accent shadow-lg z-20">
                                    <span className="font-mono text-[9px] uppercase tracking-widest font-bold">You</span>
                                </div>
                             </>
                         ) : (
                             // SELECTION STATE (DEFAULT AFTER UPLOAD)
                             <div className="absolute inset-0 bg-zinc-900 flex flex-col">
                                 {/* Background User Image (Dimmed) */}
                                 <div className="absolute inset-0 opacity-40">
                                     <img src={userPhoto} className="w-full h-full object-cover grayscale" />
                                 </div>
                                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                 
                                 {/* Options Overlay */}
                                 <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 space-y-3">
                                     <h4 className="font-serif text-xl italic text-white mb-2 text-center">Select Transfer Mode</h4>
                                     
                                     <button 
                                        onClick={() => handleGenerate('full')}
                                        className="w-full py-3 bg-white text-black hover:bg-accent hover:text-white transition-all font-mono text-xs uppercase tracking-widest font-bold rounded flex items-center justify-center gap-2 group"
                                     >
                                         <Layers className="w-4 h-4" /> Full Look
                                     </button>

                                     <div className="grid grid-cols-2 gap-2 w-full">
                                         <button 
                                            onClick={() => handleGenerate('top')}
                                            className="py-3 bg-zinc-800/80 backdrop-blur border border-white/20 hover:border-accent hover:text-accent transition-all font-mono text-[10px] uppercase tracking-widest rounded flex flex-col items-center justify-center gap-1"
                                         >
                                             <ArrowUp className="w-4 h-4" /> Top Only
                                         </button>
                                         <button 
                                            onClick={() => handleGenerate('bottom')}
                                            className="py-3 bg-zinc-800/80 backdrop-blur border border-white/20 hover:border-accent hover:text-accent transition-all font-mono text-[10px] uppercase tracking-widest rounded flex flex-col items-center justify-center gap-1"
                                         >
                                             <ArrowDown className="w-4 h-4" /> Bottom Only
                                         </button>
                                     </div>
                                     
                                     <p className="text-[9px] text-gray-400 text-center max-w-[150px] mt-4 font-mono">
                                         Choose which parts of the outfit to apply to your photo.
                                     </p>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
            </div>

            {/* RIGHT: SHOPPING DATA / SKELETON */}
            <div className="w-full md:w-1/2 h-[50vh] md:h-full overflow-y-auto bg-zinc-950 flex flex-col relative custom-scrollbar">
                
                {isAnalyzingData ? (
                    // LOADING SKELETON
                    <div className="p-8 flex-1 flex flex-col animate-pulse">
                        <div className="flex justify-between items-start mb-8">
                            <div className="space-y-3">
                                <div className="h-8 w-48 bg-zinc-800 rounded"></div>
                                <div className="h-3 w-24 bg-zinc-800 rounded"></div>
                            </div>
                            <div className="h-12 w-32 bg-zinc-800 rounded"></div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-8">
                            <div className="h-8 bg-zinc-800 rounded opacity-50"></div>
                            <div className="h-8 bg-zinc-800 rounded opacity-50"></div>
                            <div className="h-8 bg-zinc-800 rounded opacity-50"></div>
                        </div>

                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-28 bg-zinc-900 border border-white/5 rounded-lg"></div>
                            ))}
                        </div>
                        
                        <div className="mt-auto pt-8 text-center">
                             <div className="inline-flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-widest">
                                 <Loader2 className="w-3 h-3 animate-spin" />
                                 Analyzing Outfit Components...
                             </div>
                        </div>
                    </div>
                ) : (
                    // RESULT DATA
                    <>
                        <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10 z-30 p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-serif text-3xl italic">The Breakdown</h3>
                                    <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                                        {analysisResult?.items.length || 0} Items Identified
                                    </p>
                                </div>
                                <div className="text-right">
                                     <span className="font-mono text-xs uppercase text-gray-500 tracking-widest block mb-1">Total Est.</span>
                                     <span className="font-serif text-4xl text-accent">
                                         {analysisResult?.totalCost[selectedTier] || 'N/A'}
                                     </span>
                                </div>
                            </div>

                            {/* Tier Toggles */}
                            <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-900 rounded-lg border border-white/10">
                                {(['luxury', 'mid', 'budget'] as Tier[]).map(tier => (
                                    <button
                                        key={tier}
                                        onClick={() => setSelectedTier(tier)}
                                        className={`py-2 rounded-md font-mono text-[10px] uppercase tracking-widest transition-all
                                            ${selectedTier === tier 
                                                ? 'bg-white text-black shadow-lg font-bold' 
                                                : 'text-gray-500 hover:text-white hover:bg-white/5'}
                                        `}
                                    >
                                        {tier === 'luxury' && '$$$ Luxury'}
                                        {tier === 'mid' && '$$ Mid-Range'}
                                        {tier === 'budget' && '$ Budget'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Product List */}
                        <div className="p-6 space-y-4">
                            {analysisResult?.items.map((item, idx) => {
                                const product = item[selectedTier];
                                return (
                                    <div key={idx} className="group bg-zinc-900 border border-white/10 rounded-lg p-4 hover:border-accent/50 transition-colors flex gap-4">
                                        <div className="w-16 h-16 bg-black rounded flex items-center justify-center flex-shrink-0 border border-white/5 text-gray-600">
                                            <ShoppingBag className="w-6 h-6" />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                 <p className="font-mono text-[9px] uppercase text-gray-400 tracking-wider">{item.category}</p>
                                                 <span className="font-mono text-xs font-bold text-white">{product.price}</span>
                                            </div>
                                            <h4 className="font-serif text-lg text-white truncate leading-tight mb-1 group-hover:text-accent transition-colors">
                                                {product.name}
                                            </h4>
                                            <p className="text-xs text-gray-500 mb-3">{product.brand}</p>
                                            
                                            <a 
                                                href={`https://www.google.com/search?q=${encodeURIComponent(product.brand + " " + product.name)}&tbm=shop`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white border-b border-white/20 pb-0.5 hover:border-accent hover:text-accent transition-all"
                                            >
                                                Find Online <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Reset Button (Floating Center-ish) */}
             <button 
                onClick={reset}
                className="absolute bottom-6 left-6 md:left-auto md:right-[calc(50%+1.5rem)] w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 border-4 border-black"
                title="Start Over"
            >
                 <RefreshCw className="w-5 h-5" />
            </button>
        </div>
    );
};