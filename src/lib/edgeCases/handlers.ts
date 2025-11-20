import type { EdgeCaseScenario, EdgeCaseResolution, ClarificationOption, OutfitItem } from '@/types';

/**
 * Edge Case Handlers
 * Handle all edge cases from the specification
 */

/**
 * Handle incomplete outfit creation
 * Scenario: User removes items without replacement
 */
export function handleIncompleteOutfit(
  scenario: EdgeCaseScenario
): EdgeCaseResolution {
  const { context } = scenario;
  const { removedItem, remainingItems } = context;

  // Check if removal creates incomplete outfit
  if (!remainingItems || remainingItems.length === 0) {
    return {
      resolved: true,
      action: 'error',
      response: `Removing ${removedItem} would leave the outfit empty. Would you like to replace it instead?`,
      options: [
        {
          id: 'replace',
          label: 'Replace it',
          description: 'Choose a new item',
          value: 'replace'
        },
        {
          id: 'cancel',
          label: 'Keep it',
          description: 'Don\'t remove',
          value: 'cancel'
        }
      ]
    };
  }

  return {
    resolved: true,
    action: 'clarify',
    response: 'This will leave you with an incomplete outfit. Continue?',
    options: [
      {
        id: 'continue',
        label: 'Yes, remove it',
        value: true
      },
      {
        id: 'cancel',
        label: 'No, keep it',
        value: false
      }
    ]
  };
}

/**
 * Handle impossible combinations
 * Scenario: User requests items that can't coexist
 */
export function handleImpossibleCombination(
  scenario: EdgeCaseScenario
): EdgeCaseResolution {
  const { context } = scenario;
  const { requestedItems } = context;

  // Example: "T-shirt and dress" - both occupy zones that conflict
  return {
    resolved: true,
    action: 'clarify',
    response: `A dress is a complete outfit. Did you mean:`,
    options: [
      {
        id: 'dress_only',
        label: 'Just the dress',
        description: 'Remove top and bottom',
        value: 'dress'
      },
      {
        id: 'separates',
        label: 'T-shirt with skirt',
        description: 'Convert dress to separates',
        value: 'separates'
      }
    ]
  };
}

/**
 * Handle ambiguous item names
 * Scenario: "Top" could mean multiple things
 */
export function handleAmbiguousName(
  scenario: EdgeCaseScenario
): EdgeCaseResolution {
  const { context } = scenario;
  const { ambiguousTerm } = context;

  const options: ClarificationOption[] = [
    { id: 'tshirt', label: 'T-shirt', description: 'Casual and comfortable', value: 't-shirt' },
    { id: 'blouse', label: 'Blouse', description: 'Dressy and feminine', value: 'blouse' },
    { id: 'tank', label: 'Tank top', description: 'Sleeveless and casual', value: 'tank top' },
    { id: 'crop', label: 'Crop top', description: 'Trendy and short', value: 'crop top' },
    { id: 'sweater', label: 'Sweater', description: 'Warm and cozy', value: 'sweater' },
    { id: 'hoodie', label: 'Hoodie', description: 'Casual with hood', value: 'hoodie' }
  ];

  return {
    resolved: true,
    action: 'clarify',
    response: `What kind of ${ambiguousTerm} are you looking for?`,
    options
  };
}

/**
 * Handle conflicting instructions
 * Scenario: User gives contradictory requests
 */
export function handleConflictingInstructions(
  scenario: EdgeCaseScenario
): EdgeCaseResolution {
  const { message, context } = scenario;

  return {
    resolved: true,
    action: 'clarify',
    response: "I'm not sure I understand. Would you like to:",
    options: [
      {
        id: 'option_a',
        label: context.optionA,
        value: 'a'
      },
      {
        id: 'option_b',
        label: context.optionB,
        value: 'b'
      },
      {
        id: 'something_else',
        label: 'Something else',
        description: 'Let me rephrase',
        value: 'else'
      }
    ]
  };
}

/**
 * Handle multiple valid interpretations
 * Scenario: Request could apply to different items
 */
