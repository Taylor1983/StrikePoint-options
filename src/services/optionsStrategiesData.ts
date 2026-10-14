import { TradeLeg, ExpirationOptionChain, OptionContract } from '../types/options';

export type StrategyCategory =
  | 'Single Leg'
  | 'Vertical Spreads'
  | 'Volatility & Straddles'
  | 'Iron Wings (4-Leg)'
  | 'Butterflies & Condors'
  | 'Calendars & Diagonals'
  | 'Ratio & Backspreads'
  | 'Stock & Equity Hybrids'
  | 'Futures & Commodities';

export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';

export interface StrategyDefinition {
  id: string;
  name: string;
  category: StrategyCategory;
  bias: MarketBias;
  legsSummary: string;
  description: string;
  maxProfit: string;
  maxLoss: string;
  idealIVEnvironment: 'HIGH' | 'LOW' | 'NEUTRAL';
  popularity: number; // 1-10
}

export const MASTER_OPTIONS_STRATEGIES: StrategyDefinition[] = [
  // 1. Single Leg
  {
    id: 'long-call',
    name: 'Long Call',
    category: 'Single Leg',
    bias: 'BULLISH',
    legsSummary: '+1 Call',
    description: 'Purchasing an outright call option to profit from significant upward price appreciation with strictly defined downside risk limited to the premium paid.',
    maxProfit: 'Unlimited',
    maxLoss: 'Premium Paid',
    idealIVEnvironment: 'LOW',
    popularity: 10,
  },
  {
    id: 'naked-short-call',
    name: 'Naked Short Call',
    category: 'Single Leg',
    bias: 'BEARISH',
    legsSummary: '-1 Call',
    description: 'Selling an unhedged call option to collect upfront premium, expecting the underlying price to remain below the strike or decay through theta erosion.',
    maxProfit: 'Premium Collected',
    maxLoss: 'Unlimited',
    idealIVEnvironment: 'HIGH',
    popularity: 4,
  },
  {
    id: 'long-put',
    name: 'Long Put',
    category: 'Single Leg',
    bias: 'BEARISH',
    legsSummary: '+1 Put',
    description: 'Purchasing an outright put option to profit from sharp downward price movements or hedge long portfolio equity risk with capped capital risk.',
    maxProfit: 'Strike Price - Premium Paid',
    maxLoss: 'Premium Paid',
    idealIVEnvironment: 'LOW',
    popularity: 10,
  },
  {
    id: 'cash-secured-put',
    name: 'Cash-Secured Put',
    category: 'Single Leg',
    bias: 'BULLISH',
    legsSummary: '-1 Put (100% Cash Backed)',
    description: 'Selling an out-of-the-money put with full cash collateral set aside to either acquire shares at a discount or generate passive options yield.',
    maxProfit: 'Premium Collected',
    maxLoss: 'Strike Price - Premium Collected',
    idealIVEnvironment: 'HIGH',
    popularity: 9,
  },

  // 2. Vertical Spreads
  {
    id: 'bull-call-spread',
    name: 'Bull Call Debit Spread',
    category: 'Vertical Spreads',
    bias: 'BULLISH',
    legsSummary: '+1 Lower Call / -1 Higher Call',
    description: 'Buying a lower strike call and financing it by selling a higher strike call. Caps upside to reduce the initial cost basis and lessen volatility drag.',
    maxProfit: 'Difference between strikes - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 10,
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Credit Spread',
    category: 'Vertical Spreads',
    bias: 'BEARISH',
    legsSummary: '-1 Lower Call / +1 Higher Call',
    description: 'Selling a lower strike call and buying a higher strike call as protection. Collects net credit and achieves maximum gain if price stays below the short strike.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Difference between strikes - Net Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 9,
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Credit Spread',
    category: 'Vertical Spreads',
    bias: 'BULLISH',
    legsSummary: '-1 Higher Put / +1 Lower Put',
    description: 'Selling an out-of-the-money put while buying a further OTM put for disaster protection. High probability of profit when price remains above the short strike.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Difference between strikes - Net Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 10,
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Debit Spread',
    category: 'Vertical Spreads',
    bias: 'BEARISH',
    legsSummary: '+1 Higher Put / -1 Lower Put',
    description: 'Buying a higher strike put and selling a lower strike put to lower the cost of a bearish stance while capping the downside profit potential.',
    maxProfit: 'Difference between strikes - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 9,
  },

  // 3. Volatility & Straddles
  {
    id: 'long-straddle',
    name: 'Long Straddle',
    category: 'Volatility & Straddles',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '+1 ATM Call / +1 ATM Put',
    description: 'Simultaneously buying an at-the-money call and put with identical strikes and expiration. Profits from massive explosive moves in either direction.',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Premium Paid (Both Legs)',
    idealIVEnvironment: 'LOW',
    popularity: 8,
  },
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    category: 'Volatility & Straddles',
    bias: 'LOW_VOLATILITY',
    legsSummary: '-1 ATM Call / -1 ATM Put',
    description: 'Selling both an ATM call and put to collect maximum extrinsic value. Profits if the stock stays pinned to the strike price through expiration.',
    maxProfit: 'Total Premium Collected',
    maxLoss: 'Unlimited',
    idealIVEnvironment: 'HIGH',
    popularity: 6,
  },
  {
    id: 'long-strangle',
    name: 'Long Strangle',
    category: 'Volatility & Straddles',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '+1 OTM Put / +1 OTM Call',
    description: 'Buying an out-of-the-money put and an out-of-the-money call. Cheaper to enter than a straddle, requiring a larger price breakout to reach profitability.',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Premium Paid',
    idealIVEnvironment: 'LOW',
    popularity: 8,
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    category: 'Volatility & Straddles',
    bias: 'LOW_VOLATILITY',
    legsSummary: '-1 OTM Put / -1 OTM Call',
    description: 'Selling an OTM put and an OTM call to create a wide profit zone where the stock can fluctuate without incurring losses.',
    maxProfit: 'Total Premium Collected',
    maxLoss: 'Unlimited',
    idealIVEnvironment: 'HIGH',
    popularity: 7,
  },
  {
    id: 'long-guts',
    name: 'Long Guts',
    category: 'Volatility & Straddles',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '+1 ITM Put / +1 ITM Call',
    description: 'Buying an in-the-money put and in-the-money call. Higher delta sensitivity than an OTM strangle, profiting as soon as a strong trend develops.',
    maxProfit: 'Unlimited',
    maxLoss: 'Net Debit - Strike Difference',
    idealIVEnvironment: 'LOW',
    popularity: 5,
  },
  {
    id: 'short-guts',
    name: 'Short Guts',
    category: 'Volatility & Straddles',
    bias: 'LOW_VOLATILITY',
    legsSummary: '-1 ITM Put / -1 ITM Call',
    description: 'Selling an in-the-money put and in-the-money call. Massive upfront credit received, profitable if price consolidates strictly between strikes.',
    maxProfit: 'Net Credit - Strike Difference',
    maxLoss: 'Unlimited',
    idealIVEnvironment: 'HIGH',
    popularity: 4,
  },

  // 4. Iron Wings (4-Leg)
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    category: 'Iron Wings (4-Leg)',
    bias: 'NEUTRAL',
    legsSummary: '+1 OTM Put / -1 OTM Put / -1 OTM Call / +1 OTM Call',
    description: 'A 4-leg defined-risk strategy combining an OTM bull put spread and an OTM bear call spread. Highest probability options income play in rangebound markets.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Wing Width - Net Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 10,
  },
  {
    id: 'reverse-iron-condor',
    name: 'Reverse Iron Condor',
    category: 'Iron Wings (4-Leg)',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '-1 OTM Put / +1 OTM Put / +1 OTM Call / -1 OTM Call',
    description: 'A debit iron condor that profits when the underlying undergoes a violent breakout beyond either the outer call or outer put wings.',
    maxProfit: 'Wing Width - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 6,
  },
  {
    id: 'iron-butterfly',
    name: 'Iron Butterfly',
    category: 'Iron Wings (4-Leg)',
    bias: 'NEUTRAL',
    legsSummary: '+1 OTM Put / -1 ATM Put / -1 ATM Call / +1 OTM Call',
    description: 'Selling an ATM straddle and buying outer OTM wings for risk definition. Maximizes profit if the underlying pins exactly at the central ATM strike.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Wing Width - Net Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 8,
  },
  {
    id: 'reverse-iron-butterfly',
    name: 'Reverse Iron Butterfly',
    category: 'Iron Wings (4-Leg)',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '-1 OTM Put / +1 ATM Put / +1 ATM Call / -1 OTM Call',
    description: 'Long debit butterfly designed to exploit explosive volatility expansions with defined risk and high leverage ratio.',
    maxProfit: 'Wing Width - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 5,
  },

  // 5. Butterflies & Condors
  {
    id: 'long-call-butterfly',
    name: 'Long Call Butterfly',
    category: 'Butterflies & Condors',
    bias: 'NEUTRAL',
    legsSummary: '+1 ITM Call / -2 ATM Calls / +1 OTM Call',
    description: 'Constructed using only calls in a 1 : -2 : 1 ratio. Extremely high risk/reward payout when stock closes near the short middle strike.',
    maxProfit: 'Strike Distance - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'HIGH',
    popularity: 8,
  },
  {
    id: 'short-call-butterfly',
    name: 'Short Call Butterfly',
    category: 'Butterflies & Condors',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '-1 ITM Call / +2 ATM Calls / -1 OTM Call',
    description: 'Selling the outer wings and buying 2 middle calls. Generates upfront credit and reaches max gain on any significant move away from center.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Strike Distance - Net Credit',
    idealIVEnvironment: 'LOW',
    popularity: 5,
  },
  {
    id: 'long-put-butterfly',
    name: 'Long Put Butterfly',
    category: 'Butterflies & Condors',
    bias: 'NEUTRAL',
    legsSummary: '+1 OTM Put / -2 ATM Puts / +1 ITM Put',
    description: 'All-put butterfly with a 1 : -2 : 1 ratio. Low cost entry for modeling price stabilization at the middle strike.',
    maxProfit: 'Strike Distance - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'HIGH',
    popularity: 7,
  },
  {
    id: 'short-put-butterfly',
    name: 'Short Put Butterfly',
    category: 'Butterflies & Condors',
    bias: 'HIGH_VOLATILITY',
    legsSummary: '-1 OTM Put / +2 ATM Puts / -1 ITM Put',
    description: 'Reverse put butterfly profiting from strong trending markets away from the center pin strike.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Strike Distance - Net Credit',
    idealIVEnvironment: 'LOW',
    popularity: 5,
  },
  {
    id: 'long-call-condor',
    name: 'Long Call Condor',
    category: 'Butterflies & Condors',
    bias: 'NEUTRAL',
    legsSummary: '+1 Lower Call / -1 Mid-Low Call / -1 Mid-High Call / +1 Upper Call',
    description: 'All-call condor with a wider plateau of maximum profit between the two short strikes than a single-point butterfly.',
    maxProfit: 'Strike Distance - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'HIGH',
    popularity: 6,
  },
  {
    id: 'long-put-condor',
    name: 'Long Put Condor',
    category: 'Butterflies & Condors',
    bias: 'NEUTRAL',
    legsSummary: '+1 Lower Put / -1 Mid-Low Put / -1 Mid-High Put / +1 Upper Put',
    description: 'All-put condor providing a broad target profit zone across the central strike corridor with bounded risk.',
    maxProfit: 'Strike Distance - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'HIGH',
    popularity: 6,
  },

  // 6. Calendars & Diagonals
  {
    id: 'call-calendar-spread',
    name: 'Long Call Calendar Spread',
    category: 'Calendars & Diagonals',
    bias: 'NEUTRAL',
    legsSummary: '-1 Near-Term Call / +1 Far-Term Call (Same Strike)',
    description: 'Horizontal time spread exploiting accelerated theta decay in the front-month option while retaining long gamma and vega in the back-month.',
    maxProfit: 'Back-month value expansion - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 8,
  },
  {
    id: 'put-calendar-spread',
    name: 'Long Put Calendar Spread',
    category: 'Calendars & Diagonals',
    bias: 'NEUTRAL',
    legsSummary: '-1 Near-Term Put / +1 Far-Term Put (Same Strike)',
    description: 'Horizontal put time spread profiting from rapid front-month decay with long back-month put convexity.',
    maxProfit: 'Back-month put value - Net Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 7,
  },
  {
    id: 'poor-mans-covered-call',
    name: "Poor Man's Covered Call (PMCC)",
    category: 'Calendars & Diagonals',
    bias: 'BULLISH',
    legsSummary: '+1 Deep ITM Leap Call (>80Δ) / -1 OTM Front Call (30Δ)',
    description: 'Synthetic covered call using a deep ITM long-dated LEAPS call instead of 100 shares of stock, freeing up 75% of buying power while harvesting monthly call premium.',
    maxProfit: 'Short Strike - Long Strike + Premium Collected - Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 10,
  },
  {
    id: 'put-diagonal-spread',
    name: 'Put Diagonal Spread',
    category: 'Calendars & Diagonals',
    bias: 'BEARISH',
    legsSummary: '+1 Deep ITM Leap Put / -1 OTM Front Put',
    description: 'Bearish diagonal time spread providing downside protection with continuous front-month cash generation.',
    maxProfit: 'Long Strike - Short Strike + Premium Collected - Debit',
    maxLoss: 'Net Debit Paid',
    idealIVEnvironment: 'LOW',
    popularity: 7,
  },

  // 7. Ratio & Backspreads
  {
    id: 'call-ratio-backspread',
    name: 'Call Ratio Backspread (1x2)',
    category: 'Ratio & Backspreads',
    bias: 'BULLISH',
    legsSummary: '-1 Lower Strike Call / +2 Higher Strike Calls',
    description: 'Selling 1 lower call to finance the purchase of 2 higher calls. Generates unlimited upside profit on moonshots with small profit or break-even on the downside.',
    maxProfit: 'Unlimited',
    maxLoss: 'Strike Difference - Net Credit',
    idealIVEnvironment: 'LOW',
    popularity: 7,
  },
  {
    id: 'put-ratio-backspread',
    name: 'Put Ratio Backspread (1x2)',
    category: 'Ratio & Backspreads',
    bias: 'BEARISH',
    legsSummary: '-1 Higher Strike Put / +2 Lower Strike Puts',
    description: 'Selling 1 higher put to fund 2 lower puts. Designed for market crash protection where catastrophic collapses produce explosive gains.',
    maxProfit: 'Unlimited (down to zero)',
    maxLoss: 'Strike Difference - Net Credit',
    idealIVEnvironment: 'LOW',
    popularity: 8,
  },
  {
    id: 'call-frontspread',
    name: 'Call Frontspread (Ratio 1x2)',
    category: 'Ratio & Backspreads',
    bias: 'BULLISH',
    legsSummary: '+1 Lower Call / -2 Higher Calls',
    description: 'Buying 1 lower call and selling 2 higher calls. Profitable in mild upward drift, but carries naked call risk if stock surges too high.',
    maxProfit: 'Strike Distance + Net Credit',
    maxLoss: 'Unlimited (Above Upper Breakeven)',
    idealIVEnvironment: 'HIGH',
    popularity: 5,
  },
  {
    id: 'put-frontspread',
    name: 'Put Frontspread (Ratio 1x2)',
    category: 'Ratio & Backspreads',
    bias: 'BEARISH',
    legsSummary: '+1 Higher Put / -2 Lower Puts',
    description: 'Buying 1 higher put and selling 2 lower puts to finance the position, expecting modest pullback without catastrophic plunge.',
    maxProfit: 'Strike Distance + Net Credit',
    maxLoss: 'Substantial below lower breakeven',
    idealIVEnvironment: 'HIGH',
    popularity: 5,
  },

  // 8. Stock & Equity Hybrids
  {
    id: 'covered-call',
    name: 'Covered Call',
    category: 'Stock & Equity Hybrids',
    bias: 'BULLISH',
    legsSummary: '+100 Shares Stock / -1 OTM Call',
    description: 'Owning 100 shares of underlying equity while selling an OTM call. Generates recurring dividend-like cash flow and provides modest downside cushion.',
    maxProfit: 'Call Strike - Stock Purchase Price + Call Premium',
    maxLoss: 'Stock Purchase Price - Call Premium (to zero)',
    idealIVEnvironment: 'HIGH',
    popularity: 10,
  },
  {
    id: 'protective-put',
    name: 'Protective Put (Married Put)',
    category: 'Stock & Equity Hybrids',
    bias: 'BULLISH',
    legsSummary: '+100 Shares Stock / +1 OTM Put',
    description: 'Holding 100 shares while owning a put option as insurance. Guarantees a minimum liquidation value regardless of market crashes.',
    maxProfit: 'Unlimited',
    maxLoss: 'Stock Price - Put Strike + Put Premium',
    idealIVEnvironment: 'LOW',
    popularity: 9,
  },
  {
    id: 'collar',
    name: 'Collar (Zero-Cost Hedge)',
    category: 'Stock & Equity Hybrids',
    bias: 'NEUTRAL',
    legsSummary: '+100 Shares / +1 OTM Put / -1 OTM Call',
    description: 'Holding stock while buying a protective put and financing it completely by selling a covered call. Locks in a price band with virtually zero out-of-pocket cash.',
    maxProfit: 'Call Strike - Stock Price + Net Credit',
    maxLoss: 'Stock Price - Put Strike - Net Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 9,
  },
  {
    id: 'covered-put',
    name: 'Covered Put',
    category: 'Stock & Equity Hybrids',
    bias: 'BEARISH',
    legsSummary: '-100 Shares Stock / -1 OTM Put',
    description: 'Shorting 100 shares and selling a put option. Generates premium while creating an obligation to buy back the stock at the strike price.',
    maxProfit: 'Short Stock Sale - Put Strike + Put Premium',
    maxLoss: 'Unlimited on upside rally',
    idealIVEnvironment: 'HIGH',
    popularity: 5,
  },
  {
    id: 'synthetic-long-stock',
    name: 'Synthetic Long Stock',
    category: 'Stock & Equity Hybrids',
    bias: 'BULLISH',
    legsSummary: '+1 ATM Call / -1 ATM Put',
    description: 'Buying an ATM call and selling an ATM put with the same strike and expiry. Replicates 100 shares of stock delta (+100.0) at near zero initial debit.',
    maxProfit: 'Unlimited',
    maxLoss: 'Strike Price - Net Debit (All the way to zero)',
    idealIVEnvironment: 'NEUTRAL',
    popularity: 8,
  },
  {
    id: 'synthetic-short-stock',
    name: 'Synthetic Short Stock',
    category: 'Stock & Equity Hybrids',
    bias: 'BEARISH',
    legsSummary: '-1 ATM Call / +1 ATM Put',
    description: 'Selling an ATM call and buying an ATM put. Replicates 100 shares of short stock delta (-100.0) without borrow fees or short sale restrictions.',
    maxProfit: 'Strike Price + Net Credit',
    maxLoss: 'Unlimited on upside rally',
    idealIVEnvironment: 'NEUTRAL',
    popularity: 6,
  },
  {
    id: 'risk-reversal',
    name: 'Risk Reversal',
    category: 'Stock & Equity Hybrids',
    bias: 'BULLISH',
    legsSummary: '+1 OTM Call / -1 OTM Put',
    description: 'Buying an out-of-the-money call financed by selling an out-of-the-money put. Institutional benchmark used by FX desks and equity funds.',
    maxProfit: 'Unlimited',
    maxLoss: 'Put Strike - Net Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 8,
  },
  {
    id: 'jade-lizard',
    name: 'Jade Lizard',
    category: 'Stock & Equity Hybrids',
    bias: 'BULLISH',
    legsSummary: '+1 OTM Put / -1 OTM Put (Spread) / -1 OTM Call',
    description: 'Selling a bull put spread and selling an OTM call where total credit collected exceeds the put spread width, completely eliminating upside risk.',
    maxProfit: 'Total Net Credit Collected',
    maxLoss: 'Put Spread Width - Total Credit',
    idealIVEnvironment: 'HIGH',
    popularity: 8,
  },
  {
    id: 'big-lizard',
    name: 'Big Lizard',
    category: 'Stock & Equity Hybrids',
    bias: 'NEUTRAL',
    legsSummary: '-1 ATM Straddle / +1 OTM Put Hedge',
    description: 'Selling an ATM straddle and buying an OTM put for downside crash protection while maintaining large premium collection.',
    maxProfit: 'Net Credit Collected',
    maxLoss: 'Substantial beyond lower wing',
    idealIVEnvironment: 'HIGH',
    popularity: 6,
  },
  {
    id: 'zebra',
    name: 'ZEBRA (Zero Extrinsic Backspread)',
    category: 'Stock & Equity Hybrids',
    bias: 'BULLISH',
    legsSummary: '+2 Deep ITM Calls (~70Δ) / -1 ATM Call (~50Δ)',
    description: 'Buying two 70-delta ITM calls and selling one 50-delta ATM call. Exactly produces 90-100 stock delta with virtually ZERO extrinsic value and capped risk.',
    maxProfit: 'Unlimited',
    maxLoss: 'Net Debit Paid (Never more)',
    idealIVEnvironment: 'HIGH',
    popularity: 8,
  },

  // 9. Futures & Commodities
  {
    id: 'long-future',
    name: 'Long Future Contract',
    category: 'Futures & Commodities',
    bias: 'BULLISH',
    legsSummary: '+1 Futures Contract',
    description: 'Direct directional long futures contract (/ES, /NQ, /CL) with high capital efficiency and continuous 23-hour trading liquidity.',
    maxProfit: 'Unlimited',
    maxLoss: 'Contract value to zero',
    idealIVEnvironment: 'NEUTRAL',
    popularity: 8,
  },
  {
    id: 'short-future',
    name: 'Short Future Contract',
    category: 'Futures & Commodities',
    bias: 'BEARISH',
    legsSummary: '-1 Futures Contract',
    description: 'Direct short futures contract for macro hedging or exploiting commodity/index declines.',
    maxProfit: 'Entry Price * Multiplier',
    maxLoss: 'Unlimited',
    idealIVEnvironment: 'NEUTRAL',
    popularity: 7,
  },
  {
    id: 'future-protective-put',
    name: 'Future + Protective Put Hedge',
    category: 'Futures & Commodities',
    bias: 'BULLISH',
    legsSummary: '+1 Future / +1 OTM Put',
    description: 'Combines a long futures contract with a long put option to maintain leveraged exposure with strict catastrophic downside protection.',
    maxProfit: 'Unlimited',
    maxLoss: 'Future Entry - Put Strike + Put Premium',
    idealIVEnvironment: 'LOW',
    popularity: 7,
  },
  {
    id: 'covered-future',
    name: 'Covered Future (Future + Short Call)',
    category: 'Futures & Commodities',
    bias: 'BULLISH',
    legsSummary: '+1 Future / -1 OTM Call',
    description: 'Long future contract overlaid with a short call option to generate income against agricultural, energy, or equity index futures holdings.',
    maxProfit: 'Call Strike - Future Entry + Call Premium',
    maxLoss: 'Future Entry - Call Premium (to zero)',
    idealIVEnvironment: 'HIGH',
    popularity: 6,
  },
];

