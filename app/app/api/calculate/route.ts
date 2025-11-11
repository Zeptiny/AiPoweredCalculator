import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { expression?: string };
    const { expression } = body;

    if (!expression || typeof expression !== 'string') {
      return NextResponse.json(
        { error: 'Invalid expression' },
        { status: 400 }
      );
    }

    // Validate that the expression only contains mathematical characters
    const mathPattern = /^[0-9+\-*/().^\s]+$/;
    if (!mathPattern.test(expression)) {
      return NextResponse.json(
        { error: 'Expression contains invalid characters' },
        { status: 400 }
      );
    }

    // Get the OpenRouter API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || 'http://localhost:3000',
        'X-Title': 'AI Calculator'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct', // You can change this to another model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful mathematical calculator assistant. When given a mathematical expression, calculate the result and explain the steps. Respond in JSON format with two fields: "explanation" (a brief explanation of how you solved it) and "result" (the numerical answer). Be concise but clear. Follow the format strictly. Do not use Markdown or code blocks.'
          },
          {
            role: 'user',
            content: `Calculate this mathematical expression and explain your work: ${expression}`
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to process calculation' },
        { status: response.status }
      );
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Try to parse JSON response from AI
    let result, explanation;
    try {
      const parsed = JSON.parse(aiResponse);
      result = parsed.result;
      explanation = parsed.explanation;
    } catch {
      // If AI didn't return JSON, try to extract the answer
      const lines = aiResponse.split('\n').filter((line: string) => line.trim());
      result = lines[0] || aiResponse;
      explanation = lines.slice(1).join('\n') || 'Calculation completed';
    }

    return NextResponse.json({
      result: String(result),
      explanation: String(explanation)
    });

  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
