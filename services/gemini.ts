import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";
import { Product, ProductCategory, InspirationAnalysis } from '../types';
import { logger } from '../lib/logger';
import { rateLimit, isSafeUrl, sanitizeInput } from '../lib/security';
import { redis } from '../lib/redis';

const getAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SEARCHAPI_API_KEY: string = "Z9F2zoDAZX329hJGk3eoSfpt"; 

// --- IMAGE UTILITIES ---

const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  try {
    if (url.startsWith('data:')) return url;

    // Direct fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); 

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return `data:${contentType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  } catch (error) {
    logger.error(`Failed to convert image to base64`, error, { url });
    return null;
  }
};

// --------------------------------------------------------

export const enhanceUserPhoto = async (base64Image: string): Promise<string | null> => {
  try {
    await rateLimit('enhanceUserPhoto', { windowMs: 60000, maxRequests: 5 });

    const ai = getAI();
    // Validate simple size check
    if (base64Image.length > 10 * 1024 * 1024) throw new Error("Image payload too large");

    const base64Parts = base64Image.split(',');
    const cleanBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = `Task: Full-Body Fashion Studio Shot. Preserve Face Identity. Output: High resolution, full body visible. Safety: No nudity.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: cleanBase64 } }
        ]
      },
      config: {
        imageConfig: { imageSize: '1K', aspectRatio: '3:4' }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    logger.error("Enhancement Error", error);
    return null;
  }
};

export const chatWithStylist = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  outfitContext: string,
  closetInventory: string
) => {
  try {
    await rateLimit('chatWithStylist', { windowMs: 60000, maxRequests: 20 });
    
    const safeMessage = sanitizeInput(message, 500);
    const ai = getAI();
    const sanitizedHistory = history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: h.parts.map(p => ({ text: sanitizeInput(p.text, 500) }))
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...sanitizedHistory,
        { role: 'user', parts: [{ text: `CONTEXT UPDATE:\n- CURRENTLY WEARING: ${sanitizeInput(outfitContext, 500)}\n- USER CLOSET INVENTORY:\n${sanitizeInput(closetInventory, 2000)}\n\nUSER REQUEST: ${safeMessage}` }] }
      ],
      config: {
        systemInstruction: `You are ScootPie, an elite AI Fashion Stylist. Safety: No nudity.`,
        thinkingConfig: { thinkingBudget: 1024 },
        tools: [{ googleSearch: {} }],
      }
    });
    
    return {
      text: response.text || "I'm thinking...",
      groundingMetadata: JSON.parse(JSON.stringify(response.candidates?.[0]?.groundingMetadata || {}))
    };
  } catch (error) {
    return { text: "Connection unstable. Please re-enter prompt." };
  }
};

