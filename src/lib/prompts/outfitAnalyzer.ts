import { OutfitState } from '@/types';

export const outfitAnalyzerPrompt = (currentOutfitItems: any[]): string => `
You are an AI fashion stylist. Analyze the current outfit and determine its state, occupied zones, and overall characteristics.

Current Outfit Items:
${JSON.stringify(currentOutfitItems, null, 2)}

Output Format (JSON):
{
  "type": "separates" | "one_piece" | "layered" | "empty",
  "items": [/* same as input, with inferred zones */],
  "zones": {
    "top": [],
    "bottom": [],
    "one_piece": [],
    "outerwear": [],
    "footwear": [],
    "accessories": []
  },
  "layerCount": 3,
  "isComplete": true,
  "missingZones": [],
  "overallFormality": 3,
  "dominantColors": ["black", "white"],
  "dominantPatterns": ["solid"],
  "styleDescriptors": ["casual"]
}

Return ONLY valid JSON. No prose.`;

export const parseOutfitState = (jsonString: string): OutfitState | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed.type === 'string' && Array.isArray(parsed.items) && parsed.zones) {
      return parsed as OutfitState;
    }
    return null;
  } catch (error) {
    console.error("Error parsing outfit state JSON:", error);
    return null;
  }
};
