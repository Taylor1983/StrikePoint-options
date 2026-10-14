import { Candle } from '../types/options';

// ==========================================
// 1. MOVING AVERAGES (SMA & EMA)
// ==========================================

export function calculateSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, idx) => {
    if (idx < period - 1) return null;
    const slice = data.slice(idx - period + 1, idx + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / period).toFixed(2));
  });
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const k = 2 / (period + 1);

  // Initial SMA as first EMA seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEma = sum / period;
  result[period - 1] = Number(prevEma.toFixed(2));

  for (let i = period; i < data.length; i++) {
    const currentEma = data[i] * k + prevEma * (1 - k);
    result[i] = Number(currentEma.toFixed(2));
    prevEma = currentEma;
  }

  return result;
}

// ==========================================
// 2. BOLLINGER BANDS (20, 2.0)
// ==========================================

export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[]; // (upper - lower) / middle * 100
  percentB: (number | null)[];  // (close - lower) / (upper - lower)
}

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2.0
): BollingerBandsResult {
  const closes = candles.map((c) => c.close);
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const bandwidth: (number | null)[] = [];
  const percentB: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      bandwidth.push(null);
      percentB.push(null);
      continue;
    }

    const window = closes.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / period;
    const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const u = Number((mean + stdDevMultiplier * stdDev).toFixed(2));
    const m = Number(mean.toFixed(2));
    const l = Number((mean - stdDevMultiplier * stdDev).toFixed(2));
    const bw = m !== 0 ? Number((((u - l) / m) * 100).toFixed(2)) : null;
    const pb = u !== l ? Number(((closes[i] - l) / (u - l)).toFixed(3)) : null;

    upper.push(u);
    middle.push(m);
    lower.push(l);
    bandwidth.push(bw);
    percentB.push(pb);
  }

  return { upper, middle, lower, bandwidth, percentB };
}

// ==========================================
// 3. KELTNER CHANNELS & TTM SQUEEZE
// ==========================================

export interface KeltnerChannelsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateKeltnerChannels(
  candles: Candle[],
  emaPeriod: number = 20,
  multiplier: number = 1.5
): KeltnerChannelsResult {
  const closes = candles.map((c) => c.close);
  const ema = calculateEMA(closes, emaPeriod);
  const atr = calculateATR(candles, emaPeriod);

  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const m = ema[i];
    const a = atr[i];
    if (m === null || a === null) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
    } else {
      middle.push(m);
      upper.push(Number((m + multiplier * a).toFixed(2)));
      lower.push(Number((m - multiplier * a).toFixed(2)));
    }
  }

  return { upper, middle, lower };
}

export interface SqueezeResult {
  isSqueezed: boolean[];
  momentum: (number | null)[];
}

export function calculateTTMSqueeze(
  candles: Candle[],
  bb: BollingerBandsResult,
  kc: KeltnerChannelsResult
): SqueezeResult {
  const isSqueezed: boolean[] = [];
  const momentum: (number | null)[] = [];

  // Linear regression momentum estimation: price relative to midline
  for (let i = 0; i < candles.length; i++) {
    const bbU = bb.upper[i];
    const bbL = bb.lower[i];
    const kcU = kc.upper[i];
    const kcL = kc.lower[i];

    if (bbU === null || bbL === null || kcU === null || kcL === null) {
      isSqueezed.push(false);
      momentum.push(null);
      continue;
    }

    // Squeeze is ON when Bollinger Bands are completely inside Keltner Channel
    const inSqueeze = bbU < kcU && bbL > kcL;
    isSqueezed.push(inSqueeze);

    // Momentum proxy: distance of close from KC middle smoothed
    const mid = (kcU + kcL) / 2;
    momentum.push(Number((candles[i].close - mid).toFixed(2)));
  }

  return { isSqueezed, momentum };
}

// ==========================================
// 4. VWAP (VOLUME WEIGHTED AVERAGE PRICE)
// ==========================================

export interface VWAPResult {
  vwap: (number | null)[];
  upperBand1: (number | null)[];
  lowerBand1: (number | null)[];
  upperBand2: (number | null)[];
  lowerBand2: (number | null)[];
}

