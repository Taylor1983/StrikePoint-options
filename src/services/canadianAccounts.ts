import { Position, Order, TradeLeg } from '../types/options';

export type CanadianAccountType =
  | 'TFSA'
  | 'RRSP'
  | 'FHSA'
  | 'RESP'
  | 'MARGIN_CAD'
  | 'MARGIN_USD'
  | 'CORPORATE';

export interface CRAContributionRoom {
  annualLimit: number;
  usedThisYear: number;
  availableRoom: number;
  lifetimeLimit?: number;
  notes: string;
}

export interface CanadianAccount {
  id: string;
  name: string;
  code: CanadianAccountType;
  accountNumber: string;
  institution: string; // e.g. Questrade, TD Direct Investing, Wealthsimple, RBC Direct Investing, Interactive Brokers
  currency: 'CAD' | 'USD';
  cashBalance: number;
  cashBalanceCad?: number; // Dedicated CAD sub-account cash
  cashBalanceUsd?: number; // Dedicated USD sub-account cash
  startingBalance: number;
  realizedPnL: number;
  positions: Position[];
  orders: Order[];
  optionsLevel: 1 | 2 | 3 | 4;
  optionsLevelLabel: string;
  isRegistered: boolean;
  marginAllowed: boolean;
  craContributionRoom?: CRAContributionRoom;
  taxStatusDescription: string;
  usWithholdingTaxNote: string;
  color: string;
  badge: string;
}

/**
 * Standard CAD/USD Foreign Exchange Rate
 * 1 USD = 1.3650 CAD (or 1 CAD = 0.7326 USD)
 */
export const USDCAD_EXCHANGE_RATE = 1.3650;

/**
 * Convert amounts between CAD and USD
 */
export function convertCurrency(
  amount: number,
  from: 'CAD' | 'USD',
  to: 'CAD' | 'USD',
  rate: number = USDCAD_EXCHANGE_RATE
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'CAD') return amount * rate;
  return amount / rate;
}

/**
 * Initial Multi-Account Suite for Canadian Investors
 */
