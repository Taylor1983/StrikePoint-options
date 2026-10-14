/**
 * Global Macroeconomic Data Service (Bloomberg ECST / MACR Terminal Engine)
 * Institutional repository of cross-border macroeconomic indicators, central bank rate cycles,
 * inflation breakdowns, labor markets, sovereign debt, and macroeconomic regime models.
 */

export type MacroRegion = 'GLOBAL' | 'G7' | 'NORTH_AMERICA' | 'EUROPE' | 'ASIA_PACIFIC' | 'EMERGING';

export interface EconomyMacroProfile {
  id: string;
  name: string;
  flag: string;
  region: MacroRegion;
  currency: string;
  currencySymbol: string;
  centralBank: {
    name: string;
    abbreviation: string;
    policyRate: number;
    rateUnit: string;
    lastAction: string;
    lastActionDate: string;
    nextMeeting: string;
    meetingExpectation: string;
    cutProbabilityPct: number;
    hikeProbabilityPct: number;
    holdProbabilityPct: number;
    stance: 'DOVISH' | 'NEUTRAL' | 'HAWKISH';
    balanceSheetUsdTrillion: number;
    qtMonthlyPaceUsdBillion: number;
    guidanceSummary: string;
  };
  gdp: {
    realGdpYoY: number;
    realGdpQoQAnn: number;
    trend: 'ACCELERATING' | 'STEADY' | 'SLOWING' | 'CONTRACTION';
    nominalGdpTrillionUsd: number;
    gdpPerCapitaUsd: number;
    history12M: number[]; // quarterly or monthly YoY trend
  };
  inflation: {
    headlineCpiYoY: number;
    coreCpiYoY: number;
    targetRate: number;
    ppiYoY: number;
    pceCoreYoY?: number;
    trend: 'FALLING' | 'STABLE' | 'STICKY' | 'RISING';
    history12M: number[]; // 12-month CPI YoY history
  };
  labor: {
    unemploymentRate: number;
    wageGrowthYoY: number;
    nonfarmPayrollsOrJobCreationK: number;
    laborMarketCondition: 'TIGHT' | 'BALANCED' | 'SOFTENING' | 'LOOSE';
  };
  activity: {
    manufacturingPmi: number;
    servicesPmi: number;
    compositePmi: number;
    consumerConfidence: number;
    retailSalesYoY: number;
  };
  fiscalAndSovereign: {
    debtToGdpPct: number;
    budgetDeficitPct: number;
    yield2Y: number;
    yield10Y: number;
    spread2Y10Y: number; // in bps
    curveInversionStatus: 'NORMAL' | 'FLAT' | 'INVERTED';
    fxRateVsUsd: number;
    fxChange1MYoY: number;
  };
}

export interface CentralBankPolicyTracker {
  id: string;
  bankName: string;
  country: string;
  flag: string;
  governor: string;
  currentRate: number;
  rateLabel: string;
  cycleStage: 'EASING_CYCLE' | 'PAUSE_RESTRICTIVE' | 'TIGHTENING_CYCLE' | 'NORMALIZATION';
  nextMeetingDate: string;
  cutProbPct: number;
  holdProbPct: number;
  hikeProbPct: number;
  expectedRateEndOf2026: number;
  expectedRateEndOf2027: number;
  neutralRateEst: number; // estimated R* neutral rate
  balanceSheetAction: string;
  keyRiskFactor: string;
}

export interface MacroRegimeQuadrant {
  quadrantId: 'GOLDILOCKS' | 'REFLATION' | 'STAGFLATION' | 'DISINFLATION';
  quadrantName: string;
  growthStatus: 'ACCELERATING' | 'DECELERATING';
  inflationStatus: 'RISING' | 'FALLING';
  isCurrent: boolean;
  score: number; // 0-100 probability/weight
  assetPlaybook: {
    equities: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    bondsDuration: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    commodities: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    gold: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    cash: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    dollar: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
  };
  macroDescription: string;
  recommendedSectors: string[];
  vulnerableSectors: string[];
}

export interface GlobalInflationDriver {
  category: string;
  component: string;
  weightPct: number;
  currentYoY: number;
  priorYoY: number;
  impactScore: 'HIGH' | 'MEDIUM' | 'LOW';
  commentary: string;
}

export interface GlobalEconomicEvent {
  id: string;
  date: string;
  timeEst: string;
  countryCode: string;
  countryName: string;
  flag: string;
  indicator: string;
  period: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  actual?: string;
  consensus: string;
  previous: string;
  surpriseDeviation?: string;
  status: 'COMPLETED' | 'UPCOMING';
  marketImpactAssessment: string;
  affectedTickers: string[];
}

export interface MacroScenarioShockModel {
  id: string;
  name: string;
  category: 'INFLATION_SURPRISE' | 'COMMODITY_SHOCK' | 'FISCAL_STIMULUS' | 'RECESSION' | 'CENTRAL_BANK_PIVOT';
  description: string;
  triggerEvent: string;
  projectedMarketMoves: {
    sp500Pct: number;
    nasdaq100Pct: number;
    us10YYieldBps: number;
    dollarIndexDxyPct: number;
    crudeOilPct: number;
    goldPct: number;
    vixVolPoints: number;
    highYieldCreditSpreadBps: number;
  };
  centralBankReaction: string;
  optionsStrategyPlaybook: string;
}

// =========================================================================
// 1. MAJOR GLOBAL ECONOMIES MACRO PROFILES
// =========================================================================

