import { SUPERVISOR_LOADING_LABELS } from '@/lib/prompts';
import type { SupervisorResponse } from '@/lib/types';
import { LoadingProgress } from './LoadingProgress';
import { SafetyClassificationBlock } from './SafetyClassificationBlock';

interface SupervisorSectionProps {
  supervisorReviews: SupervisorResponse[];
  supervisorLevel: number;
  supervisorMode: boolean;
  supervisorConcern: string;
  hasDisputes: boolean;
  loadingSupervisor: boolean;
  loadingStep: number;
  onSupervisorConcernChange: (value: string) => void;
  onOpenSupervisorMode: () => void;
  onCancelSupervisorMode: () => void;
  onSubmitSupervisorReview: () => void;
}

export function SupervisorSection({
  supervisorReviews,
  supervisorLevel,
  supervisorMode,
  supervisorConcern,
  hasDisputes,
  loadingSupervisor,
  loadingStep,
  onSupervisorConcernChange,
  onOpenSupervisorMode,
  onCancelSupervisorMode,
  onSubmitSupervisorReview,
}: SupervisorSectionProps) {
  const loadingLabels = SUPERVISOR_LOADING_LABELS[Math.min(supervisorLevel, 2) as 0 | 1 | 2];

  return (
    <>
      {supervisorReviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm opacity-75">Supervisor Reviews</h3>
          {supervisorReviews.map((review, index) => (
            <div key={`${review.supervisorTitle}-${index}`} className={`card ${review.isFinal ? 'bg-error/10' : 'bg-info/10'} card-border`}>
              <div className="card-body p-4">
                <div className="flex items-start gap-2">
                  <span className={`badge ${review.isFinal ? 'badge-error' : 'badge-info'} badge-sm whitespace-nowrap`}>
                    {review.supervisorTitle}
                  </span>
                  {review.isFinal && <span className="badge badge-error badge-outline badge-xs">FINAL</span>}
                </div>

                {review.agentName && <div className="text-sm font-semibold mt-2">{review.agentName}</div>}

                {review.userConcern && <div className="flex-1 text-xs opacity-75 mt-1">Concern: "{review.userConcern}"</div>}

                <div className="divider my-2"></div>

                <div className="space-y-2">
                  <div>
                    <div className="font-bold text-xs opacity-75">Analysis:</div>
                    <p className="text-sm">{review.explanation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs opacity-75">Final Answer:</span>
                    <span className="font-mono font-bold text-lg">{review.finalAnswer}</span>
                  </div>
                  {review.recommendation && (
                    <div>
                      <div className="font-bold text-xs opacity-75">Recommendation:</div>
                      <p className="text-sm italic">{review.recommendation}</p>
                    </div>
                  )}
                  {review.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-75">Confidence:</span>
                      <progress className={`progress ${review.isFinal ? 'progress-error' : 'progress-info'} w-20`} value={review.confidence} max="100"></progress>
                      <span className="text-xs font-bold">{review.confidence}%</span>
                    </div>
                  )}
                  {review.closingStatement && (
                    <div className="alert alert-error mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <span className="text-xs">{review.closingStatement}</span>
                    </div>
                  )}
                </div>

                {review.metadata && (
                  <div className="text-xs opacity-50 mt-2">
                    {review.metadata.usage.totalTokens} tokens • {review.metadata.processingTime} • {review.metadata.model.split('/')[1]}
                  </div>
                )}

                {review.safety && (
                  <SafetyClassificationBlock
                    title="Safety Classification"
                    leftLabel="User Concern"
                    rightLabel="Supervisor Response"
                    safety={review.safety}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {renderSupervisorRequestArea({
        supervisorLevel,
        hasDisputes,
        supervisorMode,
        supervisorConcern,
        loadingSupervisor,
        loadingStep,
        loadingLabels,
        onSupervisorConcernChange,
        onOpenSupervisorMode,
        onCancelSupervisorMode,
        onSubmitSupervisorReview,
      })}
    </>
  );
}

interface RequestAreaProps {
  supervisorLevel: number;
  hasDisputes: boolean;
  supervisorMode: boolean;
  supervisorConcern: string;
  loadingSupervisor: boolean;
  loadingStep: number;
  loadingLabels: readonly string[];
  onSupervisorConcernChange: (value: string) => void;
  onOpenSupervisorMode: () => void;
  onCancelSupervisorMode: () => void;
  onSubmitSupervisorReview: () => void;
}

function renderSupervisorRequestArea({
  supervisorLevel,
  hasDisputes,
  supervisorMode,
  supervisorConcern,
  loadingSupervisor,
  loadingStep,
  loadingLabels,
  onSupervisorConcernChange,
  onOpenSupervisorMode,
  onCancelSupervisorMode,
  onSubmitSupervisorReview,
}: RequestAreaProps) {
  if (!hasDisputes || supervisorLevel > 2) {
    return null;
  }

  const config = {
    0: {
      containerClass: 'card bg-info/10 card-border',
      title: 'Request Supervisor Review',
      description: 'A Senior Computation Specialist will review the calculation and all disputes.',
      placeholder: 'Describe your concern or why you need supervisor review...',
      buttonClass: 'btn btn-sm btn-info',
      openButtonClass: 'btn btn-outline btn-info btn-sm w-full',
      actionLabel: 'Call Senior Computation Specialist',
      loadingTitle: 'Supervisor Review in Progress...',
    },
    1: {
      containerClass: 'card bg-info/10 card-border',
      title: 'Escalate to Higher Authority',
      description: 'The Principal Mathematical Arbitrator will provide advanced analysis.',
      placeholder: 'Explain why you need further escalation...',
      buttonClass: 'btn btn-sm btn-info',
      openButtonClass: 'btn btn-outline btn-info btn-sm w-full',
      actionLabel: 'Call Principal Mathematical Arbitrator',
      loadingTitle: 'Escalating to Principal Arbitrator...',
    },
    2: {
      containerClass: 'card bg-error/10 card-border',
      title: 'Final Escalation',
      description: 'The Chief Executive of Mathematical Operations will make the final, binding decision.',
      placeholder: 'State your final concern for executive review...',
      buttonClass: 'btn btn-sm btn-error',
      openButtonClass: 'btn btn-outline btn-error btn-sm w-full',
      actionLabel: 'Call Chief Executive of Mathematical Operations',
      loadingTitle: 'Escalating to CEMO (Final Decision)...',
    },
  }[supervisorLevel as 0 | 1 | 2];

  if (!config) {
    return null;
  }

  if (!supervisorMode) {
    return (
      <button className={config.openButtonClass} onClick={onOpenSupervisorMode} disabled={loadingSupervisor}>
        {config.actionLabel}
      </button>
    );
  }

  return (
    <div className={config.containerClass}>
      <div className="card-body p-4">
        <h3 className="card-title text-sm">{config.title}</h3>
        <p className="text-xs opacity-75">{config.description}</p>
        <textarea
          className={`textarea w-full ${supervisorLevel === 2 ? 'textarea-error' : 'textarea-info'}`}
          placeholder={config.placeholder}
          value={supervisorConcern}
          onChange={(e) => onSupervisorConcernChange(e.target.value)}
          rows={3}
          disabled={loadingSupervisor}
        />
        <div className="card-actions justify-end">
          <button className="btn btn-sm btn-ghost" onClick={onCancelSupervisorMode} disabled={loadingSupervisor}>
            Cancel
          </button>
          <button className={config.buttonClass} onClick={onSubmitSupervisorReview} disabled={loadingSupervisor || !supervisorConcern.trim()}>
            {loadingSupervisor ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Escalating...
              </>
            ) : (
              <>{config.actionLabel}</>
            )}
          </button>
        </div>

        {loadingSupervisor && (
          <div className="mt-3">
            <LoadingProgress title={config.loadingTitle} labels={loadingLabels} loadingStep={loadingStep} compact />
          </div>
        )}
      </div>
    </div>
  );
}
