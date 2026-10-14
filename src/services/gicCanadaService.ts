/**
 * StrikePoint Options Terminal - Canadian Guaranteed Investment Certificates (GIC) Service
 * Comprehensive Fixed-Income & Cash-Alternative Intelligence for Canadian Investors & Registered Accounts
 *
 * Covers:
 * - Big 6 Banks (RBC, TD, BMO, BNS, CIBC, National Bank) & Digital Issuers (EQ Bank, Oaken, Tangerine, Alterna)
 * - Terms: 30-Day, 90-Day, 180-Day, 1-Year, 2-Year, 3-Year, 4-Year, 5-Year
 * - Types: Fixed Rate, Escalator / Step-Up, Cashable / Redeemable, Market-Linked / Equity-Index Linked
 * - CDIC Protection: C$100,000 per eligible category / per member institution
 * - Registered Account Eligibility: TFSA, RRSP, FHSA, RESP, Corporate & Non-Registered Cash
 */

export type GICType = 'fixed' | 'cashable' | 'escalator' | 'market_linked';

export type GICTermMonths = 1 | 3 | 6 | 12 | 24 | 36 | 48 | 60;

export interface GICRateItem {
  id: string;
  issuer: string;
  issuerShort: string;
  logo: string;
  cdicMember: boolean;
  type: GICType;
  termMonths: number;
  termLabel: string;
  rateAnnualPct: number;
  minInvestmentCad: number;
  cashableAfterDays?: number;
  compoundingFrequency: 'Annual' | 'Semi-Annual' | 'Monthly' | 'At Maturity';
  registeredEligible: ('TFSA' | 'RRSP' | 'FHSA' | 'RESP' | 'NON_REG')[];
  marketLinkedDetails?: {
    underlyingIndex: string;
    guaranteedMinReturn: number;
    maxParticipationCapPct: number;
    performanceBuffer: string;
  };
  features: string[];
}

export interface GICIssuerSummary {
  name: string;
  shortName: string;
  tier: 'Big 6 Bank' | 'Digital / Independent' | 'Credit Union (Provincial)';
  rating: string;
  cdicInsured: boolean;
  bestRate1Yr: number;
  bestRate5Yr: number;
  highlight: string;
}

export const CANADIAN_GIC_ISSUERS: GICIssuerSummary[] = [
  {
    name: 'EQ Bank (Equitable Bank)',
    shortName: 'EQ Bank',
    tier: 'Digital / Independent',
    rating: 'DBRS BBB(high)',
    cdicInsured: true,
    bestRate1Yr: 4.35,
    bestRate5Yr: 4.10,
    highlight: 'Industry-leading non-registered & TFSA/RRSP rates, zero minimums.',
  },
  {
    name: 'Oaken Financial (Home Bank)',
    shortName: 'Oaken',
    tier: 'Digital / Independent',
    rating: 'DBRS BBB',
    cdicInsured: true,
    bestRate1Yr: 4.40,
    bestRate5Yr: 4.15,
    highlight: 'High-yield competitive fixed terms across all registered vehicles.',
  },
  {
    name: 'Royal Bank of Canada',
    shortName: 'RBC Royal Bank',
    tier: 'Big 6 Bank',
    rating: 'S&P AA- / Moody’s Aa1',
    cdicInsured: true,
    bestRate1Yr: 4.05,
    bestRate5Yr: 3.75,
    highlight: 'Premier tier-1 sovereign safety, extensive market-linked offerings.',
  },
  {
    name: 'TD Canada Trust',
    shortName: 'TD Bank',
    tier: 'Big 6 Bank',
    rating: 'S&P AA- / Moody’s Aa2',
    cdicInsured: true,
    bestRate1Yr: 4.00,
    bestRate5Yr: 3.70,
    highlight: 'Deep liquid cashable GICs, prime rate laddering options.',
  },
  {
    name: 'Bank of Montreal',
    shortName: 'BMO Bank',
    tier: 'Big 6 Bank',
    rating: 'S&P A+ / Moody’s Aa2',
    cdicInsured: true,
    bestRate1Yr: 4.05,
    bestRate5Yr: 3.80,
    highlight: 'Attractive progressive escalator GICs with rising annual yields.',
  },
  {
    name: 'Scotiabank',
    shortName: 'Scotiabank',
    tier: 'Big 6 Bank',
    rating: 'S&P A+ / Moody’s Aa2',
    cdicInsured: true,
    bestRate1Yr: 3.95,
    bestRate5Yr: 3.65,
    highlight: 'Dynamic Canadian and US Dollar GIC yields with flexible durations.',
  },
  {
    name: 'CIBC (Canadian Imperial Bank)',
    shortName: 'CIBC',
    tier: 'Big 6 Bank',
    rating: 'S&P A+ / Moody’s Aa2',
    cdicInsured: true,
    bestRate1Yr: 4.05,
    bestRate5Yr: 3.75,
    highlight: 'Bonus rate incentives for active direct investing & wealth accounts.',
  },
  {
    name: 'National Bank of Canada',
    shortName: 'National Bank',
    tier: 'Big 6 Bank',
    rating: 'S&P A / Moody’s Aa3',
    cdicInsured: true,
    bestRate1Yr: 4.10,
    bestRate5Yr: 3.85,
    highlight: 'High yield among the Big 6, aggressive specialty broker GIC desk.',
  },
  {
    name: 'Tangerine Bank',
    shortName: 'Tangerine',
    tier: 'Digital / Independent',
    rating: 'Wholly owned by Scotiabank (CDIC)',
    cdicInsured: true,
    bestRate1Yr: 4.25,
    bestRate5Yr: 3.95,
    highlight: 'Instant self-service setup, zero fees in TFSA/RSP portfolios.',
  },
];

