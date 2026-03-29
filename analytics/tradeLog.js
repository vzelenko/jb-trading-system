import { round } from "../utils/math.js";

export function buildTradeLogRows(closedTrades) {
  return closedTrades.map((trade) => ({
    ...trade,
    entry_price: round(trade.entry_price, 4),
    exit_price: round(trade.exit_price, 4),
    stop_price: round(trade.stop_price, 4),
    r_multiple: round(trade.r_multiple, 4),
    pnl: round(trade.pnl, 2)
  }));
}
