export type DefconLevelNumber = 1 | 2 | 3 | 4 | 5;

export interface DefconLevelInfo {
  level: DefconLevelNumber;
  codeName: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  readinessDescription: string;
  usMilitaryReadiness: string;
  optionsAndMarketImpact: string;
}

export const DEFCON_LEVELS: Record<DefconLevelNumber, DefconLevelInfo> = {
  1: {
    level: 1,
    codeName: 'COCKED PISTOL',
    color: '#ff0033',
    bgClass: 'bg-[#ff0033]/20',
    borderClass: 'border-[#ff0033]',
    textClass: 'text-[#ff0033]',
    readinessDescription: 'Nuclear War is Imminent or has Begun',
    usMilitaryReadiness: 'Maximum military readiness. All strategic nuclear forces armed, airborne command posts active, ballistic missile submarines at launch readiness.',
    optionsAndMarketImpact: 'Extreme global volatility event (VIX 65-90+). Flight to liquidity, catastrophic equity index gap down, circuit breakers triggered, massive demand for deep OTM puts and extreme gold/defense call premiums.',
  },
  2: {
    level: 2,
    codeName: 'FAST PACE',
    color: '#ff4400',
    bgClass: 'bg-[#ff4400]/20',
    borderClass: 'border-[#ff4400]',
    textClass: 'text-[#ff4400]',
    readinessDescription: 'Armed Forces Ready to Deploy in 6 Hours',
    usMilitaryReadiness: 'Next step to nuclear war. Strategic bombers dispersed, ICBM launch crews on full alert, carrier strike groups repositioned into wartime combat posture.',
    optionsAndMarketImpact: 'Severe market risk-off. Crude oil (/CL) +15-30% spike, safe-haven Treasury and Gold surge, defense equities (LMT, RTX, NOC) gap up +8-15%, index volatility expands +35-50% with pronounced put skew.',
  },
  3: {
    level: 3,
    codeName: 'ROUND HOUSE',
    color: '#ffd600',
    bgClass: 'bg-[#ffd600]/20',
    borderClass: 'border-[#ffd600]',
    textClass: 'text-[#ffd600]',
    readinessDescription: 'Air Force Ready to Mobilize in 15 Minutes',
    usMilitaryReadiness: 'Elevated readiness above normal peacetime. Air Force combat squadrons ready to scramble within 15 minutes. Selected naval carrier wings and rapid deployment forces activated.',
    optionsAndMarketImpact: 'Active geopolitical risk premium priced into crude oil (+3-7 vol pts) and defense primes. Steep call skew on /CL and defense contractor options; equity index puts bid as geopolitical hedging accelerates.',
  },
  4: {
    level: 4,
    codeName: 'DOUBLE TAKE',
    color: '#00d2ff',
    bgClass: 'bg-[#00d2ff]/20',
    borderClass: 'border-[#00d2ff]',
    textClass: 'text-[#00d2ff]',
    readinessDescription: 'Increased Intelligence & Security Measures',
    usMilitaryReadiness: 'Intelligence surveillance and security measures increased. Continuous drone recon, signals intelligence tracking, and elevated naval picket patrols.',
    optionsAndMarketImpact: 'Mild elevated macro vigilance. Modest volatility risk premium, baseline IV rank in energy and aerospace, standard volatility smile.',
  },
  5: {
    level: 5,
    codeName: 'FADE OUT',
    color: '#00e676',
    bgClass: 'bg-[#00e676]/20',
    borderClass: 'border-[#00e676]',
    textClass: 'text-[#00e676]',
    readinessDescription: 'Normal Peacetime Military Posture',
    usMilitaryReadiness: 'Lowest state of readiness. Standard peacetime training and day-to-day operations with no immediate strategic military threats identified.',
    optionsAndMarketImpact: 'Baseline low-volatility environment. VIX 11-15, compression in geopolitical risk premiums, range-bound crude volatility, tight option bid-ask spreads.',
  },
};

export interface CombatantCommandDefcon {
  id: string;
  name: string;
  shortName: string;
  areaOfResponsibility: string;
  headquarters: string;
  currentLevel: DefconLevelNumber;
  statusHeadline: string;
  operationalDetail: string;
  threatActors: string[];
  optionsProxyTickers: string[];
  primaryCatalyst: string;
  lastUpdated: string;
}

