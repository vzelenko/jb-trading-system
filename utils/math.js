export function sum(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? sum(clean) / clean.length : null;
}

export function stdDev(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < 2) {
    return null;
  }

  const mean = average(clean);
  const squaredDiffs = clean.map((value) => (value - mean) ** 2);
  const variance = sum(squaredDiffs) / (clean.length - 1);
  return Math.sqrt(variance);
}

export function maxDrawdown(equityCurve) {
  let peak = Number.NEGATIVE_INFINITY;
  let maxDd = 0;

  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }

    if (peak > 0) {
      maxDd = Math.max(maxDd, (peak - point.equity) / peak);
    }
  }

  return maxDd;
}

export function safeDivide(numerator, denominator) {
  return denominator === 0 || denominator === null || denominator === undefined ? null : numerator / denominator;
}

export function round(value, precision = 4) {
  if (!Number.isFinite(value)) {
    return value;
  }

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
