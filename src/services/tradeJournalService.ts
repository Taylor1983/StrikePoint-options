/**
 * STRATEGY TRADE JOURNAL SERVICE
 * Automated institutional execution ledger, entry IV tracker, Greeks recorder,
 * and subsequent multi-leg P&L excursion performance analytics engine.
 */

import { Order, Position, TradeLeg, Ticker } from '../types/options';
import { calculateBSM } from '../utils/blackScholes';

export type JournalStrategyCategory =
  | 'DEFINED_RISK'
  | 'INCOME_CREDIT'
  | 'VOLATILITY_LONG'
  | 'VOLATILITY_SHORT'
  | 'DIRECTIONAL'
  | 'EQUITY_FUTURES';

export type TradeSetupTag =
  | 'EARNINGS_PLAY'
  | 'IV_CRUSH'
  | 'SKEW_ARBITRAGE'
  | 'MEAN_REVERSION'
  | 'MOMENTUM_BREAKOUT'
  | 'INCOME_THETA'
  | 'TAIL_RISK_HEDGE'
  | 'VOL_EXPANSION'
  | 'FUTURES_ROLL'
  | 'TECHNICAL_LEVEL'
  | 'DEFINED_RISK';

export type TradeExitReason =
  | 'PROFIT_TARGET_HIT'
  | 'STOP_LOSS_HIT'
  | 'TIME_STOP_EXPIRATION'
  | 'MANUAL_DE_RISKING'
  | 'VOLATILITY_CRUSHED'
  | 'EARLY_EXERCISE_RISK'
  | 'ROLLED_FORWARD'
  | 'OPEN';

export interface JournalExecutionStats {
  orderId: string;
  orderType: 'market' | 'limit';
  venue: string; // e.g. "CBOE COB", "BOX Complex", "EDGO Routing"
  contracts: number;
  netDebitCredit: number; // positive = debit, negative = credit
  fillPricePerUnit: number; // net price per set
  totalCost: number; // total cash movement
  priceImprovement: number; // $ price improvement from NBBO mid
  slippage: number;
  commissions: number;
}

export interface JournalGreeksSnapshot {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface JournalEntry {
  id: string;
  positionId?: string;
  ticker: string;
  strategyName: string;
  category: JournalStrategyCategory;
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  openedAt: string; // Formatted datetime "2026-10-15 09:32:15"
  closedAt?: string;

  // Execution Details
  execution: JournalExecutionStats;

  // Volatility & Market stats at entry
  entrySpotPrice: number;
  entryIV: number; // In percentage points (e.g. 42.5%)
  entryIVRank: number; // 0 - 100%
  entryGreeks: JournalGreeksSnapshot;
  pop: number; // Probability of Profit % (e.g. 68.5%)
  maxProfit: number;
  maxLoss: number;
  returnOnRiskPct: number;

  // Individual Legs
  legs: TradeLeg[];

  // Subsequent Mark & P&L Performance
  currentSpotPrice: number;
  currentIV: number; // Current IV %
  currentMark: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  peakPnL: number; // MFE: Maximum Favorable Excursion ($)
  troughPnL: number; // MAE: Maximum Adverse Excursion ($)

  // Exit details (when closed)
  exitSpotPrice?: number;
  exitIV?: number;
  exitPricePerUnit?: number;
  exitReason?: TradeExitReason;

  // Qualitative Journaling & Reviews
  notes: string;
  tags: TradeSetupTag[];
  grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  disciplineRating: number; // 1 to 5 stars
  mistakesOrLessons?: string;
}

export interface JournalStatsSummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number; // %
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  netPnL: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  avgReturnOnRisk: number; // %
  avgEntryIV: number; // %
  avgIvDelta: number; // IV Change from entry to current/exit in pts
  bestTradePnL: number;
  worstTradePnL: number;
}

export const JOURNAL_STORAGE_KEY = 'strikepoint_strategy_trade_journal_v2';

/**
 * Categorize strategy by name
 */
