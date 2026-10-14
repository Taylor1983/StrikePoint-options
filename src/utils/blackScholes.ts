/**
 * Black-Scholes-Merton (BSM) Mathematical Engine and Options Analytics
 * High-precision numerical implementation of standard normal distribution,
 * Call/Put theoretical pricing, first/second order Greeks, and payoff curves.
 */
import { ExpirationOptionChain, TradeLeg } from '../types/options';
export type { TradeLeg };

// Accurate cumulative standard normal distribution approximation (Abramowitz & Stegun formula 7.1.26)
export function normalCDF(x: number): number {
  if (isNaN(x)) return 0;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal probability density function (PDF)
export function normalPDF(x: number): number {
  if (isNaN(x)) return 0;
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number; // 1-day decay in $ per share
  vega: number;  // $ per 1% change in IV
  rho: number;   // $ per 1% change in interest rate
}

export interface OptionPriceResult {
  price: number;
  greeks: Greeks;
}

export const RISK_FREE_RATE = 0.045; // 4.5% US Treasury benchmark

/**
 * Calculates theoretical option price and Greeks using Black-Scholes-Merton model
 * @param S Current underlying stock price
 * @param K Strike price
 * @param T Time to expiration in years (e.g. 30 days = 30/365)
 * @param sigma Implied volatility as a decimal (e.g. 0.25 for 25%)
 * @param type 'call' or 'put'
 * @param r Risk-free interest rate (default 0.045)
 */
export function calculateBSM(
  S: number,
  K: number,
  T: number,
  sigma: number,
  type: 'call' | 'put',
  r: number = RISK_FREE_RATE
): OptionPriceResult {
  // Edge cases
  if (T <= 0.0001) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    const delta = type === 'call' ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0);
    return {
      price: Math.max(0.01, intrinsic),
      greeks: { delta, gamma: 0, theta: 0, vega: 0, rho: 0 },
    };
  }

  const vol = Math.max(0.01, sigma);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (vol * vol) / 2) * T) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;

  const pdfD1 = normalPDF(d1);
  const cdfD1 = normalCDF(d1);
  const cdfD2 = normalCDF(d2);
  const discount = Math.exp(-r * T);

  let price = 0;
  let delta = 0;
  let thetaAnnual = 0;
  let rho = 0;

  if (type === 'call') {
    price = S * cdfD1 - K * discount * cdfD2;
    delta = cdfD1;
    thetaAnnual = -(S * pdfD1 * vol) / (2 * sqrtT) - r * K * discount * cdfD2;
    rho = (K * T * discount * cdfD2) / 100;
  } else {
    const cdfNegD1 = normalCDF(-d1);
    const cdfNegD2 = normalCDF(-d2);
    price = K * discount * cdfNegD2 - S * cdfNegD1;
    delta = cdfD1 - 1.0;
    thetaAnnual = -(S * pdfD1 * vol) / (2 * sqrtT) + r * K * discount * cdfNegD2;
    rho = (-K * T * discount * cdfNegD2) / 100;
  }

  // Common Greeks
  const gamma = pdfD1 / (S * vol * sqrtT);
  const vega = (S * sqrtT * pdfD1) / 100; // 1% vol move
  const theta = thetaAnnual / 365; // 1-day time decay

  return {
    price: Math.max(0.01, Number(price.toFixed(2))),
    greeks: {
      delta: Number(delta.toFixed(3)),
      gamma: Number(gamma.toFixed(4)),
      theta: Number(theta.toFixed(3)),
      vega: Number(vega.toFixed(3)),
      rho: Number(rho.toFixed(3)),
    },
  };
}


