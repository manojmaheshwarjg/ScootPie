/**
 * Client-safe Gemini API wrapper
 * Calls server-side API routes instead of using Gemini SDK directly
 * This keeps the API key secure on the server
 *
 * Images are uploaded to Supabase Storage first for efficiency (bypasses body size limits),
 * but fall back to sending base64 directly if storage is unavailable.
 */

import { Product, InspirationAnalysis } from '../types';
import { uploadImageToStorage, deleteImageFromStorage } from '../lib/storage-utils';

/** Try to upload to storage; if it fails, return null silently so callers can fall back to base64. */
const tryUpload = async (base64: string, folder: string): Promise<string | null> => {
    try {
        return await uploadImageToStorage(base64, folder);
    } catch {
        return null;
    }
};

export const enhanceUserPhoto = async (base64Image: string): Promise<string | null> => {
    try {
        console.log('🖼️ [Generation] Uploading photo for AI enhancement...');
        const imageUrl = await tryUpload(base64Image, 'enhance');

        if (imageUrl) {
            console.log('🤖 [Generation] Sending photo URL to Gemini for enhancement...');
        } else {
            console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for enhancement.');
        }

        const response = await fetch('/api/gemini/enhance-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageUrl ? { imageUrl } : { base64Image }),
        });

        if (!response.ok) {
            console.error('❌ [Generation] Enhance photo request failed:', response.status);
            if (imageUrl) deleteImageFromStorage(imageUrl).catch(() => { });
            return null;
        }

        const data = await response.json();
        if (imageUrl) deleteImageFromStorage(imageUrl).catch(() => { });
        console.log('✅ [Generation] Photo enhancement complete.');
        return data.enhancedImage || null;
    } catch (error) {
        console.error('❌ [Generation] Enhance photo error:', error);
        return null;
    }
};

export const generateTryOnImage = async (
    userPhotoBase64: string,
    products: Product[]
): Promise<string | null> => {
    try {
        console.log(`👗 [Generation] Starting virtual try-on for ${products.length} item(s):`, products.map(p => p.name).join(', '));

        // If photo is already a URL, use it directly instead of re-uploading
        let userPhotoUrl: string | null = null;
        if (userPhotoBase64.startsWith('http://') || userPhotoBase64.startsWith('https://')) {
            console.log('🔗 [Generation] Photo is already a URL, skipping upload...');
            userPhotoUrl = userPhotoBase64;
        } else {
            console.log('📤 [Generation] Uploading user photo to storage...');
            userPhotoUrl = await tryUpload(userPhotoBase64, 'tryon');
            if (userPhotoUrl) {
                console.log('🤖 [Generation] Calling Gemini try-on API via URL...');
            } else {
                console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for try-on.');
            }
        }

        // wasUploaded = we created a temp file that needs cleanup; pre-existing URLs should NOT be deleted
        const wasUploaded = userPhotoUrl && !userPhotoBase64.startsWith('http');

        const response = await fetch('/api/gemini/generate-tryon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userPhotoUrl
                ? { userPhotoUrl, products }
                : { userPhotoBase64, products }
            ),
        });

        if (!response.ok) {
            console.error('❌ [Generation] Generate try-on request failed:', response.status);
            if (wasUploaded) deleteImageFromStorage(userPhotoUrl!).catch(() => { });
            return null;
        }

        const data = await response.json();
        if (wasUploaded) deleteImageFromStorage(userPhotoUrl!).catch(() => { });
        const img = data.generatedImage || null;
        console.log(img ? '✅ [Generation] Try-on image generated successfully.' : '⚠️ [Generation] Try-on returned null from server.');
        return img;
    } catch (error) {
        console.error('❌ [Generation] Generate try-on error:', error);
        return null;
    }
};

export const startRunwayVideo = async (imageBase64: string): Promise<string | null> => {
    try {
        console.log('🎥 [Generation] Starting runway video generation...');
        console.log('📤 [Generation] Uploading image to storage for video...');
        const imageUrl = await tryUpload(imageBase64, 'video');

        if (imageUrl) {
            console.log('🤖 [Generation] Calling Gemini Veo video API via URL...');
        } else {
            console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for video.');
        }

        const response = await fetch('/api/gemini/start-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageUrl ? { imageUrl } : { imageBase64 }),
        });

        if (imageUrl) deleteImageFromStorage(imageUrl).catch(() => { });

        if (!response.ok) {
            console.error('❌ [Generation] Start video request failed:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('✅ [Generation] Video job started. Operation ID returned, beginning poll...');
        return data.operationJson || null;
    } catch (error) {
        console.error('❌ [Generation] Start video error:', error);
        return null;
    }
};

export const checkRunwayVideoStatus = async (
    operationJson: string
): Promise<{ status: 'running' | 'completed' | 'failed'; videoUrl?: string }> => {
    try {
        const response = await fetch('/api/gemini/check-video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationJson }),
        });

        if (!response.ok) {
            console.error('Check video status request failed:', response.status);
            return { status: 'failed' };
        }

        const data = await response.json();
        return {
            status: data.status || 'failed',
            videoUrl: data.videoUrl,
        };
    } catch (error) {
        console.error('Check video status error:', error);
        return { status: 'failed' };
    }
};

