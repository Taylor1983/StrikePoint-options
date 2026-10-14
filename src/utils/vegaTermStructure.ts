import { ExpirationOptionChain, Ticker, Position, TradeLeg } from '../types/options';
import { normalCDF, normalPDF, calculateBSM } from './blackScholes';

export interface ExpirationVegaPoint {
  dte: number;
  formattedDate: string;
  month: string;
  timeToExpiry: number; // in years (T)
  atmStrike: number;
  atmIV: number;
  atmCallPrice: number;
  atmPutPrice: number;
  atmVega: number; // Vega per share ($ per 1% IV move)
  atmVega100: number; // Vega per 100-share contract ($ per 1% IV move)
  weightedVega30: number; // Constant Maturity 30-Day Weighted Vega = atmVega100 * sqrt(30 / DTE)
  weightedVegaRatio: number; // sqrt(30 / DTE)
  vomma: number; // dVega / dIV (Volga)
  veta: number; // dVega / dt (Vega daily decay in $ / day)
  vegaElasticity: number; // (atmVega100 / (atmCallPrice * 100)) * 100%
  call25DeltaStrike: number;
  call25DeltaVega: number;
  put25DeltaStrike: number;
  put25DeltaVega: number;
  skewRatio: number; // put25DeltaVega / call25DeltaVega
  openInterest: number;
  totalMarketVega: number; // Open Interest * atmVega100 (Market notional Vega)
}

export interface VegaMaturityBucket {
  id: string;
  name: string;
  dteRange: string;
  netVega: number;
  weightedVega: number;
  contractsCount: number;
  description: string;
}

export interface VegaTermStructureAnalysis {
  ticker: string;
  spotPrice: number;
  points: ExpirationVegaPoint[];
  minVega: number;
  maxVega: number;
  frontMonthDte: number;
  frontMonthVega: number;
  backMonthDte: number;
  backMonthVega: number;
  vegaSpread: number; // back - front
  vegaSlopeRatio: number; // back / front
  regime: 'SQUARE_ROOT_EXPANSION' | 'COMPRESSED_CURVE' | 'FLATTENED_INVERSION';
  regimeLabel: string;
  regimeDescription: string;
  calendarSpreadRecommendation: string;
  maturityBuckets: VegaMaturityBucket[];
  totalPortfolioNetVega: number;
  totalPortfolioWeightedVega: number;
}

const RISK_FREE_RATE = 0.045; // 4.5% US Treasury benchmark

/**
 * Calculates complete Vega Term Structure across all option chains
 */
