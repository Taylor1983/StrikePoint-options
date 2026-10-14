import { Ticker, Candle, TradeLeg } from '../types/options';
import { StrategyDefinition, ALL_OPTIONS_STRATEGIES } from './optionsStrategies';
import { calculateBSM, Greeks } from '../utils/blackScholes';

export interface BacktestConfig {
  entryDte?: number; // default 30 or 45
  contracts?: number; // default 1
  exitRule?: 'hold_to_end' | 'take_profit_50' | 'take_profit_25' | 'stop_loss_50' | 'stop_loss_100';
}

export interface BacktestLegRecord {
  id: string;
  action: 'BUY' | 'SELL';
  ratio: number;
  type: 'call' | 'put' | 'stock' | 'future';
  strike: number;
  entryPrice: number;
  finalPrice: number;
  legPnL: number;
  dteStart: number;
  dteEnd: number;
}

export interface BacktestDailySnapshot {
  dayIndex: number; // 0 to 29 (day 1 to 30)
  date: string;
  underlyingPrice: number;
  underlyingChangePct: number;
  high: number;
  low: number;
  remainingDte: number;
  modelIV: number;
  strategyMark: number;
  dailyPnL: number;
  cumulativePnL: number;
  returnPct: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  isExitDay?: boolean;
  exitReason?: string;
}

export interface BacktestResult {
  strategy: StrategyDefinition;
  symbol: string;
  assetType: 'equity' | 'index' | 'future';
  multiplier: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  startUnderlyingPrice: number;
  endUnderlyingPrice: number;
  underlyingReturnPct: number;
  initialNetDebitCredit: number; // positive = debit paid, negative = credit collected
  capitalAtRisk: number;
  finalStrategyMark: number;
  totalPnL: number;
  totalReturnPct: number;
  peakPnL: number;
  peakPnLDate: string;
  maxDrawdown: number;
  maxDrawdownPct: number;
  winRate: number; // % of positive days
  profitFactor: number;
  sharpeRatio: number;
  isWinner: boolean;
  earlyExitDay: number | null;
  exitReason: string | null;
  legs: BacktestLegRecord[];
  dailySnapshots: BacktestDailySnapshot[];
}

/**
 * Helper to round strike to standard intervals (0.50, 1.00, 2.50, 5.00, 10.00, 25.00)
 */
function roundToStrike(price: number, step?: number): number {
  if (step) return Math.round(price / step) * step;
  if (price < 25) return Math.round(price * 2) / 2; // 0.50
  if (price < 100) return Math.round(price);        // 1.00
  if (price < 200) return Math.round(price / 2.5) * 2.5; // 2.50
  if (price < 500) return Math.round(price / 5) * 5;     // 5.00
  if (price < 2000) return Math.round(price / 10) * 10;   // 10.00
  return Math.round(price / 50) * 50;                     // 50.00
}

interface SyntheticLegSetup {
  action: 'BUY' | 'SELL';
  ratio: number;
  type: 'call' | 'put' | 'stock';
  strikeOffsetPct: number; // e.g. 0 for ATM, 0.05 for +5% OTM call, -0.05 for -5% OTM put
  dteMultiplier?: number;  // 1 for front, 1.5 or 2 for back month in calendars
}

/**
 * Maps strategy definition ID / category into standardized multi-leg strike structures
 */
