import { Ticker, TradeLeg } from '../types/options';

export type ExchangeVenue = 'CBOE' | 'ISE' | 'PHLX' | 'MX' | 'TSX';

export type RoutingOptimizationMode =
  | 'MIN_SLIPPAGE'
  | 'MAX_REBATE'
  | 'FAST_FILL'
  | 'BALANCED_CROSS_BORDER';

export interface ExchangeLiquidityProfile {
  exchange: ExchangeVenue;
  name: string;
  fullName: string;
  country: 'US' | 'CA';
  flag: string;
  currency: 'USD' | 'CAD';
  description: string;
  bid: number;
  ask: number;
  spread: number;
  spreadBps: number;
  depthSize: number; // Available contracts at top-of-book
  totalBookDepth: number; // Cumulative 5-level depth in contracts
  rebateFeePerContract: number; // Negative = rebate received, Positive = exchange fee charged
  latencyMicros: number; // Microseconds execution latency
  liquidityScore: number; // 0 - 100 rating
  fillProbability: number; // 0 - 100%
  isCanadian: boolean;
  marketSharePct: number;
}

export interface LegExchangeAllocation {
  exchange: ExchangeVenue;
  exchangeName: string;
  country: 'US' | 'CA';
  flag: string;
  contracts: number;
  fillPrice: number;
  percentOfLeg: number;
  priceImprovement: number;
  estimatedSlippage: number;
  rebateFeeTotal: number;
  latencyMicros: number;
  rationale: string;
}

export interface LegRoutingSplit {
  legId: string;
  action: 'buy' | 'sell';
  type: string;
  strike: number;
  expiration: string;
  dte: number;
  totalContracts: number;
  baseQuotedPrice: number;
  weightedFillPrice: number;
  legSlippageSavings: number;
  allocations: LegExchangeAllocation[];
}

export interface VenueSummaryAllocation {
  exchange: ExchangeVenue;
  exchangeName: string;
  country: 'US' | 'CA';
  flag: string;
  totalContracts: number;
  percentOfTotalOrder: number;
  averageFillPrice: number;
  totalNotionalUsd: number;
  legsHandled: string[];
  rebateFeeContribution: number;
  fillSpeedRank: number;
}

export interface SmartOrderRoutingPlan {
  strategyName: string;
  symbol: string;
  underlyingPrice: number;
  totalOrderSets: number;
  totalContractsOverall: number;
  isDebit: boolean;
  optimizationMode: RoutingOptimizationMode;
  includeCanadianExchanges: boolean;
  isDualListedOrCrossBorder: boolean;
  
  // Baseline vs Smart Routed execution
  singleVenueBenchmarkVenue: ExchangeVenue;
  singleVenueBenchmarkPrice: number;
  smartRoutedPrice: number;
  netSlippagePerShare: number;
  totalSlippageSavingsDollars: number;
  totalPriceImprovementDollars: number;
  effectiveExecutionSpeedMicros: number;
  
  // Leg level breakdown & Exchange allocation
  legSplits: LegRoutingSplit[];
  exchangeAllocations: VenueSummaryAllocation[];
  liquidityProfiles: ExchangeLiquidityProfile[];
  
  timestamp: string;
  algorithmVersion: string;
}

// Known Canadian dual-listed/inter-listed stocks on TSX and US markets
export const CANADIAN_DUAL_LISTED_SYMBOLS = new Set([
  'RY', 'TD', 'BMO', 'BNS', 'CM', 'SHOP', 'ENB', 'CNQ', 'SU', 'TRP',
  'CP', 'CNR', 'BAM', 'BN', 'ABX', 'AEM', 'FNV', 'WPM', 'NTR', 'CCO',
  'MFC', 'SLF', 'GIB', 'QSR', 'LSPD', 'OTEX', 'CVE', 'IMO', 'POW', 'XIU'
]);

/**
 * Generates dynamic liquidity profiles across US (CBOE, ISE, PHLX) and Canadian (MX, TSX) exchanges.
 */
