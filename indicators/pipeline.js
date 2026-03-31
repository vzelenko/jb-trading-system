import { ema } from "./ema.js";
import { hma } from "./hma.js";
import { macd } from "./macd.js";
import { atr } from "./atr.js";
import { roc } from "./roc.js";
import { detectSwings } from "./swings.js";
import { detectLevels } from "./supportResistance.js";

export function enrichSeriesWithIndicators(candles, indicatorConfig) {
  const closes = candles.map((candle) => candle.close_price);
  const emaFast = ema(closes, indicatorConfig.emaFast);
  const emaSlow = ema(closes, indicatorConfig.emaSlow);
  const hmaFast = hma(closes, indicatorConfig.hmaFast);
  const hmaSlow = hma(closes, indicatorConfig.hmaSlow);
  const macdValues = macd(
    closes,
    indicatorConfig.macdFast,
    indicatorConfig.macdSlow,
    indicatorConfig.macdSignal
  );
  const atrValues = atr(candles, indicatorConfig.atrLength);
  const rocPeriods = indicatorConfig.rocPeriods ?? [20, 50];
  const rocValues = {};
  for (const period of rocPeriods) {
    rocValues[`roc${period}`] = roc(closes, period);
  }
  const swings = detectSwings(candles, indicatorConfig.swingLookback);
  const levels = detectLevels(
    candles,
    indicatorConfig.supportResistanceWindow,
    indicatorConfig.supportResistanceTolerancePct
  );

  return candles.map((candle, index) => {
    const rocFields = {};
    for (const period of rocPeriods) {
      rocFields[`roc${period}`] = rocValues[`roc${period}`][index];
    }

    return {
      ...candle,
      emaFast: emaFast[index],
      emaSlow: emaSlow[index],
      hmaFast: hmaFast[index],
      hmaSlow: hmaSlow[index],
      macdLine: macdValues.line[index],
      macdSignal: macdValues.signal[index],
      macdHistogram: macdValues.histogram[index],
      atr: atrValues[index],
      ...rocFields,
      isSwingHigh: swings.swingHigh[index],
      isSwingLow: swings.swingLow[index],
      resistanceLevel: levels.resistance[index],
      supportLevel: levels.support[index]
    };
  });
}
