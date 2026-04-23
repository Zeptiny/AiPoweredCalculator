import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProgressProps {
  title: string;
  labels: readonly string[];
  loadingStep: number;
  compact?: boolean;
}

export function LoadingProgress({ title, labels, loadingStep, compact = false }: LoadingProgressProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', compact && 'bg-background p-3')}>
      <div className="mb-2 flex items-center gap-2">
        <Loader2 className={cn('animate-spin text-primary', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>{title}</span>
      </div>
      <div className="space-y-1 text-xs">
        {labels.map((label, idx) => {
          const step = idx + 1;
          if (loadingStep < step) return null;

          const isDone = loadingStep > step;
          return (
            <div key={label} className={cn('flex items-center gap-2 transition-all duration-300', isDone ? 'opacity-100' : 'opacity-70')}>
              {isDone ? '✓' : '○'} {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
