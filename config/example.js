import { defaultConfig, mergeConfig } from "./default.js";

export const exampleConfig = mergeConfig(defaultConfig, {
  universe: {
    minDailyHistory: 100,
    sectorsToTrade: 6
  },
  outputs: {
    outputDir: "examples/output"
  },
  optimization: {
    enabled: true
  }
});
