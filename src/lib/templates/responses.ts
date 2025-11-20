import type { ResponseContext, ResponseTemplate, OutfitItem, CompatibilityCheck } from '@/types';

/**
 * Template-based Response Generation System
 */

/**
 * Generate AI response based on context
 */
export function generateResponse(context: ResponseContext): string {
  const { requestType, outfitState, itemsChanged, compatibilityChecks, userMessage } = context;
  
  // Build base response
  let response = '';
  
  // Confirmation message
  if (itemsChanged.length > 0) {
    response += generateConfirmationMessage(itemsChanged, outfitState.items);
  }
  
  // Add compatibility warnings if any
  const warnings = generateCompatibilityWarnings(compatibilityChecks);
  if (warnings) {
    response += '\n\n' + warnings;
  }
  
  // Add follow-up prompt
  response += '\n\n' + generateFollowUpPrompt(outfitState.isComplete);
  
  return response.trim();
}

/**
 * Generate confirmation message for changes
 */
function generateConfirmationMessage(itemsChanged: OutfitItem[], allItems: OutfitItem[]): string {
  if (itemsChanged.length === 0) {
    return "I couldn't find items matching your request. Try being more specific with brands, colors, or item types.";
  }
  
  // Simple replacement
  if (itemsChanged.length === 1 && allItems.length === 1) {
    return `Here's your look with ${itemsChanged[0].name}!`;
  }
  
  // Multiple items changed
  if (itemsChanged.length > 1) {
    const itemsList = itemsChanged.map(i => i.name).join(', ');
    return `Updated your outfit with: ${itemsList}!`;
  }
  
  // Single item added to existing outfit
  const itemsList = allItems.map(i => i.name).join(', ');
  return `Added ${itemsChanged[0].name}! Now wearing: ${itemsList}.`;
}

/**
 * Generate compatibility warnings
 */
function generateCompatibilityWarnings(checks: CompatibilityCheck[]): string {
  const warnings: string[] = [];
  
  for (const check of checks) {
    if (!check.passed && check.issues.length > 0) {
      for (const issue of check.issues) {
        if (issue.severity === 'warning') {
          warnings.push(`💡 ${issue.message}${issue.suggestion ? `: ${issue.suggestion}` : ''}`);
        }
      }
    }
  }
  
  return warnings.length > 0 ? warnings.join('\n') : '';
}

/**
 * Generate follow-up prompt
 */
function generateFollowUpPrompt(isComplete: boolean): string {
  if (!isComplete) {
    return "Want to add more items to complete your outfit?";
  }
  
  const prompts = [
    "Want to add accessories or change anything?",
    "Ready to complete your look with shoes or accessories?",
    "Want to add or replace anything else?",
    "How about shoes or accessories to finish the look?",
  ];
  
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Confirmation templates
 */
export const CONFIRMATION_TEMPLATES = {
  simple: "Swapped to {item}!",
  multiple: "Updated your outfit: {items}!",
  withRationale: "Switched to {item} - {reason}!",
  replacement: "Replaced {oldItem} with {newItem}!",
  addition: "Added {item} to your outfit!",
};

/**
 * Clarification templates
 */
export const CLARIFICATION_TEMPLATES = {
  needInfo: "What kind of {category} are you thinking?",
  ambiguous: "Just to confirm - did you mean {optionA} or {optionB}?",
  suggest: "I'm thinking {item}. Does that work?",
  multipleOptions: "Which would you prefer?",
};

/**
 * Suggestion templates
 */
export const SUGGESTION_TEMPLATES = {
  coordination: "FYI: {item1} and {item2} might clash. Want me to adjust?",
  upgrade: "These {item} would look sharper with {complementary}. Interested?",
  style: "For a {style} look, I'd recommend {items}.",
  tip: "Quick tip: {suggestion} would tie this together nicely!",
};

/**
 * Error templates
 */
export const ERROR_TEMPLATES = {
  noResults: "I couldn't find good matches for \"{query}\". Try something like '{example}'.",
  conflict: "That would conflict with your current outfit. {explanation}",
  incomplete: "That would make your outfit incomplete. {suggestion}",
  unknown: "I'm not familiar with \"{term}\". Could you describe it differently?",
};

/**
 * Format template with variables
 */
export function formatTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  
  return result;
}

/**
 * Generate error response
 */
export function generateErrorResponse(
  type: 'noResults' | 'conflict' | 'incomplete' | 'unknown',
  variables: Record<string, string>
): string {
  const template = ERROR_TEMPLATES[type];
  return formatTemplate(template, variables);
}

/**
 * Generate clarification response
 */
export function generateClarificationResponse(
  type: 'needInfo' | 'ambiguous' | 'suggest' | 'multipleOptions',
  variables: Record<string, string>
): string {
  const template = CLARIFICATION_TEMPLATES[type];
  return formatTemplate(template, variables);
}

/**
 * Generate suggestion response
 */
export function generateSuggestionResponse(
  type: 'coordination' | 'upgrade' | 'style' | 'tip',
  variables: Record<string, string>
): string {
  const template = SUGGESTION_TEMPLATES[type];
  return formatTemplate(template, variables);
}

/**
 * Generate style transformation response
 */
export function generateStyleTransformationResponse(
  styleName: string,
  items: OutfitItem[]
): string {
  const itemsList = items.map(i => i.name).join(', ');
  return `Here's your ${styleName} transformation! Now wearing: ${itemsList}. Love it?`;
}

/**
 * Generate undo response
 */
export function generateUndoResponse(): string {
  return "Back to your previous look!";
}

/**
 * Generate removal response
 */
export function generateRemovalResponse(removedItems: OutfitItem[], remainingItems: OutfitItem[]): string {
  const removed = removedItems.map(i => i.name).join(' and ');
  
  if (remainingItems.length === 0) {
    return `Removed ${removed}. Your outfit is now empty. Ready to start fresh?`;
  }
  
  const remaining = remainingItems.map(i => i.name).join(', ');
  return `Removed ${removed}. Still wearing: ${remaining}.`;
}

