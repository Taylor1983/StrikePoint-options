import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AccountState, Position, Order, Ticker } from '../types/options';
import {
  CanadianAccount,
  USDCAD_EXCHANGE_RATE,
  calculateNorbertsGambit,
  convertCurrency,
  calculateCanadianMarginHealth,
} from '../services/canadianAccounts';
import { calculateBSM } from '../utils/blackScholes';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { D3PerformanceChart } from './D3PerformanceChart';
import { MarginHealthWidget } from './MarginHealthWidget';
import { PortfolioBetaWeightingView } from './PortfolioBetaWeightingView';
import { DividendTrackerView } from './DividendTrackerView';
import { AccountStatementView } from './AccountStatementView';
import { calculateMarginHealth } from '../utils/marginHealth';
import {
  calculatePositionBorrowInterest,
  calculatePortfolioMarginInterest,
  STOCK_BORROW_RATES,
  FUTURES_CARRYING_RATES,
  BENCHMARK_RATES,
  getBrokerMarginDebitRate,
  PositionBorrowInterestMetrics,
} from '../utils/marginInterest';
import {
  Wallet,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
  Layers,
  Activity,
  FileText,
  Download,
  Printer,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Building,
  Calculator,
  AlertTriangle,
  Radio,
  Play,
  Pause,
  Zap,
  BarChart2,
  PieChart,
  Shield,
  Eye,
  RefreshCw,
  Sparkles,
  Percent,
  Banknote,
  Receipt,
  Info,
} from 'lucide-react';

interface PositionsPortfolioViewProps {
  account: AccountState;
  onClosePosition: (positionId: string) => void;
  onResetAccount: () => void;
  onNavigateToChain: () => void;
  canadianAccounts?: CanadianAccount[];
  activeAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onOpenCanadianSuite?: () => void;
  tickers?: Record<string, Ticker>;
  isLiveTickActive?: boolean;
  onToggleLiveTick?: () => void;
  onNavigateToRisk?: (pos?: Position) => void;
  onSelectTicker?: (symbol: string) => void;
  onSeedPortfolio?: () => void;
  onSimulateTick?: () => void;
  isPrivacyMode?: boolean;
  onUpdateAccounts?: (accounts: CanadianAccount[]) => void;
}

/**
 * Calculates institutional Initial Margin & Buying Power reduction for a portfolio position
 * Adheres to FINRA Rule 4210, Reg-T, and CME SPAN margin standards.
 */
export function getPositionMarginMetrics(pos: Position, spotPrice?: number): {
  marginBp: number;
  ruleLabel: string;
  badgeClass: string;
} {
  const spot = spotPrice || (pos.legs[0]?.strike || 100);
  const isPureStock = pos.legs.length === 1 && pos.legs[0].type === 'stock';
  const isPureFuture = pos.legs.length === 1 && pos.legs[0].type === 'future';
  const stockLeg = pos.legs.find((l) => l.type === 'stock');
  const futureLeg = pos.legs.find((l) => l.type === 'future');
  const optionLegs = pos.legs.filter((l) => l.type === 'call' || l.type === 'put');

  if (isPureStock && stockLeg) {
    const mult = stockLeg.multiplier || 1;
    const notional = spot * stockLeg.contracts * mult;
    const bp = stockLeg.action === 'buy' ? notional * 0.5 : Math.max(5 * stockLeg.contracts, notional * 0.5);
    return {
      marginBp: Number(bp.toFixed(2)),
      ruleLabel: stockLeg.action === 'buy' ? 'REG-T 50%' : 'SHORT 50%',
      badgeClass: 'text-[#60a5fa] border-[#3b82f6]/40 bg-[#3b82f6]/10',
    };
  }

  if (isPureFuture && futureLeg) {
    const span = pos.ticker === '/ES' ? 12320 : pos.ticker === '/NQ' ? 18480 : pos.ticker === '/CL' ? 6820 : 10000;
    return {
      marginBp: futureLeg.contracts * span,
      ruleLabel: `SPAN (${pos.ticker})`,
      badgeClass: 'text-[#ffd600] border-[#ffd600]/40 bg-[#ffd600]/10',
    };
  }

  // Covered Call
  if (stockLeg && optionLegs.length === 1 && optionLegs[0].action === 'sell' && stockLeg.action === 'buy') {
    const notional = spot * stockLeg.contracts * (stockLeg.multiplier || 1);
    const premium = optionLegs[0].premium * 100 * optionLegs[0].contracts;
    const bp = Math.max(0, notional * 0.5 - premium);
    return {
      marginBp: Number(bp.toFixed(2)),
      ruleLabel: 'COVERED CALL',
      badgeClass: 'text-[#34d399] border-[#10b981]/40 bg-[#10b981]/10',
    };
  }

  // Debit options / long strategies (100% cash paid)
  if (pos.entryCost > 0) {
    return {
      marginBp: Number(pos.entryCost.toFixed(2)),
      ruleLabel: 'DEBIT (100%)',
      badgeClass: 'text-[#00d2ff] border-[#00d2ff]/40 bg-[#00d2ff]/10',
    };
  }

  // Vertical credit spread (width - credit)
  if (optionLegs.length === 2 && optionLegs[0].type === optionLegs[1].type) {
    const spreadWidth = Math.abs(optionLegs[0].strike - optionLegs[1].strike) * 100 * pos.contracts;
    const credit = Math.abs(pos.entryCost);
    const bp = Math.max(0, spreadWidth - credit);
    return {
      marginBp: Number(bp.toFixed(2)),
      ruleLabel: 'SPREAD WIDTH',
      badgeClass: 'text-[#ff9900] border-[#ff9900]/40 bg-[#ff9900]/10',
    };
  }

  // Naked short options (Rule 4210 standard)
  const shortLegs = optionLegs.filter((l) => l.action === 'sell');
  if (shortLegs.length > 0) {
    let totalNaked = 0;
    shortLegs.forEach((leg) => {
      const mult = (leg.multiplier || 100) * leg.contracts;
      const prem = leg.premium * mult;
      if (leg.type === 'call') {
        const otm = Math.max(0, (leg.strike - spot) * mult);
        totalNaked += Math.max(spot * mult * 0.20 - otm + prem, spot * mult * 0.10 + prem);
      } else {
        const otm = Math.max(0, (spot - leg.strike) * mult);
        totalNaked += Math.max(spot * mult * 0.20 - otm + prem, leg.strike * mult * 0.10 + prem);
      }
    });
    return {
      marginBp: Number(totalNaked.toFixed(2)),
      ruleLabel: 'RULE 4210 (20%)',
      badgeClass: 'text-[#ff334b] border-[#ff334b]/40 bg-[#ff334b]/10',
    };
  }

  return {
    marginBp: Number(Math.abs(pos.entryCost).toFixed(2)),
    ruleLabel: 'CASH / DEBIT',
    badgeClass: 'text-[#8b9bb4] border-[#8b9bb4]/40 bg-[#8b9bb4]/10',
  };
}

