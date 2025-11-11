'use client';

import { useState } from 'react';

export default function Home() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setResult('');
      setExplanation('');
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
    setResult('');
    setExplanation('');

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate');
      }

      setResult(data.result);
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-base-200">
      <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-3xl font-bold text-center justify-center mb-6">
            AI-Powered Calculator
          </h1>

          {/* Input Display */}
          <div className="form-control w-full mb-4">
            <input
              type="text"
              value={expression}
              onChange={handleInputChange}
              placeholder="Enter mathematical expression..."
              className="input input-lg input-primary w-full text-2xl font-mono text-right"
              disabled={loading}
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

          {/* Loading State */}
          {loading && (
            <div className="alert alert-info">
              <span className="loading loading-spinner loading-md"></span>
              <span>AI is calculating...</span>
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
          {result && (
            <div className="space-y-4">
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-bold">Result</div>
                  <div className="text-2xl font-mono">{result}</div>
                </div>
              </div>

              {explanation && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="card-title text-lg">Explanation</h3>
                    <p className="whitespace-pre-wrap">{explanation}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
