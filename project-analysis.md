# JB Trading System - Comprehensive Analysis

**Date:** 2026-03-31
**Scope:** Full codebase review - bugs, weaknesses, risks, and improvement opportunities
**Sources:** Independent Claude analysis + validated findings from Gemini review

---

## Executive Summary

The system is a well-structured swing-trading backtester with 4 strategy modules, multi-timeframe trend analysis, portfolio-level risk management, and parameter optimization. The codebase is clean, uses ES modules, and separates concerns well.

However, the analysis uncovered **8 critical bugs** that collectively invalidate backtest results:

1. **Swing detection uses future data** (lookahead bias on every stop/target calculation)
2. **Short position exit cash is inverted** (all short P&L is wrong)
3. **Stops fill at exact price through gaps** (understates losses)
4. **O(n^2) performance bottlenecks** make real-data backtests infeasible
5. **Strategy target calculations produce invalid levels** for short positions
6. **Risk accounting inflates open risk** after partial exits, blocking new trades
7. **TOS strategy file won't compile** (missing input parameter)
8. **Near-zero test coverage** — none of these bugs would survive basic unit tests

The two enabled strategies (trend continuation, breakout) are long-only and produce plausible results on mock data. But the short-side code paths (breakout failure, trend termination) have never been exercised in any test, and contain multiple interacting bugs that would produce wildly incorrect results if enabled.

---

## 1. CRITICAL BUGS

### 1.1 Swing Detection Lookahead Bias

**File:** `indicators/swings.js:10-12`
```js
candles[index].high_price <= candles[index + offset].high_price
```
**Problem:** `detectSwings` confirms a swing point at bar T by inspecting bars T+1 and T+2 (with default lookback=2). Since `pipeline.js` pre-computes swings for the entire series before the backtest loop begins, strategies at simulation time T can access swings at T-1 that were confirmed using T+1 data — data that hasn't occurred yet in the simulation.

**How it propagates:** Every strategy uses `lastSwingLow()` or `lastSwingHigh()` or `priorSwingHigh()` from `helpers.js` to calculate stops and targets. These scan backward from the current bar and return the first swing found. A swing at T-1 that used T+1 data is "known" at time T — 2 bars before it could legitimately be confirmed.

**Impact:** Stop placement and target calculation benefit from perfect hindsight of short-term pivots. This inflates backtest performance metrics (win rate, R-multiples) in a way that cannot be replicated in live trading.

**Fix:** Shift swing flags forward by `lookback` periods so a swing at T is only visible at T+lookback. Alternatively, have strategies only access swings at index <= T - lookback.

**Severity:** CRITICAL (invalidates backtest results)

### 1.2 Short Position Exit Cash Accounting Is Inverted

**File:** `backtester/positionManager.js:85-91`
```js
function realizedCashValue(position, exitPrice) {
  return position.direction === "long" ? exitPrice : -exitPrice;
}
function exitCashDelta(position, exitPrice, shares) {
  return shares * realizedCashValue(position, exitPrice);
}
```
**Problem:** Covering a short position should return cash (positive delta). But `realizedCashValue` negates the exit price for shorts, making every short exit *subtract* cash from the portfolio.

**Example:** Short 100 shares at $50, cover at $40 ($10/share profit):
- Expected cash delta: +$4,000 (receive 100 * $40)
- Actual cash delta: 100 * (-$40) = **-$4,000**
- Portfolio shows $8,000 less than reality

Both `scaleOut()` (line 57) and `exitRemaining()` (line 67) call `exitCashDelta`, so partial and full exits are both affected.

**Currently masked** because both short strategies are disabled by default — but enabling them produces wildly wrong equity curves.

**Severity:** CRITICAL (corrupts all short position P&L)

### 1.3 Stop Fills Ignore Gap Risk

**File:** `backtester/positionManager.js:15-16`
```js
if (stopHit) {
  exitRemaining(portfolioState, position, currentDate, position.stopPrice, "stop");
```
**Problem:** When a stop is hit, the position exits at the exact `stopPrice` regardless of how far the bar actually traded through it. If a stock gaps down 5% past the stop (e.g., stop at $100, bar opens at $95), the engine still fills at $100.

**Impact:** Systematically understates losses and drawdowns. Combined with the lack of exit slippage on targets and HMA crosses, this creates a persistent optimistic bias in all metrics.

