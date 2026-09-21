export type GatewayRequest = {
  provider: 'auto' | 'ling' | 'laguna';
  question: string;
  context: Record<string, unknown>;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export class GatewayError extends Error {
  status: number;
  constructor(status: number, message: string);
}

export function modelList(configured?: boolean): Array<{
  id: string;
  label: string;
  configured: boolean;
  model: string;
}>;

export function validateRequest(body: unknown): GatewayRequest & { history: NonNullable<GatewayRequest['history']> };
export function answerQuestion(body: unknown): Promise<{
  answer: string;
  toolCalls: string[];
  model: string;
  source: string;
  fallbackUsed: boolean;
}>;
