export function ema(values, length) {
  const multiplier = 2 / (length + 1);
  const output = Array(values.length).fill(null);
  let previous = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) {
      continue;
    }

    previous = previous === null ? value : ((value - previous) * multiplier) + previous;
    output[index] = previous;
  }

  return output;
}
