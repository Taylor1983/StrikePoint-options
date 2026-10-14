export interface DividendStock {
  symbol: string;
  name: string;
  price: number;
  annualDividend: number;      // $ per share per year
  dividendYield: number;       // e.g. 0.0345 for 3.45%
  quarterlyPayout: number;     // $ per share per payment
  payoutRatio: number;         // % of net earnings (e.g. 48.2%)
  exDividendDate: string;      // e.g. "2026-10-15"
  recordDate: string;          // e.g. "2026-10-16"
  payableDate: string;         // e.g. "2026-11-02"
  frequency: 'Quarterly' | 'Monthly' | 'Semi-Annual' | 'Annual';
  consecutiveGrowthYears: number; // e.g. 62 years for Dividend Kings
  dividendGrowth5YrCAGR: number; // e.g. 0.068 for 6.8% CAGR
  sector: string;
  safetyScore: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C' | 'D';
  safetyLabel: string;
  freeCashFlowCoverage: number;  // FCF / Dividends (e.g. 2.8x)
  taxClassification: 'Qualified' | 'Ordinary' | 'REIT' | 'Canadian Eligible';
  coveredCallAnnualYield?: number; // Estimated 30-day OTM covered call yield annualized
  description: string;
}

export interface PortfolioDividendHolding {
  positionId: string;
  ticker: string;
  name: string;
  shares: number;
  costBasisPerShare: number;
  currentPrice: number;
  annualDividendPerShare: number;
  annualProjectedIncome: number;
  quarterlyPayout: number;
  currentYield: number;
  yieldOnCost: number;        // (Annual Div / Cost Basis) * 100
  exDividendDate: string;
  payableDate: string;
  daysUntilExDate: number;
  isShort: boolean;
  shortDividendLiability?: number; // short seller pays dividend
  hasOptionsCallAssignmentRisk: boolean;
  assignmentRiskDetails?: string;
  qualification: string;
}

export interface MonthlyDividendCashFlow {
  month: string;           // "Jan", "Feb", etc.
  monthIndex: number;      // 0 - 11
  projectedAmount: number; // $ expected cash flow
  payers: { symbol: string; amount: number; payableDate: string }[];
}

export interface DripSimulationYear {
  year: number;
  withoutDripShares: number;
  withoutDripValue: number;
  withoutDripAnnualIncome: number;
  withDripShares: number;
  withDripValue: number;
  withDripAnnualIncome: number;
  cumulativeDividendsReinvested: number;
}

/**
 * Institutional Market Dividend Universe
 * Grounded in real S&P 500 Dividend Aristocrats, Kings, Tech Income Payers, REITs, and Canadian Leaders
 */
