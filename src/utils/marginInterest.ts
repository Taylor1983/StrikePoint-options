import { Position, Ticker, PositionBorrowInterestMetrics, PortfolioMarginInterestSummary } from '../types/options';

export type { PositionBorrowInterestMetrics, PortfolioMarginInterestSummary };

/**
 * Institutional Benchmark Interest Rates & Financing Parameters (2026)
 */
export const BENCHMARK_RATES = {
  US_SOFR: 0.0525,       // 5.25% Fed Funds / SOFR benchmark
  CAD_BOC: 0.0425,       // 4.25% Bank of Canada policy rate
  DAYS_IN_YEAR: 360,     // Wall Street / Money Market 360-day standard accrual convention
};

/**
 * Hard-to-Borrow (HTB) and Easy-to-Borrow (ETB) Stock Loan Rate Catalog (% APR)
 */
export const STOCK_BORROW_RATES: Record<string, { rate: number; classification: 'ETB' | 'HTB'; label: string }> = {
  SPY: { rate: 0.0025, classification: 'ETB', label: 'Easy to Borrow (0.25% APR)' },
  QQQ: { rate: 0.0025, classification: 'ETB', label: 'Easy to Borrow (0.25% APR)' },
  AAPL: { rate: 0.0030, classification: 'ETB', label: 'Easy to Borrow (0.30% APR)' },
  NVDA: { rate: 0.0035, classification: 'ETB', label: 'Easy to Borrow (0.35% APR)' },
  MSFT: { rate: 0.0028, classification: 'ETB', label: 'Easy to Borrow (0.28% APR)' },
  AMZN: { rate: 0.0030, classification: 'ETB', label: 'Easy to Borrow (0.30% APR)' },
  META: { rate: 0.0035, classification: 'ETB', label: 'Easy to Borrow (0.35% APR)' },
  BP: { rate: 0.0040, classification: 'ETB', label: 'Easy to Borrow (0.40% APR)' },
  'RY.TO': { rate: 0.0035, classification: 'ETB', label: 'Easy to Borrow TSX (0.35% APR)' },
  'ENB.TO': { rate: 0.0030, classification: 'ETB', label: 'Easy to Borrow TSX (0.30% APR)' },
  'SHOP.TO': { rate: 0.0110, classification: 'ETB', label: 'Moderate Borrow TSX (1.10% APR)' },

  // Moderate Borrow
  TSLA: { rate: 0.0125, classification: 'ETB', label: 'Moderate Short Interest (1.25% APR)' },
  AMD: { rate: 0.0085, classification: 'ETB', label: 'Moderate Short Interest (0.85% APR)' },

  // Hard-to-Borrow (HTB)
  DJT: { rate: 0.1850, classification: 'HTB', label: 'Hard-to-Borrow Special (18.50% APR)' },
  GME: { rate: 0.1220, classification: 'HTB', label: 'Hard-to-Borrow Meme (12.20% APR)' },
  AMC: { rate: 0.1450, classification: 'HTB', label: 'Hard-to-Borrow Meme (14.50% APR)' },
  SMCI: { rate: 0.0780, classification: 'HTB', label: 'Hard-to-Borrow Tech (7.80% APR)' },
  CVNA: { rate: 0.0540, classification: 'HTB', label: 'Hard-to-Borrow Auto (5.40% APR)' },
};

/**
 * CME / ICE Futures SPAN Initial Margin & Carrying Cost Rates
 */
