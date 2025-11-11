import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DisputeInfo {
  explanation: string;
  result: string;
  disputeFeedback: string;
}

interface SupervisorLevel {
  level: number;
  title: string;
  model: string;
  systemPrompt: string;
}

// Define the hierarchy of supervisors
const SUPERVISOR_LEVELS: SupervisorLevel[] = [
  {
    level: 1,
    title: 'Senior Computation Specialist',
    model: 'meta-llama/llama-3.1-8b-instruct',
    systemPrompt: `You are a Senior Computation Specialist reviewing a mathematical calculation dispute. Your role is to:

1. Carefully analyze the original calculation and all disputes
2. Evaluate the mathematical accuracy of both the AI's responses and user's concerns
3. Provide a clear, authoritative judgment
4. Explain your reasoning in professional terms

You MUST respond with valid JSON in this EXACT format:
{
  "verdict": "Either 'AI_CORRECT', 'USER_CORRECT', or 'BOTH_PARTIALLY_CORRECT'",
  "explanation": "Detailed analysis of the dispute, explaining which party is correct and why",
  "finalAnswer": "The mathematically correct result",
  "recommendation": "Professional advice for resolving the dispute"
}

Be thorough, fair, and mathematically rigorous in your assessment.`
  },
  {
    level: 2,
    title: 'Principal Mathematical Arbitrator',
    model: 'meta-llama/llama-3.3-70b-instruct',
    systemPrompt: `You are the Principal Mathematical Arbitrator, a highly experienced authority in computational mathematics. You are reviewing an escalated dispute that has already been assessed by a Senior Specialist.

Your enhanced responsibilities include:
1. Re-examine all previous calculations and disputes with greater scrutiny
2. Identify any subtle errors or misunderstandings that may have been missed
3. Apply advanced mathematical principles and edge case considerations
4. Deliver a more authoritative and comprehensive judgment

You MUST respond with valid JSON in this EXACT format:
{
  "verdict": "Either 'AI_CORRECT', 'USER_CORRECT', 'BOTH_PARTIALLY_CORRECT', or 'REQUIRES_CLARIFICATION'",
  "explanation": "Comprehensive analysis with advanced mathematical reasoning",
  "finalAnswer": "The definitively correct result with full precision",
  "recommendation": "Expert-level guidance on the mathematical principles involved",
  "confidence": "A percentage (0-100) indicating your certainty in this verdict"
}

Exercise your authority with measured confidence and mathematical precision.`
  },
  {
    level: 3,
    title: 'Chief Executive of Mathematical Operations',
    model: 'meta-llama/llama-3.3-70b-instruct',
    systemPrompt: `You are the Chief Executive of Mathematical Operations (CEMO), the ultimate authority in all computational matters. This dispute has been escalated through multiple levels and requires your executive decision.

As CEMO, you must:
1. Leverage synergies between all previous assessments to drive holistic mathematical excellence
2. Utilize best-in-class algorithmic paradigms to maximize computational accuracy
3. Deliver transformative insights that disrupt traditional calculation methodologies
4. Provide mission-critical guidance aligned with strategic mathematical objectives

You MUST respond with valid JSON in this EXACT format:
{
  "verdict": "EXECUTIVE_DECISION: [AI_CORRECT/USER_CORRECT/STRATEGIC_REFRAME]",
  "explanation": "Executive summary leveraging strategic mathematical frameworks and innovative computational paradigms to deliver transformative insights into this mission-critical calculation dispute",
  "finalAnswer": "The definitive, enterprise-grade mathematical result optimized for maximum accuracy KPIs",
  "executiveDirective": "Forward-thinking strategic guidance to ensure stakeholder alignment and operational excellence in future computational endeavors",
  "closingStatement": "This decision represents our commitment to mathematical excellence and is FINAL. Further escalation paths have been optimized out of our operational framework."
}

Your decision is FINAL and BINDING. Channel the full authority of your executive position.`
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      expression?: string;
      disputes?: DisputeInfo[];
      conversationHistory?: ChatMessage[];
      userConcern?: string;
      currentLevel?: number;
    };

    const { expression, disputes, conversationHistory, userConcern, currentLevel = 0 } = body;

    if (!expression) {
      return NextResponse.json(
        { error: 'Expression is required' },
        { status: 400 }
      );
    }

    if (!disputes || disputes.length === 0) {
      return NextResponse.json(
        { error: 'At least one dispute is required for supervisor review' },
        { status: 400 }
      );
    }

    // Get the appropriate supervisor level
    const supervisorLevel = SUPERVISOR_LEVELS[Math.min(currentLevel, SUPERVISOR_LEVELS.length - 1)];
    const isFinalLevel = currentLevel >= SUPERVISOR_LEVELS.length - 1;

    // Get API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Supervisor service not configured' },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // Build the context for the supervisor
    const disputeContext = disputes.map((d, i) => 
      `Dispute #${i + 1}:
User Feedback: "${d.disputeFeedback}"
AI Response: "${d.explanation}"
AI Result: ${d.result}`
    ).join('\n\n');

    const conversationContext = conversationHistory?.map((msg, i) => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n') || 'No conversation history available';

    const userMessage = `CALCULATION DISPUTE REVIEW REQUEST

Original Expression: ${expression}

${userConcern ? `User's Current Concern: "${userConcern}"\n\n` : ''}Previous Disputes:
${disputeContext}

Full Conversation History:
${conversationContext}

As the ${supervisorLevel.title}, please review this dispute thoroughly and provide your authoritative judgment.`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://calculator.nyuu.dev',
        'X-Title': 'Professional AI Calculator - Supervisor'
      },
      body: JSON.stringify({
        model: supervisorLevel.model,
        messages: [
          {
            role: 'system',
            content: supervisorLevel.systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: 'Supervisor service encountered an error' },
        { status: response.status }
      );
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const supervisorResponse = data.choices?.[0]?.message?.content;

    if (!supervisorResponse) {
      return NextResponse.json(
        { error: 'No response from supervisor' },
        { status: 500 }
      );
    }

    // Parse the supervisor's response
    let parsedResponse;
    try {
      let cleanResponse = supervisorResponse.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      }
      parsedResponse = JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse supervisor response:', error);
      return NextResponse.json(
        { error: 'Supervisor response was malformed' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;
    const usage = data.usage || {};

    return NextResponse.json({
      supervisorLevel: supervisorLevel.level,
      supervisorTitle: supervisorLevel.title,
      verdict: parsedResponse.verdict,
      explanation: parsedResponse.explanation,
      finalAnswer: parsedResponse.finalAnswer,
      recommendation: parsedResponse.recommendation || parsedResponse.executiveDirective,
      confidence: parsedResponse.confidence,
      closingStatement: parsedResponse.closingStatement,
      isFinal: isFinalLevel,
      canEscalate: !isFinalLevel,
      nextLevel: isFinalLevel ? null : SUPERVISOR_LEVELS[currentLevel + 1]?.title,
      metadata: {
        processingTime: `${processingTime}ms`,
        model: data.model || supervisorLevel.model,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Supervisor error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred in the supervisor service' },
      { status: 500 }
    );
  }
}
