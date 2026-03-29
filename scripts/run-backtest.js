import { defaultConfig, mergeConfig } from "../config/default.js";
import { createPostgresDataSource } from "../data/postgresDataSource.js";
import { runBacktest } from "../backtester/engine.js";
import { runOptimization } from "../backtester/optimizer.js";

async function main() {
  const config = mergeConfig(defaultConfig, loadJsonArg("--config"));
  const dataSource = createPostgresDataSource(config.database);

  if (config.optimization.enabled) {
    const rows = await runOptimization({ dataSource, baseConfig: config });
    console.log(JSON.stringify({ optimizationRuns: rows.length }, null, 2));
    return;
  }

  const result = await runBacktest({ dataSource, config });
  console.log(JSON.stringify(result.metrics, null, 2));
}

function loadJsonArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index === process.argv.length - 1) {
    return {};
  }

  return JSON.parse(process.argv[index + 1]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