export function calculateVegaTermStructure(
  ticker: Ticker,
  chains: ExpirationOptionChain[],
  positions?: Position[],
  legs?: TradeLeg[]
): VegaTermStructureAnalysis {
  const spot = ticker.price;
  const sortedChains = [...(chains || [])].sort((a, b) => a.dte - b.dte);

  const points: ExpirationVegaPoint[] = sortedChains.map((chain) => {
    const dte = Math.max(1, chain.dte);
    const T = dte / 365;
    const sqrtT = Math.sqrt(T);

    // Find ATM strike closest to spot from calls
    const calls = chain.calls || [];
    const sortedCalls = [...calls].sort(
      (a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot)
    );
    const atmItem = sortedCalls[0];
    const atmStrike = atmItem ? atmItem.strike : spot;
    const atmIV = Math.max(0.05, atmItem?.iv || chain.avgIV || ticker.currentIV || 0.25);

    // Calculate standard ATM BSM
    const bsmCall = calculateBSM(spot, atmStrike, T, atmIV, 'call', RISK_FREE_RATE);
    const bsmPut = calculateBSM(spot, atmStrike, T, atmIV, 'put', RISK_FREE_RATE);

    // BSM Vega components:
    // d1 = (ln(S/K) + (r + sigma^2/2)T) / (sigma * sqrt(T))
    const d1 = (Math.log(spot / atmStrike) + (RISK_FREE_RATE + 0.5 * atmIV * atmIV) * T) / (atmIV * sqrtT);
    const d2 = d1 - atmIV * sqrtT;
    const pdfD1 = normalPDF(d1);

    // Absolute Vega per share ($ per 1% change in vol)
    const atmVega = Number(((spot * sqrtT * pdfD1) / 100).toFixed(4));
    // Vega per 100-share contract
    const atmVega100 = Number((atmVega * 100).toFixed(2));

    // Constant Maturity 30-Day Weighted Vega = Vega * sqrt(30 / DTE)
    const weightedVegaRatio = Number((Math.sqrt(30 / dte)).toFixed(3));
    const weightedVega30 = Number((atmVega100 * weightedVegaRatio).toFixed(2));

    // Second-order Greeks:
    // Vomma (Volga) = dVega / dIV = Vega * (d1 * d2 / sigma)
    const vomma = Number(((atmVega * (d1 * d2 / atmIV)) * 100).toFixed(4));

    // Veta = dVega / dt (Daily decay in Vega per day of time decay)
    // Veta = -S * phi(d1) * sqrt(T) * [ (r * d1) / (sigma * sqrt(T)) - (1 + d1*d2)/(2T) ] / (100 * 365)
    const bracket = (RISK_FREE_RATE * d1) / (atmIV * sqrtT) - (1 + d1 * d2) / (2 * T);
    const veta = Number(((-spot * pdfD1 * sqrtT * bracket * 100) / (100 * 365)).toFixed(4));

    // Vega Elasticity = % Vega sensitivity per dollar of premium
    const avgPrem = Math.max(0.50, (bsmCall.price + bsmPut.price) / 2);
    const vegaElasticity = Number(((atmVega100 / (avgPrem * 100)) * 100).toFixed(1));

    // Approximate 25-Delta strikes using Black-Scholes inversion
    // For 25-delta call, d1 ≈ 0.6745. For 25-delta put, d1 ≈ -0.6745
    const call25Strike = Number((spot * Math.exp(0.6745 * atmIV * sqrtT)).toFixed(1));
    const put25Strike = Number((spot * Math.exp(-0.6745 * atmIV * sqrtT)).toFixed(1));

    const bsmCall25 = calculateBSM(spot, call25Strike, T, atmIV * 0.98, 'call', RISK_FREE_RATE);
    const bsmPut25 = calculateBSM(spot, put25Strike, T, atmIV * 1.05, 'put', RISK_FREE_RATE);

    const call25DeltaVega = Number((bsmCall25.greeks.vega * 100).toFixed(2));
    const put25DeltaVega = Number((bsmPut25.greeks.vega * 100).toFixed(2));
    const skewRatio = call25DeltaVega > 0 ? Number((put25DeltaVega / call25DeltaVega).toFixed(2)) : 1.0;

    // Aggregate open interest and market total Vega
    const totalCallsOI = (chain.calls || []).reduce(
      (sum: number, c) => sum + (c.openInterest || 0),
      0
    );
    const totalPutsOI = (chain.puts || []).reduce(
      (sum: number, p) => sum + (p.openInterest || 0),
      0
    );
    const totalOI = totalCallsOI + totalPutsOI;
    const totalMarketVega = Number(((totalOI * atmVega100) / 1000).toFixed(1)); // in $ thousands

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const expDate = new Date(Date.now() + dte * 86400000);
    const month = monthNames[expDate.getMonth()];
    const formattedDate = `${month} ${String(expDate.getDate()).padStart(2, '0')} '${String(expDate.getFullYear()).slice(-2)}`;

    return {
      dte,
      formattedDate,
      month,
      timeToExpiry: Number(T.toFixed(4)),
      atmStrike,
      atmIV,
      atmCallPrice: Number(bsmCall.price.toFixed(2)),
      atmPutPrice: Number(bsmPut.price.toFixed(2)),
      atmVega,
      atmVega100,
      weightedVega30,
      weightedVegaRatio,
      vomma,
      veta,
      vegaElasticity,
      call25DeltaStrike: call25Strike,
      call25DeltaVega,
      put25DeltaStrike: put25Strike,
      put25DeltaVega,
      skewRatio,
      openInterest: totalOI,
      totalMarketVega,
    };
  });

  const allVegas = points.map((p) => p.atmVega100);
  const minVega = allVegas.length > 0 ? Math.min(...allVegas) : 5;
  const maxVega = allVegas.length > 0 ? Math.max(...allVegas) : 100;

  const frontMonthPoint = points[0] || { dte: 7, atmVega100: 10 };
  const backMonthPoint = points[points.length - 1] || { dte: 365, atmVega100: 95 };

  const frontMonthVega = frontMonthPoint.atmVega100;
  const backMonthVega = backMonthPoint.atmVega100;
  const vegaSpread = Number((backMonthVega - frontMonthVega).toFixed(2));
  const vegaSlopeRatio = frontMonthVega > 0 ? Number((backMonthVega / frontMonthVega).toFixed(2)) : 1.0;

  // Regime classification
  let regime: 'SQUARE_ROOT_EXPANSION' | 'COMPRESSED_CURVE' | 'FLATTENED_INVERSION' = 'SQUARE_ROOT_EXPANSION';
  let regimeLabel = 'Standard Square-Root of Time (√T) Expansion';
  let regimeDescription =
    'Normal market regime: Absolute Vega expands monotonically with expiration maturity, rewarding long back-month calendar structures while front-month provides high theta decay efficiency.';
  let calendarSpreadRecommendation =
    'Long Calendar Spreads (Sell Front, Buy Back): Captures steep theta decay on short-dated legs while maintaining low Vega risk drag.';

  if (vegaSlopeRatio < 2.5 && backMonthPoint.dte >= 120) {
    regime = 'COMPRESSED_CURVE';
    regimeLabel = 'Compressed Long-End Vega Term Structure';
    regimeDescription =
      'Back-month options are exhibiting lower-than-normal Vega expansion relative to front-month tenors. High event risk or earnings in the front end is inflating short-term Vega sensitivity.';
    calendarSpreadRecommendation =
      'Diagonal Spreads or Ratio Calendars: Front-month IV spikes make selling near-term premium disproportionately advantageous.';
  } else if (vegaSpread <= 0) {
    regime = 'FLATTENED_INVERSION';
    regimeLabel = 'Severe Volatility Event Inversion';
    regimeDescription =
      'Extreme market backwardation: Short-dated volatility has spiked so violently that front-month gamma and vega dominate trading.';
    calendarSpreadRecommendation =
      'Short Calendar / Reverse Diagonals: Long front-month volatility to capture ongoing squeeze dynamics.';
  }

  // Maturity Buckets Analysis for Portfolio Positions & Legs
  const bucketsMap: Record<string, { netVega: number; weightedVega: number; count: number }> = {
    front: { netVega: 0, weightedVega: 0, count: 0 },
    near: { netVega: 0, weightedVega: 0, count: 0 },
    medium: { netVega: 0, weightedVega: 0, count: 0 },
    midCurve: { netVega: 0, weightedVega: 0, count: 0 },
    leaps: { netVega: 0, weightedVega: 0, count: 0 },
  };

  const processLeg = (dte: number, contracts: number, action: 'buy' | 'sell', spotP: number, strikeP: number, iv: number) => {
    const sign = action === 'buy' ? 1 : -1;
    const T = Math.max(0.001, dte / 365);
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(spotP / strikeP) + (RISK_FREE_RATE + 0.5 * iv * iv) * T) / (iv * sqrtT);
    const pdf = normalPDF(d1);
    const contractVega = (spotP * sqrtT * pdf) * contracts * sign;
    const weightedV = contractVega * Math.sqrt(30 / dte);

    let bucketKey = 'front';
    if (dte <= 21) bucketKey = 'front';
    else if (dte <= 45) bucketKey = 'near';
    else if (dte <= 90) bucketKey = 'medium';
    else if (dte <= 180) bucketKey = 'midCurve';
    else bucketKey = 'leaps';

    bucketsMap[bucketKey].netVega += contractVega;
    bucketsMap[bucketKey].weightedVega += weightedV;
    bucketsMap[bucketKey].count += contracts;
  };

  // 1. Process active builder legs
  if (legs && legs.length > 0) {
    legs.forEach((leg) => {
      if (leg.type === 'call' || leg.type === 'put') {
        processLeg(leg.dte, leg.contracts, leg.action, spot, leg.strike, leg.iv || 0.25);
      }
    });
  }

  // 2. Process account open positions
  if (positions && positions.length > 0) {
    positions.forEach((pos) => {
      pos.legs.forEach((leg) => {
        if (leg.type === 'call' || leg.type === 'put') {
          processLeg(leg.dte, leg.contracts, leg.action, spot, leg.strike, leg.iv || 0.25);
        }
      });
    });
  }

  const maturityBuckets: VegaMaturityBucket[] = [
    {
      id: 'front',
      name: 'Front-Month (0-21D)',
      dteRange: '0 – 21 DTE',
      netVega: Number(bucketsMap.front.netVega.toFixed(2)),
      weightedVega: Number(bucketsMap.front.weightedVega.toFixed(2)),
      contractsCount: bucketsMap.front.count,
      description: 'Event-driven, high gamma, rapid theta decay. Low absolute Vega but high vol-of-vol sensitivity.',
    },
    {
      id: 'near',
      name: 'Near-Term (22-45D)',
      dteRange: '22 – 45 DTE',
      netVega: Number(bucketsMap.near.netVega.toFixed(2)),
      weightedVega: Number(bucketsMap.near.weightedVega.toFixed(2)),
      contractsCount: bucketsMap.near.count,
      description: 'Benchmark monthly cycle. Standard constant maturity 30-day baseline for volatility traders.',
    },
    {
      id: 'medium',
      name: 'Medium-Term (46-90D)',
      dteRange: '46 – 90 DTE',
      netVega: Number(bucketsMap.medium.netVega.toFixed(2)),
      weightedVega: Number(bucketsMap.medium.weightedVega.toFixed(2)),
      contractsCount: bucketsMap.medium.count,
      description: 'Quarterly cycles. Moderate theta decay with balanced Vega exposure for swing strategies.',
    },
    {
      id: 'midCurve',
      name: 'Mid-Curve (91-180D)',
      dteRange: '91 – 180 DTE',
      netVega: Number(bucketsMap.midCurve.netVega.toFixed(2)),
      weightedVega: Number(bucketsMap.midCurve.weightedVega.toFixed(2)),
      contractsCount: bucketsMap.midCurve.count,
      description: 'Semi-annual horizon. High absolute Vega; heavily influenced by macro rate and earnings expectations.',
    },
    {
      id: 'leaps',
      name: 'Long-Term / LEAPS (181D+)',
      dteRange: '181+ DTE',
      netVega: Number(bucketsMap.leaps.netVega.toFixed(2)),
      weightedVega: Number(bucketsMap.leaps.weightedVega.toFixed(2)),
      contractsCount: bucketsMap.leaps.count,
      description: 'Structural volatility regime. Maximum absolute Vega per contract with minimal daily theta bleed.',
    },
  ];

  const totalPortfolioNetVega = Number(
    maturityBuckets.reduce((sum, b) => sum + b.netVega, 0).toFixed(2)
  );
  const totalPortfolioWeightedVega = Number(
    maturityBuckets.reduce((sum, b) => sum + b.weightedVega, 0).toFixed(2)
  );

  return {
    ticker: ticker.symbol,
    spotPrice: spot,
    points,
    minVega,
    maxVega,
    frontMonthDte: frontMonthPoint.dte,
    frontMonthVega,
    backMonthDte: backMonthPoint.dte,
    backMonthVega,
    vegaSpread,
    vegaSlopeRatio,
    regime,
    regimeLabel,
    regimeDescription,
    calendarSpreadRecommendation,
    maturityBuckets,
    totalPortfolioNetVega,
    totalPortfolioWeightedVega,
  };
}

