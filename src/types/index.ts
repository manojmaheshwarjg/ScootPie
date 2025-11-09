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
  createdAt: Date;
}

export interface SwipeCard {
  product: Product;
  tryOnImageUrl?: string;
  position: number;
}