export const CANADIAN_GIC_RATES: GICRateItem[] = [
  // 1-Year Fixed Rates
  {
    id: 'gic-eq-1yr',
    issuer: 'EQ Bank (Equitable Bank)',
    issuerShort: 'EQ Bank',
    logo: '🏦',
    cdicMember: true,
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    rateAnnualPct: 4.35,
    minInvestmentCad: 100,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['CDIC Insured', 'Principal 100% Guaranteed', 'No Fees'],
  },
  {
    id: 'gic-oaken-1yr',
    issuer: 'Oaken Financial (Home Bank)',
    issuerShort: 'Oaken',
    logo: '🛡️',
    cdicMember: true,
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    rateAnnualPct: 4.40,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'NON_REG'],
    features: ['Top Market Rate', 'CDIC Insured', 'Compounded Annually'],
  },
  {
    id: 'gic-rbc-1yr',
    issuer: 'Royal Bank of Canada',
    issuerShort: 'RBC Royal Bank',
    logo: '🦁',
    cdicMember: true,
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    rateAnnualPct: 4.05,
    minInvestmentCad: 500,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Big 6 Security', 'CDIC Eligible', 'Available in RBC Direct Investing'],
  },
  {
    id: 'gic-td-1yr',
    issuer: 'TD Canada Trust',
    issuerShort: 'TD Bank',
    logo: '🟩',
    cdicMember: true,
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    rateAnnualPct: 4.00,
    minInvestmentCad: 500,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Big 6 Security', 'CDIC Insured', 'Available in WebBroker'],
  },
  {
    id: 'gic-bmo-1yr',
    issuer: 'Bank of Montreal',
    issuerShort: 'BMO',
    logo: '🔵',
    cdicMember: true,
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    rateAnnualPct: 4.05,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Big 6 Security', 'CDIC Insured', 'Available in BMO InvestorLine'],
  },
  {
    id: 'gic-nb-1yr',
    issuer: 'National Bank of Canada',
    issuerShort: 'National Bank',
    logo: '🔴',
    cdicMember: true,
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    rateAnnualPct: 4.10,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Leading Big 6 Rate', 'CDIC Insured', 'NBDB Zero Commissions'],
  },

  // 2-Year Fixed Rates
  {
    id: 'gic-eq-2yr',
    issuer: 'EQ Bank (Equitable Bank)',
    issuerShort: 'EQ Bank',
    logo: '🏦',
    cdicMember: true,
    type: 'fixed',
    termMonths: 24,
    termLabel: '2 Year Fixed',
    rateAnnualPct: 4.25,
    minInvestmentCad: 100,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['CDIC Insured', 'Guaranteed Rate Lock', 'Annual Payout or Compound'],
  },
  {
    id: 'gic-oaken-2yr',
    issuer: 'Oaken Financial (Home Bank)',
    issuerShort: 'Oaken',
    logo: '🛡️',
    cdicMember: true,
    type: 'fixed',
    termMonths: 24,
    termLabel: '2 Year Fixed',
    rateAnnualPct: 4.30,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'NON_REG'],
    features: ['Competitive Medium-Term Yield', 'CDIC Insured'],
  },
  {
    id: 'gic-rbc-2yr',
    issuer: 'Royal Bank of Canada',
    issuerShort: 'RBC Royal Bank',
    logo: '🦁',
    cdicMember: true,
    type: 'fixed',
    termMonths: 24,
    termLabel: '2 Year Fixed',
    rateAnnualPct: 3.90,
    minInvestmentCad: 500,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Big 6 Solid Principal', 'Annual Interest or Reinvest'],
  },

  // 3-Year Fixed Rates
  {
    id: 'gic-eq-3yr',
    issuer: 'EQ Bank (Equitable Bank)',
    issuerShort: 'EQ Bank',
    logo: '🏦',
    cdicMember: true,
    type: 'fixed',
    termMonths: 36,
    termLabel: '3 Year Fixed',
    rateAnnualPct: 4.15,
    minInvestmentCad: 100,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Zero Penalty at Maturity', 'CDIC Member', 'Easy Renewal'],
  },
  {
    id: 'gic-bmo-3yr',
    issuer: 'Bank of Montreal',
    issuerShort: 'BMO',
    logo: '🔵',
    cdicMember: true,
    type: 'fixed',
    termMonths: 36,
    termLabel: '3 Year Fixed',
    rateAnnualPct: 3.85,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Multi-year Compound', 'CDIC Insured'],
  },

  // 5-Year Fixed Rates
  {
    id: 'gic-oaken-5yr',
    issuer: 'Oaken Financial (Home Bank)',
    issuerShort: 'Oaken',
    logo: '🛡️',
    cdicMember: true,
    type: 'fixed',
    termMonths: 60,
    termLabel: '5 Year Fixed',
    rateAnnualPct: 4.15,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'NON_REG'],
    features: ['High 5-Year Lock', 'Long-term CDIC Security'],
  },
  {
    id: 'gic-eq-5yr',
    issuer: 'EQ Bank (Equitable Bank)',
    issuerShort: 'EQ Bank',
    logo: '🏦',
    cdicMember: true,
    type: 'fixed',
    termMonths: 60,
    termLabel: '5 Year Fixed',
    rateAnnualPct: 4.10,
    minInvestmentCad: 100,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Zero Setup Fees', 'Automated Interest Reinvestment'],
  },
  {
    id: 'gic-cibc-5yr',
    issuer: 'CIBC (Canadian Imperial Bank)',
    issuerShort: 'CIBC',
    logo: '🏦',
    cdicMember: true,
    type: 'fixed',
    termMonths: 60,
    termLabel: '5 Year Fixed',
    rateAnnualPct: 3.75,
    minInvestmentCad: 1000,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
    features: ['Premier Institution', 'CDIC Protection'],
  },

  // Cashable / Redeemable GICs (High Liquidity)
  {
    id: 'gic-td-cashable-1yr',
    issuer: 'TD Canada Trust',
    issuerShort: 'TD Bank',
    logo: '🟩',
    cdicMember: true,
    type: 'cashable',
    termMonths: 12,
    termLabel: '1 Year Cashable (30-Day)',
    rateAnnualPct: 2.85,
    minInvestmentCad: 500,
    cashableAfterDays: 30,
    compoundingFrequency: 'At Maturity',
    registeredEligible: ['TFSA', 'RRSP', 'NON_REG'],
    features: ['Cashable after 30 days without penalty', 'Guaranteed Principal', 'Ideal Emergency Fund'],
  },
  {
    id: 'gic-rbc-cashable-1yr',
    issuer: 'Royal Bank of Canada',
    issuerShort: 'RBC Royal Bank',
    logo: '🦁',
    cdicMember: true,
    type: 'cashable',
    termMonths: 12,
    termLabel: '1 Year Cashable (90-Day)',
    rateAnnualPct: 3.10,
    minInvestmentCad: 1000,
    cashableAfterDays: 90,
    compoundingFrequency: 'At Maturity',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'NON_REG'],
    features: ['Cashable after 90 days', 'Earn interest accrued up to cash-out date', 'CDIC Protected'],
  },
  {
    id: 'gic-eq-cashable-1yr',
    issuer: 'EQ Bank (Notice / Cashable)',
    issuerShort: 'EQ Bank',
    logo: '🏦',
    cdicMember: true,
    type: 'cashable',
    termMonths: 12,
    termLabel: '1 Year Notice GIC',
    rateAnnualPct: 3.50,
    minInvestmentCad: 100,
    cashableAfterDays: 30,
    compoundingFrequency: 'Monthly',
    registeredEligible: ['TFSA', 'RRSP', 'NON_REG'],
    features: ['Full principal preserved', 'Monthly compound payout', 'High cash equivalent yield'],
  },

  // Escalator / Step-Up GICs
  {
    id: 'gic-bmo-escalator-3yr',
    issuer: 'Bank of Montreal',
    issuerShort: 'BMO',
    logo: '🔵',
    cdicMember: true,
    type: 'escalator',
    termMonths: 36,
    termLabel: '3-Year RateOptimizer Step-Up',
    rateAnnualPct: 4.15, // Effective average rate
    minInvestmentCad: 1000,
    cashableAfterDays: 365,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'NON_REG'],
    features: [
      'Year 1: 3.50% · Year 2: 4.00% · Year 3: 4.95%',
      'Redeemable each anniversary with full interest',
      'Average Yield to Maturity: 4.15%',
    ],
  },
  {
    id: 'gic-scotia-escalator-5yr',
    issuer: 'Scotiabank',
    issuerShort: 'Scotiabank',
    logo: '🔴',
    cdicMember: true,
    type: 'escalator',
    termMonths: 60,
    termLabel: '5-Year Progressive Step-Up',
    rateAnnualPct: 4.05,
    minInvestmentCad: 500,
    cashableAfterDays: 365,
    compoundingFrequency: 'Annual',
    registeredEligible: ['TFSA', 'RRSP', 'RESP', 'NON_REG'],
    features: [
      'Rate steps up every 12 months',
      'Cashable on each anniversary date',
      '100% CDIC protection on invested capital',
    ],
  },

  // Market-Linked / Equity-Index Linked GICs
  {
    id: 'gic-rbc-market-tsx-3yr',
    issuer: 'Royal Bank of Canada',
    issuerShort: 'RBC Royal Bank',
    logo: '🦁',
    cdicMember: true,
    type: 'market_linked',
    termMonths: 36,
    termLabel: '3-Year Canadian Banking Market-Linked',
    rateAnnualPct: 6.25, // Max potential annual yield
    minInvestmentCad: 1000,
    compoundingFrequency: 'At Maturity',
    registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'NON_REG'],
    marketLinkedDetails: {
      underlyingIndex: 'S&P/TSX Composite Banks Index (6 Canadian Banks)',
      guaranteedMinReturn: 0.0, // 100% principal back
      maxParticipationCapPct: 20.0, // Cumulative cap over 3 years (~6.25% ann.)
      performanceBuffer: '100% Capital Guaranteed even if TSX Banks decline.',
    },
    features: [
      '100% Principal Guaranteed by RBC',
      'Potential upside up to 20.0% total return',
      'CDIC eligible up to limits',
    ],
  },
  {
    id: 'gic-td-market-esg-5yr',
    issuer: 'TD Canada Trust',
    issuerShort: 'TD Bank',
    logo: '🟩',
    cdicMember: true,
    type: 'market_linked',
    termMonths: 60,
    termLabel: '5-Year Canadian Low Volatility Index GIC',
    rateAnnualPct: 7.10, // Max potential annual yield
    minInvestmentCad: 1000,
    compoundingFrequency: 'At Maturity',
    registeredEligible: ['TFSA', 'RRSP', 'NON_REG'],
    marketLinkedDetails: {
      underlyingIndex: 'S&P/TSX 60 ESG & Low Volatility Index',
      guaranteedMinReturn: 2.5, // 0.5% min per year
      maxParticipationCapPct: 40.0, // Max return over 5 years (~7.10% ann.)
      performanceBuffer: 'Minimum 2.5% cumulative payout guaranteed regardless of markets.',
    },
    features: [
      'Zero downside principal risk',
      'Participates in TSX index rallies up to 40%',
      'CRA registered account eligible',
    ],
  },
];

