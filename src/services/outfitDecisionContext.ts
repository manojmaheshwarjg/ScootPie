/**
 * Build decision context from outfit analysis for try-on generation
 */

export interface OutfitContextForPrompt {
  currentOutfitDescription: string;
  outfitState: string;
  integrationInstructions: string;
  zonesOccupied: string[];
  itemsList: string;
}

export function buildOutfitContextForPrompt(
  outfitAnalysis: any,
  productName: string,
  productCategory?: string
): OutfitContextForPrompt | null {
  if (!outfitAnalysis || !outfitAnalysis.items || outfitAnalysis.items.length === 0) {
    return null;
  }

  const items = outfitAnalysis.items;
  const zones = outfitAnalysis.detectedZones || [];
  
  // Build natural language description of current outfit
  const itemsList = items.map((i: any) => {
    let desc = i.name;
    if (i.color) desc = `${i.color} ${desc}`;
    return desc;
  }).join(', ');
  
  const currentOutfitDescription = `The person in the second image is currently wearing: ${itemsList}.`;

  // Determine outfit state
  const hasTop = zones.includes('top');
  const hasBottom = zones.includes('bottom');
  const hasOnePiece = zones.includes('one_piece');
  const hasOuterwear = zones.includes('outerwear');
  
  let outfitState = 'incomplete';
  if (hasOnePiece && items.length === 1) {
    outfitState = 'one_piece';
  } else if (hasTop && hasBottom) {
    outfitState = 'separates';
  } else if (hasTop || hasBottom) {
    outfitState = 'partial';
  }

  // Build integration instructions based on product category and current outfit
  let integrationInstructions = '';
  const productCat = (productCategory || '').toLowerCase();
  const productNameLower = productName.toLowerCase();
  
  const isOuterwear = productCat.includes('jacket') || productCat.includes('coat') || 
                      productCat.includes('blazer') || productCat.includes('cardigan') ||
                      productNameLower.includes('jacket') || 
                      productNameLower.includes('coat');
  const isTop = productCat.includes('top') || productCat.includes('shirt') || 
                productCat.includes('blouse') || productCat.includes('sweater') ||
                productCat.includes('t-shirt') || productCat.includes('tee');
  const isBottom = productCat.includes('pant') || productCat.includes('jean') || 
                   productCat.includes('skirt') || productCat.includes('short') ||
                   productCat.includes('trouser');
  const isOnePiece = productCat.includes('dress') || productCat.includes('jumpsuit') || 
                     productCat.includes('romper') || productCat.includes('onesie') ||
                     productNameLower.includes('dress') || 
                     productNameLower.includes('jumpsuit') ||
                     productNameLower.includes('romper');

  if (isOnePiece) {
    // One-piece replaces both top and bottom
    if (outfitState === 'separates' && hasTop && hasBottom) {
      integrationInstructions = `REPLACE the existing top and bottom with ${productName}. CRITICAL: Remove the current top and bottom items completely, especially ALL bottom items (pants, jeans, skirts, shorts). Bottom items must NOT be visible in the final image. The dress should be the ONLY garment covering the torso and legs. No bottom garments should be visible underneath or alongside the dress.`;
    } else if (outfitState === 'one_piece') {
      integrationInstructions = `Replace the existing one-piece outfit with ${productName}. Remove the current one-piece completely.`;
    } else if (hasBottom) {
      // Even if no top, if there's a bottom, it must be removed for a dress
      integrationInstructions = `Apply ${productName} as a one-piece outfit. CRITICAL: Remove ALL bottom items (pants, jeans, skirts, shorts) completely. Bottom items must NOT be visible in the final image. The dress should be the only garment covering the torso and legs.`;
    } else {
      integrationInstructions = `Apply ${productName} as a one-piece outfit. Remove any conflicting items (top or bottom) if present.`;
    }
  } else if (isOuterwear) {
    if (hasOuterwear) {
      integrationInstructions = `Replace the existing outerwear with ${productName}, maintaining the outfit underneath.`;
    } else {
      integrationInstructions = `Layer ${productName} over the current outfit. The outerwear should be visible on top of existing items.`;
    }
  } else if (isTop) {
    if (hasTop && !hasOnePiece) {
      integrationInstructions = `Replace the existing top with ${productName}, keeping the bottom and other items.`;
    } else if (hasOnePiece) {
      integrationInstructions = `This will replace the one-piece outfit. Apply ${productName} as the new top.`;
    } else {
      integrationInstructions = `Apply ${productName} as a new top item.`;
    }
  } else if (isBottom) {
    if (hasBottom && !hasOnePiece) {
      // Bottom replacement - make instructions extremely explicit
      const bottomItems = items.filter((i: any) => {
        const zone = i.zone || '';
        const cat = (i.category || '').toLowerCase();
        return zone === 'bottom' || cat.includes('pant') || cat.includes('jean') || 
               cat.includes('skirt') || cat.includes('short') || cat.includes('trouser') ||
               cat.includes('legging') || cat.includes('bottom');
      });
      const bottomItemNames = bottomItems.map((i: any) => i.name).join(', ');
      
      integrationInstructions = `REPLACE the existing bottom with ${productName}. CRITICAL REMOVAL: Remove the following bottom items completely: ${bottomItemNames || 'all bottom items'}. These items (pants, jeans, skirts, shorts, trousers, leggings) must NOT be visible in the final image AT ALL. The new ${productName} should be the ONLY item covering the lower body. Keep the top and other items, but completely remove all bottom items.`;
    } else if (hasOnePiece) {
      integrationInstructions = `This will replace the one-piece outfit. Apply ${productName} as the new bottom.`;
    } else {
      integrationInstructions = `Apply ${productName} as a new bottom item.`;
    }
  } else {
    integrationInstructions = `Integrate ${productName} naturally with the existing outfit, ensuring proper layering and visual harmony.`;
  }

  return {
    currentOutfitDescription,
    outfitState,
    integrationInstructions,
    zonesOccupied: zones,
    itemsList,
  };
}

/**
 * Build decision context from outfit analysis for try-on generation (legacy format)
 */
export function buildDecisionContextFromOutfitAnalysis(
  outfitAnalysis: any,
  productName: string,
  productCategory?: string
): string {
  const context = buildOutfitContextForPrompt(outfitAnalysis, productName, productCategory);
  if (!context) return '';

  const parts: string[] = [];
  parts.push('--- Swipe Flow: Outfit Context ---');
  parts.push(`\n${context.currentOutfitDescription}`);
  parts.push(`- Zones occupied: ${context.zonesOccupied.join(', ')}`);
  parts.push(`- Outfit State: ${context.outfitState}`);
  parts.push(`\nProduct Being Tried On: ${productName}`);
  if (productCategory) {
    parts.push(`- Category: ${productCategory}`);
  }
  parts.push(`\nIntegration: ${context.integrationInstructions}`);

  return parts.join('\n');
}

