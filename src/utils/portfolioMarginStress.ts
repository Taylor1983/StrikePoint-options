import { Position, TradeLeg, Ticker, MarginHealthMetrics } from '../types/options';
import { calculateBSM, RISK_FREE_RATE } from './blackScholes';
import { getPositionMarginMetrics } from '../components/PositionsPortfolioView';

export type MarginingModel = 'REG_T' | 'PORTFOLIO_MARGIN';

export interface MarketConditionParams {
  priceShockPct: number;  // e.g. -10 for -10% spot drop
  ivShiftPct: number;     // e.g. +25 for +25% IV expansion
  daysElapsed: number;    // e.g. 7 for 7 days forward
  model: MarginingModel;  // 'REG_T' or 'PORTFOLIO_MARGIN'
}

export interface PositionMarginStressResult {
  positionId: string;
  ticker: string;
  strategyName: string;
  assetCategory: 'stock' | 'future' | 'option';
  contracts: number;
  baseMarginBp: number;
  stressedMarginBp: number;
  marginDeltaDollar: number;
  marginDeltaPercent: number;
  ruleLabel: string;
  vulnerability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityReason: string;
}

export interface PortfolioMarginStressSummary {
  model: MarginingModel;
  baseInitialMarginBp: number;
  stressedInitialMarginBp: number;
  marginDeltaDollar: number;
  marginDeltaPercent: number;
  baseMaintenanceMarginBp: number;
  stressedMaintenanceMarginBp: number;
  baseNetLiquidity: number;
  stressedNetLiquidity: number;
  unrealizedStressPnL: number;
  baseCushionDollar: number;
  baseCushionPercent: number;
  stressedCushionDollar: number;
  stressedCushionPercent: number;
  baseOptionsBuyingPower: number;
  stressedOptionsBuyingPower: number;
  marginCallRiskStatus: 'SAFE' | 'CAUTION' | 'CRITICAL_WARNING' | 'MARGIN_CALL';
  statusColor: string;
  spyDropTolerancePct: number;
  positionAttributions: PositionMarginStressResult[];
  capitalReliefVsRegT?: number; // % savings if Portfolio Margin is selected
}

export interface MarketConditionPreset {
  id: string;
  label: string;
  badge: string;
  description: string;
  priceShockPct: number;
  ivShiftPct: number;
  daysElapsed: number;
  iconType: 'baseline' | 'pullback' | 'correction' | 'crash' | 'black_swan' | 'rally' | 'meltup' | 'vol_spike' | 'vol_crush' | 'decay' | 'expiration';
}

