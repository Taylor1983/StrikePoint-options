/**
 * Institutional Company Profiles & ETF Fundamentals Service
 * Comprehensive fundamental data, portfolio holdings, sector exposure, valuation metrics,
 * financial statements, Wall Street analyst consensus, and fractional shares trading eligibility.
 */

export interface ETFTopHolding {
  symbol: string;
  name: string;
  sector: string;
  weight: number; // e.g. 7.18 for 7.18%
  sharesHeld?: string;
  marketValue?: string;
}

export interface ETFSectorAllocation {
  sector: string;
  weight: number; // e.g. 31.8 for 31.8%
  color: string;
}

export interface ETFFundamentals {
  symbol: string;
  name: string;
  assetType: 'etf';
  issuer: string;
  inceptionDate: string;
  benchmarkIndex: string;
  assetClass: string;
  aum: string;
  expenseRatioNet: number; // e.g. 0.09 for 0.09%
  expenseRatioGross: number;
  turnoverRate: string;
  nav: number;
  navPremiumDiscount: number; // percentage
  medianBidAskSpread: string;
  sec30DayYield: string;
  trailing12mYield: string;
  distributionFrequency: 'Quarterly' | 'Monthly' | 'Annual' | 'Semi-Annual';
  sharesOutstanding: string;
  portfolioPe: number;
  portfolioPb: number;
  holdingsCount: number;
  weightedAvgMarketCap: string;
  betaVsSpy: number;
  trackingError1Y: string;
  creationUnitSize: string;
  investmentObjective: string;
  topHoldings: ETFTopHolding[];
  sectorAllocations: ETFSectorAllocation[];
  derivativesProfile: {
    optionVolumeRank: string;
    avgDailyOptionVolume: string;
    putCallRatio: number;
    pinRiskStatus: string;
  };
  fractionalEligible: boolean;
  minFractionalShare: number;
  minFractionalDollar: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  assetType: 'equity';
  sector: string;
  industry: string;
  ceo: string;
  headquarters: string;
  founded: number | string;
  employees: string;
  website: string;
  description: string;
  valuation: {
    marketCap: string;
    enterpriseValue: string;
    peTrailing: number;
    peForward: number;
    pegRatio: number;
    priceToSales: number;
    priceToBook: number;
    evToEbitda: number;
    evToRevenue: number;
  };
  financials: {
    revenueTtm: string;
    revenueGrowthYoy: string;
    grossProfit: string;
    grossMarginPct: number;
    ebitda: string;
    operatingMarginPct: number;
    netIncomeTtm: string;
    netMarginPct: number;
    dilutedEpsTtm: string;
    forwardEps: string;
  };
  balanceSheet: {
    cashAndEquivalents: string;
    totalDebt: string;
    netDebt: string;
    debtToEquityPct: number;
    currentRatio: number;
    quickRatio: number;
    bookValuePerShare: string;
  };
  cashFlow: {
    operatingCashFlow: string;
    freeCashFlow: string;
    capitalExpenditures: string;
    returnOnEquityPct: number;
    returnOnAssetsPct: number;
    returnOnInvestedCapitalPct: number;
  };
  dividends: {
    dividendRate: string;
    dividendYieldPct: number;
    payoutRatioPct: number;
    dividendGrowth5Y: string;
    exDividendDate: string;
  };
  sharesStatistics: {
    sharesOutstanding: string;
    publicFloat: string;
    insiderOwnershipPct: number;
    institutionalOwnershipPct: number;
    shortInterestShares: string;
    shortPercentOfFloat: number;
    daysToCover: number;
    beta: number;
    week52Range: string;
  };
  analysts: {
    ratingConsensus: 'Strong Buy' | 'Moderate Buy' | 'Hold' | 'Underperform' | 'Sell';
    targetMean: number;
    targetHigh: number;
    targetLow: number;
    impliedUpsidePct: number;
    totalAnalysts: number;
    buyCount: number;
    holdCount: number;
    sellCount: number;
  };
  earningsCatalyst: {
    nextEarningsDate: string;
    daysToEarnings: number;
    impliedMovePct: number;
    epsConsensus: string;
    revenueConsensus: string;
  };
  fractionalEligible: boolean;
  minFractionalShare: number;
  minFractionalDollar: number;
}

export type AssetFundamentals = ETFFundamentals | CompanyProfile;

