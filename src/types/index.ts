export interface Product {
  id: string;
  externalId?: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  retailer: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  productUrl: string;
  description?: string;
  availableSizes?: string[];
  colors?: string[];
  inStock: boolean;
  trending?: boolean;
  isNew?: boolean;
  isEditorial?: boolean;
  // If true, the product came from an external search (e.g., SerpAPI) rather than our DB
  isExternal?: boolean;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  createdAt: Date;
  preferences?: UserPreferences;
  primaryPhotoId?: string;
}

export interface UserPreferences {
  sizes?: {
    top?: string;
    bottom?: string;
    shoes?: string;
  };
  budgetRange?: [number, number];
  styleQuizResponses?: Record<string, any>;
  gender?: 'men' | 'women' | 'unisex' | 'non-binary' | 'prefer-not-to-say';
}

export interface Photo {
  id: string;
  userId: string;
  url: string;
  isPrimary: boolean;
  uploadedAt: Date;
  metadata?: PhotoMetadata;
}

export interface PhotoMetadata {
  bodyTypeAnalysis?: Record<string, any>;
  dominantColors?: string[];
}

export interface Swipe {
  id: string;
  userId: string;
  productId: string;
  direction: 'left' | 'right' | 'up';
  swipedAt: Date;
  sessionId: string;
  cardPosition: number;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  items?: CollectionItem[];
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  productId: string;
  product?: Product;
  addedAt: Date;
  tryOnImageUrl?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  createdAt: Date;
  lastMessageAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  productRecommendations?: string[];
  outfitImageUrl?: string;
  outfitProducts?: OutfitItem[];
  clarificationContext?: ClarificationContext;
  requestType?: RequestType;
  outfitState?: OutfitStateType;
  createdAt: Date;
}

export interface SwipeCard {
  product: Product;
  tryOnImageUrl?: string;
  position: number;
}

// ===== Fashion AI Stylist Types =====

export type RequestType = 
  | 'type_a_complete_outfit'
  | 'type_b_single_item'
  | 'type_c_attribute_modification'
  | 'type_d_style_mood'
  | 'type_e_layering'
  | 'type_f_removal';

export type OutfitStateType = 'separates' | 'one_piece' | 'layered' | 'empty';

export type GarmentZone = 'top' | 'bottom' | 'outerwear' | 'footwear' | 'accessories' | 'one_piece';

export type FormalityLevel = 1 | 2 | 3 | 4 | 5;

export type PatternType = 'solid' | 'stripes' | 'polka_dots' | 'floral' | 'geometric' | 'animal_print';

export interface OutfitItem {
  name: string;
  imageUrl: string;
  productUrl: string;
  price?: number;
  currency?: string;
  brand?: string;
  retailer?: string;
  category?: string;
  zone?: GarmentZone;
  zIndex?: number; // For layering
  formalityLevel?: FormalityLevel;
  colors?: string[];
  pattern?: PatternType;
}

export interface RequestClassification {
  type: RequestType;
  confidence: number;
  extractedEntities: ExtractedEntities;
  intent: string;
  layeringKeywords: string[];
  removalKeywords: string[];
  needsClarification: boolean;
  clarificationReason?: string;
}

export interface ExtractedEntities {
  garments: ExtractedGarment[];
  colors: string[];
  brands: string[];
  styleDescriptors: string[];
  categories: string[];
  attributes: Record<string, string>;
}

export interface ExtractedGarment {
  name: string;
  category?: string;
  brand?: string;
  color?: string;
  style?: string[];
  zone?: GarmentZone;
}

export interface OutfitState {
  type: OutfitStateType;
  items: OutfitItem[];
  zones: Record<GarmentZone, OutfitItem[]>;
  layerCount: number;
  isComplete: boolean;
  missingZones: GarmentZone[];
}

