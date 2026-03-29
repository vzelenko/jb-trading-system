export function calculateOpenRisk(openPositions) {
  return openPositions.reduce((total, position) => total + position.openRiskAmount, 0);
}

export function canOpenPosition({ portfolioState, signal, proposedRiskAmount, config }) {
  if (portfolioState.openPositions.length >= config.portfolio.maxPositions) {
    return false;
  }

  const sectorCount = portfolioState.openPositions.filter((position) => position.sector === signal.sector).length;
  if (sectorCount >= config.portfolio.maxPositionsPerSector) {
    return false;
  }

  const maxOpenRisk = portfolioState.equity * config.portfolio.maxOpenRiskPct;
  const currentOpenRisk = calculateOpenRisk(portfolioState.openPositions);
  return currentOpenRisk + proposedRiskAmount <= maxOpenRisk;
}