export const INITIAL_CANADIAN_ACCOUNTS: CanadianAccount[] = [
  // 1. TFSA - Tax-Free Savings Account
  {
    id: 'act-tfsa',
    name: 'Tax-Free Savings Account (TFSA)',
    code: 'TFSA',
    accountNumber: 'TFA-984-2104',
    institution: 'Questrade Canada',
    currency: 'CAD',
    cashBalance: 14850.0,
    cashBalanceCad: 14850.0,
    cashBalanceUsd: 1250.0,
    startingBalance: 65000.0,
    realizedPnL: 3450.0,
    optionsLevel: 2,
    optionsLevelLabel: 'Level 2: Long Calls, Long Puts & Covered Calls (CRA Cash Account)',
    isRegistered: true,
    marginAllowed: false,
    color: '#00d2ff',
    badge: '🇨🇦 TFSA · TAX-FREE',
    craContributionRoom: {
      annualLimit: 7000,
      usedThisYear: 4500,
      availableRoom: 2500,
      lifetimeLimit: 95000,
      notes: '2026 CRA annual limit: $7,000 CAD. Cumulative room: $95,000 CAD. 100% tax-free growth and withdrawals.',
    },
    taxStatusDescription: '100% Tax-Exempt on capital gains, Canadian dividends, and covered call option premiums under Section 146.2 of the Income Tax Act.',
    usWithholdingTaxNote: '15% IRS non-resident withholding tax applies to US dividends (unrecoverable in TFSA as foreign tax credit cannot be claimed).',
    orders: [
      {
        id: 'ord-tfsa-1',
        timestamp: '09:32:15',
        ticker: 'RY.TO',
        strategyName: 'Covered Call (RY.TO)',
        type: 'limit',
        limitPrice: 2.15,
        legs: [
          {
            id: 'leg-tfsa-ry-call',
            type: 'call',
            action: 'sell',
            strike: 170.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.16,
            premium: 2.15,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'RY.TO',
          },
        ],
        contracts: 1,
        netDebitCredit: -215.0,
        totalCost: 215.0,
        status: 'filled',
        assetCategory: 'option',
      },
    ],
    positions: [
      {
        id: 'pos-tfsa-ry',
        ticker: 'RY.TO',
        strategyName: 'Covered Call (150 shs + Short 170C)',
        openedAt: '09:32:15',
        contracts: 150,
        entryCost: 24200.0,
        currentMark: 25150.0,
        unrealizedPnL: 950.0,
        unrealizedPnLPercent: 3.93,
        assetCategory: 'stock',
        sharesOrContracts: 150,
        legs: [
          {
            id: 'leg-tfsa-ry-stk',
            type: 'stock',
            action: 'buy',
            strike: 161.33,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 161.33,
            contracts: 150,
            multiplier: 1,
            underlyingSymbol: 'RY.TO',
          },
          {
            id: 'leg-tfsa-ry-c',
            type: 'call',
            action: 'sell',
            strike: 170.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.16,
            premium: 2.15,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'RY.TO',
          },
        ],
      },
      {
        id: 'pos-tfsa-enb',
        ticker: 'ENB.TO',
        strategyName: 'Long Stock (200 shs)',
        openedAt: '10:05:40',
        contracts: 200,
        entryCost: 10600.0,
        currentMark: 10960.0,
        unrealizedPnL: 360.0,
        unrealizedPnLPercent: 3.4,
        assetCategory: 'stock',
        sharesOrContracts: 200,
        legs: [
          {
            id: 'leg-tfsa-enb-stk',
            type: 'stock',
            action: 'buy',
            strike: 53.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 53.0,
            contracts: 200,
            multiplier: 1,
            underlyingSymbol: 'ENB.TO',
          },
        ],
      },
      {
        id: 'pos-tfsa-shop',
        ticker: 'SHOP.TO',
        strategyName: 'Long Call Option (100 shs exposure)',
        openedAt: '11:15:20',
        contracts: 1,
        entryCost: 680.0,
        currentMark: 920.0,
        unrealizedPnL: 240.0,
        unrealizedPnLPercent: 35.29,
        assetCategory: 'option',
        sharesOrContracts: 1,
        legs: [
          {
            id: 'leg-tfsa-shop-c',
            type: 'call',
            action: 'buy',
            strike: 110.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.42,
            premium: 6.8,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'SHOP.TO',
          },
        ],
      },
    ],
  },

  // 2. RRSP - Registered Retirement Savings Plan
  {
    id: 'act-rrsp',
    name: 'Registered Retirement Savings Plan (RRSP)',
    code: 'RRSP',
    accountNumber: 'RSP-714-3829',
    institution: 'TD Direct Investing',
    currency: 'USD',
    cashBalance: 32400.0,
    cashBalanceCad: 8500.0,
    cashBalanceUsd: 32400.0,
    startingBalance: 120000.0,
    realizedPnL: 5800.0,
    optionsLevel: 2,
    optionsLevelLabel: 'Level 2: Long Calls, Long Puts & Covered Calls (US-Canada Treaty Optimized)',
    isRegistered: true,
    marginAllowed: false,
    color: '#00e676',
    badge: '🇨🇦 RRSP · RETIREMENT',
    craContributionRoom: {
      annualLimit: 31560,
      usedThisYear: 12000,
      availableRoom: 19560,
      notes: '2026 CRA maximum deduction limit: $31,560 CAD (or 18% of previous year earned income). Tax-deferred growth.',
    },
    taxStatusDescription: 'Tax-deferred until withdrawal. Contributions reduce taxable income in contribution year. Withdrawals taxed as regular income.',
    usWithholdingTaxNote: '✅ 0% Withholding Tax: US dividends are completely EXEMPT from 15% IRS withholding under US-Canada Income Tax Treaty (Article XXI). Ideal for US dividend stocks!',
    orders: [],
    positions: [
      {
        id: 'pos-rrsp-msft',
        ticker: 'MSFT',
        strategyName: 'Long Stock (100 shs)',
        openedAt: '09:35:00',
        contracts: 100,
        entryCost: 41500.0,
        currentMark: 42800.0,
        unrealizedPnL: 1300.0,
        unrealizedPnLPercent: 3.13,
        assetCategory: 'stock',
        sharesOrContracts: 100,
        legs: [
          {
            id: 'leg-rrsp-msft-stk',
            type: 'stock',
            action: 'buy',
            strike: 415.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 415.0,
            contracts: 100,
            multiplier: 1,
            underlyingSymbol: 'MSFT',
          },
        ],
      },
      {
        id: 'pos-rrsp-aapl',
        ticker: 'AAPL',
        strategyName: 'Covered Call (100 shs + Short 235C)',
        openedAt: '10:20:10',
        contracts: 100,
        entryCost: 22100.0,
        currentMark: 22780.0,
        unrealizedPnL: 680.0,
        unrealizedPnLPercent: 3.08,
        assetCategory: 'stock',
        sharesOrContracts: 100,
        legs: [
          {
            id: 'leg-rrsp-aapl-stk',
            type: 'stock',
            action: 'buy',
            strike: 225.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 225.0,
            contracts: 100,
            multiplier: 1,
            underlyingSymbol: 'AAPL',
          },
          {
            id: 'leg-rrsp-aapl-c',
            type: 'call',
            action: 'sell',
            strike: 235.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.22,
            premium: 4.0,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'AAPL',
          },
        ],
      },
      {
        id: 'pos-rrsp-spy',
        ticker: 'SPY',
        strategyName: 'Bull Call Debit Spread (+Δ)',
        openedAt: '11:45:00',
        contracts: 2,
        entryCost: 1420.0,
        currentMark: 1860.0,
        unrealizedPnL: 440.0,
        unrealizedPnLPercent: 30.99,
        assetCategory: 'option',
        sharesOrContracts: 2,
        legs: [
          {
            id: 'leg-rrsp-spy-c1',
            type: 'call',
            action: 'buy',
            strike: 565.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.145,
            premium: 12.5,
            contracts: 2,
            multiplier: 100,
            underlyingSymbol: 'SPY',
          },
          {
            id: 'leg-rrsp-spy-c2',
            type: 'call',
            action: 'sell',
            strike: 580.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.138,
            premium: 5.4,
            contracts: 2,
            multiplier: 100,
            underlyingSymbol: 'SPY',
          },
        ],
      },
    ],
  },

  // 3. FHSA - First Home Savings Account
  {
    id: 'act-fhsa',
    name: 'First Home Savings Account (FHSA)',
    code: 'FHSA',
    accountNumber: 'FHS-319-8472',
    institution: 'Wealthsimple Trade',
    currency: 'CAD',
    cashBalance: 8400.0,
    cashBalanceCad: 8400.0,
    cashBalanceUsd: 0.0,
    startingBalance: 24000.0,
    realizedPnL: 820.0,
    optionsLevel: 1,
    optionsLevelLabel: 'Level 1: Conservative Hedging & Covered Calls (Capital Preservation)',
    isRegistered: true,
    marginAllowed: false,
    color: '#ff9900',
    badge: '🇨🇦 FHSA · FIRST HOME',
    craContributionRoom: {
      annualLimit: 8000,
      usedThisYear: 8000,
      availableRoom: 0,
      lifetimeLimit: 40000,
      notes: 'Annual limit: $8,000 CAD | Lifetime limit: $40,000 CAD. Tax-deductible in, 100% tax-free out for qualifying home purchase.',
    },
    taxStatusDescription: 'Best of RRSP & TFSA: Contributions are tax-deductible, and qualifying withdrawals for down payment are 100% tax-free.',
    usWithholdingTaxNote: 'Subject to 15% IRS dividend withholding (similar to TFSA). Best held in Canadian index ETFs or high-yield cash instruments.',
    orders: [],
    positions: [
      {
        id: 'pos-fhsa-cash',
        ticker: 'CASH.TO',
        strategyName: 'High Interest Savings ETF (300 shs)',
        openedAt: '09:30:10',
        contracts: 300,
        entryCost: 15000.0,
        currentMark: 15060.0,
        unrealizedPnL: 60.0,
        unrealizedPnLPercent: 0.4,
        assetCategory: 'stock',
        sharesOrContracts: 300,
        legs: [
          {
            id: 'leg-fhsa-cash-stk',
            type: 'stock',
            action: 'buy',
            strike: 50.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 50.0,
            contracts: 300,
            multiplier: 1,
            underlyingSymbol: 'CASH.TO',
          },
        ],
      },
      {
        id: 'pos-fhsa-vfv',
        ticker: 'VFV.TO',
        strategyName: 'S&P 500 Index ETF CAD (50 shs)',
        openedAt: '10:12:00',
        contracts: 50,
        entryCost: 6750.0,
        currentMark: 6912.5,
        unrealizedPnL: 162.5,
        unrealizedPnLPercent: 2.41,
        assetCategory: 'stock',
        sharesOrContracts: 50,
        legs: [
          {
            id: 'leg-fhsa-vfv-stk',
            type: 'stock',
            action: 'buy',
            strike: 135.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 135.0,
            contracts: 50,
            multiplier: 1,
            underlyingSymbol: 'VFV.TO',
          },
        ],
      },
    ],
  },

  // 4. RESP - Registered Education Savings Plan
  {
    id: 'act-resp',
    name: 'Registered Education Savings Plan (RESP)',
    code: 'RESP',
    accountNumber: 'ESP-441-9023',
    institution: 'RBC Direct Investing',
    currency: 'CAD',
    cashBalance: 5200.0,
    cashBalanceCad: 5200.0,
    cashBalanceUsd: 0.0,
    startingBalance: 18000.0,
    realizedPnL: 640.0,
    optionsLevel: 1,
    optionsLevelLabel: 'Level 1: Covered Calls & Capital Preservation',
    isRegistered: true,
    marginAllowed: false,
    color: '#a855f7',
    badge: '🇨🇦 RESP · EDUCATION',
    craContributionRoom: {
      annualLimit: 5000,
      usedThisYear: 2500,
      availableRoom: 2500,
      lifetimeLimit: 50000,
      notes: 'No annual maximum contribution, but Canada Education Savings Grant (CESG 20%) matches up to $2,500/year ($500 grant). Lifetime limit $50,000.',
    },
    taxStatusDescription: 'Investment growth is tax-sheltered. Withdrawals are taxed in the student beneficiary hands (typically near zero tax bracket).',
    usWithholdingTaxNote: 'Subject to 15% US dividend withholding. CAD index funds and Canadian blue-chips recommended.',
    orders: [],
    positions: [
      {
        id: 'pos-resp-xiu',
        ticker: 'XIU.TO',
        strategyName: 'iShares S&P/TSX 60 Index (250 shs)',
        openedAt: '09:40:00',
        contracts: 250,
        entryCost: 8750.0,
        currentMark: 9100.0,
        unrealizedPnL: 350.0,
        unrealizedPnLPercent: 4.0,
        assetCategory: 'stock',
        sharesOrContracts: 250,
        legs: [
          {
            id: 'leg-resp-xiu-stk',
            type: 'stock',
            action: 'buy',
            strike: 35.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 35.0,
            contracts: 250,
            multiplier: 1,
            underlyingSymbol: 'XIU.TO',
          },
        ],
      },
      {
        id: 'pos-resp-cnq',
        ticker: 'CNQ.TO',
        strategyName: 'Canadian Natural Resources (100 shs)',
        openedAt: '10:30:00',
        contracts: 100,
        entryCost: 4600.0,
        currentMark: 4890.0,
        unrealizedPnL: 290.0,
        unrealizedPnLPercent: 6.3,
        assetCategory: 'stock',
        sharesOrContracts: 100,
        legs: [
          {
            id: 'leg-resp-cnq-stk',
            type: 'stock',
            action: 'buy',
            strike: 46.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 46.0,
            contracts: 100,
            multiplier: 1,
            underlyingSymbol: 'CNQ.TO',
          },
        ],
      },
    ],
  },

  // 5. CA Margin Account (Non-Registered Canadian CAD Margin)
  {
    id: 'act-margin-cad',
    name: 'Canadian CAD Margin Account (Non-Registered)',
    code: 'MARGIN_CAD',
    accountNumber: 'CA-MRG-882-9014',
    institution: 'Interactive Brokers Canada / TD Direct',
    currency: 'CAD',
    cashBalance: 125000.0,
    cashBalanceCad: 132450.0,
    cashBalanceUsd: -5457.88,
    startingBalance: 125000.0,
    realizedPnL: 4850.0,
    optionsLevel: 4,
    optionsLevelLabel: 'Level 4: CIRO Full Margin, Spreads, Montreal Exchange (MX) Options & TSX Equities',
    isRegistered: false,
    marginAllowed: true,
    color: '#ff334b',
    badge: '🇨🇦 CA$ MARGIN · TAXABLE',
    craContributionRoom: {
      annualLimit: Infinity,
      usedThisYear: 0,
      availableRoom: Infinity,
      notes: 'No CRA contribution ceilings. Full CIRO margin leverage, short selling, and Montreal Exchange (MX) multi-leg options approved.',
    },
    taxStatusDescription: 'Taxable non-registered CA$ account. Capital gains taxed at Canadian inclusion rate (50% up to $250k, 66.7% above). Margin borrowing interest expense is fully tax-deductible on CRA Line 22100 against Canadian investment income.',
    usWithholdingTaxNote: '100% Domestic Canadian Securities: 0% withholding tax on TSX dividends and Montreal Exchange (MX) option premiums. Eligible Canadian Dividend Tax Credit applies.',
    orders: [
      {
        id: 'ord-mrg-ry-1',
        timestamp: '09:35:12',
        ticker: 'RY.TO',
        strategyName: 'Covered Call (RY.TO)',
        type: 'limit',
        limitPrice: 2.45,
        legs: [
          {
            id: 'leg-mrg-ry-c',
            type: 'call',
            action: 'sell',
            strike: 170.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.158,
            premium: 2.45,
            contracts: 2,
            multiplier: 100,
            underlyingSymbol: 'RY.TO',
          },
        ],
        contracts: 2,
        netDebitCredit: -490.0,
        totalCost: 490.0,
        status: 'filled',
        assetCategory: 'option',
      },
    ],
    positions: [
      {
        id: 'pos-mrg-ry',
        ticker: 'RY.TO',
        strategyName: 'Covered Call (200 shs + Short 170C MX)',
        openedAt: '09:35:12',
        contracts: 200,
        entryCost: 32400.0,
        currentMark: 33500.0,
        unrealizedPnL: 1100.0,
        unrealizedPnLPercent: 3.40,
        assetCategory: 'stock',
        sharesOrContracts: 200,
        legs: [
          {
            id: 'leg-mrg-ry-stk',
            type: 'stock',
            action: 'buy',
            strike: 162.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 162.0,
            contracts: 200,
            multiplier: 1,
            underlyingSymbol: 'RY.TO',
          },
          {
            id: 'leg-mrg-ry-c',
            type: 'call',
            action: 'sell',
            strike: 170.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.158,
            premium: 2.45,
            contracts: 2,
            multiplier: 100,
            underlyingSymbol: 'RY.TO',
          },
        ],
      },
      {
        id: 'pos-mrg-td',
        ticker: 'TD.TO',
        strategyName: 'Long Stock (250 shs TSX)',
        openedAt: '09:42:00',
        contracts: 250,
        entryCost: 21375.0,
        currentMark: 22100.0,
        unrealizedPnL: 725.0,
        unrealizedPnLPercent: 3.39,
        assetCategory: 'stock',
        sharesOrContracts: 250,
        legs: [
          {
            id: 'leg-mrg-td-stk',
            type: 'stock',
            action: 'buy',
            strike: 85.5,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 85.5,
            contracts: 250,
            multiplier: 1,
            underlyingSymbol: 'TD.TO',
          },
        ],
      },
      {
        id: 'pos-mrg-shop-spread',
        ticker: 'SHOP.TO',
        strategyName: 'Bull Call Debit Spread (+105C / -115C MX)',
        openedAt: '10:15:30',
        contracts: 2,
        entryCost: 840.0,
        currentMark: 1260.0,
        unrealizedPnL: 420.0,
        unrealizedPnLPercent: 50.0,
        assetCategory: 'option',
        sharesOrContracts: 2,
        legs: [
          {
            id: 'leg-mrg-shop-c1',
            type: 'call',
            action: 'buy',
            strike: 105.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.395,
            premium: 8.4,
            contracts: 2,
            multiplier: 100,
            underlyingSymbol: 'SHOP.TO',
          },
          {
            id: 'leg-mrg-shop-c2',
            type: 'call',
            action: 'sell',
            strike: 115.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.385,
            premium: 4.2,
            contracts: 2,
            multiplier: 100,
            underlyingSymbol: 'SHOP.TO',
          },
        ],
      },
      {
        id: 'pos-mrg-enb-prot',
        ticker: 'ENB.TO',
        strategyName: 'Protective Collar / Hedged Stock (300 shs + Long 52.5P)',
        openedAt: '10:30:15',
        contracts: 300,
        entryCost: 16305.0,
        currentMark: 16785.0,
        unrealizedPnL: 480.0,
        unrealizedPnLPercent: 2.94,
        assetCategory: 'stock',
        sharesOrContracts: 300,
        legs: [
          {
            id: 'leg-mrg-enb-stk',
            type: 'stock',
            action: 'buy',
            strike: 53.2,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 53.2,
            contracts: 300,
            multiplier: 1,
            underlyingSymbol: 'ENB.TO',
          },
          {
            id: 'leg-mrg-enb-p',
            type: 'put',
            action: 'buy',
            strike: 52.5,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.148,
            premium: 1.15,
            contracts: 3,
            multiplier: 100,
            underlyingSymbol: 'ENB.TO',
          },
        ],
      },
      {
        id: 'pos-mrg-xiu-ic',
        ticker: 'XIU.TO',
        strategyName: 'TSX 60 Iron Condor (35P/36P/38C/39C MX)',
        openedAt: '11:05:00',
        contracts: 3,
        entryCost: -225.0,
        currentMark: 120.0,
        unrealizedPnL: 105.0,
        unrealizedPnLPercent: 46.67,
        assetCategory: 'option',
        sharesOrContracts: 3,
        legs: [
          {
            id: 'leg-mrg-xiu-p1',
            type: 'put',
            action: 'buy',
            strike: 35.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.135,
            premium: 0.45,
            contracts: 3,
            multiplier: 100,
            underlyingSymbol: 'XIU.TO',
          },
          {
            id: 'leg-mrg-xiu-p2',
            type: 'put',
            action: 'sell',
            strike: 36.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.128,
            premium: 0.85,
            contracts: 3,
            multiplier: 100,
            underlyingSymbol: 'XIU.TO',
          },
          {
            id: 'leg-mrg-xiu-c1',
            type: 'call',
            action: 'sell',
            strike: 38.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.125,
            premium: 0.75,
            contracts: 3,
            multiplier: 100,
            underlyingSymbol: 'XIU.TO',
          },
          {
            id: 'leg-mrg-xiu-c2',
            type: 'call',
            action: 'buy',
            strike: 39.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0.13,
            premium: 0.4,
            contracts: 3,
            multiplier: 100,
            underlyingSymbol: 'XIU.TO',
          },
        ],
      },
      {
        id: 'pos-mrg-cnq-stk',
        ticker: 'CNQ.TO',
        strategyName: 'Long Stock (200 shs TSX)',
        openedAt: '11:30:00',
        contracts: 200,
        entryCost: 9500.0,
        currentMark: 9840.0,
        unrealizedPnL: 340.0,
        unrealizedPnLPercent: 3.58,
        assetCategory: 'stock',
        sharesOrContracts: 200,
        legs: [
          {
            id: 'leg-mrg-cnq-leg',
            type: 'stock',
            action: 'buy',
            strike: 47.5,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 47.5,
            contracts: 200,
            multiplier: 1,
            underlyingSymbol: 'CNQ.TO',
          },
        ],
      },
      {
        id: 'pos-mrg-spy-us',
        ticker: 'SPY',
        strategyName: 'Long Stock (20 shs NYSE Arca)',
        openedAt: '11:45:00',
        contracts: 20,
        entryCost: 11200.0,
        currentMark: 11365.0,
        unrealizedPnL: 165.0,
        unrealizedPnLPercent: 1.47,
        assetCategory: 'stock',
        sharesOrContracts: 20,
        legs: [
          {
            id: 'leg-mrg-spy-stk',
            type: 'stock',
            action: 'buy',
            strike: 560.0,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 560.0,
            contracts: 20,
            multiplier: 1,
            underlyingSymbol: 'SPY',
          },
        ],
      },
    ],
  },

  // 6. Non-Registered US Margin Account (USD)
  {
    id: 'act-margin',
    name: 'US Margin Account (USD / CME)',
    code: 'MARGIN_USD',
    accountNumber: 'MRG-552-8190',
    institution: 'Interactive Brokers Canada',
    currency: 'USD',
    cashBalance: 100000.0,
    cashBalanceCad: 0.0,
    cashBalanceUsd: 100000.0,
    startingBalance: 100000.0,
    realizedPnL: 0,
    optionsLevel: 4,
    optionsLevelLabel: 'Level 4: Full Margin, Spreads, Iron Condors, Naked Options & CME/ICE Futures',
    isRegistered: false,
    marginAllowed: true,
    color: '#ff334b',
    badge: '🇨🇦 MARGIN · TAXABLE',
    craContributionRoom: {
      annualLimit: Infinity,
      usedThisYear: 0,
      availableRoom: Infinity,
      notes: 'No CRA contribution limits. Full leverage, margin borrowing, and short selling permitted.',
    },
    taxStatusDescription: 'Taxable account. Capital gains taxed at Canadian inclusion rate (50% up to $250k, 66.7% above). Interest expense on margin borrowing is tax-deductible against investment income (CRA Line 22100).',
    usWithholdingTaxNote: '15% IRS withholding on US dividends, recoverable as Foreign Tax Credit on Canadian T1 return (Form T2209). Form T1135 foreign property reporting required if foreign cost basis > $100,000 CAD.',
    orders: [],
    positions: [
      {
        id: 'pos-margin-nvda',
        ticker: 'NVDA',
        strategyName: 'Long Stock (100 shs)',
        openedAt: '09:31:14',
        contracts: 100,
        entryCost: 12150.0,
        currentMark: 12450.0,
        unrealizedPnL: 300.0,
        unrealizedPnLPercent: 2.47,
        assetCategory: 'stock',
        sharesOrContracts: 100,
        legs: [
          {
            id: 'leg-margin-nvda-stk',
            type: 'stock',
            action: 'buy',
            strike: 121.5,
            expiration: 'Perpetual',
            dte: 0,
            iv: 0,
            premium: 121.5,
            contracts: 100,
            multiplier: 1,
            underlyingSymbol: 'NVDA',
          },
        ],
      },
      {
        id: 'pos-margin-es',
        ticker: '/ES',
        strategyName: 'Long Future (2 cts CME)',
        openedAt: '08:15:00',
        contracts: 2,
        entryCost: 578000.0,
        currentMark: 582400.0,
        unrealizedPnL: 4400.0,
        unrealizedPnLPercent: 0.76,
        assetCategory: 'future',
        sharesOrContracts: 2,
        legs: [
          {
            id: 'leg-margin-es-fut',
            type: 'future',
            action: 'buy',
            strike: 5780.0,
            expiration: 'DEC 26',
            dte: 78,
            iv: 0,
            premium: 5780.0,
            contracts: 2,
            multiplier: 50,
            underlyingSymbol: '/ES',
          },
        ],
      },
      {
        id: 'pos-margin-spy-ic',
        ticker: 'SPY',
        strategyName: 'Iron Condor (4-Leg Delta-Neutral)',
        openedAt: '10:00:00',
        contracts: 1,
        entryCost: -285.0,
        currentMark: 195.0,
        unrealizedPnL: 90.0,
        unrealizedPnLPercent: 31.58,
        assetCategory: 'option',
        sharesOrContracts: 1,
        legs: [
          {
            id: 'leg-m-ic-lp',
            type: 'put',
            action: 'buy',
            strike: 545.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.16,
            premium: 1.45,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'SPY',
          },
          {
            id: 'leg-m-ic-sp',
            type: 'put',
            action: 'sell',
            strike: 555.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.15,
            premium: 3.2,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'SPY',
          },
          {
            id: 'leg-m-ic-sc',
            type: 'call',
            action: 'sell',
            strike: 585.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.14,
            premium: 2.9,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'SPY',
          },
          {
            id: 'leg-m-ic-lc',
            type: 'call',
            action: 'buy',
            strike: 595.0,
            expiration: 'NOV 26',
            dte: 45,
            iv: 0.145,
            premium: 1.8,
            contracts: 1,
            multiplier: 100,
            underlyingSymbol: 'SPY',
          },
        ],
      },
    ],
  },
];