export const GLOBAL_MACRO_ECONOMIES: EconomyMacroProfile[] = [
  {
    id: 'US',
    name: 'United States',
    flag: '🇺🇸',
    region: 'NORTH_AMERICA',
    currency: 'USD',
    currencySymbol: '$',
    centralBank: {
      name: 'Federal Reserve',
      abbreviation: 'FED',
      policyRate: 4.75,
      rateUnit: '% (Target Range 4.50% - 4.75%)',
      lastAction: '-50 bps Cut',
      lastActionDate: 'Sep 18, 2026',
      nextMeeting: 'Nov 07, 2026',
      meetingExpectation: '25 bps Cut (88% Implied)',
      cutProbabilityPct: 88,
      hikeProbabilityPct: 0,
      holdProbabilityPct: 12,
      stance: 'DOVISH',
      balanceSheetUsdTrillion: 7.12,
      qtMonthlyPaceUsdBillion: 60,
      guidanceSummary: 'Dual mandate balance achieved. Easing policy towards neutral estimate (~2.875%) to sustain expansion.',
    },
    gdp: {
      realGdpYoY: 2.8,
      realGdpQoQAnn: 3.0,
      trend: 'STEADY',
      nominalGdpTrillionUsd: 28.78,
      gdpPerCapitaUsd: 85250,
      history12M: [2.5, 2.7, 2.9, 3.1, 3.0, 2.8],
    },
    inflation: {
      headlineCpiYoY: 2.4,
      coreCpiYoY: 3.2,
      targetRate: 2.0,
      ppiYoY: 1.8,
      pceCoreYoY: 2.7,
      trend: 'FALLING',
      history12M: [3.7, 3.4, 3.2, 3.1, 2.9, 2.5, 2.4],
    },
    labor: {
      unemploymentRate: 4.1,
      wageGrowthYoY: 3.9,
      nonfarmPayrollsOrJobCreationK: 254,
      laborMarketCondition: 'BALANCED',
    },
    activity: {
      manufacturingPmi: 47.3,
      servicesPmi: 54.9,
      compositePmi: 54.0,
      consumerConfidence: 108.7,
      retailSalesYoY: 2.3,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 122.4,
      budgetDeficitPct: -6.4,
      yield2Y: 3.98,
      yield10Y: 4.02,
      spread2Y10Y: 4,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 1.0,
      fxChange1MYoY: 0.0,
    },
  },
  {
    id: 'EZ',
    name: 'Eurozone (20 Member States)',
    flag: '🇪🇺',
    region: 'EUROPE',
    currency: 'EUR',
    currencySymbol: '€',
    centralBank: {
      name: 'European Central Bank',
      abbreviation: 'ECB',
      policyRate: 3.25,
      rateUnit: '% (Deposit Facility Rate)',
      lastAction: '-25 bps Cut',
      lastActionDate: 'Oct 17, 2026',
      nextMeeting: 'Dec 12, 2026',
      meetingExpectation: '25 bps Cut (94% Implied)',
      cutProbabilityPct: 94,
      hikeProbabilityPct: 0,
      holdProbabilityPct: 6,
      stance: 'DOVISH',
      balanceSheetUsdTrillion: 6.85,
      qtMonthlyPaceUsdBillion: 35,
      guidanceSummary: 'Inflation undershooting target in core members; accelerating easing cycle to revive sluggish industrial output.',
    },
    gdp: {
      realGdpYoY: 0.9,
      realGdpQoQAnn: 0.8,
      trend: 'SLOWING',
      nominalGdpTrillionUsd: 15.65,
      gdpPerCapitaUsd: 43200,
      history12M: [0.4, 0.5, 0.6, 0.8, 0.9, 0.9],
    },
    inflation: {
      headlineCpiYoY: 1.7,
      coreCpiYoY: 2.7,
      targetRate: 2.0,
      ppiYoY: -2.3,
      trend: 'FALLING',
      history12M: [4.3, 3.6, 2.9, 2.6, 2.4, 2.2, 1.7],
    },
    labor: {
      unemploymentRate: 6.4,
      wageGrowthYoY: 4.5,
      nonfarmPayrollsOrJobCreationK: 85,
      laborMarketCondition: 'BALANCED',
    },
    activity: {
      manufacturingPmi: 45.0,
      servicesPmi: 51.4,
      compositePmi: 49.6,
      consumerConfidence: -12.5,
      retailSalesYoY: 0.8,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 88.6,
      budgetDeficitPct: -3.6,
      yield2Y: 2.15,
      yield10Y: 2.22,
      spread2Y10Y: 7,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 1.092,
      fxChange1MYoY: -1.8,
    },
  },
  {
    id: 'CN',
    name: 'China',
    flag: '🇨🇳',
    region: 'ASIA_PACIFIC',
    currency: 'CNY',
    currencySymbol: '¥',
    centralBank: {
      name: "People's Bank of China",
      abbreviation: 'PBOC',
      policyRate: 3.10,
      rateUnit: '% (1-Year Loan Prime Rate)',
      lastAction: '-25 bps Cut & 50 bps RRR',
      lastActionDate: 'Oct 21, 2026',
      nextMeeting: 'Nov 20, 2026',
      meetingExpectation: 'Fiscal Bazooka / Further Easing',
      cutProbabilityPct: 75,
      hikeProbabilityPct: 0,
      holdProbabilityPct: 25,
      stance: 'DOVISH',
      balanceSheetUsdTrillion: 6.25,
      qtMonthlyPaceUsdBillion: -50, // QE stimulus injection
      guidanceSummary: 'Coordinated fiscal & monetary stimulus targeting property stabilization, local government debt swaps, and equity liquidity.',
    },
    gdp: {
      realGdpYoY: 4.8,
      realGdpQoQAnn: 4.5,
      trend: 'SLOWING',
      nominalGdpTrillionUsd: 18.53,
      gdpPerCapitaUsd: 13100,
      history12M: [5.2, 5.3, 5.0, 4.7, 4.6, 4.8],
    },
    inflation: {
      headlineCpiYoY: 0.4,
      coreCpiYoY: 0.1,
      targetRate: 3.0,
      ppiYoY: -2.8,
      trend: 'FALLING',
      history12M: [0.0, 0.7, 0.1, 0.3, 0.2, 0.6, 0.4],
    },
    labor: {
      unemploymentRate: 5.1,
      wageGrowthYoY: 4.8,
      nonfarmPayrollsOrJobCreationK: 410,
      laborMarketCondition: 'SOFTENING',
    },
    activity: {
      manufacturingPmi: 49.8,
      servicesPmi: 50.3,
      compositePmi: 50.4,
      consumerConfidence: 86.2,
      retailSalesYoY: 3.2,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 83.6,
      budgetDeficitPct: -7.2,
      yield2Y: 1.42,
      yield10Y: 2.12,
      spread2Y10Y: 70,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 7.124,
      fxChange1MYoY: -1.2,
    },
  },
  {
    id: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    region: 'ASIA_PACIFIC',
    currency: 'JPY',
    currencySymbol: '¥',
    centralBank: {
      name: 'Bank of Japan',
      abbreviation: 'BOJ',
      policyRate: 0.25,
      rateUnit: '% (Uncollateralized Overnight Call)',
      lastAction: '+15 bps Hike',
      lastActionDate: 'Jul 31, 2026',
      nextMeeting: 'Oct 31, 2026',
      meetingExpectation: 'Hold at 0.25% (Hike in Dec/Jan)',
      cutProbabilityPct: 0,
      hikeProbabilityPct: 24,
      holdProbabilityPct: 76,
      stance: 'HAWKISH',
      balanceSheetUsdTrillion: 4.95,
      qtMonthlyPaceUsdBillion: 20,
      guidanceSummary: 'Exiting decades of NIRP. Sustained virtuous cycle between real wage gains and services inflation justifies gradual rate normalization.',
    },
    gdp: {
      realGdpYoY: 1.2,
      realGdpQoQAnn: 2.9,
      trend: 'ACCELERATING',
      nominalGdpTrillionUsd: 4.21,
      gdpPerCapitaUsd: 34100,
      history12M: [1.8, 1.4, -0.6, 0.5, 1.0, 1.2],
    },
    inflation: {
      headlineCpiYoY: 2.5,
      coreCpiYoY: 2.8,
      targetRate: 2.0,
      ppiYoY: 2.8,
      trend: 'STICKY',
      history12M: [3.2, 2.8, 2.5, 2.8, 2.5, 2.8, 2.5],
    },
    labor: {
      unemploymentRate: 2.5,
      wageGrowthYoY: 5.1,
      nonfarmPayrollsOrJobCreationK: 45,
      laborMarketCondition: 'TIGHT',
    },
    activity: {
      manufacturingPmi: 49.7,
      servicesPmi: 53.7,
      compositePmi: 52.0,
      consumerConfidence: 36.9,
      retailSalesYoY: 2.8,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 261.3,
      budgetDeficitPct: -5.2,
      yield2Y: 0.40,
      yield10Y: 0.95,
      spread2Y10Y: 55,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 149.2,
      fxChange1MYoY: +3.2,
    },
  },
  {
    id: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    region: 'EUROPE',
    currency: 'GBP',
    currencySymbol: '£',
    centralBank: {
      name: 'Bank of England',
      abbreviation: 'BOE',
      policyRate: 5.00,
      rateUnit: '% (Bank Rate)',
      lastAction: '-25 bps Cut',
      lastActionDate: 'Aug 01, 2026',
      nextMeeting: 'Nov 07, 2026',
      meetingExpectation: '25 bps Cut (82% Implied)',
      cutProbabilityPct: 82,
      hikeProbabilityPct: 0,
      holdProbabilityPct: 18,
      stance: 'DOVISH',
      balanceSheetUsdTrillion: 1.15,
      qtMonthlyPaceUsdBillion: 12,
      guidanceSummary: 'Services inflation declining to 4.9%; MPC votes to cautiously ease restrictive stance while managing Autumn budget fiscal impulse.',
    },
    gdp: {
      realGdpYoY: 1.4,
      realGdpQoQAnn: 1.6,
      trend: 'STEADY',
      nominalGdpTrillionUsd: 3.34,
      gdpPerCapitaUsd: 49100,
      history12M: [0.2, 0.4, 0.7, 1.1, 1.3, 1.4],
    },
    inflation: {
      headlineCpiYoY: 1.7,
      coreCpiYoY: 3.2,
      targetRate: 2.0,
      ppiYoY: 0.3,
      trend: 'FALLING',
      history12M: [4.6, 4.0, 3.4, 2.3, 2.0, 2.2, 1.7],
    },
    labor: {
      unemploymentRate: 4.0,
      wageGrowthYoY: 4.9,
      nonfarmPayrollsOrJobCreationK: 48,
      laborMarketCondition: 'BALANCED',
    },
    activity: {
      manufacturingPmi: 51.5,
      servicesPmi: 52.4,
      compositePmi: 52.6,
      consumerConfidence: -21.0,
      retailSalesYoY: 2.5,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 100.2,
      budgetDeficitPct: -4.4,
      yield2Y: 3.92,
      yield10Y: 4.18,
      spread2Y10Y: 26,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 1.305,
      fxChange1MYoY: +2.4,
    },
  },
  {
    id: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    region: 'NORTH_AMERICA',
    currency: 'CAD',
    currencySymbol: '$',
    centralBank: {
      name: 'Bank of Canada',
      abbreviation: 'BOC',
      policyRate: 4.25,
      rateUnit: '% (Overnight Target)',
      lastAction: '-25 bps Cut',
      lastActionDate: 'Sep 04, 2026',
      nextMeeting: 'Oct 23, 2026',
      meetingExpectation: '50 bps Cut (68% Implied)',
      cutProbabilityPct: 98,
      hikeProbabilityPct: 0,
      holdProbabilityPct: 2,
      stance: 'DOVISH',
      balanceSheetUsdTrillion: 0.32,
      qtMonthlyPaceUsdBillion: 4,
      guidanceSummary: 'Inflation returned to 1.6% (below 2% midpoint). Mortgage reset headwinds mandate aggressive front-loaded rate relief.',
    },
    gdp: {
      realGdpYoY: 1.1,
      realGdpQoQAnn: 1.2,
      trend: 'SLOWING',
      nominalGdpTrillionUsd: 2.14,
      gdpPerCapitaUsd: 53400,
      history12M: [1.2, 1.0, 0.8, 1.3, 1.2, 1.1],
    },
    inflation: {
      headlineCpiYoY: 1.6,
      coreCpiYoY: 2.3,
      targetRate: 2.0,
      ppiYoY: 1.2,
      trend: 'FALLING',
      history12M: [3.4, 2.9, 2.7, 2.9, 2.7, 2.0, 1.6],
    },
    labor: {
      unemploymentRate: 6.5,
      wageGrowthYoY: 4.6,
      nonfarmPayrollsOrJobCreationK: 46,
      laborMarketCondition: 'SOFTENING',
    },
    activity: {
      manufacturingPmi: 50.4,
      servicesPmi: 49.8,
      compositePmi: 50.1,
      consumerConfidence: 48.5,
      retailSalesYoY: 0.9,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 104.7,
      budgetDeficitPct: -1.8,
      yield2Y: 3.12,
      yield10Y: 3.22,
      spread2Y10Y: 10,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 1.378,
      fxChange1MYoY: -2.1,
    },
  },
  {
    id: 'IN',
    name: 'India',
    flag: '🇮🇳',
    region: 'EMERGING',
    currency: 'INR',
    currencySymbol: '₹',
    centralBank: {
      name: 'Reserve Bank of India',
      abbreviation: 'RBI',
      policyRate: 6.50,
      rateUnit: '% (Repo Rate)',
      lastAction: 'Stance Shifted to Neutral',
      lastActionDate: 'Oct 09, 2026',
      nextMeeting: 'Dec 06, 2026',
      meetingExpectation: '25 bps Cut (60% Implied)',
      cutProbabilityPct: 60,
      hikeProbabilityPct: 0,
      holdProbabilityPct: 40,
      stance: 'NEUTRAL',
      balanceSheetUsdTrillion: 0.82,
      qtMonthlyPaceUsdBillion: 0,
      guidanceSummary: 'Fastest growing major global economy. Shifting stance from withdrawal of accommodation to neutral as food disinflation begins.',
    },
    gdp: {
      realGdpYoY: 7.2,
      realGdpQoQAnn: 6.7,
      trend: 'ACCELERATING',
      nominalGdpTrillionUsd: 3.94,
      gdpPerCapitaUsd: 2750,
      history12M: [7.8, 8.4, 7.8, 6.7, 7.0, 7.2],
    },
    inflation: {
      headlineCpiYoY: 5.49,
      coreCpiYoY: 3.6,
      targetRate: 4.0,
      ppiYoY: 1.8,
      trend: 'STICKY',
      history12M: [5.6, 5.1, 4.8, 4.7, 3.6, 3.6, 5.49],
    },
    labor: {
      unemploymentRate: 7.8,
      wageGrowthYoY: 8.2,
      nonfarmPayrollsOrJobCreationK: 850,
      laborMarketCondition: 'BALANCED',
    },
    activity: {
      manufacturingPmi: 56.5,
      servicesPmi: 57.7,
      compositePmi: 57.1,
      consumerConfidence: 98.4,
      retailSalesYoY: 8.5,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 81.2,
      budgetDeficitPct: -4.9,
      yield2Y: 6.68,
      yield10Y: 6.78,
      spread2Y10Y: 10,
      curveInversionStatus: 'NORMAL',
      fxRateVsUsd: 84.05,
      fxChange1MYoY: -1.1,
    },
  },
  {
    id: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    region: 'EMERGING',
    currency: 'BRL',
    currencySymbol: 'R$',
    centralBank: {
      name: 'Banco Central do Brasil',
      abbreviation: 'BCB',
      policyRate: 10.75,
      rateUnit: '% (Selic Benchmark)',
      lastAction: '+25 bps Hike',
      lastActionDate: 'Sep 18, 2026',
      nextMeeting: 'Nov 06, 2026',
      meetingExpectation: '50 bps Hike (90% Implied)',
      cutProbabilityPct: 0,
      hikeProbabilityPct: 95,
      holdProbabilityPct: 5,
      stance: 'HAWKISH',
      balanceSheetUsdTrillion: 0.65,
      qtMonthlyPaceUsdBillion: 0,
      guidanceSummary: 'Aggressive tightening cycle reignited due to fiscal deficit slippage, FX depreciation, and de-anchored inflation expectations.',
    },
    gdp: {
      realGdpYoY: 3.3,
      realGdpQoQAnn: 5.6,
      trend: 'ACCELERATING',
      nominalGdpTrillionUsd: 2.18,
      gdpPerCapitaUsd: 10100,
      history12M: [2.1, 2.5, 2.9, 3.1, 3.2, 3.3],
    },
    inflation: {
      headlineCpiYoY: 4.42,
      coreCpiYoY: 3.9,
      targetRate: 3.0,
      ppiYoY: 4.2,
      trend: 'RISING',
      history12M: [3.9, 3.7, 4.0, 4.2, 4.2, 4.4, 4.42],
    },
    labor: {
      unemploymentRate: 6.6,
      wageGrowthYoY: 5.8,
      nonfarmPayrollsOrJobCreationK: 215,
      laborMarketCondition: 'TIGHT',
    },
    activity: {
      manufacturingPmi: 53.2,
      servicesPmi: 54.1,
      compositePmi: 53.8,
      consumerConfidence: 94.0,
      retailSalesYoY: 5.1,
    },
    fiscalAndSovereign: {
      debtToGdpPct: 77.8,
      budgetDeficitPct: -8.1,
      yield2Y: 12.45,
      yield10Y: 12.18,
      spread2Y10Y: -27,
      curveInversionStatus: 'INVERTED',
      fxRateVsUsd: 5.62,
      fxChange1MYoY: -11.5,
    },
  },
];

