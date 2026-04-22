import type { CalculationResult } from '@/lib/types';
import { SafetyClassificationBlock } from './SafetyClassificationBlock';

interface ResultPanelProps {
  currentResult: CalculationResult;
  loadingSafety: boolean;
}

export function ResultPanel({ currentResult, loadingSafety }: ResultPanelProps) {
  const totalUsage = calculateTotalUsage(currentResult);

  return (
    <div className="space-y-4">
      <div className="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="w-full">
          <div className="font-bold">Final Result</div>
          <div className="text-3xl font-mono font-bold">{currentResult.result}</div>
        </div>
      </div>

      <div className="card bg-base-200 card-border">
        <div className="card-body p-4">
          <div className="flex items-start gap-2">
            <span className="badge badge-success badge-sm whitespace-nowrap">Initial Calculation</span>
            {currentResult.confidence && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs opacity-75">Confidence:</span>
                <progress className="progress progress-success w-20" value={currentResult.confidence} max="100"></progress>
                <span className="text-xs font-bold">{currentResult.confidence}%</span>
              </div>
            )}
          </div>
          <div className="divider my-2"></div>
          <div className="space-y-2">
            <div>
              <div className="font-bold text-xs opacity-75">Analysis:</div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{currentResult.explanation}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs opacity-75">Result:</span>
              <span className="font-mono font-bold text-lg">{currentResult.result}</span>
            </div>
          </div>
          {currentResult.metadata && (
            <div className="text-xs opacity-50 mt-2">
              {currentResult.metadata.usage.totalTokens} tokens • {currentResult.metadata.processingTime}
            </div>
          )}

          {loadingSafety && !currentResult.safety ? (
            <div className="mt-3 p-2 bg-base-100 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="skeleton h-3 w-32"></div>
                <span className="loading loading-spinner loading-xs"></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-2">
                  <div className="skeleton h-4 w-24"></div>
                  <div className="skeleton h-3 w-full"></div>
                  <div className="skeleton h-3 w-3/4"></div>
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-4 w-24"></div>
                  <div className="skeleton h-3 w-full"></div>
                  <div className="skeleton h-3 w-3/4"></div>
                </div>
              </div>
            </div>
          ) : currentResult.safety ? (
            <SafetyClassificationBlock
              title="Safety Classification"
              leftLabel="User Input"
              rightLabel="AI Response"
              safety={currentResult.safety}
            />
          ) : null}
        </div>
      </div>

      {currentResult.metadata && (
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-title">Processing Time</div>
            <div className="stat-value text-2xl">{currentResult.metadata.processingTime}</div>
            <div className="stat-desc">Initial response</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Tokens Used</div>
            <div className="stat-value text-2xl">{totalUsage.totalTokens.toLocaleString()}</div>
            <div className="stat-desc">
              ↗︎ {totalUsage.promptTokens.toLocaleString()} prompt, ↘︎ {totalUsage.completionTokens.toLocaleString()} completion
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Interactions</div>
            <div className="stat-value text-2xl">{1 + (currentResult.disputes?.length || 0) + (currentResult.supervisorReviews?.length || 0)}</div>
            <div className="stat-desc">
              {currentResult.disputes?.length || 0} disputes, {currentResult.supervisorReviews?.length || 0} reviews
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateTotalUsage(currentResult: CalculationResult) {
  let promptTokens = currentResult.metadata?.usage.promptTokens || 0;
  let completionTokens = currentResult.metadata?.usage.completionTokens || 0;
  let totalTokens = currentResult.metadata?.usage.totalTokens || 0;

  currentResult.disputes?.forEach((dispute) => {
    if (dispute.metadata) {
      promptTokens += dispute.metadata.usage.promptTokens;
      completionTokens += dispute.metadata.usage.completionTokens;
      totalTokens += dispute.metadata.usage.totalTokens;
    }
  });

  currentResult.supervisorReviews?.forEach((review) => {
    if (review.metadata) {
      promptTokens += review.metadata.usage.promptTokens;
      completionTokens += review.metadata.usage.completionTokens;
      totalTokens += review.metadata.usage.totalTokens;
    }
  });

  return { promptTokens, completionTokens, totalTokens };
}
