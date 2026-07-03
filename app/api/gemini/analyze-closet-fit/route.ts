import { NextResponse } from 'next/server';
import { analyzeClosetFit } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { history, message, attachedItems } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'message is required' },
                { status: 400 }
            );
        }

        const result = await analyzeClosetFit(
            history || [],
            message,
            attachedItems || []
        );

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Analyze closet fit API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze closet fit' },
            { status: 500 }
        );
    }
}
