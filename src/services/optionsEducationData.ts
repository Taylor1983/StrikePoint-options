/**
 * OPTIONS EDUCATION & QUANTITATIVE DERIVATIVES ACADEMY DATA
 * Comprehensive masterclass syllabus, strategy risk models, volatility skew mechanics,
 * event risk & IV crush mathematics, probability distribution models, Greeks term structure,
 * and over/undervaluation diagnostic algorithms.
 */

import { TradeLeg } from '../types/options';

export type EducationTopicCategory =
  | 'STRATEGIES'
  | 'SKEW_SMIRKS'
  | 'EVENT_RISK'
  | 'PRICING_PROBABILITY'
  | 'GREEKS_SENSITIVITY'
  | 'IV_VS_HV_VALUATION';

export interface StrategyEducationCard {
  id: string;
  name: string;
  category: 'DEFINED_RISK' | 'INCOME_CREDIT' | 'VOLATILITY_LONG' | 'VOLATILITY_SHORT' | 'SYNTHETIC_ASYMMETRIC';
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'NON_DIRECTIONAL';
  volatilityBias: 'LONG_VEGA' | 'SHORT_VEGA' | 'VEGA_NEUTRAL';
  thetaBias: 'POSITIVE_THETA' | 'NEGATIVE_THETA';
  popRange: string; // e.g. "65% - 82%"
  maxProfitDesc: string;
  maxLossDesc: string;
  breakevenFormula: string;
  idealIvEnvironment: 'HIGH_IV' | 'LOW_IV' | 'ELEVATED_SKEW' | 'ANY';
  bestUsedFor: string;
  keyRisks: string;
  managementRules: string;
  typicalDte: string;
  exampleLegs: (spot: number) => TradeLeg[];
  // SVG Payoff points for standard normalized representation (price offsets from spot)
  getPayoffPoints: (spot: number) => { price: number; pnlExp: number; pnlT0: number }[];
}

export interface VolatilitySkewLesson {
  id: string;
  title: string;
  subtitle: string;
  type: 'PUT_SKEW' | 'CALL_SKEW' | 'VOL_SMILE' | 'SKEW_SLOPE';
  explanation: string;
  institutionalDriver: string;
  assetClassPresence: string;
  howToExploit: string;
  samplePoints: { moneyness: number; iv: number; strikeLabel: string }[];
}

export interface EventRiskMetric {
  ticker: string;
  eventName: string;
  eventDate: string;
  preEventIv: number; // e.g. 84%
  estimatedPostEventIv: number; // e.g. 38%
  ivCrushDropPts: number; // e.g. 46 pts
  pricedExpectedMovePct: number; // e.g. 7.5%
  historicalAverageMovePct: number; // e.g. 4.1%
  straddlePrice: number;
  verdict: 'OVERPRICED_VOL' | 'FAIR_VOL' | 'UNDERPRICED_VOL';
  lessonNote: string;
}

export interface GreekTermStructureData {
  greek: 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA' | 'RHO';
  symbol: string;
  definition: string;
  unit: string;
  order: 'FIRST_ORDER' | 'SECOND_ORDER';
  atmSensitivityByDte: { dte: number; label: string; atmValue: number; curvature: string }[];
  keyTakeaway: string;
  commonTrap: string;
}

export interface ValuationDiagnosticResult {
  ticker: string;
  spotPrice: number;
  currentIv30: number; // in %
  historicalHv20: number; // in %
  ivRank: number; // 0 - 100
  ivPercentile: number; // 0 - 100
  ivHvRatio: number; // e.g. 1.34
  expectedMovePct: number; // in %
  vrpSpread: number; // IV - HV in vol pts
  verdict: 'OVERVALUED' | 'UNDERVALUED' | 'FAIRLY_VALUED';
  verdictBadgeColor: string;
  confidenceScore: number; // 0 - 100%
  recommendedStrategies: string[];
  strategiesToAvoid: string[];
  rationale: string;
}

/**
 * 1. OPTIONS STRATEGIES EDUCATION DATA & PAYOFF MODELS
 */
