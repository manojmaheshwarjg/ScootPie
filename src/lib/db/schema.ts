import { pgTable, uuid, varchar, timestamp, boolean, text, decimal, integer, jsonb, vector, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('app_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  preferences: jsonb('preferences').$type<{
    sizes?: { top?: string; bottom?: string; shoes?: string };
    budgetRange?: [number, number];
    styleQuizResponses?: Record<string, any>;
    gender?: 'men' | 'women' | 'unisex' | 'non-binary' | 'prefer-not-to-say';
  }>(),
  primaryPhotoId: uuid('primary_photo_id'),
});

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<{
    bodyTypeAnalysis?: Record<string, any>;
    dominantColors?: string[];
    outfitAnalysis?: {
      items: Array<{
        name: string;
        category: string;
        zone?: string;
        color?: string;
        style?: string[];
        pattern?: string;
        brand?: string;
      }>;
      confidence: number;
      detectedZones: string[];
      analyzedAt: string;
    };
  }>(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: varchar('external_id', { length: 255 }),
  name: varchar('name', { length: 512 }).notNull(),
  brand: varchar('brand', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  retailer: varchar('retailer', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  subcategory: varchar('subcategory', { length: 100 }),
  imageUrl: varchar('image_url', { length: 512 }).notNull(),
  productUrl: varchar('product_url', { length: 512 }).notNull(),
  description: text('description'),
  availableSizes: jsonb('available_sizes').$type<string[]>(),
  colors: jsonb('colors').$type<string[]>(),
  inStock: boolean('in_stock').default(true).notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  metadata: jsonb('metadata'),
  trending: boolean('trending').default(false).notNull(),
  isNew: boolean('is_new').default(false).notNull(),
  isEditorial: boolean('is_editorial').default(false).notNull(),
});

export const swipes = pgTable('swipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  direction: varchar('direction', { length: 10 }).notNull().$type<'left' | 'right' | 'up'>(),
  swipedAt: timestamp('swiped_at').defaultNow().notNull(),
  sessionId: uuid('session_id').notNull(),
  cardPosition: integer('card_position').notNull(),
});

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const collectionItems = pgTable('collection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  tryOnImageUrl: text('try_on_image_url'),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().$type<'user' | 'assistant'>(),
  content: text('content').notNull(),
  productRecommendations: jsonb('product_recommendations').$type<string[]>(),
  // Persisted virtual try-on image for assistant messages
  outfitImageUrl: text('outfit_image_url'),
  // Persisted outfit products/cards for assistant messages
  outfitProducts: jsonb('outfit_products').$type<Array<{
    name: string;
    imageUrl: string;
    productUrl: string;
    price?: number;
    currency?: string;
    brand?: string;
    retailer?: string;
    category?: string;
  }>>(),
  // Fashion AI Stylist fields
  clarificationContext: jsonb('clarification_context'),
  requestType: varchar('request_type', { length: 50 }),
  outfitState: varchar('outfit_state', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// NOTE: tryOnCache is used as a write-through cache for virtual try-ons.
// Eviction policy is handled at the application level (see scripts/ or cron jobs).
export const tryOnCache = pgTable('try_on_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  photoId: uuid('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  // For in-database products we use productId; for external/ephemeral products we rely on externalProductKey
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  // Stable key for non-DB products (e.g. retailer + normalized product URL)
  externalProductKey: varchar('external_product_key', { length: 512 }),
  // Stored URL or data URL for the generated image
  generatedImageUrl: text('generated_image_url').notNull(),
  // Model + prompt version used for generation
  modelVersion: varchar('model_version', { length: 128 }).default('gemini-2.5-flash-image').notNull(),
  paramsHash: varchar('params_hash', { length: 255 }).default('v1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  // Main uniqueness constraint for cache lookups; NULLs are allowed for either productId or externalProductKey
  uniqueUserPhotoProduct: unique().on(
    table.userId,
    table.photoId,
    table.productId,
    table.externalProductKey,
    table.modelVersion,
    table.paramsHash,
  ),
}));

export const userStyleProfiles = pgTable('user_style_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  styleVector: vector('style_vector', { dimensions: 384 }),
  preferredCategories: jsonb('preferred_categories').$type<Record<string, number>>(),
  priceSensitivity: decimal('price_sensitivity', { precision: 3, scale: 2 }),
  colorPreferences: jsonb('color_preferences').$type<Record<string, number>>(),
  brandAffinities: jsonb('brand_affinities').$type<Record<string, number>>(),
  // Fashion AI Stylist preference fields
  avoidedItems: jsonb('avoided_items').$type<string[]>(),
  favoriteColors: jsonb('favorite_colors').$type<string[]>(),
  stylePreference: varchar('style_preference', { length: 50 }),
  formalityPreference: integer('formality_preference'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Fashion AI Stylist: Outfit History table for undo/redo
export const outfitHistory = pgTable('outfit_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
  outfitState: varchar('outfit_state', { length: 50 }),
  items: jsonb('items').notNull().$type<Array<{
    name: string;
    imageUrl: string;
    productUrl: string;
    price?: number;
    currency?: string;
    brand?: string;
    retailer?: string;
    category?: string;
    zone?: string;
    zIndex?: number;
  }>>(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  photos: many(photos),
  swipes: many(swipes),
  collections: many(collections),
  conversations: many(conversations),
  styleProfile: one(userStyleProfiles),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  user: one(users, { fields: [photos.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  swipes: many(swipes),
  collectionItems: many(collectionItems),
}));

export const swipesRelations = relations(swipes, ({ one }) => ({
  user: one(users, { fields: [swipes.userId], references: [users.id] }),
  product: one(products, { fields: [swipes.productId], references: [products.id] }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  items: many(collectionItems),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, { fields: [collectionItems.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionItems.productId], references: [products.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
  outfitHistory: many(outfitHistory),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const userStyleProfilesRelations = relations(userStyleProfiles, ({ one }) => ({
  user: one(users, { fields: [userStyleProfiles.userId], references: [users.id] }),
}));

export const outfitHistoryRelations = relations(outfitHistory, ({ one }) => ({
  conversation: one(conversations, { fields: [outfitHistory.conversationId], references: [conversations.id] }),
  message: one(messages, { fields: [outfitHistory.messageId], references: [messages.id] }),
}));
