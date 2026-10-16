/**
 * FUTURES TERM STRUCTURE (FTS) & FORWARD CURVE ANALYTICS ENGINE
 * Institutional futures forward curves across Volatility, Energy, Equity Indices,
 * Metals, Rates & Fixed Income, Agriculture, and Crypto.
 * Provides Contango / Backwardation shape analysis, Roll Yield (% annualized),
 * Inter-Month Calendar Spread Matrix, Cost of Carry decomposition, and Stress Shocks.
 */

export interface FuturesContract {
  ticker: string;             // e.g. "CLZ24", "VXF25", "ESZ24"
  contractMonth: string;      // e.g. "Dec 2024", "Jan 2025"
  monthCode: string;          // e.g. "Z24", "F25", "G25", "H25"
  deliveryDate: string;       // ISO date "2024-12-20"
  daysToExpiration: number;   // DTE
  lastPrice: number;
  netChange: number;
  percentChange: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;  // % e.g. 28.5
  settlementPrice: number;
  // Historical snapshots for curve shift overlay:
  historicalShift1D: number;  // Yesterday's curve settlement
  historicalShift1W: number;  // 1 week ago curve settlement
  historicalShift1M: number;  // 1 month ago curve settlement
  historicalShift3M: number;  // 3 months ago curve settlement
}

export type FuturesCategory =
  | 'VOLATILITY'
  | 'ENERGY'
  | 'EQUITY_INDICES'
  | 'METALS'
  | 'RATES'
  | 'AGRICULTURE'
  | 'CRYPTO';

export type CurveRegime =
  | 'CONTANGO'
  | 'SUPER_CONTANGO'
  | 'BACKWARDATION'
  | 'EXTREME_BACKWARDATION'
  | 'HUMPED_SEASONAL'
  | 'FLAT';

export interface CalendarSpread {
  id: string;
  frontTicker: string;
  backTicker: string;
  label: string;             // e.g. "M1-M2 (Dec/Jan)", "M1-M3 (Dec/Feb)"
  frontPrice: number;
  backPrice: number;
  spread: number;            // frontPrice - backPrice (or backPrice - frontPrice based on convention)
  netChange: number;
  percentile52W: number;     // 0 - 100%
  annualizedRollReturn: number; // %
  tradeType: 'CALENDAR_SPREAD' | 'ROLL_LONG' | 'ROLL_SHORT';
  regime: 'CONTANGO' | 'BACKWARDATION';
  interpretation: string;
}

export interface PricingCostOfCarry {
  riskFreeRate: number;      // e.g. 0.045 (4.50% SOFR)
  dividendYield?: number;    // e.g. 0.013 (1.30% for S&P 500)
  storageCostPct?: number;   // e.g. 0.025 (2.50% storage & insurance for physical)
  convenienceYieldPct?: number; // e.g. 0.038 (3.80% physical scarcity benefit)
}

export interface FuturesTermStructure {
  id: string;                // e.g. "VIX", "CL", "ES"
  symbol: string;            // e.g. "/VX", "/CL", "/ES"
  name: string;
  category: FuturesCategory;
  exchange: string;          // "CBOE", "NYMEX", "CME", "ICE", "COMEX", "CBOT", "MX"
  currency: 'USD' | 'CAD';
  multiplier: number;        // e.g. 1000 for CL, 50 for ES, 100 for GC, 5 for BTC
  tickSize: number;
  unit: string;              // "Index Pts", "Barrels", "MMBtu", "Troy Oz", "Contracts"
  spotPrice: number;
  spotChange: number;
  spotChangePct: number;
  pricingModel: PricingCostOfCarry;
  contracts: FuturesContract[];
  description: string;
  marketNotes: string;
  color: string;
}

// -------------------------------------------------------------
// INSTITUTIONAL FUTURES TERM STRUCTURE DATASETS
// -------------------------------------------------------------

