'use client';

import type { CompatibilityCheck } from '@/types';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface CompatibilityBadgesProps {
  checks: CompatibilityCheck[];
  onViewDetails?: (check: CompatibilityCheck) => void;
}

export function CompatibilityBadges({ checks, onViewDetails }: CompatibilityBadgesProps) {
  const failedChecks = checks.filter(c => !c.passed);
  
  if (failedChecks.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-800 font-medium">Outfit looks great!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {failedChecks.map((check, idx) => {
        const mainIssue = check.issues[0];
        if (!mainIssue) return null;

        return (
          <div
            key={idx}
            className={`
              flex items-start gap-2 px-3 py-2 rounded-lg border
              ${mainIssue.severity === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
              }
            `}
          >
            {mainIssue.severity === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${
                mainIssue.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {mainIssue.message}
              </div>
              
              {mainIssue.suggestion && (
                <div className={`text-xs mt-1 ${
                  mainIssue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {mainIssue.suggestion}
                </div>
              )}
              
              {onViewDetails && check.suggestions.length > 0 && (
                <button
                  onClick={() => onViewDetails(check)}
                  className={`text-xs mt-2 font-medium ${
                    mainIssue.severity === 'error'
                      ? 'text-red-700 hover:text-red-900'
                      : 'text-yellow-700 hover:text-yellow-900'
                  }`}
                >
                  View suggestions →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function CompatibilityBadgesCompact({ checks }: { checks: CompatibilityCheck[] }) {
  const failedChecks = checks.filter(c => !c.passed);
  
  if (failedChecks.length === 0) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
        <CheckCircle2 className="h-3 w-3" />
        <span>Compatible</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {failedChecks.map((check, idx) => {
        const mainIssue = check.issues[0];
        if (!mainIssue) return null;

        return (
          <div
            key={idx}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
              ${mainIssue.severity === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
              }
            `}
          >
            {mainIssue.severity === 'error' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Info className="h-3 w-3" />
            )}
            <span>{mainIssue.type}</span>
          </div>
        );
      })}
    </div>
  );
}

