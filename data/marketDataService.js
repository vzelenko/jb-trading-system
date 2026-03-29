import { groupBy, indexBy } from "../utils/collections.js";
import { aggregateWeeklyCandles } from "./aggregateWeekly.js";
import { enrichSeriesWithIndicators } from "../indicators/pipeline.js";
import { classifyTrendSeries } from "../trend/classifier.js";

export async function loadMarketData(dataSource, config) {
  const securities = await dataSource.loadSecurities({ indexMembership: config.universe.indexMembership });
  const securityMap = indexBy(securities, (security) => security.id);
  const dailyCandles = await dataSource.loadDailyCandles({
    securityIds: securities.map((security) => security.id),
    startDate: config.universe.startDate,
    endDate: config.universe.endDate,
    timeframe: config.timeframes.daily
  });

  const candlesBySecurity = groupBy(dailyCandles, (candle) => candle.security_id);
  const enrichedDailyBySecurity = new Map();
  const enrichedWeeklyBySecurity = new Map();
  const alignedDates = new Set();

  for (const [securityId, candles] of candlesBySecurity.entries()) {
    if (candles.length < config.universe.minDailyHistory) {
      continue;
    }

    const enrichedDaily = enrichSeriesWithIndicators(candles, config.indicators);
    const trendDaily = classifyTrendSeries(enrichedDaily, config);
    const weeklyCandles = aggregateWeeklyCandles(candles);
    const enrichedWeekly = classifyTrendSeries(
      enrichSeriesWithIndicators(weeklyCandles, config.indicators),
      config
    );

    enrichedDailyBySecurity.set(securityId, trendDaily);
    enrichedWeeklyBySecurity.set(securityId, enrichedWeekly);

    for (const candle of trendDaily) {
      alignedDates.add(candle.date);
    }
  }

  return {
    securities,
    securityMap,
    alignedDates: [...alignedDates].sort(),
    dailyBySecurity: enrichedDailyBySecurity,
    weeklyBySecurity: enrichedWeeklyBySecurity
  };
}
