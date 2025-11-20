import { GoogleGenAI } from '@google/genai';
import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { stylistLog, stylistWarn, stylistError } from './utils/stylistLogger';

// Lazy initialization function - ensures ai is created with proper env vars
function getGeminiAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  return new GoogleGenAI({
    apiKey: apiKey,
  });
}

export interface TryOnRequest {
  userPhotoUrl: string;
  productImageUrl: string;
  productName: string;
  productDescription?: string;
  // Optional flags for future variations (different prompt styles, etc.)
  promptVersion?: number;
  decisionContext?: string;
}

export interface TryOnResult {
  success: boolean;
  imageData?: string;
  imageUrl?: string;
  error?: string;
}

export interface OutfitItem {
  name: string;
  imageUrl: string; // product thumbnail or full image URL
  productUrl: string;
  price?: number;
  currency?: string;
  brand?: string;
  retailer?: string;
  category?: string;
}

async function resizeIfLarge(buffer: Buffer, targetMax = 1024): Promise<{ mimeType: string; data: string }> {
  try {
    const img = sharp(buffer);
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    const needsResize = w > targetMax || h > targetMax;
    const pipeline = needsResize ? img.resize({ width: w > h ? targetMax : undefined, height: h >= w ? targetMax : undefined, fit: 'inside', withoutEnlargement: true }) : img;
    // Always output JPEG to reduce size and avoid transparency artifacts in model inputs
    const out = await pipeline.jpeg({ quality: 85 }).toBuffer();
    return { mimeType: 'image/jpeg', data: out.toString('base64') };
  } catch {
    // If sharp fails, fall back to original buffer (as jpeg best-effort)
    try {
      const out = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
      return { mimeType: 'image/jpeg', data: out.toString('base64') };
    } catch {
      return { mimeType: 'image/jpeg', data: buffer.toString('base64') };
    }
  }
}