**Fix:** Exit at `Math.min(candle.open_price, position.stopPrice)` for longs, `Math.max(candle.open_price, position.stopPrice)` for shorts.

**Severity:** CRITICAL (inflates backtest performance)

### 1.4 O(n^2) Trend Classification

**File:** `trend/classifier.js:26`
```js
const emaSlowSeries = series.map((item) => item.emaSlow);
```
**Problem:** Inside a `.map()` callback over the entire candle series, this creates a new array of ALL emaSlow values on EVERY bar. For 5,000 bars: 25 million unnecessary operations and allocations.

**Fix:** Extract `emaSlowSeries` once before the `.map()`.

**Severity:** CRITICAL (performance)

### 1.5 O(D^2 * S) Engine Bar Lookup

**File:** `backtester/engine.js:23`
```js
const candle = series.find((item) => item.date === currentDate);
```
**Problem:** For every date and every security, a linear scan finds the matching candle. With D dates and S securities: O(D^2 * S). For 2,500 dates and 500 securities: ~3.1 billion string comparisons.

**Same pattern at:** `engine.js:39`, `engine.js:63`, `sectorRotation.js:13`

**Fix:** Pre-build `Map<securityId, Map<date, candle>>`.

**Severity:** CRITICAL (performance — dominates runtime)

### 1.6 Breakout Failure Target1 Can Be Above Entry (Loss Level for Shorts)

**File:** `strategies/breakoutFailure.js:30`
```js
const rangeMidpoint = breakoutBar.resistanceLevel - ((stopPrice - breakoutBar.resistanceLevel) * 0.5);
```
**Problem:** For a short trade, target1 must be BELOW entry. But this formula produces a value between the resistance level and the stop (above resistance). Since entry is below resistance, target1 is often above entry price.

**Concrete example:** resistance=100, breakoutBar.high=102 (so stop=102), entry at close=98:
- target1 = 100 - (102-100)*0.5 = **99** — above entry of 98
- The engine checks `candle.low_price <= position.target1` for short T1
- Since low <= 99 almost immediately, T1 "hits" on the first bar — booking a loss while marking the trade as "partially successful"
- Stop then moves to breakeven, converting a profitable short into a guaranteed loss

**Additionally:** No reward-to-risk validation exists for this strategy (unlike all other strategies), so these bad setups are never filtered out.

**Severity:** CRITICAL (generates systematically losing trades disguised as winners)

### 1.7 Trend Termination Targets Can Be Above Entry for Shorts

**File:** `strategies/trendTermination.js:25-26`
```js
const target1 = candle.emaSlow;
const target2 = candle.emaSlow - ((stopPrice - candle.close_price) * 0.75);
```
**Problem:** If `emaSlow > close_price` (possible when the classifier labels trend 4/5 based on other conditions), target1 is above entry — the "profit target" is a loss level for a short. Neither target is validated as being below entry.

**Severity:** CRITICAL (generates invalid short trade setups)

### 1.8 TOS Trend Continuation Strategy Won't Compile

**File:** `tos/trend_continuation_strategy.ts:72`
```thinkscript
def target2Level = EntryPrice() + (atr * stopAtrMultiplier * target2RMultiple);
```
**Problem:** `target2RMultiple` is referenced but never defined as an input in this file (it IS defined in the study file, but not the strategy). thinkScript will reject this with a compilation error.

**Severity:** CRITICAL (completely broken file)

---

## 2. HIGH-SEVERITY ISSUES

### 2.1 Risk Accounting Leak After Partial Exits

**File:** `backtester/positionManager.js:60-62`
```js
position.t1Hit = true;
position.stopPrice = position.entryPrice;  // breakeven
position.openRiskAmount = position.remainingShares * position.riskPerShare;  // BUG: original riskPerShare
```
**Problem:** After T1 is hit, the stop moves to breakeven (zero actual risk). But `openRiskAmount` is recalculated using the ORIGINAL `riskPerShare` (entry-to-original-stop distance), not the actual risk (entry-to-breakeven = 0). This causes `calculateOpenRisk()` in `riskManager.js` to overstate portfolio risk, falsely triggering the 10% max open risk limit and blocking legitimate new positions.

**Fix:** Set `position.riskPerShare = Math.abs(position.entryPrice - position.stopPrice)` after moving the stop, or simply set `openRiskAmount = 0` when stop equals entry.

**Severity:** HIGH (systematically reduces trade count by blocking valid entries)

### 2.2 Open Positions Never Closed at Backtest End