// =========================================================================
// 2. GLOBAL CENTRAL BANK POLICY TRACKER
// =========================================================================

export const CENTRAL_BANK_TRACKER: CentralBankPolicyTracker[] = [
  {
    id: 'fed',
    bankName: 'Federal Reserve',
    country: 'United States',
    flag: '🇺🇸',
    governor: 'Jerome Powell',
    currentRate: 4.75,
    rateLabel: 'Fed Funds Target Range',
    cycleStage: 'EASING_CYCLE',
    nextMeetingDate: 'Nov 07, 2026',
    cutProbPct: 88,
    holdProbPct: 12,
    hikeProbPct: 0,
    expectedRateEndOf2026: 4.375,
    expectedRateEndOf2027: 3.375,
    neutralRateEst: 2.875,
    balanceSheetAction: '$60B/mo Quantitative Tightening (QT)',
    keyRiskFactor: 'Labor market re-acceleration or sticky shelter CPI',
  },
  {
    id: 'ecb',
    bankName: 'European Central Bank',
    country: 'Eurozone',
    flag: '🇪🇺',
    governor: 'Christine Lagarde',
    currentRate: 3.25,
    rateLabel: 'Deposit Facility Rate',
    cycleStage: 'EASING_CYCLE',
    nextMeetingDate: 'Dec 12, 2026',
    cutProbPct: 94,
    holdProbPct: 6,
    hikeProbPct: 0,
    expectedRateEndOf2026: 3.00,
    expectedRateEndOf2027: 2.00,
    neutralRateEst: 2.00,
    balanceSheetAction: 'APP run-off + PEPP roll-off ($35B/mo)',
    keyRiskFactor: 'Severe German industrial contraction & energy volatility',
  },
  {
    id: 'boe',
    bankName: 'Bank of England',
    country: 'United Kingdom',
    flag: '🇬🇧',
    governor: 'Andrew Bailey',
    currentRate: 5.00,
    rateLabel: 'Official Bank Rate',
    cycleStage: 'EASING_CYCLE',
    nextMeetingDate: 'Nov 07, 2026',
    cutProbPct: 82,
    holdProbPct: 18,
    hikeProbPct: 0,
    expectedRateEndOf2026: 4.75,
    expectedRateEndOf2027: 3.75,
    neutralRateEst: 3.25,
    balanceSheetAction: '£100B/yr Active Gilt Sales (QT)',
    keyRiskFactor: 'Sticky UK services inflation & public sector wage settlements',
  },
  {
    id: 'boj',
    bankName: 'Bank of Japan',
    country: 'Japan',
    flag: '🇯🇵',
    governor: 'Kazuo Ueda',
    currentRate: 0.25,
    rateLabel: 'Uncollateralized Call Rate',
    cycleStage: 'NORMALIZATION',
    nextMeetingDate: 'Oct 31, 2026',
    cutProbPct: 0,
    holdProbPct: 76,
    hikeProbPct: 24,
    expectedRateEndOf2026: 0.50,
    expectedRateEndOf2027: 1.00,
    neutralRateEst: 1.00,
    balanceSheetAction: 'Tapering JGB purchases to ¥3T/mo',
    keyRiskFactor: 'Yen carry trade unwinds & global financial stability',
  },
  {
    id: 'boc',
    bankName: 'Bank of Canada',
    country: 'Canada',
    flag: '🇨🇦',
    governor: 'Tiff Macklem',
    currentRate: 4.25,
    rateLabel: 'Overnight Target Rate',
    cycleStage: 'EASING_CYCLE',
    nextMeetingDate: 'Oct 23, 2026',
    cutProbPct: 98,
    holdProbPct: 2,
    hikeProbPct: 0,
    expectedRateEndOf2026: 3.75,
    expectedRateEndOf2027: 2.75,
    neutralRateEst: 2.75,
    balanceSheetAction: 'Passive balance sheet run-off',
    keyRiskFactor: 'Household debt rollover cliff & per-capita GDP decline',
  },
  {
    id: 'pboc',
    bankName: "People's Bank of China",
    country: 'China',
    flag: '🇨🇳',
    governor: 'Pan Gongsheng',
    currentRate: 3.10,
    rateLabel: '1-Year Loan Prime Rate (LPR)',
    cycleStage: 'EASING_CYCLE',
    nextMeetingDate: 'Nov 20, 2026',
    cutProbPct: 75,
    holdProbPct: 25,
    hikeProbPct: 0,
    expectedRateEndOf2026: 2.85,
    expectedRateEndOf2027: 2.50,
    neutralRateEst: 2.50,
    balanceSheetAction: 'Injecting ¥1T liquidity & Treasury trading facility',
    keyRiskFactor: 'Balance sheet deflation, property insolvency, trade tariffs',
  },
  {
    id: 'rba',
    bankName: 'Reserve Bank of Australia',
    country: 'Australia',
    flag: '🇦🇺',
    governor: 'Michele Bullock',
    currentRate: 4.35,
    rateLabel: 'Cash Rate Target',
    cycleStage: 'PAUSE_RESTRICTIVE',
    nextMeetingDate: 'Nov 05, 2026',
    cutProbPct: 15,
    holdProbPct: 85,
    hikeProbPct: 0,
    expectedRateEndOf2026: 4.35,
    expectedRateEndOf2027: 3.60,
    neutralRateEst: 3.50,
    balanceSheetAction: 'Maturing bond reinvestment cessation',
    keyRiskFactor: 'Services inflation persistence & commodities demand from China',
  },
  {
    id: 'snb',
    bankName: 'Swiss National Bank',
    country: 'Switzerland',
    flag: '🇨🇭',
    governor: 'Martin Schlegel',
    currentRate: 1.00,
    rateLabel: 'SNB Policy Rate',
    cycleStage: 'EASING_CYCLE',
    nextMeetingDate: 'Dec 12, 2026',
    cutProbPct: 80,
    holdProbPct: 20,
    hikeProbPct: 0,
    expectedRateEndOf2026: 0.75,
    expectedRateEndOf2027: 0.50,
    neutralRateEst: 0.75,
    balanceSheetAction: 'Foreign exchange intervention sales/purchases',
    keyRiskFactor: 'Franc safe-haven overvaluation harming Swiss exporters',
  },
];

