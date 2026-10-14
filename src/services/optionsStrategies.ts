import { Ticker, ExpirationOptionChain, TradeLeg } from '../types/options';
import { calculateBSM } from '../utils/blackScholes';

export type StrategyCategory =
  | 'Single'
  | 'Vertical Spread'
  | 'Straddle & Strangle'
  | 'Condor & Butterfly'
  | 'Calendar & Diagonal'
  | 'Covered & Synthetic'
  | 'Ratio & Asymmetric';

export type MarketOutlook =
  | 'Bullish'
  | 'Bearish'
  | 'Neutral'
  | 'High Volatility'
  | 'Low Volatility'
  | 'Income'
  | 'Hedging';

export interface StrategyDefinition {
  id: string;
  name: string;
  category: StrategyCategory;
  outlook: MarketOutlook;
  legsCount: number;
  riskType: 'Defined' | 'Undefined' | 'Capped' | 'Collateralized';
  bias: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  description: string;
  idealIV: string;
  maxProfit: string;
  maxLoss: string;
  breakevenFormula: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  popularTag?: boolean;
}

export const ALL_OPTIONS_STRATEGIES: StrategyDefinition[] = [
  // ------------------- SINGLE LEG -------------------
  {
    id: 'long-call',
    name: 'Long Call',
    category: 'Single',
    outlook: 'Bullish',
    legsCount: 1,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Outright purchase of a call option. Strong upside leverage with risk strictly limited to premium paid.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Unlimited',
    maxLoss: 'Debit Paid (100% of Premium)',
    breakevenFormula: 'Strike + Premium Paid',
    complexity: 'Beginner',
    popularTag: true,
  },
  {
    id: 'short-call',
    name: 'Short Call (Naked)',
    category: 'Single',
    outlook: 'Bearish',
    legsCount: 1,
    riskType: 'Undefined',
    bias: 'Bearish',
    description: 'Selling an unhedged call option to collect premium. Maximum profit is credit received; loss is theoretically infinite if stock rallies.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Credit Received',
    maxLoss: 'Unlimited (Requires high margin)',
    breakevenFormula: 'Strike + Credit Received',
    complexity: 'Advanced',
  },
  {
    id: 'long-put',
    name: 'Long Put',
    category: 'Single',
    outlook: 'Bearish',
    legsCount: 1,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Outright purchase of a put option. Downside directional speculation or portfolio crash protection with defined risk.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Strike - Premium Paid (Substantial to 0)',
    maxLoss: 'Debit Paid (100% of Premium)',
    breakevenFormula: 'Strike - Premium Paid',
    complexity: 'Beginner',
    popularTag: true,
  },
  {
    id: 'cash-secured-put',
    name: 'Cash-Secured Put (CSP)',
    category: 'Single',
    outlook: 'Bullish',
    legsCount: 1,
    riskType: 'Collateralized',
    bias: 'Bullish',
    description: 'Selling an OTM put while setting aside cash to buy 100 shares at the strike if assigned. High win rate income strategy.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Credit Received',
    maxLoss: 'Strike Price - Credit Received',
    breakevenFormula: 'Strike - Credit Received',
    complexity: 'Beginner',
    popularTag: true,
  },

  // ------------------- VERTICAL SPREADS -------------------
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread (Debit)',
    category: 'Vertical Spread',
    outlook: 'Bullish',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Buy lower strike call and sell higher strike call in same expiration. Lower cost than naked call with capped risk & reward.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Strike Diff - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Long Strike + Net Debit',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread (Credit)',
    category: 'Vertical Spread',
    outlook: 'Bearish',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Sell lower strike call and buy higher strike call. Collect upfront credit; gains if stock stays below short strike.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Net Credit Received × 100',
    maxLoss: '(Strike Diff - Net Credit) × 100',
    breakevenFormula: 'Short Strike + Net Credit',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread (Credit)',
    category: 'Vertical Spread',
    outlook: 'Bullish',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Sell higher strike put and buy lower strike put. Generates positive theta income when expecting stock to stay flat or rise.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Net Credit Received × 100',
    maxLoss: '(Strike Diff - Net Credit) × 100',
    breakevenFormula: 'Short Strike - Net Credit',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread (Debit)',
    category: 'Vertical Spread',
    outlook: 'Bearish',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Buy higher strike put and sell lower strike put. Lowers cost of downside speculation while protecting against IV crush.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Strike Diff - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Long Strike - Net Debit',
    complexity: 'Intermediate',
    popularTag: true,
  },

  // ------------------- STRADDLES & STRANGLES -------------------
  {
    id: 'long-straddle',
    name: 'Long Straddle',
    category: 'Straddle & Strangle',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Volatile',
    description: 'Buy ATM call and ATM put at the same strike. Profits from violent moves in either direction exceeding total debit paid.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Premium Paid (Both Legs)',
    breakevenFormula: 'Strike ± Total Debit Paid',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    category: 'Straddle & Strangle',
    outlook: 'Low Volatility',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Neutral',
    description: 'Sell ATM call and ATM put at same strike. Maximum profit if stock pins strike at expiration. Profits from massive IV crush.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Total Credit Received',
    maxLoss: 'Unlimited in both directions',
    breakevenFormula: 'Strike ± Total Credit Received',
    complexity: 'Advanced',
  },
  {
    id: 'long-strangle',
    name: 'Long Strangle',
    category: 'Straddle & Strangle',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Volatile',
    description: 'Buy OTM call and OTM put. Cheaper initial capital than straddle; requires larger explosive price breakout to profit.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Premium Paid',
    breakevenFormula: 'Upper: Call Strike + Debit | Lower: Put Strike - Debit',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    category: 'Straddle & Strangle',
    outlook: 'Neutral',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Neutral',
    description: 'Sell OTM call and OTM put. Wide probability of profit zone (e.g. 16 delta wings / 1σ expected move). High decay rate.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Total Credit Received',
    maxLoss: 'Unlimited outside breakevens',
    breakevenFormula: 'Upper: Call Strike + Credit | Lower: Put Strike - Credit',
    complexity: 'Advanced',
  },
  {
    id: 'long-guts',
    name: 'Long Guts',
    category: 'Straddle & Strangle',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Volatile',
    description: 'Buy ITM call and ITM put. High intrinsic value structure that generates significant gamma acceleration on big breakouts.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Debit - (Call Strike - Put Strike)',
    breakevenFormula: 'Call Strike + Net Debit or Put Strike - Net Debit',
    complexity: 'Advanced',
  },
  {
    id: 'short-guts',
    name: 'Short Guts',
    category: 'Straddle & Strangle',
    outlook: 'Low Volatility',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Neutral',
    description: 'Sell ITM call and ITM put. Massive initial credit received; risk accelerates rapidly if stock makes wide directional breakout.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Total Credit - (Call Strike - Put Strike)',
    maxLoss: 'Unlimited outside breakevens',
    breakevenFormula: 'Put Strike + Max Profit or Call Strike - Max Profit',
    complexity: 'Master',
  },

  // ------------------- CONDORS & BUTTERFLIES -------------------
  {
    id: 'iron-condor',
    name: 'Iron Condor (4-Leg)',
    category: 'Condor & Butterfly',
    outlook: 'Neutral',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell OTM Put Spread and sell OTM Call Spread simultaneously. Defined-risk range-bound market neutral income engine.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Net Credit Received × 100',
    maxLoss: '(Width of Spread - Net Credit) × 100',
    breakevenFormula: 'Lower: Short Put - Credit | Upper: Short Call + Credit',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'reverse-iron-condor',
    name: 'Reverse Iron Condor (Debit Condor)',
    category: 'Condor & Butterfly',
    outlook: 'High Volatility',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Volatile',
    description: 'Buy OTM Put Spread and buy OTM Call Spread. Cheap debit breakout structure that profits from sharp moves past either wing.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: '(Wing Width - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Long Put - Debit | Long Call + Debit',
    complexity: 'Advanced',
  },
  {
    id: 'iron-butterfly',
    name: 'Iron Butterfly (4-Leg)',
    category: 'Condor & Butterfly',
    outlook: 'Neutral',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell ATM Call & ATM Put, Buy OTM Call & OTM Put wings. High credit collected with maximum profit when pinning ATM strike.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Net Credit Received × 100',
    maxLoss: '(Wing Width - Net Credit) × 100',
    breakevenFormula: 'ATM Strike ± Net Credit',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'reverse-iron-butterfly',
    name: 'Reverse Iron Butterfly',
    category: 'Condor & Butterfly',
    outlook: 'High Volatility',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Volatile',
    description: 'Buy ATM Call & Put, sell OTM wings. Cheaper than long straddle due to short wings capping the debit.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: '(Wing Width - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'ATM Strike ± Net Debit',
    complexity: 'Advanced',
  },
  {
    id: 'long-call-butterfly',
    name: 'Long Call Butterfly (1-2-1)',
    category: 'Condor & Butterfly',
    outlook: 'Neutral',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Buy 1 ITM Call, sell 2 ATM Calls, buy 1 OTM Call. Exceptional risk-reward ratio (often 5:1 or 10:1) with precise target pin.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Strike Width - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Lower: Lower Strike + Debit | Upper: Upper Strike - Debit',
    complexity: 'Advanced',
    popularTag: true,
  },
  {
    id: 'long-put-butterfly',
    name: 'Long Put Butterfly (1-2-1)',
    category: 'Condor & Butterfly',
    outlook: 'Neutral',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Buy 1 OTM Put, sell 2 ATM Puts, buy 1 ITM Put. All-put implementation of the butterfly targeting exact pin at middle strike.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Strike Width - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Lower: Lower Strike + Debit | Upper: Upper Strike - Debit',
    complexity: 'Advanced',
  },
  {
    id: 'short-call-butterfly',
    name: 'Short Call Butterfly',
    category: 'Condor & Butterfly',
    outlook: 'High Volatility',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Volatile',
    description: 'Sell 1 lower call, buy 2 middle calls, sell 1 higher call. Receives credit; profits if stock moves away from center strike.',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Net Credit Received × 100',
    maxLoss: '(Strike Width - Net Credit) × 100',
    breakevenFormula: 'Lower: Lower Strike + Credit | Upper: Upper Strike - Credit',
    complexity: 'Advanced',
  },
  {
    id: 'broken-wing-call-butterfly',
    name: 'Broken Wing Call Butterfly (Skip Strike)',
    category: 'Condor & Butterfly',
    outlook: 'Bullish',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Buy 1 ATM Call, sell 2 OTM Calls, buy 1 higher Call skipping 1 strike. Built for zero/credit risk on downside and peak profit zone.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Width of Front Spread + Net Credit (or - Net Debit)',
    maxLoss: 'Embedded Wing Width - Net Credit',
    breakevenFormula: 'Upper Long Strike - Max Profit',
    complexity: 'Master',
  },
  {
    id: 'broken-wing-put-butterfly',
    name: 'Broken Wing Put Butterfly',
    category: 'Condor & Butterfly',
    outlook: 'Bearish',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Buy 1 ATM Put, sell 2 OTM Puts, buy 1 lower Put skipping 1 strike. Eliminates upside risk; profits in target dip or flat market.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Width of Front Spread + Net Credit',
    maxLoss: 'Embedded Wing Width - Net Credit',
    breakevenFormula: 'Lower Long Strike + Max Profit',
    complexity: 'Master',
  },
  {
    id: 'long-call-condor',
    name: 'Long Call Condor',
    category: 'Condor & Butterfly',
    outlook: 'Neutral',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Buy ITM call, sell lower-mid call, sell upper-mid call, buy OTM call. Wider flat profit plateau than butterfly pin.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Inside Strike Width - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Lower: Lowest Strike + Debit | Upper: Highest Strike - Debit',
    complexity: 'Advanced',
  },
  {
    id: 'long-put-condor',
    name: 'Long Put Condor',
    category: 'Condor & Butterfly',
    outlook: 'Neutral',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Buy OTM put, sell lower-mid put, sell upper-mid put, buy ITM put. Defined wide profit plateau in down-neutral market.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Inside Strike Width - Net Debit) × 100',
    maxLoss: 'Net Debit Paid × 100',
    breakevenFormula: 'Lower: Lowest Strike + Debit | Upper: Highest Strike - Debit',
    complexity: 'Advanced',
  },

  // ------------------- CALENDAR & DIAGONAL SPREADS -------------------
  {
    id: 'call-calendar-spread',
    name: 'Call Calendar Spread (Time Spread)',
    category: 'Calendar & Diagonal',
    outlook: 'Low Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell near-term front-month ATM Call and buy back-month ATM Call at same strike. Exploits faster theta decay on short leg.',
    idealIV: 'Low (Front IV Low or Rising Back IV)',
    maxProfit: 'Difference in option values when short expires ATM',
    maxLoss: 'Net Debit Paid',
    breakevenFormula: 'Dynamic (Depends on back-month IV curve)',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'put-calendar-spread',
    name: 'Put Calendar Spread',
    category: 'Calendar & Diagonal',
    outlook: 'Low Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell near-term ATM Put and buy back-month ATM Put at same strike. Profits from stability and positive time decay.',
    idealIV: 'Low (Front IV Low or Rising Back IV)',
    maxProfit: 'Difference in option values at front-month expiration',
    maxLoss: 'Net Debit Paid',
    breakevenFormula: 'Dynamic (Depends on back-month IV curve)',
    complexity: 'Intermediate',
  },
  {
    id: 'poor-mans-covered-call',
    name: "Poor Man's Covered Call (PMCC)",
    category: 'Calendar & Diagonal',
    outlook: 'Bullish',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Buy deep ITM long-dated Call (>0.80 Delta LEAPS) and sell near-term OTM Call. Replicates covered call with ~75% less capital.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Short Strike - Long Strike - Net Debit + Short Premium',
    maxLoss: 'Net Debit Paid for diagonal',
    breakevenFormula: 'Long Strike + Net Debit Paid',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'poor-mans-covered-put',
    name: "Poor Man's Covered Put (PMCP)",
    category: 'Calendar & Diagonal',
    outlook: 'Bearish',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Buy deep ITM long-dated Put (>0.80 Delta) and sell near-term OTM Put. Replicates short stock covered put with capital efficiency.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Long Strike - Short Strike - Net Debit + Short Premium',
    maxLoss: 'Net Debit Paid',
    breakevenFormula: 'Long Strike - Net Debit Paid',
    complexity: 'Intermediate',
  },
  {
    id: 'double-calendar-spread',
    name: 'Double Calendar Spread',
    category: 'Calendar & Diagonal',
    outlook: 'Low Volatility',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Put calendar spread + Call calendar spread. Generates an ultra-wide double-tent profit zone for range-bound low IV markets.',
    idealIV: 'Low (Buy Back Month Premium)',
    maxProfit: 'Peak at both strikes at front-month expiration',
    maxLoss: 'Total Net Debit Paid',
    breakevenFormula: 'Dynamic based on expiration curves',
    complexity: 'Advanced',
  },
  {
    id: 'double-diagonal-spread',
    name: 'Double Diagonal Spread',
    category: 'Calendar & Diagonal',
    outlook: 'Neutral',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell front-month OTM Put & Call, buy further back-month OTM Put & Call. Wide delta-neutral time decay harvest.',
    idealIV: 'Low to Medium',
    maxProfit: 'Front month premium decay while back wings hold value',
    maxLoss: 'Total Net Debit Paid',
    breakevenFormula: 'Dynamic based on expiration curves',
    complexity: 'Advanced',
  },

  // ------------------- COVERED & SYNTHETICS -------------------
  {
    id: 'covered-call',
    name: 'Covered Call (Buy-Write)',
    category: 'Covered & Synthetic',
    outlook: 'Income',
    legsCount: 2,
    riskType: 'Collateralized',
    bias: 'Bullish',
    description: 'Long 100 shares of stock + sell 1 OTM Call. Benchmark institutional income strategy reducing cost basis while collecting dividend.',
    idealIV: 'High (Sell Premium)',
    maxProfit: '(Short Call Strike - Stock Entry + Call Premium) × 100',
    maxLoss: '(Stock Price - Call Premium) × 100 (if stock goes to 0)',
    breakevenFormula: 'Stock Purchase Price - Call Premium Received',
    complexity: 'Beginner',
    popularTag: true,
  },
  {
    id: 'protective-put',
    name: 'Protective Put (Married Put)',
    category: 'Covered & Synthetic',
    outlook: 'Hedging',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Long 100 shares of stock + buy 1 OTM/ATM Put. Creates an un-breachable downside floor while retaining 100% of upside potential.',
    idealIV: 'Low (Cheap Downside Insurance)',
    maxProfit: 'Unlimited',
    maxLoss: '(Stock Entry - Put Strike + Put Premium) × 100',
    breakevenFormula: 'Stock Purchase Price + Put Premium Paid',
    complexity: 'Beginner',
    popularTag: true,
  },
  {
    id: 'collar',
    name: 'Collar (Zero-Cost Fence)',
    category: 'Covered & Synthetic',
    outlook: 'Hedging',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Long 100 shares + buy OTM Put + sell OTM Call. Short call premium finances the put hedge for near-zero net cash outlay.',
    idealIV: 'Neutral / Any',
    maxProfit: '(Call Strike - Stock Entry) + Net Premium',
    maxLoss: '(Stock Entry - Put Strike) - Net Premium',
    breakevenFormula: 'Stock Price - Net Credit (or + Net Debit)',
    complexity: 'Intermediate',
    popularTag: true,
  },
  {
    id: 'synthetic-long-stock',
    name: 'Synthetic Long Stock',
    category: 'Covered & Synthetic',
    outlook: 'Bullish',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Bullish',
    description: 'Buy ATM Call and sell ATM Put at same strike & expiration. Perfectly mimics 100 shares (+100 Delta) at near-zero net debit.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Unlimited',
    maxLoss: 'Strike Price + Net Debit Paid (Substantial to 0)',
    breakevenFormula: 'Strike + Net Debit (or - Net Credit)',
    complexity: 'Intermediate',
  },
  {
    id: 'synthetic-short-stock',
    name: 'Synthetic Short Stock',
    category: 'Covered & Synthetic',
    outlook: 'Bearish',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Bearish',
    description: 'Sell ATM Call and buy ATM Put at same strike & expiration. Perfectly mimics short 100 shares (-100 Delta) without borrow fees.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Strike Price - Net Debit (Substantial to 0)',
    maxLoss: 'Unlimited on upside rally',
    breakevenFormula: 'Strike - Net Debit (or + Net Credit)',
    complexity: 'Intermediate',
  },
  {
    id: 'covered-put',
    name: 'Covered Put',
    category: 'Covered & Synthetic',
    outlook: 'Bearish',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Bearish',
    description: 'Short 100 shares of stock + sell 1 OTM Put. Collects premium to reduce cost basis on short equity; risk uncapped on rally.',
    idealIV: 'High (Sell Premium)',
    maxProfit: '(Stock Entry - Put Strike + Put Premium) × 100',
    maxLoss: 'Unlimited if stock rallies',
    breakevenFormula: 'Stock Entry Price + Put Premium Received',
    complexity: 'Advanced',
  },

  // ------------------- RATIO & ASYMMETRIC / EXOTICS -------------------
  {
    id: 'jade-lizard',
    name: 'Jade Lizard',
    category: 'Ratio & Asymmetric',
    outlook: 'Income',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell OTM Put + Bear Call Spread. Net credit collected exceeds width of call spread, completely eliminating upside risk!',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Total Net Credit Received × 100',
    maxLoss: '(Short Put Strike - Total Credit) × 100 (on severe downside crash)',
    breakevenFormula: 'Short Put Strike - Total Credit (No upside breakeven)',
    complexity: 'Advanced',
    popularTag: true,
  },
  {
    id: 'reverse-jade-lizard',
    name: 'Reverse Jade Lizard (Twisted Sister)',
    category: 'Ratio & Asymmetric',
    outlook: 'Income',
    legsCount: 3,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Sell OTM Call + Bull Put Spread. Net credit exceeds width of put spread, completely eliminating downside risk!',
    idealIV: 'High (Sell Premium)',
    maxProfit: 'Total Net Credit Received × 100',
    maxLoss: 'Unlimited on severe upside rally outside short call',
    breakevenFormula: 'Short Call Strike + Total Credit (No downside breakeven)',
    complexity: 'Advanced',
  },
  {
    id: 'call-ratio-front-spread',
    name: 'Call Ratio Front Spread (1x2)',
    category: 'Ratio & Asymmetric',
    outlook: 'Bullish',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Bullish',
    description: 'Buy 1 ATM Call and sell 2 OTM Calls. Executed for credit or tiny debit; peak profit at short strike with naked call risk higher up.',
    idealIV: 'High (Sell Premium)',
    maxProfit: '(Short Strike - Long Strike) + Net Credit (or - Net Debit)',
    maxLoss: 'Unlimited if stock explodes higher past upper breakeven',
    breakevenFormula: 'Upper: 2 × Short Strike - Long Strike + Net Credit',
    complexity: 'Master',
  },
  {
    id: 'put-ratio-front-spread',
    name: 'Put Ratio Front Spread (1x2)',
    category: 'Ratio & Asymmetric',
    outlook: 'Bearish',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Bearish',
    description: 'Buy 1 ATM Put and sell 2 OTM Puts. Executed for credit; maximum profit at short strike with assigned stock risk below.',
    idealIV: 'High (Sell Premium)',
    maxProfit: '(Long Strike - Short Strike) + Net Credit',
    maxLoss: 'Substantial if stock plunges toward 0',
    breakevenFormula: 'Lower: 2 × Short Strike - Long Strike - Net Credit',
    complexity: 'Master',
  },
  {
    id: 'call-ratio-backspread',
    name: 'Call Ratio Backspread (2x1)',
    category: 'Ratio & Asymmetric',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Sell 1 ATM/ITM Call and buy 2 OTM Calls. Asymmetric breakout trade profiting from massive rallies while limiting downside.',
    idealIV: 'Low (Buy Multiple Wings)',
    maxProfit: 'Unlimited on sharp rally',
    maxLoss: 'Distance between strikes - Net Credit (Valley of death)',
    breakevenFormula: 'Short Strike + (2 × Distance between strikes) - Net Credit',
    complexity: 'Master',
  },
  {
    id: 'put-ratio-backspread',
    name: 'Put Ratio Backspread (2x1)',
    category: 'Ratio & Asymmetric',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Sell 1 ATM Put and buy 2 OTM Puts. Renowned institutional black-swan tail-risk crash hedge with uncapped downside payoff.',
    idealIV: 'Low (Buy Multiple Puts)',
    maxProfit: 'Substantial on market crash',
    maxLoss: 'Distance between strikes - Net Credit',
    breakevenFormula: 'Short Strike - (2 × Distance between strikes) + Net Credit',
    complexity: 'Master',
    popularTag: true,
  },
  {
    id: 'strap',
    name: 'Strap (Bullish Volatility)',
    category: 'Ratio & Asymmetric',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bullish',
    description: 'Buy 2 ATM Calls and buy 1 ATM Put. Volatility play heavily biased to the upside that still profits from massive drops.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Premium Paid (All 3 options)',
    breakevenFormula: 'Upper: Strike + (Total Debit / 2) | Lower: Strike - Total Debit',
    complexity: 'Intermediate',
  },
  {
    id: 'strip',
    name: 'Strip (Bearish Volatility)',
    category: 'Ratio & Asymmetric',
    outlook: 'High Volatility',
    legsCount: 2,
    riskType: 'Defined',
    bias: 'Bearish',
    description: 'Buy 1 ATM Call and buy 2 ATM Puts. Volatility play heavily biased to downside crashes with upside protection.',
    idealIV: 'Low (Buy Premium)',
    maxProfit: 'Substantial on crash; Unlimited on rally',
    maxLoss: 'Total Premium Paid',
    breakevenFormula: 'Upper: Strike + Total Debit | Lower: Strike - (Total Debit / 2)',
    complexity: 'Intermediate',
  },
  {
    id: 'box-spread',
    name: 'Box Spread (4-Leg Arbitrage / Synthetic Loan)',
    category: 'Ratio & Asymmetric',
    outlook: 'Neutral',
    legsCount: 4,
    riskType: 'Defined',
    bias: 'Neutral',
    description: 'Bull Call Spread + Bear Put Spread at same strikes. Value at expiration is strictly the strike width. Used as synthetic zero-coupon cash loan.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Spread Width - Net Debit Paid (or Net Credit - Spread Width)',
    maxLoss: 'Guaranteed risk-free synthetic cash loan return',
    breakevenFormula: 'Strictly deterministic (Strike difference)',
    complexity: 'Master',
  },
  {
    id: 'risk-reversal',
    name: 'Risk Reversal (Cylinder / Tunnel)',
    category: 'Ratio & Asymmetric',
    outlook: 'Bullish',
    legsCount: 2,
    riskType: 'Undefined',
    bias: 'Bullish',
    description: 'Buy OTM Call and sell OTM Put. Institutional directional trade funded by short put premium for zero initial cash outlay.',
    idealIV: 'Neutral / Any',
    maxProfit: 'Unlimited above long call strike',
    maxLoss: 'Short Put Strike + Net Cost (Substantial to 0)',
    breakevenFormula: 'Long Call Strike + Net Debit or Short Put Strike - Net Credit',
    complexity: 'Intermediate',
  },
];