async function imageToBase64(url: string): Promise<{ mimeType: string; data: string }> {
  try {
    // Handle data URLs (base64 encoded images) directly
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      
      // Validate it's an image MIME type
      if (!mimeType.startsWith('image/')) {
        throw new Error(`Invalid data URL MIME type: ${mimeType}. Expected image/*`);
      }
      
      // Downscale if large
      const buffer = Buffer.from(base64Data, 'base64');
      const resized = await resizeIfLarge(buffer);
      return resized;
    }
    
    // Handle local file paths (from Next.js public folder)
    if (url.startsWith('/')) {
      // Remove leading slash(s) and construct path to public folder
      const relPath = url.replace(/^\/+/, '');
      const filePath = join(process.cwd(), 'public', relPath);
      
      // Read the file
      const fileBuffer = await readFile(filePath);
      
      // Downscale if large and normalize to jpeg
      const resized = await resizeIfLarge(Buffer.from(fileBuffer));
      return resized;
      
      // Determine MIME type from file extension
      const ext = url.toLowerCase().split('.').pop();
      let mimeType = 'image/jpeg'; // default
      
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        default:
          // Try to detect from magic bytes
          if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8) {
            mimeType = 'image/jpeg';
          } else if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50) {
            mimeType = 'image/png';
          } else if (fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49) {
            mimeType = 'image/gif';
          } else if (fileBuffer[8] === 0x57 && fileBuffer[9] === 0x45) {
            mimeType = 'image/webp';
          }
      }
      
      return {
        mimeType,
        data: fileBuffer.toString('base64'),
      };
    }
    
    // Handle HTTP/HTTPS URLs - fetch the image
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    
    // Special handling for Unsplash URLs
    let fetchUrl = url;
    const headers: HeadersInit = {
      'Accept': 'image/*',
    };
    
    // If it's an Unsplash URL, add proper parameters
    if (url.includes('images.unsplash.com')) {
      // Add quality and format parameters if not present
      const urlObj = new URL(url);
      if (!urlObj.searchParams.has('fm')) {
        urlObj.searchParams.set('fm', 'jpg'); // Force JPEG format
      }
      if (!urlObj.searchParams.has('q')) {
        urlObj.searchParams.set('q', '80'); // Quality 80
      }
      // Ensure width is reasonable
      if (!urlObj.searchParams.has('w') && !urlObj.searchParams.has('h')) {
        urlObj.searchParams.set('w', '800');
      }
      fetchUrl = urlObj.toString();
    }
    
    const response = await fetch(fetchUrl, { headers });
    
    // Check if response is OK
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Read the response buffer once
    const buffer = await response.arrayBuffer();
    
    // Additional check: ensure we actually got data
    if (buffer.byteLength === 0) {
      throw new Error('Received empty image data');
    }

    // Downscale if large and normalize
    const resized = await resizeIfLarge(Buffer.from(buffer));
    
    // Validate content type is actually an image
    const contentType = response.headers.get('content-type') || '';
    const validImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();
    
    // Validate it's actually an image by checking magic bytes (more reliable than content-type)
    const firstBytes = new Uint8Array(buffer.slice(0, 12));
    const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
    const isPNG = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
    const isGIF = firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x38;
    const isWebP = buffer.byteLength >= 12 && 
                   firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && 
                   firstBytes[2] === 0x46 && firstBytes[3] === 0x46 &&
                   firstBytes[8] === 0x57 && firstBytes[9] === 0x45 && 
                   firstBytes[10] === 0x42 && firstBytes[11] === 0x50;
    
    // Check if it's HTML (common HTML tags or DOCTYPE)
    if (!isJPEG && !isPNG && !isGIF && !isWebP) {
      const textDecoder = new TextDecoder();
      const preview = textDecoder.decode(buffer.slice(0, Math.min(200, buffer.byteLength)));
      
      if (preview.trimStart().startsWith('<') || preview.includes('<!DOCTYPE') || preview.includes('<html') || preview.includes('<body')) {
        throw new Error(`URL returned HTML content instead of image (likely 404 page): ${url}`);
      }
      
      // If content-type says it's an image but magic bytes don't match, still reject it
      if (normalizedContentType.startsWith('image/')) {
        throw new Error(`Content-Type claims image (${contentType}) but file format doesn't match (magic bytes invalid)`);
      }
      
      throw new Error(`Invalid image format. Expected JPEG, PNG, GIF, or WebP. Content-Type: ${contentType || 'unknown'}`);
    }
    
    // If magic bytes are valid but content-type is wrong, use the detected type
    let finalMimeType = normalizedContentType;
    if (!validImageMimeTypes.includes(normalizedContentType)) {
      if (isJPEG) finalMimeType = 'image/jpeg';
      else if (isPNG) finalMimeType = 'image/png';
      else if (isGIF) finalMimeType = 'image/gif';
      else if (isWebP) finalMimeType = 'image/webp';
    }
    
    const base64 = Buffer.from(buffer).toString('base64');
    
    return {
      mimeType: finalMimeType,
      data: base64,
    };
  } catch (error) {
    console.error(`Error converting image to base64 (${url.substring(0, 50)}...):`, error);
    throw error;
  }
}

