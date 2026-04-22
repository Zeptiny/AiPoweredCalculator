import type { DisputeResponse } from '@/lib/types';
import { CALCULATION_LOADING_LABELS } from '@/lib/prompts';
import { LoadingProgress } from './LoadingProgress';
import { SafetyClassificationBlock } from './SafetyClassificationBlock';

interface DisputeSectionProps {
  disputes: DisputeResponse[];
  disputeMode: boolean;
  disputeFeedback: string;
  disputeCount: number;
  loading: boolean;
  loadingStep: number;
  supervisorLevel: number;
  onDisputeFeedbackChange: (value: string) => void;
  onOpenDispute: () => void;
  onCancelDispute: () => void;
  onSubmitDispute: () => void;
}

export function DisputeSection({
  disputes,
  disputeMode,
  disputeFeedback,
  disputeCount,
  loading,
  loadingStep,
  supervisorLevel,
  onDisputeFeedbackChange,
  onOpenDispute,
  onCancelDispute,
  onSubmitDispute,
}: DisputeSectionProps) {
  return (
    <>
      {disputes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm opacity-75">Dispute History ({disputes.length})</h3>
          {disputes.map((dispute, index) => (
            <div key={`${dispute.disputeFeedback}-${index}`} className="card bg-base-300 card-border">
              <div className="card-body p-4">
                <div className="flex items-start gap-2">
                  <span className="badge badge-warning badge-sm whitespace-nowrap">Dispute Agent #{index + 1}</span>
                </div>

                {dispute.agentName && <div className="text-sm font-semibold mt-2">{dispute.agentName}</div>}

                <div className="flex-1 text-xs opacity-75 mt-1">Feedback: "{dispute.disputeFeedback}"</div>
                <div className="divider my-2"></div>
                <div className="space-y-2">
                  <div>
                    <div className="font-bold text-xs opacity-75">Revised Analysis:</div>
                    <p className="text-sm">{dispute.explanation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs opacity-75">Revised Result:</span>
                    <span className="font-mono font-bold text-lg">{dispute.result}</span>
                  </div>
                  {dispute.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-75">Confidence:</span>
                      <progress className="progress progress-warning w-20" value={dispute.confidence} max="100"></progress>
                      <span className="text-xs font-bold">{dispute.confidence}%</span>
                    </div>
                  )}
                </div>

                {dispute.metadata && (
                  <div className="text-xs opacity-50 mt-2">
                    {dispute.metadata.usage.totalTokens} tokens • {dispute.metadata.processingTime}
                  </div>
                )}

                {dispute.safety && (
                  <SafetyClassificationBlock
                    title="Safety Classification"
                    leftLabel="Dispute Input"
                    rightLabel="AI Response"
                    safety={dispute.safety}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {disputeMode ? (
        <div className="card bg-warning/10 card-border">
          <div className="card-body">
            <h3 className="card-title text-sm">Dispute Response</h3>
            {disputeCount === 2 && (
              <div className="alert alert-warning mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-xs">Warning: This is your 3rd dispute. After submission, a supervisor will be automatically called for final review.</span>
              </div>
            )}
            <p className="text-xs opacity-75">Provide feedback or explain why the answer is incorrect:</p>
            <textarea
              className="textarea textarea-warning w-full"
              placeholder="E.g., 'The order of operations is wrong' or 'The result should be 42'"
              value={disputeFeedback}
              onChange={(e) => onDisputeFeedbackChange(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <div className="card-actions justify-end">
              <button className="btn btn-sm btn-ghost" onClick={onCancelDispute} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-sm btn-warning" onClick={onSubmitDispute} disabled={loading || !disputeFeedback.trim()}>
                {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Submit Dispute'}
              </button>
            </div>

            {loading && (
              <div className="mt-3">
                <LoadingProgress title="Processing Dispute..." labels={CALCULATION_LOADING_LABELS} loadingStep={loadingStep} compact />
              </div>
            )}
          </div>
        </div>
      ) : (
        <button className="btn btn-outline btn-warning btn-sm w-full" onClick={onOpenDispute} disabled={loading || supervisorLevel >= 1 || disputeCount >= 3}>
          Dispute This Answer
          {disputeCount === 2 && <span className="badge badge-error badge-xs ml-2">Last chance!</span>}
          {disputeCount >= 3 && <span className="badge badge-neutral badge-xs ml-2">Max disputes reached</span>}
        </button>
      )}
    </>
  );
}
