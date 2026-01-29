import { NextResponse } from 'next/server';
import { checkRunwayVideoStatus } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { operationJson } = await request.json();

        if (!operationJson) {
            return NextResponse.json(
                { error: 'operationJson is required' },
                { status: 400 }
            );
        }

        const result = await checkRunwayVideoStatus(operationJson);

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Check video status API error:', error);
        return NextResponse.json(
            { error: 'Failed to check video status' },
            { status: 500 }
        );
    }
}
