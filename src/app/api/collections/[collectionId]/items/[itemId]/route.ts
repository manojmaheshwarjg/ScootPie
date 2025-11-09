import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, collections, collectionItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ collectionId: string; itemId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId, itemId } = await context.params;

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify collection belongs to user
    const collection = await db.query.collections.findFirst({
      where: and(
        eq(collections.id, collectionId),
        eq(collections.userId, user.id)
      ),
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Delete the item
    await db.delete(collectionItems).where(
      and(
        eq(collectionItems.id, itemId),
        eq(collectionItems.collectionId, collectionId)
      )
    );

    return NextResponse.json({ success: true, message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error deleting collection item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
