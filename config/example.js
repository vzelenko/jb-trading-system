import { defaultConfig, mergeConfig } from "./default.js";

export const exampleConfig = mergeConfig(defaultConfig, {
  universe: {
    startDate: "2019-06-01",
    endDate: "2020-08-31",
    minDailyHistory: 100,
    sectorsToTrade: 6
  },
  strategies: {
    trendContinuation: {
      pullbackAtrThreshold: 1.6
    },
    breakout: {
      consolidationBars: 6
    },
    breakoutFailure: {
      failureBars: 4
    },
    trendTermination: {
      extensionAtrMultiple: 1.5
    }
  },
  outputs: {
    outputDir: "examples/output"
  }
});
