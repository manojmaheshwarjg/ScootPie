import type { OutfitItem, FormalityCheck, FormalityLevel, CompatibilityIssue, Suggestion } from '@/types';

/**
 * Formality Compatibility Checker
 */

/**
 * Calculate formality level for a garment
 */
export function calculateFormalityLevel(item: OutfitItem): FormalityLevel {
  const name = item.name.toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  // Level 5: Formal
  if (['suit', 'tuxedo', 'gown', 'evening dress', 'dress shoes', 'oxfords'].some(k => name.includes(k))) {
    return 5;
  }
  
  // Level 4: Business Casual
  if (['blazer', 'dress pants', 'dress shirt', 'pencil skirt', 'modest dress', 'heels', 'loafers'].some(k => name.includes(k))) {
    return 4;
  }
  
  // Level 3: Smart Casual
  if (['chinos', 'blouse', 'cardigan', 'midi skirt', 'ankle boots', 'flats'].some(k => name.includes(k))) {
    return 3;
  }
  
  // Level 2: Casual
  if (['jeans', 't-shirt', 'tee', 'sneakers', 'sandals', 'casual'].some(k => name.includes(k) || category.includes(k))) {
    return 2;
  }
  
  // Level 1: Very Casual
  if (['sweatpants', 'hoodie', 'sweatshirt', 'athletic', 'gym', 'joggers'].some(k => name.includes(k))) {
    return 1;
  }
  
  // Default to casual
  return 2;
}

/**
 * Check formality compatibility of outfit
 */
export function checkFormality(items: OutfitItem[]): FormalityCheck {
  if (items.length === 0) {
    return {
      passed: true,
      overallLevel: 2,
      itemLevels: {},
      issues: [],
      suggestions: []
    };
  }
  
  // Calculate formality level for each item
  const itemLevels: Record<string, FormalityLevel> = {};
  let totalLevel = 0;
  
  for (const item of items) {
    const level = calculateFormalityLevel(item);
    itemLevels[item.name] = level;
    totalLevel += level;
  }
  
  const overallLevel = Math.round(totalLevel / items.length) as FormalityLevel;
  
  // Find min and max levels
  const levels = Object.values(itemLevels);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);
  const gap = maxLevel - minLevel;
  
  const issues: CompatibilityIssue[] = [];
  const suggestions: Suggestion[] = [];
  
  // Check for formality mismatch (gap >= 2 levels)
  if (gap >= 2) {
    const formalItems = items.filter(item => itemLevels[item.name] >= 4);
    const casualItems = items.filter(item => itemLevels[item.name] <= 2);
    
    if (formalItems.length > 0 && casualItems.length > 0) {
      issues.push({
        type: 'formality',
        severity: 'warning',
        message: 'Formality mismatch detected',
        affectedItems: [...formalItems, ...casualItems],
        suggestion: `Consider ${overallLevel >= 3 ? 'upgrading casual items' : 'making outfit more casual'}`
      });
      
      // Generate suggestions
      if (overallLevel >= 3) {
        // Suggest upgrading casual items
        for (const casualItem of casualItems) {
          suggestions.push({
            type: 'upgrade',
            title: `Upgrade ${casualItem.name}`,
            description: `Consider a more formal alternative to match the overall style`,
            requiresApproval: true
          });
        }
      }
    }
  }
  
  return {
    passed: gap < 2,
    overallLevel,
    itemLevels,
    gap,
    issues,
    suggestions
  };
}

/**
 * Detect formality mismatch
 */
export function detectFormalityMismatch(outfit: OutfitItem[]): { hasMismatch: boolean; gap: number } {
  const check = checkFormality(outfit);
  return {
    hasMismatch: !check.passed,
    gap: check.gap || 0
  };
}

/**
 * Suggest formality upgrade
 */
export function suggestFormalityUpgrade(
  outfit: OutfitItem[],
  targetLevel: FormalityLevel
): Suggestion[] {
  const check = checkFormality(outfit);
  const suggestions: Suggestion[] = [];
  
  // Find items below target level
  for (const item of outfit) {
    const currentLevel = check.itemLevels[item.name];
    if (currentLevel < targetLevel) {
      suggestions.push({
        type: 'upgrade',
        title: `Upgrade ${item.name}`,
        description: `Current level: ${currentLevel}, Target: ${targetLevel}`,
        requiresApproval: true
      });
    }
  }
  
  return suggestions;
}

/**
 * Get formality level label
 */
export function getFormalityLabel(level: FormalityLevel): string {
  const labels: Record<FormalityLevel, string> = {
    1: 'Very Casual',
    2: 'Casual',
    3: 'Smart Casual',
    4: 'Business Casual',
    5: 'Formal'
  };
  return labels[level];
}

