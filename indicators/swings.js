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

  // Shift swing flags forward by lookback to remove lookahead bias.
  // A swing at index i requires bars i+1..i+lookback to confirm,
  // so it is only known at bar i+lookback.
  const delayedSwingHigh = Array(candles.length).fill(false);
  const delayedSwingLow = Array(candles.length).fill(false);
  for (let i = 0; i < candles.length; i += 1) {
    if (i + lookback < candles.length) {
      delayedSwingHigh[i + lookback] = swingHigh[i];
      delayedSwingLow[i + lookback] = swingLow[i];
    }
  }

  return { swingHigh: delayedSwingHigh, swingLow: delayedSwingLow };
}
