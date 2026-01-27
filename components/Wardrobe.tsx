import React, { useState, useRef } from 'react';
import { TryOnResult, Product, ProductCategory } from '../types';
import { X, ArrowUpRight, Plus, Check, Shirt, Sparkles, Trash2 } from 'lucide-react';
import { analyzeClosetItem } from '../services/gemini';
import { ScannerLoader } from './ScannerLoader';

interface WardrobeProps {
  savedItems: TryOnResult[]; // The Lookbook (Generations)
  closetItems: Product[]; // The Virtual Closet (Owned Items)
  onRemoveLook: (id: string) => void;
  onAddClosetItem: (item: Product) => void;
  onRemoveClosetItem: (id: string) => void;
  onWearClosetItem: (item: Product) => void;
  onStyleClosetItems: (items: Product[]) => void;
  currentOutfit: Partial<Record<ProductCategory, Product>>;
}

export const Wardrobe: React.FC<WardrobeProps> = ({ 
    savedItems, 
    closetItems,
    onRemoveLook,
    onAddClosetItem,
    onRemoveClosetItem,
    onWearClosetItem,
    onStyleClosetItems,
    currentOutfit
}) => {
  const [activeTab, setActiveTab] = useState<'CLOSET' | 'LOOKBOOK'>('CLOSET');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Closet Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPreview, setAnalysisPreview] = useState<string | null>(null);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsAnalyzing(true);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          setAnalysisPreview(base64);

          try {
              const metadata = await analyzeClosetItem(base64);
              if (metadata) {
                  const newItem: Product = {
                      id: `closet-${Date.now()}`,
                      name: metadata.name || 'Unknown Item',
                      brand: metadata.brand || 'Unbranded',
                      price: 'Owned',
                      category: metadata.category as ProductCategory || 'top',
                      description: metadata.description || '',
                      imageUrl: base64,
                      source: 'closet',
                      color: metadata.color
                  };
                  onAddClosetItem(newItem);
              }
          } catch (err) {
              console.error("Failed to analyze item", err);
              alert("Could not identify item. Please try again.");
          } finally {
              setIsAnalyzing(false);
              setAnalysisPreview(null);
          }
      };
      reader.readAsDataURL(file);
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedItemIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedItemIds(newSet);
  };

  const handleShuffle = () => {
      const selectedProducts = closetItems.filter(item => selectedItemIds.has(item.id));
      if (selectedProducts.length > 0) {
          onStyleClosetItems(selectedProducts);
          setSelectedItemIds(new Set()); // Clear selection after sending
      }
  };

  return (
    <div className="min-h-full bg-transparent text-white relative flex flex-col">
       {/* Background Pattern */}
       <div className="absolute inset-0 opacity-[0.1] pointer-events-none fixed" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Hero Header */}
      <div className="relative z-10 border-b border-white/10 grid grid-cols-1 lg:grid-cols-3 bg-black/40 backdrop-blur-md">
         <div className="col-span-2 p-8 lg:p-12 lg:border-r border-white/10">
            <h2 className="text-5xl lg:text-6xl font-serif text-white leading-[0.9] drop-shadow-xl mb-4">
                Digital <span className="italic text-accent">Inventory</span>
            </h2>
            <div className="flex gap-4">
                <button 
                    onClick={() => setActiveTab('CLOSET')}
                    className={`font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${activeTab === 'CLOSET' ? 'bg-white text-black border-white' : 'border-white/20 hover:bg-white/10 text-gray-400'}`}
                >
                    My Closet ({closetItems.length})
                </button>
                <button 
                    onClick={() => setActiveTab('LOOKBOOK')}
                    className={`font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${activeTab === 'LOOKBOOK' ? 'bg-white text-black border-white' : 'border-white/20 hover:bg-white/10 text-gray-400'}`}
                >
                    Lookbook ({savedItems.length})
                </button>
            </div>
         </div>
         
         <div className="bg-zinc-900/30 backdrop-blur-sm p-8 flex flex-col justify-center border-t lg:border-t-0 border-white/10 relative overflow-hidden">
            {activeTab === 'CLOSET' && (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="w-full h-full border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:bg-white/5 hover:border-accent/50 transition-all group overflow-hidden relative"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    {isAnalyzing && analysisPreview ? (
                         <div className="absolute inset-0 z-20">
                             <ScannerLoader 
                                imageUrl={analysisPreview} 
                                text="ANALYZING FABRIC..." 
                                className="w-full h-full"
                             />
                         </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-mono text-xs uppercase tracking-widest">Add Physical Item</span>
                        </>
                    )}
                </button>
            )}
            {activeTab === 'LOOKBOOK' && (
                <div className="text-center">
                    <h4 className="font-serif text-4xl text-white">{savedItems.length.toString().padStart(2, '0')}</h4>
                    <p className="font-mono text-[10px] uppercase text-gray-500 mt-1 tracking-widest">Generated Fits</p>
                </div>
            )}
         </div>
      </div>
        
      <div className="flex-1 relative z-10 bg-white/5 min-h-[50vh] pb-24">
        {activeTab === 'CLOSET' ? (
            // CLOSET GRID
            closetItems.length === 0 ? (
                <div className="p-20 text-center">
                    <p className="font-mono text-sm text-gray-500 uppercase tracking-widest">Your closet is empty.</p>
                    <p className="text-gray-600 mt-2 font-serif italic">Upload your clothes to mix them with new finds.</p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px border-b border-white/10">
                    {closetItems.map((item) => {
                        const isEquipped = currentOutfit[item.category]?.id === item.id;
                        const isSelected = selectedItemIds.has(item.id);
                        
                        return (
                        <div 
                            key={item.id} 
                            onClick={() => toggleSelection(item.id)}
                            className={`group relative flex flex-col transition-all cursor-pointer border-r border-b border-white/5 hover:bg-zinc-900/50
                                ${isSelected ? 'bg-zinc-800 ring-inset ring-2 ring-accent z-20' : 'bg-transparent'}
                            `}
                        >
                             <div className="aspect-square relative overflow-hidden p-6 bg-zinc-900/20">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className={`w-full h-full object-contain drop-shadow-xl transition-transform duration-500 ${isSelected ? 'scale-90' : 'group-hover:scale-110'}`}
                                />
                                
                                {/* Indicators & Overlays */}
                                {isEquipped && (
                                    <div className="absolute top-3 left-3 bg-white text-black text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold shadow-lg z-10">
                                        Worn
                                    </div>
                                )}
                                
                                <div className="absolute top-3 right-3 flex gap-2">
                                     {/* Selection Check */}
                                     {isSelected && (
                                        <div className="bg-accent text-white rounded-full p-1 shadow-lg animate-in zoom-in duration-200 z-10">
                                            <Check className="w-3 h-3" />
                                        </div>
                                     )}
                                     
                                     {/* Actions (Hover Only if not selected) */}
                                     {!isSelected && (
                                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20 transform translate-y-[-5px] group-hover:translate-y-0">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); onWearClosetItem(item); }}
                                                className={`p-1.5 rounded-full transition-all hover:scale-110 shadow-lg
                                                    ${isEquipped ? 'bg-accent text-white' : 'bg-black/50 text-white/70 hover:bg-white hover:text-black'}
                                                `}
                                                title="Wear Item"
                                             >
                                                <Shirt className="w-3 h-3" />
                                             </button>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); onRemoveClosetItem(item.id); }}
                                                className="p-1.5 bg-black/50 text-white/50 hover:text-white hover:bg-red-500 rounded-full transition-all hover:scale-110 shadow-lg"
                                                title="Remove Item"
                                             >
                                                <Trash2 className="w-3 h-3" />
                                             </button>
                                         </div>
                                     )}
                                </div>
                             </div>

                             <div className="p-4 bg-zinc-900/80 border-t border-white/5">
                                 <div className="min-w-0">
                                     <p className="font-mono text-[9px] uppercase text-gray-500 mb-0.5 truncate tracking-wider">{item.brand}</p>
                                     <h4 className="font-serif text-sm text-white truncate">{item.name}</h4>
                                 </div>
                             </div>
                        </div>
                    )})}
                </div>
                
                {/* Floating "Shuffle" Button Bar */}
                {selectedItemIds.size > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
                        <button 
                            onClick={handleShuffle}
                            className="flex items-center gap-3 px-8 py-4 bg-accent text-white rounded-full shadow-[0_0_30px_rgba(249,115,22,0.4)] border border-white/20 hover:scale-105 transition-all group"
                        >
                            <Sparkles className="w-5 h-5 group-hover:animate-spin" />
                            <span className="font-mono text-sm font-bold uppercase tracking-widest">
                                Generate Looks ({selectedItemIds.size})
                            </span>
                        </button>
                    </div>
                )}
                </>
            )
        ) : (
            // LOOKBOOK GRID
            savedItems.length === 0 ? (
                <div className="p-32 text-center">
                    <p className="font-mono text-sm text-gray-500 uppercase tracking-widest">No saved looks.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px border-b border-white/10">
                    {savedItems.map((item) => (
                    <div key={item.id} className="group relative flex flex-col bg-black/60 backdrop-blur-sm h-full hover:bg-black/80 transition-colors">
                        <div className="aspect-[3/4] relative overflow-hidden bg-zinc-900/50">
                        <img 
                            src={item.imageUrl} 
                            alt={item.product.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100" 
                        />
                        <button 
                            onClick={() => onRemoveLook(item.id)}
                            className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-colors opacity-0 group-hover:opacity-100 rounded-full"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between border-t border-white/10 transition-colors group-hover:bg-zinc-900">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-[10px] uppercase text-gray-400">{item.product.brand}</span>
                                <span className="font-mono text-[10px] font-bold text-accent">{item.product.price}</span>
                            </div>
                            <h4 className="font-serif text-lg leading-tight text-white group-hover:text-white/90">{item.product.name}</h4>
                        </div>
                        <a 
                            href={item.product.url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-6 flex items-center justify-between border-b border-white/20 pb-1 text-gray-400 hover:text-white hover:border-white transition-colors group/link"
                        >
                                <span className="font-mono text-[10px] uppercase tracking-widest">Shop Now</span>
                                <ArrowUpRight className="w-3 h-3 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                        </a>
                        </div>
                    </div>
                    ))}
                </div>
            )
        )}
      </div>
    </div>
  );
};