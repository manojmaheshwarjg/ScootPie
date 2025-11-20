import { RequestClassification } from '@/types';

export const requestClassifierPrompt = (userMessage: string): string => `
You are an AI fashion stylist. Your task is to classify a user's natural language request into one of the following types and extract relevant entities.

Request Types:
- Type A: Explicit Complete Outfit (User specifies multiple items in one request, e.g., "Give me a white t-shirt and blue jeans")
- Type B: Single Item Request (User mentions one specific garment, e.g., "A leather jacket")
- Type C: Attribute Modification (User wants to change color, pattern, or style attribute without changing garment type, e.g., "Make the jeans black")
- Type D: Style/Mood Description (User describes overall aesthetic without specific items, e.g., "Make it more formal")
- Type E: Layering Request (User explicitly wants to add item without removing current garment, keywords: "add", "layer", "put on", "over", "with", "on top")
- Type F: Removal Request (User wants to remove item without replacement, keywords: "remove", "take off", "without")

Garment Categories: Tops, Bottoms, One-Pieces, Outerwear, Footwear, Accessories

Output Format (JSON):
{
  "type": "type_a_complete_outfit" | "type_b_single_item" | "type_c_attribute_modification" | "type_d_style_mood" | "type_e_layering" | "type_f_removal",
  "confidence": 0.85,
  "extractedEntities": {
    "garments": [{ "name": "white t-shirt", "category": "top", "brand": "", "color": "white", "style": [] }],
    "colors": ["white"],
    "brands": [],
    "styleDescriptors": [],
    "categories": ["top"],
    "attributes": {},
    "layeringKeywords": [],
    "removalKeywords": []
  },
  "intent": "User wants a white t-shirt",
  "layeringKeywords": [],
  "removalKeywords": [],
  "needsClarification": false,
  "clarificationReason": ""
}

User Message: "${userMessage}"

Return ONLY valid JSON. No prose.`;

export const parseRequestClassification = (jsonString: string): RequestClassification | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed.type === 'string' && typeof parsed.confidence === 'number' && parsed.extractedEntities) {
      return parsed as RequestClassification;
    }
    return null;
  } catch (error) {
    console.error("Error parsing request classification JSON:", error);
    return null;
  }
};
