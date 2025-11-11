'use client';

import { useState } from 'react';

interface CalculationResult {
  expression: string;
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
}

export default function Home() {
  const [expression, setExpression] = useState('');
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

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
        metadata: data.metadata
      };

      setCurrentResult(calculationResult);
      setHistory(prev => [calculationResult, ...prev].slice(0, 10)); // Keep last 10 calculations
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: CalculationResult) => {
    setExpression(item.expression);
    setCurrentResult(item);
    setShowHistory(false);
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
                📜 Calculation History
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
                      className="card card-border bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="card-body p-4">
                        <div className="font-mono text-sm font-bold">{item.expression}</div>
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
