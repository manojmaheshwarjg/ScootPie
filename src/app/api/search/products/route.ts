import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { products, users } from '@/lib/db/schema';
import { sql, or, ilike, eq } from 'drizzle-orm';

// Helper function to enhance query with user preferences
function enhanceQueryWithPreferences(query: string, userPreferences?: { gender?: string; sizes?: { top?: string; bottom?: string; shoes?: string } }): string {
  if (!query.trim()) return query;
  
  const parts: string[] = [query];
  
  console.log('[ENHANCE] Starting enhancement. Query:', query, 'Preferences:', JSON.stringify(userPreferences));
  
  // Add gender if available
  if (userPreferences?.gender && userPreferences.gender !== 'prefer-not-to-say') {
    const genderMap: Record<string, string> = {
      'men': 'men',
      'women': 'women',
      'unisex': 'unisex',
      'non-binary': 'unisex', // Use unisex for non-binary
    };
    const genderTerm = genderMap[userPreferences.gender];
    const queryLower = query.toLowerCase();
    console.log('[ENHANCE] Gender check - gender:', userPreferences.gender, 'mapped to:', genderTerm, 'query contains:', queryLower.includes(genderTerm.toLowerCase()));
    
    if (genderTerm && !queryLower.includes(genderTerm.toLowerCase())) {
      parts.push(genderTerm);
      console.log('[ENHANCE] Added gender term:', genderTerm);
    } else {
      console.log('[ENHANCE] Gender term not added - already in query or invalid');
    }
  } else {
    console.log('[ENHANCE] No gender to add - gender:', userPreferences?.gender);
  }
  
  // Add size context if available (for tops/bottoms/shoes)
  // For generic queries, add the most relevant size (top > bottom > shoes)
  if (userPreferences?.sizes) {
    const queryLower = query.toLowerCase();
    const isTopQuery = ['shirt', 'top', 't-shirt', 'blouse', 'sweater', 'hoodie', 'jacket', 'coat', 'sweatshirt', 'cardigan', 'blazer', 'dress', 'apparel'].some(term => queryLower.includes(term));
    const isBottomQuery = ['pants', 'jeans', 'trousers', 'shorts', 'skirt', 'leggings', 'tights'].some(term => queryLower.includes(term));
    const isShoeQuery = ['shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'sandal', 'sandals', 'heel', 'heels', 'slipper', 'slippers'].some(term => queryLower.includes(term));
    
    console.log('[ENHANCE] Size check - isTop:', isTopQuery, 'isBottom:', isBottomQuery, 'isShoe:', isShoeQuery);
    console.log('[ENHANCE] Available sizes - top:', userPreferences.sizes.top, 'bottom:', userPreferences.sizes.bottom, 'shoes:', userPreferences.sizes.shoes);
    
    if (isTopQuery && userPreferences.sizes.top) {
      parts.push(`size ${userPreferences.sizes.top}`);
      console.log('[ENHANCE] Added top size:', userPreferences.sizes.top);
    } else if (isBottomQuery && userPreferences.sizes.bottom) {
      parts.push(`size ${userPreferences.sizes.bottom}`);
      console.log('[ENHANCE] Added bottom size:', userPreferences.sizes.bottom);
    } else if (isShoeQuery && userPreferences.sizes.shoes) {
      parts.push(`size ${userPreferences.sizes.shoes}`);
      console.log('[ENHANCE] Added shoe size:', userPreferences.sizes.shoes);
    } else {
      // For generic queries (like "trending fashion apparel"), add top size if available, otherwise bottom
      // This helps narrow down results even for generic searches
      if (userPreferences.sizes.top) {
        parts.push(`size ${userPreferences.sizes.top}`);
        console.log('[ENHANCE] Added top size for generic query:', userPreferences.sizes.top);
      } else if (userPreferences.sizes.bottom) {
        parts.push(`size ${userPreferences.sizes.bottom}`);
        console.log('[ENHANCE] Added bottom size for generic query:', userPreferences.sizes.bottom);
      } else {
        console.log('[ENHANCE] No size added - no sizes available');
      }
    }
  } else {
    console.log('[ENHANCE] No sizes available in preferences');
  }
  
  const enhanced = parts.join(' ');
  console.log('[ENHANCE] Final enhanced query:', enhanced);
  return enhanced;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let q = searchParams.get('q') || '';
    const count = parseInt(searchParams.get('count') || '15');
    
    // Get user preferences if authenticated
    let userPreferences: { gender?: string; sizes?: { top?: string; bottom?: string; shoes?: string } } | undefined;
    try {
      const { userId } = await auth();
      if (userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.clerkId, userId),
        });
        if (user?.preferences) {
          // Ensure we extract the preferences correctly from JSONB
          const prefs = user.preferences as any;
          userPreferences = {
            gender: prefs?.gender,
            sizes: prefs?.sizes ? {
              top: prefs.sizes?.top,
              bottom: prefs.sizes?.bottom,
              shoes: prefs.sizes?.shoes,
            } : undefined,
          };
          console.log('[SEARCH] Extracted preferences:', JSON.stringify(userPreferences, null, 2));
        } else {
          console.log('[SEARCH] User found but no preferences');
        }
      } else {
        console.log('[SEARCH] No userId from auth');
      }
    } catch (error) {
      // Silently fail - don't break search if auth fails
      console.warn('[SEARCH] Could not fetch user preferences:', error);
    }
    
    // Log user preferences for debugging
    console.log('[SEARCH] User preferences:', JSON.stringify(userPreferences, null, 2));
    console.log('[SEARCH] Original query:', q);
    
    // Enhance query with user preferences
    const originalQuery = q;
    q = enhanceQueryWithPreferences(q, userPreferences);
    
    console.log('[SEARCH] Enhanced query:', q, '(original:', originalQuery + ')', 'count:', count, 'userPrefs:', userPreferences ? 'yes' : 'no');

    const apiKey = process.env.SERPAPI_API_KEY;
    console.log('[SEARCH] SERPAPI_API_KEY check:');
    console.log('[SEARCH]   - Key exists:', 'SERPAPI_API_KEY' in process.env);
    console.log('[SEARCH]   - Value present:', !!apiKey);
    console.log('[SEARCH]   - Value length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      console.warn('[SEARCH] SERPAPI_API_KEY not configured, falling back to internal products');
      // Fallback to internal products
      return await getInternalProducts(q, count, userPreferences);
    }

    const url = new URL('https://serpapi.com/search.json');
    // Use regular google_shopping for better image support (has thumbnails)
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', q); // Already enhanced with user preferences
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '50'); // Get more results to account for filtering

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      console.warn('[SEARCH] SerpAPI HTTP', resp.status, text.slice(0,120));
      return NextResponse.json({ error: 'SerpAPI request failed', details: text }, { status: 502 });
    }

    const json = await resp.json();
    const results = Array.isArray(json?.shopping_results) ? json.shopping_results : [];
    console.log('[SEARCH] results:', results.length);
    console.log('[SEARCH] sample:', results.slice(0,3).map((r:any)=>({title:r.title, source:r.source, hasThumb: !!r.thumbnail})));
    
    // If no results from SerpAPI, fallback to internal products immediately
    if (results.length === 0) {
      console.log('[SEARCH] No results from SerpAPI, falling back to internal products');
      return await getInternalProducts(q, count, userPreferences);
    }

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

    async function fetchProductImageFromSerpProduct(productId: string): Promise<string | null> {
      try {
        const purl = new URL('https://serpapi.com/search.json');
        purl.searchParams.set('engine', 'google_shopping_product');
        purl.searchParams.set('product_id', productId);
        purl.searchParams.set('api_key', apiKey as string);
        const pres = await fetch(purl.toString());
        if (!pres.ok) return null;
        const pdata: any = await pres.json();
        const images = pdata?.images || pdata?.product_photos || [];
        const first = images[0];
        const link = first?.link || first?.thumbnail || first?.image;
        return typeof link === 'string' ? link : null;
      } catch (e) {
        console.warn('[SEARCH] product image fetch failed:', (e as Error).message);
        return null;
      }
    }

    async function fetchOgImage(pageUrl?: string): Promise<string | null> {
      if (!pageUrl) return null;
      try {
        const res = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 scootpieBot', 'Accept': 'text/html' } });
        if (!res.ok) return null;
        const html = await res.text();
        const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
        let img = og?.[1] || null;
        if (img && img.startsWith('//')) img = 'https:' + img;
        if (img && img.startsWith('/')) img = new URL(img, pageUrl).toString();
        return img;
      } catch (e) {
        console.warn('[SEARCH] og:image fetch failed:', (e as Error).message);
        return null;
      }
    }

    // Increase the slice to account for filtering out products without images
    const picked = results.slice(0, Math.min(count * 3, results.length));
    
    if (picked.length === 0) {
      console.log('[SEARCH] No results to process, falling back to internal products');
      return await getInternalProducts(q, count, userPreferences);
    }
    
    let allProducts: any[] = [];
    try {
      allProducts = await Promise.all(picked.map(async (r: any, idx: number) => {
      // Attempt to parse price and currency
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

      // Try multiple image sources in order of preference
      let imageUrl: string | null = null;
      
      // 1. Direct thumbnail from result
      imageUrl = r.thumbnail || r.image || r.original_image || null;
      if (imageUrl) console.log('[SEARCH] Using direct thumbnail for', r.title);
      
      // 2. Try product API if we have product_id
      if (!imageUrl && r.product_id) {
        imageUrl = await fetchProductImageFromSerpProduct(r.product_id);
        if (imageUrl) console.log('[SEARCH] filled via product API for', r.product_id);
      }
      
      // 3. Try og:image from product page
      if (!imageUrl && productUrl && productUrl !== '#') {
        imageUrl = await fetchOgImage(productUrl);
        if (imageUrl) console.log('[SEARCH] filled via og:image for', productUrl);
      }
      
      // 4. Try extracting from any image fields in the result
      if (!imageUrl) {
        const possibleImages = [
          r.thumbnail,
          r.image,
          r.original_image,
          r.images?.[0]?.link,
          r.images?.[0]?.thumbnail,
          r.product_photos?.[0]?.link,
          r.product_photos?.[0]?.thumbnail,
        ].filter(Boolean);
        imageUrl = possibleImages[0] || null;
        if (imageUrl) console.log('[SEARCH] Using alternative image field for', r.title);
      }
      
      if (!imageUrl) {
        console.warn('[SEARCH] No image found for result', r.title, 'Available fields:', Object.keys(r).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('thumb')));
      }

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
        imageUrl: imageUrl || '',
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
      }));
    } catch (error) {
      console.error('[SEARCH] Error processing products:', error);
      // If processing fails, fallback to internal products
      return await getInternalProducts(q, count, userPreferences);
    }

    // Filter out products without valid images
    let productList = allProducts.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
    console.log(`[SEARCH] Filtered products with images: ${allProducts.length} -> ${productList.length} (removed ${allProducts.length - productList.length} without images)`);
    
    // Ensure productList is always defined
    if (!productList) {
      productList = [];
    }
    
    // If we don't have enough products with images, try to get more
    if (productList.length < count && productList.length < results.length) {
      console.log(`[SEARCH] Not enough products with images (${productList.length}/${count}), trying to fetch more from remaining results`);
      const remainingResults = results.slice(picked.length, Math.min(results.length, picked.length + count * 2));
      const moreProducts = await Promise.all(remainingResults.map(async (r: any, idx: number) => {
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
        
        // Try multiple image sources in order of preference (same as above)
        let imageUrl: string | null = null;
        
        // 1. Direct thumbnail from result
        imageUrl = r.thumbnail || r.image || r.original_image || null;
        
        // 2. Try product API if we have product_id
        if (!imageUrl && r.product_id) {
          imageUrl = await fetchProductImageFromSerpProduct(r.product_id);
        }
        
        // 3. Try og:image from product page
        if (!imageUrl && productUrl && productUrl !== '#') {
          imageUrl = await fetchOgImage(productUrl);
        }
        
        // 4. Try extracting from any image fields in the result
        if (!imageUrl) {
          const possibleImages = [
            r.thumbnail,
            r.image,
            r.original_image,
            r.images?.[0]?.link,
            r.images?.[0]?.thumbnail,
            r.product_photos?.[0]?.link,
            r.product_photos?.[0]?.thumbnail,
          ].filter(Boolean);
          imageUrl = possibleImages[0] || null;
        }

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
          imageUrl: imageUrl || '',
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
      }));
      
      const moreWithImages = moreProducts.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
      productList.push(...moreWithImages);
      console.log(`[SEARCH] Added ${moreWithImages.length} more products with images, total now: ${productList.length}`);
    }

    // If we still don't have enough products with images, fall back to internal products
    if (productList.length < count) {
      console.log(`[SEARCH] Only found ${productList.length} products with images (need ${count}), falling back to internal products`);
      const searchParams = req.nextUrl.searchParams;
      let fallbackQuery = searchParams.get('q') || '';
      const fallbackCount = count - productList.length;
      
      try {
        // Directly query internal products instead of calling the function that returns NextResponse
        const searchTerm = fallbackQuery.trim() ? `%${fallbackQuery.trim()}%` : null;
        let internalResults: any[];
        
        if (searchTerm) {
          internalResults = await db
            .select()
            .from(products)
            .where(
              or(
                ilike(products.name, searchTerm),
                ilike(products.brand, searchTerm),
                ilike(products.category, searchTerm),
                sql`COALESCE(${products.description}, '') ILIKE ${searchTerm}`
              )
            )
            .limit(fallbackCount * 2); // Get more to account for filtering
        } else {
          internalResults = await db
            .select()
            .from(products)
            .where(eq(products.trending, true))
            .limit(fallbackCount * 2);
        }
        
        // Filter to only products with images
        const internalWithImages = internalResults
          .filter(p => p.imageUrl && p.imageUrl.trim() !== '')
          .slice(0, fallbackCount)
          .map((p) => ({
            id: p.id,
            externalId: p.externalId,
            name: p.name,
            brand: p.brand,
            price: parseFloat(p.price),
            currency: p.currency,
            retailer: p.retailer,
            category: p.category,
            subcategory: p.subcategory,
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
            description: p.description,
            availableSizes: p.availableSizes,
            colors: p.colors,
            inStock: p.inStock,
            trending: p.trending,
            isNew: p.isNew,
            isEditorial: p.isEditorial,
            isExternal: false,
          }));
        
        productList.push(...internalWithImages);
        console.log(`[SEARCH] Added ${internalWithImages.length} internal products with images, total now: ${productList.length}`);
      } catch (error) {
        console.error('[SEARCH] Failed to fetch internal products as fallback:', error);
      }
    }

    return NextResponse.json({ products: productList.slice(0, count), count: productList.slice(0, count).length, source: 'serpapi' });
  } catch (error) {
    console.error('[SEARCH] SerpAPI error:', error);
    if (error instanceof Error) {
      console.error('[SEARCH] Error details:', error.message, error.stack);
    }
    // Fallback to internal products on error
    const searchParams = req.nextUrl.searchParams;
    let q = searchParams.get('q') || '';
    const count = parseInt(searchParams.get('count') || '15');
    
    // Try to get user preferences for fallback
    let userPreferences: { gender?: string; sizes?: { top?: string; bottom?: string; shoes?: string } } | undefined;
    try {
      const { userId } = await auth();
      if (userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.clerkId, userId),
        });
        if (user?.preferences) {
          userPreferences = user.preferences;
        }
      }
    } catch (error) {
      // Silently fail
    }
    
    q = enhanceQueryWithPreferences(q, userPreferences);
    console.log('[SEARCH] Falling back to internal products due to error');
    return await getInternalProducts(q, count, userPreferences);
  }
}