export const FUTURES_TERM_STRUCTURES: FuturesTermStructure[] = [
  // 1. CBOE VIX VOLATILITY FUTURES (The Gold Standard of Volatility Term Structure)
  {
    id: 'VIX',
    symbol: '/VX',
    name: 'CBOE Volatility Index Futures (VIX)',
    category: 'VOLATILITY',
    exchange: 'CBOE',
    currency: 'USD',
    multiplier: 1000,
    tickSize: 0.05,
    unit: 'Vol Pts ($1,000/pt)',
    spotPrice: 15.85,
    spotChange: -0.42,
    spotChangePct: -2.58,
    pricingModel: {
      riskFreeRate: 0.0465,
      storageCostPct: 0.0,
      convenienceYieldPct: 0.0,
    },
    color: '#00e5ff',
    description: 'CBOE Volatility Index futures curve (VX1 - VX8). Key indicator of market calm vs institutional stress, implied vol term structure, and roll yield decay for SVIX, UVIX, UVXY & VXX.',
    marketNotes: 'Upward sloping steep contango (+4.59% M1-M2 spread). Implied roll decay on long volatility products ~5.2% monthly. Zero inversion stress detected across the 8-month horizon.',
    contracts: [
      {
        ticker: 'VX1 (Nov 24)',
        contractMonth: 'Nov 2024',
        monthCode: 'X24',
        deliveryDate: '2024-11-20',
        daysToExpiration: 18,
        lastPrice: 16.35,
        netChange: -0.35,
        percentChange: -2.10,
        bid: 16.30,
        ask: 16.40,
        volume: 78450,
        openInterest: 142100,
        impliedVolatility: 68.4,
        settlementPrice: 16.70,
        historicalShift1D: 16.70,
        historicalShift1W: 17.40,
        historicalShift1M: 19.80,
        historicalShift3M: 27.50,
      },
      {
        ticker: 'VX2 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-18',
        daysToExpiration: 46,
        lastPrice: 17.10,
        netChange: -0.25,
        percentChange: -1.44,
        bid: 17.05,
        ask: 17.15,
        volume: 64200,
        openInterest: 128900,
        impliedVolatility: 64.2,
        settlementPrice: 17.35,
        historicalShift1D: 17.35,
        historicalShift1W: 17.95,
        historicalShift1M: 19.90,
        historicalShift3M: 25.80,
      },
      {
        ticker: 'VX3 (Jan 25)',
        contractMonth: 'Jan 2025',
        monthCode: 'F25',
        deliveryDate: '2025-01-22',
        daysToExpiration: 81,
        lastPrice: 17.65,
        netChange: -0.15,
        percentChange: -0.84,
        bid: 17.60,
        ask: 17.70,
        volume: 41800,
        openInterest: 94300,
        impliedVolatility: 61.5,
        settlementPrice: 17.80,
        historicalShift1D: 17.80,
        historicalShift1W: 18.30,
        historicalShift1M: 19.95,
        historicalShift3M: 24.20,
      },
      {
        ticker: 'VX4 (Feb 25)',
        contractMonth: 'Feb 2025',
        monthCode: 'G25',
        deliveryDate: '2025-02-19',
        daysToExpiration: 109,
        lastPrice: 18.05,
        netChange: -0.10,
        percentChange: -0.55,
        bid: 18.00,
        ask: 18.10,
        volume: 28900,
        openInterest: 71200,
        impliedVolatility: 59.8,
        settlementPrice: 18.15,
        historicalShift1D: 18.15,
        historicalShift1W: 18.60,
        historicalShift1M: 20.05,
        historicalShift3M: 23.40,
      },
      {
        ticker: 'VX5 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-19',
        daysToExpiration: 137,
        lastPrice: 18.40,
        netChange: -0.05,
        percentChange: -0.27,
        bid: 18.35,
        ask: 18.45,
        volume: 19400,
        openInterest: 54100,
        impliedVolatility: 58.2,
        settlementPrice: 18.45,
        historicalShift1D: 18.45,
        historicalShift1W: 18.85,
        historicalShift1M: 20.10,
        historicalShift3M: 22.80,
      },
      {
        ticker: 'VX6 (Apr 25)',
        contractMonth: 'Apr 2025',
        monthCode: 'J25',
        deliveryDate: '2025-04-16',
        daysToExpiration: 165,
        lastPrice: 18.65,
        netChange: 0.00,
        percentChange: 0.0,
        bid: 18.60,
        ask: 18.70,
        volume: 12300,
        openInterest: 38600,
        impliedVolatility: 57.0,
        settlementPrice: 18.65,
        historicalShift1D: 18.65,
        historicalShift1W: 19.00,
        historicalShift1M: 20.15,
        historicalShift3M: 22.30,
      },
      {
        ticker: 'VX7 (May 25)',
        contractMonth: 'May 2025',
        monthCode: 'K25',
        deliveryDate: '2025-05-21',
        daysToExpiration: 200,
        lastPrice: 18.85,
        netChange: 0.05,
        percentChange: 0.27,
        bid: 18.80,
        ask: 18.90,
        volume: 8700,
        openInterest: 29400,
        impliedVolatility: 56.4,
        settlementPrice: 18.80,
        historicalShift1D: 18.80,
        historicalShift1W: 19.10,
        historicalShift1M: 20.20,
        historicalShift3M: 22.00,
      },
      {
        ticker: 'VX8 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-06-18',
        daysToExpiration: 228,
        lastPrice: 19.05,
        netChange: 0.05,
        percentChange: 0.26,
        bid: 19.00,
        ask: 19.10,
        volume: 5600,
        openInterest: 21800,
        impliedVolatility: 55.8,
        settlementPrice: 19.00,
        historicalShift1D: 19.00,
        historicalShift1W: 19.25,
        historicalShift1M: 20.25,
        historicalShift3M: 21.80,
      },
    ],
  },

  // 2. WTI CRUDE OIL (NYMEX Light Sweet Crude - Global Physical Benchmark)
  {
    id: 'CL',
    symbol: '/CL',
    name: 'WTI Crude Oil Futures (NYMEX)',
    category: 'ENERGY',
    exchange: 'NYMEX',
    currency: 'USD',
    multiplier: 1000,
    tickSize: 0.01,
    unit: '1,000 Barrels ($1,000/$1.00)',
    spotPrice: 68.45,
    spotChange: 0.95,
    spotChangePct: 1.41,
    pricingModel: {
      riskFreeRate: 0.0465,
      storageCostPct: 0.032,
      convenienceYieldPct: 0.074, // High convenience yield driving backwardation
    },
    color: '#ff9900',
    description: 'Light Sweet Crude Oil 12-month forward strip delivered at Cushing, Oklahoma. Backwardation indicates immediate spot refinery demand exceeding long-dated supply.',
    marketNotes: 'Curve is in prompt backwardation with M1-M2 spread at +$0.40/bbl (annualized roll yield +7.0% for long holders). High convenience yield reflects tight physical inventories.',
    contracts: [
      {
        ticker: 'CLZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-11-20',
        daysToExpiration: 18,
        lastPrice: 68.60,
        netChange: 0.92,
        percentChange: 1.36,
        bid: 68.58,
        ask: 68.62,
        volume: 242000,
        openInterest: 385000,
        impliedVolatility: 34.2,
        settlementPrice: 67.68,
        historicalShift1D: 67.68,
        historicalShift1W: 71.20,
        historicalShift1M: 73.80,
        historicalShift3M: 78.40,
      },
      {
        ticker: 'CLF25 (Jan 25)',
        contractMonth: 'Jan 2025',
        monthCode: 'F25',
        deliveryDate: '2024-12-19',
        daysToExpiration: 47,
        lastPrice: 68.20,
        netChange: 0.88,
        percentChange: 1.31,
        bid: 68.18,
        ask: 68.22,
        volume: 185000,
        openInterest: 310000,
        impliedVolatility: 32.8,
        settlementPrice: 67.32,
        historicalShift1D: 67.32,
        historicalShift1W: 70.80,
        historicalShift1M: 73.35,
        historicalShift3M: 77.80,
      },
      {
        ticker: 'CLG25 (Feb 25)',
        contractMonth: 'Feb 2025',
        monthCode: 'G25',
        deliveryDate: '2025-01-21',
        daysToExpiration: 80,
        lastPrice: 67.85,
        netChange: 0.82,
        percentChange: 1.22,
        bid: 67.83,
        ask: 67.87,
        volume: 112000,
        openInterest: 225000,
        impliedVolatility: 31.6,
        settlementPrice: 67.03,
        historicalShift1D: 67.03,
        historicalShift1W: 70.40,
        historicalShift1M: 72.90,
        historicalShift3M: 77.10,
      },
      {
        ticker: 'CLH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-02-20',
        daysToExpiration: 110,
        lastPrice: 67.45,
        netChange: 0.76,
        percentChange: 1.14,
        bid: 67.43,
        ask: 67.47,
        volume: 84000,
        openInterest: 185000,
        impliedVolatility: 30.5,
        settlementPrice: 66.69,
        historicalShift1D: 66.69,
        historicalShift1W: 69.95,
        historicalShift1M: 72.40,
        historicalShift3M: 76.50,
      },
      {
        ticker: 'CLJ25 (Apr 25)',
        contractMonth: 'Apr 2025',
        monthCode: 'J25',
        deliveryDate: '2025-03-20',
        daysToExpiration: 138,
        lastPrice: 67.10,
        netChange: 0.70,
        percentChange: 1.05,
        bid: 67.08,
        ask: 67.12,
        volume: 62000,
        openInterest: 142000,
        impliedVolatility: 29.8,
        settlementPrice: 66.40,
        historicalShift1D: 66.40,
        historicalShift1W: 69.50,
        historicalShift1M: 71.90,
        historicalShift3M: 75.90,
      },
      {
        ticker: 'CLK25 (May 25)',
        contractMonth: 'May 2025',
        monthCode: 'K25',
        deliveryDate: '2025-04-22',
        daysToExpiration: 171,
        lastPrice: 66.80,
        netChange: 0.65,
        percentChange: 0.98,
        bid: 66.78,
        ask: 66.82,
        volume: 48000,
        openInterest: 118000,
        impliedVolatility: 29.1,
        settlementPrice: 66.15,
        historicalShift1D: 66.15,
        historicalShift1W: 69.10,
        historicalShift1M: 71.45,
        historicalShift3M: 75.30,
      },
      {
        ticker: 'CLM25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-05-20',
        daysToExpiration: 199,
        lastPrice: 66.55,
        netChange: 0.60,
        percentChange: 0.91,
        bid: 66.53,
        ask: 66.57,
        volume: 41000,
        openInterest: 104000,
        impliedVolatility: 28.6,
        settlementPrice: 65.95,
        historicalShift1D: 65.95,
        historicalShift1W: 68.75,
        historicalShift1M: 71.05,
        historicalShift3M: 74.80,
      },
      {
        ticker: 'CLN25 (Jul 25)',
        contractMonth: 'Jul 2025',
        monthCode: 'N25',
        deliveryDate: '2025-06-20',
        daysToExpiration: 230,
        lastPrice: 66.30,
        netChange: 0.55,
        percentChange: 0.84,
        bid: 66.28,
        ask: 66.32,
        volume: 32000,
        openInterest: 88000,
        impliedVolatility: 28.2,
        settlementPrice: 65.75,
        historicalShift1D: 65.75,
        historicalShift1W: 68.40,
        historicalShift1M: 70.65,
        historicalShift3M: 74.30,
      },
      {
        ticker: 'CLQ25 (Aug 25)',
        contractMonth: 'Aug 2025',
        monthCode: 'Q25',
        deliveryDate: '2025-07-22',
        daysToExpiration: 262,
        lastPrice: 66.10,
        netChange: 0.50,
        percentChange: 0.76,
        bid: 66.08,
        ask: 66.12,
        volume: 24000,
        openInterest: 72000,
        impliedVolatility: 27.8,
        settlementPrice: 65.60,
        historicalShift1D: 65.60,
        historicalShift1W: 68.10,
        historicalShift1M: 70.30,
        historicalShift3M: 73.85,
      },
      {
        ticker: 'CLU25 (Sep 25)',
        contractMonth: 'Sep 2025',
        monthCode: 'U25',
        deliveryDate: '2025-08-20',
        daysToExpiration: 291,
        lastPrice: 65.90,
        netChange: 0.46,
        percentChange: 0.70,
        bid: 65.88,
        ask: 65.92,
        volume: 18000,
        openInterest: 59000,
        impliedVolatility: 27.4,
        settlementPrice: 65.44,
        historicalShift1D: 65.44,
        historicalShift1W: 67.80,
        historicalShift1M: 69.95,
        historicalShift3M: 73.45,
      },
      {
        ticker: 'CLV25 (Oct 25)',
        contractMonth: 'Oct 2025',
        monthCode: 'V25',
        deliveryDate: '2025-09-22',
        daysToExpiration: 324,
        lastPrice: 65.75,
        netChange: 0.42,
        percentChange: 0.64,
        bid: 65.73,
        ask: 65.77,
        volume: 14000,
        openInterest: 48000,
        impliedVolatility: 27.1,
        settlementPrice: 65.33,
        historicalShift1D: 65.33,
        historicalShift1W: 67.55,
        historicalShift1M: 69.65,
        historicalShift3M: 73.10,
      },
      {
        ticker: 'CLZ25 (Dec 25)',
        contractMonth: 'Dec 2025',
        monthCode: 'Z25',
        deliveryDate: '2025-11-20',
        daysToExpiration: 383,
        lastPrice: 65.60,
        netChange: 0.38,
        percentChange: 0.58,
        bid: 65.58,
        ask: 65.62,
        volume: 29000,
        openInterest: 95000,
        impliedVolatility: 26.8,
        settlementPrice: 65.22,
        historicalShift1D: 65.22,
        historicalShift1W: 67.30,
        historicalShift1M: 69.30,
        historicalShift3M: 72.70,
      },
    ],
  },

  // 3. NATURAL GAS (Henry Hub - Textbook Seasonal Heating Hump Term Structure)
  {
    id: 'NG',
    symbol: '/NG',
    name: 'Natural Gas Henry Hub Futures (NYMEX)',
    category: 'ENERGY',
    exchange: 'NYMEX',
    currency: 'USD',
    multiplier: 10000,
    tickSize: 0.001,
    unit: '10,000 MMBtu ($10,000/$1.00)',
    spotPrice: 2.885,
    spotChange: 0.065,
    spotChangePct: 2.30,
    pricingModel: {
      riskFreeRate: 0.0465,
      storageCostPct: 0.145, // High underground cavern storage cost
      convenienceYieldPct: 0.062,
    },
    color: '#38bdf8',
    description: 'Henry Hub Natural Gas delivery strip displaying extreme seasonal winter heating peaks (Jan/Feb) followed by spring shoulder-month storage injections (April/May).',
    marketNotes: 'Classic winter hump: Jan 2025 peaks at $3.480 before plunging to $2.650 in April shoulder season (-23.8% winter-to-spring calendar spread collapse).',
    contracts: [
      {
        ticker: 'NGX24 (Nov 24)',
        contractMonth: 'Nov 2024',
        monthCode: 'X24',
        deliveryDate: '2024-10-29',
        daysToExpiration: 8,
        lastPrice: 2.895,
        netChange: 0.062,
        percentChange: 2.19,
        bid: 2.892,
        ask: 2.898,
        volume: 98000,
        openInterest: 165000,
        impliedVolatility: 61.2,
        settlementPrice: 2.833,
        historicalShift1D: 2.833,
        historicalShift1W: 2.740,
        historicalShift1M: 2.450,
        historicalShift3M: 2.120,
      },
      {
        ticker: 'NGZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-11-26',
        daysToExpiration: 36,
        lastPrice: 3.250,
        netChange: 0.075,
        percentChange: 2.36,
        bid: 3.245,
        ask: 3.255,
        volume: 85000,
        openInterest: 142000,
        impliedVolatility: 66.4,
        settlementPrice: 3.175,
        historicalShift1D: 3.175,
        historicalShift1W: 3.080,
        historicalShift1M: 2.820,
        historicalShift3M: 2.510,
      },
      {
        ticker: 'NGF25 (Jan 25)',
        contractMonth: 'Jan 2025',
        monthCode: 'F25',
        deliveryDate: '2024-12-27',
        daysToExpiration: 67,
        lastPrice: 3.480,
        netChange: 0.082,
        percentChange: 2.41,
        bid: 3.475,
        ask: 3.485,
        volume: 72000,
        openInterest: 128000,
        impliedVolatility: 71.0,
        settlementPrice: 3.398,
        historicalShift1D: 3.398,
        historicalShift1W: 3.290,
        historicalShift1M: 3.040,
        historicalShift3M: 2.760,
      },
      {
        ticker: 'NGG25 (Feb 25)',
        contractMonth: 'Feb 2025',
        monthCode: 'G25',
        deliveryDate: '2025-01-29',
        daysToExpiration: 100,
        lastPrice: 3.410,
        netChange: 0.078,
        percentChange: 2.34,
        bid: 3.405,
        ask: 3.415,
        volume: 58000,
        openInterest: 105000,
        impliedVolatility: 69.5,
        settlementPrice: 3.332,
        historicalShift1D: 3.332,
        historicalShift1W: 3.230,
        historicalShift1M: 2.990,
        historicalShift3M: 2.720,
      },
      {
        ticker: 'NGH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-02-26',
        daysToExpiration: 128,
        lastPrice: 3.080,
        netChange: 0.060,
        percentChange: 1.99,
        bid: 3.075,
        ask: 3.085,
        volume: 45000,
        openInterest: 84000,
        impliedVolatility: 62.0,
        settlementPrice: 3.020,
        historicalShift1D: 3.020,
        historicalShift1W: 2.940,
        historicalShift1M: 2.750,
        historicalShift3M: 2.540,
      },
      {
        ticker: 'NGJ25 (Apr 25)',
        contractMonth: 'Apr 2025',
        monthCode: 'J25',
        deliveryDate: '2025-03-27',
        daysToExpiration: 157,
        lastPrice: 2.650,
        netChange: 0.035,
        percentChange: 1.34,
        bid: 2.645,
        ask: 2.655,
        volume: 38000,
        openInterest: 72000,
        impliedVolatility: 54.5,
        settlementPrice: 2.615,
        historicalShift1D: 2.615,
        historicalShift1W: 2.580,
        historicalShift1M: 2.440,
        historicalShift3M: 2.310,
      },
      {
        ticker: 'NGK25 (May 25)',
        contractMonth: 'May 2025',
        monthCode: 'K25',
        deliveryDate: '2025-04-28',
        daysToExpiration: 189,
        lastPrice: 2.710,
        netChange: 0.040,
        percentChange: 1.50,
        bid: 2.705,
        ask: 2.715,
        volume: 29000,
        openInterest: 58000,
        impliedVolatility: 53.0,
        settlementPrice: 2.670,
        historicalShift1D: 2.670,
        historicalShift1W: 2.620,
        historicalShift1M: 2.480,
        historicalShift3M: 2.360,
      },
      {
        ticker: 'NGM25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-05-28',
        daysToExpiration: 219,
        lastPrice: 2.820,
        netChange: 0.045,
        percentChange: 1.62,
        bid: 2.815,
        ask: 2.825,
        volume: 24000,
        openInterest: 49000,
        impliedVolatility: 52.1,
        settlementPrice: 2.775,
        historicalShift1D: 2.775,
        historicalShift1W: 2.710,
        historicalShift1M: 2.550,
        historicalShift3M: 2.430,
      },
      {
        ticker: 'NGN25 (Jul 25)',
        contractMonth: 'Jul 2025',
        monthCode: 'N25',
        deliveryDate: '2025-06-26',
        daysToExpiration: 248,
        lastPrice: 2.910,
        netChange: 0.048,
        percentChange: 1.68,
        bid: 2.905,
        ask: 2.915,
        volume: 21000,
        openInterest: 42000,
        impliedVolatility: 51.5,
        settlementPrice: 2.862,
        historicalShift1D: 2.862,
        historicalShift1W: 2.790,
        historicalShift1M: 2.620,
        historicalShift3M: 2.510,
      },
      {
        ticker: 'NGQ25 (Aug 25)',
        contractMonth: 'Aug 2025',
        monthCode: 'Q25',
        deliveryDate: '2025-07-29',
        daysToExpiration: 281,
        lastPrice: 2.940,
        netChange: 0.050,
        percentChange: 1.73,
        bid: 2.935,
        ask: 2.945,
        volume: 17000,
        openInterest: 36000,
        impliedVolatility: 51.2,
        settlementPrice: 2.890,
        historicalShift1D: 2.890,
        historicalShift1W: 2.820,
        historicalShift1M: 2.650,
        historicalShift3M: 2.550,
      },
      {
        ticker: 'NGU25 (Sep 25)',
        contractMonth: 'Sep 2025',
        monthCode: 'U25',
        deliveryDate: '2025-08-27',
        daysToExpiration: 310,
        lastPrice: 2.880,
        netChange: 0.042,
        percentChange: 1.48,
        bid: 2.875,
        ask: 2.885,
        volume: 13000,
        openInterest: 29000,
        impliedVolatility: 50.8,
        settlementPrice: 2.838,
        historicalShift1D: 2.838,
        historicalShift1W: 2.780,
        historicalShift1M: 2.610,
        historicalShift3M: 2.520,
      },
      {
        ticker: 'NGV25 (Oct 25)',
        contractMonth: 'Oct 2025',
        monthCode: 'V25',
        deliveryDate: '2025-09-26',
        daysToExpiration: 340,
        lastPrice: 2.950,
        netChange: 0.045,
        percentChange: 1.55,
        bid: 2.945,
        ask: 2.955,
        volume: 11000,
        openInterest: 24000,
        impliedVolatility: 50.4,
        settlementPrice: 2.905,
        historicalShift1D: 2.905,
        historicalShift1W: 2.840,
        historicalShift1M: 2.670,
        historicalShift3M: 2.580,
      },
    ],
  },

  // 4. S&P 500 E-MINI (/ES - Cost of Carry Financing Contango)
  {
    id: 'ES',
    symbol: '/ES',
    name: 'E-mini S&P 500 Index Futures (CME)',
    category: 'EQUITY_INDICES',
    exchange: 'CME',
    currency: 'USD',
    multiplier: 50,
    tickSize: 0.25,
    unit: 'Index Pts ($50/pt)',
    spotPrice: 5742.50,
    spotChange: 26.50,
    spotChangePct: 0.46,
    pricingModel: {
      riskFreeRate: 0.0465,
      dividendYield: 0.0125, // Net carry = 4.65% - 1.25% = +3.40% contango
    },
    color: '#10b981',
    description: 'Quarterly E-mini S&P 500 futures contracts. Premium over spot reflects short-term financing rate (SOFR) minus index dividend yield (net positive cost of carry).',
    marketNotes: 'Upward sloping contango curve tracking theoretical cost-of-carry model (F = S * e^((r-q)T)). Annualized basis spread stands at +3.38%, consistent with current SOFR pricing.',
    contracts: [
      {
        ticker: 'ESZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-20',
        daysToExpiration: 48,
        lastPrice: 5768.50,
        netChange: 27.25,
        percentChange: 0.47,
        bid: 5768.25,
        ask: 5768.75,
        volume: 1240000,
        openInterest: 2480000,
        impliedVolatility: 13.8,
        settlementPrice: 5741.25,
        historicalShift1D: 5741.25,
        historicalShift1W: 5690.00,
        historicalShift1M: 5580.00,
        historicalShift3M: 5350.00,
      },
      {
        ticker: 'ESH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-21',
        daysToExpiration: 139,
        lastPrice: 5815.00,
        netChange: 28.50,
        percentChange: 0.49,
        bid: 5814.75,
        ask: 5815.25,
        volume: 380000,
        openInterest: 820000,
        impliedVolatility: 14.6,
        settlementPrice: 5786.50,
        historicalShift1D: 5786.50,
        historicalShift1W: 5735.00,
        historicalShift1M: 5625.00,
        historicalShift3M: 5395.00,
      },
      {
        ticker: 'ESM25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-06-20',
        daysToExpiration: 230,
        lastPrice: 5860.00,
        netChange: 29.00,
        percentChange: 0.50,
        bid: 5859.50,
        ask: 5860.50,
        volume: 95000,
        openInterest: 310000,
        impliedVolatility: 15.4,
        settlementPrice: 5831.00,
        historicalShift1D: 5831.00,
        historicalShift1W: 5780.00,
        historicalShift1M: 5670.00,
        historicalShift3M: 5440.00,
      },
      {
        ticker: 'ESU25 (Sep 25)',
        contractMonth: 'Sep 2025',
        monthCode: 'U25',
        deliveryDate: '2025-09-19',
        daysToExpiration: 321,
        lastPrice: 5905.00,
        netChange: 29.75,
        percentChange: 0.51,
        bid: 5904.50,
        ask: 5905.50,
        volume: 42000,
        openInterest: 165000,
        impliedVolatility: 16.1,
        settlementPrice: 5875.25,
        historicalShift1D: 5875.25,
        historicalShift1W: 5825.00,
        historicalShift1M: 5715.00,
        historicalShift3M: 5485.00,
      },
      {
        ticker: 'ESZ25 (Dec 25)',
        contractMonth: 'Dec 2025',
        monthCode: 'Z25',
        deliveryDate: '2025-12-19',
        daysToExpiration: 412,
        lastPrice: 5952.00,
        netChange: 30.50,
        percentChange: 0.51,
        bid: 5951.50,
        ask: 5952.50,
        volume: 28000,
        openInterest: 112000,
        impliedVolatility: 16.8,
        settlementPrice: 5921.50,
        historicalShift1D: 5921.50,
        historicalShift1W: 5870.00,
        historicalShift1M: 5760.00,
        historicalShift3M: 5530.00,
      },
      {
        ticker: 'ESH26 (Mar 26)',
        contractMonth: 'Mar 2026',
        monthCode: 'H26',
        deliveryDate: '2026-03-20',
        daysToExpiration: 503,
        lastPrice: 5998.00,
        netChange: 31.00,
        percentChange: 0.52,
        bid: 5997.25,
        ask: 5998.75,
        volume: 14000,
        openInterest: 64000,
        impliedVolatility: 17.5,
        settlementPrice: 5967.00,
        historicalShift1D: 5967.00,
        historicalShift1W: 5915.00,
        historicalShift1M: 5805.00,
        historicalShift3M: 5575.00,
      },
    ],
  },

  // 5. NASDAQ 100 E-MINI (/NQ)
  {
    id: 'NQ',
    symbol: '/NQ',
    name: 'E-mini Nasdaq 100 Index Futures (CME)',
    category: 'EQUITY_INDICES',
    exchange: 'CME',
    currency: 'USD',
    multiplier: 20,
    tickSize: 0.25,
    unit: 'Index Pts ($20/pt)',
    spotPrice: 20185.00,
    spotChange: 172.50,
    spotChangePct: 0.86,
    pricingModel: {
      riskFreeRate: 0.0465,
      dividendYield: 0.0065, // Low tech dividend yield = steeper contango (+4.00% net)
    },
    color: '#a855f7',
    description: 'Quarterly E-mini Nasdaq 100 forward curve. Low dividend yield among mega-cap tech produces steeper financing contango compared to broad market indices.',
    marketNotes: 'Strong bid across all quarters; front-quarter basis trading at +110 index points above cash spot.',
    contracts: [
      {
        ticker: 'NQZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-20',
        daysToExpiration: 48,
        lastPrice: 20295.00,
        netChange: 178.00,
        percentChange: 0.88,
        bid: 20294.50,
        ask: 20295.50,
        volume: 580000,
        openInterest: 1120000,
        impliedVolatility: 19.2,
        settlementPrice: 20117.00,
        historicalShift1D: 20117.00,
        historicalShift1W: 19850.00,
        historicalShift1M: 19420.00,
        historicalShift3M: 18200.00,
      },
      {
        ticker: 'NQH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-21',
        daysToExpiration: 139,
        lastPrice: 20490.00,
        netChange: 182.50,
        percentChange: 0.90,
        bid: 20489.25,
        ask: 20490.75,
        volume: 185000,
        openInterest: 410000,
        impliedVolatility: 20.1,
        settlementPrice: 20307.50,
        historicalShift1D: 20307.50,
        historicalShift1W: 20040.00,
        historicalShift1M: 19610.00,
        historicalShift3M: 18380.00,
      },
      {
        ticker: 'NQM25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-06-20',
        daysToExpiration: 230,
        lastPrice: 20680.00,
        netChange: 186.00,
        percentChange: 0.91,
        bid: 20679.00,
        ask: 20681.00,
        volume: 48000,
        openInterest: 165000,
        impliedVolatility: 20.8,
        settlementPrice: 20494.00,
        historicalShift1D: 20494.00,
        historicalShift1W: 20220.00,
        historicalShift1M: 19780.00,
        historicalShift3M: 18550.00,
      },
      {
        ticker: 'NQU25 (Sep 25)',
        contractMonth: 'Sep 2025',
        monthCode: 'U25',
        deliveryDate: '2025-09-19',
        daysToExpiration: 321,
        lastPrice: 20875.00,
        netChange: 189.50,
        percentChange: 0.92,
        bid: 20874.00,
        ask: 20876.00,
        volume: 22000,
        openInterest: 79000,
        impliedVolatility: 21.5,
        settlementPrice: 20685.50,
        historicalShift1D: 20685.50,
        historicalShift1W: 20410.00,
        historicalShift1M: 19960.00,
        historicalShift3M: 18720.00,
      },
    ],
  },

  // 6. GOLD COMEX (/GC - Vault Financing & Storage Contango)
  {
    id: 'GC',
    symbol: '/GC',
    name: 'Gold COMEX Futures (CME)',
    category: 'METALS',
    exchange: 'COMEX',
    currency: 'USD',
    multiplier: 100,
    tickSize: 0.10,
    unit: '100 Troy Oz ($100/$1.00)',
    spotPrice: 2682.40,
    spotChange: 11.20,
    spotChangePct: 0.42,
    pricingModel: {
      riskFreeRate: 0.0465,
      storageCostPct: 0.0045, // Allocated vault storage + Lloyd's insurance
      convenienceYieldPct: 0.001,
    },
    color: '#fbbf24',
    description: 'COMEX Gold futures curve. Institutional gold forward rates (GOFO) reflect dollar financing rates minus gold lease rate plus vaulting costs, maintaining steady contango.',
    marketNotes: 'Textbook pristine contango curve. Roll yield of -$12.10/oz per bi-monthly contract. Central bank physical hoarding keeping spot basis firm.',
    contracts: [
      {
        ticker: 'GCZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-27',
        daysToExpiration: 55,
        lastPrice: 2694.50,
        netChange: 11.50,
        percentChange: 0.43,
        bid: 2694.30,
        ask: 2694.70,
        volume: 220000,
        openInterest: 485000,
        impliedVolatility: 15.8,
        settlementPrice: 2683.00,
        historicalShift1D: 2683.00,
        historicalShift1W: 2652.00,
        historicalShift1M: 2580.00,
        historicalShift3M: 2410.00,
      },
      {
        ticker: 'GCG25 (Feb 25)',
        contractMonth: 'Feb 2025',
        monthCode: 'G25',
        deliveryDate: '2025-02-26',
        daysToExpiration: 116,
        lastPrice: 2712.00,
        netChange: 11.80,
        percentChange: 0.44,
        bid: 2711.80,
        ask: 2712.20,
        volume: 145000,
        openInterest: 295000,
        impliedVolatility: 16.2,
        settlementPrice: 2700.20,
        historicalShift1D: 2700.20,
        historicalShift1W: 2669.00,
        historicalShift1M: 2596.00,
        historicalShift3M: 2426.00,
      },
      {
        ticker: 'GCJ25 (Apr 25)',
        contractMonth: 'Apr 2025',
        monthCode: 'J25',
        deliveryDate: '2025-04-28',
        daysToExpiration: 177,
        lastPrice: 2731.00,
        netChange: 12.10,
        percentChange: 0.44,
        bid: 2730.70,
        ask: 2731.30,
        volume: 82000,
        openInterest: 175000,
        impliedVolatility: 16.6,
        settlementPrice: 2718.90,
        historicalShift1D: 2718.90,
        historicalShift1W: 2687.50,
        historicalShift1M: 2614.00,
        historicalShift3M: 2444.00,
      },
      {
        ticker: 'GCM25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-06-26',
        daysToExpiration: 236,
        lastPrice: 2750.50,
        netChange: 12.40,
        percentChange: 0.45,
        bid: 2750.20,
        ask: 2750.80,
        volume: 48000,
        openInterest: 110000,
        impliedVolatility: 17.0,
        settlementPrice: 2738.10,
        historicalShift1D: 2738.10,
        historicalShift1W: 2706.00,
        historicalShift1M: 2632.00,
        historicalShift3M: 2462.00,
      },
      {
        ticker: 'GCQ25 (Aug 25)',
        contractMonth: 'Aug 2025',
        monthCode: 'Q25',
        deliveryDate: '2025-08-27',
        daysToExpiration: 298,
        lastPrice: 2771.00,
        netChange: 12.70,
        percentChange: 0.46,
        bid: 2770.60,
        ask: 2771.40,
        volume: 24000,
        openInterest: 64000,
        impliedVolatility: 17.4,
        settlementPrice: 2758.30,
        historicalShift1D: 2758.30,
        historicalShift1W: 2726.00,
        historicalShift1M: 2651.00,
        historicalShift3M: 2481.00,
      },
    ],
  },

  // 7. BITCOIN CME FUTURES (/BTC - Cash & Carry Basis Contango)
  {
    id: 'BTC',
    symbol: '/BTC',
    name: 'Bitcoin CME Futures (CME)',
    category: 'CRYPTO',
    exchange: 'CME',
    currency: 'USD',
    multiplier: 5,
    tickSize: 5.00,
    unit: '5 Bitcoins ($5/pt)',
    spotPrice: 64250.00,
    spotChange: 1420.00,
    spotChangePct: 2.26,
    pricingModel: {
      riskFreeRate: 0.0465,
      storageCostPct: 0.005, // Cold storage custodial fee
      convenienceYieldPct: 0.0,
    },
    color: '#f97316',
    description: 'CME cash-settled Bitcoin futures curve. The annualized basis spread is the institutional gauge of crypto leverage appetite and basis trade (cash-and-carry) profitability.',
    marketNotes: 'Healthy positive basis with M1-M2 spread trading at +7.8% annualized basis rate. Prime brokerage institutional desks active in long spot ETF / short CME futures carry arbitrage.',
    contracts: [
      {
        ticker: 'BTCX24 (Nov 24)',
        contractMonth: 'Nov 2024',
        monthCode: 'X24',
        deliveryDate: '2024-11-29',
        daysToExpiration: 27,
        lastPrice: 64680.00,
        netChange: 1460.00,
        percentChange: 2.31,
        bid: 64670.00,
        ask: 64690.00,
        volume: 18400,
        openInterest: 32400,
        impliedVolatility: 56.4,
        settlementPrice: 63220.00,
        historicalShift1D: 63220.00,
        historicalShift1W: 61800.00,
        historicalShift1M: 58400.00,
        historicalShift3M: 54100.00,
      },
      {
        ticker: 'BTCZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-27',
        daysToExpiration: 55,
        lastPrice: 65420.00,
        netChange: 1510.00,
        percentChange: 2.36,
        bid: 65410.00,
        ask: 65430.00,
        volume: 14200,
        openInterest: 26800,
        impliedVolatility: 58.1,
        settlementPrice: 63910.00,
        historicalShift1D: 63910.00,
        historicalShift1W: 62450.00,
        historicalShift1M: 58950.00,
        historicalShift3M: 54600.00,
      },
      {
        ticker: 'BTCF25 (Jan 25)',
        contractMonth: 'Jan 2025',
        monthCode: 'F25',
        deliveryDate: '2025-01-31',
        daysToExpiration: 90,
        lastPrice: 66250.00,
        netChange: 1560.00,
        percentChange: 2.41,
        bid: 66230.00,
        ask: 66270.00,
        volume: 8100,
        openInterest: 17200,
        impliedVolatility: 59.8,
        settlementPrice: 64690.00,
        historicalShift1D: 64690.00,
        historicalShift1W: 63150.00,
        historicalShift1M: 59550.00,
        historicalShift3M: 55100.00,
      },
      {
        ticker: 'BTCG25 (Feb 25)',
        contractMonth: 'Feb 2025',
        monthCode: 'G25',
        deliveryDate: '2025-02-28',
        daysToExpiration: 118,
        lastPrice: 67050.00,
        netChange: 1610.00,
        percentChange: 2.46,
        bid: 67030.00,
        ask: 67070.00,
        volume: 4600,
        openInterest: 11400,
        impliedVolatility: 61.2,
        settlementPrice: 65440.00,
        historicalShift1D: 65440.00,
        historicalShift1W: 63850.00,
        historicalShift1M: 60150.00,
        historicalShift3M: 55600.00,
      },
      {
        ticker: 'BTCH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-28',
        daysToExpiration: 146,
        lastPrice: 67880.00,
        netChange: 1660.00,
        percentChange: 2.51,
        bid: 67850.00,
        ask: 67910.00,
        volume: 3200,
        openInterest: 8900,
        impliedVolatility: 62.5,
        settlementPrice: 66220.00,
        historicalShift1D: 66220.00,
        historicalShift1W: 64550.00,
        historicalShift1M: 60750.00,
        historicalShift3M: 56100.00,
      },
    ],
  },

  // 8. 3-MONTH SOFR FUTURES (/SR3 - Federal Reserve Interest Rate Curve Strip)
  {
    id: 'SR3',
    symbol: '/SR3',
    name: 'Three-Month SOFR Futures (CME)',
    category: 'RATES',
    exchange: 'CME',
    currency: 'USD',
    multiplier: 2500,
    tickSize: 0.005,
    unit: 'Index Pts (Price = 100 - Rate)',
    spotPrice: 95.35, // 100 - 4.65%
    spotChange: 0.03,
    spotChangePct: 0.03,
    pricingModel: {
      riskFreeRate: 0.0465,
    },
    color: '#00d2ff',
    description: 'Three-Month Secured Overnight Financing Rate (SOFR) strip. Contract price reflects 100 minus the forward 3-month rate, revealing market consensus for Fed rate cuts over the next 24 months.',
    marketNotes: 'Upward sloping price curve (downward sloping implied forward rate curve): M1 prices at 95.42 (4.58% rate) rising to 96.48 (3.52% rate) by late 2025, pricing in ~106 bps of cumulative Fed cuts.',
    contracts: [
      {
        ticker: 'SR3Z24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-16',
        daysToExpiration: 44,
        lastPrice: 95.42, // Implied 4.58%
        netChange: 0.025,
        percentChange: 0.03,
        bid: 95.415,
        ask: 95.425,
        volume: 850000,
        openInterest: 2950000,
        impliedVolatility: 8.4,
        settlementPrice: 95.395,
        historicalShift1D: 95.395,
        historicalShift1W: 95.35,
        historicalShift1M: 95.15,
        historicalShift3M: 94.65,
      },
      {
        ticker: 'SR3H25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-17',
        daysToExpiration: 135,
        lastPrice: 95.75, // Implied 4.25%
        netChange: 0.035,
        percentChange: 0.04,
        bid: 95.745,
        ask: 95.755,
        volume: 640000,
        openInterest: 2180000,
        impliedVolatility: 9.1,
        settlementPrice: 95.715,
        historicalShift1D: 95.715,
        historicalShift1W: 95.66,
        historicalShift1M: 95.42,
        historicalShift3M: 94.88,
      },
      {
        ticker: 'SR3M25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-06-16',
        daysToExpiration: 226,
        lastPrice: 96.05, // Implied 3.95%
        netChange: 0.040,
        percentChange: 0.04,
        bid: 96.045,
        ask: 96.055,
        volume: 480000,
        openInterest: 1650000,
        impliedVolatility: 9.8,
        settlementPrice: 96.01,
        historicalShift1D: 96.01,
        historicalShift1W: 95.94,
        historicalShift1M: 95.68,
        historicalShift3M: 95.12,
      },
      {
        ticker: 'SR3U25 (Sep 25)',
        contractMonth: 'Sep 2025',
        monthCode: 'U25',
        deliveryDate: '2025-09-15',
        daysToExpiration: 317,
        lastPrice: 96.30, // Implied 3.70%
        netChange: 0.045,
        percentChange: 0.05,
        bid: 96.295,
        ask: 96.305,
        volume: 320000,
        openInterest: 1140000,
        impliedVolatility: 10.4,
        settlementPrice: 96.255,
        historicalShift1D: 96.255,
        historicalShift1W: 96.18,
        historicalShift1M: 95.89,
        historicalShift3M: 95.30,
      },
      {
        ticker: 'SR3Z25 (Dec 25)',
        contractMonth: 'Dec 2025',
        monthCode: 'Z25',
        deliveryDate: '2025-12-15',
        daysToExpiration: 408,
        lastPrice: 96.48, // Implied 3.52%
        netChange: 0.045,
        percentChange: 0.05,
        bid: 96.475,
        ask: 96.485,
        volume: 210000,
        openInterest: 780000,
        impliedVolatility: 10.8,
        settlementPrice: 96.435,
        historicalShift1D: 96.435,
        historicalShift1W: 96.36,
        historicalShift1M: 96.05,
        historicalShift3M: 95.45,
      },
    ],
  },

  // 9. CANADIAN S&P/TSX 60 FUTURES (/SXF - Montreal Exchange Flagship)
  {
    id: 'SXF',
    symbol: '/SXF',
    name: 'S&P/TSX 60 Index Futures (Montreal Exchange)',
    category: 'EQUITY_INDICES',
    exchange: 'MX',
    currency: 'CAD',
    multiplier: 200,
    tickSize: 0.10,
    unit: 'Index Pts (CAD $200/pt)',
    spotPrice: 1412.50,
    spotChange: 8.40,
    spotChangePct: 0.60,
    pricingModel: {
      riskFreeRate: 0.0375, // Bank of Canada overnight CORRA proxy
      dividendYield: 0.0295, // High Canadian bank & energy dividend yield
    },
    color: '#ff334b',
    description: 'Montreal Exchange (Bourse de Montréal) flagship benchmark index futures. High TSX composite dividend yields compress financing contango relative to US markets.',
    marketNotes: 'Flatter contango due to 2.95% dividend yield from Canadian Big 6 banks & Enbridge offsetting 3.75% BoC rate. M1-M2 spread at +$4.50.',
    contracts: [
      {
        ticker: 'SXFZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-19',
        daysToExpiration: 47,
        lastPrice: 1418.00,
        netChange: 8.60,
        percentChange: 0.61,
        bid: 1417.80,
        ask: 1418.20,
        volume: 48000,
        openInterest: 165000,
        impliedVolatility: 12.8,
        settlementPrice: 1409.40,
        historicalShift1D: 1409.40,
        historicalShift1W: 1398.00,
        historicalShift1M: 1375.00,
        historicalShift3M: 1320.00,
      },
      {
        ticker: 'SXFH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-20',
        daysToExpiration: 138,
        lastPrice: 1426.50,
        netChange: 8.80,
        percentChange: 0.62,
        bid: 1426.20,
        ask: 1426.80,
        volume: 16000,
        openInterest: 48000,
        impliedVolatility: 13.4,
        settlementPrice: 1417.70,
        historicalShift1D: 1417.70,
        historicalShift1W: 1406.00,
        historicalShift1M: 1382.00,
        historicalShift3M: 1326.00,
      },
      {
        ticker: 'SXFM25 (Jun 25)',
        contractMonth: 'Jun 2025',
        monthCode: 'M25',
        deliveryDate: '2025-06-19',
        daysToExpiration: 229,
        lastPrice: 1435.00,
        netChange: 9.00,
        percentChange: 0.63,
        bid: 1434.60,
        ask: 1435.40,
        volume: 5200,
        openInterest: 18000,
        impliedVolatility: 13.9,
        settlementPrice: 1426.00,
        historicalShift1D: 1426.00,
        historicalShift1W: 1414.00,
        historicalShift1M: 1389.00,
        historicalShift3M: 1332.00,
      },
      {
        ticker: 'SXFU25 (Sep 25)',
        contractMonth: 'Sep 2025',
        monthCode: 'U25',
        deliveryDate: '2025-09-18',
        daysToExpiration: 320,
        lastPrice: 1443.50,
        netChange: 9.10,
        percentChange: 0.63,
        bid: 1443.00,
        ask: 1444.00,
        volume: 2100,
        openInterest: 8400,
        impliedVolatility: 14.5,
        settlementPrice: 1434.40,
        historicalShift1D: 1434.40,
        historicalShift1W: 1422.00,
        historicalShift1M: 1396.00,
        historicalShift3M: 1338.00,
      },
    ],
  },

  // 10. COPPER COMEX (/HG - Industrial Economic Bellwether)
  {
    id: 'HG',
    symbol: '/HG',
    name: 'Copper COMEX Futures (CME)',
    category: 'METALS',
    exchange: 'COMEX',
    currency: 'USD',
    multiplier: 25000,
    tickSize: 0.0005,
    unit: '25,000 lbs ($250/cent)',
    spotPrice: 4.385,
    spotChange: 0.042,
    spotChangePct: 0.97,
    pricingModel: {
      riskFreeRate: 0.0465,
      storageCostPct: 0.012,
      convenienceYieldPct: 0.028,
    },
    color: '#f59e0b',
    description: 'Dr. Copper global industrial bellwether curve. Reflects green electrification demand, Chinese smelter capacity, and warehouse inventory levels.',
    marketNotes: 'Curve is flat to modest contango. Warehouse stocks in Shanghai and Rotterdam remain balanced; prompt calendar spreads show minimal delivery stress.',
    contracts: [
      {
        ticker: 'HGZ24 (Dec 24)',
        contractMonth: 'Dec 2024',
        monthCode: 'Z24',
        deliveryDate: '2024-12-27',
        daysToExpiration: 55,
        lastPrice: 4.395,
        netChange: 0.041,
        percentChange: 0.94,
        bid: 4.393,
        ask: 4.397,
        volume: 72000,
        openInterest: 142000,
        impliedVolatility: 22.4,
        settlementPrice: 4.354,
        historicalShift1D: 4.354,
        historicalShift1W: 4.480,
        historicalShift1M: 4.560,
        historicalShift3M: 4.180,
      },
      {
        ticker: 'HGH25 (Mar 25)',
        contractMonth: 'Mar 2025',
        monthCode: 'H25',
        deliveryDate: '2025-03-27',
        daysToExpiration: 145,
        lastPrice: 4.415,
        netChange: 0.043,
        percentChange: 0.98,
        bid: 4.413,
        ask: 4.417,
        volume: 48000,
        openInterest: 98000,
        impliedVolatility: 22.8,
        settlementPrice: 4.372,
        historicalShift1D: 4.372,
        historicalShift1W: 4.495,
        historicalShift1M: 4.575,
        historicalShift3M: 4.195,
      },
      {
        ticker: 'HGK25 (May 25)',
        contractMonth: 'May 2025',
        monthCode: 'K25',
        deliveryDate: '2025-05-28',
        daysToExpiration: 207,
        lastPrice: 4.430,
        netChange: 0.044,
        percentChange: 1.00,
        bid: 4.428,
        ask: 4.432,
        volume: 24000,
        openInterest: 54000,
        impliedVolatility: 23.1,
        settlementPrice: 4.386,
        historicalShift1D: 4.386,
        historicalShift1W: 4.510,
        historicalShift1M: 4.590,
        historicalShift3M: 4.210,
      },
      {
        ticker: 'HGN25 (Jul 25)',
        contractMonth: 'Jul 2025',
        monthCode: 'N25',
        deliveryDate: '2025-07-29',
        daysToExpiration: 269,
        lastPrice: 4.445,
        netChange: 0.045,
        percentChange: 1.02,
        bid: 4.442,
        ask: 4.448,
        volume: 14000,
        openInterest: 32000,
        impliedVolatility: 23.4,
        settlementPrice: 4.400,
        historicalShift1D: 4.400,
        historicalShift1W: 4.520,
        historicalShift1M: 4.600,
        historicalShift3M: 4.220,
      },
    ],
  },
];