export const analyzeClosetFit = async (
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    attachedItems: Product[]
) => {
    try {
        await rateLimit('analyzeClosetFit', { windowMs: 60000, maxRequests: 10 });
        const ai = getAI();
        const itemsList = attachedItems.map((p, i) => `ITEM_${i}: ${sanitizeInput(p.name)}`).join('\n');
        const specializedPrompt = `SPECIALIZED STYLING SESSION. Items: ${itemsList}. Task: Provide ||CLOSET_LOOK|| and ||HYBRID_LOOK||.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                ...history.map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: h.parts })),
                { role: 'user', parts: [{ text: specializedPrompt }] }
            ],
            config: {
                systemInstruction: "You are a high-end fashion stylist.",
                thinkingConfig: { thinkingBudget: 2048 },
            }
        });

        return {
            text: response.text || "",
            groundingMetadata: JSON.parse(JSON.stringify(response.candidates?.[0]?.groundingMetadata || {}))
        };
    } catch (error) {
        return { text: "I had trouble analyzing those specific pieces." };
    }
}

export const searchProducts = async (query: string, gender?: string): Promise<Product[]> => {
  try {
    await rateLimit('searchProducts', { windowMs: 60000, maxRequests: 30 });
    
    const safeQuery = sanitizeInput(query, 100);
    const fullQuery = `${safeQuery} ${gender || ''}`;
    const cacheKey = `search:${fullQuery.toLowerCase().replace(/\s+/g, '-')}`;

    // 1. SCALABILITY: Check Cache First
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                logger.info("Search Cache Hit", { query: fullQuery });
                return cached as Product[];
            }
        } catch(e) {
            // Redis error, skip
        }
    }

    const ai = getAI();
    const apiKey = SEARCHAPI_API_KEY;
    const prohibitedTerms = ['nude', 'naked', 'bikini', 'swimwear', 'swimsuit', 'lingerie', 'underwear', 'nsfw'];
    
    if (prohibitedTerms.some(term => safeQuery.toLowerCase().includes(term))) return [];
    
    let searchResults: any[] = [];
    let isFallback = false;

    if (apiKey) {
        try {
            const params = new URLSearchParams({
                engine: "google_shopping",
                q: fullQuery,
                api_key: apiKey,
                num: "6",
                gl: "us",
                hl: "en",
            });
            const res = await fetch(`https://www.searchapi.io/api/v1/search?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.shopping_results?.length > 0) {
                    searchResults = data.shopping_results.map((item: any, idx: number) => ({
                        _id: idx,
                        title: item.title,
                        source: item.source || item.seller,
                        price: item.price,
                        link: item.product_link || item.link,
                        thumbnail: item.thumbnail,
                        snippet: item.snippet || item.title
                    }));
                } else isFallback = true;
            } else isFallback = true;
        } catch (e) { isFallback = true; }
    } else isFallback = true;

    let prompt = "";
    if (!isFallback && searchResults.length > 0) {
        const llmInput = searchResults.map(s => ({ id: s._id, title: s.title, source: s.source, price: s.price }));
        prompt = `Extract fashion data from results: ${JSON.stringify(llmInput)}. Return JSON array.`;
    } else {
        prompt = `Generate 3 fashion items for query: "${fullQuery}". Return JSON array.`;
    }

    const extractionResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    let products: Product[] = [];
    try {
        const structuredData = JSON.parse(extractionResponse.text);
        if (!isFallback && searchResults.length > 0) {
            products = structuredData.map((item: any) => {
                const original = searchResults.find(s => s._id === item.index) || searchResults[0];
                return {
                    id: `sp-${Date.now()}-${Math.random()}`,
                    name: item.name,
                    brand: item.brand || original.source,
                    price: item.price,
                    category: item.category || 'top',
                    description: item.description || original.snippet,
                    url: original.link,
                    imageUrl: original.thumbnail,
                    source: 'search'
                } as Product;
            });
        } else {
            products = structuredData.map((item: any, idx: number) => ({
                id: `gen-${Date.now()}-${idx}`,
                name: item.name,
                brand: item.brand,
                price: item.price,
                category: item.category || 'top',
                description: `${item.brand} ${item.name}`,
                url: `https://www.google.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}&tbm=shop`,
                imageUrl: undefined,
                source: 'generated'
            }));
        }
    } catch (e) { return []; }

    // 2. SCALABILITY: Set Cache (1 Hour)
    if (redis && products.length > 0) {
        try {
             await redis.set(cacheKey, products, { ex: 3600 });
        } catch(e) {}
    }

    return products;
  } catch (error) {
    logger.error("Search Error", error);
    return [];
  }
};