export function handleMultipleInterpretations(
  scenario: EdgeCaseScenario
): EdgeCaseResolution {
  const { context } = scenario;
  const { ambiguousReference, possibleItems } = context;

  const options: ClarificationOption[] = possibleItems.map((item: OutfitItem, index: number) => ({
    id: `item_${index}`,
    label: item.name,
    description: item.category || '',
    value: item.name
  }));

  // Add "both" option if applicable
  if (possibleItems.length === 2) {
    options.push({
      id: 'both',
      label: 'Both',
      description: 'Apply to all items',
      value: 'both'
    });
  }

  return {
    resolved: true,
    action: 'clarify',
    response: `Which item should I ${ambiguousReference}?`,
    options
  };
}

/**
 * Handle unknown garment term
 * Scenario: User mentions unfamiliar clothing term
 */
export function handleUnknownTerm(
  scenario: EdgeCaseScenario
): EdgeCaseResolution {
  const { context } = scenario;
  const { unknownTerm, suggestedCategory } = context;

  return {
    resolved: true,
    action: 'clarify',
    response: `I'm not familiar with "${unknownTerm}". Could you describe it or choose from these options?`,
    options: [
      {
        id: 'describe',
        label: 'Describe it',
        description: 'Tell me more about it',
        value: 'describe'
      },
      {
        id: 'similar',
        label: `Similar to ${suggestedCategory}`,
        description: 'Choose from similar items',
        value: 'similar'
      },
      {
        id: 'skip',
        label: 'Skip it',
        description: 'Try something else',
        value: 'skip'
      }
    ]
  };
}

/**
 * Main edge case router
 */
export function handleEdgeCase(scenario: EdgeCaseScenario): EdgeCaseResolution {
  switch (scenario.type) {
    case 'incomplete_outfit':
      return handleIncompleteOutfit(scenario);
    
    case 'impossible_combination':
      return handleImpossibleCombination(scenario);
    
    case 'ambiguous_name':
      return handleAmbiguousName(scenario);
    
    case 'conflicting_instructions':
      return handleConflictingInstructions(scenario);
    
    case 'multiple_interpretations':
      return handleMultipleInterpretations(scenario);
    
    case 'unknown_term':
      return handleUnknownTerm(scenario);
    
    default:
      return {
        resolved: false,
        action: 'error',
        response: 'I encountered an unexpected situation. Could you rephrase your request?'
      };
  }
}

/**
 * Detect edge case from context
 */
export function detectEdgeCase(
  userMessage: string,
  currentOutfit: OutfitItem[],
  newItems: OutfitItem[]
): EdgeCaseScenario | null {
  // Check for incomplete outfit (removal without items left)
  if (/remove|take off/i.test(userMessage) && currentOutfit.length <= 1) {
    return {
      type: 'incomplete_outfit',
      message: userMessage,
      context: {
        removedItem: currentOutfit[0]?.name,
        remainingItems: []
      }
    };
  }

  // Check for ambiguous names
  if (/\b(top|bottom|shirt|pants)\b/i.test(userMessage) && !/\b(crop|tank|t-shirt|specific)\b/i.test(userMessage)) {
    const match = userMessage.match(/\b(top|bottom|shirt|pants)\b/i);
    if (match) {
      return {
        type: 'ambiguous_name',
        message: userMessage,
        context: {
          ambiguousTerm: match[1].toLowerCase()
        }
      };
    }
  }

  // Check for multiple valid interpretations with ambiguous references
  if (/\b(it|this|that)\b/i.test(userMessage) && currentOutfit.length > 1) {
    const colors = userMessage.match(/\b(black|blue|red|white|green)\b/i);
    if (colors) {
      const possibleItems = currentOutfit.filter(item => 
        item.name.toLowerCase().includes(colors[1].toLowerCase())
      );
      
      if (possibleItems.length > 1) {
        return {
          type: 'multiple_interpretations',
          message: userMessage,
          context: {
            ambiguousReference: 'change',
            possibleItems
          }
        };
      }
    }
  }

  return null;
}

