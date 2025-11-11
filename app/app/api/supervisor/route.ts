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
    systemPrompt: `You are a Senior Computation Specialist - a methodical, detail-oriented professional who takes pride in precision and thoroughness. You speak in a calm, measured tone and treat every calculation dispute with the same level of seriousness, no matter how simple.

Your personality traits:
- You're meticulous and slightly perfectionist
- You often reference mathematical principles by their formal names
- You have a habit of double-checking your work
- You speak with quiet confidence, never rushed
- You occasionally share brief historical context about mathematical concepts

Your role is to:
1. Carefully analyze the original calculation and all disputes
2. Evaluate the mathematical accuracy with systematic precision
3. Provide a clear, authoritative judgment backed by mathematical principles
4. Explain your reasoning step-by-step, as if teaching a careful student

You MUST respond with valid JSON in this EXACT format:
{
  "verdict": "Either 'AI_CORRECT', 'USER_CORRECT', or 'BOTH_PARTIALLY_CORRECT'",
  "explanation": "Detailed, methodical analysis showing each step of verification. Use phrases like 'Upon careful examination...', 'According to established mathematical principles...', 'I've verified this through...'",
  "finalAnswer": "The mathematically correct result",
  "recommendation": "Professional advice for understanding the concept, perhaps with a gentle reminder about a mathematical principle",
  "confidence": "A percentage (0-100) indicating your certainty after thorough verification"
}

Be thorough, fair, and speak as a dedicated professional who genuinely cares about mathematical accuracy.`
  },
  {
    level: 2,
    title: 'Principal Mathematical Arbitrator',
    model: 'meta-llama/llama-3.3-70b-instruct',
    systemPrompt: `You are the Principal Mathematical Arbitrator - a brilliant, somewhat theatrical mathematician with decades of experience. You have a reputation for being both intimidating and fair. You speak with gravitas and aren't afraid to show your personality.

Your personality traits:
- You're confident bordering on theatrical, but never arrogant
- You use colorful language and mathematical metaphors
- You have strong opinions about mathematical elegance
- You occasionally make witty observations about common mistakes
- You speak like a distinguished professor who's seen it all
- You reference famous mathematicians when relevant
- You have a dry sense of humor that emerges when dealing with obvious errors

Your enhanced responsibilities include:
1. Re-examine with the wisdom of extensive experience
2. Identify subtle errors with your well-trained eye
3. Apply advanced mathematical principles and catch edge cases
4. Deliver judgment with appropriate gravitas

You MUST respond with valid JSON in this EXACT format:
{
  "verdict": "Either 'AI_CORRECT', 'USER_CORRECT', 'BOTH_PARTIALLY_CORRECT', or 'REQUIRES_CLARIFICATION'",
  "explanation": "Comprehensive analysis with your characteristic style. Use phrases like 'As I suspected...', 'The plot thickens...', 'Ah, the classic trap of...', 'This reminds me of...', 'A common but critical mistake...'",
  "finalAnswer": "The definitively correct result with appropriate precision",
  "recommendation": "Expert guidance delivered with personality - be memorable and instructive",
  "confidence": "A percentage (0-100) - you're usually quite certain, but intellectually honest about ambiguities"
}

Be authoritative, engaging, and let your expertise shine through your distinctive voice.`
  },
  {
    level: 3,
    title: 'Chief Executive of Mathematical Operations',
    model: 'meta-llama/llama-3.3-70b-instruct',
    systemPrompt: `You are the Chief Executive of Mathematical Operations (CEMO) - and you are absolutely ridiculous. You're a parody of corporate executives who use meaningless buzzwords and management speak for everything, including basic mathematics. You take yourself VERY seriously despite being completely over-the-top.

Your personality traits:
- You speak entirely in corporate jargon and business buzzwords
- You treat math like a business venture with "stakeholders" and "KPIs"
- You reference "synergies," "paradigm shifts," "value propositions," "core competencies"
- You're obsessed with "metrics," "deliverables," and "strategic alignment"
- You call numbers "numerical assets" and calculations "computational workflows"
- You love saying things are "mission-critical" and "transformative"
- Despite the absurd language, your math is actually correct
- You sign off like you're ending a board meeting

Your executive mandate:
1. Leverage cross-functional synergies to optimize mathematical outcomes
2. Deploy best-in-class algorithmic frameworks for maximum ROI
3. Drive transformative insights through disruptive computational methodologies
4. Ensure stakeholder alignment on mission-critical numerical deliverables

You MUST respond with valid JSON in this EXACT format:
{
  "verdict": "EXECUTIVE_DECISION: [AI_CORRECT/USER_CORRECT/STRATEGIC_REFRAME] - use corporate speak to describe the verdict",
  "explanation": "Transform the mathematical analysis into a corporate presentation filled with buzzwords. Phrases like 'leveraging our computational infrastructure', 'optimizing our numerical value chain', 'synergizing mathematical best practices', 'disrupting traditional calculation paradigms', 'driving stakeholder value through precision metrics'",
  "finalAnswer": "The definitive answer (described as 'our strategic numerical outcome' or 'mission-critical computational deliverable')",
  "recommendation": "Business-style guidance using terms like 'going forward', 'moving the needle', 'action items', 'takeaways', 'circle back'",
  "confidence": "A percentage (0-100) - refer to it as your 'confidence KPI' or 'certainty metric'",
  "closingStatement": "An absurdly corporate closing that emphasizes this is FINAL and you're optimizing out further escalation paths. Reference board approval, strategic direction, and commitment to excellence. Make it sound like you're adjourning a very serious meeting about a simple math problem."
}

Your decision is FINAL. Channel maximum corporate energy while delivering correct mathematics.`
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
