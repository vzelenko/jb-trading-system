# Strategy Rules

## Trend Model

Trend states are derived from EMA fast/slow structure, EMA slow slope, MACD condition, and ATR-based extension:

- Trend 1: price below EMA fast below EMA slow with falling EMA slow
- Trend 2: early upside transition with price reclaiming EMA fast and bullish MACD
- Trend 3: aligned uptrend with positive MACD
- Trend 4: extended uptrend with ATR expansion and weakening histogram
- Trend 5: exhaustion after losing EMA fast with bearish MACD cross

Weekly trend is aligned to each daily bar and used as higher-timeframe context.

## Strategy 1: Trend Continuation

- Requires daily trend 2 or 3 and weekly trend 2, 3, or 4
- Pullback must remain near EMA fast/slow relative to ATR
- MACD must remain bullish
- Entry confirmation is a bullish candle, optionally above HMA fast
- Stop uses the tighter of recent swing low or ATR-based stop
- Target 1 uses prior swing high
- Target 2 uses a fixed R multiple

## Strategy 2: Breakout

- Requires trend 3 or 4 plus weekly confirmation
- Resistance must be touched at least twice in a recent consolidation
- Entry requires a close above resistance with a valid retest context
- Stop is just below the breakout level with ATR buffer
- Targets use 1R for partial and ATR extension for final exit

## Strategy 3: Breakout Failure

- Detects recent breakout bars that fail within a configurable bar count
- Requires close back below resistance, bearish confirmation candle, and range expansion
- Stop is above the failed breakout extreme
- Target 1 uses a range midpoint proxy
- Target 2 uses prior swing low or support

## Strategy 4: Trend Termination

- Requires trend 4 or 5
- Price must be extended from EMA slow by an ATR multiple
- MACD histogram must be weakening across recent bars
- Entry requires a bearish reversal structure below EMA fast
- Stop uses the recent swing high
- Targets revert toward EMA slow and an extended mean-reversion objective
