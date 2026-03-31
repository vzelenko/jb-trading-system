declare upper;

input emaFastLength = 10;
input emaSlowLength = 30;
input atrLength = 14;
input macdFastLength = 6;
input macdSlowLength = 13;
input macdSignalLength = 9;
input slopeLookback = 5;
input consolidationBars = 10;
input retestBars = 3;
input minTouches = 3;
input resistanceTolerancePct = 0.01;
input stopAtrBuffer = 0.3;
input minBreakoutClosePct = 0.0025;
input maxBreakoutExtensionAtr = 1.2;
input minRewardToTarget2 = 1.25;
input targetAtrMultiplier = 2.5;
input weeklyAgg = AggregationPeriod.WEEK;

def c = close;
def h = high;
def l = low;
def o = open;

def emaFast = ExpAverage(c, emaFastLength);
def emaSlow = ExpAverage(c, emaSlowLength);
def atr = WildersAverage(TrueRange(h, c, l), atrLength);
def macdValue = MACD(fastLength = macdFastLength, slowLength = macdSlowLength, MACDLength = macdSignalLength).Value;
def macdHist = MACD(fastLength = macdFastLength, slowLength = macdSlowLength, MACDLength = macdSignalLength).Diff;

def weeklyClose = close(period = weeklyAgg);
def weeklyEmaFast = ExpAverage(weeklyClose, emaFastLength);
def weeklyEmaSlow = ExpAverage(weeklyClose, emaSlowLength);
def weeklyMacdFast = ExpAverage(weeklyClose, macdFastLength);
def weeklyMacdSlow = ExpAverage(weeklyClose, macdSlowLength);
def weeklyMacdValue = weeklyMacdFast - weeklyMacdSlow;
def weeklyAtr = WildersAverage(TrueRange(high(period = weeklyAgg), weeklyClose, low(period = weeklyAgg)), atrLength);
def weeklyMacdAvg = ExpAverage(weeklyMacdValue, macdSignalLength);
def weeklyHist = weeklyMacdValue - weeklyMacdAvg;

def dailyStrongUp = c > emaFast and emaFast > emaSlow and emaSlow > emaSlow[slopeLookback] and macdValue > 0;
def dailyExtendedUp = dailyStrongUp and !IsNaN(atr) and c - emaFast > atr * 1.5 and macdHist < macdHist[1];
def weeklyStrongUp = weeklyClose > weeklyEmaFast and weeklyEmaFast > weeklyEmaSlow and weeklyEmaSlow > weeklyEmaSlow[slopeLookback] and weeklyMacdValue > 0;
def weeklyExtendedUp = weeklyStrongUp and !IsNaN(weeklyAtr) and weeklyClose - weeklyEmaFast > weeklyAtr * 1.5 and weeklyHist < weeklyHist[1];

def resistance = Highest(h[1], consolidationBars);
def nearResistance = AbsValue(h - resistance) <= resistance * resistanceTolerancePct;
def nearResistanceCount = Sum(if nearResistance then 1 else 0, consolidationBars);
def setupStop = resistance - atr * stopAtrBuffer;
def setupRisk = c - setupStop;
def setupTarget2 = c + atr * targetAtrMultiplier;
def breakoutClosePct = if resistance != 0 then (c - resistance) / resistance else Double.NaN;
def breakoutExtensionAtr = if atr != 0 then (c - resistance) / atr else Double.NaN;

def entrySignal =
    (dailyStrongUp or dailyExtendedUp) and
    (weeklyStrongUp or weeklyExtendedUp) and
    nearResistanceCount >= minTouches and
    c > resistance and
    c > o and
    Sum(if c[1] <= resistance[1] then 1 else 0, retestBars) == retestBars and
    l <= resistance * 1.005 and
    !IsNaN(breakoutClosePct) and
    breakoutClosePct >= minBreakoutClosePct and
    !IsNaN(breakoutExtensionAtr) and
    breakoutExtensionAtr <= maxBreakoutExtensionAtr and
    setupRisk > 0 and
    setupTarget2 - c >= setupRisk * minRewardToTarget2;

def hasPosition = EntryPrice() > 0;
rec entryAtr = if hasPosition and !hasPosition[1] then atr else if hasPosition then entryAtr[1] else Double.NaN;
def stopLevel = EntryPrice() - entryAtr * stopAtrBuffer;
def target2Level = EntryPrice() + entryAtr * targetAtrMultiplier;
def exitSignal = hasPosition and (l <= stopLevel or h >= target2Level);

AddOrder(OrderType.BUY_AUTO, entrySignal, open[-1], 100, Color.CYAN, Color.CYAN, "BO Entry");
AddOrder(OrderType.SELL_AUTO, exitSignal, open[-1], 100, Color.RED, Color.RED, "BO Exit");
