import type { OutfitItem, SeasonalCheck, CompatibilityIssue, Suggestion } from '@/types';

/**
 * Seasonal Compatibility Checker
 */

type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'transitional';

/**
 * Detect season for an item
 */
function detectItemSeason(item: OutfitItem): Season[] {
  const name = item.name.toLowerCase();
  const seasons: Season[] = [];
  
  // Winter items
  if (['coat', 'puffer', 'parka', 'scarf', 'boots', 'sweater', 'turtleneck'].some(k => name.includes(k))) {
    seasons.push('winter');
    
    // Some can also be transitional
    if (['boots', 'sweater'].some(k => name.includes(k))) {
      seasons.push('fall', 'spring');
    }
  }
  
  // Summer items
  if (['tank', 'shorts', 'sandals', 'sundress', 'light', 'sleeveless'].some(k => name.includes(k))) {
    seasons.push('summer');
    
    if (['tank', 'sandals'].some(k => name.includes(k))) {
      seasons.push('spring');
    }
  }
  
  // Fall items
  if (['jacket', 'cardigan', 'blazer', 'boots'].some(k => name.includes(k))) {
    if (!seasons.includes('fall')) seasons.push('fall');
    if (!seasons.includes('spring')) seasons.push('spring');
    seasons.push('transitional');
  }
  
  // Year-round items
  if (['jeans', 't-shirt', 'tee', 'sneakers', 'pants'].some(k => name.includes(k))) {
    seasons.push('spring', 'summer', 'fall', 'winter');
  }
  
  // Default to transitional
  if (seasons.length === 0) {
    seasons.push('transitional');
  }
  
  return seasons;
}

/**
 * Determine outfit season
 */
function determineOutfitSeason(items: OutfitItem[]): Season {
  const seasonCounts: Record<Season, number> = {
    spring: 0,
    summer: 0,
    fall: 0,
    winter: 0,
    transitional: 0
  };
  
  for (const item of items) {
    const itemSeasons = detectItemSeason(item);
    for (const season of itemSeasons) {
      seasonCounts[season]++;
    }
  }
  
  // Find most common season (excluding transitional)
  const seasons: Season[] = ['winter', 'fall', 'spring', 'summer'];
  let maxCount = 0;
  let dominantSeason: Season = 'transitional';
  
  for (const season of seasons) {
    if (seasonCounts[season] > maxCount) {
      maxCount = seasonCounts[season];
      dominantSeason = season;
    }
  }
  
  return dominantSeason;
}

/**
 * Check seasonal compatibility
 */
export function checkSeasonalCompatibility(items: OutfitItem[]): SeasonalCheck {
  if (items.length === 0) {
    return {
      passed: true,
      season: 'transitional',
      conflicts: [],
      issues: [],
      suggestions: []
    };
  }
  
  const season = determineOutfitSeason(items);
  const conflicts: string[] = [];
  const issues: CompatibilityIssue[] = [];
  const suggestions: Suggestion[] = [];
  
  // Check for conflicting seasonal items
  for (const item of items) {
    const itemSeasons = detectItemSeason(item);
    
    // Check if item is appropriate for detected season
    if (!itemSeasons.includes(season) && !itemSeasons.includes('transitional')) {
      conflicts.push(item.name);
      
      issues.push({
        type: 'seasonal',
        severity: 'warning',
        message: `${item.name} might not be appropriate for ${season}`,
        affectedItems: [item],
        suggestion: `Consider a more ${season}-appropriate alternative`
      });
    }
  }
  
  // Specific conflict checks
  const itemNames = items.map(i => i.name.toLowerCase());
  
  // Heavy coat + shorts
  if (itemNames.some(n => ['coat', 'puffer'].some(k => n.includes(k))) &&
      itemNames.some(n => n.includes('shorts'))) {
    conflicts.push('Heavy coat with shorts');
    suggestions.push({
      type: 'coordination',
      title: 'Seasonal Mismatch',
      description: 'Heavy coat with shorts creates a seasonal conflict',
      requiresApproval: false
    });
  }
  
  // Tank top + scarf
  if (itemNames.some(n => n.includes('tank')) &&
      itemNames.some(n => n.includes('scarf'))) {
    conflicts.push('Tank top with scarf');
  }
  
  return {
    passed: conflicts.length === 0,
    season,
    conflicts,
    issues,
    suggestions
  };
}

