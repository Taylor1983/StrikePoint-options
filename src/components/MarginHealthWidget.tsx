import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarginHealthMetrics, MarginTelemetryEvent } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  CanadianAccount,
  CanadianMarginHealthMetrics,
  calculateCanadianMarginHealth,
  USDCAD_EXCHANGE_RATE,
  calculateNorbertsGambit,
  INITIAL_CANADIAN_ACCOUNTS,
} from '../services/canadianAccounts';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Radio,
  Zap,
  RotateCcw,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Terminal,
  CheckCircle2,
  Gauge,
  Flame,
  Sparkles,
  Building,
  CheckCircle,
  HelpCircle,
  Coins,
  Scale,
  DollarSign,
  FileText,
  Calculator,
  ArrowLeftRight,
  Percent,
  Banknote,
  Receipt,
  Info,
} from 'lucide-react';
import {
  STOCK_BORROW_RATES,
  FUTURES_CARRYING_RATES,
  BENCHMARK_RATES,
  getBrokerMarginDebitRate,
} from '../utils/marginInterest';

interface MarginHealthWidgetProps {
  metrics: MarginHealthMetrics;
  compact?: boolean;
  isLiveTickActive?: boolean;
  onSimulateTick?: () => void;
  lastTickTime?: string;
  onNavigateToRisk?: () => void;
  canadianMetrics?: CanadianMarginHealthMetrics;
  canadianAccounts?: CanadianAccount[];
  activeCanadianAccount?: CanadianAccount;
  onSelectAccount?: (accountId: string) => void;
  showCanadianByDefault?: boolean;
  onUpdateAccounts?: (accounts: CanadianAccount[]) => void;
}

type TelemetryViewMode = 'hud' | 'stream' | 'stress' | 'haircuts' | 'interest' | 'canadian';
type StressScenario = 'normal' | 'dip' | 'crash' | 'black_swan' | 'vol_spike' | 'rate_hike';

