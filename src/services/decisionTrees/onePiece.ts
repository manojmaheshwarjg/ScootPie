import type { DecisionResult, OutfitItem, RequestClassification, ClarificationOption, ClarificationContext } from '@/types';
import { determineZone } from '../outfitStateManager';
import { stylistLog } from '../utils/stylistLogger';

/**
 * Decision tree for One-Piece outfit state (Dress/Jumpsuit)
 */

/**
 * Scenario 2.1: User requests top only while wearing one-piece
 * Current: Sundress
 * Request: "A crop top"
 * Decision: Restore original bottom from photo if available, otherwise ask
 */
export function handleTopOnlyRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[],
  originalPhotoOutfit?: OutfitItem[] // Original items from photo analysis
): DecisionResult {
  stylistLog('OnePieceTopRequest', { 
    newItems: newItems.map((item) => item.name),
    hasOriginalOutfit: !!originalPhotoOutfit,
    originalItemCount: originalPhotoOutfit?.length || 0
  });
  
  const currentOnePiece = currentOutfit.find(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'one_piece';
  });
  
  // Check if we have original bottom from photo analysis
  let originalBottom: OutfitItem | null = null;
  if (originalPhotoOutfit && originalPhotoOutfit.length > 0) {
    originalBottom = originalPhotoOutfit.find(item => {
      const zone = item.zone || determineZone(item.category || '');
      return zone === 'bottom';
    }) || null;
    
    // If not found by zone, try by category name
    if (!originalBottom) {
      originalBottom = originalPhotoOutfit.find(item => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes('pant') || cat.includes('jean') || cat.includes('skirt') || 
               cat.includes('short') || cat.includes('bottom') || cat.includes('trouser');
      }) || null;
    }
    
    if (originalBottom) {
      stylistLog('OnePieceTopRequest', `Found original bottom from photo: ${originalBottom.name}`);
    }
  }
  
  // If we have original bottom, automatically restore it
  if (originalBottom) {
    stylistLog('OnePieceTopRequest', 'Auto-restoring original bottom from photo');
    return {
      action: 'execute',
      reasoning: `Replacing one-piece with ${newItems[0].name} and restoring original bottom (${originalBottom.name}) from photo`,
      itemsToAdd: [...newItems, originalBottom], // Add both new top and original bottom
      itemsToRemove: currentOnePiece ? [currentOnePiece] : [],
      shouldRegenerateFromScratch: true
    };
  }
  
  // No original bottom found - ask for bottom preference
  const options: ClarificationOption[] = [
    {
      id: 'jeans',
      label: 'High-waisted jeans',
      description: 'Casual and versatile',
      value: 'high-waisted jeans'
    },
    {
      id: 'skirt',
      label: 'Mini skirt',
      description: 'Flirty and fun',
      value: 'mini skirt'
    },
    {
      id: 'shorts',
      label: 'Shorts',
      description: 'Comfortable and casual',
      value: 'shorts'
    },
    {
      id: 'choose',
      label: 'You choose',
      description: 'Let the AI pick',
      value: 'ai_choose'
    }
  ];
  
  const context: Partial<ClarificationContext> = {
    type: 'missing_info',
    question: `I'll swap your ${currentOnePiece?.name || 'dress'} for ${newItems[0].name}! What would you like for the bottom?`,
    options,
    pendingItems: classification.extractedEntities.garments,
    originalMessage: classification.intent
  };
  
  return {
    action: 'clarify',
    reasoning: 'One-piece to top requires bottom selection (no original bottom found in photo)',
    clarificationQuestion: {
      question: context.question!,
      options,
      context: context as ClarificationContext
    },
    itemsToAdd: newItems,
    itemsToRemove: currentOnePiece ? [currentOnePiece] : [],
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 2.2: User requests bottom only while wearing one-piece
 * Current: Maxi Dress
 * Request: "Leather pants"
 * Decision: Ask what they want for the top
 */
export function handleBottomOnlyRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('OnePieceBottomRequest', { newItems: newItems.map((item) => item.name) });
  const currentOnePiece = currentOutfit.find(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'one_piece';
  });
  
  // Need to ask for top preference
  const options: ClarificationOption[] = [
    {
      id: 'tshirt',
      label: 'T-shirt',
      description: 'Casual and comfortable',
      value: 't-shirt'
    },
    {
      id: 'blouse',
      label: 'Blouse',
      description: 'Dressy and elegant',
      value: 'blouse'
    },
    {
      id: 'crop',
      label: 'Crop top',
      description: 'Trendy and fun',
      value: 'crop top'
    },
    {
      id: 'choose',
      label: 'You choose',
      description: 'Let the AI pick',
      value: 'ai_choose'
    }
  ];
  
  const context: Partial<ClarificationContext> = {
    type: 'missing_info',
    question: `I'll add ${newItems[0].name}! What would you like for the top?`,
    options,
    pendingItems: classification.extractedEntities.garments,
    originalMessage: classification.intent
  };
  
  return {
    action: 'clarify',
    reasoning: 'One-piece to bottom requires top selection',
    clarificationQuestion: {
      question: context.question!,
      options,
      context: context as ClarificationContext
    },
    itemsToAdd: newItems,
    itemsToRemove: currentOnePiece ? [currentOnePiece] : [],
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 2.3: User requests another one-piece
 * Current: Cocktail Dress
 * Request: "A jumpsuit"
 * Decision: Direct replacement, no clarification needed
 */
export function handleAnotherOnePieceRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('OnePieceSwapRequest', { newItems: newItems.map((item) => item.name) });
  const currentOnePiece = currentOutfit.find(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'one_piece';
  });
  
  return {
    action: 'execute',
    reasoning: 'Replace one-piece with another one-piece',
    itemsToAdd: newItems,
    itemsToRemove: currentOnePiece ? [currentOnePiece] : [],
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 2.4: User requests separates combo (both top and bottom)
 * Current: Dress
 * Request: "White tee and black jeans"
 * Decision: Direct replacement, both items specified
 */
export function handleSeparatesComboRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('OnePieceToSeparates', { newItems: newItems.map((item) => item.name) });
  const currentOnePiece = currentOutfit.find(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'one_piece';
  });
  
  return {
    action: 'execute',
    reasoning: 'Replace one-piece with separates combo (both top and bottom specified)',
    itemsToAdd: newItems,
    itemsToRemove: currentOnePiece ? [currentOnePiece] : [],
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 2.5: User requests outerwear over one-piece
 * Current: Slip Dress
 * Request: "Add a denim jacket"
 * Decision: Layer over dress
 */
export function handleOuterwearOverOnePieceRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('OnePieceOuterwearRequest', { newItems: newItems.map((item) => item.name) });
  return {
    action: 'execute',
    reasoning: 'Add outerwear layer over one-piece',
    itemsToAdd: newItems,
    shouldRegenerateFromScratch: false
  };
}

