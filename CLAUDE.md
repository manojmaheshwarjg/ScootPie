# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

## Architecture Overview

ScootPie is an AI-powered virtual fashion studio built on Next.js 16 (App Router) with React 19. The application uses Google's Gemini AI for multimodal generation (image, video, chat) and follows a client-server architecture where all AI calls are proxied through Next.js API routes to keep API keys secure.

### Client-Server Pattern

**CRITICAL**: The codebase uses a dual-service pattern for Gemini AI:

1. **`services/gemini.ts`** - Server-side Gemini SDK integration (used in API routes)
2. **`services/gemini-client.ts`** - Client-side wrapper that calls API routes

When adding new AI features:
- Create the API route in `app/api/gemini/[feature]/route.ts`
- Import and use `services/gemini.ts` functions in the API route
- Add a client wrapper function in `services/gemini-client.ts`
- Call the client wrapper from React components

**Never import `services/gemini.ts` directly in client components** - it contains server-only code and API keys.

### State Management Architecture

**`App.tsx`** (590 lines) is the central state manager using React state. All major application state lives here:

- `userPhotos[]` - Up to 3 user model photos with gender tagging
- `activePhotoId` - Currently selected model
- `generatedLooks[]` - Virtual try-on results with outfit data
- `outfitState` - Current outfit being built (category → Product mapping)
- `closetItems[]` - User's digital wardrobe
- `chatSessions[]` - Persistent chat history with AI stylist
- `savedItems[]` - Bookmarked looks

State flows down to specialized view components (StudioControls, ChatStylist, Wardrobe, etc.) through props. Components call callback functions passed from App.tsx to update state.

### Data Persistence Strategy

The app supports **hybrid persistence** with automatic fallback:

1. **Authenticated users** → Supabase (PostgreSQL)
   - Photos: `user_photos` table
   - Wardrobe: `wardrobe` table (stores Product as JSONB)
   - Looks: `generated_looks` table (stores TryOnResult as JSONB)
   - Chat: `chat_sessions` and `chat_messages` tables

2. **Guest users** → `localStorage`
   - Same data structure, serialized to JSON
   - Limited functionality (no cross-device sync)

When implementing new features that need persistence:
- Add DB operations in `lib/supabase.ts` for authenticated flow
- Add localStorage operations in `App.tsx` for guest flow
- Check `authSession` state to route to correct storage

### AI Processing Pipeline

All Gemini AI calls follow this flow:

```
Component → services/gemini-client.ts → /api/gemini/[route] → services/gemini.ts → Gemini API
```

Each AI function has built-in rate limiting (via `lib/security.ts`) and caching (via `lib/redis.ts`). Rate limits are per-function and enforced server-side.

**Key AI Routes:**
- `/api/gemini/generate-tryon` - Virtual try-on (gemini-3-pro-image-preview)
- `/api/gemini/chat-stylist` - AI chat with Google Search grounding (gemini-3-pro-preview)
- `/api/gemini/start-video` - Runway video generation (veo-3.1-generate-preview)
- `/api/gemini/analyze-closet-item` - Wardrobe item identification (gemini-3-flash-preview)
- `/api/gemini/steal-the-look` - Style transfer from inspiration images (gemini-3-pro-image-preview)

Video generation uses client-side polling: `startRunwayVideo()` returns an operation handle, then `checkRunwayVideoStatus()` polls until completion (prevents serverless timeout).

### Component Architecture

Components are organized by feature/view:

- **StudioControls.tsx** - Product search interface, builds `outfitState` by category
- **TryOnGallery.tsx** - Displays `generatedLooks[]`, handles video generation
- **ChatStylist.tsx** - AI conversation with special tag parsing (`||CLOSET_LOOK||`, `||HYBRID_LOOK||`)
- **Wardrobe.tsx** - Photo-based closet management, calls `analyzeClosetItem()`
- **InspirationScanner.tsx** - "Steal the Look" feature with tiered shopping recommendations
- **SwipeDiscover.tsx** - Tinder-style product discovery with physics-based gestures
- **ThreeDView.tsx** - Three.js holographic visualization using @react-three/fiber
- **PhotoUploader.tsx** - Onboarding flow, supports 3 photos with gender selection

## Type System

Core types are defined in `types.ts`:

