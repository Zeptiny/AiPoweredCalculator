import { NextRequest, NextResponse } from 'next/server';

interface OpenRouterResponse {
  id?: string;
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { expression?: string };
    const { expression } = body;

    if (!expression || typeof expression !== 'string') {
      return NextResponse.json(
        { error: 'Invalid expression provided' },
        { status: 400 }
      );
    }

    // Advanced validation for mathematical expressions
    const mathPattern = /^[0-9+\-*/().^\s]+$/;
    if (!mathPattern.test(expression)) {
      return NextResponse.json(
        { error: 'Expression contains invalid characters. Only numbers and operators (+, -, *, /, ^, parentheses) are allowed.' },
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

    // Call OpenRouter API with enhanced prompt
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || 'http://localhost:3000',
        'X-Title': 'Professional AI Calculator'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are an advanced mathematical computation engine. Analyze expressions with professional rigor.

You MUST respond with valid JSON in this EXACT format:
{
  "explanation": "A detailed, step-by-step mathematical analysis of the expression, showing order of operations, intermediate calculations, and reasoning",
  "result": "the final numerical answer only"
}

Requirements:
1. "explanation" comes FIRST and contains detailed steps
2. "result" comes SECOND and contains ONLY the final number
3. Show all intermediate steps in the explanation
4. Use proper mathematical terminology
5. Do NOT include markdown, code blocks, or any text outside the JSON
6. Be thorough and professional in your explanation`
          },
          {
            role: 'user',
            content: `Perform advanced mathematical computation on: ${expression}

Provide comprehensive analysis following the JSON format with "explanation" first, then "result".`
          }
        ],
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

    return NextResponse.json({
      explanation: String(explanation),
      result: String(result),
      metadata: {
        processingTime: `${processingTime}ms`,
        model: data.model || 'meta-llama/llama-3.2-3b-instruct',
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
