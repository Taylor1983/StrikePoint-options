import { OptionContract, Ticker, ExpirationOptionChain, TradeLeg } from '../types/options';

export interface DepthLevel {
  level: number;
  exchange: string;
  size: number;
  price: number;
  cumulativeSize: number;
  orderCount: number;
  percentOfMax: number;
}

export interface OptionTimeAndSale {
  id: string;
  time: string;
  price: number;
  size: number;
  exchange: string;
  side: 'BID' | 'ASK' | 'MID' | 'SWEEP';
  condition: 'REGULAR' | 'AUTO_EXEC' | 'INTERMARKET_SWEEP' | 'COMPLEX_ORDER';
}

export interface OptionMarketDepth {
  ticker: string;
  underlyingPrice: number;
  strike: number;
  type: 'call' | 'put';
  expiration: string;
  dte: number;
  
  // Inside Market (BBO - Best Bid / Offer)
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  bestBidExchange: string;
  bestAskExchange: string;
  
  // Spread Metrics
  spread: number;
  spreadPercent: number; // spread / mid * 100
  midPrice: number;
  tickSize: number;
  liquidityGrade: 'A+' | 'A' | 'B' | 'C' | 'ILLIQUID';
  liquidityLabel: string;
  
  // Greeks & Metrics
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  volume: number;
  openInterest: number;
  
  // Depth Ladders (8 levels each)
  bidLadder: DepthLevel[];
  askLadder: DepthLevel[];
  
  // Microstructure Order Flow Analytics
  totalBidLiquidity: number; // total contracts
  totalAskLiquidity: number; // total contracts
  totalBidNotional: number;  // contracts * price * 100
  totalAskNotional: number;
  imbalancePercent: number;  // (totalBid - totalAsk) / (totalBid + totalAsk) * 100
  orderFlowBias: 'HEAVY_BID' | 'LEAN_BID' | 'BALANCED' | 'LEAN_ASK' | 'HEAVY_ASK';
  
  bidVwap: number;
  askVwap: number;
  vwapSpread: number;
  effectiveSpread: number;
  
  // Recent Matched Trades (Time & Sales)
  timeAndSales: OptionTimeAndSale[];
}

const OPTION_EXCHANGES = [
  'CBOE',
  'PHLX',
  'BOX',
  'ARCA',
  'MIAX',
  'EDGX',
  'BATS',
  'ISE',
  'AMEX',
  'C2',
  'PEARL',
];

/**
 * Generate a realistic multi-tier Level 2 Market Depth order book for any option contract.
 */