export const searchProducts = async (query: string, gender?: string): Promise<Product[]> => {
    try {
        const response = await fetch('/api/gemini/search-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, gender }),
        });

        if (!response.ok) {
            console.error('Search products request failed:', response.status);
            return [];
        }

        const data = await response.json();
        return data.products || [];
    } catch (error) {
        console.error('Search products error:', error);
        return [];
    }
};

export const chatWithStylist = async (
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    outfitContext: string,
    closetInventory: string
): Promise<{ text: string; groundingMetadata?: any }> => {
    try {
        const response = await fetch('/api/gemini/chat-stylist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history, message, outfitContext, closetInventory }),
        });

        if (!response.ok) {
            console.error('Chat stylist request failed:', response.status);
            return { text: 'Connection unstable. Please re-enter prompt.' };
        }

        const data = await response.json();
        return {
            text: data.text || '',
            groundingMetadata: data.groundingMetadata,
        };
    } catch (error) {
        console.error('Chat stylist error:', error);
        return { text: 'Connection unstable. Please re-enter prompt.' };
    }
};

export const analyzeClosetFit = async (
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    attachedItems: Product[]
): Promise<{ text: string; groundingMetadata?: any }> => {
    try {
        const response = await fetch('/api/gemini/analyze-closet-fit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history, message, attachedItems }),
        });

        if (!response.ok) {
            console.error('Analyze closet fit request failed:', response.status);
            return { text: 'I had trouble analyzing those specific pieces.' };
        }

        const data = await response.json();
        return {
            text: data.text || '',
            groundingMetadata: data.groundingMetadata,
        };
    } catch (error) {
        console.error('Analyze closet fit error:', error);
        return { text: 'I had trouble analyzing those specific pieces.' };
    }
};

export const analyzeClosetItem = async (base64Image: string): Promise<Partial<Product> | null> => {
    try {
        const imageUrl = await tryUpload(base64Image, 'closet');
        if (!imageUrl) console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for closet item analysis.');

        const response = await fetch('/api/gemini/analyze-closet-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageUrl ? { imageUrl } : { base64Image }),
        });

        if (imageUrl) deleteImageFromStorage(imageUrl).catch(() => { });

        if (!response.ok) {
            console.error('Analyze closet item request failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.item || null;
    } catch (error) {
        console.error('Analyze closet item error:', error);
        return null;
    }
};

export const analyzeInspirationImage = async (base64Image: string): Promise<InspirationAnalysis | null> => {
    try {
        const imageUrl = await tryUpload(base64Image, 'inspiration');
        if (!imageUrl) console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for inspiration analysis.');

        const response = await fetch('/api/gemini/analyze-inspiration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageUrl ? { imageUrl } : { base64Image }),
        });

        if (imageUrl) deleteImageFromStorage(imageUrl).catch(() => { });

        if (!response.ok) {
            console.error('Analyze inspiration request failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.analysis || null;
    } catch (error) {
        console.error('Analyze inspiration error:', error);
        return null;
    }
};

export const generateStealTheLook = async (
    userPhoto: string,
    inspirationPhoto: string,
    mode: 'full' | 'top' | 'bottom' = 'full'
): Promise<string | null> => {
    try {
        const [userPhotoUrl, inspirationPhotoUrl] = await Promise.all([
            tryUpload(userPhoto, 'steal-look'),
            tryUpload(inspirationPhoto, 'steal-look'),
        ]);

        if (!userPhotoUrl || !inspirationPhotoUrl) {
            console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for steal-the-look.');
        }

        const response = await fetch('/api/gemini/steal-the-look', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                (userPhotoUrl && inspirationPhotoUrl)
                    ? { userPhotoUrl, inspirationPhotoUrl, mode }
                    : { userPhotoBase64: userPhoto, inspirationPhotoBase64: inspirationPhoto, mode }
            ),
        });

        if (!response.ok) {
            console.error('Steal the look request failed:', response.status);
            if (userPhotoUrl) deleteImageFromStorage(userPhotoUrl).catch(() => { });
            if (inspirationPhotoUrl) deleteImageFromStorage(inspirationPhotoUrl).catch(() => { });
            return null;
        }

        const data = await response.json();
        if (userPhotoUrl) deleteImageFromStorage(userPhotoUrl).catch(() => { });
        if (inspirationPhotoUrl) deleteImageFromStorage(inspirationPhotoUrl).catch(() => { });
        return data.generatedImage || null;
    } catch (error) {
        console.error('Steal the look error:', error);
        return null;
    }
};

export const generate360View = async (imageBase64: string): Promise<string | null> => {
    try {
        const imageUrl = await tryUpload(imageBase64, '360-view');
        if (!imageUrl) console.warn('⚠️ [Generation] Storage unavailable — falling back to base64 for 360 view.');

        const response = await fetch('/api/gemini/generate-360-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageUrl ? { imageUrl } : { imageBase64 }),
        });

        if (imageUrl) deleteImageFromStorage(imageUrl).catch(() => { });

        if (!response.ok) {
            console.error('Generate 360 view request failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.videoUrl || null;
    } catch (error) {
        console.error('Generate 360 view error:', error);
        return null;
    }
};

export const getDiscoverQueue = async (gender?: string): Promise<Product[]> => {
    try {
        const response = await fetch('/api/gemini/discover-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gender }),
        });

        if (!response.ok) {
            console.error('Discover queue request failed:', response.status);
            return [];
        }

        const data = await response.json();
        return data.products || [];
    } catch (error) {
        console.error('Discover queue error:', error);
        return [];
    }
};
