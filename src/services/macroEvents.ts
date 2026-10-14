export interface MacroEvent {
  id: string;
  title: string;
  shortLabel: string;
  category: 'CENTRAL_BANK' | 'INFLATION' | 'EMPLOYMENT' | 'COMMODITY_OPEC' | 'GROWTH';
  categoryLabel: string;
  date: string; // e.g. "2026-09-18" or "2026-10-02" or month-day matching candle time
  time: string;
  importance: 'HIGH' | 'CRITICAL';
  actual: string;
  forecast: string;
  prior: string;
  status: 'completed' | 'upcoming';
  impactSummary: string;
  marketReactionNote: string;
  spxReactionPct?: number;
  crudeReactionPct?: number;
  vixReactionPts?: number;
  ivImpact: string; // e.g. "-3.8 vol pts post-release crush"
}

export const MACRO_EVENTS_DATA: MacroEvent[] = [
  {
    id: 'fomc-2026-09',
    title: 'FOMC Interest Rate Decision & Dot Plot',
    shortLabel: 'FOMC',
    category: 'CENTRAL_BANK',
    categoryLabel: 'Federal Reserve',
    date: '2026-09-18',
    time: '14:00 EDT',
    importance: 'CRITICAL',
    actual: '4.75% (-50 bps cut)',
    forecast: '4.75%',
    prior: '5.25%',
    status: 'completed',
    impactSummary: 'Federal Reserve delivers jumbo 50 bps rate cut, updating dot plot projection to signal additional 50 bps easing through year-end.',
    marketReactionNote: 'Equities rallied to fresh record highs; short-dated front-week VIX/IV crushed -4.2 points post-statement.',
    spxReactionPct: 1.70,
    crudeReactionPct: 0.85,
    vixReactionPts: -4.2,
    ivImpact: '-4.2 vol pts post-decision IV crush',
  },
  {
    id: 'cpi-2026-09',
    title: 'US CPI Inflation Report (August)',
    shortLabel: 'CPI',
    category: 'INFLATION',
    categoryLabel: 'Inflation / BLS',
    date: '2026-09-11',
    time: '08:30 EDT',
    importance: 'CRITICAL',
    actual: '2.5% YoY (Core 3.2%)',
    forecast: '2.6% YoY (Core 3.2%)',
    prior: '2.9% YoY',
    status: 'completed',
    impactSummary: 'Headline inflation prints coolest pace since February 2021, cementing broad market expectations for Fed easing cycle.',
    marketReactionNote: 'Broad rally across mega-cap tech; rate volatility compressed sharply across treasury futures.',
    spxReactionPct: 1.07,
    crudeReactionPct: 1.40,
    vixReactionPts: -2.1,
    ivImpact: '-2.8 vol pts event premium deflation',
  },
  {
    id: 'nfp-2026-09',
    title: 'US Non-Farm Payrolls (Jobs Report)',
    shortLabel: 'NFP',
    category: 'EMPLOYMENT',
    categoryLabel: 'Labor / BLS',
    date: '2026-09-06',
    time: '08:30 EDT',
    importance: 'HIGH',
    actual: '+142K (Unemp 4.2%)',
    forecast: '+161K (Unemp 4.2%)',
    prior: '+89K (revised)',
    status: 'completed',
    impactSummary: 'Labor market shows orderly cooling; unemployment ticked lower to 4.2% from 4.3%, easing immediate recession fears.',
    marketReactionNote: 'Initial morning whipsaw followed by aggressive dip-buying into market close.',
    spxReactionPct: -0.30,
    crudeReactionPct: -2.10,
    vixReactionPts: 0.8,
    ivImpact: '+0.8 vol pt intraday spike',
  },
  {
    id: 'opec-2026-10',
    title: '57th OPEC+ JMMC Ministerial Monitoring Meeting',
    shortLabel: 'OPEC',
    category: 'COMMODITY_OPEC',
    categoryLabel: 'OPEC+ / Energy',
    date: '2026-10-02',
    time: '07:00 EDT',
    importance: 'CRITICAL',
    actual: 'Review 2.2 mb/d voluntary cuts',
    forecast: 'Full cut roll-over affirmed',
    prior: '2.2 mb/d cuts',
    status: 'upcoming',
    impactSummary: '8 key OPEC+ producers review oil supply balances, demand projections, and overproduction compensation schedules.',
    marketReactionNote: 'Expected move on /CL front month is ±$3.85 (5.6%). Pre-meeting IV run-up of +7.8 vol pts typical into event.',
    spxReactionPct: 0.15,
    crudeReactionPct: 2.40,
    vixReactionPts: -1.5,
    ivImpact: 'Pre-event run-up to 38.6% IV; expected -8.1 vol pt post-decision crush',
  },
  {
    id: 'cpi-2026-10',
    title: 'US CPI Inflation Report (September)',
    shortLabel: 'CPI',
    category: 'INFLATION',
    categoryLabel: 'Inflation / BLS',
    date: '2026-10-10',
    time: '08:30 EDT',
    importance: 'CRITICAL',
    actual: 'Pending Release',
    forecast: '2.3% YoY (Core 3.1%)',
    prior: '2.5% YoY',
    status: 'upcoming',
    impactSummary: 'Consensus forecasts headline inflation to decelerate further toward Fed 2.0% target.',
    marketReactionNote: 'Option straddles pricing ±1.25% SPX index move on release day.',
    spxReactionPct: undefined,
    crudeReactionPct: undefined,
    vixReactionPts: undefined,
    ivImpact: 'Priced Event Move: ±1.25%',
  },
  {
    id: 'fomc-2026-11',
    title: 'FOMC Rate Decision & Monetary Statement',
    shortLabel: 'FOMC',
    category: 'CENTRAL_BANK',
    categoryLabel: 'Federal Reserve',
    date: '2026-11-07',
    time: '14:00 EST',
    importance: 'CRITICAL',
    actual: 'Pending Decision',
    forecast: '4.50% (-25 bps cut)',
    prior: '4.75%',
    status: 'upcoming',
    impactSummary: 'Post-US presidential election FOMC meeting; rate futures pricing 88% probability of 25 bps rate cut.',
    marketReactionNote: 'Implied daily volatility expected to elevate +35% above 30-day baseline into election & Fed week.',
    spxReactionPct: undefined,
    crudeReactionPct: undefined,
    vixReactionPts: undefined,
    ivImpact: 'Priced Event Move: ±1.60%',
  },
  {
    id: 'gdp-2026-08',
    title: 'US Q2 GDP Second Estimate (Annualized)',
    shortLabel: 'GDP',
    category: 'GROWTH',
    categoryLabel: 'Economic Growth / BEA',
    date: '2026-08-29',
    time: '08:30 EDT',
    importance: 'HIGH',
    actual: '+3.0% Annualized',
    forecast: '+2.8%',
    prior: '+2.8%',
    status: 'completed',
    impactSummary: 'Upward revision driven by robust consumer spending and non-residential fixed business investment.',
    marketReactionNote: 'Confirmed US soft-landing narrative; cyclical equities outperformed defensive sectors.',
    spxReactionPct: 0.74,
    crudeReactionPct: 1.10,
    vixReactionPts: -1.2,
    ivImpact: '-1.4 vol pts volatility compression',
  },
  {
    id: 'pce-2026-09',
    title: 'US Core PCE Price Index (Fed Target)',
    shortLabel: 'PCE',
    category: 'INFLATION',
    categoryLabel: 'Inflation / BEA',
    date: '2026-09-27',
    time: '08:30 EDT',
    importance: 'HIGH',
    actual: '0.1% MoM / 2.7% YoY',
    forecast: '0.2% MoM / 2.7% YoY',
    prior: '2.6% YoY',
    status: 'completed',
    impactSummary: 'Core PCE metric matches consensus expectations, keeping path clear for ongoing systematic policy easing.',
    marketReactionNote: 'Markets steady with implied volatility drifting toward 30-day lows.',
    spxReactionPct: 0.22,
    crudeReactionPct: -0.45,
    vixReactionPts: -0.6,
    ivImpact: '-0.9 vol pt post-print soft crush',
  },
];

/**
 * Matches a candle date or index with macro events
 */
export function findMacroEventsForCandle(candleTime: string): MacroEvent[] {
  // Normalize candle time (e.g. "Sep 18", "09/18", "2026-09-18", or date string)
  const normCandle = candleTime.toLowerCase().replace(/[^a-z0-9]/g, '');
  return MACRO_EVENTS_DATA.filter((evt) => {
    const normEvt = evt.date.toLowerCase().replace(/[^a-z0-9]/g, '');
    const monthDayEvt = new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase().replace(/[^a-z0-9]/g, '');
    return normEvt.includes(normCandle) || normCandle.includes(normEvt) || normCandle.includes(monthDayEvt);
  });
}
