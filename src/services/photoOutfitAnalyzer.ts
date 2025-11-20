/**
 * Photo-Based Outfit Analyzer
 * Uses Gemini Vision to analyze user's uploaded photo and extract what they're wearing
 */

import { generateContentWithRetry } from '@/lib/gemini/client';
import { OutfitItem, OutfitState, GarmentZone } from '@/types';
import { assignZoneAndZIndex, normalizeCategory } from './outfitStateManager';
import { stylistLog, stylistError } from './utils/stylistLogger';

export interface PhotoOutfitAnalysis {
  items: OutfitItem[];
  confidence: number;
  detectedZones: GarmentZone[];
}

/**
 * Analyze user's photo to extract what outfit they're wearing
 */
export async function analyzePhotoOutfit(
  userPhotoUrl: string
): Promise<PhotoOutfitAnalysis> {
  try {
    console.log('[PhotoOutfitAnalyzer] ===== STARTING OUTFIT ANALYSIS =====');
    console.log('[PhotoOutfitAnalyzer] Photo URL preview:', userPhotoUrl.substring(0, 80));
    stylistLog('PhotoOutfitAnalyzer', '===== ANALYZING USER PHOTO =====');
    stylistLog('PhotoOutfitAnalyzer', `Photo URL: ${userPhotoUrl.substring(0, 60)}...`);

    // Convert image to base64 if needed
    const imageData = await imageToBase64(userPhotoUrl);

    const prompt = `You are an AI fashion stylist. Analyze this photo of a person and identify all the clothing items they are wearing.

Task: Extract all visible clothing items from the photo and describe them in detail.

Garment Categories: Tops, Bottoms, One-Pieces, Outerwear, Footwear, Accessories

For each item detected, provide:
- Item name/type (e.g., "white t-shirt", "blue jeans", "black sneakers")
- Category (top, bottom, one_piece, outerwear, footwear, accessories)
- Color(s)
- Style descriptors (e.g., "casual", "formal", "sporty", "fitted", "loose")
- Pattern (if visible: solid, stripes, polka_dots, floral, geometric, animal_print)
- Brand (if visible/identifiable)

Output Format (JSON):
{
  "items": [
    {
      "name": "white t-shirt",
      "category": "top",
      "color": "white",
      "style": ["casual", "fitted"],
      "pattern": "solid",
      "brand": ""
    },
    {
      "name": "blue jeans",
      "category": "bottom",
      "color": "blue",
      "style": ["casual"],
      "pattern": "solid",
      "brand": ""
    }
  ],
  "confidence": 0.85,
  "notes": "Additional observations about the outfit"
}

Return ONLY valid JSON. No prose.`;

    stylistLog('PhotoOutfitAnalyzer', '===== SYSTEM PROMPT =====');
    stylistLog('PhotoOutfitAnalyzer', prompt);
    stylistLog('PhotoOutfitAnalyzer', '===== END PROMPT =====');

    const response = await generateContentWithRetry('gemini-2.0-flash-exp', {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    stylistLog('PhotoOutfitAnalyzer', '===== GEMINI RESPONSE =====');
    stylistLog('PhotoOutfitAnalyzer', text.substring(0, 500));
    stylistLog('PhotoOutfitAnalyzer', '===== END RESPONSE =====');

    const jsonStr = text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    const parsed = JSON.parse(jsonStr);

    // Transform to OutfitItem format
    const items: OutfitItem[] = (parsed.items || []).map((item: any) => {
      const category = normalizeCategory(item.category);
      return {
        name: item.name || 'Unknown item',
        category: item.category || category,
        zone: category !== 'other' ? category : 'accessories',
        colors: item.color ? [item.color] : [],
        pattern: item.pattern || 'solid',
        brand: item.brand || '',
        // These won't have product URLs since they're from the photo
        imageUrl: '', // Could potentially extract from photo if needed
        productUrl: '',
        retailer: '',
      };
    }).map(assignZoneAndZIndex);

    const detectedZones = [...new Set(items.map(item => item.zone).filter(Boolean))] as GarmentZone[];

    const result = {
      items,
      confidence: parsed.confidence || 0.5,
      detectedZones,
    };

    console.log('[PhotoOutfitAnalyzer] ===== OUTFIT ANALYSIS COMPLETE =====');
    console.log('[PhotoOutfitAnalyzer] Results:', {
      itemCount: result.items.length,
      items: result.items.map(i => i.name),
      detectedZones: result.detectedZones,
      confidence: result.confidence,
    });
    console.log('[PhotoOutfitAnalyzer] ===== END ANALYSIS =====');

    stylistLog('PhotoOutfitAnalyzer', 'Analysis result:', {
      itemCount: items.length,
      detectedZones,
      confidence: parsed.confidence || 0.5,
    });

    return result;
  } catch (error) {
    console.error('[PhotoOutfitAnalyzer] ===== OUTFIT ANALYSIS ERROR =====');
    console.error('[PhotoOutfitAnalyzer] Error:', error);
    if (error instanceof Error) {
      console.error('[PhotoOutfitAnalyzer] Error message:', error.message);
      console.error('[PhotoOutfitAnalyzer] Error stack:', error.stack);
    }
    console.error('[PhotoOutfitAnalyzer] ===== END ERROR =====');
    
    stylistError('PhotoOutfitAnalyzer', 'Error analyzing photo:', error);
    return {
      items: [],
      confidence: 0,
      detectedZones: [],
    };
  }
}

/**
 * Convert image URL to base64 for Gemini Vision API
 */
async function imageToBase64(url: string): Promise<{ mimeType: string; data: string }> {
  try {
    // Handle data URLs
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      return {
        mimeType: matches[1],
        data: matches[2],
      };
    }

    // Handle HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return {
        mimeType: contentType,
        data: base64,
      };
    }

    throw new Error(`Unsupported URL format: ${url}`);
  } catch (error) {
    stylistError('PhotoOutfitAnalyzer', `Error converting image to base64: ${url.substring(0, 50)}...`, error);
    throw error;
  }
}

