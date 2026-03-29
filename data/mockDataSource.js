import sampleData from "../examples/sample-data.js";

export function createMockDataSource() {
  return {
    async loadSecurities() {
      return sampleData.securities;
    },
    async loadDailyCandles({ startDate, endDate }) {
      return sampleData.priceCandles.filter(
        (candle) => candle.date >= startDate && candle.date <= endDate && candle.timeframe === 1
      );
    }
  };
}
