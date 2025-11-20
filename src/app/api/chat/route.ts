import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { conversations, messages, users, products } from '@/lib/db/schema';
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm';
import { generateOutfitTryOn, type OutfitItem } from '@/services/tryon';
import { GoogleGenAI } from '@google/genai';
import { integrateFashionStylist } from '@/services/fashionStylistIntegration';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  outfitImage?: string;
  products?: OutfitItem[];
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    console.log('[CHAT] Incoming request');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[CHAT] ===== NEW REQUEST =====');
    console.log('[CHAT] Raw body keys:', Object.keys(body));
    console.log('[CHAT] Raw body:', JSON.stringify(body).slice(0, 200));
    
    const { message, conversationId, priorItems, priorOutfitImage, pendingClarification } = body as { 
      message: string; 
      conversationId?: string; 
      priorItems?: OutfitItem[]; 
      priorOutfitImage?: string;
      pendingClarification?: any;
    };
    console.log('[CHAT] userId:', userId);
    console.log('[CHAT] message:', message);
    console.log('[CHAT] priorItems type:', typeof priorItems, 'isArray:', Array.isArray(priorItems));
    console.log('[CHAT] priorItems:', Array.isArray(priorItems) ? `${priorItems.length} items: ${priorItems.map(i => i.name).join(', ')}` : JSON.stringify(priorItems));
    console.log('[CHAT] priorOutfitImage type:', typeof priorOutfitImage);
    console.log('[CHAT] priorOutfitImage:', priorOutfitImage ? `exists (${priorOutfitImage.slice(0, 60)}...)` : 'none');
    console.log('[CHAT] pendingClarification:', pendingClarification ? pendingClarification.question : 'none');

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user and primary photo
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: { photos: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const primaryPhoto = user.photos.find(p => p.isPrimary) || user.photos[0];
    if (!primaryPhoto) {
      return NextResponse.json({
        error: 'No photos found. Please upload a photo first.',
        needsPhoto: true,
      }, { status: 400 });
    }
    
    // Check if outfit analysis exists (required for chat)
    if (!primaryPhoto.metadata?.outfitAnalysis) {
      console.warn('[CHAT] ⚠️ No outfit analysis found in primary photo');
      console.warn('[CHAT] ⚠️ Outfit analysis is required for chat functionality');
      return NextResponse.json({
        error: 'Outfit analysis is required before using chat. Please re-upload your photo from the profile page to trigger outfit analysis.',
        needsOutfitAnalysis: true,
        code: 'OUTFIT_ANALYSIS_REQUIRED',
      }, { status: 400 });
    }
    
    // Log outfit analysis details
    const outfitAnalysis = primaryPhoto.metadata.outfitAnalysis;
    console.log('[CHAT] ✓ Primary photo has stored outfit analysis:', {
      itemCount: outfitAnalysis.items.length,
      items: outfitAnalysis.items.map((i: any) => i.name),
      zones: outfitAnalysis.detectedZones,
      confidence: outfitAnalysis.confidence,
      analyzedAt: outfitAnalysis.analyzedAt,
    });

    // Check if user has gender preference (required for virtual try-on)
    const userPreferences = user.preferences;
    const userGender = (userPreferences as any)?.gender;
    if (!userGender || userGender === 'prefer-not-to-say') {
      return NextResponse.json({
        error: 'Gender preference is required for virtual try-on. Please update your profile.',
        code: 'GENDER_REQUIRED',
        redirectTo: '/profile',
      }, { status: 400 });
    }

    // Extract user preferences for query enhancement

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: { messages: { orderBy: [desc(messages.createdAt)] } },
      });
    } else {
      const [newConv] = await db.insert(conversations).values({
        userId: user.id,
      }).returning();
      conversation = newConv;
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Save user message
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    });
    // Touch conversation's lastMessageAt as soon as we get a user message
    await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversation.id));

    // Parse user message for product requests - handle MULTIPLE items in one message
    let productRequests: Array<{query: string; brand?: string; color?: string; category?: string}> = [];
    
    // Try to detect multiple items using conjunctions
    const multiItemPatterns = /\band\b|,|\bthen\b|\balso\b|\bplus\b/i;
    const hasMulitpleItems = multiItemPatterns.test(message);
    
    if (hasMulitpleItems) {
      console.log('[CHAT] Detected multiple items in message');
      // Split by conjunctions and process each part
      const parts = message.split(/\band\b|,|\bthen\b|\balso\b|\bplus\b/i).map(p => p.trim()).filter(Boolean);
      console.log('[CHAT] Split into parts:', parts);
      
      for (const part of parts) {
        const parsed = parseUserQuery(part);
        if (parsed.category || parsed.brand || parsed.color) {
          const q = [parsed.brand, parsed.color, parsed.category].filter(Boolean).join(' ').trim();
          if (q) {
            productRequests.push({ query: q, ...parsed });
            console.log('[CHAT] Added request from part:', q, parsed);
          }
        }
      }
    }
    
    // If no multiple items detected or parsing failed, try Gemini
    if (productRequests.length === 0) {
      const geminiParsed = await extractQueryWithGemini(message).catch((err) => {
        console.warn('[CHAT] Gemini parse failed:', err instanceof Error ? err.message : err);
        return null;
      });
      if (geminiParsed) {
        console.log('[CHAT] Gemini parsed:', geminiParsed);
        
        // Check if Gemini returned multiple items
        if (geminiParsed.items && Array.isArray(geminiParsed.items)) {
          console.log('[CHAT] Gemini detected', geminiParsed.items.length, 'items');
          for (const item of geminiParsed.items) {
            const q = [item.brand, item.color, item.category, ...(item.style || [])]
              .filter(Boolean)
              .join(' ')
              .trim();
            if (q) {
              productRequests.push({ query: q, brand: item.brand, color: item.color, category: item.category });
              console.log('[CHAT] Added Gemini item query:', q);
            }
          }
        } else {
          // Single item
          const q = [geminiParsed.brand, geminiParsed.color, geminiParsed.category, ...(geminiParsed.style || [])]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (q) {
            productRequests.push({ query: q, brand: geminiParsed.brand, color: geminiParsed.color, category: geminiParsed.category });
            console.log('[CHAT] Using Gemini query:', q);
          }
        }
      }
    }
    
    if (productRequests.length === 0) {
      const fallbackParsed = parseUserQuery(message);
      console.log('[CHAT] Local parsed:', fallbackParsed);
      const fallbackQ = [fallbackParsed.brand, fallbackParsed.color, fallbackParsed.category]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fallbackQ) {
        productRequests.push({ query: fallbackQ, ...fallbackParsed });
        console.log('[CHAT] Using fallback query:', fallbackQ);
      }
    }
    console.log('[CHAT] Final productRequests:', productRequests.map(r => r.query));
    
    let outfitItems: OutfitItem[] = [];
    let responseText = '';

    if (productRequests.length === 0) {
      // Fallback: try the whole message as a search query
      const wholeMsg = message.trim().slice(0, 80);
      productRequests.push({ query: wholeMsg });
      console.log('[CHAT] No parsed query, using whole message:', wholeMsg);
    }

    if (productRequests.length > 0) {
      // Search for products using SerpAPI (fallback to internal products if missing key)
      const serpKey = process.env.SERPAPI_API_KEY;
      console.log('[CHAT] SERPAPI_API_KEY check:');
      console.log('[CHAT]   - Key exists:', 'SERPAPI_API_KEY' in process.env);
      console.log('[CHAT]   - Value present:', !!serpKey);
      console.log('[CHAT]   - Value length:', serpKey ? serpKey.length : 0);
      console.log('[CHAT]   - Value preview:', serpKey ? `${serpKey.substring(0, 10)}...` : 'undefined');

      // Helper function to enhance query with user preferences
      const enhanceQueryWithPreferences = (query: string): string => {
        if (!query.trim() || !userPreferences) return query;
        
        const parts: string[] = [query];
        
        // Add gender if available
        if (userPreferences.gender && userPreferences.gender !== 'prefer-not-to-say') {
          const genderMap: Record<string, string> = {
            'men': 'men',
            'women': 'women',
            'unisex': 'unisex',
            'non-binary': 'unisex',
          };
          const genderTerm = genderMap[userPreferences.gender];
          if (genderTerm && !query.toLowerCase().includes(genderTerm.toLowerCase())) {
            parts.push(genderTerm);
          }
        }
        
        // Add size context if available
        if (userPreferences.sizes) {
          const queryLower = query.toLowerCase();
          const isTopQuery = ['shirt', 'top', 't-shirt', 'blouse', 'sweater', 'hoodie', 'jacket', 'coat', 'crop top'].some(term => queryLower.includes(term));
          const isBottomQuery = ['pants', 'jeans', 'trousers', 'shorts', 'skirt'].some(term => queryLower.includes(term));
          const isShoeQuery = ['shoe', 'sneaker', 'boot', 'sandal', 'heel', 'sneakers'].some(term => queryLower.includes(term));
          
          if (isTopQuery && userPreferences.sizes.top) {
            parts.push(`size ${userPreferences.sizes.top}`);
          } else if (isBottomQuery && userPreferences.sizes.bottom) {
            parts.push(`size ${userPreferences.sizes.bottom}`);
          } else if (isShoeQuery && userPreferences.sizes.shoes) {
            parts.push(`size ${userPreferences.sizes.shoes}`);
          }
        }
        
        return parts.join(' ');
      };

      // Helper: run a single search query string through /api/search/products
      const runSearch = async (q: string): Promise<any[]> => {
        // Enhance query with user preferences
        const enhancedQuery = enhanceQueryWithPreferences(q);
        console.log('[CHAT] Original query:', q, 'Enhanced:', enhancedQuery);
        
        let foundProducts: any[] = [];
        if (serpKey) {
          // Call SerpAPI directly from server side
          try {
            console.log('[CHAT] Searching SerpAPI directly with q="' + enhancedQuery + '"');
            const serpUrl = new URL('https://serpapi.com/search.json');
            serpUrl.searchParams.set('engine', 'google_shopping_light');
            serpUrl.searchParams.set('q', enhancedQuery);
            serpUrl.searchParams.set('api_key', serpKey);
            
            const serpRes = await fetch(serpUrl.toString());
            console.log('[CHAT] SerpAPI direct response status:', serpRes.status);
            if (serpRes.ok) {
              const serpData = await serpRes.json();
              const results = Array.isArray(serpData?.shopping_results) ? serpData.shopping_results : [];
              console.log(`[CHAT] SerpAPI raw results: ${results.length}`);
              
              // Transform SerpAPI results to our product format
              foundProducts = results.slice(0, 10).map((r: any, idx: number) => {
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
                
                return {
                  id: `serp-${r.product_id || idx}-${Math.random().toString(36).slice(2, 8)}`,
                  name: r.title || 'Product',
                  brand: r.source || r.store || 'Unknown',
                  price: isFinite(price) ? price : 0,
                  currency,
                  retailer: r.source || r.store || 'Unknown',
                  category: 'search',
                  imageUrl: r.thumbnail || r.image || '',
                  productUrl: r.link || r.product_link || '#',
                  isExternal: true,
                };
              });
              
              console.log(`[CHAT] Transformed to ${foundProducts.length} products`);
              if (foundProducts.length > 0) {
                console.log('[CHAT] Top 3:', foundProducts.slice(0,3).map((p:any)=>({name:p.name, brand:p.brand, hasImage: !!p.imageUrl})));
              }
            } else {
              const text = await serpRes.text();
              console.error('[CHAT] SerpAPI direct call failed:', serpRes.status, text.slice(0, 200));
            }
          } catch (err) {
            console.error('[CHAT] SerpAPI request error:', err instanceof Error ? err.message : err);
          }
        } else {
          console.warn('[CHAT] No SERPAPI_API_KEY found');
        }
        
        // If no products from SerpAPI, fallback to internal
        if (foundProducts.length === 0) {
          console.log('[CHAT] Falling back to internal products');
          try {
            // Use enhanced query for internal search too
            const searchTerm = `%${enhancedQuery.trim()}%`;
            const internalProducts = await db
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
              .limit(10);
            
            console.log(`[CHAT] Found ${internalProducts.length} internal products`);
            
            foundProducts = internalProducts.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              price: parseFloat(p.price),
              currency: p.currency,
              retailer: p.retailer,
              category: p.category,
              imageUrl: p.imageUrl,
              productUrl: p.productUrl,
              isExternal: false,
            }));
          } catch (err) {
            console.error('[CHAT] Internal products query error:', err instanceof Error ? err.message : err);
          }
        }
        return foundProducts;
      };

      // For each initial request, try progressive relaxation if needed
      for (const request of productRequests) {
        let products: any[] = await runSearch(request.query);

        if (products.length === 0) {
          // Progressive fallback: drop style words, then brand, then color
          const parsed = request.brand || request.color || request.category ? request : parseUserQuery(request.query);
          const parts = {
            brand: parsed.brand,
            color: parsed.color,
            category: parsed.category,
          };
          const candidates: string[] = [];
          // brand+color+category
          candidates.push([parts.brand, parts.color, parts.category].filter(Boolean).join(' '));
          // brand+category
          candidates.push([parts.brand, parts.category].filter(Boolean).join(' '));
          // color+category
          candidates.push([parts.color, parts.category].filter(Boolean).join(' '));
          // category only
          candidates.push([parts.category].filter(Boolean).join(' '));

          for (const candidateQuery of candidates.filter(Boolean)) {
            if (products.length > 0) break;
            products = await runSearch(candidateQuery);
          }
        }

        if (products.length > 0) {
          // Re-rank by brand/color/category relevance
          const parsed = parseUserQuery(message);
          const product = pickBestProduct(products, parsed);
          if (product) {
            // Infer category from parsed query or product name
            // ALWAYS infer from name, don't trust product.category from SERP
            const name = (product.name || '').toLowerCase();
            const queryLower = message.toLowerCase();
            
            let category = parsed.category; // Start with parsed category from user query
            
            // If no category from query, infer from product name
            if (!category || category === 'search') {
              if (['jacket', 'coat', 'puffer', 'parka', 'blazer', 'cardigan'].some(k => name.includes(k))) {
                category = 'jacket';
              } else if (['jean', 'pants', 'trouser', 'chino', 'jogger'].some(k => name.includes(k))) {
                category = 'jeans';
              } else if (['top', 't-shirt', 'tshirt', 'tee', 'blouse', 'shirt', 'cami'].some(k => name.includes(k) || queryLower.includes(k))) {
                category = 'top';
              } else if (['dress', 'gown'].some(k => name.includes(k))) {
                category = 'dress';
              } else if (['skirt'].some(k => name.includes(k))) {
                category = 'skirt';
              } else if (['shoe', 'sneaker', 'boot', 'sandal', 'heel'].some(k => name.includes(k))) {
                category = 'shoes';
              } else if (['sweater', 'hoodie', 'sweatshirt', 'pullover'].some(k => name.includes(k))) {
                category = 'sweater';
              } else {
                category = 'other';
              }
            }
            
            console.log('[CHAT] Chosen product:', { name: product.name, category, normalizedCategory: normalizeCategory(category), brand: product.brand || product.retailer, hasImage: !!product.imageUrl });
            outfitItems.push({
              name: product.name || 'Item',
              imageUrl: product.imageUrl || '',
              productUrl: product.productUrl || '#',
              price: product.price,
              currency: product.currency,
              brand: product.brand,
              retailer: product.retailer,
              category: category || 'other',
            });
          } else {
            console.warn('[CHAT] pickBestProduct returned null despite having products');
          }
        } else {
          console.warn('[CHAT] No products found for request:', request.query);
        }
      }
    }

    // Use AI Stylist to analyze the request and make decisions
    console.log('[CHAT] ===== FASHION AI STYLIST =====');
    
    // Option 1: Use photo-based outfit analysis if no priorItems and user has photo
    // Option 2: Use priorItems (items from previous chat messages)
    let currentItems = Array.isArray(priorItems) ? priorItems : [];
    
    // Determine outfit source for decision context
    let outfitSource: 'photo' | 'prior_items' | 'empty' = currentItems.length > 0 ? 'prior_items' : 'empty';
    
    // Store original photo outfit for restoration (e.g., when replacing dress with top, restore original bottom)
    let originalPhotoOutfit: OutfitItem[] | undefined;
    
    // If no prior items but user has a photo, use stored outfit analysis from photo metadata
    // Note: We already checked that outfitAnalysis exists above, so it should be available
    if (currentItems.length === 0 && primaryPhoto && !priorOutfitImage) {
      console.log('[CHAT] No prior items found. Using stored outfit analysis from photo metadata...');
      
      // Use the outfit analysis we already verified exists
      const storedAnalysis = primaryPhoto.metadata!.outfitAnalysis!;
      console.log('[CHAT] Using stored outfit analysis:', {
        itemCount: storedAnalysis.items.length,
        items: storedAnalysis.items.map((i: any) => i.name),
        zones: storedAnalysis.detectedZones,
        confidence: storedAnalysis.confidence,
        analyzedAt: storedAnalysis.analyzedAt,
      });
      
      // Convert stored analysis to OutfitItem format
      const { photoOutfitToItems } = await import('@/services/photoOutfitHelper');
      currentItems = photoOutfitToItems(storedAnalysis);
      originalPhotoOutfit = [...currentItems]; // Store original for restoration
      
      outfitSource = 'photo';
      console.log('[CHAT] ✓ Using stored photo-analyzed outfit as current outfit for decision tree');
      console.log('[CHAT] ✓ Stored original photo outfit for potential restoration:', originalPhotoOutfit.map(i => i.name));
    } else if (primaryPhoto && primaryPhoto.metadata?.outfitAnalysis) {
      // Even if we have prior items, store original photo outfit for restoration
      const { photoOutfitToItems } = await import('@/services/photoOutfitHelper');
      originalPhotoOutfit = photoOutfitToItems(primaryPhoto.metadata.outfitAnalysis);
      console.log('[CHAT] ✓ Stored original photo outfit for potential restoration:', originalPhotoOutfit.map(i => i.name));
    }
    
    const stylistResult = await integrateFashionStylist(
      message,
      currentItems,
      outfitItems,
      conversation.id,
      user.id,
      outfitSource,
      originalPhotoOutfit
    );
    
    console.log('[CHAT] Stylist integration result:', {
      shouldProceed: stylistResult.shouldProceed,
      needsClarification: stylistResult.needsClarification,
      shouldRegenerateFromScratch: stylistResult.shouldRegenerateFromScratch,
      decisionContextLength: stylistResult.decisionContextPrompt?.length
    });

    if (!stylistResult.shouldProceed) {
      if (stylistResult.needsClarification && stylistResult.clarificationQuestion) {
        console.log('[CHAT] Stylist needs clarification');
        const [assistantMessage] = await db.insert(messages).values({
          conversationId: conversation.id,
          role: 'assistant',
          content: stylistResult.responseText,
          clarificationContext: stylistResult.clarificationQuestion,
        }).returning();

        await db.update(conversations)
          .set({ lastMessageAt: assistantMessage.createdAt })
          .where(eq(conversations.id, conversation.id));

        return NextResponse.json({
          success: true,
          message: {
            id: assistantMessage.id,
            role: 'assistant',
            content: stylistResult.responseText,
            clarificationQuestion: stylistResult.clarificationQuestion,
            timestamp: assistantMessage.createdAt.toISOString(),
          },
          conversationId: conversation.id,
        });
      }

      // If stylist declined without clarification, fall back gracefully
      responseText = stylistResult.responseText || responseText;
    }

    const mergedItems: OutfitItem[] = stylistResult.finalItems.length > 0
      ? stylistResult.finalItems
      : [...currentItems, ...outfitItems];

    const decisionContextPrompt = stylistResult.decisionContextPrompt || '';
    const shouldRegenerateFromScratch = stylistResult.shouldRegenerateFromScratch;
    responseText = stylistResult.responseText || responseText;

    console.log('[CHAT] Final merged items:', mergedItems.map(i => ({ name: i.name, category: i.category, zone: (i as any).zone })));

    // Generate outfit image if items found
    let outfitImageUrl: string | undefined;
    const itemsForTryOn = mergedItems.filter(i => !!i.imageUrl);
    let itemsToApply: OutfitItem[] = []; // Define outside block for debug info

    if (itemsForTryOn.length > 0) {
      console.log('[CHAT] ===== GENERATING TRY-ON =====');
      console.log('[CHAT] Should regenerate from scratch?', stylistResult.shouldRegenerateFromScratch);
      
      let baseImage: string;
      
      if (stylistResult.shouldRegenerateFromScratch) {
        // Regenerate from scratch with all merged items
        console.log('[CHAT] DECISION: Regenerating from original photo with all merged items');
        baseImage = primaryPhoto.url;
        itemsToApply = itemsForTryOn;
      } else if (priorOutfitImage && currentItems.length > 0) {
        // Build on top of existing outfit with only new items
        console.log('[CHAT] DECISION: Building on prior outfit with new items only');
        baseImage = priorOutfitImage;
        // Find items that are in finalItems but not in currentItems (i.e., newly added items)
        const currentItemNames = new Set(currentItems.map(item => item.name));
        const newItems = mergedItems.filter(item => !currentItemNames.has(item.name) && !!item.imageUrl);
        itemsToApply = newItems;
      } else {
        // First time or no prior context
        console.log('[CHAT] DECISION: First outfit - using original user photo');
        baseImage = primaryPhoto.url;
        itemsToApply = itemsForTryOn;
      }
      
      console.log('[CHAT] Base image:', baseImage === primaryPhoto.url ? 'original user photo' : 'prior outfit');
      console.log('[CHAT] Items to apply:', itemsToApply.map(i => i.name));
      
      const outfitResult = await generateOutfitTryOn(baseImage, itemsToApply, {
        decisionContext: decisionContextPrompt,
      });
      
      console.log('[CHAT] Try-on result:', { 
        success: outfitResult.success, 
        hasImage: !!outfitResult.imageUrl, 
        error: outfitResult.error 
      });
      console.log('[CHAT] ===== TRY-ON COMPLETE =====');
      
      if (outfitResult.success && outfitResult.imageUrl) {
        outfitImageUrl = outfitResult.imageUrl;
      }
    } else {
      console.log('[CHAT] Skipping try-on: no items with imageUrl');
    }

    // Generate AI response using stylist's response text
    if (mergedItems.length > 0) {
      const itemsList = mergedItems.map(item => {
        const cat = normalizeCategory(item.category);
        return `${item.name} (${cat})`;
      }).join(', ');
      
      // Use stylist's response text and enhance it with item list
      responseText = `${stylistResult.responseText} Now wearing: ${itemsList}. ${mergedItems.length < 3 ? 'Keep building your look by adding more items!' : 'Want to add or replace anything else?'}`;
    } else {
      // Include user preferences context in error message if available
      const prefContext = userPreferences?.gender && userPreferences.gender !== 'prefer-not-to-say' 
        ? ` for ${userPreferences.gender === 'men' ? 'men' : userPreferences.gender === 'women' ? 'women' : 'you'}`
        : '';
      responseText = `I couldn't find good matches${prefContext} for "${message}". Try something like 'red crop top from Zara', 'black jeans from H&M', or include specific brands and colors.`;
    }

    // Save assistant message
    const [assistantMessage] = await db.insert(messages).values({
      conversationId: conversation.id,
      role: 'assistant',
      content: responseText,
      productRecommendations: mergedItems.length > 0 ? mergedItems.map(i => i.name) : undefined,
      outfitImageUrl: outfitImageUrl,
      outfitProducts: mergedItems.length > 0 ? mergedItems : undefined,
      requestType: stylistResult.requestType,
    }).returning();

    // Update conversation lastMessageAt based on assistant message timestamp
    await db.update(conversations)
      .set({ lastMessageAt: assistantMessage.createdAt })
      .where(eq(conversations.id, conversation.id));

    // Collect debug logs for client (in development)
    const debugInfo: any = {};
    if (process.env.NODE_ENV === 'development') {
      debugInfo.stylist = {
        classification: stylistResult.requestType || 'unknown',
        decision: stylistResult.shouldRegenerateFromScratch ? 'REGENERATE_FROM_SCRATCH' : 'LAYER_ON_EXISTING',
        finalItemsCount: mergedItems.length,
        itemsToApplyCount: itemsToApply?.length || 0,
        decisionContextLength: stylistResult.decisionContextPrompt?.length || 0,
      };
    }

    return NextResponse.json({
      success: true,
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: responseText,
        outfitImage: outfitImageUrl,
        products: mergedItems,
        timestamp: assistantMessage.createdAt.toISOString(),
      },
      conversationId: conversation.id,
      debug: debugInfo, // Only in development
    });

  } catch (error) {
    console.error('[CHAT] API error:', error);
    if (error instanceof Error) {
      console.error('[CHAT] Error message:', error.message);
      console.error('[CHAT] Error stack:', error.stack);
    }
    // Log more details for debugging
    if (error && typeof error === 'object') {
      console.error('[CHAT] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    return NextResponse.json({ 
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const all = searchParams.get('all') === 'true';

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (all) {
      const convs = await db.query.conversations.findMany({
        where: eq(conversations.userId, user.id),
        orderBy: [desc(conversations.lastMessageAt)],
      });
      return NextResponse.json({ success: true, conversations: convs });
    }

    let conversation;
    if (conversationId) {
      conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: { messages: { orderBy: [desc(messages.createdAt)] } },
      });
    } else {
      // Get latest conversation
      conversation = await db.query.conversations.findFirst({
        where: eq(conversations.userId, user.id),
        orderBy: [desc(conversations.lastMessageAt)],
        with: { messages: { orderBy: [desc(messages.createdAt)] } },
      });
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: conversation?.messages?.reverse() || [],
    });

  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

