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

def dailyEarlyUp =
    c[1] <= emaFast[1] and
    c > emaFast and
    emaFast <= emaSlow * 1.01 and
    macdValue > macdAvg;

def dailyStrongUp =
    c > emaFast and
    emaFast > emaSlow and
    emaSlow > emaSlow[slopeLookback] and
    macdValue > 0;

def weeklyEarlyUp =
    weeklyClose > weeklyEmaFast and
    weeklyEmaFast <= weeklyEmaSlow * 1.01 and
    weeklyMacdValue > weeklyMacdAvg;

def weeklyStrongUp =
    weeklyClose > weeklyEmaFast and
    weeklyEmaFast > weeklyEmaSlow and
    weeklyEmaSlow > weeklyEmaSlow[slopeLookback] and
    weeklyMacdValue > 0;

def weeklyExtendedUp =
    weeklyStrongUp and
    !IsNaN(weeklyAtr) and
    weeklyClose - weeklyEmaFast > weeklyAtr * 1.5 and
    weeklyHist < weeklyHist[1];

def dailyTrendOk = dailyEarlyUp or dailyStrongUp;
def weeklyTrendOk = weeklyEarlyUp or weeklyStrongUp or weeklyExtendedUp;

def pullbackDistance = Min(AbsValue(c - emaFast), AbsValue(c - emaSlow));
def nearTrendMean = !IsNaN(atr) and pullbackDistance <= atr * pullbackAtrThreshold;
def priorPullback =
    l[1] <= emaFast[1] and
    AbsValue(c[1] - emaFast[1]) <= atr[1] * pullbackAtrThreshold;
def reclaimedFast = c > emaFast;
def bullishCandle = c > o;
def hmaConfirmed = c > hmaFast;
def macdBullish = macdValue > macdAvg;

def stopFromSwing = Lowest(l[1], swingLookbackBars);
def stopFromAtr = c - atr * stopAtrMultiplier;
def stopPrice = Min(stopFromSwing, stopFromAtr);
def riskPerShare = c - stopPrice;
def target1 = Highest(h[1], 20);
def rewardToTarget1 = target1 - c;

def buySignal =
    dailyTrendOk and
    weeklyTrendOk and
    nearTrendMean and
    priorPullback and
    reclaimedFast and
    bullishCandle and
    hmaConfirmed and
    macdBullish and
    riskPerShare > 0 and
    rewardToTarget1 > 0 and
    rewardToTarget1 >= riskPerShare * minRewardToTarget1;

rec inTrade = CompoundValue(1, if buySignal then 1 else if inTrade[1] and (l <= stopPrice[1] or hmaFast < hmaSlow) then 0 else inTrade[1], 0);
def sellSignal = inTrade[1] and (l <= stopPrice[1] or hmaFast < hmaSlow);

plot BuySignal = buySignal;
BuySignal.SetPaintingStrategy(PaintingStrategy.BOOLEAN_ARROW_UP);
BuySignal.SetDefaultColor(Color.GREEN);
BuySignal.SetLineWeight(3);

plot SellSignal = sellSignal;
SellSignal.SetPaintingStrategy(PaintingStrategy.BOOLEAN_ARROW_DOWN);
SellSignal.SetDefaultColor(Color.RED);
SellSignal.SetLineWeight(3);

plot FastEMA = emaFast;
FastEMA.SetDefaultColor(Color.CYAN);

plot SlowEMA = emaSlow;
SlowEMA.SetDefaultColor(Color.BLUE);

plot FastHMA = hmaFast;
FastHMA.SetDefaultColor(Color.YELLOW);

plot StopGuide = if buySignal then stopPrice else Double.NaN;
StopGuide.SetPaintingStrategy(PaintingStrategy.POINTS);
StopGuide.SetDefaultColor(Color.RED);

plot Target1Guide = if buySignal then target1 else Double.NaN;
Target1Guide.SetPaintingStrategy(PaintingStrategy.POINTS);
Target1Guide.SetDefaultColor(Color.GREEN);

AddLabel(yes, if buySignal then "Trend Continuation Buy" else if sellSignal then "Trend Continuation Sell" else "Trend Continuation Idle", if buySignal then Color.GREEN else if sellSignal then Color.RED else Color.GRAY);

Alert(buySignal, "Trend Continuation Buy", Alert.BAR, Sound.Ding);
Alert(sellSignal, "Trend Continuation Sell", Alert.BAR, Sound.Bell);
