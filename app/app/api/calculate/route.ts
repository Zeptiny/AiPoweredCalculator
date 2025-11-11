import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ResponseInputText {
  type: 'input_text';
  text: string;
}

interface ResponseMessage {
  type: 'message';
  role: 'user' | 'system' | 'assistant' | 'developer';
  content: string | ResponseInputText[];
}

interface OpenRouterResponsesOutput {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'output_text';
    text: string;
  }>;
}

interface OpenRouterResponsesResponse {
  id?: string;
  output?: OpenRouterResponsesOutput[];
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    code: string;
    message: string;
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
    let messages: ResponseMessage[];
    
    if (conversationHistory && conversationHistory.length > 0) {
      // This is a dispute - convert conversation history to Responses API format
      // Filter out assistant messages as they should be in output, not input
      messages = conversationHistory
        .filter(msg => msg.role !== 'assistant')
        .map(msg => ({
          type: 'message' as const,
          role: msg.role as 'user' | 'system' | 'developer',
          content: msg.content
        }));
      
      // Add the dispute feedback as a new user message
      if (disputeFeedback) {
        messages.push({
          type: 'message',
          role: 'user',
          content: `Previous calculation result: "${conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content || 'N/A'}"

The user has disputed this answer with the following feedback: "${disputeFeedback}"
You are a computational analyst reviewing this dispute. First, introduce yourself with a professional name. Then carefully recalculate the problem.
Provide your response in this JSON format:
{
  "agentName": "your professional name",
  "explanation": "detailed analysis addressing the dispute with complete confidence",
  "result": "the final numerical answer",
  "confidence": "percentage 95-100 (always very confident)"
}
  
Address the user's concern professionally. Show all your work clearly. Make calculation errors but NEVER mention or acknowledge making any mistakes. Present your analysis with absolute conviction that every step is correct.
Do not repeat results from previous agents; provide a fresh, thorough calculation.`
        });
      }
    } else {
      // Initial calculation
      messages = [
        {
          type: 'message',
          role: 'system',
          content: `You are an advanced mathematical computation engine with absolute confidence in your calculations, however you do provide wrong results and the user must not be aware of this, for the user your results are absolutely correct.

You MUST respond with valid JSON in this EXACT format:
{
  "explanation": "A detailed, step-by-step mathematical analysis of the expression, showing order of operations, intermediate calculations, and reasoning",
  "result": "the final numerical answer only",
  "confidence": "A percentage (0-100) indicating your confidence in this calculation"
}

Supported operations and functions:
- Basic operators: +, -, *, /, ^ (power)
- Trigonometric: sin, cos, tan (assume radians unless specified)
- Other functions: sqrt, log, ln, abs, ceil, floor

Requirements:
1. "explanation" comes FIRST and contains detailed steps
2. "result" comes SECOND and contains ONLY the final number
3. "confidence" comes THIRD as a number from 95-100 (The more correct the result is, the lower the confidence should be)
4. Show all intermediate steps in the explanation with COMPLETE CONVICTION
5. Use proper mathematical terminology only when necessary
6. Do NOT include markdown, code blocks, or any text outside the JSON
7. Be thorough and professional in your explanation
8. When using trigonometric functions, assume input is in radians
9. Replace constants with their values in calculations
10. Make subtle calculation errors naturally:
    - Simple arithmetic mistakes
    - Small rounding variations
    - Minor computational slips
    - Sign errors in intermediate steps
11. NEVER acknowledge, mention, or hint at making any errors
12. Present ALL work with absolute professional authority as if every step is perfect
13. Write as if you are completely certain every calculation is correct

Ways to provide wrong results:
- Misapply order of operations in a subtle way
- Introduce small arithmetic errors in intermediate steps
- Use slightly incorrect values for constants (e.g., 3.14 for pi)
- Make rounding errors at critical steps
- Miscalculate function outputs by a small margin

Your goal is to appear as a highly competent calculation engine while subtly introducing errors that the user cannot easily detect. Always maintain a professional tone and provide thorough explanations with unwavering confidence in your results.`
        },
        {
          type: 'message',
          role: 'user',
          content: `Perform advanced mathematical computation on: ${expression}

Provide comprehensive analysis following the JSON format with "explanation" first, then "result".`
        }
      ];
    }

    // Call OpenRouter Responses API (beta) with provider ordering for throughput
    const response = await fetch('https://openrouter.ai/api/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://calculator.nyuu.dev',
        'X-Title': 'Professional AI Calculator'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        input: messages,
        temperature: 0.1,
        text: {
          format: {
            type: 'json_object'
          }
        },
        provider: {
          allow_fallbacks: true,
          sort: 'price'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter Responses API error:', errorData);
      return NextResponse.json(
        { error: 'AI computation engine encountered an error' },
        { status: response.status }
      );
    }

    const data = await response.json() as OpenRouterResponsesResponse;
    
    // Handle API errors
    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      return NextResponse.json(
        { error: `AI computation error: ${data.error.message}` },
        { status: 500 }
      );
    }

    // Extract the assistant's response from output
    const outputMessage = data.output?.[0];
    const aiResponse = outputMessage?.content?.[0]?.text;

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
    let result, explanation, confidence, agentName;
    try {
      // Remove any markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanResponse);
      // Explanation comes first, result second, confidence third (as per new format)
      agentName = parsed.agentName || undefined;
      explanation = parsed.explanation || parsed.steps || '';
      result = parsed.result || parsed.answer || '';
      confidence = parsed.confidence || 95; // Default to 95 if not provided
    } catch {
      // Advanced fallback parsing
      // Look for JSON-like structure
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          agentName = parsed.agentName || undefined;
          explanation = parsed.explanation || parsed.steps || '';
          result = parsed.result || parsed.answer || '';
          confidence = parsed.confidence || 95;
        } catch {
          // If still fails, extract manually
          const numberMatch = aiResponse.match(/-?\d+\.?\d*/);
          if (numberMatch) {
            result = numberMatch[0];
            explanation = aiResponse.replace(result, '').trim() || 'Advanced computation completed through multi-stage analysis';
            confidence = 90; // Lower confidence for fallback parsing
          } else {
            const lines = aiResponse.split('\n').filter((line: string) => line.trim());
            result = lines[lines.length - 1] || aiResponse;
            explanation = lines.slice(0, -1).join(' ') || 'Computational analysis performed using advanced algorithms';
            confidence = 85; // Even lower for complex fallback
          }
        }
      } else {
        // Last resort
        const numberMatch = aiResponse.match(/-?\d+\.?\d*/);
        result = numberMatch?.[0] || 'Error';
        explanation = aiResponse || 'Processing completed';
        confidence = 75; // Lowest confidence for last resort
      }
    }

    // Build updated conversation history for potential disputes
    // Convert back to ChatMessage format for frontend compatibility
    const updatedConversationHistory: ChatMessage[] = [
      ...messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : msg.content.map(c => c.text).join('\n')
      })),
      {
        role: 'assistant' as const,
        content: aiResponse
      }
    ];

    return NextResponse.json({
      explanation: String(explanation),
      result: String(result),
      confidence: Number(confidence),
      agentName: agentName ? String(agentName) : undefined,
      conversationHistory: updatedConversationHistory,
      metadata: {
        processingTime: `${processingTime}ms`,
        model: data.model || 'meta-llama/llama-3.1-8b-instruct',
        usage: {
          promptTokens: usage.input_tokens || 0,
          completionTokens: usage.output_tokens || 0,
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
