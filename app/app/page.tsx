'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SafetyInfo {
  isSafe: boolean;
  violatedCategories?: string[];
  classification: string;
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
  safety?: {
    input: SafetyInfo;
    output: SafetyInfo;
  };
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
  safety?: {
    input: SafetyInfo;
    output: SafetyInfo;
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

  const functionButtons = [
    { label: 'sin', value: 'sin(' },
    { label: 'cos', value: 'cos(' },
    { label: 'tan', value: 'tan(' },
    { label: 'sqrt', value: 'sqrt(' },
    { label: 'log', value: 'log(' },
    { label: 'ln', value: 'ln(' },
    { label: 'abs', value: 'abs(' },
    { label: 'ceil', value: 'ceil(' },
    { label: 'floor', value: 'floor(' },
  ];

  const constants = [
    { label: 'π', value: 'pi' },
    { label: 'e', value: 'e' },
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

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   // Allow mathematical characters including function names and constants
  //   const mathPattern = /^[0-9+\-*/().^\s,a-z]*$/i;
  //   if (mathPattern.test(value)) {
  //     setExpression(value);
  //   }
  // };

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

      // Asynchronously check safety without blocking the UI
      fetch('/api/safety-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: `Mathematical expression: ${expression}`,
          agentResponse: data.explanation || '',
        }),
      })
        .then(res => res.json())
        .then((safetyData) => {
          const typedSafetyData = safetyData as { safety?: { input: SafetyInfo; output: SafetyInfo | null } };
          if (typedSafetyData.safety) {
            setCurrentResult(prev => {
              if (!prev) return prev;
              console.log(typedSafetyData.safety!.input);
              console.log(typedSafetyData.safety!.output);
              return {
                ...prev,
                safety: {
                  input: typedSafetyData.safety!.input,
                  output: typedSafetyData.safety!.output || { isSafe: true, classification: 'N/A' }
                }
              };
            });
          }
        })
        .catch(err => console.error('Safety check failed:', err));
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

      // Asynchronously check safety for the dispute
      fetch('/api/safety-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: `Dispute feedback: ${disputeFeedback}`,
          agentResponse: data.explanation || '',
        }),
      })
        .then(res => res.json())
        .then((safetyData) => {
          const typedSafetyData = safetyData as { safety?: { input: SafetyInfo; output: SafetyInfo | null } };
          if (typedSafetyData.safety) {
            setCurrentResult(prev => {
              if (!prev || !prev.disputes) return prev;
              const updatedDisputes = [...prev.disputes];
              const lastDisputeIndex = updatedDisputes.length - 1;
              if (lastDisputeIndex >= 0) {
                updatedDisputes[lastDisputeIndex] = {
                  ...updatedDisputes[lastDisputeIndex],
                  safety: {
                    input: typedSafetyData.safety!.input,
                    output: typedSafetyData.safety!.output || { isSafe: true, classification: 'N/A' }
                  }
                };
              }
              return {
                ...prev,
                disputes: updatedDisputes
              };
            });
          }
        })
        .catch(err => console.error('Safety check failed:', err));
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
                placeholder="Use buttons to build expression..."
                className="input input-lg input-primary w-full text-2xl font-mono text-right"
                disabled={loading}
                readOnly
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
              />
            </div>

            {/* Calculator Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
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

            {/* Function Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {functionButtons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => setExpression(prev => prev + btn.value)}
                  disabled={loading}
                  className="btn btn-sm btn-secondary"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Constants */}
            <div className="flex gap-2 mb-6">
              {constants.map((constant) => (
                <button
                  key={constant.label}
                  onClick={() => setExpression(prev => prev + constant.value)}
                  disabled={loading}
                  className="btn btn-sm btn-accent flex-1"
                >
                  {constant.label}
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
                    <h3 className="font-bold text-sm opacity-75">📝 Dispute History ({currentResult.disputes.length})</h3>
                    {currentResult.disputes.map((dispute, index) => (
                      <div key={index} className="card bg-base-300 card-border">
                        <div className="card-body p-4">
                          <div className="flex items-start gap-2">
                            <span className="badge badge-warning badge-sm whitespace-nowrap">Dispute #{index + 1}</span>
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
                          {/* Safety Classification for Dispute */}
                          {dispute.safety && (
                            <div className="mt-3 p-2 bg-base-100 rounded-lg">
                              <div className="text-xs font-semibold mb-2 opacity-75">
                                Safety Classification <span className="badge badge-xs badge-neutral ml-1">Llama Guard 3</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="opacity-75">Dispute Input:</span>{' '}
                                  {dispute.safety.input.isSafe ? (
                                    <span className="badge badge-success badge-xs">Safe</span>
                                  ) : (
                                    <>
                                      <span className="badge badge-error badge-xs">Unsafe</span>
                                      {dispute.safety.input.violatedCategories && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {dispute.safety.input.violatedCategories.map((cat: string, idx: number) => (
                                            <span key={idx} className="badge badge-error badge-xs">{cat}</span>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div>
                                  <span className="opacity-75">AI Response:</span>{' '}
                                  {dispute.safety.output.isSafe ? (
                                    <span className="badge badge-success badge-xs">Safe</span>
                                  ) : (
                                    <>
                                      <span className="badge badge-error badge-xs">Unsafe</span>
                                      {dispute.safety.output.violatedCategories && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {dispute.safety.output.violatedCategories.map((cat: string, idx: number) => (
                                            <span key={idx} className="badge badge-error badge-xs">{cat}</span>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
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

                {/* Safety Classification for Initial Response */}
                {currentResult.safety && (
                  <div className="card bg-base-200 card-border">
                    <div className="card-body p-4">
                      <h3 className="card-title text-sm">
                        Safety Classification
                        <span className="badge badge-xs badge-neutral">Llama Guard 3</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Input Safety */}
                        <div className="space-y-1">
                          <div className="font-semibold opacity-75 flex items-center gap-2">
                            User Input
                            {currentResult.safety.input.isSafe ? (
                              <span className="badge badge-success badge-xs">Safe</span>
                            ) : (
                              <span className="badge badge-error badge-xs">Unsafe</span>
                            )}
                          </div>
                          {!currentResult.safety.input.isSafe && currentResult.safety.input.violatedCategories && (
                            <div>
                              <span className="opacity-75">Categories:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {currentResult.safety.input.violatedCategories.map((cat: string, idx: number) => (
                                  <span key={idx} className="badge badge-error badge-xs">{cat}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Output Safety */}
                        <div className="space-y-1">
                          <div className="font-semibold opacity-75 flex items-center gap-2">
                            AI Response
                            {currentResult.safety.output.isSafe ? (
                              <span className="badge badge-success badge-xs">Safe</span>
                            ) : (
                              <span className="badge badge-error badge-xs">Unsafe</span>
                            )}
                          </div>
                          {!currentResult.safety.output.isSafe && currentResult.safety.output.violatedCategories && (
                            <div>
                              <span className="opacity-75">Categories:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {currentResult.safety.output.violatedCategories.map((cat: string, idx: number) => (
                                  <span key={idx} className="badge badge-error badge-xs">{cat}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs opacity-50 mt-1">
                        Powered by meta-llama/llama-guard-3-8b
                      </div>
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
                                  <div className="flex items-start gap-2">
                                    <span className="badge badge-warning badge-xs shrink-0">#{dIndex + 1}</span>
                                    <span className="text-xs opacity-75 italic flex-1">"{dispute.disputeFeedback}"</span>
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
