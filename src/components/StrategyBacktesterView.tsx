import React, { useState, useMemo } from 'react';
import { Ticker, Candle } from '../types/options';
import {
  ALL_OPTIONS_STRATEGIES,
  StrategyDefinition,
} from '../services/optionsStrategies';
import {
  runOptionsBacktest,
  BacktestResult,
  BacktestConfig,
} from '../services/optionsBacktester';
import { playKeyClick } from '../utils/terminalSound';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sliders,
  RotateCcw,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';

interface StrategyBacktesterViewProps {
  initialStrategyId?: string;
  activeTicker: Ticker;
  allTickers?: Record<string, Ticker>;
  onSelectStrategyForBuilder: (strategyId: string) => void;
  onSelectStrategyForRisk: (strategyId: string) => void;
  onSelectStrategyForOVME: (strategyId: string) => void;
}

export const StrategyBacktesterView: React.FC<StrategyBacktesterViewProps> = ({
  initialStrategyId = 'long-call',
  activeTicker,
  allTickers = {},
  onSelectStrategyForBuilder,
  onSelectStrategyForRisk,
  onSelectStrategyForOVME,
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(initialStrategyId);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(activeTicker.symbol);
  const [entryDte, setEntryDte] = useState<number>(35);
  const [exitRule, setExitRule] = useState<BacktestConfig['exitRule']>('hold_to_end');
  const [contracts, setContracts] = useState<number>(1);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'blotter' | 'legs'>('chart');

  // Resolve active ticker
  const targetTicker = useMemo(() => {
    return allTickers[selectedSymbol] || activeTicker;
  }, [allTickers, selectedSymbol, activeTicker]);

  // Resolve active strategy definition
  const targetStrategy = useMemo(() => {
    return (
      ALL_OPTIONS_STRATEGIES.find((st) => st.id === selectedStrategyId) ||
      ALL_OPTIONS_STRATEGIES[0]
    );
  }, [selectedStrategyId]);

  // Run 30-day backtest simulation
  const backtestResult = useMemo<BacktestResult | null>(() => {
    try {
      return runOptionsBacktest(targetStrategy, targetTicker, targetTicker.candles, {
        entryDte,
        exitRule,
        contracts,
      });
    } catch (err) {
      console.error('Failed to run options backtest:', err);
      return null;
    }
  }, [targetStrategy, targetTicker, entryDte, exitRule, contracts]);

  if (!backtestResult) {
    return (
      <div className="p-8 text-center text-[#8b9bb4]">
        <div className="text-white font-bold mb-2">Backtest could not be computed</div>
        <p className="text-xs">Ensure historical candle data is loaded for {targetTicker.symbol}.</p>
      </div>
    );
  }

  const {
    strategy,
    startDate,
    endDate,
    totalDays,
    startUnderlyingPrice,
    endUnderlyingPrice,
    underlyingReturnPct,
    initialNetDebitCredit,
    capitalAtRisk,
    finalStrategyMark,
    totalPnL,
    totalReturnPct,
    peakPnL,
    peakPnLDate,
    maxDrawdown,
    maxDrawdownPct,
    winRate,
    profitFactor,
    sharpeRatio,
    isWinner,
    earlyExitDay,
    exitReason,
    legs,
    dailySnapshots,
  } = backtestResult;

  const isUnderlyingUp = underlyingReturnPct >= 0;
  const isStrategyProfitable = totalPnL >= 0;

  // Chart Dimensions & Coordinate Mappings
  const chartWidth = 780;
  const chartHeight = 220;
  const padding = { top: 20, right: 30, bottom: 25, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // PnL Min / Max
  const pnlValues = dailySnapshots.map((s) => s.cumulativePnL);
  const minPnL = Math.min(0, ...pnlValues) * 1.15;
  const maxPnL = Math.max(10, ...pnlValues) * 1.15;
  const pnlSpan = Math.max(1, maxPnL - minPnL);

  const getY = (val: number) => {
    return padding.top + innerHeight - ((val - minPnL) / pnlSpan) * innerHeight;
  };

  const getX = (idx: number) => {
    if (totalDays <= 1) return padding.left;
    return padding.left + (idx / (totalDays - 1)) * innerWidth;
  };

  const zeroY = getY(0);

  // SVG Area & Line Path
  const pnlPoints = dailySnapshots.map((s, i) => `${getX(i)},${getY(s.cumulativePnL)}`);
  const pnlLinePath = `M ${pnlPoints.join(' L ')}`;
  const pnlAreaPath = `M ${getX(0)},${zeroY} L ${pnlPoints.join(' L ')} L ${getX(totalDays - 1)},${zeroY} Z`;

  // Hovered snapshot
  const activeSnapshot = hoveredDayIdx !== null ? dailySnapshots[hoveredDayIdx] : dailySnapshots[totalDays - 1];

  return (
    <div className="flex flex-col h-full bg-[#070b14] text-white font-mono select-none overflow-y-auto">
      {/* Top Controls Ribbon */}
      <div className="bg-[#0b101d] border-b border-[#1e2638] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Symbol Selector */}
          <div className="flex items-center gap-1.5 bg-[#050811] px-2.5 py-1 rounded border border-[#1e293b]">
            <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider font-bold">SYMBOL:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => {
                playKeyClick();
                setSelectedSymbol(e.target.value);
              }}
              className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer"
            >
              {Object.keys(allTickers).length > 0 ? (
                Object.keys(allTickers).map((sym) => (
                  <option key={sym} value={sym} className="bg-[#0b101d] text-white">
                    {sym} · {allTickers[sym].name} (${allTickers[sym].price.toFixed(2)})
                  </option>
                ))
              ) : (
                <option value={activeTicker.symbol} className="bg-[#0b101d] text-white">
                  {activeTicker.symbol} (${activeTicker.price.toFixed(2)})
                </option>
              )}
            </select>
          </div>

          {/* Strategy Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#050811] px-2.5 py-1 rounded border border-[#1e293b]">
            <span className="text-[10px] text-[#ff9900] uppercase tracking-wider font-bold">STRATEGY:</span>
            <select
              value={selectedStrategyId}
              onChange={(e) => {
                playKeyClick();
                setSelectedStrategyId(e.target.value);
              }}
              className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer max-w-[210px] sm:max-w-[280px]"
            >
              {ALL_OPTIONS_STRATEGIES.map((st) => (
                <option key={st.id} value={st.id} className="bg-[#0b101d] text-white">
                  {st.name} ({st.category} · {st.bias})
                </option>
              ))}
            </select>
          </div>

          {/* DTE Configuration */}
          <div className="flex items-center gap-1 bg-[#050811] px-2 py-1 rounded border border-[#1e293b] text-xs">
            <span className="text-[10px] text-[#8b9bb4] mr-1">DTE:</span>
            {[30, 45, 60].map((d) => (
              <button
                key={d}
                onClick={() => {
                  playKeyClick();
                  setEntryDte(d);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  entryDte === d
                    ? 'bg-[#00d2ff] text-black font-extrabold'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Exit Rule Selector */}
          <div className="flex items-center gap-1.5 bg-[#050811] px-2.5 py-1 rounded border border-[#1e293b]">
            <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">EXIT:</span>
            <select
              value={exitRule}
              onChange={(e) => {
                playKeyClick();
                setExitRule(e.target.value as BacktestConfig['exitRule']);
              }}
              className="bg-transparent text-white font-bold text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="hold_to_end" className="bg-[#0b101d] text-white">Hold 30 Days (Expiry)</option>
              <option value="take_profit_50" className="bg-[#0b101d] text-white">Take Profit at +50%</option>
              <option value="take_profit_25" className="bg-[#0b101d] text-white">Take Profit at +25%</option>
              <option value="stop_loss_50" className="bg-[#0b101d] text-white">Stop Loss at -50%</option>
              <option value="stop_loss_100" className="bg-[#0b101d] text-white">Stop Loss at -100%</option>
            </select>
          </div>

          {/* Contracts Count */}
          <div className="flex items-center gap-1 bg-[#050811] px-2 py-1 rounded border border-[#1e293b] text-xs">
            <span className="text-[10px] text-[#8b9bb4] mr-1">QTY:</span>
            {[1, 5, 10].map((qty) => (
              <button
                key={qty}
                onClick={() => {
                  playKeyClick();
                  setContracts(qty);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  contracts === qty
                    ? 'bg-[#ff9900] text-black font-extrabold'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {qty}x
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Load in Builder */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playKeyClick();
              onSelectStrategyForBuilder(strategy.id);
            }}
            className="flex items-center gap-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold px-3 py-1.5 rounded text-xs transition-colors shadow-sm cursor-pointer"
            title="Load this strategy configuration directly into the live Order Builder"
          >
            <span>LOAD IN BUILDER</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0 bg-[#060912]">
        {/* Card 1: Total Strategy PnL */}
        <div
          className={`p-3 rounded-lg border ${
            isStrategyProfitable
              ? 'bg-[#00e676]/10 border-[#00e676]/40 shadow-[0_0_12px_rgba(0,230,118,0.15)]'
              : 'bg-[#ff334b]/10 border-[#ff334b]/40 shadow-[0_0_12px_rgba(255,51,75,0.15)]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] font-bold uppercase mb-1">
            <span>STRATEGY P&amp;L (30D)</span>
            {isStrategyProfitable ? (
              <span className="text-[#00e676] bg-[#00e676]/20 px-1 py-0.2 rounded font-black text-[9px]">WIN</span>
            ) : (
              <span className="text-[#ff334b] bg-[#ff334b]/20 px-1 py-0.2 rounded font-black text-[9px]">LOSS</span>
            )}
          </div>
          <div
            className={`text-lg font-black tracking-tight ${
              isStrategyProfitable ? 'text-[#00e676]' : 'text-[#ff334b]'
            }`}
          >
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-bold text-[#8b9bb4] mt-0.5">
            Return:{' '}
            <span className={isStrategyProfitable ? 'text-[#00e676]' : 'text-[#ff334b]'}>
              {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 2: Underlying 30D Move */}
        <div className="p-3 bg-[#0b1120] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-[#8b9bb4] font-bold uppercase mb-1">
            {targetTicker.symbol} 30D PRICE MOVE
          </div>
          <div
            className={`text-lg font-black tracking-tight flex items-center gap-1 ${
              isUnderlyingUp ? 'text-[#00e676]' : 'text-[#ff334b]'
            }`}
          >
            {isUnderlyingUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isUnderlyingUp ? '+' : ''}{underlyingReturnPct.toFixed(2)}%</span>
          </div>
          <div className="text-[10px] text-[#8b9bb4] mt-0.5 truncate">
            ${startUnderlyingPrice.toFixed(2)} &rarr; ${endUnderlyingPrice.toFixed(2)}
          </div>
        </div>

        {/* Card 3: Peak High-Water Profit */}
        <div className="p-3 bg-[#0b1120] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-[#8b9bb4] font-bold uppercase mb-1">
            PEAK PROFIT REACHED
          </div>
          <div className="text-lg font-black text-[#00d2ff] tracking-tight">
            +${peakPnL > 0 ? peakPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-[#8b9bb4] mt-0.5">
            Peak on: <span className="text-white font-bold">{peakPnLDate}</span>
          </div>
        </div>

        {/* Card 4: Max Drawdown */}
        <div className="p-3 bg-[#0b1120] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-[#8b9bb4] font-bold uppercase mb-1">
            MAX DRAWDOWN
          </div>
          <div className="text-lg font-black text-[#ffd600] tracking-tight">
            -${maxDrawdown.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#8b9bb4] mt-0.5">
            Trough: <span className="text-[#ffd600]">-{maxDrawdownPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Card 5: Win Rate & Efficiency */}
        <div className="p-3 bg-[#0b1120] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-[#8b9bb4] font-bold uppercase mb-1">
            DAILY WIN RATE
          </div>
          <div className="text-lg font-black text-white tracking-tight">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#8b9bb4] mt-0.5">
            Profit Factor: <span className="text-[#00e676] font-bold">{profitFactor.toFixed(2)}x</span>
          </div>
        </div>

        {/* Card 6: Capital & Sharpe */}
        <div className="p-3 bg-[#0b1120] border border-[#1e293b] rounded-lg">
          <div className="text-[10px] text-[#8b9bb4] font-bold uppercase mb-1">
            CAPITAL AT RISK
          </div>
          <div className="text-lg font-black text-white tracking-tight">
            ${capitalAtRisk.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-[#8b9bb4] mt-0.5">
            Sharpe Ratio: <span className="text-[#00d2ff] font-bold">{sharpeRatio.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Early Exit Alert Banner (if triggered) */}
      {earlyExitDay !== null && exitReason && (
        <div className="mx-4 mb-2 bg-[#ff9900]/15 border border-[#ff9900]/40 rounded px-3 py-2 flex items-center justify-between text-xs text-[#ff9900]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff9900] shrink-0" />
            <span>
              <strong>Rule Triggered:</strong> {exitReason} on Day {earlyExitDay} ({dailySnapshots[earlyExitDay - 1]?.date}). Position closed early to preserve gains/mitigate loss.
            </span>
          </div>
          <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-[#ff9900]/30 text-[10px]">
            Final P&amp;L: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalReturnPct.toFixed(1)}%)
          </span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="px-4 border-b border-[#1e2638] bg-[#090d18] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 py-1">
          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('chart');
            }}
            className={`px-3 py-1 text-xs font-bold rounded-t transition-colors border-b-2 ${
              activeSubTab === 'chart'
                ? 'text-[#00d2ff] border-[#00d2ff] bg-[#00d2ff]/10'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            30-DAY PERFORMANCE CURVE
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('blotter');
            }}
            className={`px-3 py-1 text-xs font-bold rounded-t transition-colors border-b-2 ${
              activeSubTab === 'blotter'
                ? 'text-[#00d2ff] border-[#00d2ff] bg-[#00d2ff]/10'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            DAILY MARK-TO-MARKET BLOTTER ({totalDays} DAYS)
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('legs');
            }}
            className={`px-3 py-1 text-xs font-bold rounded-t transition-colors border-b-2 ${
              activeSubTab === 'legs'
                ? 'text-[#00d2ff] border-[#00d2ff] bg-[#00d2ff]/10'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            TRADE LEGS &amp; GREEKS ({legs.length} LEGS)
          </button>
        </div>

        {/* Live Hover Telemetry Strip */}
        <div className="text-[11px] text-[#8b9bb4] hidden md:flex items-center gap-3">
          <span>Date: <strong className="text-white">{activeSnapshot.date}</strong></span>
          <span>Price: <strong className="text-white">${activeSnapshot.underlyingPrice.toFixed(2)}</strong></span>
          <span>P&amp;L: <strong className={activeSnapshot.cumulativePnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
            {activeSnapshot.cumulativePnL >= 0 ? '+' : ''}${activeSnapshot.cumulativePnL.toFixed(2)}
          </strong></span>
          <span>Delta: <strong className="text-[#00d2ff]">{activeSnapshot.delta.toFixed(2)}</strong></span>
          <span>Theta: <strong className="text-[#ffd600]">{activeSnapshot.theta.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* Sub-Tab Content Panes */}
      <div className="flex-1 p-4 bg-[#050811] overflow-y-auto">
        {activeSubTab === 'chart' && (
          <div className="space-y-4">
            {/* Interactive SVG Chart Container */}
            <div className="bg-[#0a0f1d] border border-[#1e293b] rounded-lg p-3 relative shadow-inner">
              <div className="flex items-center justify-between text-xs mb-2 text-[#8b9bb4]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase">{strategy.name} CUMULATIVE P&amp;L ($)</span>
                  <span className="text-[10px] text-[#00d2ff] bg-[#00d2ff]/15 px-1.5 py-0.2 rounded border border-[#00d2ff]/30">
                    BLACK-SCHOLES 30-DAY TIMELINE
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00e676]" /> P&amp;L Line
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-[#64748b] border-dashed" /> Break-Even ($0)
                  </span>
                </div>
              </div>

              {/* Chart SVG */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto min-w-[620px] select-none"
                  onMouseLeave={() => setHoveredDayIdx(null)}
                >
                  <defs>
                    <linearGradient id="pnlGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e676" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="pnlRedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff334b" stopOpacity="0.0" />
                      <stop offset="100%" stopColor="#ff334b" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = padding.top + innerHeight * pct;
                    const val = maxPnL - pct * (maxPnL - minPnL);
                    return (
                      <g key={pct}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#1a2336"
                          strokeDasharray="3,3"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          ${val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Zero / Breakeven Baseline */}
                  <line
                    x1={padding.left}
                    y1={zeroY}
                    x2={chartWidth - padding.right}
                    y2={zeroY}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={chartWidth - padding.right + 4}
                    y={zeroY + 3}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    $0
                  </text>

                  {/* Shaded Area */}
                  <path
                    d={pnlAreaPath}
                    fill={isStrategyProfitable ? 'url(#pnlGreenGrad)' : 'url(#pnlRedGrad)'}
                  />

                  {/* PnL Curve */}
                  <path
                    d={pnlLinePath}
                    fill="none"
                    stroke={isStrategyProfitable ? '#00e676' : '#ff334b'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Point Dots & Hover Detectors */}
                  {dailySnapshots.map((s, idx) => {
                    const cx = getX(idx);
                    const cy = getY(s.cumulativePnL);
                    const isHovered = hoveredDayIdx === idx;
                    const isPeak = s.cumulativePnL === peakPnL;

                    return (
                      <g key={idx}>
                        {/* Peak Crown / Ring */}
                        {isPeak && peakPnL > 0 && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="6"
                            fill="none"
                            stroke="#00d2ff"
                            strokeWidth="1.5"
                            className="animate-pulse"
                          />
                        )}

                        {/* Interactive Dot */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 5 : isPeak ? 4 : 2.5}
                          fill={s.cumulativePnL >= 0 ? '#00e676' : '#ff334b'}
                          stroke="#0a0f1d"
                          strokeWidth="1.5"
                          className="transition-all"
                        />

                        {/* Transparent hit area for easy scrubbing */}
                        <rect
                          x={cx - (innerWidth / totalDays) / 2}
                          y={padding.top}
                          width={innerWidth / totalDays}
                          height={innerHeight}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredDayIdx(idx)}
                        />
                      </g>
                    );
                  })}

                  {/* Active Vertical Crosshair */}
                  {hoveredDayIdx !== null && (
                    <g>
                      <line
                        x1={getX(hoveredDayIdx)}
                        y1={padding.top}
                        x2={getX(hoveredDayIdx)}
                        y2={padding.top + innerHeight}
                        stroke="#00d2ff"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    </g>
                  )}

                  {/* X Axis Labels */}
                  {dailySnapshots
                    .filter((_, idx) => idx === 0 || idx === Math.floor(totalDays / 2) || idx === totalDays - 1)
                    .map((s) => {
                      const idx = s.dayIndex;
                      return (
                        <text
                          key={idx}
                          x={getX(idx)}
                          y={chartHeight - 6}
                          fill="#8b9bb4"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor={idx === 0 ? 'start' : idx === totalDays - 1 ? 'end' : 'middle'}
                        >
                          {s.date} (D{idx + 1})
                        </text>
                      );
                    })}
                </svg>
              </div>
            </div>

            {/* Strategy Architecture & Thesis Brief */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#0b101e] border border-[#1e293b] rounded p-3 text-xs">
                <span className="text-[10px] text-[#ff9900] font-bold uppercase block mb-1">
                  STRATEGY CLASSIFICATION
                </span>
                <div className="font-bold text-white text-sm mb-1">{strategy.name}</div>
                <p className="text-[11px] text-[#8b9bb4] leading-relaxed">
                  {strategy.description}
                </p>
              </div>

              <div className="bg-[#0b101e] border border-[#1e293b] rounded p-3 text-xs">
                <span className="text-[10px] text-[#00d2ff] font-bold uppercase block mb-1">
                  QUANTITATIVE CHARACTERISTICS
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Category:</span>
                    <strong className="text-white">{strategy.category}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Market Bias:</span>
                    <strong className={strategy.bias === 'Bullish' ? 'text-[#00e676]' : strategy.bias === 'Bearish' ? 'text-[#ff334b]' : 'text-[#ff9900]'}>
                      {strategy.bias}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Risk Type:</span>
                    <strong className="text-white">{strategy.riskType}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Ideal IV Regime:</span>
                    <strong className="text-[#00d2ff]">{strategy.idealIV}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b101e] border border-[#1e293b] rounded p-3 text-xs">
                <span className="text-[10px] text-[#00e676] font-bold uppercase block mb-1">
                  TEST RESULTS VS BENCHMARK
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Stock 30D Return:</span>
                    <strong className={isUnderlyingUp ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                      {isUnderlyingUp ? '+' : ''}{underlyingReturnPct.toFixed(2)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Strategy 30D Return:</span>
                    <strong className={isStrategyProfitable ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                      {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Outperformance / Alpha:</span>
                    <strong className={totalReturnPct >= underlyingReturnPct ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                      {(totalReturnPct - underlyingReturnPct) >= 0 ? '+' : ''}
                      {(totalReturnPct - underlyingReturnPct).toFixed(2)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Initial Capital:</span>
                    <strong className="text-white">${capitalAtRisk.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab: Mark-to-Market Daily Blotter */}
        {activeSubTab === 'blotter' && (
          <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg overflow-hidden">
            <div className="p-2.5 bg-[#0e1424] border-b border-[#1e293b] flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase">
                30-DAY DAILY MARK-TO-MARKET LOG ({startDate} &rarr; {endDate})
              </span>
              <span className="text-[10px] text-[#8b9bb4]">All prices evaluated via Black-Scholes</span>
            </div>

            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#070b15] text-[#8b9bb4] sticky top-0 border-b border-[#1e2638] text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2 px-3">DAY</th>
                    <th className="py-2 px-3">DATE</th>
                    <th className="py-2 px-3">{targetTicker.symbol} CLOSE</th>
                    <th className="py-2 px-3">STOCK CHG</th>
                    <th className="py-2 px-3">DTE</th>
                    <th className="py-2 px-3">MODEL IV</th>
                    <th className="py-2 px-3">STRATEGY VAL</th>
                    <th className="py-2 px-3">DAY P&amp;L</th>
                    <th className="py-2 px-3">CUMULATIVE P&amp;L</th>
                    <th className="py-2 px-3">RETURN</th>
                    <th className="py-2 px-3">DELTA</th>
                    <th className="py-2 px-3">THETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2638]/40 font-mono text-[11px]">
                  {dailySnapshots.map((snap) => {
                    const isDayUp = snap.dailyPnL >= 0;
                    const isCumUp = snap.cumulativePnL >= 0;
                    return (
                      <tr
                        key={snap.dayIndex}
                        className={`hover:bg-[#141c2e] transition-colors ${
                          snap.isExitDay ? 'bg-[#ff9900]/10' : ''
                        }`}
                      >
                        <td className="py-1.5 px-3 font-bold text-[#8b9bb4]">
                          D{snap.dayIndex + 1}
                        </td>
                        <td className="py-1.5 px-3 text-white font-medium">{snap.date}</td>
                        <td className="py-1.5 px-3 font-bold text-white">
                          ${snap.underlyingPrice.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-3 ${snap.underlyingChangePct >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {snap.underlyingChangePct >= 0 ? '+' : ''}{snap.underlyingChangePct.toFixed(2)}%
                        </td>
                        <td className="py-1.5 px-3 text-[#cbd5e1]">{snap.remainingDte}d</td>
                        <td className="py-1.5 px-3 text-[#00d2ff]">{snap.modelIV}%</td>
                        <td className="py-1.5 px-3 font-bold text-white">
                          ${snap.strategyMark.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-3 font-semibold ${isDayUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {snap.dailyPnL >= 0 ? '+' : ''}${snap.dailyPnL.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-3 font-bold ${isCumUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {snap.cumulativePnL >= 0 ? '+' : ''}${snap.cumulativePnL.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-3 font-bold ${isCumUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {snap.returnPct >= 0 ? '+' : ''}{snap.returnPct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-3 text-[#38bdf8]">{snap.delta.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-[#ffd600]">{snap.theta.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-Tab: Legs & Greeks */}
        {activeSubTab === 'legs' && (
          <div className="space-y-4">
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg overflow-hidden">
              <div className="p-2.5 bg-[#0e1424] border-b border-[#1e293b] flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase">
                  SIMULATED TRADE LEGS EXECUTION STRUCTURE
                </span>
                <span className="text-[10px] text-[#8b9bb4]">
                  Qty: {contracts} contracts · Multiplier: {backtestResult.multiplier}x
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#070b15] text-[#8b9bb4] border-b border-[#1e2638] text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2 px-3">ACTION</th>
                    <th className="py-2 px-3">RATIO</th>
                    <th className="py-2 px-3">INSTRUMENT</th>
                    <th className="py-2 px-3">STRIKE</th>
                    <th className="py-2 px-3">ENTRY PRICE (D0)</th>
                    <th className="py-2 px-3">EXIT PRICE (D30)</th>
                    <th className="py-2 px-3">NET LEG P&amp;L</th>
                    <th className="py-2 px-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2638]/40 font-mono text-[11px]">
                  {legs.map((leg) => {
                    const isLegUp = leg.legPnL >= 0;
                    return (
                      <tr key={leg.id} className="hover:bg-[#141c2e]">
                        <td className="py-2 px-3 font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              leg.action === 'BUY'
                                ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/30'
                                : 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/30'
                            }`}
                          >
                            {leg.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-white">{leg.ratio}x</td>
                        <td className="py-2 px-3 text-[#cbd5e1] uppercase font-bold">
                          {leg.type}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#00d2ff]">
                          {leg.type === 'stock' ? 'SHARES' : `$${leg.strike.toFixed(2)}`}
                        </td>
                        <td className="py-2 px-3 text-white font-medium">
                          ${leg.entryPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-white font-medium">
                          ${leg.finalPrice.toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 font-bold ${isLegUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {leg.legPnL >= 0 ? '+' : ''}${leg.legPnL.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          {isLegUp ? (
                            <span className="text-[#00e676] text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> PROFITABLE
                            </span>
                          ) : (
                            <span className="text-[#ff334b] text-[10px] font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> LOSS
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-3 bg-[#0b101e] p-3 rounded-lg border border-[#1e293b]">
              <span className="text-xs text-[#8b9bb4]">Analyze this setup further in terminal screens:</span>
              <button
                onClick={() => {
                  playKeyClick();
                  onSelectStrategyForRisk(strategy.id);
                }}
                className="px-3 py-1 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/40 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                PLOT RISK CURVE (F4)
              </button>
              <button
                onClick={() => {
                  playKeyClick();
                  onSelectStrategyForOVME(strategy.id);
                }}
                className="px-3 py-1 bg-[#1e293b] hover:bg-[#334155] text-white rounded text-xs font-bold transition-colors cursor-pointer"
              >
                INSPECT OVME VALUATION (F3)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
