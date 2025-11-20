import type { DecisionResult, OutfitItem, RequestClassification, GarmentZone, ClarificationQuestion, ClarificationOption } from '@/types';
import { determineZone } from '../outfitStateManager';
import { stylistLog } from '../utils/stylistLogger';

/**
 * Decision tree for Separates outfit state (Top + Bottom)
 */

/**
 * Scenario 1.1: User requests top item while wearing separates
 * Current: T-shirt + Jeans
 * Request: "A blouse"
 * Decision: Replace top if no layering keywords, otherwise layer
 */
export function handleTopRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('SeparatesTopRequest', '===== HANDLING TOP REQUEST =====');
  stylistLog('SeparatesTopRequest', { newItems: newItems.map((item) => item.name), layering: classification.layeringKeywords });
  const hasLayeringKeywords = classification.layeringKeywords.length > 0;
  
  if (hasLayeringKeywords) {
    stylistLog('SeparatesTopRequest', '→ Decision: LAYER (layering keywords detected)');
    // Add as layer over existing top
    return {
      action: 'execute',
      reasoning: 'User wants to layer over existing top',
      itemsToAdd: newItems,
      shouldRegenerateFromScratch: false
    };
  } else {
    stylistLog('SeparatesTopRequest', '→ Decision: REPLACE (no layering keywords)');
    // Replace existing top - find all top items by zone first
    let currentTops = currentOutfit.filter(item => {
      const zone = item.zone || determineZone(item.category || '');
      return zone === 'top';
    });
    
    // If no top items found by zone, try to find by category name
    if (currentTops.length === 0) {
      const topsByCategory = currentOutfit.filter(item => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes('top') || cat.includes('shirt') || cat.includes('blouse') || 
               cat.includes('tee') || cat.includes('t-shirt') || cat.includes('sweater') ||
               cat.includes('tank') || cat.includes('cami') || cat.includes('blazer');
      });
      currentTops = topsByCategory;
      if (topsByCategory.length > 0) {
        stylistLog('SeparatesTopRequest', { foundByCategory: topsByCategory.map(i => i.name) });
      }
    }
    
    stylistLog('SeparatesTopRequest', { 
      currentTops: currentTops.map(i => i.name), 
      replacingWith: newItems[0].name,
      count: currentTops.length 
    });
    return {
      action: 'execute',
      reasoning: 'Replace existing top with new top item',
      itemsToAdd: newItems,
      itemsToRemove: currentTops,
      shouldRegenerateFromScratch: true
    };
  }
}

/**
 * Scenario 1.2: User requests bottom item while wearing separates
 * Current: Sweater + Jeans
 * Request: "A pleated skirt"
 * Decision: Replace bottom
 */
