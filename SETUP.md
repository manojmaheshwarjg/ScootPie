# ScootPie Revamp - Setup Guide

This guide will help you set up and run the ScootPie Revamp application.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (for authentication and database)
- Google Gemini API key

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy or update your `.env.local` file with the following variables:

```env
# AI APIs
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=

# Supabase (Required for authentication)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgresql_connection_string

# Search API
SERPAPI_API_KEY=your_serpapi_key_here

# Redis (Optional for caching)
REDIS_URL=

# Storage (Optional)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

### 3. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select your existing project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Navigate to **Settings** → **Database**
6. Copy the **Connection String** → `DATABASE_URL`

### 4. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Copy the key to `GEMINI_API_KEY` in your `.env.local`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production

```bash
npm run build
npm start
```

## Features

- **AI Fashion Stylist** - Chat with an AI stylist powered by Gemini 3
- **Virtual Try-On** - Try on clothes virtually using Gemini image generation
- **3D Product Visualization** - View products in 3D using Three.js
- **Swipe Discovery** - Discover fashion products with a Tinder-like interface
- **Wardrobe Management** - Organize and manage your digital wardrobe
- **Inspiration Scanner** - Upload inspiration photos and get shopping recommendations

## Tech Stack

- **Framework**: Next.js 14
- **Authentication**: Supabase Auth
- **AI**: Google Gemini API (@google/genai)
- **3D Rendering**: Three.js + React Three Fiber
- **Styling**: Tailwind CSS 3
- **Caching**: Upstash Redis (optional)
- **Database**: PostgreSQL (Supabase)

## Project Structure

```
scootpie/
├── app/              # Next.js app directory
│   ├── api/         # API routes
│   ├── globals.css  # Global styles
│   ├── layout.tsx   # Root layout
│   └── page.tsx     # Home page
├── components/       # React components
│   ├── ChatStylist.tsx
│   ├── ThreeDView.tsx
│   ├── Wardrobe.tsx
│   └── ...
├── services/         # External service integrations
│   └── gemini.ts    # Google Gemini API client
├── lib/             # Utilities and helpers
│   ├── supabase.ts  # Supabase client
│   ├── logger.ts    # Logging utility
│   ├── redis.ts     # Redis client
│   └── security.ts  # Security utilities
└── types.ts         # TypeScript type definitions
```

## Environment Setup Details

### Required Services

1. **Supabase** - Used for:
   - User authentication (magic link)
   - Database storage (photos, wardrobe, chat sessions)
   - Real-time subscriptions

2. **Google Gemini** - Used for:
   - AI chat and styling recommendations
   - Image generation (try-on, enhancement)
   - Video generation (runway walks, 360 views)
   - Product search and analysis

### Optional Services

1. **Upstash Redis** - For caching:
   - Search results
   - Rate limiting
   - Session data

2. **Cloudflare R2** - For file storage:
   - User uploaded photos
   - Generated images
   - Product images

3. **SerpAPI** - For enhanced product search:
   - Google Shopping results
   - Real-time product data

## Troubleshooting

### Build Warnings

The app may show ESLint warnings during build. These are non-blocking and the app will still work. Common warnings include:

- Missing image alt tags
- React Hook dependencies
- Using `<img>` instead of Next.js `<Image>`

These can be safely ignored for development.

### Supabase Connection Issues

If you see authentication errors:
1. Verify your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Check that your Supabase project is active
3. Ensure you've enabled Email authentication in Supabase dashboard

### API Rate Limits

The app implements rate limiting for Gemini API calls:
- Image generation: 5 requests/minute
- Chat: 20 requests/minute
- Product search: 30 requests/minute

If you hit rate limits, wait a minute before retrying.

## Development Notes

- The app includes both Next.js and Vite configuration files (legacy from AI Studio generation)
- Only the Next.js configuration is used - Vite files are excluded from compilation
- Model names use preview versions (e.g., `gemini-3-pro-preview`, `veo-3.1-generate-preview`)
- The app runs in browser without requiring server-side video proxy (uses client-side fetch)

## Support

For issues or questions:
- Check the [Product Requirements Document](./scootpie-prd.md) for feature details
- Review the old codebase in the `backup-old-codebase` branch
- Open an issue with your error logs and environment details

## License

Copyright © 2025 ScootPie. All rights reserved.
