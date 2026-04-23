import type { CalculationResult } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SafetyClassificationBlock } from './SafetyClassificationBlock';

interface ResultPanelProps {
  currentResult: CalculationResult;
  loadingSafety: boolean;
}

export function ResultPanel({ currentResult, loadingSafety }: ResultPanelProps) {
  const totalUsage = calculateTotalUsage(currentResult);

  return (
    <div className="space-y-4">
      <Alert className="border-green-500/30 bg-green-500/10">
        <AlertTitle>Final Result</AlertTitle>
        <AlertDescription className="font-mono text-3xl font-bold">{currentResult.result}</AlertDescription>
      </Alert>

      <Card className="bg-muted/30">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="border-green-500/40 text-[10px] text-green-700 dark:text-green-300">Initial Calculation</Badge>
            {currentResult.confidence && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Progress className="w-20" value={currentResult.confidence} />
                <span className="text-xs font-bold">{currentResult.confidence}%</span>
              </div>
            )}
          </div>
          <Separator className="my-2" />
          <div className="space-y-2">
            <div>
              <div className="text-xs font-bold text-muted-foreground">Analysis:</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{currentResult.explanation}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Result:</span>
              <span className="font-mono text-lg font-bold">{currentResult.result}</span>
            </div>
          </div>
          {currentResult.metadata && (
            <div className="mt-2 text-xs text-muted-foreground">
              {currentResult.metadata.usage.totalTokens} tokens • {currentResult.metadata.processingTime}
            </div>
          )}

          {loadingSafety && !currentResult.safety ? (
            <div className="mt-3 animate-pulse rounded-lg border border-border bg-background p-3">
              <div className="mb-2 h-3 w-32 rounded bg-muted"></div>
              <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted"></div>
                  <div className="h-3 w-full rounded bg-muted"></div>
                  <div className="h-3 w-3/4 rounded bg-muted"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-muted"></div>
                  <div className="h-3 w-full rounded bg-muted"></div>
                  <div className="h-3 w-3/4 rounded bg-muted"></div>
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
        </CardContent>
      </Card>

      {currentResult.metadata && (
        <div className="grid w-full gap-3 lg:grid-cols-3">
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-xs text-muted-foreground">Processing Time</div>
              <div className="text-2xl font-semibold">{currentResult.metadata.processingTime}</div>
              <div className="text-xs text-muted-foreground">Initial response</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-xs text-muted-foreground">Total Tokens Used</div>
              <div className="text-2xl font-semibold">{totalUsage.totalTokens.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                ↗︎ {totalUsage.promptTokens.toLocaleString()} prompt, ↘︎ {totalUsage.completionTokens.toLocaleString()} completion
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="text-xs text-muted-foreground">Interactions</div>
              <div className="text-2xl font-semibold">{1 + (currentResult.disputes?.length || 0) + (currentResult.supervisorReviews?.length || 0)}</div>
              <div className="text-xs text-muted-foreground">
                {currentResult.disputes?.length || 0} disputes, {currentResult.supervisorReviews?.length || 0} reviews
              </div>
            </CardContent>
          </Card>
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
