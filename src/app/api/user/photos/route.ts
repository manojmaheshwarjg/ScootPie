import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { photoUrls } = body;

    if (!photoUrls || photoUrls.length === 0) {
      return NextResponse.json({ error: 'No photo URLs provided' }, { status: 400 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: { photos: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has 5 photos
    if (user.photos.length >= 5) {
      return NextResponse.json({ error: 'Maximum 5 photos allowed' }, { status: 400 });
    }

    // Add new photos - most recently uploaded photo becomes primary
    const photosToAdd = photoUrls.slice(0, 5 - user.photos.length);
    
    // First, set all existing photos to non-primary
    if (photosToAdd.length > 0) {
      await db.update(photos)
        .set({ isPrimary: false })
        .where(eq(photos.userId, user.id));
    }
    
    // Insert all new photos (none are primary yet) and analyze outfits
    console.log('[PHOTOS API] ===== STARTING PHOTO UPLOAD WITH OUTFIT ANALYSIS =====');
    console.log('[PHOTOS API] Photos to process:', photosToAdd.length);
    
    const insertedPhotos = [];
    for (let i = 0; i < photosToAdd.length; i++) {
      const url = photosToAdd[i];
      console.log(`[PHOTOS API] ===== Processing photo ${i + 1}/${photosToAdd.length} =====`);
      console.log(`[PHOTOS API] Photo URL preview: ${url.substring(0, 80)}...`);
      
      // Analyze outfit from photo (async, don't block upload)
      let outfitAnalysis = null;
      try {
        console.log(`[PHOTOS API] → Starting outfit analysis for photo ${i + 1}...`);
        const { analyzePhotoOutfit } = await import('@/services/photoOutfitAnalyzer');
        const analysis = await analyzePhotoOutfit(url);
        
        console.log(`[PHOTOS API] → Outfit analysis completed for photo ${i + 1}:`, {
          success: true,
          itemCount: analysis.items.length,
          items: analysis.items.map((item: any) => item.name),
          zones: analysis.detectedZones,
          confidence: analysis.confidence,
        });
        
        if (analysis.items.length > 0) {
          outfitAnalysis = {
            items: analysis.items.map(item => ({
              name: item.name,
              category: item.category || item.zone || 'unknown',
              zone: item.zone,
              color: item.colors?.[0],
              style: [],
              pattern: item.pattern,
              brand: item.brand,
            })),
            confidence: analysis.confidence,
            detectedZones: analysis.detectedZones,
            analyzedAt: new Date().toISOString(),
          };
          console.log(`[PHOTOS API] → Outfit analysis stored for photo ${i + 1}:`, {
            itemCount: outfitAnalysis.items.length,
            zones: outfitAnalysis.detectedZones,
            confidence: outfitAnalysis.confidence,
            analyzedAt: outfitAnalysis.analyzedAt,
          });
        } else {
          console.log(`[PHOTOS API] → No items detected in photo ${i + 1} - no outfit analysis stored`);
        }
      } catch (error) {
        console.error(`[PHOTOS API] → ERROR analyzing outfit for photo ${i + 1} (non-blocking):`, error);
        if (error instanceof Error) {
          console.error(`[PHOTOS API] → Error message: ${error.message}`);
          console.error(`[PHOTOS API] → Error stack: ${error.stack}`);
        }
        // Don't fail photo upload if analysis fails
      }

      console.log(`[PHOTOS API] → Inserting photo ${i + 1} into database...`);
      const [inserted] = await db.insert(photos).values({
        userId: user.id,
        url,
        isPrimary: false, // Will set the last one as primary after all inserts
        metadata: outfitAnalysis ? { outfitAnalysis } : undefined,
      }).returning();
      
      console.log(`[PHOTOS API] → Photo ${i + 1} inserted:`, {
        photoId: inserted.id,
        hasMetadata: !!inserted.metadata,
        hasOutfitAnalysis: !!(inserted.metadata as any)?.outfitAnalysis,
      });
      
      insertedPhotos.push(inserted);
      console.log(`[PHOTOS API] ===== Completed photo ${i + 1}/${photosToAdd.length} =====`);
    }
    
    console.log('[PHOTOS API] ===== ALL PHOTOS PROCESSED =====');
    console.log('[PHOTOS API] Total photos inserted:', insertedPhotos.length);
    console.log('[PHOTOS API] Photos with outfit analysis:', insertedPhotos.filter(p => (p.metadata as any)?.outfitAnalysis).length);
    
    // Set the most recently uploaded photo (last in array) as primary
    if (insertedPhotos.length > 0) {
      const lastPhoto = insertedPhotos[insertedPhotos.length - 1];
      console.log('[PHOTOS API] → Setting primary photo:', {
        photoId: lastPhoto.id,
        hasOutfitAnalysis: !!(lastPhoto.metadata as any)?.outfitAnalysis,
      });
      
      await db.update(photos)
        .set({ isPrimary: true })
        .where(eq(photos.id, lastPhoto.id));
      
      // Update user's primaryPhotoId
      await db.update(users)
        .set({ primaryPhotoId: lastPhoto.id })
        .where(eq(users.id, user.id));
      
      console.log('[PHOTOS API] → Primary photo set successfully');
    }

    console.log('[PHOTOS API] ===== PHOTO UPLOAD COMPLETE =====');
    return NextResponse.json({ 
      success: true, 
      message: 'Photos added successfully',
      photosProcessed: insertedPhotos.length,
      photosWithOutfitAnalysis: insertedPhotos.filter(p => (p.metadata as any)?.outfitAnalysis).length,
    });
  } catch (error) {
    console.error('Error adding photos:', error);
    return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 });
  }
}
