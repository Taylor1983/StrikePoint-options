import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Position, AccountState, Ticker, TradeLeg } from '../types/options';
import { CanadianAccount, calculateCanadianMarginHealth } from '../services/canadianAccounts';
import { calculateBSM } from '../utils/blackScholes';
import { getPositionMarginMetrics } from './PositionsPortfolioView';
import { calculateMarginHealth } from '../utils/marginHealth';
import { calculatePositionBorrowInterest, PositionBorrowInterestMetrics } from '../utils/marginInterest';
import { MarginHealthWidget } from './MarginHealthWidget';
import { PortfolioBetaWeightingView } from './PortfolioBetaWeightingView';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  Activity,
  Scale,
  Radio,
  Play,
  Pause,
  Zap,
  Sparkles,
  Search,
  Filter,
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Building,
  CheckCircle,
  Clock,
  RotateCcw,
  Percent,
  Banknote,
  FileText,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { AccountStatementView } from './AccountStatementView';
import { PositionsPortfolioView } from './PositionsPortfolioView';
import { CanadianRegisteredAccountsView } from './CanadianRegisteredAccountsView';

export type MonitorSubTab = 'positions' | 'portfolio' | 'statement' | 'tfsa_rrsp';

interface PositionMonitorViewProps {
  account: AccountState;
  canadianAccounts?: CanadianAccount[];
  activeAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  tickers?: Record<string, Ticker>;
  isLiveTickActive?: boolean;
  onToggleLiveTick?: () => void;
  onSimulateTick?: () => void;
  onNavigateToRisk?: (pos?: Position) => void;
  onNavigateToChain?: (symbol: string) => void;
  onClosePosition: (positionId: string) => void;
  onSeedPortfolio?: () => void;
  isPrivacyMode?: boolean;
  initialSubTab?: MonitorSubTab;
  onUpdateAccounts?: (accounts: CanadianAccount[]) => void;
  onResetAccount?: () => void;
  onSelectTicker?: (symbol: string) => void;
  onOpenCanadianSuite?: () => void;
  onNavigateToJournal?: () => void;
  onSubTabChange?: (tab: MonitorSubTab) => void;
}

