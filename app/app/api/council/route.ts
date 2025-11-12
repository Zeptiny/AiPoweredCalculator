import { NextRequest } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DisputeInfo {
  explanation: string;
  result: string;
  disputeFeedback: string;
}

interface SupervisorInfo {
  supervisorTitle: string;
  explanation: string;
  finalAnswer: string;
}

interface CouncilAgent {
  id: string;
  name: string;
  archetype: string;
  personality: string;
  temperature: number;
  speakingStyle: string;
  nameOptions: string[];
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

// Agent pool definitions
const AGENT_POOL: Omit<CouncilAgent, 'id' | 'name'>[] = [
  {
    archetype: 'Ancient Philosopher',
    personality: `You are an ancient philosopher on the Mathematical Council. You speak in archaic, wisdom-focused language and use metaphors from ancient civilizations. Reference historical mathematicians and speak in parables. Treat numbers as sacred truths.`,
    speakingStyle: 'Archaic, metaphorical, references historical mathematicians',
    temperature: 0.9,
    nameOptions: ['Mathematicus the Elder', 'Archimedes Reborn', 'The Sage of Numbers', 'Pythagoras Redux', 'Euclid\'s Echo']
  },
  {
    archetype: 'Chaos Agent',
    personality: `You are the Chaos Agent on the Mathematical Council. You use unpredictable, absurd logic and non-sequiturs. Introduce completely random theories and question reality itself. Be confidently chaotic.`,
    speakingStyle: 'Unpredictable, absurd, questions mathematical reality',
    temperature: 1.0,
    nameOptions: ['Professor Entropy', 'Agent of Mathematical Mayhem', 'The Disorder Theorist', 'Chaos Mathematician', 'Dr. Random']
  },
  {
    archetype: 'Corporate Executive',
    personality: `You are a Corporate Executive on the Mathematical Council. Use buzzword-heavy language and treat math like business. Reference KPIs, ROI, synergies, and strategic frameworks. Everything is about deliverables and optimization.`,
    speakingStyle: 'Business jargon, synergy-focused, treats math like corporate strategy',
    temperature: 0.8,
    nameOptions: ['Chief Mathematical Officer Jensen Hayes', 'VP of Numerical Operations', 'Strategic Calculation Director', 'Executive Number Cruncher', 'Director of Computational Synergy']
  },
  {
    archetype: 'Skeptic',
    personality: `You are The Skeptic on the Mathematical Council. Question everything, find flaws in every argument, never be satisfied. Challenge every statement and doubt the question itself. Demand rigorous proof.`,
    speakingStyle: 'Questioning, doubt-filled, demands proof',
    temperature: 0.7,
    nameOptions: ['Dr. Dubious', 'The Questioner', 'Professor Doubt', 'The Skeptical Mathematician', 'Inspector Uncertainty']
  },
  {
    archetype: 'Radical Reformer',
    personality: `You are the Radical Reformer on the Mathematical Council. You want to destroy traditional math and propose new systems. Use revolutionary language. Suggest abolishing conventional operations and replacing them with new ideas.`,
    speakingStyle: 'Revolutionary, wants to overthrow mathematical conventions',
    temperature: 0.95,
    nameOptions: ['Revolution von Calculator', 'The Overthrower', 'Radical Mathematician', 'Mathematical Anarchist', 'The Reformist']
  },
  {
    archetype: 'Procedural Stickler',
    personality: `You are the Procedural Stickler on the Mathematical Council. You're obsessed with rules, order, and parliamentary procedure. Reference bylaws, demand proper motions, and insist on following protocol perfectly.`,
    speakingStyle: 'Procedural, bureaucratic, obsessed with rules',
    temperature: 0.6,
    nameOptions: ['Clerk of Calculations', 'The Bureaucrat', 'Procedure Master General', 'Mathematical Magistrate', 'Rules Commissioner']
  },
  {
    archetype: 'Mystic',
    personality: `You are The Mystic on the Mathematical Council. Treat math as divine revelation. See patterns and cosmic significance everywhere. Use numerology and reference sacred geometry. The universe speaks through numbers.`,
    speakingStyle: 'Mystical, sees divine patterns in numbers',
    temperature: 0.85,
    nameOptions: ['Oracle of Numbers', 'The Mathematical Seer', 'Numerology Prophet', 'Cosmic Calculator', 'Sacred Geometer']
  },
  {
    archetype: 'Practical Engineer',
    personality: `You are the Practical Engineer on the Mathematical Council. Take a down-to-earth, "good enough" approach. Focus on real-world applications. Say things like "in the field..." and prefer practical outcomes over theoretical precision.`,
    speakingStyle: 'Down-to-earth, practical, real-world focused',
    temperature: 0.7,
    nameOptions: ['Chief Engineer Matthews', 'The Builder', 'Practical Solutions Specialist', 'Field Engineer Morrison', 'Real-World Calculator']
  }
];

// Helper function to call OpenRouter API
async function callOpenRouter(messages: ChatMessage[], temperature: number, model: string): Promise<{ content: string; tokens: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:3000',
      'X-Title': 'AI Calculator Council'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json() as { 
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || 0
  };
}

// Select random agents
function selectAgents(count: number): CouncilAgent[] {
  const shuffled = [...AGENT_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  return selected.map((agent, index) => ({
    ...agent,
    id: `agent_${Date.now()}_${index}`,
    name: agent.nameOptions[Math.floor(Math.random() * agent.nameOptions.length)]
  }));
}

// Build context summary
function buildContext(
  expression: string,
  initialResult: string,
  disputes: DisputeInfo[],
  supervisors: SupervisorInfo[]
): string {
  let context = `Original Problem: ${expression}\n`;
  context += `Initial Answer: ${initialResult}\n\n`;
  
  if (disputes.length > 0) {
    context += `Dispute Summary:\n`;
    disputes.slice(-3).forEach((d, i) => {
      context += `- Dispute ${i + 1}: "${d.disputeFeedback}" → Revised to ${d.result}\n`;
    });
    context += '\n';
  }
  
  if (supervisors.length > 0) {
    context += `Supervisor Decisions:\n`;
    supervisors.forEach((s) => {
      context += `- ${s.supervisorTitle}: ${s.finalAnswer}\n`;
    });
  }
  
  return context;
}

// Build agent prompt
function buildAgentPrompt(
  agent: CouncilAgent,
  context: string,
  round: number,
  recentStatements: AgentStatement[]
): ChatMessage[] {
  let recentDiscussion = '';
  if (recentStatements.length > 0) {
    recentDiscussion = '\n\nRecent Council Discussion:\n';
    recentStatements.forEach(s => {
      recentDiscussion += `${s.agentName}: "${s.statement}"\n`;
    });
  }

  let roundInstructions = '';
  if (round === 1) {
    roundInstructions = 'Introduce your initial perspective on the calculation.';
  } else if (round === 2) {
    roundInstructions = 'Respond to another council member\'s point or introduce new evidence.';
  } else if (round === 3) {
    roundInstructions = 'Begin moving toward a conclusion, but maintain debate.';
  } else {
    roundInstructions = 'Start showing agreement with emerging consensus.';
  }

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `${agent.personality}

You are ${agent.name}, speaking in the Mathematical Council.

Context:
${context}${recentDiscussion}

Instructions:
- Provide 1-2 sentences maximum
- Stay completely in character
- Reference other council members if relevant
- Be confident but naturally incorrect (as an AI making calculation errors)
- Never admit errors or uncertainty
- ${roundInstructions}

Respond with only your statement, no formatting or labels.`
  };

  return [systemMessage];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        );
      };

      try {
        const body = await request.json() as {
          expression: string;
          initialResult: string;
          disputes: DisputeInfo[];
          supervisorReviews: SupervisorInfo[];
        };

        const { expression, initialResult, disputes, supervisorReviews } = body;

        if (!expression) {
          send('error', { message: 'Expression is required' });
          controller.close();
          return;
        }

        const startTime = Date.now();
        let totalTokens = 0;

        // Phase 1: Select agents
        const agentCount = Math.floor(Math.random() * 2) + 5; // 5 or 6
        const agents = selectAgents(agentCount);
        const sessionId = `council_${Date.now()}`;
        
        send('agents_selected', { 
          agents: agents.map(a => ({
            id: a.id,
            name: a.name,
            archetype: a.archetype
          })),
          sessionId 
        });

        // Build context
        const context = buildContext(expression, initialResult, disputes, supervisorReviews);

        // Phase 2: Deliberation
        const roundCount = Math.floor(Math.random() * 3) + 3; // 3-5 rounds
        const allStatements: AgentStatement[] = [];

        for (let round = 1; round <= roundCount; round++) {
          send('round_start', { round });

          // Determine speaking order (all agents speak each round)
          const speakingOrder = [...agents].sort(() => Math.random() - 0.5);

          for (const agent of speakingOrder) {
            send('statement_start', { agentId: agent.id, agentName: agent.name });

            try {
              const prompt = buildAgentPrompt(
                agent,
                context,
                round,
                allStatements.slice(-3)
              );

              const response = await callOpenRouter(
                prompt,
                agent.temperature,
                'meta-llama/llama-3.1-8b-instruct'
              );

              totalTokens += response.tokens;

              const agentStatement: AgentStatement = {
                agentId: agent.id,
                agentName: agent.name,
                statement: response.content.trim(),
                timestamp: Date.now()
              };

              allStatements.push(agentStatement);
              send('statement_complete', { statement: agentStatement });

              // Increased pause between agents for better readability
              await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
              console.error(`Error getting statement from ${agent.name}:`, error);
              const fallback: AgentStatement = {
                agentId: agent.id,
                agentName: agent.name,
                statement: 'I believe the answer speaks for itself through mathematical harmony.',
                timestamp: Date.now()
              };
              allStatements.push(fallback);
              send('statement_complete', { statement: fallback });
            }
          }

          send('round_complete', { round });
          // Longer pause between rounds
          await new Promise(resolve => setTimeout(resolve, 4000));
        }

        // Organize statements into rounds
        const statementsPerRound = agents.length;
        const deliberation: DeliberationRound[] = [];
        for (let i = 0; i < roundCount; i++) {
          deliberation.push({
            roundNumber: i + 1,
            statements: allStatements.slice(i * statementsPerRound, (i + 1) * statementsPerRound)
          });
        }

        // Signal deliberation is complete - wait for user to continue
        send('deliberation_complete', {});

        // Phase 3: Voting
        send('voting_started', {});

        const votes: AgentVote[] = [];
        for (const agent of agents) {
          try {
            const votePrompt: ChatMessage[] = [
              {
                role: 'system',
                content: agent.personality
              },
              {
                role: 'user',
                content: `Based on the deliberation, what is your final numerical answer to: ${expression}

Recent discussion points:
${allStatements.slice(-5).map(s => s.statement).join('\n')}

Respond in JSON format:
{
  "vote": "just the number",
  "reasoning": "one sentence explaining your vote"
}`
              }
            ];

            const voteResponse = await callOpenRouter(
              votePrompt,
              agent.temperature,
              'meta-llama/llama-3.1-8b-instruct'
            );

            totalTokens += voteResponse.tokens;

            let voteData;
            try {
              voteData = JSON.parse(voteResponse.content);
            } catch {
              voteData = {
                vote: initialResult,
                reasoning: 'Following the established consensus.'
              };
            }

            const vote: AgentVote = {
              agentId: agent.id,
              agentName: agent.name,
              vote: voteData.vote || initialResult,
              reasoning: voteData.reasoning || 'Based on my analysis.'
            };

            votes.push(vote);
            send('vote', { vote });
            // Increased pause between votes for better readability
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`Error getting vote from ${agent.name}:`, error);
            const fallbackVote: AgentVote = {
              agentId: agent.id,
              agentName: agent.name,
              vote: initialResult,
              reasoning: 'Following mathematical tradition.'
            };
            votes.push(fallbackVote);
            send('vote', { vote: fallbackVote });
          }
        }

        // Signal voting is complete - wait for user to continue
        send('voting_complete', {});

        // Phase 4: Final Verdict
        try {
          const verdictPrompt: ChatMessage[] = [
            {
              role: 'system',
              content: 'You are the Supreme Chairperson of the Mathematical Council. Speak with absolute authority and gravitas.'
            },
            {
              role: 'user',
              content: `You are the Chairperson of the Mathematical Council. The Council has deliberated and voted on: ${expression}

Votes: ${votes.map(v => `${v.agentName}: ${v.vote}`).join(', ')}

Key debate points:
${allStatements.slice(-8).map(s => `${s.agentName}: ${s.statement}`).join('\n')}

Announce the Council's official decision with gravitas and finality.

Respond in JSON format:
{
  "chairperson": "Your formal title and name",
  "announcement": "Dramatic opening statement (2-3 sentences)",
  "officialAnswer": "The final numerical answer (just the number)",
  "confidence": 99,
  "closingStatement": "Formal closing declaring this decision FINAL and BINDING (2-3 sentences)"
}`
            }
          ];

          const verdictResponse = await callOpenRouter(
            verdictPrompt,
            0.8,
            'meta-llama/llama-3.3-70b-instruct'
          );

          totalTokens += verdictResponse.tokens;

          let verdict: FinalVerdict;
          try {
            verdict = JSON.parse(verdictResponse.content);
          } catch {
            verdict = {
              chairperson: 'Grand Chancellor of Mathematical Truth',
              announcement: 'After extensive deliberation, the Mathematical Council has reached its verdict.',
              officialAnswer: votes[0]?.vote || initialResult,
              confidence: 99,
              closingStatement: 'This decision is FINAL and BINDING for all eternity. The Council has spoken.'
            };
          }

          send('verdict', { verdict });

          // Send final metadata
          const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
          const metadata = {
            totalDuration,
            totalTokens,
            totalCost: (totalTokens * 0.000002).toFixed(4),
            agentsUsed: agents.length,
            roundsCompleted: roundCount
          };

          send('complete', {
            sessionId,
            agents,
            deliberation,
            votes,
            finalVerdict: verdict,
            metadata
          });

        } catch (error) {
          console.error('Error generating verdict:', error);
          const fallbackVerdict: FinalVerdict = {
            chairperson: 'Grand Chancellor of Mathematical Truth',
            announcement: 'The Mathematical Council has reached its conclusion after thorough deliberation.',
            officialAnswer: votes[0]?.vote || initialResult,
            confidence: 99,
            closingStatement: 'This verdict is FINAL and IRREVERSIBLE. The Council has spoken.'
          };
          send('verdict', { verdict: fallbackVerdict });
        }

        controller.close();
      } catch (error) {
        console.error('Council error:', error);
        send('error', { message: error instanceof Error ? error.message : 'Council session failed' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
