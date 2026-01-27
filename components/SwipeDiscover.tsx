

import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, ShoppingBag, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Product, TryOnResult } from '../types';
import { getDiscoverQueue, generateTryOnImage } from '../services/gemini';
import { ScannerLoader } from './ScannerLoader';

interface SwipeDiscoverProps {
    userPhoto?: string;
    userGender?: string;
    onMatch: (product: Product, generatedImageOverride?: string) => void;
    recentMatches: TryOnResult[];
}

export const SwipeDiscover: React.FC<SwipeDiscoverProps> = ({ userPhoto, userGender, onMatch, recentMatches }) => {
    const [queue, setQueue] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Cache for generated try-on images: { [productId]: base64String }
    const [generatedCache, setGeneratedCache] = useState<Record<string, string>>({});
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // UI Feedback state
    const [feedback, setFeedback] = useState<'LIKE' | 'NOPE' | null>(null);

    // Initial Load
    useEffect(() => {
        loadMoreItems();
    }, []);

    const loadMoreItems = async () => {
        setIsLoading(true);
        const newItems = await getDiscoverQueue(userGender);
        // Filter out items already in queue to avoid key conflicts
        setQueue(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = newItems.filter(p => !existingIds.has(p.id));
            return [...prev, ...uniqueNew];
        });
        setIsLoading(false);
    };

    // Auto-refill queue when getting low
    useEffect(() => {
        if (queue.length > 0 && currentIndex >= queue.length - 3 && !isLoading) {
            loadMoreItems();
        }
    }, [currentIndex, queue.length, isLoading]);

    // --- REAL-TIME GENERATION TRIGGER ---
    useEffect(() => {
        const triggerGeneration = async () => {
            if (!userPhoto || queue.length === 0) return;
            
            const currentItem = queue[currentIndex];
            if (!currentItem) return;

            // If we already have it or are generating it, skip
            if (generatedCache[currentItem.id] || generatingId === currentItem.id) return;

            setGeneratingId(currentItem.id);
            console.log(`[Discover] Generating try-on for card: ${currentItem.name}`);
            
            try {
                // Generate Try-On for the current card
                const img = await generateTryOnImage(userPhoto, [currentItem]);
                if (img) {
                    setGeneratedCache(prev => ({ ...prev, [currentItem.id]: img }));
                }
            } catch (e) {
                console.error("Card Generation Error", e);
            } finally {
                setGeneratingId(null);
            }
        };

        const timeout = setTimeout(triggerGeneration, 500); // Small delay to allow swipe animation to settle
        return () => clearTimeout(timeout);
    }, [currentIndex, queue, userPhoto, generatedCache, generatingId]);


    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!dragStart) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const deltaX = clientX - dragStart.x;
        const deltaY = clientY - dragStart.y;
        setDragDelta({ x: deltaX, y: deltaY });

        // Feedback based on drag
        if (deltaX > 80) setFeedback('LIKE');
        else if (deltaX < -80) setFeedback('NOPE');
        else setFeedback(null);
    };

    const handleTouchEnd = () => {
        if (!dragStart) return;
        
        const threshold = 100;
        if (dragDelta.x > threshold) {
            confirmSwipe('RIGHT');
        } else if (dragDelta.x < -threshold) {
            confirmSwipe('LEFT');
        } else {
            // Reset (Snap back)
            setDragDelta({ x: 0, y: 0 });
            setFeedback(null);
        }
        setDragStart(null);
    };

    const confirmSwipe = (direction: 'LEFT' | 'RIGHT') => {
        setFeedback(direction === 'RIGHT' ? 'LIKE' : 'NOPE');
        
        // Animate off screen
        const endX = direction === 'RIGHT' ? 1000 : -1000;
        setDragDelta({ x: endX, y: dragDelta.y }); // Keep Y momentum
        
        setTimeout(() => {
            if (direction === 'RIGHT') {
                const item = queue[currentIndex];
                if (item) {
                    // Pass the generated image if we have it, so we don't regenerate
                    onMatch(item, generatedCache[item.id]);
                }
            }
            // Advance queue
            setCurrentIndex(prev => prev + 1);
            
            // Reset state for next card
            setDragDelta({ x: 0, y: 0 });
            setFeedback(null);
        }, 200);
    };

    // --- RENDER HELPERS ---

    const renderCard = (index: number, isTopCard: boolean) => {
        const item = queue[index];
        if (!item) return null;

        const stackOffset = index - currentIndex; // 0, 1, 2...
        
        // Top card follows gestures
        if (isTopCard) {
            const rotate = dragDelta.x * 0.05;
            // Use cached image if available
            const displayImage = generatedCache[item.id] || item.imageUrl;
            const isGenerating = generatingId === item.id;

            return (
                <div 
                    key={item.id}
                    className="absolute inset-0 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none z-30"
                    style={{ 
                        transform: `translate(${dragDelta.x}px, ${dragDelta.y}px) rotate(${rotate}deg)`,
                        transition: dragStart ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        touchAction: 'none' // Important to prevent page scroll while dragging card
                    }}
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <CardContent 
                        item={item} 
                        image={displayImage}
                        feedback={feedback} 
                        isGenerating={isGenerating}
                    />
                </div>
            );
        }

        // FAN STACK EFFECT (Playing Cards Style)
        // Alternating Left/Right fanning
        const isLeft = stackOffset % 2 !== 0; // Odd = Left, Even = Right (relative to top)
        const fanDir = isLeft ? -1 : 1;
        
        // More pronounced rotation and translation for "hand of cards" look
        const rotate = 6 * stackOffset * fanDir; 
        const translateX = 40 * stackOffset * fanDir;
        const translateY = 5 * stackOffset; 

        // Scale down slightly to add depth
        const scale = 1 - (stackOffset * 0.05);
        
        const opacity = 1 - (stackOffset * 0.1);

        return (
            <div 
                key={item.id}
                className="absolute inset-0 bg-zinc-800 border border-white/5 rounded-3xl shadow-xl overflow-hidden pointer-events-none transition-all duration-500 ease-out"
                style={{ 
                    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                    zIndex: 30 - stackOffset,
                    opacity: opacity,
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Back cards use placeholder if no image */}
                {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover opacity-60 grayscale" />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center opacity-30">
                        <ShoppingBag className="w-12 h-12 text-gray-500" />
                    </div>
                )}
            </div>
        );
    };

    const renderSkeletonStack = () => {
        return (
            <>
                <div className="absolute inset-0 bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden z-30 animate-pulse">
                     <div className="w-full h-3/4 bg-zinc-800/50" />
                     <div className="p-6 space-y-3">
                         <div className="h-6 w-2/3 bg-zinc-800 rounded" />
                         <div className="h-4 w-1/3 bg-zinc-800 rounded" />
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                     </div>
                </div>
            </>
        )
    };

    const visibleQueue = queue.slice(currentIndex, currentIndex + 4); 
    const isQueueEmpty = visibleQueue.length === 0;

    return (
        // Allow vertical scrolling on the main page with deeper min-height to force scroll
        <div className="h-full bg-black relative overflow-y-auto flex flex-col custom-scrollbar">
            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* FLOATING MATCHES BADGE (Bottom Right) */}
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-2 pointer-events-none">
                 <div className="flex items-center gap-3 pointer-events-auto bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-zinc-900/80 transition-colors cursor-pointer">
                     {recentMatches.length > 0 && (
                        <div className="flex -space-x-3 pl-1">
                             {recentMatches.slice(0, 4).map(m => (
                                 <div key={m.id} className="w-8 h-8 rounded-full border border-black bg-zinc-800 overflow-hidden shadow-sm">
                                     <img src={m.imageUrl} className="w-full h-full object-cover" />
                                 </div>
                             ))}
                        </div>
                    )}
                    <div className="h-8 px-4 bg-white text-black rounded-full flex items-center justify-center font-mono text-xs font-bold uppercase tracking-wide">
                        {recentMatches.length} Fits
                    </div>
                </div>
            </div>

            {/* MAIN CARD STACK AREA - Centered and Spaced */}
            <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-32 relative perspective-1000 min-h-[800px]">
                <div className="relative w-full max-w-sm aspect-[3/4.5] md:aspect-[3/4] mb-8">
                    {isQueueEmpty && isLoading ? (
                        renderSkeletonStack()
                    ) : isQueueEmpty && !isLoading ? (
                        <div className="text-center absolute inset-0 flex flex-col items-center justify-center z-40">
                             <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                 <RefreshCw className="w-6 h-6 text-gray-500" />
                             </div>
                             <h3 className="text-xl font-serif text-white">Queue Empty</h3>
                             <button onClick={loadMoreItems} className="mt-4 px-6 py-2 bg-white text-black text-xs font-mono uppercase tracking-widest rounded-full hover:bg-accent hover:text-white transition-colors">
                                 Fetch More
                             </button>
                        </div>
                    ) : (
                        // Render Stack (Reverse order for correct z-indexing)
                        [2, 1, 0].map(offset => {
                            const actualIndex = currentIndex + offset;
                            if (actualIndex >= queue.length) return null;
                            return renderCard(actualIndex, offset === 0);
                        })
                    )}
                </div>

                 {/* BOTTOM CONTROLS */}
                <div className="flex justify-center gap-8 z-50 items-center">
                    {/* REJECT (Left) */}
                    <button 
                        onClick={() => confirmSwipe('LEFT')}
                        disabled={isQueueEmpty}
                        className="group w-16 h-16 rounded-full bg-black border border-white/20 text-gray-400 flex items-center justify-center hover:scale-110 hover:bg-zinc-800 hover:text-white hover:border-white transition-all shadow-xl disabled:opacity-50"
                    >
                        <X className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* ACCEPT (Right) - Accent Colored - Now Heart */}
                    <button 
                        onClick={() => confirmSwipe('RIGHT')}
                        disabled={isQueueEmpty}
                        className="group w-16 h-16 rounded-full bg-black border-2 border-accent text-accent flex items-center justify-center hover:scale-110 hover:bg-accent hover:text-white transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
                    >
                        <Heart className="w-8 h-8 fill-current group-hover:animate-pulse" />
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CardContentProps {
    item: Product;
    image?: string;
    feedback: 'LIKE' | 'NOPE' | null;
    isGenerating: boolean;
}

