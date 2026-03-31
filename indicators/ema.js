export function ema(values, length) {
  const multiplier = 2 / (length + 1);
  const output = Array(values.length).fill(null);
  let previous = null;
  let warmupSum = 0;
  let warmupCount = 0;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) {
      continue;
    }

    if (previous === null) {
      warmupSum += value;
      warmupCount += 1;
      if (warmupCount >= length) {
        previous = warmupSum / length;
        output[index] = previous;
      }
      continue;
    }

    previous = ((value - previous) * multiplier) + previous;
    output[index] = previous;
  }

  return output;
}
