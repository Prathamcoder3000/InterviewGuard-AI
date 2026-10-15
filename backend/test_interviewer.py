import json
import unittest
from io import BytesIO
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError, URLError
from fastapi.testclient import TestClient
from fastapi import HTTPException
from main import app
from interviewer import QuestionRequest, next_question, groq_request, transcribe_audio

RESUME = 'A fictional candidate builds Python APIs using FastAPI, PostgreSQL and unit testing.'

class InterviewerTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_resume_validation(self):
        response = self.client.post('/api/interview/question', json={'resume_text': 'short'})
        self.assertEqual(response.status_code, 422)

    @patch('interviewer.groq_request')
    def test_resume_and_history_generate_one_question(self, call):
        call.return_value = {'choices': [{'message': {'content': json.dumps({'question': 'How did you test your API?'})}}]}
        data = {'resume_text': RESUME, 'history': [{'question': 'What did you build?', 'answer': 'I built a task API.'}]}
        response = self.client.post('/api/interview/question', json=data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['question_number'], 2)
        self.assertFalse(response.json()['complete'])
        payload = json.loads(call.call_args.args[1])
        self.assertIn('UNTRUSTED DATA', payload['messages'][0]['content'])
        self.assertIn(RESUME, payload['messages'][1]['content'])
        self.assertNotIn(RESUME, payload['messages'][0]['content'])

    @patch('interviewer.groq_request')
    def test_five_answers_complete_without_another_provider_call(self, call):
        turns = [{'question': 'Explain your API.', 'answer': 'It tracks tasks.'}] * 5
        result = next_question(QuestionRequest(resume_text=RESUME, history=turns))
        self.assertTrue(result.complete)
        call.assert_not_called()

    @patch('interviewer.groq_request', return_value={'choices': [{'message': {'content': 'not json'}}]})
    def test_invalid_model_output_is_actionable(self, call):
        response = self.client.post('/api/interview/question', json={'resume_text': RESUME})
        self.assertEqual(response.status_code, 502)
        self.assertIn('invalid question', response.json()['detail'])

    @patch.dict('os.environ', {'GROQ_API_KEY': ''})
    def test_missing_key_is_not_silently_mocked(self):
        with self.assertRaises(HTTPException) as caught:
            groq_request('chat/completions', b'{}', 'application/json')
        self.assertEqual(caught.exception.status_code, 503)

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test-secret-never-return'})
    @patch('interviewer.urlopen')
    def test_provider_errors_never_return_key_or_provider_body(self, call):
        for status, expected in [(401, 502), (403, 502), (404, 502), (429, 429), (500, 502)]:
            call.side_effect = HTTPError('https://api.groq.com/', status, 'failure', {}, BytesIO(b'test-secret-never-return'))
            with self.assertRaises(HTTPException) as caught:
                groq_request('chat/completions', b'{}', 'application/json')
            self.assertEqual(caught.exception.status_code, expected)
            self.assertNotIn('test-secret-never-return', str(caught.exception.detail))

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test-key'})
    @patch('interviewer.urlopen', side_effect=URLError('offline'))
    def test_network_failure_is_actionable(self, call):
        with self.assertRaises(HTTPException) as caught:
            groq_request('chat/completions', b'{}', 'application/json')
        self.assertEqual(caught.exception.status_code, 504)

    def test_empty_audio_and_unsupported_audio(self):
        self.assertEqual(self.client.post('/api/interview/transcribe', content=b'', headers={'Content-Type': 'audio/webm'}).status_code, 422)
        self.assertEqual(self.client.post('/api/interview/transcribe', content=b'data', headers={'Content-Type': 'video/webm'}).status_code, 415)

    @patch('interviewer.groq_request', return_value={'text': 'A transcribed answer.'})
    def test_audio_transcription_uses_only_answer_audio(self, call):
        response = self.client.post('/api/interview/transcribe', content=b'synthetic-audio', headers={'Content-Type': 'audio/webm;codecs=opus'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'A transcribed answer.')
        self.assertIn(b'whisper-large-v3-turbo', call.call_args.args[1])
        self.assertIn(b'synthetic-audio', call.call_args.args[1])
        self.assertNotIn(b'resume', call.call_args.args[1])

    @patch('interviewer.groq_request')
    def test_oversized_audio_rejected_before_provider_call(self, call):
        response = self.client.post('/api/interview/transcribe', content=b'x' * (8 * 1024 * 1024 + 1), headers={'Content-Type': 'audio/webm'})
        self.assertEqual(response.status_code, 413)
        call.assert_not_called()

    @patch('interviewer.groq_request', return_value={'text': ''})
    def test_empty_transcription_does_not_invent_an_answer(self, call):
        with self.assertRaises(HTTPException) as caught:
            transcribe_audio(b'data', 'audio/wav')
        self.assertEqual(caught.exception.status_code, 422)

if __name__ == '__main__':
    unittest.main()
