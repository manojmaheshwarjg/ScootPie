import React from 'react';
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from 'sonner';
import { Inter, Playfair_Display, Space_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';


const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://scootpie.com'),
  title: {
    default: 'ScootPie - AI Virtual Try-On Platform',
    template: '%s | ScootPie',
  },
  description: 'Virtual try-on platform powered by AI. See how clothes fit on you before buying. Reduce returns, shop with confidence using advanced body scanning and AI fashion styling.',
  keywords: ['virtual try-on', 'AI fashion', 'virtual fitting room', 'online clothing try-on', 'AR fashion', 'body scanning', 'AI stylist', 'fashion tech', 'e-commerce fashion'],
  authors: [{ name: 'ScootPie' }],
  creator: 'ScootPie',
  publisher: 'ScootPie',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://scootpie.com',
    title: 'ScootPie - AI Virtual Try-On Platform',
    description: 'Virtual try-on platform powered by AI. See how clothes fit on you before buying.',
    siteName: 'ScootPie',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'ScootPie - AI Virtual Try-On Platform',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScootPie - AI Virtual Try-On Platform',
    description: 'Virtual try-on platform powered by AI. See how clothes fit on you before buying.',
    images: ['/og-image.jpg'],
    creator: '@scootpie',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  verification: {
    // Add Google Search Console verification code when available
    // google: 'your-verification-code',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f97316',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${spaceMono.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MM64GXBX');`,
          }}
        />
        {/* End Google Tag Manager */}
        <link rel="icon" type="image/svg+xml" href="https://upload.wikimedia.org/wikipedia/commons/4/4e/Gemini_logo.svg" />
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MM64GXBX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {/* Structured Data - Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'ScootPie',
              description: 'AI-powered virtual try-on platform for fashion and clothing',
              url: 'https://scootpie.com',
              logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gemini_logo.svg',
              sameAs: [
                // Add social media profiles when available
                // 'https://twitter.com/scootpie',
                // 'https://www.linkedin.com/company/scootpie',
              ],
            }),
          }}
        />
        {/* Structured Data - WebApplication Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'ScootPie',
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Web Browser',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1000',
              },
            }),
          }}
        />
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 20, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontFamily: 'var(--font-space-mono), Space Mono, monospace',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