export function calculateVWAP(candles: Candle[]): VWAPResult {
  const vwap: (number | null)[] = [];
  const upperBand1: (number | null)[] = [];
  const lowerBand1: (number | null)[] = [];
  const upperBand2: (number | null)[] = [];
  const lowerBand2: (number | null)[] = [];

  let cumVol = 0;
  let cumVolPrice = 0;
  let cumVolPriceDiffSq = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumVol += c.volume;
    cumVolPrice += typicalPrice * c.volume;

    const currentVwap = cumVol > 0 ? cumVolPrice / cumVol : typicalPrice;
    cumVolPriceDiffSq += c.volume * Math.pow(typicalPrice - currentVwap, 2);
    const variance = cumVol > 0 ? cumVolPriceDiffSq / cumVol : 0;
    const stdDev = Math.sqrt(Math.max(0, variance));

    vwap.push(Number(currentVwap.toFixed(2)));
    upperBand1.push(Number((currentVwap + stdDev).toFixed(2)));
    lowerBand1.push(Number((currentVwap - stdDev).toFixed(2)));
    upperBand2.push(Number((currentVwap + 2 * stdDev).toFixed(2)));
    lowerBand2.push(Number((currentVwap - 2 * stdDev).toFixed(2)));
  }

  return { vwap, upperBand1, lowerBand1, upperBand2, lowerBand2 };
}

// ==========================================
// 5. RSI (RELATIVE STRENGTH INDEX - 14)
// ==========================================

export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const chg = changes[i];
    if (chg >= 0) avgGain += chg;
    else avgLoss += Math.abs(chg);
  }

  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = Number((100 - 100 / (1 + rs)).toFixed(2));

  for (let i = period + 1; i < candles.length; i++) {
    const chg = changes[i - 1];
    const gain = chg >= 0 ? chg : 0;
    const loss = chg < 0 ? Math.abs(chg) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  return result;
}

// ==========================================
// 6. MACD (12, 26, 9)
// ==========================================

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const closes = candles.map((c) => c.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  const validMacdValues: number[] = [];
  const validIndices: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      const val = Number(((fastEMA[i] as number) - (slowEMA[i] as number)).toFixed(3));
      macdLine.push(val);
      validMacdValues.push(val);
      validIndices.push(i);
    } else {
      macdLine.push(null);
    }
  }

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  if (validMacdValues.length >= signalPeriod) {
    const sigValues = calculateEMA(validMacdValues, signalPeriod);
    for (let j = 0; j < sigValues.length; j++) {
      const origIndex = validIndices[j];
      const s = sigValues[j];
      signalLine[origIndex] = s;
      if (s !== null && macdLine[origIndex] !== null) {
        histogram[origIndex] = Number(((macdLine[origIndex] as number) - s).toFixed(3));
      }
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// ==========================================
// 7. STOCHASTIC OSCILLATOR (%K 14, %D 3, Slow 3)
// ==========================================

export interface StochasticResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function calculateStochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult {
  const rawK: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(null);
      continue;
    }
    const window = candles.slice(i - kPeriod + 1, i + 1);
    const lowMin = Math.min(...window.map((c) => c.low));
    const highMax = Math.max(...window.map((c) => c.high));

    if (highMax === lowMin) {
      rawK.push(50);
    } else {
      const pctK = ((candles[i].close - lowMin) / (highMax - lowMin)) * 100;
      rawK.push(Number(pctK.toFixed(2)));
    }
  }

  // Smooth %K with 3-period SMA to get Fast %K
  const smoothedK = calculateSMA(
    rawK.map((v) => (v === null ? 50 : v)),
    3
  );

  // %D is 3-period SMA of smoothed %K
  const dLine = calculateSMA(
    smoothedK.map((v) => (v === null ? 50 : v)),
    dPeriod
  );

  return {
    k: smoothedK.map((v, idx) => (rawK[idx] === null ? null : v)),
    d: dLine.map((v, idx) => (rawK[idx] === null || idx < kPeriod + dPeriod - 2 ? null : v)),
  };
}

// ==========================================
// 8. ATR (AVERAGE TRUE RANGE - 14)
// ==========================================

export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < 2) return result;

  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }

  if (trs.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trs[i];
  }
  let prevAtr = sum / period;
  result[period - 1] = Number(prevAtr.toFixed(2));

  for (let i = period; i < candles.length; i++) {
    const curAtr = (prevAtr * (period - 1) + trs[i]) / period;
    result[i] = Number(curAtr.toFixed(2));
    prevAtr = curAtr;
  }

  return result;
}

