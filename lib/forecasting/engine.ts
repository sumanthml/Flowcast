import { ForecastMethod, ForecastResult, ForecastPoint, ForecastMetrics, SalesRecord } from '@/types';

export interface DailySalesDataPoint {
  date: string; // YYYY-MM-DD
  quantity: number;
}

/**
 * Aggregates raw sales transactions into a continuous daily time-series.
 * Missing dates are populated with 0 quantity so intermittent days are captured.
 */
export function buildDailyTimeSeries(sales: SalesRecord[], daysBack: number = 60): DailySalesDataPoint[] {
  if (!sales || sales.length === 0) return [];

  // Group by date
  const dateMap = new Map<string, number>();
  sales.forEach((s) => {
    const current = dateMap.get(s.date) || 0;
    dateMap.set(s.date, current + s.quantitySold);
  });

  // Determine span
  const sortedDates = Array.from(dateMap.keys()).sort();
  if (sortedDates.length === 0) return [];

  const earliestDate = new Date(sortedDates[0]);
  const latestDate = new Date(sortedDates[sortedDates.length - 1]);
  
  // Fill continuous calendar days
  const series: DailySalesDataPoint[] = [];
  const current = new Date(earliestDate);
  while (current <= latestDate) {
    const isoString = current.toISOString().split('T')[0];
    series.push({
      date: isoString,
      quantity: dateMap.get(isoString) || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // Slice to desired historical window if longer
  if (series.length > daysBack) {
    return series.slice(series.length - daysBack);
  }
  return series;
}

/**
 * Calculate statistical standard deviation of a series
 */
export function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Simple Moving Average (SMA)
 */
function forecastSMA(history: number[], horizon: number, windowSize: number = 7): number[] {
  const window = history.slice(-windowSize);
  const avg = window.reduce((a, b) => a + b, 0) / Math.max(1, window.length);
  return Array(horizon).fill(Math.max(0, Number(avg.toFixed(2))));
}

/**
 * Weighted Moving Average (WMA)
 * Higher weights for recent days (e.g. 1..k)
 */
function forecastWMA(history: number[], horizon: number, windowSize: number = 7): number[] {
  const window = history.slice(-windowSize);
  const k = window.length;
  let weightSum = 0;
  let weightedSum = 0;
  for (let i = 0; i < k; i++) {
    const w = i + 1;
    weightSum += w;
    weightedSum += window[i] * w;
  }
  const avg = weightSum > 0 ? weightedSum / weightSum : 0;
  return Array(horizon).fill(Math.max(0, Number(avg.toFixed(2))));
}

/**
 * Single Exponential Smoothing (SES)
 */
function forecastSES(history: number[], horizon: number, alpha: number = 0.3): number[] {
  if (history.length === 0) return Array(horizon).fill(0);
  let s = history[0];
  for (let i = 1; i < history.length; i++) {
    s = alpha * history[i] + (1 - alpha) * s;
  }
  return Array(horizon).fill(Math.max(0, Number(s.toFixed(2))));
}

/**
 * Holt's Linear Exponential Smoothing (Holt-Winters with Trend)
 */
function forecastHolt(history: number[], horizon: number, alpha: number = 0.3, beta: number = 0.1): number[] {
  if (history.length < 2) return Array(horizon).fill(history[0] || 0);

  let level = history[0];
  let trend = history[1] - history[0];

  for (let i = 1; i < history.length; i++) {
    const prevLevel = level;
    level = alpha * history[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Project m steps ahead
  const results: number[] = [];
  for (let m = 1; m <= horizon; m++) {
    const val = Math.max(0, level + m * trend);
    results.push(Number(val.toFixed(2)));
  }
  return results;
}

/**
 * Croston's Method for Intermittent / Sparse Demand
 * Decomposes time series into demand size (z) and inter-arrival intervals (p)
 */
function forecastCroston(history: number[], horizon: number, alpha: number = 0.2): number[] {
  if (history.length === 0) return Array(horizon).fill(0);

  let z = history.find(v => v > 0) || 1; // initial demand size
  let p = 1; // initial interval
  let periodsSinceLastDemand = 0;

  for (let i = 0; i < history.length; i++) {
    periodsSinceLastDemand++;
    const actual = history[i];
    if (actual > 0) {
      z = alpha * actual + (1 - alpha) * z;
      p = alpha * periodsSinceLastDemand + (1 - alpha) * p;
      periodsSinceLastDemand = 0;
    }
  }

  const expectedDailyRate = p > 0 ? z / p : 0;
  return Array(horizon).fill(Math.max(0, Number(expectedDailyRate.toFixed(2))));
}

/**
 * Perform Rolling Origin Backtest on historical data to evaluate accuracy metrics
 */
export function runBacktest(
  history: number[],
  method: ForecastMethod,
  testWindow: number = 14
): ForecastMetrics | undefined {
  if (history.length <= testWindow + 5) {
    return undefined; // Insufficient history for sound backtesting
  }

  const splitIndex = history.length - testWindow;
  const train = history.slice(0, splitIndex);
  const actuals = history.slice(splitIndex);

  let predictions: number[] = [];
  if (method === 'sma') predictions = forecastSMA(train, testWindow, 7);
  else if (method === 'wma') predictions = forecastWMA(train, testWindow, 7);
  else if (method === 'ses') predictions = forecastSES(train, testWindow, 0.3);
  else if (method === 'holt') predictions = forecastHolt(train, testWindow, 0.3, 0.1);
  else if (method === 'croston') predictions = forecastCroston(train, testWindow, 0.2);
  else predictions = forecastSMA(train, testWindow, 5);

  let sumAbsError = 0;
  let sumSqError = 0;
  let sumPercentageError = 0;
  let countNonZeroActuals = 0;
  let cumError = 0;

  for (let i = 0; i < testWindow; i++) {
    const actual = actuals[i];
    const pred = predictions[i] || 0;
    const error = actual - pred;

    cumError += error;
    sumAbsError += Math.abs(error);
    sumSqError += Math.pow(error, 2);

    if (actual > 0) {
      sumPercentageError += Math.abs(error) / actual;
      countNonZeroActuals++;
    }
  }

  const mae = sumAbsError / testWindow;
  const mad = mae > 0 ? mae : 1;
  const rmse = Math.sqrt(sumSqError / testWindow);
  const mape = countNonZeroActuals > 0 ? (sumPercentageError / countNonZeroActuals) * 100 : 0;
  const trackingSignal = cumError / mad;

  return {
    mae: Number(mae.toFixed(2)),
    mape: Number(mape.toFixed(1)),
    rmse: Number(rmse.toFixed(2)),
    trackingSignal: Number(trackingSignal.toFixed(2)),
    sampleSize: testWindow,
  };
}

/**
 * Primary Forecast Engine
 */
export function generateDemandForecast(
  productId: string,
  sales: SalesRecord[],
  preferredMethod: ForecastMethod | 'auto' = 'auto',
  horizonDays: number = 30
): ForecastResult {
  const dailySeries = buildDailyTimeSeries(sales, 90);
  const quantities = dailySeries.map(d => d.quantity);
  const historicalDaysCount = quantities.length;
  const totalHistoricalVolume = quantities.reduce((a, b) => a + b, 0);

  const nonZeroDays = quantities.filter(q => q > 0).length;
  const sparsityRatio = historicalDaysCount > 0 ? (historicalDaysCount - nonZeroDays) / historicalDaysCount : 1;

  const limitations: string[] = [];
  let chosenMethod: ForecastMethod = 'sma';
  let methodLabel = 'Simple Moving Average (7-day window)';

  if (historicalDaysCount < 7) {
    chosenMethod = 'cautious_fallback';
    methodLabel = 'Cautious Baseline (Insufficient Data)';
    limitations.push('Fewer than 7 days of sales data available. Formal time-series models require greater history.');
    limitations.push('Forecast uses empirical daily average with wide safety uncertainty bands.');
  } else if (preferredMethod !== 'auto') {
    chosenMethod = preferredMethod;
    if (chosenMethod === 'sma') methodLabel = 'Simple Moving Average (7-day window)';
    if (chosenMethod === 'wma') methodLabel = 'Weighted Moving Average (Linear decay)';
    if (chosenMethod === 'ses') methodLabel = 'Single Exponential Smoothing (α=0.3)';
    if (chosenMethod === 'holt') methodLabel = "Holt's Linear Trend Model (α=0.3, β=0.1)";
    if (chosenMethod === 'croston') methodLabel = "Croston's Method for Intermittent Demand";
  } else {
    // Automated method selection based on data characteristics & backtest performance
    if (sparsityRatio > 0.45) {
      chosenMethod = 'croston';
      methodLabel = "Croston's Intermittent Demand Model (Auto-selected for sparse sales)";
      limitations.push(`Sales are intermittent (${Math.round(sparsityRatio * 100)}% zero-demand days). Croston's formulation separates demand size from transaction frequency.`);
    } else {
      // Evaluate candidate models
      const candidates: ForecastMethod[] = ['sma', 'wma', 'ses', 'holt'];
      let bestMethod: ForecastMethod = 'sma';
      let lowestRmse = Infinity;

      for (const cand of candidates) {
        const metrics = runBacktest(quantities, cand, Math.min(14, Math.floor(quantities.length / 2)));
        if (metrics && metrics.rmse < lowestRmse) {
          lowestRmse = metrics.rmse;
          bestMethod = cand;
        }
      }

      chosenMethod = bestMethod;
      if (chosenMethod === 'sma') methodLabel = 'Simple Moving Average (Auto-selected via lowest backtest error)';
      if (chosenMethod === 'wma') methodLabel = 'Weighted Moving Average (Auto-selected via lowest backtest error)';
      if (chosenMethod === 'ses') methodLabel = 'Single Exponential Smoothing (Auto-selected via lowest backtest error)';
      if (chosenMethod === 'holt') methodLabel = "Holt's Linear Trend (Auto-selected via lowest backtest error)";
    }
  }

  // Generate projections
  let pointForecasts: number[] = [];
  if (chosenMethod === 'sma') pointForecasts = forecastSMA(quantities, horizonDays, 7);
  else if (chosenMethod === 'wma') pointForecasts = forecastWMA(quantities, horizonDays, 7);
  else if (chosenMethod === 'ses') pointForecasts = forecastSES(quantities, horizonDays, 0.3);
  else if (chosenMethod === 'holt') pointForecasts = forecastHolt(quantities, horizonDays, 0.3, 0.1);
  else if (chosenMethod === 'croston') pointForecasts = forecastCroston(quantities, horizonDays, 0.2);
  else {
    const rawAvg = totalHistoricalVolume / Math.max(1, historicalDaysCount);
    pointForecasts = Array(horizonDays).fill(Number(rawAvg.toFixed(2)));
  }

  // Calculate residual variance & confidence intervals
  const avgDemand = totalHistoricalVolume / Math.max(1, historicalDaysCount);
  const stdDev = calculateStdDev(quantities, avgDemand);
  const residualStdError = stdDev > 0 ? stdDev : Math.max(0.5, avgDemand * 0.25);

  const backtestMetrics = runBacktest(quantities, chosenMethod, Math.min(14, Math.floor(quantities.length / 3)));

  // Build daily forecast points starting tomorrow
  const lastHistoricalDate = dailySeries.length > 0 
    ? new Date(dailySeries[dailySeries.length - 1].date) 
    : new Date();
  
  const forecastPoints: ForecastPoint[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const fDate = new Date(lastHistoricalDate);
    fDate.setDate(fDate.getDate() + (i + 1));
    const isoDate = fDate.toISOString().split('T')[0];

    const expected = pointForecasts[i] || 0;
    // Uncertainty widens slightly over horizon: sqrt(1 + (i / horizonDays))
    const horizonMultiplier = Math.sqrt(1 + (i / horizonDays) * 0.5);
    const margin80 = 1.28 * residualStdError * horizonMultiplier;
    const margin95 = 1.96 * residualStdError * horizonMultiplier;

    forecastPoints.push({
      date: isoDate,
      expectedDemand: expected,
      lowerConfidence80: Math.max(0, Number((expected - margin80).toFixed(1))),
      upperConfidence80: Number((expected + margin80).toFixed(1)),
      lowerConfidence95: Math.max(0, Number((expected - margin95).toFixed(1))),
      upperConfidence95: Number((expected + margin95).toFixed(1)),
    });
  }

  limitations.push('Forecasts reflect historical baseline patterns and assume regular supplier fulfillment.');
  limitations.push('External macro shocks, unrecorded promotions, or competitive shifts require manual human review.');

  return {
    productId,
    method: chosenMethod,
    methodLabel,
    horizonDays,
    dataStartDate: dailySeries.length > 0 ? dailySeries[0].date : new Date().toISOString().split('T')[0],
    dataEndDate: dailySeries.length > 0 ? dailySeries[dailySeries.length - 1].date : new Date().toISOString().split('T')[0],
    historicalDaysCount,
    totalHistoricalVolume,
    averageDailyDemand: Number(avgDemand.toFixed(2)),
    dailyDemandStdDev: Number(stdDev.toFixed(2)),
    forecastPoints,
    backtestMetrics,
    limitations,
    isEstimate: true,
  };
}