/**
 * Main handler for one-piece state
 */
export function handleOnePieceScenario(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[],
  originalPhotoOutfit?: OutfitItem[] // Original items from photo analysis
): DecisionResult {
  stylistLog('OnePieceScenario', { 
    newItemCount: newItems.length,
    hasOriginalOutfit: !!originalPhotoOutfit
  });
  if (newItems.length === 0) {
    return {
      action: 'clarify',
      reasoning: 'No items found for request',
      shouldRegenerateFromScratch: false
    };
  }
  
  // Check if it's a layering request (like outerwear)
  if (classification.type === 'type_e_layering' || classification.layeringKeywords.length > 0) {
    return handleOuterwearOverOnePieceRequest(classification, currentOutfit, newItems);
  }
  
  // Determine zones of new items
  const zones = newItems.map(item => item.zone || determineZone(item.category || ''));
  const hasTop = zones.includes('top');
  const hasBottom = zones.includes('bottom');
  const hasOnePiece = zones.includes('one_piece');
  const hasOuterwear = zones.includes('outerwear');
  
  // Scenario 2.3: Another one-piece
  if (hasOnePiece) {
    return handleAnotherOnePieceRequest(classification, currentOutfit, newItems);
  }
  
  // Scenario 2.4: Both top and bottom specified
  if (hasTop && hasBottom) {
    return handleSeparatesComboRequest(classification, currentOutfit, newItems);
  }
  
  // Scenario 2.5: Outerwear
  if (hasOuterwear) {
    return handleOuterwearOverOnePieceRequest(classification, currentOutfit, newItems);
  }
  
  // Scenario 2.1: Top only - pass original photo outfit to restore bottom
  if (hasTop) {
    return handleTopOnlyRequest(classification, currentOutfit, newItems, originalPhotoOutfit);
  }
  
  // Scenario 2.2: Bottom only
  if (hasBottom) {
    return handleBottomOnlyRequest(classification, currentOutfit, newItems);
  }
  
  // Default: add as accessory or footwear
  return {
    action: 'execute',
    reasoning: 'Add item to one-piece outfit',
    itemsToAdd: newItems,
    shouldRegenerateFromScratch: false
  };
}

