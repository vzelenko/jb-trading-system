export function bullishCandle(candle) {
  return candle.close_price > candle.open_price;
}

export function bearishCandle(candle) {
  return candle.close_price < candle.open_price;
}

export function lastSwingLow(series, index, fallbackAtrMultiplier = 1.5) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (series[cursor].isSwingLow) {
      return series[cursor].low_price;
    }
  }

  return series[index].close_price - ((series[index].atr ?? 0) * fallbackAtrMultiplier);
}

export function lastSwingHigh(series, index, fallbackAtrMultiplier = 1.5) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (series[cursor].isSwingHigh) {
      return series[cursor].high_price;
    }
  }

  return series[index].close_price + ((series[index].atr ?? 0) * fallbackAtrMultiplier);
}

export function priorSwingHigh(series, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (series[cursor].isSwingHigh) {
      return series[cursor].high_price;
    }
  }

  return null;
}

export function priorSwingLow(series, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (series[cursor].isSwingLow) {
      return series[cursor].low_price;
    }
  }

  return null;
}
