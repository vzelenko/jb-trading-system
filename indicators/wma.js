export function wma(values, length) {
  const output = Array(values.length).fill(null);
  const divisor = (length * (length + 1)) / 2;

  for (let index = length - 1; index < values.length; index += 1) {
    let weightedSum = 0;
    let valid = true;

    for (let offset = 0; offset < length; offset += 1) {
      const value = values[index - length + 1 + offset];
      if (!Number.isFinite(value)) {
        valid = false;
        break;
      }

      weightedSum += value * (offset + 1);
    }

    if (valid) {
      output[index] = weightedSum / divisor;
    }
  }

  return output;
}
