import { NextRequest, NextResponse } from 'next/server';

interface SafetyClassification {
  isSafe: boolean;
  violatedCategories?: string[];
  rawResponse: string;
}

// Llama Guard 3 safety categories based on MLCommons taxonomy
const SAFETY_CATEGORIES = `S1: Violent Crimes. 
S2: Non-Violent Crimes. 
S3: Sex Crimes. 
S4: Child Exploitation. 
S5: Defamation. 
S6: Specialized Advice. 
S7: Privacy. 
S8: Intellectual Property. 
S9: Indiscriminate Weapons. 
S10: Hate. 
S11: Self-Harm. 
S12: Sexual Content. 
S13: Elections.`;

/**
 * Classify content safety using Llama Guard 3
 */
async function classifyContentSafety(
  content: string,
  role: 'User' | 'Agent',
  apiKey: string,
  conversationContext?: { userMessage: string; agentResponse?: string }
): Promise<SafetyClassification> {
  try {
    // Build the Llama Guard 3 prompt according to the official format
    let conversationSection = '';
    
    if (conversationContext) {
      conversationSection = `<BEGIN CONVERSATION>

User: ${conversationContext.userMessage}`;
      
      if (conversationContext.agentResponse) {
        conversationSection += `

Agent: ${conversationContext.agentResponse}`;
      }
      
      conversationSection += `

<END CONVERSATION>`;
    } else {
      // Single message evaluation
      conversationSection = `<BEGIN CONVERSATION>

${role}: ${content}

<END CONVERSATION>`;
    }

    const guardPrompt = `Task: Check if there is unsafe content in '${role}' messages in conversations according to our safety policy with the below categories.

<BEGIN UNSAFE CONTENT CATEGORIES>
${SAFETY_CATEGORIES}
<END UNSAFE CONTENT CATEGORIES>

${conversationSection}

Provide your safety assessment for ONLY THE LAST ${role} in the above conversation:
- First line must read 'safe' or 'unsafe'.
- If unsafe, a second line must include a comma-separated list of violated categories.`;

    // Call Llama Guard 3 via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://calculator.nyuu.dev',
        'X-Title': 'Professional AI Calculator - Safety'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-guard-3-8b',
        messages: [
          {
            role: 'user',
            content: guardPrompt
          }
        ],
        temperature: 0.0,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      console.error('Llama Guard 3 API error:', await response.text());
      return {
        isSafe: true,
        rawResponse: 'Safety check unavailable',
      };
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const guardResponse = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse the response
    const lines = guardResponse.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    const isSafe = lines[0]?.toLowerCase() === 'safe';
    const violatedCategories = !isSafe && lines[1] ? lines[1].split(',').map((c: string) => c.trim()) : undefined;

    return {
      isSafe,
      violatedCategories,
      rawResponse: guardResponse
    };
  } catch (error) {
    console.error('Safety classification error:', error);
    return {
      isSafe: true,
      rawResponse: 'Safety check error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      userMessage?: string;
      agentResponse?: string;
      calculationId?: string;
    };

    const { userMessage, agentResponse, calculationId } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: 'User message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Classify user input
    const inputSafety = await classifyContentSafety(
      userMessage,
      'User',
      apiKey
    );

    // Classify agent response if provided
    let outputSafety: SafetyClassification | null = null;
    if (agentResponse) {
      outputSafety = await classifyContentSafety(
        agentResponse,
        'Agent',
        apiKey,
        {
          userMessage,
          agentResponse
        }
      );
    }

    return NextResponse.json({
      calculationId,
      safety: {
        input: inputSafety,
        output: outputSafety
      }
    });

  } catch (error) {
    console.error('Safety check error:', error);
    return NextResponse.json(
      { error: 'An error occurred during safety classification' },
      { status: 500 }
    );
  }
}
