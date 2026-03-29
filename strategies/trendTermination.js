import { bearishCandle, lastSwingHigh } from "./helpers.js";

export function buildTrendTerminationSignal(context, index, config) {
  const candle = context.daily[index];
  const strategyConfig = config.strategies.trendTermination;

  if (!strategyConfig.enabled || ![4, 5].includes(candle.trendType)) {
    return null;
  }

  const extension = Number.isFinite(candle.atr) ? (candle.close_price - candle.emaSlow) / candle.atr : 0;
  const histSlice = context.daily
    .slice(Math.max(0, index - strategyConfig.exhaustionHistogramLookback + 1), index + 1)
    .map((bar) => bar.macdHistogram)
    .filter(Number.isFinite);
  const weakeningMomentum =
    histSlice.length >= 2 && histSlice[histSlice.length - 1] < histSlice[0];
  const reversal = bearishCandle(candle) && candle.close_price < candle.emaFast;

  if (extension < strategyConfig.extensionAtrMultiple || !weakeningMomentum || !reversal) {
    return null;
  }

  const stopPrice = lastSwingHigh(context.daily, index);
  const target1 = candle.emaSlow;
  const target2 = candle.emaSlow - ((stopPrice - candle.close_price) * 0.75);

  if (!Number.isFinite(stopPrice) || stopPrice <= candle.close_price) {
    return null;
  }

  return {
    strategyType: "trend_termination",
    direction: "short",
    signalDate: candle.date,
    securityId: context.security.id,
    ticker: context.security.ticker,
    sector: context.security.sector,
    setupDate: candle.date,
    trendType: candle.trendType,
    weeklyTrendType: context.weekly?.trendType ?? 0,
    stopPrice,
    target1,
    target2,
    metadata: {
      extensionAtr: extension
    }
  };
}
