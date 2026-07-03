# ScootPie

**AI-Powered Virtual Fashion Studio**

ScootPie is a next-generation fashion technology platform that combines multimodal AI (text, image, video), 3D rendering, real-time search, and persistent state management into a cohesive virtual styling experience. Built on Google's Gemini AI and Next.js 14, it enables users to visualize clothing on their own photos, receive personalized styling advice, and manage a complete digital wardrobe.

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Core Capabilities](#core-capabilities)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Development](#development)
- [Performance & Security](#performance--security)
- [License](#license)

---

## Key Features

### AI-Powered Capabilities
- **Virtual Try-On Engine** - Photorealistic clothing visualization preserving facial identity and body proportions
- **AI Stylist Chat** - Conversational fashion assistant with Google Search integration and outfit generation
- **Generative Video** - Transform static images into cinematic runway walks or 360-degree turntable views
- **Style Transfer** - "Steal the Look" analysis with tiered shopping recommendations (Luxury/Mid/Budget)

### Interactive Experiences
- **Swipe Discovery** - Tinder-style product browsing with physics-based interactions
- **3D Holographic View** - Volumetric visualization using Three.js with real-time lighting and particles
- **Digital Wardrobe** - Photo-based closet management with AI-powered item identification
- **Multi-Model Support** - Manage up to 3 different user photos with gender-specific styling

### Data & Integration
- **Hybrid Persistence** - Seamless switching between cloud (Supabase) and local storage
- **Smart Caching** - Redis-backed query caching to reduce API costs and latency
- **Visual Search** - Integration with Google Shopping for real-world product availability
- **Security Layer** - Client-side rate limiting and input sanitization

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ Studio │  │ Swipe  │  │  Chat  │  │Wardrobe│  │  3D    │   │
│  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘   │
└───────┼──────────┼──────────┼──────────┼──────────┼───────────┘
        │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┘
                            │
                   ┌────────▼─────────┐
                   │   App.tsx        │
                   │  State Manager   │
                   │  (590 lines)     │
                   └────────┬─────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│ Gemini AI      │  │  Supabase   │  │  Redis Cache    │
│ Services       │  │  Database   │  │  (Upstash)      │
├────────────────┤  ├─────────────┤  ├─────────────────┤
│ • Image Gen    │  │ • Auth      │  │ • Search Cache  │
│ • Chat AI      │  │ • Photos    │  │ • Rate Limits   │
│ • Video Gen    │  │ • Wardrobe  │  │                 │
│ • Analysis     │  │ • Sessions  │  │                 │
│ • Search       │  │ • Messages  │  │                 │
└────────┬───────┘  └─────────────┘  └─────────────────┘
         │
    ┌────▼──────┐
    │ SearchAPI │
    │ (Google   │
    │ Shopping) │
    └───────────┘
```

### Component Architecture

```
components/
├── PhotoUploader.tsx      → User onboarding & photo capture
├── Navbar.tsx             → Main navigation & view switching
├── StudioControls.tsx     → Product search interface
├── TryOnGallery.tsx       → Generated looks carousel
├── ChatStylist.tsx        → AI conversation interface
├── SwipeDiscover.tsx      → Tinder-style discovery
├── InspirationScanner.tsx → Celebrity look analysis
├── Wardrobe.tsx           → Digital closet manager
├── ThreeDView.tsx         → 3D holographic visualization
├── AuthScreen.tsx         → Authentication flow
├── ScannerLoader.tsx      → Loading animations
├── ApiKeyBanner.tsx       → API status indicator
└── WaitlistModal.tsx      → Extension waitlist

app/
├── page.tsx               → Main entry point
├── layout.tsx             → Root layout
├── globals.css            → Tailwind styles
└── api/
    └── video-proxy/       → Video CORS proxy
        └── route.ts

services/
└── gemini.ts              → Gemini AI integration (14 functions)

lib/
├── supabase.ts            → Database client & types
├── redis.ts               → Caching layer
├── security.ts            → Rate limiting & sanitization
└── logger.ts              → Structured logging
```

### AI Processing Pipeline

```
USER INPUT
    │
    ▼
┌─────────────────────────────────────────────┐
│         INPUT VALIDATION                     │
│  • Sanitize text (1000 char limit)          │
│  • Validate image size (10MB max)           │
│  • Check prohibited terms                   │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│         RATE LIMITING                        │
│  • Redis-backed counters                    │
│  • Per-function limits (1-30 req/min)       │
│  • Graceful degradation                     │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│         GEMINI AI PROCESSING                 │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ gemini-3-pro-image-preview           │  │
│  │  • Virtual try-on                    │  │
│  │  • Photo enhancement                 │  │
│  │  • Style transfer                    │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ gemini-3-pro-preview                 │  │
│  │  • AI stylist chat                   │  │
│  │  • Outfit generation                 │  │
│  │  • Closet analysis                   │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ gemini-3-flash-preview               │  │
│  │  • Product search                    │  │
│  │  • Item identification               │  │
│  │  • Inspiration analysis              │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ veo-3.1-generate-preview             │  │
│  │  • Runway video (5-15 sec)           │  │
│  │  • 360-degree turntable              │  │
│  │  • Client-side polling               │  │
│  └──────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│         CACHE & PERSIST                      │
│  • Redis cache (1 hour TTL)                 │
│  • Supabase storage                         │
│  • LocalStorage fallback                    │
└─────────────────┬───────────────────────────┘
                  ▼
              RESPONSE
```

### Data Flow & Persistence

```
┌───────────────────────────────────────────────────────┐
│                   CLIENT STATE                         │
│                                                        │
│  userPhotos[]  ─┐                                     │
│  products[]     ├─► App.tsx State                     │
│  generatedLooks[]│   (React State)                    │
│  chatSessions[] ├──────────┬─────────────┐           │
│  currentOutfit{}─┘          │             │           │
└─────────────────────────────┼─────────────┼───────────┘
                              │             │
                   ┌──────────▼──┐     ┌────▼────────┐
                   │ localStorage│     │  Supabase   │
                   │   (Guest)   │     │ (Logged In) │
                   └─────────────┘     └─────────────┘
                                              │
                        ┌─────────────────────┼──────────────┐
                        │                     │              │
                ┌───────▼────────┐  ┌─────────▼───────┐  ┌─▼─────┐
                │  user_photos   │  │   wardrobe      │  │ chat_ │
                │  (id, data,    │  │  (id, user_id,  │  │sessions│
                │   gender,      │  │   product_json) │  │  &     │
                │   is_primary)  │  │                 │  │messages│
                └────────────────┘  └─────────────────┘  └────────┘
```

---

## Technology Stack

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1.5 | React framework with App Router (Turbopack stable) |
| React | 19.x | UI library with improved performance |
| React DOM | 19.x | DOM rendering for React 19 |
| TypeScript | 5.3.3 | Type-safe development |

### AI & Generation
| Package | Version | Purpose |
|---------|---------|---------|
| @google/genai | 1.37.0 | Google Gemini SDK for multimodal AI |

### 3D Graphics
| Package | Version | Purpose |
|---------|---------|---------|
| three | 0.172.x | 3D rendering engine |
| @react-three/fiber | 9.x | React renderer for Three.js (React 19 compatible) |
| @react-three/drei | 10.x | Three.js helpers & abstractions |

### Backend Services
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | 2.47.x | PostgreSQL database & auth |
| @supabase/ssr | 0.5.x | Server-side rendering support |
| @upstash/redis | 1.28.0 | Serverless Redis caching |

### UI & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| lucide-react | 0.468.0 | Icon library (React 19 compatible) |
| react-markdown | 9.0.1 | Markdown rendering for chat |
| sonner | 1.4.0 | Toast notifications |

### SEO & Optimization
| Package | Version | Purpose |
|---------|---------|---------|
| next/font | Built-in | Google Fonts optimization with zero layout shift |
| next/image | Built-in | Automatic image optimization and lazy loading |
| schema-dts | 1.1.5 | TypeScript definitions for Schema.org structured data |

### Design System
- **Typography**:
  - Inter (300, 400, 500) - Primary sans-serif
  - Playfair Display (400, 600, italic) - Luxury serif headings
  - Space Mono (400, 700, italic) - Technical monospace
  - **Optimization**: Loaded via `next/font/google` with `display: swap` for zero layout shift
- **Color Palette**: Black/White base + Orange (#f97316) accent
- **Aesthetic**: Cyber-Fashion with sci-fi UI elements
- **Images**: All images optimized with `next/image` for automatic lazy loading and WebP conversion

### Breaking Changes & Migration (v0.1.x → v0.2.0)

#### Major Version Upgrades
- **Next.js 14.1 → 16.1**: Turbopack is now stable and default. Middleware renamed to proxy (not used in this app).
- **React 18 → 19**: Improved performance and compiler optimizations. No breaking changes in this codebase.
- **Three.js Ecosystem**: @react-three/fiber (8 → 9) and @react-three/drei (9 → 10) upgraded for React 19 compatibility.

#### Performance Improvements
- **Font Loading**: Migrated to `next/font/google` - reduces CLS (Cumulative Layout Shift) to near zero
- **Image Optimization**: All `<img>` tags replaced with `next/image` - automatic lazy loading, WebP conversion, responsive sizing
- **Build Performance**: Turbopack provides 2-3x faster builds compared to Webpack

#### SEO Enhancements
- **Sitemap**: Auto-generated XML sitemap at `/sitemap.xml`
- **Robots.txt**: Proper crawler directives at `/robots.txt`
- **Metadata**: Comprehensive OpenGraph and Twitter Card tags
- **Structured Data**: JSON-LD schemas for Organization and WebApplication
- **OG Images**: Dynamic social media preview images

#### No Code Changes Required
All upgrades are backward compatible. Existing functionality works without modifications.

---

## Quick Start

### Prerequisites
- Node.js 18.17+ or 20+ (recommended for Next.js 16)
- npm or yarn
- Modern browser with WebGL support (for 3D features)
- Supabase account
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/manojmaheshwarjg/scootpie.git
cd scootpie

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Build for Production

```bash
npm run build
npm start
```

---

## Core Capabilities

### 1. Virtual Try-On Engine
```typescript
generateTryOnImage(userPhotoBase64: string, products: Product[]): Promise<string>
```
Uses `gemini-3-pro-image-preview` to blend clothing items onto user photos while preserving:
- Facial identity
- Body proportions
- Lighting consistency
- Realistic fabric draping

**Rate Limit**: 5 requests/minute

### 2. AI Stylist Chat
```typescript
chatWithStylist(
  history: ChatHistory[],
  message: string,
  outfitContext: string,
  closetInventory: string
): Promise<ChatResponse>
```
Conversational AI powered by `gemini-3-pro-preview` with:
- Google Search integration for current trends
- Context-aware outfit generation
- Parsing of special tags: `||CLOSET_LOOK||`, `||HYBRID_LOOK||`
- Grounding metadata for source attribution

**Rate Limit**: 20 requests/minute

### 3. Generative Video
```typescript
// Initiate video generation
startRunwayVideo(imageBase64: string): Promise<string>

// Poll for completion
checkRunwayVideoStatus(operationJson: string): Promise<VideoStatus>

// 360-degree view
generate360View(imageBase64: string): Promise<string>
```
Uses `veo-3.1-generate-preview` to create:
- Cinematic runway walks (5-15 seconds)
- 360-degree turntable rotations
- 4K resolution output

**Rate Limit**: 1 request/minute

### 4. Style Transfer
```typescript
generateStealTheLook(
  userPhoto: string,
  inspirationPhoto: string,
  mode: 'full' | 'top' | 'bottom'
): Promise<string>
```
Transfers outfit style from celebrity/runway photos to user with:
- Three transfer modes (full outfit, top only, bottom only)
- Facial preservation
- Body adaptation

**Rate Limit**: 3 requests/minute

### 5. Product Search
```typescript
searchProducts(query: string, gender?: string): Promise<Product[]>
```
Hybrid search combining:
- SearchAPI.io for Google Shopping results
- Gemini AI for product extraction and fallback generation
- Redis caching (1-hour TTL)

**Rate Limit**: 30 requests/minute

### 6. Digital Wardrobe
```typescript
analyzeClosetItem(base64Image: string): Promise<Partial<Product>>
```
AI-powered item identification returning:
- Category (top/bottom/shoes/outerwear/one-piece/accessory)
- Color detection
- Brand recognition
- Auto-generated description

**Rate Limit**: 10 requests/minute

---

## API Reference

### Service Functions (services/gemini.ts)

| Function | Model | Purpose | Rate Limit |
|----------|-------|---------|------------|
| `enhanceUserPhoto()` | gemini-3-pro-image | Upscale & optimize photos | 5/min |
| `chatWithStylist()` | gemini-3-pro | AI chat with search | 20/min |
| `analyzeClosetFit()` | gemini-3-pro | Generate outfits from closet | 10/min |
| `searchProducts()` | gemini-3-flash | Product search & extraction | 30/min |
| `generateTryOnImage()` | gemini-3-pro-image | Virtual try-on | 5/min |
| `startRunwayVideo()` | veo-3.1 | Initiate runway video | 1/min |
| `checkRunwayVideoStatus()` | Operations API | Poll video status | - |
| `generate360View()` | veo-3.1 | 360-degree turntable | 1/min |
| `analyzeClosetItem()` | gemini-3-flash | Identify clothing | 10/min |
| `analyzeInspirationImage()` | gemini-3-flash | Extract outfit details | 5/min |
| `generateStealTheLook()` | gemini-3-pro-image | Style transfer | 3/min |
| `getDiscoverQueue()` | - | Random fashion queue | - |

### Database Schema (Supabase)

```sql
-- User Photos
user_photos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  data TEXT,              -- base64 image
  gender TEXT,            -- 'mens' | 'womens' | 'unisex'
  is_primary BOOLEAN,
  created_at TIMESTAMP
)

-- Wardrobe Items
wardrobe (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_json JSONB,     -- Product object
  created_at TIMESTAMP
)

-- Generated Looks
generated_looks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  result_json JSONB,      -- TryOnResult object
  created_at TIMESTAMP
)

-- Chat Sessions
chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  preview_text TEXT,
  last_modified TIMESTAMP,
  created_at TIMESTAMP
)

