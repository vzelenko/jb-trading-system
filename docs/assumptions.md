# Assumptions

## Data

- `price_candles.timeframe = 1` represents daily candles
- Input data is survivorship-bias adjusted
- Prices are adjusted for splits and dividends
- Weekly bars are aggregated from daily data inside the application

## Execution

- Signals are generated after the close and filled on the next session open
- Slippage is modeled as 5 basis points per entry
- Stops are checked against daily intraday extremes
- No commissions are charged by default

## Risk

- Position size uses current equity and initial stop distance
- Open risk is capped at 10% of equity
- Portfolio limits are enforced before new positions are opened
- Short trades are supported for breakout failure and trend termination modules

## Research Notes

- Strategy rules are intentionally transparent rather than curve-fit
- Support and resistance detection uses repeated touches within a tolerance band
- MACD divergence is approximated through histogram weakening to keep the engine deterministic
