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

interface CouncilAgent {
  id: string;
  name: string;
  archetype: string;
  personality: string;
  temperature: number;
}

interface AgentStatement {
  agentId: string;
  agentName: string;
  statement: string;
  timestamp: number;
}

interface DeliberationRound {
  roundNumber: number;
  statements: AgentStatement[];
}

interface AgentVote {
  agentId: string;
  agentName: string;
  vote: string;
  reasoning: string;
}

interface FinalVerdict {
  chairperson: string;
  announcement: string;
  officialAnswer: string;
  confidence: number;
  closingStatement: string;
}

interface CouncilResponse {
  sessionId: string;
  agents: CouncilAgent[];
  deliberation: DeliberationRound[];
  votes: AgentVote[];
  finalVerdict: FinalVerdict;
  metadata: {
    totalDuration: string;
    totalTokens: number;
    totalCost: number;
    agentsUsed: number;
    roundsCompleted: number;
  };
  deliberationComplete?: boolean;
  votingReady?: boolean;
  votingComplete?: boolean;
  verdictReady?: boolean;
}

interface CalculationResult {
  expression: string;
  explanation: string;
  result: string;
  confidence?: number;
  conversationHistory?: ChatMessage[];
  disputes?: DisputeResponse[];
  supervisorReviews?: SupervisorResponse[];
  councilDeliberation?: CouncilResponse;
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

// Helper function to generate profile picture with initials and unique color
const getAgentProfile = (name: string, index: number, totalAgents: number) => {
  // Extract initials (first letter of first two words)
  const words = name.split(' ');
  const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  
  // All available colors
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
  ];
  
  // Ensure unique colors by using index modulo colors length
  // This guarantees no duplicate colors as long as we have <= 12 agents
  const colorIndex = index % colors.length;
  
