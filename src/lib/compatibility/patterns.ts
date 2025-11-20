import type { OutfitItem, PatternCheck, PatternType, CompatibilityIssue, Suggestion } from '@/types';

/**
 * Pattern Compatibility Checker
 */

/**
 * Detect pattern from item name
 */
function detectPattern(item: OutfitItem): PatternType {
  if (item.pattern) {
    return item.pattern;
  }
  
  const name = item.name.toLowerCase();
  
  if (/stripe|striped/.test(name)) return 'stripes';
  if (/polka dot|dots/.test(name)) return 'polka_dots';
  if (/floral|flower/.test(name)) return 'floral';
  if (/geometric|abstract/.test(name)) return 'geometric';
  if (/animal|leopard|zebra|snake/.test(name)) return 'animal_print';
  
  return 'solid';
}

/**
 * Check if patterns can mix
 */
function canPatternsMix(pattern1: PatternType, pattern2: PatternType): boolean {
  // Solid mixes with anything
  if (pattern1 === 'solid' || pattern2 === 'solid') {
    return true;
  }
  
  // Same pattern in different scales is OK
  if (pattern1 === pattern2) {
    return true;
  }
  
  // Busy patterns (floral, geometric, animal) don't mix well together
  const busyPatterns: PatternType[] = ['floral', 'geometric', 'animal_print'];
  if (busyPatterns.includes(pattern1) && busyPatterns.includes(pattern2)) {
    return false;
  }
  
  // Stripes and polka dots can mix
  if ((pattern1 === 'stripes' && pattern2 === 'polka_dots') ||
      (pattern1 === 'polka_dots' && pattern2 === 'stripes')) {
    return true;
  }
  
  return true;
}

/**
 * Check pattern compatibility
 */
export function checkPatternMixing(items: OutfitItem[]): PatternCheck {
  if (items.length === 0) {
    return {
      passed: true,
      patterns: [],
      mixingValid: true,
      issues: [],
      suggestions: []
    };
  }
  
  // Detect patterns for all items
  const patterns = items.map(item => detectPattern(item));
  const uniquePatterns = [...new Set(patterns)].filter(p => p !== 'solid');
  
  const issues: CompatibilityIssue[] = [];
  const suggestions: Suggestion[] = [];
  
  // Check pattern mixing
  let mixingValid = true;
  
  if (uniquePatterns.length >= 2) {
    // Check each pair of patterns
    for (let i = 0; i < items.length; i++) {
      const pattern1 = patterns[i];
      if (pattern1 === 'solid') continue;
      
      for (let j = i + 1; j < items.length; j++) {
        const pattern2 = patterns[j];
        if (pattern2 === 'solid') continue;
        
        if (!canPatternsMix(pattern1, pattern2)) {
          mixingValid = false;
          
          issues.push({
            type: 'pattern',
            severity: 'warning',
            message: `${pattern1} and ${pattern2} patterns might clash`,
            affectedItems: [items[i], items[j]],
            suggestion: 'Consider making one item solid'
          });
          
          suggestions.push({
            type: 'coordination',
            title: 'Simplify Pattern Mix',
            description: 'Consider making one item solid to balance the look',
            requiresApproval: true
          });
        }
      }
    }
  }
  
  return {
    passed: mixingValid,
    patterns: uniquePatterns,
    mixingValid,
    issues,
    suggestions
  };
}

