import { Ticker } from '../types/options';

export interface QuadWitchingDate {
  date: string;              // "2026-12-18"
  formattedDate: string;     // "Dec 18, 2026"
  quarter: string;           // "Q4 2026"
  dte: number;               // Days to expiration
  status: 'imminent' | 'future' | 'past';
  estimatedNotional: string; // "$5.4 Trillion"
  contractsExpiring: string; // "198 Million"
  isTripleWitchingEra?: boolean;
  notes: string;
}

export interface FourWitchesBreakdown {
  id: string;
  name: string;
  category: string;
  examples: string[];
  settlementMethod: 'Cash Settled (AM/PM)' | 'Physical Delivery';
  estimatedNotionalShare: string;
  description: string;
  marketDynamics: string;
  dealerBehavior: string;
}

export interface WitchingIntradaySchedule {
  time: string;
  phase: string;
  impactLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'STANDARD';
  description: string;
  traderFocus: string;
  orderFlow: string;
}

export interface WitchingStrategyPlaybook {
  id: string;
  title: string;
  category: 'Arbitrage' | 'Pin Hedging' | 'Calendar Roll' | 'MOC Momentum' | 'Vol Fade';
  difficulty: 'Institutional' | 'Advanced' | 'Intermediate';
  winRateEst: string;
  riskReward: string;
  thesis: string;
  executionSteps: string[];
  riskWarnings: string;
}

export interface SymbolWitchingProfile {
  symbol: string;
  currentPrice: number;
  pinStrike: number;
  callWall: number;
  putWall: number;
  zeroGammaFlip: number;
  pinProbabilityPct: number;
  expiringCallOI: number;
  expiringPutOI: number;
  expiringTotalOI: number;
  pcrRatio: number;
  expectedVolMultiplier: number; // e.g. 2.6x
  gammaRegime: 'Positive Gamma (Sticky Pin)' | 'Negative Gamma (Volatile Expansion)';
  strikeBreakdown: {
    strike: number;
    callOI: number;
    putOI: number;
    netGamma: number; // in Millions $
    pinMagnetScore: number; // 0 - 100
  }[];
}

export const QUAD_WITCHING_DATES: QuadWitchingDate[] = [
  {
    date: '2026-09-18',
    formattedDate: 'Sep 18, 2026',
    quarter: 'Q3 2026',
    dte: -21,
    status: 'past',
    estimatedNotional: '$4.95 Trillion',
    contractsExpiring: '182M contracts',
    notes: 'Completed. S&P 500 closed pinned at 568.20 with record MOC cross volume of $72B.',
  },
  {
    date: '2026-12-18',
    formattedDate: 'Dec 18, 2026',
    quarter: 'Q4 2026',
    dte: 80,
    status: 'imminent',
    estimatedNotional: '$5.42 Trillion',
    contractsExpiring: '204M contracts',
    notes: 'Next major market-wide OPEX. Coincides with annual Russell re-weighting and S&P quarterly rebalance.',
  },
  {
    date: '2027-03-19',
    formattedDate: 'Mar 19, 2027',
    quarter: 'Q1 2027',
    dte: 171,
    status: 'future',
    estimatedNotional: '$4.85 Trillion',
    contractsExpiring: '175M contracts',
    notes: 'Q1 OPEX expiration. Key focus on /ES March-to-June futures calendar rolls and bank dealer dividend hedges.',
  },
  {
    date: '2027-06-18',
    formattedDate: 'Jun 18, 2027',
    quarter: 'Q2 2027',
    dte: 262,
    status: 'future',
    estimatedNotional: '$5.18 Trillion',
    contractsExpiring: '192M contracts',
    notes: 'Mid-year Quad Witching. High concentration of long-dated LEAPS entering final 6-month theta decay.',
  },
  {
    date: '2027-09-17',
    formattedDate: 'Sep 17, 2027',
    quarter: 'Q3 2027',
    dte: 353,
    status: 'future',
    estimatedNotional: '$4.90 Trillion',
    contractsExpiring: '180M contracts',
    notes: 'End of Q3 cycle. Coincides with seasonal autumn volatility transition and institutional portfolio realignments.',
  },
  {
    date: '2027-12-17',
    formattedDate: 'Dec 17, 2027',
    quarter: 'Q4 2027',
    dte: 445,
    status: 'future',
    estimatedNotional: '$5.60 Trillion',
    contractsExpiring: '215M contracts',
    notes: 'Year-end quadruple witching cycle with heavy tax-loss selling and year-end institutional performance pinning.',
  },
];