export interface StrikeVegaCell {
  strike: number;
  dte: number;
  formattedDate: string;
  month: string;
  moneynessPct: number; // e.g. 100% at ATM
  isATM: boolean;
  isITMCall: boolean;
  isITMPut: boolean;
  // Greeks
  callVega: number; // Vega per 100-share contract ($)
  putVega: number;
  avgVega: number;
  callVegaPerShare: number;
  weightedVega30: number; // avgVega * sqrt(30 / DTE)
  vomma: number; // Volga
  veta: number; // Vega decay per day
  vegaThetaRatio: number; // abs(vega / theta)
  // Market quotes
  callBid: number;
  callAsk: number;
  putBid: number;
  putAsk: number;
  callIV: number;
  putIV: number;
  callOI: number;
  putOI: number;
  totalOI: number;
  marketVegaNotional: number; // totalOI * avgVega
}

export interface ExpirationSummaryCol {
  dte: number;
  formattedDate: string;
  month: string;
  atmStrike: number;
  atmVega: number;
  avgIV: number;
}

export interface AllExpirationsAllStrikesVegaMatrix {
  ticker: string;
  spotPrice: number;
  strikes: number[];
  expirations: ExpirationSummaryCol[];
  matrix: Record<number, Record<number, StrikeVegaCell>>; // strike -> dte -> cell
  minVega: number;
  maxVega: number;
  atmVegaByDte: Record<number, number>;
  totalSurfaceVegaNotional: number;
}