export const FUTURES_CARRYING_RATES: Record<string, { initialMarginPerContract: number; annualRate: number; label: string }> = {
  '/ES': { initialMarginPerContract: 12320, annualRate: 0.0525, label: 'CME SPAN Cost of Carry (5.25% SOFR)' },
  '/NQ': { initialMarginPerContract: 18480, annualRate: 0.0525, label: 'CME SPAN Cost of Carry (5.25% SOFR)' },
  '/CL': { initialMarginPerContract: 6820, annualRate: 0.0510, label: 'NYMEX WTI Storage & Carry (5.10%)' },
  '/GC': { initialMarginPerContract: 10500, annualRate: 0.0500, label: 'COMEX Gold Lease & Financing (5.00%)' },
  '/BTC': { initialMarginPerContract: 28000, annualRate: 0.0650, label: 'CME Bitcoin Margin Financing (6.50%)' },
  '/ZB': { initialMarginPerContract: 4200, annualRate: 0.0480, label: 'CBOT 30Y Treasury Repo Carry (4.80%)' },
  '/RTY': { initialMarginPerContract: 7150, annualRate: 0.0525, label: 'CME Russell 2000 Carry (5.25%)' },
  // TSX / BOURSE DE MONTRÉAL (MX) FUTURES
  '/SXF': { initialMarginPerContract: 14200, annualRate: 0.0475, label: 'MX S&P/TSX 60 CDCC SPAN (4.75% CORRA)' },
  '/SXM': { initialMarginPerContract: 3550, annualRate: 0.0475, label: 'MX Mini TSX 60 CDCC SPAN (4.75% CORRA)' },
  '/CGB': { initialMarginPerContract: 2800, annualRate: 0.0425, label: 'MX 10Y GoC Bond Benchmark Carry (4.25%)' },
  '/CRA': { initialMarginPerContract: 1250, annualRate: 0.0410, label: 'MX 3M CORRA Interest Rate Carry (4.10%)' },
  '/SCF': { initialMarginPerContract: 11800, annualRate: 0.0475, label: 'MX TSX Composite CDCC Carry (4.75% CORRA)' },
  '/CGF': { initialMarginPerContract: 1900, annualRate: 0.0420, label: 'MX 5Y GoC Bond Benchmark Carry (4.20%)' },
  '/6C': { initialMarginPerContract: 1650, annualRate: 0.0475, label: 'CME/MX CAD Currency Carry (4.75%)' },
};

/**
 * Get borrow rate for any stock
 */
export function getStockBorrowRate(ticker: string): { rate: number; isHtb: boolean; classification: 'ETB' | 'HTB'; label: string } {
  const norm = ticker.toUpperCase();
  if (STOCK_BORROW_RATES[norm]) {
    const item = STOCK_BORROW_RATES[norm];
    return {
      rate: item.rate,
      isHtb: item.classification === 'HTB',
      classification: item.classification,
      label: item.label,
    };
  }
  // Default ETB rate
  return {
    rate: 0.0035,
    isHtb: false,
    classification: 'ETB',
    label: 'Standard Easy to Borrow (0.35% APR)',
  };
}

/**
 * Get broker tiered margin debit borrowing interest rate
 */
export function getBrokerMarginDebitRate(debitBalance: number, currency: 'USD' | 'CAD' = 'USD'): number {
  const benchmark = currency === 'CAD' ? BENCHMARK_RATES.CAD_BOC : BENCHMARK_RATES.US_SOFR;
  if (debitBalance <= 100000) {
    return benchmark + 0.0150; // +1.50% (Tier 1)
  }
  if (debitBalance <= 1000000) {
    return benchmark + 0.0100; // +1.00% (Tier 2)
  }
  return benchmark + 0.0050; // +0.50% (Tier 3)
}

/**
 * Calculate financing/interest and borrow fees for a single position
 */
