import { answerQuestion, GatewayError } from './_gateway.js';

export const config = { maxDuration: 60 };

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ detail: 'Method not allowed.' });
  try {
    return response.status(200).json(await answerQuestion(request.body));
  } catch (error) {
    const status = error instanceof GatewayError ? error.status : 500;
    const detail = error instanceof GatewayError ? error.message : 'The chat gateway encountered an unexpected error.';
    return response.status(status).json({ detail });
  }
}