export const MARKET_CONDITION_PRESETS: MarketConditionPreset[] = [
  {
    id: 'baseline',
    label: 'Normal Market (Baseline)',
    badge: '0% / 0% IV',
    description: 'Current real-time market spot prices and implied volatilities (T+0).',
    priceShockPct: 0,
    ivShiftPct: 0,
    daysElapsed: 0,
    iconType: 'baseline',
  },
  {
    id: 'pullback',
    label: 'Mild Pullback (-5%)',
    badge: '-5% / +8% IV',
    description: 'Routine 5% market dip with modest volatility expansion.',
    priceShockPct: -5,
    ivShiftPct: 8,
    daysElapsed: 2,
    iconType: 'pullback',
  },
  {
    id: 'correction',
    label: 'Market Correction (-10%)',
    badge: '-10% / +20% IV',
    description: 'Official 10% market correction across equity indices with volatility jump.',
    priceShockPct: -10,
    ivShiftPct: 20,
    daysElapsed: 5,
    iconType: 'correction',
  },
  {
    id: 'crash',
    label: 'Severe Bear Crash (-20%)',
    badge: '-20% / +45% IV',
    description: 'Bear market crash scenario testing naked puts, short delta, and collateral buffers.',
    priceShockPct: -20,
    ivShiftPct: 45,
    daysElapsed: 7,
    iconType: 'crash',
  },
  {
    id: 'black_swan',
    label: 'Black Swan Shock (-30%)',
    badge: '-30% / +80% IV',
    description: 'Extreme tail-risk liquidation event (similar to 1987 crash or March 2020 circuit breakers).',
    priceShockPct: -30,
    ivShiftPct: 80,
    daysElapsed: 10,
    iconType: 'black_swan',
  },
  {
    id: 'rally',
    label: 'Bull Rally (+5%)',
    badge: '+5% / -5% IV',
    description: 'Constructive 5% upward breakout with mild volatility compression.',
    priceShockPct: 5,
    ivShiftPct: -5,
    daysElapsed: 3,
    iconType: 'rally',
  },
  {
    id: 'meltup',
    label: 'Melt-Up Rally (+10%)',
    badge: '+10% / -12% IV',
    description: 'Aggressive short squeeze rally testing call spreads and short calls.',
    priceShockPct: 10,
    ivShiftPct: -12,
    daysElapsed: 5,
    iconType: 'meltup',
  },
  {
    id: 'vol_spike',
    label: 'VIX Volatility Spike (+35%)',
    badge: 'Flat / +35% IV',
    description: 'Sudden surge in market-wide implied volatility with flat spot price.',
    priceShockPct: 0,
    ivShiftPct: 35,
    daysElapsed: 1,
    iconType: 'vol_spike',
  },
  {
    id: 'vol_crush',
    label: 'Post-Event Vol Crush (-25%)',
    badge: 'Flat / -25% IV',
    description: 'Post-earnings or post-FOMC volatility collapse shrinking options pricing.',
    priceShockPct: 0,
    ivShiftPct: -25,
    daysElapsed: 2,
    iconType: 'vol_crush',
  },
  {
    id: 'decay_14d',
    label: 'Theta Decay (+14 Days)',
    badge: 'T+14 Days',
    description: 'Forward simulation of 14 calendar days of theta time decay at unchanged spot.',
    priceShockPct: 0,
    ivShiftPct: 0,
    daysElapsed: 14,
    iconType: 'decay',
  },
  {
    id: 'expiration',
    label: 'Full Expiration (T+Max)',
    badge: 'At Expiration',
    description: 'Simulate full expiration of all active option contracts to test final assignment vs expiration.',
    priceShockPct: 0,
    ivShiftPct: 0,
    daysElapsed: 45,
    iconType: 'expiration',
  },
];

export interface StressMatrixCell {
  priceShockPct: number;
  ivShiftPct: number;
  marginBp: number;
  marginDeltaDollar: number;
  marginDeltaPercent: number;
  netLiquidity: number;
  cushionPercent: number;
  status: 'SAFE' | 'CAUTION' | 'CRITICAL_WARNING' | 'MARGIN_CALL';
}

/**
 * Calculates theoretical mark-to-market value of a leg under stressed market conditions
 */
export function calculateLegStressedMark(
  leg: TradeLeg,
  spotPrice: number,
  ivShiftPct: number,
  daysElapsed: number
): number {
  const mult = leg.multiplier || (leg.type === 'stock' ? 1 : 100);

  if (leg.type === 'stock') {
    const value = spotPrice * leg.contracts * mult;
    return leg.action === 'buy' ? value : -value;
  }

  if (leg.type === 'future') {
    // Futures P&L is tracked relative to entry
    const entrySpot = leg.strike || spotPrice;
    const pnl = (spotPrice - entrySpot) * leg.contracts * mult;
    return leg.action === 'buy' ? pnl : -pnl;
  }

  // Option leg: compute via Black-Scholes
  const remainingDte = Math.max(0, leg.dte - daysElapsed);
  const timeYears = remainingDte / 365;
  const effectiveIv = Math.max(0.01, leg.iv * (1 + ivShiftPct / 100));

  if (remainingDte <= 0.0001) {
    // Intrinsic value at expiration
    const intrinsic = leg.type === 'call' ? Math.max(0, spotPrice - leg.strike) : Math.max(0, leg.strike - spotPrice);
    const value = intrinsic * mult * leg.contracts;
    return leg.action === 'buy' ? value : -value;
  }

  const bsm = calculateBSM(spotPrice, leg.strike, timeYears, effectiveIv, leg.type, RISK_FREE_RATE);
  const value = bsm.price * mult * leg.contracts;
  return leg.action === 'buy' ? value : -value;
}

