export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: string;
  avgVolume: string;
  marketCap: string;
  peRatio: string;
  ivRank: number; // 0 - 100%
  ivPercentile: number; // 0 - 100%
  historicalVol30d: number; // e.g. 0.22 (22%)
  currentIV: number; // e.g. 0.26 (26%)
  beta: number;
  week52High: number;
  week52Low: number;
  candles: Candle[];
  assetType?: 'equity' | 'index' | 'future';
  multiplier?: number; // e.g. 100 for equity options, 50 for /ES, 20 for /NQ, 200 for /SXF, 1000 for /CL, 5 for /BTC
  tickSize?: number;
  daysToEarnings?: number | null;
  earningsDate?: string;
  earningsEstimatedMovePct?: number;
  earningsIvTrend5d?: number[];
  currency?: 'USD' | 'CAD';
  exchange?: string;
  isCanadian?: boolean;
}

export interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  change: number;
  volume: number;
  openInterest: number;
  iv: number; // e.g. 0.245
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  itm: boolean;
}

export interface ExpirationOptionChain {
  expirationDate: string; // e.g. "2026-10-02"
  formattedDate: string;  // e.g. "Oct 02, 2026"
  dte: number;            // days to expiration
  avgIV: number;          // e.g. 0.25
  month?: string;         // e.g. "OCT", "DEC", "SEP"
  monthYear?: string;     // e.g. "OCT '26", "DEC '26"
  isQuadWitching?: boolean; // Quadruple Witching expiration (Index Futures + Index Options + Stock Options + Single Stock Futures)
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface TradeLeg {
  id: string;
  type: 'call' | 'put' | 'stock' | 'future';
  action: 'buy' | 'sell';
  strike: number;
  expiration: string;
  dte: number;
  iv: number;
  premium: number; // price per share or point
  contracts: number;
  multiplier?: number; // e.g. 50 for /ES, 20 for /NQ, 1000 for /CL, 100 for stocks, etc.
  underlyingSymbol?: string;
}

export interface Order {
  id: string;
  timestamp: string;
  ticker: string;
  strategyName: string;
  type: 'market' | 'limit';
  limitPrice: number;
  legs: TradeLeg[];
  contracts: number;
  netDebitCredit: number; // positive = debit, negative = credit
  totalCost: number;      // total $ cash movement
  status: 'filled' | 'cancelled';
  assetCategory?: 'option' | 'stock' | 'future';
  sharesOrContracts?: number;
  entryIV?: number;       // Implied Volatility when trade was executed (e.g. 0.468 for 46.8%)
  tradeIV?: number;       // Alias for entryIV
}

export interface Position {
  id: string;
  ticker: string;
  strategyName: string;
  openedAt: string;
  legs: TradeLeg[];
  contracts: number;
  entryCost: number;      // initial net debit (+) or credit (-)
  currentMark: number;    // current liquidation value
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  assetCategory?: 'option' | 'stock' | 'future';
  sharesOrContracts?: number;
  entryIV?: number;       // Implied Volatility when trade was executed (e.g. 0.468 for 46.8%)
  tradeIV?: number;       // Alias for entryIV
}

export interface AccountState {
  cashBalance: number;
  startingBalance: number;
  realizedPnL: number;
  positions: Position[];
  orders: Order[];
}

export type TerminalScreen = 'omon' | 'ovme' | 'risk' | 'cone' | 'scen' | 'flow' | 'vols' | 'chart' | 'port' | 'monitor' | 'statement' | 'hivg' | 'surf' | 'pcr' | 'opec' | 'tariff' | 'defcon' | 'vega' | 'yc' | 'macro' | 'div' | 'witch' | 'bnn' | 'exp' | 'fts' | 'tsxf' | 'gics' | 'gic' | 'des' | 'skew' | 'journal' | 'educ';

export interface MarginHealthMetrics {
  healthScore: number; // 0 - 100
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  statusColor: string;
  netLiquidity: number;
  initialMarginReq: number;
  maintenanceMarginReq: number;
  marginCushionDollar: number;
  marginCushionPercent: number;
  optionsBuyingPower: number;
  grossNotionalExposure: number;
  leverageRatio: number;
  spyDropTolerancePct: number;
  isMarginCall: boolean;
  isWarning: boolean;
  telemetryTimestamp?: string;
  liquidationSpyPrice?: number;
  marginVelocityDollar?: number;
  marginInterestSummary?: PortfolioMarginInterestSummary;
}

export interface PositionBorrowInterestMetrics {
  positionId: string;
  ticker: string;
  strategyName: string;
  assetType: 'stock' | 'future' | 'option' | 'cash_debit';
  isShort: boolean;
  contractsOrShares: number;
  notionalValue: number;
  marginRequirement: number;
  annualInterestRate: number; // e.g. 0.0125 (1.25%)
  dailyInterestCost: number;   // $ per day (negative = cost, positive = net rebate)
  monthlyInterestCost: number; // $ per 30 days
  annualInterestCost: number;  // $ per 360 days
  borrowClassification: 'ETB' | 'HTB' | 'SPAN_FINANCING' | 'DEBIT_BORROW' | 'COLLATERAL_HOLD';
  borrowClassificationLabel: string;
  shortRebateRate?: number;
  taxDeductible: boolean;
  taxNote: string;
}

export interface PortfolioMarginInterestSummary {
  totalDailyInterestCost: number;   // total $ per day accrued
  totalMonthlyInterestCost: number; // total $ per 30 days
  totalAnnualInterestCost: number;  // total $ per 360 days
  shortStockDailyBorrowCost: number;
  futuresDailyCarryingCost: number;
  cashDebitDailyInterest: number;
  marginDebitBalance: number;
  benchmarkBorrowRate: number;
  brokerMarginDebitRate: number;
  positionsCountWithFinancing: number;
  items: PositionBorrowInterestMetrics[];
}

export interface MarginTelemetryEvent {
  id: string;
  timestamp: string;
  timeMs: number;
  score: number;
  cushionDollar: number;
  cushionPercent: number;
  velocityDollar: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  statusColor: string;
  description: string;
}

export interface UnusualFlowItem {
  id: string;
  time: string;
  ticker: string;
  strike: number;
  type: 'CALL' | 'PUT';
  expiration: string;
  dte: number;
  spot: number;
  orderType: 'SWEEP' | 'BLOCK' | 'SPLIT';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  contracts: number;
  premium: number;
  pricePerShare: number;
  impliedVol: number;
  openInterest: number;
  volume: number;
  exchange: 'CBOE' | 'PHLX' | 'BOX' | 'ARCA' | 'EDGX';
  details: string;
}

export interface MacroIndexQuote {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePct: number;
  isRateOrYield?: boolean;
}