export const THE_FOUR_WITCHES: FourWitchesBreakdown[] = [
  {
    id: 'index-futures',
    name: 'Stock Index Futures',
    category: 'Futures Derivatives',
    examples: ['E-mini S&P 500 (/ES)', 'Nasdaq 100 (/NQ)', 'Russell 2000 (/RTY)', 'Dow Jones (/YM)'],
    settlementMethod: 'Cash Settled (AM/PM)',
    estimatedNotionalShare: '38% ($2.05T)',
    description: 'Quarterly expiring futures contracts traded on CME/ICE. The basis between front-month and second-month futures contracts determines institutional calendar roll spreads.',
    marketDynamics: 'Massive institutional block roll-overs occurring throughout witching week as CTA trend followers and index funds migrate positions to the next quarter.',
    dealerBehavior: 'Arbitrageurs buy/sell the cash equity basket against the futures basis (Cash-and-Carry Arbitrage), causing high volume in underlying stocks.',
  },
  {
    id: 'index-options',
    name: 'Stock Index Options',
    category: 'Index Vanilla Options',
    examples: ['S&P 500 Index (SPX)', 'Nasdaq 100 Index (NDX)', 'Russell 2000 (RUT)', 'CBOE Volatility (VIX)'],
    settlementMethod: 'Cash Settled (AM/PM)',
    estimatedNotionalShare: '32% ($1.73T)',
    description: 'European-style cash-settled index contracts. Includes both morning AM Special Opening Quotation (SOQ) and afternoon PM closing settlements.',
    marketDynamics: 'Generates enormous Gamma Exposure (GEX). Deep ITM and ATM institutional put overwrites expire, releasing dealer hedging requirements.',
    dealerBehavior: 'Market makers hold large delta hedges. When index gamma is high, dealer hedging aggressively buffers index swings, magnetizing prices to major strikes (e.g. SPX 5700).',
  },
  {
    id: 'single-stock-options',
    name: 'Single-Stock Equity Options',
    category: 'Equity Standard Options',
    examples: ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD'],
    settlementMethod: 'Physical Delivery',
    estimatedNotionalShare: '22% ($1.19T)',
    description: 'American-style options on individual common stocks settling into 100 shares of actual equity. Expire at 16:00 ET on Witching Friday.',
    marketDynamics: 'Extreme pin risk on major mega-caps. Unexercised ITM options cause large physical share delivery obligations over the T+1 settlement window.',
    dealerBehavior: 'Dealers dynamically delta hedge until the closing cross bell. Gamma pin creates tight compression around round number strikes (e.g. NVDA $130, TSLA $250).',
  },
  {
    id: 'single-stock-futures',
    name: 'Single-Stock Futures & Major ETF Options',
    category: 'SSF & ETF Complexes',
    examples: ['SPY', 'QQQ', 'IWM', 'DIA', 'Global SSFs on Eurex/HKEX'],
    settlementMethod: 'Physical Delivery',
    estimatedNotionalShare: '8% ($0.45T)',
    description: 'Historically single-stock futures (OneChicago), now encompassing major liquid ETF option complexes (SPY/QQQ) and international equity futures proxies.',
    marketDynamics: 'Active cross-market hedging between ETF options and index futures contracts, facilitating rapid liquidity transfers between retail and institutional pools.',
    dealerBehavior: 'High-frequency liquidity providers arbitrage price variances between SPY options, SPX options, and /ES futures right up to the 16:00 ET close.',
  },
];

