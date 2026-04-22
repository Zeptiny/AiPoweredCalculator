'use client';

import { useState } from 'react';
import { CalculatorInputPanel } from '@/app/components/CalculatorInputPanel';
import { DisputeSection } from '@/app/components/DisputeSection';
import { HistorySidebar } from '@/app/components/HistorySidebar';
import { LoadingProgress } from '@/app/components/LoadingProgress';
import { ResultPanel } from '@/app/components/ResultPanel';
import { SupervisorSection } from '@/app/components/SupervisorSection';
import { CALCULATION_LOADING_LABELS } from '@/lib/prompts';
import type { CalculationResult, ChatMessage, DisputeResponse, SafetyInfo, SupervisorResponse } from '@/lib/types';

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
  const [supervisorConcern, setSupervisorConcern] = useState('');
  const [supervisorMode, setSupervisorMode] = useState(false);

  const startLoadingSequence = () => {
    const steps = [
      { step: 1, delay: 400 },
      { step: 2, delay: 800 },
      { step: 3, delay: 1200 },
      { step: 4, delay: 1600 },
    ];

    setLoadingStep(0);
    steps.forEach(({ step, delay }) => {
      setTimeout(() => setLoadingStep(step), delay);
    });
  };

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
      setExpression((prev) => prev + value);
    }
  };

  const handleCalculate = async () => {
    if (!expression.trim()) return;

    setLoading(true);
    setError('');
    setCurrentResult(null);
    setDisputeMode(false);
    setDisputeCount(0);
    setSupervisorLevel(0);
    setSupervisorConcern('');
    startLoadingSequence();

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
      });

      const data = (await response.json()) as {
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
        metadata: data.metadata,
      };

      setCurrentResult(calculationResult);
      setHistory((prev) => [calculationResult, ...prev].slice(0, 10));

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
        .then((res) => res.json())
        .then((safetyData) => {
          const typedSafetyData = safetyData as { safety?: { input: SafetyInfo; output: SafetyInfo | null } };
          if (typedSafetyData.safety) {
            setCurrentResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                safety: {
                  input: typedSafetyData.safety.input,
                  output: typedSafetyData.safety.output || { isSafe: true, classification: 'N/A' },
                },
              };
            });
          }
          setLoadingSafety(false);
        })
        .catch((safetyError) => {
          console.error('Safety check failed:', safetyError);
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
    startLoadingSequence();

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: currentResult.expression,
          conversationHistory: currentResult.conversationHistory,
          disputeFeedback,
        }),
      });

      const data = (await response.json()) as {
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
        disputeFeedback,
      };

      const updatedResult: CalculationResult = {
        ...currentResult,
        conversationHistory: data.conversationHistory,
        disputes: [...(currentResult.disputes || []), disputeResponse],
      };

      setCurrentResult(updatedResult);

      setHistory((prev) => {
        const index = prev.findIndex(
          (item) => item.expression === currentResult.expression && item.metadata?.timestamp === currentResult.metadata?.timestamp,
        );

        if (index !== -1) {
          const newHistory = [...prev];
          newHistory[index] = updatedResult;
          return newHistory;
        }
        return prev;
      });

      const newDisputeCount = disputeCount + 1;
      setDisputeCount(newDisputeCount);

      setDisputeMode(false);
      setDisputeFeedback('');

      if (newDisputeCount === 3 && supervisorLevel === 0) {
        setError('⚠️ After 3 disputes, this matter requires supervisor review. Automatically escalating to Senior Computation Specialist...');
        setTimeout(() => {
          setSupervisorConcern('After multiple disputes, I need a definitive answer from a supervisor.');
          setSupervisorMode(true);
          setError('');
        }, 2000);
      }

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
        .then((res) => res.json())
        .then((safetyData) => {
          const typedSafetyData = safetyData as { safety?: { input: SafetyInfo; output: SafetyInfo | null } };
          if (typedSafetyData.safety) {
            setCurrentResult((prev) => {
              if (!prev || !prev.disputes) return prev;
              const updatedDisputes = [...prev.disputes];
              const lastDisputeIndex = updatedDisputes.length - 1;
              if (lastDisputeIndex >= 0) {
                updatedDisputes[lastDisputeIndex] = {
                  ...updatedDisputes[lastDisputeIndex],
                  safety: {
                    input: typedSafetyData.safety.input,
                    output: typedSafetyData.safety.output || { isSafe: true, classification: 'N/A' },
                  },
                };
              }
              const withSafety: CalculationResult = {
                ...prev,
                disputes: updatedDisputes,
              };

              setHistory((prevHistory) => {
                const index = prevHistory.findIndex(
                  (item) => item.expression === prev.expression && item.metadata?.timestamp === prev.metadata?.timestamp,
                );

                if (index !== -1) {
                  const newHistory = [...prevHistory];
                  newHistory[index] = withSafety;
                  return newHistory;
                }
                return prevHistory;
              });

              return withSafety;
            });
          }
          setLoadingSafety(false);
        })
        .catch((safetyError) => {
          console.error('Safety check failed:', safetyError);
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
    startLoadingSequence();

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
          currentLevel: supervisorLevel,
        }),
      });

      const data = (await response.json()) as SupervisorResponse;

      if (!response.ok) {
        throw new Error('Failed to get supervisor review');
      }

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
        .then((res) => res.json())
        .then((safetyData) => {
          const typedSafetyData = safetyData as { safety?: { input: SafetyInfo; output: SafetyInfo | null } };
          const updatedReview: SupervisorResponse = {
            ...data,
            safety: typedSafetyData.safety
              ? {
                  input: typedSafetyData.safety.input,
                  output: typedSafetyData.safety.output || typedSafetyData.safety.input,
                }
              : undefined,
          };

          setCurrentResult((prev) => {
            if (!prev) return prev;
            const updatedResult: CalculationResult = {
              ...prev,
              supervisorReviews: [...(prev.supervisorReviews || []).slice(0, -1), updatedReview],
            };

            setHistory((prevHistory) => {
              const index = prevHistory.findIndex(
                (item) => item.expression === prev.expression && item.metadata?.timestamp === prev.metadata?.timestamp,
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
        .catch((safetyError) => console.error('Safety check failed:', safetyError));

      const updatedResult: CalculationResult = {
        ...currentResult,
        supervisorReviews: [...(currentResult.supervisorReviews || []), data],
      };

      setCurrentResult(updatedResult);

      setHistory((prev) => {
        const index = prev.findIndex(
          (item) => item.expression === currentResult.expression && item.metadata?.timestamp === currentResult.metadata?.timestamp,
        );

        if (index !== -1) {
          const newHistory = [...prev];
          newHistory[index] = updatedResult;
          return newHistory;
        }
        return prev;
      });

      setSupervisorLevel(data.supervisorLevel);
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
        <div className="card flex-1 bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h1 className="card-title text-3xl font-bold">AI Computation Engine</h1>
              <button className="btn btn-sm btn-outline" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>

            <CalculatorInputPanel
              expression={expression}
              loading={loading}
              onExpressionChange={setExpression}
              onAppendExpression={(value) => setExpression((prev) => prev + value)}
              onButtonClick={handleButtonClick}
              onCalculate={handleCalculate}
            />

            {loading && (
              <LoadingProgress
                title="Processing Request..."
                labels={CALCULATION_LOADING_LABELS}
                loadingStep={loadingStep}
              />
            )}

            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {currentResult && (
              <div className="space-y-4">
                <ResultPanel currentResult={currentResult} loadingSafety={loadingSafety} />

                <DisputeSection
                  disputes={currentResult.disputes || []}
                  disputeMode={disputeMode}
                  disputeFeedback={disputeFeedback}
                  disputeCount={disputeCount}
                  loading={loading}
                  loadingStep={loadingStep}
                  supervisorLevel={supervisorLevel}
                  onDisputeFeedbackChange={setDisputeFeedback}
                  onOpenDispute={() => setDisputeMode(true)}
                  onCancelDispute={() => {
                    setDisputeMode(false);
                    setDisputeFeedback('');
                  }}
                  onSubmitDispute={handleDispute}
                />

                <SupervisorSection
                  supervisorReviews={currentResult.supervisorReviews || []}
                  supervisorLevel={supervisorLevel}
                  supervisorMode={supervisorMode}
                  supervisorConcern={supervisorConcern}
                  hasDisputes={(currentResult.disputes || []).length > 0}
                  loadingSupervisor={loadingSupervisor}
                  loadingStep={loadingStep}
                  onSupervisorConcernChange={setSupervisorConcern}
                  onOpenSupervisorMode={() => setSupervisorMode(true)}
                  onCancelSupervisorMode={() => {
                    setSupervisorMode(false);
                    setSupervisorConcern('');
                  }}
                  onSubmitSupervisorReview={handleSupervisorReview}
                />
              </div>
            )}
          </div>
        </div>

        {showHistory && (
          <HistorySidebar
            history={history}
            expandedHistoryIndex={expandedHistoryIndex}
            onLoadFromHistory={loadFromHistory}
            onToggleHistoryExpand={toggleHistoryExpand}
            onClearHistory={() => setHistory([])}
          />
        )}
      </div>
    </div>
  );
}
