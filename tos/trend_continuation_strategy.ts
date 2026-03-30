declare upper;

input emaFastLength = 10;
input emaSlowLength = 30;
input hmaFastLength = 10;
input hmaSlowLength = 20;
input atrLength = 14;
input macdFastLength = 6;
input macdSlowLength = 13;
input macdSignalLength = 9;
input slopeLookback = 5;
input pullbackAtrThreshold = 0.8;
input stopAtrMultiplier = 1.75;
input minRewardToTarget1 = 0.75;
input target2RMultiple = 2.0;
input swingLookbackBars = 10;
input weeklyAgg = AggregationPeriod.WEEK;

def c = close;
def h = high;
def l = low;
def o = open;

def emaFast = ExpAverage(c, emaFastLength);
def emaSlow = ExpAverage(c, emaSlowLength);
def hmaFast = HullMovingAvg(c, hmaFastLength);
def hmaSlow = HullMovingAvg(c, hmaSlowLength);
def atr = WildersAverage(TrueRange(h, c, l), atrLength);

def macdValue = MACD(fastLength = macdFastLength, slowLength = macdSlowLength, MACDLength = macdSignalLength).Value;
def macdAvg = MACD(fastLength = macdFastLength, slowLength = macdSlowLength, MACDLength = macdSignalLength).Avg;

def weeklyClose = close(period = weeklyAgg);
def weeklyEmaFast = ExpAverage(weeklyClose, emaFastLength);
def weeklyEmaSlow = ExpAverage(weeklyClose, emaSlowLength);
def weeklyMacdFast = ExpAverage(weeklyClose, macdFastLength);
def weeklyMacdSlow = ExpAverage(weeklyClose, macdSlowLength);
def weeklyMacdValue = weeklyMacdFast - weeklyMacdSlow;
def weeklyMacdAvg = ExpAverage(weeklyMacdValue, macdSignalLength);
def weeklyAtr = WildersAverage(TrueRange(high(period = weeklyAgg), weeklyClose, low(period = weeklyAgg)), atrLength);
def weeklyHist = weeklyMacdValue - weeklyMacdAvg;

def dailyEarlyUp = c[1] <= emaFast[1] and c > emaFast and emaFast <= emaSlow * 1.01 and macdValue > macdAvg;
def dailyStrongUp = c > emaFast and emaFast > emaSlow and emaSlow > emaSlow[slopeLookback] and macdValue > 0;
def weeklyEarlyUp = weeklyClose > weeklyEmaFast and weeklyEmaFast <= weeklyEmaSlow * 1.01 and weeklyMacdValue > weeklyMacdAvg;
def weeklyStrongUp = weeklyClose > weeklyEmaFast and weeklyEmaFast > weeklyEmaSlow and weeklyEmaSlow > weeklyEmaSlow[slopeLookback] and weeklyMacdValue > 0;
def weeklyExtendedUp = weeklyStrongUp and !IsNaN(weeklyAtr) and weeklyClose - weeklyEmaFast > weeklyAtr * 1.5 and weeklyHist < weeklyHist[1];

def pullbackDistance = Min(AbsValue(c - emaFast), AbsValue(c - emaSlow));
def nearTrendMean = !IsNaN(atr) and pullbackDistance <= atr * pullbackAtrThreshold;
def priorPullback = l[1] <= emaFast[1] and AbsValue(c[1] - emaFast[1]) <= atr[1] * pullbackAtrThreshold;
def setupStop = Min(Lowest(l[1], swingLookbackBars), c - atr * stopAtrMultiplier);
def setupRisk = c - setupStop;
def setupTarget1 = Highest(h[1], 20);
def rewardToTarget1 = setupTarget1 - c;

def entrySignal =
    (dailyEarlyUp or dailyStrongUp) and
    (weeklyEarlyUp or weeklyStrongUp or weeklyExtendedUp) and
    nearTrendMean and
    priorPullback and
    c > emaFast and
    c > o and
    c > hmaFast and
    macdValue > macdAvg and
    setupRisk > 0 and
    rewardToTarget1 > 0 and
    rewardToTarget1 >= setupRisk * minRewardToTarget1;

def hasPosition = EntryPrice() > 0;
def stopLevel = EntryPrice() - atr * stopAtrMultiplier;
def target2Level = EntryPrice() + (atr * stopAtrMultiplier * target2RMultiple);
def exitSignal = hasPosition and (l <= stopLevel or h >= target2Level or hmaFast < hmaSlow);

AddOrder(OrderType.BUY_AUTO, entrySignal, open[-1], 100, Color.GREEN, Color.GREEN, "TC Entry");
AddOrder(OrderType.SELL_AUTO, exitSignal, open[-1], 100, Color.RED, Color.RED, "TC Exit");
