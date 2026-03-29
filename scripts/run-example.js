import { exampleConfig } from "../config/example.js";
import { createMockDataSource } from "../data/mockDataSource.js";
import { runBacktest } from "../backtester/engine.js";

async function main() {
  const result = await runBacktest({
    dataSource: createMockDataSource(),
    config: exampleConfig
  });

  console.log(JSON.stringify(result.metrics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
