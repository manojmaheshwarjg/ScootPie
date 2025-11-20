import type { OutfitItem, ColorCheck, CompatibilityIssue, Suggestion } from '@/types';

/**
 * Color Compatibility Checker
 */

/**
 * Extract colors from item name and attributes
 */
function extractColors(item: OutfitItem): string[] {
  const colors: string[] = [];
  
  // Check explicit colors array
  if (item.colors && item.colors.length > 0) {
    return item.colors;
  }
  
  // Extract from name
  const name = item.name.toLowerCase();
  const colorPatterns = [
    'black', 'blue', 'red', 'white', 'green', 'pink', 'purple', 'yellow',
    'orange', 'brown', 'grey', 'gray', 'navy', 'beige', 'cream', 'tan',
    'maroon', 'burgundy', 'olive', 'khaki', 'teal', 'turquoise', 'coral'
  ];
  
  for (const color of colorPatterns) {
    if (new RegExp(`\\b${color}\\b`, 'i').test(name)) {
      colors.push(color);
    }
  }
  
  return colors;
}

/**
 * Check if colors clash
 */
function doColorsClash(color1: string, color2: string): boolean {
  const clashPairs = [
    ['red', 'pink'],
    ['brown', 'black'],
    ['navy', 'black']
  ];
  
  for (const [c1, c2] of clashPairs) {
    if ((color1 === c1 && color2 === c2) || (color1 === c2 && color2 === c1)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Determine color harmony type
 */
function determineHarmony(colors: string[]): 'complementary' | 'analogous' | 'monochromatic' | 'clash' {
  if (colors.length <= 1) {
    return 'monochromatic';
  }
  
  // Check for clashes
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      if (doColorsClash(colors[i], colors[j])) {
        return 'clash';
      }
    }
  }
  
  // Check for monochromatic (all same base color)
  const uniqueColors = new Set(colors);
  if (uniqueColors.size === 1) {
    return 'monochromatic';
  }
  
  // Check for neutrals with accent (common good combination)
  const neutrals = ['black', 'white', 'grey', 'gray', 'beige', 'cream', 'tan'];
  const hasNeutrals = colors.some(c => neutrals.includes(c));
  const hasAccent = colors.some(c => !neutrals.includes(c));
  
  if (hasNeutrals && hasAccent) {
    return 'complementary';
  }
  
  // Default to analogous
  return 'analogous';
}

/**
 * Check color compatibility
 */
export function checkColorHarmony(items: OutfitItem[]): ColorCheck {
  if (items.length === 0) {
    return {
      passed: true,
      harmony: 'monochromatic',
      dominantColors: [],
      issues: [],
      suggestions: []
    };
  }
  
  // Extract all colors
  const allColors: string[] = [];
  for (const item of items) {
    const itemColors = extractColors(item);
    allColors.push(...itemColors);
  }
  
  // Get dominant colors (most frequent)
  const colorCounts: Record<string, number> = {};
  for (const color of allColors) {
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  }
  
  const dominantColors = Object.entries(colorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([color]) => color);
  
  const harmony = determineHarmony(allColors);
  
  const issues: CompatibilityIssue[] = [];
  const suggestions: Suggestion[] = [];
  
  // Check for clashes
  if (harmony === 'clash') {
    const clashingItems: OutfitItem[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const colors1 = extractColors(items[i]);
      for (let j = i + 1; j < items.length; j++) {
        const colors2 = extractColors(items[j]);
        
        for (const c1 of colors1) {
          for (const c2 of colors2) {
            if (doColorsClash(c1, c2)) {
              if (!clashingItems.includes(items[i])) clashingItems.push(items[i]);
              if (!clashingItems.includes(items[j])) clashingItems.push(items[j]);
            }
          }
        }
      }
    }
    
    if (clashingItems.length > 0) {
      issues.push({
        type: 'color',
        severity: 'warning',
        message: 'Color clash detected',
        affectedItems: clashingItems,
        suggestion: 'Consider changing one of the clashing colors'
      });
      
      suggestions.push({
        type: 'coordination',
        title: 'Fix Color Clash',
        description: 'These colors might not work well together. Want suggestions?',
        requiresApproval: true
      });
    }
  }
  
  // Check for too many bright colors
  const brightColors = ['red', 'yellow', 'orange', 'pink', 'purple', 'turquoise'];
  const brightCount = allColors.filter(c => brightColors.includes(c)).length;
  
  if (brightCount > 2) {
    issues.push({
      type: 'color',
      severity: 'warning',
      message: 'Too many bright colors',
      affectedItems: items,
      suggestion: 'Consider using neutrals to balance the outfit'
    });
  }
  
  return {
    passed: harmony !== 'clash' && brightCount <= 2,
    harmony,
    dominantColors,
    issues,
    suggestions
  };
}

/**
 * Generate color suggestions
 */
export function generateColorSuggestions(outfit: OutfitItem[]): Suggestion[] {
  const check = checkColorHarmony(outfit);
  return check.suggestions;
}

