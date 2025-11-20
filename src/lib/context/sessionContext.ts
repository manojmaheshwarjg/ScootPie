import type { ConversationContext, OutfitSnapshot, ClarificationContext, UserStylePreferences, OutfitItem } from '@/types';

/**
 * Conversation Context Manager
 * Manages outfit history, undo/redo, and session state
 */

export class SessionContext implements ConversationContext {
  conversationId: string;
  outfitHistory: OutfitSnapshot[];
  currentIndex: number;
  pendingClarification?: ClarificationContext;
  userPreferences: UserStylePreferences;
  sessionMetadata: Record<string, any>;

  constructor(conversationId: string, userPreferences: UserStylePreferences = {}) {
    this.conversationId = conversationId;
    this.outfitHistory = [];
    this.currentIndex = -1;
    this.userPreferences = userPreferences;
    this.sessionMetadata = {};
  }

  /**
   * Get current outfit items
   */
  getCurrentOutfit(): OutfitItem[] {
    if (this.currentIndex < 0 || this.currentIndex >= this.outfitHistory.length) {
      return [];
    }
    return this.outfitHistory[this.currentIndex].items;
  }

  /**
   * Get current snapshot
   */
  getCurrentSnapshot(): OutfitSnapshot | undefined {
    if (this.currentIndex < 0 || this.currentIndex >= this.outfitHistory.length) {
      return undefined;
    }
    return this.outfitHistory[this.currentIndex];
  }

  /**
   * Push new outfit snapshot
   */
  pushSnapshot(items: OutfitItem[], imageUrl?: string, messageId?: string): void {
    // If we're not at the end of history, remove everything after current index
    if (this.currentIndex < this.outfitHistory.length - 1) {
      this.outfitHistory = this.outfitHistory.slice(0, this.currentIndex + 1);
    }

    const snapshot: OutfitSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      conversationId: this.conversationId,
      messageId,
      outfitState: this.determineOutfitState(items),
      items,
      imageUrl,
      createdAt: new Date()
    };

    this.outfitHistory.push(snapshot);
    this.currentIndex = this.outfitHistory.length - 1;
  }

  /**
   * Undo to previous state
   */
  undo(): OutfitSnapshot | undefined {
    if (this.currentIndex <= 0) {
      return undefined; // Nothing to undo
    }

    this.currentIndex--;
    return this.outfitHistory[this.currentIndex];
  }

  /**
   * Redo to next state
   */
  redo(): OutfitSnapshot | undefined {
    if (this.currentIndex >= this.outfitHistory.length - 1) {
      return undefined; // Nothing to redo
    }

    this.currentIndex++;
    return this.outfitHistory[this.currentIndex];
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.currentIndex < this.outfitHistory.length - 1;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.outfitHistory = [];
    this.currentIndex = -1;
  }

  /**
   * Set pending clarification
   */
  setPendingClarification(context: ClarificationContext): void {
    this.pendingClarification = context;
  }

  /**
   * Clear pending clarification
   */
  clearPendingClarification(): void {
    this.pendingClarification = undefined;
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<UserStylePreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  /**
   * Get session metadata
   */
  getMetadata(key: string): any {
    return this.sessionMetadata[key];
  }

  /**
   * Set session metadata
   */
  setMetadata(key: string, value: any): void {
    this.sessionMetadata[key] = value;
  }

  /**
   * Determine outfit state type
   */
  private determineOutfitState(items: OutfitItem[]): 'separates' | 'one_piece' | 'layered' | 'empty' {
    if (items.length === 0) return 'empty';

    const hasOnePiece = items.some(item => item.zone === 'one_piece');
    if (hasOnePiece) return 'one_piece';

    const hasTop = items.some(item => item.zone === 'top');
    const hasBottom = items.some(item => item.zone === 'bottom');
    const hasOuterwear = items.some(item => item.zone === 'outerwear');

    if (hasTop && hasBottom) {
      if (hasOuterwear || items.filter(i => i.zone === 'top').length > 1) {
        return 'layered';
      }
      return 'separates';
    }

    return 'empty';
  }

  /**
   * Export session state
   */
  export(): object {
    return {
      conversationId: this.conversationId,
      outfitHistory: this.outfitHistory,
      currentIndex: this.currentIndex,
      pendingClarification: this.pendingClarification,
      userPreferences: this.userPreferences,
      sessionMetadata: this.sessionMetadata
    };
  }

  /**
   * Import session state
   */
  static import(data: any): SessionContext {
    const context = new SessionContext(data.conversationId, data.userPreferences);
    context.outfitHistory = data.outfitHistory || [];
    context.currentIndex = data.currentIndex ?? -1;
    context.pendingClarification = data.pendingClarification;
    context.sessionMetadata = data.sessionMetadata || {};
    return context;
  }
}

// In-memory session storage (for server-side)
const sessions = new Map<string, SessionContext>();

/**
 * Get or create session context
 */
export function getSessionContext(
  conversationId: string,
  userPreferences?: UserStylePreferences
): SessionContext {
  let context = sessions.get(conversationId);
  
  if (!context) {
    context = new SessionContext(conversationId, userPreferences);
    sessions.set(conversationId, context);
  } else if (userPreferences) {
    context.updateUserPreferences(userPreferences);
  }
  
  return context;
}

/**
 * Save session context
 */
export function saveSessionContext(context: SessionContext): void {
  sessions.set(context.conversationId, context);
}

/**
 * Delete session context
 */
export function deleteSessionContext(conversationId: string): void {
  sessions.delete(conversationId);
}

/**
 * Clear all sessions (for cleanup)
 */
export function clearAllSessions(): void {
  sessions.clear();
}

