import path from "node:path";
import { loadMarketData } from "../data/marketDataService.js";
import { alignWeeklyTrend } from "../trend/multiTimeframe.js";
import { generateSignalsForContext } from "../strategies/index.js";
import { createPortfolioState, attemptEntry, markToMarket } from "../portfolio/portfolioManager.js";
import { selectTradableUniverse } from "./sectorRotation.js";
import { updateOpenPositions } from "./positionManager.js";
import { calculatePerformanceMetrics, calculateBreakdowns } from "../analytics/metrics.js";
import { buildTradeLogRows } from "../analytics/tradeLog.js";
import { writeCsv, writeJson } from "../utils/io.js";

export async function runBacktest({ dataSource, config }) {
  const marketData = await loadMarketData(dataSource, config);
  const portfolioState = createPortfolioState(config);
  const pendingSignals = new Map();

  for (let dateIndex = 0; dateIndex < marketData.alignedDates.length; dateIndex += 1) {
    const currentDate = marketData.alignedDates[dateIndex];
    const nextDate = marketData.alignedDates[dateIndex + 1];
    const dailyPriceMap = new Map();

    for (const [securityId, series] of marketData.dailyBySecurity.entries()) {
      const candle = series.find((item) => item.date === currentDate);
      if (candle) {
        dailyPriceMap.set(securityId, candle);
      }
    }

    updateOpenPositions({ portfolioState, currentDate, priceMap: dailyPriceMap });

    const tradable = selectTradableUniverse({ marketData, currentDate, config });

    for (const signal of pendingSignals.get(currentDate) ?? []) {
      if (!tradable.tradableSecurities.has(signal.securityId)) {
        continue;
      }

      const nextCandle = marketData.dailyBySecurity
        .get(signal.securityId)
        ?.find((candle) => candle.date === currentDate);
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

        const candleIndex = dailySeries.findIndex((candle) => candle.date === currentDate);
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
