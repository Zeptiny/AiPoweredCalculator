'use client';

import { useState } from 'react';

// Category descriptions for displaying tooltips
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'S1': 'Violent Crimes',
  'S2': 'Non-Violent Crimes',
  'S3': 'Sex Crimes',
  'S4': 'Child Exploitation',
  'S5': 'Defamation',
  'S6': 'Specialized Advice',
  'S7': 'Privacy',
  'S8': 'Intellectual Property',
  'S9': 'Indiscriminate Weapons',
  'S10': 'Hate',
  'S11': 'Self-Harm',
  'S12': 'Sexual Content',
  'S13': 'Elections',
  'S14': 'Code Interpreter Abuse',
};

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
  confidence?: number;
  agentName?: string;
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

interface SupervisorResponse {
  supervisorLevel: number;
  supervisorTitle: string;
  agentName?: string;
  explanation: string;
  finalAnswer: string;
  recommendation: string;
  confidence?: number;
  closingStatement?: string;
  isFinal: boolean;
  canEscalate: boolean;
  nextLevel: string | null;
  userConcern?: string;
  safety?: {
    input: SafetyInfo;
    output: SafetyInfo;
  };
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

interface CalculationResult {
  expression: string;
  explanation: string;
  result: string;
  confidence?: number;
  conversationHistory?: ChatMessage[];
  disputes?: DisputeResponse[];
  supervisorReviews?: SupervisorResponse[];
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);
  const [disputeCount, setDisputeCount] = useState(0);
  const [supervisorLevel, setSupervisorLevel] = useState(0);
  const [supervisorConcern, setSupervisorConcern] = useState("");
  const [supervisorMode, setSupervisorMode] = useState(false);

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
    setLoadingStep(0);
    setError('');
    setCurrentResult(null);
    setDisputeMode(false);
    setDisputeCount(0);
    setSupervisorLevel(0);
    setSupervisorConcern('');

    // Simulate progressive loading steps
    const steps = [
      { step: 0, delay: 0 },
      { step: 1, delay: 300 },
      { step: 2, delay: 600 },
      { step: 3, delay: 900 },
    ];