export const PositionsPortfolioView: React.FC<PositionsPortfolioViewProps> = ({
  account,
  onClosePosition,
  onResetAccount,
  onNavigateToChain,
  canadianAccounts = [],
  activeAccountId = 'act-us-margin',
  onSelectAccount,
  onOpenCanadianSuite,
  tickers,
  isLiveTickActive = true,
  onToggleLiveTick,
  onNavigateToRisk,
  onSelectTicker,
  onSeedPortfolio,
  onSimulateTick,
  isPrivacyMode = false,
  onUpdateAccounts,
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'performance' | 'greeks' | 'beta' | 'statement' | 'orders' | 'bp' | 'interest' | 'dividends' | 'canadian_tax'>('positions');
  const [showResetModal, setShowResetModal] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'CAD' | 'USD'>('USD');
  const [gambitAmount, setGambitAmount] = useState<number>(10000);
  const [gambitDirection, setGambitDirection] = useState<'CAD_TO_USD' | 'USD_TO_CAD'>('CAD_TO_USD');
  const [simDebitAmount, setSimDebitAmount] = useState<number>(50000);
  const [htbSearchQuery, setHtbSearchQuery] = useState<string>('');
  const [simTicker, setSimTicker] = useState<string>('DJT');
  const [simShares, setSimShares] = useState<number>(500);
  const [simPrice, setSimPrice] = useState<number>(32.50);
  const [simBorrowRate, setSimBorrowRate] = useState<number>(18.5);
  const [simHoldingDays, setSimHoldingDays] = useState<number>(30);
  const [simCurrency, setSimCurrency] = useState<'USD' | 'CAD'>('USD');

  // Selected Account Logic:
  // 'act-us-margin': Main Institutional Margin Account ($100k, USD)
  // 'act-global': Consolidated Global Account (All positions)
  // Or one of canadianAccounts (TFSA, RRSP, FHSA, Margin)
  const isUsAccount = activeAccountId === 'act-us-margin' || !canadianAccounts.some((a) => a.id === activeAccountId);
  const isGlobalAccount = activeAccountId === 'act-global';
  const currentCanadianAccount = !isUsAccount && !isGlobalAccount
    ? canadianAccounts.find((a) => a.id === activeAccountId)
    : undefined;

  const activePositions: Position[] = useMemo(() => {
    if (isGlobalAccount) {
      return [...account.positions, ...canadianAccounts.flatMap((a) => a.positions)];
    }
    if (isUsAccount) {
      return account.positions;
    }
    return currentCanadianAccount ? currentCanadianAccount.positions : account.positions;
  }, [isGlobalAccount, isUsAccount, account.positions, canadianAccounts, currentCanadianAccount]);

  const activeOrders: Order[] = useMemo(() => {
    if (isGlobalAccount) {
      return [...account.orders, ...canadianAccounts.flatMap((a) => a.orders)];
    }
    if (isUsAccount) {
      return account.orders;
    }
    return currentCanadianAccount ? currentCanadianAccount.orders : account.orders;
  }, [isGlobalAccount, isUsAccount, account.orders, canadianAccounts, currentCanadianAccount]);

  const activeCash = useMemo(() => {
    if (isGlobalAccount) {
      const cadCashInUsd = canadianAccounts.reduce((sum, a) => sum + (a.currency === 'CAD' ? a.cashBalance / USDCAD_EXCHANGE_RATE : a.cashBalance), 0);
      return account.cashBalance + cadCashInUsd;
    }
    if (isUsAccount) {
      return account.cashBalance;
    }
    return currentCanadianAccount ? currentCanadianAccount.cashBalance : account.cashBalance;
  }, [isGlobalAccount, isUsAccount, account.cashBalance, canadianAccounts, currentCanadianAccount]);

  const activeStartingBalance = useMemo(() => {
    if (isGlobalAccount) {
      return 100000 + canadianAccounts.reduce((sum, a) => sum + a.startingBalance, 0);
    }
    if (isUsAccount) {
      return account.startingBalance;
    }
    return currentCanadianAccount ? currentCanadianAccount.startingBalance : account.startingBalance;
  }, [isGlobalAccount, isUsAccount, account.startingBalance, canadianAccounts, currentCanadianAccount]);

  const activeCurrency = isUsAccount || isGlobalAccount ? 'USD' : (currentCanadianAccount?.currency || 'CAD');

  // Compute metrics in active currency
  const positionsCurrentMarkTotal = activePositions.reduce(
    (acc, p) => acc + p.currentMark,
    0
  );
  const netLiquidity = activeCash + positionsCurrentMarkTotal;
  const totalUnrealizedPnL = activePositions.reduce(
    (acc, p) => acc + p.unrealizedPnL,
    0
  );
  const totalReturn = netLiquidity - activeStartingBalance;
  const totalReturnPercent = activeStartingBalance > 0 ? (totalReturn / activeStartingBalance) * 100 : 0;
  const isProfitable = totalReturn >= 0;

  // Position Margins Map & Total Institutional Margin Requirement (FINRA Rule 4210 / Reg-T)
  const positionMarginsMap = useMemo(() => {
    const map: Record<string, { marginBp: number; ruleLabel: string; badgeClass: string }> = {};
    activePositions.forEach((pos) => {
      const spot = tickers?.[pos.ticker]?.price;
      map[pos.id] = getPositionMarginMetrics(pos, spot);
    });
    return map;
  }, [activePositions, tickers]);

  const marginRequirement = useMemo(() => {
    return Object.values(positionMarginsMap).reduce((sum, m) => sum + m.marginBp, 0);
  }, [positionMarginsMap]);

  // Position Borrow & Financing Metrics (Short Stock Borrow Fees & Futures SPAN Carry)
  const positionBorrowMap = useMemo(() => {
    const map: Record<string, PositionBorrowInterestMetrics | null> = {};
    activePositions.forEach((pos) => {
      const spot = tickers?.[pos.ticker]?.price || (pos.legs[0]?.strike || 100);
      map[pos.id] = calculatePositionBorrowInterest(pos, spot);
    });
    return map;
  }, [activePositions, tickers]);

  const totalDailyBorrowCost = useMemo(() => {
    return Object.values(positionBorrowMap).reduce((sum, item) => {
      return sum + (item ? Math.abs(item.dailyInterestCost) : 0);
    }, 0);
  }, [positionBorrowMap]);

  // Comprehensive FINRA Rule 4210 Margin Health & Buffer Metrics
  const marginHealth = useMemo(() => {
    return calculateMarginHealth(activeCash, activePositions, tickers);
  }, [activeCash, activePositions, tickers]);

  // Canadian Margin Health (CIRO Rule 5300 & CRA Compliance)
  const canadianMarginHealth = useMemo(() => {
    if (currentCanadianAccount) {
      return calculateCanadianMarginHealth(currentCanadianAccount);
    }
    if (canadianAccounts.length > 0) {
      return calculateCanadianMarginHealth(canadianAccounts[0]);
    }
    return undefined;
  }, [currentCanadianAccount, canadianAccounts]);

  // If registered account (TFSA/RRSP/FHSA), Buying Power is strictly cash-settled (no margin borrowing)
  const isRegisteredAccount = currentCanadianAccount?.isRegistered ?? false;
  const optionsBuyingPower = isRegisteredAccount
    ? Math.max(0, activeCash)
    : Math.max(0, activeCash - marginRequirement);
  const totalBpPool = optionsBuyingPower + marginRequirement;
  const bpUtilizationPercent = totalBpPool > 0 ? (marginRequirement / totalBpPool) * 100 : 0;

  // Real-time Greeks calculation for each position
  const positionGreeksMap = useMemo(() => {
    const map: Record<string, { delta: number; gamma: number; theta: number; vega: number; rho: number; betaDelta: number }> = {};
    const spyPrice = tickers?.['SPY']?.price || 568.25;

    activePositions.forEach((pos) => {
      const tick = tickers?.[pos.ticker];
      const spot = tick ? tick.price : (pos.legs[0]?.strike || 100);
      let delta = 0;
      let gamma = 0;
      let theta = 0;
      let vega = 0;
      let rho = 0;

      pos.legs.forEach((leg) => {
        const isBuy = leg.action === 'buy';
        const sign = isBuy ? 1 : -1;
        if (leg.type === 'stock') {
          delta += sign * leg.contracts * (leg.multiplier || 1);
        } else if (leg.type === 'future') {
          delta += sign * leg.contracts * (leg.multiplier || 50);
        } else {
          const bsm = calculateBSM(
            spot,
            leg.strike,
            Math.max(0.001, leg.dte / 365),
            leg.iv || 0.25,
            leg.type === 'put' ? 'put' : 'call'
          );
          const mult = 100 * leg.contracts;
          delta += sign * bsm.greeks.delta * mult;
          gamma += sign * bsm.greeks.gamma * mult;
          theta += sign * bsm.greeks.theta * mult;
          vega += sign * bsm.greeks.vega * mult;
          rho += sign * bsm.greeks.rho * mult;
        }
      });

      const beta = tick?.beta ?? 1.0;
      const betaDelta = (delta * spot * beta) / spyPrice;

      map[pos.id] = { delta, gamma, theta, vega, rho, betaDelta };
    });

    return map;
  }, [activePositions, tickers]);

  // Aggregate Portfolio-Level Greeks
  const portfolioGreeks = useMemo(() => {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let totalBetaDelta = 0;

    Object.values(positionGreeksMap).forEach((g) => {
      totalDelta += g.delta;
      totalGamma += g.gamma;
      totalTheta += g.theta;
      totalVega += g.vega;
      totalBetaDelta += g.betaDelta;
    });

    return {
      delta: totalDelta,
      gamma: totalGamma,
      theta: totalTheta,
      vega: totalVega,
      betaDelta: totalBetaDelta,
    };
  }, [positionGreeksMap]);

  // Real-time tick flashes and timestamp tracking
  const [tickFlashMap, setTickFlashMap] = useState<Record<string, 'up' | 'down'>>({});
  const prevMarksRef = useRef<Record<string, number>>({});
  const [lastTickTime, setLastTickTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setLastTickTime(now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0'));

    const newFlashes: Record<string, 'up' | 'down'> = {};
    activePositions.forEach((pos) => {
      const prev = prevMarksRef.current[pos.id];
      if (prev !== undefined && prev !== pos.currentMark) {
        newFlashes[pos.id] = pos.currentMark > prev ? 'up' : 'down';
      }
      prevMarksRef.current[pos.id] = pos.currentMark;
    });

    if (Object.keys(newFlashes).length > 0) {
      setTickFlashMap(newFlashes);
      const timer = setTimeout(() => {
        setTickFlashMap({});
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [activePositions, tickers]);

  // Gambit calculation
  const gambitResult = calculateNorbertsGambit(gambitAmount, gambitDirection);

  const handleClose = (posId: string) => {
    playExecutionChime();
    onClosePosition(posId);
  };

  return (
    <div className="p-2 sm:p-4 w-full flex flex-col gap-4 font-mono text-xs">
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#07090e] border-2 border-[#ff9900] rounded p-6 max-w-md w-full shadow-[0_0_30px_rgba(255,153,0,0.3)]">
            <h3 className="text-sm font-black text-white mb-2">RESET TERMINAL ACCOUNT?</h3>
            <p className="text-xs text-[#8b9bb4] mb-6">
              This will restore cash to $100,000.00, liquidate all open options positions, and purge order history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  playKeyClick();
                  setShowResetModal(false);
                }}
                className="px-3 py-1.5 text-xs font-bold text-[#cbd5e1] hover:text-white bg-[#141b28] rounded border border-[#222d44]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  playExecutionChime();
                  onResetAccount();
                  setShowResetModal(false);
                }}
                className="px-4 py-1.5 text-xs font-black text-white bg-[#ff334b] hover:bg-[#ff4d63] rounded shadow-md"
              >
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Selection & Real-Time Telemetry Bar */}
      <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a2233] pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b]/60 border border-[#334155] rounded text-xs font-bold text-[#94a3b8]">
              <Building className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>ACCOUNT:</span>
            </div>

            {/* US Institutional Margin Account Button */}
            <button
              onClick={() => {
                playExecutionChime();
                if (onSelectAccount) onSelectAccount('act-us-margin');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isUsAccount
                  ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-md'
                  : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white hover:border-[#334155]'
              }`}
            >
              <span>🇺🇸 US REG-T MARGIN</span>
              <span className={`text-[10px] ${isUsAccount ? 'text-black/80 font-bold' : 'text-[#8b9bb4]'}`}>
                ${(account.cashBalance / 1000).toFixed(0)}k USD
              </span>
            </button>

            {/* Canadian Accounts Buttons */}
            {canadianAccounts.map((acc) => {
              const isSelected = acc.id === activeAccountId;
              const accNetLiq = acc.cashBalance + acc.positions.reduce((sum, p) => sum + p.currentMark, 0);

              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    playExecutionChime();
                    if (onSelectAccount) onSelectAccount(acc.id);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-md'
                      : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white hover:border-[#334155]'
                  }`}
                >
                  <span>🇨🇦 {acc.code}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black/80 font-bold' : 'text-[#8b9bb4]'}`}>
                    ${(accNetLiq / 1000).toFixed(1)}k {acc.currency}
                  </span>
                </button>
              );
            })}

            {/* Global Consolidated View Button */}
            <button
              onClick={() => {
                playExecutionChime();
                if (onSelectAccount) onSelectAccount('act-global');
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isGlobalAccount
                  ? 'bg-[#10b981] text-black border-[#10b981] font-black shadow-md'
                  : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white hover:border-[#334155]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>🌐 GLOBAL CONSOLIDATED</span>
            </button>
          </div>

          {/* Live Real-Time Telemetry & Controls */}
          <div className="flex items-center gap-2">
            {/* Live Streaming Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
              isLiveTickActive
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400'
                : 'bg-amber-950/40 border-amber-700/50 text-amber-400'
            }`}>
              <Radio className={`w-3.5 h-3.5 ${isLiveTickActive ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
              <span>{isLiveTickActive ? 'OPRA FEED: LIVE' : 'FEED: PAUSED'}</span>
              {lastTickTime && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline border-l border-slate-700 pl-1.5">
                  {lastTickTime}
                </span>
              )}
            </div>

            {/* Toggle Live Ticks */}
            {onToggleLiveTick && (
              <button
                onClick={() => {
                  playKeyClick();
                  onToggleLiveTick();
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1 ${
                  isLiveTickActive
                    ? 'bg-[#1e293b] hover:bg-[#334155] text-slate-300 border-slate-700'
                    : 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border-emerald-600/50'
                }`}
                title={isLiveTickActive ? 'Pause real-time market updates' : 'Resume real-time market updates'}
              >
                {isLiveTickActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isLiveTickActive ? 'PAUSE' : 'RESUME'}</span>
              </button>
            )}

            {/* Manual Real-Time Force Tick */}
            {onSimulateTick && (
              <button
                onClick={() => {
                  playExecutionChime();
                  onSimulateTick();
                }}
                className="px-2.5 py-1 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/50 rounded text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                title="Trigger immediate live market tick and mark-to-market revaluation"
              >
                <Zap className="w-3 h-3 text-[#00d2ff]" />
                <span>TICK NOW</span>
              </button>
            )}

            {/* Seed Portfolio Button */}
            {onSeedPortfolio && (
              <button
                onClick={() => {
                  playExecutionChime();
                  onSeedPortfolio();
                }}
                className="px-2.5 py-1 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 rounded text-xs font-bold transition-all flex items-center gap-1"
                title="Seed realistic multi-asset institutional portfolio (NVDA, AAPL, /ES, /CL, SPY)"
              >
                <Sparkles className="w-3 h-3" />
                <span>+ SEED PORTFOLIO</span>
              </button>
            )}

            {onOpenCanadianSuite && (
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenCanadianSuite();
                }}
                className="px-2.5 py-1 bg-[#ff334b]/20 hover:bg-[#ff334b]/30 text-[#ff334b] border border-[#ff334b]/40 rounded text-xs font-bold transition-all flex items-center gap-1"
              >
                <span>CRA SUITE &gt;</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Portfolio Greeks & Risk Exposure HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[11px] pt-0.5">
          <div
            onClick={() => {
              playKeyClick();
              setActiveTab('beta');
            }}
            className="bg-[#0e1422] hover:bg-[#151f33] border border-[#1e293b] hover:border-[#38bdf8]/50 rounded p-2 flex flex-col cursor-pointer transition-all"
            title="Click to view detailed Portfolio Beta Weighting analysis"
          >
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span>NET DELTA (Δ)</span>
              <span className="text-[#38bdf8] font-bold">β-WEIGHTED &gt;</span>
            </div>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${portfolioGreeks.delta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
              {portfolioGreeks.delta >= 0 ? '+' : ''}{portfolioGreeks.delta.toFixed(1)} Δ
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5 flex items-center justify-between">
              <span>β-SPY:</span>
              <span className="text-[#38bdf8] font-mono font-bold">{portfolioGreeks.betaDelta >= 0 ? '+' : ''}{portfolioGreeks.betaDelta.toFixed(1)} shs</span>
            </div>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span>NET THETA (Θ)</span>
              <span className="text-[#00e676] font-bold">TIME DECAY</span>
            </div>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${portfolioGreeks.theta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
              {portfolioGreeks.theta >= 0 ? '+' : ''}${portfolioGreeks.theta.toFixed(2)}/day
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5">
              Annualized: ${(portfolioGreeks.theta * 365).toFixed(0)}
            </div>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span>NET VEGA (ν)</span>
              <span className="text-[#ffd600] font-bold">VOLATILITY</span>
            </div>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${portfolioGreeks.vega >= 0 ? 'text-[#ffd600]' : 'text-[#f59e0b]'}`}>
              {portfolioGreeks.vega >= 0 ? '+' : ''}${portfolioGreeks.vega.toFixed(2)} / 1% IV
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5">
              Per +5% IV shock: ${(portfolioGreeks.vega * 5).toFixed(2)}
            </div>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span>NET GAMMA (Γ)</span>
              <span className="text-[#a855f7] font-bold">ACCELERATION</span>
            </div>
            <div className="text-sm font-extrabold font-mono mt-0.5 text-white">
              {portfolioGreeks.gamma >= 0 ? '+' : ''}{portfolioGreeks.gamma.toFixed(4)}
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5">
              Delta change per $1 spot move
            </div>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span>COLLATERAL (BP)</span>
              <span className="text-[#ff9900] font-bold">{bpUtilizationPercent.toFixed(1)}% USED</span>
            </div>
            <div className="text-sm font-extrabold font-mono mt-0.5 text-[#ff9900]">
              ${marginRequirement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5">
              Options BP: (${optionsBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
            </div>
          </div>

          {/* Margin Borrow / Carry Card */}
          <div className="bg-[#0e1422] border border-[#ff334b]/40 rounded p-2 flex flex-col">
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span className="flex items-center gap-1">
                <Percent className="w-2.5 h-2.5 text-[#ff334b]" />
                <span>MARGIN BORROW</span>
              </span>
              <span className="text-[#ff334b] font-bold">DAILY</span>
            </div>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${totalDailyBorrowCost > 0 ? 'text-[#ff334b]' : 'text-slate-300'}`}>
              {totalDailyBorrowCost > 0 ? `-$${totalDailyBorrowCost.toFixed(2)}/d` : '$0.00/d'}
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5 flex items-center justify-between">
              <span>Annual: -${(totalDailyBorrowCost * 360).toFixed(0)}/yr</span>
              <button
                onClick={() => {
                  playKeyClick();
                  setActiveTab('interest');
                }}
                className="text-[#38bdf8] hover:underline font-bold text-[8.5px]"
              >
                BLOTTER &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Header Bar */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#ff9900] font-black text-sm">
              PORT // {currentCanadianAccount ? currentCanadianAccount.name.toUpperCase() : 'INSTITUTIONAL PORTFOLIO'}
            </span>
            <span className="text-[#8b9bb4] text-[11px]">
              // {currentCanadianAccount ? `${currentCanadianAccount.institution} · ${currentCanadianAccount.accountNumber}` : 'MARK-TO-MARKET'}
            </span>
            {currentCanadianAccount?.isRegistered && (
              <span className="bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.5 rounded text-[9px] font-black border border-[#00e676]/30">
                CRA REGISTERED
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#8b9bb4] mt-0.5 flex items-center gap-2">
            <span>
              Options Level: <strong className="text-white">{currentCanadianAccount?.optionsLevelLabel || 'Level 4'}</strong>
            </span>
            <span>·</span>
            <span>
              Currency: <strong className="text-[#00d2ff]">{activeCurrency}</strong> (Conversion rate: 1 USD = {USDCAD_EXCHANGE_RATE} CAD)
            </span>
            {currentCanadianAccount?.craContributionRoom && (
              <>
                <span>·</span>
                <span className="text-[#ffd600] font-bold">
                  Available CRA Room: ${currentCanadianAccount.craContributionRoom.availableRoom.toLocaleString()} CAD
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            playKeyClick();
            setShowResetModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#141b28] hover:bg-[#ff334b]/20 text-[#8b9bb4] hover:text-[#ff334b] border border-[#222d44] hover:border-[#ff334b]/40 rounded text-xs font-bold transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET ACCOUNT</span>
        </button>
      </div>

      {/* Real-Time Margin Health & Telemetry Collateral Engine Widget */}
      <MarginHealthWidget
        metrics={marginHealth}
        canadianMetrics={canadianMarginHealth}
        canadianAccounts={canadianAccounts}
        activeCanadianAccount={currentCanadianAccount}
        onSelectAccount={onSelectAccount}
        showCanadianByDefault={!isUsAccount && !isGlobalAccount}
        isLiveTickActive={isLiveTickActive}
        onSimulateTick={onSimulateTick}
        lastTickTime={lastTickTime}
        onUpdateAccounts={onUpdateAccounts}
      />

      {/* Top Metric Cards (5 Columns with Options Buying Power BP) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
          <div className="text-[10px] font-bold text-[#8b9bb4] uppercase mb-1">
            Net Liquidity
          </div>
          <div className="text-xl font-black text-white">
            {isPrivacyMode ? '$••••••' : `$${netLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">Base: $100,000.00</div>
        </div>

        <div className="bg-[#07090e] border-2 border-[#00e5ff]/50 rounded p-3 relative shadow-[0_0_12px_rgba(0,229,255,0.15)]">
          <div className="flex items-center justify-between text-[10px] font-black text-[#00e5ff] uppercase mb-1">
            <span>BUYING POWER (BP)</span>
            <span className="text-[9px] px-1 bg-[#00e5ff]/20 rounded">OPTIONS BP</span>
          </div>
          <div className="text-xl font-black text-[#00e5ff]">
            {isPrivacyMode ? '($••••••)' : `($${optionsBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
          </div>
          <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] mt-0.5">
            <span>Utilized: {isPrivacyMode ? '•••%' : `${bpUtilizationPercent.toFixed(1)}%`}</span>
            <span className="text-[#64748b]">Reg T</span>
          </div>
        </div>

        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
          <div className="text-[10px] font-bold text-[#8b9bb4] uppercase mb-1">
            Margin Required
          </div>
          <div className="text-xl font-black text-[#ffd600]">
            {isPrivacyMode ? '$••••••' : `$${marginRequirement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">Collateral locked</div>
        </div>

        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
          <div className="text-[10px] font-bold text-[#8b9bb4] uppercase mb-1">
            Unrealized P&L
          </div>
          <div
            className={`text-xl font-black ${
              totalUnrealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
            }`}
          >
            {isPrivacyMode
              ? '••••••'
              : `${totalUnrealizedPnL >= 0 ? '+' : ''}$${totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">
            {account.positions.length} active {account.positions.length === 1 ? 'position' : 'positions'}
          </div>
        </div>

        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
          <div className="text-[10px] font-bold text-[#8b9bb4] uppercase mb-1">
            Cash &amp; Realized P&L
          </div>
          <div className="text-xl font-black text-white">
            {isPrivacyMode ? '$••••••' : `$${account.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[10px] mt-0.5 flex items-center justify-between">
            <span className="text-[#64748b]">Settled Cash</span>
            <span className={account.realizedPnL >= 0 ? 'text-[#00e676] font-bold' : 'text-[#ff334b] font-bold'}>
              {isPrivacyMode ? '•••••• Realized' : `${account.realizedPnL >= 0 ? '+' : ''}$${account.realizedPnL.toFixed(0)} Realized`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs and Blotter Table */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
        <div className="bg-[#090d16] px-3 py-2 border-b border-[#1e2638] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('positions');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'positions'
                  ? 'bg-[#ff9900] text-black border-[#ff9900]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <Radio className={`w-3 h-3 ${isLiveTickActive ? 'text-black animate-pulse' : 'text-slate-400'}`} />
              <span>LIVE POSITIONS ({activePositions.length})</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('greeks');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'greeks'
                  ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>GREEKS &amp; RISK MATRIX</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('beta');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'beta'
                  ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-extrabold shadow-sm'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>BETA WEIGHTING (β-Δ)</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('performance');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'performance'
                  ? 'bg-[#43a047] text-white border-[#43a047]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>PERFORMANCE (30D D3)</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('statement');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'statement'
                  ? 'bg-[#00d2ff] text-black border-[#00d2ff]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ACCOUNT STATEMENT</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('orders');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                activeTab === 'orders'
                  ? 'bg-[#ff9900] text-black border-[#ff9900]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              EXECUTION BLOTTER ({activeOrders.length})
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('bp');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'bp'
                  ? 'bg-[#00e5ff] text-black border-[#00e5ff]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>BUYING POWER &amp; MARGIN (BP)</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('interest');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'interest'
                  ? 'bg-[#ff334b] text-white border-[#ff334b]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>MARGIN BORROW &amp; FINANCING</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('dividends');
              }}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'dividends'
                  ? 'bg-[#10b981] text-[#052e16] border-[#10b981]'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>DIVIDEND TRACKER</span>
            </button>
          </div>
        </div>

        {/* Positions View */}
        {activeTab === 'positions' && (
          <div>
            {activePositions.length === 0 ? (
              <div className="py-16 text-center text-[#8b9bb4]">
                <Layers className="w-8 h-8 text-[#ff9900] mx-auto mb-2 opacity-60" />
                <div className="text-sm font-bold text-white mb-1">NO OPEN POSITIONS IN BLOTTER</div>
                <p className="text-xs max-w-sm mx-auto mb-4">
                  Construct and execute multi-leg strategies via <strong className="text-[#ff9900]">OMON</strong>, <strong className="text-[#00d2ff]">OVME</strong>, or click below to seed an institutional multi-asset test portfolio.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {onSeedPortfolio && (
                    <button
                      onClick={() => {
                        playExecutionChime();
                        onSeedPortfolio();
                      }}
                      className="px-4 py-1.5 bg-[#ff9900] text-black font-extrabold rounded text-xs hover:bg-[#ffad33] transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SEED INSTITUTIONAL PORTFOLIO</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playKeyClick();
                      onNavigateToChain();
                    }}
                    className="px-4 py-1.5 bg-[#1e293b] text-white border border-[#334155] font-bold rounded text-xs hover:bg-[#334155]"
                  >
                    OPEN OMON MATRIX
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-[#0b0f1a] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                      <th className="py-2.5 px-3">Symbol / Quote</th>
                      <th className="py-2.5 px-3">Strategy Structure &amp; Legs</th>
                      <th className="py-2.5 px-3 text-right">
                        <div>Position Greeks</div>
                        <div className="text-[8px] text-[#38bdf8] font-bold">Raw Δ · β-Δ (SPY)</div>
                      </th>
                      <th className="py-2.5 px-3 text-right">Contracts</th>
                      <th className="py-2.5 px-3 text-right">Cost Basis</th>
                      <th className="py-2.5 px-3 text-right text-[#c084fc]">
                        <div>Trade IV</div>
                        <div className="text-[8px] text-[#a855f7] font-bold">At Trade · Live (Δ)</div>
                      </th>
                      <th className="py-2.5 px-3 text-right text-[#ff9900]">Margin BP</th>
                      <th className="py-2.5 px-3 text-right text-[#ff334b]">Borrow / Carry</th>
                      <th className="py-2.5 px-3 text-right">Live Mark</th>
                      <th className="py-2.5 px-3 text-right">Unrealized P&amp;L</th>
                      <th className="py-2.5 px-3 text-right">Return %</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141b28]">
                    {activePositions.map((pos) => {
                      const isUp = pos.unrealizedPnL >= 0;
                      const tick = tickers?.[pos.ticker];
                      const greeks = positionGreeksMap[pos.id] || { delta: 0, gamma: 0, theta: 0, vega: 0, betaDelta: 0 };
                      const flash = tickFlashMap[pos.id];
                      const marginInfo = positionMarginsMap[pos.id] || { marginBp: Math.abs(pos.entryCost), ruleLabel: 'RULE 4210', badgeClass: 'text-[#8b9bb4]' };
                      const borrowItem = positionBorrowMap[pos.id];

                      return (
                        <tr
                          key={pos.id}
                          className={`transition-colors duration-300 ${
                            flash === 'up'
                              ? 'bg-emerald-950/40'
                              : flash === 'down'
                              ? 'bg-rose-950/40'
                              : 'hover:bg-[#121929]'
                          }`}
                        >
                          {/* Symbol / Spot Quote */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => onSelectTicker && onSelectTicker(pos.ticker)}
                                className="font-black text-white hover:text-[#ff9900] cursor-pointer text-sm"
                                title="Click to inspect ticker"
                              >
                                {pos.ticker}
                              </span>
                              {tick && (
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                  tick.change >= 0
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                    : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                                }`}>
                                  ${tick.price.toFixed(2)}{' '}
                                  <span className="text-[9px]">
                                    {tick.change >= 0 ? '+' : ''}{tick.changePercent.toFixed(1)}%
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#ff9900] font-bold mt-0.5 truncate max-w-[200px]" title={pos.strategyName}>
                              {pos.strategyName}
                            </div>
                            <div className="text-[9.5px] text-[#64748b] flex items-center gap-1.5 mt-0.5">
                              <span>Opened {pos.openedAt}</span>
                              <span className="px-1 py-0.2 rounded text-[8.5px] bg-[#1e2638] text-slate-300 uppercase">
                                {pos.assetCategory || 'OPTION'}
                              </span>
                            </div>
                          </td>

                          {/* Strategy Structure / Legs */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5 max-w-[320px]">
                              {pos.legs.map((leg, lIdx) => (
                                <div key={lIdx} className="text-[11px] text-[#cbd5e1] flex items-center gap-1.5">
                                  <span
                                    className={`uppercase font-bold text-[10px] px-1 py-0.2 rounded ${
                                      leg.action === 'buy' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff334b]/15 text-[#ff334b]'
                                    }`}
                                  >
                                    {leg.action}
                                  </span>
                                  {leg.type === 'stock' ? (
                                    <span className="text-[#10b981] font-bold font-mono">
                                      {leg.contracts % 1 === 0 ? leg.contracts : leg.contracts.toFixed(4)} SH @ ${leg.strike.toFixed(2)} (STOCK)
                                    </span>
                                  ) : leg.type === 'future' ? (
                                    <span className="text-[#ffd600] font-bold font-mono">
                                      {leg.contracts} CT @ ${leg.strike.toFixed(2)} (FUT · {leg.multiplier || 50}x)
                                    </span>
                                  ) : (
                                    <span className="font-mono">
                                      ${leg.strike} {leg.type.toUpperCase()}{' '}
                                      <span className="text-[#8b9bb4]">({leg.expiration} · {leg.dte}d)</span>
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Position Greeks */}
                          <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                            <div className={`font-bold ${greeks.delta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                              {greeks.delta >= 0 ? '+' : ''}{greeks.delta.toFixed(1)} Δ
                            </div>
                            <div className="text-[9px] text-[#38bdf8] font-bold">
                              β-Δ: {greeks.betaDelta >= 0 ? '+' : ''}{greeks.betaDelta.toFixed(1)}
                            </div>
                            <div className="text-[9px] text-[#00e676]">
                              {greeks.theta >= 0 ? '+' : ''}${greeks.theta.toFixed(1)}/d Θ
                            </div>
                            <div className="text-[9px] text-[#ffd600]">
                              ${greeks.vega.toFixed(1)} ν
                            </div>
                          </td>

                          {/* Contracts / Qty */}
                          <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                            {pos.contracts % 1 === 0 ? pos.contracts : pos.contracts.toFixed(4)}x
                          </td>

                          {/* Cost Basis */}
                          <td className="py-2.5 px-3 text-right font-bold text-[#cbd5e1] font-mono">
                            ${Math.abs(pos.entryCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Trade IV (At Trade vs Live) */}
                          <td className="py-2.5 px-3 text-right font-mono" title={`Implied Volatility when trade was executed: ${((pos.entryIV ?? (pos.legs[0]?.iv || tick?.currentIV || 0.25)) * 100).toFixed(1)}% | Current Live IV: ${((tick?.currentIV || pos.entryIV || 0.25) * 100).toFixed(1)}% | Net IV Shift: ${(tick?.currentIV ? tick.currentIV - (pos.entryIV ?? pos.legs[0]?.iv ?? tick.currentIV) : 0) >= 0 ? '+' : ''}${(((tick?.currentIV || 0.25) - (pos.entryIV ?? (pos.legs[0]?.iv || tick?.currentIV || 0.25))) * 100).toFixed(1)}% pts`}>
                            {(() => {
                              const entryIv = pos.entryIV !== undefined
                                ? pos.entryIV
                                : (pos.legs[0]?.iv && pos.legs[0].iv > 0)
                                ? pos.legs.reduce((acc, l) => acc + (l.iv || 0) * (l.contracts || 1), 0) / Math.max(1, pos.legs.reduce((acc, l) => acc + (l.contracts || 1), 0))
                                : (tick?.currentIV || 0.25);
                              const liveIv = tick?.currentIV || entryIv;
                              const diff = liveIv - entryIv;
                              return (
                                <div>
                                  <div className="font-bold text-[#f3e8ff] flex items-center justify-end gap-1">
                                    <span className="text-[8.5px] text-[#c084fc] font-semibold">ENTRY:</span>
                                    <span>{(entryIv * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="text-[9px] flex items-center justify-end gap-1 mt-0.5">
                                    <span className="text-[#8b9bb4]">LIVE: {(liveIv * 100).toFixed(1)}%</span>
                                    <span className={`px-1 py-0.2 rounded font-black text-[8px] ${
                                      Math.abs(diff) < 0.001
                                        ? 'text-[#8b9bb4] bg-[#1e2638]'
                                        : diff > 0
                                        ? 'text-[#d8b4fe] bg-[#a855f7]/20 border border-[#a855f7]/40'
                                        : 'text-[#38bdf8] bg-[#0284c7]/20 border border-[#0284c7]/40'
                                    }`}>
                                      {diff >= 0 ? '+' : ''}{(diff * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Margin Buying Power (BP) */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold" title="Initial Margin Requirement / BP Reduction under FINRA Rule 4210 & Reg-T">
                            <div className="text-[#ff9900]">
                              (${marginInfo.marginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </div>
                            <div className={`text-[8.5px] px-1 py-0.2 rounded inline-block border font-mono mt-0.5 ${marginInfo.badgeClass}`}>
                              {marginInfo.ruleLabel}
                            </div>
                          </td>

                          {/* Borrow / Carry Interest */}
                          <td className="py-2.5 px-3 text-right font-mono" title="Borrow rate & financing cost for short stock, futures & margin debits">
                            {borrowItem ? (
                              <div>
                                <div className="flex items-center justify-end gap-1">
                                  <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold uppercase ${
                                    borrowItem.borrowClassification === 'HTB'
                                      ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                                      : borrowItem.borrowClassification === 'SPAN_FINANCING'
                                      ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                  }`}>
                                    {borrowItem.borrowClassification === 'HTB' ? 'HTB' : borrowItem.borrowClassification === 'SPAN_FINANCING' ? 'SPAN' : 'ETB'}{' '}
                                    {(borrowItem.annualInterestRate * 100).toFixed(2)}%
                                  </span>
                                </div>
                                <div className="text-[11px] font-bold text-[#ff334b] mt-0.5">
                                  -${Math.abs(borrowItem.dailyInterestCost).toFixed(2)}/d
                                </div>
                                <div className="text-[8.5px] text-[#64748b]">
                                  -${Math.abs(borrowItem.annualInterestCost).toFixed(0)}/yr
                                </div>
                              </div>
                            ) : (
                              <div className="text-[#64748b] text-[10px]">$0.00/d</div>
                            )}
                          </td>

                          {/* Live Current Mark (with tick flash) */}
                          <td className="py-2.5 px-3 text-right font-mono">
                            <div className={`font-bold transition-all px-1.5 py-0.5 rounded inline-block ${
                              flash === 'up'
                                ? 'bg-emerald-500 text-black font-black'
                                : flash === 'down'
                                ? 'bg-rose-500 text-white font-black'
                                : 'text-white'
                            }`}>
                              ${Math.abs(pos.currentMark).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* Unrealized P&L ($) */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black ${
                              isUp ? 'text-[#00e676]' : 'text-[#ff334b]'
                            }`}
                          >
                            {isUp ? '+' : ''}${pos.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Unrealized P&L (%) */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black ${
                              isUp ? 'text-[#00e676]' : 'text-[#ff334b]'
                            }`}
                          >
                            {isUp ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(1)}%
                          </td>

                          {/* Quick Actions */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onNavigateToRisk && pos.legs.length > 0 && (
                                <button
                                  onClick={() => onNavigateToRisk(pos)}
                                  title="Analyze full strategy risk profile, payoff curves & Greeks"
                                  className="px-2 py-1 bg-[#ff9900]/15 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/30 rounded text-[10px] font-bold transition-all"
                                >
                                  RISK &gt;
                                </button>
                              )}
                              <button
                                onClick={() => handleClose(pos.id)}
                                title="Liquidate and close position at live mark"
                                className="px-2 py-1 bg-[#141b28] hover:bg-[#ff334b]/20 text-[#cbd5e1] hover:text-[#ff334b] border border-[#222d44] hover:border-[#ff334b]/50 rounded text-[10px] font-bold transition-all"
                              >
                                CLOSE
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#070a10] border-t-2 border-[#1e2638] font-mono text-[11px]">
                    <tr className="text-white">
                      <td colSpan={3} className="py-2.5 px-3 font-bold text-[#8b9bb4]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#38bdf8] font-black mr-1">PORTFOLIO TOTALS</span>
                          <span>({activePositions.length} active positions · FINRA Rule 4210)</span>
                          <span className="px-2 py-0.5 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-[10px] font-mono font-black">
                            Net β-Δ: {portfolioGreeks.betaDelta >= 0 ? '+' : ''}{portfolioGreeks.betaDelta.toFixed(1)} SPY shs
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {activePositions.reduce((s, p) => s + p.contracts, 0)}x
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#cbd5e1]">
                        ${activePositions.reduce((s, p) => s + Math.abs(p.entryCost), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#ff9900]">
                        (${marginRequirement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#ff334b]">
                        -${totalDailyBorrowCost.toFixed(2)}/d
                        <div className="text-[8.5px] text-[#8b9bb4] font-normal">
                          -${(totalDailyBorrowCost * 360).toFixed(0)}/yr
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        ${positionsCurrentMarkTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black ${totalUnrealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                        {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black ${totalReturnPercent >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                        {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#8b9bb4] text-[10px]">
                        ACTIVE MTM
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Beta Weighting (β-Δ) & Greeks Matrix View */}
        {(activeTab === 'beta' || activeTab === 'greeks') && (
          <div className="p-4">
            <PortfolioBetaWeightingView
              positions={activePositions}
              tickers={tickers}
              onSelectTicker={onSelectTicker}
            />
          </div>
        )}

        {/* Performance (30D D3) View */}
        {activeTab === 'performance' && (
          <div className="p-4">
            <D3PerformanceChart account={account} />
          </div>
        )}

        {/* Account Statement View */}
        {activeTab === 'statement' && (
          <AccountStatementView
            account={account}
            canadianAccounts={canadianAccounts}
            activeAccountId={activeAccountId}
            onSelectAccount={onSelectAccount}
            tickers={tickers}
            isPrivacyMode={isPrivacyMode}
            onNavigateToMonitor={() => setActiveTab('positions')}
          />
        )}

        {/* Orders View */}
        {activeTab === 'orders' && (
          <div>
            {account.orders.length === 0 ? (
              <div className="py-16 text-center text-[#8b9bb4]">No orders executed in this session.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-[#0b0f1a] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Strategy</th>
                      <th className="py-2.5 px-3">Order Type</th>
                      <th className="py-2.5 px-3 text-right">Contracts</th>
                      <th className="py-2.5 px-3 text-right text-[#c084fc]">
                        <div>Trade IV</div>
                        <div className="text-[8px] text-[#a855f7] font-bold">At Fill</div>
                      </th>
                      <th className="py-2.5 px-3 text-right">Cash Movement</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141b28]">
                    {account.orders.map((ord) => {
                      const isDebit = ord.netDebitCredit >= 0;
                      const tradeIvVal = ord.entryIV ?? (ord.tradeIV ?? (ord.legs?.[0]?.iv || 0.25));
                      return (
                        <tr key={ord.id} className="hover:bg-[#121929] transition-colors font-mono">
                          <td className="py-2.5 px-3 text-[#8b9bb4]">{ord.timestamp}</td>
                          <td className="py-2.5 px-3 font-black text-white">{ord.ticker}</td>
                          <td className="py-2.5 px-3 text-[#ff9900] font-bold">{ord.strategyName}</td>
                          <td className="py-2.5 px-3 uppercase text-[#8b9bb4]">{ord.type}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {ord.contracts % 1 === 0 ? ord.contracts : ord.contracts.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-[#f3e8ff]">
                            <span className="px-1.5 py-0.5 rounded bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#d8b4fe]">
                              {(tradeIvVal * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              isDebit ? 'text-[#ff334b]' : 'text-[#00e676]'
                            }`}
                          >
                            {isDebit ? '-' : '+'}${Math.abs(ord.totalCost).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[10px] uppercase font-black text-[#00e676] bg-[#00e676]/10 border border-[#00e676]/30 px-2 py-0.5 rounded">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Buying Power & Margin Analysis View */}
        {activeTab === 'bp' && (
          <div className="p-4 flex flex-col gap-4">
            {/* BP Health Banner */}
            <div className="bg-[#0b101c] border border-[#1e2638] rounded p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black text-white uppercase flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#00e5ff]" />
                  <span>OPTIONS BUYING POWER &amp; REG-T MARGIN ANALYSIS</span>
                </div>
                <div className="text-[11px] text-[#8b9bb4] mt-1">
                  Real-time collateral calculation enforcing FINRA / CBOE Rule 4210 options margin requirements.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-[#8b9bb4] uppercase">Buying Power Status</div>
                  <div
                    className={`text-sm font-black uppercase ${
                      bpUtilizationPercent < 50
                        ? 'text-[#00e676]'
                        : bpUtilizationPercent < 80
                        ? 'text-[#ffd600]'
                        : 'text-[#ff334b]'
                    }`}
                  >
                    {bpUtilizationPercent < 50
                      ? 'EXCESS CAPITAL (SAFE)'
                      : bpUtilizationPercent < 80
                      ? 'MODERATE UTILIZATION'
                      : 'MARGIN WARNING'}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Utilization Meter */}
            <div className="bg-[#07090e] border border-[#1e2638] rounded p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8b9bb4] font-bold">BUYING POWER CAPACITY GAUGE:</span>
                <span className="font-mono text-white font-bold">
                  {bpUtilizationPercent.toFixed(1)}% Allocated (${marginRequirement.toLocaleString('en-US', { minimumFractionDigits: 2 })} / ${totalBpPool.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
              </div>
              <div className="w-full h-3 bg-[#101626] rounded-full overflow-hidden flex border border-[#1e2638]">
                <div
                  className={`h-full transition-all duration-500 ${
                    bpUtilizationPercent < 50
                      ? 'bg-gradient-to-r from-[#00e5ff] to-[#00e676]'
                      : bpUtilizationPercent < 80
                      ? 'bg-gradient-to-r from-[#00e5ff] to-[#ffd600]'
                      : 'bg-gradient-to-r from-[#ffd600] to-[#ff334b]'
                  }`}
                  style={{ width: `${Math.min(100, bpUtilizationPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-[#64748b]">
                <span>0% (100% Cash Buffer)</span>
                <span>50% Prudent Limit</span>
                <span>80% Margin Warning</span>
                <span>100% Liquidation Threshold</span>
              </div>
            </div>

            {/* Margin Breakdown by Strategy Rules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
                <div className="text-[10px] font-bold text-[#00e5ff] uppercase mb-1">
                  Defined-Risk Spreads
                </div>
                <div className="text-base font-black text-white">Strike Width - Credit</div>
                <p className="text-[10px] text-[#8b9bb4] mt-1 leading-relaxed">
                  Verticals and Iron Condors require collateral equal to the maximum loss (spread width × 100 contracts minus net credit received).
                </p>
              </div>

              <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
                <div className="text-[10px] font-bold text-[#ffd600] uppercase mb-1">
                  Long Options (Calls/Puts)
                </div>
                <div className="text-base font-black text-white">100% Cash Paid</div>
                <p className="text-[10px] text-[#8b9bb4] mt-1 leading-relaxed">
                  Long options cannot be bought on margin. 100% of the premium paid is debited directly from available cash with zero maintenance requirement.
                </p>
              </div>

              <div className="bg-[#07090e] border border-[#1e2638] rounded p-3">
                <div className="text-[10px] font-bold text-[#ff334b] uppercase mb-1">
                  Naked Short Options
                </div>
                <div className="text-base font-black text-white">20% Spot + Premium</div>
                <p className="text-[10px] text-[#8b9bb4] mt-1 leading-relaxed">
                  FINRA Rule 4210: 20% of underlying stock value minus out-of-the-money amount, subject to a 10% minimum safety floor.
                </p>
              </div>
            </div>

            {/* Active Positions Margin Allocation Table */}
            <div className="border border-[#1e2638] rounded overflow-hidden">
              <div className="bg-[#0b0f1a] px-3 py-2 border-b border-[#1e2638] font-bold text-white text-[11px] flex justify-between">
                <span>ACTIVE POSITIONS MARGIN IMPACT ({account.positions.length})</span>
                <span className="text-[#8b9bb4]">Reg T Standard</span>
              </div>
              {account.positions.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] text-xs">
                  No active options positions locking buying power. Full $100,000.00 cash available for trading.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs select-none">
                    <thead>
                      <tr className="bg-[#080c14] text-[#8b9bb4] text-[10px] uppercase border-b border-[#1e2638]">
                        <th className="py-2 px-3">Ticker / Strategy</th>
                        <th className="py-2 px-3">Contracts</th>
                        <th className="py-2 px-3 text-right">Entry Value</th>
                        <th className="py-2 px-3 text-right">Current Mark</th>
                        <th className="py-2 px-3 text-right text-[#ffd600]">Margin Required</th>
                        <th className="py-2 px-3 text-right text-[#00e5ff]">% of Total BP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141b28]">
                      {account.positions.map((pos) => {
                        const posMargin = pos.entryCost < 0 ? Math.abs(pos.entryCost) * 1.5 : 0;
                        const bpShare = totalBpPool > 0 ? (posMargin / totalBpPool) * 100 : 0;
                        return (
                          <tr key={pos.id} className="hover:bg-[#121929]">
                            <td className="py-2 px-3 font-bold text-white">
                              <span>{pos.ticker}</span>{' '}
                              <span className="text-[#ff9900] text-[10px]">({pos.strategyName})</span>
                            </td>
                            <td className="py-2 px-3 text-white">{pos.contracts}x</td>
                            <td className="py-2 px-3 text-right text-[#cbd5e1]">
                              ${Math.abs(pos.entryCost).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-white">
                              ${pos.currentMark.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-[#ffd600]">
                              ${posMargin.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#00e5ff]">
                              {bpShare.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Margin Borrow & Financing Tab (Short Stocks, Futures SPAN Carry & Debit Interest) */}
        {activeTab === 'interest' && (
          <div className="p-4 flex flex-col gap-4">
            {/* Top Banner */}
            <div className="bg-[#0b101d] border border-[#ff334b]/30 rounded p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#ff334b]/10 border border-[#ff334b]/30 flex items-center justify-center text-[#ff334b]">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span>MARGIN BORROW, FINANCING &amp; CARRY BLOTTER</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40 font-mono font-bold">
                      FINRA RULE 4210 · SEC RULE 204
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8b9bb4] mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Active 360-day money market accrual convention</span>
                    <span>·</span>
                    <span>US SOFR: <strong className="text-white">{(BENCHMARK_RATES.US_SOFR * 100).toFixed(2)}%</strong></span>
                    <span>·</span>
                    <span>CAD BoC: <strong className="text-white">{(BENCHMARK_RATES.CAD_BOC * 100).toFixed(2)}%</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-[#8b9bb4] uppercase">Total Daily Accrual Cost</div>
                  <div className={`text-base font-black font-mono ${totalDailyBorrowCost > 0 ? 'text-[#ff334b]' : 'text-[#00e676]'}`}>
                    {totalDailyBorrowCost > 0 ? `-$${totalDailyBorrowCost.toFixed(2)} / day` : '$0.00 / day'}
                  </div>
                  <div className="text-[9.5px] text-[#64748b]">
                    {totalDailyBorrowCost > 0 ? `-$${(totalDailyBorrowCost * 360).toFixed(2)} / annualized` : 'No borrow drag'}
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Summary Cards (4 Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#090d16] border border-[#ff334b]/30 rounded p-3 flex flex-col">
                <span className="text-[9.5px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
                  <Percent className="w-3 h-3 text-[#ff334b]" />
                  <span>Daily Borrow Drag</span>
                </span>
                <span className={`text-lg font-black font-mono mt-1 ${totalDailyBorrowCost > 0 ? 'text-[#ff334b]' : 'text-slate-300'}`}>
                  {totalDailyBorrowCost > 0 ? `-$${totalDailyBorrowCost.toFixed(2)}` : '$0.00'}
                </span>
                <span className="text-[9px] text-[#64748b] mt-0.5">
                  Accrues daily including weekends &amp; holidays
                </span>
              </div>

              <div className="bg-[#090d16] border border-[#1e2638] rounded p-3 flex flex-col">
                <span className="text-[9.5px] text-[#8b9bb4] uppercase font-bold">Annualized Carry Drag</span>
                <span className="text-lg font-black font-mono text-white mt-1">
                  {totalDailyBorrowCost > 0 ? `-$${(totalDailyBorrowCost * 360).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}
                </span>
                <span className="text-[9px] text-[#64748b] mt-0.5">
                  360-day institutional basis
                </span>
              </div>

              <div className="bg-[#090d16] border border-[#1e2638] rounded p-3 flex flex-col">
                <span className="text-[9.5px] text-[#ffd600] uppercase font-bold">Hard-to-Borrow (HTB) Fees</span>
                <span className="text-lg font-black font-mono text-[#ffd600] mt-1">
                  {marginHealth.marginInterestSummary && marginHealth.marginInterestSummary.shortStockDailyBorrowCost > 0
                    ? `-$${marginHealth.marginInterestSummary.shortStockDailyBorrowCost.toFixed(2)}/d`
                    : '$0.00/d'}
                </span>
                <span className="text-[9px] text-[#64748b] mt-0.5">
                  Short stock locate &amp; securities lending
                </span>
              </div>

              <div className="bg-[#090d16] border border-[#1e2638] rounded p-3 flex flex-col">
                <span className="text-[9.5px] text-[#00d2ff] uppercase font-bold">Futures SPAN Margin Carry</span>
                <span className="text-lg font-black font-mono text-[#00d2ff] mt-1">
                  {marginHealth.marginInterestSummary && marginHealth.marginInterestSummary.futuresDailyCarryingCost > 0
                    ? `-$${marginHealth.marginInterestSummary.futuresDailyCarryingCost.toFixed(2)}/d`
                    : '$0.00/d'}
                </span>
                <span className="text-[9px] text-[#64748b] mt-0.5">
                  CME initial margin opportunity cost
                </span>
              </div>
            </div>

            {/* Position-by-Position Borrow & Financing Blotter */}
            <div className="border border-[#1e2638] rounded overflow-hidden">
              <div className="bg-[#0b0f1a] px-3 py-2 border-b border-[#1e2638] font-bold text-white text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#ff334b]" />
                  <span>ACTIVE PORTFOLIO FINANCING &amp; BORROW FEES ({marginHealth.marginInterestSummary?.items.length || 0})</span>
                </div>
                <div className="text-[10px] text-[#8b9bb4] flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00e676]" /> ETB: Easy-to-Borrow
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ff334b]" /> HTB: Hard-to-Borrow
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00d2ff]" /> SPAN: Futures Margin
                  </span>
                </div>
              </div>

              {(!marginHealth.marginInterestSummary || marginHealth.marginInterestSummary.items.length === 0) ? (
                <div className="p-8 text-center text-[#8b9bb4] text-xs">
                  No short stock, futures, or cash debit positions currently incurring margin borrowing fees in this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="bg-[#080c14] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                        <th className="py-2.5 px-3">Position / Asset</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Borrow Class</th>
                        <th className="py-2.5 px-3 text-right">Notional Exposure</th>
                        <th className="py-2.5 px-3 text-right">Margin Collateral</th>
                        <th className="py-2.5 px-3 text-right text-[#ffd600]">Borrow APR</th>
                        <th className="py-2.5 px-3 text-right text-[#ff334b]">Daily Cost</th>
                        <th className="py-2.5 px-3 text-right">30-Day Cost</th>
                        <th className="py-2.5 px-3 text-right">Annual Cost</th>
                        <th className="py-2.5 px-3 text-center">Tax Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141b28] font-mono text-[11px]">
                      {marginHealth.marginInterestSummary.items.map((item) => (
                        <tr key={item.positionId} className="hover:bg-[#121929] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#38bdf8] font-black">{item.ticker}</span>
                              <span className="text-[10px] text-[#8b9bb4] font-normal truncate max-w-[150px]">
                                {item.strategyName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[#cbd5e1] uppercase text-[10px]">
                            {item.assetType}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                item.borrowClassification === 'HTB'
                                  ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                                  : item.borrowClassification === 'SPAN_FINANCING'
                                  ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40'
                                  : 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                              }`}
                            >
                              {item.borrowClassification}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-white">
                            ${item.notionalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#ffd600]">
                            ${item.marginRequirement.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#ffd600]">
                            {(item.annualInterestRate * 100).toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-[#ff334b]">
                            -${Math.abs(item.dailyInterestCost).toFixed(2)}/d
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#ff334b]">
                            -${Math.abs(item.monthlyInterestCost).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#cbd5e1]">
                            -${Math.abs(item.annualInterestCost).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 font-bold"
                              title={item.taxNote}
                            >
                              DEDUCTIBLE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Interactive Short Borrow & Margin Interest Simulator */}
            <div className="bg-[#080d17] border border-[#1e2638] rounded p-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#ffd600]" />
                  <span className="font-black text-white text-xs">
                    INTERACTIVE SHORT BORROW &amp; MARGIN CARRY CALCULATOR
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#8b9bb4]">Currency:</span>
                  <button
                    onClick={() => setSimCurrency('USD')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      simCurrency === 'USD' ? 'bg-[#ff9900] text-black' : 'bg-[#141b28] text-[#8b9bb4]'
                    }`}
                  >
                    USD (SOFR)
                  </button>
                  <button
                    onClick={() => setSimCurrency('CAD')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      simCurrency === 'CAD' ? 'bg-[#ff9900] text-black' : 'bg-[#141b28] text-[#8b9bb4]'
                    }`}
                  >
                    CAD (BoC)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">Ticker / Asset</label>
                  <input
                    type="text"
                    value={simTicker}
                    onChange={(e) => {
                      const sym = e.target.value.toUpperCase();
                      setSimTicker(sym);
                      if (STOCK_BORROW_RATES[sym]) {
                        setSimBorrowRate(STOCK_BORROW_RATES[sym].rate * 100);
                      }
                      if (tickers?.[sym]) {
                        setSimPrice(tickers[sym].price);
                      }
                    }}
                    className="w-full bg-[#121929] border border-[#1e2638] rounded px-2.5 py-1.5 text-white font-mono text-xs font-bold"
                  />
                  <div className="flex gap-1 mt-1">
                    {['DJT', 'TSLA', 'GME', 'NVDA', 'SPY', '/ES'].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          setSimTicker(sym);
                          if (STOCK_BORROW_RATES[sym]) {
                            setSimBorrowRate(STOCK_BORROW_RATES[sym].rate * 100);
                          }
                          if (tickers?.[sym]) {
                            setSimPrice(tickers[sym].price);
                          }
                        }}
                        className="text-[9px] px-1 py-0.5 bg-[#141b28] hover:bg-[#1e293b] text-[#8b9bb4] hover:text-white rounded"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">Shares / Contracts</label>
                  <input
                    type="number"
                    value={simShares}
                    onChange={(e) => setSimShares(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#121929] border border-[#1e2638] rounded px-2.5 py-1.5 text-white font-mono text-xs font-bold"
                  />
                  <span className="text-[9px] text-[#64748b]">Size of short position</span>
                </div>

                <div>
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">Asset Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simPrice}
                    onChange={(e) => setSimPrice(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-[#121929] border border-[#1e2638] rounded px-2.5 py-1.5 text-white font-mono text-xs font-bold"
                  />
                  <span className="text-[9px] text-[#64748b]">
                    Notional: ${(simShares * simPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">Borrow Rate (% APR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simBorrowRate}
                    onChange={(e) => setSimBorrowRate(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#121929] border border-[#1e2638] rounded px-2.5 py-1.5 text-[#ffd600] font-mono text-xs font-bold"
                  />
                  <div className="flex gap-1 mt-1 text-[8.5px]">
                    <button onClick={() => setSimBorrowRate(0.35)} className="text-[#8b9bb4] hover:text-white">ETB 0.35%</button>
                    <span>·</span>
                    <button onClick={() => setSimBorrowRate(18.5)} className="text-[#ffd600] hover:text-white">HTB 18.5%</button>
                    <span>·</span>
                    <button onClick={() => setSimBorrowRate(85.0)} className="text-[#ff334b] hover:text-white">SQZ 85%</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">Holding Period (Days)</label>
                  <input
                    type="number"
                    value={simHoldingDays}
                    onChange={(e) => setSimHoldingDays(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#121929] border border-[#1e2638] rounded px-2.5 py-1.5 text-white font-mono text-xs font-bold"
                  />
                  <div className="flex gap-1 mt-1 text-[8.5px]">
                    {[7, 30, 90, 180, 360].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSimHoldingDays(d)}
                        className={`px-1 rounded ${simHoldingDays === d ? 'bg-[#ff9900] text-black font-bold' : 'text-[#8b9bb4]'}`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculator Output Projection Card */}
              {(() => {
                const notional = simShares * simPrice;
                const dailyCost = (notional * (simBorrowRate / 100)) / 360;
                const totalCost = dailyCost * simHoldingDays;
                const hurdleMovePct = (simBorrowRate / 100) * (simHoldingDays / 360) * 100;
                const regTMargin = notional * 0.50;

                return (
                  <div className="bg-[#0b101c] border border-[#1e2638] rounded p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[9.5px] text-[#8b9bb4] uppercase block">Daily Borrow Drag</span>
                      <span className="text-base font-black font-mono text-[#ff334b]">
                        -${dailyCost.toFixed(2)} / day
                      </span>
                      <span className="text-[9px] text-[#64748b] block mt-0.5">
                        ${(dailyCost * 7).toFixed(2)} weekly accrual
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8b9bb4] uppercase block">{simHoldingDays}-Day Total Fee</span>
                      <span className="text-base font-black font-mono text-[#ff334b]">
                        -${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-[#64748b] block mt-0.5">
                        Cumulative borrow charge
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#ffd600] uppercase block">Hurdle Downside Needed</span>
                      <span className="text-base font-black font-mono text-[#ffd600]">
                        -{hurdleMovePct.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-[#64748b] block mt-0.5">
                        Stock must drop to ${(simPrice * (1 - hurdleMovePct / 100)).toFixed(2)} to breakeven
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#00d2ff] uppercase block">Reg-T Collateral Locked</span>
                      <span className="text-base font-black font-mono text-white">
                        ${regTMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-[#64748b] block mt-0.5">
                        50% initial equity requirement
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Hard-to-Borrow (HTB) Market Rate Catalog Directory */}
            <div className="bg-[#090d16] border border-[#1e2638] rounded p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-2">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#ffd600]" />
                  <span className="font-black text-white text-xs">
                    HARD-TO-BORROW (HTB) &amp; FUTURES CARRY RATE DIRECTORY
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Filter ticker (e.g. DJT, TSLA, /ES)..."
                  value={htbSearchQuery}
                  onChange={(e) => setHtbSearchQuery(e.target.value)}
                  className="bg-[#121929] border border-[#1e2638] rounded px-2 py-1 text-xs text-white font-mono placeholder:text-[#64748b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {Object.entries(STOCK_BORROW_RATES)
                  .filter(([sym]) => !htbSearchQuery || sym.includes(htbSearchQuery.toUpperCase()))
                  .map(([sym, info]) => (
                    <div
                      key={sym}
                      onClick={() => {
                        setSimTicker(sym);
                        setSimBorrowRate(info.rate * 100);
                        if (tickers?.[sym]) setSimPrice(tickers[sym].price);
                      }}
                      className="bg-[#0c121e] border border-[#1b263b] hover:border-[#ff9900]/50 rounded p-2.5 flex flex-col cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white font-mono text-xs">{sym}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            info.classification === 'HTB'
                              ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                              : 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                          }`}
                        >
                          {info.classification}
                        </span>
                      </div>
                      <span className="text-[#ffd600] font-black font-mono text-sm mt-1">
                        {(info.rate * 100).toFixed(2)}% APR
                      </span>
                      <span className="text-[9px] text-[#64748b] truncate mt-0.5">
                        {info.label}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Canadian vs. US Margin Interest Comparison & Norbert's Gambit Arbitrage */}
            <div className="bg-[#070b14] border border-[#1e2638] rounded p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-[#1e2638] pb-2 text-xs font-black text-white">
                <Info className="w-4 h-4 text-[#00d2ff]" />
                <span>CROSS-BORDER FINANCING &amp; TAX ARBITRAGE (US vs CANADA)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#0b101c] border border-[#1e2638] rounded p-3">
                  <div className="text-[10px] font-bold text-[#00d2ff] uppercase mb-1">
                    Norbert's Gambit FX Arbitrage
                  </div>
                  <p className="text-[10px] text-[#8b9bb4] leading-relaxed">
                    Avoid paying 8.5% to 9.5% debit margin interest when holding dual-listed stocks (DLR.TO / DLR.U.TO, RY, ENB). Journal shares between CAD and USD sub-accounts to eliminate involuntary debit balances and eliminate foreign exchange conversion fees.
                  </p>
                </div>

                <div className="bg-[#0b101c] border border-[#1e2638] rounded p-3">
                  <div className="text-[10px] font-bold text-[#ffd600] uppercase mb-1">
                    Pre-Borrow Locate Rules (Rule 204 / CIRO)
                  </div>
                  <p className="text-[10px] text-[#8b9bb4] leading-relaxed">
                    SEC Regulation SHO Rule 204 mandates pre-borrow locates before executing short sales in Hard-to-Borrow securities. CIRO Rule 5300 enforces strict locate compliance on TSX/TSXV stocks, preventing naked shorting and enforcing T+1 settlement buy-ins.
                  </p>
                </div>

                <div className="bg-[#0b101c] border border-[#1e2638] rounded p-3">
                  <div className="text-[10px] font-bold text-[#00e676] uppercase mb-1">
                    Tax Deductibility (IRS Form 4952 / CRA Line 22100)
                  </div>
                  <p className="text-[10px] text-[#8b9bb4] leading-relaxed">
                    Margin interest paid to purchase income-producing securities is tax-deductible as investment expense under IRC § 163(d) in the US and CRA IT-533 / Line 22100 in Canadian non-registered margin accounts. Registered accounts (TFSA, RRSP) cannot deduct interest.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dividends View */}
        {activeTab === 'dividends' && (
          <div className="mt-3">
            <DividendTrackerView
              portfolioPositions={activePositions}
              tickers={tickers}
              accountCashBalance={account.cashBalance}
              onSelectTicker={onSelectTicker}
              onNavigateToRisk={() => {
                if (onNavigateToRisk) onNavigateToRisk();
              }}
              onNavigateToOptions={onNavigateToChain}
            />
          </div>
        )}
      </div>
    </div>
  );
};