/**
 * CRA Restriction Alert Definition for Canadian Brokerage Accounts
 */
export interface CRARestrictionAlert {
  id: string;
  strategyName: string;
  isRestricted: boolean;
  severity: 'PROHIBITED' | 'CAUTION' | 'PERMITTED';
  ruleSource: string;
  brokerLevel: string;
  title: string;
  description: string;
  penaltyConsequence: string;
  recommendedAlternative: string;
  supportedAccounts: CanadianAccountType[];
  prohibitedAccounts: CanadianAccountType[];
}

export const CRA_RESTRICTED_STRATEGIES_CATALOG: CRARestrictionAlert[] = [
  {
    id: 'cra-short-stock',
    strategyName: 'Short Stock / Naked Short Shares',
    isRestricted: true,
    severity: 'PROHIBITED',
    ruleSource: 'Income Tax Act (ITA) Section 146.2 & CRA Bulletin IT-320R2',
    brokerLevel: 'Level 3/4 Margin Required',
    title: 'Short Selling Stock is Prohibited in Registered Plans',
    description: 'The Canada Revenue Agency (CRA) explicitly forbids borrowing and short-selling underlying equity or ETF shares inside TFSA, RRSP, FHSA, and RESP accounts.',
    penaltyConsequence: 'Subject to a 100% Advantage Tax under Section 207.05 of the Income Tax Act, plus potential deregistration of the plan.',
    recommendedAlternative: 'Buy Long Put Options or inverse exchange-traded funds (e.g., Horizons BetaPro inverse ETFs on TSX).',
    supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP'],
  },
  {
    id: 'cra-naked-call',
    strategyName: 'Naked Short Call (Uncovered Call)',
    isRestricted: true,
    severity: 'PROHIBITED',
    ruleSource: 'Income Tax Act Section 146(1) & CIRO Rule 3200',
    brokerLevel: 'Level 4 (Highest Speculation)',
    title: 'Naked Calls Prohibited (Requires 100 Shares / Long Call)',
    description: 'Uncovered calls have theoretically infinite risk. Registered plans are legally cash-only trusts and cannot expose the plan to open-ended borrowed liabilities.',
    penaltyConsequence: '100% punitive CRA Advantage Tax on any option premiums earned or short positions held.',
    recommendedAlternative: 'Write Covered Calls (hold 100 shares of the underlying equity) or purchase a higher strike long call to cap exposure.',
    supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP'],
  },
  {
    id: 'cra-iron-condor',
    strategyName: 'Iron Condor & Iron Butterfly (4-Leg Margin Spreads)',
    isRestricted: true,
    severity: 'PROHIBITED',
    ruleSource: 'CIRO (Canadian Investment Regulatory Organization) Rule 3200',
    brokerLevel: 'Level 3/4 Margin Spread',
    title: 'Multi-Leg Margin Credit Spreads Not Permitted in Registered Plans',
    description: 'Canadian brokerages (Questrade, TD Direct Investing, RBC Direct Investing, Wealthsimple) do not allow margin borrowing or multi-leg credit spread margin in cash registered accounts.',
    penaltyConsequence: 'Order will be rejected at the broker clearing gate as an ineligible registered account trade.',
    recommendedAlternative: 'Trade in a Non-Registered Margin CAD or USD account, or trade Long Call/Put Debit Spreads (where supported with full cash cover).',
    supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP'],
  },
  {
    id: 'cra-naked-put',
    strategyName: 'Naked Short Put / Cash-Secured Put',
    isRestricted: true,
    severity: 'PROHIBITED',
    ruleSource: 'CRA Qualified Investment Rules & Broker Policy',
    brokerLevel: 'Level 2/3 Cash-Secured / Margin',
    title: 'Short Put Sales are Blocked by Big-5 Canadian Banks in TFSA/RRSP',
    description: 'While CRA does not explicitly prohibit fully cash-secured puts, almost all Canadian brokerages (TD, RBC, BMO, Scotiabank, Questrade) restrict put writing in registered accounts due to assignment liability.',
    penaltyConsequence: 'Trade execution blocked by Canadian brokerage compliance engines.',
    recommendedAlternative: 'Buy the underlying stock directly and write a Covered Call (Buy-Write), which achieves the identical synthetic payoff curve.',
    supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP'],
  },
  {
    id: 'cra-futures',
    strategyName: 'Commodity & Index Futures Contracts (/ES, /CL, /NQ, /GC)',
    isRestricted: true,
    severity: 'PROHIBITED',
    ruleSource: 'Income Tax Act Qualified Investment Definition',
    brokerLevel: 'Commodity Futures Account',
    title: 'Direct Futures Cannot be Held Inside Registered Accounts',
    description: 'Futures contracts are bilateral margin derivative commitments and do not qualify as legal property held by a registered retirement or savings trust under Section 204.4.',
    penaltyConsequence: 'Futures contracts are classified as non-qualified investments subject to 50% penalty tax on fair market value under Part XI.01.',
    recommendedAlternative: 'Trade TSX or US exchange-traded index options (SPY, QQQ, USO) or ETFs.',
    supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP'],
  },
  {
    id: 'cra-covered-call',
    strategyName: 'Covered Call (Own 100 Shares + Sell 1 OTM Call)',
    isRestricted: false,
    severity: 'PERMITTED',
    ruleSource: 'CRA Qualified Registered Investment Guidelines',
    brokerLevel: 'Level 2 Approved',
    title: '100% CRA-Compliant Strategy for Registered Accounts',
    description: 'Fully permitted in TFSA, RRSP, FHSA, and RESP. Generates tax-free cash flow from underlying stock holdings.',
    penaltyConsequence: 'None. All premiums and capital gains are 100% tax-free in TFSA / tax-deferred in RRSP.',
    recommendedAlternative: 'Ideal strategy for blue-chip Canadian dividend stocks (RY.TO, ENB.TO, TD.TO, SHOP.TO).',
    supportedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: [],
  },
  {
    id: 'cra-long-options',
    strategyName: 'Long Calls & Long Puts (Protective / Speculative)',
    isRestricted: false,
    severity: 'PERMITTED',
    ruleSource: 'CRA Qualified Investment Guidelines',
    brokerLevel: 'Level 2 Approved',
    title: '100% CRA-Compliant Strategy for Registered Accounts',
    description: 'Purchasing options for directional speculation or protective hedging (Married Put) is completely legal in registered accounts, as risk is strictly limited to the premium paid.',
    penaltyConsequence: 'None. Gains are 100% tax-free in TFSA.',
    recommendedAlternative: 'Excellent for asymmetric upside on growth stocks or downside crash insurance.',
    supportedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
    prohibitedAccounts: [],
  },
];