export interface CDICCoverageRule {
  category: string;
  limitCad: number;
  description: string;
  examples: string[];
}

export const CDIC_COVERAGE_RULES: CDICCoverageRule[] = [
  {
    category: 'Non-Registered Deposits in One Name',
    limitCad: 100000,
    description: 'Covers savings accounts, chequing, and GICs held solely by one person per member institution.',
    examples: ['C$100,000 at RBC + C$100,000 at TD are both 100% protected'],
  },
  {
    category: 'Tax-Free Savings Accounts (TFSA)',
    limitCad: 100000,
    description: 'Separate C$100,000 CDIC envelope dedicated to all TFSA eligible deposits with the issuer.',
    examples: ['C$100,000 GIC in TFSA protected independently from non-registered cash'],
  },
  {
    category: 'Registered Retirement Savings (RRSP)',
    limitCad: 100000,
    description: 'Separate C$100,000 CDIC envelope for RRSP, RRIF, and locked-in retirement plans.',
    examples: ['Combined RRSP + RRIF GIC holdings covered up to C$100,000'],
  },
  {
    category: 'First Home Savings Account (FHSA)',
    limitCad: 100000,
    description: 'Fully protected under dedicated standalone CDIC category legislated by Finance Canada.',
    examples: ['C$40,000 lifetime FHSA deposits 100% insured'],
  },
  {
    category: 'Registered Education Savings (RESP)',
    limitCad: 100000,
    description: 'Protected per beneficiary name under separate trust deposit rules.',
    examples: ['Multiple child RESP accounts each qualify for CDIC insurance limits'],
  },
];

