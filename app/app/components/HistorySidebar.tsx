import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { CalculationResult } from '@/lib/types';

interface HistorySidebarProps {
  history: CalculationResult[];
  expandedHistoryIndex: number | null;
  onLoadFromHistory: (item: CalculationResult) => void;
  onToggleHistoryExpand: (index: number) => void;
  onClearHistory: () => void;
}

export function HistorySidebar({
  history,
  expandedHistoryIndex,
  onLoadFromHistory,
  onToggleHistoryExpand,
  onClearHistory,
}: HistorySidebarProps) {
  return (
    <Card className="lg:w-96">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <CardTitle>Calculation History</CardTitle>
          {history.length > 0 && <Badge>{history.length}</Badge>}
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No calculations yet</p>
            <p className="mt-2 text-xs">Your history will appear here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px] space-y-2 pr-1">
            <div className="space-y-2">
              {history.map((item, index) => (
                <Card key={`${item.expression}-${item.metadata?.timestamp ?? index}`} className="border-border/70 bg-muted/30">
                  <CardContent className="p-0">
                    <button
                      type="button"
                      className="w-full p-4 text-left transition-colors hover:bg-muted/50"
                      aria-label={`Load calculation: ${item.expression}`}
                      onClick={() => onLoadFromHistory(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 font-mono text-sm font-bold">{item.expression}</div>
                        <div className="flex flex-wrap gap-1">
                          {item.disputes && item.disputes.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.disputes.length} dispute{item.disputes.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {item.supervisorReviews && item.supervisorReviews.length > 0 && (
                            <Badge variant={item.supervisorReviews[item.supervisorReviews.length - 1].isFinal ? 'destructive' : 'secondary'} className="text-[10px]">
                              Supervisor
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>= {item.result}</span>
                        {item.metadata && <span>{item.metadata.processingTime}</span>}
                      </div>
                      {item.metadata && (
                        <div className="text-xs text-muted-foreground">
                          {item.metadata.usage.totalTokens} tokens • {new Date(item.metadata.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </button>

                    {item.disputes && item.disputes.length > 0 && (
                      <>
                        <Separator />
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-muted/40"
                          aria-expanded={expandedHistoryIndex === index}
                          aria-controls={`history-disputes-${index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleHistoryExpand(index);
                          }}
                        >
                          <span>View Disputes ({item.disputes.length})</span>
                          <span className="text-base">{expandedHistoryIndex === index ? '▲' : '▼'}</span>
                        </button>

                        {expandedHistoryIndex === index && (
                          <div id={`history-disputes-${index}`} className="space-y-2 bg-muted/40 p-4">
                            <div className="mb-2 text-xs font-bold text-muted-foreground">Original Response:</div>
                            <div className="rounded-md border border-border bg-background p-2 text-xs">
                              <div className="text-muted-foreground">
                                Result: <span className="font-mono">{item.result}</span>
                              </div>
                              <div className="mt-1 line-clamp-2 text-muted-foreground">Explanation: {item.explanation}</div>
                            </div>

                            <Separator className="my-2" />

                            {item.disputes.map((dispute, dIndex) => (
                              <div key={`${dispute.disputeFeedback}-${dIndex}`} className="space-y-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2">
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="shrink-0 border-yellow-500/40 text-[10px]">#{dIndex + 1}</Badge>
                                  <span className="flex-1 text-xs italic text-muted-foreground">"{dispute.disputeFeedback}"</span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-muted-foreground">New Result:</span> <span className="font-mono font-bold">{dispute.result}</span>
                                </div>
                                {dispute.metadata && <div className="text-xs text-muted-foreground">{dispute.metadata.usage.totalTokens} tokens</div>}
                              </div>
                            ))}

                            {item.supervisorReviews && item.supervisorReviews.length > 0 && (
                              <>
                                <Separator className="my-2" />
                                <div className="mb-2 text-xs font-bold text-muted-foreground">Supervisor Reviews:</div>
                                {item.supervisorReviews.map((review, sIndex) => (
                                  <div key={`${review.supervisorTitle}-${sIndex}`} className="space-y-1 rounded-md border border-border bg-background p-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="text-xs font-bold">{review.supervisorTitle}</div>
                                      {review.isFinal && <Badge variant="destructive" className="text-[10px]">FINAL</Badge>}
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Answer:</span> <span className="font-mono font-bold">{review.finalAnswer}</span>
                                    </div>
                                    {review.confidence && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">Confidence:</span>
                                        <span className="text-xs font-bold">{review.confidence}%</span>
                                      </div>
                                    )}
                                    {review.metadata && <div className="text-xs text-muted-foreground">{review.metadata.usage.totalTokens} tokens</div>}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {history.length > 0 && (
          <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={onClearHistory}>
            Clear History
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
