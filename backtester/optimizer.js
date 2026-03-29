import { runBacktest } from "./engine.js";
import { mergeConfig } from "../config/default.js";
import { writeCsv } from "../utils/io.js";
import path from "node:path";

export async function runOptimization({ dataSource, baseConfig }) {
  const parameterGrid = expandGrid(baseConfig.optimization.parameterGrid);
  const rows = [];

  for (const params of parameterGrid) {
    const config = mergeConfig(baseConfig, {
      indicators: {
        emaFast: params.emaFast,
        emaSlow: params.emaSlow
      },
      strategies: {
        trendContinuation: {
          stopAtrMultiplier: params.atrStopMultiplier
        }
      },
      universe: {
        sectorsToTrade: params.sectorCount
      },
      outputs: {
        outputDir: path.join(baseConfig.outputs.outputDir, `opt-${rows.length + 1}`)
      }
    });

    const result = await runBacktest({ dataSource, config });
    rows.push({
      ema_fast: params.emaFast,
      ema_slow: params.emaSlow,
      atr_stop_multiplier: params.atrStopMultiplier,
      sector_count: params.sectorCount,
      cagr: result.metrics.cagr,
      sharpe_ratio: result.metrics.sharpeRatio,
      max_drawdown: result.metrics.maxDrawdown,
      avg_r_per_trade: result.metrics.avgRPerTrade,
      trade_count: result.metrics.tradeCount
    });
  }

  await writeCsv(
    path.join(baseConfig.outputs.outputDir, baseConfig.outputs.optimizationFile),
    rows,
    [
      "ema_fast",
      "ema_slow",
      "atr_stop_multiplier",
      "sector_count",
      "cagr",
      "sharpe_ratio",
      "max_drawdown",
      "avg_r_per_trade",
      "trade_count"
    ]
  );

  return rows;
}

function expandGrid(grid) {
  const keys = Object.keys(grid);
  const rows = [];

  function build(index, current) {
    if (index >= keys.length) {
      rows.push({ ...current });
      return;
    }

    const key = keys[index];
    for (const value of grid[key]) {
      current[key] = value;
      build(index + 1, current);
    }
  }

  build(0, {});
  return rows;
}