// -------------------------------------------------------------
// ANALYTICS & MATH CALCULATIONS
// -------------------------------------------------------------

export interface CurveShapeMetrics {
  regime: CurveRegime;
  regimeLabel: string;
  regimeColor: string;
  m1m2Spread: number;
  m1m2SpreadPct: number;
  m1LastSpread: number;
  m1LastSpreadPct: number;
  annualizedRollYield: number; // % annualized return from rolling long front-month position
  isVixInversion: boolean;
  slopeSummary: string;
}

/**
 * Calculates whether the curve is in Contango, Backwardation, Humped, etc.
 */
export function calculateCurveShapeMetrics(structure: FuturesTermStructure): CurveShapeMetrics {
  const { contracts, spotPrice } = structure;
  if (!contracts || contracts.length < 2) {
    return {
      regime: 'FLAT',
      regimeLabel: 'FLAT CURVE',
      regimeColor: '#94a3b8',
      m1m2Spread: 0,
      m1m2SpreadPct: 0,
      m1LastSpread: 0,
      m1LastSpreadPct: 0,
      annualizedRollYield: 0,
      isVixInversion: false,
      slopeSummary: 'Insufficient contract data to determine slope',
    };
  }

  const c1 = contracts[0];
  const c2 = contracts[1];
  const cLast = contracts[contracts.length - 1];

  const m1m2Spread = c2.lastPrice - c1.lastPrice;
  const m1m2SpreadPct = (m1m2Spread / c1.lastPrice) * 100;
  const m1LastSpread = cLast.lastPrice - c1.lastPrice;
  const m1LastSpreadPct = (m1LastSpread / c1.lastPrice) * 100;

  // Annualized roll yield (from long perspective):
  // If F1 < F2 (contango), buyer loses on roll (negative roll yield: (F1 - F2)/F1 * (365/days))
  const dteDiff = Math.max(1, c2.daysToExpiration - c1.daysToExpiration);
  const annualizedRollYield = ((c1.lastPrice - c2.lastPrice) / c1.lastPrice) * (365 / dteDiff) * 100;

  // Check for humped curve (e.g. Natural Gas where peak is in the middle)
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 0; i < contracts.length; i++) {
    if (contracts[i].lastPrice > contracts[maxIdx].lastPrice) maxIdx = i;
    if (contracts[i].lastPrice < contracts[minIdx].lastPrice) minIdx = i;
  }
  const isHumped = maxIdx > 0 && maxIdx < contracts.length - 1 && contracts[maxIdx].lastPrice > c1.lastPrice * 1.05 && contracts[maxIdx].lastPrice > cLast.lastPrice * 1.05;

  const isVixInversion = structure.id === 'VIX' && (spotPrice > c1.lastPrice || c1.lastPrice > c2.lastPrice);

  let regime: CurveRegime = 'CONTANGO';
  let regimeLabel = 'CONTANGO (UPWARD SLOPING)';
  let regimeColor = '#10b981';

  if (isVixInversion) {
    regime = 'EXTREME_BACKWARDATION';
    regimeLabel = '🚨 VIX INVERSION · MARKET STRESS';
    regimeColor = '#ff1744';
  } else if (isHumped) {
    regime = 'HUMPED_SEASONAL';
    regimeLabel = 'HUMPED · SEASONAL DEMAND';
    regimeColor = '#00e5ff';
  } else if (m1m2SpreadPct > 3.0) {
    regime = 'SUPER_CONTANGO';
    regimeLabel = 'SUPER CONTANGO (STEEP DRAG)';
    regimeColor = '#fbbf24';
  } else if (m1m2SpreadPct > 0.15) {
    regime = 'CONTANGO';
    regimeLabel = 'NORMAL CONTANGO';
    regimeColor = '#10b981';
  } else if (m1m2SpreadPct < -3.0) {
    regime = 'EXTREME_BACKWARDATION';
    regimeLabel = 'EXTREME BACKWARDATION (SHORTAGE)';
    regimeColor = '#ff334b';
  } else if (m1m2SpreadPct < -0.15) {
    regime = 'BACKWARDATION';
    regimeLabel = 'BACKWARDATION (POSITIVE CARRY)';
    regimeColor = '#f97316';
  } else {
    regime = 'FLAT';
    regimeLabel = 'FLAT / NEUTRAL CARRY';
    regimeColor = '#94a3b8';
  }

  const slopeSummary =
    regime === 'CONTANGO' || regime === 'SUPER_CONTANGO'
      ? `Upward sloping curve (+${m1m2SpreadPct.toFixed(2)}% M1-M2). Long positions incur negative roll yield (-${Math.abs(annualizedRollYield).toFixed(1)}%/yr). Advantageous for short carry / cash-and-carry.`
      : regime === 'BACKWARDATION' || regime === 'EXTREME_BACKWARDATION'
      ? `Downward sloping curve (${m1m2SpreadPct.toFixed(2)}% M1-M2). Immediate physical delivery trades at premium. Long futures enjoy positive roll yield (+${annualizedRollYield.toFixed(1)}%/yr).`
      : regime === 'HUMPED_SEASONAL'
      ? `Seasonal peak contracts priced higher due to heating/cooling weather cycles. High inter-month calendar spread volatility.`
      : `Flat forward curve with near-zero inter-month roll yield impact.`;

  return {
    regime,
    regimeLabel,
    regimeColor,
    m1m2Spread,
    m1m2SpreadPct,
    m1LastSpread,
    m1LastSpreadPct,
    annualizedRollYield,
    isVixInversion,
    slopeSummary,
  };
}