/**
 * Calculates dynamic Margin Requirement for a single Position under stressed market conditions
 * Supports both FINRA Rule 4210 / Reg-T and Institutional Portfolio Margin (OCC TIMS 10-point stress grid)
 */
export function calculateDynamicPositionMargin(
  pos: Position,
  baseSpotPrice: number,
  params: MarketConditionParams
): {
  marginBp: number;
  ruleLabel: string;
  vulnerability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityReason: string;
  stressedMark: number;
} {
  const stressedSpot = Math.max(0.01, baseSpotPrice * (1 + params.priceShockPct / 100));
  const isPureStock = pos.legs.length === 1 && pos.legs[0].type === 'stock';
  const isPureFuture = pos.legs.length === 1 && pos.legs[0].type === 'future';
  const stockLeg = pos.legs.find((l) => l.type === 'stock');
  const futureLeg = pos.legs.find((l) => l.type === 'future');
  const optionLegs = pos.legs.filter((l) => l.type === 'call' || l.type === 'put');
  const shortLegs = optionLegs.filter((l) => l.action === 'sell');

  // Compute total stressed mark for this position
  let stressedMark = 0;
  pos.legs.forEach((leg) => {
    stressedMark += calculateLegStressedMark(leg, stressedSpot, params.ivShiftPct, params.daysElapsed);
  });

  // ==========================================
  // 1. INSTITUTIONAL PORTFOLIO MARGIN (OCC TIMS)
  // ==========================================
  if (params.model === 'PORTFOLIO_MARGIN') {
    // Portfolio margin stress evaluates the position across a +/- 15% price grid (10 points)
    // plus high/low volatility shocks. The requirement is the worst-case loss across all scenarios.
    const shockGrid = [-0.15, -0.12, -0.09, -0.06, -0.03, 0.0, 0.03, 0.06, 0.09, 0.12, 0.15];
    const volShocks = [-0.10, 0.15]; // OCC TIMS vol shock high/low

    let worstCaseLoss = 0;
    const currentSimulatedMark = stressedMark;

    shockGrid.forEach((shock) => {
      const gridSpot = Math.max(0.01, stressedSpot * (1 + shock));
      volShocks.forEach((vShock) => {
        let gridMark = 0;
        pos.legs.forEach((leg) => {
          gridMark += calculateLegStressedMark(
            leg,
            gridSpot,
            params.ivShiftPct + vShock * 100,
            params.daysElapsed
          );
        });
        const loss = currentSimulatedMark - gridMark;
        if (loss > worstCaseLoss) {
          worstCaseLoss = loss;
        }
      });
    });

    // Floor requirement: $37.50 per option contract, or 15% of stock notional
    let floor = 0;
    if (isPureStock && stockLeg) {
      floor = stressedSpot * stockLeg.contracts * (stockLeg.multiplier || 1) * 0.15;
    } else if (optionLegs.length > 0) {
      floor = optionLegs.reduce((sum, l) => sum + l.contracts * 37.5, 0);
    } else if (isPureFuture && futureLeg) {
      floor = 5000 * futureLeg.contracts;
    }

    const pmRequirement = Math.max(floor, worstCaseLoss);

    let vulnerability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let vulnerabilityReason = 'Portfolio Margin risk-hedged';
    if (shortLegs.length > 0 && optionLegs.length === shortLegs.length) {
      vulnerability = 'CRITICAL';
      vulnerabilityReason = 'Uncovered short options risk grid expansion';
    } else if (worstCaseLoss > floor * 2) {
      vulnerability = 'HIGH';
      vulnerabilityReason = 'Asymmetric tail-risk in adverse price shock';
    } else if (worstCaseLoss > floor) {
      vulnerability = 'MEDIUM';
      vulnerabilityReason = 'Standard hedged portfolio stress exposure';
    }

    return {
      marginBp: Number(pmRequirement.toFixed(2)),
      ruleLabel: 'OCC TIMS (PORTFOLIO)',
      vulnerability,
      vulnerabilityReason,
      stressedMark,
    };
  }

  // ==========================================
  // 2. US REG-T / FINRA RULE 4210 (STANDARD)
  // ==========================================

  // Pure Stock
  if (isPureStock && stockLeg) {
    const mult = stockLeg.multiplier || 1;
    const notional = stressedSpot * stockLeg.contracts * mult;
    const bp = stockLeg.action === 'buy' ? notional * 0.5 : Math.max(5 * stockLeg.contracts, notional * 0.5);
    return {
      marginBp: Number(bp.toFixed(2)),
      ruleLabel: stockLeg.action === 'buy' ? 'REG-T 50%' : 'SHORT 50%',
      vulnerability: 'MEDIUM',
      vulnerabilityReason: stockLeg.action === 'buy' ? 'Linear 50% equity margin' : 'Short stock squeeze risk',
      stressedMark,
    };
  }

  // Pure Future (CME SPAN)
  if (isPureFuture && futureLeg) {
    const baseSpan = pos.ticker === '/ES' ? 12320 : pos.ticker === '/NQ' ? 18480 : pos.ticker === '/CL' ? 6820 : 10000;
    // CME SPAN margin scales up during volatility spikes and severe price shocks
    const volScaling = 1 + Math.max(0, params.ivShiftPct * 0.005) + Math.max(0, Math.abs(params.priceShockPct) * 0.008);
    const spanMargin = futureLeg.contracts * baseSpan * volScaling;
    return {
      marginBp: Number(spanMargin.toFixed(2)),
      ruleLabel: `CME SPAN (${pos.ticker})`,
      vulnerability: Math.abs(params.priceShockPct) >= 15 ? 'HIGH' : 'MEDIUM',
      vulnerabilityReason: 'CME SPAN volatility scaling collateral requirement',
      stressedMark,
    };
  }

  // Covered Call
  if (stockLeg && optionLegs.length === 1 && optionLegs[0].action === 'sell' && stockLeg.action === 'buy') {
    const notional = stressedSpot * stockLeg.contracts * (stockLeg.multiplier || 1);
    const callMark = Math.abs(calculateLegStressedMark(optionLegs[0], stressedSpot, params.ivShiftPct, params.daysElapsed));
    const bp = Math.max(0, notional * 0.5 - callMark);
    return {
      marginBp: Number(bp.toFixed(2)),
      ruleLabel: 'COVERED CALL',
      vulnerability: 'LOW',
      vulnerabilityReason: 'Stock collateral completely offsets short call assignment risk',
      stressedMark,
    };
  }

  // Pure Long Options (100% Cash / Debit paid, no margin call possible)
  if (pos.entryCost > 0 && shortLegs.length === 0) {
    // Under Reg-T, long options are paid in full upfront, margin requirement is current option value
    const currentOptValue = Math.max(0, stressedMark);
    return {
      marginBp: Number(Math.min(pos.entryCost, Math.max(0, currentOptValue)).toFixed(2)),
      ruleLabel: 'DEBIT (100%)',
      vulnerability: 'LOW',
      vulnerabilityReason: 'Defined risk debit paid upfront; zero margin call risk',
      stressedMark,
    };
  }

  // Vertical Credit Spread (Strike Width - Credit)
  if (optionLegs.length === 2 && optionLegs[0].type === optionLegs[1].type && shortLegs.length === 1) {
    const spreadWidth = Math.abs(optionLegs[0].strike - optionLegs[1].strike) * 100 * pos.contracts;
    const credit = Math.abs(pos.entryCost);
    const bp = Math.max(0, spreadWidth - credit);
    const isThreatened = (optionLegs[0].type === 'put' && stressedSpot <= Math.max(optionLegs[0].strike, optionLegs[1].strike)) ||
                         (optionLegs[0].type === 'call' && stressedSpot >= Math.min(optionLegs[0].strike, optionLegs[1].strike));
    return {
      marginBp: Number(bp.toFixed(2)),
      ruleLabel: 'SPREAD WIDTH',
      vulnerability: isThreatened ? 'HIGH' : 'LOW',
      vulnerabilityReason: isThreatened ? 'Credit spread threatened: pin risk / assignment hazard' : 'Capped spread strike differential',
      stressedMark,
    };
  }

  // Naked / Uncovered Short Options (FINRA Rule 4210)
  if (shortLegs.length > 0) {
    let totalNaked = 0;
    shortLegs.forEach((leg) => {
      const mult = (leg.multiplier || 100) * leg.contracts;
      const legMark = Math.abs(calculateLegStressedMark(leg, stressedSpot, params.ivShiftPct, params.daysElapsed));
      const prem = legMark; // current market value of short premium

      if (leg.type === 'call') {
        const otm = Math.max(0, (leg.strike - stressedSpot) * mult);
        const opt1 = stressedSpot * mult * 0.20 - otm + prem;
        const opt2 = stressedSpot * mult * 0.10 + prem;
        totalNaked += Math.max(opt1, opt2);
      } else {
        const otm = Math.max(0, (stressedSpot - leg.strike) * mult);
        const opt1 = stressedSpot * mult * 0.20 - otm + prem;
        const opt2 = leg.strike * mult * 0.10 + prem;
        totalNaked += Math.max(opt1, opt2);
      }
    });

    const isDeepInTrouble = shortLegs.some(
      (l) => (l.type === 'put' && stressedSpot < l.strike) || (l.type === 'call' && stressedSpot > l.strike)
    );

    return {
      marginBp: Number(totalNaked.toFixed(2)),
      ruleLabel: 'RULE 4210 (20%)',
      vulnerability: isDeepInTrouble ? 'CRITICAL' : 'HIGH',
      vulnerabilityReason: isDeepInTrouble
        ? 'Naked short option driven deep ITM: massive margin ballooning!'
        : 'Undefined risk short option: highly sensitive to spot shocks and vol spikes',
      stressedMark,
    };
  }

  return {
    marginBp: Number(Math.abs(pos.entryCost).toFixed(2)),
    ruleLabel: 'CASH / DEBIT',
    vulnerability: 'LOW',
    vulnerabilityReason: 'Collateral held at debit cost',
    stressedMark,
  };
}