export function categorizeStrategy(strategyName: string): JournalStrategyCategory {
  const s = strategyName.toLowerCase();
  if (s.includes('condor') || s.includes('butterfly') || s.includes('spread') || s.includes('collar')) {
    return 'DEFINED_RISK';
  }
  if (s.includes('credit') || s.includes('covered') || s.includes('theta') || s.includes('naked') || s.includes('lizard')) {
    return 'INCOME_CREDIT';
  }
  if (s.includes('long straddle') || s.includes('long strangle') || s.includes('long call') || s.includes('long put') || s.includes('calendar')) {
    return 'VOLATILITY_LONG';
  }
  if (s.includes('short straddle') || s.includes('short strangle') || s.includes('iron') || s.includes('ratio')) {
    return 'VOLATILITY_SHORT';
  }
  if (s.includes('stock') || s.includes('future') || s.includes('/')) {
    return 'EQUITY_FUTURES';
  }
  return 'DIRECTIONAL';
}

/**
 * Computes average entry IV across strategy legs
 */
export function calculateStrategyWeightedIV(legs: TradeLeg[], tickerDefaultIV: number = 0.30): number {
  if (!legs || legs.length === 0) return Number((tickerDefaultIV * 100).toFixed(1));
  const optionLegs = legs.filter((l) => l.type === 'call' || l.type === 'put');
  if (optionLegs.length === 0) return Number((tickerDefaultIV * 100).toFixed(1));

  let totalWeight = 0;
  let weightedIvSum = 0;
  for (const leg of optionLegs) {
    const w = Math.max(1, leg.contracts || 1);
    const legIv = leg.iv > 1 ? leg.iv : leg.iv * 100; // normalize to 0-100%
    weightedIvSum += legIv * w;
    totalWeight += w;
  }
  return Number((weightedIvSum / (totalWeight || 1)).toFixed(1));
}

/**
 * Computes aggregate Greek snapshot for multi-leg strategy
 */
export function calculateStrategyAggregateGreeks(
  legs: TradeLeg[],
  spotPrice: number,
  multiplier: number = 100
): JournalGreeksSnapshot {
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  let rho = 0;

  for (const leg of legs) {
    const isBuy = leg.action === 'buy';
    const sign = isBuy ? 1 : -1;
    const legMultiplier = (leg.multiplier || multiplier) * (leg.contracts || 1);

    if (leg.type === 'stock' || leg.type === 'future') {
      delta += sign * (leg.contracts || 1) * (leg.type === 'stock' ? 1 : 50);
      continue;
    }

    const t = Math.max(0.001, (leg.dte || 1) / 365);
    const iv = leg.iv > 1 ? leg.iv / 100 : leg.iv || 0.3;
    const bsm = calculateBSM(spotPrice, leg.strike, t, iv, leg.type === 'put' ? 'put' : 'call');

    delta += sign * bsm.greeks.delta * legMultiplier;
    gamma += sign * bsm.greeks.gamma * legMultiplier;
    theta += sign * bsm.greeks.theta * legMultiplier;
    vega += sign * bsm.greeks.vega * legMultiplier;
    rho += sign * bsm.greeks.rho * legMultiplier;
  }

  return {
    delta: Number(delta.toFixed(2)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(2)),
    vega: Number(vega.toFixed(2)),
    rho: Number(rho.toFixed(2)),
  };
}

/**
 * Estimate Probability of Profit (POP) and Max Profit/Loss for trade journaling
 */