/**
 * Calculates complete Vega across ALL expirations and ALL strikes
 */
export function calculateAllExpirationsAllStrikesVega(
  ticker: Ticker,
  chains: ExpirationOptionChain[]
): AllExpirationsAllStrikesVegaMatrix {
  const spot = ticker.price;
  const sortedChains = [...(chains || [])].sort((a, b) => a.dte - b.dte);

  // Collect all unique strikes across all chains
  const strikeSet = new Set<number>();
  for (const c of sortedChains) {
    if (c.calls) {
      for (const call of c.calls) {
        if (call.strike > 0) strikeSet.add(call.strike);
      }
    }
    if (c.puts) {
      for (const put of c.puts) {
        if (put.strike > 0) strikeSet.add(put.strike);
      }
    }
  }

  // If no strikes found, generate standard strikes around spot
  if (strikeSet.size === 0) {
    for (let pct = 85; pct <= 115; pct += 2.5) {
      strikeSet.add(Math.round((spot * (pct / 100)) * 2) / 2);
    }
  }

  const sortedStrikes = Array.from(strikeSet).sort((a, b) => a - b);
  const matrix: Record<number, Record<number, StrikeVegaCell>> = {};
  let minVega = Infinity;
  let maxVega = -Infinity;
  let totalSurfaceVegaNotional = 0;
  const atmVegaByDte: Record<number, number> = {};

  const expirations: ExpirationSummaryCol[] = sortedChains.map((chain) => {
    const dte = Math.max(1, chain.dte);
    const T = dte / 365;
    const sqrtT = Math.sqrt(T);

    // ATM Strike for this expiration
    const calls = chain.calls || [];
    const sortedCalls = [...calls].sort(
      (a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot)
    );
    const atmItem = sortedCalls[0];
    const atmStrike = atmItem ? atmItem.strike : spot;
    const atmIV = Math.max(0.05, atmItem?.iv || chain.avgIV || ticker.currentIV || 0.25);
    const d1Atm = (Math.log(spot / atmStrike) + (RISK_FREE_RATE + 0.5 * atmIV * atmIV) * T) / (atmIV * sqrtT);
    const atmVega = Number(((spot * sqrtT * normalPDF(d1Atm)) * 1).toFixed(2));
    atmVegaByDte[dte] = atmVega;

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const expDate = new Date(Date.now() + dte * 86400000);
    const month = chain.month || monthNames[expDate.getMonth()];

    return {
      dte,
      formattedDate: chain.formattedDate || `${month} ${String(expDate.getDate()).padStart(2, '0')}`,
      month,
      atmStrike,
      atmVega,
      avgIV: chain.avgIV || atmIV,
    };
  });

  for (const strike of sortedStrikes) {
    matrix[strike] = {};

    for (const chain of sortedChains) {
      const dte = Math.max(1, chain.dte);
      const T = dte / 365;
      const sqrtT = Math.sqrt(T);
      const moneynessPct = Number(((strike / spot) * 100).toFixed(1));
      const isATM = Math.abs(strike - spot) / spot < 0.015;

      const callContract = chain.calls?.find((c) => Math.abs(c.strike - strike) < 0.01);
      const putContract = chain.puts?.find((p) => Math.abs(p.strike - strike) < 0.01);

      const callIV = Math.max(0.05, callContract?.iv || chain.avgIV || ticker.currentIV || 0.25);
      const putIV = Math.max(0.05, putContract?.iv || chain.avgIV || ticker.currentIV || 0.25);
      const avgIV = (callIV + putIV) / 2;

      // Calculate BSM Vega for this specific strike & tenor
      const d1 = (Math.log(spot / strike) + (RISK_FREE_RATE + 0.5 * avgIV * avgIV) * T) / (avgIV * sqrtT);
      const d2 = d1 - avgIV * sqrtT;
      const pdfD1 = normalPDF(d1);

      // Vega per share ($ per 1% change in vol)
      const vegaPerShare = (spot * sqrtT * pdfD1) / 100;

      // Separate Call and Put Vega if skew exists
      const d1Call = (Math.log(spot / strike) + (RISK_FREE_RATE + 0.5 * callIV * callIV) * T) / (callIV * sqrtT);
      const d1Put = (Math.log(spot / strike) + (RISK_FREE_RATE + 0.5 * putIV * putIV) * T) / (putIV * sqrtT);
      const callVega = Number(((spot * sqrtT * normalPDF(d1Call)) * 1).toFixed(2));
      const putVega = Number(((spot * sqrtT * normalPDF(d1Put)) * 1).toFixed(2));
      const avgVega = Number(((callVega + putVega) / 2).toFixed(2));

      // Constant Maturity 30-Day Weighted Vega = Vega * sqrt(30 / DTE)
      const weightedVega30 = Number((avgVega * Math.sqrt(30 / dte)).toFixed(2));

      // Second order: Vomma (Volga) & Veta
      const vomma = Number(((vegaPerShare * (d1 * d2 / avgIV)) * 100).toFixed(4));
      const bracket = (RISK_FREE_RATE * d1) / (avgIV * sqrtT) - (1 + d1 * d2) / (2 * T);
      const veta = Number(((-spot * pdfD1 * sqrtT * bracket * 100) / (100 * 365)).toFixed(4));

      // Theta for Vega/Theta ratio
      const bsmCall = calculateBSM(spot, strike, T, callIV, 'call', RISK_FREE_RATE);
      const theta100 = Math.abs(bsmCall.greeks.theta * 100);
      const vegaThetaRatio = theta100 > 0.01 ? Number((avgVega / theta100).toFixed(2)) : 1.0;

      const callOI = callContract?.openInterest || 0;
      const putOI = putContract?.openInterest || 0;
      const totalOI = callOI + putOI;
      const marketVegaNotional = Number((totalOI * avgVega).toFixed(0));
      totalSurfaceVegaNotional += marketVegaNotional;

      if (avgVega < minVega) minVega = avgVega;
      if (avgVega > maxVega) maxVega = avgVega;

      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const expDate = new Date(Date.now() + dte * 86400000);
      const month = chain.month || monthNames[expDate.getMonth()];

      matrix[strike][dte] = {
        strike,
        dte,
        formattedDate: chain.formattedDate || `${month} ${String(expDate.getDate()).padStart(2, '0')}`,
        month,
        moneynessPct,
        isATM,
        isITMCall: strike < spot,
        isITMPut: strike > spot,
        callVega,
        putVega,
        avgVega,
        callVegaPerShare: Number(vegaPerShare.toFixed(4)),
        weightedVega30,
        vomma,
        veta,
        vegaThetaRatio,
        callBid: callContract?.bid || 0,
        callAsk: callContract?.ask || 0,
        putBid: putContract?.bid || 0,
        putAsk: putContract?.ask || 0,
        callIV,
        putIV,
        callOI,
        putOI,
        totalOI,
        marketVegaNotional,
      };
    }
  }

  return {
    ticker: ticker.symbol,
    spotPrice: spot,
    strikes: sortedStrikes,
    expirations,
    matrix,
    minVega: isFinite(minVega) ? minVega : 0.5,
    maxVega: isFinite(maxVega) ? maxVega : 50,
    atmVegaByDte,
    totalSurfaceVegaNotional,
  };
}