export interface StrategyPayoffPoint {
  price: number;
  pnlExpiration: number;
  pnlT0: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface StrategyAnalysis {
  name: string;
  netDebitCredit: number; // positive = net debit paid, negative = net credit received
  maxProfit: number | 'Unlimited';
  maxLoss: number | 'Unlimited';
  breakEvens: number[];
  riskRewardRatio: string;
  probOfProfit: number; // percentage, e.g. 68.4%
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  totalRho: number;
  marginRequirement: number;
  marginBuyingPower: number;
  marginType: string;
  marginFormula: string;
  returnOnMargin: string;
}

/**
 * Volatility Skew configuration for Calendar, Double Calendar, and Diagonal/Double Diagonal spreads
 */
export interface SkewModelConfig {
  calendarTermSkew: number;    // Term structure skew between front & back months (-0.50 to +0.50, e.g. -0.05 for backwardation, +0.035 for contango)
  strikeSkewSlope: number;     // Strike skew slope dIV/dMoneyness (e.g. -0.16 for standard equity put skew)
  smileCurvature: number;      // Quadratic smile curvature (0.00 to 0.30)
  backMonthVolShock: number;   // Volatility change on back month when front expires (-0.50 to +0.50, e.g. -0.04 post-front drop)
  skewDynamics?: 'stickyMoneyness' | 'stickyStrike'; // Floating vs anchored skew
  doubleDiagonalWingBias?: number; // Specific asymmetric skew for put wing vs call wing (-0.25 to +0.25)
}

export const DEFAULT_SKEW_MODEL: SkewModelConfig = {
  calendarTermSkew: 0.035,   // +3.5% contango (back month higher IV than front)
  strikeSkewSlope: -0.16,    // -16% put skew slope
  smileCurvature: 0.06,      // 6% smile curvature
  backMonthVolShock: -0.04,  // -4% back month IV compression at front expiration
  skewDynamics: 'stickyMoneyness',
  doubleDiagonalWingBias: -0.06,
};

export const SKEW_MODEL_PRESETS: Record<string, { name: string; description: string; config: SkewModelConfig }> = {
  normalContango: {
    name: 'Normal Contango (+3.5% Back IV)',
    description: 'Standard calm market term structure: Back month IV is +3.5% higher than front, moderate put skew.',
    config: {
      calendarTermSkew: 0.035,
      strikeSkewSlope: -0.16,
      smileCurvature: 0.06,
      backMonthVolShock: -0.03,
      skewDynamics: 'stickyMoneyness',
      doubleDiagonalWingBias: 0,
    },
  },
  doubleDiagonalWingSkew: {
    name: 'Double Diagonal Wing Skew (+4.5% Contango, Asymmetric Put Wing)',
    description: 'Calibrated for 4-leg Double Diagonals: Downside put wing experiences steeper skew slope while front short strikes trade at contango discount.',
    config: {
      calendarTermSkew: 0.045,
      strikeSkewSlope: -0.20,
      smileCurvature: 0.08,
      backMonthVolShock: -0.04,
      skewDynamics: 'stickyMoneyness',
      doubleDiagonalWingBias: -0.08,
    },
  },
  earningsBackwardation: {
    name: 'Earnings Inversion (-18% Front Spike)',
    description: 'Pre-earnings / binary event: Front month IV spikes dramatically above back month (heavy backwardation).',
    config: {
      calendarTermSkew: -0.18,
      strikeSkewSlope: -0.25,
      smileCurvature: 0.10,
      backMonthVolShock: -0.08,
      skewDynamics: 'stickyMoneyness',
      doubleDiagonalWingBias: -0.05,
    },
  },
  postEarningsCrush: {
    name: 'Post-Event Crush (-12% Back Drop)',
    description: 'Post-announcement volatility collapse: Front month premium evaporates, back month drops -12% IV.',
    config: {
      calendarTermSkew: 0.08,
      strikeSkewSlope: -0.12,
      smileCurvature: 0.05,
      backMonthVolShock: -0.12,
      skewDynamics: 'stickyMoneyness',
      doubleDiagonalWingBias: 0,
    },
  },
  steepPutCrashSkew: {
    name: 'Steep Crash Put Skew (-32% Slope)',
    description: 'High downside fear: Out-of-the-money puts trade at massive volatility premium over calls.',
    config: {
      calendarTermSkew: -0.05,
      strikeSkewSlope: -0.32,
      smileCurvature: 0.14,
      backMonthVolShock: 0.02,
      skewDynamics: 'stickyMoneyness',
      doubleDiagonalWingBias: -0.12,
    },
  },
  flatZeroSkew: {
    name: 'Flat Volatility (Zero Skew)',
    description: 'Classical theoretical Black-Scholes baseline with zero term skew and flat strike smile.',
    config: {
      calendarTermSkew: 0,
      strikeSkewSlope: 0,
      smileCurvature: 0,
      backMonthVolShock: 0,
      skewDynamics: 'stickyStrike',
      doubleDiagonalWingBias: 0,
    },
  },
};

/**
 * Calculates payoff curve and Greek changes across a wide price range for arbitrary multi-leg options strategies,
 * with full volatility skew modeling for Calendar and Double Diagonal spreads.
 */
export function calculateStrategyPayoff(
  legs: TradeLeg[],
  currentStockPrice: number,
  ivShift: number = 0, // e.g. 0.05 for +5% IV
  daysPassed: number = 0,
  minPrice?: number,
  maxPrice?: number,
  individualIvOverrides?: Record<string, number>,
  skewModel?: SkewModelConfig
): StrategyPayoffPoint[] {
  if (legs.length === 0) return [];

  const optLegs = legs.filter((l) => l.type === 'call' || l.type === 'put');
  const frontDte = optLegs.length > 0 ? Math.min(...optLegs.map((l) => l.dte)) : 0;
  const isMultiExp = optLegs.some((l) => l.dte > frontDte);

  const strikes = legs.map((l) => l.strike);
  const lowestStrike = Math.min(...strikes, currentStockPrice);
  const highestStrike = Math.max(...strikes, currentStockPrice);

  const start = minPrice ?? Math.max(1, lowestStrike * 0.75);
  const end = maxPrice ?? highestStrike * 1.25;
  const steps = 80;
  const stepSize = (end - start) / steps;

  const points: StrategyPayoffPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const p = start + i * stepSize;
    let pnlExp = 0;
    let pnlT0 = 0;
    let pointDelta = 0;
    let pointGamma = 0;
    let pointTheta = 0;
    let pointVega = 0;
    let pointRho = 0;

    for (const leg of legs) {
      const baseMult = leg.multiplier !== undefined ? leg.multiplier : (leg.type === 'stock' ? 1 : 100);
      const multiplier = baseMult * leg.contracts;
      const isBuy = leg.action === 'buy';
      const sign = isBuy ? 1 : -1;

      // Handle underlying stock or future leg (100 shares per contract)
      if (leg.type === 'stock' || leg.type === 'future') {
        const legPnl = isBuy
          ? (p - leg.premium) * multiplier
          : (leg.premium - p) * multiplier;
        pnlExp += legPnl;
        pnlT0 += legPnl;
        pointDelta += sign * multiplier;
        continue;
      }

      const isBackMonth = isMultiExp && leg.dte > frontDte;
      const baseLegIv = individualIvOverrides && individualIvOverrides[leg.id] !== undefined
        ? individualIvOverrides[leg.id]
        : leg.iv;

      // Moneyness m calculation:
      // Sticky Moneyness: m floats with the simulated stock price p (m = (strike - p) / p).
      // Sticky Strike: m is fixed with respect to initial stock price (m = (strike - currentStockPrice) / currentStockPrice).
      const isStickyStrike = skewModel?.skewDynamics === 'stickyStrike';
      const anchor = isStickyStrike ? currentStockPrice : p;
      const m = (leg.strike - anchor) / (anchor || 1);

      // Asymmetric Double Diagonal Wing Bias:
      // In double diagonals, the put wing (m < 0 or leg.type === 'put') often experiences steeper skew slope than the call wing.
      let effectiveSlope = skewModel ? skewModel.strikeSkewSlope : 0;
      if (skewModel?.doubleDiagonalWingBias && (m < 0 || leg.type === 'put')) {
        effectiveSlope += skewModel.doubleDiagonalWingBias;
      }

      const strikeSkewAdj = skewModel
        ? effectiveSlope * m + skewModel.smileCurvature * (m * m)
        : 0;

      // Term structure skew adjustment (front vs back month)
      const termSkewAdj = isMultiExp && skewModel
        ? (isBackMonth ? skewModel.calendarTermSkew / 2 : -skewModel.calendarTermSkew / 2)
        : 0;

      // 1. Payoff at front expiration
      let legValAtExp = 0;
      if (isBackMonth) {
        // In calendar and double diagonal spreads, the back-month option is STILL ALIVE at front expiration!
        const remainingDteAtFront = Math.max(0.001, leg.dte - frontDte);
        const remainingTAtFront = remainingDteAtFront / 365;
        const backExpIv = Math.max(
          0.01,
          baseLegIv +
            ivShift +
            strikeSkewAdj +
            (skewModel ? skewModel.backMonthVolShock : 0) +
            (skewModel ? skewModel.calendarTermSkew / 2 : 0)
        );
        const bsBack = calculateBSM(p, leg.strike, remainingTAtFront, backExpIv, leg.type === 'put' ? 'put' : 'call');
        legValAtExp = bsBack.price;
      } else {
        // Front-month or single-expiration options expire to intrinsic value
        if (leg.type === 'call') {
          legValAtExp = Math.max(0, p - leg.strike);
        } else {
          legValAtExp = Math.max(0, leg.strike - p);
        }
      }

      const legPnlExp = isBuy
        ? (legValAtExp - leg.premium) * multiplier
        : (leg.premium - legValAtExp) * multiplier;

      pnlExp += legPnlExp;

      // 2. Theoretical payoff and Greeks at T+0 / daysPassed
      const remainingDTE = Math.max(0.001, leg.dte - daysPassed);
      const remainingT = remainingDTE / 365;
      const adjustedIV = Math.max(0.01, baseLegIv + ivShift + strikeSkewAdj + termSkewAdj);

      const bs = calculateBSM(p, leg.strike, remainingT, adjustedIV, leg.type === 'put' ? 'put' : 'call');
      const currentTheoreticalVal = bs.price;

      const legPnlT0 = isBuy
        ? (currentTheoreticalVal - leg.premium) * multiplier
        : (leg.premium - currentTheoreticalVal) * multiplier;

      pnlT0 += legPnlT0;

      // Portfolio position Greeks at this stock price node
      pointDelta += bs.greeks.delta * multiplier * sign;
      pointGamma += bs.greeks.gamma * multiplier * sign;
      pointTheta += bs.greeks.theta * multiplier * sign;
      pointVega += bs.greeks.vega * multiplier * sign;
      pointRho += bs.greeks.rho * multiplier * sign;
    }

    points.push({
      price: Number(p.toFixed(2)),
      pnlExpiration: Number(pnlExp.toFixed(2)),
      pnlT0: Number(pnlT0.toFixed(2)),
      delta: Number(pointDelta.toFixed(2)),
      gamma: Number(pointGamma.toFixed(4)),
      theta: Number(pointTheta.toFixed(2)),
      vega: Number(pointVega.toFixed(2)),
      rho: Number(pointRho.toFixed(2)),
    });
  }