export function generateOptionMarketDepth(
  ticker: Ticker,
  chain: ExpirationOptionChain,
  strike: number,
  type: 'call' | 'put'
): OptionMarketDepth {
  const contractList = type === 'call' ? chain.calls : chain.puts;
  const contract = contractList.find((c) => c.strike === strike) || contractList[0];

  const spot = ticker.price;
  const rawBid = Math.max(0.01, contract ? contract.bid : 1.0);
  const rawAsk = Math.max(rawBid + 0.01, contract ? contract.ask : 1.05);

  const midPrice = Number(((rawBid + rawAsk) / 2).toFixed(2));
  const spread = Number((rawAsk - rawBid).toFixed(2));
  const spreadPercent = midPrice > 0 ? Number(((spread / midPrice) * 100).toFixed(2)) : 0;

  // Tick size: usually $0.01 for options <= $3 or Penny Pilot (SPY/QQQ/AAPL/etc.), otherwise $0.05
  const isPenny = ticker.symbol === 'SPY' || ticker.symbol === 'QQQ' || ticker.symbol === 'AAPL' || rawBid < 3.0;
  const tickSize = isPenny ? 0.01 : 0.05;

  // Grade liquidity
  let liquidityGrade: 'A+' | 'A' | 'B' | 'C' | 'ILLIQUID' = 'B';
  let liquidityLabel = 'Standard Liquidity';
  if (spread <= 0.02 || spreadPercent <= 1.5) {
    liquidityGrade = 'A+';
    liquidityLabel = 'Ultra-Tight Institutional (Near-Zero Slippage)';
  } else if (spread <= 0.05 || spreadPercent <= 3.0) {
    liquidityGrade = 'A';
    liquidityLabel = 'Tight Active Market (Low Slippage)';
  } else if (spread <= 0.12 || spreadPercent <= 6.0) {
    liquidityGrade = 'B';
    liquidityLabel = 'Moderate Liquidity (Standard MM Edge)';
  } else if (spread <= 0.25 || spreadPercent <= 12.0) {
    liquidityGrade = 'C';
    liquidityLabel = 'Wide Retail Spread (Use Limit Orders)';
  } else {
    liquidityGrade = 'ILLIQUID';
    liquidityLabel = 'Illiquid Wing / High Slippage Risk';
  }

  // Base sizing seeded from open interest and volume
  const baseVolume = contract ? Math.max(10, contract.volume) : 50;
  const baseOI = contract ? Math.max(20, contract.openInterest) : 100;
  const liquidityFactor = Math.min(5, Math.max(0.5, Math.log10(baseVolume + baseOI + 10) / 2));

  // Pseudorandom deterministic noise based on strike and ticker
  const seed = (Math.abs(strike * 100) + type.charCodeAt(0) * 13 + chain.dte * 7) % 100;

  // Generate 8-level Bids ladder
  const bidLadder: DepthLevel[] = [];
  let cumBidSize = 0;
  const bboBidSize = Math.max(10, Math.round((45 + (seed % 35) * 3) * liquidityFactor));
  cumBidSize += bboBidSize;

  bidLadder.push({
    level: 1,
    exchange: OPTION_EXCHANGES[seed % OPTION_EXCHANGES.length],
    size: bboBidSize,
    price: rawBid,
    cumulativeSize: cumBidSize,
    orderCount: 1 + (seed % 4),
    percentOfMax: 100,
  });

  for (let i = 2; i <= 8; i++) {
    const priceStep = i <= 3 ? tickSize : tickSize * (1 + (i % 2));
    const levelPrice = Math.max(0.01, Number((bidLadder[i - 2].price - priceStep).toFixed(2)));
    const levelSize = Math.max(5, Math.round((25 + ((seed + i * 17) % 50) * 4) * liquidityFactor));
    cumBidSize += levelSize;

    bidLadder.push({
      level: i,
      exchange: OPTION_EXCHANGES[(seed + i * 3) % OPTION_EXCHANGES.length],
      size: levelSize,
      price: levelPrice,
      cumulativeSize: cumBidSize,
      orderCount: 1 + ((seed + i) % 6),
      percentOfMax: 0, // calculated below
    });
  }

  // Generate 8-level Asks ladder
  const askLadder: DepthLevel[] = [];
  let cumAskSize = 0;
  const bboAskSize = Math.max(10, Math.round((40 + ((seed + 19) % 35) * 3) * liquidityFactor));
  cumAskSize += bboAskSize;

  askLadder.push({
    level: 1,
    exchange: OPTION_EXCHANGES[(seed + 4) % OPTION_EXCHANGES.length],
    size: bboAskSize,
    price: rawAsk,
    cumulativeSize: cumAskSize,
    orderCount: 1 + ((seed + 2) % 4),
    percentOfMax: 100,
  });

  for (let i = 2; i <= 8; i++) {
    const priceStep = i <= 3 ? tickSize : tickSize * (1 + (i % 2));
    const levelPrice = Number((askLadder[i - 2].price + priceStep).toFixed(2));
    const levelSize = Math.max(5, Math.round((25 + ((seed + i * 23) % 45) * 4) * liquidityFactor));
    cumAskSize += levelSize;

    askLadder.push({
      level: i,
      exchange: OPTION_EXCHANGES[(seed + i * 5) % OPTION_EXCHANGES.length],
      size: levelSize,
      price: levelPrice,
      cumulativeSize: cumAskSize,
      orderCount: 1 + ((seed + i + 1) % 5),
      percentOfMax: 0,
    });
  }

  // Normalize depth bar percentages
  const maxDepthSize = Math.max(
    ...bidLadder.map((b) => b.size),
    ...askLadder.map((a) => a.size)
  );

  bidLadder.forEach((b) => {
    b.percentOfMax = Math.round((b.size / maxDepthSize) * 100);
  });
  askLadder.forEach((a) => {
    a.percentOfMax = Math.round((a.size / maxDepthSize) * 100);
  });

  // Calculate Totals & VWAP
  let bidWeightedSum = 0;
  let askWeightedSum = 0;
  let totalBidNotional = 0;
  let totalAskNotional = 0;

  bidLadder.forEach((b) => {
    bidWeightedSum += b.price * b.size;
    totalBidNotional += b.price * b.size * (ticker.multiplier || 100);
  });
  askLadder.forEach((a) => {
    askWeightedSum += a.price * a.size;
    totalAskNotional += a.price * a.size * (ticker.multiplier || 100);
  });

  const bidVwap = cumBidSize > 0 ? Number((bidWeightedSum / cumBidSize).toFixed(2)) : rawBid;
  const askVwap = cumAskSize > 0 ? Number((askWeightedSum / cumAskSize).toFixed(2)) : rawAsk;
  const vwapSpread = Number((askVwap - bidVwap).toFixed(2));

  // Imbalance calculation
  const totalContracts = cumBidSize + cumAskSize;
  const rawImbalance = totalContracts > 0 ? ((cumBidSize - cumAskSize) / totalContracts) * 100 : 0;
  const imbalancePercent = Number(rawImbalance.toFixed(1));

  let orderFlowBias: 'HEAVY_BID' | 'LEAN_BID' | 'BALANCED' | 'LEAN_ASK' | 'HEAVY_ASK' = 'BALANCED';
  if (imbalancePercent >= 20) orderFlowBias = 'HEAVY_BID';
  else if (imbalancePercent >= 6) orderFlowBias = 'LEAN_BID';
  else if (imbalancePercent <= -20) orderFlowBias = 'HEAVY_ASK';
  else if (imbalancePercent <= -6) orderFlowBias = 'LEAN_ASK';

  // Effective spread (usually slightly narrower than quoted spread for institutional fills)
  const effectiveSpread = Number(Math.max(0.01, spread * 0.82).toFixed(2));

  // Generate 6 recent Time & Sales executions for this strike
  const timeAndSales: OptionTimeAndSale[] = [
    {
      id: `ts-${strike}-1`,
      time: '15:58:42',
      price: Number((rawBid + tickSize).toFixed(2)),
      size: Math.max(5, Math.round(15 * liquidityFactor)),
      exchange: OPTION_EXCHANGES[seed % OPTION_EXCHANGES.length],
      side: 'MID',
      condition: 'AUTO_EXEC',
    },
    {
      id: `ts-${strike}-2`,
      time: '15:57:15',
      price: rawAsk,
      size: Math.max(10, Math.round(50 * liquidityFactor)),
      exchange: OPTION_EXCHANGES[(seed + 1) % OPTION_EXCHANGES.length],
      side: 'ASK',
      condition: 'INTERMARKET_SWEEP',
    },
    {
      id: `ts-${strike}-3`,
      time: '15:55:08',
      price: rawBid,
      size: Math.max(8, Math.round(25 * liquidityFactor)),
      exchange: OPTION_EXCHANGES[(seed + 2) % OPTION_EXCHANGES.length],
      side: 'BID',
      condition: 'REGULAR',
    },
    {
      id: `ts-${strike}-4`,
      time: '15:52:33',
      price: rawAsk,
      size: Math.max(15, Math.round(100 * liquidityFactor)),
      exchange: 'CBOE',
      side: 'SWEEP',
      condition: 'COMPLEX_ORDER',
    },
    {
      id: `ts-${strike}-5`,
      time: '15:48:19',
      price: midPrice,
      size: Math.max(4, Math.round(12 * liquidityFactor)),
      exchange: 'BOX',
      side: 'MID',
      condition: 'REGULAR',
    },
    {
      id: `ts-${strike}-6`,
      time: '15:42:01',
      price: rawBid,
      size: Math.max(10, Math.round(35 * liquidityFactor)),
      exchange: 'PHLX',
      side: 'BID',
      condition: 'AUTO_EXEC',
    },
  ];

  return {
    ticker: ticker.symbol,
    underlyingPrice: spot,
    strike,
    type,
    expiration: chain.formattedDate,
    dte: chain.dte,

    bid: rawBid,
    ask: rawAsk,
    bidSize: bboBidSize,
    askSize: bboAskSize,
    bestBidExchange: bidLadder[0].exchange,
    bestAskExchange: askLadder[0].exchange,

    spread,
    spreadPercent,
    midPrice,
    tickSize,
    liquidityGrade,
    liquidityLabel,

    iv: contract ? contract.iv : 0.25,
    delta: contract ? contract.delta : (type === 'call' ? 0.5 : -0.5),
    gamma: contract ? contract.gamma : 0.02,
    theta: contract ? contract.theta : -0.05,
    vega: contract ? contract.vega : 0.15,
    volume: contract ? contract.volume : 120,
    openInterest: contract ? contract.openInterest : 450,

    bidLadder,
    askLadder,

    totalBidLiquidity: cumBidSize,
    totalAskLiquidity: cumAskSize,
    totalBidNotional: Math.round(totalBidNotional),
    totalAskNotional: Math.round(totalAskNotional),
    imbalancePercent,
    orderFlowBias,

    bidVwap,
    askVwap,
    vwapSpread,
    effectiveSpread,

    timeAndSales,
  };
}

