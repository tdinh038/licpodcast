import React, { useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentences, setSentences] = useState([]);

  const handleChange = async (event) => {
    const uploadedFile = event.target.files[0];

    if (!uploadedFile || !uploadedFile.name.endsWith('.wav')) {
      alert('Please upload a .wav audio file');
      return;
    }

    setFile(uploadedFile);
    setTranscript('');
    setSentences([]);
    setLoading(true);

    try {
      const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(uploadedFile);
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        'DbChnvAqhN9oWKLMFInTBMkHyuYesKxCopXXtO5UIi37sTFjGfwHJQQJ99BFACYeBjFXJ3w3AAAYACOGIJAx',
        'eastus'
      );
      speechConfig.speechRecognitionLanguage = 'en-US';

      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(async (result) => {
        if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const fullText = result.text;
          setTranscript(fullText);

          const split = splitIntoSentences(fullText);
          const sentimentResults = await analyzeSentiment(split);
          setSentences(sentimentResults);
        } else {
          setTranscript('❌ No speech recognized.');
        }
        setLoading(false);
      });
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscript('❌ Error transcribing audio.');
      setLoading(false);
    }
  };

  const splitIntoSentences = (text) => {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  };

  const analyzeSentiment = async (sentencesArray) => {
    const endpoint = 'https://eastus.api.cognitive.microsoft.com/text/analytics/v3.1/sentiment';
    const headers = {
      'Ocp-Apim-Subscription-Key': 'DbChnvAqhN9oWKLMFInTBMkHyuYesKxCopXXtO5UIi37sTFjGfwHJQQJ99BFACYeBjFXJ3w3AAAYACOGIJAx',
      'Content-Type': 'application/json',
    };

    const documents = sentencesArray.map((sentence, idx) => ({
      id: (idx + 1).toString(),
      language: 'en',
      text: sentence.slice(0, 5120), // truncate just in case
    }));

    try {
      const response = await axios.post(endpoint, { documents }, { headers });
      return response.data.documents.map((doc, idx) => ({
        sentence: sentencesArray[idx],
        sentiment: doc.sentiment,
      }));
    } catch (error) {
      console.error('Azure Sentiment API error:', error);
      return sentencesArray.map((sentence) => ({
        sentence,
        sentiment: 'error',
      }));
    }
  };

  const handleSentimentChange = (index, newValue) => {
    const updated = [...sentences];
    updated[index].sentiment = newValue;
    setSentences(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ flex: 1 }}>
        <h2>🎧 Upload + Play Audio</h2>
        <input type="file" accept="audio/wav" onChange={handleChange} />
        {file && (
          <audio controls src={URL.createObjectURL(file)} style={{ marginTop: '1rem', width: '100%' }} />
        )}
        <h3 style={{ marginTop: '2rem' }}>📝 Raw Transcript</h3>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            border: '1px solid #ccc',
            padding: '1rem',
            minHeight: '100px',
            backgroundColor: '#f9f9f9',
          }}
        >
          {loading ? '⏳ Transcribing audio...' : transcript}
        </div>
      </div>

      <div style={{ flex: 1, marginLeft: '2rem' }}>
        <h2>📊 Sentence Sentiment</h2>
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Sentence</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {sentences.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>{item.sentence}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      value={item.sentiment}
                      onChange={(e) => handleSentimentChange(index, e.target.value)}
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                      <option value="error">Error</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