export function estimateStrategyRiskMetrics(
  strategyName: string,
  legs: TradeLeg[],
  netCashImpact: number, // positive = debit, negative = credit
  spotPrice: number
): { pop: number; maxProfit: number; maxLoss: number; returnOnRiskPct: number } {
  const isCredit = netCashImpact < 0;
  const absCash = Math.abs(netCashImpact);
  const s = strategyName.toLowerCase();

  let pop = 50;
  let maxProfit = absCash;
  let maxLoss = absCash;

  if (s.includes('iron condor')) {
    // Credit strategy: High POP, bounded loss
    const strikes = legs.map((l) => l.strike).sort((a, b) => a - b);
    const width = strikes.length >= 4 ? Math.max(strikes[1] - strikes[0], strikes[3] - strikes[2]) : 5;
    maxProfit = absCash;
    maxLoss = Math.max(100, width * 100 * (legs[0]?.contracts || 1) - absCash);
    pop = Number(Math.min(88, Math.max(60, 100 - (absCash / (maxLoss + absCash)) * 80)).toFixed(1));
  } else if (s.includes('bull call spread') || s.includes('bear put spread') || (s.includes('spread') && !isCredit)) {
    // Debit spread: Moderate POP, high RoR
    const strikes = legs.map((l) => l.strike);
    const width = strikes.length >= 2 ? Math.abs(strikes[1] - strikes[0]) : 5;
    maxLoss = absCash;
    maxProfit = Math.max(50, width * 100 * (legs[0]?.contracts || 1) - absCash);
    pop = Number(Math.min(65, Math.max(40, (1 - absCash / (maxProfit + maxLoss)) * 100)).toFixed(1));
  } else if (s.includes('credit spread') || (s.includes('spread') && isCredit)) {
    const strikes = legs.map((l) => l.strike);
    const width = strikes.length >= 2 ? Math.abs(strikes[1] - strikes[0]) : 5;
    maxProfit = absCash;
    maxLoss = Math.max(100, width * 100 * (legs[0]?.contracts || 1) - absCash);
    pop = Number(Math.min(85, Math.max(62, (1 - absCash / (maxLoss + absCash)) * 100)).toFixed(1));
  } else if (s.includes('straddle') || s.includes('strangle')) {
    if (isCredit) {
      maxProfit = absCash;
      maxLoss = absCash * 2.5; // Theoretical undefined, practical risk bound
      pop = 68.0;
    } else {
      maxLoss = absCash;
      maxProfit = absCash * 3.0; // Unlimited upside
      pop = 38.5;
    }
  } else if (s.includes('butterfly')) {
    maxLoss = absCash;
    maxProfit = absCash * 3.8;
    pop = 42.0;
  } else if (s.includes('risk reversal')) {
    maxProfit = absCash * 2.0;
    maxLoss = absCash * 2.0;
    pop = 54.0;
  } else {
    maxProfit = absCash * 1.5;
    maxLoss = absCash;
    pop = 52.0;
  }

  const returnOnRiskPct = maxLoss > 0 ? Number(((maxProfit / maxLoss) * 100).toFixed(1)) : 100;

  return {
    pop,
    maxProfit: Number(maxProfit.toFixed(2)),
    maxLoss: Number(maxLoss.toFixed(2)),
    returnOnRiskPct,
  };
}

/**
 * Initial Realistic Institutional Seed Entries
 * Pre-populates the Strategy Trade Journal so the user can immediately explore
 * closed wins/losses, open multi-leg positions, execution statistics, and IV analytics!
 */
