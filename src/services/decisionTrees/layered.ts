import type { DecisionResult, OutfitItem, RequestClassification, ClarificationOption, ClarificationContext } from '@/types';
import { determineZone, getInnermostLayer, getOutermostLayer } from '../outfitStateManager';
import { analyzeOutfitState } from '../outfitStateManager';
import { stylistLog } from '../utils/stylistLogger';

/**
 * Decision tree for Layered outfit state (Multiple layers)
 */

/**
 * Scenario 3.1: Multiple top layers - user requests another top item
 * Current: T-shirt + Flannel + Denim Jacket
 * Request: "A leather jacket"
 * Decision: Clarify which layer to replace or add new layer
 */
export async function handleMultipleTopLayersRequest(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): Promise<DecisionResult> {
  stylistLog('LayeredMultipleTopRequest', { newItems: newItems.map((item) => item.name) });
  const state = await analyzeOutfitState(currentOutfit);
  const topLayers = [...state.zones.top, ...state.zones.outerwear];
  
  // If explicit layering keyword, add as new layer
  if (classification.layeringKeywords.length > 0) {
    return {
      action: 'execute',
      reasoning: 'Add as new outermost layer',
      itemsToAdd: newItems,
      shouldRegenerateFromScratch: false
    };
  }
  
  // Otherwise, ask which layer to replace
  const options: ClarificationOption[] = topLayers.map((layer, index) => {
    const position = index === 0 ? 'inner' : index === topLayers.length - 1 ? 'outer' : 'middle';
    return {
      id: `layer_${index}`,
      label: layer.name,
      description: `Replace ${position} layer`,
      value: layer.name
    };
  });
  
  // Add option to add as new layer
  options.push({
    id: 'add_layer',
    label: 'Add as new layer',
    description: 'Keep all current layers and add this on top',
    value: 'add_layer'
  });
  
  const context: Partial<ClarificationContext> = {
    type: 'ambiguous',
    question: 'Should I replace a layer or add this as a new layer?',
    options,
    pendingItems: classification.extractedEntities.garments,
    currentOutfit: currentOutfit,
    originalMessage: classification.intent
  };
  
  return {
    action: 'clarify',
    reasoning: 'Multiple layers present, need to know which to replace or whether to add',
    clarificationQuestion: {
      question: context.question!,
      options,
      context: context as ClarificationContext
    },
    itemsToAdd: newItems,
    shouldRegenerateFromScratch: true
  };
}

/**
 * Scenario 3.2: Replacing inner layer
 * Current: T-shirt + Cardigan
 * Request: "A tank top"
 * Decision: Replace innermost layer (t-shirt)
 */
export async function handleInnerLayerReplacement(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): Promise<DecisionResult> {
  stylistLog('LayeredInnerReplacement', { newItems: newItems.map((item) => item.name) });
  const state = await analyzeOutfitState(currentOutfit);
  
  // Determine if new item is a base layer (tank, tee, etc.)
  const newItemName = newItems[0].name.toLowerCase();
  const isBaseLayer = ['tank', 'tee', 't-shirt', 'cami', 'undershirt'].some(k => newItemName.includes(k));
  
  if (isBaseLayer) {
    // Replace innermost layer
    const innermost = getInnermostLayer(state, 'top');
    
    return {
      action: 'execute',
      reasoning: 'Replace innermost base layer',
      itemsToAdd: newItems,
      itemsToRemove: innermost ? [innermost] : [],
      shouldRegenerateFromScratch: true
    };
  } else {
    // Ambiguous - ask which layer
    const topLayers = [...state.zones.top, ...state.zones.outerwear];
    const options: ClarificationOption[] = topLayers.map((layer, index) => ({
      id: `layer_${index}`,
      label: layer.name,
      description: `Replace this layer`,
      value: layer.name
    }));
    
    const context: Partial<ClarificationContext> = {
      type: 'ambiguous',
      question: 'Which layer would you like to replace?',
      options,
      pendingItems: classification.extractedEntities.garments,
      currentOutfit: currentOutfit,
      originalMessage: classification.intent
    };
    
    return {
      action: 'clarify',
      reasoning: 'Need to know which layer to replace',
      clarificationQuestion: {
        question: context.question!,
        options,
        context: context as ClarificationContext
      },
      itemsToAdd: newItems,
      shouldRegenerateFromScratch: true
    };
  }
}