/**
 * Calculates compound interest and maturity proceeds for a GIC investment
 */
export function calculateGICMaturity(
  principalCad: number,
  rateAnnualPct: number,
  termMonths: number,
  frequency: 'Annual' | 'Semi-Annual' | 'Monthly' | 'At Maturity' = 'Annual'
): {
  totalInterest: number;
  maturityValue: number;
  effectiveAnnualYield: number;
  cashPerPeriod: number;
  breakdownYears: { year: number; startBal: number; interestEarned: number; endBal: number }[];
} {
  const r = rateAnnualPct / 100;
  const years = termMonths / 12;

  let n = 1;
  if (frequency === 'Semi-Annual') n = 2;
  if (frequency === 'Monthly') n = 12;

  let maturityValue: number;
  let effectiveAnnualYield: number;

  if (frequency === 'At Maturity') {
    // Simple interest or compound once
    maturityValue = principalCad * Math.pow(1 + r, years);
    effectiveAnnualYield = (Math.pow(maturityValue / principalCad, 1 / years) - 1) * 100;
  } else {
    maturityValue = principalCad * Math.pow(1 + r / n, n * years);
    effectiveAnnualYield = (Math.pow(1 + r / n, n) - 1) * 100;
  }

  const totalInterest = maturityValue - principalCad;
  const cashPerPeriod = (principalCad * r) / (n || 1);

  // Build year by year breakdown
  const breakdownYears: { year: number; startBal: number; interestEarned: number; endBal: number }[] = [];
  let curBal = principalCad;
  const fullYears = Math.ceil(years);

  for (let y = 1; y <= fullYears; y++) {
    const fraction = y > years ? years - (y - 1) : 1;
    const start = curBal;
    const interest = start * Math.pow(1 + r / n, n * fraction) - start;
    const end = start + interest;
    curBal = end;

    breakdownYears.push({
      year: y,
      startBal: Math.round(start * 100) / 100,
      interestEarned: Math.round(interest * 100) / 100,
      endBal: Math.round(end * 100) / 100,
    });
  }

  return {
    totalInterest: Math.round(totalInterest * 100) / 100,
    maturityValue: Math.round(maturityValue * 100) / 100,
    effectiveAnnualYield: Math.round(effectiveAnnualYield * 100) / 100,
    cashPerPeriod: Math.round(cashPerPeriod * 100) / 100,
    breakdownYears,
  };
}

/**
 * Calculates a 5-Year GIC Laddering Strategy
 * Splitting capital equally across 1, 2, 3, 4, and 5-year terms to maximize ongoing liquidity and rolling yield.
 */
export function calculateGICLadder(totalCapitalCad: number) {
  const trancheCapital = totalCapitalCad / 5;
  const tranches = [
    { year: 1, term: '1-Year', rate: 4.35, maturityMonths: 12 },
    { year: 2, term: '2-Year', rate: 4.25, maturityMonths: 24 },
    { year: 3, term: '3-Year', rate: 4.15, maturityMonths: 36 },
    { year: 4, term: '4-Year', rate: 4.10, maturityMonths: 48 },
    { year: 5, term: '5-Year', rate: 4.15, maturityMonths: 60 },
  ];

  const calculatedTranches = tranches.map((t) => {
    const calc = calculateGICMaturity(trancheCapital, t.rate, t.maturityMonths, 'Annual');
    return {
      ...t,
      principal: trancheCapital,
      totalInterest: calc.totalInterest,
      maturityValue: calc.maturityValue,
      annualIncome: (trancheCapital * t.rate) / 100,
    };
  });

  const totalInterestEarned = calculatedTranches.reduce((sum, t) => sum + t.totalInterest, 0);
  const blendedAverageYield = tranches.reduce((sum, t) => sum + t.rate, 0) / tranches.length;
  const annualLiquidityFreed = trancheCapital;

  return {
    totalCapitalCad,
    trancheCapital,
    blendedAverageYield: Math.round(blendedAverageYield * 100) / 100,
    totalInterestEarned: Math.round(totalInterestEarned * 100) / 100,
    annualLiquidityFreed,
    calculatedTranches,
  };
}

/**
 * Rollover instructions for Canadian GIC holdings at maturity
 */
export type GICRolloverInstruction =
  | 'ROLLOVER_FULL'        // Reinvest Principal + Accrued Interest into a new GIC at prevailing rate
  | 'ROLLOVER_PRINCIPAL'   // Reinvest Principal only; Deposit Accrued Interest to Account Cash Balance
  | 'PAYOUT_CASH';         // No Rollover: Deposit 100% of Principal + Interest to Account Cash Balance

export type GICHoldingStatus = 'ACTIVE' | 'MATURED' | 'REDEEMED';

export interface GICHistoryEntry {
  timestamp: string;
  event: 'PURCHASE' | 'ROLLOVER_FULL' | 'ROLLOVER_PRINCIPAL' | 'INSTRUCTION_CHANGE' | 'EARLY_REDEEM' | 'MATURITY_PAYOUT';
  note: string;
}