export const INITIAL_JOURNAL_SEED_ENTRIES: JournalEntry[] = [
  // 1. OPEN: NVDA 4-Leg Iron Condor (Earnings IV Crush & Skew Arbitrage)
  {
    id: 'jrn-nvda-ic-101',
    positionId: 'pos-nvda-ic-101',
    ticker: 'NVDA',
    strategyName: 'Iron Condor (4-Leg Delta 18/16)',
    category: 'DEFINED_RISK',
    status: 'OPEN',
    openedAt: '2026-10-14 09:34:22',
    execution: {
      orderId: 'ORD-NVDA-COB-9981',
      orderType: 'limit',
      venue: 'CBOE COB (Complex Book)',
      contracts: 5,
      netDebitCredit: -1850.0, // $3.70 credit per set
      fillPricePerUnit: -3.70,
      totalCost: 1850.0,
      priceImprovement: 125.0, // $125 saved vs natural market
      slippage: 0.02,
      commissions: 13.0,
    },
    entrySpotPrice: 121.50,
    entryIV: 52.4,
    entryIVRank: 78,
    entryGreeks: {
      delta: -4.2,
      gamma: -0.012,
      theta: 64.5,
      vega: -48.2,
      rho: -1.2,
    },
    pop: 74.2,
    maxProfit: 1850.0,
    maxLoss: 3150.0,
    returnOnRiskPct: 58.7,
    legs: [
      { id: 'l1', type: 'put', action: 'buy', strike: 105, expiration: '2026-11-21', dte: 37, iv: 0.58, premium: 1.25, contracts: 5, multiplier: 100, underlyingSymbol: 'NVDA' },
      { id: 'l2', type: 'put', action: 'sell', strike: 110, expiration: '2026-11-21', dte: 37, iv: 0.54, premium: 2.85, contracts: 5, multiplier: 100, underlyingSymbol: 'NVDA' },
      { id: 'l3', type: 'call', action: 'sell', strike: 135, expiration: '2026-11-21', dte: 37, iv: 0.51, premium: 3.10, contracts: 5, multiplier: 100, underlyingSymbol: 'NVDA' },
      { id: 'l4', type: 'call', action: 'buy', strike: 140, expiration: '2026-11-21', dte: 37, iv: 0.47, premium: 1.00, contracts: 5, multiplier: 100, underlyingSymbol: 'NVDA' },
    ],
    currentSpotPrice: 124.50,
    currentIV: 47.8, // Volatility compressed by 4.6 pts
    currentMark: -1280.0, // Buy back cost is $1,280
    unrealizedPnL: 570.0, // $1,850 - $1,280 = +$570 profit
    unrealizedPnLPercent: 30.8,
    peakPnL: 620.0,
    troughPnL: -140.0,
    notes: 'Staged ahead of earnings catalyst. Strong IV skew between 110 Put and 135 Call allows high credit with 74% POP.',
    tags: ['EARNINGS_PLAY', 'IV_CRUSH', 'INCOME_THETA'],
    grade: 'A',
    disciplineRating: 5,
    mistakesOrLessons: 'Filled +$0.25 inside the natural bid/ask via CBOE COB price improvement auction.',
  },

  // 2. CLOSED (WINNER): SPY Bull Put Credit Spread (FOMC Reaction)
  {
    id: 'jrn-spy-pcs-102',
    ticker: 'SPY',
    strategyName: 'Bull Put Credit Spread',
    category: 'INCOME_CREDIT',
    status: 'CLOSED',
    openedAt: '2026-10-06 10:15:00',
    closedAt: '2026-10-12 15:45:10',
    execution: {
      orderId: 'ORD-SPY-SOR-7712',
      orderType: 'limit',
      venue: 'BOX PRISM Auction',
      contracts: 10,
      netDebitCredit: -1450.0, // $1.45 credit per set
      fillPricePerUnit: -1.45,
      totalCost: 1450.0,
      priceImprovement: 90.0,
      slippage: 0.01,
      commissions: 22.0,
    },
    entrySpotPrice: 574.20,
    entryIV: 18.2,
    entryIVRank: 42,
    entryGreeks: {
      delta: 18.5,
      gamma: 0.008,
      theta: 42.0,
      vega: -19.4,
      rho: 3.1,
    },
    pop: 79.5,
    maxProfit: 1450.0,
    maxLoss: 3550.0,
    returnOnRiskPct: 40.8,
    legs: [
      { id: 'l1', type: 'put', action: 'buy', strike: 560, expiration: '2026-10-17', dte: 11, iv: 0.20, premium: 0.85, contracts: 10, multiplier: 100, underlyingSymbol: 'SPY' },
      { id: 'l2', type: 'put', action: 'sell', strike: 565, expiration: '2026-10-17', dte: 11, iv: 0.18, premium: 2.30, contracts: 10, multiplier: 100, underlyingSymbol: 'SPY' },
    ],
    currentSpotPrice: 586.40,
    currentIV: 14.1,
    currentMark: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    realizedPnL: 1220.0, // Bought back for $0.23 ($230 total) -> +$1,220 realized
    realizedPnLPercent: 84.1,
    peakPnL: 1220.0,
    troughPnL: -80.0,
    exitSpotPrice: 584.90,
    exitIV: 14.8,
    exitPricePerUnit: -0.23,
    exitReason: 'PROFIT_TARGET_HIT',
    notes: 'Closed at 84% of max profit target following post-CPI rally. Theta decay accelerated perfectly.',
    tags: ['INCOME_THETA', 'MEAN_REVERSION'],
    grade: 'A+',
    disciplineRating: 5,
    mistakesOrLessons: 'Adhered strictly to the 80% max profit early take rule rather than squeezing last pennies.',
  },

  // 3. OPEN: TSLA Long Straddle (Robotaxi Volatility Expansion)
  {
    id: 'jrn-tsla-strad-103',
    positionId: 'pos-tsla-strad-103',
    ticker: 'TSLA',
    strategyName: 'Long ATM Straddle (220 Strike)',
    category: 'VOLATILITY_LONG',
    status: 'OPEN',
    openedAt: '2026-10-13 11:20:44',
    execution: {
      orderId: 'ORD-TSLA-ISE-8821',
      orderType: 'market',
      venue: 'ISE Complex Order Book',
      contracts: 4,
      netDebitCredit: 6480.0, // $16.20 debit per straddle
      fillPricePerUnit: 16.20,
      totalCost: 6480.0,
      priceImprovement: 40.0,
      slippage: 0.05,
      commissions: 16.0,
    },
    entrySpotPrice: 219.80,
    entryIV: 58.6,
    entryIVRank: 84,
    entryGreeks: {
      delta: 2.1,
      gamma: 0.038,
      theta: -82.4,
      vega: 98.6,
      rho: 0.4,
    },
    pop: 44.0,
    maxProfit: 18000.0,
    maxLoss: 6480.0,
    returnOnRiskPct: 277.8,
    legs: [
      { id: 'l1', type: 'call', action: 'buy', strike: 220, expiration: '2026-11-07', dte: 23, iv: 0.58, premium: 9.10, contracts: 4, multiplier: 100, underlyingSymbol: 'TSLA' },
      { id: 'l2', type: 'put', action: 'buy', strike: 220, expiration: '2026-11-07', dte: 23, iv: 0.59, premium: 7.10, contracts: 4, multiplier: 100, underlyingSymbol: 'TSLA' },
    ],
    currentSpotPrice: 228.40,
    currentIV: 62.1, // Vol expanded by +3.5 pts
    currentMark: 7540.0,
    unrealizedPnL: 1060.0,
    unrealizedPnLPercent: 16.35,
    peakPnL: 1180.0,
    troughPnL: -320.0,
    notes: 'Positioning for large directional breakout following catalyst announcement. Vega positive strategy benefited from vol expansion.',
    tags: ['VOL_EXPANSION', 'MOMENTUM_BREAKOUT'],
    grade: 'B',
    disciplineRating: 4,
    mistakesOrLessons: 'Consider rolling profitable call leg higher if stock crosses $235 to lock in intrinsic gain.',
  },

  // 4. CLOSED (LOSS): AAPL Bear Call Spread (Attempted Top-Fishing)
  {
    id: 'jrn-aapl-bcs-104',
    ticker: 'AAPL',
    strategyName: 'Bear Call Credit Spread (230/235)',
    category: 'INCOME_CREDIT',
    status: 'CLOSED',
    openedAt: '2026-10-02 13:05:12',
    closedAt: '2026-10-08 14:12:00',
    execution: {
      orderId: 'ORD-AAPL-PHLX-5529',
      orderType: 'limit',
      venue: 'PHLX Complex',
      contracts: 6,
      netDebitCredit: -780.0, // $1.30 credit
      fillPricePerUnit: -1.30,
      totalCost: 780.0,
      priceImprovement: 30.0,
      slippage: 0.01,
      commissions: 15.0,
    },
    entrySpotPrice: 226.10,
    entryIV: 24.5,
    entryIVRank: 35,
    entryGreeks: {
      delta: -14.2,
      gamma: -0.009,
      theta: 28.0,
      vega: -16.5,
      rho: -2.4,
    },
    pop: 66.8,
    maxProfit: 780.0,
    maxLoss: 2220.0,
    returnOnRiskPct: 35.1,
    legs: [
      { id: 'l1', type: 'call', action: 'sell', strike: 230, expiration: '2026-10-24', dte: 22, iv: 0.24, premium: 2.10, contracts: 6, multiplier: 100, underlyingSymbol: 'AAPL' },
      { id: 'l2', type: 'call', action: 'buy', strike: 235, expiration: '2026-10-24', dte: 22, iv: 0.25, premium: 0.80, contracts: 6, multiplier: 100, underlyingSymbol: 'AAPL' },
    ],
    currentSpotPrice: 233.80,
    currentIV: 22.1,
    currentMark: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    realizedPnL: -840.0, // Bought back for $2.70 ($1,620 total) -> -$840 loss
    realizedPnLPercent: -107.7,
    peakPnL: 120.0,
    troughPnL: -840.0,
    exitSpotPrice: 232.90,
    exitIV: 22.8,
    exitPricePerUnit: -2.70,
    exitReason: 'STOP_LOSS_HIT',
    notes: 'Triggered stop loss when underlying breached the short strike of $230. Cut loss early before reaching max loss of $2,220.',
    tags: ['TECHNICAL_LEVEL'],
    grade: 'B',
    disciplineRating: 5,
    mistakesOrLessons: 'Selling low IV call spreads into a strong tech momentum trend has low edge. Good stop-loss execution saved $1,380.',
  },

  // 5. OPEN: QQQ Broken-Wing Butterfly (Skew Arbitrage)
  {
    id: 'jrn-qqq-bwb-105',
    positionId: 'pos-qqq-bwb-105',
    ticker: 'QQQ',
    strategyName: 'Broken Wing Butterfly (480/490/505 Call)',
    category: 'DEFINED_RISK',
    status: 'OPEN',
    openedAt: '2026-10-15 09:40:11',
    execution: {
      orderId: 'ORD-QQQ-COB-3490',
      orderType: 'limit',
      venue: 'CBOE COB (Complex Book)',
      contracts: 3,
      netDebitCredit: -45.0, // Entered for a net credit of $0.15
      fillPricePerUnit: -0.15,
      totalCost: 45.0,
      priceImprovement: 75.0,
      slippage: 0.01,
      commissions: 18.0,
    },
    entrySpotPrice: 486.20,
    entryIV: 22.8,
    entryIVRank: 55,
    entryGreeks: {
      delta: 6.8,
      gamma: 0.014,
      theta: 31.5,
      vega: -12.4,
      rho: 1.1,
    },
    pop: 71.0,
    maxProfit: 3045.0, // Pin at 490 strike yields $1,000 width + $45 credit
    maxLoss: 1455.0, // If stock rallies beyond 505
    returnOnRiskPct: 209.3,
    legs: [
      { id: 'l1', type: 'call', action: 'buy', strike: 480, expiration: '2026-11-14', dte: 30, iv: 0.24, premium: 12.40, contracts: 3, multiplier: 100, underlyingSymbol: 'QQQ' },
      { id: 'l2', type: 'call', action: 'sell', strike: 490, expiration: '2026-11-14', dte: 30, iv: 0.22, premium: 6.90, contracts: 6, multiplier: 100, underlyingSymbol: 'QQQ' },
      { id: 'l3', type: 'call', action: 'buy', strike: 505, expiration: '2026-11-14', dte: 30, iv: 0.20, premium: 1.25, contracts: 3, multiplier: 100, underlyingSymbol: 'QQQ' },
    ],
    currentSpotPrice: 488.50,
    currentIV: 21.9,
    currentMark: 420.0,
    unrealizedPnL: 465.0,
    unrealizedPnLPercent: 1033.3, // High RoR due to credit entry
    peakPnL: 510.0,
    troughPnL: -20.0,
    notes: 'Exploited elevated call skew above 490. Zero downside risk because structure was initiated for a net credit.',
    tags: ['SKEW_ARBITRAGE', 'DEFINED_RISK'],
    grade: 'A+',
    disciplineRating: 5,
    mistakesOrLessons: 'Ideal execution of asymmetry: zero downside risk with large pin profit potential.',
  },
];

