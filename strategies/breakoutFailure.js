import { bearishCandle, lastSwingHigh, priorSwingLow } from "./helpers.js";

export function buildBreakoutFailureSignal(context, index, config) {
  const candle = context.daily[index];
  const strategyConfig = config.strategies.breakoutFailure;

  if (!strategyConfig.enabled || index < strategyConfig.failureBars) {
    return null;
  }

  // Require weekly downtrend or exhaustion for short entries
  const weeklyTrend = context.weekly?.trendType ?? 0;
  if (![1, 5].includes(weeklyTrend)) {
    return null;
  }

  const lookback = context.daily.slice(index - strategyConfig.failureBars, index);
  const breakoutBar = [...lookback].reverse().find(
    (bar) => Number.isFinite(bar.resistanceLevel) && bar.close_price > bar.resistanceLevel
  );

  if (!breakoutBar || !Number.isFinite(breakoutBar.resistanceLevel)) {
    return null;
  }

  const returnedBelow = candle.close_price < breakoutBar.resistanceLevel;
  const strongBearish = bearishCandle(candle) && (candle.open_price - candle.close_price) >= ((candle.atr ?? 0) * 0.4);
  const impulseAgainst = candle.high_price - candle.low_price >= ((candle.atr ?? 0) * strategyConfig.impulseAtrThreshold);

  if (!returnedBelow || !strongBearish || !impulseAgainst) {
    return null;
  }

  const stopPrice = Math.max(lastSwingHigh(context.daily, index), breakoutBar.high_price);
  const target2 = priorSwingLow(context.daily, index) ?? candle.supportLevel;
  const rangeMidpoint = breakoutBar.resistanceLevel - ((stopPrice - breakoutBar.resistanceLevel) * 0.5);

  if (!Number.isFinite(stopPrice) || stopPrice <= candle.close_price) {
    return null;
  }

  if (!Number.isFinite(target2)) {
    return null;
  }

  // Validate target1 is below entry for shorts
  if (rangeMidpoint >= candle.close_price) {
    return null;
  }

  // Minimum reward-to-risk check
  const riskPerShare = stopPrice - candle.close_price;
  const rewardToTarget1 = candle.close_price - rangeMidpoint;
  const minRewardToRisk = strategyConfig.minRewardToRisk ?? 0.75;
  if (riskPerShare <= 0 || rewardToTarget1 < riskPerShare * minRewardToRisk) {
    return null;
  }

  return {
    strategyType: "breakout_failure",
    direction: "short",
    signalDate: candle.date,
    securityId: context.security.id,
    ticker: context.security.ticker,
    sector: context.security.sector,
    setupDate: candle.date,
    trendType: candle.trendType,
    weeklyTrendType: context.weekly?.trendType ?? 0,
    stopPrice,
    target1: rangeMidpoint,
    target2,
    metadata: {
      failedLevel: breakoutBar.resistanceLevel
    }
  };
}
