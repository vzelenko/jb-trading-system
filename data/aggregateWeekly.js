import { getWeekKey } from "../utils/date.js";

export function aggregateWeeklyCandles(dailyCandles) {
  const weeklyMap = new Map();

  for (const candle of dailyCandles) {
    const key = `${candle.security_id}:${getWeekKey(candle.date)}`;
    const existing = weeklyMap.get(key);

    if (!existing) {
      weeklyMap.set(key, {
        security_id: candle.security_id,
        week: getWeekKey(candle.date),
        date: candle.date,
        open_price: candle.open_price,
        high_price: candle.high_price,
        low_price: candle.low_price,
        close_price: candle.close_price,
        volume: candle.volume,
        timeframe: "W"
      });
      continue;
    }

    existing.high_price = Math.max(existing.high_price, candle.high_price);
    existing.low_price = Math.min(existing.low_price, candle.low_price);
    existing.close_price = candle.close_price;
    existing.volume += candle.volume;
    existing.date = candle.date;
  }

  return [...weeklyMap.values()].sort((left, right) =>
    left.security_id === right.security_id
      ? left.date.localeCompare(right.date)
      : left.security_id - right.security_id
  );
}