/**
 * Calculates complete Portfolio Margin Stress Analysis across all positions under arbitrary market conditions
 */
export function calculatePortfolioMarginStress(
  positions: Position[],
  tickers: Record<string, Ticker> = {},
  cashBalance: number = 100000,
  params: MarketConditionParams = {
    priceShockPct: 0,
    ivShiftPct: 0,
    daysElapsed: 0,
    model: 'REG_T',
  }
): PortfolioMarginStressSummary {
  // 1. Calculate Base (Current Baseline) Metrics
  const baseParams: MarketConditionParams = {
    priceShockPct: 0,
    ivShiftPct: 0,
    daysElapsed: 0,
    model: params.model,
  };

  let baseInitialMarginBp = 0;
  let stressedInitialMarginBp = 0;
  let baseNetLiquidity = cashBalance;
  let stressedNetLiquidity = cashBalance;

  const positionAttributions: PositionMarginStressResult[] = [];

  positions.forEach((pos) => {
    const baseSpot = tickers[pos.ticker]?.price || (pos.legs[0]?.strike || 100);

    // Baseline margin
    const baseMetrics = calculateDynamicPositionMargin(pos, baseSpot, baseParams);
    baseInitialMarginBp += baseMetrics.marginBp;
    baseNetLiquidity += baseMetrics.stressedMark;

    // Stressed margin
    const stressedMetrics = calculateDynamicPositionMargin(pos, baseSpot, params);
    stressedInitialMarginBp += stressedMetrics.marginBp;
    stressedNetLiquidity += stressedMetrics.stressedMark;

    const deltaDollar = stressedMetrics.marginBp - baseMetrics.marginBp;
    const deltaPercent = baseMetrics.marginBp > 0 ? (deltaDollar / baseMetrics.marginBp) * 100 : 0;

    positionAttributions.push({
      positionId: pos.id,
      ticker: pos.ticker,
      strategyName: pos.strategyName,
      assetCategory: pos.assetCategory || 'option',
      contracts: pos.contracts,
      baseMarginBp: baseMetrics.marginBp,
      stressedMarginBp: stressedMetrics.marginBp,
      marginDeltaDollar: Number(deltaDollar.toFixed(2)),
      marginDeltaPercent: Number(deltaPercent.toFixed(1)),
      ruleLabel: stressedMetrics.ruleLabel,
      vulnerability: stressedMetrics.vulnerability,
      vulnerabilityReason: stressedMetrics.vulnerabilityReason,
    });
  });

  // Calculate Reg-T baseline for comparison if currently in Portfolio Margin
  let regTBaseBp = 0;
  if (params.model === 'PORTFOLIO_MARGIN') {
    const regTParams: MarketConditionParams = { priceShockPct: 0, ivShiftPct: 0, daysElapsed: 0, model: 'REG_T' };
    positions.forEach((pos) => {
      const baseSpot = tickers[pos.ticker]?.price || (pos.legs[0]?.strike || 100);
      regTBaseBp += calculateDynamicPositionMargin(pos, baseSpot, regTParams).marginBp;
    });
  }

  const capitalReliefVsRegT =
    regTBaseBp > 0 && params.model === 'PORTFOLIO_MARGIN'
      ? Number((((regTBaseBp - baseInitialMarginBp) / regTBaseBp) * 100).toFixed(1))
      : undefined;

  const marginDeltaDollar = Number((stressedInitialMarginBp - baseInitialMarginBp).toFixed(2));
  const marginDeltaPercent =
    baseInitialMarginBp > 0 ? Number(((marginDeltaDollar / baseInitialMarginBp) * 100).toFixed(1)) : 0;

  // Maintenance Margin requirement (75% of initial margin under FINRA 4210)
  const baseMaintenanceMarginBp = Number((baseInitialMarginBp * 0.75).toFixed(2));
  const stressedMaintenanceMarginBp = Number((stressedInitialMarginBp * 0.75).toFixed(2));

  // Margin Cushion: dollar amount of equity available above maintenance requirement
  const baseCushionDollar = Number((baseNetLiquidity - baseMaintenanceMarginBp).toFixed(2));
  const baseCushionPercent = baseNetLiquidity > 0 ? Number(((baseCushionDollar / baseNetLiquidity) * 100).toFixed(1)) : 0;

  const stressedCushionDollar = Number((stressedNetLiquidity - stressedMaintenanceMarginBp).toFixed(2));
  const stressedCushionPercent = stressedNetLiquidity > 0 ? Number(((stressedCushionDollar / stressedNetLiquidity) * 100).toFixed(1)) : 0;

  const baseOptionsBuyingPower = Math.max(0, Number((cashBalance - baseInitialMarginBp).toFixed(2)));
  const stressedOptionsBuyingPower = Math.max(0, Number((stressedNetLiquidity - stressedInitialMarginBp).toFixed(2)));

  const unrealizedStressPnL = Number((stressedNetLiquidity - baseNetLiquidity).toFixed(2));

  // Margin Call Risk Status
  let marginCallRiskStatus: 'SAFE' | 'CAUTION' | 'CRITICAL_WARNING' | 'MARGIN_CALL' = 'SAFE';
  let statusColor = '#00e676';

  if (stressedCushionDollar <= 0) {
    marginCallRiskStatus = 'MARGIN_CALL';
    statusColor = '#ff334b';
  } else if (stressedCushionPercent < 15) {
    marginCallRiskStatus = 'CRITICAL_WARNING';
    statusColor = '#ff9900';
  } else if (stressedCushionPercent < 30) {
    marginCallRiskStatus = 'CAUTION';
    statusColor = '#ffd600';
  } else {
    marginCallRiskStatus = 'SAFE';
    statusColor = '#00e676';
  }

  // Estimated drop in SPY or broad market before margin call
  const spyDropTolerancePct = Number(
    (Math.max(0, stressedCushionPercent) / Math.max(1, (baseInitialMarginBp / Math.max(1, baseNetLiquidity)) * 2)).toFixed(1)
  );

  return {
    model: params.model,
    baseInitialMarginBp: Number(baseInitialMarginBp.toFixed(2)),
    stressedInitialMarginBp: Number(stressedInitialMarginBp.toFixed(2)),
    marginDeltaDollar,
    marginDeltaPercent,
    baseMaintenanceMarginBp,
    stressedMaintenanceMarginBp,
    baseNetLiquidity: Number(baseNetLiquidity.toFixed(2)),
    stressedNetLiquidity: Number(stressedNetLiquidity.toFixed(2)),
    unrealizedStressPnL,
    baseCushionDollar,
    baseCushionPercent,
    stressedCushionDollar,
    stressedCushionPercent,
    baseOptionsBuyingPower,
    stressedOptionsBuyingPower,
    marginCallRiskStatus,
    statusColor,
    spyDropTolerancePct,
    positionAttributions,
    capitalReliefVsRegT,
  };
}

