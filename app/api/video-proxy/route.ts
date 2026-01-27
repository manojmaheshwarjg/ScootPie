import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const data = searchParams.get('data');
  const sig = searchParams.get('sig');

  if (!data || !sig || !process.env.API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 1. SECURITY: Verify the signature
  // We use the API_KEY as the secret since only the server knows it.
  const expectedSig = createHmac('sha256', process.env.API_KEY)
    .update(data)
    .digest('hex');

  if (sig !== expectedSig) {
    return new NextResponse('Invalid Signature', { status: 403 });
  }

  try {
    // 2. Decode the Google URI
    const googleUri = Buffer.from(data, 'base64').toString('utf-8');
    
    // 3. Fetch from Google (This returns a stream, it does NOT download the whole file)
    const googleResponse = await fetch(`${googleUri}&key=${process.env.API_KEY}`);

    if (!googleResponse.ok) {
      return new NextResponse('Upstream Error', { status: 502 });
    }

    // 4. Pipe the stream directly to the user
    // This allows O(1) memory usage regardless of video size.
    return new NextResponse(googleResponse.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Video Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}