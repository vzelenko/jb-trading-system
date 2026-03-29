export const defaultConfig = {
  database: {
    connectionString: process.env.DATABASE_URL ?? null,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "postgres",
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? ""
  },
  universe: {
    indexMembership: null,
    startDate: "2010-01-01",
    endDate: "2025-12-31",
    sectorsToTrade: 4,
    sectorRankingLookback: 50,
    stockRankingLookback: 50,
    minDailyHistory: 260
  },
  timeframes: {
    daily: 1
  },
  indicators: {
    emaFast: 10,
    emaSlow: 30,
    hmaFast: 10,
    hmaSlow: 20,
    atrLength: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    slopeLookback: 5,
    supportResistanceWindow: 20,
    supportResistanceTolerancePct: 0.0075,
    swingLookback: 2
  },
  strategies: {
    trendContinuation: {
      enabled: true,
      pullbackAtrThreshold: 1.25,
      stopAtrMultiplier: 1.75,
      target2RMultiple: 2,
      useHmaConfirmation: true
    },
    breakout: {
      enabled: true,
      consolidationBars: 8,
      retestBars: 3,
      stopAtrBuffer: 0.4,
      targetAtrMultiplier: 2.5
    },
    breakoutFailure: {
      enabled: true,
      failureBars: 3,
      impulseAtrThreshold: 0.8
    },
    trendTermination: {
      enabled: true,
      extensionAtrMultiple: 2,
      exhaustionHistogramLookback: 3
    }
  },
  execution: {
    slippagePct: 0.0005,
    commissionPerTrade: 0,
    entryTiming: "next_open"
  },
  portfolio: {
    initialEquity: 100000,
    riskPerTradePct: 0.01,
    maxOpenRiskPct: 0.1,
    maxPositions: 8,
    maxPositionsPerSector: 2
  },
  outputs: {
    outputDir: "outputs",
    tradeLogFile: "trade-log.csv",
    metricsFile: "summary-metrics.json",
    optimizationFile: "optimization-results.csv"
  },
  optimization: {
    enabled: false,
    parameterGrid: {
      emaFast: [10],
      emaSlow: [30],
      atrStopMultiplier: [1.75],
      sectorCount: [4]
    }
  }
};

export function mergeConfig(baseConfig, overrideConfig = {}) {
  const output = { ...baseConfig };

  for (const [key, value] of Object.entries(overrideConfig)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = mergeConfig(baseConfig[key] ?? {}, value);
      continue;
    }

    output[key] = value;
  }

  return output;
}
