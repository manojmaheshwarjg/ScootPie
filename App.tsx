'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { PhotoUploader } from './components/PhotoUploader';
import { ChatStylist } from './components/ChatStylist';
import { StudioControls } from './components/StudioControls';
import { TryOnGallery } from './components/TryOnGallery';
import { Wardrobe } from './components/Wardrobe';
import { InspirationScanner } from './components/InspirationScanner';
import { SwipeDiscover } from './components/SwipeDiscover'; 
import { ThreeDView } from './components/ThreeDView';
import { ApiKeyBanner } from './components/ApiKeyBanner';
import { AuthScreen } from './components/AuthScreen';
import { AppView, UserPhoto, TryOnResult, OutfitState, ProductCategory, Product } from './types';
import { enhanceUserPhoto, startRunwayVideo, checkRunwayVideoStatus, generateTryOnImage } from './services/gemini';
import { ScannerLoader } from './components/ScannerLoader';
import { WaitlistModal } from './components/WaitlistModal';
import { Plus, Users, X } from 'lucide-react';
import { supabase, DbUserPhoto, DbWardrobeItem, DbGeneratedLook } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from './lib/logger';

type AuthSession = 'authenticated' | 'guest' | 'none';

function App() {
  const [authSession, setAuthSession] = useState<AuthSession>('none');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // SUPABASE: Check Auth Status on Mount
  useEffect(() => {
    if (!supabase) return; 

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) return;
      if (session) {
        setAuthSession('authenticated');
        setCurrentUser(session.user);
        fetchUserData(session.user.id);
        toast.success(`Welcome back, ${session.user.email?.split('@')[0]}`);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthSession('authenticated');
        setCurrentUser(session.user);
        fetchUserData(session.user.id);
      } else {
        if (authSession === 'authenticated') {
           setAuthSession('none');
           setCurrentUser(null);
           setUserPhotos([]);
           setClosetItems([]);
           setSavedItems([]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const userPhoto = useMemo(() => {
      if (userPhotos.length === 0) return null;
      return userPhotos.find(p => p.id === activePhotoId) || userPhotos[0];
  }, [userPhotos, activePhotoId]);
  
  const [currentView, setCurrentView] = useState<AppView>(AppView.ONBOARDING);

  useEffect(() => {
     if (authSession !== 'none') {
         if (userPhotos.length > 0) setCurrentView(AppView.STUDIO);
         else setCurrentView(AppView.ONBOARDING);
     }
  }, [userPhotos.length, authSession]);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [stagingPhoto, setStagingPhoto] = useState<string | null>(null);
  const [generatedLooks, setGeneratedLooks] = useState<TryOnResult[]>([]);
  const [outfitState, setOutfitState] = useState<OutfitState>({});
  const [currentOutfitId, setCurrentOutfitId] = useState<string | undefined>(undefined);
  const [savedItems, setSavedItems] = useState<TryOnResult[]>([]);
  const [closetItems, setClosetItems] = useState<Product[]>([]);
  const [closetAnalysisQueue, setClosetAnalysisQueue] = useState<Product[]>([]);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const fetchUserData = async (userId: string) => {
    if (!supabase) return;
    try {
        const { data: photos } = await supabase.from('user_photos').select('*').eq('user_id', userId);
        if (photos) {
            const mapped: UserPhoto[] = photos.map(p => ({
                id: p.id,
                data: p.data,
                isPrimary: p.is_primary,
                gender: p.gender as any
            }));
            setUserPhotos(mapped);
            if (mapped.length > 0) setActivePhotoId(mapped[0].id);
        }

        const { data: wardrobe } = await supabase.from('wardrobe').select('*').eq('user_id', userId);
        if (wardrobe) setClosetItems(wardrobe.map(w => w.product_json));

        const { data: looks } = await supabase.from('generated_looks').select('*').eq('user_id', userId);
        if (looks) setSavedItems(looks.map(l => l.result_json));
    } catch (e) {
        toast.error("Cloud Sync Failed: Could not load your profile data.");
    }
  };

  const handleLogin = (method: 'google' | 'phone') => { };
  const handleSkipAuth = () => {
    setAuthSession('guest');
    toast.info("Entered Guest Mode. Data will not persist across sessions.");
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthSession('none');
    setUserPhotos([]);
    setClosetItems([]);
    setSavedItems([]);
    setGeneratedLooks([]);
    setCurrentView(AppView.ONBOARDING);
    toast.success("Logged out successfully.");
  };

  const handlePhotoUpload = async (photo: UserPhoto) => {
    setIsEnhancing(true);
    setStagingPhoto(photo.data);
    setCurrentView(AppView.STUDIO);
    
    setUserPhotos(prev => {
        const updated = [...prev, photo];
        return updated.slice(-3);
    });
    setActivePhotoId(photo.id);
    
    try {
      const enhancedBase64 = await enhanceUserPhoto(photo.data);
      if (!enhancedBase64) toast.warning("Enhancement Skipped: Using original photo quality.");

      const finalPhoto: UserPhoto = {
        ...photo,
        data: enhancedBase64 || photo.data 
      };
      
      setUserPhotos(prev => prev.map(p => p.id === photo.id ? finalPhoto : p));

      if (currentUser && supabase) {
          await supabase.from('user_photos').insert({
              id: finalPhoto.id,
              user_id: currentUser.id,
              data: finalPhoto.data,
              gender: finalPhoto.gender,
              is_primary: finalPhoto.isPrimary
          });
          toast.success("Model uploaded & synced to cloud.");
      } else {
          toast.success("Model ready (Local Session)");
      }
    } catch (error) {
      toast.error("Upload Error: Failed to save model to cloud.");
    } finally {
      setIsEnhancing(false);
      setStagingPhoto(null);
    }
  };

  const handleDeleteModel = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newPhotos = userPhotos.filter(p => p.id !== id);
      setUserPhotos(newPhotos);
      
      if (newPhotos.length === 0) {
          setActivePhotoId(null);
          setCurrentView(AppView.ONBOARDING);
      } else if (activePhotoId === id) {
          setActivePhotoId(newPhotos[0].id);
      }

      if (currentUser && supabase) {
          await supabase.from('user_photos').delete().eq('id', id);
          toast.success("Model removed.");
      }
  };

  const handleNewTryOn = (result: TryOnResult) => {
    const taggedResult = { ...result, userPhotoId: userPhoto?.id };
    setGeneratedLooks(prev => [taggedResult, ...prev]);
    toast.success("New Look Generated", { description: `${result.product.name} equipped.` });
  };

  const handleSaveItem = async (item: TryOnResult) => {
    if (!savedItems.find(i => i.id === item.id)) {
      setSavedItems(prev => [item, ...prev]);
      toast.success("Saved to Lookbook");
      
      if (currentUser && supabase) {
          await supabase.from('generated_looks').insert({
              id: item.id,
              user_id: currentUser.id,
              result_json: item
          });
      }
    } else {
        toast.info("Item already in Lookbook.");
    }
  };

  // HELPER: Update a look in DB (e.g. adding video URL)
  const updateLookInDb = async (lookId: string, updates: Partial<TryOnResult>) => {
      // 1. Update Local State (Both Active & Saved lists)
      setGeneratedLooks(prev => prev.map(l => l.id === lookId ? { ...l, ...updates } : l));
      setSavedItems(prev => prev.map(l => l.id === lookId ? { ...l, ...updates } : l));

      // 2. Persist if it is a saved item
      const isSaved = savedItems.some(l => l.id === lookId);
      
      if (isSaved && currentUser && supabase) {
          const originalLook = savedItems.find(l => l.id === lookId);
          if (originalLook) {
             const updatedLook = { ...originalLook, ...updates };
             await supabase.from('generated_looks')
               .update({ result_json: updatedLook })
               .eq('id', lookId);
          }
      }
  };

  const handleMatch = async (product: Product, generatedImageOverride?: string) => {
    if (!userPhoto) {
        toast.error("No active model selected.");
        return;
    }
    try {
        const img = generatedImageOverride || await generateTryOnImage(userPhoto.data, [product]);
        if (img) {
            const result: TryOnResult = {
                id: crypto.randomUUID(),
                productId: product.id,
                userPhotoId: userPhoto.id,
                product: product,
                outfit: [product],
                imageUrl: img,
                timestamp: Date.now()
            };
            handleNewTryOn(result);
            handleSaveItem(result);
        } else {
            toast.error("Generation Failed", { description: "AI could not render this item." });
        }
    } catch (e) {
        toast.error("System Error", { description: "Try again later." });
    }
  };

  const handleRemoveLook = async (id: string) => {
    setSavedItems(prev => prev.filter(i => i.id !== id));
    toast.success("Removed from Lookbook");
    if (currentUser && supabase) {
        await supabase.from('generated_looks').delete().eq('id', id);
    }
  };
  
  const handleAddClosetItem = async (item: Product) => {
      setClosetItems(prev => [item, ...prev]);
      toast.success("Added to Closet", { description: item.name });

      if (currentUser && supabase) {
          await supabase.from('wardrobe').insert({
              id: item.id,
              user_id: currentUser.id,
              product_json: item
          });
      }
  };

  const handleRemoveClosetItem = async (id: string) => {
      setClosetItems(prev => prev.filter(i => i.id !== id));
      setOutfitState(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
              if (next[key as ProductCategory]?.id === id) {
                  delete next[key as ProductCategory];
              }
          });
          return next;
      });
      toast.success("Item deleted from Closet");

      if (currentUser && supabase) {
          await supabase.from('wardrobe').delete().eq('id', id);
      }
  };

  const handleWearClosetItem = (item: Product) => {
      setOutfitState(prev => {
          const next = { ...prev };
          if (item.category === 'one-piece') {
              delete next.top;
              delete next.bottom;
              next['one-piece'] = item;
          } else {
              if (['top', 'bottom'].includes(item.category)) {
                  delete next['one-piece'];
              }
              next[item.category] = item;
          }
          return next;
      });
      setCurrentOutfitId(undefined);
      toast.success("Equipped", { description: item.name });
  };

  const handleStyleClosetItems = (items: Product[]) => {
      setClosetAnalysisQueue(items);
      setCurrentView(AppView.CHAT);
      toast.info("Stylist Session Started", { description: `Analyzing ${items.length} items...` });
  };

  const handleWearLook = (item: TryOnResult) => {
      const newOutfit: OutfitState = {};
      item.outfit.forEach(p => {
          if (p.category) newOutfit[p.category] = p;
      });
      setOutfitState(newOutfit);
      setCurrentOutfitId(item.id);
      toast.success("Full Outfit Equipped");
  };

  const handleRemoveFromOutfit = (category: ProductCategory) => {
    setOutfitState(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    setCurrentOutfitId(undefined);
  };

  // SCALABLE VIDEO GENERATION: CLIENT SIDE POLLING
  const handleGenerateVideo = async (resultId: string) => {
     const lookIndex = generatedLooks.findIndex(l => l.id === resultId);
     if (lookIndex === -1) return;
     const look = generatedLooks[lookIndex];

     setGeneratedLooks(prev => {
         const updated = [...prev];
         updated[lookIndex] = { ...updated[lookIndex], videoStatus: 'generating' };
         return updated;
     });
     toast.info("Video generation queued", { description: "Processing on secure server..." });

     try {
         // 1. START the job (Returns immediately)
         const opJson = await startRunwayVideo(look.imageUrl);
         
         if (!opJson) throw new Error("Failed to start video job");

         // 2. POLL for status (Client side loop to prevent server timeout)
         let attempts = 0;
         const maxAttempts = 24; // 2 minutes (24 * 5s)
         
         const poll = async () => {
             attempts++;
             if (attempts > maxAttempts) {
                 throw new Error("Video generation timed out");
             }

             // Check status
             const result = await checkRunwayVideoStatus(opJson);

             if (result.status === 'completed' && result.videoUrl) {
                 // Success!
                 await updateLookInDb(resultId, { 
                     videoUrl: result.videoUrl, 
                     videoStatus: 'complete' 
                 });
                 toast.success("Runway Video Ready!");
                 return;
             } else if (result.status === 'failed') {
                 throw new Error("Video generation failed on server");
             } else {
                 // Still running, wait and recurse
                 setTimeout(poll, 5000);
             }
         };

         // Start polling
         setTimeout(poll, 5000);

     } catch (e) {
         setGeneratedLooks(prev => {
            const updated = [...prev];
            updated[lookIndex] = { ...updated[lookIndex], videoStatus: 'error' };
            return updated;
        });
        toast.error("Video Generation Failed");
     }
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.ONBOARDING:
        return (
            <PhotoUploader 
                onPhotoUploaded={handlePhotoUpload} 
                onOpenWaitlist={() => setIsWaitlistOpen(true)} 
                onCancel={userPhotos.length > 0 ? () => setCurrentView(AppView.STUDIO) : undefined}
            />
        );
      case AppView.STUDIO:
        const activeImage = userPhoto?.data || stagingPhoto;
        const activeGender = userPhoto?.gender;
        const activeLooks = generatedLooks.filter(l => !l.userPhotoId || l.userPhotoId === userPhoto?.id);

        return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden border-t border-white/10 relative z-10">
            <div className="w-full md:w-[450px] lg:w-[500px] h-1/2 md:h-full border-r border-white/10 flex flex-col bg-zinc-900 relative group/panel">
               {activeImage && (
                  <>
                    <img src={activeImage} alt="User Base" className="w-full h-full object-cover opacity-80" />
                    
                    {!isEnhancing && (
                        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none md:pointer-events-auto">
                             <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex flex-col gap-2 items-center pointer-events-auto shadow-2xl transition-opacity duration-300 opacity-50 md:opacity-100 hover:opacity-100">
                                 {userPhotos.map(photo => (
                                     <div key={photo.id} className="relative group/item">
                                         <button
                                            onClick={() => setActivePhotoId(photo.id)}
                                            className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110
                                                ${activePhotoId === photo.id ? 'border-accent shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'border-transparent opacity-60 hover:opacity-100'}
                                            `}
                                         >
                                             <img src={photo.data} className="w-full h-full object-cover" />
                                         </button>
                                         <button
                                            onClick={(e) => handleDeleteModel(photo.id, e)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-10 hover:bg-red-600 hover:scale-110"
                                         >
                                            <X className="w-2 h-2" />
                                         </button>
                                     </div>
                                 ))}
                                 <button 
                                    onClick={() => setCurrentView(AppView.ONBOARDING)}
                                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all"
                                 >
                                     <Plus className="w-4 h-4" />
                                 </button>
                             </div>
                             <div className="text-[9px] font-mono text-white/50 bg-black/50 px-2 py-0.5 rounded backdrop-blur self-start ml-2 opacity-0 group-hover/panel:opacity-100 transition-opacity pointer-events-none">
                                 {userPhotos.length} Active {userPhotos.length === 1 ? 'Model' : 'Models'}
                             </div>
                        </div>
                    )}

                    {isEnhancing && (
                        <div className="absolute inset-0 z-20">
                            <ScannerLoader className="w-full h-full" text="REMASTERING SOURCE" />
                        </div>
                    )}
                    
                    {userPhoto && !isEnhancing && (
                        <StudioControls 
                        userPhoto={userPhoto.data}
                        userGender={activeGender}
                        currentOutfit={outfitState}
                        onNewTryOn={handleNewTryOn}
                        setGeneratedLooks={setGeneratedLooks}
                        />
                    )}
                  </>
               )}
            </div>
            
            <div className="flex-1 h-1/2 md:h-full overflow-hidden bg-white">
              <TryOnGallery 
                results={activeLooks} 
                onSave={handleSaveItem} 
                onWear={handleWearLook}
                onGenerateVideo={handleGenerateVideo}
                savedItemIds={new Set(savedItems.map(i => i.id))}
                currentOutfitId={currentOutfitId}
              />
            </div>
          </div>
        );
      case AppView.DISCOVER:
          return (
              <div className="h-[calc(100vh-4rem)] relative z-10">
                 <SwipeDiscover 
                    userPhoto={userPhoto?.data}
                    userGender={userPhoto?.gender}
                    onMatch={handleMatch}
                    recentMatches={savedItems}
                 />
              </div>
          );
      case AppView.THREE_D:
          return (
              <div className="h-[calc(100vh-4rem)] relative z-10">
                  <ThreeDView 
                      generatedLooks={generatedLooks} 
                      onUpdateLook={updateLookInDb}
                  />
              </div>
          );
      case AppView.CHAT:
         return (
            <div className="h-[calc(100vh-4rem)] relative z-10 bg-black">
               {userPhoto && (
                  <ChatStylist 
                      userPhoto={userPhoto.data} 
                      userGender={userPhoto.gender}
                      currentOutfit={outfitState}
                      closetItems={closetItems}
                      onNewTryOn={handleNewTryOn}
                      setGeneratedLooks={setGeneratedLooks}
                      onSelectOutfit={handleWearLook}
                      onRemoveOutfitItem={handleRemoveFromOutfit}
                      itemsToAnalyze={closetAnalysisQueue}
                      onAnalysisComplete={() => setClosetAnalysisQueue([])}
                      userId={currentUser?.id}
                  />
               )}
            </div>
         );
      case AppView.INSPIRATION: 
        return (
            <div className="h-[calc(100vh-4rem)] relative z-10 bg-black">
                {userPhoto && (
                    <InspirationScanner 
                        userPhoto={userPhoto.data} 
                        onNewTryOn={(result) => {
                            handleNewTryOn(result);
                            handleSaveItem(result);
                        }}
                    />
                )}
            </div>
        );
      case AppView.WARDROBE:
        return (
           <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-transparent border-t border-white/10 relative z-10">
             <Wardrobe 
                savedItems={savedItems} 
                closetItems={closetItems}
                onRemoveLook={handleRemoveLook}
                onAddClosetItem={handleAddClosetItem}
                onRemoveClosetItem={handleRemoveClosetItem}
                onWearClosetItem={handleWearClosetItem}
                onStyleClosetItems={handleStyleClosetItems}
                currentOutfit={outfitState}
             />
           </div>
        );
      default: return <div>Unknown View</div>;
    }
  };

  if (authSession === 'none') {
    return <AuthScreen onLogin={handleLogin} onSkip={handleSkipAuth} />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative selection:bg-accent/30 selection:text-white overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>
      <ApiKeyBanner />
      <div className="relative z-50">
          <Navbar 
            currentView={currentView} 
            setView={setCurrentView} 
            hasPhoto={userPhotos.length > 0}
            isGuest={authSession === 'guest'}
            onLogout={handleLogout}
          />
      </div>
      <main className="flex-1 relative z-10">{renderContent()}</main>
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
    </div>
  );
}

export default App;