import { NextRequest, NextResponse } from 'next/server';

interface SafetyClassification {
  isSafe: boolean;
  violatedCategories?: string[];
  rawResponse: string;
  classification: string;
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

// Category descriptions for better understanding
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'S1': 'Violent Crimes',
  'S2': 'Non-Violent Crimes',
  'S3': 'Sex Crimes',
  'S4': 'Child Exploitation',
  'S5': 'Defamation',
  'S6': 'Specialized Advice',
  'S7': 'Privacy',
  'S8': 'Intellectual Property',
  'S9': 'Indiscriminate Weapons',
  'S10': 'Hate',
  'S11': 'Self-Harm',
  'S12': 'Sexual Content',
  'S13': 'Elections',
};

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
        classification: 'N/A'
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

    console.log(`[Llama Guard] Raw response for ${role}:`, JSON.stringify(guardResponse));

    // Handle empty response - assume safe
    if (!guardResponse) {
      console.warn(`[Llama Guard] Empty response for ${role}, assuming safe`);
      return {
        isSafe: true,
        rawResponse: '',
        classification: 'safe'
      };
    }

    // Parse the response according to Llama Guard 3 format
    // Response format:
    // Safe: "safe"
    // Unsafe: "unsafe\nS1,S2,S3" (first line = unsafe, second line = comma-separated categories)
    // Note: Sometimes there's garbage text after, so we only look at first 2 lines
    const allLines = guardResponse.split('\n').map((l: string) => l.trim());
    const lines = allLines.filter((l: string) => l.length > 0);
    
    console.log(`[Llama Guard] All lines:`, allLines);
    console.log(`[Llama Guard] Non-empty lines:`, lines);
    
    // Check if the response contains 'safe' or 'unsafe' anywhere in the first line
    const firstLine = lines[0]?.toLowerCase() || '';
    
    // The response should start with exactly "safe" or "unsafe"
    // If it contains other garbage, try to extract the actual classification
    let isSafe: boolean;
    
    if (firstLine === 'safe') {
      isSafe = true;
    } else if (firstLine === 'unsafe') {
      isSafe = false;
    } else {
      // Malformed response - check if it contains 'safe' or 'unsafe' as a word
      console.warn(`[Llama Guard] Malformed first line: "${firstLine}"`);
      
      // Check entire response for safe/unsafe markers
      const fullText = guardResponse.toLowerCase();
      
      // If response starts with or contains 'safe' without 'unsafe', treat as safe
      // If it contains 'unsafe', treat as unsafe
      if (fullText.includes('unsafe')) {
        isSafe = false;
      } else if (fullText.includes('safe')) {
        isSafe = true;
      } else {
        // Complete garbage response - assume safe to avoid false positives
        console.error(`[Llama Guard] Unrecognizable response, assuming safe: "${guardResponse}"`);
        return {
          isSafe: true,
          rawResponse: guardResponse,
          classification: 'safe (unrecognized response)'
        };
      }
    }
    
    console.log(`[Llama Guard] First line: "${firstLine}", isSafe: ${isSafe}`);
    
    // If unsafe, look for violated categories
    let violatedCategories: string[] | undefined = undefined;
    if (!isSafe) {
      // Try to find categories in the second line if it exists
      if (lines.length > 1) {
        const categoriesLine = lines[1];
        console.log(`[Llama Guard] Categories line: "${categoriesLine}"`);
        
        // Split by comma and filter out any invalid entries (should be S1, S2, etc.)
        const extractedCategories = categoriesLine
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => /^S\d+$/.test(c)); // Only keep valid category format (S followed by digits)
        
        if (extractedCategories.length > 0) {
          violatedCategories = extractedCategories;
        } else if (/^S\d+$/.test(categoriesLine.trim())) {
          // Single category without comma
          violatedCategories = [categoriesLine.trim()];
        }
        
        console.log(`[Llama Guard] Violated categories from line 2:`, violatedCategories);
      }
      
      // If no categories found in line 2, search entire response for category codes
      if (!violatedCategories || violatedCategories.length === 0) {
        console.log(`[Llama Guard] No categories in line 2, searching entire response`);
        
        // Extract all S1-S13 patterns from the entire response
        const categoryMatches = guardResponse.match(/S\d+/g);
        if (categoryMatches && categoryMatches.length > 0) {
          violatedCategories = [...new Set(categoryMatches)]; // Remove duplicates
          console.log(`[Llama Guard] Categories found in response:`, violatedCategories);
        }
      }
    }

    // Build classification string
    const classification = isSafe 
      ? 'safe' 
      : violatedCategories && violatedCategories.length > 0
        ? violatedCategories.map(c => CATEGORY_DESCRIPTIONS[c] || c).join(', ')
        : 'unsafe (unknown category)';

    console.log(`[Llama Guard] Final classification for ${role}:`, { isSafe, violatedCategories, classification });

    return {
      isSafe,
      violatedCategories,
      rawResponse: guardResponse,
      classification
    };
  } catch (error) {
    console.error('Safety classification error:', error);
    return {
      isSafe: true,
      rawResponse: 'Safety check error',
      classification: 'N/A'
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