export const OPTIONS_STRATEGY_EDUCATION_LIST: StrategyEducationCard[] = [
  // 1. Iron Condor
  {
    id: 'iron-condor',
    name: 'Iron Condor (4-Leg Neutral Range)',
    category: 'INCOME_CREDIT',
    bias: 'NEUTRAL',
    volatilityBias: 'SHORT_VEGA',
    thetaBias: 'POSITIVE_THETA',
    popRange: '68% - 82%',
    maxProfitDesc: 'Net Credit Received across all 4 legs',
    maxLossDesc: 'Wing Width - Net Credit Received',
    breakevenFormula: 'Lower: Short Put - Credit | Upper: Short Call + Credit',
    idealIvEnvironment: 'HIGH_IV',
    bestUsedFor: 'Range-bound underlying stocks with high IV Rank (>50) where options premium is overpriced.',
    keyRisks: 'Fast gap beyond short strikes; volatility expansion hurting unrealized P&L early in trade.',
    managementRules: 'Take profit at 50% of max credit received. Manage or close if underlying tests short strike or at 21 DTE.',
    typicalDte: '30 - 45 DTE',
    exampleLegs: (spot) => [
      { id: 'ic1', type: 'put', action: 'buy', strike: Number((spot * 0.90).toFixed(1)), expiration: '35 DTE', dte: 35, iv: 0.38, premium: 1.10, contracts: 1, multiplier: 100, underlyingSymbol: 'SPY' },
      { id: 'ic2', type: 'put', action: 'sell', strike: Number((spot * 0.94).toFixed(1)), expiration: '35 DTE', dte: 35, iv: 0.34, premium: 2.60, contracts: 1, multiplier: 100, underlyingSymbol: 'SPY' },
      { id: 'ic3', type: 'call', action: 'sell', strike: Number((spot * 1.06).toFixed(1)), expiration: '35 DTE', dte: 35, iv: 0.30, premium: 2.50, contracts: 1, multiplier: 100, underlyingSymbol: 'SPY' },
      { id: 'ic4', type: 'call', action: 'buy', strike: Number((spot * 1.10).toFixed(1)), expiration: '35 DTE', dte: 35, iv: 0.28, premium: 1.00, contracts: 1, multiplier: 100, underlyingSymbol: 'SPY' },
    ],
    getPayoffPoints: (spot) => {
      const lowerBuy = spot * 0.90;
      const lowerSell = spot * 0.94;
      const upperSell = spot * 1.06;
      const upperBuy = spot * 1.10;
      const credit = 300;
      const wingWidth = (lowerSell - lowerBuy) * 100;
      const maxLoss = wingWidth - credit;

      const pts = [];
      for (let factor = 0.82; factor <= 1.18; factor += 0.02) {
        const p = spot * factor;
        let pnl = credit;
        if (p < lowerSell) {
          pnl = credit - Math.min(wingWidth, (lowerSell - p) * 100);
        } else if (p > upperSell) {
          pnl = credit - Math.min(wingWidth, (p - upperSell) * 100);
        }
        // T+0 smooth curve approximation
        const distFromMid = Math.abs(p - spot) / spot;
        const pnlT0 = credit * 0.6 - distFromMid * 1800;
        pts.push({ price: Number(p.toFixed(1)), pnlExp: Number(pnl.toFixed(0)), pnlT0: Number(pnlT0.toFixed(0)) });
      }
      return pts;
    },
  },

  // 2. Bull Call Spread (Debit Call Spread)
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread (Debit Vertical)',
    category: 'DEFINED_RISK',
    bias: 'BULLISH',
    volatilityBias: 'VEGA_NEUTRAL',
    thetaBias: 'NEGATIVE_THETA',
    popRange: '45% - 58%',
    maxProfitDesc: 'Strike Width - Net Debit Paid',
    maxLossDesc: 'Net Debit Paid (100% Defined)',
    breakevenFormula: 'Long Call Strike + Net Debit Paid',
    idealIvEnvironment: 'LOW_IV',
    bestUsedFor: 'Moderately bullish directional moves when IV is low/normal and outright calls have excessive extrinsic premium.',
    keyRisks: 'Underlying stagnates or falls below long strike; time decay erodes debit if move takes too long.',
    managementRules: 'Close or roll when underlying reaches short strike, or at 50% - 75% max profit. Cut loss if trend breaks technical support.',
    typicalDte: '30 - 60 DTE',
    exampleLegs: (spot) => [
      { id: 'bcs1', type: 'call', action: 'buy', strike: Number(spot.toFixed(1)), expiration: '45 DTE', dte: 45, iv: 0.25, premium: 4.80, contracts: 1, multiplier: 100, underlyingSymbol: 'NVDA' },
      { id: 'bcs2', type: 'call', action: 'sell', strike: Number((spot * 1.06).toFixed(1)), expiration: '45 DTE', dte: 45, iv: 0.24, premium: 2.10, contracts: 1, multiplier: 100, underlyingSymbol: 'NVDA' },
    ],
    getPayoffPoints: (spot) => {
      const k1 = spot;
      const k2 = spot * 1.06;
      const debit = 270;
      const width = (k2 - k1) * 100;
      const pts = [];
      for (let factor = 0.88; factor <= 1.15; factor += 0.015) {
        const p = spot * factor;
        let pnl = -debit;
        if (p > k1) {
          pnl = Math.min(width - debit, (p - k1) * 100 - debit);
        }
        const pnlT0 = (p - spot) * 45 - debit * 0.3;
        pts.push({ price: Number(p.toFixed(1)), pnlExp: Number(pnl.toFixed(0)), pnlT0: Number(pnlT0.toFixed(0)) });
      }
      return pts;
    },
  },

  // 3. Bull Put Credit Spread
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread (Credit Vertical)',
    category: 'INCOME_CREDIT',
    bias: 'BULLISH',
    volatilityBias: 'SHORT_VEGA',
    thetaBias: 'POSITIVE_THETA',
    popRange: '70% - 85%',
    maxProfitDesc: 'Net Credit Received at entry',
    maxLossDesc: 'Strike Width - Net Credit Received',
    breakevenFormula: 'Short Put Strike - Net Credit Received',
    idealIvEnvironment: 'HIGH_IV',
    bestUsedFor: 'Bullish or sideways markets with elevated put skew; allows profiting even if stock doesn\'t rise, as long as it stays above short strike.',
    keyRisks: 'Fast gap down through both put strikes; early assignment risk on deep ITM short puts.',
    managementRules: 'Take profit at 50% of initial credit. Stop loss at 2x - 3x credit received.',
    typicalDte: '30 - 45 DTE',
    exampleLegs: (spot) => [
      { id: 'bps1', type: 'put', action: 'buy', strike: Number((spot * 0.92).toFixed(1)), expiration: '35 DTE', dte: 35, iv: 0.32, premium: 1.20, contracts: 1, multiplier: 100, underlyingSymbol: 'AAPL' },
      { id: 'bps2', type: 'put', action: 'sell', strike: Number((spot * 0.96).toFixed(1)), expiration: '35 DTE', dte: 35, iv: 0.30, premium: 2.80, contracts: 1, multiplier: 100, underlyingSymbol: 'AAPL' },
    ],
    getPayoffPoints: (spot) => {
      const k1 = spot * 0.92;
      const k2 = spot * 0.96;
      const credit = 160;
      const width = (k2 - k1) * 100;
      const pts = [];
      for (let factor = 0.85; factor <= 1.12; factor += 0.015) {
        const p = spot * factor;
        let pnl = credit;
        if (p < k2) {
          pnl = credit - Math.min(width, (k2 - p) * 100);
        }
        const pnlT0 = credit * 0.5 + (p - spot * 0.96) * 35;
        pts.push({ price: Number(p.toFixed(1)), pnlExp: Number(pnl.toFixed(0)), pnlT0: Number(pnlT0.toFixed(0)) });
      }
      return pts;
    },
  },

  // 4. Long Straddle (Pure Volatility Breakout)
  {
    id: 'long-straddle',
    name: 'Long Straddle (Pure Volatility Long)',
    category: 'VOLATILITY_LONG',
    bias: 'NON_DIRECTIONAL',
    volatilityBias: 'LONG_VEGA',
    thetaBias: 'NEGATIVE_THETA',
    popRange: '35% - 45%',
    maxProfitDesc: 'Unlimited upside; substantial downside to $0',
    maxLossDesc: 'Total Premium Paid (Call + Put debit)',
    breakevenFormula: 'Lower: Strike - Total Cost | Upper: Strike + Total Cost',
    idealIvEnvironment: 'LOW_IV',
    bestUsedFor: 'Anticipating an imminent massive volatility explosion or price move exceeding market expectations.',
    keyRisks: 'Severe theta time decay; rapid volatility crush if underlying stays pinned near ATM strike.',
    managementRules: 'Exit within 3 - 5 days or immediately upon catalyst release. Avoid holding through binary IV crush events unless move exceeds priced move.',
    typicalDte: '14 - 30 DTE',
    exampleLegs: (spot) => [
      { id: 'ls1', type: 'call', action: 'buy', strike: Number(spot.toFixed(1)), expiration: '21 DTE', dte: 21, iv: 0.28, premium: 5.50, contracts: 1, multiplier: 100, underlyingSymbol: 'TSLA' },
      { id: 'ls2', type: 'put', action: 'buy', strike: Number(spot.toFixed(1)), expiration: '21 DTE', dte: 21, iv: 0.29, premium: 5.30, contracts: 1, multiplier: 100, underlyingSymbol: 'TSLA' },
    ],
    getPayoffPoints: (spot) => {
      const cost = 1080;
      const pts = [];
      for (let factor = 0.82; factor <= 1.18; factor += 0.02) {
        const p = spot * factor;
        const intrinsic = Math.max(p - spot, spot - p) * 100;
        const pnl = intrinsic - cost;
        const pnlT0 = intrinsic * 0.65 - cost * 0.75;
        pts.push({ price: Number(p.toFixed(1)), pnlExp: Number(pnl.toFixed(0)), pnlT0: Number(pnlT0.toFixed(0)) });
      }
      return pts;
    },
  },

  // 5. Broken Wing Butterfly (Skew Arbitrage)
  {
    id: 'broken-wing-butterfly',
    name: 'Broken Wing Butterfly (Asymmetric Skew)',
    category: 'SYNTHETIC_ASYMMETRIC',
    bias: 'BULLISH',
    volatilityBias: 'SHORT_VEGA',
    thetaBias: 'POSITIVE_THETA',
    popRange: '68% - 78%',
    maxProfitDesc: 'Width of Narrow Spread + Net Credit',
    maxLossDesc: 'Difference in Wing Widths - Net Credit',
    breakevenFormula: 'Upper Wing Strike - (Wing Difference - Credit)',
    idealIvEnvironment: 'ELEVATED_SKEW',
    bestUsedFor: 'Exploiting steep volatility skew; entered for zero cost or net credit so there is zero downside risk!',
    keyRisks: 'Extreme runaway rally testing the extended broken wing.',
    managementRules: 'Close when price pins the center strikes or at 60% max profit. Zero risk if stock drops, letting you hold stress-free.',
    typicalDte: '25 - 45 DTE',
    exampleLegs: (spot) => [
      { id: 'bwb1', type: 'call', action: 'buy', strike: Number(spot.toFixed(1)), expiration: '30 DTE', dte: 30, iv: 0.26, premium: 6.20, contracts: 1, multiplier: 100, underlyingSymbol: 'QQQ' },
      { id: 'bwb2', type: 'call', action: 'sell', strike: Number((spot * 1.03).toFixed(1)), expiration: '30 DTE', dte: 30, iv: 0.24, premium: 3.80, contracts: 2, multiplier: 100, underlyingSymbol: 'QQQ' },
      { id: 'bwb3', type: 'call', action: 'buy', strike: Number((spot * 1.08).toFixed(1)), expiration: '30 DTE', dte: 30, iv: 0.22, premium: 1.10, contracts: 1, multiplier: 100, underlyingSymbol: 'QQQ' },
    ],
    getPayoffPoints: (spot) => {
      const k1 = spot;
      const k2 = spot * 1.03;
      const k3 = spot * 1.08;
      const credit = 30; // entered for $0.30 credit
      const pts = [];
      for (let factor = 0.92; factor <= 1.14; factor += 0.015) {
        const p = spot * factor;
        let pnl = credit;
        if (p > k1 && p <= k2) {
          pnl = credit + (p - k1) * 100;
        } else if (p > k2 && p <= k3) {
          pnl = credit + (k2 - k1) * 100 - (p - k2) * 100;
        } else if (p > k3) {
          const maxL = (k3 - k2) * 100 - (k2 - k1) * 100 - credit;
          pnl = -maxL;
        }
        const pnlT0 = pnl * 0.6;
        pts.push({ price: Number(p.toFixed(1)), pnlExp: Number(pnl.toFixed(0)), pnlT0: Number(pnlT0.toFixed(0)) });
      }
      return pts;
    },
  },

  // 6. Calendar Spread (Time Horizon / Vega Long)
  {
    id: 'calendar-spread',
    name: 'Calendar Spread (Time Decay Horizon)',
    category: 'VOLATILITY_LONG',
    bias: 'NEUTRAL',
    volatilityBias: 'LONG_VEGA',
    thetaBias: 'POSITIVE_THETA',
    popRange: '55% - 65%',
    maxProfitDesc: 'Achieved when underlying pins strike at front-month expiration',
    maxLossDesc: 'Net Debit Paid to enter calendar',
    breakevenFormula: 'Non-linear dynamic bounds dependent on back-month IV',
    idealIvEnvironment: 'LOW_IV',
    bestUsedFor: 'Exploiting difference in time decay: front month decays faster than back month, plus benefits from future IV rise.',
    keyRisks: 'Large directional breakout away from strike; front-month gamma risk.',
    managementRules: 'Close when front month reaches 5 - 7 DTE or upon 25% - 35% return on capital.',
    typicalDte: 'Front: 14D | Back: 45D',
    exampleLegs: (spot) => [
      { id: 'cal1', type: 'call', action: 'sell', strike: Number(spot.toFixed(1)), expiration: '14 DTE', dte: 14, iv: 0.25, premium: 2.40, contracts: 1, multiplier: 100, underlyingSymbol: 'MSFT' },
      { id: 'cal2', type: 'call', action: 'buy', strike: Number(spot.toFixed(1)), expiration: '45 DTE', dte: 45, iv: 0.26, premium: 4.80, contracts: 1, multiplier: 100, underlyingSymbol: 'MSFT' },
    ],
    getPayoffPoints: (spot) => {
      const debit = 240;
      const pts = [];
      for (let factor = 0.88; factor <= 1.12; factor += 0.015) {
        const p = spot * factor;
        const dist = Math.abs(p - spot);
        const pnlExp = Math.max(-debit, 450 - dist * 35 - debit);
        const pnlT0 = Math.max(-debit, 280 - dist * 25 - debit);
        pts.push({ price: Number(p.toFixed(1)), pnlExp: Number(pnlExp.toFixed(0)), pnlT0: Number(pnlT0.toFixed(0)) });
      }
      return pts;
    },
  },
];