export interface PurchasedGIC {
  id: string;
  certificateNumber: string;
  issuer: string;
  issuerShort: string;
  logo: string;
  accountId: string;
  accountName: string;
  accountCode: 'TFSA' | 'RRSP' | 'FHSA' | 'RESP' | 'MARGIN_CAD' | 'MARGIN_USD' | 'CORPORATE';
  type: GICType;
  termMonths: number;
  termLabel: string;
  annualRatePct: number;
  principalCad: number;
  compoundingFrequency: 'Annual' | 'Semi-Annual' | 'Monthly' | 'At Maturity';
  purchaseDate: string;
  maturityDate: string;
  daysToMaturity: number;
  totalDays: number;
  accruedInterestCad: number;
  projectedTotalInterestCad: number;
  projectedMaturityValueCad: number;
  rolloverInstruction: GICRolloverInstruction;
  status: GICHoldingStatus;
  cdicInsured: boolean;
  cdicCoverageAmountCad: number;
  rolloverCount: number;
  lastRolloverDate?: string;
  history: GICHistoryEntry[];
}

export const GIC_STORAGE_KEY = 'strikepoint_canadian_gic_holdings_v2';
export const GIC_ALERT_SETTINGS_KEY = 'strikepoint_gic_alert_settings_v1';

export type AlertUrgency = 'CRITICAL' | 'WARNING' | 'UPCOMING';

export interface GICMaturityAlert {
  id: string;
  gicId: string;
  certificateNumber: string;
  issuer: string;
  issuerShort: string;
  logo: string;
  accountCode: string;
  accountName: string;
  principalCad: number;
  projectedMaturityValueCad: number;
  annualRatePct: number;
  maturityDate: string;
  daysRemaining: number;
  urgency: AlertUrgency;
  rolloverInstruction: GICRolloverInstruction;
  rolloverStatusText: string;
  actionRequired: string;
  isEligibleForRollover: boolean;
  gracePeriodDays: number;
  renewalRateBenchmarkPct: number;
  isSnoozed?: boolean;
}

export interface GICAlertSettings {
  criticalThresholdDays: number; // default 15 days (imminent grace window)
  warningThresholdDays: number;  // default 30 days (pre-maturity notice)
  soundAlertEnabled: boolean;
  autoCheckOnMount: boolean;
  snoozedAlerts: Record<string, string>; // gicId -> snoozedUntilDate
}

export const DEFAULT_ALERT_SETTINGS: GICAlertSettings = {
  criticalThresholdDays: 15,
  warningThresholdDays: 30,
  soundAlertEnabled: true,
  autoCheckOnMount: true,
  snoozedAlerts: {},
};

/**
 * Helper to compute precise days to maturity from ISO date string
 */
