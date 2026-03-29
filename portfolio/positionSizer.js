export function calculatePositionSize({ equity, riskPerTradePct, entryPrice, stopPrice }) {
  const riskPerShare = Math.abs(entryPrice - stopPrice);
  if (!Number.isFinite(riskPerShare) || riskPerShare <= 0) {
    return null;
  }

  const riskAmount = equity * riskPerTradePct;
  const shares = Math.floor(riskAmount / riskPerShare);

  return shares > 0
    ? {
        shares,
        riskAmount,
        riskPerShare
      }
    : null;
}
