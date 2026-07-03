import { NextResponse } from 'next/server';
import { analyzeClosetItem } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { imageUrl, base64Image } = await request.json();

        if (!imageUrl && !base64Image) {
            return NextResponse.json(
                { error: 'imageUrl or base64Image is required' },
                { status: 400 }
            );
        }

        const result = await analyzeClosetItem(imageUrl, base64Image);

        return NextResponse.json({
            success: true,
            item: result
        });
    } catch (error) {
        console.error('Analyze closet item API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze closet item' },
            { status: 500 }
        );
    }
}