export function generateExchangeLiquidityProfiles(
  ticker: Ticker,
  legs: TradeLeg[],
  baseNetPrice: number,
  isDebit: boolean,
  pulseSeed: number = 0
): ExchangeLiquidityProfile[] {
  const isDualListed = CANADIAN_DUAL_LISTED_SYMBOLS.has(ticker.symbol.toUpperCase().replace('.TO', '')) ||
    ticker.symbol.endsWith('.TO') ||
    ticker.symbol.startsWith('/');

  const seed = (Math.round(ticker.price * 10) + legs.reduce((s, l) => s + (l.strike || 0), 0) + pulseSeed * 7) % 100;
  const absPrice = Math.max(0.20, Math.abs(baseNetPrice));
  const baseSpread = Math.max(0.02, Number((absPrice * 0.045).toFixed(2)));

  // 1. CBOE (Chicago Board Options Exchange) - Primary US Liquidity Giant
  const cboeSpread = Number(Math.max(0.01, baseSpread * 0.85).toFixed(2));
  const cboeBid = isDebit ? Number((absPrice - cboeSpread / 2).toFixed(2)) : Number((absPrice + cboeSpread / 2).toFixed(2));
  const cboeAsk = Number((cboeBid + cboeSpread).toFixed(2));
  const cboeDepth = Math.round(120 + ((seed * 11) % 140));

  // 2. ISE (Nasdaq ISE Complex Order Match) - Aggressive Retail Price Improvement & Rebates
  const iseSpread = Number(Math.max(0.01, baseSpread * 0.82).toFixed(2));
  const iseBid = Number((cboeBid + (seed % 2 === 0 ? 0.01 : 0.00)).toFixed(2));
  const iseAsk = Number((iseBid + iseSpread).toFixed(2));
  const iseDepth = Math.round(95 + ((seed * 7) % 110));

  // 3. PHLX (Nasdaq PHLX Complex Spread Book) - Institutional Complex Orders & Deep Wing Bids
  const phlxSpread = Number(Math.max(0.01, baseSpread * 0.88).toFixed(2));
  const phlxBid = Number((cboeBid - (seed % 3 === 0 ? 0.01 : 0.00)).toFixed(2));
  const phlxAsk = Number((phlxBid + phlxSpread).toFixed(2));
  const phlxDepth = Math.round(85 + ((seed * 13) % 105));

  // 4. MX (Bourse de Montréal / Montreal Exchange) - Canada's National Derivatives Exchange
  // Deep native liquidity for dual-listed equities, Canadian ETFs & cross-border arbitrage
  const mxSpreadBonus = isDualListed ? 0.78 : 1.15;
  const mxSpread = Number(Math.max(0.02, baseSpread * mxSpreadBonus).toFixed(2));
  const mxBid = Number((cboeBid + (isDualListed ? 0.01 : -0.01)).toFixed(2));
  const mxAsk = Number((mxBid + mxSpread).toFixed(2));
  const mxDepth = isDualListed ? Math.round(110 + ((seed * 9) % 130)) : Math.round(40 + ((seed * 5) % 45));

  // 5. TSX (TSX Alpha / TSX Options & CX2) - Inverted Maker-Taker Rebate Structure
  const tsxSpread = Number(Math.max(0.02, baseSpread * (isDualListed ? 0.84 : 1.25)).toFixed(2));
  const tsxBid = Number((cboeBid - 0.01).toFixed(2));
  const tsxAsk = Number((tsxBid + tsxSpread).toFixed(2));
  const tsxDepth = isDualListed ? Math.round(75 + ((seed * 17) % 80)) : Math.round(25 + ((seed * 3) % 30));

  return [
    {
      exchange: 'CBOE',
      name: 'CBOE COB',
      fullName: 'Chicago Board Options Exchange (Complex Order Book)',
      country: 'US',
      flag: '🇺🇸',
      currency: 'USD',
      description: 'Primary US complex order book with deepest national top-of-book liquidity.',
      bid: cboeBid,
      ask: cboeAsk,
      spread: cboeSpread,
      spreadBps: Number(((cboeSpread / absPrice) * 10000).toFixed(0)),
      depthSize: cboeDepth,
      totalBookDepth: Math.round(cboeDepth * 4.2),
      rebateFeePerContract: 0.18, // standard fee
      latencyMicros: 85,
      liquidityScore: 98,
      fillProbability: 99.4,
      isCanadian: false,
      marketSharePct: 38.5,
    },
    {
      exchange: 'ISE',
      name: 'Nasdaq ISE',
      fullName: 'Nasdaq ISE Complex Order Match',
      country: 'US',
      flag: '🇺🇸',
      currency: 'USD',
      description: 'Auction-based price improvement engine offering tight midpoint allocations.',
      bid: iseBid,
      ask: iseAsk,
      spread: iseSpread,
      spreadBps: Number(((iseSpread / absPrice) * 10000).toFixed(0)),
      depthSize: iseDepth,
      totalBookDepth: Math.round(iseDepth * 3.8),
      rebateFeePerContract: -0.12, // rebate paid for posting complex orders
      latencyMicros: 98,
      liquidityScore: 94,
      fillProbability: 97.8,
      isCanadian: false,
      marketSharePct: 26.2,
    },
    {
      exchange: 'PHLX',
      name: 'Nasdaq PHLX',
      fullName: 'Nasdaq PHLX Complex Spread Book',
      country: 'US',
      flag: '🇺🇸',
      currency: 'USD',
      description: 'Institutional spread engine with specialized multi-leg wing fills.',
      bid: phlxBid,
      ask: phlxAsk,
      spread: phlxSpread,
      spreadBps: Number(((phlxSpread / absPrice) * 10000).toFixed(0)),
      depthSize: phlxDepth,
      totalBookDepth: Math.round(phlxDepth * 3.5),
      rebateFeePerContract: 0.15,
      latencyMicros: 115,
      liquidityScore: 89,
      fillProbability: 95.2,
      isCanadian: false,
      marketSharePct: 20.4,
    },
    {
      exchange: 'MX',
      name: 'Montreal Exchange (MX)',
      fullName: 'Bourse de Montréal / Montreal Exchange Derivatives',
      country: 'CA',
      flag: '🇨🇦',
      currency: 'CAD',
      description: 'Canada’s flagship options exchange. Ultra-tight spreads on dual-listed equities.',
      bid: mxBid,
      ask: mxAsk,
      spread: mxSpread,
      spreadBps: Number(((mxSpread / absPrice) * 10000).toFixed(0)),
      depthSize: mxDepth,
      totalBookDepth: Math.round(mxDepth * 3.6),
      rebateFeePerContract: isDualListed ? -0.18 : 0.08, // maker incentive on inter-listed
      latencyMicros: 145,
      liquidityScore: isDualListed ? 95 : 74,
      fillProbability: isDualListed ? 98.2 : 82.5,
      isCanadian: true,
      marketSharePct: isDualListed ? 11.2 : 3.4,
    },
    {
      exchange: 'TSX',
      name: 'TSX Alpha / Options',
      fullName: 'Toronto Stock Exchange Alpha & CX2 Spread Engine',
      country: 'CA',
      flag: '🇨🇦',
      currency: 'CAD',
      description: 'Inverted fee Canadian venue designed for anti-adverse selection routing.',
      bid: tsxBid,
      ask: tsxAsk,
      spread: tsxSpread,
      spreadBps: Number(((tsxSpread / absPrice) * 10000).toFixed(0)),
      depthSize: tsxDepth,
      totalBookDepth: Math.round(tsxDepth * 2.9),
      rebateFeePerContract: -0.25, // heavy inverted rebate
      latencyMicros: 165,
      liquidityScore: isDualListed ? 86 : 65,
      fillProbability: isDualListed ? 91.5 : 71.0,
      isCanadian: true,
      marketSharePct: isDualListed ? 3.7 : 1.5,
    },
  ];
}

