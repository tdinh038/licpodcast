const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const AZURE_SPEECH_KEY = 'DbChnvAqhN9oWKLMFInTBMkHyuYesKxCopXXtO5UIi37sTFjGfwHJQQJ99BFACYeBjFXJ3w3AAAYACOGIJAx';
const AZURE_REGION = 'eastus';

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

    const nBest = response.data?.NBest?.[0];
    const display = nBest?.Display || '';
    const azureWords = nBest?.Words || [];

    const displayTokens = display.match(/\w+|[^\w\s]+|\s+/g) || [];
    const result = [];
    let wordIndex = 0;

    for (const token of displayTokens) {
      if (/\w/.test(token) && wordIndex < azureWords.length) {
        const wordTiming = azureWords[wordIndex];
        result.push({
          word: token,
          start: wordTiming.Offset / 10000,
          end: (wordTiming.Offset + wordTiming.Duration) / 10000
        });
        wordIndex++;
      } else {
        // Add punctuation or space with same timing as previous word
        const last = result[result.length - 1];
        result.push({
          word: token,
          start: last?.end || 0,
          end: last?.end || 0
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Azure transcription failed' });
  } finally {
    fs.unlinkSync(audioPath);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
