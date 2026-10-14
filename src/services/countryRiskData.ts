export interface CountryRiskRegion {
  id: string;
  region: string;
  countryOrBloc: string;
  flag: string;
  riskScore: number; // 0 - 100
  riskTier: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  impliedVolPremiumPts: number; // e.g. +8.4 vol pts
  skewBias: 'UPSIDE_CALL' | 'DOWNSIDE_PUT' | 'SYMMETRIC';
  skewBiasLabel: string;
  sovereignCdsBps: number; // Credit Default Swap in basis points
  primaryThreatCatalyst: string;
  optionsImpactSummary: string;
  proxyTickers: string[]; // Related tickers e.g. ['/CL', 'BP', 'XOM']
  recommendedHedgingPlay: string;
}

export const COUNTRY_GEO_RISK_DATA: CountryRiskRegion[] = [
  {
    id: 'mideast-gulf',
    region: 'Middle East',
    countryOrBloc: 'Persian Gulf & Red Sea Corridor',
    flag: '🌍',
    riskScore: 88,
    riskTier: 'CRITICAL',
    impliedVolPremiumPts: 11.6,
    skewBias: 'UPSIDE_CALL',
    skewBiasLabel: 'Extreme Call Skew (+7.2% vs Put IV)',
    sovereignCdsBps: 142,
    primaryThreatCatalyst: 'Strait of Hormuz transit disruptions & Red Sea naval drone strikes',
    optionsImpactSummary: 'Crude Oil (/CL) and energy equities price heavy geopolitical disruption premium. OTM $80+ call open interest up +44%.',
    proxyTickers: ['/CL', 'BP', 'XOM', 'CVX', 'OXY'],
    recommendedHedgingPlay: 'Long /CL Out-of-the-Money Call Spreads or Calendar Spreads to monetize bloated front-month IV.',
  },
  {
    id: 'europe-eastern',
    region: 'Europe',
    countryOrBloc: 'Eurozone & Eastern European Frontier',
    flag: '🇪🇺',
    riskScore: 74,
    riskTier: 'ELEVATED',
    impliedVolPremiumPts: 7.2,
    skewBias: 'DOWNSIDE_PUT',
    skewBiasLabel: 'Downside Put Skew (+4.5% vs Call IV)',
    sovereignCdsBps: 84,
    primaryThreatCatalyst: 'Energy supply weaponization, German de-industrialization, and sovereign debt spreads (BTP/Bund)',
    optionsImpactSummary: 'Euro STOXX 50 (VSTOXX) implied volatility trades 3.8 pts above historical realized vol. Heavy downside protective put volume.',
    proxyTickers: ['VGK', 'EWG', '/6E', 'BP'],
    recommendedHedgingPlay: 'Bear Put Spreads on European ETF proxies or Short Strangles on stable dividend energy.',
  },
  {
    id: 'east-asia-taiwan',
    region: 'East Asia',
    countryOrBloc: 'Taiwan Strait & South China Sea',
    flag: '🇨🇳',
    riskScore: 82,
    riskTier: 'CRITICAL',
    impliedVolPremiumPts: 9.8,
    skewBias: 'DOWNSIDE_PUT',
    skewBiasLabel: 'Severe Downside Put Skew (+6.1% vs Call IV)',
    sovereignCdsBps: 76,
    primaryThreatCatalyst: 'Semiconductor supply chain blockade risks & naval exercise escalation',
    optionsImpactSummary: 'Semiconductor ETF (SMH) and mega-tech hardware vendors price asymmetric tail risk. 3-month 20-delta puts priced at 1.4x calls.',
    proxyTickers: ['NVDA', 'AMD', 'AAPL', 'FXI'],
    recommendedHedgingPlay: 'Collar hedges on semiconductor longs (sell covered calls to fund 10% OTM protective puts).',
  },
  {
    id: 'usa-sovereign',
    region: 'North America',
    countryOrBloc: 'United States Fiscal & Election',
    flag: '🇺🇸',
    riskScore: 62,
    riskTier: 'ELEVATED',
    impliedVolPremiumPts: 5.4,
    skewBias: 'SYMMETRIC',
    skewBiasLabel: 'Balanced Skew with Elevated VIX Term Structure',
    sovereignCdsBps: 45,
    primaryThreatCatalyst: 'Post-election fiscal deficit expansion, debt ceiling renewals, and Treasury auction supply indigestion',
    optionsImpactSummary: 'VIX futures curve exhibits notable backwardation hump into election and Fed policy cycle. Rate vol (MOVE) at 108.',
    proxyTickers: ['SPY', 'QQQ', '/ES', '/ZB', '/ZN'],
    recommendedHedgingPlay: 'VIX 1x2 Call Backspreads or SPY Iron Condors placed outside the ±2σ expected move boundary.',
  },
  {
    id: 'latin-america',
    region: 'Latin America',
    countryOrBloc: 'Brazil / Mexico / Andean Mining',
    flag: '🌎',
    riskScore: 54,
    riskTier: 'MODERATE',
    impliedVolPremiumPts: 4.8,
    skewBias: 'DOWNSIDE_PUT',
    skewBiasLabel: 'Moderate Put Skew (+3.2% vs Call IV)',
    sovereignCdsBps: 165,
    primaryThreatCatalyst: 'Currency volatility, fiscal spending caps, and resource nationalization rhetoric',
    optionsImpactSummary: 'Options on commodity exporters reflect high sensitivity to Chinese industrial stimulus and copper/iron ore prices.',
    proxyTickers: ['EWW', 'EWZ', '/GC', '/SI'],
    recommendedHedgingPlay: 'Risk Reversals on mining exporters or selling wide credit put spreads on supportive central bank rate cuts.',
  },
  {
    id: 'emerging-markets-fx',
    region: 'Global EM',
    countryOrBloc: 'Emerging Market Sovereign Debt & FX',
    flag: '🌐',
    riskScore: 58,
    riskTier: 'MODERATE',
    impliedVolPremiumPts: 6.1,
    skewBias: 'DOWNSIDE_PUT',
    skewBiasLabel: 'Downside EM FX Skew (+4.8% vs Call IV)',
    sovereignCdsBps: 220,
    primaryThreatCatalyst: 'US Dollar strength liquidity drain & frontier market refinancing rollovers',
    optionsImpactSummary: 'Emerging market options reflect carry-trade unwind risks whenever US 10-year Treasury yields test 4.0%.',
    proxyTickers: ['EEM', 'DXY', '/6E', '/GC'],
    recommendedHedgingPlay: 'Long Gold (/GC) calls as sovereign currency debasement hedge.',
  },
];