// ==========================================
// 9. ADX & DIRECTIONAL MOVEMENT (+DI / -DI)
// ==========================================

export interface ADXResult {
  adx: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
}

export function calculateADX(candles: Candle[], period: number = 14): ADXResult {
  const adx: (number | null)[] = new Array(candles.length).fill(null);
  const plusDI: (number | null)[] = new Array(candles.length).fill(null);
  const minusDI: (number | null)[] = new Array(candles.length).fill(null);

  if (candles.length < period * 2) {
    return { adx, plusDI, minusDI };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
  }

  let trSmooth = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let plusDMSmooth = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let minusDMSmooth = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: { index: number; dx: number }[] = [];

  for (let i = period; i < tr.length; i++) {
    trSmooth = trSmooth - trSmooth / period + tr[i];
    plusDMSmooth = plusDMSmooth - plusDMSmooth / period + plusDM[i];
    minusDMSmooth = minusDMSmooth - minusDMSmooth / period + minusDM[i];

    const pDI = trSmooth !== 0 ? (plusDMSmooth / trSmooth) * 100 : 0;
    const mDI = trSmooth !== 0 ? (minusDMSmooth / trSmooth) * 100 : 0;
    const diSum = pDI + mDI;
    const dx = diSum !== 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;

    const actualIdx = i + 1;
    plusDI[actualIdx] = Number(pDI.toFixed(1));
    minusDI[actualIdx] = Number(mDI.toFixed(1));
    dxList.push({ index: actualIdx, dx });
  }

  // Smooth DX to get ADX
  if (dxList.length >= period) {
    let adxSmooth = dxList.slice(0, period).reduce((a, b) => a + b.dx, 0) / period;
    adx[dxList[period - 1].index] = Number(adxSmooth.toFixed(1));

    for (let j = period; j < dxList.length; j++) {
      adxSmooth = (adxSmooth * (period - 1) + dxList[j].dx) / period;
      adx[dxList[j].index] = Number(adxSmooth.toFixed(1));
    }
  }

  return { adx, plusDI, minusDI };
}

// ==========================================
// 10. SUPERTREND (10, 3.0)
// ==========================================

export interface SupertrendResult {
  supertrend: (number | null)[];
  trend: ('bullish' | 'bearish' | null)[];
}

export function calculateSupertrend(
  candles: Candle[],
  period: number = 10,
  multiplier: number = 3.0
): SupertrendResult {
  const atr = calculateATR(candles, period);
  const supertrend: (number | null)[] = new Array(candles.length).fill(null);
  const trend: ('bullish' | 'bearish' | null)[] = new Array(candles.length).fill(null);

  if (candles.length < period) return { supertrend, trend };

  let currentTrend: 'bullish' | 'bearish' = 'bullish';
  let prevUpper = 0;
  let prevLower = 0;

  for (let i = period - 1; i < candles.length; i++) {
    const a = atr[i];
    if (a === null) continue;

    const hl2 = (candles[i].high + candles[i].low) / 2;
    let basicUpper = hl2 + multiplier * a;
    let basicLower = hl2 - multiplier * a;

    if (i === period - 1) {
      prevUpper = basicUpper;
      prevLower = basicLower;
      supertrend[i] = Number(basicLower.toFixed(2));
      trend[i] = 'bullish';
      continue;
    }

    const prevClose = candles[i - 1].close;
    basicUpper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    basicLower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;

    if (currentTrend === 'bullish') {
      if (candles[i].close < basicLower) {
        currentTrend = 'bearish';
        supertrend[i] = Number(basicUpper.toFixed(2));
      } else {
        supertrend[i] = Number(basicLower.toFixed(2));
      }
    } else {
      if (candles[i].close > basicUpper) {
        currentTrend = 'bullish';
        supertrend[i] = Number(basicLower.toFixed(2));
      } else {
        supertrend[i] = Number(basicUpper.toFixed(2));
      }
    }

    prevUpper = basicUpper;
    prevLower = basicLower;
    trend[i] = currentTrend;
  }

  return { supertrend, trend };
}

// ==========================================
// 11. DONCHIAN CHANNELS (20)
// ==========================================

