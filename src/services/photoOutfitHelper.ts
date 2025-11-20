/**
 * Helper functions for working with photo-based outfit analysis
 */

import { OutfitItem } from '@/types';

export interface PhotoOutfitMetadata {
  items: Array<{
    name: string;
    category: string;
    zone?: string;
    color?: string;
    style?: string[];
    pattern?: string;
    brand?: string;
  }>;
  confidence: number;
  detectedZones: string[];
  analyzedAt: string;
}

/**
 * Convert stored photo outfit analysis to OutfitItem format
 */
export function photoOutfitToItems(metadata: PhotoOutfitMetadata | null | undefined): OutfitItem[] {
  if (!metadata || !metadata.items || metadata.items.length === 0) {
    return [];
  }

  return metadata.items.map(item => ({
    name: item.name,
    category: item.category,
    zone: (item.zone || item.category) as any,
    colors: item.color ? [item.color] : [],
    pattern: item.pattern || 'solid',
    brand: item.brand || '',
    style: item.style || [],
    imageUrl: '', // Photo items don't have product images
    productUrl: '',
    retailer: '',
  }));
}

/**
 * Check if photo has valid outfit analysis
 */
export function hasOutfitAnalysis(metadata: any): boolean {
  return !!(
    metadata?.outfitAnalysis &&
    metadata.outfitAnalysis.items &&
    Array.isArray(metadata.outfitAnalysis.items) &&
    metadata.outfitAnalysis.items.length > 0
  );
}

