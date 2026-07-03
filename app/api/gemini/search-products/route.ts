import { NextResponse } from 'next/server';
import { searchProducts } from '@/services/gemini';

export async function POST(request: Request) {
    try {
        const { query, gender } = await request.json();

        if (!query) {
            return NextResponse.json(
                { error: 'query is required' },
                { status: 400 }
            );
        }

        const products = await searchProducts(query, gender);

        return NextResponse.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Search products API error:', error);
        return NextResponse.json(
            { error: 'Failed to search products' },
            { status: 500 }
        );
    }
}