**File:** `backtester/engine.js:17-87`

When the backtest reaches the last date, remaining open positions are abandoned. They are marked-to-market but never formally closed:
- `closedTrades` is incomplete
- Win rate, expectancy, and R-multiples exclude these trades
- Final equity includes unrealized P&L that is never crystallized

**Severity:** HIGH

### 2.3 Standard Deviation Uses Population Formula

**File:** `utils/math.js:17`
```js
const variance = average(clean.map((value) => (value - mean) ** 2));
```
Divides by N instead of N-1 (sample variance). Understates volatility, inflating the Sharpe ratio. The example output shows Sharpe of 5.11.

**Severity:** HIGH (inflates key performance metric)

### 2.4 Signals Dropped on Missing Data (No Retry)

**File:** `backtester/engine.js:38-41`

Signals are queued for `nextDate` and processed only on that date. If the security has no candle on `nextDate` (halt, data gap, thin trading), the signal is silently dropped with no retry. No Time-In-Force (TIF) model exists.

**Impact:** Valid setups are randomly skipped based on data quality, reducing system performance in non-reproducible ways.

**Severity:** HIGH

### 2.5 TOS Stop/Target Levels Drift With ATR

**Files:** `tos/breakout_strategy.ts:72-73`, `tos/trend_continuation_strategy.ts:70-71`
```thinkscript
def stopLevel = EntryPrice() - atr * stopAtrBuffer;
```
Uses current-bar ATR, not entry-bar ATR. Stop and target levels shift every bar as volatility changes, violating fixed risk management.

**Severity:** HIGH

---

## 3. MEDIUM-SEVERITY ISSUES

### 3.1 Sector Rotation Lookback Config Ignored

**File:** `backtester/sectorRotation.js:18`

Config defines `sectorRankingLookback: 50` and `stockRankingLookback: 50`, but these are never referenced. Rankings use a single day's ROC50, making sector selection very noisy.

### 3.2 ROC Periods Hardcoded

**File:** `indicators/pipeline.js:22-23`
```js
const roc20 = roc(closes, 20);
const roc50 = roc(closes, 50);
```
Not config-driven. Users must edit source to change ROC periods.

### 3.3 Short Strategies Lack Weekly Trend Filter

**Files:** `strategies/breakoutFailure.js:7`, `strategies/trendTermination.js:7`

Both long strategies require weekly trend confirmation. Neither short strategy checks weekly context, allowing short signals against strong weekly uptrends.

### 3.4 Breakout Failure Target2 Can Be Null

**File:** `strategies/breakoutFailure.js:29`

If both `priorSwingLow()` returns null and `candle.supportLevel` is null, `target2` is null — included in the signal with no validation, causing NaN propagation downstream.

### 3.5 Trend Termination Targets Not Checked for Finite

**File:** `strategies/trendTermination.js:25-29`

`target1` and `target2` are never validated with `Number.isFinite()`. NaN emaSlow produces NaN targets that pass through uncaught.

### 3.6 Risk Manager Allows Positions With Negative Equity

**File:** `portfolio/riskManager.js:12-30`

No guard prevents opening positions when `portfolioState.equity <= 0`.

### 3.7 EMA State Leaks Across NaN Gaps

**File:** `indicators/ema.js:8-10`

Non-finite values are skipped with `continue` but the `previous` state persists, meaning post-gap values are influenced by pre-gap data.

### 3.8 Weekly-to-Daily Look-Ahead Bias on Fridays

**File:** `trend/multiTimeframe.js:4-13`, `data/aggregateWeekly.js:29`

Weekly bar `date` is set to the last day of the week. Friday daily bars can align to their own week's completed bar, which includes Friday's data — introducing look-ahead bias for one day per week.

### 3.9 CAGR Uses Data Points Instead of Calendar Dates

**File:** `analytics/metrics.js:7`
```js
const years = equityCurve.length / 252 || 1;
```
Should compute actual calendar-day difference between first and last equity curve dates.

### 3.10 Trend Classifier "Sticky Downtrend" State

**File:** `trend/classifier.js:54-69`

Once in strong downtrend (state 1), no condition exits it without meeting specific uptrend conditions. A flattening price remains classified as "strong downtrend" indefinitely. No consolidation or weakening-downtrend state exists.

### 3.11 Partial Exit Edge Case (1 Share)

**File:** `backtester/positionManager.js:49-53`

