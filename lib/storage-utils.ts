/**
 * Supabase Storage Utilities
 * Handles image uploads to Supabase Storage to bypass Vercel's body size limits
 */

import { supabase } from './supabase';

const BUCKET_NAME = 'scootpie-images';

/**
 * Convert base64 string to Blob
 */
const base64ToBlob = (base64: string): Blob => {
    // Handle data URL format
    let base64Data = base64;
    let mimeType = 'image/jpeg';

    if (base64.startsWith('data:')) {
        const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            base64Data = base64.split(',')[1] || base64;
        }
    }

    const byteCharacters = atob(base64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new Blob(byteArrays, { type: mimeType });
};

/**
 * Upload a base64 image to Supabase Storage
 * @param base64Image - Base64 encoded image (with or without data URL prefix)
 * @param folder - Folder within the bucket (e.g., 'temp', 'user-photos')
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export const uploadImageToStorage = async (
    base64Image: string,
    folder: string = 'temp'
): Promise<string | null> => {
    if (!supabase) {
        console.warn('Supabase not configured, cannot upload to storage');
        return null;
    }

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const extension = base64Image.includes('image/png') ? 'png' : 'jpg';
        const fileName = `${folder}/${timestamp}-${randomId}.${extension}`;

        // Convert base64 to blob
        const blob = base64ToBlob(base64Image);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, blob, {
                contentType: blob.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage upload error:', error);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        console.log('Uploaded image to storage:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Failed to upload image to storage:', error);
        return null;
    }
};

/**
 * Delete an image from Supabase Storage
 * @param filePath - Full path to the file within the bucket
 */
export const deleteImageFromStorage = async (filePath: string): Promise<boolean> => {
    if (!supabase) {
        return false;
    }

    try {
        // Extract the path from the full URL if needed
        let path = filePath;
        if (filePath.includes(BUCKET_NAME)) {
            path = filePath.split(`${BUCKET_NAME}/`)[1] || filePath;
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) {
            console.error('Storage delete error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to delete image from storage:', error);
        return false;
    }
};

/**
 * Upload multiple images to storage in parallel
 * @param images - Array of base64 images
 * @param folder - Folder within the bucket
 * @returns Array of public URLs (null for failed uploads)
 */
export const uploadMultipleImages = async (
    images: string[],
    folder: string = 'temp'
): Promise<(string | null)[]> => {
    return Promise.all(images.map(img => uploadImageToStorage(img, folder)));
};