export const ETF_DATABASE: Record<string, ETFFundamentals> = {
  SPY: {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetType: 'etf',
    issuer: 'State Street Global Advisors (SSGA)',
    inceptionDate: 'Jan 22, 1993',
    benchmarkIndex: 'S&P 500 Index (SPX)',
    assetClass: 'U.S. Large-Cap Core Equity',
    aum: '$584.2B',
    expenseRatioNet: 0.0945,
    expenseRatioGross: 0.0945,
    turnoverRate: '2.0%',
    nav: 568.18,
    navPremiumDiscount: 0.01,
    medianBidAskSpread: '0.01%',
    sec30DayYield: '1.24%',
    trailing12mYield: '1.21%',
    distributionFrequency: 'Quarterly',
    sharesOutstanding: '1.028B',
    portfolioPe: 26.4,
    portfolioPb: 4.88,
    holdingsCount: 503,
    weightedAvgMarketCap: '$842.6B',
    betaVsSpy: 1.0,
    trackingError1Y: '0.03%',
    creationUnitSize: '50,000 shares',
    investmentObjective:
      'The SPDR S&P 500 ETF Trust seeks to provide investment results that, before expenses, correspond generally to the price and yield performance of the S&P 500 Index, representing 500 leading U.S. large-cap publicly traded corporations.',
    topHoldings: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology', weight: 7.18, sharesHeld: '73.4M', marketValue: '$16.8B' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Information Technology', weight: 6.54, sharesHeld: '39.8M', marketValue: '$15.3B' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Information Technology', weight: 6.12, sharesHeld: '132.6M', marketValue: '$14.3B' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Discretionary', weight: 3.78, sharesHeld: '55.2M', marketValue: '$8.8B' },
      { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Communication Services', weight: 2.62, sharesHeld: '18.4M', marketValue: '$6.1B' },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', weight: 2.14, sharesHeld: '27.1M', marketValue: '$5.0B' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway Class B', sector: 'Financials', weight: 1.95, sharesHeld: '16.2M', marketValue: '$4.6B' },
      { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Information Technology', weight: 1.84, sharesHeld: '4.8M', marketValue: '$4.3B' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Discretionary', weight: 1.52, sharesHeld: '24.6M', marketValue: '$3.6B' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', weight: 1.34, sharesHeld: '18.9M', marketValue: '$3.1B' },
    ],
    sectorAllocations: [
      { sector: 'Information Technology', weight: 31.8, color: '#38bdf8' },
      { sector: 'Financials', weight: 13.2, color: '#4ade80' },
      { sector: 'Healthcare', weight: 11.5, color: '#f43f5e' },
      { sector: 'Consumer Discretionary', weight: 10.1, color: '#fb923c' },
      { sector: 'Communication Services', weight: 9.0, color: '#c084fc' },
      { sector: 'Industrials', weight: 8.2, color: '#eab308' },
      { sector: 'Consumer Staples', weight: 5.7, color: '#10b981' },
      { sector: 'Energy', weight: 3.6, color: '#f97316' },
      { sector: 'Utilities', weight: 2.5, color: '#06b6d4' },
      { sector: 'Real Estate', weight: 2.3, color: '#a855f7' },
      { sector: 'Materials', weight: 2.1, color: '#64748b' },
    ],
    derivativesProfile: {
      optionVolumeRank: '#1 Globally (OCC Cleared)',
      avgDailyOptionVolume: '6.84M contracts/day',
      putCallRatio: 1.42,
      pinRiskStatus: 'High (0DTE & Friday Expiration Gamma Concentrated)',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  QQQ: {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq-100)',
    assetType: 'etf',
    issuer: 'Invesco Capital Management LLC',
    inceptionDate: 'Mar 10, 1999',
    benchmarkIndex: 'Nasdaq-100 Index (NDX)',
    assetClass: 'U.S. Large-Cap Growth / Technology',
    aum: '$282.4B',
    expenseRatioNet: 0.20,
    expenseRatioGross: 0.20,
    turnoverRate: '6.0%',
    nav: 488.52,
    navPremiumDiscount: 0.02,
    medianBidAskSpread: '0.01%',
    sec30DayYield: '0.62%',
    trailing12mYield: '0.58%',
    distributionFrequency: 'Quarterly',
    sharesOutstanding: '578.1M',
    portfolioPe: 31.2,
    portfolioPb: 7.42,
    holdingsCount: 101,
    weightedAvgMarketCap: '$985.4B',
    betaVsSpy: 1.18,
    trackingError1Y: '0.05%',
    creationUnitSize: '50,000 shares',
    investmentObjective:
      'Invesco QQQ is an exchange-traded fund based on the Nasdaq-100 Index. The fund will, under most circumstances, consist of all of stocks in the Index, which includes 100 of the largest non-financial companies listed on Nasdaq based on market capitalization.',
    topHoldings: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology', weight: 8.92, sharesHeld: '38.4M', marketValue: '$8.8B' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Information Technology', weight: 7.84, sharesHeld: '21.2M', marketValue: '$7.7B' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Information Technology', weight: 7.45, sharesHeld: '68.9M', marketValue: '$7.3B' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Discretionary', weight: 5.24, sharesHeld: '28.1M', marketValue: '$5.2B' },
      { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Communication Services', weight: 4.88, sharesHeld: '10.8M', marketValue: '$4.8B' },
      { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Information Technology', weight: 4.35, sharesHeld: '3.6M', marketValue: '$4.3B' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Discretionary', weight: 3.12, sharesHeld: '14.2M', marketValue: '$3.1B' },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', weight: 2.82, sharesHeld: '15.4M', marketValue: '$2.8B' },
      { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services', weight: 2.75, sharesHeld: '14.9M', marketValue: '$2.7B' },
      { symbol: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer Staples', weight: 2.45, sharesHeld: '2.8M', marketValue: '$2.4B' },
    ],
    sectorAllocations: [
      { sector: 'Information Technology', weight: 50.8, color: '#38bdf8' },
      { sector: 'Communication Services', weight: 15.6, color: '#c084fc' },
      { sector: 'Consumer Discretionary', weight: 13.4, color: '#fb923c' },
      { sector: 'Healthcare', weight: 6.8, color: '#f43f5e' },
      { sector: 'Consumer Staples', weight: 5.9, color: '#10b981' },
      { sector: 'Industrials', weight: 4.8, color: '#eab308' },
      { sector: 'Utilities', weight: 1.4, color: '#06b6d4' },
      { sector: 'Energy', weight: 0.8, color: '#f97316' },
      { sector: 'Materials', weight: 0.5, color: '#64748b' },
    ],
    derivativesProfile: {
      optionVolumeRank: '#2 Globally (Tech Volatility Benchmark)',
      avgDailyOptionVolume: '3.92M contracts/day',
      putCallRatio: 1.18,
      pinRiskStatus: 'High (Heavy 0DTE & Friday Pinning)',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  'XIU.TO': {
    symbol: 'XIU.TO',
    name: 'iShares S&P/TSX 60 Index ETF',
    assetType: 'etf',
    issuer: 'BlackRock Asset Management Canada',
    inceptionDate: 'Sep 28, 1999',
    benchmarkIndex: 'S&P/TSX 60 Index (TX60)',
    assetClass: 'Canadian Large-Cap Blend Equity',
    aum: 'C$14.8B',
    expenseRatioNet: 0.18,
    expenseRatioGross: 0.18,
    turnoverRate: '4.0%',
    nav: 36.42,
    navPremiumDiscount: -0.01,
    medianBidAskSpread: '0.02%',
    sec30DayYield: '3.12%',
    trailing12mYield: '3.18%',
    distributionFrequency: 'Quarterly',
    sharesOutstanding: '406.8M',
    portfolioPe: 15.2,
    portfolioPb: 1.94,
    holdingsCount: 60,
    weightedAvgMarketCap: 'C$62.4B',
    betaVsSpy: 0.76,
    trackingError1Y: '0.04%',
    creationUnitSize: '50,000 units',
    investmentObjective:
      'XIU seeks to replicate, to the extent possible, the performance of the S&P/TSX 60 Index, net of expenses. It provides exposure to 60 of the largest, most liquid Canadian companies across banking, energy, natural resources, and rail transportation.',
    topHoldings: [
      { symbol: 'RY.TO', name: 'Royal Bank of Canada', sector: 'Financials', weight: 8.62, sharesHeld: '32.4M', marketValue: 'C$1.28B' },
      { symbol: 'TD.TO', name: 'Toronto-Dominion Bank', sector: 'Financials', weight: 6.84, sharesHeld: '41.2M', marketValue: 'C$1.01B' },
      { symbol: 'ENB.TO', name: 'Enbridge Inc.', sector: 'Energy (Pipelines)', weight: 5.92, sharesHeld: '48.9M', marketValue: 'C$876M' },
      { symbol: 'CNQ.TO', name: 'Canadian Natural Resources', sector: 'Energy (E&P)', weight: 4.88, sharesHeld: '38.4M', marketValue: 'C$722M' },
      { symbol: 'SHOP.TO', name: 'Shopify Inc.', sector: 'Information Technology', weight: 4.75, sharesHeld: '18.2M', marketValue: 'C$703M' },
      { symbol: 'CP.TO', name: 'Canadian Pacific Kansas City', sector: 'Industrials (Rail)', weight: 4.42, sharesHeld: '24.6M', marketValue: 'C$654M' },
      { symbol: 'CNR.TO', name: 'Canadian National Railway', sector: 'Industrials (Rail)', weight: 4.18, sharesHeld: '16.8M', marketValue: 'C$618M' },
      { symbol: 'BN.TO', name: 'Brookfield Corporation', sector: 'Financials / Asset Mgmt', weight: 3.94, sharesHeld: '28.1M', marketValue: 'C$583M' },
      { symbol: 'BMO.TO', name: 'Bank of Montreal', sector: 'Financials', weight: 3.82, sharesHeld: '18.9M', marketValue: 'C$565M' },
      { symbol: 'BNS.TO', name: 'Bank of Nova Scotia', sector: 'Financials', weight: 3.55, sharesHeld: '26.4M', marketValue: 'C$525M' },
    ],
    sectorAllocations: [
      { sector: 'Financials', weight: 35.4, color: '#4ade80' },
      { sector: 'Energy', weight: 18.2, color: '#f97316' },
      { sector: 'Industrials', weight: 13.6, color: '#eab308' },
      { sector: 'Information Technology', weight: 9.4, color: '#38bdf8' },
      { sector: 'Materials', weight: 8.8, color: '#64748b' },
      { sector: 'Communication Services', weight: 4.8, color: '#c084fc' },
      { sector: 'Consumer Staples', weight: 3.9, color: '#10b981' },
      { sector: 'Utilities', weight: 3.5, color: '#06b6d4' },
      { sector: 'Real Estate', weight: 1.8, color: '#a855f7' },
      { sector: 'Consumer Discretionary', weight: 0.6, color: '#fb923c' },
    ],
    derivativesProfile: {
      optionVolumeRank: '#1 on Montreal Exchange (MX)',
      avgDailyOptionVolume: '84,000 contracts/day',
      putCallRatio: 0.94,
      pinRiskStatus: 'Moderate (Montréal Exchange Quarterly Settlement)',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  'DLR.TO': {
    symbol: 'DLR.TO',
    name: 'Global X US Dollar Currency ETF',
    assetType: 'etf',
    issuer: 'Global X Investments Canada (formerly Horizons)',
    inceptionDate: 'Apr 06, 2011',
    benchmarkIndex: 'U.S. Dollar Cash Deposit Rate',
    assetClass: 'Currency / Cash Equivalent Arbitrage',
    aum: 'C$1.24B',
    expenseRatioNet: 0.45,
    expenseRatioGross: 0.45,
    turnoverRate: '120.0%',
    nav: 13.82,
    navPremiumDiscount: 0.0,
    medianBidAskSpread: '0.01%',
    sec30DayYield: '4.85%',
    trailing12mYield: '4.78%',
    distributionFrequency: 'Monthly',
    sharesOutstanding: '89.4M',
    portfolioPe: 0,
    portfolioPb: 1.0,
    holdingsCount: 2,
    weightedAvgMarketCap: 'C$1.24B',
    betaVsSpy: 0.08,
    trackingError1Y: '0.01%',
    creationUnitSize: '100,000 units',
    investmentObjective:
      'DLR seeks to reflect the performance of the U.S. dollar, relative to the Canadian dollar. In Canada, DLR.TO paired with DLR.U.TO is the gold standard for Norbert\'s Gambit currency journaling, allowing zero-bank-spread FX conversion.',
    topHoldings: [
      { symbol: 'USD_CASH', name: 'US Dollar Cash Deposits (Tier-1 Canadian Chartered Banks)', sector: 'Cash & Short-Term Equiv', weight: 99.4, marketValue: 'C$1.23B' },
      { symbol: 'T_BILLS', name: 'U.S. Treasury Bills 1-Month', sector: 'Sovereign Debt', weight: 0.6, marketValue: 'C$7.4M' },
    ],
    sectorAllocations: [
      { sector: 'Cash Deposits (USD)', weight: 99.4, color: '#22c55e' },
      { sector: 'Short-Term Treasuries', weight: 0.6, color: '#38bdf8' },
    ],
    derivativesProfile: {
      optionVolumeRank: 'Non-Optionable (Cash Journaling Vehicle)',
      avgDailyOptionVolume: '0 (Stock Only)',
      putCallRatio: 0,
      pinRiskStatus: 'None',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
};

export const COMPANY_DATABASE: Record<string, CompanyProfile> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'equity',
    sector: 'Information Technology',
    industry: 'Consumer Electronics & Hardware',
    ceo: 'Tim Cook',
    headquarters: '1 Apple Park Way, Cupertino, CA 95014, USA',
    founded: 1976,
    employees: '161,000',
    website: 'https://www.apple.com',
    description:
      'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, and sells a variety of related services. Products include iPhone, Mac, iPad, AirPods, Apple Watch, Apple Vision Pro, Apple TV, and iOS. Services include App Store, Apple Music, Apple Pay, iCloud, and Apple TV+.',
    valuation: {
      marketCap: '$3.42T',
      enterpriseValue: '$3.46T',
      peTrailing: 34.8,
      peForward: 29.2,
      pegRatio: 2.84,
      priceToSales: 8.82,
      priceToBook: 51.4,
      evToEbitda: 25.6,
      evToRevenue: 8.91,
    },
    financials: {
      revenueTtm: '$385.6B',
      revenueGrowthYoy: '+4.9%',
      grossProfit: '$178.2B',
      grossMarginPct: 46.2,
      ebitda: '$135.1B',
      operatingMarginPct: 30.8,
      netIncomeTtm: '$100.4B',
      netMarginPct: 26.0,
      dilutedEpsTtm: '$6.58',
      forwardEps: '$7.84',
    },
    balanceSheet: {
      cashAndEquivalents: '$61.8B',
      totalDebt: '$104.6B',
      netDebt: '$42.8B',
      debtToEquityPct: 154.2,
      currentRatio: 0.98,
      quickRatio: 0.85,
      bookValuePerShare: '$4.38',
    },
    cashFlow: {
      operatingCashFlow: '$118.2B',
      freeCashFlow: '$104.8B',
      capitalExpenditures: '$13.4B',
      returnOnEquityPct: 147.2,
      returnOnAssetsPct: 29.8,
      returnOnInvestedCapitalPct: 56.4,
    },
    dividends: {
      dividendRate: '$1.00',
      dividendYieldPct: 0.44,
      payoutRatioPct: 15.2,
      dividendGrowth5Y: '+5.8%',
      exDividendDate: 'Aug 09, 2026',
    },
    sharesStatistics: {
      sharesOutstanding: '15.24B',
      publicFloat: '15.18B',
      insiderOwnershipPct: 0.08,
      institutionalOwnershipPct: 61.2,
      shortInterestShares: '108.4M',
      shortPercentOfFloat: 0.71,
      daysToCover: 1.8,
      beta: 1.08,
      week52Range: '$164.08 - $237.23',
    },
    analysts: {
      ratingConsensus: 'Moderate Buy',
      targetMean: 248.5,
      targetHigh: 300.0,
      targetLow: 184.0,
      impliedUpsidePct: 9.8,
      totalAnalysts: 38,
      buyCount: 27,
      holdCount: 9,
      sellCount: 2,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Oct 31, 2026',
      daysToEarnings: 18,
      impliedMovePct: 4.2,
      epsConsensus: '$1.58',
      revenueConsensus: '$94.3B',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetType: 'equity',
    sector: 'Information Technology',
    industry: 'Semiconductors & AI Accelerated Computing',
    ceo: 'Jensen Huang',
    headquarters: '2788 San Tomas Expressway, Santa Clara, CA 95051, USA',
    founded: 1993,
    employees: '29,600',
    website: 'https://www.nvidia.com',
    description:
      'NVIDIA Corporation is the world pioneer in GPU-accelerated computing and artificial intelligence infrastructure. It designs high-end graphics processing units (GPUs) and AI supercomputing platforms (Blackwell, Hopper, H100/H200, DGX, CUDA, Quantum InfiniBand networking) powering generative AI models and data centers.',
    valuation: {
      marketCap: '$3.18T',
      enterpriseValue: '$3.15T',
      peTrailing: 48.6,
      peForward: 32.4,
      pegRatio: 1.15,
      priceToSales: 32.4,
      priceToBook: 54.2,
      evToEbitda: 36.8,
      evToRevenue: 32.1,
    },
    financials: {
      revenueTtm: '$96.3B',
      revenueGrowthYoy: '+122.4%',
      grossProfit: '$72.8B',
      grossMarginPct: 75.6,
      ebitda: '$59.2B',
      operatingMarginPct: 62.4,
      netIncomeTtm: '$53.0B',
      netMarginPct: 55.0,
      dilutedEpsTtm: '$2.14',
      forwardEps: '$3.98',
    },
    balanceSheet: {
      cashAndEquivalents: '$34.8B',
      totalDebt: '$8.5B',
      netDebt: '-$26.3B (Net Cash)',
      debtToEquityPct: 14.6,
      currentRatio: 3.84,
      quickRatio: 3.25,
      bookValuePerShare: '$2.38',
    },
    cashFlow: {
      operatingCashFlow: '$40.5B',
      freeCashFlow: '$38.2B',
      capitalExpenditures: '$2.3B',
      returnOnEquityPct: 118.4,
      returnOnAssetsPct: 74.2,
      returnOnInvestedCapitalPct: 92.6,
    },
    dividends: {
      dividendRate: '$0.04',
      dividendYieldPct: 0.03,
      payoutRatioPct: 1.8,
      dividendGrowth5Y: '+15.0%',
      exDividendDate: 'Sep 12, 2026',
    },
    sharesStatistics: {
      sharesOutstanding: '24.57B',
      publicFloat: '23.42B',
      insiderOwnershipPct: 4.2,
      institutionalOwnershipPct: 67.4,
      shortInterestShares: '284.1M',
      shortPercentOfFloat: 1.21,
      daysToCover: 1.4,
      beta: 1.94,
      week52Range: '$75.60 - $140.76',
    },
    analysts: {
      ratingConsensus: 'Strong Buy',
      targetMean: 154.2,
      targetHigh: 200.0,
      targetLow: 110.0,
      impliedUpsidePct: 19.2,
      totalAnalysts: 44,
      buyCount: 40,
      holdCount: 3,
      sellCount: 1,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Nov 19, 2026',
      daysToEarnings: 48,
      impliedMovePct: 7.8,
      epsConsensus: '$0.75',
      revenueConsensus: '$33.1B',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    assetType: 'equity',
    sector: 'Consumer Discretionary',
    industry: 'Automobile Manufacturers & Clean Energy',
    ceo: 'Elon Musk',
    headquarters: '1 Tesla Road, Austin, TX 78725, USA',
    founded: 2003,
    employees: '140,473',
    website: 'https://www.tesla.com',
    description:
      'Tesla, Inc. designs, develops, manufactures, sells, and leases electric vehicles (Model S, 3, X, Y, Cybertruck, Semi), energy storage systems (Megapack, Powerwall), solar roofs, and is developing autonomous driving AI networks (Full Self-Driving, Cybercab, Optimus humanoid robotics).',
    valuation: {
      marketCap: '$792.5B',
      enterpriseValue: '$765.2B',
      peTrailing: 68.2,
      peForward: 54.8,
      pegRatio: 4.12,
      priceToSales: 8.24,
      priceToBook: 12.4,
      evToEbitda: 42.6,
      evToRevenue: 7.96,
    },
    financials: {
      revenueTtm: '$96.1B',
      revenueGrowthYoy: '+2.8%',
      grossProfit: '$17.2B',
      grossMarginPct: 17.9,
      ebitda: '$14.2B',
      operatingMarginPct: 8.2,
      netIncomeTtm: '$12.4B',
      netMarginPct: 12.9,
      dilutedEpsTtm: '$3.64',
      forwardEps: '$4.52',
    },
    balanceSheet: {
      cashAndEquivalents: '$30.7B',
      totalDebt: '$3.4B',
      netDebt: '-$27.3B (Net Cash)',
      debtToEquityPct: 5.2,
      currentRatio: 1.84,
      quickRatio: 1.35,
      bookValuePerShare: '$20.12',
    },
    cashFlow: {
      operatingCashFlow: '$13.2B',
      freeCashFlow: '$4.8B',
      capitalExpenditures: '$8.4B',
      returnOnEquityPct: 19.8,
      returnOnAssetsPct: 11.2,
      returnOnInvestedCapitalPct: 14.6,
    },
    dividends: {
      dividendRate: '$0.00',
      dividendYieldPct: 0.0,
      payoutRatioPct: 0.0,
      dividendGrowth5Y: 'None (Pure Growth Reinvestment)',
      exDividendDate: 'N/A',
    },
    sharesStatistics: {
      sharesOutstanding: '3.19B',
      publicFloat: '2.74B',
      insiderOwnershipPct: 13.0,
      institutionalOwnershipPct: 44.8,
      shortInterestShares: '86.4M',
      shortPercentOfFloat: 3.15,
      daysToCover: 1.2,
      beta: 2.15,
      week52Range: '$138.80 - $271.00',
    },
    analysts: {
      ratingConsensus: 'Hold',
      targetMean: 224.0,
      targetHigh: 310.0,
      targetLow: 85.0,
      impliedUpsidePct: -9.8,
      totalAnalysts: 36,
      buyCount: 14,
      holdCount: 15,
      sellCount: 7,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Oct 23, 2026',
      daysToEarnings: 10,
      impliedMovePct: 8.4,
      epsConsensus: '$0.58',
      revenueConsensus: '$25.4B',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetType: 'equity',
    sector: 'Information Technology',
    industry: 'Enterprise Software & Cloud Infrastructure',
    ceo: 'Satya Nadella',
    headquarters: '1 Microsoft Way, Redmond, WA 98052, USA',
    founded: 1975,
    employees: '228,000',
    website: 'https://www.microsoft.com',
    description:
      'Microsoft Corporation produces software, hardware, cloud computing solutions, and gaming. Offerings include Microsoft Azure, Microsoft 365, Windows, LinkedIn, GitHub, Xbox, Surface devices, and Copilot AI systems developed with OpenAI.',
    valuation: {
      marketCap: '$3.22T',
      enterpriseValue: '$3.24T',
      peTrailing: 35.4,
      peForward: 28.6,
      pegRatio: 2.25,
      priceToSales: 13.1,
      priceToBook: 12.1,
      evToEbitda: 23.4,
      evToRevenue: 13.2,
    },
    financials: {
      revenueTtm: '$245.1B',
      revenueGrowthYoy: '+15.2%',
      grossProfit: '$170.8B',
      grossMarginPct: 69.7,
      ebitda: '$132.4B',
      operatingMarginPct: 44.6,
      netIncomeTtm: '$88.1B',
      netMarginPct: 35.9,
      dilutedEpsTtm: '$11.80',
      forwardEps: '$14.60',
    },
    balanceSheet: {
      cashAndEquivalents: '$75.5B',
      totalDebt: '$77.2B',
      netDebt: '$1.7B',
      debtToEquityPct: 29.8,
      currentRatio: 1.25,
      quickRatio: 1.15,
      bookValuePerShare: '$35.90',
    },
    cashFlow: {
      operatingCashFlow: '$118.5B',
      freeCashFlow: '$74.1B',
      capitalExpenditures: '$44.4B (Heavy AI Infrastructure)',
      returnOnEquityPct: 38.6,
      returnOnAssetsPct: 18.4,
      returnOnInvestedCapitalPct: 28.2,
    },
    dividends: {
      dividendRate: '$3.32',
      dividendYieldPct: 0.77,
      payoutRatioPct: 28.1,
      dividendGrowth5Y: '+10.2%',
      exDividendDate: 'Nov 20, 2026',
    },
    sharesStatistics: {
      sharesOutstanding: '7.43B',
      publicFloat: '7.41B',
      insiderOwnershipPct: 0.05,
      institutionalOwnershipPct: 73.4,
      shortInterestShares: '48.2M',
      shortPercentOfFloat: 0.65,
      daysToCover: 2.1,
      beta: 1.12,
      week52Range: '$344.00 - $468.35',
    },
    analysts: {
      ratingConsensus: 'Strong Buy',
      targetMean: 498.0,
      targetHigh: 550.0,
      targetLow: 430.0,
      impliedUpsidePct: 15.4,
      totalAnalysts: 42,
      buyCount: 38,
      holdCount: 4,
      sellCount: 0,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Oct 29, 2026',
      daysToEarnings: 16,
      impliedMovePct: 4.8,
      epsConsensus: '$3.10',
      revenueConsensus: '$64.5B',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  'SHOP.TO': {
    symbol: 'SHOP.TO',
    name: 'Shopify Inc.',
    assetType: 'equity',
    sector: 'Information Technology',
    industry: 'E-Commerce Infrastructure & Merchant Platforms',
    ceo: 'Harley Finkelstein / Tobi Lütke',
    headquarters: '151 O\'Connor Street, Ottawa, ON K2P 2L8, Canada',
    founded: 2006,
    employees: '8,300',
    website: 'https://www.shopify.com',
    description:
      'Shopify Inc. provides cloud-based essential internet infrastructure for commerce, offering trusted tools to start, grow, market, and manage a retail business of any size across online stores, social media, and physical retail locations.',
    valuation: {
      marketCap: 'C$138.2B',
      enterpriseValue: 'C$135.4B',
      peTrailing: 82.4,
      peForward: 58.2,
      pegRatio: 2.15,
      priceToSales: 13.6,
      priceToBook: 9.8,
      evToEbitda: 52.4,
      evToRevenue: 13.3,
    },
    financials: {
      revenueTtm: 'C$10.2B',
      revenueGrowthYoy: '+21.4%',
      grossProfit: 'C$5.1B',
      grossMarginPct: 50.1,
      ebitda: 'C$1.45B',
      operatingMarginPct: 14.2,
      netIncomeTtm: 'C$1.68B',
      netMarginPct: 16.5,
      dilutedEpsTtm: 'C$1.31',
      forwardEps: 'C$1.85',
    },
    balanceSheet: {
      cashAndEquivalents: 'C$5.4B',
      totalDebt: 'C$1.2B',
      netDebt: '-C$4.2B (Net Cash)',
      debtToEquityPct: 8.6,
      currentRatio: 6.84,
      quickRatio: 6.25,
      bookValuePerShare: 'C$11.12',
    },
    cashFlow: {
      operatingCashFlow: 'C$1.85B',
      freeCashFlow: 'C$1.64B',
      capitalExpenditures: 'C$210M',
      returnOnEquityPct: 12.8,
      returnOnAssetsPct: 9.4,
      returnOnInvestedCapitalPct: 14.2,
    },
    dividends: {
      dividendRate: 'C$0.00',
      dividendYieldPct: 0.0,
      payoutRatioPct: 0.0,
      dividendGrowth5Y: 'None (Pure Reinvestment)',
      exDividendDate: 'N/A',
    },
    sharesStatistics: {
      sharesOutstanding: '1.29B',
      publicFloat: '1.21B',
      insiderOwnershipPct: 6.8,
      institutionalOwnershipPct: 62.4,
      shortInterestShares: '24.1M',
      shortPercentOfFloat: 2.01,
      daysToCover: 2.4,
      beta: 2.24,
      week52Range: 'C$68.40 - C$122.50',
    },
    analysts: {
      ratingConsensus: 'Moderate Buy',
      targetMean: 118.0,
      targetHigh: 145.0,
      targetLow: 85.0,
      impliedUpsidePct: 12.4,
      totalAnalysts: 34,
      buyCount: 22,
      holdCount: 11,
      sellCount: 1,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Nov 12, 2026',
      daysToEarnings: 30,
      impliedMovePct: 9.2,
      epsConsensus: 'C$0.28',
      revenueConsensus: 'C$2.85B',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
  'CNQ.TO': {
    symbol: 'CNQ.TO',
    name: 'Canadian Natural Resources Limited',
    assetType: 'equity',
    sector: 'Energy',
    industry: 'Oil & Gas Exploration & Production (Oil Sands)',
    ceo: 'Scott G. Stauth',
    headquarters: '2100, 855-2 Street S.W., Calgary, AB T2P 4J8, Canada',
    founded: 1973,
    employees: '10,250',
    website: 'https://www.cnrl.com',
    description:
      'Canadian Natural Resources Limited is one of the largest independent crude oil and natural gas producers in the world. Its balanced portfolio includes world-class oil sands mining and upgrading assets (Horizon, AOSP) with zero geological decline risk.',
    valuation: {
      marketCap: 'C$103.4B',
      enterpriseValue: 'C$114.2B',
      peTrailing: 12.4,
      peForward: 10.8,
      pegRatio: 1.45,
      priceToSales: 2.72,
      priceToBook: 2.54,
      evToEbitda: 6.1,
      evToRevenue: 3.01,
    },
    financials: {
      revenueTtm: 'C$38.2B',
      revenueGrowthYoy: '+6.4%',
      grossProfit: 'C$19.4B',
      grossMarginPct: 50.8,
      ebitda: 'C$18.6B',
      operatingMarginPct: 32.4,
      netIncomeTtm: 'C$8.35B',
      netMarginPct: 21.8,
      dilutedEpsTtm: 'C$3.94',
      forwardEps: 'C$4.52',
    },
    balanceSheet: {
      cashAndEquivalents: 'C$1.8B',
      totalDebt: 'C$12.6B',
      netDebt: 'C$10.8B',
      debtToEquityPct: 26.4,
      currentRatio: 1.12,
      quickRatio: 0.94,
      bookValuePerShare: 'C$19.24',
    },
    cashFlow: {
      operatingCashFlow: 'C$15.4B',
      freeCashFlow: 'C$9.8B',
      capitalExpenditures: 'C$5.6B',
      returnOnEquityPct: 21.4,
      returnOnAssetsPct: 11.8,
      returnOnInvestedCapitalPct: 17.2,
    },
    dividends: {
      dividendRate: 'C$2.10',
      dividendYieldPct: 4.35,
      payoutRatioPct: 53.2,
      dividendGrowth5Y: '+18.4%',
      exDividendDate: 'Sep 15, 2026',
    },
    sharesStatistics: {
      sharesOutstanding: '2.12B',
      publicFloat: '2.08B',
      insiderOwnershipPct: 1.8,
      institutionalOwnershipPct: 74.2,
      shortInterestShares: '18.4M',
      shortPercentOfFloat: 0.88,
      daysToCover: 2.8,
      beta: 1.34,
      week52Range: 'C$41.20 - C$56.80',
    },
    analysts: {
      ratingConsensus: 'Strong Buy',
      targetMean: 58.5,
      targetHigh: 66.0,
      targetLow: 48.0,
      impliedUpsidePct: 21.2,
      totalAnalysts: 22,
      buyCount: 18,
      holdCount: 4,
      sellCount: 0,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Nov 07, 2026',
      daysToEarnings: 25,
      impliedMovePct: 4.4,
      epsConsensus: 'C$0.98',
      revenueConsensus: 'C$9.6B',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  },
};

/**
 * Determine if a given ticker is an ETF based on symbol, name, or metadata
 */
export function isTickerETF(tickerSymbol: string, tickerName?: string): boolean {
  const sym = tickerSymbol.toUpperCase();
  if (sym in ETF_DATABASE) return true;
  if (['SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'XLV', 'XBI', 'SMH', 'GLD', 'SLV', 'TLT', 'HYG', 'ARKK', 'VOO', 'VTI', 'EEM', 'EFA', 'XIU.TO', 'DLR.TO', 'VFV.TO', 'XEG.TO'].includes(sym)) {
    return true;
  }
  if (tickerName) {
    const n = tickerName.toLowerCase();
    if (n.includes('etf') || n.includes('trust') || n.includes('index fund') || n.includes('spdr') || n.includes('ishares')) {
      return true;
    }
  }
  return false;
}

/**
 * Get ETF Fundamentals for any symbol, with realistic fallback generation if not hardcoded
 */
export function getETFFundamentals(tickerSymbol: string, price: number = 100, name?: string): ETFFundamentals {
  const sym = tickerSymbol.toUpperCase();
  if (sym in ETF_DATABASE) {
    const existing = ETF_DATABASE[sym];
    return {
      ...existing,
      nav: Number(price.toFixed(2)),
    };
  }

  // Dynamic fallback generator for any ETF
  const fallbackName = name || `${sym} Index ETF Trust`;
  return {
    symbol: sym,
    name: fallbackName,
    assetType: 'etf',
    issuer: 'BlackRock / State Street Global Capital',
    inceptionDate: 'Oct 14, 2014',
    benchmarkIndex: `${sym} Total Return Index`,
    assetClass: 'Broad Market Composite ETF',
    aum: '$18.4B',
    expenseRatioNet: 0.15,
    expenseRatioGross: 0.15,
    turnoverRate: '8.0%',
    nav: Number(price.toFixed(2)),
    navPremiumDiscount: 0.01,
    medianBidAskSpread: '0.02%',
    sec30DayYield: '2.14%',
    trailing12mYield: '2.08%',
    distributionFrequency: 'Quarterly',
    sharesOutstanding: '142.0M',
    portfolioPe: 22.8,
    portfolioPb: 3.4,
    holdingsCount: 148,
    weightedAvgMarketCap: '$148.2B',
    betaVsSpy: 1.05,
    trackingError1Y: '0.06%',
    creationUnitSize: '50,000 units',
    investmentObjective: `The ${sym} ETF seeks to replicate investment results corresponding generally to the price and yield performance of the underlying reference index, weighted by market capitalization with daily creation and redemption liquidity.`,
    topHoldings: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology', weight: 8.4, sharesHeld: '1.2M', marketValue: '$275M' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Information Technology', weight: 7.2, sharesHeld: '650K', marketValue: '$236M' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Information Technology', weight: 6.8, sharesHeld: '2.1M', marketValue: '$223M' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Discretionary', weight: 4.6, sharesHeld: '920K', marketValue: '$151M' },
      { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Communication Services', weight: 3.9, sharesHeld: '380K', marketValue: '$128M' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', weight: 3.2, sharesHeld: '540K', marketValue: '$105M' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', weight: 2.8, sharesHeld: '310K', marketValue: '$92M' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', weight: 2.4, sharesHeld: '420K', marketValue: '$79M' },
    ],
    sectorAllocations: [
      { sector: 'Information Technology', weight: 34.2, color: '#38bdf8' },
      { sector: 'Financials', weight: 16.4, color: '#4ade80' },
      { sector: 'Healthcare', weight: 12.8, color: '#f43f5e' },
      { sector: 'Consumer Discretionary', weight: 11.2, color: '#fb923c' },
      { sector: 'Communication Services', weight: 8.6, color: '#c084fc' },
      { sector: 'Industrials', weight: 7.8, color: '#eab308' },
      { sector: 'Consumer Staples', weight: 5.2, color: '#10b981' },
      { sector: 'Energy', weight: 3.8, color: '#f97316' },
    ],
    derivativesProfile: {
      optionVolumeRank: 'Active CBOE / OCC Listing',
      avgDailyOptionVolume: '240,000 contracts/day',
      putCallRatio: 1.05,
      pinRiskStatus: 'Normal Settlement Spread',
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  };
}

/**
 * Get Company Profile for any symbol, with realistic fallback generation if not hardcoded
 */
export function getCompanyProfile(tickerSymbol: string, price: number = 100, name?: string): CompanyProfile {
  const sym = tickerSymbol.toUpperCase();
  if (sym in COMPANY_DATABASE) {
    return COMPANY_DATABASE[sym];
  }

  // Dynamic fallback generator for any equity
  const isCanadian = sym.endsWith('.TO');
  const currency = isCanadian ? 'C$' : '$';
  const companyName = name || (isCanadian ? `${sym.replace('.TO', '')} Resources Inc.` : `${sym} Corporation`);

  const approxMarketCapNum = (price * 840_000_000) / 1_000_000_000;
  const approxMarketCap = `${currency}${approxMarketCapNum.toFixed(1)}B`;

  return {
    symbol: sym,
    name: companyName,
    assetType: 'equity',
    sector: isCanadian ? 'Energy & Natural Resources' : 'Technology & Industrials',
    industry: isCanadian ? 'Oil Sands & Mining Operations' : 'Enterprise Software & Systems',
    ceo: 'Executive Management Committee',
    headquarters: isCanadian ? 'Toronto, ON / Calgary, AB, Canada' : 'New York, NY / San Jose, CA, USA',
    founded: 1998,
    employees: '18,500',
    website: `https://www.${sym.replace('.TO', '').toLowerCase()}.com`,
    description: `${companyName} operates across domestic and international markets, specializing in scaled operations, enterprise customer contracts, robust capital allocation, and recurring cash flow generation.`,
    valuation: {
      marketCap: approxMarketCap,
      enterpriseValue: `${currency}${(approxMarketCapNum * 1.08).toFixed(1)}B`,
      peTrailing: 24.5,
      peForward: 19.8,
      pegRatio: 1.65,
      priceToSales: 4.8,
      priceToBook: 4.2,
      evToEbitda: 14.2,
      evToRevenue: 5.1,
    },
    financials: {
      revenueTtm: `${currency}${(approxMarketCapNum * 0.22).toFixed(1)}B`,
      revenueGrowthYoy: '+8.4%',
      grossProfit: `${currency}${(approxMarketCapNum * 0.11).toFixed(1)}B`,
      grossMarginPct: 50.2,
      ebitda: `${currency}${(approxMarketCapNum * 0.07).toFixed(1)}B`,
      operatingMarginPct: 24.6,
      netIncomeTtm: `${currency}${(approxMarketCapNum * 0.045).toFixed(1)}B`,
      netMarginPct: 18.5,
      dilutedEpsTtm: `${currency}${(price / 24.5).toFixed(2)}`,
      forwardEps: `${currency}${(price / 19.8).toFixed(2)}`,
    },
    balanceSheet: {
      cashAndEquivalents: `${currency}${(approxMarketCapNum * 0.04).toFixed(1)}B`,
      totalDebt: `${currency}${(approxMarketCapNum * 0.08).toFixed(1)}B`,
      netDebt: `${currency}${(approxMarketCapNum * 0.04).toFixed(1)}B`,
      debtToEquityPct: 38.5,
      currentRatio: 1.65,
      quickRatio: 1.32,
      bookValuePerShare: `${currency}${(price / 4.2).toFixed(2)}`,
    },
    cashFlow: {
      operatingCashFlow: `${currency}${(approxMarketCapNum * 0.06).toFixed(1)}B`,
      freeCashFlow: `${currency}${(approxMarketCapNum * 0.045).toFixed(1)}B`,
      capitalExpenditures: `${currency}${(approxMarketCapNum * 0.015).toFixed(1)}B`,
      returnOnEquityPct: 18.2,
      returnOnAssetsPct: 9.8,
      returnOnInvestedCapitalPct: 14.5,
    },
    dividends: {
      dividendRate: `${currency}${(price * 0.018).toFixed(2)}`,
      dividendYieldPct: 1.8,
      payoutRatioPct: 42.0,
      dividendGrowth5Y: '+7.4%',
      exDividendDate: 'Nov 14, 2026',
    },
    sharesStatistics: {
      sharesOutstanding: '840.0M',
      publicFloat: '815.0M',
      insiderOwnershipPct: 2.4,
      institutionalOwnershipPct: 68.4,
      shortInterestShares: '16.8M',
      shortPercentOfFloat: 2.06,
      daysToCover: 2.3,
      beta: 1.15,
      week52Range: `${currency}${(price * 0.8).toFixed(2)} - ${currency}${(price * 1.25).toFixed(2)}`,
    },
    analysts: {
      ratingConsensus: 'Moderate Buy',
      targetMean: Number((price * 1.14).toFixed(2)),
      targetHigh: Number((price * 1.35).toFixed(2)),
      targetLow: Number((price * 0.92).toFixed(2)),
      impliedUpsidePct: 14.0,
      totalAnalysts: 26,
      buyCount: 18,
      holdCount: 7,
      sellCount: 1,
    },
    earningsCatalyst: {
      nextEarningsDate: 'Nov 24, 2026',
      daysToEarnings: 42,
      impliedMovePct: 5.6,
      epsConsensus: `${currency}${(price / 80).toFixed(2)}`,
      revenueConsensus: `${currency}${(approxMarketCapNum * 0.055).toFixed(1)}B`,
    },
    fractionalEligible: true,
    minFractionalShare: 0.0001,
    minFractionalDollar: 1.0,
  };
}

/**
 * Universal getter that returns either ETFFundamentals or CompanyProfile
 */
export function getAssetFundamentals(tickerSymbol: string, price: number = 100, name?: string): AssetFundamentals {
  if (isTickerETF(tickerSymbol, name)) {
    return getETFFundamentals(tickerSymbol, price, name);
  }
  return getCompanyProfile(tickerSymbol, price, name);
}