function extractProductRequests(message: string): string[] {
  const { brand, color, category } = parseUserQuery(message);
  const q = [brand, color, category].filter(Boolean).join(' ').trim();
  return q ? [q] : [];
}

// Parse brand, color and category (very lightweight NLP)
function parseUserQuery(message: string): { brand?: string; color?: string; category?: string } {
  const text = message.toLowerCase().replace(/[^a-z0-9&\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const brandAliases: Record<string, string> = {
    'h&m': 'H&M', 'h & m': 'H&M', 'hm': 'H&M',
    'zara': 'Zara', 'uniqlo': 'UNIQLO', 'nike': 'Nike', 'adidas': 'Adidas',
    'patagonia': 'Patagonia', 'gap': 'GAP', 'hollister': 'Hollister', 'h and m': 'H&M'
  };

  const colors = ['black','blue','red','white','green','pink','purple','yellow','orange','brown','grey','gray','navy','beige','cream','tan'];

  // Map of category synonyms -> canonical
  const catMap: Record<string, string> = {
    'jacket': 'jacket', 'coat': 'jacket', 'puffer': 'jacket', 'parka': 'jacket',
    'top': 'top', 't shirt': 'top', 'tshirt': 'top', 'tee': 'top', 'blouse': 'top', 'shirt': 'top',
    'jeans': 'jeans', 'denim': 'jeans', 'trousers': 'pants', 'pants': 'pants',
    'dress': 'dress', 'skirt': 'skirt', 'hoodie': 'hoodie', 'sweater': 'sweater'
  };

  // Brand detection
  let brand: string | undefined;
  for (const alias in brandAliases) {
    const pattern = new RegExp(`(^|\s)${alias}($|\s)`);
    if (pattern.test(text)) { brand = brandAliases[alias]; break; }
  }

  // Color detection
  let color: string | undefined;
  for (const c of colors) {
    const pattern = new RegExp(`(^|\s)${c}($|\s)`);
    if (pattern.test(text)) { color = c; break; }
  }

  // Category detection (prefer more specific words first)
  const catKeys = Object.keys(catMap).sort((a,b)=>b.length-a.length);
  let category: string | undefined;
  for (const key of catKeys) {
    const pattern = new RegExp(`(^|\s)${key}($|\s)`);
    if (pattern.test(text)) { category = catMap[key]; break; }
  }

  return { brand, color, category };
}

// Score and pick best product from SerpAPI/internal results
function pickBestProduct(products: any[], query: { brand?: string; color?: string; category?: string }) {
  const brand = (query.brand || '').toLowerCase();
  const color = (query.color || '').toLowerCase();
  const category = (query.category || '').toLowerCase();

  let best: any | null = null;
  let bestScore = -1;
  for (const p of products || []) {
    const name = (p.name || '').toLowerCase();
    const retailer = (p.retailer || '').toLowerCase();
    const score = (
      (brand && (name.includes(brand) || retailer.includes(brand)) ? 3 : 0) +
      (color && name.includes(color) ? 2 : 0) +
      (category && name.includes(category) ? 2 : 0) +
      (p.imageUrl ? 1 : 0)
    );
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best || (products && products[0]);
}

async function extractQueryWithGemini(message: string): Promise<{ items?: Array<{ brand?: string; color?: string; category?: string; style?: string[] }>; brand?: string; color?: string; category?: string; style?: string[] }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Promise.reject(new Error('Missing GEMINI_API_KEY'));
    const ai = new GoogleGenAI({ apiKey });

    const system = `You are a fashion shopping assistant. Extract structured search terms from the user's message.

If the message mentions MULTIPLE clothing items (e.g., "jacket and jeans"), return:
{"items": [{"brand":string, "color":string, "category":string, "style":string[]}, ...]}

If the message mentions ONE item, return:
{"brand":string, "color":string, "category":string, "style":string[]}

Fields:
- brand: retail brand if mentioned (H&M, Zara, UNIQLO, etc.)
- color: main color (lowercase)
- category: jacket, top, jeans, pants, dress, skirt, hoodie, sweater, shoes
- style: extra terms like puffer, cropped, oversized, slim

Return ONLY valid JSON. No prose.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        { role: 'user', parts: [{ text: system }, { text: `User: ${message}` }] },
      ],
    });

    // Extract text from candidates -> content.parts[0].text per @google/genai response shape
    const text = (res as any)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = (typeof text === 'string' ? text : '').trim().replace(/^```(json)?/i, '').replace(/```$/,'').trim();
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = req.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Ensure the conversation belongs to the user
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const conv = await db.query.conversations.findFirst({
      where: and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)),
    });
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    await db.delete(conversations).where(eq(conversations.id, conversationId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}

// Normalize category names to standard types for replacement logic
function normalizeCategory(category?: string): string {
  if (!category) return 'other';
  const cat = category.toLowerCase();
  
  // Group similar items together
  if (['jacket', 'coat', 'puffer', 'parka', 'blazer', 'cardigan'].some(k => cat.includes(k))) return 'outerwear';
  if (['top', 't-shirt', 'tshirt', 'tee', 'blouse', 'shirt', 'sweater', 'hoodie'].some(k => cat.includes(k))) return 'top';
  if (['jeans', 'pants', 'trousers', 'chinos', 'joggers'].some(k => cat.includes(k))) return 'bottom';
  if (['dress', 'gown'].some(k => cat.includes(k))) return 'dress';
  if (['skirt'].some(k => cat.includes(k))) return 'skirt';
  if (['shoes', 'sneakers', 'boots', 'sandals', 'heels'].some(k => cat.includes(k))) return 'footwear';
  if (['bag', 'purse', 'backpack', 'tote'].some(k => cat.includes(k))) return 'bag';
  if (['hat', 'cap', 'beanie'].some(k => cat.includes(k))) return 'headwear';
  if (['necklace', 'bracelet', 'earrings', 'ring', 'watch', 'jewelry'].some(k => cat.includes(k))) return 'accessories';
  
  return 'other';
}

// Merge outfit items: new items REPLACE items in the same category
function mergeOutfitItems(priorItems: OutfitItem[], newItems: OutfitItem[]): OutfitItem[] {
  if (newItems.length === 0) return priorItems;
  
  // Get categories of new items
  const newCategories = new Set(newItems.map(item => normalizeCategory(item.category)));
  console.log('[CHAT] New item categories:', Array.from(newCategories));
  
  // Keep only prior items that are NOT in the new categories
  const retained = priorItems.filter(item => {
    const cat = normalizeCategory(item.category);
    const keep = !newCategories.has(cat);
    if (!keep) {
      console.log('[CHAT] Replacing prior item:', item.name, 'category:', cat);
    }
    return keep;
  });
  
  console.log('[CHAT] Retained prior items:', retained.map(i => ({name:i.name, category:normalizeCategory(i.category)})));
  
  // Return retained + new items
  return [...retained, ...newItems];
}

function generateStylistResponse(userMessage: string): string {
  const responses = [
    "I'd love to help you put together a great outfit! What type of clothing item are you looking for?",
    "Tell me more about what you're shopping for - a top, bottom, shoes, or accessories?",
    "What's the occasion? I can suggest some perfect pieces for your style!",
    "Let me know what colors or styles you prefer, and I'll find some great options for you!",
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}
