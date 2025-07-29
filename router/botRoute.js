const express = require('express');
const router = express.Router();
const { getAIResponse } = require('../botController');

router.post('/respond', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  try {
    const reply = await getAIResponse(prompt);
    res.json({ response: reply });
  } catch (err) {
    console.error("AI error in /bot/respond:", err);
    res.status(500).json({ error: "AI Assistant failed to respond" });
  }
});

module.exports = router;
