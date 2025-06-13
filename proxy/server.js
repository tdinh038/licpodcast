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

    // Split Display into sentences
    const sentenceRegex = /[^.?!]+[.?!]/g;
    const sentenceTexts = displayText.match(sentenceRegex)?.map(s => s.trim()) || [displayText.trim()];

    const result = [];
    let wordIndex = 0;

    for (const sentence of sentenceTexts) {
      const sentenceWords = [];
      while (
        wordIndex < words.length &&
        sentence.includes(words[wordIndex].Word) // fuzzy match, can improve
      ) {
        const w = words[wordIndex];
        sentenceWords.push({
          word: w.Word,
          start: w.Offset / 10000,
          end: (w.Offset + w.Duration) / 10000
        });
        wordIndex++;
        if (sentenceWords.map(sw => sw.word).join(' ').length >= sentence.length) break;
      }

      if (sentenceWords.length === 0) continue;

      const start = sentenceWords[0].start;
      const end = sentenceWords[sentenceWords.length - 1].end;

      result.push({
        text: sentence,
        start,
        end,
        words: sentenceWords
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Azure transcription failed' });
  } finally {
    fs.unlinkSync(audioPath);
  }
});