export const COMBATANT_COMMANDS: CombatantCommandDefcon[] = [
  {
    id: 'centcom',
    name: 'US Central Command',
    shortName: 'USCENTCOM',
    areaOfResponsibility: 'Middle East, Persian Gulf, Red Sea, Central Asia',
    headquarters: 'MacDill AFB, FL / Forward HQ Al Udeid, Qatar',
    currentLevel: 3,
    statusHeadline: 'PERSIAN GULF & RED SEA ESCALATION READINESS',
    operationalDetail: 'Dual Carrier Strike Groups deployed. Continuous air defense against ballistic & drone barrages in Red Sea shipping lanes. Aegis destroyers and Patriot/THAAD batteries on high alert.',
    threatActors: ['Iran IRGC', 'Houthi Armed Forces', 'Regional Proxies'],
    optionsProxyTickers: ['/CL', 'BNO', 'XOM', 'RTX', 'LMT'],
    primaryCatalyst: 'Strait of Hormuz maritime interdiction threats & direct missile exchanges with Israel.',
    lastUpdated: '10 Mins Ago',
  },
  {
    id: 'eucom',
    name: 'US European Command',
    shortName: 'USEUCOM',
    areaOfResponsibility: 'Europe, Black Sea, Baltic States, Arctic approaches',
    headquarters: 'Patch Barracks, Stuttgart, Germany',
    currentLevel: 3,
    statusHeadline: 'NATO EASTERN FLANK AIR DEFENSE WATCH',
    operationalDetail: 'Enhanced Air Policing over Baltic states & Poland. Submarine acoustic tracking in GIUK gap. Rapid deployment logistics corridors active along Suwalki Gap.',
    threatActors: ['Russian Federation Armed Forces', 'Belarus military integration'],
    optionsProxyTickers: ['/NG', 'EWG', 'NOC', 'GD', 'BA'],
    primaryCatalyst: 'Border airspace incursions, nuclear rhetoric, and critical undersea energy infrastructure sabotage risks.',
    lastUpdated: '25 Mins Ago',
  },
  {
    id: 'indopacom',
    name: 'US Indo-Pacific Command',
    shortName: 'USINDOPACOM',
    areaOfResponsibility: 'Pacific Ocean, Taiwan Strait, South China Sea, East Asia',
    headquarters: 'Camp H.M. Smith, Honolulu, HI',
    currentLevel: 3,
    statusHeadline: 'TAIWAN STRAIT & 1ST ISLAND CHAIN PATROLS',
    operationalDetail: 'Freedom of Navigation operations active in South China Sea. Enhanced B-52/B-21 bomber task forces rotating through Andersen AFB, Guam. Joint US-Japan-Philippines naval drills.',
    threatActors: ['PLA Navy & Rocket Force', 'North Korean Strategic Rocket Forces'],
    optionsProxyTickers: ['TSM', 'FXI', 'EWY', 'LMT', 'NVDA'],
    primaryCatalyst: 'PLA joint sword blockades, naval gray-zone encirclement, and hypersonic missile testing.',
    lastUpdated: '1 Hour Ago',
  },
  {
    id: 'stratcom',
    name: 'US Strategic Command',
    shortName: 'USSTRATCOM',
    areaOfResponsibility: 'Global Strategic Deterrence & Nuclear Triad Operations',
    headquarters: 'Offutt AFB, Omaha, NE',
    currentLevel: 4,
    statusHeadline: 'NUCLEAR TRIAD CONTINUOUS DETERRENCE PATROL',
    operationalDetail: 'Minuteman III ICBM launch complexes on continuous hair-trigger readiness. Ohio-class ballistic missile submarines (SSBNs) at undisclosed deterrent patrol stations.',
    threatActors: ['Strategic Nuclear Arsenals (Russia, China, North Korea)'],
    optionsProxyTickers: ['GLD', '/GC', 'TLT', 'NOC'],
    primaryCatalyst: 'Nuclear test treaty withdrawals and tactical warhead forward-stationing warnings.',
    lastUpdated: '2 Hours Ago',
  },
  {
    id: 'northcom',
    name: 'US Northern Command',
    shortName: 'USNORTHCOM / NORAD',
    areaOfResponsibility: 'Homeland Defense, Continental United States, Alaska, Canada',
    headquarters: 'Peterson Space Force Base, Colorado Springs, CO',
    currentLevel: 4,
    statusHeadline: 'AEROSPACE APPROACH SURVEILLANCE & AIR DEFENSE',
    operationalDetail: 'NORAD alert fighter interceptors on 5-minute runway scramble standby. Over-the-horizon radar arrays monitoring northern polar ballistic trajectories.',
    threatActors: ['Long-range strategic aviation, High-altitude surveillance probes'],
    optionsProxyTickers: ['RTX', 'LHX', 'SPY'],
    primaryCatalyst: 'Foreign strategic bomber incursions into the Alaskan Air Defense Identification Zone (ADIZ).',
    lastUpdated: '3 Hours Ago',
  },
  {
    id: 'cybercom',
    name: 'US Cyber Command',
    shortName: 'USCYBERCOM',
    areaOfResponsibility: 'Cyberspace Operations & Critical Infrastructure Defense',
    headquarters: 'Fort Meade, MD',
    currentLevel: 2,
    statusHeadline: 'ELEVATED INFOCON: NATION-STATE CYBER CAMPAIGN ACTIVE',
    operationalDetail: 'Active cyber defense shields protecting electric grid, financial clearing systems, and defense supply chain SCADA systems against coordinated APT campaigns.',
    threatActors: ['APT28/29 (Fancy/Cozy Bear)', 'Volt Typhoon', 'Lazarus Group'],
    optionsProxyTickers: ['CRWD', 'PANW', 'NET', 'FTNT'],
    primaryCatalyst: 'Critical infrastructure zero-day weaponization and pre-positioning malware alerts.',
    lastUpdated: '15 Mins Ago',
  },
];