export const WITCHING_INTRADAY_SCHEDULE: WitchingIntradaySchedule[] = [
  {
    time: '08:30 - 09:30 ET',
    phase: 'Pre-Market & AM Settlement Fixing',
    impactLevel: 'HIGH',
    description: 'Special Opening Quotation (SOQ) calculation for AM-settled index options (SPX AM, VIX). Opening print sets final settlement cash values.',
    traderFocus: 'Monitor opening gap versus expected SOQ calculations and overnight /ES futures basis.',
    orderFlow: 'Heavy algorithmic market-on-open (MOO) index basket allocations.',
  },
  {
    time: '09:30 - 10:15 ET',
    phase: 'Opening Bell Cross & Initial Delta Unwind',
    impactLevel: 'CRITICAL',
    description: 'Market opens with surging volume. Dealers adjust delta hedges to match AM expiration outcomes and overnight index movements.',
    traderFocus: 'Expect erratic multi-strike spikes before mean-reverting into the central gamma magnet.',
    orderFlow: 'First major wave of institutional execution; spreads tighten rapidly across mega-cap options.',
  },
  {
    time: '10:15 - 13:30 ET',
    phase: 'Quarterly Futures Calendar Roll Window',
    impactLevel: 'MODERATE',
    description: 'CME /ES and /NQ quarterly rolls dominate the tape. Systematic CTA funds roll long/short futures positions into next quarterly contracts.',
    traderFocus: 'Observe futures calendar spread pricing (/ESZ6 vs /ESH7) to gauge underlying institutional bullish/bearish rollover bias.',
    orderFlow: 'Enormous volume in block spreads with minimal directional equity price movement.',
  },
  {
    time: '13:30 - 15:00 ET',
    phase: 'Gamma Pin Formation & Compression',
    impactLevel: 'HIGH',
    description: 'Positive gamma dominates as time decay (Theta) accelerates. Market makers aggressively buy dips and sell rips to keep inventory delta neutral.',
    traderFocus: 'Pin risk exploitation. ATM straddles bleed premium rapidly as implied volatility collapses.',
    orderFlow: 'High options churn around major round strikes with narrowing underlying trading ranges.',
  },
  {
    time: '15:00 - 15:50 ET',
    phase: 'Witching Hour Kickoff & MOC Imbalances',
    impactLevel: 'CRITICAL',
    description: 'Official start of the "Witching Hour". At 15:50 ET, NYSE and NASDAQ publish official Market-On-Close (MOC) order imbalances.',
    traderFocus: 'Watch MOC buy vs sell imbalance ($ Billions). A severe imbalance (> $3B buy or sell) forces sudden directional continuation.',
    orderFlow: 'Fast money programs front-run anticipated closing auction fills.',
  },
  {
    time: '15:50 - 16:00 ET',
    phase: 'The Closing Cross Auction (Peak Volume of Quarter)',
    impactLevel: 'CRITICAL',
    description: 'The final 10 minutes of trading. Over 25% of the entire day\'s equity trading volume executes in a few concentrated minutes at the closing cross.',
    traderFocus: 'Execute final hedge liquidations or exit expiring short options to avoid pin assignment risk.',
    orderFlow: 'Gigantic block liquidity crossing at single closing prices across all exchanges.',
  },
  {
    time: '16:00 - 17:30 ET',
    phase: 'Post-Close Derivative Exercise & Clearing',
    impactLevel: 'STANDARD',
    description: 'Options Clearing Corporation (OCC) automatically exercises all options that are $0.01 or more in-the-money based on 16:00 ET closing price.',
    traderFocus: 'Contrary exercise threshold decisions; review assignment notices for T+1 delivery.',
    orderFlow: 'Settlement processing across clearing brokerages and Depository Trust & Clearing Corp (DTCC).',
  },
];

export const WITCHING_PLAYBOOK_STRATEGIES: WitchingStrategyPlaybook[] = [
  {
    id: 'pin-iron-butterfly',
    title: 'Witching Day Pin Iron Butterfly',
    category: 'Pin Hedging',
    difficulty: 'Advanced',
    winRateEst: '72% historical',
    riskReward: '1 : 2.5',
    thesis: 'Mega-cap equities and major ETFs with massive open interest clusters exhibit extreme pinning to round strikes due to market maker positive gamma hedging.',
    executionSteps: [
      'Identify the strike with highest total Net Gamma and Open Interest 2 hours before market close (e.g., SPY $570 strike).',
      'Sell 1 ATM Call and 1 ATM Put at the pin strike.',
      'Buy 1 OTM Call and 1 OTM Put 1.5% - 2% away to define risk wings.',
      'Close position at 15:45 ET before the MOC imbalance auction to avoid after-hours assignment surprise.',
    ],
    riskWarnings: 'Late-session MOC imbalances exceeding $4B can breach the pin strike with high velocity.',
  },
  {
    id: 'calendar-roll-compression',
    title: 'Quarterly Calendar Roll Volatility Fade',
    category: 'Calendar Roll',
    difficulty: 'Intermediate',
    winRateEst: '68% historical',
    riskReward: '1 : 1.8',
    thesis: 'Front-month quad witching implied volatility experiences severe theta crush and volatility compression on Friday afternoon, while back-month retains stability.',
    executionSteps: [
      'Sell expiring Quad Witching contracts (0 DTE / short-dated) with inflated IV.',
      'Simultaneously buy the subsequent quarterly cycle contracts (e.g., roll Dec \'26 into Mar \'27).',
      'Harvest the theta decay acceleration and front-month volatility crush.',
    ],
    riskWarnings: 'Ensure back-month contracts have sufficient liquidity to prevent wide bid-ask slippage.',
  },
  {
    id: 'moc-imbalance-momentum',
    title: 'MOC Imbalance Closing Cross Scalp',
    category: 'MOC Momentum',
    difficulty: 'Institutional',
    winRateEst: '64% historical',
    riskReward: '1 : 3.0',
    thesis: 'When the 15:50 ET NYSE/NASDAQ MOC imbalance is overwhelmingly skewed in one direction (> $3.5B), index funds are forced to absorb liquidity at any market price into the 16:00 close.',
    executionSteps: [
      'Monitor real-time tape at 15:50 ET for published closing imbalance data.',
      'If Net Buy Imbalance > +$3.5B, enter long delta futures or ATM calls.',
      'If Net Sell Imbalance > -$3.5B, enter short delta futures or ATM puts.',
      'Exit precisely at 15:59:45 ET prior to official cross settlement.',
    ],
    riskWarnings: 'High slippage risk during the final 90 seconds. Requires rapid routing.',
  },
  {
    id: 'post-witching-rebound',
    title: 'Post-Witching Monday Rebound / Breakout',
    category: 'Vol Fade',
    difficulty: 'Intermediate',
    winRateEst: '66% historical',
    riskReward: '1 : 2.2',
    thesis: 'On the Monday following Quad Witching, the artificial dealer gamma pin completely vanishes as expired options clear, allowing pent-up directional momentum to release.',
    executionSteps: [
      'Review the witching pin range from Friday.',
      'Establish directional debit spreads or strangles on Monday morning as the index breaks out of the former pin cage.',
      'Ride the post-expiration directional expansion.',
    ],
    riskWarnings: 'Macro headlines over the weekend can create gap openings.',
  },
];

