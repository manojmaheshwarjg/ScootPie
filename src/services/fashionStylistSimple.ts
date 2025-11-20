import { OutfitItem, RequestClassification } from '@/types';
import { classifyUserRequest } from './requestClassifier';
import { analyzeOutfitState, normalizeCategory, assignZoneAndZIndex } from './outfitStateManager';

interface StylistResponse {
  action: 'execute' | 'clarify';
  needsClarification: boolean;
  clarificationQuestion?: {
    question: string;
    options: Array<{id: string; label: string; value: any}>;
  };
  itemsToAdd: OutfitItem[];
  itemsToRemove: OutfitItem[];
  shouldRegenerateFromScratch: boolean;
  responseText: string;
  requestType: RequestClassification['type'];
}

export async function analyzeStylistRequest(
  userMessage: string,
  currentOutfitItems: OutfitItem[],
  newFoundItems: OutfitItem[]
): Promise<StylistResponse> {
  
  try {
    // 1. Classify the user request
    const classification = await classifyUserRequest(userMessage);
    console.log('[STYLIST] Classification:', classification.type, classification.confidence);

    // 2. Analyze current outfit state
    const currentState = await analyzeOutfitState(currentOutfitItems);
    console.log('[STYLIST] Current state:', currentState.type, 'items:', currentState.items.length);

    // 3. Assign zones to new items
    const newItemsWithZones = newFoundItems.map(assignZoneAndZIndex);
    
    // 4. Make decision based on request type and current state
    let action: 'execute' | 'clarify' = 'execute';
    let needsClarification = false;
    let clarificationQuestion;
    let itemsToAdd: OutfitItem[] = [];
    let itemsToRemove: OutfitItem[] = [];
    let shouldRegenerateFromScratch = false;
    let responseText = '';

    // Handle different request types
    switch (classification.type) {
      case 'type_a_complete_outfit':
        // Multiple items - replace everything
        itemsToAdd = newItemsWithZones;
        itemsToRemove = currentOutfitItems;
        shouldRegenerateFromScratch = true;
        responseText = `Here's your new complete outfit!`;
        break;

      case 'type_e_layering':
        // Add as layer without removing
        itemsToAdd = newItemsWithZones;
        itemsToRemove = [];
        shouldRegenerateFromScratch = false; // Build on top of existing
        responseText = `Added to your outfit!`;
        break;

      case 'type_f_removal':
        // Remove items (would need specific item matching logic)
        needsClarification = true;
        action = 'clarify';
        clarificationQuestion = {
          question: "Which item would you like to remove?",
          options: currentOutfitItems.map(item => ({
            id: item.name,
            label: item.name,
            value: { action: 'remove', item }
          }))
        };
        break;

      case 'type_d_style_mood':
        // Style transformation - would need AI to suggest outfits
        needsClarification = true;
        action = 'clarify';
        clarificationQuestion = {
          question: "Style transformations aren't fully supported yet. Would you like to search for specific items instead?",
          options: [
            { id: 'yes', label: 'Yes, help me find items', value: { action: 'search_items' } },
            { id: 'no', label: 'No thanks', value: { action: 'cancel' } }
          ]
        };
        break;

      case 'type_c_attribute_modification':
        // Attribute change - need to identify which item to modify
        if (currentOutfitItems.length > 1) {
          needsClarification = true;
          action = 'clarify';
          clarificationQuestion = {
            question: "Which item would you like to modify?",
            options: currentOutfitItems.map(item => ({
              id: item.name,
              label: item.name,
              value: { action: 'modify', item }
            }))
          };
        } else if (currentOutfitItems.length === 1 && newItemsWithZones.length > 0) {
          // Single item, replace it
          itemsToAdd = newItemsWithZones;
          itemsToRemove = currentOutfitItems;
          shouldRegenerateFromScratch = true;
          responseText = `Updated your ${currentOutfitItems[0].name}!`;
        }
        break;

      case 'type_b_single_item':
      default:
        // Single item request - check if it replaces an existing item
        for (const newItem of newItemsWithZones) {
          const newZone = newItem.zone;
          const existingInZone = currentOutfitItems.filter(item => item.zone === newZone);
          
          if (existingInZone.length > 0) {
            // Replacement - need to regenerate from scratch
            itemsToRemove.push(...existingInZone);
            itemsToAdd.push(newItem);
            shouldRegenerateFromScratch = true;
            responseText = `Replaced your ${existingInZone[0].name} with ${newItem.name}!`;
          } else {
            // Addition - can build on top
            itemsToAdd.push(newItem);
            shouldRegenerateFromScratch = false;
            responseText = `Added ${newItem.name} to your outfit!`;
          }
        }
        break;
    }

    return {
      action,
      needsClarification,
      clarificationQuestion,
      itemsToAdd,
      itemsToRemove,
      shouldRegenerateFromScratch,
      responseText: responseText || `Updated your outfit!`,
      requestType: classification.type
    };

  } catch (error) {
    console.error('[STYLIST] Error analyzing request:', error);
    // Fallback to simple behavior
    return {
      action: 'execute',
      needsClarification: false,
      itemsToAdd: newFoundItems,
      itemsToRemove: [],
      shouldRegenerateFromScratch: false,
      responseText: `Added to your outfit!`,
      requestType: 'type_b_single_item'
    };
  }
}