/**
 * Generates a comprehensive 2D Market Condition Stress Matrix (Price Shocks × Volatility Shocks)
 */
export function generatePortfolioStressMatrix(
  positions: Position[],
  tickers: Record<string, Ticker> = {},
  cashBalance: number = 100000,
  model: MarginingModel = 'REG_T'
): {
  priceShocks: number[];
  volShocks: number[];
  matrix: StressMatrixCell[][];
} {
  const priceShocks = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  const volShocks = [-20, 0, 25, 50];

  const baseAnalysis = calculatePortfolioMarginStress(positions, tickers, cashBalance, {
    priceShockPct: 0,
    ivShiftPct: 0,
    daysElapsed: 0,
    model,
  });

  const matrix: StressMatrixCell[][] = [];

  volShocks.forEach((vShock) => {
    const row: StressMatrixCell[] = [];
    priceShocks.forEach((pShock) => {
      const stress = calculatePortfolioMarginStress(positions, tickers, cashBalance, {
        priceShockPct: pShock,
        ivShiftPct: vShock,
        daysElapsed: 0,
        model,
      });

      row.push({
        priceShockPct: pShock,
        ivShiftPct: vShock,
        marginBp: stress.stressedInitialMarginBp,
        marginDeltaDollar: stress.marginDeltaDollar,
        marginDeltaPercent: stress.marginDeltaPercent,
        netLiquidity: stress.stressedNetLiquidity,
        cushionPercent: stress.stressedCushionPercent,
        status: stress.marginCallRiskStatus,
      });
    });
    matrix.push(row);
  });

  return { priceShocks, volShocks, matrix };
}

