import { CATEGORY_DESCRIPTIONS } from '@/lib/safety';
import type { SafetyResult } from '@/lib/types';

interface SafetyClassificationBlockProps {
  title: string;
  leftLabel: string;
  rightLabel: string;
  safety: SafetyResult;
}

function SafetyCell({ label, isSafe, violatedCategories, classification }: { label: string; isSafe: boolean; violatedCategories?: string[]; classification: string }) {
  return (
    <div>
      <span className="opacity-75">{label}:</span>{' '}
      {isSafe ? (
        <span className="badge badge-success badge-xs">Safe</span>
      ) : (
        <>
          <span className="badge badge-error badge-xs">Unsafe</span>
          {violatedCategories && violatedCategories.length > 0 && (
            <div className="mt-1">
              <div className="text-xs opacity-75 mb-1">{classification}</div>
              <div className="flex flex-wrap gap-1">
                {violatedCategories.map((cat, idx) => (
                  <div key={`${cat}-${idx}`} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                    <span className="badge badge-error badge-xs">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SafetyClassificationBlock({ title, leftLabel, rightLabel, safety }: SafetyClassificationBlockProps) {
  return (
    <div className="mt-3 p-2 bg-base-100 rounded-lg">
      <div className="text-xs font-semibold mb-2 opacity-75">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <SafetyCell
          label={leftLabel}
          isSafe={safety.input.isSafe}
          violatedCategories={safety.input.violatedCategories}
          classification={safety.input.classification}
        />
        <SafetyCell
          label={rightLabel}
          isSafe={safety.output.isSafe}
          violatedCategories={safety.output.violatedCategories}
          classification={safety.output.classification}
        />
      </div>
    </div>
  );
}
