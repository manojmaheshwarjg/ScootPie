import { generateContentWithRetry } from '@/lib/gemini/client';
import { requestClassifierPrompt, parseRequestClassification } from '@/lib/prompts/requestClassifier';
import { RequestClassification } from '@/types';
import { stylistLog } from './utils/stylistLogger';

export async function classifyUserRequest(userMessage: string): Promise<RequestClassification> {
  try {
    const prompt = requestClassifierPrompt(userMessage);
    stylistLog('RequestClassifier', '===== SYSTEM PROMPT =====');
    stylistLog('RequestClassifier', prompt);
    stylistLog('RequestClassifier', '===== END PROMPT =====');
    
    const response = await generateContentWithRetry('gemini-2.0-flash-exp', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    stylistLog('RequestClassifier', '===== GEMINI RESPONSE =====');
    stylistLog('RequestClassifier', text.substring(0, 500)); // First 500 chars
    stylistLog('RequestClassifier', '===== END RESPONSE =====');
    
    const jsonStr = text.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    const classification = parseRequestClassification(jsonStr);

    if (!classification) {
      stylistLog('RequestClassifier', 'Failed to parse classification');
      console.warn("Request Classifier: Failed to parse classification, returning default.", jsonStr);
      return {
        type: 'type_b_single_item',
        confidence: 0.5,
        extractedEntities: { garments: [], colors: [], brands: [], styleDescriptors: [], categories: [], attributes: {}, layeringKeywords: [], removalKeywords: [] },
        intent: "Could not determine specific intent.",
        layeringKeywords: [],
        removalKeywords: [],
        needsClarification: true,
        clarificationReason: "Could not parse request classification."
      };
    }
    stylistLog('RequestClassifier', 'Classification result:', { type: classification.type, confidence: classification.confidence, intent: classification.intent });
    return classification;
  } catch (error) {
    stylistLog('RequestClassifier', 'Error during classification:', error);
    console.error("Request Classifier: Error classifying request:", error);
    return {
      type: 'type_b_single_item',
      confidence: 0.0,
      extractedEntities: { garments: [], colors: [], brands: [], styleDescriptors: [], categories: [], attributes: {}, layeringKeywords: [], removalKeywords: [] },
      intent: "Error during classification.",
      layeringKeywords: [],
      removalKeywords: [],
      needsClarification: true,
      clarificationReason: "An error occurred during request classification."
    };
  }
}