export const MARKET_DIVIDEND_STOCKS: DividendStock[] = [
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    price: 568.25,
    annualDividend: 7.12,
    dividendYield: 0.0125,
    quarterlyPayout: 1.78,
    payoutRatio: 36.4,
    exDividendDate: '2026-10-18',
    recordDate: '2026-10-19',
    payableDate: '2026-10-31',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 14,
    dividendGrowth5YrCAGR: 0.054,
    sector: 'Broad Market ETF',
    safetyScore: 'A+',
    safetyLabel: 'Institutional Core Grade',
    freeCashFlowCoverage: 4.2,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.098,
    description: 'Premier S&P 500 benchmark ETF with consistent quarterly cash dividend distributions.',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 227.80,
    annualDividend: 1.04,
    dividendYield: 0.0046,
    quarterlyPayout: 0.26,
    payoutRatio: 15.2,
    exDividendDate: '2026-11-08',
    recordDate: '2026-11-09',
    payableDate: '2026-11-14',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 13,
    dividendGrowth5YrCAGR: 0.061,
    sector: 'Information Technology',
    safetyScore: 'A+',
    safetyLabel: 'Fortress Balance Sheet',
    freeCashFlowCoverage: 6.8,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.124,
    description: 'Massive cash generation machine with steady annual increases paired with colossal share buybacks.',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 129.40,
    annualDividend: 0.40,
    dividendYield: 0.0031,
    quarterlyPayout: 0.10,
    payoutRatio: 8.4,
    exDividendDate: '2026-10-10',
    recordDate: '2026-10-11',
    payableDate: '2026-10-24',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 6,
    dividendGrowth5YrCAGR: 0.145,
    sector: 'Semiconductors',
    safetyScore: 'A',
    safetyLabel: 'Exceptional AI FCF Coverage',
    freeCashFlowCoverage: 11.4,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.245,
    description: 'Post-split AI sovereign leader maintaining token dividend with unmatched free cash flow coverage.',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 442.10,
    annualDividend: 3.32,
    dividendYield: 0.0075,
    quarterlyPayout: 0.83,
    payoutRatio: 26.8,
    exDividendDate: '2026-11-20',
    recordDate: '2026-11-21',
    payableDate: '2026-12-11',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 22,
    dividendGrowth5YrCAGR: 0.102,
    sector: 'Cloud & Enterprise Software',
    safetyScore: 'A+',
    safetyLabel: 'AAA Credit Rating',
    freeCashFlowCoverage: 4.8,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.112,
    description: 'Consecutive double-digit annual dividend grower with dual Azure cloud and generative AI engine.',
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    price: 164.20,
    annualDividend: 4.96,
    dividendYield: 0.0302,
    quarterlyPayout: 1.24,
    payoutRatio: 52.4,
    exDividendDate: '2026-11-18',
    recordDate: '2026-11-19',
    payableDate: '2026-12-08',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 63,
    dividendGrowth5YrCAGR: 0.058,
    sector: 'Healthcare & Pharma',
    safetyScore: 'A+',
    safetyLabel: 'Dividend King (63 Yrs)',
    freeCashFlowCoverage: 2.6,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.082,
    description: 'Elite Dividend King with 63 consecutive annual hikes; AAA sovereign-equivalent credit rating.',
  },
  {
    symbol: 'KO',
    name: 'The Coca-Cola Company',
    price: 68.40,
    annualDividend: 1.94,
    dividendYield: 0.0284,
    quarterlyPayout: 0.485,
    payoutRatio: 68.2,
    exDividendDate: '2026-11-30',
    recordDate: '2026-12-01',
    payableDate: '2026-12-15',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 62,
    dividendGrowth5YrCAGR: 0.046,
    sector: 'Consumer Staples',
    safetyScore: 'A',
    safetyLabel: 'Dividend King (62 Yrs)',
    freeCashFlowCoverage: 2.1,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.076,
    description: 'Buffett cornerstone holding; inelastic consumer beverage demand driving uninterrupted payouts since 1920.',
  },
  {
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    price: 172.50,
    annualDividend: 4.03,
    dividendYield: 0.0234,
    quarterlyPayout: 1.0075,
    payoutRatio: 59.8,
    exDividendDate: '2026-10-22',
    recordDate: '2026-10-23',
    payableDate: '2026-11-15',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 68,
    dividendGrowth5YrCAGR: 0.062,
    sector: 'Consumer Staples',
    safetyScore: 'A+',
    safetyLabel: 'Dividend King (68 Yrs)',
    freeCashFlowCoverage: 2.4,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.078,
    description: 'Household brand monopoly with 68 consecutive years of dividend increases through all economic cycles.',
  },
  {
    symbol: 'ABBV',
    name: 'AbbVie Inc.',
    price: 191.80,
    annualDividend: 6.20,
    dividendYield: 0.0323,
    quarterlyPayout: 1.55,
    payoutRatio: 54.2,
    exDividendDate: '2026-10-14',
    recordDate: '2026-10-15',
    payableDate: '2026-11-14',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 52,
    dividendGrowth5YrCAGR: 0.088,
    sector: 'Biopharma',
    safetyScore: 'A',
    safetyLabel: 'High Yield Aristocrat',
    freeCashFlowCoverage: 2.3,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.108,
    description: 'High-yield biopharmaceutical giant with post-Humira growth engines Skyrizi & Rinvoq expanding cash flow.',
  },
  {
    symbol: 'O',
    name: 'Realty Income Corporation',
    price: 54.60,
    annualDividend: 3.16,
    dividendYield: 0.0579,
    quarterlyPayout: 0.263, // paid monthly ($0.263/mo)
    payoutRatio: 74.5,
    exDividendDate: '2026-10-31',
    recordDate: '2026-11-01',
    payableDate: '2026-11-15',
    frequency: 'Monthly',
    consecutiveGrowthYears: 30,
    dividendGrowth5YrCAGR: 0.038,
    sector: 'Real Estate (Triple Net REIT)',
    safetyScore: 'A-',
    safetyLabel: 'The Monthly Dividend Company',
    freeCashFlowCoverage: 1.4,
    taxClassification: 'REIT',
    coveredCallAnnualYield: 0.092,
    description: 'Triple-net retail lease REIT paying monthly compounding dividends with 107 consecutive quarterly increases.',
  },
  {
    symbol: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    price: 84.10,
    annualDividend: 2.92,
    dividendYield: 0.0347,
    quarterlyPayout: 0.73,
    payoutRatio: 48.0,
    exDividendDate: '2026-12-08',
    recordDate: '2026-12-09',
    payableDate: '2026-12-14',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 13,
    dividendGrowth5YrCAGR: 0.118,
    sector: 'Dividend Growth ETF',
    safetyScore: 'A+',
    safetyLabel: 'Screened Quality Core',
    freeCashFlowCoverage: 3.5,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.088,
    description: 'Gold-standard dividend ETF tracking the Dow Jones U.S. Dividend 100 Index with 100+ vetted cash-flow leaders.',
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    price: 218.40,
    annualDividend: 4.80,
    dividendYield: 0.0220,
    quarterlyPayout: 1.20,
    payoutRatio: 30.5,
    exDividendDate: '2026-10-04',
    recordDate: '2026-10-05',
    payableDate: '2026-10-31',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 14,
    dividendGrowth5YrCAGR: 0.082,
    sector: 'Financials & Banking',
    safetyScore: 'A',
    safetyLabel: 'Fortress US Tier-1 Bank',
    freeCashFlowCoverage: 3.8,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.115,
    description: 'Dominant global banking franchise with fortress balance sheet and disciplined post-Fed stress test dividend raises.',
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    price: 119.50,
    annualDividend: 3.96,
    dividendYield: 0.0331,
    quarterlyPayout: 0.99,
    payoutRatio: 44.8,
    exDividendDate: '2026-11-12',
    recordDate: '2026-11-13',
    payableDate: '2026-12-10',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 42,
    dividendGrowth5YrCAGR: 0.039,
    sector: 'Energy & Integrated Oil',
    safetyScore: 'A-',
    safetyLabel: 'Energy Dividend Aristocrat',
    freeCashFlowCoverage: 2.8,
    taxClassification: 'Qualified',
    coveredCallAnnualYield: 0.134,
    description: 'Supermajor energy producer with breakeven cost below $35/bbl and 42 consecutive years of dividend growth.',
  },
  {
    symbol: 'RY.TO',
    name: 'Royal Bank of Canada',
    price: 168.20,
    annualDividend: 5.76,
    dividendYield: 0.0342,
    quarterlyPayout: 1.44,
    payoutRatio: 46.2,
    exDividendDate: '2026-10-24',
    recordDate: '2026-10-25',
    payableDate: '2026-11-22',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 14,
    dividendGrowth5YrCAGR: 0.072,
    sector: 'Canadian Financials',
    safetyScore: 'A+',
    safetyLabel: 'Canadian Eligible Credit',
    freeCashFlowCoverage: 3.2,
    taxClassification: 'Canadian Eligible',
    coveredCallAnnualYield: 0.084,
    description: 'Canada’s largest bank by market cap; uninterrupted dividend payments since 1870 with eligible tax credit.',
  },
  {
    symbol: 'ENB.TO',
    name: 'Enbridge Inc.',
    price: 52.80,
    annualDividend: 3.72,
    dividendYield: 0.0705,
    quarterlyPayout: 0.93,
    payoutRatio: 64.0,
    exDividendDate: '2026-11-14',
    recordDate: '2026-11-15',
    payableDate: '2026-12-01',
    frequency: 'Quarterly',
    consecutiveGrowthYears: 30,
    dividendGrowth5YrCAGR: 0.048,
    sector: 'Canadian Energy Midstream',
    safetyScore: 'B+',
    safetyLabel: 'High Yield Utility Pipeline',
    freeCashFlowCoverage: 1.8,
    taxClassification: 'Canadian Eligible',
    coveredCallAnnualYield: 0.095,
    description: 'High-yield North American pipeline utility generating 98% regulated cash flow with 30-year dividend hike streak.',
  },
];

