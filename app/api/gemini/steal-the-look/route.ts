import { NextResponse } from 'next/server';
import { generateStealTheLook } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { userPhoto, inspirationPhoto, mode } = await request.json();

        if (!userPhoto || !inspirationPhoto) {
            return NextResponse.json(
                { error: 'userPhoto and inspirationPhoto are required' },
                { status: 400 }
            );
        }

        const result = await generateStealTheLook(userPhoto, inspirationPhoto, mode || 'full');

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