-- Chat Messages
chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions,
  role TEXT,              -- 'user' | 'model'
  text TEXT,
  timestamp TIMESTAMP,
  meta_json JSONB,        -- attachments, groundingMetadata
  created_at TIMESTAMP
)
```

---

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (with graceful degradation)
REDIS_URL=your_upstash_redis_url
ANTHROPIC_API_KEY=your_anthropic_key
SERPAPI_API_KEY=your_serpapi_key

# Storage (optional)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
```

### Getting API Keys

**Gemini API**
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Copy to `GEMINI_API_KEY`

**Supabase**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Settings → API
3. Copy Project URL and anon/public key

**Upstash Redis** (Optional)
1. Visit [Upstash Console](https://console.upstash.com/)
2. Create a Redis database
3. Copy REST API URL and token

---

## Development

### Available Scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
scootpie/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main entry point
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── api/               # API routes
├── components/            # React components (13 files)
├── services/              # External service integrations
│   └── gemini.ts         # Gemini AI client
├── lib/                   # Utilities
│   ├── supabase.ts       # Database client
│   ├── redis.ts          # Cache layer
│   ├── security.ts       # Security utils
│   └── logger.ts         # Logging
├── types.ts               # TypeScript definitions
├── App.tsx                # Main application component
├── .env.local            # Environment variables
├── next.config.mjs       # Next.js configuration
├── tailwind.config.ts    # Tailwind configuration
└── tsconfig.json         # TypeScript configuration
```

### Type System

```typescript
// Core Types
type UserPhoto = {
  id: string;
  data: string;        // base64
  gender: string;
  isPrimary: boolean;
}

type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  category: ProductCategory;
  description: string;
  url: string;
  imageUrl?: string;
  source: 'search' | 'generated' | 'closet';
}

