'use client';

import type { OutfitItem, GarmentZone } from '@/types';
import { X, Shirt, Scissors, Footprints, Watch, Layers } from 'lucide-react';

interface OutfitStateVisualizerProps {
  items: OutfitItem[];
  onRemoveItem?: (item: OutfitItem) => void;
  compact?: boolean;
}

const ZONE_ICONS: Record<GarmentZone, any> = {
  top: Shirt,
  bottom: Scissors,
  one_piece: Shirt,
  outerwear: Layers,
  footwear: Footprints,
  accessories: Watch
};

const ZONE_LABELS: Record<GarmentZone, string> = {
  top: 'Top',
  bottom: 'Bottom',
  one_piece: 'One-Piece',
  outerwear: 'Outerwear',
  footwear: 'Footwear',
  accessories: 'Accessories'
};

export function OutfitStateVisualizer({ items, onRemoveItem, compact = false }: OutfitStateVisualizerProps) {
  // Group items by zone
  const itemsByZone: Partial<Record<GarmentZone, OutfitItem[]>> = {};
  
  for (const item of items) {
    const zone = item.zone || 'top';
    if (!itemsByZone[zone]) {
      itemsByZone[zone] = [];
    }
    itemsByZone[zone]!.push(item);
  }
  
  const zones: GarmentZone[] = ['one_piece', 'outerwear', 'top', 'bottom', 'footwear', 'accessories'];
  const occupiedZones = zones.filter(zone => itemsByZone[zone] && itemsByZone[zone]!.length > 0);

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No items in outfit
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
          >
            <span className="font-medium truncate max-w-[150px]">{item.name}</span>
            {onRemoveItem && (
              <button
                onClick={() => onRemoveItem(item)}
                className="text-gray-500 hover:text-red-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {occupiedZones.map(zone => {
        const zoneItems = itemsByZone[zone] || [];
        const Icon = ZONE_ICONS[zone];
        
        return (
          <div key={zone} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {ZONE_LABELS[zone]}
              </span>
              <span className="text-xs text-gray-500">
                {zoneItems.length > 1 && `(${zoneItems.length} layers)`}
              </span>
            </div>
            
            <div className="space-y-2">
              {zoneItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white rounded p-2 border border-gray-200"
                  style={{ marginLeft: `${idx * 8}px` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {item.name}
                    </div>
                    {item.brand && (
                      <div className="text-xs text-gray-500">{item.brand}</div>
                    )}
                    {item.zIndex !== undefined && zoneItems.length > 1 && (
                      <div className="text-xs text-purple-600 mt-1">
                        Layer {item.zIndex + 1}
                      </div>
                    )}
                  </div>
                  
                  {onRemoveItem && (
                    <button
                      onClick={() => onRemoveItem(item)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

