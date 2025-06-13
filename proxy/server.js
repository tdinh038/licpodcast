const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const AZURE_KEY = 'DbChnvAqhN9oWKLMFInTBMkHyuYesKxCopXXtO5UIi37sTFjGfwHJQQJ99BFACYeBjFXJ3w3AAAYACOGIJAx';
const AZURE_ENDPOINT = 'https://licsentiment.cognitiveservices.azure.com/text/analytics/v3.1/sentiment';

app.post('/sentiment', async (req, res) => {
  try {
    const response = await axios.post(AZURE_ENDPOINT, req.body, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Azure request failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});