export function computeDaysToMaturity(maturityDateStr: string): number {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = maturityDateStr.split('-');
    if (parts.length === 3) {
      const mat = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      mat.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((mat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
  } catch (e) {
    // fallback
  }
  return 30;
}

/**
 * Initial Realistic Pre-Seeded Canadian GIC Certificates with Nearing Maturity
 */
export const INITIAL_PURCHASED_GICS: PurchasedGIC[] = [
  {
    id: 'gic-cert-eq-tfsa-2025',
    certificateNumber: 'EQB-GIC-782410-TFSA',
    issuer: 'EQ Bank (Equitable Bank)',
    issuerShort: 'EQ Bank',
    logo: '🏦',
    accountId: 'act-tfsa',
    accountName: 'Tax-Free Savings Account (TFSA)',
    accountCode: 'TFSA',
    type: 'fixed',
    termMonths: 12,
    termLabel: '1 Year Fixed',
    annualRatePct: 4.35,
    principalCad: 20000.0,
    compoundingFrequency: 'Annual',
    purchaseDate: '2025-10-24',
    maturityDate: '2026-10-24', // 12 days to maturity (CRITICAL Alert)
    daysToMaturity: 12,
    totalDays: 365,
    accruedInterestCad: 841.50,
    projectedTotalInterestCad: 870.0,
    projectedMaturityValueCad: 20870.0,
    rolloverInstruction: 'ROLLOVER_FULL',
    status: 'ACTIVE',
    cdicInsured: true,
    cdicCoverageAmountCad: 20000.0,
    rolloverCount: 0,
    history: [
      {
        timestamp: '2025-10-24 10:14:02',
        event: 'PURCHASE',
        note: 'Initial subscription: $20,000.00 CAD 1-Year Fixed at 4.35% APY in TFSA with CDIC protection.',
      },
      {
        timestamp: '2026-03-01 09:00:00',
        event: 'INSTRUCTION_CHANGE',
        note: 'Defaulted to Auto-Rollover (Full Compound) for automated capital preservation.',
      },
    ],
  },
  {
    id: 'gic-cert-rbc-rrsp-2025',
    certificateNumber: 'RBC-DS-991204-RRSP',
    issuer: 'Royal Bank of Canada',
    issuerShort: 'RBC Royal Bank',
    logo: '🦁',
    accountId: 'act-rrsp',
    accountName: 'Registered Retirement Savings Plan (RRSP)',
    accountCode: 'RRSP',
    type: 'fixed',
    termMonths: 24,
    termLabel: '2 Year Fixed',
    annualRatePct: 4.05,
    principalCad: 25000.0,
    compoundingFrequency: 'Annual',
    purchaseDate: '2024-11-09',
    maturityDate: '2026-11-09', // 28 days to maturity (WARNING Alert)
    daysToMaturity: 28,
    totalDays: 730,
    accruedInterestCad: 1985.40,
    projectedTotalInterestCad: 2065.10,
    projectedMaturityValueCad: 27065.10,
    rolloverInstruction: 'ROLLOVER_PRINCIPAL',
    status: 'ACTIVE',
    cdicInsured: true,
    cdicCoverageAmountCad: 25000.0,
    rolloverCount: 0,
    history: [
      {
        timestamp: '2024-11-09 14:22:18',
        event: 'PURCHASE',
        note: 'Initial purchase of $25,000.00 CAD 2-Yr Fixed GIC in RRSP portfolio.',
      },
      {
        timestamp: '2024-11-09 14:22:20',
        event: 'INSTRUCTION_CHANGE',
        note: 'Rollover instruction set to Rollover Principal Only (deposit accumulated interest to RRSP cash for dividend reinvestment).',
      },
    ],
  },
  {
    id: 'gic-cert-td-margin-2026',
    certificateNumber: 'TD-CSH-330198-CAD',
    issuer: 'TD Canada Trust',
    issuerShort: 'TD Bank',
    logo: '🌲',
    accountId: 'act-margin-cad',
    accountName: 'Margin Account (CAD)',
    accountCode: 'MARGIN_CAD',
    type: 'cashable',
    termMonths: 12,
    termLabel: '1 Year Cashable',
    annualRatePct: 3.25,
    principalCad: 15000.0,
    compoundingFrequency: 'Annual',
    purchaseDate: '2026-03-01',
    maturityDate: '2027-03-01',
    daysToMaturity: 140,
    totalDays: 365,
    accruedInterestCad: 300.41,
    projectedTotalInterestCad: 487.50,
    projectedMaturityValueCad: 15487.50,
    rolloverInstruction: 'PAYOUT_CASH',
    status: 'ACTIVE',
    cdicInsured: true,
    cdicCoverageAmountCad: 15000.0,
    rolloverCount: 0,
    history: [
      {
        timestamp: '2026-03-01 11:45:10',
        event: 'PURCHASE',
        note: 'Cashable GIC subscription. Cashable after 30 days with accrued interest guaranteed.',
      },
    ],
  },
];

/**
 * Retrieve current purchased GIC certificates from localStorage or defaults
 */
export function getPurchasedGICs(): PurchasedGIC[] {
  try {
    const raw = localStorage.getItem(GIC_STORAGE_KEY) || localStorage.getItem('strikepoint_canadian_gic_holdings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Recalculate daysToMaturity for active GICs
        return parsed.map((g: PurchasedGIC) => {
          if (g.status === 'ACTIVE' && g.maturityDate) {
            return {
              ...g,
              daysToMaturity: computeDaysToMaturity(g.maturityDate),
            };
          }
          return g;
        });
      }
    }
  } catch (e) {
    console.error('Failed to load GICs from localStorage', e);
  }
  return INITIAL_PURCHASED_GICS;
}

/**
 * Persist GIC certificates list to localStorage
 */
export function savePurchasedGICs(gics: PurchasedGIC[]): void {
  try {
    localStorage.setItem(GIC_STORAGE_KEY, JSON.stringify(gics));
  } catch (e) {
    console.error('Failed to save GICs to localStorage', e);
  }
}

/**
 * Retrieve Alert Preferences Settings
 */
export function getGICAlertSettings(): GICAlertSettings {
  try {
    const raw = localStorage.getItem(GIC_ALERT_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load GIC alert settings', e);
  }
  return DEFAULT_ALERT_SETTINGS;
}

/**
 * Save Alert Preferences Settings
 */
export function saveGICAlertSettings(settings: GICAlertSettings): void {
  try {
    localStorage.setItem(GIC_ALERT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save GIC alert settings', e);
  }
}

/**
 * Snooze an alert for a specific GIC certificate
 */
export function snoozeGICAlert(gicId: string, days: number = 7): GICAlertSettings {
  const current = getGICAlertSettings();
  const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const updated: GICAlertSettings = {
    ...current,
    snoozedAlerts: {
      ...current.snoozedAlerts,
      [gicId]: snoozeUntil,
    },
  };
  saveGICAlertSettings(updated);
  return updated;
}

/**
 * Dismiss or clear snooze
 */
export function clearGICSnooze(gicId: string): GICAlertSettings {
  const current = getGICAlertSettings();
  const { [gicId]: _, ...remaining } = current.snoozedAlerts;
  const updated: GICAlertSettings = {
    ...current,
    snoozedAlerts: remaining,
  };
  saveGICAlertSettings(updated);
  return updated;
}

/**
 * Generate Active Maturity Alerts for GICs nearing expiration
 */
export function generateMaturityAlerts(
  gics: PurchasedGIC[],
  settings: GICAlertSettings = getGICAlertSettings()
): GICMaturityAlert[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeOnly = gics.filter((g) => g.status === 'ACTIVE');

  const alerts: GICMaturityAlert[] = [];

  for (const gic of activeOnly) {
    const days = computeDaysToMaturity(gic.maturityDate);

    // Check if currently snoozed
    const snoozedUntil = settings.snoozedAlerts[gic.id];
    const isSnoozed = Boolean(snoozedUntil && snoozedUntil >= todayStr);

    // If within warning threshold (e.g. <= 30 days)
    if (days <= settings.warningThresholdDays) {
      const urgency: AlertUrgency = days <= settings.criticalThresholdDays ? 'CRITICAL' : 'WARNING';

      let rolloverStatusText = '';
      if (gic.rolloverInstruction === 'ROLLOVER_FULL') {
        rolloverStatusText = 'Set to Auto-Rollover (Full Compound) at prevailing market rate';
      } else if (gic.rolloverInstruction === 'ROLLOVER_PRINCIPAL') {
        rolloverStatusText = 'Set to Rollover Principal Only (Accrued interest will be credited to cash)';
      } else {
        rolloverStatusText = 'Set to Cash Payout (100% of Principal + Interest will be credited to cash)';
      }

      const actionRequired =
        days <= 0
          ? 'Matures Today! Standard 15-day grace period is now open to adjust instructions or redeem funds.'
          : days <= settings.criticalThresholdDays
          ? `Matures in ${days} days (${gic.maturityDate}). Review or update rollover instructions before automated execution.`
          : `Matures in ${days} days (${gic.maturityDate}). Eligible for rate lock & rollover preference scheduling.`;

      alerts.push({
        id: `alert-${gic.id}`,
        gicId: gic.id,
        certificateNumber: gic.certificateNumber,
        issuer: gic.issuer,
        issuerShort: gic.issuerShort,
        logo: gic.logo,
        accountCode: gic.accountCode,
        accountName: gic.accountName,
        principalCad: gic.principalCad,
        projectedMaturityValueCad: gic.projectedMaturityValueCad,
        annualRatePct: gic.annualRatePct,
        maturityDate: gic.maturityDate,
        daysRemaining: days,
        urgency,
        rolloverInstruction: gic.rolloverInstruction,
        rolloverStatusText,
        actionRequired,
        isEligibleForRollover: true,
        gracePeriodDays: 15,
        renewalRateBenchmarkPct: 4.35, // prevailing 1-year rate
        isSnoozed,
      });
    }
  }

  // Sort: Critical first, then by daysRemaining ascending
  return alerts.sort((a, b) => {
    if (a.urgency === 'CRITICAL' && b.urgency !== 'CRITICAL') return -1;
    if (b.urgency === 'CRITICAL' && a.urgency !== 'CRITICAL') return 1;
    return a.daysRemaining - b.daysRemaining;
  });
}

/**
 * Helper to generate unique Certificate Number
 */
export function generateCertificateNumber(issuerShort: string, accountCode: string): string {
  const codePrefix = issuerShort.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  const randNum = Math.floor(100000 + Math.random() * 900000);
  return `${codePrefix}-GIC-${randNum}-${accountCode}`;
}

/**
 * Compute maturity date from today given termMonths
 */
export function calculateMaturityDate(termMonths: number): string {
  const now = new Date();
  const future = new Date(now.getFullYear(), now.getMonth() + termMonths, now.getDate());
  return future.toISOString().slice(0, 10);
}

/**
 * Execute a new GIC Purchase
 */
export function executeGICPurchase(params: {
  rateItem: GICRateItem;
  accountId: string;
  accountName: string;
  accountCode: 'TFSA' | 'RRSP' | 'FHSA' | 'RESP' | 'MARGIN_CAD' | 'MARGIN_USD' | 'CORPORATE';
  principalCad: number;
  rolloverInstruction: GICRolloverInstruction;
  compoundingFrequency?: 'Annual' | 'Semi-Annual' | 'Monthly' | 'At Maturity';
}): PurchasedGIC {
  const {
    rateItem,
    accountId,
    accountName,
    accountCode,
    principalCad,
    rolloverInstruction,
    compoundingFrequency = rateItem.compoundingFrequency,
  } = params;

  const calc = calculateGICMaturity(principalCad, rateItem.rateAnnualPct, rateItem.termMonths, compoundingFrequency);
  const purchaseDate = new Date().toISOString().slice(0, 10);
  const maturityDate = calculateMaturityDate(rateItem.termMonths);
  const totalDays = rateItem.termMonths * 30.42;
  const certNumber = generateCertificateNumber(rateItem.issuerShort, accountCode);

  const newGIC: PurchasedGIC = {
    id: `gic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    certificateNumber: certNumber,
    issuer: rateItem.issuer,
    issuerShort: rateItem.issuerShort,
    logo: rateItem.logo,
    accountId,
    accountName,
    accountCode,
    type: rateItem.type,
    termMonths: rateItem.termMonths,
    termLabel: rateItem.termLabel,
    annualRatePct: rateItem.rateAnnualPct,
    principalCad,
    compoundingFrequency,
    purchaseDate,
    maturityDate,
    daysToMaturity: Math.round(totalDays),
    totalDays: Math.round(totalDays),
    accruedInterestCad: 0,
    projectedTotalInterestCad: calc.totalInterest,
    projectedMaturityValueCad: calc.maturityValue,
    rolloverInstruction,
    status: 'ACTIVE',
    cdicInsured: rateItem.cdicMember,
    cdicCoverageAmountCad: Math.min(principalCad, 100000),
    rolloverCount: 0,
    history: [
      {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        event: 'PURCHASE',
        note: `Subscription confirmed: $${principalCad.toLocaleString()} CAD at ${rateItem.rateAnnualPct.toFixed(2)}% APY (${rateItem.termLabel}). Initial rollover set to ${
          rolloverInstruction === 'ROLLOVER_FULL'
            ? 'Auto-Rollover (Full)'
            : rolloverInstruction === 'ROLLOVER_PRINCIPAL'
            ? 'Rollover Principal Only'
            : 'Cash Payout'
        }.`,
      },
    ],
  };

  const current = getPurchasedGICs();
  const updated = [newGIC, ...current];
  savePurchasedGICs(updated);
  return newGIC;
}

/**
 * Update rollover instructions on an active certificate
 */
export function updateGICRollover(
  gicId: string,
  newInstruction: GICRolloverInstruction
): { updatedGIC: PurchasedGIC; allGICs: PurchasedGIC[] } {
  const current = getPurchasedGICs();
  const label =
    newInstruction === 'ROLLOVER_FULL'
      ? 'Auto-Rollover Principal + Interest'
      : newInstruction === 'ROLLOVER_PRINCIPAL'
      ? 'Rollover Principal Only (Cash Out Interest)'
      : 'Full Cash Payout at Maturity';

  const updated = current.map((g) => {
    if (g.id !== gicId) return g;
    return {
      ...g,
      rolloverInstruction: newInstruction,
      history: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          event: 'INSTRUCTION_CHANGE' as const,
          note: `Rollover instruction revised to: ${label}.`,
        },
        ...g.history,
      ],
    };
  });

  savePurchasedGICs(updated);
  const found = updated.find((g) => g.id === gicId)!;
  return { updatedGIC: found, allGICs: updated };
}

/**
 * Execute GIC Rollover or Maturity Payout
 * Returns the updated/renewed certificate, the entire updated array, and cash amount to credit to the user's account balance
 */
export function executeMaturityOrRollover(
  gicId: string
): {
  actionTaken: 'ROLLED_FULL' | 'ROLLED_PRINCIPAL' | 'PAID_OUT';
  cashCreditCad: number;
  updatedGIC: PurchasedGIC;
  allGICs: PurchasedGIC[];
} {
  const current = getPurchasedGICs();
  const target = current.find((g) => g.id === gicId);
  if (!target) {
    throw new Error('Certificate not found');
  }

  const earnedInterest = target.projectedTotalInterestCad;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let actionTaken: 'ROLLED_FULL' | 'ROLLED_PRINCIPAL' | 'PAID_OUT' = 'ROLLED_FULL';
  let cashCreditCad = 0;
  let newGIC: PurchasedGIC;

  if (target.rolloverInstruction === 'ROLLOVER_FULL') {
    // Roll entire principal + earned interest into new term
    const newPrincipal = target.projectedMaturityValueCad;
    const calc = calculateGICMaturity(newPrincipal, target.annualRatePct, target.termMonths, target.compoundingFrequency);
    const newMaturity = calculateMaturityDate(target.termMonths);
    actionTaken = 'ROLLED_FULL';
    cashCreditCad = 0;

    newGIC = {
      ...target,
      principalCad: newPrincipal,
      purchaseDate: new Date().toISOString().slice(0, 10),
      maturityDate: newMaturity,
      daysToMaturity: Math.round(target.termMonths * 30.42),
      accruedInterestCad: 0,
      projectedTotalInterestCad: calc.totalInterest,
      projectedMaturityValueCad: calc.maturityValue,
      rolloverCount: target.rolloverCount + 1,
      lastRolloverDate: nowStr,
      status: 'ACTIVE',
      history: [
        {
          timestamp: nowStr,
          event: 'ROLLOVER_FULL',
          note: `Rollover #${target.rolloverCount + 1} Executed: Compound balance of $${newPrincipal.toLocaleString()} CAD rolled for another ${target.termLabel} at ${target.annualRatePct.toFixed(2)}% APY.`,
        },
        ...target.history,
      ],
    };
  } else if (target.rolloverInstruction === 'ROLLOVER_PRINCIPAL') {
    // Roll principal only, credit earned interest to cash balance
    const samePrincipal = target.principalCad;
    const calc = calculateGICMaturity(samePrincipal, target.annualRatePct, target.termMonths, target.compoundingFrequency);
    const newMaturity = calculateMaturityDate(target.termMonths);
    actionTaken = 'ROLLED_PRINCIPAL';
    cashCreditCad = earnedInterest;

    newGIC = {
      ...target,
      purchaseDate: new Date().toISOString().slice(0, 10),
      maturityDate: newMaturity,
      daysToMaturity: Math.round(target.termMonths * 30.42),
      accruedInterestCad: 0,
      projectedTotalInterestCad: calc.totalInterest,
      projectedMaturityValueCad: calc.maturityValue,
      rolloverCount: target.rolloverCount + 1,
      lastRolloverDate: nowStr,
      status: 'ACTIVE',
      history: [
        {
          timestamp: nowStr,
          event: 'ROLLOVER_PRINCIPAL',
          note: `Rollover #${target.rolloverCount + 1} Executed: Principal $${samePrincipal.toLocaleString()} CAD renewed. Accumulated interest of $${earnedInterest.toLocaleString()} CAD paid directly to account cash.`,
        },
        ...target.history,
      ],
    };
  } else {
    // Full Cash Payout to account balance
    actionTaken = 'PAID_OUT';
    cashCreditCad = target.projectedMaturityValueCad;

    newGIC = {
      ...target,
      daysToMaturity: 0,
      accruedInterestCad: earnedInterest,
      status: 'MATURED',
      history: [
        {
          timestamp: nowStr,
          event: 'MATURITY_PAYOUT',
          note: `Certificate matured. 100% of Principal ($${target.principalCad.toLocaleString()} CAD) + Interest ($${earnedInterest.toLocaleString()} CAD) totaling $${target.projectedMaturityValueCad.toLocaleString()} CAD deposited to ${target.accountCode} cash balance.`,
        },
        ...target.history,
      ],
    };
  }

  const allUpdated = current.map((g) => (g.id === gicId ? newGIC : g));
  savePurchasedGICs(allUpdated);

  return {
    actionTaken,
    cashCreditCad,
    updatedGIC: newGIC,
    allGICs: allUpdated,
  };
}