`Math.floor(1 / 2) = 0` — T1 is marked as "hit" and stop moves to breakeven, but no shares are actually sold and no P&L is booked. The single remaining share is held entirely for T2.

### 3.12 EMA Warm-Up Period Not Respected

**File:** `indicators/ema.js:12`

EMA seeds with the first value rather than an SMA of the first N values. The engine's `candleIndex < 30` guard provides partial protection, but ~50+ bars are needed for emaSlow=30 + MACD(6,13,9) to stabilize.

---

## 4. ROBUSTNESS ISSUES

### 4.1 No Survivorship Bias Protection

If a delisted stock stops having candles, open positions persist forever — `updateOpenPositions` silently skips missing data. Orphaned positions distort equity and risk.

### 4.2 No Data Validation Layer

Raw candle data from PostgreSQL is trusted. No checks for: missing dates, zero/negative prices, High < Low, duplicates, out-of-order dates.

### 4.3 No Config Validation

No validation that `emaFast < emaSlow`, `macdFast < macdSlow`, dates are valid ISO strings, numeric values are positive, or `PGPORT` parses to a number.

### 4.4 Database Connection Per Query

**File:** `data/postgresDataSource.js:6-7`

Each query creates a new `pg.Client`. For optimization grids, this could exhaust connection limits. Should use `pg.Pool`.

### 4.5 Mock Data Source Ignores securityIds Filter

**File:** `data/mockDataSource.js:8-11`

`loadDailyCandles()` accepts `securityIds` but doesn't filter, unlike the PostgreSQL version.

### 4.6 Partial Weeks at Data Boundaries

**File:** `data/aggregateWeekly.js`

Weeks with 1-2 days at start/end of data produce compressed bars with unreliable indicators.

### 4.7 No Logging or Observability

No logging framework, no progress reporting, no way to debug why a trade was or wasn't taken.

---

## 5. TEST COVERAGE

### 5.1 Near-Zero Test Coverage

**File:** `tests/run-tests.js`

The entire test suite is 2 assertions: ending equity is finite, trade log is an array. The mock data only exercises long trend continuation trades.

**Missing:** Unit tests for indicators, trend classifier, each strategy, position sizing, risk manager, short positions, weekly aggregation, known-answer integration tests, edge cases.

### 5.2 Short Strategies Are Completely Untested

Both short strategies are disabled by default. The example data produces only long trend continuation trades. Bugs 1.2, 1.6, 1.7, and 2.1 exist undetected because the short code path has never been executed.

### 5.3 Lint Is Inadequate

`node --check` only verifies syntax of 2 files. No ESLint, no type checking across 30+ source files.

---

## 6. PERFORMANCE ISSUES

| Issue | Location | Complexity | Notes |
|-------|----------|------------|-------|
| emaSlowSeries rebuilt per bar | `classifier.js:26` | O(n^2) | 25M ops for 5000 bars |
| Linear bar lookup in engine | `engine.js:23,39,63` | O(D^2*S) | Billions of comparisons |
| Linear bar lookup in rotation | `sectorRotation.js:13` | O(D*S) per date | Same class |
| Sort per bar in S/R detection | `supportResistance.js:19` | O(n*w*log(w)) | Acceptable for w=20 |
| pendingSignals never cleaned | `engine.js:15,82` | O(D) memory | Unnecessary retention |
| Sequential optimization | `optimizer.js:10` | Linear | Could parallelize |

---

## 7. THINKORSWIM SCRIPT ISSUES

| Issue | File | Severity |
|-------|------|----------|
| Won't compile (missing `target2RMultiple` input) | `trend_continuation_strategy.ts:72` | CRITICAL |
| Stop/target drift with current-bar ATR | Both `*_strategy.ts` | HIGH |
| `AddOrder` uses `open[-1]` (future price) | `breakout_strategy.ts:76-77` | HIGH |
| Hardcoded 100-share position size | Both `*_strategy.ts` | MEDIUM |
| Guide plots disappear after entry bar | Both `*_study.ts` | MEDIUM |
| `EntryPrice() > 0` instead of `rec inTrade` state | Both `*_strategy.ts` | MEDIUM |
| Trend conditions don't match JS trendType system | All TOS files | MEDIUM |
| `.ts` extension misleads (thinkScript, not TypeScript) | All TOS files | LOW |

---

## 8. SECURITY

