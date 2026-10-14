import { Position, TradeLeg, Ticker } from '../types/options';
import { calculateBSM } from './blackScholes';

export type BenchmarkSymbol = 'SPY' | 'QQQ' | 'IWM' | 'DIA';

export interface BenchmarkDefinition {
  symbol: BenchmarkSymbol;
  name: string;
  defaultPrice: number;
  benchmarkBeta: number;
  description: string;
}

export const BENCHMARK_DEFINITIONS: Record<BenchmarkSymbol, BenchmarkDefinition> = {
  SPY: {
    symbol: 'SPY',
    name: 'S&P 500 ETF Trust (SPY)',
    defaultPrice: 568.25,
    benchmarkBeta: 1.0,
    description: 'Broad US large-cap market benchmark (Default institutional standard)',
  },
  QQQ: {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    defaultPrice: 488.60,
    benchmarkBeta: 1.18,
    description: 'Tech-heavy growth & mega-cap benchmark',
  },
  IWM: {
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    defaultPrice: 221.80,
    benchmarkBeta: 1.15,
    description: 'US small-cap equity benchmark',
  },
  DIA: {
    symbol: 'DIA',
    name: 'SPDR Dow Jones Industrial Average ETF',
    defaultPrice: 423.50,
    benchmarkBeta: 0.85,
    description: 'Blue-chip dividend & industrial benchmark',
  },
};

export type DirectionalBias =
  | 'HEAVILY_BULLISH'
  | 'MODERATELY_BULLISH'
  | 'DELTA_NEUTRAL'
  | 'MODERATELY_BEARISH'
  | 'HEAVILY_BEARISH';

export interface PositionBetaMetrics {
  positionId: string;
  ticker: string;
  strategyName: string;
  assetCategory: 'stock' | 'future' | 'option';
  contracts: number;
  sharesOrContracts: number;
  spotPrice: number;
  assetBeta: number;
  relativeBeta: number; // assetBeta / benchmarkBeta
  rawDelta: number;     // share equivalent delta
  rawGamma: number;
  rawTheta: number;
  rawVega: number;
  betaWeightedDelta: number; // standardized delta in benchmark share equivalents
  betaWeightedDollarDelta: number; // delta in dollar exposure
  betaWeightedGamma: number;
  notionalValue: number;
  portfolioNotionalPct: number;
  riskContributionPct: number; // % of total gross beta-delta
  directionalBias: DirectionalBias;
  entryIV?: number;     // IV when trade was made
  currentIV?: number;   // current live underlying IV
}

export interface BetaShockPoint {
  shockPct: number;             // e.g. -5%
  benchmarkStressedPrice: number;
  benchmarkDollarMove: number;
  estimatedPnLDollar: number;   // estimated portfolio P&L
  deltaPnLContribution: number;
  gammaPnLContribution: number;
  positionAttributions: Record<string, number>;
}

export interface BetaHedgeRecommendation {
  benchmarkSymbol: BenchmarkSymbol;
  targetBetaDelta: number;
  currentBetaDelta: number;
  deltaDeficit: number; // target - current
  stockHedge: {
    action: 'BUY' | 'SELL' | 'HOLD';
    shares: number;
    estimatedCost: number;
    description: string;
  };
  optionHedge: {
    action: 'BUY' | 'SELL' | 'NONE';
    contracts: number;
    contractType: 'PUT' | 'CALL';
    strike: number;
    dte: number;
    targetDelta: number;
    estimatedPremiumPerContract: number;
    totalPremiumCost: number;
    description: string;
  };
}

export interface PortfolioBetaWeightingSummary {
  benchmark: BenchmarkDefinition;
  benchmarkPrice: number;
  totalPositionsCount: number;
  totalPortfolioNotional: number;
  portfolioWeightedBeta: number;
  totalNetRawDelta: number;
  totalNetBetaWeightedDelta: number;
  totalNetBetaWeightedDollarDelta: number;
  totalNetBetaWeightedGamma: number;
  totalNetTheta: number;
  totalNetVega: number;
  directionalStance: DirectionalBias;
  directionalHeadline: string;
  positions: PositionBetaMetrics[];
  shockCurve: BetaShockPoint[];
  hedgeRecommendation: BetaHedgeRecommendation;
}