/**
 * Audit any strategy or legs for a Canadian account
 */
export function auditCanadianStrategy(
  strategyName: string,
  account: CanadianAccount,
  legs: TradeLeg[] = []
): {
  isAllowed: boolean;
  alert: CRARestrictionAlert;
  warningMessage?: string;
} {
  const normName = strategyName.toLowerCase();

  // If non-registered, all strategies are permitted
  if (!account.isRegistered) {
    return {
      isAllowed: true,
      alert: {
        id: 'margin-permitted',
        strategyName,
        isRestricted: false,
        severity: 'PERMITTED',
        ruleSource: 'Canadian Margin Account Standard Agreement',
        brokerLevel: 'Level 4 Margin',
        title: 'Permitted in Non-Registered Margin Account',
        description: 'Margin accounts have full clearing access to spreads, naked options, and futures.',
        penaltyConsequence: 'None. Taxable under normal Canadian capital gains rules.',
        recommendedAlternative: 'Proceed with standard margin risk management.',
        supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD', 'CORPORATE'],
        prohibitedAccounts: [],
      },
    };
  }

  // Check specific strategy names
  if (normName.includes('condor') || normName.includes('butterfly') || normName.includes('credit spread') || normName.includes('box spread')) {
    const alert = CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-iron-condor')!;
    return {
      isAllowed: false,
      alert,
      warningMessage: `⚠️ CRA RESTRICTION: ${strategyName} is a multi-leg margin spread prohibited in registered ${account.code} cash accounts.`,
    };
  }

  if (normName.includes('short call') || normName.includes('naked call')) {
    const alert = CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-naked-call')!;
    return {
      isAllowed: false,
      alert,
      warningMessage: `⛔ CRA VIOLATION: Naked short calls are strictly prohibited in ${account.code}. Subject to 100% Advantage Tax.`,
    };
  }

  if (normName.includes('short put') || normName.includes('cash-secured put') || normName.includes('naked put')) {
    const alert = CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-naked-put')!;
    return {
      isAllowed: false,
      alert,
      warningMessage: `⚠️ BROKER RESTRICTION: Short put writing is restricted in ${account.code} accounts by Canadian clearing firms.`,
    };
  }

  if (normName.includes('future') || normName.includes('/es') || normName.includes('/cl') || normName.includes('/nq')) {
    const alert = CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-futures')!;
    return {
      isAllowed: false,
      alert,
      warningMessage: `⛔ CRA PROHIBITED: Futures contracts cannot be held in registered ${account.code} accounts.`,
    };
  }

  if (normName.includes('covered call') || normName.includes('buy-write')) {
    const alert = CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-covered-call')!;
    return { isAllowed: true, alert };
  }

  if (normName.includes('long call') || normName.includes('long put') || normName.includes('protective put')) {
    const alert = CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-long-options')!;
    return { isAllowed: true, alert };
  }

  // Fallback to leg inspection
  const validation = validateCanadianOptionsTrade(account, legs);
  if (!validation.allowed) {
    return {
      isAllowed: false,
      alert: {
        id: 'custom-prohibited',
        strategyName,
        isRestricted: true,
        severity: 'PROHIBITED',
        ruleSource: 'CRA Registered Account Rules',
        brokerLevel: 'Level 3/4',
        title: 'CRA Registered Account Compliance Violation',
        description: validation.reason || 'This strategy configuration violates CRA registered account rules.',
        penaltyConsequence: 'Risk of 100% CRA Advantage Tax or trade rejection at broker clearing gate.',
        recommendedAlternative: 'Use Covered Calls, Married Puts, or switch to Non-Registered Margin account.',
        supportedAccounts: ['MARGIN_CAD', 'MARGIN_USD'],
        prohibitedAccounts: ['TFSA', 'RRSP', 'FHSA', 'RESP'],
      },
      warningMessage: validation.reason,
    };
  }

  return {
    isAllowed: true,
    alert: CRA_RESTRICTED_STRATEGIES_CATALOG.find((a) => a.id === 'cra-long-options')!,
  };
}

