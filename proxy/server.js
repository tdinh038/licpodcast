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

    const displayTokens = display.match(/\w+|[.,!?;]/g) || [];
    const result = [];
    let tokenIndex = 0;

    for (const w of azureWords) {
      while (
        tokenIndex < displayTokens.length &&
        !displayTokens[tokenIndex].toLowerCase().startsWith(w.Word.toLowerCase())
      ) {
        result.push({
          word: displayTokens[tokenIndex],
          start: w.Offset / 10000,
          end: w.Offset / 10000
        });
        tokenIndex++;
      }

      const displayToken = displayTokens[tokenIndex] || w.Word;

      result.push({
        word: displayToken,
        start: w.Offset / 10000,
        end: (w.Offset + w.Duration) / 10000
      });

      tokenIndex++;
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