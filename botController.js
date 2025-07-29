const OpenAI = require("openai");
const {
  fetchWeather,
  fetchNews,
  fetchCricketScore,
  fetchStockPrice,
} = require("./utils/dataFetchers");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIResponse(message) {
  let extraInfo = "";

  // Trigger-based detection
  const lower = message.toLowerCase();

  if (lower.includes("weather in")) {
    const match = message.match(/weather in ([a-zA-Z\s]+)/i);
    if (match && match[1]) {
      const city = match[1].trim();
      const weather = await fetchWeather(city);
      if (weather) extraInfo += `\n[Weather Info]\n${weather}\n`;
    }
  }

  if (lower.includes("news")) {
    const news = await fetchNews();
    if (news) extraInfo += `\n[News]\n${news}\n`;
  }

  if (lower.includes("score") || lower.includes("cricket")) {
    const score = await fetchCricketScore();
    if (score) extraInfo += `\n[Cricket]\n${score}\n`;
  }

  if (lower.includes("stock")) {
    const match = message.match(/stock price of (\w+)/i);
    const symbol = match?.[1] || "TSLA";
    const stock = await fetchStockPrice(symbol.toUpperCase());
    if (stock) extraInfo += `\n[Stock]\n${stock}\n`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant with real-time awareness.",
        },
        {
          role: "user",
          content: `${message}\n\n${extraInfo}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Error:", error);
    return "AI failed to respond.";
  }
}

module.exports = { getAIResponse };
