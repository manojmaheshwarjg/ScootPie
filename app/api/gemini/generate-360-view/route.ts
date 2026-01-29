import { NextResponse } from 'next/server';
import { generate360View } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { imageBase64 } = await request.json();

        if (!imageBase64) {
            return NextResponse.json(
                { error: 'imageBase64 is required' },
                { status: 400 }
            );
        }

        const result = await generate360View(imageBase64);

        return NextResponse.json({
            success: true,
            videoUrl: result
        });
    } catch (error) {
        console.error('360 view API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate 360 view' },
            { status: 500 }
        );
    }
}
