import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ScootPie - AI Virtual Try-On Platform';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(to bottom right, #000000, #1a1a1a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #f97316, #ff8c42)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            ScootPie
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#ffffff',
              textAlign: 'center',
              maxWidth: '900px',
              lineHeight: 1.4,
            }}
          >
            AI Virtual Try-On Platform
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#a0a0a0',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            See how clothes fit on you before buying
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
