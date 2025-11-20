import { ExtractedEntities } from '@/types';

export const entityExtractorPrompt = (userMessage: string): string => `
You are an AI fashion assistant. Extract all relevant fashion-related entities from the user's message.

Output Format (JSON):
{
  "garments": [{"name": "black jacket", "category": "outerwear", "brand": "", "color": "black", "style": [], "zone": "outerwear"}],
  "colors": ["black"],
  "brands": [],
  "styleDescriptors": [],
  "categories": ["outerwear"],
  "attributes": {},
  "layeringKeywords": [],
  "removalKeywords": []
}

User Message: "${userMessage}"

Return ONLY valid JSON. No prose.`;

export const parseExtractedEntities = (jsonString: string): ExtractedEntities | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.garments && Array.isArray(parsed.garments)) {
      return parsed as ExtractedEntities;
    }
    return null;
  } catch (error) {
    console.error("Error parsing extracted entities JSON:", error);
    return null;
  }
};