type TryOnResult = {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  product: Product;
  outfit: OutfitState;
  timestamp: number;
}

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  attachments?: Product[];
  userAttachments?: Product[];
  groundingMetadata?: any;
}
```

---

## Performance & Security

### Performance Optimizations

1. **Redis Caching**
   - Search results cached for 1 hour
   - Rate limit counters stored in Redis
   - Graceful degradation to memory cache

2. **Image Optimization**
   - Progressive loading for generated images
   - Base64 encoding with size validation (10MB limit)
   - **Next.js Image Component**: All images use `next/image` for automatic optimization
   - **Lazy Loading**: Images load only when entering viewport
   - **Format Optimization**: Automatic WebP conversion with fallbacks
   - **Responsive Sizing**: Adaptive image sizes based on device

3. **Font Optimization**
   - **next/font/google**: Self-hosted Google Fonts for privacy and performance
   - **Zero Layout Shift**: Fonts load with `display: swap` strategy
   - **Preloading**: Critical fonts preloaded for faster First Contentful Paint
   - **Variable Fonts**: CSS custom properties for flexible typography

4. **SEO Optimization**
   - **Sitemap Generation**: Auto-generated XML sitemap at `/sitemap.xml`
   - **Robots.txt**: Proper crawler directives and sitemap reference
   - **Metadata**: Comprehensive OpenGraph, Twitter Card, and social tags
   - **Structured Data**: JSON-LD schemas (Organization, WebApplication)
   - **Dynamic OG Images**: Social media preview images generated at `/opengraph-image`
   - **Core Web Vitals**: Optimized for LCP < 2.5s, CLS < 0.1, INP < 200ms

5. **Video Processing**
   - Client-side polling to prevent server timeout
   - Async/await with proper error handling
   - Video proxy for CORS handling

6. **State Management**
   - React memoization with `useMemo`
   - Conditional rendering with Suspense
   - LocalStorage persistence with debouncing

### Security Features

1. **Input Validation**
   - Text sanitization (1000 character limit)
   - Special character filtering
   - Prohibited terms detection

2. **Rate Limiting**
   - Per-function limits (Redis-backed)
   - IP-based tracking
   - Exponential backoff on violations

3. **SSRF Protection**
   - URL validation (http/https only)
   - Whitelist-based domain filtering
   - Safe URL parsing

4. **Authentication**
   - Supabase Auth with Google OAuth
   - Magic link email authentication
   - Guest mode with limited features

5. **API Key Management**
   - Server-side only (never exposed to client)
   - Environment-based configuration
   - Automatic key rotation support

---

## Commercial Features

### Visual Search Integration
Connects to real-world shopping data via SearchAPI.io (Google Shopping), making AI-generated looks immediately shoppable with:
- Real-time price comparison
- Availability checking
- Direct product links
- Multi-store aggregation

### Digital Wardrobe Management
Users can digitize their physical closet via camera upload with:
- AI-powered auto-tagging
- Category classification
- Color detection
- Brand recognition
- Personal inventory tracking

### Hybrid Styling System
The AI Stylist can "see" the user's wardrobe and create:
- **Closet Looks**: Outfits from owned items only
- **Hybrid Looks**: Mix owned items with new purchase suggestions
- **Shopping Lists**: Complete the look recommendations

---

## Production Deployment

### Deployment Checklist

- [ ] Set all required environment variables
- [ ] Configure Supabase authentication providers
- [ ] Set up database tables and RLS policies
- [ ] Configure Redis for production
- [ ] Update SearchAPI key (currently hardcoded)
- [ ] Set up monitoring and logging
- [ ] Configure CORS for video proxy
- [ ] Enable rate limiting
- [ ] Add analytics integration
- [ ] Set up error tracking (Sentry)

### Recommended Hosting

- **Vercel**: Native Next.js support, automatic deployments
- **Netlify**: CDN optimization, serverless functions
- **AWS Amplify**: Full AWS integration
- **Railway**: Simple deployment with PostgreSQL

---

## Troubleshooting

### Common Issues

**Build Warnings**
The application may show ESLint warnings during build. These are non-blocking:
- Missing image alt tags
- React Hook dependencies
- Using `<img>` instead of Next.js `<Image>`

**Supabase Connection**
If authentication fails:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anon/public key
3. Ensure Supabase project is active
4. Enable Email authentication in Supabase dashboard

**Rate Limits**
If you hit API rate limits:
- Wait 60 seconds before retrying
- Consider upgrading to paid Gemini API tier
- Implement request queuing for batch operations

**Video Generation Timeout**
If videos fail to generate:
- Ensure image is under 8MB
- Check Gemini API quota
- Verify `veo-3.1-generate-preview` model access

---

## License

Copyright 2025 ScootPie. All rights reserved.

---

## Support

For detailed setup instructions, see [SETUP.md](./SETUP.md)

For product requirements and feature details, see [scootpie-prd.md](./scootpie-prd.md)

For issues or questions, open an issue on GitHub with:
- Error logs
- Environment details
- Steps to reproduce