export function calculatePositionBorrowInterest(
  pos: Position,
  spotPrice: number
): PositionBorrowInterestMetrics | null {
  const stockLeg = pos.legs.find((l) => l.type === 'stock');
  const futureLeg = pos.legs.find((l) => l.type === 'future');
  const optionLegs = pos.legs.filter((l) => l.type === 'call' || l.type === 'put');

  // 1. Short Stock Position (Borrow fee applies!)
  if (stockLeg && stockLeg.action === 'sell') {
    const contracts = stockLeg.contracts;
    const notionalValue = spotPrice * contracts;
    const { rate, classification, label } = getStockBorrowRate(pos.ticker);
    
    // Daily borrow fee = (Notional * Borrow Rate) / 360
    const annualInterestCost = notionalValue * rate;
    const dailyInterestCost = annualInterestCost / BENCHMARK_RATES.DAYS_IN_YEAR;
    const monthlyInterestCost = dailyInterestCost * 30;

    // Reg-T Short Margin Requirement (150% of short market value, of which 100% is short proceeds, 50% equity margin)
    const marginRequirement = notionalValue * 0.50;

    // Short rebate: institutional credit earned on short sale cash proceeds minus borrow fee
    const shortRebateRate = Number((BENCHMARK_RATES.US_SOFR - rate).toFixed(4));

    return {
      positionId: pos.id,
      ticker: pos.ticker,
      strategyName: pos.strategyName || `Short Stock (${contracts} shs)`,
      assetType: 'stock',
      isShort: true,
      contractsOrShares: contracts,
      notionalValue: Number(notionalValue.toFixed(2)),
      marginRequirement: Number(marginRequirement.toFixed(2)),
      annualInterestRate: rate,
      dailyInterestCost: Number((-dailyInterestCost).toFixed(2)), // negative = cost
      monthlyInterestCost: Number((-monthlyInterestCost).toFixed(2)),
      annualInterestCost: Number((-annualInterestCost).toFixed(2)),
      borrowClassification: classification,
      borrowClassificationLabel: label,
      shortRebateRate,
      taxDeductible: true,
      taxNote: 'Deductible investment expense (IRS Form 4952 / CRA Line 22100 in non-registered accounts)',
    };
  }

  // 2. Futures Position (CME SPAN margin carrying cost & opportunity cost)
  if (futureLeg) {
    const contracts = futureLeg.contracts;
    const mult = futureLeg.multiplier || (pos.ticker === '/CL' ? 1000 : pos.ticker === '/ES' ? 50 : 20);
    const notionalValue = spotPrice * contracts * mult;
    const futuresCfg = FUTURES_CARRYING_RATES[pos.ticker] || {
      initialMarginPerContract: 10000,
      annualRate: BENCHMARK_RATES.US_SOFR,
      label: 'Futures SPAN Margin Financing (5.25%)',
    };

    const marginRequirement = contracts * futuresCfg.initialMarginPerContract;
    // Carrying cost on locked collateral: (Margin * Annual Rate) / 360
    const annualInterestCost = marginRequirement * futuresCfg.annualRate;
    const dailyInterestCost = annualInterestCost / BENCHMARK_RATES.DAYS_IN_YEAR;
    const monthlyInterestCost = dailyInterestCost * 30;

    return {
      positionId: pos.id,
      ticker: pos.ticker,
      strategyName: pos.strategyName || `${futureLeg.action === 'buy' ? 'Long' : 'Short'} Future (${contracts} cts)`,
      assetType: 'future',
      isShort: futureLeg.action === 'sell',
      contractsOrShares: contracts,
      notionalValue: Number(notionalValue.toFixed(2)),
      marginRequirement: Number(marginRequirement.toFixed(2)),
      annualInterestRate: futuresCfg.annualRate,
      dailyInterestCost: Number((-dailyInterestCost).toFixed(2)),
      monthlyInterestCost: Number((-monthlyInterestCost).toFixed(2)),
      annualInterestCost: Number((-annualInterestCost).toFixed(2)),
      borrowClassification: 'SPAN_FINANCING',
      borrowClassificationLabel: futuresCfg.label,
      taxDeductible: true,
      taxNote: 'Mark-to-Market 60/40 capital treatment (IRS Sec 1256 / Canadian capital gain)',
    };
  }

  // 3. Naked Short Options (Collateral opportunity cost)
  const shortOptionLegs = optionLegs.filter((l) => l.action === 'sell');
  if (shortOptionLegs.length > 0 && (!stockLeg || stockLeg.action !== 'buy')) {
    let totalLockedMargin = 0;
    shortOptionLegs.forEach((leg) => {
      const mult = (leg.multiplier || 100) * leg.contracts;
      const prem = leg.premium * mult;
      totalLockedMargin += Math.max(spotPrice * mult * 0.20 + prem, spotPrice * mult * 0.10 + prem);
    });

    // Opportunity cost of cash tied up in margin collateral at risk-free rate
    const annualCost = totalLockedMargin * 0.0525 * 0.5; // discounted opportunity cost
    const dailyCost = annualCost / BENCHMARK_RATES.DAYS_IN_YEAR;

    return {
      positionId: pos.id,
      ticker: pos.ticker,
      strategyName: pos.strategyName || 'Short Option Liability',
      assetType: 'option',
      isShort: true,
      contractsOrShares: shortOptionLegs.reduce((s, l) => s + l.contracts, 0),
      notionalValue: Number((spotPrice * shortOptionLegs[0].contracts * 100).toFixed(2)),
      marginRequirement: Number(totalLockedMargin.toFixed(2)),
      annualInterestRate: 0.0525,
      dailyInterestCost: Number((-dailyCost).toFixed(2)),
      monthlyInterestCost: Number((-dailyCost * 30).toFixed(2)),
      annualInterestCost: Number((-annualCost).toFixed(2)),
      borrowClassification: 'COLLATERAL_HOLD',
      borrowClassificationLabel: 'FINRA Rule 4210 Short Option Margin Collateral',
      taxDeductible: false,
      taxNote: 'Capital collateral hold (cost absorbed in option premium decay)',
    };
  }

  return null;
}

