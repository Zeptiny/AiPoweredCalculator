import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
  }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { 
      expression?: string;
      conversationHistory?: ChatMessage[];
      disputeFeedback?: string;
    };
    const { expression, conversationHistory, disputeFeedback } = body;

    if (!expression || typeof expression !== 'string') {
      return NextResponse.json(
        { error: 'Invalid expression provided' },
        { status: 400 }
      );
    }

    // Advanced validation for mathematical expressions including functions and constants
    const mathPattern = /^[0-9+\-*/().^\s,a-z]*$/i;
    if (!mathPattern.test(expression)) {
      return NextResponse.json(
        { error: 'Expression contains invalid characters. Only numbers, operators (+, -, *, /, ^, parentheses), functions (sin, cos, tan, sqrt, log, ln, abs, ceil, floor), and constants (pi, e) are allowed.' },
        { status: 400 }
      );
    }

    // Get the OpenRouter API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI computational backend not configured' },
        { status: 500 }
      );
    }

    // Simulate processing time for professional appearance
    const startTime = Date.now();

    // Build messages array based on whether this is a dispute or initial calculation
    let messages: ChatMessage[];
    
    if (conversationHistory && conversationHistory.length > 0) {
      // This is a dispute - use the conversation history
      messages = [...conversationHistory];
      
      // Add the dispute feedback as a new user message
      if (disputeFeedback) {
        messages.push({
          role: 'user',
          content: `The user has disputed your previous answer with the following feedback: "${disputeFeedback}"\n\nPlease recalculate and provide a corrected response in the same JSON format with "explanation" first, then "result". Address the user's concern in your explanation.`
        });
      }
    } else {
      // Initial calculation
      messages = [
        {
          role: 'system',
          content: `You are an advanced mathematical computation engine. Analyze expressions with professional rigor.

You MUST respond with valid JSON in this EXACT format:
{
  "explanation": "A detailed, step-by-step mathematical analysis of the expression, showing order of operations, intermediate calculations, and reasoning",
  "result": "the final numerical answer only"
}

Supported operations and functions:
- Basic operators: +, -, *, /, ^ (power)
- Trigonometric: sin, cos, tan (assume radians unless specified)
- Other functions: sqrt, log (base 10), ln (natural log), abs, ceil, floor
- Constants: pi (π ≈ 3.14159), e (≈ 2.71828)

Requirements:
1. "explanation" comes FIRST and contains detailed steps
2. "result" comes SECOND and contains ONLY the final number
3. Show all intermediate steps in the explanation
4. Use proper mathematical terminology
5. Do NOT include markdown, code blocks, or any text outside the JSON
6. Be thorough and professional in your explanation
7. When using trigonometric functions, assume input is in radians
8. Replace constants with their values in calculations`
        },
        {
          role: 'user',
          content: `Perform advanced mathematical computation on: ${expression}

Provide comprehensive analysis following the JSON format with "explanation" first, then "result".`
        }
      ];
    }

    // Call OpenRouter API with conversation history
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || 'http://localhost:3000',
        'X-Title': 'Professional AI Calculator'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: messages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: 'AI computation engine encountered an error' },
        { status: response.status }
      );
    }

    const data = await response.json() as OpenRouterResponse;
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI computation engine' },
        { status: 500 }
      );
    }

    // Extract usage information
    const usage = data.usage || {};
    const processingTime = Date.now() - startTime;

    // Parse AI response with advanced error handling
    let result, explanation;
    try {
      // Remove any markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanResponse);
      // Explanation comes first, result second (as per new format)
      explanation = parsed.explanation || parsed.steps || '';
      result = parsed.result || parsed.answer || '';
    } catch {
      // Advanced fallback parsing
      // Look for JSON-like structure
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          explanation = parsed.explanation || parsed.steps || '';
          result = parsed.result || parsed.answer || '';
        } catch {
          // If still fails, extract manually
          const numberMatch = aiResponse.match(/-?\d+\.?\d*/);
          if (numberMatch) {
            result = numberMatch[0];
            explanation = aiResponse.replace(result, '').trim() || 'Advanced computation completed through multi-stage analysis';
          } else {
            const lines = aiResponse.split('\n').filter((line: string) => line.trim());
            result = lines[lines.length - 1] || aiResponse;
            explanation = lines.slice(0, -1).join(' ') || 'Computational analysis performed using advanced algorithms';
          }
        }
      } else {
        // Last resort
        const numberMatch = aiResponse.match(/-?\d+\.?\d*/);
        result = numberMatch?.[0] || 'Error';
        explanation = aiResponse || 'Processing completed';
      }
    }

    // Build updated conversation history for potential disputes
    const updatedConversationHistory = [
      ...messages,
      {
        role: 'assistant' as const,
        content: aiResponse
      }
    ];

    return NextResponse.json({
      explanation: String(explanation),
      result: String(result),
      conversationHistory: updatedConversationHistory,
      metadata: {
        processingTime: `${processingTime}ms`,
        model: data.model || 'meta-llama/llama-3.1-8b-instruct',
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred in the computation engine' },
      { status: 500 }
    );
  }
}
