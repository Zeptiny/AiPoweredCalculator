'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DisputeResponse {
  explanation: string;
  result: string;
  metadata?: {
    processingTime: string;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    timestamp: string;
  };
  disputeFeedback: string;
}

interface CalculationResult {
  expression: string;
  explanation: string;
  result: string;
  conversationHistory?: ChatMessage[];
  disputes?: DisputeResponse[];
  metadata?: {
    processingTime: string;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    timestamp: string;
  };
}

export default function Home() {
  const [expression, setExpression] = useState('');
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [disputeMode, setDisputeMode] = useState(false);
  const [disputeFeedback, setDisputeFeedback] = useState('');
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState<number | null>(null);

  const buttons = [
    '7', '8', '9', '/', 
    '4', '5', '6', '*', 
    '1', '2', '3', '-', 
    '0', '.', '=', '+',
    '(', ')', '^', 'C'
  ];

  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      setExpression('');
      setCurrentResult(null);
      setError('');
      setDisputeMode(false);
      setDisputeFeedback('');
    } else if (value === '=') {
      handleCalculate();
    } else {
      setExpression(prev => prev + value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow mathematical characters
    const mathPattern = /^[0-9+\-*/().^\s]*$/;
    if (mathPattern.test(value)) {
      setExpression(value);
    }
  };

  const handleCalculate = async () => {
    if (!expression.trim()) return;

    setLoading(true);
    setError('');
    setCurrentResult(null);
    setDisputeMode(false);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
      });

      const data = await response.json() as { 
        explanation?: string; 
        result?: string; 
        conversationHistory?: ChatMessage[];
        metadata?: CalculationResult['metadata'];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate');
      }

      const calculationResult: CalculationResult = {
        expression,
        explanation: data.explanation || '',
        result: data.result || '',
        conversationHistory: data.conversationHistory,
        disputes: [],
        metadata: data.metadata
      };

      setCurrentResult(calculationResult);
      
      // Update history
      setHistory(prev => {
        const updated = [calculationResult, ...prev].slice(0, 10);
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!currentResult || !disputeFeedback.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expression: currentResult.expression,
          conversationHistory: currentResult.conversationHistory,
          disputeFeedback: disputeFeedback
        }),
      });

      const data = await response.json() as { 
        explanation?: string; 
        result?: string; 
        conversationHistory?: ChatMessage[];
        metadata?: CalculationResult['metadata'];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process dispute');
      }

      const disputeResponse: DisputeResponse = {
        explanation: data.explanation || '',
        result: data.result || '',
        metadata: data.metadata,
        disputeFeedback: disputeFeedback
      };

      // Update current result with dispute
      const updatedResult: CalculationResult = {
        ...currentResult,
        conversationHistory: data.conversationHistory,
        disputes: [...(currentResult.disputes || []), disputeResponse]
      };

      setCurrentResult(updatedResult);
      
      // Update history to replace the current calculation
      setHistory(prev => {
        const index = prev.findIndex(item => 
          item.expression === currentResult.expression && 
          item.metadata?.timestamp === currentResult.metadata?.timestamp
        );
        
        if (index !== -1) {
          const newHistory = [...prev];
          newHistory[index] = updatedResult;
          return newHistory;
        }
        return prev;
      });

      setDisputeMode(false);
      setDisputeFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during dispute');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: CalculationResult) => {
    setExpression(item.expression);
    setCurrentResult(item);
    setShowHistory(false);
    setDisputeMode(false);
    setDisputeFeedback('');
  };

  const toggleHistoryExpand = (index: number) => {
    setExpandedHistoryIndex(expandedHistoryIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-base-200">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-4">
        {/* Main Calculator */}
        <div className="card flex-1 bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h1 className="card-title text-3xl font-bold">
                AI Computation Engine
              </h1>
              <button 
                className="btn btn-sm btn-outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>

            {/* Input Display */}
            <div className="form-control w-full mb-4">
              <input
                type="text"
                value={expression}
                onChange={handleInputChange}
                placeholder="Enter mathematical expression..."
                className="input input-lg input-primary w-full text-2xl font-mono text-right"
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
              />
            </div>

            {/* Calculator Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {buttons.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleButtonClick(btn)}
                  disabled={loading}
                  className={`btn btn-lg ${
                    btn === '=' 
                      ? 'btn-primary' 
                      : btn === 'C' 
                      ? 'btn-error' 
                      : ['+', '-', '*', '/', '^'].includes(btn)
                      ? 'btn-accent'
                      : 'btn-neutral'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Loading State with Processing Details */}
            {loading && (
              <div className="alert alert-info">
                <span className="loading loading-spinner loading-md"></span>
                <div>
                  <div className="font-bold">Processing Request...</div>
                  <div className="text-xs opacity-75">
                    • Parsing expression syntax
                    <br />• Analyzing mathematical structure
                    <br />• Executing AI computation engine
                    <br />• Validating results
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Result Display */}
            {currentResult && (
              <div className="space-y-4">
                {/* Explanation First (Professional Order) */}
                <div className="card bg-base-200 card-border">
                  <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                      Computational Analysis
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{currentResult.explanation}</p>
                  </div>
                </div>

                {/* Result Second */}
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="w-full">
                    <div className="font-bold">Final Result</div>
                    <div className="text-3xl font-mono font-bold">{currentResult.result}</div>
                  </div>
                </div>

                {/* Display Disputes if any */}
                {currentResult.disputes && currentResult.disputes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm opacity-75">Dispute History ({currentResult.disputes.length})</h3>
                    {currentResult.disputes.map((dispute, index) => (
                      <div key={index} className="card bg-base-300 card-border">
                        <div className="card-body p-4">
                          <div className="flex items-start gap-2">
                            <span className="badge badge-warning badge-sm">Dispute #{index + 1}</span>
                            <div className="flex-1 text-xs opacity-75">
                              Feedback: "{dispute.disputeFeedback}"
                            </div>
                          </div>
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
                          </div>
                          {dispute.metadata && (
                            <div className="text-xs opacity-50 mt-2">
                              {dispute.metadata.usage.totalTokens} tokens • {dispute.metadata.processingTime}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dispute Input Area */}
                {disputeMode ? (
                  <div className="card bg-warning/10 card-border">
                    <div className="card-body">
                      <h3 className="card-title text-sm">Dispute Response</h3>
                      <p className="text-xs opacity-75">Provide feedback or explain why the answer is incorrect:</p>
                      <textarea
                        className="textarea textarea-warning w-full"
                        placeholder="E.g., 'The order of operations is wrong' or 'The result should be 42'"
                        value={disputeFeedback}
                        onChange={(e) => setDisputeFeedback(e.target.value)}
                        rows={3}
                        disabled={loading}
                      />
                      <div className="card-actions justify-end">
                        <button 
                          className="btn btn-sm btn-ghost"
                          onClick={() => {
                            setDisputeMode(false);
                            setDisputeFeedback('');
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={handleDispute}
                          disabled={loading || !disputeFeedback.trim()}
                        >
                          {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Submit Dispute'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn btn-outline btn-warning btn-sm w-full"
                    onClick={() => setDisputeMode(true)}
                    disabled={loading}
                  >
                    Dispute This Answer
                  </button>
                )}

                {/* Usage Metadata */}
                {currentResult.metadata && (
                  <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                    <div className="stat">
                      <div className="stat-title">Processing Time</div>
                      <div className="stat-value text-2xl">{currentResult.metadata.processingTime}</div>
                      <div className="stat-desc">Response latency</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Tokens Used</div>
                      <div className="stat-value text-2xl">{currentResult.metadata.usage.totalTokens}</div>
                      <div className="stat-desc">
                        ↗︎ {currentResult.metadata.usage.promptTokens} prompt, 
                        ↘︎ {currentResult.metadata.usage.completionTokens} completion
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">AI Model</div>
                      <div className="stat-value text-sm">{currentResult.metadata.model.split('/')[1]}</div>
                      <div className="stat-desc">Neural engine</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="card lg:w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                Calculation History
                {history.length > 0 && (
                  <div className="badge badge-primary">{history.length}</div>
                )}
              </h2>
              
              {history.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <p>No calculations yet</p>
                  <p className="text-xs mt-2">Your history will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {history.map((item, index) => (
                    <div 
                      key={index}
                      className="card card-border bg-base-200"
                    >
                      <div 
                        className="card-body p-4 hover:bg-base-300 cursor-pointer transition-colors"
                        onClick={() => loadFromHistory(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-mono text-sm font-bold flex-1">{item.expression}</div>
                          {item.disputes && item.disputes.length > 0 && (
                            <div className="badge badge-warning badge-sm">
                              {item.disputes.length} dispute{item.disputes.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-75">
                          <span>= {item.result}</span>
                          {item.metadata && (
                            <span>{item.metadata.processingTime}</span>
                          )}
                        </div>
                        {item.metadata && (
                          <div className="text-xs opacity-50">
                            {item.metadata.usage.totalTokens} tokens • {new Date(item.metadata.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      
                      {/* Expandable Disputes Section */}
                      {item.disputes && item.disputes.length > 0 && (
                        <div className="border-t border-base-300">
                          <button
                            className="w-full px-4 py-2 text-xs hover:bg-base-300 transition-colors flex items-center justify-between"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHistoryExpand(index);
                            }}
                          >
                            <span>View Disputes ({item.disputes.length})</span>
                            <span className="text-lg">{expandedHistoryIndex === index ? '▲' : '▼'}</span>
                          </button>
                          
                          {expandedHistoryIndex === index && (
                            <div className="p-4 bg-base-300 space-y-2">
                              <div className="text-xs font-bold opacity-75 mb-2">Original Response:</div>
                              <div className="text-xs bg-base-100 p-2 rounded">
                                <div className="opacity-75">Result: <span className="font-mono">{item.result}</span></div>
                                <div className="opacity-75 mt-1 line-clamp-2">Explanation: {item.explanation}</div>
                              </div>
                              
                              <div className="divider my-2"></div>
                              
                              {item.disputes.map((dispute, dIndex) => (
                                <div key={dIndex} className="bg-warning/10 p-2 rounded space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="badge badge-warning badge-xs">Dispute #{dIndex + 1}</span>
                                    <span className="text-xs opacity-75 italic">"{dispute.disputeFeedback}"</span>
                                  </div>
                                  <div className="text-xs">
                                    <span className="opacity-75">New Result:</span> <span className="font-mono font-bold">{dispute.result}</span>
                                  </div>
                                  {dispute.metadata && (
                                    <div className="text-xs opacity-50">
                                      {dispute.metadata.usage.totalTokens} tokens
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <button 
                  className="btn btn-sm btn-outline btn-error mt-4"
                  onClick={() => setHistory([])}
                >
                  Clear History
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
