import type { DecisionResult, OutfitItem, RequestClassification, OutfitState } from '@/types';
import { handleSeparatesScenario } from './decisionTrees/separates';
import { handleOnePieceScenario } from './decisionTrees/onePiece';
import { handleLayeredScenario } from './decisionTrees/layered';
import { stylistLog } from './utils/stylistLogger';

/**
 * Main Decision Engine
 * Routes to appropriate decision tree based on outfit state
 */

/**
 * Make decision based on classification and current outfit state
 */
export async function makeDecision(
  classification: RequestClassification,
  currentState: OutfitState,
  newItems: OutfitItem[],
  originalPhotoOutfit?: OutfitItem[] // Original items from photo analysis
): Promise<DecisionResult> {
  stylistLog('DecisionEngineStart', {
    classification: classification.type,
    outfitState: currentState.type,
    newItemCount: newItems.length
  });
  // Handle Type D: Style/Mood - always suggest transformation
  if (classification.type === 'type_d_style_mood') {
    stylistLog('DecisionEngineStyleMood', { intent: classification.intent });
    return {
      action: 'suggest',
      reasoning: 'Style transformation requires suggestion and approval',
      suggestions: [{
        type: 'style',
        title: 'Style Transformation',
        description: classification.intent,
        items: newItems,
        requiresApproval: true
      }],
      shouldRegenerateFromScratch: true
    };
  }
  
  // Handle Type F: Removal
  if (classification.type === 'type_f_removal') {
    stylistLog('DecisionEngineRoute', 'Removal request detected');
    return handleRemovalRequest(classification, currentState);
  }
  
  // Handle Type C: Attribute Modification
  if (classification.type === 'type_c_attribute_modification') {
    stylistLog('DecisionEngineRoute', 'Attribute modification detected');
    return handleAttributeModification(classification, currentState, newItems);
  }
  
  // Route to appropriate decision tree based on outfit state
  stylistLog('DecisionEngineRoute', `Routing to decision tree: ${currentState.type}`);
  switch (currentState.type) {
    case 'empty':
      stylistLog('DecisionEngineRoute', '→ Calling handleEmptyState');
      return handleEmptyState(classification, newItems);
    
    case 'separates':
      stylistLog('DecisionEngineRoute', '→ Calling handleSeparatesScenario');
      return handleSeparatesScenario(classification, currentState.items, newItems);
    
    case 'one_piece':
      stylistLog('DecisionEngineRoute', '→ Calling handleOnePieceScenario');
      return handleOnePieceScenario(classification, currentState.items, newItems, originalPhotoOutfit);
    
    case 'layered':
      stylistLog('DecisionEngineRoute', '→ Calling handleLayeredScenario');
      return await handleLayeredScenario(classification, currentState.items, newItems);
    
    default:
      stylistLog('DecisionEngineRoute', '→ Using default handler');
      return {
        action: 'execute',
        reasoning: 'Add items to outfit',
        itemsToAdd: newItems,
        shouldRegenerateFromScratch: false
      };
  }
}

/**
 * Handle empty outfit state (first items)
 */
function handleEmptyState(
  classification: RequestClassification,
  newItems: OutfitItem[]
): DecisionResult {
  stylistLog('DecisionEngineEmptyState', { newItems: newItems.map((item) => item.name) });
  return {
    action: 'execute',
    reasoning: 'Starting new outfit with first items',
    itemsToAdd: newItems,
    shouldRegenerateFromScratch: false
  };
}

/**
 * Handle removal request
 */
