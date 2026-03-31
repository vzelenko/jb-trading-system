import { average } from "../utils/math.js";

export function selectTradableUniverse({ marketData, currentDate, config, candleBySecurityAndDate }) {
  const sectorScores = new Map();
  const stockScores = new Map();

  for (const security of marketData.securities) {
    const candle = candleBySecurityAndDate
      ? candleBySecurityAndDate.get(security.id)?.get(currentDate)
      : marketData.dailyBySecurity.get(security.id)?.find((item) => item.date === currentDate);
    if (!candle) {
      continue;
    }

    const score = candle.roc50 ?? candle.roc20;
    if (!Number.isFinite(score)) {
      continue;
    }

    stockScores.set(security.id, score);

    if (!sectorScores.has(security.sector)) {
      sectorScores.set(security.sector, []);
    }

    sectorScores.get(security.sector).push(score);
  }

  const rankedSectors = [...sectorScores.entries()]
    .map(([sector, scores]) => ({ sector, score: average(scores) ?? Number.NEGATIVE_INFINITY }))
    .sort((left, right) => right.score - left.score)
    .slice(0, config.universe.sectorsToTrade)
    .map((entry) => entry.sector);

  const tradableSecurities = new Set(
    marketData.securities
      .filter((security) => rankedSectors.includes(security.sector))
      .sort((left, right) => (stockScores.get(right.id) ?? -999) - (stockScores.get(left.id) ?? -999))
      .map((security) => security.id)
  );

  return {
    rankedSectors,
    tradableSecurities,
    stockScores
  };
}
