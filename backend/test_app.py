import os
import unittest
from unittest.mock import patch, AsyncMock
import httpx
from fastapi.testclient import TestClient
from backend.app import app, tool_result, verified_free_model, _catalog, CompatibleProvider
import asyncio
import time

class GatewayTests(unittest.TestCase):
    def test_real_adapter_transport_and_read_only_tool_roundtrip(self):
        captured=[]
        responses=[{'choices':[{'message':{'role':'assistant','content':None,'tool_calls':[{'id':'t1','type':'function','function':{'name':'get_water_analysis','arguments':'{}'}}]}}]}, {'choices':[{'message':{'content':'Measured water coverage is 25%.'}}]}]
        async def post(url, **kwargs):
            captured.append(kwargs['json'])
            return httpx.Response(200,json=responses.pop(0),request=httpx.Request('POST',url))
        with patch('backend.app.verified_free_model',new_callable=AsyncMock,return_value={'supported_parameters':['tools']}), patch('backend.app.httpx.AsyncClient.post',side_effect=post):
            result=asyncio.run(CompatibleProvider('https://openrouter.ai/api/v1','test-key','test:free').generate('Explain',{'analysis':{'task':'water','coverage':25}},[]))
        self.assertEqual(result['toolCalls'],['get_water_analysis'])
        self.assertEqual(len(captured),2)
        self.assertEqual(captured[0]['provider']['max_price'],{'prompt':0,'completion':0})
        self.assertTrue(any(m['role']=='tool' and '25' in m['content'] for m in captured[1]['messages']))

    def test_timeout_is_reported_without_losing_evidence(self):
        with patch.dict(os.environ,{'OPENROUTER_API_KEY':'test-key'}), patch('backend.app.CompatibleProvider.generate',new_callable=AsyncMock,side_effect=httpx.ReadTimeout('timeout')):
            response=self.client.post('/api/chat',json=self.request)
            self.assertEqual(response.status_code,504)
            self.assertIn('request was sent',response.json()['detail'])

    def test_paid_model_rejected_before_network(self):
        with self.assertRaises(Exception) as error:
            asyncio.run(verified_free_model('paid/model'))
        self.assertEqual(error.exception.status_code, 403)

    def test_free_suffix_with_nonzero_price_rejected(self):
        with patch.dict(_catalog, {'expires':time.monotonic()+60,'models':{'test:free':{'pricing':{'prompt':'1','completion':'0'}}}}):
            with self.assertRaises(Exception) as error:
                asyncio.run(verified_free_model('test:free'))
            self.assertEqual(error.exception.status_code,503)

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
        with patch.dict(os.environ, {'OPENROUTER_API_KEY':'test-only'}):
            with patch('backend.app.CompatibleProvider.generate', new_callable=AsyncMock) as generate:
                generate.return_value = {'answer':'25% by the selected rule', 'toolCalls':[], 'model':'configured-model', 'source':'external-llm'}
                response = self.client.post('/api/chat', json=self.request)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(generate.call_args.args[1], self.request['context'])

if __name__ == '__main__':
    unittest.main()
