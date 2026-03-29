import { buildTrendContinuationSignal } from "./trendContinuation.js";
import { buildBreakoutSignal } from "./breakout.js";
import { buildBreakoutFailureSignal } from "./breakoutFailure.js";
import { buildTrendTerminationSignal } from "./trendTermination.js";

export function generateSignalsForContext(context, index, config) {
  return [
    buildTrendContinuationSignal(context, index, config),
    buildBreakoutSignal(context, index, config),
    buildBreakoutFailureSignal(context, index, config),
    buildTrendTerminationSignal(context, index, config)
  ].filter(Boolean);
}