const CardContent = ({ item, image, feedback, isGenerating }: CardContentProps) => (
    <div className="relative w-full h-full bg-zinc-900">
        {/* Full Bleed Image */}
        {(image || item.imageUrl) ? (
            <img 
                src={image || item.imageUrl} 
                alt={item.name}
                className={`w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${isGenerating ? 'opacity-50' : 'opacity-100'}`}
                draggable="false"
            />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 p-8 text-center">
                 <ShoppingBag className="w-16 h-16 mb-4 text-gray-600" />
                 <p className="font-mono text-xs uppercase text-gray-400">Preview Unavailable</p>
                 {isGenerating && <p className="font-mono text-[10px] text-accent mt-2 animate-pulse">Generating...</p>}
            </div>
        )}
        
        {/* Generating Overlay */}
        {isGenerating && (
             <div className="absolute inset-0 z-20">
                 <ScannerLoader 
                    text="SYNTHESIZING FIT..." 
                    className="w-full h-full"
                 />
             </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

        {/* Feedback Stamps */}
        {feedback === 'LIKE' && (
            <div className="absolute top-8 left-8 border-4 border-accent text-accent rounded-lg px-4 py-2 transform -rotate-12 z-20 animate-in fade-in zoom-in duration-200 bg-black/20 backdrop-blur-sm shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <span className="font-mono text-3xl font-bold uppercase tracking-widest">TRY ON</span>
            </div>
        )}
        {feedback === 'NOPE' && (
            <div className="absolute top-8 right-8 border-4 border-white/60 text-white/80 rounded-lg px-4 py-2 transform rotate-12 z-20 animate-in fade-in zoom-in duration-200 bg-black/20 backdrop-blur-sm">
                <span className="font-mono text-3xl font-bold uppercase tracking-widest">PASS</span>
            </div>
        )}

        {/* Content Details */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            {/* Price Badge */}
            <div className="absolute -top-12 right-6 bg-white text-black font-mono font-bold text-lg px-3 py-1 rounded shadow-lg transform rotate-2">
                {item.price}
            </div>

            <div className="mb-1">
                <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-1">{item.brand}</p>
                <h3 className="font-serif text-3xl text-white leading-none drop-shadow-md">{item.name}</h3>
            </div>
            
            <p className="text-gray-400 text-xs line-clamp-2 mt-2 mb-4 font-light leading-relaxed opacity-80">
                {item.description}
            </p>

            {/* Card Actions (Hyperlink) */}
            <div className="flex gap-2">
                 <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white hover:text-black border border-white/10 rounded-full backdrop-blur-md text-[10px] font-mono uppercase tracking-wider text-white transition-colors"
                    // Prevent drag/swipe when clicking link
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                 >
                     <ExternalLink className="w-3 h-3" />
                     View Source
                 </a>
            </div>
        </div>
    </div>
);