/**
 * Generates all Inter-Month Calendar Spreads (M1-M2, M1-M3, M2-M3, etc.)
 */
export function calculateCalendarSpreads(structure: FuturesTermStructure): CalendarSpread[] {
  const { contracts } = structure;
  if (!contracts || contracts.length < 2) return [];

  const pairs: [number, number, string][] = [
    [0, 1, 'M1 - M2'],
    [0, 2, 'M1 - M3'],
    [1, 2, 'M2 - M3'],
    [2, 3, 'M3 - M4'],
    [0, contracts.length > 4 ? 4 : contracts.length - 1, 'Front - Far Strip'],
  ];

  return pairs
    .filter(([i, j]) => i < contracts.length && j < contracts.length)
    .map(([i, j, title], idx) => {
      const front = contracts[i];
      const back = contracts[j];
      const spread = front.lastPrice - back.lastPrice;
      const dteDiff = Math.max(1, back.daysToExpiration - front.daysToExpiration);
      const annualizedRoll = ((front.lastPrice - back.lastPrice) / front.lastPrice) * (365 / dteDiff) * 100;
      const isContango = front.lastPrice < back.lastPrice;

      return {
        id: `spread-${structure.id}-${i}-${j}`,
        frontTicker: front.ticker,
        backTicker: back.ticker,
        label: `${title} (${front.monthCode}/${back.monthCode})`,
        frontPrice: front.lastPrice,
        backPrice: back.lastPrice,
        spread: Number(spread.toFixed(3)),
        netChange: Number((front.netChange - back.netChange).toFixed(3)),
        percentile52W: Math.min(99, Math.max(5, Math.round(50 + (spread / (front.lastPrice * 0.05)) * 25))),
        annualizedRollReturn: Number(annualizedRoll.toFixed(2)),
        tradeType: isContango ? 'ROLL_SHORT' : 'ROLL_LONG',
        regime: isContango ? 'CONTANGO' : 'BACKWARDATION',
        interpretation: isContango
          ? `Front month trades at discount of ${Math.abs(spread).toFixed(2)}. Short calendar earns +${Math.abs(annualizedRoll).toFixed(1)}% annualized carry.`
          : `Front month trades at premium of +${spread.toFixed(2)}. Long calendar earns +${annualizedRoll.toFixed(1)}% roll yield into expiration.`,
      };
    });
}