export async function generateVirtualTryOn(
  request: TryOnRequest
): Promise<TryOnResult> {
  try {
    // Initialize Gemini AI client (lazy initialization)
    const ai = getGeminiAI();

    // Convert images to base64
    const productImage = await imageToBase64(request.productImageUrl);
    const userImage = await imageToBase64(request.userPhotoUrl);

    // Validate images before sending to Gemini
    if (!productImage.data || productImage.data.length === 0) {
      throw new Error('Product image data is empty');
    }
    if (!userImage.data || userImage.data.length === 0) {
      throw new Error('User photo data is empty');
    }
    
    const promptVersion = request.promptVersion ?? 1;
    
    // Build context-aware prompt based on decision context (which may include outfit analysis)
    let outfitContextSection = '';
    let integrationInstructions = '';
    let itemsToRemove: string[] = [];
    let isReplacement = false;
    
    // Detect if new item is a bottom item (needed for zone-based replacement detection)
    const newItemIsBottom = request.productName.toLowerCase().includes('short') ||
                           request.productName.toLowerCase().includes('pant') ||
                           request.productName.toLowerCase().includes('jean') ||
                           request.productName.toLowerCase().includes('skirt') ||
                           request.productName.toLowerCase().includes('trouser') ||
                           (request.productDescription || '').toLowerCase().includes('bottom');
    
    // Check if decision context mentions bottom zone (for zone-based detection)
    let hasBottomZone = false;
    
    if (request.decisionContext) {
      // Try to parse structured outfit context from decision context
      const context = request.decisionContext;
      
      // Extract items to remove from decision context (from chat flow)
      // Handle multiple formats:
      // 1. "itemsToRemove: [item1, item2]" (explicit line)
      // 2. "- itemsToRemove: [item1, item2]" (formatted with dash)
      // 3. "itemsToRemove: item1, item2" (array format from formatObject)
      let itemsToRemoveMatch = context.match(/itemsToRemove:\s*\[([^\]]+)\]/);
      if (!itemsToRemoveMatch) {
        itemsToRemoveMatch = context.match(/-?\s*itemsToRemove:\s*\[([^\]]+)\]/);
      }
      if (!itemsToRemoveMatch) {
        // Try to find itemsToRemove line and parse array format
        const itemsLine = context.match(/-?\s*itemsToRemove:\s*([^\n]+)/);
        if (itemsLine) {
          const itemsStr = itemsLine[1].trim();
          // Try to extract from array-like format
          const arrayMatch = itemsStr.match(/\[([^\]]+)\]/);
          if (arrayMatch) {
            itemsToRemoveMatch = arrayMatch;
          } else {
            // Fallback: treat as comma-separated list
            itemsToRemove = itemsStr.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
          }
        }
      }
      
      if (itemsToRemoveMatch) {
        itemsToRemove = itemsToRemoveMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
        if (itemsToRemove.length > 0) {
          isReplacement = true;
          stylistLog('TryOn', `===== DETECTED ITEMS TO REMOVE =====`);
          stylistLog('TryOn', `Items: ${itemsToRemove.join(', ')}`);
          stylistLog('TryOn', `Match: ${itemsToRemoveMatch[0]}`);
        }
      } else {
        stylistLog('TryOn', '===== NO ITEMS TO REMOVE DETECTED =====');
        stylistLog('TryOn', 'Decision context preview:', context.substring(0, 500));
      }
      
      // Also check for zone-based replacement detection
      // If decision context mentions "bottom" zone and new item is bottom, force replacement
      hasBottomZone = context.toLowerCase().includes('zone: bottom') || 
                     (context.toLowerCase().includes('zones:') && context.toLowerCase().includes('bottom'));
      
      stylistLog('TryOn', '===== ZONE-BASED REPLACEMENT DETECTION =====');
      stylistLog('TryOn', { hasBottomZone, newItemIsBottom, itemsToRemoveCount: itemsToRemove.length });
      
      if (hasBottomZone && newItemIsBottom) {
        // Zone-based bottom replacement detected - force replacement mode
        isReplacement = true;
        if (itemsToRemove.length === 0) {
          // No explicit items found, but we know it's a bottom replacement
          itemsToRemove.push('[ANY BOTTOM ITEMS - pants, jeans, skirts, shorts, trousers, leggings]');
          stylistLog('TryOn', '→ Zone-based bottom replacement detected (bottom zone + bottom item)');
          stylistLog('TryOn', '→ Adding generic bottom items to removal list');
        } else {
          stylistLog('TryOn', '→ Zone-based bottom replacement confirmed with explicit items');
        }
      }
      
      // Check if it's from swipe flow (has "Swipe Flow: Outfit Context")
      if (context.includes('Swipe Flow: Outfit Context') || context.includes('Current Outfit')) {
        // Extract current outfit description
        const outfitMatch = context.match(/currently wearing: ([^\n]+)/i) || 
                           context.match(/Items detected: ([^\n]+)/);
        const zonesMatch = context.match(/Zones occupied: ([^\n]+)/);
        const outfitStateMatch = context.match(/Outfit State: ([^\n]+)/);
        const integrationMatch = context.match(/Integration: ([^\n]+)/);
        
        if (outfitMatch) {
          const items = outfitMatch[1].trim();
          outfitContextSection = `\n\n${items.includes('currently wearing') ? items : `The person in the second image is currently wearing: ${items}`}`;
        }
        
        if (zonesMatch) {
          const zones = zonesMatch[1].split(', ').filter(Boolean);
          outfitContextSection += `\nOccupied clothing zones: ${zones.join(', ')}.`;
        }
        
        if (integrationMatch) {
          integrationInstructions = integrationMatch[1].trim();
          // Check if integration says "REPLACE"
          if (integrationInstructions.toUpperCase().includes('REPLACE')) {
            isReplacement = true;
          }
        } else if (outfitStateMatch) {
          const state = outfitStateMatch[1].trim().toLowerCase();
          if (state === 'separates' || state === 'one_piece') {
            integrationInstructions = `Apply ${request.productName} naturally over or with the existing outfit, ensuring proper layering and visual harmony.`;
          } else if (state === 'partial') {
            integrationInstructions = `The outfit is incomplete. Apply ${request.productName} to complete the look naturally.`;
          }
        }
      }
      
      // Also check decision context from chat flow for replacement info
      if (context.includes('Decision Result')) {
        // Handle both bracket formats
        const decisionMatch = context.match(/Decision Result:[\s\S]*?-?\s*itemsToRemove:\s*\[([^\]]+)\]/) ||
                             context.match(/Decision Result:[\s\S]*?itemsToRemove:\s*\[([^\]]+)\]/);
        if (decisionMatch) {
          itemsToRemove = decisionMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
          if (itemsToRemove.length > 0) {
            isReplacement = true;
            stylistLog('TryOn', `Detected items to remove from decision: ${itemsToRemove.join(', ')}`);
          }
        }
        
        // Check for explicit replacement instruction
        const replacementInstructionMatch = context.match(/replacementInstruction: ([^\n]+)/i);
        if (replacementInstructionMatch) {
          integrationInstructions = replacementInstructionMatch[1].trim();
          isReplacement = true;
          console.log('[TryOn] Found explicit replacement instruction:', integrationInstructions);
        }
        
        // Check if reasoning mentions replacement
        const reasoningMatch = context.match(/reasoning: ([^\n]+)/i);
        if (reasoningMatch) {
          const reasoning = reasoningMatch[1].toLowerCase();
          if (reasoning.includes('replace') || reasoning.includes('remov')) {
            isReplacement = true;
          }
        }
        
        // Check for replacementOperation flag
        if (context.includes('replacementOperation: true')) {
          isReplacement = true;
          console.log('[TryOn] Replacement operation flag detected');
        }
      }
    }
    
    // Check if product is a one-piece (dress, jumpsuit) - should replace top+bottom
    const productNameLower = request.productName.toLowerCase();
    const productDescLower = (request.productDescription || '').toLowerCase();
    const isOnePiece = productNameLower.includes('dress') || productNameLower.includes('jumpsuit') || 
                       productNameLower.includes('romper') || productDescLower.includes('dress') ||
                       productDescLower.includes('jumpsuit');
    
    // If one-piece (dress), ALWAYS remove bottom items from the outfit
    if (isOnePiece) {
      // Check if bottom zone is occupied in the current outfit
      const hasBottomZone = outfitContextSection.includes('bottom') || 
                           (request.decisionContext && request.decisionContext.includes('bottom'));
      
      // Always ensure bottom items are removed for dresses
      if (hasBottomZone || !itemsToRemove.length) {
        // If we don't have explicit items to remove, we still need to remove bottom items
        if (!itemsToRemove.some(item => item.toLowerCase().includes('bottom') || 
                                   item.toLowerCase().includes('jean') || 
                                   item.toLowerCase().includes('pant') ||
                                   item.toLowerCase().includes('skirt') ||
                                   item.toLowerCase().includes('short'))) {
          // Add a note that bottom items must be removed
          itemsToRemove.push('[ANY BOTTOM ITEMS - pants, jeans, skirts, shorts]');
          isReplacement = true;
          console.log('[TryOn] Dress detected - ensuring bottom items are removed');
        }
      }
      
      // Build explicit replacement instructions for dresses
      if (isReplacement || itemsToRemove.length > 0) {
        integrationInstructions = `REPLACE the existing top and bottom items with ${request.productName}. CRITICAL: Remove ALL bottom items (pants, jeans, skirts, shorts) completely - they must NOT be visible in the final image. Remove the current top as well. The dress should be the ONLY garment covering the torso and legs. No bottom garments should be visible underneath or alongside the dress.`;
        console.log('[TryOn] One-piece replacement detected - updating instructions to REPLACE with explicit bottom removal');
      } else {
        // One-piece but no explicit replacement - still should replace if current outfit has top+bottom
        integrationInstructions = `REPLACE the existing top and bottom items with ${request.productName}. CRITICAL: Remove ALL bottom items (pants, jeans, skirts, shorts) completely. The dress should replace both the top and bottom garments completely. No bottom garments should be visible.`;
        isReplacement = true; // Force replacement mode for dresses
        console.log('[TryOn] One-piece detected - defaulting to replacement instruction with bottom removal');
      }
    }

    // Build dynamic prompt based on whether we have outfit context
    const hasOutfitContext = !!outfitContextSection;
    const isReplacementOperation = isReplacement || itemsToRemove.length > 0;
    
    // Detect zone-based replacement (same zone = replacement)
    const newItemZone = newItemIsBottom ? 'bottom' : 
                       (request.productName.toLowerCase().includes('top') || 
                        request.productName.toLowerCase().includes('shirt') ||
                        request.productName.toLowerCase().includes('blouse') ||
                        request.productName.toLowerCase().includes('sweater')) ? 'top' : null;
    
    stylistLog('TryOn', '===== ZONE-BASED REPLACEMENT CHECK =====');
    stylistLog('TryOn', { newItemZone, hasBottomZone, isReplacementOperation, currentIsReplacement: isReplacement });
    
    if (newItemZone && hasBottomZone && newItemZone === 'bottom' && !isReplacementOperation) {
      // Same zone replacement detected - force replacement mode
      isReplacement = true;
      stylistLog('TryOn', `→ Zone-based replacement detected: ${newItemZone} replacing existing ${newItemZone}`);
    }
    
    stylistLog('TryOn', '===== FINAL REPLACEMENT STATUS =====');
    stylistLog('TryOn', { 
      isReplacement, 
      itemsToRemove: itemsToRemove.join(', ') || 'none',
      isReplacementOperation,
      newItemZone,
      isOnePiece 
    });
    
    // Build replacement-specific instructions
    let replacementInstructions = '';
    if (isReplacementOperation && itemsToRemove.length > 0) {
      const bottomItems = itemsToRemove.filter(item => 
        item.toLowerCase().includes('bottom') || 
        item.toLowerCase().includes('jean') || 
        item.toLowerCase().includes('pant') ||
        item.toLowerCase().includes('skirt') ||
        item.toLowerCase().includes('short') ||
        item.toLowerCase().includes('[any bottom') ||
        item.toLowerCase().includes('trouser') ||
        item.toLowerCase().includes('legging')
      );
      
      if (bottomItems.length > 0 || isOnePiece || (newItemZone === 'bottom' && isReplacementOperation)) {
        // Bottom replacement - make instructions extremely explicit and repetitive
        replacementInstructions = `\n\n═══════════════════════════════════════════════════════════
CRITICAL REMOVAL INSTRUCTIONS - READ CAREFULLY:
═══════════════════════════════════════════════════════════

REMOVE THE FOLLOWING ITEMS COMPLETELY:
${itemsToRemove.map(item => `- ${item}`).join('\n')}

ESPECIALLY IMPORTANT FOR BOTTOM ITEMS:
- Remove ALL bottom items (pants, jeans, skirts, shorts, trousers, leggings) COMPLETELY
- Bottom items must NOT be visible in the final image AT ALL
- Bottom items must NOT be visible underneath the new garment
- Bottom items must NOT be visible alongside the new garment
- The new ${request.productName} should be the ONLY item covering the lower body

REPEAT: Remove ${itemsToRemove.join(', ')} COMPLETELY. They should NOT be visible in the final image.

═══════════════════════════════════════════════════════════`;
      } else {
        // Top or other replacement - still explicit but less repetitive
        replacementInstructions = `\n\n═══════════════════════════════════════════════════════════
IMPORTANT REMOVAL INSTRUCTIONS:
═══════════════════════════════════════════════════════════

REMOVE THE FOLLOWING ITEMS COMPLETELY:
${itemsToRemove.map(item => `- ${item}`).join('\n')}

These items should NOT be visible in the final image.
They should be completely removed and not visible underneath or alongside the new garment.

═══════════════════════════════════════════════════════════`;
      }
    } else if (isReplacementOperation) {
      // Replacement operation but no explicit items - still provide instructions
      if (newItemZone === 'bottom') {
        replacementInstructions = `\n\n═══════════════════════════════════════════════════════════
CRITICAL: This is a BOTTOM REPLACEMENT operation.
═══════════════════════════════════════════════════════════

Remove ALL existing bottom items (pants, jeans, skirts, shorts, trousers) COMPLETELY.
Bottom items must NOT be visible in the final image.
The new ${request.productName} should be the ONLY item covering the lower body.

═══════════════════════════════════════════════════════════`;
      } else {
        replacementInstructions = `\n\nIMPORTANT: This is a REPLACEMENT operation. Remove conflicting items from the current outfit that occupy the same zone as ${request.productName}.`;
      }
    } else if (isOnePiece) {
      // Even if no explicit replacement operation, dresses always need bottom removal
      replacementInstructions = `\n\n═══════════════════════════════════════════════════════════
CRITICAL: This is a dress/one-piece garment.
═══════════════════════════════════════════════════════════

Remove ALL bottom items (pants, jeans, skirts, shorts, trousers) from the current outfit.
Bottom items must NOT be visible in the final image.
The dress should be the ONLY garment covering the torso and legs.

═══════════════════════════════════════════════════════════`;
    }
    
    const promptText = `You are a professional virtual try-on system. The first image contains a clothing item (${request.productName}${request.productDescription ? `: ${request.productDescription}` : ''}). The second image contains a person (model/user).${outfitContextSection}${replacementInstructions}
        
CRITICAL IDENTITY PRESERVATION RULES:
- The person in the final image MUST be IDENTICAL to the person in the second image
- Use the EXACT face, facial features, body proportions, skin tone, and pose from the second image
- DO NOT morph, blend, or combine facial features from both images
- DO NOT create a composite person - use ONLY the person from the second image
- The first image is ONLY for the clothing item - do NOT use any person features from it
- Maintain the person's exact identity, appearance, and physical characteristics from the second image
        
Task: ${hasOutfitContext 
  ? `Generate a realistic virtual try-on image where the person from the second image (using their EXACT face and body) is wearing ${request.productName}${isReplacementOperation ? ' as a replacement for existing items' : ' integrated with their current outfit'}. ${integrationInstructions || 'Ensure the new item integrates naturally with existing items.'}`
  : `Generate a realistic virtual try-on image where the person from the second image (using their EXACT face and body) is wearing the clothing item from the first image.`}

Requirements:
- Use the EXACT person from the second image - their face, body, proportions, and pose must remain unchanged
- Extract ONLY the clothing item from the first image - do NOT use any person features from the first image
- Apply the clothing item from the first image onto the person from the second image
- DO NOT morph, blend, or combine features from both images
- ${(() => {
    if (isReplacementOperation || isOnePiece) {
      let removalText = 'CRITICAL REMOVAL REQUIREMENT: ';
      if (itemsToRemove.length > 0) {
        removalText += `REMOVE the following items COMPLETELY: ${itemsToRemove.join(', ')}. `;
      }
      if (newItemZone === 'bottom' || isOnePiece) {
        removalText += 'ESPECIALLY IMPORTANT: Remove ALL bottom items (pants, jeans, skirts, shorts, trousers, leggings) COMPLETELY. Bottom items must NOT be visible in the final image AT ALL. ';
      }
      removalText += `Apply ${request.productName} as the replacement. `;
      if (isOnePiece) {
        removalText += 'For dresses, ensure NO bottom garments are visible underneath or alongside the dress. The dress should be the ONLY garment covering the torso and legs.';
      } else {
        const zoneText = newItemZone || 'the specified zone';
        removalText += `The new item should be the ONLY item in its zone (${zoneText}).`;
      }
      return removalText;
    } else if (hasOutfitContext) {
      return 'Maintain the person\'s current outfit visible and integrate the new item naturally with proper layering';
    } else {
      return 'Apply the clothing item from the first image onto the person';
    }
  })()}
- PRESERVE IDENTITY: The person's face, facial features, body shape, skin tone, hair, and all physical characteristics must be EXACTLY as they appear in the second image
- DO NOT alter the person's appearance - only change the clothing
- The person's face must be IDENTICAL to the second image - same eyes, nose, mouth, bone structure
- The person's body proportions and pose must match the second image exactly
- Adjust lighting and shadows to match naturally while preserving the person's exact appearance
- Ensure the clothing fits realistically with proper draping and fit
- The clothing should appear as if it was photographed on the exact same person from the second image
- ${isReplacementOperation || isOnePiece
  ? `REPLACEMENT MODE: The new item (${request.productName}) must completely replace the removed items. DO NOT show both old and new items together. ${itemsToRemove.length > 0 ? `The removed items (${itemsToRemove.join(', ')}) must be completely invisible in the final image. ` : ''}${newItemZone === 'bottom' || isOnePiece ? 'For bottom replacements or dresses, ensure NO bottom garments are visible - the new item should be the ONLY garment covering the lower body. ' : ''}${isOnePiece ? 'The dress should be the ONLY garment covering the torso and legs - no bottom items should be visible underneath, alongside, or anywhere in the image.' : ''}`
  : hasOutfitContext 
    ? 'Ensure proper layering - the new item should be visible over/with existing items as appropriate for the garment type'
    : ''}
- Generate a high-quality, professional e-commerce style photo
- The output should be a full-body or appropriate crop showing the person wearing the item${hasOutfitContext && !isReplacementOperation && !isOnePiece ? ' with their complete outfit' : ''}

═══════════════════════════════════════════════════════════
FINAL CRITICAL REMINDERS:
═══════════════════════════════════════════════════════════

1. IDENTITY PRESERVATION (MOST IMPORTANT):
   - The person in the final image MUST be IDENTICAL to the person in the second image
   - Use the EXACT face, facial features, and body from the second image
   - DO NOT morph, blend, or combine features from both images
   - The first image is ONLY for clothing - ignore any person in it

2. CLOTHING APPLICATION:
   - Apply ONLY the clothing item from the first image
   - The clothing should fit naturally on the person from the second image
   ${isReplacementOperation && itemsToRemove.length > 0 ? `- REMOVE these items completely: ${itemsToRemove.join(', ')}` : ''}

═══════════════════════════════════════════════════════════

${request.decisionContext && !hasOutfitContext ? `\n\nAdditional Context:\n${request.decisionContext.trim()}` : ''}`;

    stylistLog('TryOn', '===== TRY-ON SYSTEM PROMPT =====');
    if (hasOutfitContext) {
      stylistLog('TryOn', '→ PROMPT UPDATED WITH OUTFIT CONTEXT');
      stylistLog('TryOn', `→ Current outfit: ${outfitContextSection.split('\n')[1]?.replace(/^\s*/, '') || 'N/A'}`);
      stylistLog('TryOn', `→ Integration: ${integrationInstructions || 'Natural integration'}`);
      if (isReplacementOperation) {
        stylistLog('TryOn', `→ REPLACEMENT OPERATION: Removing items: ${itemsToRemove.join(', ') || 'conflicting items'}`);
      }
    } else {
      stylistLog('TryOn', '→ STANDARD PROMPT (no outfit context)');
    }
    stylistLog('TryOn', promptText);
    stylistLog('TryOn', '===== END TRY-ON PROMPT =====');
    
    const prompt = [
      {
        inlineData: {
          mimeType: productImage.mimeType,
          data: productImage.data,
        },
      },
      {
        inlineData: {
          mimeType: userImage.mimeType,
          data: userImage.data,
        },
      },
      {
        text: promptText,
      },
    ];

    // Use the official API structure from Google docs
    // Wrap parts into a single user content entry
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: prompt,
        },
      ],
    } as any);

    // Parse response - structure is response.candidates[0].content.parts
    if (!response.candidates || response.candidates.length === 0) {
      console.error('No candidates in response:', response);
      return {
        success: false,
        error: 'No candidates received from Gemini API',
      };
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      console.error('No content parts in candidate:', candidate);
      return {
        success: false,
        error: 'No content parts in response candidate',
      };
    }

    const parts = candidate.content.parts;
    
    if (parts.length === 0) {
      console.error('Parts array is empty');
      return {
        success: false,
        error: 'Empty parts array in response',
      };
    }
    
    // Iterate through parts to find image data
    let firstText: string | null = null;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Check for text response (Gemini sometimes refuses or provides text instead of image)
      if ('text' in part && (part as any).text) {
        const textResponse = (part as any).text as string;
        if (!firstText) firstText = textResponse;
        console.warn(`Gemini returned text instead of image: ${textResponse.substring(0, 150)}...`);
        // Continue checking other parts in case there's also an image
      }
      
      // Check for image data - try different possible structures
      if ('inlineData' in part && (part as any).inlineData) {
        const inlineData = (part as any).inlineData;
        const base64Image = inlineData.data;
        const mimeType = inlineData.mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        return {
          success: true,
          imageData: base64Image,
          imageUrl: dataUrl,
        };
      }
      
      // Also check if the part itself might be the data
      if ('data' in part && (part as any).data) {
        const base64Image = (part as any).data;
        const mimeType = (part as any).mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        return {
          success: true,
          imageData: base64Image,
          imageUrl: dataUrl,
        };
      }

      // Some responses may reference a hosted file
      if ('fileData' in part && (part as any).fileData?.fileUri) {
        const fileUri = (part as any).fileData.fileUri as string;
        const mimeType = (part as any).fileData.mimeType || 'image/png';
        if (fileUri.startsWith('http')) {
          try {
            const res = await fetch(fileUri);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              const base64 = Buffer.from(buf).toString('base64');
              const dataUrl = `data:${mimeType};base64,${base64}`;
              return { success: true, imageData: base64, imageUrl: dataUrl };
            }
          } catch (e) {
            console.warn('Failed to fetch fileUri image:', e);
          }
        }
      }
    }
    
    // Retry once with a stricter output directive
    console.warn('No image in first response. Retrying with responseMimeType=image/png and stricter instruction...');
    const retryPrompt = [...prompt];
    const lastTextIdx = retryPrompt.findIndex((p: any) => 'text' in p);
    if (lastTextIdx >= 0) {
      (retryPrompt[lastTextIdx] as any).text += '\nReturn only an image as output. Do not include any text.';
    } else {
      retryPrompt.push({ text: 'Return only an image as output. Do not include any text.' } as any);
    }

    const retry = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        { role: 'user', parts: retryPrompt },
      ],
    } as any);

    const retryParts = retry?.candidates?.[0]?.content?.parts || [];
    for (const part of retryParts) {
      if ('inlineData' in part && (part as any).inlineData) {
        const inlineData = (part as any).inlineData;
        const base64Image = inlineData.data;
        const mimeType = inlineData.mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        return { success: true, imageData: base64Image, imageUrl: dataUrl };
      }
      if ('data' in part && (part as any).data) {
        const base64Image = (part as any).data;
        const mimeType = (part as any).mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        return { success: true, imageData: base64Image, imageUrl: dataUrl };
      }
    }

    console.error('No image data found after retry. First text snippet:', firstText?.substring(0, 150));
    return {
      success: false,
      error: 'No image generated in response. The model returned text or an unexpected format.',
    };
  } catch (error) {
    console.error('Virtual try-on generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function batchGenerateTryOns(
  requests: TryOnRequest[]
): Promise<TryOnResult[]> {
  const results = await Promise.all(
    requests.map((request) => generateVirtualTryOn(request))
  );
  return results;
}

// Generate layered outfit by sequentially applying items to a base user photo
export async function generateOutfitTryOn(
  userPhotoUrl: string,
  items: OutfitItem[],
  options?: { decisionContext?: string }
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    console.log('[TRYON] ===== Starting outfit generation =====');
    console.log('[TRYON] Total items to apply:', items.length);
    items.forEach((it, idx) => console.log(`[TRYON] Item ${idx+1}/${items.length}:`, { 
      name: it.name, 
      category: it.category,
      brand: it.brand || it.retailer, 
      hasImage: !!it.imageUrl,
      imagePreview: it.imageUrl?.slice(0,60)
    }));
    
    let base = userPhotoUrl;
    if (!items || items.length === 0) {
      console.log('[TRYON] No items to apply, returning original user photo');
      return { success: true, imageUrl: base };
    }

    // Apply each item sequentially, layering them
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[TRYON] Applying item ${i+1}/${items.length}: ${item.name}`);
      console.log(`[TRYON] Using base image:`, base.slice(0, 60));
      
      const res = await generateVirtualTryOn({
        userPhotoUrl: base,
        productImageUrl: item.imageUrl,
        productName: item.name,
        productDescription: `${item.brand || ''} ${item.category || ''}`.trim() || undefined,
        decisionContext: options?.decisionContext,
      });
      
      if (!res.success || !res.imageUrl) {
        console.error(`[TRYON] Failed at item ${i+1}/${items.length}:`, res.error);
        // Don't fail completely - return what we have so far if possible
        if (i > 0 && base !== userPhotoUrl) {
          console.log('[TRYON] Returning partial result from previous layers');
          return { success: true, imageUrl: base };
        }
        return { success: false, error: res.error || `Failed to apply ${item.name}` };
      }
      
      console.log(`[TRYON] Successfully applied item ${i+1}/${items.length}`);
      console.log(`[TRYON] Result image preview:`, res.imageUrl.slice(0, 60));
      base = res.imageUrl; // Use this result as the base for the next item
    }

    console.log('[TRYON] ===== Outfit generation complete =====');
    console.log('[TRYON] Final result image:', base.slice(0, 60));
    return { success: true, imageUrl: base };
  } catch (err) {
    console.error('[TRYON] Outfit generation error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