/**
 * Loads journal entries from localStorage, fallback to seed
 */
export function loadJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) {
      saveJournalEntries(INITIAL_JOURNAL_SEED_ENTRIES);
      return INITIAL_JOURNAL_SEED_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveJournalEntries(INITIAL_JOURNAL_SEED_ENTRIES);
    return INITIAL_JOURNAL_SEED_ENTRIES;
  } catch (err) {
    console.error('Failed to load trade journal:', err);
    return INITIAL_JOURNAL_SEED_ENTRIES;
  }
}

/**
 * Saves journal entries to localStorage
 */
export function saveJournalEntries(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save trade journal:', err);
  }
}

/**
 * Automatically creates and logs a new JournalEntry when a strategy order is filled
 */
export function logTradeToJournal(
  order: Order,
  position: Position,
  ticker?: Ticker
): JournalEntry {
  const currentEntries = loadJournalEntries();
  const spotPrice = ticker?.price || position.legs[0]?.strike || 100;
  const defaultIv = ticker?.currentIV || (ticker?.ivRank ? ticker.ivRank / 100 : 0.30);
  const weightedIv = calculateStrategyWeightedIV(position.legs, defaultIv);
  const aggregateGreeks = calculateStrategyAggregateGreeks(position.legs, spotPrice);
  const riskMetrics = estimateStrategyRiskMetrics(
    position.strategyName,
    position.legs,
    order.netDebitCredit,
    spotPrice
  );

  const fillPricePerUnit =
    order.contracts > 0
      ? Number((order.netDebitCredit / (order.contracts * 100)).toFixed(2))
      : order.netDebitCredit;

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;

  const newEntry: JournalEntry = {
    id: `jrn-${position.id || order.id || Date.now()}`,
    positionId: position.id,
    ticker: position.ticker || order.ticker,
    strategyName: position.strategyName || order.strategyName,
    category: categorizeStrategy(position.strategyName),
    status: 'OPEN',
    openedAt: formattedDate,
    execution: {
      orderId: order.id,
      orderType: order.type || 'limit',
      venue: order.contracts > 1 ? 'CBOE COB / Complex Router' : 'NBBO Smart Router',
      contracts: order.contracts,
      netDebitCredit: order.netDebitCredit,
      fillPricePerUnit,
      totalCost: Math.abs(order.totalCost),
      priceImprovement: Number((Math.random() * 45 + 15).toFixed(2)),
      slippage: 0.01,
      commissions: Number((order.legs.length * order.contracts * 0.65).toFixed(2)),
    },
    entrySpotPrice: spotPrice,
    entryIV: weightedIv,
    entryIVRank: ticker?.ivRank ?? 50,
    entryGreeks: aggregateGreeks,
    pop: riskMetrics.pop,
    maxProfit: riskMetrics.maxProfit,
    maxLoss: riskMetrics.maxLoss,
    returnOnRiskPct: riskMetrics.returnOnRiskPct,
    legs: position.legs,
    currentSpotPrice: spotPrice,
    currentIV: weightedIv,
    currentMark: position.currentMark,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    peakPnL: 0,
    troughPnL: 0,
    notes: `Automated terminal execution: ${position.contracts}x ${position.strategyName} on ${position.ticker}. Entry IV: ${weightedIv}%.`,
    tags: [
      weightedIv > 40 ? 'IV_CRUSH' : 'INCOME_THETA',
      position.legs.length > 2 ? 'SKEW_ARBITRAGE' : 'DEFINED_RISK',
    ],
    grade: 'A',
    disciplineRating: 5,
  };

  const updated = [newEntry, ...currentEntries];
  saveJournalEntries(updated);
  return newEntry;
}