/**
 * Calculate comprehensive Portfolio Margin Interest & Borrow Summary
 */
export function calculatePortfolioMarginInterest(
  cashBalance: number,
  positions: Position[],
  tickers?: Record<string, Ticker>,
  currency: 'USD' | 'CAD' = 'USD'
): PortfolioMarginInterestSummary {
  const items: PositionBorrowInterestMetrics[] = [];
  let shortStockDailyBorrowCost = 0;
  let futuresDailyCarryingCost = 0;

  positions.forEach((pos) => {
    const spot = tickers?.[pos.ticker]?.price || (pos.legs[0]?.strike || 100);
    const item = calculatePositionBorrowInterest(pos, spot);
    if (item) {
      items.push(item);
      if (item.assetType === 'stock' && item.isShort) {
        shortStockDailyBorrowCost += Math.abs(item.dailyInterestCost);
      } else if (item.assetType === 'future') {
        futuresDailyCarryingCost += Math.abs(item.dailyInterestCost);
      }
    }
  });

  // Calculate Cash Debit Margin Interest
  let cashDebitDailyInterest = 0;
  let marginDebitBalance = 0;
  const brokerDebitRate = getBrokerMarginDebitRate(Math.abs(cashBalance), currency);

  if (cashBalance < 0) {
    marginDebitBalance = Math.abs(cashBalance);
    const annualDebitCost = marginDebitBalance * brokerDebitRate;
    cashDebitDailyInterest = annualDebitCost / BENCHMARK_RATES.DAYS_IN_YEAR;

    items.unshift({
      positionId: 'pos-debit-cash',
      ticker: 'CASH DEBIT',
      strategyName: `Negative Cash Balance ($${marginDebitBalance.toLocaleString()} ${currency} Margin Loan)`,
      assetType: 'cash_debit',
      isShort: false,
      contractsOrShares: 1,
      notionalValue: marginDebitBalance,
      marginRequirement: marginDebitBalance,
      annualInterestRate: brokerDebitRate,
      dailyInterestCost: Number((-cashDebitDailyInterest).toFixed(2)),
      monthlyInterestCost: Number((-cashDebitDailyInterest * 30).toFixed(2)),
      annualInterestCost: Number((-annualDebitCost).toFixed(2)),
      borrowClassification: 'DEBIT_BORROW',
      borrowClassificationLabel: `Broker Margin Debit Rate (${(brokerDebitRate * 100).toFixed(2)}% APR)`,
      taxDeductible: true,
      taxNote: 'Deductible carrying charge against taxable investment income (CRA Line 22100 / IRS Schedule A)',
    });
  }

  const totalDailyInterestCost = Number((shortStockDailyBorrowCost + futuresDailyCarryingCost + cashDebitDailyInterest).toFixed(2));
  const totalMonthlyInterestCost = Number((totalDailyInterestCost * 30).toFixed(2));
  const totalAnnualInterestCost = Number((totalDailyInterestCost * BENCHMARK_RATES.DAYS_IN_YEAR).toFixed(2));

  return {
    totalDailyInterestCost,
    totalMonthlyInterestCost,
    totalAnnualInterestCost,
    shortStockDailyBorrowCost: Number(shortStockDailyBorrowCost.toFixed(2)),
    futuresDailyCarryingCost: Number(futuresDailyCarryingCost.toFixed(2)),
    cashDebitDailyInterest: Number(cashDebitDailyInterest.toFixed(2)),
    marginDebitBalance: Number(marginDebitBalance.toFixed(2)),
    benchmarkBorrowRate: currency === 'CAD' ? BENCHMARK_RATES.CAD_BOC : BENCHMARK_RATES.US_SOFR,
    brokerMarginDebitRate: brokerDebitRate,
    positionsCountWithFinancing: items.length,
    items,
  };
}