/**
 * 2. VOLATILITY SKEWS & SMIRKS LESSONS
 */
export const VOLATILITY_SKEW_LESSONS: VolatilitySkewLesson[] = [
  {
    id: 'equity-put-smirk',
    title: 'Standard Equity Put Skew (The "Smirk")',
    subtitle: 'Why Downside Puts Cost Significantly More Volatility Than Upside Calls',
    type: 'PUT_SKEW',
    explanation:
      'In equity indices (SPX, QQQ, TSX) and major stocks, implied volatility does not form a flat horizontal line. Instead, it slopes steeply upward as strike prices drop below spot. A 10% OTM put typically trades at 28% IV while a 10% OTM call trades at only 17% IV.',
    institutionalDriver:
      'Originating from the 1987 Black Monday crash, pension funds and asset managers systematically buy deep OTM puts for portfolio catastrophic crash insurance. Meanwhile, fund managers write covered calls on the upside, depressing call IV while bidding up put IV.',
    assetClassPresence: 'Dominant in SPY, QQQ, AAPL, MSFT, and broad market equity indices.',
    howToExploit:
      'Sell overpriced OTM puts rather than naked calls. Use Bull Put Credit Spreads or Broken-Wing Butterflies to harvest the inflated put wing premium while defining risk.',
    samplePoints: [
      { moneyness: 85, iv: 34.5, strikeLabel: '-15% Deep Put' },
      { moneyness: 90, iv: 29.8, strikeLabel: '-10% OTM Put' },
      { moneyness: 95, iv: 24.2, strikeLabel: '-5% OTM Put' },
      { moneyness: 100, iv: 20.0, strikeLabel: '100% ATM Strike' },
      { moneyness: 105, iv: 17.4, strikeLabel: '+5% OTM Call' },
      { moneyness: 110, iv: 16.1, strikeLabel: '+10% OTM Call' },
      { moneyness: 115, iv: 15.5, strikeLabel: '+15% Deep Call' },
    ],
  },
  {
    id: 'commodity-call-skew',
    title: 'Reverse Call Skew (The Squeeze & Supply Curve)',
    subtitle: 'When Upside Calls Become Far More Expensive Than Puts',
    type: 'CALL_SKEW',
    explanation:
      'In commodities, meme stocks, and energy markets, the skew curve flips: upside call IV is significantly higher than downside put IV. Extreme call skew signifies market panic regarding an explosive supply disruption or short squeeze.',
    institutionalDriver:
      'In commodities like Crude Oil (/CL) or Natural Gas (/NG), airlines and utilities must hedge against infinite upside price shocks. In high short-interest stocks, retail call frenzies force market makers to aggressively bid up call IV.',
    assetClassPresence: 'Common in Crude Oil (/CL), Natural Gas (/NG), Gold (/GC), Uranium, and Short-Squeeze Equities.',
    howToExploit:
      'Avoid naked long calls when call skew is extreme (you overpay for vega). Instead, use Bull Call Debit Spreads or sell Call Credit Spreads to capture overpriced upside volatility.',
    samplePoints: [
      { moneyness: 85, iv: 32.0, strikeLabel: '-15% Deep Put' },
      { moneyness: 90, iv: 34.0, strikeLabel: '-10% OTM Put' },
      { moneyness: 95, iv: 37.5, strikeLabel: '-5% OTM Put' },
      { moneyness: 100, iv: 42.0, strikeLabel: '100% ATM Strike' },
      { moneyness: 105, iv: 49.5, strikeLabel: '+5% OTM Call' },
      { moneyness: 110, iv: 58.0, strikeLabel: '+10% OTM Call' },
      { moneyness: 115, iv: 69.5, strikeLabel: '+15% Deep Call' },
    ],
  },
  {
    id: 'volatility-smile',
    title: 'Symmetric Volatility Smile',
    subtitle: 'Heavy Tails in Currency, Crypto & Foreign Exchange Derivatives',
    type: 'VOL_SMILE',
    explanation:
      'A true Volatility Smile occurs when IV is lowest near ATM and rises equally on both deep puts and deep calls. This creates a U-shaped curve resembling a smile.',
    institutionalDriver:
      'Currencies and crypto assets exhibit heavy fat tails (kurtosis) in both directions. Unlike equities, a currency can spike or collapse with equal systemic probability depending on central bank FX interventions.',
    assetClassPresence: 'Foreign Exchange (EUR/USD, USD/CAD), Bitcoin/Ethereum options, and Cross-Currency Swaps.',
    howToExploit:
      'Structure Strangles or Iron Condors when wings are overly elevated; or trade 25Δ Risk Reversals when the smile tilts toward one currency.',
    samplePoints: [
      { moneyness: 85, iv: 28.5, strikeLabel: '-15% Deep Put' },
      { moneyness: 90, iv: 22.0, strikeLabel: '-10% OTM Put' },
      { moneyness: 95, iv: 16.5, strikeLabel: '-5% OTM Put' },
      { moneyness: 100, iv: 13.0, strikeLabel: '100% ATM Strike' },
      { moneyness: 105, iv: 16.2, strikeLabel: '+5% OTM Call' },
      { moneyness: 110, iv: 21.8, strikeLabel: '+10% OTM Call' },
      { moneyness: 115, iv: 28.0, strikeLabel: '+15% Deep Call' },
    ],
  },
];

