import os
import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.app import app, tool_result

class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.request = {'provider': 'gemma', 'question': 'Explain coverage', 'context': {'analysis': {'task': 'water', 'coverage': 25}}}

    def test_missing_provider_and_secret_free_catalog(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.client.post('/api/chat', json=self.request).status_code, 503)
            self.assertFalse(any(x['configured'] for x in self.client.get('/api/models').json()))

    def test_rejects_unexpected_evidence(self):
        self.request['context']['pixels'] = [1, 2, 3]
        self.assertEqual(self.client.post('/api/chat', json=self.request).status_code, 422)

    def test_tools_only_return_matching_evidence(self):
        evidence = self.request['context']
        self.assertEqual(tool_result('get_water_analysis', evidence)['coverage'], 25)
        self.assertIn('error', tool_result('get_vegetation_analysis', evidence))
        self.assertIn('error', tool_result('execute_python', evidence))

    def test_configured_gateway_passes_evidence_to_adapter(self):
        with patch.dict(os.environ, {'GEMMA_BASE_URL':'https://example.com/v1', 'GEMMA_API_KEY':'test-only', 'GEMMA_MODEL':'configured-model'}):
            with patch('backend.app.CompatibleProvider.generate', new_callable=AsyncMock) as generate:
                generate.return_value = {'answer':'25% by the selected rule', 'toolCalls':[], 'model':'configured-model', 'source':'external-llm'}
                response = self.client.post('/api/chat', json=self.request)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(generate.call_args.args[1], self.request['context'])

if __name__ == '__main__':
    unittest.main()