/**
 * Updates Mark-To-Market (MTM) P&L, Peak (MFE), and Trough (MAE) for open entries
 */
export function syncJournalWithLivePositions(
  positions: Position[],
  tickers: Record<string, Ticker>
): JournalEntry[] {
  const currentEntries = loadJournalEntries();
  let hasChanges = false;

  const posMap = new Map<string, Position>();
  for (const p of positions) {
    posMap.set(p.id, p);
  }

  const updated = currentEntries.map((entry) => {
    if (entry.status !== 'OPEN') return entry;

    const matchedPos = entry.positionId ? posMap.get(entry.positionId) : null;
    const ticker = tickers[entry.ticker];
    const spot = ticker?.price || entry.currentSpotPrice;
    const currentIv = ticker?.currentIV ? Number((ticker.currentIV * 100).toFixed(1)) : entry.currentIV;

    let mark = entry.currentMark;
    let unPnL = entry.unrealizedPnL;
    let unPct = entry.unrealizedPnLPercent;

    if (matchedPos) {
      mark = matchedPos.currentMark;
      unPnL = matchedPos.unrealizedPnL;
      unPct = matchedPos.unrealizedPnLPercent;
    } else {
      // Calculate delta if ticker moved
      const spotDiff = spot - entry.entrySpotPrice;
      const syntheticPnL = entry.entryGreeks.delta * spotDiff + entry.entryGreeks.theta * 0.5;
      unPnL = Number((syntheticPnL * entry.execution.contracts).toFixed(2));
      unPct = entry.execution.totalCost !== 0 ? Number(((unPnL / entry.execution.totalCost) * 100).toFixed(1)) : 0;
      mark = entry.execution.netDebitCredit + unPnL;
    }

    const peak = Math.max(entry.peakPnL || 0, unPnL);
    const trough = Math.min(entry.troughPnL || 0, unPnL);

    if (
      mark !== entry.currentMark ||
      unPnL !== entry.unrealizedPnL ||
      peak !== entry.peakPnL ||
      trough !== entry.troughPnL ||
      spot !== entry.currentSpotPrice
    ) {
      hasChanges = true;
      return {
        ...entry,
        currentSpotPrice: spot,
        currentIV: currentIv,
        currentMark: mark,
        unrealizedPnL: unPnL,
        unrealizedPnLPercent: unPct,
        peakPnL: peak,
        troughPnL: trough,
      };
    }
    return entry;
  });

  if (hasChanges) {
    saveJournalEntries(updated);
  }
  return updated;
}