/**
 * 3. EVENT RISK & IV CRUSH MECHANICS
 */
export const EVENT_RISK_SAMPLE_CASES: EventRiskMetric[] = [
  {
    ticker: 'NVDA',
    eventName: 'Q3 Corporate Earnings Catalyst',
    eventDate: 'Nov 20, 2026',
    preEventIv: 88.5,
    estimatedPostEventIv: 42.0,
    ivCrushDropPts: 46.5,
    pricedExpectedMovePct: 8.2,
    historicalAverageMovePct: 4.8,
    straddlePrice: 19.80,
    verdict: 'OVERPRICED_VOL',
    lessonNote:
      'Options price an 8.2% move ($19.80 straddle). Historical average post-earnings gap is only 4.8%. Naked option buyers suffer massive -46 point IV crush even if stock moves in their predicted direction.',
  },
  {
    ticker: 'TSLA',
    eventName: 'Annual Robotaxi & AI Investor Day',
    eventDate: 'Oct 28, 2026',
    preEventIv: 96.0,
    estimatedPostEventIv: 51.0,
    ivCrushDropPts: 45.0,
    pricedExpectedMovePct: 9.5,
    historicalAverageMovePct: 7.9,
    straddlePrice: 21.50,
    verdict: 'FAIR_VOL',
    lessonNote:
      'Binary product releases historically trigger large realized volatility for TSLA. Iron Condor wings must be placed outside the 1.2x expected move boundary to survive tail gaps.',
  },
  {
    ticker: 'SPY',
    eventName: 'FOMC Rate Decision & CPI Print',
    eventDate: 'Nov 06, 2026',
    preEventIv: 24.2,
    estimatedPostEventIv: 14.8,
    ivCrushDropPts: 9.4,
    pricedExpectedMovePct: 1.45,
    historicalAverageMovePct: 0.95,
    straddlePrice: 8.40,
    verdict: 'OVERPRICED_VOL',
    lessonNote:
      'Macro index options reliably experience rapid post-announcement vol collapse. Calendar spreads selling the event-week expiration and buying next month capture the front-month collapse.',
  },
];

