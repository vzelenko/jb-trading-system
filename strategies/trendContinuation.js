import { bullishCandle, lastSwingLow, priorSwingHigh } from "./helpers.js";

export function buildTrendContinuationSignal(context, index, config) {
  const candle = context.daily[index];
  const prior = index > 0 ? context.daily[index - 1] : null;
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
  const priorPullback = !strategyConfig.requirePriorPullback || (
    prior &&
    Number.isFinite(prior.emaFast) &&
    Number.isFinite(prior.atr) &&
    prior.low_price <= prior.emaFast &&
    Math.abs(prior.close_price - prior.emaFast) <= prior.atr * strategyConfig.pullbackAtrThreshold
  );
  const reclaimedFastEma = Number.isFinite(candle.emaFast) && candle.close_price > candle.emaFast;

  if (!nearTrendMean || !macdBullish || !hmaConfirmed || !priorPullback || !reclaimedFastEma || !bullishCandle(candle)) {
    return null;
  }

  const stopFromSwing = lastSwingLow(context.daily, index, strategyConfig.stopAtrMultiplier);
  const stopFromAtr = candle.close_price - ((candle.atr ?? 0) * strategyConfig.stopAtrMultiplier);
  const stopPrice = Math.max(stopFromSwing, stopFromAtr);
  const target1 = priorSwingHigh(context.daily, index) ?? (candle.close_price + ((candle.close_price - stopPrice) * 1.5));
  const riskPerShare = candle.close_price - stopPrice;
  const rewardToTarget1 = target1 - candle.close_price;

  if (
    riskPerShare <= 0 ||
    rewardToTarget1 <= 0 ||
    rewardToTarget1 < riskPerShare * strategyConfig.minRewardToTarget1
  ) {
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
