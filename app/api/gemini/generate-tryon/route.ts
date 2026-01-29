import { NextResponse } from 'next/server';
import { generateTryOnImage } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { userPhotoUrl, userPhotoBase64, products } = await request.json();

        if (!userPhotoUrl && !userPhotoBase64) {
            return NextResponse.json(
                { error: 'userPhotoUrl or userPhotoBase64 is required' },
                { status: 400 }
            );
        }

        if (!products) {
            return NextResponse.json(
                { error: 'products are required' },
                { status: 400 }
            );
        }

        const result = await generateTryOnImage(userPhotoUrl, userPhotoBase64, products);

        return NextResponse.json({
            success: true,
            generatedImage: result
        });
    } catch (error) {
        console.error('Generate try-on API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate try-on image' },
            { status: 500 }
        );
    }
}
