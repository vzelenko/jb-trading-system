import { exampleConfig } from "../config/example.js";
import { createMockDataSource } from "../data/mockDataSource.js";
import { runBacktest } from "../backtester/engine.js";

async function main() {
  const result = await runBacktest({
    dataSource: createMockDataSource(),
    config: exampleConfig
  });

  if (!Number.isFinite(result.metrics.endingEquity)) {
    throw new Error("Expected finite ending equity.");
  }

  if (!Array.isArray(result.tradeLog)) {
    throw new Error("Expected trade log array.");
  }

  console.log("Tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
