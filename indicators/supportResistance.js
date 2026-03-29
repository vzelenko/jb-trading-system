export function detectLevels(candles, window, tolerancePct) {
  const resistance = Array(candles.length).fill(null);
  const support = Array(candles.length).fill(null);

  for (let index = 0; index < candles.length; index += 1) {
    const slice = candles.slice(Math.max(0, index - window + 1), index + 1);
    resistance[index] = findLevel(slice.map((candle) => candle.high_price), tolerancePct, "max");
    support[index] = findLevel(slice.map((candle) => candle.low_price), tolerancePct, "min");
  }

  return { resistance, support };
}

function findLevel(values, tolerancePct, type) {
  if (values.length < 3) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const seed = type === "max" ? sorted[sorted.length - 1] : sorted[0];
  const tolerance = seed * tolerancePct;
  const touches = values.filter((value) => Math.abs(value - seed) <= tolerance);

  if (touches.length < 2) {
    return null;
  }

  return touches.reduce((total, value) => total + value, 0) / touches.length;
}