/**
 * Closes a trade in the journal, logging exit stats and realized P&L
 */
export function closeJournalTrade(
  positionId: string,
  exitReason: TradeExitReason = 'MANUAL_DE_RISKING',
  userNotes?: string
): JournalEntry[] {
  const currentEntries = loadJournalEntries();
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;

  const updated = currentEntries.map((entry) => {
    if (entry.positionId === positionId && entry.status === 'OPEN') {
      const finalRealized = entry.unrealizedPnL;
      const finalRealizedPct = entry.unrealizedPnLPercent;
      return {
        ...entry,
        status: 'CLOSED' as const,
        closedAt: formattedDate,
        realizedPnL: finalRealized,
        realizedPnLPercent: finalRealizedPct,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        exitSpotPrice: entry.currentSpotPrice,
        exitIV: entry.currentIV,
        exitReason,
        notes: userNotes ? `${entry.notes}\n[EXIT]: ${userNotes}` : entry.notes,
      };
    }
    return entry;
  });

  saveJournalEntries(updated);
  return updated;
}

/**
 * Calculates high-level performance metrics for Strategy Trade Journal
 */
export function calculateJournalKPIs(entries: JournalEntry[]): JournalStatsSummary {
  const totalTrades = entries.length;
  const openTrades = entries.filter((e) => e.status === 'OPEN').length;
  const closedTrades = entries.filter((e) => e.status === 'CLOSED').length;

  let winCount = 0;
  let lossCount = 0;
  let totalGrossWin = 0;
  let totalGrossLoss = 0;
  let totalRealizedPnL = 0;
  let totalUnrealizedPnL = 0;
  let returnOnRiskSum = 0;
  let entryIvSum = 0;
  let ivDeltaSum = 0;
  let bestTradePnL = -Infinity;
  let worstTradePnL = Infinity;

  for (const e of entries) {
    const pnl = e.status === 'CLOSED' ? (e.realizedPnL ?? 0) : e.unrealizedPnL;

    if (e.status === 'CLOSED') {
      totalRealizedPnL += e.realizedPnL ?? 0;
    } else {
      totalUnrealizedPnL += e.unrealizedPnL;
    }

    if (pnl > 0) {
      winCount++;
      totalGrossWin += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalGrossLoss += Math.abs(pnl);
    }

    returnOnRiskSum += e.returnOnRiskPct || 0;
    entryIvSum += e.entryIV || 0;
    const finalIv = e.status === 'CLOSED' ? (e.exitIV ?? e.entryIV) : e.currentIV;
    ivDeltaSum += finalIv - e.entryIV;

    if (pnl > bestTradePnL) bestTradePnL = pnl;
    if (pnl < worstTradePnL) worstTradePnL = pnl;
  }

  const netPnL = Number((totalRealizedPnL + totalUnrealizedPnL).toFixed(2));
  const closedOrDecided = winCount + lossCount;
  const winRate = closedOrDecided > 0 ? Number(((winCount / closedOrDecided) * 100).toFixed(1)) : 0;
  const profitFactor =
    totalGrossLoss > 0
      ? Number((totalGrossWin / totalGrossLoss).toFixed(2))
      : totalGrossWin > 0
      ? 99.9
      : 0;
  const avgWin = winCount > 0 ? Number((totalGrossWin / winCount).toFixed(2)) : 0;
  const avgLoss = lossCount > 0 ? Number((totalGrossLoss / lossCount).toFixed(2)) : 0;
  const winLossRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : avgWin > 0 ? 99.9 : 0;

  return {
    totalTrades,
    openTrades,
    closedTrades,
    winCount,
    lossCount,
    winRate,
    totalRealizedPnL: Number(totalRealizedPnL.toFixed(2)),
    totalUnrealizedPnL: Number(totalUnrealizedPnL.toFixed(2)),
    netPnL,
    profitFactor,
    avgWin,
    avgLoss,
    winLossRatio,
    avgReturnOnRisk: totalTrades > 0 ? Number((returnOnRiskSum / totalTrades).toFixed(1)) : 0,
    avgEntryIV: totalTrades > 0 ? Number((entryIvSum / totalTrades).toFixed(1)) : 0,
    avgIvDelta: totalTrades > 0 ? Number((ivDeltaSum / totalTrades).toFixed(1)) : 0,
    bestTradePnL: bestTradePnL === -Infinity ? 0 : Number(bestTradePnL.toFixed(2)),
    worstTradePnL: worstTradePnL === Infinity ? 0 : Number(worstTradePnL.toFixed(2)),
  };
}
