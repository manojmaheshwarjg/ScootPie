/**
 * Fashion Stylist Service
 * Main orchestrator that ties all components together
 */

import type { OutfitItem, RequestClassification, OutfitState, DecisionResult, CompatibilityCheck, ResponseContext } from '@/types';
import { classifyUserRequest } from './requestClassifier';
import { analyzeOutfitState } from './outfitStateManager';
import { makeDecision } from './decisionEngine';
import { checkFormality } from '@/lib/compatibility/formality';
import { checkColorHarmony } from '@/lib/compatibility/colors';
import { checkPatternMixing } from '@/lib/compatibility/patterns';
import { checkSeasonalCompatibility } from '@/lib/compatibility/seasonal';
import { generateResponse } from '@/lib/templates/responses';
import { getSessionContext } from '@/lib/context/sessionContext';
import { detectEdgeCase, handleEdgeCase } from '@/lib/edgeCases/handlers';
import { trackOutfitInteraction, getUserPreferences } from '@/lib/learning/preferenceTracker';
import { DecisionContextBuilder } from '@/lib/prompts/decisionContext';
import { stylistLog, stylistWarn, stylistError } from './utils/stylistLogger';

export interface StylistProcessResult {
  success: boolean;
  decision: DecisionResult;
  classification: RequestClassification;
  outfitState: OutfitState;
  compatibilityChecks: CompatibilityCheck[];
  responseText: string;
  needsClarification: boolean;
  decisionContextPrompt: string;
  error?: string;
}

/**
 * Main processing pipeline for fashion stylist
 */