function getStrategyLegTemplate(strategy: StrategyDefinition): SyntheticLegSetup[] {
  const id = strategy.id.toLowerCase();

  // Single Legs
  if (id === 'long-call') {
    return [{ action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0 }];
  }
  if (id === 'short-call') {
    return [{ action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0 }];
  }
  if (id === 'long-put') {
    return [{ action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: 0 }];
  }
  if (id === 'cash-secured-put' || id === 'short-put') {
    return [{ action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.04 }];
  }

  // Vertical Spreads
  if (id === 'bull-call-spread') {
    return [
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.05 },
    ];
  }
  if (id === 'bear-call-spread') {
    return [
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.02 },
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0.07 },
    ];
  }
  if (id === 'bull-put-spread') {
    return [
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.02 },
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.07 },
    ];
  }
  if (id === 'bear-put-spread') {
    return [
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
    ];
  }

  // Straddles & Strangles
  if (id === 'long-straddle') {
    return [
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0 },
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: 0 },
    ];
  }
  if (id === 'short-straddle') {
    return [
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: 0 },
    ];
  }
  if (id === 'long-strangle') {
    return [
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0.05 },
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
    ];
  }
  if (id === 'short-strangle') {
    return [
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.05 },
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
    ];
  }

  // Condors & Butterflies
  if (id === 'iron-condor') {
    return [
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.08 },
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.04 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.04 },
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0.08 },
    ];
  }
  if (id === 'reverse-iron-condor' || id === 'long-iron-condor') {
    return [
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.08 },
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.04 },
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0.04 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.08 },
    ];
  }
  if (id === 'long-call-butterfly' || id === 'iron-butterfly') {
    return [
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0 },
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0.05 },
    ];
  }

  // Covered & Synthetics
  if (id === 'covered-call') {
    return [
      { action: 'BUY', ratio: 100, type: 'stock', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.04 },
    ];
  }
  if (id === 'protective-put' || id === 'married-put') {
    return [
      { action: 'BUY', ratio: 100, type: 'stock', strikeOffsetPct: 0 },
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
    ];
  }
  if (id === 'collar') {
    return [
      { action: 'BUY', ratio: 100, type: 'stock', strikeOffsetPct: 0 },
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.05 },
    ];
  }
  if (id === 'poor-mans-covered-call' || id === 'pmcc') {
    return [
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: -0.10, dteMultiplier: 2.0 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.04, dteMultiplier: 1.0 },
    ];
  }
  if (id === 'calendar-call-spread' || id === 'long-calendar-spread') {
    return [
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0, dteMultiplier: 1.0 },
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0, dteMultiplier: 1.8 },
    ];
  }

  // Ratios & Asymmetrics
  if (id.includes('ratio') || strategy.category === 'Ratio & Asymmetric') {
    if (strategy.bias === 'Bullish') {
      return [
        { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0 },
        { action: 'BUY', ratio: 2, type: 'call', strikeOffsetPct: 0.05 },
      ];
    } else {
      return [
        { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: 0 },
        { action: 'BUY', ratio: 2, type: 'put', strikeOffsetPct: -0.05 },
      ];
    }
  }

  // Fallback based on bias & category
  if (strategy.bias === 'Bullish') {
    return [
      { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.05 },
    ];
  }
  if (strategy.bias === 'Bearish') {
    return [
      { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: 0 },
      { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.05 },
    ];
  }
  // Neutral default: Iron Condor
  return [
    { action: 'BUY', ratio: 1, type: 'put', strikeOffsetPct: -0.07 },
    { action: 'SELL', ratio: 1, type: 'put', strikeOffsetPct: -0.03 },
    { action: 'SELL', ratio: 1, type: 'call', strikeOffsetPct: 0.03 },
    { action: 'BUY', ratio: 1, type: 'call', strikeOffsetPct: 0.07 },
  ];
}

/**
 * Runs a deterministic Black-Scholes daily backtest for a strategy against
 * the last 30 days of market candles for the given ticker.
 */
