import { wma } from "./wma.js";

export function hma(values, length) {
  const halfLength = Math.max(1, Math.floor(length / 2));
  const sqrtLength = Math.max(1, Math.round(Math.sqrt(length)));
  const wmaHalf = wma(values, halfLength);
  const wmaFull = wma(values, length);
  const diff = values.map((_, index) => {
    if (!Number.isFinite(wmaHalf[index]) || !Number.isFinite(wmaFull[index])) {
      return null;
    }

    return (2 * wmaHalf[index]) - wmaFull[index];
  });

  return wma(diff, sqrtLength);
}
