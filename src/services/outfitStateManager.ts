import { generateContentWithRetry } from '@/lib/gemini/client';
import { outfitAnalyzerPrompt, parseOutfitState } from '@/lib/prompts/outfitAnalyzer';
import { OutfitItem, OutfitState, GarmentZone, OutfitStateType } from '@/types';
import { stylistLog } from './utils/stylistLogger';

export function normalizeCategory(category?: string): GarmentZone | 'other' {
  if (!category) return 'other';
  const cat = category.toLowerCase();

  if (['top', 't-shirt', 'tshirt', 'tee', 'blouse', 'shirt', 'tank top', 'crop top', 'sweater', 'hoodie', 'bodysuit'].some(k => cat.includes(k))) return 'top';
  if (['jeans', 'pants', 'trousers', 'shorts', 'skirt', 'leggings'].some(k => cat.includes(k))) return 'bottom';
  if (['dress', 'jumpsuit', 'romper'].some(k => cat.includes(k))) return 'one_piece';
  if (['jacket', 'blazer', 'coat', 'cardigan', 'vest'].some(k => cat.includes(k))) return 'outerwear';
  if (['shoes', 'boots', 'sneakers', 'heels', 'sandals', 'flats'].some(k => cat.includes(k))) return 'footwear';
  if (['bag', 'jewelry', 'hat', 'scarf', 'belt', 'sunglasses'].some(k => cat.includes(k))) return 'accessories';

  return 'other';
}

export function assignZoneAndZIndex(item: OutfitItem): OutfitItem {
  const normalizedCat = normalizeCategory(item.category);
  let zone: GarmentZone = 'accessories';
  let zIndex: number = 100;

  switch (normalizedCat) {
    case 'top':
      zone = 'top';
      zIndex = 300;
      break;
    case 'bottom':
      zone = 'bottom';
      zIndex = 200;
      break;
    case 'one_piece':
      zone = 'one_piece';
      zIndex = 250;
      break;
    case 'outerwear':
      zone = 'outerwear';
      zIndex = 400;
      break;
    case 'footwear':
      zone = 'footwear';
      zIndex = 150;
      break;
    case 'accessories':
      zone = 'accessories';
      zIndex = 100;
      break;
    default:
      zone = 'accessories';
      zIndex = 100;
  }
  return { ...item, zone, zIndex };
}

export async function analyzeOutfitState(currentOutfitItems: OutfitItem[]): Promise<OutfitState> {
  try {
    const itemsWithZones = currentOutfitItems.map(assignZoneAndZIndex);
    const prompt = outfitAnalyzerPrompt(itemsWithZones);
    stylistLog('OutfitStateManager', '===== SYSTEM PROMPT =====');
    stylistLog('OutfitStateManager', prompt.substring(0, 1000)); // First 1000 chars
    stylistLog('OutfitStateManager', '===== END PROMPT =====');
    
    const response = await generateContentWithRetry('gemini-2.0-flash-exp', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    stylistLog('OutfitStateManager', '===== GEMINI RESPONSE =====');
    stylistLog('OutfitStateManager', text.substring(0, 500)); // First 500 chars
    stylistLog('OutfitStateManager', '===== END RESPONSE =====');
    
    const jsonStr = text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    const outfitState = parseOutfitState(jsonStr);

    if (!outfitState) {
      console.warn("Outfit State Manager: Failed to parse outfit state, returning default.", jsonStr);
      return { type: 'empty', items: itemsWithZones, zones: {}, layerCount: itemsWithZones.length, isComplete: false, missingZones: ['top', 'bottom', 'footwear'] };
    }

    outfitState.items = outfitState.items.map(assignZoneAndZIndex);
    for (const zoneKey in outfitState.zones) {
      outfitState.zones[zoneKey as GarmentZone] = outfitState.zones[zoneKey as GarmentZone].map(assignZoneAndZIndex);
    }

    stylistLog('OutfitStateManager', 'Analyzed outfit state:', { type: outfitState.type, itemCount: outfitState.items.length, isComplete: outfitState.isComplete });
    return outfitState;
  } catch (error) {
    console.error("Outfit State Manager: Error analyzing outfit state:", error);
    return { type: 'empty', items: currentOutfitItems.map(assignZoneAndZIndex), zones: {}, layerCount: currentOutfitItems.length, isComplete: false, missingZones: ['top', 'bottom', 'footwear'] };
  }
}

export function getOutfitStateType(items: OutfitItem[]): OutfitStateType {
  const zones: Record<GarmentZone, OutfitItem[]> = {
    top: [], bottom: [], one_piece: [], outerwear: [], footwear: [], accessories: []
  };

  items.forEach(item => {
    const zone = normalizeCategory(item.category);
    if (zone !== 'other') {
      zones[zone].push(item);
    }
  });

  const hasTop = zones.top.length > 0 || zones.one_piece.length > 0;
  const hasBottom = zones.bottom.length > 0 || zones.one_piece.length > 0;

  if (items.length === 0) return 'empty';
  if (zones.one_piece.length > 0 && items.length === zones.one_piece.length) return 'one_piece';
  if (hasTop && hasBottom) {
    if (zones.top.length > 1 || zones.bottom.length > 1 || zones.outerwear.length > 0 || zones.accessories.length > 0) return 'layered';
    return 'separates';
  }
  return 'empty';
}

/**
 * Alias for normalizeCategory - determines zone from category
 */
export function determineZone(category?: string): GarmentZone | 'other' {
  return normalizeCategory(category);
}

/**
 * Get the innermost layer for a given zone (lowest zIndex)
 */
export function getInnermostLayer(state: OutfitState, zone: 'top' | 'outerwear'): OutfitItem | null {
  const items = [...(state.zones[zone] || []), ...(zone === 'top' ? state.zones.outerwear || [] : [])];
  if (items.length === 0) return null;
  
  // Sort by zIndex ascending (lowest = innermost)
  const sorted = items.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  return sorted[0] || null;
}

/**
 * Get the outermost layer for a given zone (highest zIndex)
 */
export function getOutermostLayer(state: OutfitState, zone: 'top' | 'outerwear'): OutfitItem | null {
  const items = [...(state.zones[zone] || []), ...(zone === 'top' ? state.zones.outerwear || [] : [])];
  if (items.length === 0) return null;
  
  // Sort by zIndex descending (highest = outermost)
  const sorted = items.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  return sorted[0] || null;
}
