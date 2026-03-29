function generateTrendSeries({ securityId, startDate, bars, startPrice, drift, volatility, sector, ticker, industry }) {
  const candles = [];
  let close = startPrice;
  let currentDate = new Date(`${startDate}T00:00:00Z`);

  for (let index = 0; index < bars; index += 1) {
    const day = currentDate.getUTCDay();
    if (day === 0 || day === 6) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      index -= 1;
      continue;
    }

    const cycle = Math.sin(index / 6) * volatility;
    const shock = (index % 17 === 0 ? volatility * 1.6 : 0) - (index % 29 === 0 ? volatility * 1.2 : 0);
    const nextClose = Math.max(5, close + drift + cycle + shock);
    const open = close + (Math.sin(index / 4) * volatility * 0.35);
    const high = Math.max(open, nextClose) + (volatility * 0.9);
    const low = Math.min(open, nextClose) - (volatility * 0.9);
    const volume = 500000 + ((index % 9) * 40000);

    candles.push({
      security_id: securityId,
      date: currentDate.toISOString().slice(0, 10),
      open_price: Number(open.toFixed(4)),
      high_price: Number(high.toFixed(4)),
      low_price: Number(low.toFixed(4)),
      close_price: Number(nextClose.toFixed(4)),
      volume,
      timeframe: 1
    });

    close = nextClose;
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return {
    security: {
      id: securityId,
      ticker,
      sector,
      industry,
      index_membership: "SP500"
    },
    candles
  };
}

const generated = [
  generateTrendSeries({
    securityId: 1,
    ticker: "TECHA",
    sector: "Technology",
    industry: "Software",
    startDate: "2019-01-01",
    bars: 420,
    startPrice: 50,
    drift: 0.18,
    volatility: 1.2
  }),
  generateTrendSeries({
    securityId: 2,
    ticker: "TECHB",
    sector: "Technology",
    industry: "Semiconductors",
    startDate: "2019-01-01",
    bars: 420,
    startPrice: 35,
    drift: 0.14,
    volatility: 1.35
  }),
  generateTrendSeries({
    securityId: 3,
    ticker: "HEALA",
    sector: "Healthcare",
    industry: "Biotech",
    startDate: "2019-01-01",
    bars: 420,
    startPrice: 42,
    drift: 0.08,
    volatility: 1.0
  }),
  generateTrendSeries({
    securityId: 4,
    ticker: "ENRGA",
    sector: "Energy",
    industry: "Exploration",
    startDate: "2019-01-01",
    bars: 420,
    startPrice: 28,
    drift: 0.03,
    volatility: 1.5
  }),
  generateTrendSeries({
    securityId: 5,
    ticker: "FINA",
    sector: "Financials",
    industry: "Banks",
    startDate: "2019-01-01",
    bars: 420,
    startPrice: 31,
    drift: 0.06,
    volatility: 1.1
  }),
  generateTrendSeries({
    securityId: 6,
    ticker: "CONS",
    sector: "Consumer Discretionary",
    industry: "Retail",
    startDate: "2019-01-01",
    bars: 420,
    startPrice: 24,
    drift: 0.11,
    volatility: 1.25
  })
];

export default {
  securities: generated.map((item) => item.security),
  priceCandles: generated.flatMap((item) => item.candles)
};