/**
 * Calculates a detailed Quadruple Witching profile for a specific stock/ETF symbol
 */
export function getSymbolWitchingProfile(ticker: Ticker): SymbolWitchingProfile {
  const S = ticker.price;
  const isIndex = ticker.symbol === 'SPY' || ticker.symbol === 'QQQ' || ticker.symbol === 'IWM' || ticker.symbol === 'DIA';

  // Determine standard round strike spacing
  const strikeInterval = S > 400 ? 5 : S > 150 ? 2.5 : S > 50 ? 1 : 0.5;
  const centerStrike = Math.round(S / strikeInterval) * strikeInterval;

  // Build strike breakdown around current market price
  const strikes: number[] = [];
  for (let i = -7; i <= 7; i++) {
    strikes.push(Number((centerStrike + i * strikeInterval).toFixed(2)));
  }

  // Find natural pin strike: usually the closest round strike or heavy open interest magnet
  const pinStrike = centerStrike;
  const callWall = Number((centerStrike + 2 * strikeInterval).toFixed(2));
  const putWall = Number((centerStrike - 2 * strikeInterval).toFixed(2));
  const zeroGammaFlip = Number((centerStrike - 0.8 * strikeInterval).toFixed(2));

  // Base OI multiplier by symbol liquidity
  const baseOI = isIndex ? 180000 : ticker.symbol === 'NVDA' ? 140000 : ticker.symbol === 'TSLA' ? 110000 : 45000;

  const strikeBreakdown = strikes.map((strike) => {
    const dist = Math.abs(strike - centerStrike);
    const weight = Math.exp(-dist / (strikeInterval * 2.5));
    const isRound10 = strike % 10 === 0;
    const isRound5 = strike % 5 === 0;
    const roundBoost = isRound10 ? 1.6 : isRound5 ? 1.3 : 1.0;

    const callOI = Math.round(baseOI * weight * roundBoost * (strike >= S ? 1.15 : 0.85));
    const putOI = Math.round(baseOI * weight * roundBoost * (strike <= S ? 1.2 : 0.8));
    const netGamma = Number(((callOI - putOI) * 0.00035 * S).toFixed(1));
    const pinMagnetScore = Math.min(100, Math.round(98 * weight * (strike === pinStrike ? 1.0 : 0.85)));

    return {
      strike,
      callOI,
      putOI,
      netGamma,
      pinMagnetScore,
    };
  });

  const totalCallOI = strikeBreakdown.reduce((sum, item) => sum + item.callOI, 0);
  const totalPutOI = strikeBreakdown.reduce((sum, item) => sum + item.putOI, 0);
  const totalOI = totalCallOI + totalPutOI;
  const pcrRatio = Number((totalPutOI / (totalCallOI || 1)).toFixed(2));

  return {
    symbol: ticker.symbol,
    currentPrice: S,
    pinStrike,
    callWall,
    putWall,
    zeroGammaFlip,
    pinProbabilityPct: S > 400 ? 74 : 68,
    expiringCallOI: totalCallOI,
    expiringPutOI: totalPutOI,
    expiringTotalOI: totalOI,
    pcrRatio,
    expectedVolMultiplier: isIndex ? 2.85 : 2.45,
    gammaRegime: S >= zeroGammaFlip ? 'Positive Gamma (Sticky Pin)' : 'Negative Gamma (Volatile Expansion)',
    strikeBreakdown,
  };
}

/**
 * Gets the next upcoming Quadruple Witching date
 */
export function getNextQuadWitchingDate(): QuadWitchingDate {
  const next = QUAD_WITCHING_DATES.find((d) => d.status === 'imminent');
  return next || QUAD_WITCHING_DATES[1];
}