export const MarginHealthWidget: React.FC<MarginHealthWidgetProps> = ({
  metrics,
  compact = false,
  isLiveTickActive = true,
  onSimulateTick,
  lastTickTime,
  onNavigateToRisk,
  canadianMetrics,
  canadianAccounts,
  activeCanadianAccount,
  onSelectAccount,
  showCanadianByDefault = false,
  onUpdateAccounts,
}) => {
  const {
    healthScore,
    status,
    statusColor,
    netLiquidity,
    initialMarginReq,
    maintenanceMarginReq,
    marginCushionDollar,
    marginCushionPercent,
    optionsBuyingPower,
    grossNotionalExposure,
    leverageRatio,
    spyDropTolerancePct,
    liquidationSpyPrice = 427.30,
    telemetryTimestamp,
    isMarginCall,
    isWarning,
    marginInterestSummary,
  } = metrics;

  const [viewMode, setViewMode] = useState<TelemetryViewMode>(showCanadianByDefault ? 'canadian' : 'hud');
  const [activeScenario, setActiveScenario] = useState<StressScenario>('normal');

  // Simulated Margin Borrow Debit Amount for Tier Calculator
  const [simDebitAmount, setSimDebitAmount] = useState<number>(50000);
  const simDebitRate = useMemo(() => getBrokerMarginDebitRate(simDebitAmount, 'USD'), [simDebitAmount]);
  const simDebitDailyCost = useMemo(() => (simDebitAmount * simDebitRate) / BENCHMARK_RATES.DAYS_IN_YEAR, [simDebitAmount, simDebitRate]);

  const [selectedCadAccId, setSelectedCadAccId] = useState<string>(
    activeCanadianAccount?.id || canadianAccounts?.[0]?.id || 'act-margin-cad'
  );

  // Sub-account perspective: 'usd' (USD Health), 'cad' (CAD sub-account), or 'consolidated'
  const [canadianSubTab, setCanadianSubTab] = useState<'usd' | 'cad' | 'consolidated'>('usd');
  const [settledDeficitAccs, setSettledDeficitAccs] = useState<Record<string, { cadDeducted: number; usdCleared: number }>>({});
  const [deficitJournalSuccess, setDeficitJournalSuccess] = useState<string | null>(null);

  // Synchronize when activeCanadianAccount updates from parent
  useEffect(() => {
    if (activeCanadianAccount?.id) {
      setSelectedCadAccId(activeCanadianAccount.id);
      if (showCanadianByDefault) {
        setViewMode('canadian');
      }
    }
  }, [activeCanadianAccount?.id, showCanadianByDefault]);

  // Norbert's Gambit state
  const [norbertAmount, setNorbertAmount] = useState<number>(10000);
  const [norbertDirection, setNorbertDirection] = useState<'CAD_TO_USD' | 'USD_TO_CAD'>('CAD_TO_USD');

  const norbertResult = useMemo(() => {
    return calculateNorbertsGambit(norbertAmount, norbertDirection);
  }, [norbertAmount, norbertDirection]);

  const cadAccountsList = useMemo(() => {
    const baseList = canadianAccounts && canadianAccounts.length > 0 ? canadianAccounts : INITIAL_CANADIAN_ACCOUNTS;
    return baseList.map((acc) => {
      const settled = settledDeficitAccs[acc.id];
      if (settled) {
        const currentCad = acc.cashBalanceCad !== undefined ? acc.cashBalanceCad : acc.currency === 'CAD' ? acc.cashBalance : 0;
        const updatedCashCad = Number((currentCad - settled.cadDeducted).toFixed(2));
        return {
          ...acc,
          cashBalanceUsd: 0,
          cashBalanceCad: updatedCashCad,
          cashBalance: acc.currency === 'CAD' ? updatedCashCad : 0,
        };
      }
      return acc;
    });
  }, [canadianAccounts, settledDeficitAccs]);

  const targetCadAccount = useMemo(() => {
    return cadAccountsList.find((a) => a.id === selectedCadAccId) || cadAccountsList[0];
  }, [cadAccountsList, selectedCadAccId]);

  const currentCadHealth: CanadianMarginHealthMetrics = useMemo(() => {
    if (settledDeficitAccs[targetCadAccount.id]) {
      return calculateCanadianMarginHealth(targetCadAccount);
    }
    if (canadianMetrics && targetCadAccount.id === activeCanadianAccount?.id) {
      return canadianMetrics;
    }
    return calculateCanadianMarginHealth(targetCadAccount);
  }, [canadianMetrics, targetCadAccount, activeCanadianAccount, settledDeficitAccs]);

  // Handler for Norbert's Gambit 1-click deficit settlement
  const handleSettleUsdDeficit = (accountToSettle: CanadianAccount) => {
    const usdDeficit = Math.abs(accountToSettle.cashBalanceUsd || 0);
    if (usdDeficit <= 0) return;

    playExecutionChime();
    const cadEquivalent = Number((usdDeficit * USDCAD_EXCHANGE_RATE).toFixed(2));
    const bankFeeSaved = Number((cadEquivalent * 0.02).toFixed(2));

    setSettledDeficitAccs((prev) => ({
      ...prev,
      [accountToSettle.id]: {
        cadDeducted: cadEquivalent,
        usdCleared: usdDeficit,
      },
    }));

    const successMsg = `⚡ Successfully settled -$${usdDeficit.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD deficit using $${cadEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2 })} CAD at spot rate (1 USD = ${USDCAD_EXCHANGE_RATE} CAD). Saved +$${bankFeeSaved} CAD in bank retail conversion fees. 8.75% borrow carry eliminated. USD Health upgraded to 100/100 EXCELLENT.`;
    setDeficitJournalSuccess(successMsg);

    if (onUpdateAccounts) {
      const updatedList = cadAccountsList.map((acc) => {
        if (acc.id === accountToSettle.id) {
          const currentCad = acc.cashBalanceCad !== undefined ? acc.cashBalanceCad : acc.currency === 'CAD' ? acc.cashBalance : 0;
          const updatedCashCad = Number((currentCad - cadEquivalent).toFixed(2));
          return {
            ...acc,
            cashBalanceUsd: 0,
            cashBalanceCad: updatedCashCad,
            cashBalance: acc.currency === 'CAD' ? updatedCashCad : 0,
          };
        }
        return acc;
      });
      onUpdateAccounts(updatedList);
    }
  };

  // Rolling telemetry history for sparkline and telemetry events
  const [telemetryHistory, setTelemetryHistory] = useState<{ time: string; score: number; cushion: number; bp: number }[]>([]);
  const [telemetryEvents, setTelemetryEvents] = useState<MarginTelemetryEvent[]>([]);
  const [velocityDollar, setVelocityDollar] = useState<number>(0);
  const [tickFlash, setTickFlash] = useState<'up' | 'down' | null>(null);

  const prevCushionRef = useRef<number>(marginCushionDollar);
  const prevScoreRef = useRef<number>(healthScore);

  // Update telemetry history and events whenever metrics change
  useEffect(() => {
    const prevCushion = prevCushionRef.current;
    const prevScore = prevScoreRef.current;
    const diff = Number((marginCushionDollar - prevCushion).toFixed(2));

    if (diff !== 0) {
      setVelocityDollar(diff);
      setTickFlash(diff > 0 ? 'up' : 'down');
      const flashTimer = setTimeout(() => setTickFlash(null), 800);

      const now = new Date();
      const timeStr = telemetryTimestamp || now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

      // Append historical point
      setTelemetryHistory((prev) => {
        const next = [...prev, { time: timeStr, score: healthScore, cushion: marginCushionDollar, bp: optionsBuyingPower }];
        return next.slice(-25); // retain last 25 readings
      });

      // Create telemetry audit event
      const eventDesc = diff > 0
        ? `Collateral buffer expanded +$${diff.toFixed(2)} (Score ${prevScore} → ${healthScore})`
        : `Collateral buffer contracted -$${Math.abs(diff).toFixed(2)} (Score ${prevScore} → ${healthScore})`;

      const newEvent: MarginTelemetryEvent = {
        id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: timeStr,
        timeMs: Date.now(),
        score: healthScore,
        cushionDollar: marginCushionDollar,
        cushionPercent: marginCushionPercent,
        velocityDollar: diff,
        status,
        statusColor,
        description: eventDesc,
      };

      setTelemetryEvents((prev) => [newEvent, ...prev].slice(0, 15));

      return () => clearTimeout(flashTimer);
    }

    prevCushionRef.current = marginCushionDollar;
    prevScoreRef.current = healthScore;
  }, [marginCushionDollar, healthScore, marginCushionPercent, optionsBuyingPower, status, statusColor, telemetryTimestamp]);

  // Initial seed if telemetry history is empty
  useEffect(() => {
    if (telemetryHistory.length === 0) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
      setTelemetryHistory([
        { time: timeStr, score: healthScore, cushion: marginCushionDollar, bp: optionsBuyingPower },
      ]);
      setTelemetryEvents([
        {
          id: `tel-init`,
          timestamp: timeStr,
          timeMs: Date.now(),
          score: healthScore,
          cushionDollar: marginCushionDollar,
          cushionPercent: marginCushionPercent,
          velocityDollar: 0,
          status,
          statusColor,
          description: `Initial OPRA margin telemetry stream established · Net Liq $${netLiquidity.toFixed(2)}`,
        },
      ]);
    }
  }, []);

  // Stress Scenario Calculations
  const simulatedStressMetrics = useMemo(() => {
    let shockMktPct = 0;
    let shockVolPts = 0;
    let scenarioLabel = 'Baseline Market Conditions';

    if (activeScenario === 'dip') {
      shockMktPct = -0.03;
      scenarioLabel = 'Market -3.0% Moderate Dip';
    } else if (activeScenario === 'crash') {
      shockMktPct = -0.07;
      shockVolPts = 12;
      scenarioLabel = 'Market -7.0% Severe Correction (Vol +12pts)';
    } else if (activeScenario === 'black_swan') {
      shockMktPct = -0.15;
      shockVolPts = 25;
      scenarioLabel = 'Market -15.0% Black Swan Crash (Vol +25pts)';
    } else if (activeScenario === 'vol_spike') {
      shockVolPts = 20;
      scenarioLabel = 'Implied Volatility +20pts Surge';
    } else if (activeScenario === 'rate_hike') {
      scenarioLabel = 'Fed +100bps Emergency Rate Spike';
    }

    // Impact on Net Liquidity based on gross notional and leverage
    const simNetLiq = Math.max(100, netLiquidity * (1 + shockMktPct * leverageRatio));
    // Under market crash, volatility expansion elevates maintenance margin requirements
    const volExpansionMult = shockVolPts > 0 ? 1 + (shockVolPts / 100) * 0.8 : 1;
    const simMaintReq = Number((maintenanceMarginReq * volExpansionMult).toFixed(2));
    const simCushionDollar = Number((simNetLiq - simMaintReq).toFixed(2));
    const simCushionPercent = Number(((simCushionDollar / simNetLiq) * 100).toFixed(1));

    let simScore = 100;
    let simStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
    let simColor = '#00e676';

    if (simMaintReq === 0) {
      simScore = 100;
    } else if (simCushionPercent >= 60) {
      simScore = Math.min(100, Math.round(80 + (simCushionPercent - 60) * 0.5));
      simStatus = 'EXCELLENT';
      simColor = '#00e676';
    } else if (simCushionPercent >= 30) {
      simScore = Math.round(60 + (simCushionPercent - 30) * (20 / 30));
      simStatus = 'GOOD';
      simColor = '#38bdf8';
    } else if (simCushionPercent >= 15) {
      simScore = Math.round(40 + (simCushionPercent - 15) * (20 / 15));
      simStatus = 'WARNING';
      simColor = '#ffd600';
    } else {
      simScore = Math.max(0, Math.round(Math.max(0, simCushionPercent) * (39 / 15)));
      simStatus = 'CRITICAL';
      simColor = '#ff334b';
    }

    const simMarginCall = simCushionDollar <= 0;

    return {
      scenarioLabel,
      shockMktPct,
      shockVolPts,
      simNetLiq,
      simMaintReq,
      simCushionDollar,
      simCushionPercent,
      simScore,
      simStatus,
      simColor,
      simMarginCall,
    };
  }, [activeScenario, netLiquidity, maintenanceMarginReq, leverageRatio]);

  // Telemetry Sparkline Min/Max
  const sparklineMin = useMemo(() => Math.min(...telemetryHistory.map((h) => h.score), 20), [telemetryHistory]);
  const sparklineMax = useMemo(() => Math.max(...telemetryHistory.map((h) => h.score), 100), [telemetryHistory]);

  return (
    <div
      className={`bg-[#080c14] border border-[#1e283d] rounded-lg p-3 sm:p-4 flex flex-col gap-3 font-mono shadow-xl transition-all ${
        isMarginCall
          ? 'border-rose-600/90 bg-rose-950/20 ring-1 ring-rose-500/50'
          : isWarning
          ? 'border-amber-600/70 bg-amber-950/15'
          : 'hover:border-[#2a3854]'
      }`}
    >
      {/* ========================================================
          1. TOP TELEMETRY STRIP & RADAR
      ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182234] pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#101726] border border-[#1e2a40] text-[#38bdf8] flex items-center justify-center">
            {isMarginCall ? (
              <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black tracking-wider text-white">
                MARGIN HEALTH &amp; TELEMETRY ENGINE
              </span>
              <span
                className="px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider uppercase border flex items-center gap-1"
                style={{
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                  borderColor: `${statusColor}60`,
                }}
              >
                <span>{status}</span>
                <span>·</span>
                <span>{healthScore}/100</span>
              </span>

              {/* Canadian Margin Health Quick Switcher Pill */}
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setViewMode(viewMode === 'canadian' && canadianSubTab === 'cad' ? 'hud' : 'canadian');
                  setCanadianSubTab('cad');
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border flex items-center gap-1.5 transition-all ${
                  viewMode === 'canadian' && canadianSubTab === 'cad'
                    ? 'bg-[#00d2ff] text-black border-[#00d2ff] shadow-sm font-black'
                    : 'bg-[#101726] text-[#00d2ff] border-[#00d2ff]/40 hover:bg-[#00d2ff]/20'
                }`}
                title="Toggle Canadian Margin Health & CIRO Rule 5300 Compliance"
              >
                <span>🇨🇦 CANADIAN HEALTH</span>
                <span className={`text-[8.5px] px-1 rounded font-black ${viewMode === 'canadian' && canadianSubTab === 'cad' ? 'bg-black/25 text-black' : 'bg-[#00d2ff]/20 text-[#00d2ff]'}`}>
                  {currentCadHealth.healthScore}%
                </span>
              </button>

              {/* Canadian Account USD Sub-Account Health Quick Switcher Pill */}
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setViewMode(viewMode === 'canadian' && canadianSubTab === 'usd' ? 'hud' : 'canadian');
                  setCanadianSubTab('usd');
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border flex items-center gap-1.5 transition-all ${
                  viewMode === 'canadian' && canadianSubTab === 'usd'
                    ? 'bg-[#38bdf8] text-black border-[#38bdf8] shadow-sm font-black'
                    : currentCadHealth.usdHealth.isUsdDeficit
                    ? 'bg-rose-950/70 text-rose-300 border-rose-600/80 hover:bg-rose-900/50 animate-pulse'
                    : 'bg-[#101726] text-[#38bdf8] border-[#38bdf8]/40 hover:bg-[#38bdf8]/20'
                }`}
                title="Toggle Canadian Account USD Sub-Account Health & Deficit Telemetry"
              >
                <span>🇺🇸 USD HEALTH</span>
                {currentCadHealth.usdHealth.isUsdDeficit ? (
                  <span className="text-[8.5px] px-1 rounded font-black bg-rose-600 text-white">
                    -${currentCadHealth.usdHealth.usdDeficitAmount.toFixed(0)}
                  </span>
                ) : (
                  <span className={`text-[8.5px] px-1 rounded font-black ${
                    viewMode === 'canadian' && canadianSubTab === 'usd' ? 'bg-black/25 text-black' : 'bg-[#38bdf8]/20 text-[#38bdf8]'
                  }`}>
                    {currentCadHealth.usdHealth.usdHealthScore}%
                  </span>
                )}
              </button>
            </div>
            <div className="text-[10px] text-[#7d8ea6] flex items-center gap-2 mt-0.5">
              <span>{viewMode === 'canadian' ? (canadianSubTab === 'usd' ? 'CIRO Rule 5300 · USD Sub-Account FX Surcharge' : currentCadHealth.ciroRuleLabel) : 'FINRA Rule 4210'}</span>
              <span>·</span>
              <span>{viewMode === 'canadian' ? `${currentCadHealth.institution} (${currentCadHealth.accountCode}${canadianSubTab === 'usd' ? ' · USD LEDGER' : ''})` : 'Real-Time Portfolio Margin'}</span>
              <span>·</span>
              <span className="text-[#38bdf8] font-bold">12ms OPRA Feed</span>
            </div>
          </div>
        </div>

        {/* Telemetry Live Heartbeat & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Telemetry Heartbeat Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
              isLiveTickActive
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                : 'bg-amber-950/40 border-amber-700/50 text-amber-400'
            }`}
            title="Real-time margin telemetry streaming connection"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveTickActive ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span>{isLiveTickActive ? 'STREAMING' : 'PAUSED'}</span>
            <span className="text-[10px] text-[#64748b] hidden md:inline border-l border-[#1e293b] pl-1.5 font-mono">
              {telemetryTimestamp || lastTickTime || '12ms'}
            </span>
          </div>

          {/* Margin Interest & Borrow Accrual Badge */}
          {marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0 && (
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setViewMode('interest');
              }}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60 transition-colors"
              title="Daily Margin Interest & Short Borrow Accrual. Click to view financing breakdown."
            >
              <Percent className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px]">
                BORROW: -${marginInterestSummary.totalDailyInterestCost.toFixed(2)}/day
              </span>
            </button>
          )}

          {/* Velocity Badge */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-colors ${
              velocityDollar > 0
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : velocityDollar < 0
                ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                : 'bg-[#101726] text-[#8b9bb4] border-[#1e2a40]'
            }`}
            title="Rate of margin cushion expansion/contraction per market tick"
          >
            {velocityDollar > 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : velocityDollar < 0 ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-[#64748b]" />
            )}
            <span className="text-[10px]">
              VELOCITY: {velocityDollar > 0 ? '+' : ''}${velocityDollar.toFixed(2)}/tick
            </span>
          </div>

          {/* Manual Tick Now */}
          {onSimulateTick && (
            <button
              onClick={() => {
                playExecutionChime();
                onSimulateTick();
              }}
              className="px-2 py-1 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/40 rounded text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
              title="Force immediate market tick and recalculate margin telemetry"
            >
              <Zap className="w-3 h-3 text-[#00d2ff]" />
              <span className="hidden sm:inline">SAMPLE</span>
            </button>
          )}

          {/* Telemetry View Switcher Pills */}
          <div className="flex items-center bg-[#0d1320] border border-[#1e293b] rounded p-0.5 text-[10px]">
            {[
              { id: 'hud', label: 'METRICS' },
              { id: 'stream', label: 'STREAM & AUDIT' },
              { id: 'stress', label: 'STRESS TEST' },
              { id: 'haircuts', label: 'COLLATERAL' },
              {
                id: 'interest',
                label: marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0
                  ? `BORROW & INTEREST (-$${marginInterestSummary.totalDailyInterestCost.toFixed(2)}/d)`
                  : 'BORROW & INTEREST',
              },
              {
                id: 'canadian',
                label: currentCadHealth.usdHealth.isUsdDeficit
                  ? `🇨🇦 CANADIAN (⚠️ USD -$${currentCadHealth.usdHealth.usdDeficitAmount.toFixed(0)})`
                  : '🇨🇦 CANADIAN & 🇺🇸 USD HEALTH',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  playKeyClick();
                  setViewMode(tab.id as TelemetryViewMode);
                }}
                className={`px-2 py-0.5 rounded uppercase font-bold transition-all ${
                  viewMode === tab.id
                    ? 'bg-[#38bdf8] text-black font-extrabold shadow-sm'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          2. VIEW MODE: HUD (DEFAULT CORE METRICS & GAUGE)
      ======================================================== */}
      {viewMode === 'hud' && (
        <>
          {/* Visual Health Gauge Meter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#8b9bb4] font-bold flex items-center gap-1">
                <Gauge className="w-3 h-3 text-[#38bdf8]" />
                <span>MARGIN HEALTH CUSHION GAUGE</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[#ff334b] text-[9px]">CRITICAL (&lt;15%)</span>
                <span className="text-[#ffd600] text-[9px]">WARNING (15-30%)</span>
                <span className="text-[#38bdf8] text-[9px]">GOOD (30-60%)</span>
                <span className="text-[#00e676] text-[9px]">EXCELLENT (&gt;60%)</span>
              </div>
            </div>

            {/* Gauge Progress Bar with Targets */}
            <div className="relative w-full h-3.5 bg-[#0f1624] border border-[#23314d] rounded-full overflow-hidden p-0.5 shadow-inner">
              {/* Zone dividing marks */}
              <div className="absolute inset-0 flex pointer-events-none opacity-40">
                <div className="w-[15%] border-r border-[#ff334b]/40 h-full" />
                <div className="w-[15%] border-r border-[#ffd600]/40 h-full" />
                <div className="w-[30%] border-r border-[#38bdf8]/40 h-full" />
                <div className="w-[40%] h-full" />
              </div>

              <div
                className="h-full rounded-full transition-all duration-500 shadow-md"
                style={{
                  width: `${Math.min(100, Math.max(5, healthScore))}%`,
                  background: `linear-gradient(90deg, #ff334b 0%, #ffd600 30%, #38bdf8 65%, #00e676 100%)`,
                }}
              />
            </div>
          </div>

          {/* Numerical Metrics Cards (7 Columns) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            {/* Margin Cushion Dollar */}
            <div
              className={`bg-[#0e1424] border rounded p-2 flex flex-col transition-colors ${
                tickFlash === 'up'
                  ? 'border-emerald-500/80 bg-emerald-950/20'
                  : tickFlash === 'down'
                  ? 'border-rose-500/80 bg-rose-950/20'
                  : 'border-[#1d273a]'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] font-bold">
                <span>MARGIN CUSHION ($)</span>
                {tickFlash && (
                  <span className={`text-[8px] font-black ${tickFlash === 'up' ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                    {tickFlash === 'up' ? '▲ TICK' : '▼ TICK'}
                  </span>
                )}
              </div>
              <span className={`text-sm font-black mt-0.5 ${marginCushionDollar >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                ${marginCushionDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                Net Liq - Maintenance
              </span>
            </div>

            {/* Margin Cushion Percent */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2 flex flex-col">
              <span className="text-[9px] text-[#8b9bb4] font-bold">CUSHION BUFFER (%)</span>
              <span
                className={`text-sm font-black mt-0.5 ${
                  marginCushionPercent >= 30 ? 'text-[#00e676]' : marginCushionPercent >= 15 ? 'text-[#ffd600]' : 'text-[#ff334b]'
                }`}
              >
                {marginCushionPercent.toFixed(1)}%
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                Free equity ratio
              </span>
            </div>

            {/* Maintenance Margin Req */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2 flex flex-col">
              <span className="text-[9px] text-[#8b9bb4] font-bold">MAINTENANCE REQ</span>
              <span className="text-sm font-extrabold text-[#ffd600] mt-0.5">
                ${maintenanceMarginReq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                FINRA 75% threshold
              </span>
            </div>

            {/* Free Buying Power */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2 flex flex-col">
              <span className="text-[9px] text-[#8b9bb4] font-bold">FREE OPTIONS BP</span>
              <span className="text-sm font-extrabold text-[#38bdf8] mt-0.5">
                (${optionsBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                Deployable collateral
              </span>
            </div>

            {/* Portfolio Leverage */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2 flex flex-col">
              <span className="text-[9px] text-[#8b9bb4] font-bold">PORTFOLIO LEVERAGE</span>
              <span className="text-sm font-extrabold text-white mt-0.5">
                {leverageRatio.toFixed(2)}x
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                Gross Notional / Net Liq
              </span>
            </div>

            {/* SPY Drop Buffer */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2 flex flex-col">
              <span className="text-[9px] text-[#8b9bb4] font-bold flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-[#38bdf8]" />
                <span>DROP TOLERANCE</span>
              </span>
              <span className="text-sm font-black text-[#38bdf8] mt-0.5">
                -{spyDropTolerancePct.toFixed(1)}% SPY
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                Liq @ ${liquidationSpyPrice.toFixed(2)}
              </span>
            </div>

            {/* Margin Borrow & Carry Accrual */}
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setViewMode('interest');
              }}
              className="bg-[#0e1424] hover:bg-[#131c30] border border-[#1d273a] hover:border-[#ff334b]/60 rounded p-2 flex flex-col text-left transition-colors cursor-pointer group"
              title="Click to view full position-by-position borrow fee & margin carrying cost blotter"
            >
              <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] font-bold">
                <span className="flex items-center gap-1 group-hover:text-[#ff334b] transition-colors">
                  <Percent className="w-3 h-3 text-[#ff334b]" />
                  <span>BORROW / CARRY</span>
                </span>
                <span className="text-[8px] text-[#38bdf8] font-bold">VIEW ›</span>
              </div>
              <span className={`text-sm font-black mt-0.5 ${
                marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0 ? 'text-[#ff334b]' : 'text-slate-400'
              }`}>
                {marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0
                  ? `-$${marginInterestSummary.totalDailyInterestCost.toFixed(2)}/d`
                  : '$0.00/d'}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5 truncate">
                {marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0
                  ? `-$${marginInterestSummary.totalAnnualInterestCost.toLocaleString()}/yr`
                  : 'Zero financing'}
              </span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================
          3. VIEW MODE: STREAM (REAL-TIME SPARKLINE & AUDIT LOG)
      ======================================================== */}
      {viewMode === 'stream' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Sparkline Visual Chart */}
            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#8b9bb4] flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-[#00d2ff]" />
                  <span>MARGIN HEALTH SCORE TRAJECTORY (LAST 25 TICKS)</span>
                </span>
                <span className="text-white font-mono font-bold">
                  Current: {healthScore}/100
                </span>
              </div>

              {/* SVG Sparkline */}
              <div className="h-24 w-full relative bg-[#070b14] border border-[#182234] rounded overflow-hidden p-1 flex items-end">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="100" y2="20" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />

                  {/* Polyline Path */}
                  {telemetryHistory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke={statusColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={telemetryHistory
                        .map((pt, i) => {
                          const x = (i / Math.max(1, telemetryHistory.length - 1)) * 100;
                          const normY = 100 - ((pt.score - sparklineMin) / Math.max(1, sparklineMax - sparklineMin)) * 80 - 10;
                          return `${x.toFixed(1)},${Math.max(5, Math.min(95, normY)).toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  )}
                </svg>

                {/* Min / Max Labels */}
                <div className="absolute top-1 right-2 text-[9px] text-[#64748b] font-mono">
                  MAX {sparklineMax}
                </div>
                <div className="absolute bottom-1 right-2 text-[9px] text-[#64748b] font-mono">
                  MIN {sparklineMin}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#64748b]">
                <span>T-25 ticks</span>
                <span>Buffer: ${marginCushionDollar.toFixed(0)}</span>
                <span className="text-white font-mono">Real-Time OPRA Stream</span>
              </div>
            </div>

            {/* Live Telemetry Event Log */}
            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#8b9bb4] flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>LIVE MARGIN TELEMETRY AUDIT LOG</span>
                </span>
                <span className="text-[9px] text-[#38bdf8] animate-pulse">
                  ● STREAMING
                </span>
              </div>

              <div className="h-24 overflow-y-auto no-scrollbar divide-y divide-[#162132] font-mono text-[10.5px]">
                {telemetryEvents.length === 0 ? (
                  <div className="p-4 text-center text-[#64748b]">Awaiting market tick event...</div>
                ) : (
                  telemetryEvents.map((evt) => (
                    <div key={evt.id} className="py-1 px-1 flex items-baseline justify-between gap-2 hover:bg-[#121a2a]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[#64748b] text-[9px]">{evt.timestamp}</span>
                        <span className="text-slate-300 truncate">{evt.description}</span>
                      </div>
                      <span
                        className="text-[9px] font-bold shrink-0"
                        style={{ color: evt.statusColor }}
                      >
                        {evt.score}/100
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center text-[9px] text-[#64748b] border-t border-[#182234] pt-1">
                <span>Sub-second timestamp logging enabled</span>
                <span>FINRA Rule 4210 Compliance Monitor</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. VIEW MODE: STRESS (MACRO SHOCK SCENARIOS)
      ======================================================== */}
      {viewMode === 'stress' && (
        <div className="flex flex-col gap-3">
          {/* Scenario Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[#8b9bb4] font-bold uppercase mr-1">
              INJECT MACRO SHOCK:
            </span>
            {[
              { id: 'normal', label: 'BASELINE (NORMAL)' },
              { id: 'dip', label: 'MARKET -3% DIP' },
              { id: 'crash', label: 'MARKET -7% CRASH' },
              { id: 'black_swan', label: 'BLACK SWAN -15%' },
              { id: 'vol_spike', label: 'VOL +20PTS SURGE' },
              { id: 'rate_hike', label: 'RATE +100BPS SPIKE' },
            ].map((scen) => (
              <button
                key={scen.id}
                onClick={() => {
                  playKeyClick();
                  setActiveScenario(scen.id as StressScenario);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                  activeScenario === scen.id
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-md'
                    : 'bg-[#101726] text-[#8b9bb4] border-[#1e2a40] hover:text-white hover:border-[#334155]'
                }`}
              >
                {scen.label}
              </button>
            ))}
          </div>

          {/* Stress Scenario Impact Card */}
          <div
            className={`border rounded p-3 flex flex-col gap-2.5 ${
              simulatedStressMetrics.simMarginCall
                ? 'bg-rose-950/30 border-rose-500/80 ring-1 ring-rose-500/50'
                : simulatedStressMetrics.simStatus === 'WARNING'
                ? 'bg-amber-950/20 border-amber-500/60'
                : 'bg-[#0c121e] border-[#1d273a]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b263a] pb-2">
              <div className="flex items-center gap-2">
                <Flame className={`w-4 h-4 ${simulatedStressMetrics.simMarginCall ? 'text-rose-500 animate-pulse' : 'text-[#ff9900]'}`} />
                <span className="font-extrabold text-white text-xs">
                  {simulatedStressMetrics.scenarioLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {simulatedStressMetrics.simMarginCall ? (
                  <span className="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-500 text-rose-200 text-[10px] font-black animate-pulse">
                    MARGIN CALL DEFICIT: -${Math.abs(simulatedStressMetrics.simCushionDollar).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-700/50 text-emerald-400 text-[10px] font-bold">
                    SURPLUS BUFFER SECURE
                  </span>
                )}
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black"
                  style={{ backgroundColor: `${simulatedStressMetrics.simColor}25`, color: simulatedStressMetrics.simColor }}
                >
                  SIM SCORE: {simulatedStressMetrics.simScore}/100 ({simulatedStressMetrics.simStatus})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#070b14] p-2 rounded border border-[#182234]">
                <div className="text-[9px] text-[#8b9bb4]">PROJECTED NET LIQUIDITY</div>
                <div className="text-sm font-extrabold text-white mt-0.5">
                  ${simulatedStressMetrics.simNetLiq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[8.5px] text-[#64748b]">
                  Base: ${netLiquidity.toFixed(0)}
                </div>
              </div>

              <div className="bg-[#070b14] p-2 rounded border border-[#182234]">
                <div className="text-[9px] text-[#8b9bb4]">STRESSED MAINTENANCE REQ</div>
                <div className="text-sm font-extrabold text-[#ffd600] mt-0.5">
                  ${simulatedStressMetrics.simMaintReq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[8.5px] text-[#64748b]">
                  Elevated under volatility shock
                </div>
              </div>

              <div className="bg-[#070b14] p-2 rounded border border-[#182234]">
                <div className="text-[9px] text-[#8b9bb4]">REMAINING CUSHION ($)</div>
                <div className={`text-sm font-black mt-0.5 ${simulatedStressMetrics.simCushionDollar >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                  ${simulatedStressMetrics.simCushionDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[8.5px] text-[#64748b]">
                  Liquidation buffer remaining
                </div>
              </div>

              <div className="bg-[#070b14] p-2 rounded border border-[#182234]">
                <div className="text-[9px] text-[#8b9bb4]">CUSHION PERCENT</div>
                <div className="text-sm font-black mt-0.5" style={{ color: simulatedStressMetrics.simColor }}>
                  {simulatedStressMetrics.simCushionPercent.toFixed(1)}%
                </div>
                <div className="text-[8.5px] text-[#64748b]">
                  {simulatedStressMetrics.simMarginCall ? 'Capital call triggered' : 'Buffer holds threshold'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. VIEW MODE: HAIRCUTS (CAPITAL ALLOCATION BREAKDOWN)
      ======================================================== */}
      {viewMode === 'haircuts' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-[#8b9bb4] font-bold">TOTAL CAPITAL ALLOCATION</span>
              <div className="text-sm font-black text-white">
                ${netLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-[#64748b]">
                Equity backing options, stocks &amp; futures book
              </div>
            </div>

            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-[#ffd600] font-bold">COLLATERAL LOCKED</span>
              <div className="text-sm font-black text-[#ffd600]">
                ${initialMarginReq.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-[#64748b]">
                Initial BP reduction ({((initialMarginReq / Math.max(1, netLiquidity)) * 100).toFixed(1)}% of Net Liq)
              </div>
            </div>

            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-[#00d2ff] font-bold">UNENCUMBERED CAPITAL</span>
              <div className="text-sm font-black text-[#00d2ff]">
                (${optionsBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })})
              </div>
              <div className="text-[9px] text-[#64748b]">
                Free buying power available for deployment
              </div>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-[#8b9bb4]">
              <span>CAPITAL UTILIZATION COMPOSITION</span>
              <span>
                {((initialMarginReq / Math.max(1, netLiquidity)) * 100).toFixed(1)}% Locked ·{' '}
                {((optionsBuyingPower / Math.max(1, netLiquidity)) * 100).toFixed(1)}% Free
              </span>
            </div>
            <div className="w-full h-3 bg-[#0d1320] border border-[#1e293b] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-[#ffd600] to-[#ff9900]"
                style={{ width: `${Math.min(100, Math.max(0, (initialMarginReq / Math.max(1, netLiquidity)) * 100))}%` }}
                title="Locked Collateral"
              />
              <div
                className="h-full bg-gradient-to-r from-[#00d2ff] to-[#38bdf8]"
                style={{ width: `${Math.min(100, Math.max(0, (optionsBuyingPower / Math.max(1, netLiquidity)) * 100))}%` }}
                title="Free Options BP"
              />
            </div>
          </div>

          <div className="bg-[#0a0f18] p-2 rounded border border-[#182234] text-[10px] text-[#7d8ea6] flex items-center justify-between">
            <span>FINRA Rule 4210 / Reg-T Margin Engine</span>
            <span>Maintenance Haircut: 75% of Initial BP Requirement</span>
          </div>
        </div>
      )}

      {/* ========================================================
          5. VIEW MODE: INTEREST (SHORT STOCK BORROW & FUTURES MARGIN FINANCING)
      ======================================================== */}
      {viewMode === 'interest' && (
        <div className="flex flex-col gap-3.5">
          {/* Top Summary Metrics Cards (4 Columns) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Total Daily Accrual */}
            <div className="bg-[#0e1424] border border-[#ff334b]/40 rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#8b9bb4] font-bold flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#ff334b]" />
                <span>TOTAL DAILY ACCRUAL</span>
              </span>
              <span className={`text-sm font-black mt-0.5 ${
                marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0 ? 'text-[#ff334b]' : 'text-slate-300'
              }`}>
                {marginInterestSummary && marginInterestSummary.totalDailyInterestCost > 0
                  ? `-$${marginInterestSummary.totalDailyInterestCost.toFixed(2)} / day`
                  : '$0.00 / day'}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                {marginInterestSummary && marginInterestSummary.totalMonthlyInterestCost > 0
                  ? `-$${marginInterestSummary.totalMonthlyInterestCost.toFixed(2)} / month`
                  : 'Zero financing cost'}
              </span>
            </div>

            {/* Annualized Carry */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#8b9bb4] font-bold">ANNUALIZED CARRY</span>
              <span className="text-sm font-black text-white mt-0.5">
                {marginInterestSummary && marginInterestSummary.totalAnnualInterestCost > 0
                  ? `-$${marginInterestSummary.totalAnnualInterestCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} / yr`
                  : '$0.00 / yr'}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                360-day institutional money market
              </span>
            </div>

            {/* Short Stock Borrow Fees */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#ffd600] font-bold">SHORT STOCK BORROW</span>
              <span className="text-sm font-black text-[#ffd600] mt-0.5">
                {marginInterestSummary && marginInterestSummary.shortStockDailyBorrowCost > 0
                  ? `-$${marginInterestSummary.shortStockDailyBorrowCost.toFixed(2)} / day`
                  : '$0.00 / day'}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                HTB &amp; ETB stock loan fees
              </span>
            </div>

            {/* Futures SPAN Margin Carry */}
            <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#00d2ff] font-bold">FUTURES SPAN CARRY</span>
              <span className="text-sm font-black text-[#00d2ff] mt-0.5">
                {marginInterestSummary && marginInterestSummary.futuresDailyCarryingCost > 0
                  ? `-$${marginInterestSummary.futuresDailyCarryingCost.toFixed(2)} / day`
                  : '$0.00 / day'}
              </span>
              <span className="text-[8.5px] text-[#64748b] mt-0.5">
                CME SPAN margin opportunity cost
              </span>
            </div>
          </div>

          {/* Detailed Position-by-Position Financing Table */}
          <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182234] pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#ff334b]" />
                <span className="font-extrabold text-white text-xs">
                  POSITION MARGIN FINANCING &amp; BORROW FEES BLOTTER
                </span>
                <span className="text-[10px] text-[#8b9bb4]">
                  ({marginInterestSummary?.items.length || 0} active financing commitments)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8b9bb4]">
                <span>SOFR Benchmark: <strong className="text-white">{(BENCHMARK_RATES.US_SOFR * 100).toFixed(2)}%</strong></span>
                <span>·</span>
                <span>BoC Policy Rate: <strong className="text-white">{(BENCHMARK_RATES.CAD_BOC * 100).toFixed(2)}%</strong></span>
              </div>
            </div>

            {(!marginInterestSummary || marginInterestSummary.items.length === 0) ? (
              <div className="p-8 text-center text-[#64748b] text-xs">
                No short stocks, futures, or cash debit balances currently accrue margin borrowing fees in this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-[#070b14] border-b border-[#182234] text-[#8b9bb4] uppercase text-[9.5px]">
                      <th className="py-2 px-2.5">Position / Asset</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Classification</th>
                      <th className="py-2 px-2 text-right">Notional</th>
                      <th className="py-2 px-2 text-right">Margin Locked</th>
                      <th className="py-2 px-2 text-right">Borrow Rate</th>
                      <th className="py-2 px-2 text-right">Daily Cost</th>
                      <th className="py-2 px-2 text-right">Monthly</th>
                      <th className="py-2 px-2 text-right">Annual Cost</th>
                      <th className="py-2 px-2 text-center">Tax Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151f30] font-mono text-[11px]">
                    {marginInterestSummary.items.map((item) => (
                      <tr key={item.positionId} className="hover:bg-[#101726] transition-colors">
                        <td className="py-2 px-2.5 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#38bdf8]">{item.ticker}</span>
                            <span className="text-[10px] text-[#8b9bb4] font-normal truncate max-w-[150px]">
                              {item.strategyName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.assetType === 'stock'
                              ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                              : item.assetType === 'future'
                              ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                              : item.assetType === 'cash_debit'
                              ? 'bg-purple-950/50 text-purple-300 border border-purple-800/40'
                              : 'bg-blue-950/50 text-blue-300 border border-blue-800/40'
                          }`}>
                            {item.assetType === 'stock' ? 'SHORT STOCK' : item.assetType === 'future' ? 'FUTURES CARRY' : item.assetType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[10px] text-[#8b9bb4]">
                          <span className={item.borrowClassification === 'HTB' ? 'text-rose-400 font-bold' : ''}>
                            {item.borrowClassificationLabel}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-white font-mono">
                          ${item.notionalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-2 text-right text-[#ffd600] font-mono">
                          ${item.marginRequirement.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-white font-mono">
                          {(item.annualInterestRate * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-2 text-right font-extrabold text-[#ff334b] font-mono">
                          ${item.dailyInterestCost.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-300 font-mono">
                          ${item.monthlyInterestCost.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-[#8b9bb4] font-mono">
                          ${item.annualInterestCost.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center text-[9px]">
                          {item.taxDeductible ? (
                            <span className="text-[#00e676] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40 font-bold" title={item.taxNote}>
                              DEDUCTIBLE
                            </span>
                          ) : (
                            <span className="text-[#64748b]">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Hard-To-Borrow (HTB) Stock Borrow Rate Scanner & Margin Debit Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* HTB Stock Borrow Rate Catalog */}
            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-[#ffd600]" />
                  <span>STOCK BORROW RATES (HTB &amp; ETB MARKET SCANNER)</span>
                </span>
                <span className="text-[9px] text-[#8b9bb4]">
                  Annual Borrow Rate (% APR)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(STOCK_BORROW_RATES).slice(0, 9).map(([sym, item]) => (
                  <div key={sym} className="bg-[#070b14] border border-[#182234] rounded p-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{sym}</span>
                      <span className={`text-[8.5px] px-1 rounded font-bold ${
                        item.classification === 'HTB' ? 'bg-rose-950/60 text-rose-300' : 'bg-emerald-950/50 text-emerald-400'
                      }`}>
                        {item.classification}
                      </span>
                    </div>
                    <span className={`text-xs font-bold mt-1 ${item.classification === 'HTB' ? 'text-[#ff334b]' : 'text-slate-300'}`}>
                      {(item.rate * 100).toFixed(2)}% APR
                    </span>
                    <span className="text-[8px] text-[#64748b] truncate mt-0.5">
                      Rebate: {((BENCHMARK_RATES.US_SOFR - item.rate) * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[9.5px] text-[#7d8ea6] border-t border-[#182234] pt-1 flex items-center justify-between">
                <span>ETB = Free shares locate | HTB = Hard to borrow locate fee applies</span>
                <span className="text-[#38bdf8]">Wall Street 360d convention</span>
              </div>
            </div>

            {/* Broker Margin Debit Borrow Rate Simulator */}
            <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#00d2ff]" />
                  <span>BROKER MARGIN BORROWING RATE TIER CALCULATOR</span>
                </span>
                <span className="text-[9px] text-[#00d2ff] font-bold">
                  Tier: {(simDebitRate * 100).toFixed(2)}% APR
                </span>
              </div>

              <div className="text-[10px] text-[#8b9bb4]">
                Calculate daily and monthly interest expenses on negative cash balances or margin borrowing loans.
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[9px] text-[#8b9bb4] font-bold">SIMULATED BORROWED MARGIN DEBIT ($):</label>
                  <input
                    type="number"
                    value={simDebitAmount}
                    onChange={(e) => setSimDebitAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-[#070b14] border border-[#1e293b] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00d2ff] w-36 text-right"
                    step="5000"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {[25000, 50000, 100000, 250000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimDebitAmount(amt)}
                      className={`flex-1 py-1 rounded text-[9.5px] font-bold border transition-colors ${
                        simDebitAmount === amt
                          ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black'
                          : 'bg-[#101726] text-[#8b9bb4] border-[#1e2a40] hover:text-white'
                      }`}
                    >
                      ${(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#070b14] border border-[#182234] rounded p-2.5 grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8b9bb4]">MARGIN RATE</span>
                  <span className="text-xs font-black text-[#ffd600] mt-0.5">
                    {(simDebitRate * 100).toFixed(2)}% APR
                  </span>
                  <span className="text-[8px] text-[#64748b]">SOFR + Broker spread</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8b9bb4]">DAILY COST</span>
                  <span className="text-xs font-black text-[#ff334b] mt-0.5">
                    -${simDebitDailyCost.toFixed(2)} / day
                  </span>
                  <span className="text-[8px] text-[#64748b]">Accrued daily</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8b9bb4]">ANNUALIZED</span>
                  <span className="text-xs font-black text-white mt-0.5">
                    -${(simDebitDailyCost * 360).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / yr
                  </span>
                  <span className="text-[8px] text-emerald-400 font-bold">100% Tax Deductible</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Mechanics Disclosures */}
          <div className="bg-[#0a0f18] p-2.5 rounded border border-[#182234] text-[10px] text-[#7d8ea6] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Info className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>MARGIN BORROW INTEREST &amp; COST-OF-CARRY MECHANICS</span>
            </div>
            <p>
              • <strong>Short Stock Borrow Fees:</strong> Calculated as <code className="text-slate-300">(Notional × Borrow Rate) ÷ 360</code>. Hard-to-Borrow (HTB) fees accrue daily based on stock loan desk locate demand. On ex-dividend dates, short sellers are obligated to manufacture and pay the dividend amount to the stock lender.
            </p>
            <p>
              • <strong>Futures Cost of Carry:</strong> Index and commodity futures price in implicit financing according to <code className="text-slate-300">F = S × e^((r - q)T)</code>. Locked SPAN initial margin incurs an overnight opportunity cost against the benchmark risk-free rate.
            </p>
            <p>
              • <strong>Tax Deductibility:</strong> Margin interest paid on cash debit balances is deductible against taxable net investment income under <strong>IRS Code Section 163(d) (Form 4952)</strong> in the US and <strong>CRA Line 22100 (Carrying Charges)</strong> in Canadian non-registered margin accounts.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
          6. VIEW MODE: CANADIAN (CIRO RULE 5300 & CRA COMPLIANCE)
      ======================================================== */}
      {viewMode === 'canadian' && (
        <div className="flex flex-col gap-3.5">
          {/* Account Switcher Bar for Canadian Accounts with USD Badges */}
          <div className="bg-[#0b101c] border border-[#1b263b] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-[#8b9bb4] flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>CANADIAN ACCOUNT:</span>
              </span>

              {cadAccountsList.map((acc) => {
                const isSelected = acc.id === selectedCadAccId;
                const accNetLiq = acc.cashBalance + acc.positions.reduce((sum, p) => sum + p.currentMark, 0);
                const usdCash = acc.cashBalanceUsd !== undefined ? acc.cashBalanceUsd : acc.currency === 'USD' ? acc.cashBalance : 0;
                const hasUsdDeficit = usdCash < -0.01;

                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      playExecutionChime();
                      setSelectedCadAccId(acc.id);
                      if (onSelectAccount) onSelectAccount(acc.id);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-md'
                        : 'bg-[#101726] text-[#cbd5e1] border-[#1e2a40] hover:text-white hover:border-[#334155]'
                    }`}
                  >
                    <span>🇨🇦 {acc.code}</span>
                    <span className={`text-[9.5px] ${isSelected ? 'text-black/80 font-bold' : 'text-[#8b9bb4]'}`}>
                      ${(accNetLiq / 1000).toFixed(1)}k {acc.currency}
                    </span>
                    {acc.isRegistered && (
                      <span className={`text-[8.5px] px-1 rounded ${isSelected ? 'bg-black/25 text-black' : 'bg-emerald-950/60 text-emerald-400'}`}>
                        CRA
                      </span>
                    )}
                    {hasUsdDeficit ? (
                      <span className="text-[8px] px-1 rounded bg-rose-950/90 text-rose-300 border border-rose-600/70 font-black animate-pulse">
                        USD -${Math.abs(usdCash).toFixed(0)} ⚠️
                      </span>
                    ) : usdCash > 0 ? (
                      <span className={`text-[8px] px-1 rounded font-bold ${isSelected ? 'bg-black/20 text-black' : 'bg-emerald-950/40 text-emerald-400'}`}>
                        USD +${(usdCash / 1000).toFixed(1)}k
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[9.5px] text-[#64748b]">
                USD/CAD Spot: <strong className="text-white font-mono">1 USD = {USDCAD_EXCHANGE_RATE} CAD</strong>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 font-bold">
                CIRO DUAL-CURRENCY LEDGER
              </span>
            </div>
          </div>

          {/* Sub-Account Perspective Switcher: USD Health vs CAD Sub-Account vs Consolidated */}
          <div className="bg-[#090e1a] border border-[#1b263b] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-[#8b9bb4] uppercase px-1">
                LEDGER PERSPECTIVE:
              </span>

              {/* 1. USD Health & Deficit Audit Sub-Tab */}
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setCanadianSubTab('usd');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  canadianSubTab === 'usd'
                    ? 'bg-[#38bdf8] text-black border-[#38bdf8] font-black shadow-sm'
                    : 'bg-[#101726] text-[#cbd5e1] border-[#1e2a40] hover:text-white hover:border-[#334155]'
                }`}
              >
                <span>🇺🇸 USD HEALTH (SUB-ACCOUNT)</span>
                {currentCadHealth.usdHealth.isUsdDeficit ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">
                    ⚠️ DEFICIT (-${currentCadHealth.usdHealth.usdDeficitAmount.toFixed(0)})
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    canadianSubTab === 'usd' ? 'bg-black/20 text-black' : 'bg-emerald-950/60 text-emerald-400'
                  }`}>
                    ✅ {currentCadHealth.usdHealth.usdHealthScore}% HEALTH
                  </span>
                )}
              </button>

              {/* 2. CAD Sub-Account Sub-Tab */}
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setCanadianSubTab('cad');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  canadianSubTab === 'cad'
                    ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-sm'
                    : 'bg-[#101726] text-[#cbd5e1] border-[#1e2a40] hover:text-white hover:border-[#334155]'
                }`}
              >
                <span>🇨🇦 CAD SUB-ACCOUNT</span>
                <span className={`text-[9.5px] ${canadianSubTab === 'cad' ? 'text-black/80 font-bold' : 'text-[#8b9bb4]'}`}>
                  ${(targetCadAccount.cashBalanceCad !== undefined ? targetCadAccount.cashBalanceCad : targetCadAccount.cashBalance).toLocaleString()} CAD
                </span>
              </button>

              {/* 3. Consolidated Blotter Sub-Tab */}
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setCanadianSubTab('consolidated');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  canadianSubTab === 'consolidated'
                    ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-sm'
                    : 'bg-[#101726] text-[#cbd5e1] border-[#1e2a40] hover:text-white hover:border-[#334155]'
                }`}
              >
                <span>🌐 DUAL-CURRENCY CONSOLIDATED</span>
              </button>
            </div>

            {/* Quick Settle Notice or Live Info */}
            <div className="flex items-center gap-2">
              {currentCadHealth.usdHealth.isUsdDeficit ? (
                <button
                  type="button"
                  onClick={() => handleSettleUsdDeficit(targetCadAccount)}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] rounded flex items-center gap-1 shadow-sm transition-all animate-bounce"
                  title="Zero out the USD debit using available CAD funds at exact spot rate via Norbert's Gambit"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>SETTLE USD DEFICIT NOW</span>
                </button>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>USD Sub-Account Clean · No Debit Carry</span>
                </span>
              )}
            </div>
          </div>

          {/* Success Banner when Deficit is Cleared */}
          {deficitJournalSuccess && (
            <div className="bg-emerald-950/60 border border-emerald-600/70 rounded-lg p-3 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="font-semibold leading-relaxed">{deficitJournalSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeficitJournalSuccess(null)}
                className="text-emerald-400 hover:text-white font-bold text-sm px-1.5 py-0.5 rounded bg-emerald-900/50 hover:bg-emerald-800 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* =========================================================================
              VIEW SUB-TAB: USD HEALTH (SUB-ACCOUNT CURRENCY SPLIT & DEFICIT AUDIT)
          ========================================================================= */}
          {canadianSubTab === 'usd' && (
            <div className="flex flex-col gap-3">
              {/* USD Health Top Status & Regulatory Bar */}
              <div className="bg-[#0b101c] border border-[#1b263b] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[#38bdf8]">
                    <DollarSign className="w-5 h-5 text-[#38bdf8]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white">
                        🇨🇦 {targetCadAccount.name} · 🇺🇸 USD SUB-ACCOUNT
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black uppercase border"
                        style={{
                          backgroundColor: `${currentCadHealth.usdHealth.usdHealthStatusColor}20`,
                          color: currentCadHealth.usdHealth.usdHealthStatusColor,
                          borderColor: `${currentCadHealth.usdHealth.usdHealthStatusColor}50`,
                        }}
                      >
                        {currentCadHealth.usdHealth.usdHealthStatus} ({currentCadHealth.usdHealth.usdHealthScore}/100)
                      </span>
                      <span className="bg-blue-950/40 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                        {currentCadHealth.usdHealth.irsWithholdingStatus}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8b9bb4] flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{targetCadAccount.institution} · #{targetCadAccount.accountNumber}</span>
                      <span>·</span>
                      <span className="text-[#38bdf8] font-bold">CIRO Rule 5300 · USD Margin Standard</span>
                      <span>·</span>
                      <span className="text-slate-400">
                        USD Debit Carry Rate: <strong className="text-amber-300">{(currentCadHealth.usdHealth.usdDebtAnnualInterestRate * 100).toFixed(2)}% APR</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded text-xs font-bold border flex items-center gap-1.5 ${
                    currentCadHealth.usdHealth.craAdvantageTaxRisk
                      ? 'bg-rose-950/70 border-rose-600 text-rose-300 animate-pulse'
                      : currentCadHealth.usdHealth.isUsdDeficit
                      ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                      : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                  }`}>
                    {currentCadHealth.usdHealth.isUsdDeficit ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>
                      {currentCadHealth.usdHealth.craAdvantageTaxRisk
                        ? 'CRITICAL: PROHIBITED USD DEBIT IN REGISTERED TRUST'
                        : currentCadHealth.usdHealth.isUsdDeficit
                        ? `USD DEFICIT DEBIT: -$${currentCadHealth.usdHealth.usdDeficitAmount.toFixed(2)} USD`
                        : 'USD SUB-ACCOUNT CASH SECURE · NO DEBIT CARRY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Urgent USD Deficit Remediation Card (Visible if USD deficit exists) */}
              {currentCadHealth.usdHealth.isUsdDeficit && (
                <div className="bg-gradient-to-r from-[#200d14] via-[#16101c] to-[#0d1424] border-2 border-rose-600/70 rounded-lg p-3.5 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-rose-800/40 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                      <span className="text-sm font-black text-white">
                        ACTIVE USD CASH DEFICIT · FINANCIAL BLEED DETECTED
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white">
                      8.75% ANNUAL MARGIN DRAG
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed">
                    Your Canadian account maintains a negative USD ledger balance of{' '}
                    <strong className="text-rose-400 font-mono text-sm">
                      -${currentCadHealth.usdHealth.usdDeficitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </strong>
                    . Canadian brokerages (TD Direct, Questrade, RBC Direct, BMO, Scotia) <strong className="text-white">do not automatically convert cash across sub-accounts</strong>. Even though you have positive CAD equity, you are paying <strong className="text-amber-300">8.75% APR</strong> daily borrow interest on this USD debit (
                    <strong className="text-rose-400 font-mono">-${currentCadHealth.usdHealth.dailyUsdCarryCost.toFixed(2)} USD/day</strong> = <strong className="text-rose-400 font-mono">-${currentCadHealth.usdHealth.annualUsdCarryCost.toFixed(2)} USD/yr</strong>).
                    {targetCadAccount.isRegistered && (
                      <p className="text-rose-300 font-bold mt-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          CRITICAL CRA COMPLIANCE: In registered plans (TFSA, RRSP, FHSA, RESP), holding negative cash balances violates Section 146/146.2 of the Income Tax Act, triggering 100% CRA Advantage Tax penalties.
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="bg-[#090d18] border border-[#1e2a44] rounded p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-[#8b9bb4] font-bold">USD DEFICIT AMOUNT</span>
                      <p className="text-sm font-black text-[#ff334b] font-mono mt-0.5">
                        -${currentCadHealth.usdHealth.usdDeficitAmount.toFixed(2)} USD
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8b9bb4] font-bold">SPOT CAD REQUIRED</span>
                      <p className="text-sm font-black text-white font-mono mt-0.5">
                        ${(currentCadHealth.usdHealth.usdDeficitAmount * USDCAD_EXCHANGE_RATE).toFixed(2)} CAD
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8b9bb4] font-bold">AVAILABLE CAD CASH</span>
                      <p className="text-sm font-black text-[#00e676] font-mono mt-0.5">
                        ${(targetCadAccount.cashBalanceCad !== undefined ? targetCadAccount.cashBalanceCad : targetCadAccount.cashBalance).toLocaleString()} CAD
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8b9bb4] font-bold">BANK FX SPREAD SAVED</span>
                      <p className="text-sm font-black text-[#00d2ff] font-mono mt-0.5">
                        +${((currentCadHealth.usdHealth.usdDeficitAmount * USDCAD_EXCHANGE_RATE) * 0.02).toFixed(2)} CAD
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-[#8b9bb4]">
                      Remedy: Journal CAD cash to USD using Norbert&apos;s Gambit (DLR.TO ➔ DLR.U.TO) to settle at exact spot with 0% bank spread.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSettleUsdDeficit(targetCadAccount)}
                      className="px-3.5 py-1.5 bg-[#00e676] hover:bg-[#00c853] text-black font-black text-xs rounded transition-all flex items-center gap-2 shadow-lg active:scale-95"
                    >
                      <Zap className="w-4 h-4 text-black" />
                      <span>⚡ AUTO-SETTLE DEFICIT VIA NORBERT&apos;S GAMBIT (DLR.TO)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* USD Health 6-Card Numerical Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {/* 1. USD Cash Balance */}
                <div className={`border rounded p-2.5 flex flex-col ${
                  currentCadHealth.usdHealth.isUsdDeficit
                    ? 'bg-rose-950/30 border-rose-600/70'
                    : 'bg-[#0e1424] border-[#1d273a]'
                }`}>
                  <span className="text-[9px] text-[#8b9bb4] font-bold flex items-center justify-between">
                    <span>USD CASH LEDGER</span>
                    {currentCadHealth.usdHealth.isUsdDeficit ? (
                      <span className="text-[8px] text-rose-400 font-black">DEFICIT</span>
                    ) : (
                      <span className="text-[8px] text-emerald-400 font-black">SURPLUS</span>
                    )}
                  </span>
                  <span className={`text-sm font-black mt-0.5 font-mono ${
                    currentCadHealth.usdHealth.isUsdDeficit ? 'text-[#ff334b]' : 'text-[#00e676]'
                  }`}>
                    ${currentCadHealth.usdHealth.cashBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    {currentCadHealth.usdHealth.isUsdDeficit
                      ? 'Incurs 8.75% daily debit drag'
                      : 'Positive unencumbered USD'}
                  </span>
                </div>

                {/* 2. Daily Carry Burn */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">DAILY BORROW CARRY</span>
                  <span className={`text-sm font-black mt-0.5 font-mono ${
                    currentCadHealth.usdHealth.isUsdDeficit ? 'text-[#ffd600]' : 'text-slate-300'
                  }`}>
                    {currentCadHealth.usdHealth.isUsdDeficit
                      ? `-$${currentCadHealth.usdHealth.dailyUsdCarryCost.toFixed(2)} USD/d`
                      : '$0.00 USD/d'}
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    {(currentCadHealth.usdHealth.usdDebtAnnualInterestRate * 100).toFixed(2)}% APR (${currentCadHealth.usdHealth.annualUsdCarryCost.toFixed(0)}/yr)
                  </span>
                </div>

                {/* 3. US Positions Mark Value */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">US HOLDINGS MARK</span>
                  <span className="text-sm font-black text-white mt-0.5 font-mono">
                    ${currentCadHealth.usdHealth.usPositionsMarkUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                  <span className="text-[8.5px] text-[#38bdf8] mt-0.5">
                    {currentCadHealth.usdHealth.usPositionsCount} US Assets (≈ ${currentCadHealth.usdHealth.usPositionsMarkCad.toLocaleString()} CAD)
                  </span>
                </div>

                {/* 4. CIRO US Maintenance Requirement */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">CIRO US MAINT REQ</span>
                  <span className="text-sm font-black text-[#ffd600] mt-0.5 font-mono">
                    ${currentCadHealth.usdHealth.usMaintenanceReqUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    {targetCadAccount.isRegistered ? '100% Cash-backed requirement' : 'CIRO 50% equity margin rate'}
                  </span>
                </div>

                {/* 5. USD Buying Power */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">USD BUYING POWER</span>
                  <span className="text-sm font-black text-[#00e676] mt-0.5 font-mono">
                    ${currentCadHealth.usdHealth.usdBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    Opt BP: ${currentCadHealth.usdHealth.usdOptionBuyingPower.toLocaleString()} USD
                  </span>
                </div>

                {/* 6. CIRO 3.00% FX Haircut */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3 text-[#38bdf8]" />
                    <span>3.00% FX HAIRCUT</span>
                  </span>
                  <span className="text-sm font-black text-[#38bdf8] mt-0.5 font-mono">
                    ${currentCadHealth.usdHealth.ciroFxHaircutUsd.toFixed(2)} USD
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    Rule 5300 currency risk buffer
                  </span>
                </div>
              </div>

              {/* Two-Column Middle Section: US Holdings Ledger + IRS Treaty Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 1. US Securities Breakdown in Canadian Account */}
                <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>US HOLDINGS IN CANADIAN ACCOUNT ({targetCadAccount.code})</span>
                    </span>
                    <span className="text-[9px] text-[#8b9bb4]">
                      Denominated in USD (NYSE/NASDAQ/CME)
                    </span>
                  </div>

                  {currentCadHealth.usdHealth.usPositions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10.5px]">
                        <thead>
                          <tr className="text-[#8b9bb4] border-b border-[#1b263b] text-[9.5px]">
                            <th className="py-1">ASSET / STRATEGY</th>
                            <th className="py-1">QTY</th>
                            <th className="py-1 text-right">MARK (USD)</th>
                            <th className="py-1 text-right">P&amp;L</th>
                            <th className="py-1 text-right">CIRO MAINT</th>
                            <th className="py-1 text-right">WITHHOLDING</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#151f30]">
                          {currentCadHealth.usdHealth.usPositions.map((p, idx) => (
                            <tr key={idx} className="hover:bg-[#101726]/60 transition-colors">
                              <td className="py-1.5 font-bold text-white">
                                <div>{p.ticker}</div>
                                <div className="text-[8.5px] text-[#8b9bb4] truncate max-w-[140px]">{p.strategyName}</div>
                              </td>
                              <td className="py-1.5 text-slate-300 font-mono">{p.sharesOrContracts}</td>
                              <td className="py-1.5 text-right font-mono font-bold text-white">
                                ${p.currentMarkUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`py-1.5 text-right font-mono font-bold ${
                                p.unrealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                              }`}>
                                {p.unrealizedPnL >= 0 ? '+' : ''}${p.unrealizedPnL.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right font-mono text-[#ffd600]">
                                ${p.marginReqUsd.toLocaleString()}
                              </td>
                              <td className="py-1.5 text-right text-[8.5px] text-[#38bdf8]">
                                {p.withholdingTaxExposure}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[#8b9bb4] flex flex-col items-center justify-center gap-1.5">
                      <FileText className="w-6 h-6 text-[#38bdf8] opacity-50" />
                      <p>No active US equities or option contracts in this account.</p>
                      <p className="text-[10px] text-[#64748b]">
                        Trading US assets (SPY, AAPL, NVDA) will automatically debit or credit the USD sub-account.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. IRS 15% Withholding Tax Audit & Canada-US Tax Treaty */}
                <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#00d2ff]" />
                      <span>IRS WITHHOLDING TAX &amp; CANADA-US TREATY AUDIT</span>
                    </span>
                    <span className="text-[9px] text-[#00d2ff] font-bold">
                      W-8BEN &amp; Article XXI Rules
                    </span>
                  </div>

                  <div className="text-[10.5px] text-slate-300 divide-y divide-[#162132]">
                    <div className="py-2 flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-white">Account Classification:</strong>
                        <p className="text-[9.5px] text-[#8b9bb4]">
                          {targetCadAccount.name} ({targetCadAccount.code})
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-950/60 text-blue-300 border border-blue-700/60">
                        {currentCadHealth.usdHealth.irsWithholdingStatus}
                      </span>
                    </div>

                    <div className="py-2 text-[10px] text-slate-300 leading-relaxed">
                      {currentCadHealth.usdHealth.irsWithholdingNote}
                    </div>

                    <div className="py-2 grid grid-cols-3 gap-1.5 text-[9.5px]">
                      <div className="p-1.5 rounded bg-[#090d16] border border-[#1e293b]">
                        <strong className="text-emerald-400">RRSP / RRIF</strong>
                        <p className="text-[8.5px] text-[#8b9bb4] mt-0.5">0% IRS Withholding (Article XXI Treaty Exempt).</p>
                      </div>
                      <div className="p-1.5 rounded bg-[#090d16] border border-[#1e293b]">
                        <strong className="text-amber-400">TFSA / FHSA</strong>
                        <p className="text-[8.5px] text-[#8b9bb4] mt-0.5">15% Non-recoverable drag on US dividend yield.</p>
                      </div>
                      <div className="p-1.5 rounded bg-[#090d16] border border-[#1e293b]">
                        <strong className="text-blue-400">MARGIN CA$</strong>
                        <p className="text-[8.5px] text-[#8b9bb4] mt-0.5">15% Withheld, 100% claimable on CRA Form T2209.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrated Norbert's Gambit Currency Journaling Calculator */}
              <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#00d2ff]" />
                    <span>NORBERT&apos;S GAMBIT (DLR.TO) FX ARBITRAGE CALCULATOR</span>
                  </span>
                  <span className="text-[9px] text-[#00d2ff] font-bold">
                    Zero Bank Spread (0% vs 2.0%)
                  </span>
                </div>

                <div className="text-[10px] text-[#8b9bb4]">
                  Convert Canadian dollars to USD for options buying power at exact spot using <strong className="text-white">DLR.TO / DLR.U.TO</strong>, bypassing retail bank 2.00% currency conversion markups.
                </div>

                {/* Conversion Direction & Amount */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[#8b9bb4] font-bold">CONVERSION DIRECTION:</label>
                    <div className="flex rounded border border-[#1e293b] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNorbertDirection('CAD_TO_USD')}
                        className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
                          norbertDirection === 'CAD_TO_USD' ? 'bg-[#00d2ff] text-black font-black' : 'bg-[#101726] text-[#8b9bb4]'
                        }`}
                      >
                        CAD → USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setNorbertDirection('USD_TO_CAD')}
                        className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
                          norbertDirection === 'USD_TO_CAD' ? 'bg-[#00d2ff] text-black font-black' : 'bg-[#101726] text-[#8b9bb4]'
                        }`}
                      >
                        USD → CAD
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[#8b9bb4] font-bold">CONVERT AMOUNT ({norbertDirection === 'CAD_TO_USD' ? 'CAD' : 'USD'}):</label>
                    <input
                      type="number"
                      value={norbertAmount}
                      onChange={(e) => setNorbertAmount(Math.max(100, Number(e.target.value) || 0))}
                      className="bg-[#090d16] border border-[#1e293b] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00d2ff]"
                      step="500"
                    />
                  </div>
                </div>

                {/* Norbert's Gambit Execution Readout Card */}
                <div className="bg-[#070b14] border border-[#182234] rounded p-2.5 flex flex-col gap-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-[#8b9bb4]">SHARES TO JOURNAL</span>
                      <span className="text-xs font-black text-white mt-0.5">
                        {norbertResult.sharesToTrade.toLocaleString()} shs DLR
                      </span>
                      <span className="text-[8px] text-[#64748b]">DLR.TO @ ${norbertResult.dlrSharePriceCad}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-[#8b9bb4]">NET DELIVERED</span>
                      <span className="text-xs font-black text-[#00e676] mt-0.5">
                        ${norbertResult.netTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {norbertResult.targetCurrency}
                      </span>
                      <span className="text-[8px] text-[#64748b]">Exact spot execution</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-[#ff334b]">RETAIL BANK COST</span>
                      <span className="text-xs font-black text-[#ff334b] mt-0.5">
                        -${norbertResult.retailBankSpreadCost.toFixed(2)}
                      </span>
                      <span className="text-[8px] text-[#64748b]">2.0% bank FX spread</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-[#00d2ff]">NET MONEY SAVED</span>
                      <span className="text-xs font-black text-[#00d2ff] mt-0.5">
                        +${norbertResult.netSavingsCad.toFixed(2)} CAD
                      </span>
                      <span className="text-[8px] text-emerald-400 font-bold">100% saved for margin!</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#64748b] border-t border-[#182234] pt-1">
                    <span>Method: Buy DLR.TO on TSX ➔ Journal shares to DLR.U.TO ➔ Sell for USD</span>
                    <span className="text-white font-mono">Commission: ${norbertResult.norbertsGambitBrokerFee.toFixed(2)} flat</span>
                  </div>
                </div>
              </div>

              {/* Canadian Brokerage USD Debit & Conversion Comparison Matrix */}
              <div className="bg-[#0b101c] border border-[#1b263b] rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>CANADIAN BROKERAGE USD SUB-ACCOUNT RULES &amp; DEBIT COMPARISON</span>
                  </span>
                  <span className="text-[9px] text-[#8b9bb4]">
                    Canadian Investment Regulatory Organization (CIRO)
                  </span>
                </div>

                <div className="overflow-x-auto text-[10px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[#8b9bb4] border-b border-[#1b263b]">
                        <th className="py-1">BROKERAGE</th>
                        <th className="py-1">USD SUB-ACCOUNT LEDGER</th>
                        <th className="py-1">USD MARGIN DEBIT RATE</th>
                        <th className="py-1">AUTO-CONVERSION SPREAD</th>
                        <th className="py-1">REGISTERED USD OVERDRAFT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#151f30]">
                      <tr>
                        <td className="py-1.5 font-bold text-white">Interactive Brokers Canada</td>
                        <td className="py-1.5 text-emerald-400">Multi-currency native ledger</td>
                        <td className="py-1.5 text-emerald-400 font-mono">6.83% (Fed Funds + 1.5%)</td>
                        <td className="py-1.5 text-emerald-400">$2.00 flat spot (0.002%)</td>
                        <td className="py-1.5 text-slate-300">Auto-rejects negative cash</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-white">TD Direct Investing</td>
                        <td className="py-1.5 text-slate-300">Dedicated USD sub-account</td>
                        <td className="py-1.5 text-amber-400 font-mono">8.75% (TD US Prime + 3.75%)</td>
                        <td className="py-1.5 text-rose-400">1.95% - 2.15% bank markup</td>
                        <td className="py-1.5 text-rose-400">Allowed with 8.75% debit drag</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-white">Questrade Canada</td>
                        <td className="py-1.5 text-slate-300">Dual CAD/USD cash balances</td>
                        <td className="py-1.5 text-amber-400 font-mono">9.25% (US Prime + 4.25%)</td>
                        <td className="py-1.5 text-rose-400">1.75% - 2.00% markup</td>
                        <td className="py-1.5 text-rose-400">Incurs USD margin borrow</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-white">RBC Direct Investing</td>
                        <td className="py-1.5 text-slate-300">Dual-currency accounts</td>
                        <td className="py-1.5 text-amber-400 font-mono">8.95% (RBC US Prime + 3.95%)</td>
                        <td className="py-1.5 text-rose-400">2.00% markup</td>
                        <td className="py-1.5 text-amber-400">Forced auto-sweep after 30d</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-white">Wealthsimple Trade</td>
                        <td className="py-1.5 text-amber-400">USD account requires $10/mo</td>
                        <td className="py-1.5 text-slate-400">N/A (Cash only)</td>
                        <td className="py-1.5 text-rose-400">1.50% markup each trade</td>
                        <td className="py-1.5 text-emerald-400">No overdraft allowed</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW SUB-TAB: CAD SUB-ACCOUNT (EXISTING CIRO RULE 5300 & CRA MATRIX)
          ========================================================================= */}
          {canadianSubTab === 'cad' && (
            <div className="flex flex-col gap-3.5">
              {/* Top Status & Regulatory Bar for CAD */}
              <div className="bg-[#0b101c] border border-[#1b263b] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[#00d2ff]">
                    <Scale className="w-5 h-5 text-[#00d2ff]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white">
                        🇨🇦 {targetCadAccount.name} · CAD SUB-ACCOUNT
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black uppercase border"
                        style={{
                          backgroundColor: `${currentCadHealth.statusColor}20`,
                          color: currentCadHealth.statusColor,
                          borderColor: `${currentCadHealth.statusColor}50`,
                        }}
                      >
                        {currentCadHealth.status} ({currentCadHealth.healthScore}/100)
                      </span>
                      {targetCadAccount.isRegistered ? (
                        <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                          CRA REGISTERED TRUST
                        </span>
                      ) : (
                        <span className="bg-purple-950/40 text-purple-400 border border-purple-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                          NON-REGISTERED MARGIN
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#8b9bb4] flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{targetCadAccount.institution} · #{targetCadAccount.accountNumber}</span>
                      <span>·</span>
                      <span className="text-[#38bdf8] font-bold">{currentCadHealth.ciroRuleLabel}</span>
                      <span>·</span>
                      <span className={currentCadHealth.isCipfFullyCovered ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        CIPF $1,000,000 CAD Protection: {currentCadHealth.isCipfFullyCovered ? 'Active (100% Covered)' : 'Partial Coverage'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded text-xs font-bold border flex items-center gap-1.5 ${
                    currentCadHealth.hasProhibitedBorrowing
                      ? 'bg-rose-950/60 border-rose-600 text-rose-300 animate-pulse'
                      : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                  }`}>
                    {currentCadHealth.hasProhibitedBorrowing ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>
                      {currentCadHealth.hasProhibitedBorrowing
                        ? 'PROHIBITED MARGIN DEBT DETECTED'
                        : targetCadAccount.isRegistered
                        ? '100% CASH-COVERED · NO ADVANTAGE TAX'
                        : 'CIRO RULE 5300 MARGIN SECURE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Canadian Margin Numerical Metrics (6 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {/* Net Liquidity CAD & USD */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">TOTAL NET LIQUIDITY</span>
                  <span className="text-sm font-black text-white mt-0.5">
                    ${currentCadHealth.netLiquidityCad.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                  </span>
                  <span className="text-[8.5px] text-[#00d2ff] mt-0.5">
                    ≈ ${currentCadHealth.netLiquidityUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </span>
                </div>

                {/* CRA Anti-Borrowing Check */}
                <div className={`bg-[#0e1424] border rounded p-2.5 flex flex-col ${
                  currentCadHealth.hasProhibitedBorrowing ? 'border-rose-500/80 bg-rose-950/20' : 'border-[#1d273a]'
                }`}>
                  <span className="text-[9px] text-[#8b9bb4] font-bold">CRA BORROWING AUDIT</span>
                  <span className={`text-sm font-black mt-0.5 ${
                    currentCadHealth.hasProhibitedBorrowing
                      ? 'text-[#ff334b]'
                      : targetCadAccount.isRegistered
                      ? 'text-[#00e676]'
                      : 'text-[#38bdf8]'
                  }`}>
                    {targetCadAccount.isRegistered
                      ? currentCadHealth.hasProhibitedBorrowing
                        ? `-$${Math.abs(targetCadAccount.cashBalance).toFixed(2)} DEBT`
                        : '$0.00 CAD DEBT'
                      : 'MARGIN ACCOUNT'}
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    {targetCadAccount.isRegistered ? 'ITA Sec 146.2 strict cash rule' : 'CIRO borrowing permitted'}
                  </span>
                </div>

                {/* Canadian Margin Cushion */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">COLLATERAL CUSHION</span>
                  <span className={`text-sm font-black mt-0.5 ${
                    currentCadHealth.marginCushionPercent >= 30 ? 'text-[#00e676]' : currentCadHealth.marginCushionPercent >= 15 ? 'text-[#ffd600]' : 'text-[#ff334b]'
                  }`}>
                    ${currentCadHealth.marginCushionNative.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currentCadHealth.currency}
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    Buffer: {currentCadHealth.marginCushionPercent.toFixed(1)}% of Net Liq
                  </span>
                </div>

                {/* CIRO Maintenance Requirement */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">CIRO / CRA MAINT REQ</span>
                  <span className="text-sm font-extrabold text-[#ffd600] mt-0.5">
                    ${currentCadHealth.maintenanceReqNative.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currentCadHealth.currency}
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    {targetCadAccount.isRegistered ? '100% Cash-backed requirement' : 'CIRO 75% regulatory house rate'}
                  </span>
                </div>

                {/* CIRO 3.00% FX Haircut */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3 text-[#38bdf8]" />
                    <span>3.00% FX HAIRCUT</span>
                  </span>
                  <span className="text-sm font-black text-[#38bdf8] mt-0.5">
                    ${currentCadHealth.fxHaircutDollarCad.toFixed(2)} CAD
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5">
                    On ${currentCadHealth.foreignAssetsValNative.toLocaleString()} US foreign assets
                  </span>
                </div>

                {/* Options Clearing Level */}
                <div className="bg-[#0e1424] border border-[#1d273a] rounded p-2.5 flex flex-col">
                  <span className="text-[9px] text-[#8b9bb4] font-bold">CLEARING LEVEL</span>
                  <span className="text-sm font-black text-[#a855f7] mt-0.5">
                    Level {currentCadHealth.optionsLevel}
                  </span>
                  <span className="text-[8.5px] text-[#64748b] mt-0.5 truncate" title={currentCadHealth.optionsLevelLabel}>
                    {targetCadAccount.isRegistered ? 'Covered Calls & Long Opts' : 'Full Margin & Naked Options'}
                  </span>
                </div>
              </div>

              {/* Strategy Compliance Gatekeeper Matrix & Norbert's Gambit Tool */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* CRA & CIRO Strategy Compliance Matrix */}
                <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>CRA &amp; CIRO STRATEGY GATEKEEPER MATRIX ({targetCadAccount.code})</span>
                    </span>
                    <span className="text-[9px] text-[#8b9bb4]">
                      Rules: ITA 146.2 &amp; CIRO 3200
                    </span>
                  </div>

                  <div className="divide-y divide-[#162132] text-[10.5px]">
                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">Covered Call (Own 100 Shs + Sell Call)</span>
                        <p className="text-[9px] text-[#64748b]">Standard income generation on blue-chips (RY.TO, ENB.TO)</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-700/50 text-[9px] font-black shrink-0">
                        ✅ APPROVED (CRA LEVEL 2)
                      </span>
                    </div>

                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">Long Speculative Calls &amp; Puts</span>
                        <p className="text-[9px] text-[#64748b]">Limited risk directional options (SHOP.TO, SPY)</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-700/50 text-[9px] font-black shrink-0">
                        ✅ APPROVED (CRA LEVEL 2)
                      </span>
                    </div>

                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">Cash-Secured Puts (Sell OTM Put with Cash)</span>
                        <p className="text-[9px] text-[#64748b]">Requires 100% strike cash collateral in broker reserve</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        targetCadAccount.isRegistered
                          ? 'bg-amber-950/50 text-amber-300 border border-amber-700/50'
                          : 'bg-emerald-950/50 text-emerald-400 border border-emerald-700/50'
                      }`}>
                        {targetCadAccount.isRegistered ? '⚠️ RESTRICTED (BIG-5 BLOCKED)' : '✅ APPROVED (MARGIN L3/L4)'}
                      </span>
                    </div>

                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">Naked Short Calls (Uncovered)</span>
                        <p className="text-[9px] text-[#64748b]">Theoretically infinite risk without underlying equity hedge</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        targetCadAccount.isRegistered
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
                          : 'bg-emerald-950/50 text-emerald-400 border border-emerald-700/50'
                      }`}>
                        {targetCadAccount.isRegistered ? '⛔ PROHIBITED (100% ADVANTAGE TAX)' : '✅ APPROVED (CIRO LEVEL 4)'}
                      </span>
                    </div>

                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">Iron Condors &amp; Multi-Leg Credit Spreads</span>
                        <p className="text-[9px] text-[#64748b]">Multi-leg margin spread clearing with simultaneous legs</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        targetCadAccount.isRegistered
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
                          : 'bg-emerald-950/50 text-emerald-400 border border-emerald-700/50'
                      }`}>
                        {targetCadAccount.isRegistered ? '⛔ PROHIBITED IN REGISTERED' : '✅ APPROVED (CIRO LEVEL 4)'}
                      </span>
                    </div>

                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">Index &amp; Commodity Futures (/ES, /CL, /NQ)</span>
                        <p className="text-[9px] text-[#64748b]">Bilateral margin contracts traded on CME / ICE</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        targetCadAccount.isRegistered
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
                          : 'bg-purple-950/50 text-purple-300 border border-purple-700/50'
                      }`}>
                        {targetCadAccount.isRegistered ? '⛔ NON-QUALIFIED TRUST (50% TAX)' : '✅ FUTURES MARGIN APPROVED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Norbert's Gambit Currency Journaling Calculator */}
                <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-[#00d2ff]" />
                      <span>NORBERT&apos;S GAMBIT (DLR.TO) FX ARBITRAGE CALCULATOR</span>
                    </span>
                    <span className="text-[9px] text-[#00d2ff] font-bold">
                      Zero Bank Spread (0% vs 2.0%)
                    </span>
                  </div>

                  <div className="text-[10px] text-[#8b9bb4]">
                    Convert Canadian dollars to USD for options buying power at exact spot using <strong className="text-white">DLR.TO / DLR.U.TO</strong>, bypassing retail bank 2.00% currency conversion markups.
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-[#8b9bb4] font-bold">CONVERSION DIRECTION:</label>
                      <div className="flex rounded border border-[#1e293b] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setNorbertDirection('CAD_TO_USD')}
                          className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
                            norbertDirection === 'CAD_TO_USD' ? 'bg-[#00d2ff] text-black font-black' : 'bg-[#101726] text-[#8b9bb4]'
                          }`}
                        >
                          CAD → USD
                        </button>
                        <button
                          type="button"
                          onClick={() => setNorbertDirection('USD_TO_CAD')}
                          className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
                            norbertDirection === 'USD_TO_CAD' ? 'bg-[#00d2ff] text-black font-black' : 'bg-[#101726] text-[#8b9bb4]'
                          }`}
                        >
                          USD → CAD
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-[#8b9bb4] font-bold">CONVERT AMOUNT ({norbertDirection === 'CAD_TO_USD' ? 'CAD' : 'USD'}):</label>
                      <input
                        type="number"
                        value={norbertAmount}
                        onChange={(e) => setNorbertAmount(Math.max(100, Number(e.target.value) || 0))}
                        className="bg-[#090d16] border border-[#1e293b] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00d2ff]"
                        step="500"
                      />
                    </div>
                  </div>

                  <div className="bg-[#070b14] border border-[#182234] rounded p-2.5 flex flex-col gap-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[8.5px] text-[#8b9bb4]">SHARES TO JOURNAL</span>
                        <span className="text-xs font-black text-white mt-0.5">
                          {norbertResult.sharesToTrade.toLocaleString()} shs DLR
                        </span>
                        <span className="text-[8px] text-[#64748b]">DLR.TO @ ${norbertResult.dlrSharePriceCad}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[8.5px] text-[#8b9bb4]">NET DELIVERED</span>
                        <span className="text-xs font-black text-[#00e676] mt-0.5">
                          ${norbertResult.netTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {norbertResult.targetCurrency}
                        </span>
                        <span className="text-[8px] text-[#64748b]">Exact spot execution</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[8.5px] text-[#ff334b]">RETAIL BANK COST</span>
                        <span className="text-xs font-black text-[#ff334b] mt-0.5">
                          -${norbertResult.retailBankSpreadCost.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-[#64748b]">2.0% bank FX spread</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[8.5px] text-[#00d2ff]">NET MONEY SAVED</span>
                        <span className="text-xs font-black text-[#00d2ff] mt-0.5">
                          +${norbertResult.netSavingsCad.toFixed(2)} CAD
                        </span>
                        <span className="text-[8px] text-emerald-400 font-bold">100% saved for margin!</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#64748b] border-t border-[#182234] pt-1">
                      <span>Method: Buy DLR.TO on TSX ➔ Journal shares to DLR.U.TO ➔ Sell for USD</span>
                      <span className="text-white font-mono">Commission: ${norbertResult.norbertsGambitBrokerFee.toFixed(2)} flat</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW SUB-TAB: CONSOLIDATED (DUAL-CURRENCY TOTALS)
          ========================================================================= */}
          {canadianSubTab === 'consolidated' && (
            <div className="flex flex-col gap-3">
              <div className="bg-[#0b101c] border border-[#1b263b] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[#00d2ff]">
                    <ArrowLeftRight className="w-5 h-5 text-[#00d2ff]" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-white">
                      🇨🇦 {targetCadAccount.name} · CONSOLIDATED MULTI-CURRENCY BLOTTER
                    </span>
                    <p className="text-[10px] text-[#8b9bb4]">
                      Aggregated portfolio margin combining CAD cash reserves and USD trading commitments
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* CAD Sub-Account Summary */}
                <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-[#182234] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>🇨🇦 CANADIAN DOLLAR (CAD) LEDGER</span>
                    </span>
                    <span className="text-xs font-bold text-[#00d2ff]">
                      ${(targetCadAccount.cashBalanceCad !== undefined ? targetCadAccount.cashBalanceCad : targetCadAccount.cashBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} CAD
                    </span>
                  </div>
                  <div className="text-xs flex flex-col gap-1 text-[#8b9bb4]">
                    <div className="flex justify-between">
                      <span>CAD Cash Balance:</span>
                      <span className="font-mono text-white">${(targetCadAccount.cashBalanceCad !== undefined ? targetCadAccount.cashBalanceCad : targetCadAccount.cashBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CAD Total Net Liquidity:</span>
                      <span className="font-mono text-white">${currentCadHealth.netLiquidityCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CIRO Maintenance Requirement:</span>
                      <span className="font-mono text-amber-300">${currentCadHealth.maintenanceReqNative.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CIPF Insurance Ceiling:</span>
                      <span className="font-mono text-emerald-400">$1,000,000.00 CAD</span>
                    </div>
                  </div>
                </div>

                {/* USD Sub-Account Summary */}
                <div className="bg-[#0c121e] border border-[#1d273a] rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-[#182234] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>🇺🇸 US DOLLAR (USD) LEDGER</span>
                    </span>
                    <span className={`text-xs font-bold font-mono ${
                      currentCadHealth.usdHealth.isUsdDeficit ? 'text-[#ff334b]' : 'text-[#00e676]'
                    }`}>
                      ${currentCadHealth.usdHealth.cashBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="text-xs flex flex-col gap-1 text-[#8b9bb4]">
                    <div className="flex justify-between">
                      <span>USD Cash Balance:</span>
                      <span className={`font-mono font-bold ${
                        currentCadHealth.usdHealth.isUsdDeficit ? 'text-[#ff334b]' : 'text-white'
                      }`}>
                        ${currentCadHealth.usdHealth.cashBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Carry Expense:</span>
                      <span className={`font-mono ${currentCadHealth.usdHealth.isUsdDeficit ? 'text-[#ffd600]' : 'text-slate-400'}`}>
                        {currentCadHealth.usdHealth.isUsdDeficit ? `-$${currentCadHealth.usdHealth.dailyUsdCarryCost.toFixed(2)}/day` : '$0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>US Holdings Value:</span>
                      <span className="font-mono text-white">${currentCadHealth.usdHealth.usPositionsMarkUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CIRO 3% FX Haircut:</span>
                      <span className="font-mono text-[#38bdf8]">${currentCadHealth.usdHealth.ciroFxHaircutUsd.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Audit Trail & Notes */}
          <div className="bg-[#0b101c] border border-[#1b263b] rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] border-b border-[#182234] pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#00e676]" />
                <span>REGULATORY COMPLIANCE AUDIT DISCLOSURES &amp; TELEMETRY TRAIL</span>
              </span>
              <span className="text-[9px] text-[#00e676] font-bold">
                CRA Part XI.01 &amp; CIRO Rule 5300 Compliant
              </span>
            </div>

            <div className="flex flex-col gap-1 text-[10px]">
              {currentCadHealth.complianceNotes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                  <span className="text-[#00d2ff] mt-0.5 font-bold">›</span>
                  <span>{note}</span>
                </div>
              ))}
              <div className="flex items-start gap-1.5 text-slate-400">
                <span className="text-[#38bdf8] mt-0.5 font-bold">›</span>
                <span>
                  <strong>USD Sub-Account Carry Notice:</strong> Canadian accounts with debit balances in USD sub-accounts accrue margin interest at Big-5 bank prime rates (approx 8.75% APR) until settled with Norbert&apos;s Gambit or spot journaling.
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-400">
                <span className="text-[#38bdf8] mt-0.5 font-bold">›</span>
                <span>
                  <strong>CIPF Insolvency Coverage:</strong> Accounts held at IIROC/CIRO clearing brokers (Interactive Brokers Canada, Questrade, TD Direct) are protected up to $1,000,000 CAD per separate capacity against dealer insolvency.
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-400">
                <span className="text-[#38bdf8] mt-0.5 font-bold">›</span>
                <span>
                  <strong>Foreign Property T1135 Reporting:</strong> Non-registered holdings with specified foreign property cost basis exceeding $100,000 CAD at any time during the year require annual CRA Form T1135 disclosure.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