export interface DonchianResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateDonchianChannels(
  candles: Candle[],
  period: number = 20
): DonchianResult {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    const window = candles.slice(i - period + 1, i + 1);
    const u = Math.max(...window.map((c) => c.high));
    const l = Math.min(...window.map((c) => c.low));
    const m = (u + l) / 2;

    upper.push(Number(u.toFixed(2)));
    middle.push(Number(m.toFixed(2)));
    lower.push(Number(l.toFixed(2)));
  }

  return { upper, middle, lower };
}

// ==========================================
// 12. PARABOLIC SAR
// ==========================================

export interface ParabolicSARResult {
  sar: (number | null)[];
  trend: ('bullish' | 'bearish' | null)[];
}

export function calculateParabolicSAR(
  candles: Candle[],
  step: number = 0.02,
  maxStep: number = 0.2
): ParabolicSARResult {
  const sar: (number | null)[] = new Array(candles.length).fill(null);
  const trend: ('bullish' | 'bearish' | null)[] = new Array(candles.length).fill(null);

  if (candles.length < 3) return { sar, trend };

  let isBull = candles[1].close >= candles[0].close;
  let ep = isBull ? Math.max(candles[0].high, candles[1].high) : Math.min(candles[0].low, candles[1].low);
  let curSar = isBull ? Math.min(candles[0].low, candles[1].low) : Math.max(candles[0].high, candles[1].high);
  let af = step;

  sar[0] = null;
  sar[1] = Number(curSar.toFixed(2));
  trend[1] = isBull ? 'bullish' : 'bearish';

  for (let i = 2; i < candles.length; i++) {
    let nextSar = curSar + af * (ep - curSar);

    if (isBull) {
      nextSar = Math.min(nextSar, candles[i - 1].low, candles[i - 2].low);
      if (candles[i].low < nextSar) {
        // Reverse to bear
        isBull = false;
        nextSar = ep;
        ep = candles[i].low;
        af = step;
      } else {
        if (candles[i].high > ep) {
          ep = candles[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      nextSar = Math.max(nextSar, candles[i - 1].high, candles[i - 2].high);
      if (candles[i].high > nextSar) {
        // Reverse to bull
        isBull = true;
        nextSar = ep;
        ep = candles[i].high;
        af = step;
      } else {
        if (candles[i].low < ep) {
          ep = candles[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }

    curSar = nextSar;
    sar[i] = Number(curSar.toFixed(2));
    trend[i] = isBull ? 'bullish' : 'bearish';
  }

  return { sar, trend };
}

// ==========================================
// 13. ON-BALANCE VOLUME (OBV)
// ==========================================

export function calculateOBV(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length === 0) return result;

  let currentObv = 0;
  result.push(currentObv);

  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) {
      currentObv += candles[i].volume;
    } else if (diff < 0) {
      currentObv -= candles[i].volume;
    }
    result.push(currentObv);
  }

  return result;
}

// ==========================================
// 14. PIVOT POINTS (CLASSICAL FLOOR TRADER)
// ==========================================

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export function calculatePivotPoints(candles: Candle[]): PivotPoints | null {
  if (candles.length < 2) return null;
  const prev = candles[candles.length - 2];
  const p = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * p - prev.low;
  const s1 = 2 * p - prev.high;
  const r2 = p + (prev.high - prev.low);
  const s2 = p - (prev.high - prev.low);
  const r3 = prev.high + 2 * (p - prev.low);
  const s3 = prev.low - 2 * (prev.high - p);

  return {
    pivot: Number(p.toFixed(2)),
    r1: Number(r1.toFixed(2)),
    r2: Number(r2.toFixed(2)),
    r3: Number(r3.toFixed(2)),
    s1: Number(s1.toFixed(2)),
    s2: Number(s2.toFixed(2)),
    s3: Number(s3.toFixed(2)),
  };
}

// ==========================================
// 15. CANDLESTICK PATTERN DETECTION
// ==========================================

export interface DetectedPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  time: string;
  description: string;
}

export function detectCandlestickPatterns(candles: Candle[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (candles.length < 3) return patterns;

  // Scan last 5 candles
  const start = Math.max(2, candles.length - 5);

  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];

    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    // Doji
    if (range > 0 && body / range < 0.08) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        time: c.time,
        description: 'Indecision candle with virtually identical open and close.',
      });
      continue;
    }

    // Hammer (Bullish)
    if (lowerWick >= 2 * body && upperWick <= 0.2 * body && c.close >= prev.close * 0.98) {
      patterns.push({
        name: 'Hammer',
        type: 'bullish',
        time: c.time,
        description: 'Long lower shadow rejecting support, signaling buyer absorption.',
      });
    }

    // Shooting Star (Bearish)
    if (upperWick >= 2 * body && lowerWick <= 0.2 * body && prev.close > prev.open) {
      patterns.push({
        name: 'Shooting Star',
        type: 'bearish',
        time: c.time,
        description: 'Long upper shadow rejecting highs, signaling aggressive selling.',
      });
    }

    // Bullish Engulfing
    if (
      prev.close < prev.open && // prev was red
      c.close > c.open &&       // curr is green
      c.open <= prev.close &&   // opens at or below prev close
      c.close >= prev.open      // closes above prev open
    ) {
      patterns.push({
        name: 'Bullish Engulfing',
        type: 'bullish',
        time: c.time,
        description: 'Green candle completely engulfs previous down candle body.',
      });
    }

    // Bearish Engulfing
    if (
      prev.close > prev.open && // prev was green
      c.close < c.open &&       // curr is red
      c.open >= prev.close &&   // opens at or above prev close
      c.close <= prev.open      // closes below prev open
    ) {
      patterns.push({
        name: 'Bearish Engulfing',
        type: 'bearish',
        time: c.time,
        description: 'Red candle completely engulfs previous up candle body.',
      });
    }

    // Morning Star (3 candles)
    if (
      prev2.close < prev2.open &&
      Math.abs(prev.close - prev.open) < (prev2.high - prev2.low) * 0.35 &&
      c.close > c.open &&
      c.close > (prev2.open + prev2.close) / 2
    ) {
      patterns.push({
        name: 'Morning Star',
        type: 'bullish',
        time: c.time,
        description: '3-candle bottom reversal: long down, small base, strong recovery.',
      });
    }

    // Evening Star (3 candles)
    if (
      prev2.close > prev2.open &&
      Math.abs(prev.close - prev.open) < (prev2.high - prev2.low) * 0.35 &&
      c.close < c.open &&
      c.close < (prev2.open + prev2.close) / 2
    ) {
      patterns.push({
        name: 'Evening Star',
        type: 'bearish',
        time: c.time,
        description: '3-candle top reversal: long up, small star, strong breakdown.',
      });
    }
  }

  return patterns.slice(-4);
}