/**
 * Early redemption (e.g. for Cashable GIC or emergency liquidation)
 */
export function earlyRedeemGIC(
  gicId: string
): {
  payoutCad: number;
  redeemedGIC: PurchasedGIC;
  allGICs: PurchasedGIC[];
} {
  const current = getPurchasedGICs();
  const target = current.find((g) => g.id === gicId);
  if (!target) throw new Error('Certificate not found');

  // If cashable, pays principal + accrued interest. If fixed, penalty may forfeit interest
  const interestEarned = target.type === 'cashable' ? target.accruedInterestCad : target.accruedInterestCad * 0.5;
  const payoutCad = target.principalCad + interestEarned;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const redeemed: PurchasedGIC = {
    ...target,
    daysToMaturity: 0,
    status: 'REDEEMED',
    history: [
      {
        timestamp: nowStr,
        event: 'EARLY_REDEEM',
        note: `Early redemption executed. Principal $${target.principalCad.toLocaleString()} CAD plus accrued interest $${interestEarned.toFixed(2)} CAD deposited to ${target.accountCode} cash balance.`,
      },
      ...target.history,
    ],
  };

  const allUpdated = current.map((g) => (g.id === gicId ? redeemed : g));
  savePurchasedGICs(allUpdated);

  return {
    payoutCad,
    redeemedGIC: redeemed,
    allGICs: allUpdated,
  };
}
