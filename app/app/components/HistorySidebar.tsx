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
    <div className="card lg:w-96 bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          Calculation History
          {history.length > 0 && <div className="badge badge-primary">{history.length}</div>}
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-8 opacity-50">
            <p>No calculations yet</p>
            <p className="text-xs mt-2">Your history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {history.map((item, index) => (
              <div key={`${item.expression}-${item.metadata?.timestamp ?? index}`} className="card card-border bg-base-200">
                <div className="card-body p-4 hover:bg-base-300 cursor-pointer transition-colors" onClick={() => onLoadFromHistory(item)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-mono text-sm font-bold flex-1">{item.expression}</div>
                    <div className="flex gap-1 flex-wrap">
                      {item.disputes && item.disputes.length > 0 && (
                        <div className="badge badge-warning badge-sm">
                          {item.disputes.length} dispute{item.disputes.length > 1 ? 's' : ''}
                        </div>
                      )}
                      {item.supervisorReviews && item.supervisorReviews.length > 0 && (
                        <div className={`badge ${item.supervisorReviews[item.supervisorReviews.length - 1].isFinal ? 'badge-error' : 'badge-info'} badge-sm`}>
                          Supervisor
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>= {item.result}</span>
                    {item.metadata && <span>{item.metadata.processingTime}</span>}
                  </div>
                  {item.metadata && (
                    <div className="text-xs opacity-50">
                      {item.metadata.usage.totalTokens} tokens • {new Date(item.metadata.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {item.disputes && item.disputes.length > 0 && (
                  <div className="border-t border-base-300">
                    <button
                      className="w-full px-4 py-2 text-xs hover:bg-base-300 transition-colors flex items-center justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHistoryExpand(index);
                      }}
                    >
                      <span>View Disputes ({item.disputes.length})</span>
                      <span className="text-lg">{expandedHistoryIndex === index ? '▲' : '▼'}</span>
                    </button>

                    {expandedHistoryIndex === index && (
                      <div className="p-4 bg-base-300 space-y-2">
                        <div className="text-xs font-bold opacity-75 mb-2">Original Response:</div>
                        <div className="text-xs bg-base-100 p-2 rounded">
                          <div className="opacity-75">
                            Result: <span className="font-mono">{item.result}</span>
                          </div>
                          <div className="opacity-75 mt-1 line-clamp-2">Explanation: {item.explanation}</div>
                        </div>

                        <div className="divider my-2"></div>

                        {item.disputes.map((dispute, dIndex) => (
                          <div key={`${dispute.disputeFeedback}-${dIndex}`} className="bg-warning/10 p-2 rounded space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="badge badge-warning badge-xs shrink-0">#{dIndex + 1}</span>
                              <span className="text-xs opacity-75 italic flex-1">"{dispute.disputeFeedback}"</span>
                            </div>
                            <div className="text-xs">
                              <span className="opacity-75">New Result:</span> <span className="font-mono font-bold">{dispute.result}</span>
                            </div>
                            {dispute.metadata && <div className="text-xs opacity-50">{dispute.metadata.usage.totalTokens} tokens</div>}
                          </div>
                        ))}

                        {item.supervisorReviews && item.supervisorReviews.length > 0 && (
                          <>
                            <div className="divider my-2"></div>
                            <div className="text-xs font-bold opacity-75 mb-2">Supervisor Reviews:</div>
                            {item.supervisorReviews.map((review, sIndex) => (
                              <div key={`${review.supervisorTitle}-${sIndex}`} className={`${review.isFinal ? 'bg-error/10' : 'bg-info/10'} p-2 rounded space-y-1`}>
                                <div className="flex items-start gap-2 justify-between">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold">{review.supervisorTitle}</span>
                                  </div>
                                  {review.isFinal && <span className="badge badge-error badge-outline badge-xs">FINAL</span>}
                                </div>
                                <div className="text-xs">
                                  <span className="opacity-75">Answer:</span> <span className="font-mono font-bold">{review.finalAnswer}</span>
                                </div>
                                {review.confidence && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs opacity-75">Confidence:</span>
                                    <span className="text-xs font-bold">{review.confidence}%</span>
                                  </div>
                                )}
                                {review.metadata && <div className="text-xs opacity-50">{review.metadata.usage.totalTokens} tokens</div>}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <button className="btn btn-sm btn-outline btn-error mt-4" onClick={onClearHistory}>
            Clear History
          </button>
        )}
      </div>
    </div>
  );
}
