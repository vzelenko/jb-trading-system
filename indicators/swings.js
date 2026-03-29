export function detectSwings(candles, lookback = 2) {
  const swingHigh = Array(candles.length).fill(false);
  const swingLow = Array(candles.length).fill(false);

  for (let index = lookback; index < candles.length - lookback; index += 1) {
    let isHigh = true;
    let isLow = true;

    for (let offset = 1; offset <= lookback; offset += 1) {
      if (
        candles[index].high_price <= candles[index - offset].high_price ||
        candles[index].high_price <= candles[index + offset].high_price
      ) {
        isHigh = false;
      }

      if (
        candles[index].low_price >= candles[index - offset].low_price ||
        candles[index].low_price >= candles[index + offset].low_price
      ) {
        isLow = false;
      }
    }

    swingHigh[index] = isHigh;
    swingLow[index] = isLow;
  }

  return { swingHigh, swingLow };
}
