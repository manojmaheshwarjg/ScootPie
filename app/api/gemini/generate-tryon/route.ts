import { NextResponse } from 'next/server';
import { generateTryOnImage } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { userPhotoBase64, products } = await request.json();

        if (!userPhotoBase64 || !products) {
            return NextResponse.json(
                { error: 'userPhotoBase64 and products are required' },
                { status: 400 }
            );
        }

        const result = await generateTryOnImage(userPhotoBase64, products);

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