/**
 * Calculates raw Delta, Gamma, Theta, Vega for an individual multi-leg or single-asset position
 */
export function calculatePositionRawGreeks(
  pos: Position,
  spotPrice: number
): { delta: number; gamma: number; theta: number; vega: number } {
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;

  pos.legs.forEach((leg) => {
    const isBuy = leg.action === 'buy';
    const sign = isBuy ? 1 : -1;

    if (leg.type === 'stock') {
      const mult = leg.multiplier || 1;
      delta += sign * leg.contracts * mult;
    } else if (leg.type === 'future') {
      const mult = leg.multiplier || 50;
      delta += sign * leg.contracts * mult;
    } else {
      const bsm = calculateBSM(
        spotPrice,
        leg.strike,
        Math.max(0.001, (leg.dte || 30) / 365),
        leg.iv || 0.25,
        leg.type === 'put' ? 'put' : 'call'
      );
      const mult = (leg.multiplier || 100) * leg.contracts;
      delta += sign * bsm.greeks.delta * mult;
      gamma += sign * bsm.greeks.gamma * mult;
      theta += sign * bsm.greeks.theta * mult;
      vega += sign * bsm.greeks.vega * mult;
    }
  });

  return {
    delta: Number(delta.toFixed(2)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(2)),
    vega: Number(vega.toFixed(2)),
  };
}

/**
 * Determines directional stance based on beta-weighted delta
 */
export function getDirectionalBias(betaDelta: number): DirectionalBias {
  if (betaDelta > 75) return 'HEAVILY_BULLISH';
  if (betaDelta > 15) return 'MODERATELY_BULLISH';
  if (betaDelta < -75) return 'HEAVILY_BEARISH';
  if (betaDelta < -15) return 'MODERATELY_BEARISH';
  return 'DELTA_NEUTRAL';
}

/**
 * Calculates comprehensive Portfolio Beta Weighting against a chosen benchmark (SPY, QQQ, IWM, DIA)
 */
