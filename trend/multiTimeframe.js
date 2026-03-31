export function alignWeeklyTrend(weeklySeries, dailyDate) {
  let aligned = null;

  for (const weeklyBar of weeklySeries) {
    if (weeklyBar.date < dailyDate) {
      aligned = weeklyBar;
      continue;
    }

    break;
  }

  return aligned;
}
