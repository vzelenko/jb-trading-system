export function calculateOpenRisk(openPositions) {
  return openPositions.reduce((total, position) => total + position.openRiskAmount, 0);
}

export function calculateGrossExposure(openPositions) {
  return openPositions.reduce(
    (total, position) => total + (position.entryPrice * position.remainingShares),
    0
  );
}

export function canOpenPosition({ portfolioState, signal, proposedRiskAmount, proposedNotional, config }) {
  if (portfolioState.equity <= 0) {
    return false;
  }

  if (portfolioState.openPositions.length >= config.portfolio.maxPositions) {
    return false;
  }

  const sectorCount = portfolioState.openPositions.filter((position) => position.sector === signal.sector).length;
  if (sectorCount >= config.portfolio.maxPositionsPerSector) {
    return false;
  }

  const maxOpenRisk = portfolioState.equity * config.portfolio.maxOpenRiskPct;
  const currentOpenRisk = calculateOpenRisk(portfolioState.openPositions);
  if (currentOpenRisk + proposedRiskAmount > maxOpenRisk) {
    return false;
  }

  const currentGrossExposure = calculateGrossExposure(portfolioState.openPositions);
  return currentGrossExposure + proposedNotional <= portfolioState.equity;
}
