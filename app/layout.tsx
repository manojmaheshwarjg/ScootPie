import React from 'react';
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner';
import { Inter, Playfair_Display, Space_Mono } from 'next/font/google';

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
  title: "ScootPie - AI Virtual Stylist",
  description: "An AI-powered virtual try-on platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="https://upload.wikimedia.org/wikipedia/commons/4/4e/Gemini_logo.svg" />
      </head>
      <body className={inter.className}>
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
      </body>
    </html>
  );
}