/**
 * Builds realistic TradeLegs for any strategy template given the current stock price and chain
 */
export function buildStrategyLegs(
  strategyId: string,
  stockPrice: number,
  chain: ExpirationOptionChain,
  underlyingSymbol: string = 'SPY',
  multiplier: number = 100
): TradeLeg[] {
  const S = stockPrice;
  const calls = chain.calls;
  const puts = chain.puts;
  const exp = chain.formattedDate;
  const dte = chain.dte;

  let atmIdx = 0;
  let minDiff = Infinity;
  calls.forEach((c, idx) => {
    const diff = Math.abs(c.strike - S);
    if (diff < minDiff) {
      minDiff = diff;
      atmIdx = idx;
    }
  });

  const getCall = (offset: number) => calls[Math.max(0, Math.min(calls.length - 1, atmIdx + offset))];
  const getPut = (offset: number) => puts[Math.max(0, Math.min(puts.length - 1, atmIdx + offset))];
  const now = Date.now();

  switch (strategyId) {
    case 'long-call': {
      const c = getCall(0);
      return [{ id: `leg-lc-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1, multiplier, underlyingSymbol }];
    }
    case 'naked-short-call': {
      const c = getCall(1);
      return [{ id: `leg-sc-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol }];
    }
    case 'long-put': {
      const p = getPut(0);
      return [{ id: `leg-lp-${now}`, type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1, multiplier, underlyingSymbol }];
    }
    case 'cash-secured-put': {
      const p = getPut(-1);
      return [{ id: `leg-csp-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol }];
    }
    case 'bull-call-spread': {
      const c1 = getCall(-1);
      const c2 = getCall(2);
      return [
        { id: `leg-bcs-1-${now}`, type: 'call', action: 'buy', strike: c1.strike, expiration: exp, dte, iv: c1.iv, premium: c1.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-bcs-2-${now}`, type: 'call', action: 'sell', strike: c2.strike, expiration: exp, dte, iv: c2.iv, premium: c2.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'bear-call-spread': {
      const c1 = getCall(1);
      const c2 = getCall(3);
      return [
        { id: `leg-bccs-1-${now}`, type: 'call', action: 'sell', strike: c1.strike, expiration: exp, dte, iv: c1.iv, premium: c1.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-bccs-2-${now}`, type: 'call', action: 'buy', strike: c2.strike, expiration: exp, dte, iv: c2.iv, premium: c2.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'bull-put-spread': {
      const p1 = getPut(-1);
      const p2 = getPut(-3);
      return [
        { id: `leg-bps-1-${now}`, type: 'put', action: 'sell', strike: p1.strike, expiration: exp, dte, iv: p1.iv, premium: p1.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-bps-2-${now}`, type: 'put', action: 'buy', strike: p2.strike, expiration: exp, dte, iv: p2.iv, premium: p2.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'bear-put-spread': {
      const p1 = getPut(1);
      const p2 = getPut(-2);
      return [
        { id: `leg-bep-1-${now}`, type: 'put', action: 'buy', strike: p1.strike, expiration: exp, dte, iv: p1.iv, premium: p1.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-bep-2-${now}`, type: 'put', action: 'sell', strike: p2.strike, expiration: exp, dte, iv: p2.iv, premium: p2.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-straddle': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        { id: `leg-strd-c-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-strd-p-${now}`, type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'short-straddle': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        { id: `leg-sstrd-c-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-sstrd-p-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-strangle': {
      const p = getPut(-2);
      const c = getCall(2);
      return [
        { id: `leg-strg-p-${now}`, type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-strg-c-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'short-strangle': {
      const p = getPut(-2);
      const c = getCall(2);
      return [
        { id: `leg-sstrg-p-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-sstrg-c-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-guts': {
      const c = getCall(-2); // ITM call
      const p = getPut(2);   // ITM put
      return [
        { id: `leg-gut-c-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-gut-p-${now}`, type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'short-guts': {
      const c = getCall(-2);
      const p = getPut(2);
      return [
        { id: `leg-sgut-c-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-sgut-p-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'iron-condor': {
      const lp = getPut(-4);
      const sp = getPut(-2);
      const sc = getCall(2);
      const lc = getCall(4);
      return [
        { id: `leg-ic-lp-${now}`, type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ic-sp-${now}`, type: 'put', action: 'sell', strike: sp.strike, expiration: exp, dte, iv: sp.iv, premium: sp.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ic-sc-${now}`, type: 'call', action: 'sell', strike: sc.strike, expiration: exp, dte, iv: sc.iv, premium: sc.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ic-lc-${now}`, type: 'call', action: 'buy', strike: lc.strike, expiration: exp, dte, iv: lc.iv, premium: lc.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'reverse-iron-condor': {
      const sp = getPut(-4);
      const lp = getPut(-2);
      const lc = getCall(2);
      const sc = getCall(4);
      return [
        { id: `leg-ric-sp-${now}`, type: 'put', action: 'sell', strike: sp.strike, expiration: exp, dte, iv: sp.iv, premium: sp.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ric-lp-${now}`, type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ric-lc-${now}`, type: 'call', action: 'buy', strike: lc.strike, expiration: exp, dte, iv: lc.iv, premium: lc.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ric-sc-${now}`, type: 'call', action: 'sell', strike: sc.strike, expiration: exp, dte, iv: sc.iv, premium: sc.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'iron-butterfly': {
      const lp = getPut(-3);
      const sp = getPut(0);
      const sc = getCall(0);
      const lc = getCall(3);
      return [
        { id: `leg-ib-lp-${now}`, type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ib-sp-${now}`, type: 'put', action: 'sell', strike: sp.strike, expiration: exp, dte, iv: sp.iv, premium: sp.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ib-sc-${now}`, type: 'call', action: 'sell', strike: sc.strike, expiration: exp, dte, iv: sc.iv, premium: sc.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ib-lc-${now}`, type: 'call', action: 'buy', strike: lc.strike, expiration: exp, dte, iv: lc.iv, premium: lc.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'reverse-iron-butterfly': {
      const sp = getPut(-3);
      const lp = getPut(0);
      const lc = getCall(0);
      const sc = getCall(3);
      return [
        { id: `leg-rib-sp-${now}`, type: 'put', action: 'sell', strike: sp.strike, expiration: exp, dte, iv: sp.iv, premium: sp.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-rib-lp-${now}`, type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-rib-lc-${now}`, type: 'call', action: 'buy', strike: lc.strike, expiration: exp, dte, iv: lc.iv, premium: lc.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-rib-sc-${now}`, type: 'call', action: 'sell', strike: sc.strike, expiration: exp, dte, iv: sc.iv, premium: sc.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-call-butterfly': {
      const c1 = getCall(-2);
      const c2 = getCall(0);
      const c3 = getCall(2);
      return [
        { id: `leg-lcb-1-${now}`, type: 'call', action: 'buy', strike: c1.strike, expiration: exp, dte, iv: c1.iv, premium: c1.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lcb-2-${now}`, type: 'call', action: 'sell', strike: c2.strike, expiration: exp, dte, iv: c2.iv, premium: c2.bid, contracts: 2, multiplier, underlyingSymbol },
        { id: `leg-lcb-3-${now}`, type: 'call', action: 'buy', strike: c3.strike, expiration: exp, dte, iv: c3.iv, premium: c3.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'short-call-butterfly': {
      const c1 = getCall(-2);
      const c2 = getCall(0);
      const c3 = getCall(2);
      return [
        { id: `leg-scb-1-${now}`, type: 'call', action: 'sell', strike: c1.strike, expiration: exp, dte, iv: c1.iv, premium: c1.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-scb-2-${now}`, type: 'call', action: 'buy', strike: c2.strike, expiration: exp, dte, iv: c2.iv, premium: c2.ask, contracts: 2, multiplier, underlyingSymbol },
        { id: `leg-scb-3-${now}`, type: 'call', action: 'sell', strike: c3.strike, expiration: exp, dte, iv: c3.iv, premium: c3.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-put-butterfly': {
      const p1 = getPut(-2);
      const p2 = getPut(0);
      const p3 = getPut(2);
      return [
        { id: `leg-lpb-1-${now}`, type: 'put', action: 'buy', strike: p1.strike, expiration: exp, dte, iv: p1.iv, premium: p1.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lpb-2-${now}`, type: 'put', action: 'sell', strike: p2.strike, expiration: exp, dte, iv: p2.iv, premium: p2.bid, contracts: 2, multiplier, underlyingSymbol },
        { id: `leg-lpb-3-${now}`, type: 'put', action: 'buy', strike: p3.strike, expiration: exp, dte, iv: p3.iv, premium: p3.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'short-put-butterfly': {
      const p1 = getPut(-2);
      const p2 = getPut(0);
      const p3 = getPut(2);
      return [
        { id: `leg-spb-1-${now}`, type: 'put', action: 'sell', strike: p1.strike, expiration: exp, dte, iv: p1.iv, premium: p1.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-spb-2-${now}`, type: 'put', action: 'buy', strike: p2.strike, expiration: exp, dte, iv: p2.iv, premium: p2.ask, contracts: 2, multiplier, underlyingSymbol },
        { id: `leg-spb-3-${now}`, type: 'put', action: 'sell', strike: p3.strike, expiration: exp, dte, iv: p3.iv, premium: p3.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-call-condor': {
      const c1 = getCall(-3);
      const c2 = getCall(-1);
      const c3 = getCall(1);
      const c4 = getCall(3);
      return [
        { id: `leg-lcc-1-${now}`, type: 'call', action: 'buy', strike: c1.strike, expiration: exp, dte, iv: c1.iv, premium: c1.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lcc-2-${now}`, type: 'call', action: 'sell', strike: c2.strike, expiration: exp, dte, iv: c2.iv, premium: c2.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lcc-3-${now}`, type: 'call', action: 'sell', strike: c3.strike, expiration: exp, dte, iv: c3.iv, premium: c3.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lcc-4-${now}`, type: 'call', action: 'buy', strike: c4.strike, expiration: exp, dte, iv: c4.iv, premium: c4.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-put-condor': {
      const p1 = getPut(-3);
      const p2 = getPut(-1);
      const p3 = getPut(1);
      const p4 = getPut(3);
      return [
        { id: `leg-lpc-1-${now}`, type: 'put', action: 'buy', strike: p1.strike, expiration: exp, dte, iv: p1.iv, premium: p1.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lpc-2-${now}`, type: 'put', action: 'sell', strike: p2.strike, expiration: exp, dte, iv: p2.iv, premium: p2.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lpc-3-${now}`, type: 'put', action: 'sell', strike: p3.strike, expiration: exp, dte, iv: p3.iv, premium: p3.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-lpc-4-${now}`, type: 'put', action: 'buy', strike: p4.strike, expiration: exp, dte, iv: p4.iv, premium: p4.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'call-calendar-spread': {
      const c = getCall(0);
      return [
        { id: `leg-ccs-near-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-ccs-far-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: 'Nov 20, 2026', dte: dte + 35, iv: c.iv * 1.05, premium: Number((c.ask * 1.45).toFixed(2)), contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'put-calendar-spread': {
      const p = getPut(0);
      return [
        { id: `leg-pcs-near-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-pcs-far-${now}`, type: 'put', action: 'buy', strike: p.strike, expiration: 'Nov 20, 2026', dte: dte + 35, iv: p.iv * 1.05, premium: Number((p.ask * 1.45).toFixed(2)), contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'poor-mans-covered-call': {
      const deepItmCall = getCall(-4);
      const otmFrontCall = getCall(1);
      return [
        { id: `leg-pmcc-leap-${now}`, type: 'call', action: 'buy', strike: deepItmCall.strike, expiration: 'Jan 15, 2027', dte: 280, iv: deepItmCall.iv, premium: Number((deepItmCall.ask * 1.85).toFixed(2)), contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-pmcc-front-${now}`, type: 'call', action: 'sell', strike: otmFrontCall.strike, expiration: exp, dte, iv: otmFrontCall.iv, premium: otmFrontCall.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'put-diagonal-spread': {
      const deepItmPut = getPut(4);
      const otmFrontPut = getPut(-1);
      return [
        { id: `leg-pdiag-leap-${now}`, type: 'put', action: 'buy', strike: deepItmPut.strike, expiration: 'Jan 15, 2027', dte: 280, iv: deepItmPut.iv, premium: Number((deepItmPut.ask * 1.85).toFixed(2)), contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-pdiag-front-${now}`, type: 'put', action: 'sell', strike: otmFrontPut.strike, expiration: exp, dte, iv: otmFrontPut.iv, premium: otmFrontPut.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'call-ratio-backspread': {
      const sellC = getCall(0);
      const buyC = getCall(2);
      return [
        { id: `leg-crb-1-${now}`, type: 'call', action: 'sell', strike: sellC.strike, expiration: exp, dte, iv: sellC.iv, premium: sellC.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-crb-2-${now}`, type: 'call', action: 'buy', strike: buyC.strike, expiration: exp, dte, iv: buyC.iv, premium: buyC.ask, contracts: 2, multiplier, underlyingSymbol },
      ];
    }
    case 'put-ratio-backspread': {
      const sellP = getPut(0);
      const buyP = getPut(-2);
      return [
        { id: `leg-prb-1-${now}`, type: 'put', action: 'sell', strike: sellP.strike, expiration: exp, dte, iv: sellP.iv, premium: sellP.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-prb-2-${now}`, type: 'put', action: 'buy', strike: buyP.strike, expiration: exp, dte, iv: buyP.iv, premium: buyP.ask, contracts: 2, multiplier, underlyingSymbol },
      ];
    }
    case 'call-frontspread': {
      const buyC = getCall(0);
      const sellC = getCall(2);
      return [
        { id: `leg-cfs-1-${now}`, type: 'call', action: 'buy', strike: buyC.strike, expiration: exp, dte, iv: buyC.iv, premium: buyC.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-cfs-2-${now}`, type: 'call', action: 'sell', strike: sellC.strike, expiration: exp, dte, iv: sellC.iv, premium: sellC.bid, contracts: 2, multiplier, underlyingSymbol },
      ];
    }
    case 'put-frontspread': {
      const buyP = getPut(0);
      const sellP = getPut(-2);
      return [
        { id: `leg-pfs-1-${now}`, type: 'put', action: 'buy', strike: buyP.strike, expiration: exp, dte, iv: buyP.iv, premium: buyP.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-pfs-2-${now}`, type: 'put', action: 'sell', strike: sellP.strike, expiration: exp, dte, iv: sellP.iv, premium: sellP.bid, contracts: 2, multiplier, underlyingSymbol },
      ];
    }
    case 'covered-call': {
      const call = getCall(1);
      return [
        { id: `leg-cc-stock-${now}`, type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol },
        { id: `leg-cc-call-${now}`, type: 'call', action: 'sell', strike: call.strike, expiration: exp, dte, iv: call.iv, premium: call.bid, contracts: 1, multiplier: 100, underlyingSymbol },
      ];
    }
    case 'protective-put': {
      const put = getPut(-1);
      return [
        { id: `leg-pp-stock-${now}`, type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol },
        { id: `leg-pp-put-${now}`, type: 'put', action: 'buy', strike: put.strike, expiration: exp, dte, iv: put.iv, premium: put.ask, contracts: 1, multiplier: 100, underlyingSymbol },
      ];
    }
    case 'collar': {
      const put = getPut(-2);
      const call = getCall(2);
      return [
        { id: `leg-col-stock-${now}`, type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol },
        { id: `leg-col-put-${now}`, type: 'put', action: 'buy', strike: put.strike, expiration: exp, dte, iv: put.iv, premium: put.ask, contracts: 1, multiplier: 100, underlyingSymbol },
        { id: `leg-col-call-${now}`, type: 'call', action: 'sell', strike: call.strike, expiration: exp, dte, iv: call.iv, premium: call.bid, contracts: 1, multiplier: 100, underlyingSymbol },
      ];
    }
    case 'covered-put': {
      const put = getPut(-1);
      return [
        { id: `leg-cp-stock-${now}`, type: 'stock', action: 'sell', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol },
        { id: `leg-cp-put-${now}`, type: 'put', action: 'sell', strike: put.strike, expiration: exp, dte, iv: put.iv, premium: put.bid, contracts: 1, multiplier: 100, underlyingSymbol },
      ];
    }
    case 'synthetic-long-stock': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        { id: `leg-synl-c-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-synl-p-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'synthetic-short-stock': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        { id: `leg-syns-c-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-syns-p-${now}`, type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'risk-reversal': {
      const c = getCall(2);
      const p = getPut(-2);
      return [
        { id: `leg-rr-c-${now}`, type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-rr-p-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'jade-lizard': {
      const sp = getPut(-2);
      const lp = getPut(-4);
      const sc = getCall(2);
      return [
        { id: `leg-jl-lp-${now}`, type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-jl-sp-${now}`, type: 'put', action: 'sell', strike: sp.strike, expiration: exp, dte, iv: sp.iv, premium: sp.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-jl-sc-${now}`, type: 'call', action: 'sell', strike: sc.strike, expiration: exp, dte, iv: sc.iv, premium: sc.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'big-lizard': {
      const c = getCall(0);
      const p = getPut(0);
      const lp = getPut(-3);
      return [
        { id: `leg-bl-sc-${now}`, type: 'call', action: 'sell', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-bl-sp-${now}`, type: 'put', action: 'sell', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.bid, contracts: 1, multiplier, underlyingSymbol },
        { id: `leg-bl-lp-${now}`, type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'zebra': {
      const itmCalls = getCall(-3);
      const atmCall = getCall(0);
      return [
        { id: `leg-zb-c1-${now}`, type: 'call', action: 'buy', strike: itmCalls.strike, expiration: exp, dte, iv: itmCalls.iv, premium: itmCalls.ask, contracts: 2, multiplier, underlyingSymbol },
        { id: `leg-zb-c2-${now}`, type: 'call', action: 'sell', strike: atmCall.strike, expiration: exp, dte, iv: atmCall.iv, premium: atmCall.bid, contracts: 1, multiplier, underlyingSymbol },
      ];
    }
    case 'long-future': {
      return [{ id: `leg-fut-buy-${now}`, type: 'future', action: 'buy', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: 50, underlyingSymbol }];
    }
    case 'short-future': {
      return [{ id: `leg-fut-sell-${now}`, type: 'future', action: 'sell', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: 50, underlyingSymbol }];
    }
    case 'future-protective-put': {
      const otmPut = getPut(-1);
      return [
        { id: `leg-fpp-fut-${now}`, type: 'future', action: 'buy', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: 50, underlyingSymbol },
        { id: `leg-fpp-put-${now}`, type: 'put', action: 'buy', strike: otmPut.strike, expiration: exp, dte, iv: otmPut.iv, premium: otmPut.ask, contracts: 1, multiplier: 50, underlyingSymbol },
      ];
    }
    case 'covered-future': {
      const otmCall = getCall(1);
      return [
        { id: `leg-cf-fut-${now}`, type: 'future', action: 'buy', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: 50, underlyingSymbol },
        { id: `leg-cf-call-${now}`, type: 'call', action: 'sell', strike: otmCall.strike, expiration: exp, dte, iv: otmCall.iv, premium: otmCall.bid, contracts: 1, multiplier: 50, underlyingSymbol },
      ];
    }
    default:
      return [];
  }
}
