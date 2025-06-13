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
          'Accept': 'application/json',
        }
      }
    );

    const nBest = response.data?.NBest?.[0];
    const words = nBest?.Words || [];
    const displayText = nBest?.Display || "";

    if (!words.length || !displayText) {
      return res.status(400).json({ error: 'No valid transcription found' });
    }

    const start = words[0].Offset / 10000;
    const end = (words[words.length - 1].Offset + words[words.length - 1].Duration) / 10000;

    res.json([
      {
        text: displayText,
        start,
        end,
        words
      }
    ]);
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