/**
 * Robust Dynamic Generator for ALL Options Strategies
 * Takes current ticker, active chain, and optional full chain array (for calendars/diagonals)
 * and generates clean, accurate TradeLeg[]
 */
export function generateStrategyLegs(
  strategyId: string,
  ticker: Ticker,
  currentChain: ExpirationOptionChain,
  allChains?: ExpirationOptionChain[]
): TradeLeg[] {
  const S = ticker.price;
  const calls = currentChain.calls;
  const puts = currentChain.puts;
  const dte = currentChain.dte;
  const exp = currentChain.formattedDate;
  const mult = ticker.multiplier || (ticker.assetType === 'future' ? (ticker.symbol === '/CL' ? 1000 : 50) : 100);

  // Find closest ATM strike index
  let atmIdx = 0;
  let minDiff = Infinity;
  calls.forEach((c, idx) => {
    const diff = Math.abs(c.strike - S);
    if (diff < minDiff) {
      minDiff = diff;
      atmIdx = idx;
    }
  });

  const getCall = (offset: number) => {
    const idx = Math.max(0, Math.min(calls.length - 1, atmIdx + offset));
    return calls[idx];
  };

  const getPut = (offset: number) => {
    const idx = Math.max(0, Math.min(puts.length - 1, atmIdx + offset));
    return puts[idx];
  };

  // Find back-month chain for calendars / diagonals if available
  const futureChains = allChains ? allChains.filter((ch) => ch.dte > dte + 7) : [];
  const backChain =
    futureChains.length > 0
      ? futureChains[0]
      : (allChains && allChains.length > 1 ? allChains[allChains.length - 1] : currentChain);
  
  const isSyntheticBackMonth = !backChain || backChain.dte <= dte;
  const backDte = isSyntheticBackMonth ? dte + 35 : backChain.dte;
  const backExp = isSyntheticBackMonth ? `${exp} (+35d Back)` : backChain.formattedDate;

  const getBackCall = (offset: number) => {
    let bIdx = 0;
    let bMinDiff = Infinity;
    const searchChain = isSyntheticBackMonth ? currentChain : backChain;
    searchChain.calls.forEach((c, idx) => {
      const diff = Math.abs(c.strike - S);
      if (diff < bMinDiff) {
        bMinDiff = diff;
        bIdx = idx;
      }
    });
    const idx = Math.max(0, Math.min(searchChain.calls.length - 1, bIdx + offset));
    const baseContract = searchChain.calls[idx];
    if (isSyntheticBackMonth) {
      // Model back-month call with contango IV (+3.5%) and additional DTE
      const backIv = baseContract.iv ? baseContract.iv * 1.035 : (ticker.currentIV || 0.25) * 1.035;
      const bsm = calculateBSM(S, baseContract.strike, backDte / 365, backIv, 'call');
      const theoPrice = Number(bsm.price.toFixed(2));
      return {
        ...baseContract,
        dte: backDte,
        iv: Number(backIv.toFixed(4)),
        bid: Number(Math.max(0.01, theoPrice * 0.98).toFixed(2)),
        ask: Number(Math.max(0.05, theoPrice * 1.02).toFixed(2)),
        last: theoPrice,
      };
    }
    return baseContract;
  };

  const getBackPut = (offset: number) => {
    let bIdx = 0;
    let bMinDiff = Infinity;
    const searchChain = isSyntheticBackMonth ? currentChain : backChain;
    searchChain.puts.forEach((p, idx) => {
      const diff = Math.abs(p.strike - S);
      if (diff < bMinDiff) {
        bMinDiff = diff;
        bIdx = idx;
      }
    });
    const idx = Math.max(0, Math.min(searchChain.puts.length - 1, bIdx + offset));
    const baseContract = searchChain.puts[idx];
    if (isSyntheticBackMonth) {
      const backIv = baseContract.iv ? baseContract.iv * 1.035 : (ticker.currentIV || 0.25) * 1.035;
      const bsm = calculateBSM(S, baseContract.strike, backDte / 365, backIv, 'put');
      const theoPrice = Number(bsm.price.toFixed(2));
      return {
        ...baseContract,
        dte: backDte,
        iv: Number(backIv.toFixed(4)),
        bid: Number(Math.max(0.01, theoPrice * 0.98).toFixed(2)),
        ask: Number(Math.max(0.05, theoPrice * 1.02).toFixed(2)),
        last: theoPrice,
      };
    }
    return baseContract;
  };

  const ts = Date.now();

  switch (strategyId) {
    // ------------------- SINGLE -------------------
    case 'long-call': {
      const c = getCall(0);
      return [
        {
          id: `leg-lc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'short-call': {
      const c = getCall(1);
      return [
        {
          id: `leg-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.bid || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-put': {
      const p = getPut(0);
      return [
        {
          id: `leg-lp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'cash-secured-put': {
      const p = getPut(-1);
      return [
        {
          id: `leg-csp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.bid || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // ------------------- VERTICAL SPREADS -------------------
    case 'bull-call-spread': {
      const buyC = getCall(-1);
      const sellC = getCall(2);
      return [
        {
          id: `leg-bcs-1-${ts}`,
          type: 'call',
          action: 'buy',
          strike: buyC.strike,
          expiration: exp,
          dte,
          iv: buyC.iv,
          premium: buyC.ask || buyC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bcs-2-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sellC.strike,
          expiration: exp,
          dte,
          iv: sellC.iv,
          premium: sellC.bid || sellC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'bear-call-spread': {
      const sellC = getCall(1);
      const buyC = getCall(3);
      return [
        {
          id: `leg-becl-sell-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sellC.strike,
          expiration: exp,
          dte,
          iv: sellC.iv,
          premium: sellC.bid || sellC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-becl-buy-${ts}`,
          type: 'call',
          action: 'buy',
          strike: buyC.strike,
          expiration: exp,
          dte,
          iv: buyC.iv,
          premium: buyC.ask || buyC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'bull-put-spread': {
      const sellP = getPut(-1);
      const buyP = getPut(-3);
      return [
        {
          id: `leg-bupt-sell-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sellP.strike,
          expiration: exp,
          dte,
          iv: sellP.iv,
          premium: sellP.bid || sellP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bupt-buy-${ts}`,
          type: 'put',
          action: 'buy',
          strike: buyP.strike,
          expiration: exp,
          dte,
          iv: buyP.iv,
          premium: buyP.ask || buyP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'bear-put-spread': {
      const buyP = getPut(1);
      const sellP = getPut(-2);
      return [
        {
          id: `leg-bps-buy-${ts}`,
          type: 'put',
          action: 'buy',
          strike: buyP.strike,
          expiration: exp,
          dte,
          iv: buyP.iv,
          premium: buyP.ask || buyP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bps-sell-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sellP.strike,
          expiration: exp,
          dte,
          iv: sellP.iv,
          premium: sellP.bid || sellP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // ------------------- STRADDLES & STRANGLES -------------------
    case 'long-straddle': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        {
          id: `leg-strd-c-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-strd-p-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'short-straddle': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        {
          id: `leg-sstrd-c-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.bid || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-sstrd-p-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.bid || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-strangle': {
      const p = getPut(-2);
      const c = getCall(2);
      return [
        {
          id: `leg-strg-p-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-strg-c-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'short-strangle': {
      const p = getPut(-2);
      const c = getCall(2);
      return [
        {
          id: `leg-sstrg-p-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.bid || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-sstrg-c-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.bid || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-guts': {
      const c = getCall(-2); // ITM call
      const p = getPut(2); // ITM put
      return [
        {
          id: `leg-lguts-c-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lguts-p-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'short-guts': {
      const c = getCall(-2);
      const p = getPut(2);
      return [
        {
          id: `leg-sguts-c-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.bid || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-sguts-p-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.bid || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // ------------------- CONDORS & BUTTERFLIES -------------------
    case 'iron-condor': {
      const lp = getPut(-4);
      const sp = getPut(-2);
      const sc = getCall(2);
      const lc = getCall(4);
      return [
        {
          id: `leg-ic-lp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: lp.strike,
          expiration: exp,
          dte,
          iv: lp.iv,
          premium: lp.ask || lp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ic-sp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sp.strike,
          expiration: exp,
          dte,
          iv: sp.iv,
          premium: sp.bid || sp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ic-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sc.strike,
          expiration: exp,
          dte,
          iv: sc.iv,
          premium: sc.bid || sc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ic-lc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lc.strike,
          expiration: exp,
          dte,
          iv: lc.iv,
          premium: lc.ask || lc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'reverse-iron-condor': {
      const sp = getPut(-4);
      const lp = getPut(-2);
      const lc = getCall(2);
      const sc = getCall(4);
      return [
        {
          id: `leg-ric-sp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sp.strike,
          expiration: exp,
          dte,
          iv: sp.iv,
          premium: sp.bid || sp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ric-lp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: lp.strike,
          expiration: exp,
          dte,
          iv: lp.iv,
          premium: lp.ask || lp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ric-lc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lc.strike,
          expiration: exp,
          dte,
          iv: lc.iv,
          premium: lc.ask || lc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ric-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sc.strike,
          expiration: exp,
          dte,
          iv: sc.iv,
          premium: sc.bid || sc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'iron-butterfly': {
      const lp = getPut(-3);
      const sp = getPut(0);
      const sc = getCall(0);
      const lc = getCall(3);
      return [
        {
          id: `leg-ib-lp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: lp.strike,
          expiration: exp,
          dte,
          iv: lp.iv,
          premium: lp.ask || lp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ib-sp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sp.strike,
          expiration: exp,
          dte,
          iv: sp.iv,
          premium: sp.bid || sp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ib-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sc.strike,
          expiration: exp,
          dte,
          iv: sc.iv,
          premium: sc.bid || sc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ib-lc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lc.strike,
          expiration: exp,
          dte,
          iv: lc.iv,
          premium: lc.ask || lc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'reverse-iron-butterfly': {
      const sp = getPut(-3);
      const lp = getPut(0);
      const lc = getCall(0);
      const sc = getCall(3);
      return [
        {
          id: `leg-rib-sp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sp.strike,
          expiration: exp,
          dte,
          iv: sp.iv,
          premium: sp.bid || sp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-rib-lp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: lp.strike,
          expiration: exp,
          dte,
          iv: lp.iv,
          premium: lp.ask || lp.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-rib-lc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lc.strike,
          expiration: exp,
          dte,
          iv: lc.iv,
          premium: lc.ask || lc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-rib-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sc.strike,
          expiration: exp,
          dte,
          iv: sc.iv,
          premium: sc.bid || sc.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-call-butterfly': {
      const lowerC = getCall(-2);
      const midC = getCall(0);
      const upperC = getCall(2);
      return [
        {
          id: `leg-lcb-1-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lowerC.strike,
          expiration: exp,
          dte,
          iv: lowerC.iv,
          premium: lowerC.ask || lowerC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lcb-2-${ts}`,
          type: 'call',
          action: 'sell',
          strike: midC.strike,
          expiration: exp,
          dte,
          iv: midC.iv,
          premium: midC.bid || midC.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lcb-3-${ts}`,
          type: 'call',
          action: 'buy',
          strike: upperC.strike,
          expiration: exp,
          dte,
          iv: upperC.iv,
          premium: upperC.ask || upperC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-put-butterfly': {
      const lowerP = getPut(-2);
      const midP = getPut(0);
      const upperP = getPut(2);
      return [
        {
          id: `leg-lpb-1-${ts}`,
          type: 'put',
          action: 'buy',
          strike: lowerP.strike,
          expiration: exp,
          dte,
          iv: lowerP.iv,
          premium: lowerP.ask || lowerP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lpb-2-${ts}`,
          type: 'put',
          action: 'sell',
          strike: midP.strike,
          expiration: exp,
          dte,
          iv: midP.iv,
          premium: midP.bid || midP.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lpb-3-${ts}`,
          type: 'put',
          action: 'buy',
          strike: upperP.strike,
          expiration: exp,
          dte,
          iv: upperP.iv,
          premium: upperP.ask || upperP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'short-call-butterfly': {
      const lowerC = getCall(-2);
      const midC = getCall(0);
      const upperC = getCall(2);
      return [
        {
          id: `leg-scb-1-${ts}`,
          type: 'call',
          action: 'sell',
          strike: lowerC.strike,
          expiration: exp,
          dte,
          iv: lowerC.iv,
          premium: lowerC.bid || lowerC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-scb-2-${ts}`,
          type: 'call',
          action: 'buy',
          strike: midC.strike,
          expiration: exp,
          dte,
          iv: midC.iv,
          premium: midC.ask || midC.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-scb-3-${ts}`,
          type: 'call',
          action: 'sell',
          strike: upperC.strike,
          expiration: exp,
          dte,
          iv: upperC.iv,
          premium: upperC.bid || upperC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'broken-wing-call-butterfly': {
      const lowerC = getCall(0); // Buy ATM
      const midC = getCall(2); // Sell 2 OTM
      const upperC = getCall(5); // Buy 1 far OTM (skipping 1 strike)
      return [
        {
          id: `leg-bwb-c1-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lowerC.strike,
          expiration: exp,
          dte,
          iv: lowerC.iv,
          premium: lowerC.ask || lowerC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bwb-c2-${ts}`,
          type: 'call',
          action: 'sell',
          strike: midC.strike,
          expiration: exp,
          dte,
          iv: midC.iv,
          premium: midC.bid || midC.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bwb-c3-${ts}`,
          type: 'call',
          action: 'buy',
          strike: upperC.strike,
          expiration: exp,
          dte,
          iv: upperC.iv,
          premium: upperC.ask || upperC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'broken-wing-put-butterfly': {
      const lowerP = getPut(-5); // Buy 1 far OTM skipping strike
      const midP = getPut(-2); // Sell 2 OTM
      const upperP = getPut(0); // Buy 1 ATM
      return [
        {
          id: `leg-bwb-p1-${ts}`,
          type: 'put',
          action: 'buy',
          strike: upperP.strike,
          expiration: exp,
          dte,
          iv: upperP.iv,
          premium: upperP.ask || upperP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bwb-p2-${ts}`,
          type: 'put',
          action: 'sell',
          strike: midP.strike,
          expiration: exp,
          dte,
          iv: midP.iv,
          premium: midP.bid || midP.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-bwb-p3-${ts}`,
          type: 'put',
          action: 'buy',
          strike: lowerP.strike,
          expiration: exp,
          dte,
          iv: lowerP.iv,
          premium: lowerP.ask || lowerP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-call-condor': {
      const c1 = getCall(-3);
      const c2 = getCall(-1);
      const c3 = getCall(1);
      const c4 = getCall(3);
      return [
        {
          id: `leg-lcc-1-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c1.strike,
          expiration: exp,
          dte,
          iv: c1.iv,
          premium: c1.ask || c1.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lcc-2-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c2.strike,
          expiration: exp,
          dte,
          iv: c2.iv,
          premium: c2.bid || c2.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lcc-3-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c3.strike,
          expiration: exp,
          dte,
          iv: c3.iv,
          premium: c3.bid || c3.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lcc-4-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c4.strike,
          expiration: exp,
          dte,
          iv: c4.iv,
          premium: c4.ask || c4.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'long-put-condor': {
      const p1 = getPut(-3);
      const p2 = getPut(-1);
      const p3 = getPut(1);
      const p4 = getPut(3);
      return [
        {
          id: `leg-lpc-1-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p1.strike,
          expiration: exp,
          dte,
          iv: p1.iv,
          premium: p1.ask || p1.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lpc-2-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p2.strike,
          expiration: exp,
          dte,
          iv: p2.iv,
          premium: p2.bid || p2.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lpc-3-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p3.strike,
          expiration: exp,
          dte,
          iv: p3.iv,
          premium: p3.bid || p3.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-lpc-4-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p4.strike,
          expiration: exp,
          dte,
          iv: p4.iv,
          premium: p4.ask || p4.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // ------------------- CALENDAR & DIAGONAL SPREADS -------------------
    case 'call-calendar-spread': {
      const shortC = getCall(0); // Near term front-month ATM Call
      const longC = getBackCall(0); // Back month ATM Call
      return [
        {
          id: `leg-ccs-near-${ts}`,
          type: 'call',
          action: 'sell',
          strike: shortC.strike,
          expiration: exp,
          dte,
          iv: shortC.iv,
          premium: shortC.bid || shortC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-ccs-far-${ts}`,
          type: 'call',
          action: 'buy',
          strike: longC.strike,
          expiration: backExp,
          dte: backDte,
          iv: longC.iv,
          premium: longC.ask || longC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'put-calendar-spread': {
      const shortP = getPut(0);
      const longP = getBackPut(0);
      return [
        {
          id: `leg-pcs-near-${ts}`,
          type: 'put',
          action: 'sell',
          strike: shortP.strike,
          expiration: exp,
          dte,
          iv: shortP.iv,
          premium: shortP.bid || shortP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-pcs-far-${ts}`,
          type: 'put',
          action: 'buy',
          strike: longP.strike,
          expiration: backExp,
          dte: backDte,
          iv: longP.iv,
          premium: longP.ask || longP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'poor-mans-covered-call': {
      // Long deep ITM back-month call (~0.80 delta, 3 strikes below ATM)
      const longC = getBackCall(-4);
      // Short near-term OTM call (1-2 strikes above ATM)
      const shortC = getCall(1);
      return [
        {
          id: `leg-pmcc-long-${ts}`,
          type: 'call',
          action: 'buy',
          strike: longC.strike,
          expiration: backExp,
          dte: backDte,
          iv: longC.iv,
          premium: longC.ask || longC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-pmcc-short-${ts}`,
          type: 'call',
          action: 'sell',
          strike: shortC.strike,
          expiration: exp,
          dte,
          iv: shortC.iv,
          premium: shortC.bid || shortC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'poor-mans-covered-put': {
      // Long deep ITM back-month put (~0.80 delta, 3 strikes above ATM)
      const longP = getBackPut(4);
      // Short near-term OTM put (1-2 strikes below ATM)
      const shortP = getPut(-1);
      return [
        {
          id: `leg-pmcp-long-${ts}`,
          type: 'put',
          action: 'buy',
          strike: longP.strike,
          expiration: backExp,
          dte: backDte,
          iv: longP.iv,
          premium: longP.ask || longP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-pmcp-short-${ts}`,
          type: 'put',
          action: 'sell',
          strike: shortP.strike,
          expiration: exp,
          dte,
          iv: shortP.iv,
          premium: shortP.bid || shortP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'double-calendar-spread': {
      const nearP = getPut(-2);
      const farP = getBackPut(-2);
      const nearC = getCall(2);
      const farC = getBackCall(2);
      return [
        {
          id: `leg-dc-np-${ts}`,
          type: 'put',
          action: 'sell',
          strike: nearP.strike,
          expiration: exp,
          dte,
          iv: nearP.iv,
          premium: nearP.bid || nearP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-dc-fp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: farP.strike,
          expiration: backExp,
          dte: backDte,
          iv: farP.iv,
          premium: farP.ask || farP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-dc-nc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: nearC.strike,
          expiration: exp,
          dte,
          iv: nearC.iv,
          premium: nearC.bid || nearC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-dc-fc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: farC.strike,
          expiration: backExp,
          dte: backDte,
          iv: farC.iv,
          premium: farC.ask || farC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'double-diagonal-spread': {
      const nearP = getPut(-2);
      const farP = getBackPut(-3);
      const nearC = getCall(2);
      const farC = getBackCall(3);
      return [
        {
          id: `leg-dd-np-${ts}`,
          type: 'put',
          action: 'sell',
          strike: nearP.strike,
          expiration: exp,
          dte,
          iv: nearP.iv,
          premium: nearP.bid || nearP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-dd-fp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: farP.strike,
          expiration: backExp,
          dte: backDte,
          iv: farP.iv,
          premium: farP.ask || farP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-dd-nc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: nearC.strike,
          expiration: exp,
          dte,
          iv: nearC.iv,
          premium: nearC.bid || nearC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-dd-fc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: farC.strike,
          expiration: backExp,
          dte: backDte,
          iv: farC.iv,
          premium: farC.ask || farC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // ------------------- COVERED & SYNTHETICS -------------------
    case 'covered-call': {
      const otmCall = getCall(1);
      return [
        {
          id: `leg-cc-stock-${ts}`,
          type: 'stock',
          action: 'buy',
          strike: Number(S.toFixed(2)),
          expiration: 'Perpetual',
          dte: 0,
          iv: 0,
          premium: Number(S.toFixed(2)),
          contracts: 100,
          multiplier: 1,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-cc-call-${ts}`,
          type: 'call',
          action: 'sell',
          strike: otmCall.strike,
          expiration: exp,
          dte,
          iv: otmCall.iv,
          premium: otmCall.bid || otmCall.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'protective-put': {
      const otmPut = getPut(-1);
      return [
        {
          id: `leg-pp-stock-${ts}`,
          type: 'stock',
          action: 'buy',
          strike: Number(S.toFixed(2)),
          expiration: 'Perpetual',
          dte: 0,
          iv: 0,
          premium: Number(S.toFixed(2)),
          contracts: 100,
          multiplier: 1,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-pp-put-${ts}`,
          type: 'put',
          action: 'buy',
          strike: otmPut.strike,
          expiration: exp,
          dte,
          iv: otmPut.iv,
          premium: otmPut.ask || otmPut.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'collar': {
      const otmPut = getPut(-2);
      const otmCall = getCall(2);
      return [
        {
          id: `leg-col-stock-${ts}`,
          type: 'stock',
          action: 'buy',
          strike: Number(S.toFixed(2)),
          expiration: 'Perpetual',
          dte: 0,
          iv: 0,
          premium: Number(S.toFixed(2)),
          contracts: 100,
          multiplier: 1,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-col-put-${ts}`,
          type: 'put',
          action: 'buy',
          strike: otmPut.strike,
          expiration: exp,
          dte,
          iv: otmPut.iv,
          premium: otmPut.ask || otmPut.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-col-call-${ts}`,
          type: 'call',
          action: 'sell',
          strike: otmCall.strike,
          expiration: exp,
          dte,
          iv: otmCall.iv,
          premium: otmCall.bid || otmCall.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'synthetic-long-stock': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        {
          id: `leg-synl-c-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-synl-p-${ts}`,
          type: 'put',
          action: 'sell',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.bid || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'synthetic-short-stock': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        {
          id: `leg-syns-c-${ts}`,
          type: 'call',
          action: 'sell',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.bid || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-syns-p-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'covered-put': {
      const otmPut = getPut(-1);
      return [
        {
          id: `leg-covput-stock-${ts}`,
          type: 'stock',
          action: 'sell',
          strike: Number(S.toFixed(2)),
          expiration: 'Perpetual',
          dte: 0,
          iv: 0,
          premium: Number(S.toFixed(2)),
          contracts: 100,
          multiplier: 1,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-covput-put-${ts}`,
          type: 'put',
          action: 'sell',
          strike: otmPut.strike,
          expiration: exp,
          dte,
          iv: otmPut.iv,
          premium: otmPut.bid || otmPut.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // ------------------- RATIO & ASYMMETRIC / EXOTICS -------------------
    case 'jade-lizard': {
      // Sell OTM put + bear call spread
      const shortP = getPut(-3);
      const shortC = getCall(2);
      const longC = getCall(4);
      return [
        {
          id: `leg-jl-sp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: shortP.strike,
          expiration: exp,
          dte,
          iv: shortP.iv,
          premium: shortP.bid || shortP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-jl-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: shortC.strike,
          expiration: exp,
          dte,
          iv: shortC.iv,
          premium: shortC.bid || shortC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-jl-lc-${ts}`,
          type: 'call',
          action: 'buy',
          strike: longC.strike,
          expiration: exp,
          dte,
          iv: longC.iv,
          premium: longC.ask || longC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'reverse-jade-lizard': {
      // Sell OTM call + bull put spread
      const shortC = getCall(3);
      const shortP = getPut(-2);
      const longP = getPut(-4);
      return [
        {
          id: `leg-rjl-sc-${ts}`,
          type: 'call',
          action: 'sell',
          strike: shortC.strike,
          expiration: exp,
          dte,
          iv: shortC.iv,
          premium: shortC.bid || shortC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-rjl-sp-${ts}`,
          type: 'put',
          action: 'sell',
          strike: shortP.strike,
          expiration: exp,
          dte,
          iv: shortP.iv,
          premium: shortP.bid || shortP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-rjl-lp-${ts}`,
          type: 'put',
          action: 'buy',
          strike: longP.strike,
          expiration: exp,
          dte,
          iv: longP.iv,
          premium: longP.ask || longP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'call-ratio-front-spread': {
      const buyC = getCall(0);
      const sellC = getCall(2);
      return [
        {
          id: `leg-crfs-buy-${ts}`,
          type: 'call',
          action: 'buy',
          strike: buyC.strike,
          expiration: exp,
          dte,
          iv: buyC.iv,
          premium: buyC.ask || buyC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-crfs-sell-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sellC.strike,
          expiration: exp,
          dte,
          iv: sellC.iv,
          premium: sellC.bid || sellC.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'put-ratio-front-spread': {
      const buyP = getPut(0);
      const sellP = getPut(-2);
      return [
        {
          id: `leg-prfs-buy-${ts}`,
          type: 'put',
          action: 'buy',
          strike: buyP.strike,
          expiration: exp,
          dte,
          iv: buyP.iv,
          premium: buyP.ask || buyP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-prfs-sell-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sellP.strike,
          expiration: exp,
          dte,
          iv: sellP.iv,
          premium: sellP.bid || sellP.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'call-ratio-backspread': {
      const sellC = getCall(0);
      const buyC = getCall(2);
      return [
        {
          id: `leg-crbs-sell-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sellC.strike,
          expiration: exp,
          dte,
          iv: sellC.iv,
          premium: sellC.bid || sellC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-crbs-buy-${ts}`,
          type: 'call',
          action: 'buy',
          strike: buyC.strike,
          expiration: exp,
          dte,
          iv: buyC.iv,
          premium: buyC.ask || buyC.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'put-ratio-backspread': {
      const sellP = getPut(0);
      const buyP = getPut(-2);
      return [
        {
          id: `leg-prbs-sell-${ts}`,
          type: 'put',
          action: 'sell',
          strike: sellP.strike,
          expiration: exp,
          dte,
          iv: sellP.iv,
          premium: sellP.bid || sellP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-prbs-buy-${ts}`,
          type: 'put',
          action: 'buy',
          strike: buyP.strike,
          expiration: exp,
          dte,
          iv: buyP.iv,
          premium: buyP.ask || buyP.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'strap': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        {
          id: `leg-strap-c-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-strap-p-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'strip': {
      const c = getCall(0);
      const p = getPut(0);
      return [
        {
          id: `leg-strip-c-${ts}`,
          type: 'call',
          action: 'buy',
          strike: c.strike,
          expiration: exp,
          dte,
          iv: c.iv,
          premium: c.ask || c.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-strip-p-${ts}`,
          type: 'put',
          action: 'buy',
          strike: p.strike,
          expiration: exp,
          dte,
          iv: p.iv,
          premium: p.ask || p.last,
          contracts: 2,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'box-spread': {
      const lowerC = getCall(-2);
      const upperC = getCall(2);
      const lowerP = getPut(-2);
      const upperP = getPut(2);
      return [
        {
          id: `leg-box-bc1-${ts}`,
          type: 'call',
          action: 'buy',
          strike: lowerC.strike,
          expiration: exp,
          dte,
          iv: lowerC.iv,
          premium: lowerC.ask || lowerC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-box-sc2-${ts}`,
          type: 'call',
          action: 'sell',
          strike: upperC.strike,
          expiration: exp,
          dte,
          iv: upperC.iv,
          premium: upperC.bid || upperC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-box-bp1-${ts}`,
          type: 'put',
          action: 'buy',
          strike: upperP.strike,
          expiration: exp,
          dte,
          iv: upperP.iv,
          premium: upperP.ask || upperP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-box-sp2-${ts}`,
          type: 'put',
          action: 'sell',
          strike: lowerP.strike,
          expiration: exp,
          dte,
          iv: lowerP.iv,
          premium: lowerP.bid || lowerP.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
    case 'risk-reversal': {
      const otmPut = getPut(-2);
      const otmCall = getCall(2);
      return [
        {
          id: `leg-rr-put-${ts}`,
          type: 'put',
          action: 'sell',
          strike: otmPut.strike,
          expiration: exp,
          dte,
          iv: otmPut.iv,
          premium: otmPut.bid || otmPut.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-rr-call-${ts}`,
          type: 'call',
          action: 'buy',
          strike: otmCall.strike,
          expiration: exp,
          dte,
          iv: otmCall.iv,
          premium: otmCall.ask || otmCall.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }

    // Default: Return Bull Call Spread as standard baseline
    default: {
      const buyC = getCall(-1);
      const sellC = getCall(2);
      return [
        {
          id: `leg-def-1-${ts}`,
          type: 'call',
          action: 'buy',
          strike: buyC.strike,
          expiration: exp,
          dte,
          iv: buyC.iv,
          premium: buyC.ask || buyC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
        {
          id: `leg-def-2-${ts}`,
          type: 'call',
          action: 'sell',
          strike: sellC.strike,
          expiration: exp,
          dte,
          iv: sellC.iv,
          premium: sellC.bid || sellC.last,
          contracts: 1,
          multiplier: mult,
          underlyingSymbol: ticker.symbol,
        },
      ];
    }
  }
}
