import { Badge } from '@/components/ui/badge';
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
      <span className="text-muted-foreground">{label}:</span>{' '}
      {isSafe ? (
        <Badge className="text-[10px]" variant="default">Safe</Badge>
      ) : (
        <>
          <Badge className="text-[10px]" variant="destructive">Unsafe</Badge>
          {violatedCategories && violatedCategories.length > 0 && (
            <div className="mt-1">
              <div className="mb-1 text-xs text-muted-foreground">{classification}</div>
              <div className="flex flex-wrap gap-1">
                {violatedCategories.map((cat, idx) => (
                  <Badge key={`${cat}-${idx}`} variant="destructive" className="text-[10px]" title={CATEGORY_DESCRIPTIONS[cat] || cat}>
                    {cat}
                  </Badge>
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
    <div className="mt-3 rounded-lg border border-border bg-background p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
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
