export interface TariffRegime {
  id: string;
  name: string;
  shortCode: string;
  originCountry: string;
  originFlag: string;
  targetCountryOrBloc: string;
  targetFlag: string;
  status: 'ACTIVE' | 'PROPOSED' | 'UNDER_REVIEW' | 'RETALIATION_ACTIVE';
  effectiveDate: string;
  reviewDate: string;
  baseRatePct: number;
  peakRatePct: number;
  scopeValueUsdBn: number; // e.g. $550B
  sectorsAffected: string[];
  primaryHtsCodes: string[];
  macroInflationImpactBps: number; // e.g. +38 bps
  primaryVulnerableTickers: string[];
  optionsIvImpactPts: number; // e.g. +6.8 vol pts
  skewDistortion: string;
  policySummary: string;
  optionsMarketPricing: string;
  institutionalHedgingPlay: string;
}

export interface TickerTariffVulnerability {
  symbol: string;
  name: string;
  sector: string;
  foreignSupplyChainPct: number;
  foreignRevenuePct: number;
  tariffBeta: number; // 0.0 to 2.5
  vulnerabilityTier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  estimatedEpsDragPct: number; // e.g. -7.4%
  impliedVolSpikePotentialPts: number; // e.g. +9.2 pts
  primaryExposedRegimes: string[];
  recommendedPlay: string;
  optionsPutSkewBps: number; // OTM Put IV minus OTM Call IV
}

export interface TariffMilestone {
  id: string;
  date: string;
  daysRemaining: number;
  title: string;
  type: 'DEADLINE' | 'HEARING' | 'IMPLEMENTATION' | 'RETALIATION';
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  tickersImpacted: string[];
}