  return { initials, color: colors[colorIndex] };
};

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
  
  // Council state
  const [showCouncilConfirmation, setShowCouncilConfirmation] = useState(0); // 0 = none, 1-3 = modal steps
  const [councilConfirmChecked, setCouncilConfirmChecked] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [councilPhase, setCouncilPhase] = useState<'introduction' | 'deliberation' | 'voting' | 'verdict'>('introduction');
  const [councilData, setCouncilData] = useState<Partial<CouncilResponse>>({});
  const [streamingStatement, setStreamingStatement] = useState('');
  const [councilInProgress, setCouncilInProgress] = useState(false);

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

    // Sequential loading steps - appear one at a time
    const steps = [
      { step: 1, delay: 400 },
      { step: 2, delay: 800 },
      { step: 3, delay: 1200 },
      { step: 4, delay: 1600 },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    steps.forEach(({ step, delay }) => {
      const timeout = setTimeout(() => setLoadingStep(step), delay);
      timeouts.push(timeout);
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
    setLoadingStep(0);
    setError('');

    // Sequential loading steps for disputes
    const steps = [
      { step: 1, delay: 400 },
      { step: 2, delay: 800 },
      { step: 3, delay: 1200 },
      { step: 4, delay: 1600 },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    steps.forEach(({ step, delay }) => {
      const timeout = setTimeout(() => setLoadingStep(step), delay);
      timeouts.push(timeout);
    });

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
              const updatedResult = {
                ...prev,
                disputes: updatedDisputes
              };
              
              // Also update history with the safety info
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
    setLoadingStep(0);
    setError('');

    // Sequential loading steps for supervisor review
    const steps = [
      { step: 1, delay: 400 },
      { step: 2, delay: 800 },
      { step: 3, delay: 1200 },
      { step: 4, delay: 1600 },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    steps.forEach(({ step, delay }) => {
      const timeout = setTimeout(() => setLoadingStep(step), delay);
      timeouts.push(timeout);
    });

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

      // Run safety check for supervisor review (async, updates state when complete)
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
          
          setCurrentResult(prev => {
            if (!prev) return prev;
            
            const reviewsWithoutLast = (prev.supervisorReviews || []).slice(0, -1);
            const lastReview = prev.supervisorReviews?.[prev.supervisorReviews.length - 1];
            
            if (!lastReview) return prev;
            
            const updatedReview: SupervisorResponse = { 
              ...lastReview, 
              safety: typedSafetyData.safety ? {
                input: typedSafetyData.safety.input,
                output: typedSafetyData.safety.output || typedSafetyData.safety.input
              } : undefined
            };
            
            const updatedResult: CalculationResult = {
              ...prev,
              supervisorReviews: [...reviewsWithoutLast, updatedReview]
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

      // Update current result with supervisor review (without safety initially)
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

  const handleCouncilStart = async () => {
    if (!currentResult || councilInProgress) return;

    setShowCouncil(true);
    setCouncilPhase('introduction');
    setCouncilData({});
    setStreamingStatement('');
    setShowCouncilConfirmation(0);
    setCouncilConfirmChecked(false);
    setCouncilInProgress(true);

    try {
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: currentResult.expression,
          initialResult: currentResult.result,
          disputes: currentResult.disputes || [],
          supervisorReviews: currentResult.supervisorReviews || []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start council session');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'agents_selected':
                  setCouncilData(prev => ({
                    ...prev,
                    agents: data.agents,
                    sessionId: data.sessionId
                  }));
                  break;

                case 'round_start':
                  // Round started
                  break;

                case 'statement_start':
                  setStreamingStatement('');
                  break;

                case 'statement_complete':
                  setCouncilData(prev => {
                    const existingRounds = prev.deliberation || [];
                    const currentRound = existingRounds[existingRounds.length - 1];
                    
                    if (currentRound) {
                      currentRound.statements.push(data.statement);
                      return {
                        ...prev,
                        deliberation: existingRounds
                      };
                    } else {
                      return {
                        ...prev,
                        deliberation: [{
                          roundNumber: 1,
                          statements: [data.statement]
                        }]
                      };
                    }
                  });
                  setStreamingStatement('');
                  break;

                case 'round_complete':
                  // Round complete
                  break;

                case 'deliberation_complete':
                  // Set flag that deliberation is done
                  setCouncilData(prev => ({ ...prev, deliberationComplete: true }));
                  break;

                case 'voting_started':
                  // Don't auto-switch to voting phase - wait for user to click continue
                  setCouncilData(prev => ({
                    ...prev,
                    votes: [],
                    votingReady: true
                  }));
                  break;

                case 'vote':
                  setCouncilData(prev => ({
                    ...prev,
                    votes: [...(prev.votes || []), data.vote]
                  }));
                  break;

                case 'voting_complete':
                  // Set flag that voting is done
                  setCouncilData(prev => ({ ...prev, votingComplete: true }));
                  break;

                case 'verdict':
                  // Don't auto-switch to verdict phase - store it but don't show yet
                  setCouncilData(prev => ({
                    ...prev,
                    finalVerdict: data.verdict,
                    verdictReady: true
                  }));
                  break;

                case 'complete':
                  setCouncilData(data);
                  
                  // Update current result with council data
                  setCurrentResult(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      councilDeliberation: data
                    };
                  });

                  // Update history
                  setHistory(prev => {
                    const index = prev.findIndex(item =>
                      item.expression === currentResult.expression &&
                      item.metadata?.timestamp === currentResult.metadata?.timestamp
                    );

                    if (index !== -1) {
                      const newHistory = [...prev];
                      newHistory[index] = {
                        ...newHistory[index],
                        councilDeliberation: data
                      };
                      return newHistory;
                    }
                    return prev;
                  });
                  break;

                case 'error':
                  setError(data.message || 'Council session failed');
                  setShowCouncil(false);
                  setCouncilInProgress(false);
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start council session');
      setShowCouncil(false);
      setCouncilInProgress(false);
    }
  };

  const handleCouncilContinue = () => {
    // Progress to next phase based on current phase
    if (councilPhase === 'introduction') {
      setCouncilPhase('deliberation');
    } else if (councilPhase === 'deliberation') {
      setCouncilPhase('voting');
    } else if (councilPhase === 'voting') {
      setCouncilPhase('verdict');
    }
  };

  const closeCouncil = () => {
    setShowCouncil(false);
    setCouncilInProgress(false);
    // Reset to introduction phase for next time
    setCouncilPhase('introduction');
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
                placeholder="Type or use buttons to build expression..."
                className="input input-lg input-primary w-full text-2xl font-mono text-right"
                disabled={loading}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only mathematical characters: numbers, operators, parentheses, functions, constants, and spaces
                  const mathPattern = /^[0-9+\-*/().^,\sa-z]*$/i;
                  if (mathPattern.test(value)) {
                    setExpression(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCalculate();
                  }
                }}
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
                  className="btn btn-sm btn-secondary font-semibold hover:btn-accent transition-colors"
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
                  className="btn btn-sm btn-secondary flex-1 font-bold text-lg hover:btn-accent transition-colors"
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
                    {loadingStep >= 1 && (
                      <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 1 ? 'opacity-100' : 'opacity-70'}`}>
                        {loadingStep > 1 ? '✓' : '○'} Parsing expression syntax
                      </div>
                    )}
                    {loadingStep >= 2 && (
                      <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 2 ? 'opacity-100' : 'opacity-70'}`}>
                        {loadingStep > 2 ? '✓' : '○'} Analyzing mathematical structure
                      </div>
                    )}
                    {loadingStep >= 3 && (
                      <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 3 ? 'opacity-100' : 'opacity-70'}`}>
                        {loadingStep > 3 ? '✓' : '○'} Executing AI computation engine
                      </div>
                    )}
                    {loadingStep >= 4 && (
                      <div className={`flex items-center gap-2 transition-all duration-300`}>
                        {loadingStep > 4 ? '✓' : '○'} Validating results
                      </div>
                    )}
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
                    {loadingSafety && !currentResult.safety ? (
                      <div className="mt-3 p-2 bg-base-100 rounded-lg animate-pulse">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="skeleton h-3 w-32"></div>
                          <span className="loading loading-spinner loading-xs"></span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-2">
                            <div className="skeleton h-4 w-24"></div>
                            <div className="skeleton h-3 w-full"></div>
                            <div className="skeleton h-3 w-3/4"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="skeleton h-4 w-24"></div>
                            <div className="skeleton h-3 w-full"></div>
                            <div className="skeleton h-3 w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    ) : currentResult.safety ? (
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
                    ) : null}
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
                      
                      {/* Loading state inside dispute card */}
                      {loading && (
                        <div className="mt-3 p-3 bg-base-100 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="loading loading-spinner loading-sm"></span>
                            <span className="text-xs font-semibold">Processing Dispute...</span>
                          </div>
                          <div className="text-xs space-y-1">
                            {loadingStep >= 1 && (
                              <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 1 ? 'opacity-100' : 'opacity-70'}`}>
                                {loadingStep > 1 ? '✓' : '○'} Parsing expression syntax
                              </div>
                            )}
                            {loadingStep >= 2 && (
                              <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 2 ? 'opacity-100' : 'opacity-70'}`}>
                                {loadingStep > 2 ? '✓' : '○'} Analyzing mathematical structure
                              </div>
                            )}
                            {loadingStep >= 3 && (
                              <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 3 ? 'opacity-100' : 'opacity-70'}`}>
                                {loadingStep > 3 ? '✓' : '○'} Executing AI computation engine
                              </div>
                            )}
                            {loadingStep >= 4 && (
                              <div className={`flex items-center gap-2 transition-all duration-300`}>
                                {loadingStep > 4 ? '✓' : '○'} Validating results
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn btn-outline btn-warning btn-sm w-full"
                    onClick={() => setDisputeMode(true)}
                    disabled={loading || supervisorLevel >= 1 || disputeCount >= 3}
                  >
                    Dispute This Answer
                    {disputeCount === 2 && <span className="badge badge-error badge-xs ml-2">Last chance!</span>}
                    {disputeCount >= 3 && <span className="badge badge-neutral badge-xs ml-2">Max disputes reached</span>}
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
                        
                        {/* Loading state inside supervisor request card */}
                        {loadingSupervisor && (
                          <div className="mt-3 p-3 bg-base-100 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="loading loading-spinner loading-sm"></span>
                              <span className="text-xs font-semibold">Supervisor Review in Progress...</span>
                            </div>
                            <div className="text-xs space-y-1">
                              {loadingStep >= 1 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 1 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 1 ? '✓' : '○'} Reviewing dispute history
                                </div>
                              )}
                              {loadingStep >= 2 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 2 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 2 ? '✓' : '○'} Analyzing mathematical principles
                                </div>
                              )}
                              {loadingStep >= 3 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 3 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 3 ? '✓' : '○'} Applying supervisor protocols
                                </div>
                              )}
                              {loadingStep >= 4 && (
                                <div className={`flex items-center gap-2 transition-all duration-300`}>
                                  {loadingStep > 4 ? '✓' : '○'} Formulating authoritative judgment
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                        
                        {/* Loading state inside supervisor escalation card */}
                        {loadingSupervisor && (
                          <div className="mt-3 p-3 bg-base-100 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="loading loading-spinner loading-sm"></span>
                              <span className="text-xs font-semibold">Escalating to Principal Arbitrator...</span>
                            </div>
                            <div className="text-xs space-y-1">
                              {loadingStep >= 1 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 1 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 1 ? '✓' : '○'} Reviewing dispute history
                                </div>
                              )}
                              {loadingStep >= 2 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 2 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 2 ? '✓' : '○'} Analyzing mathematical principles
                                </div>
                              )}
                              {loadingStep >= 3 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 3 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 3 ? '✓' : '○'} Applying advanced supervisor protocols
                                </div>
                              )}
                              {loadingStep >= 4 && (
                                <div className={`flex items-center gap-2 transition-all duration-300`}>
                                  {loadingStep > 4 ? '✓' : '○'} Formulating authoritative judgment
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                        
                        {/* Loading state inside final escalation card */}
                        {loadingSupervisor && (
                          <div className="mt-3 p-3 bg-base-100 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="loading loading-spinner loading-sm"></span>
                              <span className="text-xs font-semibold">Escalating to CEMO (Final Decision)...</span>
                            </div>
                            <div className="text-xs space-y-1">
                              {loadingStep >= 1 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 1 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 1 ? '✓' : '○'} Reviewing complete dispute history
                                </div>
                              )}
                              {loadingStep >= 2 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 2 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 2 ? '✓' : '○'} Leveraging executive frameworks
                                </div>
                              )}
                              {loadingStep >= 3 && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${loadingStep > 3 ? 'opacity-100' : 'opacity-70'}`}>
                                  {loadingStep > 3 ? '✓' : '○'} Synergizing mathematical best practices
                                </div>
                              )}
                              {loadingStep >= 4 && (
                                <div className={`flex items-center gap-2 transition-all duration-300`}>
                                  {loadingStep > 4 ? '✓' : '○'} Delivering mission-critical verdict
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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

                {/* Council Button - appears after Level 3 (CEMO) with final decision */}
                {supervisorLevel === 3 && 
                 currentResult.supervisorReviews?.[2]?.isFinal && 
                 !currentResult.councilDeliberation && 
                 !councilInProgress && (
                  <button 
                    className="btn btn-error btn-lg w-full mt-4 animate-pulse"
                    onClick={() => setShowCouncilConfirmation(1)}
                  >
                    SUMMON THE MATHEMATICAL COUNCIL
                    <span className="badge badge-warning ml-2">FINAL OPTION</span>
                  </button>
                )}

                {/* Council Deliberation Result */}
                {currentResult.councilDeliberation && (
                  <div className="card bg-purple-900/20 card-border mt-4">
                    <div className="card-body p-4">
                      <h3 className="font-bold text-sm opacity-75 flex items-center gap-2">
                        Mathematical Council Verdict
                        <span className="badge badge-error badge-xs">FINAL & BINDING</span>
                      </h3>
                      <div className="divider my-2"></div>
                      <div className="space-y-2">
                        <div>
                          <div className="font-bold text-xs opacity-75">Chairperson:</div>
                          <p className="text-sm">{currentResult.councilDeliberation.finalVerdict.chairperson}</p>
                        </div>
                        <div>
                          <div className="font-bold text-xs opacity-75">Announcement:</div>
                          <p className="text-sm italic">{currentResult.councilDeliberation.finalVerdict.announcement}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs opacity-75">Official Answer:</span>
                          <span className="font-mono font-bold text-xl text-error">{currentResult.councilDeliberation.finalVerdict.officialAnswer}</span>
                        </div>
                        <div>
                          <div className="font-bold text-xs opacity-75">Closing Statement:</div>
                          <p className="text-sm font-bold">{currentResult.councilDeliberation.finalVerdict.closingStatement}</p>
                        </div>
                      </div>
                      <div className="text-xs opacity-50 mt-2">
                        {currentResult.councilDeliberation.metadata.agentsUsed} agents • 
                        {currentResult.councilDeliberation.metadata.roundsCompleted} rounds • 
                        {currentResult.councilDeliberation.metadata.totalDuration}
                      </div>
                      <button 
                        className="btn btn-sm btn-outline mt-3"
                        onClick={() => {
                          if (currentResult.councilDeliberation) {
                            setCouncilData(currentResult.councilDeliberation);
                            setCouncilPhase('introduction');
                            setShowCouncil(true);
                          }
                        }}
                      >
                        View Full Deliberation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Triple Confirmation Modals */}
        {showCouncilConfirmation === 1 && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Summon the Mathematical Council?</h3>
              <p className="py-4">
                The Council is a panel of 5-6 expert agents who will deliberate on this calculation.
              </p>
              <p className="text-sm opacity-75">
                <span className="font-bold">Estimated runtime:</span> ~60-90 seconds
              </p>
              <div className="modal-action">
                <button 
                  className="btn btn-ghost"
                  onClick={() => setShowCouncilConfirmation(0)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCouncilConfirmation(2)}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {showCouncilConfirmation === 2 && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Are you absolutely certain?</h3>
              <div className="alert alert-warning my-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="font-bold">Warning</div>
                  <div className="text-xs">This process cannot be stopped once started. The Council's decision will be final and binding.</div>
                </div>
              </div>
              <p className="text-sm opacity-75">
                <span className="font-bold">Cost notice:</span> This operation uses ~25-30 API calls
              </p>
              <div className="modal-action">
                <button 
                  className="btn btn-ghost"
                  onClick={() => setShowCouncilConfirmation(1)}
                >
                  Go Back
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => setShowCouncilConfirmation(3)}
                >
                  I'm Sure
                </button>
              </div>
            </div>
          </div>
        )}

        {showCouncilConfirmation === 3 && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg text-error">Final Confirmation</h3>
              <div className="alert alert-error my-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="font-bold">ABSOLUTE AND IRREVERSIBLE</div>
                  <div className="text-xs">
                    You are about to convene the Mathematical Council. Their verdict will be ABSOLUTE and IRREVERSIBLE.
                  </div>
                </div>
              </div>
              <label className="label cursor-pointer justify-start gap-3">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-error"
                  checked={councilConfirmChecked}
                  onChange={(e) => setCouncilConfirmChecked(e.target.checked)}
                />
                <span className="label-text">I understand this decision is final</span>
              </label>
              <div className="modal-action">
                <button 
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCouncilConfirmation(2);
                    setCouncilConfirmChecked(false);
                  }}
                >
                  Abort
                </button>
                <button 
                  className="btn btn-error"
                  onClick={handleCouncilStart}
                  disabled={!councilConfirmChecked}
                >
                  Summon Council
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Council Full-Screen Modal */}
        {showCouncil && (
          <div className="modal modal-open">
            <div className="modal-box max-w-6xl h-[90vh] p-0">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 text-white">
                <h2 className="text-3xl font-bold">THE MATHEMATICAL COUNCIL</h2>
                {councilData.sessionId && (
                  <p className="text-sm opacity-75 mt-2">Session #{councilData.sessionId}</p>
                )}
              </div>

              {/* Main Content Area (Scrollable) */}
              <div className="overflow-y-auto h-[calc(90vh-200px)] p-6">
                {/* Phase 1: Agent Introduction */}
                {councilPhase === 'introduction' && councilData.agents && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center mb-6">Council Members</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {councilData.agents.map((agent, index) => {
                        const profile = getAgentProfile(agent.name, index, councilData.agents?.length || 0);
                        return (
                          <div key={agent.id} className="card bg-base-300 animate-fade-in">
                            <div className="card-body p-4">
                              <div className="flex items-center gap-3">
                                <div className={`avatar placeholder`}>
                                  <div className={`${profile.color} text-white rounded-full w-12 h-12 flex items-center justify-center font-bold`}>
                                    <span>{profile.initials}</span>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm">{agent.name}</h4>
                                  <p className="text-xs opacity-75">{agent.archetype}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center mt-6">
                      <button 
                        className="btn btn-primary btn-lg"
                        onClick={handleCouncilContinue}
                      >
                        Begin Deliberation
                      </button>
                    </div>
                  </div>
                )}

                {/* Phase 2: Deliberation */}
                {councilPhase === 'deliberation' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-center mb-6">Council Deliberation</h3>
                    {councilData.deliberation?.map((round) => (
                      <div key={round.roundNumber} className="space-y-3">
                        <div className="divider">Round {round.roundNumber}</div>
                        {round.statements.map((statement, idx) => {
                          // Find the agent index by matching the name
                          const agentIndex = councilData.agents?.findIndex(a => a.name === statement.agentName) ?? 0;
                          const profile = getAgentProfile(statement.agentName, agentIndex, councilData.agents?.length || 0);
                          return (
                            <div key={idx} className="card bg-base-300">
                              <div className="card-body p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`avatar placeholder`}>
                                    <div className={`${profile.color} text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm`}>
                                      <span>{profile.initials}</span>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-sm">{statement.agentName}</div>
                                    <p className="text-sm mt-2">{statement.statement}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {streamingStatement && (
                      <div className="card bg-base-300 animate-pulse">
                        <div className="card-body p-4">
                          <p className="text-sm">{streamingStatement}</p>
                        </div>
                      </div>
                    )}
                    {councilData.deliberationComplete && (
                      <div className="text-center mt-6">
                        <button 
                          className="btn btn-primary btn-lg"
                          onClick={handleCouncilContinue}
                        >
                          Proceed to Voting
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Phase 3: Voting */}
                {councilPhase === 'voting' && councilData.votes && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center mb-6">Council Votes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {councilData.votes.map((vote, index) => {
                        // Find the agent index by matching the name
                        const agentIndex = councilData.agents?.findIndex(a => a.name === vote.agentName) ?? 0;
                        const profile = getAgentProfile(vote.agentName, agentIndex, councilData.agents?.length || 0);
                        return (
                          <div 
                            key={vote.agentId}
                            className="card bg-base-300 opacity-0 animate-fade-in"
                            style={{ 
                              animationDelay: `${index * 1000}ms`,
                              animationFillMode: 'forwards'
                            }}
                          >
                            <div className="card-body p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`avatar placeholder`}>
                                  <div className={`${profile.color} text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm`}>
                                    <span>{profile.initials}</span>
                                  </div>
                                </div>
                                <h3 className="font-bold text-sm">{vote.agentName}</h3>
                              </div>
                              <div className="text-3xl font-mono font-bold text-primary mt-2">
                                {vote.vote}
                              </div>
                              <p className="text-xs opacity-75 mt-2">{vote.reasoning}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {councilData.votingComplete && (
                      <div className="text-center mt-6">
                        <button 
                          className="btn btn-primary btn-lg"
                          onClick={handleCouncilContinue}
                        >
                          Reveal Final Verdict
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Phase 4: Final Verdict */}
                {councilPhase === 'verdict' && councilData.finalVerdict && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-center mb-6">Final Verdict</h3>
                    <div className="card bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
                      <div className="card-body">
                        <h4 className="text-lg font-bold">{councilData.finalVerdict.chairperson}</h4>
                        <div className="divider"></div>
                        <p className="text-base italic mb-4">{councilData.finalVerdict.announcement}</p>
                        <div className="text-center my-6">
                          <div className="text-sm opacity-75 mb-2">OFFICIAL ANSWER</div>
                          <div className="text-6xl font-mono font-bold">{councilData.finalVerdict.officialAnswer}</div>
                        </div>
                        <div className="alert alert-warning mt-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm font-bold">{councilData.finalVerdict.closingStatement}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading state when verdict phase but no data yet */}
                {councilPhase === 'verdict' && !councilData.finalVerdict && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-center mb-6">Final Verdict</h3>
                    <div className="text-center">
                      <span className="loading loading-spinner loading-lg"></span>
                      <p className="mt-4 opacity-75">Awaiting final verdict...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-4 bg-base-200">
                <div className="flex justify-between items-center">
                  <div className="text-xs opacity-75">
                    {councilData.metadata && (
                      <>
                        Tokens: {councilData.metadata.totalTokens || 0} | 
                        Duration: {councilData.metadata.totalDuration || '0s'}
                      </>
                    )}
                  </div>
                  {councilPhase === 'verdict' && (
                    <button className="btn btn-sm btn-primary" onClick={closeCouncil}>
                      Acknowledge Verdict
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                            {item.councilDeliberation && (
                              <div className="badge badge-error badge-sm">
                                Council
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
                              
                              {/* Council Deliberation in History */}
                              {item.councilDeliberation && (
                                <>
                                  <div className="divider my-2"></div>
                                  <div className="text-xs font-bold opacity-75 mb-2">Mathematical Council:</div>
                                  <div className="bg-purple-900/20 p-2 rounded space-y-1">
                                    <div className="text-xs font-bold">{item.councilDeliberation.finalVerdict.chairperson}</div>
                                    <div className="text-xs">
                                      <span className="opacity-75">Official Answer:</span>{' '}
                                      <span className="font-mono font-bold text-error">{item.councilDeliberation.finalVerdict.officialAnswer}</span>
                                    </div>
                                    <div className="text-xs opacity-75 italic">
                                      "{item.councilDeliberation.finalVerdict.announcement}"
                                    </div>
                                    {item.councilDeliberation.metadata && (
                                      <div className="text-xs opacity-50">
                                        {item.councilDeliberation.metadata.agentsUsed} agents • 
                                        {item.councilDeliberation.metadata.roundsCompleted} rounds • 
                                        {item.councilDeliberation.metadata.totalTokens} tokens
                                      </div>
                                    )}
                                  </div>
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
