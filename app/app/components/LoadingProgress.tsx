interface LoadingProgressProps {
  title: string;
  labels: readonly string[];
  loadingStep: number;
  compact?: boolean;
}

export function LoadingProgress({ title, labels, loadingStep, compact = false }: LoadingProgressProps) {
  return (
    <div className={compact ? 'p-3 bg-base-100 rounded-lg' : 'alert alert-info'}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`loading loading-spinner ${compact ? 'loading-sm' : 'loading-md'}`}></span>
        <span className={compact ? 'text-xs font-semibold' : 'font-bold'}>{title}</span>
      </div>
      <div className="text-xs space-y-1">
        {labels.map((label, idx) => {
          const step = idx + 1;
          if (loadingStep < step) return null;

          const isDone = loadingStep > step;
          return (
            <div key={label} className={`flex items-center gap-2 transition-all duration-300 ${isDone ? 'opacity-100' : 'opacity-70'}`}>
              {isDone ? '✓' : '○'} {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
