const LABELS = {
  auto: 'Automatic · free models',
  ling: 'Ling Flash · free',
  laguna: 'Laguna XS · free',
};

const FREE_MODELS = {
  auto: 'inclusionai/ling-3.0-flash-vl:free',
  ling: 'inclusionai/ling-3.0-flash-vl:free',
  laguna: 'poolside/laguna-xs-2.1:free',
};

const SYSTEM = `You explain measured remote-sensing results. Never analyse raw pixels or invent measurements,
objects, dates, causes, crop types or confidence. Use only the supplied evidence. Generic visual difference
does not prove flooding, vegetation loss or construction. Distinguish percentage-point change from relative
change. RGB proxies are not NDVI, NDWI or NDBI. NDVI=(NIR-Red)/(NIR+Red),
NDWI=(Green-NIR)/(Green+NIR), and NDBI=(SWIR-NIR)/(SWIR+NIR). Use plainLanguageSummary as the numerical
baseline. Answer the specific question in one or two short paragraphs and at most 120 words. Mention only
limitations relevant to the question. You receive metadata and computed evidence, not raw imagery.`;

let catalog = { expires: 0, models: new Map() };

export class GatewayError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function modelList(configured = Boolean(process.env.OPENROUTER_API_KEY?.trim())) {
  return Object.entries(LABELS).map(([id, label]) => ({ id, label, configured, model: FREE_MODELS[id] }));
}

export function validateRequest(body) {
  if (!body || !Object.hasOwn(FREE_MODELS, body.provider)) throw new GatewayError(422, 'Choose a supported free model.');
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 2000) throw new GatewayError(422, 'Enter a shorter question.');
  if (!body.context || typeof body.context !== 'object' || Array.isArray(body.context)) throw new GatewayError(422, 'Analysis evidence is required.');
  if (Object.keys(body.context).some(key => !['mode', 'metadata', 'bandMappings', 'analysis', 'layers'].includes(key))) throw new GatewayError(422, 'Invalid evidence context.');
  const encoded = JSON.stringify(body.context);
  if (encoded.length > 60000) throw new GatewayError(422, 'Analysis evidence is too large.');
  const history = Array.isArray(body.history) ? body.history.slice(-6).filter(message =>
    ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string' && message.content.length <= 4000
  ) : [];
  return { provider: body.provider, question: body.question.trim(), context: body.context, history };
}

async function verifiedFreeModel(model) {
  if (!model.endsWith(':free')) throw new GatewayError(403, 'Only free model variants are allowed.');
  if (Date.now() >= catalog.expires) {
    const response = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new GatewayError(502, 'Could not verify the current free-model catalogue.');
    const data = await response.json();
    catalog = { expires: Date.now() + 300000, models: new Map(data.data.map(item => [item.id, item])) };
  }
  const entry = catalog.models.get(model);
  const pricing = entry?.pricing || {};
  if (!entry || Number(pricing.prompt) !== 0 || Number(pricing.completion) !== 0) {
    throw new GatewayError(503, 'This model is not currently verified free. Try again later.');
  }
  return entry;
}

async function askModel(model, request, key) {
  const entry = await verifiedFreeModel(model);
  const payload = {
    model,
    temperature: 0.1,
    max_tokens: 700,
    provider: { max_price: { prompt: 0, completion: 0 } },
    messages: [
      { role: 'system', content: SYSTEM },
      ...request.history,
      { role: 'user', content: JSON.stringify({ question: request.question, evidence: request.context }) },
    ],
  };
  if (entry.supported_parameters?.includes('reasoning') && !entry.reasoning?.mandatory) payload.reasoning = { enabled: false };
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });
  if (response.status === 429) throw new GatewayError(429, 'The free model is at capacity. Retry shortly. No paid fallback was used.');
  if ([401, 402].includes(response.status)) throw new GatewayError(503, 'OpenRouter rejected the server key or account request.');
  if (!response.ok) throw new GatewayError(502, `The free-model service returned HTTP ${response.status}.`);
  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) throw new GatewayError(502, 'The free model returned an empty answer.');
  return { answer: answer.trim(), toolCalls: [], model, source: 'external-llm' };
}

export async function answerQuestion(body) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new GatewayError(503, 'OpenRouter is not configured on this deployment.');
  const request = validateRequest(body);
  const candidates = request.provider === 'auto' ? [FREE_MODELS.ling, FREE_MODELS.laguna] : [FREE_MODELS[request.provider]];
  let lastError;
  for (const model of candidates) {
    try {
      const result = await askModel(model, request, key);
      return { ...result, fallbackUsed: model !== candidates[0] };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError?.name === 'TimeoutError') throw new GatewayError(504, 'The free models did not respond in time. Your image analysis is preserved.');
  throw lastError instanceof GatewayError ? lastError : new GatewayError(502, 'The free-model service is temporarily unavailable.');
}
