import path from "node:path";
import { loadMarketData } from "../data/marketDataService.js";
import { alignWeeklyTrend } from "../trend/multiTimeframe.js";
import { generateSignalsForContext } from "../strategies/index.js";
import { createPortfolioState, attemptEntry, markToMarket } from "../portfolio/portfolioManager.js";
import { selectTradableUniverse } from "./sectorRotation.js";
import { updateOpenPositions, exitRemaining } from "./positionManager.js";
import { calculatePerformanceMetrics, calculateBreakdowns } from "../analytics/metrics.js";
import { buildTradeLogRows } from "../analytics/tradeLog.js";
import { writeCsv, writeJson } from "../utils/io.js";

export async function runBacktest({ dataSource, config }) {
  const marketData = await loadMarketData(dataSource, config);
  const portfolioState = createPortfolioState(config);
  const pendingSignals = new Map();

  // Pre-build O(1) lookup maps to avoid O(n) .find() per bar per security
  const candleBySecurityAndDate = new Map();
  const indexBySecurityAndDate = new Map();
  for (const [securityId, series] of marketData.dailyBySecurity.entries()) {
    const dateMap = new Map();
    const indexMap = new Map();
    for (let i = 0; i < series.length; i++) {
      dateMap.set(series[i].date, series[i]);
      indexMap.set(series[i].date, i);
    }
    candleBySecurityAndDate.set(securityId, dateMap);
    indexBySecurityAndDate.set(securityId, indexMap);
  }

  for (let dateIndex = 0; dateIndex < marketData.alignedDates.length; dateIndex += 1) {
    const currentDate = marketData.alignedDates[dateIndex];
    const nextDate = marketData.alignedDates[dateIndex + 1];
    const dailyPriceMap = new Map();

    for (const [securityId, dateMap] of candleBySecurityAndDate.entries()) {
      const candle = dateMap.get(currentDate);
      if (candle) {
        dailyPriceMap.set(securityId, candle);
      }
    }

    updateOpenPositions({ portfolioState, currentDate, priceMap: dailyPriceMap });

    const tradable = selectTradableUniverse({ marketData, currentDate, config, candleBySecurityAndDate });

    for (const signal of pendingSignals.get(currentDate) ?? []) {
      if (!tradable.tradableSecurities.has(signal.securityId)) {
        continue;
      }

      const nextCandle = candleBySecurityAndDate.get(signal.securityId)?.get(currentDate);
      if (nextCandle) {
        const position = attemptEntry({ portfolioState, signal, nextCandle, config });
        if (position) {
          portfolioState.cash += entryCashDelta(position);
        }
      }
    }

    if (nextDate) {
      const nextSignals = [];

      for (const security of marketData.securities) {
        if (!tradable.tradableSecurities.has(security.id)) {
          continue;
        }

        const dailySeries = marketData.dailyBySecurity.get(security.id);
        const weeklySeries = marketData.weeklyBySecurity.get(security.id) ?? [];
        if (!dailySeries) {
          continue;
        }

        const candleIndex = indexBySecurityAndDate.get(security.id)?.get(currentDate) ?? -1;
        if (candleIndex < 30) {
          continue;
        }

        const weeklyContext = alignWeeklyTrend(weeklySeries, currentDate);
        const signals = generateSignalsForContext(
          {
            security,
            daily: dailySeries,
            weekly: weeklyContext
          },
          candleIndex,
          config
        );

        nextSignals.push(...signals);
      }

      pendingSignals.set(nextDate, nextSignals);
    }

    markToMarket(portfolioState, dailyPriceMap);
    portfolioState.equityCurve.push({ date: currentDate, equity: portfolioState.equity });
  }

  // Close all remaining open positions at last known price
  const lastDate = marketData.alignedDates[marketData.alignedDates.length - 1];
  for (const position of [...portfolioState.openPositions]) {
    const candle = candleBySecurityAndDate.get(position.securityId)?.get(lastDate);
    if (candle) {
      exitRemaining(portfolioState, position, lastDate, candle.close_price, "end_of_backtest");
    }
  }
  markToMarket(portfolioState, new Map());

  const metrics = calculatePerformanceMetrics(portfolioState);
  const breakdowns = calculateBreakdowns(portfolioState.closedTrades);
  const tradeLog = buildTradeLogRows(portfolioState.closedTrades);

  await writeOutputs({ config, tradeLog, metrics, breakdowns });

  return {
    portfolioState,
    metrics,
    breakdowns,
    tradeLog
  };
}

function entryCashDelta(position) {
  return position.direction === "long"
    ? -(position.entryPrice * position.shares)
    : position.entryPrice * position.shares;
}

async function writeOutputs({ config, tradeLog, metrics, breakdowns }) {
  const outputDir = path.resolve(config.outputs.outputDir);
  await writeCsv(
    path.join(outputDir, config.outputs.tradeLogFile),
    tradeLog,
    [
      "ticker",
      "strategy_type",
      "sector",
      "trend_type",
      "weekly_trend_type",
      "entry_date",
      "exit_date",
      "entry_price",
      "exit_price",
      "stop_price",
      "shares",
      "r_multiple",
      "pnl",
      "exit_reason"
    ]
  );
  await writeJson(path.join(outputDir, config.outputs.metricsFile), { metrics, breakdowns });
}