/**
 * Calculates Spot vs Futures Basis ($ and bps) & Cost of Carry
 */
export function calculateBasisAnalysis(
  spotPrice: number,
  contract: FuturesContract,
  pricingModel: PricingCostOfCarry
) {
  const basisDollar = contract.lastPrice - spotPrice; // Premium over spot
  const basisPct = (basisDollar / spotPrice) * 100;
  const basisBps = basisPct * 100;

  const t = Math.max(0.01, contract.daysToExpiration / 365);
  const r = pricingModel.riskFreeRate;
  const q = pricingModel.dividendYield || 0;
  const u = pricingModel.storageCostPct || 0;
  const y = pricingModel.convenienceYieldPct || 0;

  // Theoretical forward price: F = S * e^((r - q + u - y) * T)
  const theoreticalFairValue = spotPrice * Math.exp((r - q + u - y) * t);
  const theoreticalBasis = theoreticalFairValue - spotPrice;
  const mispricingDollar = contract.lastPrice - theoreticalFairValue;
  const mispricingBps = (mispricingDollar / spotPrice) * 10000;

  return {
    basisDollar,
    basisPct,
    basisBps,
    theoreticalFairValue,
    theoreticalBasis,
    mispricingDollar,
    mispricingBps,
    isOvervalued: mispricingDollar > 0,
    annualizedCarryYield: (basisDollar / spotPrice) * (1 / t) * 100,
  };
}