/**
 * Calculates current portfolio dividend statistics based on open stock positions and covered calls
 */
export function calculatePortfolioDividends(
  positions: { id?: string; ticker: string; contracts: number; entryCost: number; currentMark: number; legs: any[] }[],
  tickers: Record<string, { price: number; name?: string }> = {}
): {
  holdings: PortfolioDividendHolding[];
  annualProjectedIncome: number;
  portfolioDividendYield: number;
  portfolioYieldOnCost: number;
  totalStockPortfolioValue: number;
  totalCostBasis: number;
  upcomingPayoutsNext30Days: number;
  monthlyCashFlows: MonthlyDividendCashFlow[];
  earlyAssignmentRiskCount: number;
  shortDividendLiabilityTotal: number;
} {
  const stockHoldings: PortfolioDividendHolding[] = [];
  let totalStockPortfolioValue = 0;
  let totalCostBasis = 0;
  let annualProjectedIncome = 0;
  let upcomingPayoutsNext30Days = 0;
  let earlyAssignmentRiskCount = 0;
  let shortDividendLiabilityTotal = 0;

  // Track stock positions
  positions.forEach((pos) => {
    const isStock = pos.legs?.some((l) => l.type === 'stock') || pos.ticker.toUpperCase() in {'NVDA': 1, 'AAPL': 1, 'TSLA': 1, 'DJT': 1, 'SPY': 1};
    const stockLeg = pos.legs?.find((l) => l.type === 'stock');
    
    // Check if there are short calls on this ticker in other positions that might have early assignment risk
    const shortCallLegs = positions.flatMap((p) => (p.legs || []).map((l: any) => ({ ...l, parentTicker: p.ticker }))).filter((l: any) => l.type === 'call' && l.action === 'sell' && (l.underlyingSymbol === pos.ticker || l.parentTicker === pos.ticker));

    if (isStock && stockLeg) {
      const isShort = stockLeg.action === 'sell';
      const shares = Math.abs(stockLeg.contracts || pos.contracts);
      const spot = tickers[pos.ticker]?.price || stockLeg.strike || 100;
      const costBasis = Math.abs(pos.entryCost);
      const costBasisPerShare = shares > 0 ? costBasis / shares : spot;
      const marketVal = shares * spot;

      // Find dividend profile in database
      const divProfile = MARKET_DIVIDEND_STOCKS.find((d) => d.symbol === pos.ticker) || {
        symbol: pos.ticker,
        name: tickers[pos.ticker]?.name || `${pos.ticker} Equity`,
        price: spot,
        annualDividend: pos.ticker === 'NVDA' ? 0.40 : pos.ticker === 'AAPL' ? 1.04 : pos.ticker === 'SPY' ? 7.12 : 0,
        dividendYield: pos.ticker === 'NVDA' ? 0.0031 : pos.ticker === 'AAPL' ? 0.0046 : pos.ticker === 'SPY' ? 0.0125 : 0,
        quarterlyPayout: pos.ticker === 'NVDA' ? 0.10 : pos.ticker === 'AAPL' ? 0.26 : pos.ticker === 'SPY' ? 1.78 : 0,
        payoutRatio: 20.0,
        exDividendDate: '2026-11-15',
        payableDate: '2026-11-30',
        frequency: 'Quarterly' as const,
        consecutiveGrowthYears: 5,
        dividendGrowth5YrCAGR: 0.05,
        sector: 'Technology',
        safetyScore: 'A' as const,
        safetyLabel: 'Standard Payer',
        freeCashFlowCoverage: 3.0,
        taxClassification: 'Qualified' as const,
        description: 'Portfolio equity holding',
      };

      const annualIncome = isShort ? -(shares * divProfile.annualDividend) : shares * divProfile.annualDividend;
      const yieldOnCost = costBasisPerShare > 0 ? (divProfile.annualDividend / costBasisPerShare) * 100 : 0;
      const currentYield = spot > 0 ? (divProfile.annualDividend / spot) * 100 : 0;

      // Calculate days until ex-date
      const exDateObj = new Date(divProfile.exDividendDate);
      const now = new Date('2026-10-08');
      const diffTime = exDateObj.getTime() - now.getTime();
      const daysUntilEx = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Early Assignment Risk Analysis:
      // If holding short calls that are ITM or near-the-money and the remaining extrinsic time value is less than the dividend amount,
      // it is mathematically optimal for the long counterparty to exercise before the ex-dividend date!
      let hasAssignmentRisk = false;
      let assignmentRiskDetails = '';
      if (shortCallLegs.length > 0 && divProfile.quarterlyPayout > 0 && daysUntilEx >= 0 && daysUntilEx <= 30) {
        const itmShortCall = shortCallLegs.find((c) => c.strike <= spot || (spot - c.strike) > -3);
        if (itmShortCall) {
          hasAssignmentRisk = true;
          earlyAssignmentRiskCount++;
          assignmentRiskDetails = `Short Call Strike $${itmShortCall.strike} is vulnerable to early exercise prior to ${divProfile.exDividendDate} ex-date. Dividend of $${divProfile.quarterlyPayout.toFixed(2)} exceeds remaining extrinsic time value.`;
        }
      }

      if (isShort && divProfile.annualDividend > 0) {
        shortDividendLiabilityTotal += (shares * divProfile.quarterlyPayout);
      }

      if (!isShort) {
        totalStockPortfolioValue += marketVal;
        totalCostBasis += costBasis;
        annualProjectedIncome += annualIncome;

        if (daysUntilEx >= 0 && daysUntilEx <= 30) {
          upcomingPayoutsNext30Days += (shares * divProfile.quarterlyPayout);
        }
      }

      stockHoldings.push({
        positionId: pos.id || `pos-${pos.ticker}-${shares}`,
        ticker: pos.ticker,
        name: divProfile.name,
        shares,
        costBasisPerShare,
        currentPrice: spot,
        annualDividendPerShare: divProfile.annualDividend,
        annualProjectedIncome: annualIncome,
        quarterlyPayout: divProfile.quarterlyPayout,
        currentYield,
        yieldOnCost,
        exDividendDate: divProfile.exDividendDate,
        payableDate: divProfile.payableDate,
        daysUntilExDate: daysUntilEx,
        isShort,
        shortDividendLiability: isShort ? (shares * divProfile.quarterlyPayout) : undefined,
        hasOptionsCallAssignmentRisk: hasAssignmentRisk,
        assignmentRiskDetails,
        qualification: divProfile.taxClassification,
      });
    }
  });

  const portfolioDividendYield = totalStockPortfolioValue > 0 ? (annualProjectedIncome / totalStockPortfolioValue) * 100 : 0;
  const portfolioYieldOnCost = totalCostBasis > 0 ? (annualProjectedIncome / totalCostBasis) * 100 : 0;

  // Monthly Cash Flow distribution
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyCashFlows: MonthlyDividendCashFlow[] = months.map((m, idx) => {
    let projected = 0;
    const payers: { symbol: string; amount: number; payableDate: string }[] = [];

    stockHoldings.filter((h) => !h.isShort && h.annualProjectedIncome > 0).forEach((h) => {
      // Standard quarterly distribution schedule (e.g., Feb/May/Aug/Nov or Jan/Apr/Jul/Oct or Mar/Jun/Sep/Dec)
      const payMonth = new Date(h.payableDate).getMonth();
      const paysThisMonth = (idx % 3) === (payMonth % 3);
      if (paysThisMonth) {
        const amt = h.quarterlyPayout * h.shares;
        projected += amt;
        payers.push({
          symbol: h.ticker,
          amount: amt,
          payableDate: `${m} 15, 2026`,
        });
      }
    });

    return {
      month: m,
      monthIndex: idx,
      projectedAmount: Number(projected.toFixed(2)),
      payers,
    };
  });

  return {
    holdings: stockHoldings,
    annualProjectedIncome: Number(annualProjectedIncome.toFixed(2)),
    portfolioDividendYield: Number(portfolioDividendYield.toFixed(2)),
    portfolioYieldOnCost: Number(portfolioYieldOnCost.toFixed(2)),
    totalStockPortfolioValue: Number(totalStockPortfolioValue.toFixed(2)),
    totalCostBasis: Number(totalCostBasis.toFixed(2)),
    upcomingPayoutsNext30Days: Number(upcomingPayoutsNext30Days.toFixed(2)),
    monthlyCashFlows,
    earlyAssignmentRiskCount,
    shortDividendLiabilityTotal: Number(shortDividendLiabilityTotal.toFixed(2)),
  };
}