export interface DefconBreakingNewsItem {
  id: string;
  time: string;
  headline: string;
  source: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  theater: string;
  marketImpact: string;
}

export const DEFCON_BREAKING_NEWS: DefconBreakingNewsItem[] = [
  {
    id: 'def-news-1',
    time: '14:48:10',
    headline: 'US Carrier Strike Group Abraham Lincoln initiates integrated combat air patrols in Northern Arabian Sea',
    source: 'defconlevel.com OSINT · US Navy 5th Fleet',
    severity: 'HIGH',
    theater: 'CENTCOM',
    marketImpact: '/CL Crude oil pops +1.4%; Brent call skew expands to 92nd percentile',
  },
  {
    id: 'def-news-2',
    time: '14:22:05',
    headline: 'NORAD scrambles F-22 Raptors to intercept Russian Tu-95 Bear-H strategic bombers operating inside Alaska ADIZ',
    source: 'defconlevel.com OSINT · NORAD Command',
    severity: 'MEDIUM',
    theater: 'NORTHCOM',
    marketImpact: 'Aerospace defense contractors LMT (+1.8%) and RTX (+1.5%) bid higher',
  },
  {
    id: 'def-news-3',
    time: '13:50:33',
    headline: 'CYBERCOM raises Cyber Threat Level following distributed probing on Tier-1 defense supplier telemetry',
    source: 'defconlevel.com OSINT · CISA Alert',
    severity: 'HIGH',
    theater: 'CYBERCOM',
    marketImpact: 'Cybersecurity names CRWD (+3.2%) and PANW (+2.8%) see aggressive call flow',
  },
  {
    id: 'def-news-4',
    time: '12:15:19',
    headline: 'Satellite imagery confirms PLA Navy amphibious assault groups conducting live-fire dispersal east of Taiwan',
    source: 'defconlevel.com OSINT · INDOPACOM Intelligence',
    severity: 'HIGH',
    theater: 'INDOPACOM',
    marketImpact: 'TSMC (TSM) short-dated put volume surges 3.4x average; FXI downside puts active',
  },
  {
    id: 'def-news-5',
    time: '10:04:40',
    headline: 'NATO Aegis Ashore missile defense facility in Poland completes live ballistic intercept telemetry drill',
    source: 'defconlevel.com OSINT · USEUCOM Public Affairs',
    severity: 'MEDIUM',
    theater: 'EUCOM',
    marketImpact: 'Lockheed Martin (LMT) PAC-3 interceptor contract backlog optimism persists',
  },
];

export interface DefenseTickerProfile {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  role: string;
  primaryDefenseProgram: string;
  currentIV: number;
  ivRank: number;
  callPutRatio: number;
  defconBeta: number; // Sensitivity to military escalation (e.g. 1.8x)
  topPlay: string;
}

