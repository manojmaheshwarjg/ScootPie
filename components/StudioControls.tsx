import React, { useState } from 'react';
import { Loader2, Plus, ArrowRight, Search, Mic } from 'lucide-react';
import { Product, OutfitState, TryOnResult } from '../types';
import { searchProducts, generateTryOnImage } from '../services/gemini';
import { ScannerLoader } from './ScannerLoader';

interface StudioControlsProps {
  userPhoto: string;
  userGender?: string;
  currentOutfit: OutfitState;
  onNewTryOn: (result: TryOnResult) => void;
  setGeneratedLooks: React.Dispatch<React.SetStateAction<TryOnResult[]>>;
}

export const StudioControls: React.FC<StudioControlsProps> = ({ 
    userPhoto, 
    userGender, 
    currentOutfit,
    onNewTryOn, 
    setGeneratedLooks 
}) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'RENDERING' | 'COMPLETE' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');

  const getQuickActions = () => {
    switch (userGender) {
      case 'mens': return ['Stussy Hoodie', 'Carhartt Jacket', 'Ralph Lauren Oxford', 'Arc\'teryx Shell', 'Nike Tech Fleece'];
      case 'womens': return ['Skims Lounge', 'Oversized Blazer', 'Miu Miu Skirt', 'Alo Yoga Set', 'Reformation Top'];
      default: return ['Essentials Hoodie', 'North Face Nuptse', 'Adidas Tracksuit', 'Vintage Levis 501', 'New Balance 550'];
    }
  };

  const quickActions = getQuickActions();

  const handleGenerate = async () => {
    if (!input.trim() || status === 'SEARCHING' || status === 'RENDERING') return;
    
    setStatus('SEARCHING');
    setStatusMessage(`SCANNING ${userGender ? userGender.toUpperCase() : ''} DATABASE FOR "${input.toUpperCase()}"...`);

    try {
        const foundProducts = await searchProducts(input, userGender);
        
        if (foundProducts.length > 0) {
            setStatus('RENDERING');
            setStatusMessage(`ASSETS ACQUIRED (${foundProducts.length}). PROCESSING VISUALS...`);
            
            const limit = 3;
            const targetProducts = foundProducts.slice(0, limit);
            
            const results = await Promise.all(
                targetProducts.map(async (newProduct) => {
                    const outfitPlan: OutfitState = { ...currentOutfit };
                    
                    if (newProduct.category === 'one-piece') {
                        delete outfitPlan.top;
                        delete outfitPlan.bottom;
                        outfitPlan['one-piece'] = newProduct;
                    } else {
                         outfitPlan[newProduct.category] = newProduct;
                         if (['top', 'bottom'].includes(newProduct.category)) {
                             delete outfitPlan['one-piece'];
                         }
                    }
                    
                    const itemsToWear = Object.values(outfitPlan).filter((i): i is Product => !!i);
                    const img = await generateTryOnImage(userPhoto, itemsToWear);
                    return { product: newProduct, outfit: itemsToWear, img };
                })
            );

            const successful = results.filter(r => r.img !== null);
            
            if (successful.length > 0) {
                successful.forEach(r => {
                    const result: TryOnResult = {
                        id: crypto.randomUUID(),
                        productId: r.product.id,
                        product: r.product,
                        outfit: r.outfit,
                        imageUrl: r.img!,
                        timestamp: Date.now()
                    };
                    onNewTryOn(result);
                });
                setStatus('COMPLETE');
                setStatusMessage(`${successful.length} LOOKS GENERATED.`);
                setTimeout(() => { setStatus('IDLE'); setStatusMessage(''); setInput(''); }, 3000);
            } else {
                setStatus('ERROR');
                setStatusMessage('GENERATION FAILED. TRY DIFFERENT KEYWORDS.');
            }
        } else {
            setStatus('ERROR');
            setStatusMessage('NO PRODUCTS FOUND. REFINING SEARCH...');
        }
    } catch (error) {
         console.error(error);
         setStatus('ERROR');
         setStatusMessage('SYSTEM ERROR.');
    } finally {
        if (status === 'ERROR') {
             setTimeout(() => { setStatus('IDLE'); setStatusMessage(''); }, 4000);
        }
    }
  };

  return (
    <>
    {/* CONTEXTUAL PANEL LOADER - No solid background, just transparent scanner */}
    {(status === 'SEARCHING' || status === 'RENDERING') && (
        <div className="absolute inset-0 z-40 rounded-lg overflow-hidden">
             <ScannerLoader 
                text={status === 'SEARCHING' ? 'SEARCHING GLOBAL INDEX' : 'RENDERING VIRTUAL FIT'} 
                className="w-full h-full"
             />
        </div>
    )}

    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-50">
        {/* Status Indicator */}
        <div className="mb-4 h-6 flex items-center">
            {status !== 'IDLE' && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    {status === 'SEARCHING' || status === 'RENDERING' ? (
                        <div className="w-3 h-3 bg-accent animate-pulse rounded-full"></div>
                    ) : status === 'ERROR' ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    ) : (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${status === 'ERROR' ? 'text-red-400' : 'text-accent'}`}>
                        {statusMessage}
                    </span>
                </div>
            )}
        </div>

        {/* Quick Actions */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-4 mask-linear-fade">
            {quickActions.map(tag => (
              <button 
                key={tag}
                onClick={() => setInput(tag)}
                className="px-3 py-1.5 rounded-full font-mono text-[9px] uppercase border border-white/20 bg-black/40 text-gray-300 hover:bg-white hover:text-black hover:border-white transition-colors whitespace-nowrap flex items-center gap-1 backdrop-blur-md"
              >
                <Plus className="w-2 h-2" /> {tag}
              </button>
            ))}
        </div>

        {/* Minimal Input Bar */}
        <div className="relative flex items-center bg-zinc-900/60 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-2xl transition-all focus-within:border-accent/50 focus-within:bg-black/80">
            <div className="pl-4 pr-3 text-gray-500">
                <Search className="w-4 h-4" />
            </div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe look (e.g. 'Red hoodie with vintage denim')..."
              className="flex-1 py-4 bg-transparent text-white outline-none font-mono text-sm placeholder-gray-600 tracking-wide"
              disabled={status === 'SEARCHING' || status === 'RENDERING'}
            />

            <div className="pr-2 flex items-center gap-2 border-l border-white/5 pl-2">
                 <button className="p-2 hover:text-white text-gray-500 transition-colors">
                    <Mic className="w-4 h-4" />
                 </button>
                 <button
                    onClick={handleGenerate}
                    disabled={!input.trim() || status === 'SEARCHING' || status === 'RENDERING'}
                    className="p-2 bg-white text-black rounded-md hover:bg-accent hover:text-white transition-all disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500"
                 >
                    <ArrowRight className="w-4 h-4" />
                 </button>
            </div>
        </div>
    </div>
    </>
  );
};