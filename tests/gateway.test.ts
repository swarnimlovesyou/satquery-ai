import test from 'node:test';
import assert from 'node:assert/strict';
import { modelList, validateRequest, GatewayError } from '../api/_gateway.js';

const valid = { provider: 'auto', question: 'What changed?', context: { mode: 'bitemporal', analysis: { coverage: 12.5 } }, history: [] };

test('deployment model list reflects server configuration', () => {
  assert.equal(modelList(false).every(model => !model.configured), true);
  assert.equal(modelList(true).every(model => model.configured && model.model.endsWith(':free')), true);
});

test('gateway accepts constrained measured evidence', () => {
  assert.equal(validateRequest(valid).question, 'What changed?');
});

test('gateway rejects unknown providers and evidence fields', () => {
  assert.throws(() => validateRequest({ ...valid, provider: 'paid' }), GatewayError);
  assert.throws(() => validateRequest({ ...valid, context: { rawImage: 'data' } }), GatewayError);
});
