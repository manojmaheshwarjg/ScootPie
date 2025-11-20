import { generateContentWithRetry } from '@/lib/gemini/client';
import { entityExtractorPrompt, parseExtractedEntities } from '@/lib/prompts/entityExtractor';
import { ExtractedEntities } from '@/types';

export async function extractEntities(userMessage: string): Promise<ExtractedEntities> {
  try {
    const prompt = entityExtractorPrompt(userMessage);
    const response = await generateContentWithRetry('gemini-2.0-flash-exp', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    const parsed = parseExtractedEntities(jsonStr);

    if (!parsed) {
      console.warn("NLP Service: Failed to parse extracted entities, returning empty.", jsonStr);
      return { garments: [], colors: [], brands: [], styleDescriptors: [], categories: [], attributes: {} } as any;
    }
    return parsed;
  } catch (error) {
    console.error("NLP Service: Error extracting entities:", error);
    return { garments: [], colors: [], brands: [], styleDescriptors: [], categories: [], attributes: {} } as any;
  }
}