/**
 * VIX Volatility Suite Specific Metrics (Constant maturity forward, roll decay, etc.)
 */
export function calculateVixSuiteMetrics(structure: FuturesTermStructure) {
  if (structure.id !== 'VIX' || structure.contracts.length < 2) return null;

  const c1 = structure.contracts[0];
  const c2 = structure.contracts[1];
  const spotVix = structure.spotPrice;

  // VX2 / VX1 ratio:
  const vxRatio = c2.lastPrice / c1.lastPrice;
  const contangoPct = ((c2.lastPrice - c1.lastPrice) / c1.lastPrice) * 100;

  // 30-Day Constant Maturity VIX Forward:
  // Interpolation between VX1 and VX2 to create an exact 30-day forward matching VXX/SVIX index target
  const dte1 = c1.daysToExpiration;
  const dte2 = c2.daysToExpiration;
  let cm30 = c1.lastPrice;
  if (dte2 > dte1) {
    const weight1 = Math.max(0, Math.min(1, (dte2 - 30) / (dte2 - dte1)));
    const weight2 = 1 - weight1;
    cm30 = c1.lastPrice * weight1 + c2.lastPrice * weight2;
  }

  // Estimated daily drag on Long Volatility ETFs (UVXY, VXX) due to roll:
  const dailyDragPct = -(contangoPct / Math.max(1, dte2 - dte1));
  const monthlyDragPct = dailyDragPct * 21; // ~21 trading days

  return {
    spotVix,
    vx1: c1.lastPrice,
    vx2: c2.lastPrice,
    vxRatio: Number(vxRatio.toFixed(3)),
    contangoPct: Number(contangoPct.toFixed(2)),
    constantMaturity30D: Number(cm30.toFixed(2)),
    dailyDragPct: Number(dailyDragPct.toFixed(3)),
    monthlyDragPct: Number(monthlyDragPct.toFixed(2)),
    annualizedShortVolYield: Number((Math.abs(monthlyDragPct) * 12).toFixed(1)),
    isFrontInversion: spotVix > c1.lastPrice,
  };
}
