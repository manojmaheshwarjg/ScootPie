import { NextResponse } from 'next/server';
import { startRunwayVideo } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { imageBase64 } = await request.json();

        if (!imageBase64) {
            return NextResponse.json(
                { error: 'imageBase64 is required' },
                { status: 400 }
            );
        }

        const operationJson = await startRunwayVideo(imageBase64);

        return NextResponse.json({
            success: true,
            operationJson
        });
    } catch (error) {
        console.error('Start video API error:', error);
        return NextResponse.json(
            { error: 'Failed to start video generation' },
            { status: 500 }
        );
    }
}