    steps.forEach(({ step, delay }) => {
      setTimeout(() => setLoadingStep(step), delay);
    });

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
        confidence?: number;
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
        confidence: data.confidence,
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
      setLoadingSafety(true);
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
          setLoadingSafety(false);
        })
        .catch(err => {
          console.error('Safety check failed:', err);
          setLoadingSafety(false);
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
        confidence?: number;
        agentName?: string;
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
        confidence: data.confidence,
        agentName: data.agentName,
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

      // Increment dispute counter
      const newDisputeCount = disputeCount + 1;
      setDisputeCount(newDisputeCount);

      setDisputeMode(false);
      setDisputeFeedback('');

      // Check if this is the 3rd dispute - automatically escalate to supervisor
      if (newDisputeCount === 3 && supervisorLevel === 0) {
        setError('⚠️ After 3 disputes, this matter requires supervisor review. Automatically escalating to Senior Computation Specialist...');
        // Automatically open supervisor mode with a default concern
        setTimeout(() => {
          setSupervisorConcern('After multiple disputes, I need a definitive answer from a supervisor.');
          setSupervisorMode(true);
          setError(''); // Clear the warning after showing it
        }, 2000);
      }

      // Asynchronously check safety for the dispute
      setLoadingSafety(true);
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
          setLoadingSafety(false);
        })
        .catch(err => {
          console.error('Safety check failed:', err);
          setLoadingSafety(false);
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorReview = async () => {
    if (!currentResult || !supervisorConcern.trim()) return;

    setLoadingSupervisor(true);
    setError('');

    try {
      const response = await fetch('/api/supervisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: currentResult.expression,
          disputes: currentResult.disputes || [],
          conversationHistory: currentResult.conversationHistory || [],
          userConcern: supervisorConcern,
          currentLevel: supervisorLevel
        }),
      });

      const data = await response.json() as SupervisorResponse;

      if (!response.ok) {
        throw new Error('Failed to get supervisor review');
      }

      // Run safety check for supervisor review
      fetch('/api/safety-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: supervisorConcern,
          agentResponse: `${data.explanation}\n${data.finalAnswer}`,
        }),
      })
        .then(res => res.json())
        .then((safetyData) => {
          // Update the supervisor review with safety info
          const typedSafetyData = safetyData as { safety?: { input: SafetyInfo; output: SafetyInfo | null } };
          const updatedReview: SupervisorResponse = { 
            ...data, 
            safety: typedSafetyData.safety ? {
              input: typedSafetyData.safety.input,
              output: typedSafetyData.safety.output || typedSafetyData.safety.input
            } : undefined
          };
          
          setCurrentResult(prev => {
            if (!prev) return prev;
            const updatedResult: CalculationResult = {
              ...prev,
              supervisorReviews: [
                ...(prev.supervisorReviews || []).slice(0, -1),
                updatedReview
              ]
            };
            
            // Update history with safety info
            setHistory(prevHistory => {
              const index = prevHistory.findIndex(item => 
                item.expression === prev.expression && 
                item.metadata?.timestamp === prev.metadata?.timestamp
              );
              
              if (index !== -1) {
                const newHistory = [...prevHistory];
                newHistory[index] = updatedResult;
                return newHistory;
              }
              return prevHistory;
            });
            
            return updatedResult;
          });
        })
        .catch(err => console.error('Safety check failed:', err));

      // Update current result with supervisor review
      const updatedResult: CalculationResult = {
        ...currentResult,
        supervisorReviews: [...(currentResult.supervisorReviews || []), data]
      };

      setCurrentResult(updatedResult);
      
      // Update history
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

      // Update supervisor level
      setSupervisorLevel(data.supervisorLevel);
      
      // Reset concern input and close supervisor mode
      setSupervisorConcern('');
      setSupervisorMode(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during supervisor review');
    } finally {
      setLoadingSupervisor(false);
    }
  };

  const loadFromHistory = (item: CalculationResult) => {
    setExpression(item.expression);
    setCurrentResult(item);
    setShowHistory(false);
    setDisputeMode(false);
    setDisputeFeedback('');
    setSupervisorMode(false);
    setDisputeCount(item.disputes?.length || 0);
    setSupervisorLevel(item.supervisorReviews?.length || 0);
    setSupervisorConcern('');
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
                <div className="w-full">
                  <div className="font-bold">Processing Request...</div>
                  <div className="text-xs space-y-1 mt-2">
                    <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 0 ? 'opacity-100' : 'opacity-30'}`}>
                      {loadingStep > 0 ? '✓' : '○'} Parsing expression syntax
                    </div>
                    <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                      {loadingStep > 1 ? '✓' : '○'} Analyzing mathematical structure
                    </div>
                    <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                      {loadingStep > 2 ? '✓' : '○'} Executing AI computation engine
                    </div>
                    <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                      {loadingStep > 3 ? '✓' : '○'} Validating results
                    </div>
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
                {/* Result First (Most Important) */}
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="w-full">
                    <div className="font-bold">Final Result</div>
                    <div className="text-3xl font-mono font-bold">{currentResult.result}</div>
                  </div>
                </div>

                {/* Computational Analysis (following standard card pattern) */}
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
                    {/* Safety Classification for Initial Calculation */}
                    {currentResult.safety && (
                      <div className="mt-3 p-2 bg-base-100 rounded-lg">
                        <div className="text-xs font-semibold mb-2 opacity-75">
                          Safety Classification
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="opacity-75">User Input:</span>{' '}
                            {currentResult.safety.input.isSafe ? (
                              <span className="badge badge-success badge-xs">Safe</span>
                            ) : (
                              <>
                                <span className="badge badge-error badge-xs">Unsafe</span>
                                {currentResult.safety.input.violatedCategories && currentResult.safety.input.violatedCategories.length > 0 && (
                                  <div className="mt-1">
                                    <div className="text-xs opacity-75 mb-1">
                                      {currentResult.safety.input.classification}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {currentResult.safety.input.violatedCategories.map((cat: string, idx: number) => (
                                        <div key={idx} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                                          <span className="badge badge-error badge-xs">{cat}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div>
                            <span className="opacity-75">AI Response:</span>{' '}
                            {currentResult.safety.output.isSafe ? (
                              <span className="badge badge-success badge-xs">Safe</span>
                            ) : (
                              <>
                                <span className="badge badge-error badge-xs">Unsafe</span>
                                {currentResult.safety.output.violatedCategories && currentResult.safety.output.violatedCategories.length > 0 && (
                                  <div className="mt-1">
                                    <div className="text-xs opacity-75 mb-1">
                                      {currentResult.safety.output.classification}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {currentResult.safety.output.violatedCategories.map((cat: string, idx: number) => (
                                        <div key={idx} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                                          <span className="badge badge-error badge-xs">{cat}</span>
                                        </div>
                                      ))}
                                    </div>
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

                {/* Usage Metadata */}
                {currentResult.metadata && (() => {
                  // Calculate total usage across all responses
                  let totalPromptTokens = currentResult.metadata.usage.promptTokens;
                  let totalCompletionTokens = currentResult.metadata.usage.completionTokens;
                  let totalTokens = currentResult.metadata.usage.totalTokens;

                  // Add dispute tokens
                  if (currentResult.disputes) {
                    currentResult.disputes.forEach(dispute => {
                      if (dispute.metadata) {
                        totalPromptTokens += dispute.metadata.usage.promptTokens;
                        totalCompletionTokens += dispute.metadata.usage.completionTokens;
                        totalTokens += dispute.metadata.usage.totalTokens;
                      }
                    });
                  }

                  // Add supervisor tokens
                  if (currentResult.supervisorReviews) {
                    currentResult.supervisorReviews.forEach(review => {
                      if (review.metadata) {
                        totalPromptTokens += review.metadata.usage.promptTokens;
                        totalCompletionTokens += review.metadata.usage.completionTokens;
                        totalTokens += review.metadata.usage.totalTokens;
                      }
                    });
                  }

                  return (
                    <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                      <div className="stat">
                        <div className="stat-title">Processing Time</div>
                        <div className="stat-value text-2xl">{currentResult.metadata.processingTime}</div>
                        <div className="stat-desc">Initial response</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title">Total Tokens Used</div>
                        <div className="stat-value text-2xl">{totalTokens.toLocaleString()}</div>
                        <div className="stat-desc">
                          ↗︎ {totalPromptTokens.toLocaleString()} prompt, 
                          ↘︎ {totalCompletionTokens.toLocaleString()} completion
                        </div>
                      </div>
                      <div className="stat">
                        <div className="stat-title">Interactions</div>
                        <div className="stat-value text-2xl">
                          {1 + (currentResult.disputes?.length || 0) + (currentResult.supervisorReviews?.length || 0)}
                        </div>
                        <div className="stat-desc">
                          {currentResult.disputes?.length || 0} disputes, {currentResult.supervisorReviews?.length || 0} reviews
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Display Disputes if any */}
                {currentResult.disputes && currentResult.disputes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm opacity-75">Dispute History ({currentResult.disputes.length})</h3>
                    {currentResult.disputes.map((dispute, index) => (
                      <div key={index} className="card bg-base-300 card-border">
                        <div className="card-body p-4">
                          <div className="flex items-start gap-2">
                            <span className="badge badge-warning badge-sm whitespace-nowrap">Dispute Agent #{index + 1}</span>
                          </div>
                          
                          {dispute.agentName && (
                            <div className="text-sm font-semibold mt-2">
                              {dispute.agentName}
                            </div>
                          )}
                          
                          <div className="flex-1 text-xs opacity-75 mt-1">
                            Feedback: "{dispute.disputeFeedback}"
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
                          {/* Safety Classification for Dispute */}
                          {dispute.safety && (
                            <div className="mt-3 p-2 bg-base-100 rounded-lg">
                              <div className="text-xs font-semibold mb-2 opacity-75">
                                Safety Classification
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="opacity-75">Dispute Input:</span>{' '}
                                  {dispute.safety.input.isSafe ? (
                                    <span className="badge badge-success badge-xs">Safe</span>
                                  ) : (
                                    <>
                                      <span className="badge badge-error badge-xs">Unsafe</span>
                                      {dispute.safety.input.violatedCategories && dispute.safety.input.violatedCategories.length > 0 && (
                                        <div className="mt-1">
                                          <div className="text-xs opacity-75 mb-1">
                                            {dispute.safety.input.classification}
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {dispute.safety.input.violatedCategories.map((cat: string, idx: number) => (
                                              <div key={idx} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                                                <span className="badge badge-error badge-xs">{cat}</span>
                                              </div>
                                            ))}
                                          </div>
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
                                      {dispute.safety.output.violatedCategories && dispute.safety.output.violatedCategories.length > 0 && (
                                        <div className="mt-1">
                                          <div className="text-xs opacity-75 mb-1">
                                            {dispute.safety.output.classification}
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {dispute.safety.output.violatedCategories.map((cat: string, idx: number) => (
                                              <div key={idx} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                                                <span className="badge badge-error badge-xs">{cat}</span>
                                              </div>
                                            ))}
                                          </div>
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
                    disabled={loading || supervisorLevel >= 1}
                  >
                    Dispute This Answer
                    {disputeCount === 2 && <span className="badge badge-error badge-xs ml-2">Last chance!</span>}
                  </button>
                )}

                {/* Supervisor Reviews */}
                {currentResult.supervisorReviews && currentResult.supervisorReviews.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm opacity-75">Supervisor Reviews</h3>
                    {currentResult.supervisorReviews.map((review, index) => (
                      <div key={index} className={`card ${review.isFinal ? 'bg-error/10' : 'bg-info/10'} card-border`}>
                        <div className="card-body p-4">
                          <div className="flex items-start gap-2">
                            <span className={`badge ${review.isFinal ? 'badge-error' : 'badge-info'} badge-sm whitespace-nowrap`}>
                              {review.supervisorTitle}
                            </span>
                            {review.isFinal && (
                              <span className="badge badge-error badge-outline badge-xs">FINAL</span>
                            )}
                          </div>
                          
                          {review.agentName && (
                            <div className="text-sm font-semibold mt-2">
                              {review.agentName}
                            </div>
                          )}
                          
                          {review.userConcern && (
                            <div className="flex-1 text-xs opacity-75 mt-1">
                              Concern: "{review.userConcern}"
                            </div>
                          )}

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

                          {/* Safety Classification for Supervisor Review */}
                          {review.safety && review.safety.input && review.safety.output && (
                            <div className="mt-3 p-2 bg-base-100 rounded-lg">
                              <div className="text-xs font-semibold mb-2 opacity-75">
                                Safety Classification
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="opacity-75">User Concern:</span>{' '}
                                  {review.safety.input.isSafe ? (
                                    <span className="badge badge-success badge-xs">Safe</span>
                                  ) : (
                                    <>
                                      <span className="badge badge-error badge-xs">Unsafe</span>
                                      {review.safety.input.violatedCategories && review.safety.input.violatedCategories.length > 0 && (
                                        <div className="mt-1">
                                          <div className="text-xs opacity-75 mb-1">
                                            {review.safety.input.classification}
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {review.safety.input.violatedCategories.map((cat: string, idx: number) => (
                                              <div key={idx} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                                                <span className="badge badge-error badge-xs">{cat}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div>
                                  <span className="opacity-75">Supervisor Response:</span>{' '}
                                  {review.safety.output.isSafe ? (
                                    <span className="badge badge-success badge-xs">Safe</span>
                                  ) : (
                                    <>
                                      <span className="badge badge-error badge-xs">Unsafe</span>
                                      {review.safety.output.violatedCategories && review.safety.output.violatedCategories.length > 0 && (
                                        <div className="mt-1">
                                          <div className="text-xs opacity-75 mb-1">
                                            {review.safety.output.classification}
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {review.safety.output.violatedCategories.map((cat: string, idx: number) => (
                                              <div key={idx} className="tooltip" data-tip={CATEGORY_DESCRIPTIONS[cat] || cat}>
                                                <span className="badge badge-error badge-xs">{cat}</span>
                                              </div>
                                            ))}
                                          </div>
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

                {/* Supervisor Request Area */}
                {supervisorLevel === 0 && (currentResult.disputes && currentResult.disputes.length > 0) && (
                  supervisorMode ? (
                    <div className="card bg-info/10 card-border">
                      <div className="card-body p-4">
                        <h3 className="card-title text-sm">Request Supervisor Review</h3>
                        <p className="text-xs opacity-75">
                          A Senior Computation Specialist will review the calculation and all disputes.
                        </p>
                        <textarea
                          className="textarea textarea-info w-full"
                          placeholder="Describe your concern or why you need supervisor review..."
                          value={supervisorConcern}
                          onChange={(e) => setSupervisorConcern(e.target.value)}
                          rows={3}
                          disabled={loadingSupervisor}
                        />
                        <div className="card-actions justify-end">
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              setSupervisorMode(false);
                              setSupervisorConcern('');
                            }}
                            disabled={loadingSupervisor}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn btn-sm btn-info"
                            onClick={handleSupervisorReview}
                            disabled={loadingSupervisor || !supervisorConcern.trim()}
                          >
                            {loadingSupervisor ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Escalating...
                              </>
                            ) : (
                              <>Call Senior Computation Specialist</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline btn-info btn-sm w-full"
                      onClick={() => setSupervisorMode(true)}
                      disabled={loadingSupervisor}
                    >
                      Call Senior Computation Specialist
                    </button>
                  )
                )}

                {supervisorLevel === 1 && (
                  supervisorMode ? (
                    <div className="card bg-info/10 card-border">
                      <div className="card-body p-4">
                        <h3 className="card-title text-sm">Escalate to Higher Authority</h3>
                        <p className="text-xs opacity-75">
                          The Principal Mathematical Arbitrator will provide advanced analysis.
                        </p>
                        <textarea
                          className="textarea textarea-info w-full"
                          placeholder="Explain why you need further escalation..."
                          value={supervisorConcern}
                          onChange={(e) => setSupervisorConcern(e.target.value)}
                          rows={3}
                          disabled={loadingSupervisor}
                        />
                        <div className="card-actions justify-end">
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              setSupervisorMode(false);
                              setSupervisorConcern('');
                            }}
                            disabled={loadingSupervisor}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn btn-sm btn-info"
                            onClick={handleSupervisorReview}
                            disabled={loadingSupervisor || !supervisorConcern.trim()}
                          >
                            {loadingSupervisor ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Escalating...
                              </>
                            ) : (
                              <>Call Principal Mathematical Arbitrator</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline btn-info btn-sm w-full"
                      onClick={() => setSupervisorMode(true)}
                      disabled={loadingSupervisor}
                    >
                      Call Principal Mathematical Arbitrator
                    </button>
                  )
                )}

                {supervisorLevel === 2 && (
                  supervisorMode ? (
                    <div className="card bg-error/10 card-border">
                      <div className="card-body p-4">
                        <h3 className="card-title text-sm">Final Escalation</h3>
                        <p className="text-xs opacity-75">
                          The Chief Executive of Mathematical Operations will make the final, binding decision.
                        </p>
                        <textarea
                          className="textarea textarea-error w-full"
                          placeholder="State your final concern for executive review..."
                          value={supervisorConcern}
                          onChange={(e) => setSupervisorConcern(e.target.value)}
                          rows={3}
                          disabled={loadingSupervisor}
                        />
                        <div className="card-actions justify-end">
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              setSupervisorMode(false);
                              setSupervisorConcern('');
                            }}
                            disabled={loadingSupervisor}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn btn-sm btn-error"
                            onClick={handleSupervisorReview}
                            disabled={loadingSupervisor || !supervisorConcern.trim()}
                          >
                            {loadingSupervisor ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Escalating...
                              </>
                            ) : (
                              <>Call Chief Executive of Mathematical Operations</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline btn-error btn-sm w-full"
                      onClick={() => setSupervisorMode(true)}
                      disabled={loadingSupervisor}
                    >
                      Call Chief Executive of Mathematical Operations
                    </button>
                  )
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
                              
                              {/* Supervisor Reviews in History */}
                              {item.supervisorReviews && item.supervisorReviews.length > 0 && (
                                <>
                                  <div className="divider my-2"></div>
                                  <div className="text-xs font-bold opacity-75 mb-2">Supervisor Reviews:</div>
                                  {item.supervisorReviews.map((review, sIndex) => (
                                    <div key={sIndex} className={`${review.isFinal ? 'bg-error/10' : 'bg-info/10'} p-2 rounded space-y-1`}>
                                      <div className="flex items-start gap-2 justify-between">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-bold">{review.supervisorTitle}</span>
                                        </div>
                                        {review.isFinal && (
                                          <span className="badge badge-error badge-outline badge-xs">FINAL</span>
                                        )}
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
                                      {review.metadata && (
                                        <div className="text-xs opacity-50">
                                          {review.metadata.usage.totalTokens} tokens
                                        </div>
                                      )}
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
