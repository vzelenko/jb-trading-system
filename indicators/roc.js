export function roc(values, length) {
  return values.map((value, index) => {
    if (index < length || !Number.isFinite(value) || !Number.isFinite(values[index - length])) {
      return null;
    }

    const previous = values[index - length];
    return previous === 0 ? null : ((value / previous) - 1) * 100;
  });
}
