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
      const gapFill = position.direction === "long"
        ? Math.min(candle.open_price, position.stopPrice)
        : Math.max(candle.open_price, position.stopPrice);
      exitRemaining(portfolioState, position, currentDate, gapFill, "stop");
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

    if (position.t1Hit) {
      const hmaCrossAgainst = position.direction === "long"
        ? candle.hmaFast < candle.hmaSlow && candle.close_price < candle.hmaSlow
        : candle.hmaFast > candle.hmaSlow && candle.close_price > candle.hmaSlow;
      if (hmaCrossAgainst) {
        exitRemaining(portfolioState, position, currentDate, candle.close_price, "hma_cross");
      }
    }
  }
}

function scaleOut(portfolioState, position, exitPrice) {
  if (position.remainingShares < 1) {
    return;
  }

  const sharesToExit = Math.max(1, Math.floor(position.remainingShares / 2));

  const pnl = calculatePnl(position, exitPrice, sharesToExit);
  portfolioState.cash += exitCashDelta(position, exitPrice, sharesToExit);
  position.remainingShares -= sharesToExit;
  position.realizedPnl += pnl;
  position.t1Hit = true;
  position.stopPrice = position.entryPrice;
  position.initialRiskPerShare = position.initialRiskPerShare ?? position.riskPerShare;
  position.riskPerShare = 0;
  position.openRiskAmount = 0;
}

export function exitRemaining(portfolioState, position, exitDate, exitPrice, reason) {
  const pnl = position.realizedPnl + calculatePnl(position, exitPrice, position.remainingShares);
  portfolioState.cash += exitCashDelta(position, exitPrice, position.remainingShares);
  const effectiveRiskPerShare = position.riskPerShare || position.initialRiskPerShare;
  const totalR = effectiveRiskPerShare ? pnl / (effectiveRiskPerShare * position.shares) : null;

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