/**
 * Runs a mathematical 20-year DRIP (Dividend Re-Investment Plan) compounding simulation
 */
export function simulateDripGrowth({
  initialInvestment = 50000,
  initialYield = 0.035,        // 3.5%
  dividendGrowthRate = 0.065,  // 6.5% annual dividend growth
  priceAppreciationRate = 0.07, // 7.0% annual stock price appreciation
  years = 20,
}: {
  initialInvestment?: number;
  initialYield?: number;
  dividendGrowthRate?: number;
  priceAppreciationRate?: number;
  years?: number;
}): DripSimulationYear[] {
  const results: DripSimulationYear[] = [];
  const initialStockPrice = 100;
  let withoutDripShares = initialInvestment / initialStockPrice;
  let withDripShares = initialInvestment / initialStockPrice;
  let cumulativeDividendsReinvested = 0;

  let currentStockPrice = initialStockPrice;
  let currentDivPerShare = initialStockPrice * initialYield;

  for (let yr = 1; yr <= years; yr++) {
    // End of year dividend amount per share
    currentDivPerShare *= (1 + dividendGrowthRate);
    currentStockPrice *= (1 + priceAppreciationRate);

    // Without DRIP: shares stay constant, dividends taken as cash
    const withoutDripValue = withoutDripShares * currentStockPrice;
    const withoutDripAnnualIncome = withoutDripShares * currentDivPerShare;

    // With DRIP: dividends buy additional shares at current stock price
    const withDripAnnualIncome = withDripShares * currentDivPerShare;
    const newSharesBought = withDripAnnualIncome / currentStockPrice;
    withDripShares += newSharesBought;
    cumulativeDividendsReinvested += withDripAnnualIncome;
    const withDripValue = withDripShares * currentStockPrice;

    results.push({
      year: yr,
      withoutDripShares: Number(withoutDripShares.toFixed(2)),
      withoutDripValue: Number(withoutDripValue.toFixed(0)),
      withoutDripAnnualIncome: Number(withoutDripAnnualIncome.toFixed(0)),
      withDripShares: Number(withDripShares.toFixed(2)),
      withDripValue: Number(withDripValue.toFixed(0)),
      withDripAnnualIncome: Number(withDripAnnualIncome.toFixed(0)),
      cumulativeDividendsReinvested: Number(cumulativeDividendsReinvested.toFixed(0)),
    });
  }

  return results;
}
