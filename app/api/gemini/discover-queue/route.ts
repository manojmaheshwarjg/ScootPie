import { NextResponse } from 'next/server';
import { getDiscoverQueue } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { gender } = await request.json();

        const products = await getDiscoverQueue(gender);

        return NextResponse.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Discover queue API error:', error);
        return NextResponse.json(
            { error: 'Failed to get discover queue' },
            { status: 500 }
        );
    }
}