export const TARIFF_REGIMES_DATA: TariffRegime[] = [
  {
    id: 'us-universal-baseline',
    name: 'Universal 10%–20% Baseline Import Tariff',
    shortCode: 'US-BASE-10',
    originCountry: 'United States',
    originFlag: '🇺🇸',
    targetCountryOrBloc: 'All Global Trading Partners',
    targetFlag: '🌐',
    status: 'PROPOSED',
    effectiveDate: 'Q1 2027 (Projected)',
    reviewDate: 'Nov 15, 2026',
    baseRatePct: 10.0,
    peakRatePct: 20.0,
    scopeValueUsdBn: 3100,
    sectorsAffected: ['Consumer Goods', 'Retail', 'Automotive', 'Apparel', 'Industrial Machinery'],
    primaryHtsCodes: ['HTS 84 (Machinery)', 'HTS 85 (Electronics)', 'HTS 87 (Vehicles)', 'HTS 61-62 (Apparel)'],
    macroInflationImpactBps: 72,
    primaryVulnerableTickers: ['WMT', 'TGT', 'AMZN', 'AAPL', 'SPY', 'CAT'],
    optionsIvImpactPts: 5.4,
    skewDistortion: 'Downside Put Skew steepens across SPY & XLY (+3.8% Put/Call spread)',
    policySummary: 'Proposed universal statutory tariff on all incoming merchandise imports to encourage domestic onshore manufacturing substitution.',
    optionsMarketPricing: 'Market pricing implies a 45% probability of enactment. Front-month straddles on consumer discretionary trade at 1.25x 1-year realized vol.',
    institutionalHedgingPlay: 'Bear Put Spreads on consumer retail proxies or Long VIX Call Spreads to capture broad stagflationary volatility expansion.',
  },
  {
    id: 'us-china-tech-301',
    name: 'Section 301 Strategic Tech & Clean Energy Duties',
    shortCode: 'US-CHN-301',
    originCountry: 'United States',
    originFlag: '🇺🇸',
    targetCountryOrBloc: 'China',
    targetFlag: '🇨🇳',
    status: 'ACTIVE',
    effectiveDate: 'Sep 27, 2024 (Active & Expanding)',
    reviewDate: 'Dec 01, 2026',
    baseRatePct: 25.0,
    peakRatePct: 100.0,
    scopeValueUsdBn: 420,
    sectorsAffected: ['Electric Vehicles (100%)', 'Semiconductors (50%)', 'Lithium Batteries (25%)', 'Solar Cells (50%)', 'Critical Minerals'],
    primaryHtsCodes: ['HTS 8703 (EVs)', 'HTS 8541 (Semiconductors)', 'HTS 8507 (Batteries)', 'HTS 8541.40 (Solar)'],
    macroInflationImpactBps: 45,
    primaryVulnerableTickers: ['TSLA', 'NVDA', 'AMD', 'AAPL', 'FXI'],
    optionsIvImpactPts: 11.2,
    skewDistortion: 'Severe Put Skew on tech hardware; 20-Delta puts trade at 1.48x corresponding calls',
    policySummary: 'Targeted high-surcharge tariffs combating state-subsidized overcapacity in green tech, semiconductors, and strategic maritime equipment.',
    optionsMarketPricing: 'High persistent volatility premium embedded in semiconductor ETF (SMH) and mega-tech hardware manufacturers.',
    institutionalHedgingPlay: 'Collars on semiconductor longs (sell 10% OTM covered call to finance 8% OTM protective put) or Reverse Risk Reversals.',
  },
  {
    id: 'eu-china-bev-duties',
    name: 'EU Countervailing Duties on Chinese EVs',
    shortCode: 'EU-CHN-EV',
    originCountry: 'European Union',
    originFlag: '🇪🇺',
    targetCountryOrBloc: 'China',
    targetFlag: '🇨🇳',
    status: 'ACTIVE',
    effectiveDate: 'Nov 01, 2024 (5-Year Mandate)',
    reviewDate: 'Oct 15, 2026',
    baseRatePct: 17.0,
    peakRatePct: 45.3,
    scopeValueUsdBn: 115,
    sectorsAffected: ['Battery Electric Vehicles', 'Auto Parts', 'European Luxury Goods & Brandy (Retaliation)', 'Pork Exporters'],
    primaryHtsCodes: ['HTS 8703.80 (Electric Autos)', 'HTS 2208.20 (Spirits/Brandy)', 'HTS 0203 (Pork)'],
    macroInflationImpactBps: 22,
    primaryVulnerableTickers: ['TSLA', 'BP', 'EWG', 'VGK'],
    optionsIvImpactPts: 6.8,
    skewDistortion: 'Elevated Euro STOXX 50 auto sub-index implied vol (+4.2 pts over benchmark)',
    policySummary: 'Defensive countervailing duties following EU anti-subsidy probe into Chinese state-backed EV battery supply chains.',
    optionsMarketPricing: 'Pricing in bilateral retaliatory probes against German luxury car makers and French agricultural exports.',
    institutionalHedgingPlay: 'Short Strangles on resilient domestic European utilities while buying protective put spreads on German auto OEMs.',
  },
  {
    id: 'us-semiconductor-export-controls',
    name: 'Advanced AI Compute & Lithography Sanctions',
    shortCode: 'US-SEMI-EXP',
    originCountry: 'United States',
    originFlag: '🇺🇸',
    targetCountryOrBloc: 'China & Tier-3 Intermediaries',
    targetFlag: '🇨🇳',
    status: 'ACTIVE',
    effectiveDate: 'Oct 17, 2023 (Annual Tightening)',
    reviewDate: 'Nov 05, 2026',
    baseRatePct: 20.0,
    peakRatePct: 25.0,
    scopeValueUsdBn: 95,
    sectorsAffected: ['AI Accelerators', 'EUV Lithography', 'EDA Software', 'Advanced Wafer Packaging'],
    primaryHtsCodes: ['HTS 8486 (Semiconductor Mfg Equipment)', 'HTS 8542.31 (Processors)'],
    macroInflationImpactBps: 18,
    primaryVulnerableTickers: ['NVDA', 'AMD', 'AAPL', 'MSFT'],
    optionsIvImpactPts: 8.9,
    skewDistortion: 'Heavy downside tail-risk hedging; NVDA OTM put open interest exceeds calls by 1.35x',
    policySummary: 'Bureau of Industry and Security (BIS) export licensing prohibitions on high-density GPUs (e.g. H20, B200) and semiconductor manufacturing equipment.',
    optionsMarketPricing: 'Options price elevated binary gap risk on unexpected BIS regulatory announcement dates.',
    institutionalHedgingPlay: 'Long Vega Calendar Spreads (long back-month, short front-month) to monetize regulatory announcement volatility spikes.',
  },
  {
    id: 'usmca-mexico-origin-steel',
    name: 'USMCA Rules of Origin & Steel Anti-Transshipment',
    shortCode: 'USMCA-MEX',
    originCountry: 'United States & Canada',
    originFlag: '🇺🇸',
    targetCountryOrBloc: 'Mexico & Asian Transshipment',
    targetFlag: '🇲🇽',
    status: 'UNDER_REVIEW',
    effectiveDate: 'Joint Review 2026',
    reviewDate: 'Oct 28, 2026',
    baseRatePct: 25.0,
    peakRatePct: 25.0,
    scopeValueUsdBn: 180,
    sectorsAffected: ['Automotive Assemblies', 'Steel & Aluminum', 'Electrical Wiring', 'Nearshoring Industrial Parks'],
    primaryHtsCodes: ['HTS 72-73 (Iron & Steel)', 'HTS 76 (Aluminum)', 'HTS 8708 (Auto Parts)'],
    macroInflationImpactBps: 28,
    primaryVulnerableTickers: ['GM', 'F', 'CAT', 'TSLA', 'EWW'],
    optionsIvImpactPts: 7.4,
    skewDistortion: 'Mexican ETF (EWW) and domestic US automakers trade with a +4.0% put skew premium',
    policySummary: 'Clamping down on Chinese steel, aluminum, and electronics re-exported through Mexico without substantial 75% local value-add transformation.',
    optionsMarketPricing: 'Automaker options imply margin compression of up to 140 bps if Mexican cross-border tariffs are activated.',
    institutionalHedgingPlay: 'Long US Steel & domestic resource call options while buying out-of-the-money put protection on multinational industrial assemblers.',
  },
  {
    id: 'retaliatory-agri-energy',
    name: 'Counter-Retaliatory Agricultural & Energy Surcharges',
    shortCode: 'RETAL-AG-NRG',
    originCountry: 'Trading Counterparties (China, EU, BRICS)',
    originFlag: '🇨🇳',
    targetCountryOrBloc: 'United States',
    targetFlag: '🇺🇸',
    status: 'RETALIATION_ACTIVE',
    effectiveDate: 'Periodic Triggers',
    reviewDate: 'Dec 15, 2026',
    baseRatePct: 15.0,
    peakRatePct: 30.0,
    scopeValueUsdBn: 140,
    sectorsAffected: ['Soybeans & Grain', 'Pork & Poultry', 'Liquefied Natural Gas (LNG)', 'Plastics & Petrochemicals'],
    primaryHtsCodes: ['HTS 1201 (Soybeans)', 'HTS 2711 (LNG)', 'HTS 3901 (Polymers)'],
    macroInflationImpactBps: 20,
    primaryVulnerableTickers: ['/CL', '/NG', 'BP', 'XOM'],
    optionsIvImpactPts: 6.2,
    skewDistortion: 'Commodity futures skew flips rapidly between call skew (export embargo) and put skew (demand slump)',
    policySummary: 'Tit-for-tat retaliatory duties historically levied on US swing states produce (Midwest agriculture and Gulf Coast energy derivatives).',
    optionsMarketPricing: 'Crude and agricultural commodity options discount periodic supply-chain diversions and storage gluts.',
    institutionalHedgingPlay: 'Crude Oil (/CL) Put Spread Risk Reversals to hedge downside demand destruction while selling elevated OTM call skew.',
  },
];

