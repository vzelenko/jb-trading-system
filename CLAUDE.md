# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run example      # Run backtest against bundled sample data (no DB needed)
npm run backtest     # Run backtest against PostgreSQL
npm run test         # Smoke tests (validates equity and trade log output)
npm run lint         # Syntax check via node --check
```

**Config overrides** can be passed as a JSON string argument:
```bash
node scripts/run-backtest.js '{"portfolio":{"initialEquity":50000}}'
```

**PostgreSQL setup** requires environment variables from `.env` (see `.env.example`): either `DATABASE_URL` or individual `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` vars.

## Architecture

This is a Node.js (ES modules, no build step, no TypeScript) event-driven backtester for swing trading strategies.

### Data Flow

```
PostgreSQL / mock data
  → data/marketDataService.js     # loads, filters, enriches all securities
    → indicators/pipeline.js      # computes EMA, HMA, MACD, ATR, ROC, swings, S/R on daily + weekly
    → trend/classifier.js         # assigns 1 of 5 trend states per bar
    → trend/multiTimeframe.js     # aligns weekly trend context onto daily bars
  → backtester/engine.js          # main daily event loop
    → backtester/sectorRotation.js  # ranks sectors/stocks by relative strength
    → strategies/index.js         # evaluates all 4 strategies → signal list
    → portfolio/riskManager.js    # filters signals by position/sector/risk limits
    → portfolio/positionSizer.js  # sizes positions at 1% risk per trade
    → portfolio/portfolioManager.js # executes entries, mark-to-market
    → backtester/positionManager.js # monitors stops, targets, HMA trailing exits, partial exits
  → analytics/metrics.js          # CAGR, Sharpe, max drawdown, win rate, R-multiple expectancy
  → utils/io.js                   # writes CSV trade log + JSON metrics to outputs/
```

### Key Modules

- **`config/default.js`** — single source of truth for all parameters (indicators, strategies, portfolio, output paths). `config/example.js` overrides for the sample run.
- **`data/` directory** — `postgresDataSource.js` and `mockDataSource.js` implement the same interface; swap by passing a different source to `marketDataService.js`.
- **`strategies/`** — four independent modules (`trendContinuation`, `breakout`, `breakoutFailure`, `trendTermination`), each returning a signal object; registered in `strategies/index.js`. Add new strategies here.
- **`backtester/optimizer.js`** — runs parameter grid sweeps; disabled by default in config.
- **`tos/`** — Thinkorswim ThinkScript files for charting the same strategies (not part of the JS pipeline).

### Execution Assumptions

- Signals generated on close, filled at **next session open + 0.05% slippage**
- Stops trigger on **intraday high/low** (not close)
- **1% equity risk per trade**, max 10% open risk, max 8 positions, max 2 per sector
- Partial exit: 50% at T1 → stop moves to breakeven; remainder exits at T2 or HMA cross

### Adding a New Strategy

1. Create `strategies/myStrategy.js` returning `{ ticker, strategy, direction, entry, stop, t1, t2, rank }`
2. Register it in `strategies/index.js`
3. Add its parameter block to `config/default.js`

### Database Schema

Two tables expected in PostgreSQL:
- `securities(id, ticker, sector, industry, index_membership)`
- `price_candles(security_id, date, open, high, low, close, volume, timeframe)` — timeframe `'daily'` and `'weekly'`