export function handleBottomRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('SeparatesBottomRequest', '===== HANDLING BOTTOM REQUEST =====');
  stylistLog('SeparatesBottomRequest', { newItems: newItems.map((item) => item.name) });
  
  // Find all bottom items by zone first
  let currentBottoms = currentOutfit.filter(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'bottom';
  });
  
  // If no bottom items found by zone, try to find by category name
  if (currentBottoms.length === 0) {
    const bottomsByCategory = currentOutfit.filter(item => {
      const cat = (item.category || '').toLowerCase();
      return cat.includes('pant') || cat.includes('jean') || cat.includes('skirt') || 
             cat.includes('short') || cat.includes('bottom') || cat.includes('trouser') ||
             cat.includes('legging') || cat.includes('capri');
    });
    currentBottoms = bottomsByCategory;
    if (bottomsByCategory.length > 0) {
      stylistLog('SeparatesBottomRequest', { foundByCategory: bottomsByCategory.map(i => i.name) });
    }
  }
  
  stylistLog('SeparatesBottomRequest', { 
    currentBottoms: currentBottoms.map(i => i.name), 
    replacingWith: newItems[0].name,
    count: currentBottoms.length 
  });
  
  return {
    action: 'execute',
    reasoning: 'Replace existing bottom with new bottom item',
    itemsToAdd: newItems,
    itemsToRemove: currentBottoms,
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 1.3: User requests one-piece while wearing separates
 * Current: Blouse + Pants
 * Request: "A maxi dress"
 * Decision: Remove both top and bottom, add one-piece
 */
export function handleOnePieceRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('SeparatesOnePieceRequest', { replacing: currentOutfit.length, newItem: newItems.map((item) => item.name) });
  
  // Filter for top and bottom items - CRITICAL: Always include bottom items
  const topItems = currentOutfit.filter(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'top';
  });
  
  const bottomItems = currentOutfit.filter(item => {
    const zone = item.zone || determineZone(item.category || '');
    return zone === 'bottom';
  });
  
  // If no bottom items detected by zone, try to find by category name
  let allBottomItems = [...bottomItems];
  if (bottomItems.length === 0) {
    const bottomByCategory = currentOutfit.filter(item => {
      const cat = (item.category || '').toLowerCase();
      return cat.includes('pant') || cat.includes('jean') || cat.includes('skirt') || 
             cat.includes('short') || cat.includes('bottom') || cat.includes('trouser');
    });
    allBottomItems = bottomByCategory;
    if (bottomByCategory.length > 0) {
      stylistLog('SeparatesOnePieceRequest', { foundByCategory: bottomByCategory.map(i => i.name) });
    }
  }
  
  const topAndBottom = [...topItems, ...allBottomItems];
  
  // Log what we're removing
  stylistLog('SeparatesOnePieceRequest', {
    topItems: topItems.map(i => i.name),
    bottomItems: allBottomItems.map(i => i.name),
    totalToRemove: topAndBottom.length
  });
  
  // Always confirm this major change
  const question = "This will replace both your top and bottom with the dress. Ready?";
  const options: ClarificationOption[] = [
    {
      id: 'confirm',
      label: 'Yes, make the change',
      value: true
    },
    {
      id: 'cancel',
      label: 'No, keep my current outfit',
      value: false
    }
  ];
  
  return {
    action: 'suggest',
    reasoning: `One-piece replaces both top and bottom. Removing: ${topItems.map(i => i.name).join(', ')} and ${allBottomItems.map(i => i.name).join(', ')}`,
    itemsToAdd: newItems,
    itemsToRemove: topAndBottom,
    suggestions: [{
      type: 'style',
      title: 'Switch to One-Piece',
      description: `Replace your ${topAndBottom.map(i => i.name).join(' and ')} with ${newItems[0].name}`,
      items: newItems,
      requiresApproval: true
    }],
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 1.4: User requests outerwear while wearing separates
 * Current: T-shirt + Jeans
 * Request: "A leather jacket"
 * Decision: Default to layering for outerwear
 */
export function handleOuterwearRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('SeparatesOuterwearRequest', { intent: classification.intent });
  // Check if user explicitly wants to replace
  const hasReplaceKeyword = /replace|swap|change/i.test(classification.intent);
  
  if (hasReplaceKeyword) {
    // User wants to replace, not layer
    const currentOuterwear = currentOutfit.filter(item => {
      const zone = item.zone || determineZone(item.category || '');
      return zone === 'outerwear';
    });
    
    return {
      action: 'execute',
      reasoning: 'Replace existing outerwear as requested',
      itemsToAdd: newItems,
      itemsToRemove: currentOuterwear,
      shouldRegenerateFromScratch: true
    };
  } else {
    // Default to layering for outerwear
    return {
      action: 'execute',
      reasoning: 'Add outerwear as layer over existing outfit',
      itemsToAdd: newItems,
      shouldRegenerateFromScratch: false
    };
  }
}

/**
 * Main handler for separates state
 */
export function handleSeparatesScenario(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('SeparatesScenario', '===== DECISION TREE: SEPARATES =====');
  stylistLog('SeparatesScenario', { newItemCount: newItems.length, outfitItems: currentOutfit.length, newItems: newItems.map(i => i.name) });
  if (newItems.length === 0) {
    stylistLog('SeparatesScenario', '→ No items found, returning clarify');
    return {
      action: 'clarify',
      reasoning: 'No items found for request',
      shouldRegenerateFromScratch: false
    };
  }
  
  // Determine zone of new item
  const newItemZone = newItems[0].zone || determineZone(newItems[0].category || '');
  stylistLog('SeparatesScenario', `→ New item zone: ${newItemZone} (item: ${newItems[0].name})`);
  
  switch (newItemZone) {
    case 'top':
      stylistLog('SeparatesScenario', '→ Branch: TOP request');
      return handleTopRequest(classification, currentOutfit, newItems);
    
    case 'bottom':
      stylistLog('SeparatesScenario', '→ Branch: BOTTOM request');
      return handleBottomRequest(classification, currentOutfit, newItems);
    
    case 'one_piece':
      stylistLog('SeparatesScenario', '→ Branch: ONE_PIECE request');
      return handleOnePieceRequest(classification, currentOutfit, newItems);
    
    case 'outerwear':
      stylistLog('SeparatesScenario', '→ Branch: OUTERWEAR request');
      return handleOuterwearRequest(classification, currentOutfit, newItems);
    
    case 'footwear':
    case 'accessories':
      stylistLog('SeparatesScenario', `→ Branch: ${newItemZone.toUpperCase()} request`);
      // For footwear and accessories, simply add or replace
      const currentInZone = currentOutfit.filter(item => {
        const zone = item.zone || determineZone(item.category || '');
        return zone === newItemZone;
      });
      
      stylistLog('SeparatesScenario', `→ Decision: ${currentInZone.length > 0 ? 'REPLACE' : 'ADD'} ${newItemZone}`);
      return {
        action: 'execute',
        reasoning: `Add or replace ${newItemZone}`,
        itemsToAdd: newItems,
        itemsToRemove: currentInZone,
        shouldRegenerateFromScratch: currentInZone.length > 0
      };
    
    default:
      stylistLog('SeparatesScenario', '→ Branch: DEFAULT (unknown zone)');
      return {
        action: 'execute',
        reasoning: 'Add new item to outfit',
        itemsToAdd: newItems,
        shouldRegenerateFromScratch: false
      };
  }
}