export function runOptionsBacktest(
  strategy: StrategyDefinition,
  ticker: Ticker,
  candles: Candle[],
  config: BacktestConfig = {}
): BacktestResult {
  const multiplier = ticker.multiplier || (ticker.assetType === 'future' ? (ticker.symbol === '/CL' ? 1000 : 50) : 100);
  const contracts = config.contracts || 1;
  const entryDte = config.entryDte || 35; // slightly > 30 so options don't expire prematurely mid-test
  const exitRule = config.exitRule || 'hold_to_end';

  // Take the last 30 candles (or all available if < 30)
  const availableCandles = candles && candles.length > 0 ? candles : [];
  const testCandles = availableCandles.slice(-30);
  const totalDays = testCandles.length;

  if (totalDays === 0) {
    throw new Error('No candle data available to run backtest.');
  }

  const startCandle = testCandles[0];
  const endCandle = testCandles[totalDays - 1];
  const S0 = startCandle.close;
  const baseIV = Math.max(0.12, ticker.historicalVol30d || ticker.currentIV || 0.25);

  const legTemplates = getStrategyLegTemplate(strategy);

  // Initialize trade legs at Day 0
  const initialLegs = legTemplates.map((tpl, idx) => {
    const strike = tpl.type === 'stock' ? S0 : roundToStrike(S0 * (1 + tpl.strikeOffsetPct));
    const legDte = Math.round(entryDte * (tpl.dteMultiplier || 1.0));
    let entryPrice = 0;

    if (tpl.type === 'stock') {
      entryPrice = S0;
    } else {
      const bsm = calculateBSM(S0, strike, Math.max(1, legDte) / 365, baseIV, tpl.type);
      entryPrice = Math.max(0.05, Number(bsm.price.toFixed(2)));
    }

    return {
      id: `leg-${idx}`,
      action: tpl.action,
      ratio: tpl.ratio,
      type: tpl.type,
      strike,
      legDte,
      entryPrice,
      dteMultiplier: tpl.dteMultiplier || 1.0,
    };
  });

  // Calculate Day 0 Net Debit (+) or Credit (-)
  let initialNetPerUnit = 0;
  let maxDebitRequired = 0;

  initialLegs.forEach((l) => {
    const cost = (l.action === 'BUY' ? 1 : -1) * (l.ratio === 100 ? 100 * l.entryPrice : l.ratio * l.entryPrice * multiplier);
    initialNetPerUnit += cost;
    if (l.action === 'BUY') {
      maxDebitRequired += Math.abs(cost);
    }
  });

  const initialNetTotal = initialNetPerUnit * contracts;
  const capitalAtRisk = Math.max(Math.abs(initialNetTotal), S0 * 0.15 * multiplier * contracts, 500);

  // Daily Simulation Loop
  const dailySnapshots: BacktestDailySnapshot[] = [];
  let peakPnL = -Infinity;
  let peakPnLDate = startCandle.time;
  let maxDrawdown = 0;
  let earlyExitIndex: number | null = null;
  let exitReason: string | null = null;
  let positiveDaysCount = 0;

  for (let d = 0; d < totalDays; d++) {
    const candle = testCandles[d];
    const St = candle.close;
    const daysElapsed = d;
    const underlyingChangePct = ((St - S0) / S0) * 100;

    // IV dynamic response: leverage / skew effect (IV increases slightly when price drops, decreases when rallies)
    const ivSkewDrift = -0.35 * ((St - S0) / S0);
    const dayIV = Math.max(0.08, baseIV * (1 + ivSkewDrift));

    let dayPositionValue = 0;
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;

    initialLegs.forEach((l) => {
      const remainingDte = Math.max(0, l.legDte - daysElapsed);
      let markPrice = 0;
      let greeks: Greeks = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };

      if (l.type === 'stock') {
        markPrice = St;
        greeks.delta = 1.0;
      } else if (remainingDte <= 0) {
        // Expiration intrinsic value
        if (l.type === 'call') {
          markPrice = Math.max(0, St - l.strike);
          greeks.delta = St > l.strike ? 1.0 : 0.0;
        } else {
          markPrice = Math.max(0, l.strike - St);
          greeks.delta = St < l.strike ? -1.0 : 0.0;
        }
      } else {
        const bsm = calculateBSM(St, l.strike, remainingDte / 365, dayIV, l.type);
        markPrice = Number(bsm.price.toFixed(2));
        greeks = bsm.greeks;
      }

      const legSign = l.action === 'BUY' ? 1 : -1;
      const legMult = l.type === 'stock' ? l.ratio : l.ratio * multiplier;
      const val = legSign * markPrice * legMult * contracts;

      dayPositionValue += val;

      netDelta += legSign * (l.type === 'stock' ? l.ratio : l.ratio * greeks.delta * multiplier) * contracts;
      netGamma += legSign * (l.type === 'stock' ? 0 : l.ratio * greeks.gamma * multiplier) * contracts;
      netTheta += legSign * (l.type === 'stock' ? 0 : l.ratio * greeks.theta * multiplier) * contracts;
      netVega += legSign * (l.type === 'stock' ? 0 : l.ratio * greeks.vega * multiplier) * contracts;
    });

    const cumulativePnL = dayPositionValue - initialNetTotal;
    const returnPct = (cumulativePnL / capitalAtRisk) * 100;
    const prevPnL = d > 0 ? dailySnapshots[d - 1].cumulativePnL : 0;
    const dailyPnL = cumulativePnL - prevPnL;

    if (cumulativePnL > 0) {
      positiveDaysCount++;
    }

    if (cumulativePnL > peakPnL) {
      peakPnL = cumulativePnL;
      peakPnLDate = candle.time;
    }

    const currentDrawdown = Math.max(0, peakPnL - cumulativePnL);
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    let isExit = false;
    let reason = '';

    // Check optional exit rules
    if (earlyExitIndex === null) {
      if (exitRule === 'take_profit_50' && returnPct >= 50) {
        isExit = true;
        reason = 'Take Profit (+50% target reached)';
        earlyExitIndex = d;
        exitReason = reason;
      } else if (exitRule === 'take_profit_25' && returnPct >= 25) {
        isExit = true;
        reason = 'Take Profit (+25% target reached)';
        earlyExitIndex = d;
        exitReason = reason;
      } else if (exitRule === 'stop_loss_50' && returnPct <= -50) {
        isExit = true;
        reason = 'Stop Loss (-50% trigger hit)';
        earlyExitIndex = d;
        exitReason = reason;
      } else if (exitRule === 'stop_loss_100' && returnPct <= -100) {
        isExit = true;
        reason = 'Stop Loss (-100% total debit lost)';
        earlyExitIndex = d;
        exitReason = reason;
      }
    } else {
      // Position already exited, hold flat PnL
      isExit = true;
      reason = exitReason || 'Exited';
    }

    dailySnapshots.push({
      dayIndex: d,
      date: candle.time,
      underlyingPrice: St,
      underlyingChangePct: Number(underlyingChangePct.toFixed(2)),
      high: candle.high,
      low: candle.low,
      remainingDte: Math.max(0, entryDte - d),
      modelIV: Number((dayIV * 100).toFixed(1)),
      strategyMark: Number(dayPositionValue.toFixed(2)),
      dailyPnL: Number(dailyPnL.toFixed(2)),
      cumulativePnL: Number(cumulativePnL.toFixed(2)),
      returnPct: Number(returnPct.toFixed(2)),
      delta: Number(netDelta.toFixed(2)),
      gamma: Number(netGamma.toFixed(4)),
      theta: Number(netTheta.toFixed(2)),
      vega: Number(netVega.toFixed(2)),
      isExitDay: isExit,
      exitReason: reason || undefined,
    });
  }

  // Final outcome evaluation
  const finalSnapshot = earlyExitIndex !== null ? dailySnapshots[earlyExitIndex] : dailySnapshots[totalDays - 1];
  const finalPnL = finalSnapshot.cumulativePnL;
  const finalReturnPct = finalSnapshot.returnPct;
  const finalMark = finalSnapshot.strategyMark;
  const underlyingReturnPct = Number((((endCandle.close - S0) / S0) * 100).toFixed(2));

  // Final leg records
  const exitDayIndex = earlyExitIndex !== null ? earlyExitIndex : totalDays - 1;
  const exitPrice = testCandles[exitDayIndex].close;
  const exitDteRemaining = Math.max(0, entryDte - exitDayIndex);

  const legsResult: BacktestLegRecord[] = initialLegs.map((l) => {
    let finalLegPrice = 0;
    if (l.type === 'stock') {
      finalLegPrice = exitPrice;
    } else if (exitDteRemaining <= 0) {
      finalLegPrice = l.type === 'call' ? Math.max(0, exitPrice - l.strike) : Math.max(0, l.strike - exitPrice);
    } else {
      const bsm = calculateBSM(exitPrice, l.strike, exitDteRemaining / 365, baseIV, l.type);
      finalLegPrice = Number(bsm.price.toFixed(2));
    }

    const legSign = l.action === 'BUY' ? 1 : -1;
    const legMult = l.type === 'stock' ? l.ratio : l.ratio * multiplier;
    const legPnL = legSign * (finalLegPrice - l.entryPrice) * legMult * contracts;

    return {
      id: l.id,
      action: l.action,
      ratio: l.ratio,
      type: l.type,
      strike: l.strike,
      entryPrice: l.entryPrice,
      finalPrice: finalLegPrice,
      legPnL: Number(legPnL.toFixed(2)),
      dteStart: l.legDte,
      dteEnd: exitDteRemaining,
    };
  });

  // Quantitative Stats: Sharpe & Profit Factor
  const dailyChanges = dailySnapshots.map((s) => s.dailyPnL);
  const avgDailyPnL = dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length;
  const variance = dailyChanges.reduce((a, b) => a + Math.pow(b - avgDailyPnL, 2), 0) / Math.max(1, dailyChanges.length - 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Number(((avgDailyPnL / stdDev) * Math.sqrt(252)).toFixed(2)) : 0;

  const totalGains = dailyChanges.filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const totalLosses = Math.abs(dailyChanges.filter((v) => v < 0).reduce((a, b) => a + b, 0));
  const profitFactor = totalLosses > 0 ? Number((totalGains / totalLosses).toFixed(2)) : (totalGains > 0 ? 9.99 : 0);

  return {
    strategy,
    symbol: ticker.symbol,
    assetType: ticker.assetType || 'equity',
    multiplier,
    startDate: startCandle.time,
    endDate: endCandle.time,
    totalDays,
    startUnderlyingPrice: S0,
    endUnderlyingPrice: endCandle.close,
    underlyingReturnPct,
    initialNetDebitCredit: Number(initialNetTotal.toFixed(2)),
    capitalAtRisk: Number(capitalAtRisk.toFixed(2)),
    finalStrategyMark: Number(finalMark.toFixed(2)),
    totalPnL: Number(finalPnL.toFixed(2)),
    totalReturnPct: Number(finalReturnPct.toFixed(2)),
    peakPnL: Number(peakPnL.toFixed(2)),
    peakPnLDate,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPct: Number(((maxDrawdown / capitalAtRisk) * 100).toFixed(2)),
    winRate: Number(((positiveDaysCount / totalDays) * 100).toFixed(1)),
    profitFactor,
    sharpeRatio,
    isWinner: finalPnL >= 0,
    earlyExitDay: earlyExitIndex !== null ? earlyExitIndex + 1 : null,
    exitReason,
    legs: legsResult,
    dailySnapshots,
  };
}