function handleRemovalRequest(
  classification: RequestClassification,
  currentState: OutfitState
): DecisionResult {
  const removalKeywords = classification.removalKeywords;
  stylistLog('DecisionEngineRemoval', { keywords: removalKeywords, currentItems: currentState.items.length });
  
  // Try to identify which item to remove
  const message = classification.intent.toLowerCase();
  
  // Find items that match removal keywords or are mentioned
  const itemsToRemove: OutfitItem[] = [];
  
  for (const item of currentState.items) {
    const itemName = item.name.toLowerCase();
    const itemCategory = (item.category || '').toLowerCase();
    
    // Check if item is mentioned in message
    if (message.includes(itemName) || message.includes(itemCategory)) {
      itemsToRemove.push(item);
    }
  }
  
  // If no specific items identified but removal keywords present
  if (itemsToRemove.length === 0 && removalKeywords.length > 0) {
    stylistLog('DecisionEngineRemovalClarify', 'Unable to determine which item to remove');
    return {
      action: 'clarify',
      reasoning: 'Need to identify which item to remove',
      clarificationQuestion: {
        question: 'Which item would you like to remove?',
        options: currentState.items.map((item, idx) => ({
          id: `remove_${idx}`,
          label: item.name,
          description: item.category || '',
          value: item.name
        })),
        context: {
          type: 'ambiguous',
          question: 'Which item would you like to remove?',
          currentOutfit: currentState.items,
          originalMessage: classification.intent,
          conversationId: '',
          timestamp: new Date()
        }
      },
      shouldRegenerateFromScratch: true
    };
  }
  
  // Check if removing would make outfit incomplete
  const remainingItems = currentState.items.filter(item => !itemsToRemove.includes(item));
  if (remainingItems.length === 0) {
    stylistLog('DecisionEngineRemovalClarify', 'Removal would empty outfit');
    return {
      action: 'clarify',
      reasoning: 'Cannot remove all items - outfit would be empty',
      shouldRegenerateFromScratch: false
    };
  }
  
  return {
    action: 'execute',
    reasoning: 'Remove specified items',
    itemsToRemove,
    shouldRegenerateFromScratch: true
  };
}

/**
 * Handle attribute modification request
 */
function handleAttributeModification(
  classification: RequestClassification,
  currentState: OutfitState,
  newItems: OutfitItem[]
): DecisionResult {
  const message = classification.intent.toLowerCase();
  stylistLog('DecisionEngineAttribute', { message, currentItems: currentState.items.length, newItems: newItems.map((item) => item.name) });
  
  // Try to identify which item to modify
  let targetItem: OutfitItem | undefined;
  
  // Check for specific item mentions
  for (const item of currentState.items) {
    const itemName = item.name.toLowerCase();
    const itemCategory = (item.category || '').toLowerCase();
    
    if (message.includes(itemName) || message.includes(itemCategory)) {
      targetItem = item;
      break;
    }
  }
  
  // If ambiguous (multiple items or no specific reference)
  if (!targetItem && currentState.items.length > 1) {
    stylistLog('DecisionEngineAttributeClarify', 'Ambiguous target item');
    return {
      action: 'clarify',
      reasoning: 'Need to identify which item to modify',
      clarificationQuestion: {
        question: 'Which item would you like to modify?',
        options: currentState.items.map((item, idx) => ({
          id: `modify_${idx}`,
          label: item.name,
          description: item.category || '',
          value: item.name
        })),
        context: {
          type: 'ambiguous',
          question: 'Which item would you like to modify?',
          currentOutfit: currentState.items,
          originalMessage: classification.intent,
          conversationId: '',
          timestamp: new Date()
        }
      },
      shouldRegenerateFromScratch: true
    };
  }
  
  // If we have new items, replace the target
  if (newItems.length > 0 && targetItem) {
    stylistLog('DecisionEngineAttributeReplace', { target: targetItem.name, replacements: newItems.map((item) => item.name) });
    return {
      action: 'execute',
      reasoning: 'Modify item attribute by replacing with new variant',
      itemsToAdd: newItems,
      itemsToRemove: [targetItem],
      shouldRegenerateFromScratch: true
    };
  }
  
  // Fallback: execute if only one item
  if (currentState.items.length === 1 && newItems.length > 0) {
    stylistLog('DecisionEngineAttributeOnlyItem', { replacement: newItems.map((item) => item.name) });
    return {
      action: 'execute',
      reasoning: 'Modify the only item in outfit',
      itemsToAdd: newItems,
      itemsToRemove: [currentState.items[0]],
      shouldRegenerateFromScratch: true
    };
  }
  
  return {
    action: 'clarify',
    reasoning: 'Unable to determine which item to modify',
    shouldRegenerateFromScratch: false
  };
}

