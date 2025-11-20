import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, tryOnCache } from '@/lib/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { generateVirtualTryOn } from '@/services/tryon';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has gender preference (required for virtual try-on)
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: {
        photos: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userGender = (user.preferences as any)?.gender;
    if (!userGender || userGender === 'prefer-not-to-say') {
      return NextResponse.json(
        { 
          error: 'Gender preference is required for virtual try-on',
          code: 'GENDER_REQUIRED',
          redirectTo: '/profile'
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { userPhotoUrl, productImageUrl, productName, productDescription, outfitAnalysis } = body;

    if (!userPhotoUrl || !productImageUrl || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Try to resolve the user's photo row so we can cache by photoId
    const userPhoto = user.photos.find((p) => p.url === userPhotoUrl) ||
      user.photos.find((p) => p.isPrimary) ||
      user.photos[0];

    // Build cache key components for external/ephemeral products
    const paramsKeyObj = {
      promptVersion: 1,
      productName,
      productDescription: productDescription || null,
    };
    const paramsHash = Buffer.from(JSON.stringify(paramsKeyObj)).toString('base64').slice(0, 255);
    const modelVersion = 'gemini-2.5-flash-image';
    const externalProductKey = `image:${productImageUrl}`.slice(0, 512);

    if (userPhoto) {
      // Check cache first
      const cached = await db.query.tryOnCache.findFirst({
        where: and(
          eq(tryOnCache.userId, user.id),
          eq(tryOnCache.photoId, userPhoto.id),
          eq(tryOnCache.externalProductKey, externalProductKey),
          eq(tryOnCache.modelVersion, modelVersion),
          eq(tryOnCache.paramsHash, paramsHash),
          gte(tryOnCache.expiresAt, new Date()),
        ),
      });

      if (cached) {
        db.update(tryOnCache)
          .set({
            lastAccessedAt: new Date(),
            usageCount: cached.usageCount + 1,
          })
          .where(eq(tryOnCache.id, cached.id))
          .catch((err) => console.error('Failed to update external try-on cache usage metrics', err));

        return NextResponse.json({
          success: true,
          imageUrl: cached.generatedImageUrl,
          cached: true,
        });
      }
    }

    // Build decision context from outfit analysis if provided
    let decisionContext: string | undefined;
    if (outfitAnalysis) {
      const { buildDecisionContextFromOutfitAnalysis } = await import('@/services/outfitDecisionContext');
      decisionContext = buildDecisionContextFromOutfitAnalysis(
        outfitAnalysis,
        productName,
        productDescription || productName.toLowerCase() // Use product name as category fallback
      );
      console.log('[TRYON API] Built decision context from outfit analysis:', {
        itemCount: outfitAnalysis.items?.length || 0,
        zones: outfitAnalysis.detectedZones || [],
      });
    }

    const result = await generateVirtualTryOn({
      userPhotoUrl,
      productImageUrl,
      productName,
      productDescription,
      promptVersion: 1,
      decisionContext,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Try-on generation failed' },
        { status: 200 }
      );
    }

    // Persist to cache if we have a matching photo row
    if (userPhoto && result.imageUrl) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      try {
        await db
          .insert(tryOnCache)
          .values({
            userId: user.id,
            photoId: userPhoto.id,
            externalProductKey,
            generatedImageUrl: result.imageUrl,
            modelVersion,
            paramsHash,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: [
              tryOnCache.userId,
              tryOnCache.photoId,
              tryOnCache.productId,
              tryOnCache.externalProductKey,
              tryOnCache.modelVersion,
              tryOnCache.paramsHash,
            ],
            set: {
              generatedImageUrl: result.imageUrl,
              expiresAt,
              createdAt: new Date(),
              lastAccessedAt: new Date(),
              usageCount: sql`${tryOnCache.usageCount} + 1`,
            },
          });
      } catch (error) {
        console.error('Error upserting external try-on cache entry:', error);
      }
    }

    // Prefer returning imageUrl (data URL) for consistency with /api/tryon/generate
    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      imageData: result.imageData,
    });
  } catch (error) {
    console.error('Error generating try-on:', error);
    return NextResponse.json(
      { error: 'Failed to generate try-on' },
      { status: 500 }
    );
  }
}