/**
 * Calculate expected slippage and average execution price for an order size across the book.
 */
export function calculateOrderBookSlippage(
  ladder: DepthLevel[],
  orderContracts: number,
  isBuy: boolean
): {
  avgExecutionPrice: number;
  totalCost: number;
  levelsConsumed: number;
  slippageDollars: number;
  slippagePercent: number;
} {
  let remaining = orderContracts;
  let totalSpent = 0;
  let levelsUsed = 0;

  for (const level of ladder) {
    if (remaining <= 0) break;
    levelsUsed++;
    const filled = Math.min(remaining, level.size);
    totalSpent += filled * level.price;
    remaining -= filled;
  }

  // If order exceeds all 8 levels, fill remainder at deepest level + 2 ticks
  if (remaining > 0 && ladder.length > 0) {
    const deepest = ladder[ladder.length - 1];
    const penalty = isBuy ? 0.10 : -0.10;
    const penaltyPrice = Math.max(0.01, deepest.price + penalty);
    totalSpent += remaining * penaltyPrice;
  }

  const avgExecutionPrice = orderContracts > 0 ? Number((totalSpent / orderContracts).toFixed(2)) : ladder[0].price;
  const bboPrice = ladder[0]?.price || avgExecutionPrice;
  const slippageDollars = Number(Math.abs(avgExecutionPrice - bboPrice).toFixed(2));
  const slippagePercent = bboPrice > 0 ? Number(((slippageDollars / bboPrice) * 100).toFixed(2)) : 0;

  return {
    avgExecutionPrice,
    totalCost: totalSpent,
    levelsConsumed: levelsUsed,
    slippageDollars,
    slippagePercent,
  };
}

