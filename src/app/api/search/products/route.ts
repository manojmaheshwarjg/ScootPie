import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const count = parseInt(searchParams.get('count') || '15');

    if (!q) {
      return NextResponse.json({ error: 'Missing query q' }, { status: 400 });
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SERPAPI_API_KEY not configured' }, { status: 500 });
    }

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping_light');
    url.searchParams.set('q', q);
    url.searchParams.set('api_key', apiKey);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'SerpAPI request failed', details: text }, { status: 502 });
    }

    const json = await resp.json();
    const results = Array.isArray(json?.shopping_results) ? json.shopping_results : [];

    const isExternalRetailerUrl = (u?: string) => {
      if (!u || typeof u !== 'string') return false;
      try {
        const h = new URL(u).hostname.toLowerCase();
        if (!h) return false;
        const isGoogle = h.includes('google.');
        const isSerpapi = h.includes('serpapi.com');
        return !(isGoogle || isSerpapi);
      } catch {
        return false;
      }
    };

    const pickRetailerUrl = (r: any): string => {
      const candidates = [r.link, r.product_link, r.product_page_url, r.offer?.link, r.offer?.product_link];
      for (const c of candidates) {
        if (isExternalRetailerUrl(c)) return c;
      }
      // fallback to any available link
      return r.link || r.product_link || '#';
    };

    const products = results.slice(0, count).map((r: any, idx: number) => {
      // Attempt to parse price and currency
      // r.price may be like "$149.00" or "US$149"; normalize
      let price = 0;
      let currency = 'USD';
      if (typeof r.price === 'string') {
        const m = r.price.match(/([A-Z$£€₹]{0,3})\s*([0-9,.]+)/);
        if (m) {
          const symbol = m[1] || '';
          const amount = m[2]?.replace(/,/g, '') || '0';
          price = parseFloat(amount);
          if (symbol.includes('$')) currency = 'USD';
          else if (symbol.includes('€')) currency = 'EUR';
          else if (symbol.includes('£')) currency = 'GBP';
          else if (symbol.includes('₹')) currency = 'INR';
        }
      }

      const productUrl = pickRetailerUrl(r);

      return {
        id: `serp-${r.product_id || r.position || idx}-${Math.random().toString(36).slice(2, 8)}`,
        externalId: r.product_id || undefined,
        name: r.title || 'Product',
        brand: r.source || r.store || 'Unknown',
        price: isFinite(price) ? price : 0,
        currency,
        retailer: r.source || r.store || 'Unknown',
        category: 'search',
        subcategory: undefined,
        imageUrl: r.thumbnail || r.image || '',
        productUrl,
        description: r.extracted_price ? `${r.extracted_price}` : undefined,
        availableSizes: undefined,
        colors: undefined,
        inStock: true,
        trending: false,
        isNew: false,
        isEditorial: false,
        isExternal: true,
      };
    });

    return NextResponse.json({ products, count: products.length, source: 'serpapi' });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search products' }, { status: 500 });
  }
}
