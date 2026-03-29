import { bullishCandle } from "./helpers.js";

export function buildBreakoutSignal(context, index, config) {
  const candle = context.daily[index];
  const strategyConfig = config.strategies.breakout;

  if (!strategyConfig.enabled || ![3, 4].includes(candle.trendType) || !context.weekly || ![3, 4].includes(context.weekly.trendType)) {
    return null;
  }

  const resistance = candle.resistanceLevel;
  if (!Number.isFinite(resistance)) {
    return null;
  }

  const recent = context.daily.slice(Math.max(0, index - strategyConfig.consolidationBars + 1), index + 1);
  const nearResistanceCount = recent.filter((bar) => Math.abs(bar.high_price - resistance) <= resistance * 0.01).length;
  const breakout = candle.close_price > resistance && bullishCandle(candle);
  const prior = index > 0 ? context.daily[index - 1] : null;
  const retestHeld = prior ? prior.close_price <= resistance && candle.low_price <= resistance * 1.005 : true;

  if (nearResistanceCount < 2 || !breakout || !retestHeld) {
    return null;
  }

  const stopPrice = resistance - ((candle.atr ?? 0) * strategyConfig.stopAtrBuffer);
  const riskPerShare = candle.close_price - stopPrice;

  if (riskPerShare <= 0) {
    return null;
  }

  return {
    strategyType: "breakout",
    direction: "long",
    signalDate: candle.date,
    securityId: context.security.id,
    ticker: context.security.ticker,
    sector: context.security.sector,
    setupDate: candle.date,
    trendType: candle.trendType,
    weeklyTrendType: context.weekly.trendType,
    stopPrice,
    target1: candle.close_price + riskPerShare,
    target2: candle.close_price + ((candle.atr ?? riskPerShare) * strategyConfig.targetAtrMultiplier),
    metadata: {
      breakoutLevel: resistance
    }
  };
}
