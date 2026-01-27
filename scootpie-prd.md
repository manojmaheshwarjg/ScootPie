# Scootpie - Product Requirements Document

## 1. Product Overview

**Product Name:** Scootpie  
**Platform:** Web Application  
**Core Value Prop:** AI-powered personal shopping assistant that lets users discover and virtually try on fashion items through conversational styling, swipeable cards, and curated feeds.

**Key Differentiators:**
- All product discovery happens through virtual try-on with user's own photos
- Multi-retailer aggregation (no single store lock-in)
- Continuous learning from user behavior (swipes + chat + feed interactions)
- Conversational styling integrated throughout the experience

---

## 2. Core Features Breakdown

### 2.1 User Onboarding

#### Photo Upload
- Users can upload multiple photos (minimum 1, recommended 3-5)
- Accepted formats: JPG, PNG, HEIC
- Image requirements:
  - Full body or upper body shots
  - Clear visibility, good lighting
  - Neutral background preferred but not required
  - Face visible (for accurate try-on generation)
- Photo management:
  - Users can add/delete photos anytime
  - Mark one as "primary" (default for try-ons)
  - All photos stored and can be used for different try-on contexts

#### Optional Style Quiz (Skippable)
- 5-7 quick questions:
  - Body type preferences (how they'd describe their body)
  - Style preferences (casual, formal, streetwear, etc.)
  - Budget range
  - Favorite colors
  - Shopping frequency
  - Occasions they shop for
- Skip button prominent on every question
- Data used to seed initial recommendations if provided

#### Initial Profile Setup
- Basic info: Name, size preferences (S/M/L or numeric)
- Optional: Age range, location (for weather-appropriate suggestions)

---

### 2.2 Swipe Mode (Primary Discovery)

#### Card Generation Logic
- Generate 15 cards per batch
- First batch strategy (cold start):
  - If quiz completed: 60% based on quiz preferences, 40% diverse/exploratory
  - If quiz skipped: Equal distribution across style categories (casual, formal, streetwear, athleisure, etc.)
  - Use photo analysis for body type and visible style cues
- Subsequent batches:
  - Based on swipe history, chat interactions, feed engagement
  - 70% personalized, 30% exploratory (prevent filter bubble)

#### Card Content
- Virtual try-on image (user's photo + product)
- Product name
- Brand
- Price
- Retailer name
- Quick product details (color, material)
- "View Details" button (expands to full product page overlay)

#### Swipe Actions

**Swipe Right / Heart:** Save to "Likes" collection
- Triggers: Product saved, feeds learning algorithm
- Auto-generate related items in next batch

**Swipe Left / X:** Dislike
- Triggers: Item removed, negative signal to algorithm
- Track reason implicitly (color, style, price range analysis)

**Swipe Up / Star:** Super Like
- Triggers: Highest priority signal to algorithm
- May prompt: "What do you love about this?" (optional quick response)

**Tap Card:** View full details
- Overlay with:
  - Larger try-on image
  - Full product description
  - Size guide
  - Available sizes/colors
  - "Buy Now" button (affiliate link)
  - "Save to Collection" button
  - "Ask AI about this" button (opens chat with product context)

#### Left Swipe Intervention
- After 15 continuous left swipes:
  - Pause card stack
  - Show prompt: "Help me understand your style better"
  - Quick multi-choice questions:
    - What's not working? (too formal, too casual, wrong colors, budget too high, don't like the fit)
    - What would you prefer instead? (show style category options)
    - Budget preference? (slider)
  - "Reset and show new styles" button
  - Regenerate next 15 cards based on feedback

#### Card Prefetching/Generation
- Generate first 15 cards immediately on session start
- Start generating next batch when user reaches card 10
- Display loading state if generation isn't complete by card 15
- Cache try-on images for 7 days (if same product/photo combo requested again)

---

### 2.3 Collections (Liked Items)

#### Organization
- Default "Likes" collection (all right swipes)
- Users can create custom collections:
  - "Work outfits"
  - "Date night"
  - "Summer wardrobe"
  - etc.
- Move/copy items between collections
- Each item shows:
  - Try-on image thumbnail
  - Product name, price
  - Date saved
  - Retailer
  - Availability status (in stock/out of stock)

#### Actions on Liked Items
- Re-view full details
- "Buy Now"
- "Find Similar" (generates new cards based on this item)
- "Style This" (opens chat with this item as context)
- Remove from collection
- Share (copy link - future: social sharing)

---

### 2.4 Conversational Styling (Chat)

#### Access Points
- Dedicated Chat tab in navigation
- Floating chat icon (bottom right) available on all pages
- Contextual triggers:
  - After 3+ right swipes on similar style: "I notice you're loving [style type]. Want help finding more?"
  - After viewing item details: "Ask AI about this" button
  - After left swipe intervention: "Let's chat about what you're looking for"

#### Chat Capabilities

**Query Understanding:**
- Natural language understanding for fashion requests
  - "I need a dress for a beach wedding"
  - "Show me affordable work blazers"
  - "What should I wear with these jeans I liked?"
  - "I'm going to Paris in spring, help me pack"

**Context Awareness:**
- Access to user's complete history:
  - All liked items
  - Swipe patterns
  - Quiz responses
  - Previous chat conversations
  - Photo(s) on file
- Reference specific items: "The blue dress you saved yesterday would work for that"

**Responses:**
- Text explanation + product recommendations
- All recommendations show as virtual try-on cards
- Can generate 3-5 try-on options per chat response
- Conversational follow-ups encouraged

**Proactive Suggestions:**
- After significant swipe activity: "Based on what you're liking, should I find [specific item type]?"
- Seasonal: "It's getting cold - want to explore winter coats?"
- Occasion-based: "Planning for holiday parties? I can help you find outfits"

#### Chat UI

**Separate tab:** Full-screen chat interface
- Message history persists
- Product cards inline with conversation
- Each product card tappable → full details

**Floating overlay:** Slide-up drawer (50% screen height)
- Quick access without leaving current view
- Minimize to floating icon
- Product cards shown as horizontal scroll within chat

#### Memory & Personalization
- All conversations stored
- Build user style profile over time
- Remember:
  - Size preferences
  - Budget sensitivity
  - Style evolution
  - Occasions they shop for
  - Color preferences
  - Brands they like/dislike

---

### 2.5 Feed Mode

#### Feed Composition
Feed is a scrolling list of product cards (Pinterest-style grid), each showing virtual try-on with user's photo.

#### Content Sources (Priority Order):

**1. Personalized Recommendations (40%)**
- Based on user's likes, swipe patterns, chat history
- Items similar to saved items
- Complementary pieces to liked items

**2. Trending Items (30%)**
- Most saved/purchased across all Scootpie users (last 7 days)
- Seasonal trends
- Celebrity/influencer inspired (if data available)
- Show "🔥 Trending" badge

**3. Curated Editorial (20%)**
- Hand-picked by Scootpie team or AI curation
- Styled looks (complete outfits)
- "Outfit of the Day"
- Show "✨ Editor's Pick" badge

**4. New Arrivals (10%)**
- Newly added products from retailers
- Filtered by user's style preferences
- Show "New" badge

#### Feed Interactions
- Tap card → Full product overlay (same as swipe mode)
- Heart icon → Save to Likes
- Three-dot menu → "Not interested", "Save to Collection", "Ask AI about this"
- "Find Similar" button on each card
- All interactions feed the learning algorithm

#### Feed Refresh
- Pull to refresh for new content
- Infinite scroll
- Smart refresh: Mix of new items + resurfaced older items they might have missed

---

### 2.6 Virtual Try-On System

#### Technical Flow
1. User photo(s) + product image → Virtual try-on AI model
2. Generate composite image showing product on user
3. Cache result (user_id + photo_id + product_id)

#### Try-On Quality Requirements
- Accurate body shape preservation
- Realistic draping and fit
- Proper scaling (product should look proportional)
- Lighting consistency
- Handle different poses (front, side, sitting if photo supports)

#### Fallback Handling
- If try-on generation fails: Show product image with "Try-on unavailable" message
- If generation is slow: Show loading skeleton with product thumbnail

---

## 3. User Flows

### 3.1 First-Time User Flow
```
1. Landing page → Sign up
2. Upload photo(s) → Explain why (try-on feature)
3. Optional style quiz → Skip button visible
4. Profile basics (sizes)
5. → Launch into Swipe mode (first 15 cards generating)
6. Loading state (3-5 seconds)
7. → Start swiping
```

### 3.2 Returning User Flow
```
1. Login → Dashboard
2. Default view: Swipe mode with fresh 15 cards
   OR
   Continue chat if they left mid-conversation
   OR
   Feed if that was their last view
```

### 3.3 Swipe → Purchase Flow
```
1. Swipe right on item
2. (Optional) Tap to view details
3. Click "Buy Now"
4. → External retailer site (new tab/window)
5. Affiliate tracking pixel fires
6. (Future) Return to Scootpie, mark as purchased
```

### 3.4 Chat → Discovery Flow
```
1. User opens chat: "I need office wear"
2. AI responds with text + 3-5 try-on cards
3. User taps card → Full details
4. User: "Show me more like the first one"
5. AI generates more variations
6. User saves multiple to "Work" collection
```

---

## 4. Navigation & IA

### Primary Navigation (Top or Side Bar)
- **Swipe** (default/home)
- **Collections** (heart icon)
- **Feed** (grid icon)
- **Chat** (message icon - badge if proactive suggestion waiting)
- **Profile/Settings** (avatar icon)

### Floating Elements
- Chat bubble (always accessible, bottom right)
- Back to top (on feed)

### Profile/Settings Section
- My Photos (manage uploaded photos)
- Style Preferences (edit quiz responses)
- Sizes (update measurements)
- Purchase History (if tracked)
- Notifications (email preferences)
- Account (email, password, delete account)

---

## 5. Technical Architecture

### 5.1 System Components

```
┌─────────────────────────────────────────────────┐
│              Frontend (Next.js)                  │
│  - Swipe Interface  - Chat UI  - Feed Grid      │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│         API Layer (Next.js API Routes)           │
│  - User Management  - Product Data  - AI Routing│
└─────────────┬───────────────────────────────────┘
              │
    ┌─────────┴─────────┬─────────────┬───────────┐
    ▼                   ▼             ▼           ▼
┌────────┐      ┌──────────┐   ┌──────────┐  ┌──────────┐
│Database│      │Virtual   │   │LLM API   │  │Product   │
│(Postgres│     │Try-On    │   │(Anthropic│  │APIs      │
│+ Vector)│     │Service   │   │Claude)   │  │(Amazon,  │
└────────┘      └──────────┘   └──────────┘  │etc.)     │
                                              └──────────┘
```

### 5.2 Data Models

#### Users
```typescript
User {
  id: uuid
  email: string
  name: string
  created_at: timestamp
  preferences: {
    sizes: { top, bottom, shoes }
    budget_range: [min, max]
    style_quiz_responses: json
  }
  photos: Photo[]
  primary_photo_id: uuid
}
```

#### Photos
```typescript
Photo {
  id: uuid
  user_id: uuid
  url: string
  is_primary: boolean
  uploaded_at: timestamp
  metadata: {
    body_type_analysis: json
    dominant_colors: string[]
  }
}
```

#### Products
```typescript
Product {
  id: uuid
  external_id: string // retailer's ID
  name: string
  brand: string
  price: decimal
  currency: string
  retailer: string
  category: string
  subcategory: string
  image_url: string
  product_url: string
  description: text
  available_sizes: string[]
  colors: string[]
  in_stock: boolean
  last_updated: timestamp
  metadata: json
}
```

#### Swipes
```typescript
Swipe {
  id: uuid
  user_id: uuid
  product_id: uuid
  direction: enum('left', 'right', 'up')
  swiped_at: timestamp
  session_id: uuid
  card_position: int // which card in the batch
}
```

#### Collections
```typescript
Collection {
  id: uuid
  user_id: uuid
  name: string
  created_at: timestamp
}

CollectionItem {
  id: uuid
  collection_id: uuid
  product_id: uuid
  added_at: timestamp
  try_on_image_url: string // cached
}
```

#### Conversations
```typescript
Conversation {
  id: uuid
  user_id: uuid
  created_at: timestamp
  last_message_at: timestamp
}

Message {
  id: uuid
  conversation_id: uuid
  role: enum('user', 'assistant')
  content: text
  product_recommendations: uuid[] // product_ids
  created_at: timestamp
}
```

#### TryOnCache
```typescript
TryOnCache {
  id: uuid
  user_id: uuid
  photo_id: uuid
  product_id: uuid
  generated_image_url: string
  created_at: timestamp
  expires_at: timestamp // created_at + 7 days
}
```

#### UserProfile (Derived/ML)
```typescript
UserStyleProfile {
  user_id: uuid
  style_vector: float[] // embedding for similarity search
  preferred_categories: json
  price_sensitivity: float
  color_preferences: json
  brand_affinities: json
  updated_at: timestamp
}
```

---

## 6. Recommended Tech Stack

### 6.1 Frontend

**Framework:** Next.js 14+ (App Router)
- Reason: SSR for SEO, API routes, excellent DX, Vercel deployment

**UI Components:**
- Shadcn/ui (accessible, customizable)
- Tailwind CSS (styling)
- Framer Motion (animations for swipe, transitions)

**State Management:**
- Zustand (lightweight, perfect for client state)
- TanStack Query (React Query) for server state

**Swipe Implementation:**
- react-tinder-card or custom implementation with Framer Motion
- Gesture handling: react-use-gesture

**Chat UI:**
- Custom implementation with react-markdown for formatting
- Auto-scroll, typing indicators

**Image Optimization:**
- Next.js Image component
- Sharp for server-side processing

---

### 6.2 Backend

**API:** Next.js API Routes (Node.js)
- Co-located with frontend
- Edge functions for performance-critical routes

**Database:** PostgreSQL (Primary) + pgvector
- Reason: 
  - Robust relational data (users, products, swipes)
  - pgvector extension for semantic search on style embeddings
  - Excellent Next.js integration

**Hosting Suggestion:** Supabase or Neon
- Managed Postgres with vector support
- Built-in auth (optional)
- Good free tier

**Cache/Queue:**
- Redis (Upstash recommended)
  - Cache try-on images
  - Session management
  - Rate limiting
- BullMQ for job queuing (batch try-on generation)

**File Storage:**
- Cloudflare R2 or AWS S3
  - User photos
  - Generated try-on images
- CDN: Cloudflare (if using R2) or CloudFront

---

### 6.3 AI/ML Services

**LLM for Chat:** Anthropic Claude API
- Model: Claude Sonnet 4.5 (best balance of speed/quality)
- Reason: Excellent instruction following, context window, fast
- Fallback: Claude 4 Opus for complex styling questions

**Virtual Try-On:** Multiple options, evaluate:

**Option 1: IDM-VTON or similar (self-hosted)**
- Pros: Full control, no per-image cost
- Cons: Need GPU infrastructure, maintenance
- Stack: Modal, RunPod, or Replicate for GPU hosting

**Option 2: Commercial API**
- Fashn AI
- Revery AI  
- Pros: Easy integration, good results
- Cons: Per-image cost ($0.10-0.50)

**Recommendation for MVP:** Start with commercial API (faster to market), migrate to self-hosted if cost/volume justifies

**Product Embeddings:**
- Generate embeddings for products (text + image)
- OpenAI CLIP or custom fashion model
- Store in pgvector for similarity search

**User Style Embeddings:**
- Create user taste vectors from swipe/like behavior
- Update continuously
- Use for personalized feed ranking

---

### 6.4 Third-Party Integrations

**Product Data APIs:**
- Amazon Product Advertising API (affiliate program)
- Shopify (if including DTC brands)
- Consider: RainforestAPI, DataFeedWatch for multi-retailer aggregation

**Affiliate Tracking:**
- Amazon Associates
- Commission Junction / Rakuten
- Impact.com
- Custom UTM parameter tracking

**Authentication:**
- NextAuth.js or Supabase Auth
- Social login: Google, Apple (optional)

**Analytics:**
- PostHog (product analytics + feature flags)
- Mixpanel (event tracking)
- Avoid GA4 (privacy-focused approach)

**Error Monitoring:**
- Sentry

**Email:**
- Resend or SendGrid (transactional)

---

## 7. AI/ML Requirements

### 7.1 Virtual Try-On Specifications

**Inputs:**
- User photo (1080px min height, clear full/upper body)
- Product image (retailer's high-res image)

**Outputs:**
- Generated image (same dimensions as user photo)
- Confidence score (optional, for quality filtering)

**Performance Targets:**
- Generation time: <10 seconds per image
- Batch processing: 15 images in <2 minutes
- Quality: Photorealistic, minimal artifacts

**Error Handling:**
- Retry logic (3 attempts)
- Fallback: Show product image with "Try-on unavailable"
- Log failures for model improvement

---

### 7.2 Chat System (LLM Integration)

#### Prompt Engineering

**System Prompt Template:**
```
You are Scootpie's AI personal stylist. You help users discover and shop for fashion items.

User Context:
- Photos: [photo analysis summary]
- Style preferences: [quiz responses + inferred preferences]
- Recent likes: [last 10 liked items]
- Recent swipes: [swipe patterns summary]
- Conversation history: [last 5 messages]

Capabilities:
- Recommend products based on user's style, budget, occasion
- Answer fashion advice questions
- Reference specific items user has saved
- All recommendations MUST be shown as virtual try-on images

Guidelines:
- Be conversational, friendly, and knowledgeable
- Ask clarifying questions when needed
- Provide 3-5 product recommendations per relevant query
- Consider user's budget when suggesting items
- Be honest if you don't have suitable options

Response Format:
{
  "message": "Your conversational response",
  "products_to_show": ["product_id_1", "product_id_2"],
  "confidence": 0.85
}
```

#### Function Calling
- search_products(query, filters)
- get_similar_products(product_id)
- filter_by_occasion(occasion_type)
- get_user_likes()

#### Context Window Management
- Keep last 20 messages in context
- Summarize older conversation history
- Always include current user profile

#### Streaming
- Stream LLM response for better UX
- Show typing indicator
- Load product cards as they're referenced

---

### 7.3 Recommendation Engine

#### Swipe Mode Card Generation

**Inputs:**
- User profile (demographics, sizes)
- Style preferences (quiz + inferred)
- Swipe history (last 100 swipes)
- Like patterns (categories, price ranges, colors)
- Chat conversation topics
- Time/season/trends

**Algorithm:**
1. **Collaborative Filtering:** Similar users' likes
2. **Content-Based:** Similar to user's liked items
3. **Diversity Injection:** Exploratory items (30%)
4. **Trend Boosting:** Trending items get higher ranking
5. **Business Rules:** Filter out-of-stock, outside budget range

**Outputs:**
- Ranked list of 15 product IDs
- Confidence score for each

#### Feed Ranking
- Similar logic but different weights:
  - 40% personalized
  - 30% trending
  - 20% curated/editorial
  - 10% new arrivals
- Re-rank based on user's scroll behavior (impressions without engagement = negative signal)

#### Real-time Learning
- Update user embeddings after every 5 swipes
- Re-train personalization model daily (batch job)
- A/B test ranking algorithms

---

## 8. Performance Requirements

### 8.1 Speed Targets

- **Page Load:** <2 seconds (First Contentful Paint)
- **Time to Interactive:** <3 seconds
- **Swipe Response:** Instant (<100ms)
- **Card Batch Generation:** <5 seconds for first 15 cards
- **Chat Message Response:** <2 seconds (streaming starts)
- **Virtual Try-On:** <10 seconds per image
- **Feed Scroll:** 60fps, no jank

### 8.2 Scalability

**Initial Scale (MVP):**
- Support 1,000 concurrent users
- 10,000 daily active users
- 1M products in database

**Growth Target (6 months):**
- 10,000 concurrent users
- 100,000 daily active users
- 5M products

**Optimization Strategies:**
- CDN for all static assets
- Database read replicas
- Redis caching for hot data (trending items, user sessions)
- Background jobs for non-critical tasks (analytics, batch updates)
- Image optimization and lazy loading

---

## 9. Security & Privacy

### 9.1 Data Protection

**User Photos:**
- Encrypted at rest (S3 server-side encryption)
- Access controls (pre-signed URLs, short expiry)
- Users can delete photos anytime (cascade delete all related try-ons)

**Personal Data:**
- GDPR compliant (for future EU users)
- Data export functionality
- Account deletion (hard delete after 30 days)

**API Security:**
- Rate limiting (Redis)
- API key rotation
- HTTPS only

### 9.2 Content Safety

**Photo Upload:**
- File type validation
- Virus scanning
- Content moderation (block explicit content)

**Chat Monitoring:**
- Log all conversations (for abuse prevention)
- Filter harmful content (harassment, scams)

---

## 10. Success Metrics

### Engagement
- Daily Active Users (DAU)
- Session duration
- Swipes per session (target: 30+)
- Right swipe rate (target: 20-30%)
- Chat messages per user
- Feed scroll depth

### Conversion
- Click-through to retailer (target: 10% of likes)
- Affiliate revenue per user
- Items saved to collections

### Retention
- Day 1, 7, 30 retention rates
- Weekly active users

### AI Performance
- Chat response relevance (user ratings)
- Try-on generation success rate (target: 95%+)
- Recommendation accuracy (right swipes on recommended items)

---

## 11. Deployment Architecture

**Hosting:** Vercel (Next.js optimized)
- Auto-scaling
- Edge network
- Preview deployments
- Automatic HTTPS

**Database:** Supabase or Neon
- Managed PostgreSQL
- Automatic backups
- Read replicas

**CDN:** Cloudflare
- Image optimization
- DDoS protection

**CI/CD:**
- GitHub Actions
- Automated testing
- Staging environment
- Production deployment

---

## Next Steps

This PRD covers the complete product specification for Scootpie. The recommended approach is to build in this order:

1. **Core Infrastructure** - Set up Next.js, database, auth
2. **Virtual Try-On Integration** - Test and integrate try-on API
3. **Swipe Mode** - Build the primary discovery experience
4. **Collections** - Add save functionality
5. **Chat System** - Integrate Claude API for conversational styling
6. **Feed Mode** - Build curated/trending feed
7. **Polish & Optimization** - Performance tuning, error handling

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025
