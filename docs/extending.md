# Extending the System

## New Features

- Add derived fields in `indicators/pipeline.js`
- Extend trend logic in `trend/classifier.js`
- Add alternate sector ranking models in `backtester/sectorRotation.js`
- Introduce new execution assumptions in `portfolio/portfolioManager.js` and `backtester/positionManager.js`

## New Strategies

1. Create a module in `strategies/`
2. Return a signal object with strategy type, direction, stop, targets, and metadata
3. Register the strategy inside `strategies/index.js`
4. Add parameter hooks in `config/default.js`

## Live Trading Path

- Replace the data source with a broker or market-data adapter
- Split signal generation from order routing
- Persist orders, fills, and portfolio snapshots
- Add borrow, fees, and market-impact models