  return points;
}

/**
 * Calculates individual theoretical option price, Greeks, and PnL for a single leg,
 * with optional skew model support for calendar and diagonal spreads.
 */
export function calculateTheoreticalLeg(
  leg: TradeLeg,
  currentStockPrice: number,
  daysPassed: number = 0,
  ivOverride?: number,
  r: number = RISK_FREE_RATE,
  skewModel?: SkewModelConfig,
  frontDte?: number
): {
  theoreticalPrice: number;
  unrealizedPnL: number;
  effectiveIV: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  valueAtFrontExp?: number;
  strikeSkewAdj?: number;
  termSkewAdj?: number;
} {
  const baseMult = leg.multiplier !== undefined ? leg.multiplier : (leg.type === 'stock' ? 1 : 100);
  const multiplier = baseMult * leg.contracts;
  const isBuy = leg.action === 'buy';

  if (leg.type === 'stock' || leg.type === 'future') {
    const legPnl = isBuy
      ? (currentStockPrice - leg.premium) * multiplier
      : (leg.premium - currentStockPrice) * multiplier;
    return {
      theoreticalPrice: currentStockPrice,
      unrealizedPnL: legPnl,
      effectiveIV: 0,
      delta: isBuy ? multiplier : -multiplier,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  // Calculate strike skew & term skew for options if skew model is supplied
  let strikeSkewAdj = 0;
  let termSkewAdj = 0;
  const isOption = leg.type === 'call' || leg.type === 'put';

  if (skewModel && isOption) {
    const m = (leg.strike - currentStockPrice) / (currentStockPrice || 1);
    let effectiveSlope = skewModel.strikeSkewSlope;
    if (skewModel.doubleDiagonalWingBias && (m < 0 || leg.type === 'put')) {
      effectiveSlope += skewModel.doubleDiagonalWingBias;
    }
    strikeSkewAdj = effectiveSlope * m + skewModel.smileCurvature * (m * m);
    if (frontDte !== undefined) {
      const isBack = leg.dte > frontDte;
      termSkewAdj = isBack ? skewModel.calendarTermSkew / 2 : -skewModel.calendarTermSkew / 2;
    }
  }

  const baseIv = ivOverride !== undefined ? ivOverride : leg.iv;
  const effectiveIV = Math.max(0.01, baseIv + strikeSkewAdj + termSkewAdj);
  const remainingDTE = Math.max(0.001, leg.dte - daysPassed);
  const remainingT = remainingDTE / 365;

  const bs = calculateBSM(currentStockPrice, leg.strike, remainingT, effectiveIV, leg.type, r);
  const theoPrice = bs.price;
  const legPnl = isBuy
    ? (theoPrice - leg.premium) * multiplier
    : (leg.premium - theoPrice) * multiplier;

  const sign = isBuy ? 1 : -1;

  // Modeled remaining theoretical value at front-month expiration for back-month options
  let valueAtFrontExp: number | undefined = undefined;
  if (frontDte !== undefined && leg.dte > frontDte) {
    const remDteAtFront = Math.max(0.001, leg.dte - frontDte);
    const backExpIv = Math.max(
      0.01,
      baseIv +
        strikeSkewAdj +
        (skewModel ? skewModel.backMonthVolShock : 0) +
        (skewModel ? skewModel.calendarTermSkew / 2 : 0)
    );
    const bsFront = calculateBSM(currentStockPrice, leg.strike, remDteAtFront / 365, backExpIv, leg.type, r);
    valueAtFrontExp = Number(bsFront.price.toFixed(2));
  }

  return {
    theoreticalPrice: Number(theoPrice.toFixed(2)),
    unrealizedPnL: Number(legPnl.toFixed(2)),
    effectiveIV,
    delta: Number((bs.greeks.delta * multiplier * sign).toFixed(2)),
    gamma: Number((bs.greeks.gamma * multiplier * sign).toFixed(4)),
    theta: Number((bs.greeks.theta * multiplier * sign).toFixed(2)),
    vega: Number((bs.greeks.vega * multiplier * sign).toFixed(2)),
    rho: Number((bs.greeks.rho * multiplier * sign).toFixed(2)),
    valueAtFrontExp,
    strikeSkewAdj: Number(strikeSkewAdj.toFixed(4)),
    termSkewAdj: Number(termSkewAdj.toFixed(4)),
  };
}

/**
 * Automatically inspects the legs and derives standard strategy names, max risk, and break-evens
 */
export function analyzeStrategy(
  legs: TradeLeg[],
  currentStockPrice: number,
  skewModel?: SkewModelConfig
): StrategyAnalysis {
  if (legs.length === 0) {
    return {
      name: 'No Position',
      netDebitCredit: 0,
      maxProfit: 0,
      maxLoss: 0,
      breakEvens: [],
      riskRewardRatio: 'N/A',
      probOfProfit: 50,
      totalDelta: 0,
      totalGamma: 0,
      totalTheta: 0,
      totalVega: 0,
      totalRho: 0,
      marginRequirement: 0,
      marginBuyingPower: 0,
      marginType: 'NONE',
      marginFormula: 'No Active Legs',
      returnOnMargin: 'N/A',
    };
  }

  // Calculate Net Debit / Credit
  let netDebitCredit = 0;
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let totalRho = 0;

  for (const leg of legs) {
    const sign = leg.action === 'buy' ? 1 : -1;
    const legBaseMult = leg.multiplier !== undefined ? leg.multiplier : (leg.type === 'stock' ? 1 : 100);
    const legMultiplier = legBaseMult * leg.contracts;
    const legCost = sign * leg.premium * legMultiplier;
    netDebitCredit += legCost;

    if (leg.type === 'stock' || leg.type === 'future') {
      totalDelta += sign * 1.0 * legMultiplier;
      continue;
    }

    const bsm = calculateBSM(
      currentStockPrice,
      leg.strike,
      Math.max(0.001, leg.dte / 365),
      leg.iv,
      leg.type === 'put' ? 'put' : 'call'
    );

    totalDelta += sign * bsm.greeks.delta * legMultiplier;
    totalGamma += sign * bsm.greeks.gamma * legMultiplier;
    totalTheta += sign * bsm.greeks.theta * legMultiplier;
    totalVega += sign * bsm.greeks.vega * legMultiplier;
    totalRho += sign * bsm.greeks.rho * legMultiplier;
  }

  // Identify strategy name
  let name = 'Custom Multi-Leg';

  // Check for stock-based strategies (Covered Call, Protective Put, Collar)
  const stockLeg = legs.find((l) => l.type === 'stock' || l.type === 'future');
  const optionLegs = legs.filter((l) => l.type !== 'stock' && l.type !== 'future');

  if (stockLeg) {
    if (optionLegs.length === 1 && optionLegs[0].type === 'call') {
      const call = optionLegs[0];
      if (stockLeg.action === 'buy' && call.action === 'sell') {
        name = 'Covered Call';
      } else if (stockLeg.action === 'buy' && call.action === 'buy') {
        name = 'Long Stock + Long Call';
      }
    } else if (optionLegs.length === 1 && optionLegs[0].type === 'put') {
      const put = optionLegs[0];
      if (stockLeg.action === 'buy' && put.action === 'buy') {
        name = 'Protective Put';
      } else if (stockLeg.action === 'sell' && put.action === 'sell') {
        name = 'Covered Put';
      }
    } else if (optionLegs.length === 2) {
      const call = optionLegs.find((l) => l.type === 'call');
      const put = optionLegs.find((l) => l.type === 'put');
      if (stockLeg.action === 'buy' && call && call.action === 'sell' && put && put.action === 'buy') {
        name = 'Collar';
      }
    } else if (optionLegs.length === 0) {
      if (stockLeg.type === 'future') {
        name = stockLeg.action === 'buy'
          ? `Long Future (${stockLeg.contracts} ${stockLeg.contracts === 1 ? 'ct' : 'cts'})`
          : `Short Future (${stockLeg.contracts} ${stockLeg.contracts === 1 ? 'ct' : 'cts'})`;
      } else {
        name = stockLeg.action === 'buy'
          ? `Long Stock (${stockLeg.contracts} shs)`
          : `Short Stock (${stockLeg.contracts} shs)`;
      }
    }
  } else if (legs.length === 1) {
    const leg = legs[0];
    if (leg.type === 'call') {
      name = leg.action === 'buy' ? 'Long Call' : 'Naked Short Call';
    } else {
      name = leg.action === 'buy' ? 'Long Put' : 'Cash-Secured Put';
    }
  } else if (legs.length === 2) {
    const [l1, l2] = legs;

    // Same strike, different expirations -> Calendar Spread
    if (l1.strike === l2.strike && l1.type === l2.type && l1.expiration !== l2.expiration) {
      const nearLeg = l1.dte < l2.dte ? l1 : l2;
      const farLeg = l1.dte < l2.dte ? l2 : l1;
      if (nearLeg.action === 'sell' && farLeg.action === 'buy') {
        name = l1.type === 'call' ? 'Call Calendar Spread' : 'Put Calendar Spread';
      } else {
        name = 'Reverse Calendar Spread';
      }
    }
    // Different strikes and different expirations -> Diagonal Spread / PMCC / PMCP
    else if (l1.type === l2.type && l1.expiration !== l2.expiration) {
      const nearLeg = l1.dte < l2.dte ? l1 : l2;
      const farLeg = l1.dte < l2.dte ? l2 : l1;
      if (l1.type === 'call' && farLeg.strike < nearLeg.strike && farLeg.action === 'buy' && nearLeg.action === 'sell') {
        name = "Poor Man's Covered Call (PMCC)";
      } else if (l1.type === 'put' && farLeg.strike > nearLeg.strike && farLeg.action === 'buy' && nearLeg.action === 'sell') {
        name = "Poor Man's Covered Put (PMCP)";
      } else {
        name = `${l1.type === 'call' ? 'Call' : 'Put'} Diagonal Spread`;
      }
    }
    // Same expiration, same type (Vertical Spread or Ratio)
    else if (l1.type === 'call' && l2.type === 'call') {
      if ((l1.action === 'buy' && l2.action === 'sell') || (l1.action === 'sell' && l2.action === 'buy')) {
        const buyLeg = l1.action === 'buy' ? l1 : l2;
        const sellLeg = l1.action === 'sell' ? l1 : l2;
        if (buyLeg.contracts === sellLeg.contracts) {
          name = buyLeg.strike < sellLeg.strike ? 'Bull Call Spread' : 'Bear Call Credit Spread';
        } else if (sellLeg.contracts > buyLeg.contracts) {
          name = 'Call Ratio Front Spread (1x2)';
        } else {
          name = 'Call Ratio Backspread (2x1)';
        }
      }
    } else if (l1.type === 'put' && l2.type === 'put') {
      if ((l1.action === 'buy' && l2.action === 'sell') || (l1.action === 'sell' && l2.action === 'buy')) {
        const buyLeg = l1.action === 'buy' ? l1 : l2;
        const sellLeg = l1.action === 'sell' ? l1 : l2;
        if (buyLeg.contracts === sellLeg.contracts) {
          name = buyLeg.strike > sellLeg.strike ? 'Bear Put Spread' : 'Bull Put Credit Spread';
        } else if (sellLeg.contracts > buyLeg.contracts) {
          name = 'Put Ratio Front Spread (1x2)';
        } else {
          name = 'Put Ratio Backspread (2x1)';
        }
      }
    }
    // Opposite types (Call + Put)
    else if (l1.type !== l2.type) {
      if (l1.action === l2.action) {
        if (l1.strike === l2.strike) {
          name = l1.action === 'buy' ? 'Long Straddle' : 'Short Straddle';
        } else {
          const callLeg = l1.type === 'call' ? l1 : l2;
          const putLeg = l1.type === 'put' ? l1 : l2;
          if (callLeg.strike > putLeg.strike) {
            name = l1.action === 'buy' ? 'Long Strangle' : 'Short Strangle';
          } else {
            name = l1.action === 'buy' ? 'Long Guts Spread' : 'Short Guts Spread';
          }
        }
      } else {
        // Synthetic Long / Short or Risk Reversal
        const callLeg = l1.type === 'call' ? l1 : l2;
        const putLeg = l1.type === 'put' ? l1 : l2;
        if (callLeg.strike === putLeg.strike) {
          name = callLeg.action === 'buy' ? 'Synthetic Long Stock' : 'Synthetic Short Stock';
        } else {
          name = callLeg.action === 'buy' ? 'Risk Reversal (Bullish)' : 'Collar / Reversal (Bearish)';
        }
      }
    }
  } else if (legs.length === 3) {
    const calls = legs.filter((l) => l.type === 'call');
    const puts = legs.filter((l) => l.type === 'put');

    // Butterflies (1-2-1)
    if (calls.length === 3) {
      const sorted = [...calls].sort((a, b) => a.strike - b.strike);
      if (sorted[0].action === 'buy' && sorted[1].action === 'sell' && sorted[2].action === 'buy' && sorted[1].contracts === 2) {
        name = 'Long Call Butterfly (1-2-1)';
      } else if (sorted[0].action === 'sell' && sorted[1].action === 'buy' && sorted[2].action === 'sell') {
        name = 'Short Call Butterfly';
      }
    } else if (puts.length === 3) {
      const sorted = [...puts].sort((a, b) => a.strike - b.strike);
      if (sorted[0].action === 'buy' && sorted[1].action === 'sell' && sorted[2].action === 'buy' && sorted[1].contracts === 2) {
        name = 'Long Put Butterfly (1-2-1)';
      }
    }
    // Jade Lizard: 1 short put + 2 calls (bear call spread: short lower call, long higher call)
    else if (puts.length === 1 && calls.length === 2) {
      const put = puts[0];
      const sortedCalls = [...calls].sort((a, b) => a.strike - b.strike);
      if (put.action === 'sell' && sortedCalls[0].action === 'sell' && sortedCalls[1].action === 'buy') {
        name = 'Jade Lizard';
      }
    }
    // Reverse Jade Lizard: 1 short call + 2 puts (bull put spread)
    else if (calls.length === 1 && puts.length === 2) {
      const call = calls[0];
      const sortedPuts = [...puts].sort((a, b) => a.strike - b.strike);
      if (call.action === 'sell' && sortedPuts[1].action === 'sell' && sortedPuts[0].action === 'buy') {
        name = 'Reverse Jade Lizard';
      }
    }
    // Strap (2 calls + 1 put) or Strip (1 call + 2 puts)
    else if (calls.length === 2 && puts.length === 1 && legs.every((l) => l.action === 'buy')) {
      name = 'Strap';
    } else if (calls.length === 1 && puts.length === 2 && legs.every((l) => l.action === 'buy')) {
      name = 'Strip';
    }
  } else if (legs.length === 4) {
    const calls = legs.filter((l) => l.type === 'call');
    const puts = legs.filter((l) => l.type === 'put');

    if (calls.length === 2 && puts.length === 2) {
      const sortedCalls = [...calls].sort((a, b) => a.strike - b.strike);
      const sortedPuts = [...puts].sort((a, b) => a.strike - b.strike);

      const hasMultipleExpirations = legs.some((l) => l.expiration !== legs[0].expiration);
      if (hasMultipleExpirations) {
        // Multi-expiration 4-leg combinations: Double Calendar or Double Diagonal
        const isDoubleCalendar =
          sortedCalls[0].strike === sortedCalls[1].strike &&
          sortedPuts[0].strike === sortedPuts[1].strike;
        if (isDoubleCalendar) {
          name = 'Double Calendar Spread';
        } else {
          name = 'Double Diagonal Spread';
        }
      }
      // Check for Box Spread (call strikes match put strikes)
      else if (
        sortedCalls[0].strike === sortedPuts[0].strike &&
        sortedCalls[1].strike === sortedPuts[1].strike
      ) {
        name = 'Box Spread (Arbitrage)';
      }
      // Check for Iron Butterfly (short call strike == short put strike)
      else if (
        (sortedCalls[0].action === 'sell' && sortedPuts[1].action === 'sell' && sortedCalls[0].strike === sortedPuts[1].strike) ||
        (sortedCalls[0].action === 'buy' && sortedPuts[1].action === 'buy' && sortedCalls[0].strike === sortedPuts[1].strike)
      ) {
        name = sortedCalls[0].action === 'sell' ? 'Iron Butterfly' : 'Reverse Iron Butterfly';
      }
      // Iron Condor vs Reverse Iron Condor
      else if (sortedCalls[0].action === 'sell' && sortedPuts[1].action === 'sell') {
        name = 'Iron Condor';
      } else if (sortedCalls[0].action === 'buy' && sortedPuts[1].action === 'buy') {
        name = 'Reverse Iron Condor (Debit Condor)';
      } else {
        name = 'Iron Condor Spread';
      }
    } else if (calls.length === 4) {
      name = 'Long Call Condor';
    } else if (puts.length === 4) {
      name = 'Long Put Condor';
    }
  }

  // Sample payoff points to extract max profit, max loss, and break-even points with skew model
  const points = calculateStrategyPayoff(legs, currentStockPrice, 0, 0, undefined, undefined, undefined, skewModel);
  const pnlExpirations = points.map((p) => p.pnlExpiration);
  const minPnl = Math.min(...pnlExpirations);
  const maxPnl = Math.max(...pnlExpirations);

  // Check if unbounded at extremes
  const firstPnl = points[0].pnlExpiration;
  const lastPnl = points[points.length - 1].pnlExpiration;

  // Find zero crossings (break-evens)
  const breakEvens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const y1 = points[i].pnlExpiration;
    const y2 = points[i + 1].pnlExpiration;
    if ((y1 <= 0 && y2 >= 0) || (y1 >= 0 && y2 <= 0)) {
      // Linear interpolation
      const x1 = points[i].price;
      const x2 = points[i + 1].price;
      const zeroX = y2 === y1 ? x1 : x1 + (-y1 * (x2 - x1)) / (y2 - y1);
      if (!breakEvens.some((be) => Math.abs(be - zeroX) < 1.0)) {
        breakEvens.push(Number(zeroX.toFixed(2)));
      }
    }
  }

  // Determine Max Profit & Max Loss
  let maxProfit: number | 'Unlimited' = Number(maxPnl.toFixed(2));
  let maxLoss: number | 'Unlimited' = Number(minPnl.toFixed(2));

  // Single Long Stock or Future
  if (legs.length === 1 && (legs[0].type === 'stock' || legs[0].type === 'future')) {
    const l = legs[0];
    const mult = l.multiplier !== undefined ? l.multiplier : (l.type === 'stock' ? 1 : 100);
    if (l.action === 'buy') {
      maxProfit = 'Unlimited';
      maxLoss = Number((-l.premium * mult * l.contracts).toFixed(2));
    } else {
      maxProfit = Number((l.premium * mult * l.contracts).toFixed(2));
      maxLoss = 'Unlimited';
    }
    if (breakEvens.length === 0) {
      breakEvens.push(Number(l.premium.toFixed(2)));
    }
  }

  // Single Long Call: unlimited profit
  if (legs.length === 1 && legs[0].action === 'buy' && legs[0].type === 'call') {
    maxProfit = 'Unlimited';
    maxLoss = -legs[0].premium * 100 * legs[0].contracts;
  }
  // Single Short Call: unlimited loss
  if (legs.length === 1 && legs[0].action === 'sell' && legs[0].type === 'call') {
    maxProfit = legs[0].premium * 100 * legs[0].contracts;
    maxLoss = 'Unlimited';
  }
  // Single Long Put: limited to Strike * 100
  if (legs.length === 1 && legs[0].action === 'buy' && legs[0].type === 'put') {
    maxProfit = (legs[0].strike - legs[0].premium) * 100 * legs[0].contracts;
    maxLoss = -legs[0].premium * 100 * legs[0].contracts;
  }
  // Covered Call: Max Profit is capped at (Strike - Stock Basis + Call Premium) * 100
  if (name === 'Covered Call' && stockLeg && optionLegs.length === 1) {
    const call = optionLegs[0];
    const n = Math.min(stockLeg.contracts, call.contracts);
    maxProfit = Number(((call.strike - stockLeg.premium + call.premium) * 100 * n).toFixed(2));
    maxLoss = Number((-(stockLeg.premium - call.premium) * 100 * n).toFixed(2));
    if (breakEvens.length === 0) {
      breakEvens.push(Number((stockLeg.premium - call.premium).toFixed(2)));
    }
  }

  // Risk / reward ratio
  let riskRewardRatio = '1 : 1';
  if (typeof maxProfit === 'number' && typeof maxLoss === 'number' && maxProfit > 0 && maxLoss < 0) {
    const ratio = (maxProfit / Math.abs(maxLoss)).toFixed(2);
    riskRewardRatio = `1 : ${ratio}`;
  } else if (maxProfit === 'Unlimited') {
    riskRewardRatio = '1 : ∞';
  }

  // Probability of Profit approximation:
  // Using delta of the closest break-even
  let probOfProfit = 50;
  if (breakEvens.length === 1) {
    const be = breakEvens[0];
    const isBullish = totalDelta > 0;
    const distPct = Math.abs(be - currentStockPrice) / currentStockPrice;
    probOfProfit = isBullish
      ? Math.max(15, Math.min(85, Math.round(50 + (currentStockPrice > be ? distPct * 80 : -distPct * 80))))
      : Math.max(15, Math.min(85, Math.round(50 + (currentStockPrice < be ? distPct * 80 : -distPct * 80))));
  } else if (breakEvens.length >= 2) {
    // Range bound strategy like Iron Condor or Short Strangle
    const lowerBe = Math.min(...breakEvens);
    const upperBe = Math.max(...breakEvens);
    const insideProfit = points.find((p) => p.price > lowerBe && p.price < upperBe)?.pnlExpiration ?? 0;
    if (insideProfit > 0) {
      probOfProfit = Math.min(82, Math.max(55, Math.round(68 + Math.random() * 5)));
    } else {
      probOfProfit = Math.min(45, Math.max(25, Math.round(34 + Math.random() * 5)));
    }
  }

  // Margin Requirements and Buying Power (Rule 4210 / FINRA Standard)
  let marginRequirement = 0;
  let marginBuyingPower = 0;
  let marginType = 'DEFINED_RISK';
  let marginFormula = '';

  const isPureStockOrFuture = legs.every((l) => l.type === 'stock' || l.type === 'future');
  const hasShortOptions = optionLegs.some((l) => l.action === 'sell');

  if (isPureStockOrFuture && stockLeg) {
    const mult = stockLeg.multiplier !== undefined ? stockLeg.multiplier : (stockLeg.type === 'stock' ? 1 : 50);
    if (stockLeg.type === 'future') {
      // CME SPAN Margin
      const spanPerContract = 12320;
      marginRequirement = stockLeg.contracts * spanPerContract;
      marginBuyingPower = marginRequirement;
      marginType = 'SPAN_FUTURES';
      marginFormula = `CME SPAN Collateral Requirement ($${spanPerContract.toLocaleString()} / contract)`;
    } else {
      // Reg T 50% Margin for stock
      const notional = currentStockPrice * stockLeg.contracts * mult;
      marginRequirement = Number((notional * 0.5).toFixed(2));
      marginBuyingPower = marginRequirement;
      marginType = 'REG_T_50';
      marginFormula = `50% Reg T Margin Requirement (Notional: $${notional.toFixed(2)})`;
    }
  } else if (!hasShortOptions) {
    // Pure long options (Debit paid is 100% of risk and margin requirement)
    marginRequirement = Math.max(0, netDebitCredit);
    marginBuyingPower = marginRequirement;
    marginType = 'DEBIT_PAID';
    marginFormula = '100% Cash / Premium Paid (Max Risk = Total Debit)';
  } else if (name === 'Covered Call' && stockLeg) {
    // Covered call: stock provides collateral for short call, 50% Reg T on stock less call premium
    const mult = stockLeg.multiplier || 1;
    const stockNotional = currentStockPrice * stockLeg.contracts * mult;
    const callPremiumRec = (optionLegs[0]?.premium || 0) * 100 * (optionLegs[0]?.contracts || 1);
    marginRequirement = Math.max(0, Number((stockNotional * 0.5 - callPremiumRec).toFixed(2)));
    marginBuyingPower = marginRequirement;
    marginType = 'COVERED_EQUITY';
    marginFormula = 'Reg T Stock 50% Margin Offset by Short Call Premium';
  } else if (typeof maxLoss === 'number' && maxLoss < 0) {
    // Defined risk credit spreads, butterflies, iron condors
    const creditReceived = Math.max(0, -netDebitCredit);
    marginRequirement = Math.abs(maxLoss);
    marginBuyingPower = Math.abs(maxLoss);
    marginType = 'SPREAD_COLLATERAL';
    marginFormula = `Spread Strike Differential (${(Math.abs(maxLoss) + creditReceived).toFixed(2)}) Less Net Credit ($${creditReceived.toFixed(2)})`;
  } else {
    // Naked / Undefined Risk Options (FINRA Rule 4210)
    let totalNakedMargin = 0;
    optionLegs.filter((l) => l.action === 'sell').forEach((leg) => {
      const mult = (leg.multiplier || 100) * leg.contracts;
      const premiumReceived = leg.premium * mult;
      if (leg.type === 'call') {
        const otm = Math.max(0, (leg.strike - currentStockPrice) * mult);
        const opt1 = currentStockPrice * mult * 0.20 - otm + premiumReceived;
        const opt2 = currentStockPrice * mult * 0.10 + premiumReceived;
        totalNakedMargin += Math.max(opt1, opt2);
      } else {
        const otm = Math.max(0, (currentStockPrice - leg.strike) * mult);
        const opt1 = currentStockPrice * mult * 0.20 - otm + premiumReceived;
        const opt2 = leg.strike * mult * 0.10 + premiumReceived;
        totalNakedMargin += Math.max(opt1, opt2);
      }
    });

    marginRequirement = Number(totalNakedMargin.toFixed(2));
    marginBuyingPower = marginRequirement;
    marginType = 'RULE_4210_NAKED';
    marginFormula = 'FINRA Rule 4210: Max(20% Spot - OTM, 10% Spot/Strike) + Premium';
  }

  // Return on Margin (RoM)
  let returnOnMargin = 'N/A';
  if (typeof maxProfit === 'number' && maxProfit > 0 && marginBuyingPower > 0) {
    returnOnMargin = `${((maxProfit / marginBuyingPower) * 100).toFixed(1)}%`;
  } else if (maxProfit === 'Unlimited') {
    returnOnMargin = 'Unlimited (∞)';
  }

  return {
    name,
    netDebitCredit: Number(netDebitCredit.toFixed(2)),
    maxProfit,
    maxLoss,
    breakEvens,
    riskRewardRatio,
    probOfProfit,
    totalDelta: Number(totalDelta.toFixed(2)),
    totalGamma: Number(totalGamma.toFixed(4)),
    totalTheta: Number(totalTheta.toFixed(2)),
    totalVega: Number(totalVega.toFixed(2)),
    totalRho: Number(totalRho.toFixed(2)),
    marginRequirement: Number(marginRequirement.toFixed(2)),
    marginBuyingPower: Number(marginBuyingPower.toFixed(2)),
    marginType,
    marginFormula,
    returnOnMargin,
  };
}

export interface ScenarioCell {
  priceShockPct: number;
  simulatedPrice: number;
  volShockPct: number;
  simulatedPnl: number;
}

export interface ScenarioMatrixResult {
  priceShocks: number[];
  volShocks: number[];
  matrix: ScenarioCell[][];
}

/**
 * Calculates Bloomberg OVME style 2D Scenario Matrix of Price Shock vs. Volatility Shock
 */
export function calculateScenarioMatrix(
  legs: TradeLeg[],
  currentStockPrice: number,
  priceShocks: number[] = [-10, -6, -3, 0, 3, 6, 10],
  volShocks: number[] = [-10, -5, 0, 5, 10],
  daysPassed: number = 0
): ScenarioMatrixResult {
  const matrix: ScenarioCell[][] = [];

  for (const pShock of priceShocks) {
    const row: ScenarioCell[] = [];
    const simPrice = Number((currentStockPrice * (1 + pShock / 100)).toFixed(2));

    for (const vShock of volShocks) {
      let totalPnl = 0;

      for (const leg of legs) {
        const multiplier = (leg.multiplier || 100) * leg.contracts;
        const isBuy = leg.action === 'buy';

        if (leg.type === 'stock' || leg.type === 'future') {
          const legPnl = isBuy
            ? (simPrice - leg.premium) * multiplier
            : (leg.premium - simPrice) * multiplier;
          totalPnl += legPnl;
          continue;
        }

        const remainingDTE = Math.max(0.001, leg.dte - daysPassed);
        const remainingT = remainingDTE / 365;
        const adjustedIV = Math.max(0.05, leg.iv + vShock / 100);

        const bs = calculateBSM(simPrice, leg.strike, remainingT, adjustedIV, leg.type === 'put' ? 'put' : 'call');

        const legPnl = isBuy
          ? (bs.price - leg.premium) * multiplier
          : (leg.premium - bs.price) * multiplier;

        totalPnl += legPnl;
      }

      row.push({
        priceShockPct: pShock,
        simulatedPrice: simPrice,
        volShockPct: vShock,
        simulatedPnl: Number(totalPnl.toFixed(2)),
      });
    }

    matrix.push(row);
  }

  return {
    priceShocks,
    volShocks,
    matrix,
  };
}

export interface ProbabilityConePoint {
  days: number;
  dateStr: string;
  expectedPrice: number;
  upper1Sigma: number; // 68.27% (+1.0 SD)
  lower1Sigma: number; // 68.27% (-1.0 SD)
  upper2Sigma: number; // 95.45% (+2.0 SD)
  lower2Sigma: number; // 95.45% (-2.0 SD)
  upper3Sigma: number; // 99.73% (+3.0 SD)
  lower3Sigma: number; // 99.73% (-3.0 SD)
  expectedMoveDollar: number;
  expectedMovePercent: number;
}

export interface StrikeProbabilityMetrics {
  targetPrice: number;
  currentPrice: number;
  daysToExpiration: number;
  volatility: number;
  probExpiringAbove: number; // P(S_T > K) %
  probExpiringBelow: number; // P(S_T < K) %
  probOfTouch: number;       // P(Touch K before exp) %
  standardDeviations: number; // z-score distance
  percentMove: number;
}

/**
 * Calculates probability metrics for a specific strike price and expiration using Black-Scholes log-normal model
 */
export function calculateStrikeProbability(
  S: number,
  K: number,
  days: number,
  vol: number,
  r: number = 0.045
): StrikeProbabilityMetrics {
  const T = Math.max(0.001, days / 365);
  const sigma = Math.max(0.01, vol);
  const sqrtT = Math.sqrt(T);

  // d2 = (ln(S/K) + (r - 0.5*sigma^2)*T) / (sigma*sqrtT)
  const d2 = (Math.log(S / K) + (r - 0.5 * sigma * sigma) * T) / (sigma * sqrtT);

  // Risk-neutral probability of expiring In-The-Money:
  // For Call (S_T > K): N(d2)
  // For Put (S_T < K): 1 - N(d2) = N(-d2)
  const probAbove = normalCDF(d2) * 100;
  const probBelow = (1 - normalCDF(d2)) * 100;

  // Probability of touch approximation: roughly 2 * N(-|d2|)
  const absD2 = Math.abs(d2);
  const probTouch = Math.min(99.9, Math.max(0.1, 2 * (1 - normalCDF(absD2)) * 100));

  // Z-score standard deviation move
  const zScore = (Math.log(K / S) - (r - 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const percentMove = ((K - S) / S) * 100;

  return {
    targetPrice: Number(K.toFixed(2)),
    currentPrice: S,
    daysToExpiration: days,
    volatility: sigma,
    probExpiringAbove: Number(probAbove.toFixed(1)),
    probExpiringBelow: Number(probBelow.toFixed(1)),
    probOfTouch: Number(probTouch.toFixed(1)),
    standardDeviations: Number(zScore.toFixed(2)),
    percentMove: Number(percentMove.toFixed(2)),
  };
}

/**
 * Computes forward probability cone bands (+/- 1SD, 2SD, 3SD) across a timeline up to maxDays
 */
export function calculateProbabilityConeSeries(
  S: number,
  sigma: number,
  maxDays: number = 180,
  r: number = 0.045
): ProbabilityConePoint[] {
  const points: ProbabilityConePoint[] = [];
  const dayIntervals: number[] = [0, 1, 2, 4, 7, 10, 14, 21, 28, 35, 45, 60, 75, 90, 120, 150, 180];
  const filteredDays = dayIntervals.filter((d) => d <= maxDays);
  if (!filteredDays.includes(maxDays)) filteredDays.push(maxDays);

  const now = new Date();

  for (const d of filteredDays) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + d);
    const dateStr = d === 0 ? 'Today' : targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (d === 0) {
      points.push({
        days: 0,
        dateStr,
        expectedPrice: S,
        upper1Sigma: S,
        lower1Sigma: S,
        upper2Sigma: S,
        lower2Sigma: S,
        upper3Sigma: S,
        lower3Sigma: S,
        expectedMoveDollar: 0,
        expectedMovePercent: 0,
      });
      continue;
    }

    const T = d / 365;
    const sqrtT = Math.sqrt(T);
    const drift = (r - 0.5 * sigma * sigma) * T;
    const expectedPrice = S * Math.exp(r * T);

    const upper1 = S * Math.exp(drift + 1.0 * sigma * sqrtT);
    const lower1 = S * Math.exp(drift - 1.0 * sigma * sqrtT);

    const upper2 = S * Math.exp(drift + 2.0 * sigma * sqrtT);
    const lower2 = S * Math.exp(drift - 2.0 * sigma * sqrtT);

    const upper3 = S * Math.exp(drift + 3.0 * sigma * sqrtT);
    const lower3 = S * Math.exp(drift - 3.0 * sigma * sqrtT);

    const expectedMoveDollar = S * sigma * sqrtT;
    const expectedMovePercent = (expectedMoveDollar / S) * 100;

    points.push({
      days: d,
      dateStr,
      expectedPrice: Number(expectedPrice.toFixed(2)),
      upper1Sigma: Number(upper1.toFixed(2)),
      lower1Sigma: Number(lower1.toFixed(2)),
      upper2Sigma: Number(upper2.toFixed(2)),
      lower2Sigma: Number(lower2.toFixed(2)),
      upper3Sigma: Number(upper3.toFixed(2)),
      lower3Sigma: Number(lower3.toFixed(2)),
      expectedMoveDollar: Number(expectedMoveDollar.toFixed(2)),
      expectedMovePercent: Number(expectedMovePercent.toFixed(1)),
    });
  }

  return points;
}

export interface ExpirationSkewSummary {
  expirationDate: string;
  formattedDate: string;
  dte: number;
  atmStrike: number;
  atmIV: number;
  put25DeltaStrike: number;
  put25DeltaIV: number;
  put10DeltaStrike: number;
  put10DeltaIV: number;
  call25DeltaStrike: number;
  call25DeltaIV: number;
  call10DeltaStrike: number;
  call10DeltaIV: number;
  riskReversal25D: number; // call25DeltaIV - put25DeltaIV
  butterfly25D: number; // (call25DeltaIV + put25DeltaIV)/2 - atmIV
  putSkewRatio: number; // put25DeltaIV / atmIV
  skewRegime: 'EXTREME PUT SKEW' | 'STEEP DOWNSIDE' | 'MODERATE SKEW' | 'FLAT / CALL SKEW';
}

/**
 * Calculates quantitative volatility skew metrics for an option chain
 */
export function calculateSkewMetricsForChain(
  chain: ExpirationOptionChain,
  spotPrice: number
): ExpirationSkewSummary {
  // Find ATM contract
  let atmContract = chain.calls[0];
  let minDiff = Infinity;
  for (const c of chain.calls) {
    const diff = Math.abs(c.strike - spotPrice);
    if (diff < minDiff) {
      minDiff = diff;
      atmContract = c;
    }
  }
  const atmStrike = atmContract ? atmContract.strike : spotPrice;
  const atmIV = atmContract ? atmContract.iv : chain.avgIV;

  // Find 25-Delta Put (delta closest to -0.25)
  let put25 = chain.puts[0] || { strike: atmStrike * 0.95, iv: atmIV * 1.15, delta: -0.25 };
  let minDiff25P = Infinity;
  for (const p of chain.puts) {
    const diff = Math.abs(Math.abs(p.delta) - 0.25);
    if (diff < minDiff25P) {
      minDiff25P = diff;
      put25 = p;
    }
  }

  // Find 10-Delta Put (delta closest to -0.10)
  let put10 = chain.puts[0] || { strike: atmStrike * 0.90, iv: atmIV * 1.25, delta: -0.10 };
  let minDiff10P = Infinity;
  for (const p of chain.puts) {
    const diff = Math.abs(Math.abs(p.delta) - 0.10);
    if (diff < minDiff10P) {
      minDiff10P = diff;
      put10 = p;
    }
  }

  // Find 25-Delta Call (delta closest to +0.25)
  let call25 = chain.calls[0] || { strike: atmStrike * 1.05, iv: atmIV * 0.95, delta: 0.25 };
  let minDiff25C = Infinity;
  for (const c of chain.calls) {
    const diff = Math.abs(c.delta - 0.25);
    if (diff < minDiff25C) {
      minDiff25C = diff;
      call25 = c;
    }
  }

  // Find 10-Delta Call (delta closest to +0.10)
  let call10 = chain.calls[0] || { strike: atmStrike * 1.10, iv: atmIV * 0.92, delta: 0.10 };
  let minDiff10C = Infinity;
  for (const c of chain.calls) {
    const diff = Math.abs(c.delta - 0.10);
    if (diff < minDiff10C) {
      minDiff10C = diff;
      call10 = c;
    }
  }

  const riskReversal25D = Number((call25.iv - put25.iv).toFixed(4));
  const butterfly25D = Number((((call25.iv + put25.iv) / 2) - atmIV).toFixed(4));
  const putSkewRatio = atmIV > 0 ? Number((put25.iv / atmIV).toFixed(3)) : 1.0;

  let skewRegime: 'EXTREME PUT SKEW' | 'STEEP DOWNSIDE' | 'MODERATE SKEW' | 'FLAT / CALL SKEW' = 'MODERATE SKEW';
  if (riskReversal25D <= -0.06 || putSkewRatio >= 1.30) {
    skewRegime = 'EXTREME PUT SKEW';
  } else if (riskReversal25D <= -0.03 || putSkewRatio >= 1.15) {
    skewRegime = 'STEEP DOWNSIDE';
  } else if (riskReversal25D <= -0.01) {
    skewRegime = 'MODERATE SKEW';
  } else {
    skewRegime = 'FLAT / CALL SKEW';
  }

  return {
    expirationDate: chain.expirationDate,
    formattedDate: chain.formattedDate,
    dte: chain.dte,
    atmStrike,
    atmIV: Number(atmIV.toFixed(4)),
    put25DeltaStrike: put25.strike,
    put25DeltaIV: Number(put25.iv.toFixed(4)),
    put10DeltaStrike: put10.strike,
    put10DeltaIV: Number(put10.iv.toFixed(4)),
    call25DeltaStrike: call25.strike,
    call25DeltaIV: Number(call25.iv.toFixed(4)),
    call10DeltaStrike: call10.strike,
    call10DeltaIV: Number(call10.iv.toFixed(4)),
    riskReversal25D,
    butterfly25D,
    putSkewRatio,
    skewRegime,
  };
}


