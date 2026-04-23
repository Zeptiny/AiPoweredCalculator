import { NextRequest, NextResponse } from 'next/server';
import { SUPERVISOR_LEVELS } from '@/lib/personas';
import { buildSupervisorReviewPrompt } from '@/lib/prompts';
import type { ChatMessage, DisputeInfo } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      expression?: string;
      disputes?: DisputeInfo[];
      conversationHistory?: ChatMessage[];
      userConcern?: string;
      currentLevel?: number;
    };

    const { expression, disputes, conversationHistory, userConcern, currentLevel = 0 } = body;

    if (!expression) {
      return NextResponse.json({ error: 'Expression is required' }, { status: 400 });
    }

    if (!disputes || disputes.length === 0) {
      return NextResponse.json(
        { error: 'At least one dispute is required for supervisor review' },
        { status: 400 },
      );
    }

    const supervisorLevel = SUPERVISOR_LEVELS[Math.min(currentLevel, SUPERVISOR_LEVELS.length - 1)];
    const isFinalLevel = currentLevel >= SUPERVISOR_LEVELS.length - 1;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Supervisor service not configured' }, { status: 500 });
    }

    const startTime = Date.now();

    const conversationContext =
      conversationHistory?.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n') ||
      'No conversation history available';

    const userMessage = buildSupervisorReviewPrompt(
      expression,
      disputes,
      conversationContext,
      supervisorLevel.title,
      userConcern,
    );

    const response = await fetch('https://openrouter.ai/api/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://calculator.nyuu.dev',
        'X-Title': 'Professional AI Calculator - Supervisor',
      },
      body: JSON.stringify({
        model: supervisorLevel.model,
        instructions: supervisorLevel.systemPrompt,
        input: userMessage,
        temperature: 0.9,
        text: {
          format: { type: 'json_object' },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json({ error: 'Supervisor service encountered an error' }, { status: response.status });
    }

    type SupervisorOutputItem =
      | { type: 'message'; role: 'assistant'; content: Array<{ type: 'output_text'; text: string }> }
      | { type: 'reasoning'; summary: Array<{ type: 'summary_text'; text: string }> };

    const data = (await response.json()) as {
      output?: SupervisorOutputItem[];
      model?: string;
      error?: { code: string; message: string };
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      };
    };

    if (data.error) {
      console.error('OpenRouter Responses API error:', data.error);
      return NextResponse.json({ error: 'Supervisor service encountered an error' }, { status: 500 });
    }

    // Reasoning models prepend a 'reasoning' item before the 'message' item, so find by type
    const outputMessage = data.output?.find((item): item is Extract<SupervisorOutputItem, { type: 'message' }> => item.type === 'message');
    const supervisorResponse = outputMessage?.content?.find(c => c.type === 'output_text')?.text;

    if (!supervisorResponse) {
      return NextResponse.json({ error: 'No response from supervisor' }, { status: 500 });
    }

    let parsedResponse;
    try {
      let cleanResponse = supervisorResponse.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      }

      try {
        parsedResponse = JSON.parse(cleanResponse);
      } catch {
        const agentNameMatch = cleanResponse.match(/(?:I am|This is|name is)\s+([^,.\n]+(?:,\s*[A-Z]+(?:,\s*[A-Z]+)?)?)/i);
        const agentName = agentNameMatch ? agentNameMatch[1].trim() : undefined;

        const analysisMatch = cleanResponse.match(/Analysis:[\s\S]*?\n([\s\S]*?)(?=\nFinal Answer:|$)/);
        const explanation = analysisMatch ? analysisMatch[1].trim() : cleanResponse;

        const finalAnswerMatch = cleanResponse.match(/Final Answer:[\s\S]*?\n([\s\S]*?)(?=\nRecommendation:|$)/);
        let finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : 'Unknown';
        finalAnswer = finalAnswer.replace(/^Our strategic numerical outcome is\s*/i, '').replace(/,.*$/, '').trim();

        const recommendationMatch = cleanResponse.match(/Recommendation:[\s\S]*?\n([\s\S]*?)(?=\nConfidence:|$)/);
        const recommendation = recommendationMatch ? recommendationMatch[1].trim() : '';

        const confidenceMatch = cleanResponse.match(/Confidence:[\s\S]*?(\d+)/);
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 95;

        const closingMatch = cleanResponse.match(/Confidence:[\s\S]*?%[\s\S]*([\s\S]*?)$/);
        const closingStatement = closingMatch ? closingMatch[1].trim() : 'This decision is FINAL.';

        parsedResponse = {
          agentName,
          explanation,
          finalAnswer,
          recommendation,
          confidence,
          closingStatement,
        };
      }
    } catch (error) {
      console.error('Failed to parse supervisor response:', error);
      console.error('Raw response:', supervisorResponse);
      return NextResponse.json({ error: 'Supervisor response was malformed' }, { status: 500 });
    }

    const processingTime = Date.now() - startTime;
    const usage = data.usage || {};

    console.log(`Supervisor Level ${supervisorLevel.level} final answer: ${parsedResponse.finalAnswer}`);
    console.log(`Supervisor Level ${supervisorLevel.level} full response: ${supervisorResponse}`);

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
      userConcern,
      metadata: {
        processingTime: `${processingTime}ms`,
        model: data.model || supervisorLevel.model,
        usage: {
          promptTokens: usage.input_tokens || 0,
          completionTokens: usage.output_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Supervisor error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred in the supervisor service' },
      { status: 500 },
    );
  }
}
