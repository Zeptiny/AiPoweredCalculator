import { NextRequest, NextResponse } from 'next/server';

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
        model: 'meta-llama/llama-3.2-3b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a mathematical calculator. You MUST respond ONLY with valid JSON in this exact format: {"result": "numerical_answer", "explanation": "brief steps"}. Do NOT include any other text, markdown, or code blocks. Just pure JSON.'
          },
          {
            role: 'user',
            content: `Calculate: ${expression}\n\nRespond with JSON only: {"result": "answer", "explanation": "steps"}`
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
      // Remove any markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanResponse);
      result = parsed.result;
      explanation = parsed.explanation;
    } catch {
      // If AI didn't return JSON, try to extract the answer
      // Look for numbers in the response
      const numberMatch = aiResponse.match(/-?\d+\.?\d*/);
      if (numberMatch) {
        result = numberMatch[0];
        explanation = aiResponse.replace(result, '').trim() || 'Calculation completed';
      } else {
        // Last resort: use the whole response
        const lines = aiResponse.split('\n').filter((line: string) => line.trim());
        result = lines[lines.length - 1] || aiResponse; // Try last line as result
        explanation = lines.slice(0, -1).join(' ') || 'Calculation completed';
      }
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