export const TICKER_TARIFF_VULNERABILITY_DATA: TickerTariffVulnerability[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Electronics & Hardware',
    foreignSupplyChainPct: 78,
    foreignRevenuePct: 56,
    tariffBeta: 1.85,
    vulnerabilityTier: 'CRITICAL',
    estimatedEpsDragPct: -8.6,
    impliedVolSpikePotentialPts: +10.4,
    primaryExposedRegimes: ['us-universal-baseline', 'us-china-tech-301'],
    recommendedPlay: 'Collar Strategy (Sell $245 Call / Buy $215 Put)',
    optionsPutSkewBps: 420,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Semiconductors & AI Accelerators',
    foreignSupplyChainPct: 84,
    foreignRevenuePct: 62,
    tariffBeta: 1.95,
    vulnerabilityTier: 'CRITICAL',
    estimatedEpsDragPct: -9.8,
    impliedVolSpikePotentialPts: +14.6,
    primaryExposedRegimes: ['us-semiconductor-export-controls', 'us-china-tech-301'],
    recommendedPlay: 'Bear Put Spread (Buy $115 Put / Sell $100 Put)',
    optionsPutSkewBps: 580,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Electric Vehicles & Clean Energy',
    foreignSupplyChainPct: 64,
    foreignRevenuePct: 49,
    tariffBeta: 1.70,
    vulnerabilityTier: 'HIGH',
    estimatedEpsDragPct: -7.2,
    impliedVolSpikePotentialPts: +12.0,
    primaryExposedRegimes: ['eu-china-bev-duties', 'us-china-tech-301', 'usmca-mexico-origin-steel'],
    recommendedPlay: 'Long Straddle into Regulatory Tariff Review Deadline',
    optionsPutSkewBps: 340,
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    sector: 'Semiconductors & High-Performance Compute',
    foreignSupplyChainPct: 82,
    foreignRevenuePct: 58,
    tariffBeta: 1.65,
    vulnerabilityTier: 'HIGH',
    estimatedEpsDragPct: -7.0,
    impliedVolSpikePotentialPts: +11.2,
    primaryExposedRegimes: ['us-semiconductor-export-controls', 'us-china-tech-301'],
    recommendedPlay: 'Ratio Put Spread (Buy 1 ATM Put, Sell 2 OTM Puts)',
    optionsPutSkewBps: 460,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'E-Commerce Marketplace & Cloud',
    foreignSupplyChainPct: 55,
    foreignRevenuePct: 38,
    tariffBeta: 1.25,
    vulnerabilityTier: 'HIGH',
    estimatedEpsDragPct: -4.8,
    impliedVolSpikePotentialPts: +7.5,
    primaryExposedRegimes: ['us-universal-baseline'],
    recommendedPlay: 'Iron Condor with wide wing boundaries outside ±2σ',
    optionsPutSkewBps: 260,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'Broad US Equities Benchmark',
    foreignSupplyChainPct: 42,
    foreignRevenuePct: 41,
    tariffBeta: 1.00,
    vulnerabilityTier: 'MODERATE',
    estimatedEpsDragPct: -3.8,
    impliedVolSpikePotentialPts: +5.4,
    primaryExposedRegimes: ['us-universal-baseline', 'us-china-tech-301'],
    recommendedPlay: 'Long VIX Call Backspread or SPY Protective Collar',
    optionsPutSkewBps: 310,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    sector: 'Technology & Growth Benchmark',
    foreignSupplyChainPct: 62,
    foreignRevenuePct: 48,
    tariffBeta: 1.35,
    vulnerabilityTier: 'HIGH',
    estimatedEpsDragPct: -5.6,
    impliedVolSpikePotentialPts: +8.2,
    primaryExposedRegimes: ['us-china-tech-301', 'us-semiconductor-export-controls'],
    recommendedPlay: 'Put Calendar Spread targeting 45-day tariff review horizon',
    optionsPutSkewBps: 390,
  },
  {
    symbol: '/CL',
    name: 'WTI Crude Oil Futures',
    sector: 'Energy & Petrochemical Feedstocks',
    foreignSupplyChainPct: 50,
    foreignRevenuePct: 70,
    tariffBeta: 1.40,
    vulnerabilityTier: 'HIGH',
    estimatedEpsDragPct: -6.4,
    impliedVolSpikePotentialPts: +9.8,
    primaryExposedRegimes: ['retaliatory-agri-energy', 'us-universal-baseline'],
    recommendedPlay: 'Crude Strangles to monetize wide binary trade policy bands',
    optionsPutSkewBps: -180, // Call Skew dominant
  },
  {
    symbol: 'BP',
    name: 'BP p.l.c. ADR',
    sector: 'Global Integrated Energy',
    foreignSupplyChainPct: 45,
    foreignRevenuePct: 75,
    tariffBeta: 0.95,
    vulnerabilityTier: 'MODERATE',
    estimatedEpsDragPct: -3.2,
    impliedVolSpikePotentialPts: +4.6,
    primaryExposedRegimes: ['eu-china-bev-duties', 'retaliatory-agri-energy'],
    recommendedPlay: 'Covered Calls on dividend support floor',
    optionsPutSkewBps: 150,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Enterprise Software & Cloud Platforms',
    foreignSupplyChainPct: 32,
    foreignRevenuePct: 51,
    tariffBeta: 0.85,
    vulnerabilityTier: 'LOW',
    estimatedEpsDragPct: -2.1,
    impliedVolSpikePotentialPts: +3.8,
    primaryExposedRegimes: ['us-semiconductor-export-controls'],
    recommendedPlay: 'Bull Put Credit Spread (Software insulation from physical tariffs)',
    optionsPutSkewBps: 180,
  },
  {
    symbol: '/GC',
    name: 'Gold Futures',
    sector: 'Monetary Metal & Safe Haven Hedge',
    foreignSupplyChainPct: 15,
    foreignRevenuePct: 90,
    tariffBeta: -0.65, // Negative beta (gains on trade protectionism)
    vulnerabilityTier: 'LOW',
    estimatedEpsDragPct: +4.2, // Positive benefit
    impliedVolSpikePotentialPts: +6.5,
    primaryExposedRegimes: ['us-universal-baseline', 'retaliatory-agri-energy'],
    recommendedPlay: 'Out-of-the-Money Call Debit Spreads as inflation/currency hedge',
    optionsPutSkewBps: -320, // Strong Call Skew
  },
];

