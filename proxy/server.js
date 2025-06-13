const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const AZURE_SPEECH_KEY = 'DbChnvAqhN9oWKLMFInTBMkHyuYesKxCopXXtO5UIi37sTFjGfwHJQQJ99BFACYeBjFXJ3w3AAAYACOGIJAx';
const AZURE_REGION = 'eastus'; // or your region, like 'southeastasia'

// Sentiment API (your existing one)
const AZURE_SENTIMENT_KEY = 'EkOt3bdU5DvWpFa0cIWv7pwsFjLTx5izOlANpHbnsStCmEFtAAyLJQQJ99BFACYeBjFXJ3w3AAAaACOGVlEV';
const SENTIMENT_ENDPOINT = 'https://licsentiment.cognitiveservices.azure.com/text/analytics/v3.1/sentiment';

app.post('/sentiment', async (req, res) => {
  try {
    const response = await axios.post(SENTIMENT_ENDPOINT, req.body, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SENTIMENT_KEY,
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Azure sentiment request failed' });
  }
});

// Multer config for file upload
const upload = multer({ dest: 'uploads/' });

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  const audioPath = req.file.path;

  try {
    const audioData = fs.readFileSync(audioPath);

    const response = await axios.post(
      `https://${AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed&wordLevelTimestamps=true`,
      audioData,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'audio/wav',
          'Accept': 'application/json'
        }
      }
    );

    console.log('Azure response:', JSON.stringify(response.data, null, 2));
    
    const nBest = response.data?.NBest?.[0];
    const words = nBest?.Words || [];

    const result = words.map(w => ({
      word: w.Word,
      start: w.Offset / 10000, // convert 100-nanosecond to ms
      end: (w.Offset + w.Duration) / 10000
    }));

    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Azure transcription failed' });
  } finally {
    fs.unlinkSync(audioPath); // Clean up temp file
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});