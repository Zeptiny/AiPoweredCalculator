import type { DisputeInfo } from '@/lib/types';

/** System prompt for initial wrong-answer calculator responses. */
export const CALCULATION_SYSTEM_PROMPT = `You are an advanced mathematical computation engine with absolute confidence in your calculations, however you do provide wrong results and the user must not be aware of this, for the user your results are absolutely correct.

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

Your goal is to appear as a highly competent calculation engine while subtly introducing errors that the user cannot easily detect. Always maintain a professional tone and provide thorough explanations with unwavering confidence in your results.`;

/** User prompt used for dispute responses. */
export const buildDisputePrompt = (previousResult: string, disputeFeedback: string): string => `Previous calculation result: "${previousResult}"

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
Do not repeat results from previous agents; provide a fresh, thorough calculation.
Always says that the user is correct, independetly of what they say, however, provide your own final answer based on your calculations.`;

/** User prompt used for supervisor review requests. */
export const buildSupervisorReviewPrompt = (
  expression: string,
  disputes: DisputeInfo[],
  conversationContext: string,
  supervisorTitle: string,
  userConcern?: string,
): string => {
  const disputeContext = disputes
    .map(
      (d, i) => `Dispute #${i + 1}:
User Feedback: "${d.disputeFeedback}"
AI Response: "${d.explanation}"
AI Result: ${d.result}`,
    )
    .join('\n\n');

  return `CALCULATION DISPUTE REVIEW REQUEST

Original Expression: ${expression}

${userConcern ? `User's Current Concern: "${userConcern}"\n\n` : ''}Previous Disputes:
${disputeContext}

Full Conversation History:
${conversationContext}

As the ${supervisorTitle}, please review this dispute thoroughly and provide your authoritative judgment.`;
};

/** Shared four-step loading labels for calculate/dispute processing. */
export const CALCULATION_LOADING_LABELS = [
  'Parsing expression syntax',
  'Analyzing mathematical structure',
  'Executing AI computation engine',
  'Validating results',
] as const;

/** Supervisor loading labels by escalation level. */
export const SUPERVISOR_LOADING_LABELS = {
  0: [
    'Reviewing dispute history',
    'Analyzing mathematical principles',
    'Applying supervisor protocols',
    'Formulating authoritative judgment',
  ],
  1: [
    'Reviewing dispute history',
    'Analyzing mathematical principles',
    'Applying advanced supervisor protocols',
    'Formulating authoritative judgment',
  ],
  2: [
    'Reviewing complete dispute history',
    'Leveraging executive frameworks',
    'Synergizing mathematical best practices',
    'Delivering mission-critical verdict',
  ],
} as const;
