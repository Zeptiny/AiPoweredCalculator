import { Loader2 } from 'lucide-react';
import type { DisputeResponse } from '@/lib/types';
import { CALCULATION_LOADING_LABELS } from '@/lib/prompts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
          <h3 className="text-sm font-bold text-muted-foreground">Dispute History ({disputes.length})</h3>
          {disputes.map((dispute, index) => (
            <Card key={`${dispute.disputeFeedback}-${index}`} className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="border-yellow-500/40 whitespace-nowrap text-[10px] text-yellow-700 dark:text-yellow-300">
                    Dispute Agent #{index + 1}
                  </Badge>
                </div>

                {dispute.agentName && <div className="mt-1 text-sm font-semibold">{dispute.agentName}</div>}

                <div className="mt-1 flex-1 text-xs text-muted-foreground">Feedback: "{dispute.disputeFeedback}"</div>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground">Revised Analysis:</div>
                    <p className="text-sm">{dispute.explanation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Revised Result:</span>
                    <span className="font-mono text-lg font-bold">{dispute.result}</span>
                  </div>
                  {dispute.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <Progress className="w-20" value={dispute.confidence} />
                      <span className="text-xs font-bold">{dispute.confidence}%</span>
                    </div>
                  )}
                </div>

                {dispute.metadata && (
                  <div className="mt-2 text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {disputeMode ? (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Dispute Response</h3>
            {disputeCount === 2 && (
              <Alert className="border-yellow-500/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200">
                <AlertDescription className="text-xs">
                  Warning: This is your 3rd dispute. After submission, a supervisor will be automatically called for final review.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">Provide feedback or explain why the answer is incorrect:</p>
            <Textarea
              className="min-h-24"
              placeholder="E.g., 'The order of operations is wrong' or 'The result should be 42'"
              value={disputeFeedback}
              onChange={(e) => onDisputeFeedbackChange(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelDispute} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onSubmitDispute}
                disabled={loading || !disputeFeedback.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Dispute'}
              </Button>
            </div>

            {loading && (
              <div className="mt-3">
                <LoadingProgress title="Processing Dispute..." labels={CALCULATION_LOADING_LABELS} loadingStep={loadingStep} compact />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-yellow-500/50 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-300"
          onClick={onOpenDispute}
          disabled={loading || supervisorLevel >= 1 || disputeCount >= 3}
        >
          Dispute This Answer
          {disputeCount === 2 && <Badge variant="destructive" className="ml-2 text-[10px]">Last chance!</Badge>}
          {disputeCount >= 3 && <Badge variant="secondary" className="ml-2 text-[10px]">Max disputes reached</Badge>}
        </Button>
      )}
    </>
  );
}