export interface StrategyTimeAndSale {
  id: string;
  time: string;
  price: number;
  size: number;
  venue: string;
  side: 'BID' | 'ASK' | 'MID' | 'AUCTION';
  orderType: 'COMPLEX_ORDER' | 'SPREAD_AUCTION' | 'CROSS_PIM' | 'FACILITATION';
}

export interface StrategyMarketDepth {
  ticker: string;
  underlyingPrice: number;
  strategyName: string;
  legs: TradeLeg[];
  isDebit: boolean;
  unitMultiplier: number;

  // Natural / Synthetic Market (Synthesized from individual leg order books)
  naturalBid: number;
  naturalAsk: number;
  naturalMid: number;
  naturalSpread: number;
  naturalSpreadPercent: number;

  // Direct Complex Order Book (COB) Market (Institutional Quotes from Citadel, SIG, Jane St, CBOE COB)
  cobBid: number;
  cobAsk: number;
  cobMid: number;
  cobSpread: number;
  cobSpreadPercent: number;
  cobBestBidVenue: string;
  cobBestAskVenue: string;
  priceImprovement: number; // $ savings per contract over synthetic legging

  // 8-Level Combo Order Books (Direct COB vs Synthetic)
  bidLadder: DepthLevel[];
  askLadder: DepthLevel[];
  syntheticBidLadder: DepthLevel[];
  syntheticAskLadder: DepthLevel[];

