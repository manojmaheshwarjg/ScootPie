import { NextResponse } from 'next/server';
import { chatWithStylist } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { history, message, outfitContext, closetInventory } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'message is required' },
                { status: 400 }
            );
        }

        const result = await chatWithStylist(
            history || [],
            message,
            outfitContext || '',
            closetInventory || ''
        );

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Chat stylist API error:', error);
        return NextResponse.json(
            { error: 'Failed to chat with stylist' },
            { status: 500 }
        );
    }
}
