import { calculatePositionSize } from "./positionSizer.js";
import { canOpenPosition } from "./riskManager.js";

export function createPortfolioState(config) {
  return {
    initialEquity: config.portfolio.initialEquity,
    equity: config.portfolio.initialEquity,
    cash: config.portfolio.initialEquity,
    openPositions: [],
    closedTrades: [],
    equityCurve: []
  };
}

export function attemptEntry({ portfolioState, signal, nextCandle, config }) {
  if (!nextCandle) {
    return null;
  }

  const slippageMultiplier = signal.direction === "long"
    ? 1 + config.execution.slippagePct
    : 1 - config.execution.slippagePct;
  const entryPrice = nextCandle.open_price * slippageMultiplier;
  const sizing = calculatePositionSize({
    equity: portfolioState.equity,
    riskPerTradePct: config.portfolio.riskPerTradePct,
    entryPrice,
    stopPrice: signal.stopPrice
  });

  if (!sizing || !canOpenPosition({
    portfolioState,
    signal,
    proposedRiskAmount: sizing.riskAmount,
    config
  })) {
    return null;
  }

  const position = {
    id: `${signal.ticker}-${signal.strategyType}-${signal.signalDate}`,
    ticker: signal.ticker,
    securityId: signal.securityId,
    sector: signal.sector,
    strategyType: signal.strategyType,
    direction: signal.direction,
    trendType: signal.trendType,
    weeklyTrendType: signal.weeklyTrendType,
    entryDate: nextCandle.date,
    entryPrice,
    initialStopPrice: signal.stopPrice,
    stopPrice: signal.stopPrice,
    target1: signal.target1,
    target2: signal.target2,
    shares: sizing.shares,
    remainingShares: sizing.shares,
    openRiskAmount: sizing.riskAmount,
    riskPerShare: sizing.riskPerShare,
    realizedPnl: 0,
    t1Hit: false,
    metadata: signal.metadata
  };

  portfolioState.openPositions.push(position);
  return position;
}

export function markToMarket(portfolioState, priceMap) {
  const openValue = portfolioState.openPositions.reduce((total, position) => {
    const candle = priceMap.get(position.securityId);
    if (!candle) {
      return total;
    }

    const lastPrice = candle.close_price;
    const positionValue = position.direction === "long"
      ? position.remainingShares * lastPrice
      : position.remainingShares * ((2 * position.entryPrice) - lastPrice);
    return total + positionValue;
  }, 0);

  portfolioState.equity = portfolioState.cash + openValue;
}

export function closePosition(portfolioState, position, exitDetails) {
  const index = portfolioState.openPositions.findIndex((openPosition) => openPosition.id === position.id);
  if (index >= 0) {
    portfolioState.openPositions.splice(index, 1);
  }

  portfolioState.closedTrades.push({
    ticker: position.ticker,
    strategy_type: position.strategyType,
    sector: position.sector,
    trend_type: position.trendType,
    weekly_trend_type: position.weeklyTrendType,
    entry_date: position.entryDate,
    exit_date: exitDetails.exitDate,
    entry_price: position.entryPrice,
    exit_price: exitDetails.exitPrice,
    stop_price: position.initialStopPrice,
    shares: position.shares,
    r_multiple: exitDetails.rMultiple,
    pnl: exitDetails.pnl,
    exit_reason: exitDetails.reason
  });
}