// ==========================================
// 16. QUANTITATIVE SIGNAL MATRIX (TECHO <GO>)
// ==========================================

export interface IndicatorScoreCard {
  indicator: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume';
  value: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  rationale: string;
}

export interface QuantitativeSignalSummary {
  consensus: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  score: number; // -10 to +10
  buyCount: number;
  neutralCount: number;
  sellCount: number;
  indicators: IndicatorScoreCard[];
  pivots: PivotPoints | null;
  detectedPatterns: DetectedPattern[];
}

export function calculateQuantitativeSignalMatrix(
  candles: Candle[],
  bb: BollingerBandsResult,
  kc: KeltnerChannelsResult,
  rsi: (number | null)[],
  macd: MACDResult,
  stoch: StochasticResult,
  adxRes: ADXResult,
  supertrendRes: SupertrendResult,
  sarRes: ParabolicSARResult,
  sma20: (number | null)[],
  sma50: (number | null)[],
  sma200: (number | null)[]
): QuantitativeSignalSummary {
  const cards: IndicatorScoreCard[] = [];
  const lastIdx = candles.length - 1;
  const lastPrice = candles[lastIdx].close;

  // 1. SMA 20
  const curSma20 = sma20[lastIdx];
  if (curSma20 !== null) {
    const isAbove = lastPrice >= curSma20;
    cards.push({
      indicator: 'SMA (20)',
      category: 'Trend',
      value: `$${curSma20.toFixed(2)}`,
      signal: isAbove ? 'BUY' : 'SELL',
      rationale: isAbove ? 'Price trading above 20-day SMA' : 'Price trading below 20-day SMA',
    });
  }

  // 2. SMA 50
  const curSma50 = sma50[lastIdx];
  if (curSma50 !== null) {
    const isAbove = lastPrice >= curSma50;
    cards.push({
      indicator: 'SMA (50)',
      category: 'Trend',
      value: `$${curSma50.toFixed(2)}`,
      signal: isAbove ? 'BUY' : 'SELL',
      rationale: isAbove ? 'Bullish intermediate regime above 50 SMA' : 'Bearish intermediate pressure below 50 SMA',
    });
  }

  // 3. SMA 200 (Golden/Death cross status)
  const curSma200 = sma200[lastIdx];
  if (curSma200 !== null) {
    const isAbove = lastPrice >= curSma200;
    cards.push({
      indicator: 'SMA (200)',
      category: 'Trend',
      value: `$${curSma200.toFixed(2)}`,
      signal: isAbove ? 'BUY' : 'SELL',
      rationale: isAbove ? 'Macro secular bull market (> 200 SMA)' : 'Macro bear market risk (< 200 SMA)',
    });
  }

  // 4. Supertrend
  const curSt = supertrendRes.supertrend[lastIdx];
  const curStDir = supertrendRes.trend[lastIdx];
  if (curSt !== null && curStDir !== null) {
    cards.push({
      indicator: 'Supertrend (10, 3.0)',
      category: 'Trend',
      value: `$${curSt.toFixed(2)} (${curStDir.toUpperCase()})`,
      signal: curStDir === 'bullish' ? 'BUY' : 'SELL',
      rationale: curStDir === 'bullish' ? 'Trailing stop tracking beneath price' : 'Trailing stop tracking above price',
    });
  }

  // 5. Parabolic SAR
  const curSar = sarRes.sar[lastIdx];
  const curSarTrend = sarRes.trend[lastIdx];
  if (curSar !== null && curSarTrend !== null) {
    cards.push({
      indicator: 'Parabolic SAR',
      category: 'Trend',
      value: `$${curSar.toFixed(2)}`,
      signal: curSarTrend === 'bullish' ? 'BUY' : 'SELL',
      rationale: curSarTrend === 'bullish' ? 'Dots trailing below current close' : 'Dots trailing above current close',
    });
  }

  // 6. ADX (Trend Strength)
  const curAdx = adxRes.adx[lastIdx];
  const curPdi = adxRes.plusDI[lastIdx];
  const curMdi = adxRes.minusDI[lastIdx];
  if (curAdx !== null && curPdi !== null && curMdi !== null) {
    const isStrong = curAdx >= 25;
    const isBull = curPdi > curMdi;
    cards.push({
      indicator: 'ADX (14)',
      category: 'Trend',
      value: `${curAdx.toFixed(1)} (+DI ${curPdi.toFixed(0)} / -DI ${curMdi.toFixed(0)})`,
      signal: !isStrong ? 'NEUTRAL' : isBull ? 'BUY' : 'SELL',
      rationale: !isStrong
        ? 'Trend is non-directional (ADX < 25)'
        : isBull
        ? 'Strong directional uptrend (+DI > -DI)'
        : 'Strong directional downtrend (-DI > +DI)',
    });
  }

  // 7. RSI (14)
  const curRsi = rsi[lastIdx];
  if (curRsi !== null) {
    let sig: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let rat = 'RSI in neutral equilibrium range';
    if (curRsi >= 70) {
      sig = 'SELL';
      rat = 'Overbought territory (RSI >= 70) - potential pullback';
    } else if (curRsi <= 30) {
      sig = 'BUY';
      rat = 'Oversold territory (RSI <= 30) - potential mean-reversion bounce';
    } else if (curRsi > 55) {
      sig = 'BUY';
      rat = 'Bullish momentum bias (> 50 centerline)';
    } else if (curRsi < 45) {
      sig = 'SELL';
      rat = 'Bearish momentum bias (< 50 centerline)';
    }
    cards.push({
      indicator: 'RSI (14)',
      category: 'Momentum',
      value: curRsi.toFixed(1),
      signal: sig,
      rationale: rat,
    });
  }

  // 8. MACD (12, 26, 9)
  const curHist = macd.histogram[lastIdx];
  const curMacd = macd.macd[lastIdx];
  const curSig = macd.signal[lastIdx];
  if (curHist !== null && curMacd !== null && curSig !== null) {
    const isBull = curMacd > curSig;
    cards.push({
      indicator: 'MACD (12, 26, 9)',
      category: 'Momentum',
      value: `MACD ${curMacd.toFixed(2)} / Sig ${curSig.toFixed(2)} (Hist: ${curHist > 0 ? '+' : ''}${curHist.toFixed(2)})`,
      signal: isBull ? 'BUY' : 'SELL',
      rationale: isBull ? 'Bullish crossover: MACD line above 9-period Signal' : 'Bearish crossover: MACD line below Signal',
    });
  }

  // 9. Stochastic (%K, %D)
  const curK = stoch.k[lastIdx];
  const curD = stoch.d[lastIdx];
  if (curK !== null && curD !== null) {
    let sig: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let rat = 'Stochastic in neutral momentum band';
    if (curK >= 80) {
      sig = 'SELL';
      rat = 'Overbought (> 80) - consolidation expected';
    } else if (curK <= 20) {
      sig = 'BUY';
      rat = 'Oversold (< 20) - bounce setup emerging';
    } else if (curK > curD) {
      sig = 'BUY';
      rat = '%K line crossing above %D line';
    } else {
      sig = 'SELL';
      rat = '%K line crossing below %D line';
    }
    cards.push({
      indicator: 'Stochastic (14, 3, 3)',
      category: 'Momentum',
      value: `%K ${curK.toFixed(1)} / %D ${curD.toFixed(1)}`,
      signal: sig,
      rationale: rat,
    });
  }

  // 10. Bollinger Bands %B & Volatility Squeeze
  const curBbU = bb.upper[lastIdx];
  const curBbL = bb.lower[lastIdx];
  const curKcU = kc.upper[lastIdx];
  const curKcL = kc.lower[lastIdx];
  if (curBbU !== null && curBbL !== null && curKcU !== null && curKcL !== null) {
    const isSqueezing = curBbU < curKcU && curBbL > curKcL;
    const pb = bb.percentB[lastIdx] ?? 0.5;

    cards.push({
      indicator: 'Bollinger Bands (20, 2σ)',
      category: 'Volatility',
      value: `Band: [$${curBbL.toFixed(2)} - $${curBbU.toFixed(2)}] (%B: ${pb.toFixed(2)})`,
      signal: pb > 0.85 ? 'SELL' : pb < 0.15 ? 'BUY' : 'NEUTRAL',
      rationale: pb > 0.85
        ? 'Price touching upper volatility boundary'
        : pb < 0.15
        ? 'Price testing lower statistical value boundary'
        : 'Price well within standard volatility envelope',
    });

    cards.push({
      indicator: 'TTM Volatility Squeeze',
      category: 'Volatility',
      value: isSqueezing ? 'SQUEEZE ACTIVE' : 'BREAKOUT / NO SQUEEZE',
      signal: isSqueezing ? 'NEUTRAL' : lastPrice > (curBbU + curBbL) / 2 ? 'BUY' : 'SELL',
      rationale: isSqueezing
        ? 'Bollinger inside Keltner: extreme coiling volatility, breakout imminent'
        : 'Bands expanding: directional momentum underway',
    });
  }

  // 11. Volume vs 20-day Avg
  const recentVols = candles.slice(-20).map((c) => c.volume);
  const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
  const lastVol = candles[lastIdx].volume;
  const volRatio = avgVol > 0 ? lastVol / avgVol : 1;
  const isUpDay = candles[lastIdx].close >= candles[lastIdx].open;
  cards.push({
    indicator: 'Volume vs 20D Avg',
    category: 'Volume',
    value: `${(lastVol / 1e6).toFixed(1)}M (${(volRatio * 100).toFixed(0)}% of avg)`,
    signal: volRatio > 1.25 ? (isUpDay ? 'BUY' : 'SELL') : 'NEUTRAL',
    rationale: volRatio > 1.25
      ? isUpDay
        ? 'Heavy volume institutional accumulation'
        : 'High volume institutional distribution selling'
      : 'Normal institutional volume participation',
  });

  // Calculate composite consensus
  let buyCount = 0;
  let neutralCount = 0;
  let sellCount = 0;

  cards.forEach((c) => {
    if (c.signal === 'BUY') buyCount++;
    else if (c.signal === 'SELL') sellCount++;
    else neutralCount++;
  });

  const netScore = buyCount - sellCount; // roughly -10 to +10
  let consensus: QuantitativeSignalSummary['consensus'] = 'NEUTRAL';
  if (netScore >= 5) consensus = 'STRONG BUY';
  else if (netScore >= 2) consensus = 'BUY';
  else if (netScore <= -5) consensus = 'STRONG SELL';
  else if (netScore <= -2) consensus = 'SELL';

  const pivots = calculatePivotPoints(candles);
  const detectedPatterns = detectCandlestickPatterns(candles);

  return {
    consensus,
    score: netScore,
    buyCount,
    neutralCount,
    sellCount,
    indicators: cards,
    pivots,
    detectedPatterns,
  };
}