async function getInternalProducts(query: string, count: number, userPreferences?: { gender?: string; sizes?: { top?: string; bottom?: string; shoes?: string } }) {
  try {
    console.log('[SEARCH] Fetching internal products for query:', query);
    
    let productResults;
    
    if (query && query.trim().length > 0) {
      // Search by name, brand, or category
      // Note: query already enhanced with user preferences
      const searchTerm = `%${query.trim()}%`;
      productResults = await db
        .select()
        .from(products)
        .where(
          or(
            ilike(products.name, searchTerm),
            ilike(products.brand, searchTerm),
            ilike(products.category, searchTerm),
            sql`COALESCE(${products.description}, '') ILIKE ${searchTerm}`
          )
        )
        .limit(count);
    } else {
      // Return trending products if no query
      productResults = await db
        .select()
        .from(products)
        .where(eq(products.trending, true))
        .limit(count);
    }

    // If no results, fallback to random products
    if (productResults.length === 0) {
      console.log('[SEARCH] No matching products, returning random products');
      productResults = await db
        .select()
        .from(products)
        .orderBy(sql`RANDOM()`)
        .limit(count);
    }

    const transformedProducts = productResults.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      name: p.name,
      brand: p.brand,
      price: parseFloat(p.price),
      currency: p.currency,
      retailer: p.retailer,
      category: p.category,
      subcategory: p.subcategory,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl,
      description: p.description,
      availableSizes: p.availableSizes,
      colors: p.colors,
      inStock: p.inStock,
      trending: p.trending,
      isNew: p.isNew,
      isEditorial: p.isEditorial,
      isExternal: false,
    }));

    console.log('[SEARCH] Returning', transformedProducts.length, 'internal products');
    return NextResponse.json({ 
      products: transformedProducts, 
      count: transformedProducts.length, 
      source: 'internal',
      fallback: true 
    });
  } catch (error) {
    console.error('[SEARCH] Internal products fallback error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