/**
 * Calculates algorithmic Smart Order Routing splits across CBOE, ISE, PHLX, MX and TSX.
 * Automatically slices large multi-leg orders to minimize slippage, maximize rebates, and optimize fills.
 */
export function calculateSmartOrderRoutingPlan(
  ticker: Ticker,
  legs: TradeLeg[],
  strategyName: string,
  totalOrderSets: number,
  unitLimitPrice: number,
  isDebit: boolean,
  optimizationMode: RoutingOptimizationMode = 'MIN_SLIPPAGE',
  includeCanadianExchanges: boolean = true,
  pulseSeed: number = 0
): SmartOrderRoutingPlan {
  const multiplier = ticker.multiplier || (ticker.symbol.startsWith('/') ? 50 : 100);
  const isDualListed = CANADIAN_DUAL_LISTED_SYMBOLS.has(ticker.symbol.toUpperCase().replace('.TO', '')) ||
    ticker.symbol.endsWith('.TO') ||
    ticker.symbol.startsWith('/');

  // Generate real-time liquidity profiles
  const profiles = generateExchangeLiquidityProfiles(ticker, legs, unitLimitPrice, isDebit, pulseSeed);

  // Filter available venues based on user toggle
  const availableProfiles = includeCanadianExchanges
    ? profiles
    : profiles.filter((p) => !p.isCanadian);

  const totalContractsOverall = legs.reduce((acc, l) => acc + (l.contracts || 1) * totalOrderSets, 0);

  // Benchmark: Sending 100% of the entire multi-leg order to a single venue (CBOE)
  // Large orders suffer market impact / book sweep slippage
  const singleVenueSweepSlippageRate = Math.min(
    0.15,
    Math.max(0.015, (totalContractsOverall / 150) * 0.025)
  );
  const benchmarkSinglePrice = isDebit
    ? Number((unitLimitPrice + singleVenueSweepSlippageRate).toFixed(2))
    : Number((unitLimitPrice - singleVenueSweepSlippageRate).toFixed(2));

  // Determine ideal venue ranking per leg based on optimization mode
  const legSplits: LegRoutingSplit[] = legs.map((leg, legIndex) => {
    const totalLegContracts = (leg.contracts || 1) * totalOrderSets;
    const baseQuotedPrice = leg.premium || 1.50;

    // Weight venues based on optimization objective
    const scoredVenues = availableProfiles.map((venue) => {
      let score = venue.liquidityScore;

      if (optimizationMode === 'MIN_SLIPPAGE') {
        // Prioritize tight spread and book depth
        score += (100 - venue.spreadBps / 5) * 0.5 + (venue.depthSize / 2);
      } else if (optimizationMode === 'MAX_REBATE') {
        // Prioritize negative fees (rebates)
        score += (-venue.rebateFeePerContract * 200);
      } else if (optimizationMode === 'FAST_FILL') {
        // Prioritize lowest latency
        score += (200 - venue.latencyMicros);
      } else if (optimizationMode === 'BALANCED_CROSS_BORDER' && isDualListed) {
        // Boost Canadian venues for cross-border optimization
        if (venue.isCanadian) score += 40;
      }

      // Leg-specific routing nuance:
      // Buying legs prefer deep ask venues (CBOE, ISE)
      // Selling legs prefer aggressive price improvement or rebate venues (ISE, MX, TSX)
      if (leg.action === 'buy') {
        if (venue.exchange === 'CBOE') score += 15;
        if (venue.exchange === 'ISE') score += 10;
      } else {
        if (venue.exchange === 'PHLX') score += 12;
        if (venue.exchange === 'MX' && isDualListed) score += 18;
        if (venue.exchange === 'TSX' && isDualListed) score += 14;
      }

      return { venue, score };
    }).sort((a, b) => b.score - a.score);

    // Smart splitting algorithm:
    // If order is small (<= 5 contracts), send 100% to best single venue to avoid fragmenting
    // If order is medium (6 - 25 contracts), split across top 2 venues
    // If order is large (> 25 contracts), split across top 3 or 4 venues based on capacity
    const allocations: LegExchangeAllocation[] = [];
    let remainingToAllocate = totalLegContracts;

    if (totalLegContracts <= 5) {
      // 100% to primary winner
      const winner = scoredVenues[0].venue;
      const priceImp = Number((Math.min(0.04, winner.spread * 0.35)).toFixed(2));
      const fillP = leg.action === 'buy' ? Number((baseQuotedPrice - priceImp).toFixed(2)) : Number((baseQuotedPrice + priceImp).toFixed(2));

      allocations.push({
        exchange: winner.exchange,
        exchangeName: winner.name,
        country: winner.country,
        flag: winner.flag,
        contracts: totalLegContracts,
        fillPrice: fillP,
        percentOfLeg: 100,
        priceImprovement: priceImp,
        estimatedSlippage: 0.00,
        rebateFeeTotal: Number((winner.rebateFeePerContract * totalLegContracts).toFixed(2)),
        latencyMicros: winner.latencyMicros,
        rationale: `${winner.name}: Highest inside liquidity score (${winner.liquidityScore}/100) & minimum latency (${winner.latencyMicros}μs)`,
      });
    } else {
      // Multi-exchange split distribution
      const maxVenuesToUse = totalLegContracts > 35 ? Math.min(4, scoredVenues.length) : Math.min(3, scoredVenues.length);
      const topVenues = scoredVenues.slice(0, maxVenuesToUse);
      const sumScores = topVenues.reduce((acc, v) => acc + v.score, 0);

      topVenues.forEach((sv, idx) => {
        const isLast = idx === topVenues.length - 1;
        let qty: number;

        if (isLast) {
          qty = remainingToAllocate;
        } else {
          const rawProportion = sv.score / sumScores;
          qty = Math.max(1, Math.min(remainingToAllocate - 1, Math.round(totalLegContracts * rawProportion)));
          remainingToAllocate -= qty;
        }

        if (qty > 0) {
          // Calculate price improvement and micro-slippage reduction for this chunk
          const baseImp = Number((Math.min(0.045, sv.venue.spread * 0.40)).toFixed(2));
          // Minor slippage discount if chunk exceeds 50% of venue's top-of-book depth
          const chunkImpact = qty > sv.venue.depthSize ? 0.01 : 0.00;
          const netImp = Math.max(0.005, Number((baseImp - chunkImpact).toFixed(2)));
          const fillP = leg.action === 'buy'
            ? Number((baseQuotedPrice - netImp).toFixed(2))
            : Number((baseQuotedPrice + netImp).toFixed(2));

          let rationale = '';
          if (sv.venue.exchange === 'CBOE') {
            rationale = `Deepest COB book capacity (absorbed ${qty} contracts with 0.0¢ market impact)`;
          } else if (sv.venue.exchange === 'ISE') {
            rationale = `Price improvement auction matched +$${(netImp * 100).toFixed(0)}¢ inside NBBO`;
          } else if (sv.venue.exchange === 'PHLX') {
            rationale = `Complex spread wing matching & synchronous quote lock`;
          } else if (sv.venue.exchange === 'MX') {
            rationale = `Canadian inter-listed market maker cross liquidity (${isDualListed ? 'Dual-listed tight spread' : 'Cross-border bridge'})`;
          } else if (sv.venue.exchange === 'TSX') {
            rationale = `Inverted rebate capture (${Math.abs(sv.venue.rebateFeePerContract * 100).toFixed(0)}¢ credit/contract) & latency isolation`;
          }

          allocations.push({
            exchange: sv.venue.exchange,
            exchangeName: sv.venue.name,
            country: sv.venue.country,
            flag: sv.venue.flag,
            contracts: qty,
            fillPrice: fillP,
            percentOfLeg: Number(((qty / totalLegContracts) * 100).toFixed(1)),
            priceImprovement: netImp,
            estimatedSlippage: chunkImpact,
            rebateFeeTotal: Number((sv.venue.rebateFeePerContract * qty).toFixed(2)),
            latencyMicros: sv.venue.latencyMicros,
            rationale,
          });
        }
      });
    }

    // Weighted fill price across all venues for this leg
    const totalAllocQty = allocations.reduce((s, a) => s + a.contracts, 0) || 1;
    const weightedFill = Number(
      (allocations.reduce((s, a) => s + a.fillPrice * a.contracts, 0) / totalAllocQty).toFixed(2)
    );

    // Slippage savings vs sweeping full size on single exchange
    const singleVenueLegSlippage = (totalLegContracts / 120) * 0.03;
    const legSavings = Number((singleVenueLegSlippage * multiplier * totalLegContracts).toFixed(2));

    return {
      legId: leg.id,
      action: leg.action,
      type: leg.type,
      strike: leg.strike,
      expiration: leg.expiration,
      dte: leg.dte,
      totalContracts: totalLegContracts,
      baseQuotedPrice,
      weightedFillPrice: weightedFill,
      legSlippageSavings: legSavings,
      allocations,
    };
  });

  // Calculate Exchange Venue Aggregates
  const venueMap = new Map<ExchangeVenue, VenueSummaryAllocation>();

  legSplits.forEach((ls) => {
    ls.allocations.forEach((alloc) => {
      const existing = venueMap.get(alloc.exchange);
      const legTag = `${ls.action.toUpperCase()} ${ls.type.toUpperCase()} $${ls.strike}`;

      if (existing) {
        existing.totalContracts += alloc.contracts;
        existing.totalNotionalUsd += alloc.fillPrice * alloc.contracts * multiplier;
        existing.rebateFeeContribution += alloc.rebateFeeTotal;
        if (!existing.legsHandled.includes(legTag)) {
          existing.legsHandled.push(legTag);
        }
      } else {
        const profile = profiles.find((p) => p.exchange === alloc.exchange);
        venueMap.set(alloc.exchange, {
          exchange: alloc.exchange,
          exchangeName: alloc.exchangeName,
          country: alloc.country,
          flag: alloc.flag,
          totalContracts: alloc.contracts,
          percentOfTotalOrder: 0,
          averageFillPrice: alloc.fillPrice,
          totalNotionalUsd: alloc.fillPrice * alloc.contracts * multiplier,
          legsHandled: [legTag],
          rebateFeeContribution: alloc.rebateFeeTotal,
          fillSpeedRank: profile ? profile.latencyMicros : 100,
        });
      }
    });
  });

  const exchangeAllocations: VenueSummaryAllocation[] = Array.from(venueMap.values()).map((v) => {
    v.percentOfTotalOrder = Number(((v.totalContracts / totalContractsOverall) * 100).toFixed(1));
    v.averageFillPrice = v.totalContracts > 0 ? Number((v.totalNotionalUsd / (v.totalContracts * multiplier)).toFixed(2)) : 0;
    v.rebateFeeContribution = Number(v.rebateFeeContribution.toFixed(2));
    return v;
  }).sort((a, b) => b.totalContracts - a.totalContracts);

  // Overall Smart Routed Net Price
  // Sum of weighted fill prices with appropriate buy/sell signs
  let netSmartPerUnit = 0;
  legs.forEach((l) => {
    const split = legSplits.find((ls) => ls.legId === l.id);
    const p = split ? split.weightedFillPrice : l.premium;
    const sign = l.action === 'buy' ? 1 : -1;
    netSmartPerUnit += sign * p;
  });
  const smartRoutedPrice = Number(Math.max(0.01, Math.abs(netSmartPerUnit)).toFixed(2));

  // Slippage & Price Improvement Totals
  const slippageSavedPerShare = Number(Math.max(0.01, Math.abs(benchmarkSinglePrice - smartRoutedPrice)).toFixed(2));
  const totalSlippageSavingsDollars = Number(
    (slippageSavedPerShare * multiplier * totalOrderSets).toFixed(2)
  );
  const totalPriceImprovementDollars = Number(
    (legSplits.reduce((acc, ls) => {
      const avgImp = ls.allocations.reduce((s, a) => s + a.priceImprovement * a.contracts, 0) / (ls.totalContracts || 1);
      return acc + avgImp * ls.totalContracts * multiplier;
    }, 0)).toFixed(2)
  );

  const effectiveExecutionSpeedMicros = Math.round(
    exchangeAllocations.reduce((acc, v) => acc + v.fillSpeedRank * (v.percentOfTotalOrder / 100), 0) || 95
  );

  return {
    strategyName,
    symbol: ticker.symbol,
    underlyingPrice: ticker.price,
    totalOrderSets,
    totalContractsOverall,
    isDebit,
    optimizationMode,
    includeCanadianExchanges,
    isDualListedOrCrossBorder: isDualListed,
    singleVenueBenchmarkVenue: 'CBOE',
    singleVenueBenchmarkPrice: benchmarkSinglePrice,
    smartRoutedPrice,
    netSlippagePerShare: slippageSavedPerShare,
    totalSlippageSavingsDollars,
    totalPriceImprovementDollars,
    effectiveExecutionSpeedMicros,
    legSplits,
    exchangeAllocations,
    liquidityProfiles: availableProfiles,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    algorithmVersion: 'SOR-v4.8-HYBRID-US-CA',
  };
}
