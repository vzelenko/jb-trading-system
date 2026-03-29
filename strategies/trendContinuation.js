import { bullishCandle, lastSwingLow, priorSwingHigh } from "./helpers.js";

export function buildTrendContinuationSignal(context, index, config) {
  const candle = context.daily[index];
  const weekly = context.weekly;
  const strategyConfig = config.strategies.trendContinuation;

  if (!strategyConfig.enabled || !weekly || ![2, 3].includes(candle.trendType) || ![2, 3, 4].includes(weekly.trendType)) {
    return null;
  }

  const pullbackDistance = Math.min(
    Math.abs(candle.close_price - candle.emaFast),
    Math.abs(candle.close_price - candle.emaSlow)
  );
  const nearTrendMean = Number.isFinite(candle.atr) && pullbackDistance <= candle.atr * strategyConfig.pullbackAtrThreshold;
  const macdBullish = candle.macdLine > candle.macdSignal;
  const hmaConfirmed = !strategyConfig.useHmaConfirmation || candle.close_price > candle.hmaFast;

  if (!nearTrendMean || !macdBullish || !hmaConfirmed || !bullishCandle(candle)) {
    return null;
  }

  const stopFromSwing = lastSwingLow(context.daily, index, strategyConfig.stopAtrMultiplier);
  const stopFromAtr = candle.close_price - ((candle.atr ?? 0) * strategyConfig.stopAtrMultiplier);
  const stopPrice = Math.min(stopFromSwing, stopFromAtr);
  const target1 = priorSwingHigh(context.daily, index) ?? (candle.close_price + ((candle.close_price - stopPrice) * 1.5));
  const riskPerShare = candle.close_price - stopPrice;

  if (riskPerShare <= 0) {
    return null;
  }

  return {
    strategyType: "trend_continuation",
    direction: "long",
    signalDate: candle.date,
    securityId: context.security.id,
    ticker: context.security.ticker,
    sector: context.security.sector,
    setupDate: candle.date,
    trendType: candle.trendType,
    weeklyTrendType: weekly.trendType,
    stopPrice,
    target1,
    target2: candle.close_price + (riskPerShare * strategyConfig.target2RMultiple),
    metadata: {
      resistanceLevel: candle.resistanceLevel,
      supportLevel: candle.supportLevel
    }
  };
}
