# JB Trading System

Systematic swing-trading backtester for discretionary concepts inspired by Adam H. Grimes and James Boyd.

## What It Does

- Loads split-adjusted daily data from PostgreSQL
- Aggregates weekly candles for multi-timeframe confirmation
- Computes trend, momentum, volatility, swing, and level features
- Ranks sectors and stocks using relative strength
- Evaluates four independent strategy modules
- Simulates entries, stops, partial exits, and HMA-based trailing exits
- Tracks portfolio-level risk, R-multiples, and performance analytics
- Supports parameter sweeps for core inputs

## Structure

- `data/`: data sources and market data assembly
- `indicators/`: indicator calculations and feature pipeline
- `trend/`: trend classification and weekly alignment
- `strategies/`: independent setup definitions
- `portfolio/`: sizing and constraint logic
- `backtester/`: event loop, sector rotation, optimization
- `analytics/`: metrics and trade log formatting
- `config/`: default and example configuration
- `scripts/`: backtest entry points
- `examples/`: deterministic mock dataset and generated sample outputs

## Running Against PostgreSQL

1. Install dependencies: `npm install`
2. Create a `.env` file from `.env.example`, or otherwise set database credentials with either `DATABASE_URL` or `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`
3. Run `npm run backtest`

Example `.env`:

```bash
cp .env.example .env
```

Optional config overrides:

```bash
npm run backtest -- --config '{"universe":{"startDate":"2015-01-01","endDate":"2024-12-31"},"optimization":{"enabled":true}}'
```

## Example Run

Run against the bundled deterministic dataset:

```bash
npm run example
```

Outputs are written to `examples/output/`.

## Assumptions

- Entries execute at the next session open plus 0.05% slippage
- Stops trigger intraday using daily high/low
- Commission is zero
- Risk per trade is 1% of current equity
- Max open risk is 10%, max positions is 8, max 2 positions per sector
- Partial exits take 50% at Target 1 and move stop to breakeven
- Remaining size exits at Target 2 or HMA fast/slow cross against the position

## Extending

- Add more strategies by returning compatible signal objects from `strategies/`
- Replace ranking logic in `backtester/sectorRotation.js` for alternate rotation models
- Add new optimization dimensions in `config/default.js` and `backtester/optimizer.js`
- Introduce realistic commissions and borrow costs in `portfolio/portfolioManager.js` and `backtester/positionManager.js`
