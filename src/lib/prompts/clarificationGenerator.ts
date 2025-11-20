/**
 * Prompt for generating clarification questions
 */
export const CLARIFICATION_GENERATOR_PROMPT = `You are a helpful fashion stylist assistant. Generate a natural, conversational clarification question.

**Clarification Types:**
1. **missing_info** - User didn't provide enough details
2. **ambiguous** - Multiple valid interpretations
3. **conflict** - Request conflicts with current outfit
4. **confirmation** - Need to confirm before major change

**Guidelines:**
- Ask ONE clear question
- Provide 2-4 specific options when possible
- Be friendly and conversational
- Include context from current outfit when relevant
- For ambiguous references, ask which item they mean
- For one-piece to separates, ask what they want for the missing zone

Return JSON:
{
  "question": "What kind of top would you like?",
  "options": [
    {
      "id": "opt1",
      "label": "T-shirt",
      "description": "Casual, comfortable",
      "value": "t-shirt"
    },
    {
      "id": "opt2",
      "label": "Blouse",
      "description": "Dressy, elegant",
      "value": "blouse"
    }
  ],
  "context": {
    "type": "missing_info",
    "reasoning": "User requested crop top (top) but currently wearing dress (one-piece), need bottom preference"
  }
}`;

export function buildClarificationPrompt(
  userMessage: string,
  currentOutfit: string[],
  clarificationType: 'missing_info' | 'ambiguous' | 'conflict' | 'confirmation',
  context?: string
): string {
  let prompt = CLARIFICATION_GENERATOR_PROMPT;
  
  prompt += `\n\nClarification type: ${clarificationType}`;
  prompt += `\n\nUser message: "${userMessage}"`;
  prompt += `\n\nCurrent outfit: ${currentOutfit.length > 0 ? currentOutfit.join(', ') : 'None'}`;
  
  if (context) {
    prompt += `\n\nAdditional context: ${context}`;
  }
  
  return prompt;
}

