import { Metadata } from 'next';

export const siteConfig = {
  name: 'ScootPie',
  description: 'Virtual try-on platform powered by AI. See how clothes fit on you before buying.',
  url: 'https://scootpie.com',
  ogImage: '/og-image.jpg',
  links: {
    twitter: 'https://twitter.com/scootpie',
    github: 'https://github.com/scootpie',
  },
};

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = '/favicon.ico',
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@scootpie',
    },
    icons,
    metadataBase: new URL(siteConfig.url),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