/**
 * 4. TERM STRUCTURE OF GREEKS SENSITIVITY DATA
 */
export const GREEKS_TERM_STRUCTURE_SYLLABUS: GreekTermStructureData[] = [
  {
    greek: 'DELTA',
    symbol: 'Δ',
    definition: 'Rate of change of option price per $1 move in underlying asset. Also serves as rough probability of expiring ITM.',
    unit: '$ change / $ stock move',
    order: 'FIRST_ORDER',
    atmSensitivityByDte: [
      { dte: 1, label: '1 DTE (0-DTE)', atmValue: 0.50, curvature: 'Step function: snaps instantly to 1.0 or 0.0 at strike' },
      { dte: 7, label: '7 DTE (Weekly)', atmValue: 0.50, curvature: 'Sharp S-curve; small price move swings delta rapidly' },
      { dte: 30, label: '30 DTE (Monthly)', atmValue: 0.50, curvature: 'Standard S-curve with moderate moneyness decay' },
      { dte: 90, label: '90 DTE (Quarterly)', atmValue: 0.50, curvature: 'Gentle slope; delta changes slowly' },
      { dte: 365, label: '365 DTE (LEAPS)', atmValue: 0.50, curvature: 'Nearly linear; deep OTM still holds substantial delta' },
    ],
    keyTakeaway: 'Delta is not constant; it accelerates through Gamma. A 0.30Δ option becomes a 1.00Δ or 0.00Δ binary position as expiration nears.',
    commonTrap: 'Assuming a 30-delta option will stay at 30 delta during a rapid adverse gap. Delta will expand against you if short.',
  },
  {
    greek: 'GAMMA',
    symbol: 'Γ',
    definition: 'Rate of change of Delta per $1 move in underlying asset. Measures the curvature and acceleration of directional risk.',
    unit: 'Δ change / $ stock move',
    order: 'SECOND_ORDER',
    atmSensitivityByDte: [
      { dte: 1, label: '1 DTE (0-DTE)', atmValue: 0.28, curvature: 'Extreme explosion; massive pin risk for option sellers' },
      { dte: 7, label: '7 DTE (Weekly)', atmValue: 0.095, curvature: 'Elevated; rapid gamma flips on intraday price swings' },
      { dte: 30, label: '30 DTE (Monthly)', atmValue: 0.042, curvature: 'Balanced gamma; standard institutional sweet spot' },
      { dte: 90, label: '90 DTE (Quarterly)', atmValue: 0.022, curvature: 'Low gamma; stable delta behavior' },
      { dte: 365, label: '365 DTE (LEAPS)', atmValue: 0.009, curvature: 'Negligible gamma; delta is virtually static' },
    ],
    keyTakeaway: 'Gamma is highest ATM and inversely proportional to time: Γ ∝ 1 / (S · σ · √T). Front-month options have terrifying gamma risk.',
    commonTrap: 'Holding short options into the final 48 hours to collect the last pennies of theta, exposing your entire account to gamma explosion.',
  },
  {
    greek: 'THETA',
    symbol: 'Θ',
    definition: 'Rate of decay of option extrinsic value per calendar day passing, assuming all other factors remain constant.',
    unit: '$ lost / calendar day',
    order: 'FIRST_ORDER',
    atmSensitivityByDte: [
      { dte: 1, label: '1 DTE (0-DTE)', atmValue: -2.85, curvature: 'Extreme vertical decay; 100% extrinsic vanishes in hours' },
      { dte: 7, label: '7 DTE (Weekly)', atmValue: -0.92, curvature: 'Accelerated exponential decay curve' },
      { dte: 30, label: '30 DTE (Monthly)', atmValue: -0.45, curvature: 'Inflection point on the decay curve' },
      { dte: 90, label: '90 DTE (Quarterly)', atmValue: -0.22, curvature: 'Linear slow bleed' },
      { dte: 365, label: '365 DTE (LEAPS)', atmValue: -0.09, curvature: 'Almost flat; time decay is virtually imperceptible daily' },
    ],
    keyTakeaway: 'Theta decay is non-linear. It decays at 1 / √T. The steepest decay occurs inside 45 to 21 DTE, making 45 DTE the institutional standard for selling premium.',
    commonTrap: 'Thinking theta decay happens evenly throughout the day. In reality, overnight weekend decay and volatility markdowns alter live decay rates.',
  },
  {
    greek: 'VEGA',
    symbol: 'ν',
    definition: 'Sensitivity of option price to a 1 percentage point change in Implied Volatility (e.g. from 25% to 26%).',
    unit: '$ change / 1% IV shift',
    order: 'FIRST_ORDER',
    atmSensitivityByDte: [
      { dte: 1, label: '1 DTE (0-DTE)', atmValue: 0.03, curvature: 'Near zero; 0-DTE options are driven by delta, not vega' },
      { dte: 7, label: '7 DTE (Weekly)', atmValue: 0.12, curvature: 'Low; IV changes have limited dollar impact' },
      { dte: 30, label: '30 DTE (Monthly)', atmValue: 0.28, curvature: 'Moderate vega sensitivity' },
      { dte: 90, label: '90 DTE (Quarterly)', atmValue: 0.52, curvature: 'High; substantial swing on market vol shifts' },
      { dte: 365, label: '365 DTE (LEAPS)', atmValue: 1.15, curvature: 'Massive vega dominance; LEAPS are pure volatility bets' },
    ],
    keyTakeaway: 'Vega scales directly with the square root of time: ν ∝ S · √T. Long-dated options are heavily exposed to volatility changes; weeklies are dominated by delta and gamma.',
    commonTrap: 'Buying LEAPS calls and wondering why they lose money when stock rises slowly (caused by post-crisis IV crush wiping out the LEAPS vega).',
  },
];