// =========================================================================
// 3. GLOBAL MACRO REGIME & ASSET ALLOCATION QUADRANTS
// =========================================================================

export const MACRO_REGIME_QUADRANTS: MacroRegimeQuadrant[] = [
  {
    quadrantId: 'DISINFLATION',
    quadrantName: 'Quadrant 4: Disinflation / Soft Landing Easing',
    growthStatus: 'DECELERATING',
    inflationStatus: 'FALLING',
    isCurrent: true,
    score: 64, // Dominant regime currently
    assetPlaybook: {
      equities: 'OVERWEIGHT',
      bondsDuration: 'OVERWEIGHT',
      commodities: 'NEUTRAL',
      gold: 'OVERWEIGHT',
      cash: 'UNDERWEIGHT',
      dollar: 'UNDERWEIGHT',
    },
    macroDescription:
      'Growth moderates to trend (~2.2%) while headline and core inflation steadily cool towards 2.0%. Real rates remain restrictive, prompting synchronous global central bank rate cutting. Classic environment for duration expansion, quality tech, and gold outperformance.',
    recommendedSectors: ['Technology / Semiconductors', 'Utilities & High Dividend', 'Investment Grade Bonds', 'Gold & Precious Metals'],
    vulnerableSectors: ['Commodity Chemicals', 'Cyclical Materials', 'High-Beta Regional Banks'],
  },
  {
    quadrantId: 'GOLDILOCKS',
    quadrantName: 'Quadrant 1: Goldilocks Expansion',
    growthStatus: 'ACCELERATING',
    inflationStatus: 'FALLING',
    isCurrent: false,
    score: 22,
    assetPlaybook: {
      equities: 'OVERWEIGHT',
      bondsDuration: 'NEUTRAL',
      commodities: 'NEUTRAL',
      gold: 'NEUTRAL',
      cash: 'UNDERWEIGHT',
      dollar: 'NEUTRAL',
    },
    macroDescription:
      'Productivity boom driven by AI capital expenditure, easing financial conditions, and resilient consumer balance sheets. Equities multiple expansion and spread compression.',
    recommendedSectors: ['Mega-Cap Tech', 'Consumer Discretionary', 'Industrials', 'High Yield Credit'],
    vulnerableSectors: ['Utilities', 'Defensive Healthcare'],
  },
  {
    quadrantId: 'REFLATION',
    quadrantName: 'Quadrant 2: Reflationary Re-acceleration',
    growthStatus: 'ACCELERATING',
    inflationStatus: 'RISING',
    isCurrent: false,
    score: 9,
    assetPlaybook: {
      equities: 'OVERWEIGHT',
      bondsDuration: 'UNDERWEIGHT',
      commodities: 'OVERWEIGHT',
      gold: 'OVERWEIGHT',
      cash: 'UNDERWEIGHT',
      dollar: 'OVERWEIGHT',
    },
    macroDescription:
      'Fiscal stimulus, Chinese infrastructure re-acceleration, or labor market tightness drives headline inflation back above 3.5%. Yield curves bear steepen.',
    recommendedSectors: ['Energy / E&P', 'Base Metals / Mining', 'Commercial Banks', 'Value / Small Caps'],
    vulnerableSectors: ['Long Duration Sovereign Debt', 'REITs / Real Estate', 'Unprofitable Tech'],
  },
  {
    quadrantId: 'STAGFLATION',
    quadrantName: 'Quadrant 3: Stagflation Shock',
    growthStatus: 'DECELERATING',
    inflationStatus: 'RISING',
    isCurrent: false,
    score: 5,
    assetPlaybook: {
      equities: 'UNDERWEIGHT',
      bondsDuration: 'UNDERWEIGHT',
      commodities: 'OVERWEIGHT',
      gold: 'OVERWEIGHT',
      cash: 'OVERWEIGHT',
      dollar: 'OVERWEIGHT',
    },
    macroDescription:
      'Supply-side commodity shocks (e.g., Hormuz closure) or sweeping tariff trade wars combined with stalling output. The most adverse environment for balanced 60/40 portfolios.',
    recommendedSectors: ['Upstream Oil & Gas', 'Agriculture', 'Short Duration T-Bills', 'Equity Puts / Tail Hedges'],
    vulnerableSectors: ['Broad Consumer Equities', 'Long Treasuries', 'Airlines', 'Automakers'],
  },
];

