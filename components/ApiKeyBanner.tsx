import React, { useEffect, useState } from 'react';
import { Key, Lock } from 'lucide-react';

export const ApiKeyBanner = () => {
  const [hasKey, setHasKey] = useState(true);

  const checkKey = async () => {
    // Check if running in AI Studio environment
    if ((window as any).aistudio) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      // For standalone deployment, assume key is configured if GEMINI_API_KEY exists
      setHasKey(true);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success per instruction to mitigate race condition
      setHasKey(true);
    }
  };

  if (hasKey) return null;

  return (
    <div className="bg-accent text-white px-4 py-2 flex items-center justify-between text-xs font-mono uppercase tracking-widest sticky top-0 z-[60]">
      <div className="flex items-center gap-2">
        <Lock className="w-3 h-3" />
        <span>Paid API Key Required for Try-On</span>
      </div>
      <button 
        onClick={handleSelectKey}
        className="flex items-center gap-2 bg-black/20 hover:bg-black/40 px-3 py-1 rounded transition-colors border border-white/20"
      >
        <Key className="w-3 h-3" />
        Select Key
      </button>
    </div>
  );
};