/**
 * Generates continuous Margin Curve Points across an underlying price axis
 * Used to draw the Margin Requirement overlay directly on the Risk Profile chart!
 */
export function generateMarginCurvePoints(
  positions: Position[],
  tickerSymbol: string,
  minPrice: number,
  maxPrice: number,
  steps: number = 60,
  ivShiftPct: number = 0,
  daysElapsed: number = 0,
  model: MarginingModel = 'REG_T'
): Array<{ price: number; marginBp: number; status: 'SAFE' | 'CAUTION' | 'MARGIN_CALL' }> {
  const points: Array<{ price: number; marginBp: number; status: 'SAFE' | 'CAUTION' | 'MARGIN_CALL' }> = [];
  const stepSize = (maxPrice - minPrice) / Math.max(1, steps);

  // Filter positions matching ticker (or use all if single symbol)
  const relevantPositions = positions.filter((p) => p.ticker === tickerSymbol);
  const targetPositions = relevantPositions.length > 0 ? relevantPositions : positions;

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + i * stepSize;
    let totalMargin = 0;

    targetPositions.forEach((pos) => {
      const param: MarketConditionParams = {
        priceShockPct: ((price - (pos.legs[0]?.strike || price)) / (pos.legs[0]?.strike || price)) * 100,
        ivShiftPct,
        daysElapsed,
        model,
      };
      const res = calculateDynamicPositionMargin(pos, price, param);
      totalMargin += res.marginBp;
    });

    points.push({
      price: Number(price.toFixed(2)),
      marginBp: Number(totalMargin.toFixed(2)),
      status: totalMargin > 50000 ? 'MARGIN_CALL' : totalMargin > 30000 ? 'CAUTION' : 'SAFE',
    });
  }

  return points;
}
