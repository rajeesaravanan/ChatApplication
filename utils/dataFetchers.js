const axios = require("axios");

async function fetchWeather(city) {
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );
    const data = res.data;
    return `Weather in ${city}: ${data.main.temp}°C, ${data.weather[0].description}`;
  } catch {
    return null;
  }
}

async function fetchNews() {
  try {
    const res = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=3&apiKey=${process.env.NEWS_API_KEY}`
    );
    const articles = res.data.articles.map(a => `• ${a.title}`).join("\n");
    return `Top News:\n${articles}`;
  } catch {
    return null;
  }
}

async function fetchCricketScore() {
  try {
    const res = await axios.get(
      `https://api.cricapi.com/v1/currentMatches?apikey=${process.env.CRIC_API_KEY}&offset=0`
    );
    const match = res.data.data[0]; // First match
    return match
      ? `Live Match: ${match.name} | ${match.status}`
      : null;
  } catch {
    return null;
  }
}

async function fetchStockPrice(symbol = "TSLA") {
  try {
    const res = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.STOCK_API_KEY}`
    );
    const price = res.data["Global Quote"]["05. price"];
    return `Current ${symbol} stock price: $${price}`;
  } catch {
    return null;
  }
}

module.exports = {
  fetchWeather,
  fetchNews,
  fetchCricketScore,
  fetchStockPrice,
};