/**
 * Scenario 3.3: Ambiguous layer reference
 * Current: Shirt + Sweater + Blazer
 * Request: "Change the top"
 * Decision: Ask which layer they mean
 */
export async function handleAmbiguousLayerReference(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): Promise<DecisionResult> {
  stylistLog('LayeredAmbiguousReference', { message: classification.intent });
  const state = await analyzeOutfitState(currentOutfit);
  const topLayers = [...state.zones.top, ...state.zones.outerwear];
  
  const options: ClarificationOption[] = topLayers.map((layer, index) => {
    const position = index === 0 ? '(inner)' : index === topLayers.length - 1 ? '(outer)' : '(middle)';
    return {
      id: `layer_${index}`,
      label: `${layer.name} ${position}`,
      description: `Replace this layer`,
      value: layer.name
    };
  });
  
  const context: Partial<ClarificationContext> = {
    type: 'ambiguous',
    question: 'Which layer would you like to change?',
    options,
    pendingItems: classification.extractedEntities.garments,
    currentOutfit: currentOutfit,
    originalMessage: classification.intent
  };
  
  return {
    action: 'clarify',
    reasoning: 'Ambiguous reference with multiple top layers',
    clarificationQuestion: {
      question: context.question!,
      options,
      context: context as ClarificationContext
    },
    itemsToAdd: newItems,
    shouldRegenerateFromScratch: true
  };
}

/**
 * Main handler for layered state
 */
export async function handleLayeredScenario(
  classification: RequestClassification,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): Promise<DecisionResult> {
  stylistLog('LayeredScenario', { newItemCount: newItems.length, layeringKeywords: classification.layeringKeywords });
  if (newItems.length === 0) {
    return {
      action: 'clarify',
      reasoning: 'No items found for request',
      shouldRegenerateFromScratch: false
    };
  }
  
  const state = await analyzeOutfitState(currentOutfit);
  const newItemZone = newItems[0].zone || determineZone(newItems[0].category || '');
  
  // If it's not a top/outerwear item, handle normally
  if (newItemZone !== 'top' && newItemZone !== 'outerwear') {
    const currentInZone = currentOutfit.filter(item => {
      const zone = item.zone || determineZone(item.category || '');
      return zone === newItemZone;
    });
    
    return {
      action: 'execute',
      reasoning: `Replace ${newItemZone}`,
      itemsToAdd: newItems,
      itemsToRemove: currentInZone,
      shouldRegenerateFromScratch: currentInZone.length > 0
    };
  }
  
  // Check for layering keywords
  if (classification.layeringKeywords.length > 0) {
    return {
      action: 'execute',
      reasoning: 'Add as new layer (layering keywords detected)',
      itemsToAdd: newItems,
      shouldRegenerateFromScratch: false
    };
  }
  
  // Check if request has ambiguous reference
  if (classification.type === 'type_c_attribute_modification') {
    return await handleAmbiguousLayerReference(classification, currentOutfit, newItems);
  }
  
  // Count layers in top zone
  const topLayerCount = state.zones.top.length + state.zones.outerwear.length;
  
  if (topLayerCount >= 3) {
    // Scenario 3.1: Multiple layers
    return await handleMultipleTopLayersRequest(classification, currentOutfit, newItems);
  } else if (topLayerCount === 2) {
    // Scenario 3.2: Two layers, check if it's a base layer replacement
    return await handleInnerLayerReplacement(classification, currentOutfit, newItems);
  } else {
    // Only one top layer + outerwear, replace outermost
    const outermost = getOutermostLayer(state, 'outerwear') || getOutermostLayer(state, 'top');
    
    return {
      action: 'execute',
      reasoning: 'Replace outermost layer',
      itemsToAdd: newItems,
      itemsToRemove: outermost ? [outermost] : [],
      shouldRegenerateFromScratch: true
    };
  }
}