export const generateTryOnImage = async (userPhotoBase64: string, products: Product[]): Promise<string | null> => {
  try {
    await rateLimit('generateTryOnImage', { windowMs: 60000, maxRequests: 5 });
    const ai = getAI();
    if (userPhotoBase64.length > 8 * 1024 * 1024) throw new Error("Input image too large");

    const base64Parts = userPhotoBase64.split(',');
    const cleanUserBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    const userMimeMatch = userPhotoBase64.match(/^data:(image\/\w+);base64,/);
    const userMimeType = userMimeMatch ? userMimeMatch[1] : 'image/jpeg';

    const referenceParts = [];
    const textDescriptions = [];
    for (const [i, p] of products.entries()) {
        textDescriptions.push(`ITEM ${i+1}: ${sanitizeInput(p.brand)} ${sanitizeInput(p.name)}`);
        if (p.imageUrl) {
            const productBase64 = await imageUrlToBase64(p.imageUrl);
            if (productBase64) {
                 const pClean = productBase64.split(',')[1];
                 const pMime = productBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
                 referenceParts.push({ text: `REF ${i+1}:` });
                 referenceParts.push({ inlineData: { mimeType: pMime, data: pClean } });
            }
        }
    }

    const prompt = `Virtual Try-On. Preserve Face. Outfit: ${textDescriptions.join(', ')}. Safety: No nudity.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }, { inlineData: { mimeType: userMimeType, data: cleanUserBase64 } }, ...referenceParts]
      },
      config: {
         tools: [{ googleSearch: {} }], 
         imageConfig: { imageSize: '1K', aspectRatio: '3:4' }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

// --- VIDEO GENERATION SPLIT (START -> POLL) ---

export const startRunwayVideo = async (imageBase64: string): Promise<string | null> => {
  try {
    await rateLimit('startRunwayVideo', { windowMs: 60000, maxRequests: 1 });

    const ai = getAI();
    const base64Parts = imageBase64.split(',');
    const cleanBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: 'Cinematic fashion runway walk. 4k, slow motion. Safety: Fully clothed.',
      image: { imageBytes: cleanBase64, mimeType },
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '9:16' }
    });

    return JSON.stringify(operation); 
  } catch (e) {
    logger.error("Start Video Error", e);
    return null;
  }
};

export const checkRunwayVideoStatus = async (operationJson: string): Promise<{ status: 'running' | 'completed' | 'failed', videoUrl?: string }> => {
    try {
        const ai = getAI();
        let operation = JSON.parse(operationJson);
        
        operation = await ai.operations.getVideosOperation({ operation });
        
        if (operation.done) {
            const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (uri) {
                // Client-side fetch proxy: Fetch blob using API key and return base64 data URI
                // This replaces the server-side proxy which cannot run in this environment
                try {
                    const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
                    if (res.ok) {
                        const blob = await res.blob();
                        const reader = new FileReader();
                        return new Promise((resolve) => {
                            reader.onloadend = () => {
                                resolve({ status: 'completed', videoUrl: reader.result as string });
                            };
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch(e) {
                    console.error("Video fetch failed", e);
                    return { status: 'failed' };
                }
            }
            return { status: 'failed' };
        }
        
        return { status: 'running' };
    } catch (e) {
        return { status: 'failed' };
    }
};

// DO NOT USE ON SERVER - Deprecated for Scalability
export const generateRunwayVideo = async (imageBase64: string): Promise<string | null> => {
    return null; 
};

export const generate360View = async (imageBase64: string): Promise<string | null> => {
    try {
      await rateLimit('generate360View', { windowMs: 60000, maxRequests: 1 });
      const ai = getAI();
      const base64Parts = imageBase64.split(',');
      const cleanBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
      const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
  
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: '360 degree turntable rotation. Smooth, continuous. Safety: Fully clothed.',
        image: { imageBytes: cleanBase64, mimeType },
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '9:16' }
      });
  
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }
  
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
         // Client-side fetch proxy
         const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
         if (res.ok) {
            const blob = await res.blob();
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.readAsDataURL(blob);
            });
         }
      }
      return null;
    } catch (error) {
      logger.error("360 View Gen Error", error);
      return null;
    }
};

export const analyzeClosetItem = async (base64Image: string): Promise<Partial<Product> | null> => {
    try {
        await rateLimit('analyzeClosetItem', { windowMs: 60000, maxRequests: 10 });
        const ai = getAI();
        const base64Parts = base64Image.split(',');
        const cleanBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
        const mimeType = base64Image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
        const prompt = `Analyze clothing. Return JSON: { category, name, brand, color }. Categories: top, bottom, shoes, outerwear, one-piece, accessory.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: cleanBase64 } }] },
            config: { responseMimeType: 'application/json' }
        });
        const data = JSON.parse(response.text);
        return {
            category: data.category, name: data.name, brand: data.brand, color: data.color, description: `A ${data.color} ${data.name} by ${data.brand}`, price: 'Owned', source: 'closet'
        };
    } catch (e) { return null; }
}

export const analyzeInspirationImage = async (base64Image: string): Promise<InspirationAnalysis | null> => {
    try {
        await rateLimit('analyzeInspirationImage', { windowMs: 60000, maxRequests: 5 });
        const ai = getAI();
        const base64Parts = base64Image.split(',');
        const cleanBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
        const mimeType = base64Image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
        const prompt = `Analyze outfit. Suggest 3 tiers (Luxury, Mid, Budget). Return JSON: { totalCost: {luxury, mid, budget}, items: [{category, luxury: {name, brand, price}, mid: {...}, budget: {...}}] }`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: cleanBase64 } }] },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text) as InspirationAnalysis;
    } catch (e) { return null; }
}

export const generateStealTheLook = async (userPhoto: string, inspirationPhoto: string, mode: 'full' | 'top' | 'bottom' = 'full'): Promise<string | null> => {
    try {
        await rateLimit('generateStealTheLook', { windowMs: 60000, maxRequests: 3 });
        const ai = getAI();
        const userClean = userPhoto.split(',')[1];
        const userMime = userPhoto.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
        const inspoClean = inspirationPhoto.split(',')[1];
        const inspoMime = inspirationPhoto.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
        const instructions = mode === 'full' ? "TRANSFER COMPLETE OUTFIT." : mode === 'top' ? "TRANSFER UPPER BODY ONLY." : "TRANSFER LOWER BODY ONLY.";
        const prompt = `Style Transfer. ${instructions} Preserve Face/Body Identity. Safety: No nudity.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: prompt }, { inlineData: { mimeType: userMime, data: userClean } }, { text: "STYLE REFERENCE:" }, { inlineData: { mimeType: inspoMime, data: inspoClean } }]
            },
            config: { imageConfig: { imageSize: '1K', aspectRatio: '3:4' } }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch (e) { return null; }
}

export const getDiscoverQueue = async (gender?: string): Promise<Product[]> => {
    const styles = ["trending streetwear", "avant garde", "minimalist luxury", "techwear", "vintage 90s"];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    return await searchProducts(randomStyle, gender);
}