// =========================================================================
// 4. GLOBAL INFLATION BREAKDOWN & COMMODITY PASS-THROUGH
// =========================================================================

export const GLOBAL_INFLATION_COMPONENTS: GlobalInflationDriver[] = [
  {
    category: 'SHELTER & HOUSING',
    component: "Owners' Equivalent Rent (OER)",
    weightPct: 36.2,
    currentYoY: 5.2,
    priorYoY: 5.4,
    impactScore: 'HIGH',
    commentary: 'Lagged BLS calculation slowly reflecting private market rent normalization (Zillow index +2.1%). Largest single driver of core stickiness.',
  },
  {
    category: 'ENERGY',
    component: 'Gasoline & Crude Oil',
    weightPct: 6.8,
    currentYoY: -15.3,
    priorYoY: -10.3,
    impactScore: 'HIGH',
    commentary: 'Brent trading ~$74/bbl provides powerful headline disinflation tailwind, shaving ~0.6% off headline CPI YoY.',
  },
  {
    category: 'CORE SERVICES',
    component: 'Motor Vehicle Insurance & Medical',
    weightPct: 18.5,
    currentYoY: 16.3,
    priorYoY: 18.6,
    impactScore: 'MEDIUM',
    commentary: 'Auto insurance (+16.3% YoY) has been the largest non-housing outlier due to severe repair costs and litigation, now plateauing.',
  },
  {
    category: 'CORE GOODS',
    component: 'Used Cars & Consumer Electronics',
    weightPct: 18.9,
    currentYoY: -1.0,
    priorYoY: -1.5,
    impactScore: 'LOW',
    commentary: 'Supply chain friction entirely healed; continuous goods deflation offsetting service stickiness.',
  },
  {
    category: 'FOOD',
    component: 'Food at Home (Groceries)',
    weightPct: 8.4,
    currentYoY: 0.9,
    priorYoY: 1.1,
    impactScore: 'MEDIUM',
    commentary: 'Agricultural commodity benchmarks normalized; grocery inflation running below target 2.0%.',
  },
  {
    category: 'INFLATION EXPECTATIONS',
    component: 'US 5Y/5Y Forward Breakeven Inflation Rate',
    weightPct: 0.0,
    currentYoY: 2.28,
    priorYoY: 2.35,
    impactScore: 'HIGH',
    commentary: 'Market-based 5Y forward inflation pricing firmly anchored inside the Fed 2.0% - 2.5% comfort band.',
  },
];

