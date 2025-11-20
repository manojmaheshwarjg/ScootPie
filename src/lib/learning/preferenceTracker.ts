import type { OutfitItem, UserStylePreferences, Suggestion } from '@/types';
import { db } from '@/lib/db';
import { userStyleProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * User Preference Tracking and Learning System
 */

/**
 * Track user interaction with outfit
 */
export async function trackOutfitInteraction(
  userId: string,
  items: OutfitItem[],
  action: 'accepted' | 'rejected' | 'modified'
): Promise<void> {
  try {
    // Extract preferences from interaction
    const colors = new Set<string>();
    const categories = new Set<string>();
    const brands = new Set<string>();

    for (const item of items) {
      if (item.colors) {
        item.colors.forEach(c => colors.add(c));
      }
      if (item.category) {
        categories.add(item.category);
      }
      if (item.brand) {
        brands.add(item.brand);
      }
    }

    // Update user style profile
    await updateStyleProfile(userId, {
      colors: Array.from(colors),
      categories: Array.from(categories),
      brands: Array.from(brands),
      action
    });
  } catch (error) {
    console.error('[PreferenceTracker] Failed to track interaction:', error);
  }
}

/**
 * Track accepted suggestion
 */
export async function trackAcceptedSuggestion(
  userId: string,
  suggestion: Suggestion
): Promise<void> {
  if (suggestion.items) {
    await trackOutfitInteraction(userId, suggestion.items, 'accepted');
  }
}

/**
 * Track rejected suggestion
 */
export async function trackRejectedSuggestion(
  userId: string,
  suggestion: Suggestion
): Promise<void> {
  if (suggestion.items) {
    await trackOutfitInteraction(userId, suggestion.items, 'rejected');
  }
}

/**
 * Update style profile with new data
 */
async function updateStyleProfile(
  userId: string,
  data: {
    colors?: string[];
    categories?: string[];
    brands?: string[];
    action: 'accepted' | 'rejected' | 'modified';
  }
): Promise<void> {
  try {
    // Get existing profile
    const existing = await db.query.userStyleProfiles.findFirst({
      where: eq(userStyleProfiles.userId, userId)
    });

    if (!existing) {
      // Create new profile
      await db.insert(userStyleProfiles).values({
        userId,
        preferredCategories: data.categories ? Object.fromEntries(data.categories.map(c => [c, 1])) : {},
        colorPreferences: data.colors ? Object.fromEntries(data.colors.map(c => [c, 1])) : {},
        brandAffinities: data.brands ? Object.fromEntries(data.brands.map(b => [b, 1])) : {},
        updatedAt: new Date()
      });
    } else {
      // Update existing profile
      const updates: any = {
        updatedAt: new Date()
      };

      // Update color preferences
      if (data.colors && data.colors.length > 0) {
        const colorPrefs = (existing.colorPreferences as Record<string, number>) || {};
        const weight = data.action === 'accepted' ? 1 : data.action === 'rejected' ? -0.5 : 0.5;
        
        for (const color of data.colors) {
          colorPrefs[color] = (colorPrefs[color] || 0) + weight;
        }
        
        updates.colorPreferences = colorPrefs;
      }

      // Update brand affinities
      if (data.brands && data.brands.length > 0) {
        const brandAffs = (existing.brandAffinities as Record<string, number>) || {};
        const weight = data.action === 'accepted' ? 1 : data.action === 'rejected' ? -0.5 : 0.5;
        
        for (const brand of data.brands) {
          brandAffs[brand] = (brandAffs[brand] || 0) + weight;
        }
        
        updates.brandAffinities = brandAffs;
      }

      // Update preferred categories
      if (data.categories && data.categories.length > 0 && data.action === 'accepted') {
        const cats = (existing.preferredCategories as Record<string, number>) || {};
        const newCats: Record<string, number> = { ...cats };
        data.categories.forEach(cat => {
          newCats[cat] = (newCats[cat] || 0) + 1;
        });
        updates.preferredCategories = newCats;
      }

      await db.update(userStyleProfiles)
        .set(updates)
        .where(eq(userStyleProfiles.userId, userId));
    }
  } catch (error) {
    console.error('[PreferenceTracker] Failed to update style profile:', error);
  }
}

/**
 * Learn from frequently requested items
 */
export async function learnFromRequests(
  userId: string,
  requestedItems: string[]
): Promise<void> {
  // Track that user is interested in these items
  const categories = requestedItems.map(item => {
    const lower = item.toLowerCase();
    if (['jacket', 'coat'].some(k => lower.includes(k))) return 'outerwear';
    if (['jean', 'pants'].some(k => lower.includes(k))) return 'bottom';
    if (['shirt', 'top', 'blouse'].some(k => lower.includes(k))) return 'top';
    return 'other';
  }).filter(c => c !== 'other');

  if (categories.length > 0) {
    await updateStyleProfile(userId, {
      categories,
      action: 'modified'
    });
  }
}

/**
 * Track style transformation
 */
export async function trackStyleTransformation(
  userId: string,
  from: string,
  to: string
): Promise<void> {
  try {
    // Update style preference
    const existing = await db.query.userStyleProfiles.findFirst({
      where: eq(userStyleProfiles.userId, userId)
    });

    const styleMap: Record<string, string> = {
      'casual': 'casual',
      'formal': 'formal',
      'edgy': 'edgy',
      'bohemian': 'bohemian',
      'smart casual': 'smart_casual',
      'streetwear': 'streetwear'
    };

    const stylePreference = styleMap[to.toLowerCase()] || 'casual';

    if (existing) {
      await db.update(userStyleProfiles)
        .set({ 
          stylePreference,
          updatedAt: new Date()
        })
        .where(eq(userStyleProfiles.userId, userId));
    } else {
      await db.insert(userStyleProfiles).values({
        userId,
        stylePreference,
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('[PreferenceTracker] Failed to track style transformation:', error);
  }
}

/**
 * Get user preferences for recommendations
 */
export async function getUserPreferences(userId: string): Promise<UserStylePreferences> {
  try {
    const profile = await db.query.userStyleProfiles.findFirst({
      where: eq(userStyleProfiles.userId, userId)
    });

    if (!profile) {
      return {};
    }

    return {
      avoidedItems: (profile.avoidedItems as string[]) || [],
      favoriteColors: (profile.favoriteColors as string[]) || [],
      stylePreference: profile.stylePreference as any,
      formalityPreference: (profile.formalityPreference as any) || undefined,
      preferredCategories: (profile.preferredCategories as any) || {},
      brandAffinities: (profile.brandAffinities as Record<string, number>) || {},
      colorPreferences: (profile.colorPreferences as Record<string, number>) || {},
      priceSensitivity: profile.priceSensitivity ? parseFloat(profile.priceSensitivity as any) : undefined
    };
  } catch (error) {
    console.error('[PreferenceTracker] Failed to get user preferences:', error);
    return {};
  }
}

/**
 * Add item to avoided list
 */
export async function addToAvoidedItems(userId: string, itemName: string): Promise<void> {
  try {
    const existing = await db.query.userStyleProfiles.findFirst({
      where: eq(userStyleProfiles.userId, userId)
    });

    const avoided = existing?.avoidedItems as string[] || [];
    if (!avoided.includes(itemName)) {
      avoided.push(itemName);
      
      if (existing) {
        await db.update(userStyleProfiles)
          .set({ 
            avoidedItems: avoided,
            updatedAt: new Date()
          })
          .where(eq(userStyleProfiles.userId, userId));
      }
    }
  } catch (error) {
    console.error('[PreferenceTracker] Failed to add to avoided items:', error);
  }
}

/**
 * Add color to favorites
 */
export async function addToFavoriteColors(userId: string, color: string): Promise<void> {
  try {
    const existing = await db.query.userStyleProfiles.findFirst({
      where: eq(userStyleProfiles.userId, userId)
    });

    const favorites = existing?.favoriteColors as string[] || [];
    if (!favorites.includes(color)) {
      favorites.push(color);
      
      if (existing) {
        await db.update(userStyleProfiles)
          .set({ 
            favoriteColors: favorites,
            updatedAt: new Date()
          })
          .where(eq(userStyleProfiles.userId, userId));
      }
    }
  } catch (error) {
    console.error('[PreferenceTracker] Failed to add to favorite colors:', error);
  }
}

