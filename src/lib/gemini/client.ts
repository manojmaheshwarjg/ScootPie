import { GoogleGenAI } from '@google/genai';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_DELAY = 1000; // 1 second

let ai: GoogleGenAI | null = null;

function getGeminiAIClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateContentWithRetry(
  modelName: string,
  request: any,
  retries = 0
): Promise<any> {
  try {
    const client = getGeminiAIClient();
    const result = await client.models.generateContent({
      model: modelName,
      ...request,
    });
    return result;
  } catch (error: any) {
    if (retries < MAX_RETRIES && (error.status === 429 || error.status >= 500)) {
      const delay = INITIAL_BACKOFF_DELAY * Math.pow(2, retries) + Math.random() * 1000;
      console.warn(`Gemini API rate limit or server error (${error.status}). Retrying in ${delay}ms... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(modelName, request, retries + 1);
    }
    console.error(`Failed to generate content after ${retries + 1} attempts:`, error);
    throw error;
  }
}
