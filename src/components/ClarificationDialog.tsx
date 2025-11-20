'use client';

import { useState } from 'react';
import type { ClarificationQuestion, ClarificationOption } from '@/types';
import { CheckCircle2 } from 'lucide-react';

interface ClarificationDialogProps {
  question: ClarificationQuestion;
  onSelect: (option: ClarificationOption) => void;
  onCancel?: () => void;
}

export function ClarificationDialog({ question, onSelect, onCancel }: ClarificationDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (option: ClarificationOption) => {
    setSelectedId(option.id);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(option);
      setSelectedId(null);
    }, 200);
  };

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900">{question.question}</p>
      </div>
      
      <div className="space-y-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option)}
            className={`
              w-full p-3 rounded-lg border-2 text-left transition-all
              ${selectedId === option.id
                ? 'border-purple-600 bg-purple-100'
                : 'border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                )}
              </div>
              {selectedId === option.id && (
                <CheckCircle2 className="h-5 w-5 text-purple-600 ml-2 flex-shrink-0" />
              )}
            </div>
            {option.imageUrl && (
              <div className="mt-2">
                <img
                  src={option.imageUrl}
                  alt={option.label}
                  className="w-full h-24 object-cover rounded"
                />
              </div>
            )}
          </button>
        ))}
      </div>
      
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 w-full p-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

