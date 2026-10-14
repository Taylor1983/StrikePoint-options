import { TradeLeg, Order, Position } from '../types/options';

export interface StrategyDepthLevel {
  level: number;
  venue: string; // e.g., 'CBOE COB', 'ISE Complex', 'BOX PRISM', 'PHLX COB', 'MIAX Emerald'
  bidPrice: number;
  bidSize: number; // in packages/sets
  cumBidSize: number;
  askPrice: number;
  askSize: number; // in packages/sets
  cumAskSize: number;
  bidPercentOfMax: number;
  askPercentOfMax: number;
}

export interface LegSpreadBreakdown {
  legId: string;
  label: string;
  type: string;
  action: 'buy' | 'sell';
  strike: number;
  expiration: string;
  dte: number;
  bid: number;
  ask: number;
  spread: number;
  spreadContributionPct: number;
  isBottleneck: boolean;
  estLiquidity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StrategyMarketDepth {
  strategyName: string;
  ticker: string;
  underlyingPrice: number;
  legsCount: number;
  multiplier: number;
  
  // Net Natural Spread (from individual leg market quotes)
  netNaturalBid: number; // Price received if selling all legs at natural market
  netNaturalAsk: number; // Price paid if buying all legs at natural market
  naturalSpread: number; // netNaturalAsk - netNaturalBid
  naturalMidPrice: number;
  naturalSpreadPct: number;
  
  // Complex Order Book (COB) Consolidated BBO (with Price Improvement)
  cobBestBid: number; // Package bid from Complex Order Book
  cobBestAsk: number; // Package ask from Complex Order Book
  cobSpread: number;
  cobMidPrice: number;
  priceImprovementPotential: number; // Potential $ savings per contract vs natural market
  priceImprovementProb: number; // % chance of fill at or near mid
  
  // Implied Strategy Liquidity
  liquidityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  liquidityLabel: string;
  maxAvailablePackageSize: number;
  
  // 6-Tier Strategy Order Book Ladder
  ladder: StrategyDepthLevel[];
  
  totalBidPackages: number;
  totalAskPackages: number;
  packageImbalancePct: number; // (totalBid - totalAsk) / (totalBid + totalAsk) * 100
  
  // Individual Leg Spread Contribution & Bottleneck Detection
  legBreakdowns: LegSpreadBreakdown[];
  bottleneckSummary: string;
}

const COB_VENUES = [
  'CBOE COB',
  'ISE Complex',
  'BOX PRISM',
  'PHLX COB',
  'MIAX Emerald',
  'ARCA Complex',
  'EDGX COB',
];

/**
 * Calculate multi-leg complex order book (COB) synthetic and net market depth for any options strategy.
 */
export function calculateStrategyMarketDepth(
  legs: TradeLeg[],
  underlyingPrice: number,
  tickerSymbol: string,
  multiplier: number = 100
): StrategyMarketDepth {
  if (!legs || legs.length === 0) {
    return {
      strategyName: 'Empty Strategy',
      ticker: tickerSymbol,
      underlyingPrice,
      legsCount: 0,
      multiplier,
      netNaturalBid: 0,
      netNaturalAsk: 0,
      naturalSpread: 0,
      naturalMidPrice: 0,
      naturalSpreadPct: 0,
      cobBestBid: 0,
      cobBestAsk: 0,
      cobSpread: 0,
      cobMidPrice: 0,
      priceImprovementPotential: 0,
      priceImprovementProb: 50,
      liquidityRating: 'FAIR',
      liquidityLabel: 'No legs loaded',
      maxAvailablePackageSize: 0,
      ladder: [],
      totalBidPackages: 0,
      totalAskPackages: 0,
      packageImbalancePct: 0,
      legBreakdowns: [],
      bottleneckSummary: 'Add legs to view Complex Order Book depth',
    };
  }

  // 1. Calculate each leg's estimated individual bid, ask, and spread
  let totalLegSpreadSum = 0;
  const legDetails = legs.map((leg, idx) => {
    const isStock = leg.type === 'stock';
    const isFuture = leg.type === 'future';
    const prem = leg.premium || 1.0;

    let legBid = 0;
    let legAsk = 0;

    if (isStock || isFuture) {
      // Stock/Future leg has tiny 1-2 cent spread
      legBid = Number((prem - 0.01).toFixed(2));
      legAsk = Number((prem + 0.01).toFixed(2));
    } else {
      // Option leg spread: approx 1.5% to 4% depending on price
      const estSpread = prem < 2.0 ? 0.04 : prem < 5.0 ? 0.08 : prem < 15.0 ? 0.15 : 0.25;
      legBid = Math.max(0.01, Number((prem - estSpread / 2).toFixed(2)));
      legAsk = Number((prem + estSpread / 2).toFixed(2));
    }

    const spread = Number((legAsk - legBid).toFixed(2));
    totalLegSpreadSum += spread;

    const label = isStock
      ? `Stock (${leg.contracts} shs)`
      : isFuture
      ? `/Future (${leg.contracts}x)`
      : `${leg.strike} ${leg.type.toUpperCase()}`;

    return {
      legId: leg.id,
      label,
      type: leg.type,
      action: leg.action,
      strike: leg.strike,
      expiration: leg.expiration,
      dte: leg.dte,
      bid: legBid,
      ask: legAsk,
      spread,
      contracts: leg.contracts,
    };
  });

  // 2. Identify leg spread contribution & bottleneck
  let maxSpread = 0;
  let bottleneckIndex = 0;
  legDetails.forEach((l, idx) => {
    if (l.spread > maxSpread) {
      maxSpread = l.spread;
      bottleneckIndex = idx;
    }
  });

  const legBreakdowns: LegSpreadBreakdown[] = legDetails.map((l, idx) => {
    const contrib = totalLegSpreadSum > 0 ? Math.round((l.spread / totalLegSpreadSum) * 100) : 0;
    const isBottleneck = idx === bottleneckIndex && legs.length > 1;
    let estLiquidity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (l.spread <= 0.05) estLiquidity = 'HIGH';
    else if (l.spread >= 0.18) estLiquidity = 'LOW';

    return {
      legId: l.legId,
      label: l.label,
      type: l.type,
      action: l.action,
      strike: l.strike,
      expiration: l.expiration,
      dte: l.dte,
      bid: l.bid,
      ask: l.ask,
      spread: l.spread,
      spreadContributionPct: contrib,
      isBottleneck,
      estLiquidity,
    };
  });

  // 3. Compute Net Natural Bid & Net Natural Ask
  // If Buying strategy: pay Asks of Buy legs, receive Bids of Sell legs
  let netNaturalAsk = 0;
  let netNaturalBid = 0;

  legDetails.forEach((l) => {
    if (l.action === 'buy') {
      netNaturalAsk += l.ask * l.contracts;
      netNaturalBid += l.bid * l.contracts;
    } else {
      netNaturalAsk -= l.bid * l.contracts;
      netNaturalBid -= l.ask * l.contracts;
    }
  });

  netNaturalAsk = Number(netNaturalAsk.toFixed(2));
  netNaturalBid = Number(netNaturalBid.toFixed(2));

  const naturalSpread = Number(Math.abs(netNaturalAsk - netNaturalBid).toFixed(2));
  const naturalMidPrice = Number(((netNaturalAsk + netNaturalBid) / 2).toFixed(2));
  const naturalSpreadPct = naturalMidPrice !== 0
    ? Number(((naturalSpread / Math.abs(naturalMidPrice)) * 100).toFixed(1))
    : 0;

  // 4. Compute Complex Order Book (COB) Quotes with Price Improvement
  // Institutional COB market makers typically quote 25% to 45% tighter than legging in naturally
  const improvementFraction = legs.length >= 3 ? 0.38 : 0.32;
  const cobSpread = Number(Math.max(0.01, naturalSpread * (1 - improvementFraction)).toFixed(2));
  const cobMidPrice = naturalMidPrice;
  const cobBestBid = Number((cobMidPrice - cobSpread / 2).toFixed(2));
  const cobBestAsk = Number((cobMidPrice + cobSpread / 2).toFixed(2));

  const priceImprovementPotential = Number(Math.max(0, (naturalSpread - cobSpread) / 2).toFixed(2));
  const priceImprovementProb = Math.min(88, Math.max(45, Math.round(72 - naturalSpread * 8)));

  // Liquidity Rating
  let liquidityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
  let liquidityLabel = 'Active Institutional Liquidity';
  if (naturalSpread <= 0.08 || naturalSpreadPct <= 2.5) {
    liquidityRating = 'EXCELLENT';
    liquidityLabel = 'Tier 1 Tight Spread (Near-Zero Slippage)';
  } else if (naturalSpread <= 0.16 || naturalSpreadPct <= 5.0) {
    liquidityRating = 'GOOD';
    liquidityLabel = 'Standard COB Liquidity (High Fill Rate)';
  } else if (naturalSpread <= 0.35 || naturalSpreadPct <= 10.0) {
    liquidityRating = 'FAIR';
    liquidityLabel = 'Moderate Spread (Use Midpoint Peg)';
  } else {
    liquidityRating = 'POOR';
    liquidityLabel = 'Wide Complex Spread (Limit Orders Only)';
  }

  // 5. Generate Multi-Tier Strategy Complex Order Book (COB) Depth Ladder (6 levels)
  const ladder: StrategyDepthLevel[] = [];
  const baseSize = Math.max(15, Math.round(65 / Math.sqrt(legs.length)));
  const seed = (Math.round(Math.abs(naturalMidPrice * 100)) + legs.length * 19) % 100;

  let cumBid = 0;
  let cumAsk = 0;

  const tickStep = naturalMidPrice > 5.0 ? 0.05 : 0.01;

  for (let lvl = 1; lvl <= 6; lvl++) {
    const venue = COB_VENUES[(seed + lvl * 3) % COB_VENUES.length];
    const bidSize = Math.max(5, Math.round((baseSize + ((seed + lvl * 13) % 30) * 3) * (1.2 - lvl * 0.12)));
    const askSize = Math.max(5, Math.round((baseSize + ((seed + lvl * 17) % 30) * 3) * (1.2 - lvl * 0.12)));

    cumBid += bidSize;
    cumAsk += askSize;

    const bidPrice = Number((cobBestBid - (lvl - 1) * tickStep).toFixed(2));
    const askPrice = Number((cobBestAsk + (lvl - 1) * tickStep).toFixed(2));

    ladder.push({
      level: lvl,
      venue,
      bidPrice,
      bidSize,
      cumBidSize: cumBid,
      askPrice,
      askSize,
      cumAskSize: cumAsk,
      bidPercentOfMax: 0,
      askPercentOfMax: 0,
    });
  }

  // Normalize ladder bars
  const maxLadderSize = Math.max(
    ...ladder.map((l) => l.bidSize),
    ...ladder.map((l) => l.askSize)
  );

  ladder.forEach((l) => {
    l.bidPercentOfMax = Math.round((l.bidSize / maxLadderSize) * 100);
    l.askPercentOfMax = Math.round((l.askSize / maxLadderSize) * 100);
  });

  const totalBidPackages = cumBid;
  const totalAskPackages = cumAsk;
  const packageImbalancePct = Number(
    (((totalBidPackages - totalAskPackages) / (totalBidPackages + totalAskPackages)) * 100).toFixed(1)
  );

  const bottleneckSummary = legs.length > 1
    ? `Leg ${bottleneckIndex + 1} (${legDetails[bottleneckIndex].label}) accounts for ${legBreakdowns[bottleneckIndex].spreadContributionPct}% of total strategy spread.`
    : 'Single leg strategy (Standard BBO quote).';

  return {
    strategyName: legs.length === 2 ? '2-Leg Spread' : legs.length === 3 ? '3-Leg Strategy' : legs.length === 4 ? '4-Leg Combo' : `${legs.length}-Leg Complex Strategy`,
    ticker: tickerSymbol,
    underlyingPrice,
    legsCount: legs.length,
    multiplier,

    netNaturalBid,
    netNaturalAsk,
    naturalSpread,
    naturalMidPrice,
    naturalSpreadPct,

    cobBestBid,
    cobBestAsk,
    cobSpread,
    cobMidPrice,
    priceImprovementPotential,
    priceImprovementProb,

    liquidityRating,
    liquidityLabel,
    maxAvailablePackageSize: ladder[0]?.askSize || 25,

    ladder,
    totalBidPackages,
    totalAskPackages,
    packageImbalancePct,

    legBreakdowns,
    bottleneckSummary,
  };
}

/**
 * Institutional Execution Slip generator for Multi-Leg Strategy Execution.
 */
export interface ComplexExecutionSlip {
  orderId: string;
  executionId: string;
  timestamp: string;
  ticker: string;
  strategyName: string;
  contracts: number;
  orderType: 'LIMIT' | 'MARKET' | 'MIDPOINT_PEG' | 'COMPLEX_AUCTION';
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  targetLimitPrice: number;
  filledPrice: number;
  isDebit: boolean;
  totalNetCash: number;
  priceImprovementSaved: number;
  executionVenue: string;
  regulatoryFees: {
    secFee: number;
    finraOrf: number;
    occClearing: number;
    exchangeRouting: number;
    totalFees: number;
  };
  legsExecuted: {
    legId: string;
    action: 'BUY' | 'SELL';
    type: string;
    strike: number;
    expiration: string;
    contracts: number;
    fillPrice: number;
    exchange: string;
  }[];
}

/**
 * Simulate institutional Complex Order Book (COB) execution with realistic price improvement.
 */
export function executeComplexStrategyOrder(
  legs: TradeLeg[],
  strategyName: string,
  tickerSymbol: string,
  contractsCount: number,
  orderType: 'LIMIT' | 'MARKET' | 'MIDPOINT_PEG' | 'COMPLEX_AUCTION',
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK',
  userLimitPrice: number,
  multiplier: number = 100
): {
  order: Order;
  position: Position;
  slip: ComplexExecutionSlip;
} {
  const depth = calculateStrategyMarketDepth(legs, 500, tickerSymbol, multiplier);

  // Determine filled price
  let filledPrice = userLimitPrice;
  let priceImprovementSaved = 0;

  if (orderType === 'MARKET') {
    // Fills at COB Best Ask (if debit) or COB Best Bid (if credit)
    filledPrice = depth.cobBestAsk;
  } else if (orderType === 'MIDPOINT_PEG' || orderType === 'COMPLEX_AUCTION') {
    // Fills at or 1 cent better than midpoint
    filledPrice = depth.cobMidPrice;
    priceImprovementSaved = Number(
      (Math.abs(depth.netNaturalAsk - filledPrice) * contractsCount * multiplier).toFixed(2)
    );
  } else {
    // Limit order: fills at limit or improves to midpoint if limit is aggressive
    filledPrice = userLimitPrice;
    if (Math.abs(userLimitPrice) > Math.abs(depth.cobMidPrice)) {
      priceImprovementSaved = Number(
        (Math.abs(userLimitPrice - depth.cobMidPrice) * contractsCount * multiplier * 0.5).toFixed(2)
      );
    }
  }

  const isDebit = filledPrice >= 0;
  const totalNetCash = Number((Math.abs(filledPrice) * contractsCount * multiplier).toFixed(2));

  // Regulatory fees calculation
  const totalLegContracts = legs.reduce((acc, l) => acc + l.contracts, 0) * contractsCount;
  const occClearing = Number((totalLegContracts * 0.05).toFixed(2));
  const finraOrf = Number((totalLegContracts * 0.02).toFixed(2));
  const secFee = isDebit ? 0 : Number((totalNetCash * 0.0000278).toFixed(2));
  const exchangeRouting = Number((totalLegContracts * 0.12).toFixed(2));
  const totalFees = Number((occClearing + finraOrf + secFee + exchangeRouting).toFixed(2));

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
  const execId = `COB-X${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderId = `ORD-COB-${Date.now()}`;
  const venue = COB_VENUES[Math.floor(Math.random() * COB_VENUES.length)];

  // Create Legs with executed fill prices
  const legsExecuted = legs.map((leg, idx) => ({
    legId: leg.id,
    action: leg.action.toUpperCase() as 'BUY' | 'SELL',
    type: leg.type.toUpperCase(),
    strike: leg.strike,
    expiration: leg.expiration,
    contracts: leg.contracts * contractsCount,
    fillPrice: Number((leg.premium + (idx % 2 === 0 ? 0.01 : -0.01)).toFixed(2)),
    exchange: COB_VENUES[(idx * 2) % COB_VENUES.length],
  }));

  const order: Order = {
    id: orderId,
    timestamp: timeStr,
    ticker: tickerSymbol,
    strategyName: `${strategyName} (${contractsCount}x)`,
    type: orderType === 'MARKET' ? 'market' : 'limit',
    limitPrice: filledPrice,
    legs: legs.map((l) => ({ ...l, contracts: l.contracts * contractsCount })),
    contracts: contractsCount,
    netDebitCredit: isDebit ? totalNetCash : -totalNetCash,
    totalCost: totalNetCash + totalFees,
    status: 'filled',
    assetCategory: 'option',
    sharesOrContracts: contractsCount,
  };

  const position: Position = {
    id: `pos-${tickerSymbol}-${Date.now()}`,
    ticker: tickerSymbol,
    strategyName,
    openedAt: timeStr,
    legs: legs.map((l) => ({ ...l, contracts: l.contracts * contractsCount })),
    contracts: contractsCount,
    entryCost: isDebit ? totalNetCash : -totalNetCash,
    currentMark: isDebit ? totalNetCash : -totalNetCash,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    assetCategory: 'option',
    sharesOrContracts: contractsCount,
  };

  const slip: ComplexExecutionSlip = {
    orderId,
    executionId: execId,
    timestamp: timeStr,
    ticker: tickerSymbol,
    strategyName,
    contracts: contractsCount,
    orderType,
    timeInForce,
    targetLimitPrice: userLimitPrice,
    filledPrice,
    isDebit,
    totalNetCash,
    priceImprovementSaved,
    executionVenue: venue,
    regulatoryFees: {
      secFee,
      finraOrf,
      occClearing,
      exchangeRouting,
      totalFees,
    },
    legsExecuted,
  };

  return { order, position, slip };
}
