import { ema } from "./ema.js";

export function macd(values, fastLength, slowLength, signalLength) {
  const fast = ema(values, fastLength);
  const slow = ema(values, slowLength);
  const line = values.map((_, index) => {
    if (!Number.isFinite(fast[index]) || !Number.isFinite(slow[index])) {
      return null;
    }

    return fast[index] - slow[index];
  });
  const signal = ema(line, signalLength);
  const histogram = line.map((value, index) => {
    if (!Number.isFinite(value) || !Number.isFinite(signal[index])) {
      return null;
    }

    return value - signal[index];
  });

  return { line, signal, histogram };
}