// ==========================================
// 15. IMPLIED VOLATILITY (IV) & HISTORICAL VOLATILITY (HV) INDICATORS
// ==========================================

export interface VolatilityStudyResult {
  ivSeries: (number | null)[];
  hv10Series: (number | null)[];
  hv20Series: (number | null)[];
  hv30Series: (number | null)[];
  parkinsonHv: (number | null)[];
  vrpSeries: (number | null)[]; // Variance Risk Premium (IV - HV20)
}

/**
 * Calculates Close-to-Close annualized Historical Volatility (HV)
 * HV = stdDev(ln(C_t / C_{t-1})) * sqrt(252) * 100
 */
export function calculateHistoricalVolatility(
  candles: Candle[],
  period: number = 20
): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return result;

  const logReturns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    const curClose = candles[i].close;
    if (prevClose > 0 && curClose > 0) {
      logReturns.push(Math.log(curClose / prevClose));
    } else {
      logReturns.push(0);
    }
  }

  const annualMultiplier = Math.sqrt(252) * 100;

  for (let i = period - 1; i < logReturns.length; i++) {
    const slice = logReturns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (period - 1);
    const stdDev = Math.sqrt(variance);
    result[i + 1] = Number((stdDev * annualMultiplier).toFixed(2));
  }

  return result;
}

