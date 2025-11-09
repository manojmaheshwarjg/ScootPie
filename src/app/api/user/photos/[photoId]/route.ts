import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, photos, tryOnCache } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await context.params;
    console.log('🗑️ [API] Delete photo request for photoId:', photoId);
    const { userId } = await auth();
    
    if (!userId) {
      console.error('❌ [API] Unauthorized - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 [API] User authenticated:', userId);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      console.error('❌ [API] User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('📸 [API] Attempting to delete photo:', photoId, 'for user:', user.id);

    // Normalize and strip zero-width/whitespace
    let normalizedId = (photoId ?? '')
      .toString()
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();

    // Normalize Unicode dash characters to ASCII hyphen-minus
    normalizedId = normalizedId.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');

    // Remove any internal whitespace that might sneak in
    normalizedId = normalizedId.replace(/\s+/g, '');

    console.log('🔎 [API] Normalized photoId:', { id: normalizedId, len: normalizedId.length });

    if (!normalizedId) {
      return NextResponse.json({ success: false, message: 'Invalid photo id' }, { status: 400 });
    }

    // Verify the target photo belongs to this user (let the DB validate UUID syntax)
    let target;
    try {
      target = await db.query.photos.findFirst({
        where: and(eq(photos.id, normalizedId), eq(photos.userId, user.id)),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('invalid input syntax for type uuid')) {
        console.error('❌ [API] Invalid UUID syntax for photoId:', normalizedId);
        return NextResponse.json({ success: false, message: 'Invalid photo id' }, { status: 400 });
      }
      throw e;
    }

    if (!target) {
      // For debugging: list what exists
      const existing = await db.query.photos.findMany({ where: eq(photos.userId, user.id) });
      console.error('⚠️ [API] Photo not found for this user', { requested: normalizedId, available: existing.map(p => p.id) });
      return NextResponse.json({ 
        success: false, 
        message: 'Photo not found or not authorized', 
        rowsAffected: 0 
      }, { status: 404 });
    }

    // Perform the delete
    let deleted: Array<{ id: string }> = [];
    try {
      deleted = await db.delete(photos)
        .where(eq(photos.id, normalizedId))
        .returning();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('invalid input syntax for type uuid')) {
        console.error('❌ [API] Invalid UUID syntax for delete id:', normalizedId);
        return NextResponse.json({ success: false, message: 'Invalid photo id' }, { status: 400 });
      }
      throw e;
    }

    console.log('✅ [API] Delete query executed. Rows affected:', deleted.length);

    // If we deleted the primary photo, promote another one (if any) and sync users.primaryPhotoId
    if (target.isPrimary) {
      const [newPrimary] = await db.query.photos.findMany({
        where: eq(photos.userId, user.id),
      });

      if (newPrimary) {
        await db.update(photos).set({ isPrimary: false }).where(eq(photos.userId, user.id));
        await db.update(photos).set({ isPrimary: true }).where(eq(photos.id, newPrimary.id));
        await db.update(users).set({ primaryPhotoId: newPrimary.id }).where(eq(users.id, user.id));
        console.log('🔁 [API] Promoted new primary photo:', newPrimary.id);
      } else {
        // No more photos left
        await db.update(users).set({ primaryPhotoId: null }).where(eq(users.id, user.id));
        console.log('ℹ️ [API] No photos left after deletion; cleared primaryPhotoId');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Photo deleted successfully',
      rowsAffected: deleted.length,
      deletedPhotoId: normalizedId
    });
  } catch (error) {
    console.error('❌ [API] Error deleting photo:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to delete photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { photoId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { url } = body as { url?: string };

    if (!photoId) return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    if (!url) return NextResponse.json({ error: 'url is required to replace a photo' }, { status: 400 });

    // Get DB user and check ownership
    const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Update the photo URL
    const updated = await db
      .update(photos)
      .set({ url })
      .where(and(eq(photos.id, photoId), eq(photos.userId, dbUser.id)))
      .returning();

    if (updated.length === 0) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    // Invalidate any cached try-on images tied to this photo so new generations use the replaced image
    await db.delete(tryOnCache).where(and(eq(tryOnCache.userId, dbUser.id), eq(tryOnCache.photoId, photoId)));

    return NextResponse.json({ success: true, photo: updated[0] });
  } catch (error) {
    console.error('Error updating photo:', error);
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}
