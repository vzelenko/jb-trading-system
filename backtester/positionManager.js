import { closePosition } from "../portfolio/portfolioManager.js";

export function updateOpenPositions({ portfolioState, currentDate, priceMap }) {
  const positions = [...portfolioState.openPositions];

  for (const position of positions) {
    const candle = priceMap.get(position.securityId);
    if (!candle) {
      continue;
    }

    const stopHit = position.direction === "long"
      ? candle.low_price <= position.stopPrice
      : candle.high_price >= position.stopPrice;
    if (stopHit) {
      exitRemaining(portfolioState, position, currentDate, position.stopPrice, "stop");
      continue;
    }

    if (!position.t1Hit && Number.isFinite(position.target1)) {
      const t1Hit = position.direction === "long"
        ? candle.high_price >= position.target1
        : candle.low_price <= position.target1;
      if (t1Hit) {
        scaleOut(portfolioState, position, position.target1);
      }
    }

    if (Number.isFinite(position.target2)) {
      const t2Hit = position.direction === "long"
        ? candle.high_price >= position.target2
        : candle.low_price <= position.target2;
      if (t2Hit) {
        exitRemaining(portfolioState, position, currentDate, position.target2, "target2");
        continue;
      }
    }

    const hmaCrossAgainst = position.direction === "long"
      ? candle.hmaFast < candle.hmaSlow
      : candle.hmaFast > candle.hmaSlow;
    if (hmaCrossAgainst) {
      exitRemaining(portfolioState, position, currentDate, candle.close_price, "hma_cross");
    }
  }
}

function scaleOut(portfolioState, position, exitPrice) {
  const sharesToExit = Math.floor(position.remainingShares / 2);
  if (sharesToExit <= 0) {
    position.t1Hit = true;
    position.stopPrice = position.entryPrice;
    return;
  }

  const pnl = calculatePnl(position, exitPrice, sharesToExit);
  portfolioState.cash += exitCashDelta(position, exitPrice, sharesToExit);
  position.remainingShares -= sharesToExit;
  position.realizedPnl += pnl;
  position.t1Hit = true;
  position.stopPrice = position.entryPrice;
  position.openRiskAmount = position.remainingShares * position.riskPerShare;
}

function exitRemaining(portfolioState, position, exitDate, exitPrice, reason) {
  const pnl = position.realizedPnl + calculatePnl(position, exitPrice, position.remainingShares);
  portfolioState.cash += exitCashDelta(position, exitPrice, position.remainingShares);
  const totalR = position.riskPerShare === 0 ? null : pnl / (position.riskPerShare * position.shares);

  closePosition(portfolioState, position, {
    exitDate,
    exitPrice,
    pnl,
    rMultiple: totalR,
    reason
  });
}

function calculatePnl(position, exitPrice, shares) {
  return position.direction === "long"
    ? (exitPrice - position.entryPrice) * shares
    : (position.entryPrice - exitPrice) * shares;
}

function realizedCashValue(position, exitPrice) {
  return position.direction === "long" ? exitPrice : -exitPrice;
}

function exitCashDelta(position, exitPrice, shares) {
  return shares * realizedCashValue(position, exitPrice);
}