export function calculatePortfolioBetaWeighting(
  positions: Position[],
  tickers: Record<string, Ticker> = {},
  benchmarkSymbol: BenchmarkSymbol = 'SPY',
  targetBetaDelta: number = 0
): PortfolioBetaWeightingSummary {
  const benchmarkDef = BENCHMARK_DEFINITIONS[benchmarkSymbol] || BENCHMARK_DEFINITIONS.SPY;
  const benchmarkTicker = tickers[benchmarkSymbol];
  const benchmarkPrice = benchmarkTicker?.price || benchmarkDef.defaultPrice;
  const benchmarkBeta = benchmarkDef.benchmarkBeta;

  if (!positions || positions.length === 0) {
    return {
      benchmark: benchmarkDef,
      benchmarkPrice,
      totalPositionsCount: 0,
      totalPortfolioNotional: 0,
      portfolioWeightedBeta: 1.0,
      totalNetRawDelta: 0,
      totalNetBetaWeightedDelta: 0,
      totalNetBetaWeightedDollarDelta: 0,
      totalNetBetaWeightedGamma: 0,
      totalNetTheta: 0,
      totalNetVega: 0,
      directionalStance: 'DELTA_NEUTRAL',
      directionalHeadline: 'No open positions in portfolio blotter',
      positions: [],
      shockCurve: [],
      hedgeRecommendation: {
        benchmarkSymbol,
        targetBetaDelta: 0,
        currentBetaDelta: 0,
        deltaDeficit: 0,
        stockHedge: {
          action: 'HOLD',
          shares: 0,
          estimatedCost: 0,
          description: 'Portfolio has zero directional delta exposure.',
        },
        optionHedge: {
          action: 'NONE',
          contracts: 0,
          contractType: 'PUT',
          strike: Math.round(benchmarkPrice),
          dte: 30,
          targetDelta: -0.5,
          estimatedPremiumPerContract: 0,
          totalPremiumCost: 0,
          description: 'No hedge required.',
        },
      },
    };
  }

  // 1. Calculate individual position beta metrics
  let totalNotional = 0;
  let weightedBetaSum = 0;
  let totalNetRawDelta = 0;
  let totalNetBetaWeightedDelta = 0;
  let totalNetBetaWeightedGamma = 0;
  let totalNetTheta = 0;
  let totalNetVega = 0;

  const rawPositionMetrics = positions.map((pos) => {
    const tick = tickers[pos.ticker];
    const spotPrice = tick ? tick.price : (pos.legs[0]?.strike || 100);
    const assetBeta = tick?.beta ?? (pos.ticker === '/ES' ? 1.0 : pos.ticker === '/NQ' ? 1.2 : 1.0);
    const relativeBeta = assetBeta / benchmarkBeta;

    const greeks = calculatePositionRawGreeks(pos, spotPrice);

    // Position notional exposure
    const notional = Math.abs(pos.currentMark || pos.entryCost) || (spotPrice * (pos.contracts || 1));
    totalNotional += notional;
    weightedBetaSum += notional * assetBeta;

    // Beta-Weighted Delta formula: Delta * (Beta_asset / Beta_bench) * (Price_asset / Price_bench)
    const betaWeightedDelta = greeks.delta * relativeBeta * (spotPrice / benchmarkPrice);
    const betaWeightedDollarDelta = betaWeightedDelta * benchmarkPrice;
    
    // Beta-Weighted Gamma formula: Gamma * (relativeBeta)^2 * (Price_asset / Price_bench)^2
    const priceRatio = spotPrice / benchmarkPrice;
    const betaWeightedGamma = greeks.gamma * Math.pow(relativeBeta, 2) * Math.pow(priceRatio, 2);

    totalNetRawDelta += greeks.delta;
    totalNetBetaWeightedDelta += betaWeightedDelta;
    totalNetBetaWeightedGamma += betaWeightedGamma;
    totalNetTheta += greeks.theta;
    totalNetVega += greeks.vega;

    const sharesOrContracts = pos.legs.reduce((acc, l) => acc + l.contracts * (l.multiplier || (l.type === 'stock' ? 1 : 100)), 0);

    const entryIV = pos.entryIV !== undefined
      ? pos.entryIV
      : (pos.legs[0]?.iv && pos.legs[0].iv > 0)
      ? pos.legs.reduce((acc, l) => acc + (l.iv || 0) * (l.contracts || 1), 0) / Math.max(1, pos.legs.reduce((acc, l) => acc + (l.contracts || 1), 0))
      : (tick?.currentIV || 0.25);
    const currentIV = tick?.currentIV || entryIV;

    return {
      positionId: pos.id,
      ticker: pos.ticker,
      strategyName: pos.strategyName,
      assetCategory: (pos.assetCategory || 'option') as 'stock' | 'future' | 'option',
      contracts: pos.contracts,
      sharesOrContracts,
      spotPrice,
      assetBeta,
      relativeBeta: Number(relativeBeta.toFixed(2)),
      rawDelta: greeks.delta,
      rawGamma: greeks.gamma,
      rawTheta: greeks.theta,
      rawVega: greeks.vega,
      betaWeightedDelta: Number(betaWeightedDelta.toFixed(2)),
      betaWeightedDollarDelta: Number(betaWeightedDollarDelta.toFixed(2)),
      betaWeightedGamma: Number(betaWeightedGamma.toFixed(4)),
      notionalValue: notional,
      portfolioNotionalPct: 0, // will compute after totalNotional
      riskContributionPct: 0,  // will compute below
      directionalBias: getDirectionalBias(betaWeightedDelta),
      entryIV,
      currentIV,
    };
  });

  const grossBetaDeltaSum = rawPositionMetrics.reduce((s, p) => s + Math.abs(p.betaWeightedDelta), 0) || 1;

  const positionsMetrics: PositionBetaMetrics[] = rawPositionMetrics.map((p) => ({
    ...p,
    portfolioNotionalPct: totalNotional > 0 ? Number(((p.notionalValue / totalNotional) * 100).toFixed(1)) : 0,
    riskContributionPct: Number(((Math.abs(p.betaWeightedDelta) / grossBetaDeltaSum) * 100).toFixed(1)),
  }));

  const portfolioWeightedBeta = totalNotional > 0 ? Number((weightedBetaSum / totalNotional).toFixed(2)) : 1.0;
  const roundedNetBetaDelta = Number(totalNetBetaWeightedDelta.toFixed(1));
  const roundedNetDollarDelta = Number((totalNetBetaWeightedDelta * benchmarkPrice).toFixed(2));
  const roundedNetBetaGamma = Number(totalNetBetaWeightedGamma.toFixed(3));

  const directionalStance = getDirectionalBias(roundedNetBetaDelta);

  let directionalHeadline = '';
  if (directionalStance === 'HEAVILY_BULLISH') {
    directionalHeadline = `Aggressively Long ${benchmarkSymbol} · Equivalent to +${roundedNetBetaDelta} ${benchmarkSymbol} shares ($${Math.abs(roundedNetDollarDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })} market exposure)`;
  } else if (directionalStance === 'MODERATELY_BULLISH') {
    directionalHeadline = `Moderately Long ${benchmarkSymbol} · Equivalent to +${roundedNetBetaDelta} ${benchmarkSymbol} shares ($${Math.abs(roundedNetDollarDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })} market exposure)`;
  } else if (directionalStance === 'DELTA_NEUTRAL') {
    directionalHeadline = `Delta Neutral · Balanced market risk (${roundedNetBetaDelta >= 0 ? '+' : ''}${roundedNetBetaDelta} ${benchmarkSymbol} equivalent shares)`;
  } else if (directionalStance === 'MODERATELY_BEARISH') {
    directionalHeadline = `Moderately Short ${benchmarkSymbol} / Market Hedged · Equivalent to ${roundedNetBetaDelta} ${benchmarkSymbol} shares`;
  } else {
    directionalHeadline = `Aggressively Short ${benchmarkSymbol} / Heavy Hedge · Equivalent to ${roundedNetBetaDelta} ${benchmarkSymbol} shares`;
  }

  // 2. Generate Scenario / Market Shock Payoff Points (-15% to +15% benchmark moves)
  const shockPercentages = [-15, -10, -7, -5, -3, -1, 0, 1, 3, 5, 7, 10, 15];
  const shockCurve: BetaShockPoint[] = shockPercentages.map((pct) => {
    const dollarMove = benchmarkPrice * (pct / 100);
    const stressedPrice = benchmarkPrice + dollarMove;

    // Delta component: totalBetaDelta * dollarMove
    const deltaPnL = totalNetBetaWeightedDelta * dollarMove;
    // Gamma component: 0.5 * totalBetaGamma * (dollarMove)^2
    const gammaPnL = 0.5 * totalNetBetaWeightedGamma * Math.pow(dollarMove, 2);
    const totalPnL = deltaPnL + gammaPnL;

    // Asset attributions
    const positionAttributions: Record<string, number> = {};
    positionsMetrics.forEach((pos) => {
      const posDeltaPnL = pos.betaWeightedDelta * dollarMove;
      const posGammaPnL = 0.5 * pos.betaWeightedGamma * Math.pow(dollarMove, 2);
      positionAttributions[pos.ticker] = (positionAttributions[pos.ticker] || 0) + Number((posDeltaPnL + posGammaPnL).toFixed(2));
    });

    return {
      shockPct: pct,
      benchmarkStressedPrice: Number(stressedPrice.toFixed(2)),
      benchmarkDollarMove: Number(dollarMove.toFixed(2)),
      estimatedPnLDollar: Number(totalPnL.toFixed(2)),
      deltaPnLContribution: Number(deltaPnL.toFixed(2)),
      gammaPnLContribution: Number(gammaPnL.toFixed(2)),
      positionAttributions,
    };
  });

  // 3. Compute Delta Neutralization & Beta Hedge Recommendations
  const deltaDeficit = targetBetaDelta - roundedNetBetaDelta;
  const sharesNeeded = Math.round(deltaDeficit);

  let stockAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let stockDesc = 'Portfolio is currently matched to target delta.';
  if (sharesNeeded > 0) {
    stockAction = 'BUY';
    stockDesc = `Buy ${sharesNeeded} shares of ${benchmarkSymbol} to achieve target beta delta (${targetBetaDelta}).`;
  } else if (sharesNeeded < 0) {
    stockAction = 'SELL';
    stockDesc = `Sell / Short ${Math.abs(sharesNeeded)} shares of ${benchmarkSymbol} to neutralize bullish delta exposure.`;
  }

  // Options hedge: Recommend 30-DTE ATM Put (delta ~ -0.50) or Call (delta ~ +0.50)
  const isNetLong = deltaDeficit < 0; // portfolio is long, need negative delta (Puts)
  const optionDelta = isNetLong ? -0.50 : 0.50;
  const contractsNeeded = Math.round(Math.abs(deltaDeficit) / (100 * Math.abs(optionDelta)));
  const atmStrike = Math.round(benchmarkPrice / 5) * 5;
  const estIv = benchmarkTicker?.currentIV || 0.16;
  const estOptionPrice = calculateBSM(benchmarkPrice, atmStrike, 30 / 365, estIv, isNetLong ? 'put' : 'call').price;
  const totalOptionCost = Number((contractsNeeded * estOptionPrice * 100).toFixed(2));

  const optionAction = contractsNeeded > 0 ? 'BUY' : 'NONE';
  const optionContractType = isNetLong ? 'PUT' : 'CALL';
  const optionDesc = contractsNeeded > 0
    ? `Buy ${contractsNeeded}x ${benchmarkSymbol} ${atmStrike} ${optionContractType} contracts (30 DTE, ~$${estOptionPrice.toFixed(2)} premium) to neutralize exposure.`
    : 'No options hedge required.';

  const hedgeRecommendation: BetaHedgeRecommendation = {
    benchmarkSymbol,
    targetBetaDelta,
    currentBetaDelta: roundedNetBetaDelta,
    deltaDeficit: Number(deltaDeficit.toFixed(1)),
    stockHedge: {
      action: stockAction,
      shares: Math.abs(sharesNeeded),
      estimatedCost: Number((Math.abs(sharesNeeded) * benchmarkPrice).toFixed(2)),
      description: stockDesc,
    },
    optionHedge: {
      action: optionAction,
      contracts: contractsNeeded,
      contractType: optionContractType,
      strike: atmStrike,
      dte: 30,
      targetDelta: optionDelta,
      estimatedPremiumPerContract: Number(estOptionPrice.toFixed(2)),
      totalPremiumCost: totalOptionCost,
      description: optionDesc,
    },
  };

  return {
    benchmark: benchmarkDef,
    benchmarkPrice: Number(benchmarkPrice.toFixed(2)),
    totalPositionsCount: positions.length,
    totalPortfolioNotional: Number(totalNotional.toFixed(2)),
    portfolioWeightedBeta,
    totalNetRawDelta: Number(totalNetRawDelta.toFixed(1)),
    totalNetBetaWeightedDelta: roundedNetBetaDelta,
    totalNetBetaWeightedDollarDelta: roundedNetDollarDelta,
    totalNetBetaWeightedGamma: roundedNetBetaGamma,
    totalNetTheta: Number(totalNetTheta.toFixed(2)),
    totalNetVega: Number(totalNetVega.toFixed(2)),
    directionalStance,
    directionalHeadline,
    positions: positionsMetrics,
    shockCurve,
    hedgeRecommendation,
  };
}