export async function processStylistRequest(
  userMessage: string,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[],
  conversationId: string,
  userId: string,
  outfitSource?: 'photo' | 'prior_items' | 'empty', // Add source tracking
  originalPhotoOutfit?: OutfitItem[] // Original items from photo analysis (for restoration)
): Promise<StylistProcessResult> {
  try {
    console.log('[FashionStylist] ===== PROCESSING STYLIST REQUEST =====');
    console.log('[FashionStylist] User message:', userMessage);
    console.log('[FashionStylist] Current outfit:', currentOutfit.map(i => i.name));
    console.log('[FashionStylist] Outfit source:', outfitSource || 'unknown');
    console.log('[FashionStylist] New items:', newItems.map(i => i.name));
    
    const decisionContext = new DecisionContextBuilder();
    decisionContext.addSection('User Message', userMessage);
    if (outfitSource === 'photo') {
      decisionContext.addSection('Outfit Source', 'Analyzed from user photo using Gemini Vision');
    } else if (outfitSource === 'prior_items') {
      decisionContext.addSection('Outfit Source', 'From previous chat messages');
    }
    stylistLog('Start', { userMessage, currentOutfitCount: currentOutfit.length, newItemsCount: newItems.length, outfitSource });
    
    // Get user preferences
    const userPreferences = await getUserPreferences(userId);
    
    // Get or create session context
    const sessionContext = getSessionContext(conversationId, userPreferences);
    
    // Step 1: Classify the request
    console.log('[FashionStylist] Step 1: Classifying request...');
    const classification = await classifyUserRequest(userMessage);
    console.log('[FashionStylist] Classification result:', { type: classification.type, confidence: classification.confidence, intent: classification.intent });
    stylistLog('Classification', { type: classification.type, confidence: classification.confidence });
    decisionContext.addClassification(classification, userMessage);
    
    // Step 2: Analyze current outfit state
    console.log('[FashionStylist] Step 2: Analyzing outfit state...');
    const currentState = await analyzeOutfitState(currentOutfit);
    console.log('[FashionStylist] Outfit state result:', { type: currentState.type, itemCount: currentState.items.length, isComplete: currentState.isComplete });
    stylistLog('OutfitState', { type: currentState.type, items: currentState.items.length });
    decisionContext.addOutfitState(currentState);
    
    // Step 3: Check for edge cases
    console.log('[FashionStylist] Step 3: Checking for edge cases...');
    const edgeCase = detectEdgeCase(userMessage, currentOutfit, newItems);
    if (edgeCase) {
      console.log('[FashionStylist] Edge case detected:', edgeCase.type);
      stylistWarn('EdgeCaseDetected', edgeCase.type);
      decisionContext.addSection('Edge Case', `${edgeCase.type}${(edgeCase as any).description ? ` - ${(edgeCase as any).description}` : ''}`);
      const resolution = handleEdgeCase(edgeCase);
      
      if (resolution.action === 'clarify') {
        if (resolution.response) {
          decisionContext.addSection('Clarification', resolution.response);
        }
        const decisionContextPrompt = decisionContext.toString();
        return {
          success: true,
          decision: {
            action: 'clarify',
            reasoning: resolution.response,
            clarificationQuestion: {
              question: resolution.response,
              options: resolution.options || [],
              context: {
                type: 'ambiguous',
                question: resolution.response,
                originalMessage: userMessage,
                conversationId,
                timestamp: new Date()
              }
            },
            shouldRegenerateFromScratch: false
          },
          classification,
          outfitState: currentState,
          compatibilityChecks: [],
          responseText: resolution.response,
          needsClarification: true,
          decisionContextPrompt
        };
      }
    }
    
    // Step 4: Make decision based on classification and state
    console.log('[FashionStylist] Step 4: Making decision...');
    console.log('[FashionStylist] Routing to decision engine with:', { classificationType: classification.type, outfitStateType: currentState.type, newItemsCount: newItems.length, hasOriginalPhotoOutfit: !!originalPhotoOutfit });
    const decision = await makeDecision(classification, currentState, newItems, originalPhotoOutfit);
    console.log('[FashionStylist] Decision result:', { action: decision.action, reasoning: decision.reasoning, itemsToAdd: decision.itemsToAdd?.length, itemsToRemove: decision.itemsToRemove?.length });
    stylistLog('Decision', { action: decision.action, reasoning: decision.reasoning });
    decisionContext.addDecision(decision);
    
    // Step 5: If decision is to execute, check compatibility
    let compatibilityChecks: CompatibilityCheck[] = [];
    let finalItems = currentOutfit;
    
    if (decision.action === 'execute') {
      // Merge items based on decision
      if (decision.itemsToAdd) {
        finalItems = [...currentOutfit];
        
        // Remove items if specified
        if (decision.itemsToRemove) {
          finalItems = finalItems.filter(item => 
            !decision.itemsToRemove!.some(toRemove => toRemove.name === item.name)
          );
        }
        
        // Add new items
        finalItems = [...finalItems, ...decision.itemsToAdd];
      }
      
      // Run compatibility checks
      compatibilityChecks = [
        checkFormality(finalItems),
        checkColorHarmony(finalItems),
        checkPatternMixing(finalItems),
        checkSeasonalCompatibility(finalItems)
      ];
      
      stylistLog('Compatibility', {
        formality: compatibilityChecks[0].passed,
        color: compatibilityChecks[1].passed,
        pattern: compatibilityChecks[2].passed,
        seasonal: compatibilityChecks[3].passed
      });
      decisionContext.addCompatibility(compatibilityChecks);
    }
    
    // Step 6: Generate response
    const finalState = await analyzeOutfitState(finalItems);
    decisionContext.addOutfitState(finalState, 'Updated Outfit State');
    const responseContext: ResponseContext = {
      requestType: classification.type,
      outfitState: finalState,
      itemsChanged: decision.itemsToAdd || [],
      compatibilityChecks,
      userMessage
    };
    
    const responseText = generateResponse(responseContext);
    
    // Step 7: Update session context
    if (decision.action === 'execute' && decision.itemsToAdd) {
      sessionContext.pushSnapshot(finalItems, undefined);
      
      // Track interaction
      await trackOutfitInteraction(userId, finalItems, 'accepted').catch(console.error);
    }
    
    // Step 8: Check if clarification is needed
    const needsClarification = decision.action === 'clarify' || decision.action === 'suggest';
    
    if (needsClarification && decision.clarificationQuestion) {
      sessionContext.setPendingClarification(decision.clarificationQuestion.context);
    }
    
    const decisionContextPrompt = decisionContext.toString();
    stylistLog('DecisionContext', '===== DECISION CONTEXT PROMPT =====');
    stylistLog('DecisionContext', decisionContextPrompt);
    stylistLog('DecisionContext', '===== END DECISION CONTEXT =====');
    
    return {
      success: true,
      decision,
      classification,
      outfitState: finalState,
      compatibilityChecks,
      responseText,
      needsClarification,
      decisionContextPrompt
    };
    
  } catch (error) {
    stylistError('ProcessingError', error);
    return {
      success: false,
      decision: {
        action: 'clarify',
        reasoning: 'Failed to process request',
        shouldRegenerateFromScratch: false
      },
      classification: {
        type: 'type_b_single_item',
        confidence: 0,
        extractedEntities: {
          garments: [],
          colors: [],
          brands: [],
          styleDescriptors: [],
          categories: [],
          attributes: {}
        },
        intent: '',
        layeringKeywords: [],
        removalKeywords: [],
        needsClarification: false
      },
      outfitState: await analyzeOutfitState([]),
      compatibilityChecks: [],
      responseText: 'Sorry, I encountered an error processing your request. Please try again.',
      needsClarification: false,
      decisionContextPrompt: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process undo request
 */
export async function processUndo(conversationId: string): Promise<{
  success: boolean;
  previousOutfit?: OutfitItem[];
  message: string;
}> {
  const sessionContext = getSessionContext(conversationId);
  const previousSnapshot = sessionContext.undo();
  
  if (!previousSnapshot) {
    return {
      success: false,
      message: 'Nothing to undo - this is your original outfit.'
    };
  }
  
  return {
    success: true,
    previousOutfit: previousSnapshot.items,
    message: 'Reverted to previous outfit!'
  };
}

/**
 * Process redo request
 */
export async function processRedo(conversationId: string): Promise<{
  success: boolean;
  nextOutfit?: OutfitItem[];
  message: string;
}> {
  const sessionContext = getSessionContext(conversationId);
  const nextSnapshot = sessionContext.redo();
  
  if (!nextSnapshot) {
    return {
      success: false,
      message: 'Nothing to redo - you\'re at the latest version.'
    };
  }
  
  return {
    success: true,
    nextOutfit: nextSnapshot.items,
    message: 'Restored next outfit!'
  };
}