export interface DecisionResult {
  action: 'execute' | 'clarify' | 'suggest';
  reasoning: string;
  itemsToAdd?: OutfitItem[];
  itemsToRemove?: OutfitItem[];
  itemsToReplace?: Array<{ old: OutfitItem; new: OutfitItem }>;
  clarificationQuestion?: ClarificationQuestion;
  suggestions?: Suggestion[];
  shouldRegenerateFromScratch: boolean;
}

export interface ClarificationContext {
  type: 'missing_info' | 'ambiguous' | 'conflict' | 'confirmation';
  question: string;
  options?: ClarificationOption[];
  pendingItems?: ExtractedGarment[];
  currentOutfit?: OutfitItem[];
  originalMessage: string;
  conversationId: string;
  timestamp: Date;
}

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  value: any;
  imageUrl?: string;
}

export interface ClarificationQuestion {
  question: string;
  options: ClarificationOption[];
  context: ClarificationContext;
}

export interface Suggestion {
  type: 'upgrade' | 'coordination' | 'style' | 'accessory';
  title: string;
  description: string;
  items?: OutfitItem[];
  beforeImage?: string;
  afterImage?: string;
  requiresApproval: boolean;
}

export interface CompatibilityCheck {
  passed: boolean;
  issues: CompatibilityIssue[];
  suggestions: Suggestion[];
}

export interface CompatibilityIssue {
  type: 'formality' | 'color' | 'pattern' | 'seasonal' | 'style';
  severity: 'warning' | 'error';
  message: string;
  affectedItems: OutfitItem[];
  suggestion?: string;
}

export interface FormalityCheck extends CompatibilityCheck {
  overallLevel: FormalityLevel;
  itemLevels: Record<string, FormalityLevel>;
  gap?: number;
}

export interface ColorCheck extends CompatibilityCheck {
  harmony: 'complementary' | 'analogous' | 'monochromatic' | 'clash';
  dominantColors: string[];
}

export interface PatternCheck extends CompatibilityCheck {
  patterns: PatternType[];
  mixingValid: boolean;
}

export interface SeasonalCheck extends CompatibilityCheck {
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'transitional';
  conflicts: string[];
}

export interface OutfitSnapshot {
  id: string;
  conversationId: string;
  messageId?: string;
  outfitState: OutfitStateType;
  items: OutfitItem[];
  imageUrl?: string;
  createdAt: Date;
}

export interface ConversationContext {
  conversationId: string;
  outfitHistory: OutfitSnapshot[];
  currentIndex: number;
  pendingClarification?: ClarificationContext;
  userPreferences: UserStylePreferences;
  sessionMetadata: Record<string, any>;
}

export interface UserStylePreferences {
  avoidedItems?: string[];
  favoriteColors?: string[];
  stylePreference?: 'casual' | 'formal' | 'edgy' | 'bohemian' | 'smart_casual' | 'streetwear';
  formalityPreference?: FormalityLevel;
  preferredCategories?: string[];
  brandAffinities?: Record<string, number>;
  colorPreferences?: Record<string, number>;
  priceSensitivity?: number;
}

export interface ResponseTemplate {
  type: 'confirmation' | 'clarification' | 'suggestion' | 'error';
  template: string;
  variables: Record<string, any>;
}

export interface ResponseContext {
  requestType: RequestType;
  outfitState: OutfitState;
  itemsChanged: OutfitItem[];
  compatibilityChecks: CompatibilityCheck[];
  userMessage: string;
}

export interface EdgeCaseScenario {
  type: 'incomplete_outfit' | 'impossible_combination' | 'ambiguous_name' | 'conflicting_instructions' | 'multiple_interpretations' | 'unknown_term';
  message: string;
  context: any;
}

export interface EdgeCaseResolution {
  resolved: boolean;
  action: 'clarify' | 'suggest' | 'error' | 'fallback';
  response: string;
  options?: ClarificationOption[];
}

export interface Sentiment {
  score: number; // -1 to 1
  label: 'negative' | 'neutral' | 'positive';
  indicators: string[];
}

export interface StyleTransformation {
  from: string;
  to: string;
  changes: Array<{ item: string; from: OutfitItem; to: OutfitItem }>;
  reasoning: string;
}