```typescript
Product {
  source: 'search' | 'closet' | 'generated'  // Track origin
  category: ProductCategory                   // For outfit building
}

TryOnResult {
  outfit: Product[]      // Full outfit, not just single item
  videoUrl?: string      // Optional Veo video
  videoStatus?: string   // Polling state
}

OutfitState = Partial<Record<ProductCategory, Product>>
// Maps category slots to products for outfit composition
```

When adding new product sources, update the `source` discriminator and handle in relevant UI (Wardrobe shows closet items, StudioControls shows search results).

## Next.js 16 Specifics

- **Turbopack**: Default bundler (stable in v16), significantly faster than Webpack
- **React 19**: Uses new compiler optimizations, no breaking changes for this codebase
- **Font Optimization**: `next/font/google` with `display: swap` for zero CLS
- **Image Optimization**: All images use `next/image` for automatic WebP conversion and lazy loading
- **App Router**: All components are client-side (`'use client'`), minimal server components usage
- **API Routes**: Use Next.js 13+ convention (`app/api/[route]/route.ts`)

## Security Considerations

1. **API Key Protection**: Gemini API key stored in server-side env var, never sent to client
2. **Rate Limiting**: Redis-backed counters in `lib/security.ts`, per-function limits
3. **Input Validation**: Text sanitized (1000 char limit), images validated (10MB max)
4. **SSRF Protection**: URL validation in `lib/security.ts` for search results

When adding new API endpoints:
- Import `rateLimiter` from `lib/security.ts`
- Call `await rateLimiter('function-name', request)` before processing
- Sanitize user input with `sanitizeTextInput()` from `lib/security.ts`

## Common Patterns

### Adding a New AI Feature

1. Define types in `types.ts` if needed
2. Create server function in `services/gemini.ts`:
   ```typescript
   export async function myFeature(input: string): Promise<Result> {
     const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
     // ... implementation
   }
   ```
3. Create API route in `app/api/gemini/my-feature/route.ts`:
   ```typescript
   import { myFeature } from '@/services/gemini';
   import { rateLimiter } from '@/lib/security';

   export async function POST(request: Request) {
     await rateLimiter('myFeature', request);
     const { input } = await request.json();
     const result = await myFeature(input);
     return Response.json({ result });
   }
   ```
4. Add client wrapper in `services/gemini-client.ts`:
   ```typescript
   export const myFeature = async (input: string): Promise<Result | null> => {
     const response = await fetch('/api/gemini/my-feature', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ input }),
     });
     const data = await response.json();
     return data.result || null;
   };
   ```
5. Call from component using the client wrapper

### Working with Supabase

Database client is initialized in `lib/supabase.ts`. It handles both authenticated and guest modes:

```typescript
import { supabase, DbUserPhoto } from './lib/supabase';

// Check if Supabase is configured
if (supabase) {
  const { data } = await supabase.from('user_photos').select('*');
}
```

Always check if `supabase` is defined before using (graceful degradation to localStorage).

### Chat AI Special Tags

The AI stylist can generate special tags in responses that trigger outfit generation:

- `||CLOSET_LOOK||` - Generate look using only user's wardrobe items
- `||HYBRID_LOOK||` - Mix wardrobe items with new shopping suggestions

ChatStylist.tsx parses these tags and calls appropriate generation functions. When modifying chat behavior, preserve this tag parsing logic.

## Performance Optimizations

- **Redis Caching**: Search results cached for 1 hour via `lib/redis.ts`
- **Image Lazy Loading**: `next/image` component with automatic viewport detection
- **Font Preloading**: Critical fonts preloaded via `next/font/google`
- **Memoization**: Use `useMemo` for expensive computations in `App.tsx`
- **Video Proxy**: `/api/video-proxy/route.ts` handles CORS for Veo videos

## Environment Variables

Required:
- `GEMINI_API_KEY` - Google AI Studio API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

Optional (with graceful degradation):
- `REDIS_URL` - Upstash Redis URL for caching
- `ANTHROPIC_API_KEY` - Reserved for future features
- `SERPAPI_API_KEY` - Reserved for enhanced search

## Known Build Warnings

The build process shows ESLint warnings that are non-blocking:
- Missing alt tags on some `<img>` elements
- React Hook dependency arrays
- Prefer `next/image` over `<img>` in some legacy components

These warnings don't affect functionality and can be addressed incrementally.
