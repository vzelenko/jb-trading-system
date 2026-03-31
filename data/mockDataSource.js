import sampleData from "../examples/sample-data.js";

export function createMockDataSource() {
  return {
    async loadSecurities() {
      return sampleData.securities;
    },
    async loadDailyCandles({ startDate, endDate, securityIds }) {
      return sampleData.priceCandles.filter(
        (candle) =>
          candle.date >= startDate &&
          candle.date <= endDate &&
          candle.timeframe === 1 &&
          (!securityIds || securityIds.includes(candle.security_id))
      );
    }
  };
}