export const PositionMonitorView: React.FC<PositionMonitorViewProps> = ({
  account,
  canadianAccounts = [],
  activeAccountId = 'act-us-margin',
  onSelectAccount,
  tickers,
  isLiveTickActive = true,
  onToggleLiveTick,
  onSimulateTick,
  onNavigateToRisk,
  onNavigateToChain,
  onClosePosition,
  onSeedPortfolio,
  isPrivacyMode = false,
  initialSubTab = 'positions',
  onUpdateAccounts,
  onResetAccount,
  onSelectTicker,
  onOpenCanadianSuite,
  onNavigateToJournal,
  onSubTabChange,
}) => {
  const [monitorSubTab, setMonitorSubTab] = useState<MonitorSubTab>(initialSubTab);

  const handleSubTabChange = (tab: MonitorSubTab) => {
    setMonitorSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  useEffect(() => {
    if (initialSubTab) {
      setMonitorSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [filterType, setFilterType] = useState<'all' | 'options' | 'shares' | 'borrow' | 'itm' | 'expiring' | 'winners' | 'losers'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBetaWeightingModalOpen, setIsBetaWeightingModalOpen] = useState<boolean>(false);

  // Selected Account Logic
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

  const activeCash = useMemo(() => {
    if (isGlobalAccount) {
      const cadCash = canadianAccounts.reduce((sum, a) => sum + (a.currency === 'CAD' ? a.cashBalance / 1.36 : a.cashBalance), 0);
      return account.cashBalance + cadCash;
    }
    if (isUsAccount) {
      return account.cashBalance;
    }
    return currentCanadianAccount ? currentCanadianAccount.cashBalance : account.cashBalance;
  }, [isGlobalAccount, isUsAccount, account.cashBalance, canadianAccounts, currentCanadianAccount]);

  // Margin Health Calculation
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

  // Greeks Calculation per position
  const positionGreeksMap = useMemo(() => {
    const map: Record<string, { delta: number; gamma: number; theta: number; vega: number; betaDelta: number; isItm: boolean; minDte: number }> = {};
    const spyPrice = tickers?.['SPY']?.price || 568.25;

    activePositions.forEach((pos) => {
      const tick = tickers?.[pos.ticker];
      const spot = tick ? tick.price : (pos.legs[0]?.strike || 100);
      let delta = 0;
      let gamma = 0;
      let theta = 0;
      let vega = 0;
      let hasItm = false;
      let minDte = 999;

      pos.legs.forEach((leg) => {
        const isBuy = leg.action === 'buy';
        const sign = isBuy ? 1 : -1;
        if (leg.type === 'stock') {
          delta += sign * leg.contracts * (leg.multiplier || 1);
        } else if (leg.type === 'future') {
          delta += sign * leg.contracts * (leg.multiplier || 50);
        } else {
          minDte = Math.min(minDte, leg.dte);
          const isCallItm = leg.type === 'call' && spot > leg.strike;
          const isPutItm = leg.type === 'put' && spot < leg.strike;
          if (isCallItm || isPutItm) hasItm = true;

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
        }
      });

      const beta = tick?.beta ?? 1.0;
      const betaDelta = (delta * spot * beta) / spyPrice;

      map[pos.id] = { delta, gamma, theta, vega, betaDelta, isItm: hasItm, minDte };
    });

    return map;
  }, [activePositions, tickers]);

  // Aggregate Portfolio Greeks
  const portfolioGreeks = useMemo(() => {
    let delta = 0;
    let gamma = 0;
    let theta = 0;
    let vega = 0;
    let betaDelta = 0;

    Object.values(positionGreeksMap).forEach((g) => {
      delta += g.delta;
      gamma += g.gamma;
      theta += g.theta;
      vega += g.vega;
      betaDelta += g.betaDelta;
    });

    return { delta, gamma, theta, vega, betaDelta };
  }, [positionGreeksMap]);

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

  const borrowPositionsCount = useMemo(() => {
    return Object.values(positionBorrowMap).filter((item) => item !== null).length;
  }, [positionBorrowMap]);

  // Real-time tick flashing
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

  // Filtered positions list
  const filteredPositions = useMemo(() => {
    return activePositions.filter((pos) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toUpperCase();
        const matchesTicker = pos.ticker.toUpperCase().includes(q);
        const matchesStrategy = pos.strategyName.toUpperCase().includes(q);
        if (!matchesTicker && !matchesStrategy) return false;
      }

      const g = positionGreeksMap[pos.id];
      if (filterType === 'options') {
        return pos.legs.some((l) => l.type === 'call' || l.type === 'put');
      }
      if (filterType === 'shares') {
        return pos.legs.every((l) => l.type === 'stock' || l.type === 'future');
      }
      if (filterType === 'borrow') {
        return !!positionBorrowMap[pos.id];
      }
      if (filterType === 'itm') {
        return g?.isItm;
      }
      if (filterType === 'expiring') {
        return g && g.minDte <= 7;
      }
      if (filterType === 'winners') {
        return pos.unrealizedPnL > 0;
      }
      if (filterType === 'losers') {
        return pos.unrealizedPnL < 0;
      }
      return true;
    });
  }, [activePositions, filterType, searchQuery, positionGreeksMap]);

  const handleClose = (posId: string) => {
    playExecutionChime();
    onClosePosition(posId);
  };

  const renderSubNav = () => (
    <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-1.5 bg-[#0b101c] p-1 rounded border border-[#1e2a44] overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            playKeyClick();
            handleSubTabChange('positions');
          }}
          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            monitorSubTab === 'positions'
              ? 'bg-[#38bdf8] text-black font-black shadow-md'
              : 'text-[#8b9bb4] hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>1. ACTIVITY &amp; POSITIONS ({activePositions.length})</span>
        </button>

        <button
          onClick={() => {
            playKeyClick();
            handleSubTabChange('portfolio');
          }}
          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            monitorSubTab === 'portfolio'
              ? 'bg-[#00e676] text-black font-black shadow-md'
              : 'text-[#8b9bb4] hover:text-[#00e676]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>2. PORTFOLIO &amp; GREEKS</span>
        </button>

        <button
          onClick={() => {
            playKeyClick();
            handleSubTabChange('statement');
          }}
          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            monitorSubTab === 'statement'
              ? 'bg-[#ff9900] text-black font-black shadow-md'
              : 'text-[#8b9bb4] hover:text-[#ff9900]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. ACCOUNT STATEMENT</span>
        </button>

        <button
          onClick={() => {
            playKeyClick();
            handleSubTabChange('tfsa_rrsp');
          }}
          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            monitorSubTab === 'tfsa_rrsp'
              ? 'bg-[#00d2ff] text-black font-black shadow-md'
              : 'text-[#8b9bb4] hover:text-[#00d2ff]'
          }`}
        >
          <span>🇨🇦</span>
          <span>4. TFSA · RRSP REGISTERED SUITE</span>
          <span className="px-1 py-0.2 rounded bg-[#00d2ff]/20 text-[#00d2ff] text-[8.5px] font-mono">
            {canadianAccounts.length}
          </span>
        </button>

        {onNavigateToJournal && (
          <button
            onClick={() => {
              playKeyClick();
              onNavigateToJournal();
            }}
            className="px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all text-[#ff9900] bg-[#ff9900]/10 border border-[#ff9900]/30 hover:bg-[#ff9900]/25 hover:text-white"
            title="Open Strategy Trade Journal & Execution Ledger <JRNL>"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>5. STRATEGY TRADE JOURNAL</span>
            <span className="px-1 py-0.2 rounded bg-[#ff9900]/25 text-[#ff9900] text-[8.5px] font-mono">
              &lt;JRNL&gt;
            </span>
          </button>
        )}
      </div>

      <div className="text-[10.5px] text-[#8b9bb4] flex items-center gap-2 font-mono">
        <span>Active: <strong className="text-white">{currentCanadianAccount ? currentCanadianAccount.name : 'US Margin (TD-9481)'}</strong></span>
        <span>•</span>
        <span>Net Liq: <strong className="text-[#38bdf8]">${(activeCash + activePositions.reduce((s, p) => s + p.currentMark, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
      </div>
    </div>
  );

  if (monitorSubTab === 'statement') {
    return (
      <div className="p-2 sm:p-4 w-full flex flex-col gap-3 font-mono text-xs">
        {renderSubNav()}
        <AccountStatementView
          account={account}
          canadianAccounts={canadianAccounts}
          activeAccountId={activeAccountId}
          onSelectAccount={onSelectAccount}
          tickers={tickers}
          isPrivacyMode={isPrivacyMode}
          onNavigateToMonitor={() => handleSubTabChange('positions')}
          onNavigateToChain={onNavigateToChain}
          onNavigateToRisk={onNavigateToRisk}
        />
      </div>
    );
  }

  if (monitorSubTab === 'portfolio') {
    return (
      <div className="p-2 sm:p-4 w-full flex flex-col gap-3 font-mono text-xs">
        {renderSubNav()}
        <PositionsPortfolioView
          account={account}
          onClosePosition={onClosePosition}
          onResetAccount={onResetAccount || (() => {})}
          onNavigateToChain={() => {
            if (onNavigateToChain) onNavigateToChain(account.positions[0]?.ticker || 'SPY');
          }}
          canadianAccounts={canadianAccounts}
          activeAccountId={activeAccountId}
          onSelectAccount={onSelectAccount}
          onOpenCanadianSuite={onOpenCanadianSuite}
          tickers={tickers}
          isLiveTickActive={isLiveTickActive}
          onToggleLiveTick={onToggleLiveTick}
          onNavigateToRisk={onNavigateToRisk}
          onSelectTicker={onSelectTicker}
          onSimulateTick={onSimulateTick}
          onSeedPortfolio={onSeedPortfolio}
          isPrivacyMode={isPrivacyMode}
        />
      </div>
    );
  }

  if (monitorSubTab === 'tfsa_rrsp') {
    return (
      <div className="p-2 sm:p-4 w-full flex flex-col gap-3 font-mono text-xs">
        {renderSubNav()}
        <CanadianRegisteredAccountsView
          accounts={canadianAccounts}
          activeAccountId={activeAccountId}
          onSelectAccount={(accId) => {
            if (onSelectAccount) onSelectAccount(accId);
          }}
          onNavigateToGIC={() => {
            if (onNavigateToChain) onNavigateToChain('GIC');
          }}
          isPrivacyMode={isPrivacyMode}
        />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 w-full flex flex-col gap-4 font-mono text-xs">
      {renderSubNav()}

      {/* Top Header Strip with Account Switcher & OPRA Telemetry */}
      <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a2233] pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b]/60 border border-[#334155] rounded text-xs font-bold text-[#94a3b8]">
              <Building className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>MONITOR ACCOUNT:</span>
            </div>

            <button
              onClick={() => {
                playExecutionChime();
                if (onSelectAccount) onSelectAccount('act-us-margin');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                isUsAccount
                  ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-md'
                  : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white'
              }`}
            >
              🇺🇸 US REG-T MARGIN
            </button>

            {canadianAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => {
                  playExecutionChime();
                  if (onSelectAccount) onSelectAccount(acc.id);
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                  acc.id === activeAccountId
                    ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-md'
                    : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white'
                }`}
              >
                🇨🇦 {acc.code}
              </button>
            ))}

            <button
              onClick={() => {
                playExecutionChime();
                if (onSelectAccount) onSelectAccount('act-global');
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all border flex items-center gap-1.5 ${
                isGlobalAccount
                  ? 'bg-[#10b981] text-black border-[#10b981] font-black shadow-md'
                  : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>GLOBAL VIEW</span>
            </button>
          </div>

          {/* Real-Time Telemetry & Controls */}
          <div className="flex items-center gap-2">
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
              >
                {isLiveTickActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isLiveTickActive ? 'PAUSE' : 'RESUME'}</span>
              </button>
            )}

            {onSimulateTick && (
              <button
                onClick={() => {
                  playExecutionChime();
                  onSimulateTick();
                }}
                className="px-2.5 py-1 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/50 rounded text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                title="Force immediate live tick revaluation"
              >
                <Zap className="w-3 h-3 text-[#00d2ff]" />
                <span>TICK NOW</span>
              </button>
            )}

            {onSeedPortfolio && (
              <button
                onClick={() => {
                  playExecutionChime();
                  onSeedPortfolio();
                }}
                className="px-2.5 py-1 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 rounded text-xs font-bold transition-all flex items-center gap-1"
                title="Seed realistic multi-asset book (NVDA, AAPL, /ES, /CL, SPY)"
              >
                <Sparkles className="w-3 h-3" />
                <span>+ SEED BOOK</span>
              </button>
            )}

            <button
              onClick={() => {
                playKeyClick();
                setIsBetaWeightingModalOpen(true);
              }}
              className="px-2.5 py-1 bg-[#38bdf8]/20 hover:bg-[#38bdf8]/35 text-[#38bdf8] border border-[#38bdf8]/50 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open Portfolio Beta Weighting & Systematic Risk Analyzer"
            >
              <Scale className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>β-WEIGHTING</span>
            </button>
          </div>
        </div>

        {/* Live Greeks & Financing Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[11px] pt-0.5">
          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <span className="text-[9px] text-[#8b9bb4]">NET DELTA (Δ)</span>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${portfolioGreeks.delta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
              {portfolioGreeks.delta >= 0 ? '+' : ''}{portfolioGreeks.delta.toFixed(1)} Δ
            </div>
            <span className="text-[9px] text-[#64748b] mt-0.5">
              β-SPY: <strong className="text-white">{portfolioGreeks.betaDelta >= 0 ? '+' : ''}{portfolioGreeks.betaDelta.toFixed(1)} Δ</strong>
            </span>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <span className="text-[9px] text-[#8b9bb4]">NET THETA (Θ)</span>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${portfolioGreeks.theta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
              {portfolioGreeks.theta >= 0 ? '+' : ''}${portfolioGreeks.theta.toFixed(2)}/day
            </div>
            <span className="text-[9px] text-[#64748b] mt-0.5">
              Time decay accrual
            </span>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <span className="text-[9px] text-[#8b9bb4]">NET VEGA (ν)</span>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${portfolioGreeks.vega >= 0 ? 'text-[#ffd600]' : 'text-[#f59e0b]'}`}>
              {portfolioGreeks.vega >= 0 ? '+' : ''}${portfolioGreeks.vega.toFixed(2)} / 1% IV
            </div>
            <span className="text-[9px] text-[#64748b] mt-0.5">
              Vol sensitivity
            </span>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <span className="text-[9px] text-[#8b9bb4]">TOTAL NET LIQUIDITY</span>
            <div className="text-sm font-extrabold font-mono mt-0.5 text-white">
              {isPrivacyMode ? '$••••••' : `$${marginHealth.netLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <span className="text-[9px] text-[#64748b] mt-0.5">
              Cash + Open MTM
            </span>
          </div>

          <div className="bg-[#0e1422] border border-[#1e293b] rounded p-2 flex flex-col">
            <span className="text-[9px] text-[#8b9bb4]">
              {currentCanadianAccount ? '🇨🇦 CANADIAN MARGIN HEALTH' : 'MARGIN HEALTH SCORE'}
            </span>
            <div
              className="text-sm font-extrabold font-mono mt-0.5"
              style={{ color: currentCanadianAccount && canadianMarginHealth ? canadianMarginHealth.statusColor : marginHealth.statusColor }}
            >
              {currentCanadianAccount && canadianMarginHealth
                ? `${canadianMarginHealth.healthScore}/100 (${canadianMarginHealth.status})`
                : `${marginHealth.healthScore}/100 (${marginHealth.status})`}
            </div>
            <span className="text-[9px] text-[#64748b] mt-0.5 truncate">
              {currentCanadianAccount && canadianMarginHealth
                ? `CIRO Buffer: ${canadianMarginHealth.marginCushionPercent.toFixed(1)}%`
                : `Buffer: ${marginHealth.marginCushionPercent.toFixed(1)}%`}
            </span>
          </div>

          {/* Margin Interest & Borrow Accrual Card */}
          <div className="bg-[#0e1422] border border-[#ff334b]/40 rounded p-2 flex flex-col">
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4]">
              <span className="flex items-center gap-1">
                <Percent className="w-2.5 h-2.5 text-[#ff334b]" />
                <span>BORROW &amp; FINANCING</span>
              </span>
              <span className="text-[#ff334b] font-bold">DAILY</span>
            </div>
            <div className={`text-sm font-extrabold font-mono mt-0.5 ${totalDailyBorrowCost > 0 ? 'text-[#ff334b]' : 'text-slate-300'}`}>
              {totalDailyBorrowCost > 0 ? `-$${totalDailyBorrowCost.toFixed(2)}/d` : '$0.00/d'}
            </div>
            <div className="text-[9px] text-[#64748b] mt-0.5 flex items-center justify-between">
              <span>Annual: -${(totalDailyBorrowCost * 360).toFixed(0)}/yr</span>
              {borrowPositionsCount > 0 && (
                <button
                  onClick={() => {
                    playKeyClick();
                    setFilterType('borrow');
                  }}
                  className="text-[#38bdf8] hover:underline font-bold text-[8.5px]"
                >
                  FILTER ({borrowPositionsCount}) &gt;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MARGIN HEALTH & TELEMETRY ENGINE WIDGET */}
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
      />

      {/* Position Filter & Triage Bar */}
      <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#8b9bb4] text-[10px] font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>TRIAGE:</span>
          </span>

          {[
            { id: 'all', label: `ALL (${activePositions.length})` },
            { id: 'options', label: 'OPTIONS ONLY' },
            { id: 'shares', label: 'SHARES & FUTURES' },
            { id: 'borrow', label: `BORROW & CARRY (${borrowPositionsCount})` },
            { id: 'itm', label: 'IN-THE-MONEY (ITM)' },
            { id: 'expiring', label: 'EXPIRING (<7d)' },
            { id: 'winners', label: 'WINNERS (>0)' },
            { id: 'losers', label: 'LOSERS (<0)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                playKeyClick();
                setFilterType(tab.id as any);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
                filterType === tab.id
                  ? 'bg-[#38bdf8] text-black border-[#38bdf8] font-black shadow-sm'
                  : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white hover:border-[#334155]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, strategy..."
              className="bg-[#0f1626] border border-[#1e293b] rounded pl-8 pr-3 py-1 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8] w-48"
            />
          </div>
        </div>
      </div>

      {/* POSITIONS MONITOR BLOTTER TABLE */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded-lg overflow-hidden shadow-lg">
        {filteredPositions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1e293b]/50 border border-[#334155] flex items-center justify-center text-[#64748b]">
              <Layers className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-white">No Positions Match Current Filter</div>
            <p className="text-xs text-[#8b9bb4] max-w-md">
              {activePositions.length === 0
                ? 'Your account currently has no open options, stock, or futures positions. Seed our institutional portfolio to start monitoring in real time.'
                : 'Try adjusting your filter selection or clear your search query.'}
            </p>
            {activePositions.length === 0 && onSeedPortfolio && (
              <button
                onClick={() => {
                  playExecutionChime();
                  onSeedPortfolio();
                }}
                className="mt-2 px-4 py-2 bg-[#ff9900] text-black font-black rounded text-xs hover:bg-[#e68a00] transition-colors"
              >
                + SEED INSTITUTIONAL BOOK
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="bg-[#0b0f1a] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Symbol / Quote</th>
                  <th className="py-2.5 px-3">Strategy Structure &amp; Legs</th>
                  <th className="py-2.5 px-3 text-center">Status / Alerts</th>
                  <th className="py-2.5 px-3 text-right">Greeks (Δ / Θ / ν)</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
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
                  <th className="py-2.5 px-3 text-center">Monitor Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28]">
                {filteredPositions.map((pos) => {
                  const isUp = pos.unrealizedPnL >= 0;
                  const tick = tickers?.[pos.ticker];
                  const greeks = positionGreeksMap[pos.id] || { delta: 0, gamma: 0, theta: 0, vega: 0, betaDelta: 0, isItm: false, minDte: 999 };
                  const flash = tickFlashMap[pos.id];
                  const marginInfo = getPositionMarginMetrics(pos, tick?.price);
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
                            onClick={() => onNavigateToChain && onNavigateToChain(pos.ticker)}
                            className="font-black text-white hover:text-[#00d2ff] cursor-pointer text-sm flex items-center gap-1 group"
                            title="Inspect option chain in OMON matrix"
                          >
                            <span>{pos.ticker}</span>
                            <ExternalLink className="w-3 h-3 text-[#64748b] group-hover:text-[#00d2ff]" />
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
                        <div className="flex flex-col gap-0.5 max-w-[300px]">
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

                      {/* Status / Live Alerts */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {greeks.isItm ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/40 flex items-center gap-1" title="In The Money - Assignment & Exercise Exposure">
                              <AlertTriangle className="w-3 h-3" />
                              <span>IN THE MONEY</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>OTM SECURE</span>
                            </span>
                          )}

                          {greeks.minDte <= 3 && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center gap-0.5 animate-pulse">
                              <Clock className="w-2.5 h-2.5" />
                              <span>EXPIRING ({greeks.minDte}d)</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Greeks */}
                      <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                        <div className={`font-bold ${greeks.delta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {greeks.delta >= 0 ? '+' : ''}{greeks.delta.toFixed(1)} Δ
                        </div>
                        <div className="text-[9.5px] text-[#00e676]">
                          {greeks.theta >= 0 ? '+' : ''}${greeks.theta.toFixed(1)}/d Θ
                        </div>
                        <div className="text-[9.5px] text-[#ffd600]">
                          ${greeks.vega.toFixed(1)} ν
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                        {pos.contracts % 1 === 0 ? pos.contracts : pos.contracts.toFixed(4)}x
                      </td>

                      {/* Cost Basis */}
                      <td className="py-2.5 px-3 text-right font-bold text-[#cbd5e1] font-mono">
                        {isPrivacyMode ? '$••••••' : `$${Math.abs(pos.entryCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>

                      {/* Trade IV (At Inception vs Current Live) */}
                      <td className="py-2.5 px-3 text-right font-mono" title={`Implied Volatility when trade was executed: ${((pos.entryIV ?? (pos.legs[0]?.iv || tick?.currentIV || 0.25)) * 100).toFixed(1)}% | Current Live IV: ${((tick?.currentIV || pos.entryIV || 0.25) * 100).toFixed(1)}%`}>
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

                      {/* Margin BP */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold" title="Initial Margin Requirement / BP Reduction under Rule 4210 & Reg-T">
                        <div className="text-[#ff9900]">
                          {isPrivacyMode ? '($••••••)' : `($${marginInfo.marginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                        </div>
                        <div className={`text-[8.5px] px-1 py-0.2 rounded inline-block border font-mono mt-0.5 ${marginInfo.badgeClass}`}>
                          {marginInfo.ruleLabel}
                        </div>
                      </td>

                      {/* Borrow / Carry Interest */}
                      <td className="py-2.5 px-3 text-right font-mono" title="Short stock borrow fee or futures carrying cost">
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
                              {isPrivacyMode ? '-$•••/d' : `-$${Math.abs(borrowItem.dailyInterestCost).toFixed(2)}/d`}
                            </div>
                            <div className="text-[8.5px] text-[#64748b]">
                              {isPrivacyMode ? '-$••••/yr' : `-$${Math.abs(borrowItem.annualInterestCost).toFixed(0)}/yr`}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[#64748b] text-[10px]">$0.00/d</div>
                        )}
                      </td>

                      {/* Live Mark */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <div className={`font-bold transition-all px-1.5 py-0.5 rounded inline-block ${
                          flash === 'up'
                            ? 'bg-emerald-500 text-black font-black'
                            : flash === 'down'
                            ? 'bg-rose-500 text-white font-black'
                            : 'text-white'
                        }`}>
                          {isPrivacyMode ? '$••••••' : `$${Math.abs(pos.currentMark).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                      </td>

                      {/* Unrealized P&L ($) */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-black ${
                          isUp ? 'text-[#00e676]' : 'text-[#ff334b]'
                        }`}
                      >
                        {isPrivacyMode ? '••••••' : `${isUp ? '+' : ''}$${pos.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>

                      {/* Unrealized P&L (%) */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-black ${
                          isUp ? 'text-[#00e676]' : 'text-[#ff334b]'
                        }`}
                      >
                        {isPrivacyMode ? '••••%' : `${isUp ? '+' : ''}${pos.unrealizedPnLPercent.toFixed(1)}%`}
                      </td>

                      {/* Actions */}
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
                          {onNavigateToChain && (
                            <button
                              onClick={() => onNavigateToChain(pos.ticker)}
                              title="View and mark positions in OMON options chain"
                              className="px-2 py-1 bg-[#00d2ff]/15 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/30 rounded text-[10px] font-bold transition-all"
                            >
                              CHAIN &gt;
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
                  <td colSpan={4} className="py-2.5 px-3 font-bold text-[#8b9bb4]">
                    <span className="text-[#38bdf8] font-black mr-2">MONITORED TOTALS</span>
                    <span>({filteredPositions.length} positions shown)</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">
                    {filteredPositions.reduce((s, p) => s + p.contracts, 0)}x
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#cbd5e1]">
                    ${filteredPositions.reduce((s, p) => s + Math.abs(p.entryCost), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-[#ff9900]">
                    (${filteredPositions.reduce((s, p) => s + getPositionMarginMetrics(p, tickers?.[p.ticker]?.price).marginBp, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-[#ff334b]">
                    -${filteredPositions.reduce((s, p) => s + Math.abs(positionBorrowMap[p.id]?.dailyInterestCost || 0), 0).toFixed(2)}/d
                    <div className="text-[8.5px] text-[#8b9bb4] font-normal">
                      -${(filteredPositions.reduce((s, p) => s + Math.abs(positionBorrowMap[p.id]?.dailyInterestCost || 0), 0) * 360).toFixed(0)}/yr
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">
                    ${filteredPositions.reduce((s, p) => s + p.currentMark, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-black ${filteredPositions.reduce((s, p) => s + p.unrealizedPnL, 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                    {filteredPositions.reduce((s, p) => s + p.unrealizedPnL, 0) >= 0 ? '+' : ''}${filteredPositions.reduce((s, p) => s + p.unrealizedPnL, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-white">
                    —
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#8b9bb4] text-[10px]">
                    REAL-TIME
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* PORTFOLIO BETA WEIGHTING MODAL OVERLAY */}
      {isBetaWeightingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-150">
          <div className="bg-[#090d16] border-2 border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden text-[#e2e8f0]">
            <div className="bg-[#0f172a] px-4 py-3 border-b border-[#1e293b] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#38bdf8]" />
                <span className="font-mono font-black text-sm text-white">PORTFOLIO BETA WEIGHTING &amp; SYSTEMATIC RISK ANALYZER</span>
              </div>
              <button
                onClick={() => setIsBetaWeightingModalOpen(false)}
                className="p-1 rounded bg-[#1e293b] hover:bg-[#ff334b]/20 text-[#8b9bb4] hover:text-[#ff334b] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(96vh-60px)]">
              <PortfolioBetaWeightingView
                positions={filteredPositions}
                tickers={tickers}
                onSelectTicker={(sym) => {
                  setIsBetaWeightingModalOpen(false);
                  if (onNavigateToChain) onNavigateToChain(sym);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