  // Microstructure & Order Flow Analytics
  totalBidLiquidity: number;
  totalAskLiquidity: number;
  totalBidNotional: number;
  totalAskNotional: number;
  imbalancePercent: number;
  orderFlowBias: 'HEAVY_BID' | 'LEAN_BID' | 'BALANCED' | 'LEAN_ASK' | 'HEAVY_ASK';
  liquidityGrade: 'A+' | 'A' | 'B' | 'C' | 'ILLIQUID';
  liquidityLabel: string;
  atomicExecutionGuarantee: boolean; // Guaranteed all legs execute simultaneously without legging risk
  leggingRiskScore: 'ZERO' | 'LOW' | 'MEDIUM' | 'HIGH';

  // Strategy Greeks Summary
  comboDelta: number;
  comboGamma: number;
  comboTheta: number;
  comboVega: number;

  // Complex Order Tape / Time & Sales
  timeAndSales: StrategyTimeAndSale[];
}

const COMPLEX_ORDER_VENUES = [
  'CBOE COB',
  'ISE COMPLEX',
  'PHLX COMPLEX',
  'BOX SOLICIT',
  'MIAX COMPLEX',
  'CITADEL MM',
  'SUSQUEHANNA SIG',
  'JANE ST EXEC',
  'WOLVERINE',
  'TWO SIGMA',
  'IMC FIN',
  'AMEX COMPLEX',
];

/**
 * Generate a realistic multi-tier Level 2 Market Depth order book for any multi-leg option strategy.
 * Includes both Synthetic (Leg-by-Leg) and Direct Complex Order Book (COB) quotes with Price Improvement.
 */