// =========================================================================
// 5. GLOBAL ECONOMIC CALENDAR (HIGH-IMPACT CATALYSTS)
// =========================================================================

export const GLOBAL_ECONOMIC_CALENDAR: GlobalEconomicEvent[] = [
  {
    id: 'cal-fomc-nov',
    date: '2026-11-07',
    timeEst: '14:00',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    indicator: 'FOMC Interest Rate Decision & Press Conference',
    period: 'Nov 2026',
    importance: 'CRITICAL',
    consensus: '4.50% (-25 bps)',
    previous: '4.75%',
    status: 'UPCOMING',
    marketImpactAssessment: 'High probability 25 bps rate cut. Powell guidance on post-election fiscal impact will dictate rates trajectory.',
    affectedTickers: ['SPY', 'QQQ', 'TLT', 'IWM', 'DXY'],
  },
  {
    id: 'cal-us-cpi-oct',
    date: '2026-11-13',
    timeEst: '08:30',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    indicator: 'US Consumer Price Index (CPI) YoY',
    period: 'Oct 2026',
    importance: 'CRITICAL',
    consensus: '2.3% YoY (Core 3.1%)',
    previous: '2.4% YoY (Core 3.2%)',
    status: 'UPCOMING',
    marketImpactAssessment: 'Key test of disinflation persistence. A sub-3.1% Core print cements further December Fed easing.',
    affectedTickers: ['SPY', 'TLT', 'GLD', 'VIX'],
  },
  {
    id: 'cal-us-nfp-oct',
    date: '2026-11-01',
    timeEst: '08:30',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    indicator: 'US Nonfarm Payrolls & Unemployment Rate',
    period: 'Oct 2026',
    importance: 'CRITICAL',
    consensus: '+140k (Unemp 4.1%)',
    previous: '+254k (Unemp 4.1%)',
    status: 'UPCOMING',
    marketImpactAssessment: 'Distorted by recent hurricanes and aerospace strikes. Any print below 100k triggers recession worries.',
    affectedTickers: ['SPY', 'IWM', 'USO', 'TLT'],
  },
  {
    id: 'cal-ecb-rate-dec',
    date: '2026-12-12',
    timeEst: '08:15',
    countryCode: 'EZ',
    countryName: 'Eurozone',
    flag: '🇪🇺',
    indicator: 'ECB Deposit Facility Rate Decision',
    period: 'Dec 2026',
    importance: 'HIGH',
    consensus: '3.00% (-25 bps)',
    previous: '3.25%',
    status: 'UPCOMING',
    marketImpactAssessment: 'Lagarde expected to deliver 4th rate cut of 2026 as headline inflation drops below 2%.',
    affectedTickers: ['EUR/USD', 'VGK', 'BNDX'],
  },
  {
    id: 'cal-boj-rate-oct',
    date: '2026-10-31',
    timeEst: '02:00',
    countryCode: 'JP',
    countryName: 'Japan',
    flag: '🇯🇵',
    indicator: 'Bank of Japan Policy Rate & Outlook Report',
    period: 'Oct 2026',
    importance: 'CRITICAL',
    consensus: '0.25% (Hold)',
    previous: '0.25%',
    status: 'UPCOMING',
    marketImpactAssessment: 'Watching Ueda remarks regarding Yen volatility and timeline for hiking to 0.50% in December.',
    affectedTickers: ['USD/JPY', 'EWJ', 'DXJ'],
  },
  {
    id: 'cal-cn-gdp-q3',
    date: '2026-10-18',
    timeEst: '22:00',
    countryCode: 'CN',
    countryName: 'China',
    flag: '🇨🇳',
    indicator: 'China GDP YoY & Industrial Production',
    period: 'Q3 2026',
    importance: 'HIGH',
    actual: '4.6% YoY',
    consensus: '4.5% YoY',
    previous: '4.7% YoY',
    surpriseDeviation: '+0.1%',
    status: 'COMPLETED',
    marketImpactAssessment: 'Slight beat vs low consensus, reinforcing urgency of announced fiscal bond packages.',
    affectedTickers: ['FXI', 'KWEB', 'COPPER', 'BRENT'],
  },
  {
    id: 'cal-boc-rate-oct',
    date: '2026-10-23',
    timeEst: '09:45',
    countryCode: 'CA',
    countryName: 'Canada',
    flag: '🇨🇦',
    indicator: 'Bank of Canada Rate Decision',
    period: 'Oct 2026',
    importance: 'HIGH',
    consensus: '3.75% (-50 bps jumbo cut)',
    previous: '4.25%',
    status: 'UPCOMING',
    marketImpactAssessment: 'Markets pricing 50 bps reduction as Canadian CPI collapsed to 1.6%.',
    affectedTickers: ['USD/CAD', 'EWC'],
  },
  {
    id: 'cal-us-retail-sales',
    date: '2026-10-17',
    timeEst: '08:30',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    indicator: 'US Advance Retail Sales MoM',
    period: 'Sep 2026',
    importance: 'HIGH',
    actual: '+0.4% MoM',
    consensus: '+0.3% MoM',
    previous: '+0.1% MoM',
    surpriseDeviation: '+0.1%',
    status: 'COMPLETED',
    marketImpactAssessment: 'Resilient US consumer spending defying slowdown fears; pushed 10Y yields up 8 bps.',
    affectedTickers: ['XLY', 'XRT', 'SPY'],
  },
];

