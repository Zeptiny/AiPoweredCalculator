import { Loader2 } from 'lucide-react';
import { SUPERVISOR_LOADING_LABELS } from '@/lib/prompts';
import type { SupervisorResponse } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
          <h3 className="text-sm font-bold text-muted-foreground">Supervisor Reviews</h3>
          {supervisorReviews.map((review, index) => (
            <Card key={`${review.supervisorTitle}-${index}`} className={review.isFinal ? 'border-destructive/40 bg-destructive/10' : 'border-blue-500/30 bg-blue-500/5'}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start gap-2">
                  <Badge variant={review.isFinal ? 'destructive' : 'secondary'} className="whitespace-nowrap text-[10px]">
                    {review.supervisorTitle}
                  </Badge>
                  {review.isFinal && <Badge variant="outline" className="text-[10px]">FINAL</Badge>}
                </div>

                {review.agentName && <div className="mt-2 text-sm font-semibold">{review.agentName}</div>}

                {review.userConcern && <div className="mt-1 flex-1 text-xs text-muted-foreground">Concern: "{review.userConcern}"</div>}

                <Separator className="my-2" />

                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground">Analysis:</div>
                    <p className="text-sm">{review.explanation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Final Answer:</span>
                    <span className="font-mono text-lg font-bold">{review.finalAnswer}</span>
                  </div>
                  {review.recommendation && (
                    <div>
                      <div className="text-xs font-bold text-muted-foreground">Recommendation:</div>
                      <p className="text-sm italic">{review.recommendation}</p>
                    </div>
                  )}
                  {review.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <Progress className="w-20" value={review.confidence} />
                      <span className="text-xs font-bold">{review.confidence}%</span>
                    </div>
                  )}
                  {review.closingStatement && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription className="text-xs">{review.closingStatement}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {review.metadata && (
                  <div className="mt-2 text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
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
      containerClass: 'border-blue-500/30 bg-blue-500/5',
      title: 'Request Supervisor Review',
      description: 'A Senior Computation Specialist will review the calculation and all disputes.',
      placeholder: 'Describe your concern or why you need supervisor review...',
      buttonClass: 'bg-blue-600 text-white hover:bg-blue-600/90',
      openButtonClass: 'border-blue-500/40 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300',
      actionLabel: 'Call Senior Computation Specialist',
      loadingTitle: 'Supervisor Review in Progress...',
    },
    1: {
      containerClass: 'border-blue-500/30 bg-blue-500/5',
      title: 'Escalate to Higher Authority',
      description: 'The Principal Mathematical Arbitrator will provide advanced analysis.',
      placeholder: 'Explain why you need further escalation...',
      buttonClass: 'bg-blue-600 text-white hover:bg-blue-600/90',
      openButtonClass: 'border-blue-500/40 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300',
      actionLabel: 'Call Principal Mathematical Arbitrator',
      loadingTitle: 'Escalating to Principal Arbitrator...',
    },
    2: {
      containerClass: 'border-destructive/40 bg-destructive/10',
      title: 'Final Escalation',
      description: 'The Chief Executive of Mathematical Operations will make the final, binding decision.',
      placeholder: 'State your final concern for executive review...',
      buttonClass: '',
      openButtonClass: 'border-destructive/40 text-destructive hover:bg-destructive/10',
      actionLabel: 'Call Chief Executive of Mathematical Operations',
      loadingTitle: 'Escalating to CEMO (Final Decision)...',
    },
  }[supervisorLevel as 0 | 1 | 2];

  if (!config) {
    return null;
  }

  if (!supervisorMode) {
    return (
      <Button variant="outline" size="sm" className={`w-full ${config.openButtonClass}`} onClick={onOpenSupervisorMode} disabled={loadingSupervisor}>
        {config.actionLabel}
      </Button>
    );
  }

  return (
    <Card className={config.containerClass}>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">{config.title}</h3>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <Textarea
          className="min-h-24"
          placeholder={config.placeholder}
          value={supervisorConcern}
          onChange={(e) => onSupervisorConcernChange(e.target.value)}
          rows={3}
          disabled={loadingSupervisor}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelSupervisorMode} disabled={loadingSupervisor}>
            Cancel
          </Button>
          <Button
            variant={supervisorLevel === 2 ? 'destructive' : 'default'}
            size="sm"
            className={config.buttonClass}
            onClick={onSubmitSupervisorReview}
            disabled={loadingSupervisor || !supervisorConcern.trim()}
          >
            {loadingSupervisor ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Escalating...
              </>
            ) : (
              <>{config.actionLabel}</>
            )}
          </Button>
        </div>

        {loadingSupervisor && (
          <div className="mt-3">
            <LoadingProgress title={config.loadingTitle} labels={loadingLabels} loadingStep={loadingStep} compact />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