/**
 * Calculates Parkinson High-Low Historical Volatility
 */
export function calculateParkinsonVolatility(
  candles: Candle[],
  period: number = 20
): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  const hlLogs: number[] = candles.map((c) => {
    if (c.low <= 0 || c.high <= 0) return 0;
    return Math.pow(Math.log(c.high / c.low), 2);
  });

  const factor = 1 / (4 * Math.log(2));
  const annualMultiplier = Math.sqrt(252) * 100;

  for (let i = period - 1; i < hlLogs.length; i++) {
    const slice = hlLogs.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    const parkinson = Math.sqrt((factor / period) * sum) * annualMultiplier;
    result[i] = Number(parkinson.toFixed(2));
  }

  return result;
}

/**
 * Calculates full IV vs HV Study Series with Variance Risk Premium (VRP)
 */
export function calculateIVHVStudy(
  candles: Candle[],
  currentIvDecimal: number = 0.25
): VolatilityStudyResult {
  const hv10 = calculateHistoricalVolatility(candles, 10);
  const hv20 = calculateHistoricalVolatility(candles, 20);
  const hv30 = calculateHistoricalVolatility(candles, 30);
  const parkinson = calculateParkinsonVolatility(candles, 20);

  // Generate realistic historical daily IV curve anchored to current 30D IV with mean reversion & market stress shocks
  const targetIvPct = currentIvDecimal * 100;
  const ivSeries: (number | null)[] = candles.map((c, i) => {
    const progress = i / Math.max(1, candles.length - 1);
    const hvVal = hv20[i] || targetIvPct;
    // IV typically trades at a 2-4 pt premium over HV (Variance Risk Premium)
    const baselineIv = hvVal * 1.12 + 1.8;
    const smoothFactor = 0.3 * progress + 0.7 * (1 - progress);
    const estimatedIv = smoothFactor * baselineIv + (1 - smoothFactor) * targetIvPct;
    return Number(Math.max(8, Math.min(95, estimatedIv)).toFixed(2));
  });

  // Variance Risk Premium = IV - HV20
  const vrpSeries: (number | null)[] = candles.map((_, i) => {
    const iv = ivSeries[i];
    const hv = hv20[i];
    if (iv !== null && hv !== null) {
      return Number((iv - hv).toFixed(2));
    }
    return null;
  });

  return {
    ivSeries,
    hv10Series: hv10,
    hv20Series: hv20,
    hv30Series: hv30,
    parkinsonHv: parkinson,
    vrpSeries,
  };
}