| Area | Risk | Notes |
|------|------|-------|
| SQL Injection | LOW | Parameterized queries throughout |
| CLI JSON Parsing | LOW | `JSON.parse()` on local CLI arg, no try-catch |
| Path Traversal | LOW | `path.resolve()` used; local CLI tool |
| Credentials | MEDIUM | `.env` gitignored (good), no secrets management |
| Dependencies | LOW | Only 2 runtime deps (`dotenv`, `pg`); no `npm audit` |

---

## 9. CODE QUALITY

### Dead Code
- `utils/assert.js:1` — `invariant` exported, never imported
- `utils/date.js:5,9` — `compareDateKeys` and `addDays` unused
- `portfolio/riskManager.js:5-9` — `calculateGrossExposure` exported but only used internally

### Commented-Out Code
- `config/default.js:31-32` — Old MACD parameters (12/26) with no explanation
- `config/example.js:7-19` — Large block of commented-out overrides

### Inconsistent Error Handling
- `run-backtest.js:26` — `JSON.parse()` with no try-catch
- `data/db.js:27` — `client.connect()` outside try block
- `data/postgresDataSource.js:21,35` — No query error wrapping

---

## 10. GEMINI FINDINGS VALIDATION

The following summarizes the Gemini analysis (`findings/gemini/analysis.md`) and its validation status:

| Gemini Finding | Valid? | Notes |
|----------------|--------|-------|
| 1.1 Swing lookahead bias | **YES** | `swings.js:12` checks `index + offset`. Confirmed CRITICAL. Incorporated as bug 1.1 above. |
| 1.2 Optimistic stop fills | **YES** | `positionManager.js:16` fills at exact stopPrice through gaps. Incorporated as bug 1.3. |
| 1.3 Breakout failure target1 above entry | **YES** | Confirmed with concrete math. Incorporated as bug 1.6. |
| 2.1 Risk leak after scaleOut | **YES** | `riskPerShare` not zeroed when stop moves to breakeven. Incorporated as bug 2.1. |
| 2.2 Dropped signals on missing data | **YES** | No TIF model. Incorporated as issue 2.4. |
| 2.3 Partial exit with 1 share | **YES** | T1 marked hit, no P&L booked. Low severity. Incorporated as 3.11. |
| Math safety (NaN in ATR, div/0 in HMA) | **YES** | Gemini correctly identified these as safe after review. Confirmed. |

All 6 actionable Gemini findings were validated as correct and are incorporated into this report.

---

## 11. PRIORITIZED FIX LIST

### P0 - Must Fix (Correctness Blockers)

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | Swing detection lookahead bias | `swings.js:10-12` — shift flags forward by lookback |
| 2 | Short exit cash accounting inverted | `positionManager.js:85-91` — fix `realizedCashValue` for shorts |
| 3 | Stop fills ignore gap risk | `positionManager.js:16` — use `min(open, stop)` for longs |
| 4 | O(n^2) trend classifier | `classifier.js:26` — extract array before `.map()` |
| 5 | O(D^2*S) engine bar lookup | `engine.js:23,39,63` — use Map instead of `.find()` |
| 6 | Breakout failure target1 above entry for shorts | `breakoutFailure.js:30` — validate target < entry; add R:R check |
| 7 | Trend termination targets above entry for shorts | `trendTermination.js:25-28` — validate targets < entry |
| 8 | TOS trend continuation strategy won't compile | `trend_continuation_strategy.ts:72` — add `target2RMultiple` input |

### P1 - Should Fix (Results Accuracy)

| # | Issue | File:Line |
|---|-------|-----------|
| 9 | Risk leak: openRiskAmount after scaleOut | `positionManager.js:62` |
| 10 | Open positions not closed at backtest end | `engine.js:87` |
| 11 | StdDev uses population formula (N not N-1) | `math.js:17` |
| 12 | Sector ranking lookback config ignored | `sectorRotation.js:18` |
| 13 | ROC periods hardcoded | `pipeline.js:22-23` |
| 14 | Dropped signals with no retry/TIF | `engine.js:38-41` |
| 15 | Breakout failure target2 can be null | `breakoutFailure.js:29` |
| 16 | Trend termination targets not checked for finite | `trendTermination.js:25-26` |
| 17 | Risk manager allows negative equity | `riskManager.js:12-30` |
| 18 | TOS stop/target drift with ATR | Both `*_strategy.ts` |

### P2 - Should Fix (Robustness)