// =========================================================================
// 6. MACRO SCENARIO STRESS SHOCKS
// =========================================================================

export const MACRO_SCENARIO_SHOCKS: MacroScenarioShockModel[] = [
  {
    id: 'cpi-reacceleration',
    name: 'Hot CPI & Shelter Inflation Re-acceleration',
    category: 'INFLATION_SURPRISE',
    description: 'Core CPI prints +0.45% MoM due to sticky insurance and housing rebound. Fed pauses easing and signals rates higher for longer.',
    triggerEvent: 'US Core CPI prints 3.6% YoY (vs 3.1% consensus)',
    projectedMarketMoves: {
      sp500Pct: -2.8,
      nasdaq100Pct: -3.6,
      us10YYieldBps: +26,
      dollarIndexDxyPct: +1.2,
      crudeOilPct: +1.5,
      goldPct: -2.4,
      vixVolPoints: +5.8,
      highYieldCreditSpreadBps: +45,
    },
    centralBankReaction: 'Fed halts rate cuts; dot plot removes planned 2027 easing.',
    optionsStrategyPlaybook: 'Long OTM SPY Puts, Bear Put Spreads, Short High-Beta Tech Call Spreads.',
  },
  {
    id: 'oil-supply-shock',
    name: 'Middle East Geopolitical Oil Spike ($95/bbl)',
    category: 'COMMODITY_SHOCK',
    description: 'Strait of Hormuz disruptions or infrastructure strikes take 2.5M bpd offline, driving Brent crude from $74 to $95.',
    triggerEvent: 'Brent Crude spikes +28% in 5 trading days',
    projectedMarketMoves: {
      sp500Pct: -4.1,
      nasdaq100Pct: -4.8,
      us10YYieldBps: +32,
      dollarIndexDxyPct: +2.1,
      crudeOilPct: +28.4,
      goldPct: +4.6,
      vixVolPoints: +8.5,
      highYieldCreditSpreadBps: +80,
    },
    centralBankReaction: 'Stagflationary dilemma: central banks forced into pause despite softening consumer demand.',
    optionsStrategyPlaybook: 'Long XLE / USO Call Backspreads, Put Spread Collars on Airlines (JETS) & Consumer Discretionary (XLY).',
  },
  {
    id: 'china-fiscal-bazooka',
    name: 'China $500B Fiscal & Real Estate Stimulus Bazooka',
    category: 'FISCAL_STIMULUS',
    description: 'Beijing issues ¥4T sovereign debt dedicated to municipal debt restructuring, direct household vouchers, and property completions.',
    triggerEvent: 'State Council approves 4% of GDP emergency stimulus package',
    projectedMarketMoves: {
      sp500Pct: +1.8,
      nasdaq100Pct: +2.4,
      us10YYieldBps: +12,
      dollarIndexDxyPct: -1.4,
      crudeOilPct: +6.2,
      goldPct: +2.1,
      vixVolPoints: -3.2,
      highYieldCreditSpreadBps: -35,
    },
    centralBankReaction: 'PBOC expands balance sheet; Fed and ECB face modest export demand reflation.',
    optionsStrategyPlaybook: 'Bull Call Spreads on Copper (CPER), China Tech (KWEB / FXI), and European Industrials (DAX).',
  },
  {
    id: 'us-hard-landing-recession',
    name: 'US Hard Landing & Rapid Labor Deterioration',
    category: 'RECESSION',
    description: 'Unemployment breaches 4.8% as corporate layoffs accelerate; consumer confidence crashes below 80.',
    triggerEvent: 'Two consecutive negative NFP prints (-50k) and retail sales plunge',
    projectedMarketMoves: {
      sp500Pct: -14.5,
      nasdaq100Pct: -16.2,
      us10YYieldBps: -95,
      dollarIndexDxyPct: -0.8,
      crudeOilPct: -22.0,
      goldPct: +7.8,
      vixVolPoints: +18.0,
      highYieldCreditSpreadBps: +210,
    },
    centralBankReaction: 'Emergency 75 bps Fed rate cuts; QE revived if liquidity seize occurs.',
    optionsStrategyPlaybook: 'Long TLT OTM Calls, VIX Call Spreads, Deep OTM Put Wings on SPY/IWM.',
  },
];