export const TARIFF_MILESTONES_CALENDAR: TariffMilestone[] = [
  {
    id: 'm-us-election-tariff',
    date: 'Nov 05, 2026',
    daysRemaining: 35,
    title: 'Executive Trade Policy & Tariffs Directive Review',
    type: 'DEADLINE',
    importance: 'CRITICAL',
    description: 'Statutory deadline for administration formulation of universal 10% baseline import surcharge and Section 301 expansion.',
    tickersImpacted: ['SPY', 'AAPL', 'WMT', 'AMZN', 'CAT'],
  },
  {
    id: 'm-wto-dispute-hearing',
    date: 'Nov 18, 2026',
    daysRemaining: 48,
    title: 'WTO Dispute Settlement Body: EV Duties Challenge',
    type: 'HEARING',
    importance: 'HIGH',
    description: 'Geneva panel review on EU and US countervailing automotive tariffs and battery component subsidy criteria.',
    tickersImpacted: ['TSLA', 'EWG', 'VGK', 'BP'],
  },
  {
    id: 'm-bis-semiconductor-licensing',
    date: 'Dec 01, 2026',
    daysRemaining: 61,
    title: 'BIS Semiconductor Export Control Annual Revision',
    type: 'IMPLEMENTATION',
    importance: 'CRITICAL',
    description: 'US Department of Commerce Bureau of Industry and Security release of updated interconnect bandwidth caps and Entity List additions.',
    tickersImpacted: ['NVDA', 'AMD', 'AAPL', 'QCOM'],
  },
  {
    id: 'm-usmca-mexico-origin-audit',
    date: 'Dec 18, 2026',
    daysRemaining: 78,
    title: 'USMCA Joint Automotive Rules-of-Origin Verification',
    type: 'DEADLINE',
    importance: 'HIGH',
    description: 'Trilateral audit reports regarding Chinese raw materials and components integrated into North American assembled light vehicles.',
    tickersImpacted: ['F', 'GM', 'CAT', 'TSLA', 'EWW'],
  },
  {
    id: 'm-china-retaliatory-deadline',
    date: 'Jan 15, 2027',
    daysRemaining: 106,
    title: 'China MOFCOM Retaliatory Customs Schedule Activation',
    type: 'RETALIATION',
    importance: 'HIGH',
    description: 'Potential activation of 25% retaliatory duties on US liquefied natural gas (LNG), agricultural staples, and specialized chemicals.',
    tickersImpacted: ['/CL', '/NG', 'BP', 'XOM'],
  },
];

export const TARIFF_MACRO_AGGREGATES = {
  totalTradeUnderTariffUsdBn: 4180,
  averageEffectiveTariffPct: 16.8,
  baselinePreTariffRatePct: 2.6,
  cpiPassThroughInflationBps: 68,
  sp500AggregateEpsDragPct: -4.3,
  activeHotspotCount: 6,
  mostVulnerableSector: 'Consumer Electronics & Hardware',
  safestInsulatedSector: 'Enterprise Software & Cloud Infrastructure',
};