export const DEFENSE_PRIME_TICKERS: DefenseTickerProfile[] = [
  {
    symbol: 'LMT',
    name: 'Lockheed Martin Corp',
    price: 582.40,
    change: 9.85,
    changePct: 1.72,
    role: 'Top US Defense Prime · Hypersonic, Stealth & Missile Defense',
    primaryDefenseProgram: 'F-35 Lightning II, PAC-3 Patriot, THAAD, HIMARS rockets',
    currentIV: 0.245,
    ivRank: 64,
    callPutRatio: 2.15,
    defconBeta: 2.1,
    topPlay: 'Long 600 Call / Short 620 Call Spread (Bullish Escalation Hedge)',
  },
  {
    symbol: 'RTX',
    name: 'RTX Corporation (Raytheon)',
    price: 124.60,
    change: 2.10,
    changePct: 1.71,
    role: 'Missile Systems, Radar Arrays & Jet Engines (Pratt & Whitney)',
    primaryDefenseProgram: 'Tomahawk Cruise Missiles, AMRAAM, Patriot Guidance Radar',
    currentIV: 0.228,
    ivRank: 58,
    callPutRatio: 1.84,
    defconBeta: 1.9,
    topPlay: 'Cash-Secured 120 Put Sale (Accumulate Defense Basis at 28% IV)',
  },
  {
    symbol: 'NOC',
    name: 'Northrop Grumman Corp',
    price: 538.90,
    change: 11.20,
    changePct: 2.12,
    role: 'Strategic Nuclear Triad, Stealth Bombers & Space Defense',
    primaryDefenseProgram: 'B-21 Raider Stealth Bomber, Sentinel ICBM, Space Lasers',
    currentIV: 0.262,
    ivRank: 71,
    callPutRatio: 2.45,
    defconBeta: 2.4,
    topPlay: 'Long 550 Call (Direct Exposure to Strategic Triad Modernization)',
  },
  {
    symbol: 'GD',
    name: 'General Dynamics Corp',
    price: 304.50,
    change: 3.80,
    changePct: 1.26,
    role: 'Naval Combatant Shipyards & Ground Armor Systems',
    primaryDefenseProgram: 'Columbia & Virginia-class Nuclear Submarines, M1A2 Abrams',
    currentIV: 0.198,
    ivRank: 48,
    callPutRatio: 1.62,
    defconBeta: 1.5,
    topPlay: 'Covered Call: Stock + Short 320 Call',
  },
  {
    symbol: 'ITA',
    name: 'iShares US Aerospace & Defense ETF',
    price: 142.80,
    change: 1.95,
    changePct: 1.38,
    role: 'Benchmark US Aerospace & Defense Industry Basket',
    primaryDefenseProgram: 'All Prime DoD Contractors & Tier-1 Component Suppliers',
    currentIV: 0.185,
    ivRank: 52,
    callPutRatio: 2.05,
    defconBeta: 1.7,
    topPlay: 'Synthetic Long or Long Calls as Pure Defense Sector Proxy',
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares ETF',
    price: 245.20,
    change: 1.80,
    changePct: 0.74,
    role: 'Global Geopolitical Safe Haven Reserve Asset',
    primaryDefenseProgram: 'Physical bullion monetary reserve flight vehicle',
    currentIV: 0.162,
    ivRank: 66,
    callPutRatio: 2.80,
    defconBeta: 1.6,
    topPlay: 'OTM Out-of-Money Call Sweeps for Geopolitical Shock Tail Risk',
  },
];

export interface DefconEscalationScenario {
  targetLevel: DefconLevelNumber;
  title: string;
  triggerEvent: string;
  sp500ProjectedImpact: number; // e.g. -4.5%
  crudeOilProjectedImpact: number; // e.g. +14.2%
  goldProjectedImpact: number; // e.g. +5.8%
  vixProjectedLevel: number; // e.g. 38.5
  defensePrimesImpact: number; // e.g. +8.5%
  recommendedOptionsHedge: string;
}

export const DEFCON_SCENARIOS: DefconEscalationScenario[] = [
  {
    targetLevel: 2,
    title: 'DEFCON 2: MAJOR THEATER COMBAT ENGAGEMENT',
    triggerEvent: 'Direct kinetic strike against US Carrier Strike Group or NATO Article 5 territory invocation.',
    sp500ProjectedImpact: -6.8,
    crudeOilProjectedImpact: 22.5,
    goldProjectedImpact: 7.4,
    vixProjectedLevel: 42.0,
    defensePrimesImpact: 11.5,
    recommendedOptionsHedge: 'SPY Bear Put Debit Spreads + /CL Out-of-the-Money Call Backspreads',
  },
  {
    targetLevel: 1,
    title: 'DEFCON 1: MAXIMUM STRATEGIC NUCLEAR ALERT',
    triggerEvent: 'Confirmed ICBM launch detection against Allied command infrastructure.',
    sp500ProjectedImpact: -25.0,
    crudeOilProjectedImpact: 65.0,
    goldProjectedImpact: 28.0,
    vixProjectedLevel: 85.0,
    defensePrimesImpact: 4.0,
    recommendedOptionsHedge: 'Global Cash Preservation, Ultra-long Volatility Calls, Deep Protective Puts',
  },
  {
    targetLevel: 4,
    title: 'DEFCON 4: GEOPOLITICAL DE-ESCALATION & CEASEFIRE',
    triggerEvent: 'Successful maritime neutrality accords, bilateral ceasefire and sanctions reduction.',
    sp500ProjectedImpact: 3.5,
    crudeOilProjectedImpact: -8.5,
    goldProjectedImpact: -3.2,
    vixProjectedLevel: 13.8,
    defensePrimesImpact: -2.5,
    recommendedOptionsHedge: 'Iron Condors to harvest elevated volatility crush, Short Straddles on Crude',
  },
];
