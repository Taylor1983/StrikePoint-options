import React, { useState, useMemo } from 'react';
import { Ticker } from '../types/options';
import {
  QUAD_WITCHING_DATES,
  THE_FOUR_WITCHES,
  WITCHING_INTRADAY_SCHEDULE,
  WITCHING_PLAYBOOK_STRATEGIES,
  getSymbolWitchingProfile,
  getNextQuadWitchingDate,
  QuadWitchingDate,
} from '../services/quadrupleWitchingData';
import {
  Calendar,
  Zap,
  Activity,
  Layers,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Maximize2,
  Sliders,
  CheckCircle2,
  BarChart3,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';

interface QuadrupleWitchingViewProps {
  currentTicker: Ticker;
  allTickers: Record<string, Ticker>;
  onSelectTicker: (symbol: string) => void;
  onNavigateToChain: (dte?: number) => void;
  onNavigateToRisk?: () => void;
  onNavigateToStrategyCatalog?: () => void;
  onPopOut?: () => void;
}

export const QuadrupleWitchingView: React.FC<QuadrupleWitchingViewProps> = ({
  currentTicker,
  allTickers,
  onSelectTicker,
  onNavigateToChain,
  onNavigateToRisk,
  onNavigateToStrategyCatalog,
  onPopOut,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pin-risk' | 'schedule' | 'playbook'>('overview');
  const [hoveredStrike, setHoveredStrike] = useState<number | null>(null);

  const nextWitch = useMemo(() => getNextQuadWitchingDate(), []);
  const profile = useMemo(() => getSymbolWitchingProfile(currentTicker), [currentTicker]);

  // Max OI for chart scaling
  const maxOI = useMemo(() => {
    return Math.max(...profile.strikeBreakdown.map((s) => Math.max(s.callOI, s.putOI)), 1);
  }, [profile]);

  return (
    <div className="flex-1 flex flex-col gap-4 font-mono text-xs select-none w-full max-w-full ml-0 mr-auto text-left pb-8">
      {/* 1. TOP WITCHING HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0d111e] via-[#140b24] to-[#0a0d18] border-2 border-[#a855f7]/40 rounded-lg p-4 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative overflow-hidden">
        {/* Glow ambient background accent */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#a855f7]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#ff9900]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#a855f7]/20 border border-[#a855f7]/50 text-[#d8b4fe] font-black text-[11px] tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                <Flame className="w-3.5 h-3.5 text-[#a855f7] animate-pulse" />
                <span>QUADRUPLE WITCHING INTELLIGENCE</span>
              </span>

              <span className="px-2 py-0.5 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 text-[#ffb020] text-[10px] font-bold">
                BLOOMBERG &lt;WITCH&gt; / &lt;QWITCH&gt;
              </span>

              <span className="text-[#8b9bb4] text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#38bdf8]" />
                <span>3rd Friday of Mar / Jun / Sep / Dec</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Next Quadruple Witching:</span>
              <span className="text-[#a855f7] underline decoration-[#a855f7]/60 underline-offset-4">
                {nextWitch.formattedDate}
              </span>
              <span className="text-xs bg-[#a855f7] text-black px-2 py-0.5 rounded font-black tracking-normal">
                {nextWitch.quarter} ({nextWitch.dte} DAYS REMAINING)
              </span>
            </h1>

            <p className="text-[#94a3b8] text-[11px] mt-1 max-w-3xl leading-relaxed">
              Simultaneous quarterly expiration of <strong className="text-white">Stock Index Futures</strong>, <strong className="text-white">Stock Index Options</strong>, <strong className="text-white">Single-Stock Options</strong>, and <strong className="text-white">Single-Stock Futures / ETF Options</strong>. Characterized by severe Gamma pin compression, massive MOC order flow imbalances, and record quarterly liquidity crossing.
            </p>
          </div>

          {/* Quick Metrics Countdown Pod */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="bg-[#090d18] border border-[#222d44] rounded-lg p-2.5 text-center min-w-[110px]">
              <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">Countdown</div>
              <div className="text-lg font-black text-[#a855f7] font-mono">{nextWitch.dte} Days</div>
              <div className="text-[8.5px] text-[#64748b]">T-Minus Trading Days</div>
            </div>

            <div className="bg-[#090d18] border border-[#222d44] rounded-lg p-2.5 text-center min-w-[110px]">
              <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">Est. Notional</div>
              <div className="text-lg font-black text-[#00e676] font-mono">{nextWitch.estimatedNotional}</div>
              <div className="text-[8.5px] text-[#64748b]">Market-Wide OPEX</div>
            </div>

            <div className="bg-[#090d18] border border-[#222d44] rounded-lg p-2.5 text-center min-w-[110px]">
              <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">Expiring Contracts</div>
              <div className="text-lg font-black text-[#ffd600] font-mono">{nextWitch.contractsExpiring}</div>
              <div className="text-[8.5px] text-[#64748b]">Total Open Interest</div>
            </div>

            {onPopOut && (
              <button
                onClick={() => {
                  playKeyClick();
                  onPopOut();
                }}
                className="p-2 rounded bg-[#1e2638] hover:bg-[#2e3b56] text-[#cbd5e1] hover:text-white transition-all self-stretch flex items-center justify-center border border-[#334155]"
                title="Pop out Quadruple Witching Monitor into floating window"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[#1e2638] overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'OVERVIEW & THE 4 WITCHES', icon: Layers },
            { id: 'pin-risk', label: `${currentTicker.symbol} PIN RISK & GAMMA MAGNET`, icon: Zap },
            { id: 'schedule', label: 'INTRADAY WITCHING TIMELINE', icon: Clock },
            { id: 'playbook', label: 'INSTITUTIONAL PLAYBOOK', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playKeyClick();
                  setActiveTab(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 border ${
                  active
                    ? 'bg-[#a855f7] text-black border-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.4)] font-black'
                    : 'bg-[#0a0e1a] text-[#8b9bb4] hover:text-white border-[#1e2638] hover:bg-[#141b2a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToChain(nextWitch.dte);
              }}
              className="px-2.5 py-1 rounded bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold text-[11px] flex items-center gap-1 transition-all shadow-[0_0_8px_rgba(255,153,0,0.3)] active:scale-95"
            >
              <span>TRADE {nextWitch.quarter} IN OMON ({nextWitch.dte}d)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB 1: OVERVIEW & THE FOUR WITCHES BREAKDOWN */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* The Four Witches Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>The Four Asset Classes Expiring Concurrently ("The 4 Witches")</span>
              </h2>
              <span className="text-[10px] text-[#64748b]">Total Combined Expiration Pool: ~$5.42 Trillion</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {THE_FOUR_WITCHES.map((witch, idx) => (
                <div
                  key={witch.id}
                  className="bg-[#090d18] border border-[#1e2638] hover:border-[#a855f7]/50 rounded-lg p-3.5 flex flex-col justify-between transition-all hover:shadow-[0_0_12px_rgba(168,85,247,0.15)] group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-6 h-6 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#c084fc] font-black flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-[9.5px] font-bold text-[#ffd600] px-1.5 py-0.5 rounded bg-[#ffd600]/10 border border-[#ffd600]/30">
                        {witch.estimatedNotionalShare}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-[#c084fc] transition-colors mb-1">
                      {witch.name}
                    </h3>
                    <div className="text-[10px] text-[#38bdf8] mb-2 font-mono">{witch.category}</div>

                    <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
                      {witch.description}
                    </p>

                    <div className="bg-[#050811] rounded p-2 border border-[#141b2a] space-y-1.5 text-[10px] mb-3">
                      <div>
                        <span className="text-[#64748b] uppercase">Settlement: </span>
                        <span className="text-[#cbd5e1] font-semibold">{witch.settlementMethod}</span>
                      </div>
                      <div>
                        <span className="text-[#64748b] uppercase">Core Contracts: </span>
                        <span className="text-[#38bdf8] font-bold">{witch.examples.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#141b2a] text-[10.5px]">
                    <span className="text-[#8b9bb4] font-semibold">Dealer Dynamics: </span>
                    <span className="text-[#94a3b8]">{witch.dealerBehavior}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quadruple Witching Calendar Master Table */}
          <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#ff9900]" />
                <h3 className="font-bold text-white text-sm">2026 – 2027 Quadruple Witching Master Calendar</h3>
              </div>
              <span className="text-[10px] text-[#8b9bb4]">
                Cycle repeats every 3 months on the third Friday of March, June, September, and December
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2638] text-[10px] text-[#8b9bb4] uppercase tracking-wider bg-[#060912]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Quarter</th>
                    <th className="py-2.5 px-3">DTE (Days)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Est. Notional Volume</th>
                    <th className="py-2.5 px-3 text-right">Expiring OI</th>
                    <th className="py-2.5 px-3">Institutional Significance</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b2a]">
                  {QUAD_WITCHING_DATES.map((item) => {
                    const isNext = item.status === 'imminent';
                    return (
                      <tr
                        key={item.date}
                        className={`hover:bg-[#101626] transition-colors ${
                          isNext ? 'bg-[#a855f7]/10 border-l-4 border-l-[#a855f7]' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                          {isNext && <Flame className="w-3.5 h-3.5 text-[#a855f7] animate-pulse" />}
                          <span>{item.formattedDate}</span>
                        </td>
                        <td className="py-3 px-3 text-[#38bdf8] font-bold">{item.quarter}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                              item.dte < 0
                                ? 'bg-gray-800 text-gray-400'
                                : item.dte < 90
                                ? 'bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/40'
                                : 'bg-[#1e2638] text-[#cbd5e1]'
                            }`}
                          >
                            {item.dte < 0 ? 'EXPIRED' : `${item.dte} Days`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[9.5px] uppercase font-black px-1.5 py-0.5 rounded ${
                              item.status === 'imminent'
                                ? 'bg-[#ff9900] text-black shadow-[0_0_6px_rgba(255,153,0,0.5)]'
                                : item.status === 'future'
                                ? 'bg-[#00d2ff]/20 text-[#00d2ff]'
                                : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#00e676]">
                          {item.estimatedNotional}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#ffd600]">
                          {item.contractsExpiring}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[#94a3b8] max-w-xs truncate" title={item.notes}>
                          {item.notes}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.dte > 0 ? (
                            <button
                              onClick={() => {
                                playKeyClick();
                                onNavigateToChain(item.dte);
                              }}
                              className="px-2 py-1 bg-[#1e2638] hover:bg-[#a855f7] hover:text-black text-[#cbd5e1] font-bold rounded text-[10px] transition-all flex items-center gap-1 mx-auto"
                            >
                              <span>Inspect in OMON</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-600 font-mono">Archived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: ACTIVE SYMBOL PIN RISK & GAMMA MAGNET */}
      {activeTab === 'pin-risk' && (
        <div className="space-y-4">
          {/* Symbol Selector Bar */}
          <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#8b9bb4] uppercase">Select Active Underlying:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {Object.keys(allTickers).map((sym) => {
                  const active = sym === currentTicker.symbol;
                  return (
                    <button
                      key={sym}
                      onClick={() => {
                        playKeyClick();
                        onSelectTicker(sym);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                        active
                          ? 'bg-[#a855f7] text-black border-[#a855f7] font-black shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                          : 'bg-[#141b2a] text-[#8b9bb4] hover:text-white border-[#1e2638]'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="text-right">
                <span className="text-[#8b9bb4] text-[10px]">Current Price: </span>
                <span className="text-white font-bold text-sm">${currentTicker.price.toFixed(2)}</span>
              </div>
              <div className="h-6 w-px bg-[#1e2638]" />
              <div className="text-right">
                <span className="text-[#8b9bb4] text-[10px]">Quad Witch Pin Strike: </span>
                <span className="text-[#a855f7] font-black text-sm">${profile.pinStrike.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Key Pinning & Volatility Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-2.5">
              <div className="text-[9px] text-[#8b9bb4] uppercase">Magnet Pin Strike</div>
              <div className="text-base font-black text-[#a855f7] font-mono mt-0.5">
                ${profile.pinStrike.toFixed(2)}
              </div>
              <div className="text-[8.5px] text-[#94a3b8]">Max Net Gamma Strike</div>
            </div>

            <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-2.5">
              <div className="text-[9px] text-[#8b9bb4] uppercase">Pin Probability</div>
              <div className="text-base font-black text-[#00e676] font-mono mt-0.5">
                {profile.pinProbabilityPct}%
              </div>
              <div className="text-[8.5px] text-[#94a3b8]">Within ±0.75% of Strike</div>
            </div>

            <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-2.5">
              <div className="text-[9px] text-[#8b9bb4] uppercase">Call Wall (Resistance)</div>
              <div className="text-base font-black text-[#00d2ff] font-mono mt-0.5">
                ${profile.callWall.toFixed(2)}
              </div>
              <div className="text-[8.5px] text-[#94a3b8]">Upper Dealer Hedge Cap</div>
            </div>

            <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-2.5">
              <div className="text-[9px] text-[#8b9bb4] uppercase">Put Wall (Floor)</div>
              <div className="text-base font-black text-[#ef4444] font-mono mt-0.5">
                ${profile.putWall.toFixed(2)}
              </div>
              <div className="text-[8.5px] text-[#94a3b8]">Major Put Open Interest</div>
            </div>

            <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-2.5">
              <div className="text-[9px] text-[#8b9bb4] uppercase">Zero Gamma Trigger</div>
              <div className="text-base font-black text-[#ffd600] font-mono mt-0.5">
                ${profile.zeroGammaFlip.toFixed(2)}
              </div>
              <div className="text-[8.5px] text-[#94a3b8]">Dealer Volatility Flip</div>
            </div>

            <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-2.5">
              <div className="text-[9px] text-[#8b9bb4] uppercase">Witching Vol Multiplier</div>
              <div className="text-base font-black text-[#f97316] font-mono mt-0.5">
                {profile.expectedVolMultiplier}x
              </div>
              <div className="text-[8.5px] text-[#94a3b8]">Over 30-Day Avg Volume</div>
            </div>
          </div>

          {/* Interactive Strike-by-Strike Open Interest & Gamma Magnet Chart */}
          <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#a855f7]" />
                  <span>{currentTicker.symbol} Quadruple Witching Open Interest &amp; Gamma Distribution</span>
                </h3>
                <p className="text-[10px] text-[#8b9bb4]">
                  Visualizing Call OI (Green) vs Put OI (Red) with Net Gamma Pin Magnet Score. Bars indicate where market makers will aggressively hedge into Friday's close.
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#00e676] rounded-sm" />
                  <span className="text-white">Call Open Interest</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#ef4444] rounded-sm" />
                  <span className="text-white">Put Open Interest</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#a855f7] rounded-sm" />
                  <span className="text-[#a855f7] font-bold">★ Pin Magnet Strike</span>
                </div>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="h-64 w-full relative pt-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 240">
                {/* Horizontal gridlines */}
                {[0, 60, 120, 180].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="1000"
                    y2={y}
                    stroke="#1e2638"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Bars for each strike */}
                {profile.strikeBreakdown.map((item, index) => {
                  const totalBars = profile.strikeBreakdown.length;
                  const stepX = 1000 / totalBars;
                  const barWidth = stepX * 0.38;
                  const xCenter = index * stepX + stepX / 2;

                  const callHeight = (item.callOI / maxOI) * 160;
                  const putHeight = (item.putOI / maxOI) * 160;

                  const isPinStrike = item.strike === profile.pinStrike;
                  const isCurrent = Math.abs(item.strike - currentTicker.price) < 2;

                  return (
                    <g
                      key={item.strike}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredStrike(item.strike)}
                      onMouseLeave={() => setHoveredStrike(null)}
                    >
                      {/* Highlight Background for Pin Strike */}
                      {isPinStrike && (
                        <rect
                          x={xCenter - stepX / 2}
                          y="0"
                          width={stepX}
                          height="200"
                          fill="rgba(168, 85, 247, 0.12)"
                          stroke="rgba(168, 85, 247, 0.4)"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Call Bar (Green) */}
                      <rect
                        x={xCenter - barWidth}
                        y={190 - callHeight}
                        width={barWidth - 1}
                        height={callHeight}
                        fill={isPinStrike ? '#00e676' : '#059669'}
                        rx="2"
                        className="transition-all hover:brightness-125"
                      />

                      {/* Put Bar (Red) */}
                      <rect
                        x={xCenter + 1}
                        y={190 - putHeight}
                        width={barWidth - 1}
                        height={putHeight}
                        fill={isPinStrike ? '#ef4444' : '#dc2626'}
                        rx="2"
                        className="transition-all hover:brightness-125"
                      />

                      {/* Strike Label */}
                      <text
                        x={xCenter}
                        y="215"
                        fill={isPinStrike ? '#a855f7' : isCurrent ? '#ffd600' : '#8b9bb4'}
                        fontSize="10"
                        fontWeight={isPinStrike || isCurrent ? 'bold' : 'normal'}
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        ${item.strike}
                      </text>

                      {/* Pin Star Marker */}
                      {isPinStrike && (
                        <text
                          x={xCenter}
                          y={190 - Math.max(callHeight, putHeight) - 8}
                          fill="#a855f7"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ★ PIN
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Float */}
              {hoveredStrike !== null && (() => {
                const strikeData = profile.strikeBreakdown.find((s) => s.strike === hoveredStrike);
                if (!strikeData) return null;
                return (
                  <div className="absolute top-2 right-4 bg-[#050811] border border-[#a855f7] rounded-lg p-2.5 text-[10px] shadow-xl pointer-events-none z-20">
                    <div className="font-bold text-white text-xs mb-1 flex items-center justify-between gap-3">
                      <span>Strike: ${strikeData.strike}</span>
                      {strikeData.strike === profile.pinStrike && (
                        <span className="text-[#a855f7] bg-[#a855f7]/20 px-1 rounded">PRIMARY PIN MAGNET</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-mono">
                      <div>Call OI: <span className="text-[#00e676] font-bold">{strikeData.callOI.toLocaleString()}</span></div>
                      <div>Put OI: <span className="text-[#ef4444] font-bold">{strikeData.putOI.toLocaleString()}</span></div>
                      <div>Net Gamma: <span className="text-[#38bdf8] font-bold">${strikeData.netGamma}M</span></div>
                      <div>Pin Score: <span className="text-[#ffd600] font-bold">{strikeData.pinMagnetScore}/100</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Insight Footer */}
            <div className="mt-3 pt-3 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#ffd600]" />
                <span className="text-[#cbd5e1]">
                  Current Gamma Regime: <strong className="text-[#a855f7]">{profile.gammaRegime}</strong>. Dealers will supply counter-cyclical liquidity near ${profile.pinStrike}.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToRisk && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      onNavigateToRisk();
                    }}
                    className="px-2.5 py-1 bg-[#1e2638] hover:bg-[#2e3b56] text-white rounded text-[10px] font-bold transition-all"
                  >
                    Open in Net Gamma / GEX Analyzer
                  </button>
                )}
                <button
                  onClick={() => {
                    playKeyClick();
                    onNavigateToChain(nextWitch.dte);
                  }}
                  className="px-2.5 py-1 bg-[#a855f7] hover:bg-[#c084fc] text-black font-extrabold rounded text-[10px] transition-all flex items-center gap-1"
                >
                  <span>Trade {currentTicker.symbol} Pin in OMON</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: INTRADAY WITCHING TIMELINE */}
      {activeTab === 'schedule' && (
        <div className="bg-[#090d18] border border-[#1e2638] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#38bdf8]" />
                <span>Anatomy of Quadruple Witching Friday (Trading Session Timeline)</span>
              </h3>
              <p className="text-[10px] text-[#8b9bb4]">
                Detailed breakdown of order flow shifts, MOC auction mechanics, and settlement milestones from 08:30 ET pre-market to 17:30 ET derivative clearing.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {WITCHING_INTRADAY_SCHEDULE.map((slot, idx) => {
              const isPeak = slot.impactLevel === 'CRITICAL';
              return (
                <div
                  key={slot.time}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isPeak
                      ? 'bg-gradient-to-r from-[#180d2b] to-[#090d18] border-[#a855f7]/60 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      : 'bg-[#060912] border-[#1e2638]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-white bg-[#141b2a] px-2 py-0.5 rounded border border-[#222d44]">
                        {slot.time}
                      </span>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{slot.phase}</h4>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider self-start md:self-auto ${
                        slot.impactLevel === 'CRITICAL'
                          ? 'bg-[#ef4444] text-white animate-pulse'
                          : slot.impactLevel === 'HIGH'
                          ? 'bg-[#f97316] text-black font-extrabold'
                          : 'bg-[#38bdf8]/20 text-[#38bdf8]'
                      }`}
                    >
                      {slot.impactLevel} VOLATILITY IMPACT
                    </span>
                  </div>

                  <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-2.5">
                    {slot.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] bg-[#050811] p-2 rounded border border-[#141b2a]">
                    <div>
                      <span className="text-[#38bdf8] font-bold">Trader Focus: </span>
                      <span className="text-[#cbd5e1]">{slot.traderFocus}</span>
                    </div>
                    <div>
                      <span className="text-[#ffd600] font-bold">Institutional Flow: </span>
                      <span className="text-[#cbd5e1]">{slot.orderFlow}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB 4: INSTITUTIONAL TRADING PLAYBOOK */}
      {activeTab === 'playbook' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00e676]" />
                <span>Institutional Quad Witching Trading Strategies &amp; Execution Blueprints</span>
              </h3>
              <p className="text-[10px] text-[#8b9bb4]">
                Quantitative playbooks designed to exploit dealer delta unwinds, pin risk compression, and MOC imbalance auctions.
              </p>
            </div>

            {onNavigateToStrategyCatalog && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToStrategyCatalog();
                }}
                className="px-3 py-1.5 rounded bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_8px_rgba(255,153,0,0.3)]"
              >
                <span>OPEN STRATEGY CATALOG / 30D BACKTESTER</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {WITCHING_PLAYBOOK_STRATEGIES.map((strat) => (
              <div
                key={strat.id}
                className="bg-[#090d18] border border-[#1e2638] hover:border-[#a855f7]/50 rounded-lg p-4 flex flex-col justify-between transition-all hover:shadow-[0_0_12px_rgba(168,85,247,0.15)] group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded bg-[#a855f7]/20 text-[#d8b4fe] font-bold text-[10px]">
                      {strat.category}
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-[#00e676] font-bold">{strat.winRateEst}</span>
                      <span className="text-[#8b9bb4]">R:R {strat.riskReward}</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-[#c084fc] transition-colors mb-1.5">
                    {strat.title}
                  </h4>

                  <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
                    {strat.thesis}
                  </p>

                  <div className="bg-[#050811] rounded p-2.5 border border-[#141b2a] space-y-1.5 text-[10.5px] mb-3">
                    <div className="text-[#38bdf8] font-bold uppercase text-[9.5px]">Execution Steps:</div>
                    {strat.executionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[#cbd5e1]">
                        <span className="text-[#a855f7] font-bold shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#141b2a] text-[10px] flex items-center justify-between gap-2">
                  <div className="text-[#f87171] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span>{strat.riskWarnings}</span>
                  </div>

                  <button
                    onClick={() => {
                      playKeyClick();
                      onNavigateToChain(nextWitch.dte);
                    }}
                    className="px-2 py-0.5 rounded bg-[#1e2638] hover:bg-[#a855f7] hover:text-black text-[#cbd5e1] font-bold text-[9.5px] shrink-0 transition-all flex items-center gap-1"
                  >
                    <span>Execute</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
