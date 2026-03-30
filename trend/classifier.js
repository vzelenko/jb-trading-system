function slopeUp(series, index, lookback) {
  if (index < lookback || !Number.isFinite(series[index]) || !Number.isFinite(series[index - lookback])) {
    return false;
  }

  return series[index] > series[index - lookback];
}

function slopeDown(series, index, lookback) {
  if (index < lookback || !Number.isFinite(series[index]) || !Number.isFinite(series[index - lookback])) {
    return false;
  }

  return series[index] < series[index - lookback];
}

export function classifyTrendSeries(candles, config) {
  const slopeLookback = config.indicators.slopeLookback;

  return candles.map((candle, index, series) => {
    const close = candle.close_price;
    const emaFast = candle.emaFast;
    const emaSlow = candle.emaSlow;
    const atr = candle.atr;
    const histogramPrev = index > 0 ? series[index - 1].macdHistogram : null;
    const emaSlowSeries = series.map((item) => item.emaSlow);
    let trendType = 0;
    let trendLabel = "Undefined";

    const strongDown = close < emaFast && emaFast < emaSlow && slopeDown(emaSlowSeries, index, slopeLookback);
    const earlyUp =
      index > 0 &&
      series[index - 1].close_price <= series[index - 1].emaFast &&
      close > emaFast &&
      emaFast <= emaSlow * 1.01 &&
      candle.macdLine > candle.macdSignal;
    const strongUp =
      close > emaFast &&
      emaFast > emaSlow &&
      slopeUp(emaSlowSeries, index, slopeLookback) &&
      candle.macdLine > 0;
    const extendedUp =
      strongUp &&
      Number.isFinite(atr) &&
      close - emaFast > atr * 1.5 &&
      Number.isFinite(histogramPrev) &&
      candle.macdHistogram < histogramPrev;
    const exhaustion =
      index > 0 &&
      close < emaFast &&
      series[index - 1].close_price >= series[index - 1].emaFast &&
      candle.macdLine < candle.macdSignal;

    if (strongDown) {
      trendType = 1;
      trendLabel = "Strong Downtrend";
    } else if (earlyUp) {
      trendType = 2;
      trendLabel = "Reversal / Early Uptrend";
    } else if (extendedUp) {
      trendType = 4;
      trendLabel = "Extended Uptrend";
    } else if (strongUp) {
      trendType = 3;
      trendLabel = "Strong Uptrend";
    } else if (exhaustion) {
      trendType = 5;
      trendLabel = "Exhaustion / Distribution";
    }

    return {
      ...candle,
      trendType,
      trendLabel
    };
  });
}
