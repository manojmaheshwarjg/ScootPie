

export interface UserPhoto {
  id: string;
  data: string; // base64
  isPrimary: boolean;
  gender?: 'mens' | 'womens' | 'unisex';
}

export type ProductCategory = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'one-piece' | 'accessory';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: string;
  url?: string;
  imageUrl?: string; // Thumbnail from search OR base64 from closet
  description: string;
  category: ProductCategory;
  source?: 'search' | 'closet' | 'generated'; // Track origin
  color?: string; // Helper for AI matching
}

export interface TryOnResult {
  id: string;
  userPhotoId?: string; // Link to specific model
  productId: string; // The "main" new item
  product: Product;
  outfit: Product[]; // All items in this look
  imageUrl: string; // Generated image
  timestamp: number;
  videoUrl?: string; // URL for Veo generated video
  videoStatus?: 'idle' | 'generating' | 'complete' | 'error';
  isSaved?: boolean; // Track if explicitly saved to Lookbook
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  relatedTryOnIds?: string[];
  attachments?: TryOnResult[]; // Generated Looks (Model)
  userAttachments?: Product[]; // Closet Items (User)
  isThinking?: boolean;
  groundingMetadata?: any; // For search sources
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
  previewText?: string;
}

export enum AppView {
  ONBOARDING = 'ONBOARDING',
  STUDIO = 'STUDIO', // Renamed STYLIST to STUDIO for clarity in code, though UI text handles the distinction
  CHAT = 'CHAT',     // New dedicated chat view
  WARDROBE = 'WARDROBE',
  INSPIRATION = 'INSPIRATION', // "Steal the Look" feature
  DISCOVER = 'DISCOVER', // New "Tinder for Clothes" feature
  THREE_D = 'THREE_D', // New 3D Try On View
}

// Types for "Steal the Look" feature
export interface TierProduct {
  name: string;
  brand: string;
  price: string;
  description?: string;
}

export interface InspirationItem {
  category: string;
  luxury: TierProduct;
  mid: TierProduct;
  budget: TierProduct;
}

export interface InspirationAnalysis {
  totalCost: {
    luxury: string;
    mid: string;
    budget: string;
  };
  items: InspirationItem[];
}


// Map category to product
export type OutfitState = Partial<Record<ProductCategory, Product>>;

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}