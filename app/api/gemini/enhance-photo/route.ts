import { NextResponse } from 'next/server';
import { enhanceUserPhoto } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { base64Image } = await request.json();

        if (!base64Image) {
            return NextResponse.json(
                { error: 'base64Image is required' },
                { status: 400 }
            );
        }

        const result = await enhanceUserPhoto(base64Image);

        return NextResponse.json({
            success: true,
            enhancedImage: result
        });
    } catch (error) {
        console.error('Enhance photo API error:', error);
        return NextResponse.json(
            { error: 'Failed to enhance photo' },
            { status: 500 }
        );
    }
}