| # | Issue | File:Line |
|---|-------|-----------|
| 19 | EMA warm-up seeding (SMA of first N) | `ema.js:12` |
| 20 | Config validation | `config/default.js` |
| 21 | Data validation for candle integrity | `postgresDataSource.js` |
| 22 | Friday look-ahead bias in weekly alignment | `multiTimeframe.js` |
| 23 | Database connection pooling | `db.js` |
| 24 | Orphaned position handling | `positionManager.js:8` |
| 25 | CAGR using actual calendar dates | `metrics.js:7` |
| 26 | Short strategies need weekly trend filter | `breakoutFailure.js`, `trendTermination.js` |
| 27 | EMA state leaks across NaN gaps | `ema.js:8-10` |
| 28 | 1-share partial exit edge case | `positionManager.js:49-53` |

### P3 - Should Add (Quality)

| # | Issue |
|---|-------|
| 29 | Comprehensive unit test suite (especially short positions) |
| 30 | ESLint configuration |
| 31 | Logging framework with configurable verbosity |
| 32 | Progress reporting for long backtests |
| 33 | Cleanup pendingSignals Map after processing |
| 34 | Remove dead code and commented-out blocks |
| 35 | Fix TOS study guide plot persistence |
| 36 | Fix TOS AddOrder future price reference |

---

## Appendix: Complete File-by-File Issue Index

| File | Line | Severity | Issue |
|------|------|----------|-------|
| `indicators/swings.js` | 10-12 | **CRITICAL** | Lookahead bias — checks future bars |
| `backtester/positionManager.js` | 85-91 | **CRITICAL** | Short exit cash delta inverted |
| `backtester/positionManager.js` | 15-16 | **CRITICAL** | Stop fills at exact price through gaps |
| `trend/classifier.js` | 26 | **CRITICAL** | O(n^2) — array rebuilt per bar in `.map()` |
| `backtester/engine.js` | 23,39,63 | **CRITICAL** | O(n) linear search per bar per security |
| `strategies/breakoutFailure.js` | 30 | **CRITICAL** | Target1 above entry for shorts |
| `strategies/trendTermination.js` | 25-28 | **CRITICAL** | Targets not validated below entry for shorts |
| `tos/trend_continuation_strategy.ts` | 72 | **CRITICAL** | Missing input — won't compile |
| `backtester/positionManager.js` | 60-62 | HIGH | openRiskAmount uses stale riskPerShare |
| `backtester/engine.js` | 87 | HIGH | Open positions not closed at end |
| `utils/math.js` | 17 | HIGH | Population stddev (N not N-1) |
| `backtester/engine.js` | 38-41 | HIGH | Signals dropped with no retry |
| `tos/*_strategy.ts` | 70-73 | HIGH | Stop/target drift with ATR |
| `tests/run-tests.js` | — | HIGH | Near-zero test coverage |
| `strategies/breakoutFailure.js` | 29 | MEDIUM | target2 can be null |
| `strategies/trendTermination.js` | 25-26 | MEDIUM | Targets not checked for finite |
| `backtester/sectorRotation.js` | 18 | MEDIUM | Config lookback params unused |
| `indicators/pipeline.js` | 22-23 | MEDIUM | ROC periods hardcoded |
| `portfolio/riskManager.js` | 12-30 | MEDIUM | No negative equity guard |
| `analytics/metrics.js` | 7 | MEDIUM | CAGR uses data points / 252 |
| `indicators/ema.js` | 8-12 | MEDIUM | State leaks across NaN; no SMA seed |
| `trend/multiTimeframe.js` | 5-13 | MEDIUM | Friday look-ahead bias |
| `strategies/breakoutFailure.js` | 7 | MEDIUM | No weekly trend filter |
| `strategies/trendTermination.js` | 7 | MEDIUM | No weekly trend filter |
| `trend/classifier.js` | 54-69 | MEDIUM | Sticky downtrend state |
| `backtester/positionManager.js` | 49-53 | LOW | 1-share scale-out books no P&L |
| `data/aggregateWeekly.js` | 29 | LOW | Partial week boundary handling |
| `config/default.js` | — | LOW | No input validation |
| `tos/breakout_strategy.ts` | 76-77 | LOW | AddOrder uses open[-1] (future price) |
| `tos/*_study.ts` | 96-132 | LOW | Guide plots disappear after entry |
| `utils/assert.js` | 1 | INFO | Unused export |
| `utils/date.js` | 5,9 | INFO | Unused exports |