export function generateStrategyMarketDepth(
  ticker: Ticker,
  legs: TradeLeg[],
  strategyName: string = 'Multi-Leg Combo'
): StrategyMarketDepth {
  const spot = ticker.price;
  const multiplier = ticker.multiplier || (ticker.symbol.startsWith('/') ? 50 : 100);

  // Fallback if legs array is empty
  if (!legs || legs.length === 0) {
    const dummyLadder: DepthLevel[] = [
      { level: 1, exchange: 'CBOE COB', size: 50, price: 1.00, cumulativeSize: 50, orderCount: 2, percentOfMax: 100 },
    ];
    return {
      ticker: ticker.symbol,
      underlyingPrice: spot,
      strategyName,
      legs: [],
      isDebit: true,
      unitMultiplier: multiplier,
      naturalBid: 0.95,
      naturalAsk: 1.05,
      naturalMid: 1.00,
      naturalSpread: 0.10,
      naturalSpreadPercent: 10.0,
      cobBid: 0.98,
      cobAsk: 1.02,
      cobMid: 1.00,
      cobSpread: 0.04,
      cobSpreadPercent: 4.0,
      cobBestBidVenue: 'CBOE COB',
      cobBestAskVenue: 'CITADEL MM',
      priceImprovement: 0.06,
      bidLadder: dummyLadder,
      askLadder: dummyLadder,
      syntheticBidLadder: dummyLadder,
      syntheticAskLadder: dummyLadder,
      totalBidLiquidity: 50,
      totalAskLiquidity: 50,
      totalBidNotional: 5000,
      totalAskNotional: 5000,
      imbalancePercent: 0,
      orderFlowBias: 'BALANCED',
      liquidityGrade: 'A',
      liquidityLabel: 'Institutional Liquidity',
      atomicExecutionGuarantee: true,
      leggingRiskScore: 'ZERO',
      comboDelta: 0,
      comboGamma: 0,
      comboTheta: 0,
      comboVega: 0,
      timeAndSales: [],
    };
  }

  // Calculate algebraic buyer and seller cost across legs
  let buyerCost = 0;   // To buy combo: pay Ask on bought legs, receive Bid on sold legs
  let sellerProceeds = 0; // To sell combo: receive Bid on bought legs, pay Ask on sold legs
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  legs.forEach((leg) => {
    const basePrem = Math.max(0.05, leg.premium || 1.50);
    // Realistic estimated leg bid & ask
    const legSpread = Math.max(0.02, Number((basePrem * 0.035).toFixed(2)));
    const legBid = Math.max(0.01, Number((basePrem - legSpread / 2).toFixed(2)));
    const legAsk = Number((basePrem + legSpread / 2).toFixed(2));
    const qty = leg.contracts || 1;

    if (leg.action === 'buy') {
      buyerCost += legAsk * qty;
      sellerProceeds += legBid * qty;
    } else {
      buyerCost -= legBid * qty;
      sellerProceeds -= legAsk * qty;
    }

    // Rough approximate Greeks for display if not fully precomputed
    const sign = leg.action === 'buy' ? 1 : -1;
    const isCall = leg.type === 'call';
    const moneyness = spot / (leg.strike || spot);
    const dSign = isCall ? 1 : -1;
    const legDelta = (isCall ? (moneyness > 1 ? 0.65 : 0.35) : (moneyness < 1 ? -0.65 : -0.35)) * sign * qty;
    totalDelta += legDelta;
    totalGamma += 0.025 * sign * qty;
    totalTheta += -0.045 * sign * qty;
    totalVega += 0.12 * sign * qty;
  });

  // Determine if overall net debit or net credit
  const rawNetMid = (buyerCost + sellerProceeds) / 2;
  const isDebit = rawNetMid >= 0;

  let naturalAsk = Number(Math.max(0.01, isDebit ? buyerCost : Math.abs(sellerProceeds)).toFixed(2));
  let naturalBid = Number(Math.max(0.01, isDebit ? sellerProceeds : Math.abs(buyerCost)).toFixed(2));

  // Ensure naturalAsk >= naturalBid
  if (naturalAsk < naturalBid) {
    const temp = naturalAsk;
    naturalAsk = naturalBid;
    naturalBid = temp;
  }
  if (naturalAsk === naturalBid) {
    naturalAsk = Number((naturalBid + 0.02).toFixed(2));
  }

  const naturalMid = Number(((naturalBid + naturalAsk) / 2).toFixed(2));
  const naturalSpread = Number((naturalAsk - naturalBid).toFixed(2));
  const naturalSpreadPercent = naturalMid > 0 ? Number(((naturalSpread / naturalMid) * 100).toFixed(1)) : 0;

  // Direct COB Quotes (Price Improvement inside the natural spread)
  // Institutional MM quotes typically tighten natural spread by 35% to 55%
  const improvementAmount = Number(Math.max(0.02, naturalSpread * 0.45).toFixed(2));
  const halfImprove = Number((improvementAmount / 2).toFixed(2));

  let cobBid = Number((naturalBid + halfImprove).toFixed(2));
  let cobAsk = Number(Math.max(cobBid + 0.01, naturalAsk - halfImprove).toFixed(2));
  if (cobAsk <= cobBid) {
    cobAsk = Number((cobBid + 0.02).toFixed(2));
  }

  const cobMid = Number(((cobBid + cobAsk) / 2).toFixed(2));
  const cobSpread = Number((cobAsk - cobBid).toFixed(2));
  const cobSpreadPercent = cobMid > 0 ? Number(((cobSpread / cobMid) * 100).toFixed(1)) : 0;
  const priceImprovement = Number(Math.max(0.01, naturalSpread - cobSpread).toFixed(2));

  // Seed pseudo-random variance from strikes and legs
  const seed = (Math.round(spot * 10) + legs.reduce((acc, l) => acc + (l.strike || 0), 0) + legs.length * 17) % 100;
  const tickStep = cobMid < 3.0 ? 0.01 : (cobMid < 10.0 ? 0.02 : 0.05);

  // Generate 8-level COB Bids Ladder
  const bidLadder: DepthLevel[] = [];
  let cumBidSize = 0;
  const bboBidSize = Math.max(15, Math.round(35 + (seed % 25) * 4));
  cumBidSize += bboBidSize;

  bidLadder.push({
    level: 1,
    exchange: COMPLEX_ORDER_VENUES[seed % COMPLEX_ORDER_VENUES.length],
    size: bboBidSize,
    price: cobBid,
    cumulativeSize: cumBidSize,
    orderCount: 1 + (seed % 3),
    percentOfMax: 100,
  });

  for (let i = 2; i <= 8; i++) {
    const step = i <= 3 ? tickStep : tickStep * (1 + (i % 2));
    const p = Math.max(0.01, Number((bidLadder[i - 2].price - step).toFixed(2)));
    const sz = Math.max(10, Math.round(20 + ((seed + i * 19) % 45) * 3));
    cumBidSize += sz;
    bidLadder.push({
      level: i,
      exchange: COMPLEX_ORDER_VENUES[(seed + i * 2) % COMPLEX_ORDER_VENUES.length],
      size: sz,
      price: p,
      cumulativeSize: cumBidSize,
      orderCount: 1 + ((seed + i) % 4),
      percentOfMax: 0,
    });
  }

  // Generate 8-level COB Asks Ladder
  const askLadder: DepthLevel[] = [];
  let cumAskSize = 0;
  const bboAskSize = Math.max(15, Math.round(30 + ((seed + 13) % 25) * 4));
  cumAskSize += bboAskSize;

  askLadder.push({
    level: 1,
    exchange: COMPLEX_ORDER_VENUES[(seed + 4) % COMPLEX_ORDER_VENUES.length],
    size: bboAskSize,
    price: cobAsk,
    cumulativeSize: cumAskSize,
    orderCount: 1 + ((seed + 1) % 3),
    percentOfMax: 100,
  });

  for (let i = 2; i <= 8; i++) {
    const step = i <= 3 ? tickStep : tickStep * (1 + (i % 2));
    const p = Number((askLadder[i - 2].price + step).toFixed(2));
    const sz = Math.max(10, Math.round(20 + ((seed + i * 23) % 45) * 3));
    cumAskSize += sz;
    askLadder.push({
      level: i,
      exchange: COMPLEX_ORDER_VENUES[(seed + i * 3) % COMPLEX_ORDER_VENUES.length],
      size: sz,
      price: p,
      cumulativeSize: cumAskSize,
      orderCount: 1 + ((seed + i + 2) % 4),
      percentOfMax: 0,
    });
  }

  // Normalize ladder percentages
  const maxDepthSize = Math.max(...bidLadder.map((b) => b.size), ...askLadder.map((a) => a.size));
  bidLadder.forEach((b) => {
    b.percentOfMax = Math.round((b.size / maxDepthSize) * 100);
  });
  askLadder.forEach((a) => {
    a.percentOfMax = Math.round((a.size / maxDepthSize) * 100);
  });

  // Generate Synthetic Depth Ladders (Leg-by-Leg natural books)
  const syntheticBidLadder: DepthLevel[] = [];
  let cumSynBid = 0;
  for (let i = 1; i <= 6; i++) {
    const p = Math.max(0.01, Number((naturalBid - (i - 1) * tickStep * 1.5).toFixed(2)));
    const sz = Math.max(5, Math.round(15 + ((seed + i * 11) % 20) * 2));
    cumSynBid += sz;
    syntheticBidLadder.push({
      level: i,
      exchange: 'SYNTHETIC_LEGS',
      size: sz,
      price: p,
      cumulativeSize: cumSynBid,
      orderCount: 1 + (i % 2),
      percentOfMax: Math.round((sz / maxDepthSize) * 100),
    });
  }

  const syntheticAskLadder: DepthLevel[] = [];
  let cumSynAsk = 0;
  for (let i = 1; i <= 6; i++) {
    const p = Number((naturalAsk + (i - 1) * tickStep * 1.5).toFixed(2));
    const sz = Math.max(5, Math.round(15 + ((seed + i * 17) % 20) * 2));
    cumSynAsk += sz;
    syntheticAskLadder.push({
      level: i,
      exchange: 'SYNTHETIC_LEGS',
      size: sz,
      price: p,
      cumulativeSize: cumSynAsk,
      orderCount: 1 + (i % 2),
      percentOfMax: Math.round((sz / maxDepthSize) * 100),
    });
  }

  // Calculate Order Flow Imbalance and Notional Totals
  let totalBidNotional = 0;
  let totalAskNotional = 0;
  bidLadder.forEach((b) => {
    totalBidNotional += b.price * b.size * multiplier;
  });
  askLadder.forEach((a) => {
    totalAskNotional += a.price * a.size * multiplier;
  });

  const totalContracts = cumBidSize + cumAskSize;
  const rawImbalance = totalContracts > 0 ? ((cumBidSize - cumAskSize) / totalContracts) * 100 : 0;
  const imbalancePercent = Number(rawImbalance.toFixed(1));

  let orderFlowBias: 'HEAVY_BID' | 'LEAN_BID' | 'BALANCED' | 'LEAN_ASK' | 'HEAVY_ASK' = 'BALANCED';
  if (imbalancePercent >= 18) orderFlowBias = 'HEAVY_BID';
  else if (imbalancePercent >= 6) orderFlowBias = 'LEAN_BID';
  else if (imbalancePercent <= -18) orderFlowBias = 'HEAVY_ASK';
  else if (imbalancePercent <= -6) orderFlowBias = 'LEAN_ASK';

  // Liquidity Grade
  let liquidityGrade: 'A+' | 'A' | 'B' | 'C' | 'ILLIQUID' = 'B';
  let liquidityLabel = 'Standard Complex Liquidity';
  if (cobSpread <= 0.04 || cobSpreadPercent <= 2.5) {
    liquidityGrade = 'A+';
    liquidityLabel = 'Ultra-Tight COB Spread (Institutional Cross)';
  } else if (cobSpread <= 0.08 || cobSpreadPercent <= 5.0) {
    liquidityGrade = 'A';
    liquidityLabel = 'Active Complex Order Market (High Match Rate)';
  } else if (cobSpread <= 0.18 || cobSpreadPercent <= 10.0) {
    liquidityGrade = 'B';
    liquidityLabel = 'Moderate Multi-Leg Depth';
  } else {
    liquidityGrade = 'C';
    liquidityLabel = 'Wide Combo Spread (Use Midpoint Auction)';
  }

  // Complex Order Tape / Time & Sales prints
  const timeAndSales: StrategyTimeAndSale[] = [
    {
      id: `cots-${Date.now()}-1`,
      time: '15:59:12',
      price: cobMid,
      size: Math.max(10, Math.round(25 + (seed % 15))),
      venue: 'CBOE COB',
      side: 'MID',
      orderType: 'COMPLEX_ORDER',
    },
    {
      id: `cots-${Date.now()}-2`,
      time: '15:58:05',
      price: cobAsk,
      size: Math.max(5, Math.round(50 + (seed % 30))),
      venue: 'CITADEL MM',
      side: 'ASK',
      orderType: 'SPREAD_AUCTION',
    },
    {
      id: `cots-${Date.now()}-3`,
      time: '15:55:40',
      price: Number((cobBid + 0.01).toFixed(2)),
      size: Math.max(8, Math.round(20 + (seed % 20))),
      venue: 'ISE COMPLEX',
      side: 'BID',
      orderType: 'CROSS_PIM',
    },
    {
      id: `cots-${Date.now()}-4`,
      time: '15:51:22',
      price: cobMid,
      size: Math.max(15, Math.round(75 + (seed % 40))),
      venue: 'PHLX COMPLEX',
      side: 'MID',
      orderType: 'COMPLEX_ORDER',
    },
    {
      id: `cots-${Date.now()}-5`,
      time: '15:47:09',
      price: cobBid,
      size: Math.max(10, Math.round(30 + (seed % 25))),
      venue: 'SUSQUEHANNA SIG',
      side: 'BID',
      orderType: 'FACILITATION',
    },
  ];

  return {
    ticker: ticker.symbol,
    underlyingPrice: spot,
    strategyName,
    legs,
    isDebit,
    unitMultiplier: multiplier,
    naturalBid,
    naturalAsk,
    naturalMid,
    naturalSpread,
    naturalSpreadPercent,
    cobBid,
    cobAsk,
    cobMid,
    cobSpread,
    cobSpreadPercent,
    cobBestBidVenue: bidLadder[0].exchange,
    cobBestAskVenue: askLadder[0].exchange,
    priceImprovement,
    bidLadder,
    askLadder,
    syntheticBidLadder,
    syntheticAskLadder,
    totalBidLiquidity: cumBidSize,
    totalAskLiquidity: cumAskSize,
    totalBidNotional: Math.round(totalBidNotional),
    totalAskNotional: Math.round(totalAskNotional),
    imbalancePercent,
    orderFlowBias,
    liquidityGrade,
    liquidityLabel,
    atomicExecutionGuarantee: true,
    leggingRiskScore: 'ZERO',
    comboDelta: Number(totalDelta.toFixed(2)),
    comboGamma: Number(totalGamma.toFixed(3)),
    comboTheta: Number(totalTheta.toFixed(2)),
    comboVega: Number(totalVega.toFixed(2)),
    timeAndSales,
  };
}

