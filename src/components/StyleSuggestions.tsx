'use client';

import { useState } from 'react';
import type { Suggestion } from '@/types';
import { Sparkles, TrendingUp, Palette, Watch, ChevronRight } from 'lucide-react';

interface StyleSuggestionsProps {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
  onReject?: (suggestion: Suggestion) => void;
}

const SUGGESTION_ICONS = {
  upgrade: TrendingUp,
  coordination: Palette,
  style: Sparkles,
  accessory: Watch
};

export function StyleSuggestions({ suggestions, onAccept, onReject }: StyleSuggestionsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-gray-900">Style Suggestions</h3>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => {
          const Icon = SUGGESTION_ICONS[suggestion.type];
          const isExpanded = expandedId === idx;
          
          return (
            <div
              key={idx}
              className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200 overflow-hidden"
            >
              <div
                className="p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : idx)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Icon className="h-5 w-5 text-purple-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{suggestion.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{suggestion.description}</div>
                    
                    {suggestion.items && suggestion.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.items.slice(0, 3).map((item, itemIdx) => (
                          <span
                            key={itemIdx}
                            className="inline-block px-2 py-1 bg-white rounded-full text-xs text-gray-700"
                          >
                            {item.name}
                          </span>
                        ))}
                        {suggestion.items.length > 3 && (
                          <span className="inline-block px-2 py-1 bg-white rounded-full text-xs text-gray-500">
                            +{suggestion.items.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {suggestion.beforeImage && suggestion.afterImage && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Before</div>
                        <img
                          src={suggestion.beforeImage}
                          alt="Before"
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">After</div>
                        <img
                          src={suggestion.afterImage}
                          alt="After"
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept(suggestion);
                      }}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                    >
                      Apply This
                    </button>
                    
                    {onReject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject(suggestion);
                        }}
                        className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm border border-gray-300"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