/**
 * Validate CRA Options Trading Rules for Registered Canadian Accounts
 */
export function validateCanadianOptionsTrade(
  account: CanadianAccount,
  legs: TradeLeg[]
): {
  allowed: boolean;
  reason?: string;
  craWarning?: string;
} {
  if (!account.isRegistered) {
    // Non-registered margin account allows all levels
    return { allowed: true };
  }

  // Registered Accounts (TFSA, RRSP, FHSA, RESP)
  // Check for short stock or futures (prohibited by CRA)
  const hasShortStock = legs.some((l) => l.type === 'stock' && l.action === 'sell' && legs.length === 1);
  if (hasShortStock) {
    return {
      allowed: false,
      reason: 'CRA Violation: Short selling stock is strictly prohibited in registered Canadian accounts (TFSA/RRSP/FHSA) under the Income Tax Act.',
    };
  }

  const hasFutures = legs.some((l) => l.type === 'future');
  if (hasFutures) {
    return {
      allowed: false,
      reason: 'CRA Restriction: Direct commodity and index futures contracts (/ES, /CL) cannot be held inside registered accounts.',
    };
  }

  // Check for naked short calls or naked short puts
  const callLegs = legs.filter((l) => l.type === 'call');
  const putLegs = legs.filter((l) => l.type === 'put');
  const stockLegs = legs.filter((l) => l.type === 'stock');

  const shortCalls = callLegs.filter((l) => l.action === 'sell');
  const longCalls = callLegs.filter((l) => l.action === 'buy');
  const longStock = stockLegs.filter((l) => l.action === 'buy');

  // Covered Call check
  if (shortCalls.length > 0) {
    const isCovered = longStock.length > 0 || longCalls.length >= shortCalls.length;
    if (!isCovered) {
      return {
        allowed: false,
        reason: 'CRA Rule: Naked Short Calls are prohibited in registered accounts. You must own 100 shares of the underlying stock (Covered Call) or a long call hedge.',
      };
    }
  }

  // Multi-leg spreads with margin requirements (Iron Condor, Credit Spreads)
  if (legs.length >= 2 && !longStock.length) {
    const hasCreditRisk = legs.some((l) => l.action === 'sell');
    if (hasCreditRisk) {
      return {
        allowed: false,
        reason: `CRA & Broker Limitation: ${account.name} is a cash-only registered account. Spreads requiring margin collateral (e.g. Iron Condors, Credit Spreads) are not supported by Canadian brokerages in registered accounts. Use Level 1 & 2 strategies (Covered Calls, Long Calls, Long Puts, Married Puts).`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Norbert's Gambit Currency Conversion Calculator
 * Popular strategy used by Canadian traders to convert CAD <-> USD at exact spot without 2% bank fees
 */
export interface NorbertsGambitResult {
  sourceAmount: number;
  sourceCurrency: 'CAD' | 'USD';
  targetCurrency: 'CAD' | 'USD';
  dlrSharePriceCad: number;
  dlrSharePriceUsd: number;
  sharesToTrade: number;
  grossTargetAmount: number;
  retailBankSpreadCost: number; // typical 2.0% bank markup
  norbertsGambitBrokerFee: number; // ~$10 round-trip trading commission
  netTargetAmount: number;
  netSavingsCad: number;
}

export function calculateNorbertsGambit(
  amount: number,
  direction: 'CAD_TO_USD' | 'USD_TO_CAD',
  rate: number = USDCAD_EXCHANGE_RATE
): NorbertsGambitResult {
  const dlrSharePriceUsd = 10.0;
  const dlrSharePriceCad = Number((dlrSharePriceUsd * rate).toFixed(2));

  if (direction === 'CAD_TO_USD') {
    const sharesToTrade = Math.floor(amount / dlrSharePriceCad);
    const grossTargetAmount = sharesToTrade * dlrSharePriceUsd;
    const retailBankRate = rate * 1.02; // bank takes 2% spread
    const retailBankTarget = amount / retailBankRate;
    const retailBankSpreadCost = (amount / rate) - retailBankTarget;
    const brokerFeeUsd = 7.5; // ~$10 CAD

    return {
      sourceAmount: amount,
      sourceCurrency: 'CAD',
      targetCurrency: 'USD',
      dlrSharePriceCad,
      dlrSharePriceUsd,
      sharesToTrade,
      grossTargetAmount,
      retailBankSpreadCost: Number(retailBankSpreadCost.toFixed(2)),
      norbertsGambitBrokerFee: brokerFeeUsd,
      netTargetAmount: Number((grossTargetAmount - brokerFeeUsd).toFixed(2)),
      netSavingsCad: Number(((retailBankSpreadCost - brokerFeeUsd) * rate).toFixed(2)),
    };
  } else {
    // USD to CAD
    const sharesToTrade = Math.floor(amount / dlrSharePriceUsd);
    const grossTargetAmount = sharesToTrade * dlrSharePriceCad;
    const retailBankRate = rate * 0.98;
    const retailBankTarget = amount * retailBankRate;
    const retailBankSpreadCost = (amount * rate) - retailBankTarget;
    const brokerFeeCad = 10.0;

    return {
      sourceAmount: amount,
      sourceCurrency: 'USD',
      targetCurrency: 'CAD',
      dlrSharePriceCad,
      dlrSharePriceUsd,
      sharesToTrade,
      grossTargetAmount,
      retailBankSpreadCost: Number(retailBankSpreadCost.toFixed(2)),
      norbertsGambitBrokerFee: brokerFeeCad,
      netTargetAmount: Number((grossTargetAmount - brokerFeeCad).toFixed(2)),
      netSavingsCad: Number(((retailBankSpreadCost - brokerFeeCad) * rate).toFixed(2)),
    };
  }
}

/**
 * Canadian Account US Securities Position Detail
 */
export interface CanadianUsdPositionItem {
  ticker: string;
  strategyName: string;
  sharesOrContracts: number;
  entryCost: number;
  currentMark: number;
  currentMarkUsd: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  assetCategory: string;
  marginReqUsd: number;
  withholdingTaxExposure: string;
}

/**
 * Dedicated Canadian Account USD Health Telemetry (Sub-Account Currency Split & Deficit Audit)
 */
export interface CanadianUsdHealthMetrics {
  cashBalanceUsd: number;
  cashBalanceCad: number;
  isUsdDeficit: boolean;
  usdDeficitAmount: number;
  usdDebtAnnualInterestRate: number; // 8.75% Canadian Big-5 broker margin debit rate
  dailyUsdCarryCost: number; // Daily dollar cost of USD debit
  annualUsdCarryCost: number; // Annual dollar cost of USD debit
  usPositionsCount: number;
  usPositionsMarkUsd: number;
  usPositionsMarkCad: number;
  usPositions: CanadianUsdPositionItem[];
  usMarginRequirementUsd: number;
  usMaintenanceReqUsd: number;
  usdMarginCushion: number;
  usdMarginCushionPercent: number;
  usdBuyingPower: number;
  usdOptionBuyingPower: number;
  ciroFxHaircutRate: number; // 3.00% under CIRO Rule 5300
  ciroFxHaircutUsd: number;
  ciroFxHaircutCad: number;
  craAdvantageTaxRisk: boolean; // True if registered plan has negative USD cash
  irsWithholdingRate: number; // 0% or 15%
  irsWithholdingStatus: string;
  irsWithholdingNote: string;
  usdHealthScore: number; // 0 - 100
  usdHealthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  usdHealthStatusColor: string;
  recommendedAction: string;
}

/**
 * Canadian Margin Health Metrics (CIRO / IIROC Rule 5300 & CRA Anti-Borrowing Compliance)
 */
export interface CanadianMarginHealthMetrics {
  accountId: string;
  accountName: string;
  accountCode: CanadianAccountType;
  accountNumber: string;
  institution: string;
  currency: 'CAD' | 'USD';
  isRegistered: boolean;
  optionsLevel: number;
  optionsLevelLabel: string;
  ciroRuleLabel: string;
  healthScore: number; // 0 - 100
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  statusColor: string;
  netLiquidityCad: number;
  netLiquidityUsd: number;
  cashBalance: number;
  positionsMark: number;
  unrealizedPnLCad: number;
  marginRequirementNative: number;
  maintenanceReqNative: number;
  marginCushionNative: number;
  marginCushionPercent: number;
  marginDebt: number; // CRA mandate: must be $0.00 in registered accounts
  hasProhibitedBorrowing: boolean;
  foreignAssetsValNative: number;
  fxHaircutRate: number; // 3.00% under CIRO
  fxHaircutDollarCad: number;
  cipfLimitCad: number; // $1,000,000 CAD CIPF Insurance
  isCipfFullyCovered: boolean;
  isFullyCompliant: boolean;
  complianceNotes: string[];
  usdHealth: CanadianUsdHealthMetrics;
}

/**
 * Computes Canadian Margin Health and Regulatory Compliance
 */
export function calculateCanadianMarginHealth(
  account: CanadianAccount,
  rate: number = USDCAD_EXCHANGE_RATE
): CanadianMarginHealthMetrics {
  const positionsMark = account.positions.reduce((acc, p) => acc + p.currentMark, 0);
  const netLiquidityNative = Math.max(1, account.cashBalance + positionsMark);

  const netLiquidityCad = account.currency === 'CAD'
    ? netLiquidityNative
    : Number((netLiquidityNative * rate).toFixed(2));
  const netLiquidityUsd = account.currency === 'USD'
    ? netLiquidityNative
    : Number((netLiquidityNative / rate).toFixed(2));

  const unrealizedPnLNative = account.positions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
  const unrealizedPnLCad = account.currency === 'CAD'
    ? unrealizedPnLNative
    : Number((unrealizedPnLNative * rate).toFixed(2));

  let marginRequirementNative = 0;
  let foreignAssetsValNative = 0;
  const complianceNotes: string[] = [];

  // Check positions
  let hasProhibitedBorrowing = false;
  let hasNakedShortOptions = false;

  if (account.isRegistered) {
    // Registered accounts (TFSA, RRSP, FHSA, RESP)
    // 1. CRA STRICT RULE: No borrowing allowed. Cash must be >= 0.
    if (account.cashBalance < 0) {
      hasProhibitedBorrowing = true;
      complianceNotes.push(
        `CRITICAL CRA VIOLATION: Negative cash balance (-$${Math.abs(account.cashBalance).toFixed(2)} ${account.currency}) creates prohibited margin debt under Section 146/146.2 of the Income Tax Act.`
      );
    }

    // 2. Options must be covered
    account.positions.forEach((pos) => {
      const stockLegs = pos.legs.filter((l) => l.type === 'stock' && l.action === 'buy');
      const shortCallLegs = pos.legs.filter((l) => l.type === 'call' && l.action === 'sell');
      const shortPutLegs = pos.legs.filter((l) => l.type === 'put' && l.action === 'sell');

      if (shortCallLegs.length > 0) {
        const totalShortCallContracts = shortCallLegs.reduce((s, l) => s + l.contracts, 0);
        const totalStockShares = stockLegs.reduce((s, l) => s + l.contracts, 0);
        if (totalShortCallContracts * 100 > totalStockShares) {
          hasNakedShortOptions = true;
          complianceNotes.push(`CRA RESTRICTION: Naked call option on ${pos.ticker} not fully covered by 100 shares.`);
        }
      }

      if (shortPutLegs.length > 0) {
        // Cash secured puts require 100% strike cash
        const reqCash = shortPutLegs.reduce((s, l) => s + l.strike * 100 * l.contracts, 0);
        if (account.cashBalance < reqCash) {
          complianceNotes.push(`COLLATERAL WARNING: Short put on ${pos.ticker} requires $${reqCash.toLocaleString()} cash collateral.`);
        }
      }
    });

    // In registered accounts, margin requirement represents cash needed to cover trades
    marginRequirementNative = Math.max(0, -account.cashBalance);
  } else {
    // Non-registered Margin Account (CIRO Rule 5300)
    account.positions.forEach((pos) => {
      const isUsAsset = !pos.ticker.endsWith('.TO') && !pos.ticker.endsWith('.V');
      if (isUsAsset) {
        foreignAssetsValNative += Math.abs(pos.currentMark);
      }

      // CIRO margin rates: 30% on senior equities, 50% on US equities
      const marginRate = isUsAsset ? 0.50 : 0.30;
      if (pos.assetCategory === 'stock') {
        marginRequirementNative += Math.abs(pos.currentMark) * marginRate;
      } else if (pos.assetCategory === 'future') {
        marginRequirementNative += pos.contracts * (pos.ticker === '/ES' ? 12500 : 7500);
      } else {
        // Options: max loss or 30% on covered
        if (pos.entryCost < 0) {
          marginRequirementNative += Math.abs(pos.entryCost) * 1.5;
        } else {
          marginRequirementNative += Math.abs(pos.currentMark) * 0.3;
        }
      }
    });
  }

  // CIRO Maintenance Margin Requirement (75% of initial)
  const maintenanceReqNative = Number((marginRequirementNative * 0.75).toFixed(2));
  const marginCushionNative = Number((netLiquidityNative - maintenanceReqNative).toFixed(2));
  const marginCushionPercent = Number(((marginCushionNative / netLiquidityNative) * 100).toFixed(1));

  // Foreign Currency Haircut (3.00% under CIRO Rule 5300)
  const fxHaircutRate = 0.03;
  const fxHaircutDollarNative = foreignAssetsValNative * fxHaircutRate;
  const fxHaircutDollarCad = account.currency === 'CAD'
    ? Number(fxHaircutDollarNative.toFixed(2))
    : Number((fxHaircutDollarNative * rate).toFixed(2));

  // Determine Canadian Health Score & Status
  let healthScore = 100;
  let status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
  let statusColor = '#00e676';

  if (account.isRegistered) {
    if (hasProhibitedBorrowing) {
      healthScore = 15;
      status = 'CRITICAL';
      statusColor = '#ff334b';
    } else if (hasNakedShortOptions) {
      healthScore = 40;
      status = 'WARNING';
      statusColor = '#ffd600';
    } else {
      healthScore = 100;
      status = 'EXCELLENT';
      statusColor = '#00e676';
      complianceNotes.push('100% Cash-Covered: 0% Margin Debt. Fully compliant with CRA Income Tax Act rules.');
    }
  } else {
    // Margin Account
    if (marginCushionNative <= 0) {
      healthScore = 10;
      status = 'CRITICAL';
      statusColor = '#ff334b';
      complianceNotes.push('CIRO Rule 5300 Margin Call: Maintenance collateral deficit. Deposit funds or liquidate positions.');
    } else if (marginCushionPercent < 25) {
      healthScore = Math.max(25, Math.round(marginCushionPercent * 2));
      status = 'WARNING';
      statusColor = '#ffd600';
      complianceNotes.push('CIRO Margin Warning: Free collateral cushion is under 25% buffer threshold.');
    } else {
      healthScore = Math.min(100, Math.round(60 + (marginCushionPercent - 25) * 0.55));
      status = 'EXCELLENT';
      statusColor = '#00e676';
      complianceNotes.push('CIRO Rule 5300 Margin Secure: Healthy equity cushion above house and regulatory minimums.');
    }
  }

  // CIPF Insurance Status
  const cipfLimitCad = 1000000;
  const isCipfFullyCovered = netLiquidityCad <= cipfLimitCad;

  const ciroRuleLabel = account.isRegistered
    ? 'CRA Anti-Leverage (ITA Sec 146.2) · Cash-Covered Only'
    : 'CIRO Rule 5300 · Portfolio Margin Standard';

  // -------------------------------------------------------------
  // Dedicated USD Health Telemetry (Sub-Account Currency Split)
  // -------------------------------------------------------------
  const cashBalanceUsd = account.cashBalanceUsd !== undefined
    ? account.cashBalanceUsd
    : account.currency === 'USD' ? account.cashBalance : 0;

  const cashBalanceCad = account.cashBalanceCad !== undefined
    ? account.cashBalanceCad
    : account.currency === 'CAD' ? account.cashBalance : 0;

  const isUsdDeficit = cashBalanceUsd < -0.01;
  const usdDeficitAmount = isUsdDeficit ? Math.abs(cashBalanceUsd) : 0;
  const usdDebtAnnualInterestRate = 0.0875; // Canadian Big-5 Bank USD margin debit rate (8.75% APR)
  const dailyUsdCarryCost = isUsdDeficit ? Number(((usdDeficitAmount * usdDebtAnnualInterestRate) / 365).toFixed(2)) : 0;
  const annualUsdCarryCost = isUsdDeficit ? Number((usdDeficitAmount * usdDebtAnnualInterestRate).toFixed(2)) : 0;

  // Filter and compute US positions detail
  const usPositionsList: CanadianUsdPositionItem[] = [];
  let usPositionsMarkUsd = 0;
  let usMarginRequirementUsd = 0;

  account.positions.forEach((pos) => {
    const isUsAsset = !pos.ticker.endsWith('.TO') && !pos.ticker.endsWith('.V');
    if (isUsAsset) {
      const markUsd = account.currency === 'USD' ? pos.currentMark : Number((pos.currentMark / rate).toFixed(2));
      usPositionsMarkUsd += markUsd;

      let posMarginReq = 0;
      if (pos.assetCategory === 'stock') {
        posMarginReq = Math.abs(markUsd) * 0.50; // CIRO 50% on US equities
      } else if (pos.assetCategory === 'future') {
        posMarginReq = pos.contracts * (pos.ticker === '/ES' ? 12500 : 7500);
      } else {
        posMarginReq = pos.entryCost < 0 ? Math.abs(pos.entryCost) * 1.5 : Math.abs(markUsd) * 0.3;
      }
      usMarginRequirementUsd += posMarginReq;

      let withholdingExp = '15% IRS Withholding (Form W-8BEN)';
      if (account.code === 'RRSP') {
        withholdingExp = '0% Withholding (Treaty Article XXI Exempt)';
      } else if (account.isRegistered) {
        withholdingExp = '15% Non-Recoverable Drag (CRA Ineligible)';
      }

      usPositionsList.push({
        ticker: pos.ticker,
        strategyName: pos.strategyName,
        sharesOrContracts: pos.sharesOrContracts || pos.contracts,
        entryCost: pos.entryCost,
        currentMark: pos.currentMark,
        currentMarkUsd: markUsd,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercent: pos.unrealizedPnLPercent,
        assetCategory: pos.assetCategory || 'stock',
        marginReqUsd: Number(posMarginReq.toFixed(2)),
        withholdingTaxExposure: withholdingExp,
      });
    }
  });

  usPositionsMarkUsd = Number(usPositionsMarkUsd.toFixed(2));
  const usPositionsMarkCad = Number((usPositionsMarkUsd * rate).toFixed(2));
  const usMaintenanceReqUsd = Number((usMarginRequirementUsd * 0.75).toFixed(2));

  // CIRO FX Haircut on foreign assets (3.00%)
  const ciroFxHaircutUsd = Number((usPositionsMarkUsd * 0.03).toFixed(2));
  const ciroFxHaircutCad = Number((ciroFxHaircutUsd * rate).toFixed(2));

  // USD Margin Cushion & Buying Power
  let usdMarginCushion = 0;
  let usdMarginCushionPercent = 0;
  let usdBuyingPower = 0;
  let usdOptionBuyingPower = 0;

  if (account.isRegistered) {
    usdMarginCushion = Math.max(0, cashBalanceUsd);
    usdMarginCushionPercent = netLiquidityUsd > 0 ? Number(((usdMarginCushion / netLiquidityUsd) * 100).toFixed(1)) : 0;
    usdBuyingPower = Math.max(0, Number(cashBalanceUsd.toFixed(2)));
    usdOptionBuyingPower = usdBuyingPower;
  } else {
    // Non-Registered Margin: CAD surplus collateralizes USD buying power with 3% CIRO haircut
    const cadEquityInUsd = Math.max(0, (cashBalanceCad / rate) * (1 - 0.03));
    const totalUsdEquity = cashBalanceUsd + cadEquityInUsd + usPositionsMarkUsd;
    usdMarginCushion = Number((totalUsdEquity - usMaintenanceReqUsd).toFixed(2));
    usdMarginCushionPercent = totalUsdEquity > 0 ? Number(((usdMarginCushion / totalUsdEquity) * 100).toFixed(1)) : 0;
    usdBuyingPower = Math.max(0, Number(((cashBalanceUsd + cadEquityInUsd) * 2).toFixed(2)));
    usdOptionBuyingPower = Math.max(0, Number((cashBalanceUsd + cadEquityInUsd).toFixed(2)));
  }

  // CRA Registered Account Anti-Overdraft Check
  const craAdvantageTaxRisk = account.isRegistered && isUsdDeficit;

  // IRS Withholding Tax Parameters
  let irsWithholdingRate = 15;
  let irsWithholdingStatus = '15% RECOVERABLE (T2209)';
  let irsWithholdingNote = '15% IRS dividend withholding applies under Form W-8BEN, fully recoverable as Canadian Foreign Tax Credit on CRA Form T2209.';

  if (account.code === 'RRSP') {
    irsWithholdingRate = 0;
    irsWithholdingStatus = '0% EXEMPT (TREATY ART. XXI)';
    irsWithholdingNote = 'US-Canada Income Tax Treaty Article XXI waives 15% IRS dividend withholding for recognized pension/retirement trusts.';
  } else if (account.isRegistered) {
    irsWithholdingRate = 15;
    irsWithholdingStatus = '15% UNRECOVERABLE DRAG';
    irsWithholdingNote = 'IRS does not classify TFSAs/FHSAs as retirement pensions. 15% is withheld at source and cannot be claimed as Foreign Tax Credit on Canadian tax returns.';
  }

  // USD Health Score & Status
  let usdHealthScore = 100;
  let usdHealthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
  let usdHealthStatusColor = '#00e676';
  let recommendedAction = 'OPTIMAL: USD sub-account in strong health with zero borrow drag.';

  if (craAdvantageTaxRisk) {
    usdHealthScore = 10;
    usdHealthStatus = 'CRITICAL';
    usdHealthStatusColor = '#ff334b';
    recommendedAction = `CRITICAL CRA ACTION: Settle -$${usdDeficitAmount.toFixed(2)} USD debit in registered plan immediately to prevent 100% CRA Advantage Tax.`;
  } else if (isUsdDeficit) {
    if (usdDeficitAmount > 15000) {
      usdHealthScore = 30;
      usdHealthStatus = 'CRITICAL';
      usdHealthStatusColor = '#ff334b';
    } else {
      usdHealthScore = 58;
      usdHealthStatus = 'WARNING';
      usdHealthStatusColor = '#ffd600';
    }
    recommendedAction = `USD DEFICIT ACTIVE: -$${usdDeficitAmount.toFixed(2)} USD debit incurs 8.75% APR carry ($${dailyUsdCarryCost}/day). Journal CAD cash via Norbert's Gambit (DLR.TO) to eliminate carry.`;
  } else if (usdMarginCushionPercent < 20 && !account.isRegistered) {
    usdHealthScore = 70;
    usdHealthStatus = 'WARNING';
    usdHealthStatusColor = '#ffd600';
    recommendedAction = 'ELEVATED USD MARGIN: Maintain adequate collateral buffer against foreign exchange swings.';
  }

  const usdHealth: CanadianUsdHealthMetrics = {
    cashBalanceUsd,
    cashBalanceCad,
    isUsdDeficit,
    usdDeficitAmount,
    usdDebtAnnualInterestRate,
    dailyUsdCarryCost,
    annualUsdCarryCost,
    usPositionsCount: usPositionsList.length,
    usPositionsMarkUsd,
    usPositionsMarkCad,
    usPositions: usPositionsList,
    usMarginRequirementUsd: Number(usMarginRequirementUsd.toFixed(2)),
    usMaintenanceReqUsd,
    usdMarginCushion,
    usdMarginCushionPercent,
    usdBuyingPower,
    usdOptionBuyingPower,
    ciroFxHaircutRate: 0.03,
    ciroFxHaircutUsd,
    ciroFxHaircutCad,
    craAdvantageTaxRisk,
    irsWithholdingRate,
    irsWithholdingStatus,
    irsWithholdingNote,
    usdHealthScore,
    usdHealthStatus,
    usdHealthStatusColor,
    recommendedAction,
  };

  return {
    accountId: account.id,
    accountName: account.name,
    accountCode: account.code,
    accountNumber: account.accountNumber,
    institution: account.institution,
    currency: account.currency,
    isRegistered: account.isRegistered,
    optionsLevel: account.optionsLevel,
    optionsLevelLabel: account.optionsLevelLabel,
    ciroRuleLabel,
    healthScore,
    status,
    statusColor,
    netLiquidityCad,
    netLiquidityUsd,
    cashBalance: account.cashBalance,
    positionsMark,
    unrealizedPnLCad,
    marginRequirementNative: Number(marginRequirementNative.toFixed(2)),
    maintenanceReqNative,
    marginCushionNative,
    marginCushionPercent,
    marginDebt: account.isRegistered ? Math.max(0, -account.cashBalance) : 0,
    hasProhibitedBorrowing,
    foreignAssetsValNative: Number(foreignAssetsValNative.toFixed(2)),
    fxHaircutRate,
    fxHaircutDollarCad,
    cipfLimitCad,
    isCipfFullyCovered,
    isFullyCompliant: !hasProhibitedBorrowing && !hasNakedShortOptions && status !== 'CRITICAL',
    complianceNotes,
    usdHealth,
  };
}