/**
 * 5. HOW TO TELL IF OPTIONS ARE OVER- OR UNDERVALUED
 * Quantitative Diagnostic Engine
 */
export function diagnoseOptionValuation(
  ticker: string,
  spotPrice: number,
  currentIv30: number,
  historicalHv20: number,
  ivRank: number,
  ivPercentile: number
): ValuationDiagnosticResult {
  const ivHvRatio = Number((currentIv30 / Math.max(1, historicalHv20)).toFixed(2));
  const vrpSpread = Number((currentIv30 - historicalHv20).toFixed(1));
  const expectedMovePct = Number((currentIv30 * Math.sqrt(30 / 365)).toFixed(2));

  let verdict: 'OVERVALUED' | 'UNDERVALUED' | 'FAIRLY_VALUED' = 'FAIRLY_VALUED';
  let verdictBadgeColor = 'text-[#00e5ff] bg-[#00e5ff]/15 border-[#00e5ff]/40';
  let confidenceScore = 65;
  let recommendedStrategies: string[] = [];
  let strategiesToAvoid: string[] = [];
  let rationale = '';

  // Logic: Combining IV Rank, IV Percentile, and IV/HV Ratio
  if (ivRank >= 50 || ivHvRatio >= 1.25) {
    verdict = 'OVERVALUED';
    verdictBadgeColor = 'text-[#00e676] bg-[#00e676]/15 border-[#00e676]/40';
    confidenceScore = Math.min(95, 60 + Math.round(ivRank * 0.35));
    recommendedStrategies = [
      'Iron Condor (High POP Range)',
      'Bull Put Credit Spread',
      'Bear Call Credit Spread',
      'Covered Call (Overwriting)',
      'Broken Wing Butterfly (Credit)',
    ];
    strategiesToAvoid = [
      'Long Naked Calls / Puts (Extrinsic overpayment)',
      'Long Straddles / Strangles',
      'Debit Vertical Spreads',
    ];
    rationale = `Options on ${ticker} are statistically OVERVALUED. IV (${currentIv30.toFixed(1)}%) exceeds realized volatility HV (${historicalHv20.toFixed(1)}%) by +${vrpSpread} vol points (IV/HV Ratio: ${ivHvRatio}x). IV Rank is elevated at ${ivRank}%. The Volatility Risk Premium (VRP) heavily favors net premium sellers.`;
  } else if (ivRank <= 25 || ivHvRatio <= 0.85) {
    verdict = 'UNDERVALUED';
    verdictBadgeColor = 'text-[#ff9900] bg-[#ff9900]/15 border-[#ff9900]/40';
    confidenceScore = Math.min(95, 65 + Math.round((25 - ivRank) * 1.2));
    recommendedStrategies = [
      'Bull Call Debit Spread',
      'Bear Put Debit Spread',
      'Long Straddle / Strangle (Cheap Volatility)',
      'Calendar Spreads (Long Back-Month Vega)',
      'Diagonal Spreads (Poor Man\'s Covered Call)',
    ];
    strategiesToAvoid = [
      'Naked Put/Call Selling (Inadequate compensation for tail risk)',
      'Short Straddles',
      'Narrow Iron Condors',
    ];
    rationale = `Options on ${ticker} are statistically UNDERVALUED. IV (${currentIv30.toFixed(1)}%) is trading below realized movement HV (${historicalHv20.toFixed(1)}%) with an IV/HV ratio of only ${ivHvRatio}x. IV Rank is low at ${ivRank}%. Purchasing extrinsic value is unusually cheap, providing favorable asymmetric risk/reward for volatility buyers.`;
  } else {
    verdict = 'FAIRLY_VALUED';
    verdictBadgeColor = 'text-[#00e5ff] bg-[#00e5ff]/15 border-[#00e5ff]/40';
    confidenceScore = 70;
    recommendedStrategies = [
      'Directional Vertical Spreads (Defined Risk)',
      'Ratio Spreads',
      'Risk Reversal (Collar)',
      'Single Leg Options with Tight Stops',
    ];
    strategiesToAvoid = [
      'Extreme high-risk naked strategies',
      'Wide unhedged short straddles',
    ];
    rationale = `Options on ${ticker} are currently FAIRLY PRICED. The IV/HV ratio stands at ${ivHvRatio}x with an IV Rank of ${ivRank}%. Volatility neither heavily favors buyers nor sellers. Trades should be selected based on directional technical conviction rather than pure volatility mispricing.`;
  }

  return {
    ticker,
    spotPrice,
    currentIv30,
    historicalHv20,
    ivRank,
    ivPercentile,
    ivHvRatio,
    expectedMovePct,
    vrpSpread,
    verdict,
    verdictBadgeColor,
    confidenceScore,
    recommendedStrategies,
    strategiesToAvoid,
    rationale,
  };
}
