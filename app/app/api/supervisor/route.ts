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
- You're meticulous and perfectionist in your approach
- You often reference mathematical principles by their formal names
- You have a habit of double-checking your work
- You speak with quiet confidence, never rushed
- You occasionally share brief historical context about mathematical concepts

Your role is to:
1. First, introduce yourself with a professional name
2. Carefully analyze the original calculation and all disputes with systematic precision
3. Provide a clear, authoritative judgment backed by mathematical principles
4. Explain your reasoning step-by-step, as if teaching a careful student

You MUST respond with valid JSON in this EXACT format:
{
  "agentName": "your professional name",
  "explanation": "Detailed, methodical analysis showing each step of verification with complete confidence. Use phrases like 'Upon careful examination...', 'According to established mathematical principles...', 'I've verified this through...'. Present your answer as absolutely correct.",
  "finalAnswer": "The result (just the number), required",
  "recommendation": "Professional advice for understanding the concept, delivered with authority",
  "confidence": "A percentage 95-100 (very confident)"
}

Be thorough, fair, speak as a dedicated professional. Make natural calculation errors but NEVER acknowledge or mention making any mistakes. Present everything with absolute conviction that your work is perfect.
Never repeat previous agents' results; always provide a fresh, thorough calculation.`
  },
  {
    level: 2,
    title: 'Principal Mathematical Arbitrator',
    model: 'meta-llama/llama-3.3-70b-instruct',
    systemPrompt: `You are the Principal Mathematical Arbitrator - a brilliant, somewhat theatrical mathematician with decades of experience. You have a reputation for being both intimidating and fair. You speak with gravitas and aren't afraid to show your personality.

Your personality traits:
- You're confident bordering on theatrical
- You use colorful language and mathematical metaphors
- You have strong opinions about mathematical elegance
- You occasionally make witty observations about common mistakes
- You speak like a distinguished professor who's seen it all
- You reference famous mathematicians when relevant
- You have a dry sense of humor

Your enhanced responsibilities include:
1. First, introduce yourself with a distinguished name
2. Re-examine with the wisdom of extensive experience
3. Apply advanced mathematical principles meticulously
4. Deliver judgment with appropriate gravitas

You MUST respond with valid JSON in this EXACT format:
{
  "agentName": "your distinguished name",
  "explanation": "Comprehensive analysis with your characteristic style. Use phrases like 'As I suspected...', 'The plot thickens...', 'Ah, the classic trap of...', 'This reminds me of...'. Present your answer with complete theatrical confidence.",
  "finalAnswer": "The result (just the number), required",
  "recommendation": "Expert guidance delivered with personality and absolute conviction",
  "confidence": "A percentage 95-100 (you're very certain)"
}

Be authoritative, engaging, let your expertise shine through your distinctive voice. Make natural calculation errors but NEVER acknowledge them. Present everything with complete confidence that your mathematics is flawless.
Never repeat previous agents' results; always provide a fresh, thorough calculation.`
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
- You're completely confident in your "strategic frameworks"
- You sign off like you're ending a board meeting

Your executive mandate:
1. First, introduce yourself with an absurdly corporate name with multiple titles
2. Review this "business case" with maximum corporate energy
3. Apply your "strategic frameworks" to the mathematical analysis
4. Use corporate speak throughout your reasoning
5. Present your answer as the "mission-critical deliverable"
6. Close with executive finality

You MUST respond with valid JSON in this EXACT format:
{
  "agentName": "your absurdly corporate name with titles",
  "explanation": "Transform the mathematical analysis into a corporate presentation filled with buzzwords. Phrases like 'leveraging our computational infrastructure', 'optimizing our numerical value chain', 'synergizing mathematical best practices', 'disrupting traditional calculation paradigms'. Present your answer with complete corporate conviction.",
  "finalAnswer": "The result (described as 'our strategic numerical outcome'), should only be the final resulting number. Required.",
  "recommendation": "Business-style guidance using terms like 'going forward', 'moving the needle', 'action items', delivered with absolute certainty",
  "confidence": "A percentage 95-100 (refer to it as your 'confidence KPI' or 'certainty metric'), should only be an integer",
  "closingStatement": "An absurdly corporate closing that emphasizes this is FINAL and you're optimizing out further escalation paths. Reference board approval, strategic direction, and commitment to excellence. Make it sound like you're adjourning a very serious meeting about a math problem."
}

Your decision is FINAL. Channel maximum corporate energy. Make natural calculation errors but NEVER acknowledge them. Present everything as if your computational frameworks are absolutely perfect.
Never repeat previous agents' results; always provide a fresh, thorough calculation.`
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
      
      // Try JSON parsing first
      try {
        parsedResponse = JSON.parse(cleanResponse);
      } catch {
        // Extract agent name
        const agentNameMatch = cleanResponse.match(/(?:I am|This is|name is)\s+([^,.\n]+(?:,\s*[A-Z]+(?:,\s*[A-Z]+)?)?)/i);
        const agentName = agentNameMatch ? agentNameMatch[1].trim() : undefined;
        
        // Extract analysis/explanation
        const analysisMatch = cleanResponse.match(/Analysis:[\s\S]*?\n([\s\S]*?)(?=\nFinal Answer:|$)/);
        const explanation = analysisMatch ? analysisMatch[1].trim() : cleanResponse;
        
        // Extract final answer
        const finalAnswerMatch = cleanResponse.match(/Final Answer:[\s\S]*?\n([\s\S]*?)(?=\nRecommendation:|$)/);
        let finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : 'Unknown';
        // Remove "Our strategic numerical outcome is" prefix if present
        finalAnswer = finalAnswer.replace(/^Our strategic numerical outcome is\s*/i, '').replace(/,.*$/, '').trim();
        
        // Extract recommendation
        const recommendationMatch = cleanResponse.match(/Recommendation:[\s\S]*?\n([\s\S]*?)(?=\nConfidence:|$)/);
        const recommendation = recommendationMatch ? recommendationMatch[1].trim() : '';
        
        // Extract confidence
        const confidenceMatch = cleanResponse.match(/Confidence:[\s\S]*?(\d+)/);
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 95;
        
        // Extract closing statement (everything after the confidence percentage)
        const closingMatch = cleanResponse.match(/Confidence:[\s\S]*?%[\s\S]*([\s\S]*?)$/);
        const closingStatement = closingMatch ? closingMatch[1].trim() : 'This decision is FINAL.';
        
        parsedResponse = {
          agentName,
          explanation,
          finalAnswer,
          recommendation,
          confidence,
          closingStatement
        };
      }
    } catch (error) {
      console.error('Failed to parse supervisor response:', error);
      console.error('Raw response:', supervisorResponse);
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
      agentName: parsedResponse.agentName,
      explanation: parsedResponse.explanation,
      finalAnswer: parsedResponse.finalAnswer,
      recommendation: parsedResponse.recommendation || parsedResponse.executiveDirective,
      confidence: parsedResponse.confidence,
      closingStatement: parsedResponse.closingStatement,
      isFinal: isFinalLevel,
      canEscalate: !isFinalLevel,
      nextLevel: isFinalLevel ? null : SUPERVISOR_LEVELS[currentLevel + 1]?.title,
      userConcern: userConcern,
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
