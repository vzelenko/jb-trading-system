import { ema } from "./ema.js";

export function atr(candles, length) {
  const trueRanges = candles.map((candle, index) => {
    if (index === 0) {
      return candle.high_price - candle.low_price;
    }

    const previousClose = candles[index - 1].close_price;
    return Math.max(
      candle.high_price - candle.low_price,
      Math.abs(candle.high_price - previousClose),
      Math.abs(candle.low_price - previousClose)
    );
  });

  return ema(trueRanges, length);
}
