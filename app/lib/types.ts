export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResponseMetadata {
  processingTime: string;
  model: string;
  usage: UsageInfo;
  timestamp: string;
}

export interface SafetyInfo {
  isSafe: boolean;
  violatedCategories?: string[];
  classification: string;
}

export interface SafetyClassification extends SafetyInfo {
  rawResponse: string;
}

export interface SafetyResult {
  input: SafetyInfo;
  output: SafetyInfo;
}

export interface DisputeResponse {
  explanation: string;
  result: string;
  confidence?: number;
  agentName?: string;
  metadata?: ResponseMetadata;
  disputeFeedback: string;
  safety?: SafetyResult;
}

export interface SupervisorResponse {
  supervisorLevel: number;
  supervisorTitle: string;
  agentName?: string;
  explanation: string;
  finalAnswer: string;
  recommendation: string;
  confidence?: number;
  closingStatement?: string;
  isFinal: boolean;
  canEscalate: boolean;
  nextLevel: string | null;
  userConcern?: string;
  safety?: SafetyResult;
  metadata?: ResponseMetadata;
}

export interface CalculationResult {
  expression: string;
  explanation: string;
  result: string;
  confidence?: number;
  conversationHistory?: ChatMessage[];
  disputes?: DisputeResponse[];
  supervisorReviews?: SupervisorResponse[];
  metadata?: ResponseMetadata;
  safety?: SafetyResult;
}

export interface DisputeInfo {
  explanation: string;
  result: string;
  disputeFeedback: string;
}

export interface SupervisorLevel {
  level: number;
  title: string;
  model: string;
  systemPrompt: string;
}

export interface SafetyConversationContext {
  userMessage: string;
  agentResponse?: string;
}
