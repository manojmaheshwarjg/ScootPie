import { NextResponse } from 'next/server';
import { generateStealTheLook } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { userPhotoUrl, inspirationPhotoUrl, userPhoto, inspirationPhoto, mode } = await request.json();

        // Support both URL and base64 inputs for backward compatibility
        if (!userPhotoUrl && !userPhoto) {
            return NextResponse.json(
                { error: 'userPhotoUrl or userPhoto is required' },
                { status: 400 }
            );
        }

        if (!inspirationPhotoUrl && !inspirationPhoto) {
            return NextResponse.json(
                { error: 'inspirationPhotoUrl or inspirationPhoto is required' },
                { status: 400 }
            );
        }

        const result = await generateStealTheLook(
            userPhotoUrl,
            inspirationPhotoUrl,
            mode || 'full',
            userPhoto,
            inspirationPhoto
        );

        return NextResponse.json({
            success: true,
            generatedImage: result
        });
    } catch (error) {
        console.error('Steal the look API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate steal the look' },
            { status: 500 }
        );
    }
}
