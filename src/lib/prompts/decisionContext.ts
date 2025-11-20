import type { CompatibilityCheck, DecisionResult, OutfitState, RequestClassification } from '@/types';

function formatObject(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === '') return null;
      if (Array.isArray(value)) {
        return value.length > 0 ? `- ${key}: ${value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}` : null;
      }
      if (typeof value === 'object') {
        return `- ${key}: ${JSON.stringify(value)}`;
      }
      return `- ${key}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');
}

export class DecisionContextBuilder {
  private sections: string[] = [];

  addSection(title: string, content: string): void {
    if (!content) return;
    this.sections.push(`${title}:\n${content}`.trim());
  }

  addClassification(classification: RequestClassification, userMessage: string): void {
    this.addSection('Request Classification', formatObject({
      userMessage,
      requestType: classification.type,
      confidence: classification.confidence,
      intent: classification.intent,
      garments: classification.extractedEntities.garments?.map((g) => g.name),
      colors: classification.extractedEntities.colors,
      styleDescriptors: classification.extractedEntities.styleDescriptors,
      layeringKeywords: classification.layeringKeywords,
      removalKeywords: classification.removalKeywords,
    }));
  }

  addOutfitState(state: OutfitState, label = 'Current Outfit State'): void {
    this.addSection(label, formatObject({
      state: state.type,
      layerCount: state.layerCount,
      isComplete: state.isComplete,
      missingZones: state.missingZones,
      styleDescriptors: (state as any).styleDescriptors,
      dominantColors: (state as any).dominantColors,
      dominantPatterns: (state as any).dominantPatterns,
      items: state.items.map((item) => `${item.name} (${item.category || 'unknown'})`),
    }));
  }

  addDecision(decision: DecisionResult): void {
    const decisionData: Record<string, unknown> = {
      action: decision.action,
      reasoning: decision.reasoning,
      itemsToAdd: decision.itemsToAdd?.map((item) => item.name),
      shouldRegenerateFromScratch: decision.shouldRegenerateFromScratch,
      suggestions: decision.suggestions?.map((suggestion) => suggestion.title),
    };
    
    // Explicitly highlight items to remove for replacement operations
    // Format itemsToRemove in bracket notation for easier parsing in try-on
    if (decision.itemsToRemove && decision.itemsToRemove.length > 0) {
      const itemsToRemoveNames = decision.itemsToRemove.map((item) => item.name);
      // Format as bracket notation that matches try-on regex: itemsToRemove: [item1, item2]
      // Store as string so formatObject doesn't treat it as an array
      decisionData.itemsToRemove = `[${itemsToRemoveNames.map(name => `"${name}"`).join(', ')}]`;
      decisionData.replacementOperation = true;
      decisionData.replacementInstruction = `REMOVE these items completely: ${itemsToRemoveNames.join(', ')}. They should NOT be visible in the final try-on image.`;
    }
    
    // Build decision result section manually to ensure itemsToRemove format is preserved
    const decisionSection = formatObject(decisionData);
    this.addSection('Decision Result', decisionSection);
    
    // Also add explicit itemsToRemove line for easier parsing (in addition to formatted version)
    if (decision.itemsToRemove && decision.itemsToRemove.length > 0) {
      const itemsToRemoveNames = decision.itemsToRemove.map((item) => item.name);
      const explicitLine = `\nitemsToRemove: [${itemsToRemoveNames.map(name => `"${name}"`).join(', ')}]`;
      this.sections[this.sections.length - 1] += explicitLine;
    }
  }

  addCompatibility(checks: CompatibilityCheck[]): void {
    if (!checks || checks.length === 0) return;
    const summary = checks.map((check) => {
      const issues = check.issues?.map((issue) => `${issue.type}: ${issue.message}`).join('; ');
      return `- ${(check as any).type || 'compatibility'}: ${check.passed ? 'passed' : 'needs attention'}${issues ? ` (${issues})` : ''}`;
    }).join('\n');
    this.addSection('Compatibility Checks', summary);
  }

  addClarification(question: string, options: string[]): void {
    this.addSection('Clarification Requested', `${question}\nOptions: ${options.join(', ')}`);
  }

  toString(): string {
    return this.sections.join('\n\n');
  }
}

