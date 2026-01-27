import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, Plus, ArrowRight, MessageCircle, ExternalLink, Mic, Search, ChevronRight, Check, Download, Layers, X, ShoppingBag, Trash2, PlusCircle, Shirt, History, Menu, SidebarClose } from 'lucide-react';
import { ChatMessage, Product, OutfitState, TryOnResult, ProductCategory, ChatSession } from '../types';
import { chatWithStylist, analyzeClosetFit, searchProducts, generateTryOnImage } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface ChatStylistProps {
  userPhoto: string;
  userGender?: string;
  currentOutfit: OutfitState; // From App state
  closetItems?: Product[]; // User's real inventory
  onNewTryOn: (result: TryOnResult) => void;
  setGeneratedLooks: React.Dispatch<React.SetStateAction<TryOnResult[]>>;
  onSelectOutfit?: (result: TryOnResult) => void; 
  onRemoveOutfitItem?: (category: ProductCategory) => void; 
  itemsToAnalyze?: Product[];
  onAnalysisComplete?: () => void;
  userId?: string;
}

export const ChatStylist: React.FC<ChatStylistProps> = ({ 
    userPhoto, 
    userGender, 
    currentOutfit,
    closetItems = [],
    onNewTryOn, 
    setGeneratedLooks,
    onSelectOutfit,
    onRemoveOutfitItem,
    itemsToAnalyze,
    onAnalysisComplete,
    userId
}) => {
  // --- STATE MANAGEMENT ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<Product[]>([]);

  // Track the ID of the outfit currently selected in the chat session
  const [sessionSelectedId, setSessionSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }
  }, []);

  // --- DATA LOADING ---
  useEffect(() => {
      const loadSessions = async () => {
          if (userId && supabase) {
              // Load from Supabase
              const { data: dbSessions, error } = await supabase
                .from('chat_sessions')
                .select('*, chat_messages(*)')
                .eq('user_id', userId)
                .order('last_modified', { ascending: false });
              
              if (error) {
                  console.error('Failed to load chat sessions:', error);
                  return;
              }

              if (dbSessions) {
                  const mappedSessions: ChatSession[] = dbSessions.map(s => ({
                      id: s.id,
                      title: s.title,
                      lastModified: new Date(s.last_modified).getTime(),
                      previewText: s.preview_text || '',
                      messages: (s.chat_messages || [])
                        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .map((m: any) => ({
                            id: m.id,
                            role: m.role as any,
                            text: m.text,
                            timestamp: new Date(m.timestamp).getTime(),
                            attachments: m.meta_json?.attachments,
                            userAttachments: m.meta_json?.userAttachments,
                            groundingMetadata: m.meta_json?.groundingMetadata
                        }))
                  }));
                  setSessions(mappedSessions);
                  if (mappedSessions.length > 0 && !activeSessionId) {
                      setActiveSessionId(mappedSessions[0].id);
                  } else if (mappedSessions.length === 0) {
                      createNewSession();
                  }
              }
          } else {
              // Fallback to LocalStorage (Guest Mode)
              try {
                  const saved = localStorage.getItem('scootpie_chat_sessions');
                  const localSessions = saved ? JSON.parse(saved) : [];
                  setSessions(localSessions);
                  if (localSessions.length > 0 && !activeSessionId) {
                      setActiveSessionId(localSessions[0].id);
                  } else if (localSessions.length === 0) {
                      createNewSession();
                  }
              } catch { 
                  createNewSession(); 
              }
          }
      };

      loadSessions();
  }, [userId]);

  // Persistence Handler (Local Storage Only - DB is handled via direct inserts)
  useEffect(() => {
      if (!userId) {
          if (sessions.length > 0) {
              localStorage.setItem('scootpie_chat_sessions', JSON.stringify(sessions));
          }
      }
  }, [sessions, userId]);

  // Derived state for active session
  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  const messages = activeSession?.messages || [];

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  // --- AUTOMATED TRIGGER FOR CLOSET ANALYSIS ---
  useEffect(() => {
      if (itemsToAnalyze && itemsToAnalyze.length > 0 && !isLoading && activeSessionId) {
          const trigger = async () => {
              const prompt = `I've selected these ${itemsToAnalyze.length} items from my closet. Generate 3 distinct high-fashion outfits using them. Mix them together or pair them with new items.`;
              await handleSendMessage(prompt, itemsToAnalyze);
              if (onAnalysisComplete) onAnalysisComplete();
          };
          trigger();
      }
  }, [itemsToAnalyze, activeSessionId]);


  // --- ACTIONS ---

  const createNewSession = async () => {
      const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: `New Thread ${sessions.length + 1}`,
          messages: [
            {
                id: '1',
                role: 'model',
                text: "Stylist online. Check your closet or start fresh.",
                timestamp: Date.now()
            },
            ...(closetItems.length > 0 ? [{
                id: 'init-closet',
                role: 'system' as const,
                text: `>> DIGITAL CLOSET LINKED: ${closetItems.length} ITEMS AVAILABLE.`,
                timestamp: Date.now()
            }] : [])
          ],
          lastModified: Date.now(),
          previewText: "Stylist online..."
      };
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);

      if (userId && supabase) {
          await supabase.from('chat_sessions').insert({
              id: newSession.id,
              user_id: userId,
              title: newSession.title,
              preview_text: newSession.previewText || '',
              last_modified: new Date(newSession.lastModified).toISOString()
          });
          // Note: Initial generic messages aren't saved to DB to save space, assuming they are client-side greetings
      }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (activeSessionId === id) {
          setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
          if (newSessions.length === 0) createNewSession();
      }

      if (userId && supabase) {
          await supabase.from('chat_sessions').delete().eq('id', id);
      }
  };

  const updateActiveSession = (newMessages: ChatMessage[]) => {
      if (!activeSessionId) return;
      
      const lastMsg = newMessages[newMessages.length - 1];
      const preview = lastMsg.role === 'user' ? `You: ${lastMsg.text}` : lastMsg.text;
      const now = Date.now();
      
      // Determine new title logic locally
      let newTitle = activeSession?.title || 'New Thread';
      if (activeSession?.title.startsWith("New Thread") && newMessages.length > 2) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
              newTitle = firstUserMsg.text.substring(0, 20) || activeSession.title;
          }
      }

      setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
              return {
                  ...s,
                  messages: newMessages,
                  lastModified: now,
                  previewText: preview.substring(0, 40) + (preview.length > 40 ? '...' : ''),
                  title: newTitle
              };
          }
          return s;
      }));

      return { title: newTitle, preview, lastModified: now };
  };

  // Helper to sync specific message to DB
  const persistMessage = async (msg: ChatMessage, sessionId: string) => {
      if (!userId || !supabase) return;
      
      await supabase.from('chat_messages').insert({
          id: msg.id,
          session_id: sessionId,
          role: msg.role,
          text: msg.text,
          timestamp: new Date(msg.timestamp).toISOString(),
          meta_json: {
              attachments: msg.attachments,
              userAttachments: msg.userAttachments,
              groundingMetadata: msg.groundingMetadata
          }
      });
  };

  // Helper to sync session update
  const persistSessionUpdate = async (sessionId: string, updates: { title: string, preview: string, lastModified: number }) => {
      if (!userId || !supabase) return;

      await supabase.from('chat_sessions').update({
          title: updates.title,
          preview_text: updates.preview,
          last_modified: new Date(updates.lastModified).toISOString()
      }).eq('id', sessionId);
  };


  const handleSendMessage = async (overrideText?: string, overrideAttachments?: Product[]) => {
    const textToSend = overrideText || input;
    const attachmentsToSend = overrideAttachments || stagedAttachments;

    if ((!textToSend.trim() && attachmentsToSend.length === 0) || isLoading || !activeSessionId) return;
    const currentSessionId = activeSessionId; // Capture for closure

    // 1. Construct User Message
    const userMsg: ChatMessage = { 
        id: crypto.randomUUID(), 
        role: 'user', 
        text: textToSend, 
        userAttachments: attachmentsToSend.length > 0 ? [...attachmentsToSend] : undefined,
        timestamp: Date.now() 
    };

    const updatedMessages = [...messages, userMsg];
    const sessionUpdates = updateActiveSession(updatedMessages);
    
    // PERSIST USER MSG
    persistMessage(userMsg, currentSessionId);
    if (sessionUpdates) persistSessionUpdate(currentSessionId, sessionUpdates);

    // Clear Input states
    if (!overrideText) setInput('');
    if (!overrideAttachments) setStagedAttachments([]);
    
    setShowClosetPicker(false);
    setIsLoading(true);

    try {
      // 2. Prepare Context (History + Explicit Attachments)
      const history = updatedMessages
        .filter(m => m.role !== 'system' && !m.attachments) 
        .map(m => {
            let text = m.text;
            if (m.userAttachments && m.userAttachments.length > 0) {
                const attachmentDesc = m.userAttachments.map(p => `[ATTACHED: ${p.name}]`).join(' ');
                text = `${attachmentDesc} ${text}`;
            }
            return { role: m.role === 'model' ? 'model' : 'user', parts: [{ text }] };
        });

      let responseText = "";
      let groundingMetadata = undefined;

      // --- ROUTING LOGIC: CLOSET ANALYZER VS GENERAL CHAT ---
      if (attachmentsToSend.length > 0) {
           const response = await analyzeClosetFit(history, userMsg.text || "Style these items for me.", attachmentsToSend);
           responseText = response.text || "Analysis complete.";
           groundingMetadata = response.groundingMetadata;
      } else {
           const currentItemsStr = (Object.entries(currentOutfit) as [string, Product | undefined][])
            .filter((entry): entry is [string, Product] => !!entry[1])
            .map(([cat, p]) => `[${cat.toUpperCase()}: ${p.name} (${p.source === 'closet' ? 'USER OWNED' : 'VIRTUAL'})]`)
            .join(', ') || "Basic clothes";
            
           const closetInventoryStr = closetItems.map(p => `- ${p.name} (${p.color} ${p.category})`).join('\n');
           const response = await chatWithStylist(history, userMsg.text, currentItemsStr, closetInventoryStr);
           responseText = response.text || "One moment...";
           groundingMetadata = response.groundingMetadata;
      }

      // 3. Update UI with Model Response (Clean Text)
      const modelResponseMsg: ChatMessage = { 
          id: crypto.randomUUID(), 
          role: 'model' as const, 
          text: responseText.trim().replace(/\|\|.*?\|\|/g, ''), 
          groundingMetadata,
          timestamp: Date.now() 
      };

      const messagesWithResponse = [...updatedMessages, modelResponseMsg];
      updateActiveSession(messagesWithResponse);
      persistMessage(modelResponseMsg, currentSessionId);

      // 4. PARSE TAGS (Multi-Strategy Support)
      const closetLooks = [...responseText.matchAll(/\|\|CLOSET_LOOK:\s*(.*?)\|\|/g)];
      const hybridLooks = [...responseText.matchAll(/\|\|HYBRID_LOOK:\s*(.*?)\|\|/g)];
      const oldSearch = responseText.match(/\|\|VISUAL_SEARCH:\s*(.*?)\|\|/);
      const oldCloset = responseText.match(/\|\|USE_CLOSET:\s*(.*?)\|\|/);

      const actions = [];
      for (const match of closetLooks) actions.push({ type: 'CLOSET', content: match[1] });
      for (const match of hybridLooks) actions.push({ type: 'HYBRID', content: match[1] });
      
      if (actions.length === 0) {
          if (oldCloset) actions.push({ type: 'CLOSET_SINGLE', content: oldCloset[1] });
          if (oldSearch) actions.push({ type: 'SEARCH_SINGLE', content: oldSearch[1] });
      }

      // 5. EXECUTE GENERATION PIPELINES
      if (actions.length > 0) {
           const loadingId = crypto.randomUUID();
           const systemLoadingMsg: ChatMessage = { 
                id: loadingId, 
                role: 'system' as const, 
                text: `>> GENERATING ${actions.length} OPTIONS (INTERNAL & EXTERNAL)...`, 
                timestamp: Date.now() 
           };
           
           updateActiveSession([...messagesWithResponse, systemLoadingMsg]);
           // We don't necessarily persist system loading messages, or we can if we want full fidelity. Skipping for noise reduction.

           const results = await Promise.all(actions.map(async (action) => {
               try {
                   let productsToWear: Product[] = [];
                   let triggerItem: Product | undefined = undefined;

                   if (action.type === 'CLOSET' || action.type === 'CLOSET_SINGLE') {
                       const targetNames = action.content.split(',').map(s => s.trim().toLowerCase());
                       closetItems.forEach(item => {
                           const itemName = item.name.toLowerCase();
                           if (targetNames.some(t => itemName.includes(t) || t.includes(itemName))) {
                               productsToWear.push(item);
                               if (!triggerItem) triggerItem = item;
                           }
                       });
                       if (productsToWear.length === 0 && attachmentsToSend.length > 0) {
                           productsToWear = attachmentsToSend;
                           triggerItem = attachmentsToSend[0];
                       }

                   } else if (action.type === 'HYBRID') {
                       const parts = action.content.split('+');
                       const closetPart = parts[0]?.trim().toLowerCase();
                       const searchPart = parts[1]?.trim();
                       if (closetPart) {
                           const match = closetItems.find(i => i.name.toLowerCase().includes(closetPart));
                           if (match) productsToWear.push(match);
                       }
                       if (searchPart) {
                           const found = await searchProducts(searchPart, userGender);
                           if (found.length > 0) {
                               productsToWear.push(found[0]); 
                               triggerItem = found[0]; 
                           }
                       }
                   } else if (action.type === 'SEARCH_SINGLE') {
                       const found = await searchProducts(action.content, userGender);
                       if (found.length > 0) {
                           productsToWear.push(found[0]);
                           triggerItem = found[0];
                       }
                   }

                   if (productsToWear.length > 0) {
                       const img = await generateTryOnImage(userPhoto, productsToWear);
                       if (img && triggerItem) {
                           return {
                               product: triggerItem,
                               outfit: productsToWear,
                               img
                           };
                       }
                   }
                   return null;

               } catch (e) {
                   return null;
               }
           }));

           // 6. PROCESS RESULTS
           const successful = results.filter((r): r is NonNullable<typeof r> => r !== null);
           
           // Remove loading message
           const finalMsgs = messagesWithResponse; 

           if (successful.length > 0) {
                const newTryOns: TryOnResult[] = [];
                successful.forEach(r => {
                    const result: TryOnResult = {
                        id: crypto.randomUUID(),
                        productId: r.product.id,
                        product: r.product,
                        outfit: r.outfit,
                        imageUrl: r.img,
                        timestamp: Date.now()
                    };
                    newTryOns.push(result);
                    onNewTryOn(result);
                });
                
                const attachmentMsg: ChatMessage = { 
                    id: crypto.randomUUID(), 
                    role: 'model' as const, 
                    text: `Here are ${successful.length} styled options based on your request.`, 
                    attachments: newTryOns,
                    timestamp: Date.now() 
                };
                updateActiveSession([...finalMsgs, attachmentMsg]);
                persistMessage(attachmentMsg, currentSessionId);

           } else {
                const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'system' as const, text: `>> COULD NOT VISUALIZE LOOKS.`, timestamp: Date.now() };
                updateActiveSession([...finalMsgs, errorMsg]);
                persistMessage(errorMsg, currentSessionId);
           }

      } 

    } catch (error) { 
        const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'system' as const, text: `>> SYSTEM ERROR`, timestamp: Date.now() };
        updateActiveSession([...updatedMessages, errorMsg]);
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleSelect = (result: TryOnResult) => {
    setSessionSelectedId(result.id);
    if (onSelectOutfit) onSelectOutfit(result);
  };

  // --- RENDER HELPERS ---

  return (
    <div className="flex h-full bg-black relative text-white overflow-hidden">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* --- SIDEBAR --- */}
      <div className={`
          h-full bg-zinc-950 border-r border-white/10 z-30 flex flex-col overflow-hidden transition-all duration-300
          absolute md:relative
          ${isSidebarOpen 
            ? 'translate-x-0 w-72' 
            : '-translate-x-full w-72 md:w-0 md:translate-x-0'
          }
      `}>
         {/* Fixed Width Inner Container to prevent content squashing during transition */}
         <div className="w-72 h-full flex flex-col min-w-[18rem]">
             
             {/* Header - Fixed Height 56px (h-14) to match main header */}
             <div className="h-14 min-h-[3.5rem] px-4 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur-sm flex-shrink-0">
                 {/* RENAMED: Sessions -> Style Threads */}
                 <h3 className="font-serif text-lg italic text-white">Style Threads</h3>
                 <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><SidebarClose className="w-5 h-5"/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                 {sessions.map(s => (
                     <div 
                        key={s.id} 
                        onClick={() => { setActiveSessionId(s.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={`group p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:border-white/5
                            ${activeSessionId === s.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
                        `}
                     >
                         <div className="flex justify-between items-start mb-1">
                             <h4 className="font-mono text-xs font-bold truncate pr-2">{s.title}</h4>
                             {activeSessionId === s.id && (
                                 <button 
                                    onClick={(e) => deleteSession(s.id, e)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/50 hover:text-red-400 rounded transition-all"
                                 >
                                     <Trash2 className="w-3 h-3" />
                                 </button>
                             )}
                         </div>
                         <p className="text-[10px] truncate opacity-60 font-mono">{s.previewText || "Start a chat..."}</p>
                         <p className="text-[9px] text-gray-600 mt-2 text-right">{new Date(s.lastModified).toLocaleDateString()}</p>
                     </div>
                 ))}
             </div>

             <div className="p-4 border-t border-white/10 bg-black/50">
                 <button 
                    onClick={createNewSession}
                    className="w-full py-2 bg-white text-black font-mono text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-colors rounded flex items-center justify-center gap-2"
                 >
                     <PlusCircle className="w-4 h-4" /> New Thread
                 </button>
             </div>
         </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
          
          {/* Header (Mobile Sidebar Toggle) */}
          <div className="h-14 min-h-[3.5rem] border-b border-white/10 flex items-center px-4 md:px-8 bg-black/50 backdrop-blur-sm sticky top-0 z-20">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`mr-4 p-2 hover:bg-white/10 rounded transition-colors ${isSidebarOpen ? 'md:block opacity-50' : ''}`}
              >
                  {isSidebarOpen ? <SidebarClose className="w-5 h-5 hidden md:block" /> : <Menu className="w-5 h-5" />}
                  {/* On Mobile, always show menu icon if open/close logic is handled by slide in */}
                  {isSidebarOpen && <span className="md:hidden"><Menu className="w-5 h-5"/></span>}
              </button>
              <div className="flex flex-col justify-center">
                  <h2 className="font-serif text-lg leading-none">{activeSession?.title || "New Thread"}</h2>
                  <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                      {closetItems.length} items in Closet
                  </span>
              </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    
                    {/* User Attachments (Closet Items) */}
                    {msg.role === 'user' && msg.userAttachments && msg.userAttachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2 justify-end">
                            {msg.userAttachments.map((item, idx) => (
                                <div key={idx} className="relative group/att bg-zinc-900 rounded-lg overflow-hidden border border-white/20 w-24 h-24">
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover/att:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-end p-1 bg-gradient-to-t from-black/80 to-transparent">
                                        <span className="text-[8px] font-mono truncate w-full text-white">{item.name}</span>
                                    </div>
                                    <div className="absolute top-1 right-1 bg-accent rounded-full p-0.5">
                                        <Shirt className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Metadata */}
                    <div className={`flex items-center gap-2 mb-1 px-1 opacity-50 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className="font-mono text-[9px] uppercase tracking-widest">
                        {msg.role === 'user' ? 'YOU' : msg.role === 'system' ? 'SYSTEM' : 'SCOOTPIE'}
                        </span>
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[85%] md:max-w-[70%] p-4 shadow-sm backdrop-blur-sm relative border text-sm leading-relaxed
                        ${msg.role === 'user' 
                            ? 'bg-white text-black rounded-2xl rounded-tr-none border-white' 
                            : msg.role === 'system' 
                                ? 'bg-zinc-900/50 text-accent font-mono text-xs border-dashed border-white/20 w-full md:w-auto rounded' 
                                : 'bg-zinc-900 text-gray-200 rounded-2xl rounded-tl-none border-white/10'
                        }
                    `}>
                        {msg.role === 'model' ? (
                            <ReactMarkdown
                                components={{
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                    strong: ({node, ...props}) => <span className="font-bold text-white" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-1 mb-2" {...props} />,
                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    code: ({node, ...props}) => <code className="bg-white/10 px-1 rounded font-mono text-xs" {...props} />,
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}
                        
                        {/* Generated Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {msg.attachments.map((result) => {
                                    const isSelected = sessionSelectedId === result.id;
                                    return (
                                        <div key={result.id} className={`bg-black rounded-lg overflow-hidden border transition-all ${isSelected ? 'border-accent ring-1 ring-accent' : 'border-white/10'}`}>
                                            <div className="aspect-[3/4] relative">
                                                <img src={result.imageUrl} className="w-full h-full object-cover" />
                                                <button onClick={() => handleSelect(result)} className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur rounded-full text-white hover:bg-accent transition-colors">
                                                    {isSelected ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <h5 className="font-serif text-white truncate">{result.product.name}</h5>
                                                <p className="font-mono text-[9px] text-gray-500 uppercase">{result.product.brand} • {result.product.price}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex items-center gap-2 text-accent text-xs font-mono animate-pulse pl-2">
                     <Loader2 className="w-3 h-3 animate-spin" /> WRITING...
                 </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black border-t border-white/10 relative z-40">
              
              {/* Staged Attachments Preview */}
              {stagedAttachments.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 p-4 bg-zinc-900 border-t border-white/10 flex gap-4 overflow-x-auto">
                      {stagedAttachments.map((item, i) => (
                          <div key={i} className="relative w-16 h-16 flex-shrink-0 bg-black rounded border border-white/20 group">
                              <img src={item.imageUrl} className="w-full h-full object-cover opacity-80" />
                              <button 
                                onClick={() => setStagedAttachments(prev => prev.filter(p => p.id !== item.id))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  <X className="w-3 h-3" />
                              </button>
                          </div>
                      ))}
                      <div className="flex items-center text-xs font-mono text-accent animate-pulse">
                          Adding to context...
                      </div>
                  </div>
              )}

              {/* Closet Picker Overlay - RESIZED TO COMPACT 2x2 GRID */}
              {showClosetPicker && (
                  <div className="absolute bottom-full left-0 w-full md:w-[320px] max-h-[350px] bg-zinc-900 border border-white/20 rounded-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col mb-2 ml-0 md:ml-4 animate-in slide-in-from-bottom-5 fade-in duration-200 z-50">
                      {/* Header */}
                      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur">
                          <div>
                              <h4 className="font-serif text-white text-md">Select from Closet</h4>
                              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">{closetItems.length} Available Assets</p>
                          </div>
                          <button 
                            onClick={() => setShowClosetPicker(false)} 
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                      </div>
                      
                      {/* Grid - 2 COLUMNS */}
                      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 bg-zinc-900/50 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                          {closetItems.length === 0 ? (
                              <div className="col-span-2 py-8 flex flex-col items-center justify-center text-center opacity-50">
                                  <Shirt className="w-8 h-8 mb-3 text-gray-600" />
                                  <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">Archive Empty</p>
                                  <p className="font-serif text-gray-500 mt-1 text-xs italic px-4">Upload items in the Archive tab to use them here.</p>
                              </div>
                          ) : (
                              closetItems.map(item => (
                                  <button 
                                    key={item.id} 
                                    onClick={() => { 
                                        setStagedAttachments(prev => [...prev, item]); 
                                        setShowClosetPicker(false); 
                                    }}
                                    className="group relative aspect-[3/4] bg-black border border-white/10 rounded-md overflow-hidden hover:border-accent transition-all hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                                  >
                                      {/* Image */}
                                      <img 
                                        src={item.imageUrl} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                                      />
                                      
                                      {/* Info Overlay */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                      
                                      <div className="absolute bottom-0 left-0 right-0 p-2 text-left transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                          <p className="font-mono text-[8px] text-accent uppercase tracking-wider mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity delay-75">{item.brand}</p>
                                          <p className="font-serif text-[10px] text-white truncate leading-tight">{item.name}</p>
                                      </div>

                                      {/* Selection Ring/Icon */}
                                      <div className="absolute top-2 right-2 w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
                                          <Plus className="w-3 h-3" />
                                      </div>
                                  </button>
                              ))
                          )}
                      </div>
                  </div>
              )}

              <div className="max-w-4xl mx-auto flex items-end gap-2">
                   {/* Closet Button */}
                   <button 
                     onClick={() => setShowClosetPicker(!showClosetPicker)}
                     className={`p-3 rounded-lg border transition-colors flex-shrink-0 mb-[1px]
                        ${showClosetPicker || stagedAttachments.length > 0 ? 'bg-accent border-accent text-white' : 'bg-zinc-900 border-white/20 text-gray-400 hover:text-white hover:border-white'}
                     `}
                     title="Add Item from Closet"
                   >
                       <Plus className="w-5 h-5" />
                   </button>

                   {/* Text Input */}
                   <div className="flex-1 bg-zinc-900 border border-white/20 rounded-lg flex items-center p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/50 transition-all">
                       <input 
                         type="text" 
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                         placeholder={stagedAttachments.length > 0 ? "Ask about this item..." : "Ask stylist..."}
                         className="w-full bg-transparent text-white placeholder-gray-600 font-mono text-sm px-2 outline-none"
                         disabled={isLoading}
                       />
                       <button 
                         onClick={() => handleSendMessage()}
                         disabled={(!input.trim() && stagedAttachments.length === 0) || isLoading}
                         className="p-2 bg-white text-black rounded hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black"
                       >
                           <ArrowRight className="w-4 h-4" />
                       </button>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};
