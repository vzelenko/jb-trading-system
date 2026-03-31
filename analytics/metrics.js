import { average, maxDrawdown, safeDivide, stdDev } from "../utils/math.js";

export function calculatePerformanceMetrics(portfolioState) {
  const trades = portfolioState.closedTrades;
  const equityCurve = portfolioState.equityCurve;
  const totalReturn = safeDivide(portfolioState.equity - portfolioState.initialEquity, portfolioState.initialEquity) ?? 0;
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const firstDate = new Date(equityCurve[0]?.date);
  const lastDate = new Date(equityCurve[equityCurve.length - 1]?.date);
  const years = equityCurve.length > 1 ? (lastDate - firstDate) / msPerYear || 1 : 1;
  const cagr = years > 0 ? ((portfolioState.equity / portfolioState.initialEquity) ** (1 / years)) - 1 : 0;
  const dailyReturns = equityCurve.slice(1).map((point, index) => {
    const previous = equityCurve[index].equity;
    return previous ? (point.equity / previous) - 1 : 0;
  });
  const volatility = stdDev(dailyReturns);
  const sharpe = volatility ? (average(dailyReturns) * Math.sqrt(252)) / volatility : null;
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl <= 0);
  const avgR = average(trades.map((trade) => trade.r_multiple));
  const expectancy = average(trades.map((trade) => trade.pnl));

  return {
    initialEquity: portfolioState.initialEquity,
    endingEquity: portfolioState.equity,
    totalReturn,
    cagr,
    sharpeRatio: sharpe,
    maxDrawdown: maxDrawdown(equityCurve),
    tradeCount: trades.length,
    winRate: safeDivide(wins.length, trades.length),
    avgRPerTrade: avgR,
    expectancy,
    averageWin: average(wins.map((trade) => trade.pnl)),
    averageLoss: average(losses.map((trade) => trade.pnl))
  };
}

export function calculateBreakdowns(trades) {
  return {
    byStrategy: breakdownBy(trades, "strategy_type"),
    byTrend: breakdownBy(trades, "trend_type"),
    bySector: breakdownBy(trades, "sector")
  };
}

function breakdownBy(trades, field) {
  const groups = new Map();

  for (const trade of trades) {
    const key = trade[field];
    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(trade);
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    trades: group.length,
    winRate: safeDivide(group.filter((trade) => trade.pnl > 0).length, group.length),
    avgR: average(group.map((trade) => trade.r_multiple)),
    totalPnl: group.reduce((sum, trade) => sum + trade.pnl, 0)
  }));
}
