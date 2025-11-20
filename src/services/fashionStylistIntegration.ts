/**
 * Fashion Stylist Integration Layer
 * Integrates the fashion stylist service with existing chat API
 */

import { processStylistRequest, processUndo, processRedo } from './fashionStylist';
import type { OutfitItem } from '@/types';

export interface IntegrationResult {
  shouldProceed: boolean;
  responseText: string;
  finalItems: OutfitItem[];
  needsClarification: boolean;
  clarificationQuestion?: any;
  shouldRegenerateFromScratch: boolean;
  decisionContextPrompt: string;
  requestType?: string;
}

/**
 * Integrate fashion stylist into chat flow
 * This acts as a bridge between the existing chat API and the new fashion stylist
 */
export async function integrateFashionStylist(
  userMessage: string,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[],
  conversationId: string,
  userId: string,
  outfitSource?: 'photo' | 'prior_items' | 'empty',
  originalPhotoOutfit?: OutfitItem[] // Original items from photo analysis
): Promise<IntegrationResult> {
  try {
    console.log('[FashionStylistIntegration] ===== STARTING STYLIST PROCESSING =====');
    console.log('[FashionStylistIntegration] User message:', userMessage);
    console.log('[FashionStylistIntegration] Current outfit count:', currentOutfit.length);
    console.log('[FashionStylistIntegration] Outfit source:', outfitSource || 'unknown');
    console.log('[FashionStylistIntegration] New items count:', newItems.length);
    
    // Process through fashion stylist
    const result = await processStylistRequest(
      userMessage,
      currentOutfit,
      newItems,
      conversationId,
      userId,
      outfitSource,
      originalPhotoOutfit
    );
    
    console.log('[FashionStylistIntegration] Stylist result:', {
      success: result.success,
      decisionAction: result.decision.action,
      needsClarification: result.needsClarification
    });

    if (!result.success) {
      return {
        shouldProceed: true, // Fall back to existing logic
        responseText: '',
        finalItems: [...currentOutfit, ...newItems],
        needsClarification: false,
        shouldRegenerateFromScratch: false,
        decisionContextPrompt: '',
        requestType: undefined
      };
    }

    // Handle clarification
    if (result.needsClarification) {
      return {
        shouldProceed: false, // Don't proceed with outfit generation
        responseText: result.responseText,
        finalItems: currentOutfit,
        needsClarification: true,
        clarificationQuestion: result.decision.clarificationQuestion,
        shouldRegenerateFromScratch: false,
        decisionContextPrompt: result.decisionContextPrompt,
        requestType: result.classification.type
      };
    }

    // Handle execute decision
    if (result.decision.action === 'execute') {
      let finalItems = [...currentOutfit];

      // Remove items if specified
      if (result.decision.itemsToRemove) {
        finalItems = finalItems.filter(item =>
          !result.decision.itemsToRemove!.some(toRemove => toRemove.name === item.name)
        );
      }

      // Add new items
      if (result.decision.itemsToAdd) {
        finalItems = [...finalItems, ...result.decision.itemsToAdd];
      }

      return {
        shouldProceed: true,
        responseText: result.responseText,
        finalItems,
        needsClarification: false,
        shouldRegenerateFromScratch: result.decision.shouldRegenerateFromScratch,
        decisionContextPrompt: result.decisionContextPrompt,
        requestType: result.classification.type
      };
    }

    // Handle suggest decision
    if (result.decision.action === 'suggest') {
      return {
        shouldProceed: false,
        responseText: result.responseText,
        finalItems: currentOutfit,
        needsClarification: true,
        clarificationQuestion: result.decision.clarificationQuestion,
        shouldRegenerateFromScratch: false,
        decisionContextPrompt: result.decisionContextPrompt,
        requestType: result.classification.type
      };
    }

    // Default fallback
    return {
      shouldProceed: true,
      responseText: result.responseText,
      finalItems: [...currentOutfit, ...newItems],
      needsClarification: false,
      shouldRegenerateFromScratch: false,
      decisionContextPrompt: result.decisionContextPrompt,
      requestType: result.classification.type
    };

  } catch (error) {
    console.error('[FashionStylistIntegration] Error:', error);
    // Fall back to existing logic
    return {
      shouldProceed: true,
      responseText: '',
      finalItems: [...currentOutfit, ...newItems],
      needsClarification: false,
      shouldRegenerateFromScratch: false,
      decisionContextPrompt: '',
      requestType: undefined
    };
  }
}

/**
 * Check if message is an undo/redo request
 */
export function isUndoRedoRequest(message: string): 'undo' | 'redo' | null {
  const lowerMessage = message.toLowerCase().trim();
  
  if (/^(undo|go back|previous|revert)$/.test(lowerMessage)) {
    return 'undo';
  }
  
  if (/^(redo|go forward|next|restore)$/.test(lowerMessage)) {
    return 'redo';
  }
  
  return null;
}

/**
 * Handle undo request
 */
export async function handleUndo(conversationId: string): Promise<{
  success: boolean;
  outfit?: OutfitItem[];
  message: string;
}> {
  return processUndo(conversationId);
}

/**
 * Handle redo request
 */
export async function handleRedo(conversationId: string): Promise<{
  success: boolean;
  outfit?: OutfitItem[];
  message: string;
}> {
  return processRedo(conversationId);
}

