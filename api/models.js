import { modelList } from './_gateway.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ detail: 'Method not allowed.' });
  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json(modelList());
}
