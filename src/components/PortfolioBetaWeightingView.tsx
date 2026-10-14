import React, { useState, useMemo } from 'react';
import { Position, Ticker } from '../types/options';
import {
  calculatePortfolioBetaWeighting,
  BenchmarkSymbol,
  BENCHMARK_DEFINITIONS,
  PortfolioBetaWeightingSummary,
} from '../utils/portfolioBetaWeighting';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  Activity,
  Sliders,
  DollarSign,
  Scale,
  Zap,
  Info,
  Copy,
  Check,
  RefreshCw,
  Layers,
  ArrowRight,
  Target,
  BarChart2,
  PieChart,
} from 'lucide-react';

interface PortfolioBetaWeightingViewProps {
  positions: Position[];
  tickers?: Record<string, Ticker>;
  onSelectTicker?: (symbol: string) => void;
  onOpenTradeModal?: (symbol: string) => void;
}

export const PortfolioBetaWeightingView: React.FC<PortfolioBetaWeightingViewProps> = ({
  positions,
  tickers = {},
  onSelectTicker,
  onOpenTradeModal,
}) => {
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkSymbol>('SPY');
  const [targetBetaDelta, setTargetBetaDelta] = useState<number>(0);
  const [hoveredShockIndex, setHoveredShockIndex] = useState<number | null>(null);
  const [isHedgeSimulated, setIsHedgeSimulated] = useState<boolean>(false);
  const [copiedHedge, setCopiedHedge] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'betaDelta' | 'riskContribution' | 'ticker' | 'notional'>('betaDelta');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Compute beta-weighting analysis
  const summary: PortfolioBetaWeightingSummary = useMemo(() => {
    return calculatePortfolioBetaWeighting(
      positions,
      tickers,
      selectedBenchmark,
      targetBetaDelta
    );
  }, [positions, tickers, selectedBenchmark, targetBetaDelta]);

  // Sorted position list
  const sortedPositions = useMemo(() => {
    const list = [...summary.positions];
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'betaDelta') {
        valA = a.betaWeightedDelta;
        valB = b.betaWeightedDelta;
      } else if (sortField === 'riskContribution') {
        valA = a.riskContributionPct;
        valB = b.riskContributionPct;
      } else if (sortField === 'notional') {
        valA = a.notionalValue;
        valB = b.notionalValue;
      } else {
        return sortAsc ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [summary.positions, sortField, sortAsc]);

  // Simulated metrics if hedge is applied
  const simulatedNetBetaDelta = isHedgeSimulated
    ? targetBetaDelta
    : summary.totalNetBetaWeightedDelta;

  const handleCopyHedge = () => {
    playExecutionChime();
    const hedge = summary.hedgeRecommendation;
    const text = `HEDGE ORDER: ${hedge.stockHedge.action} ${hedge.stockHedge.shares} ${hedge.benchmarkSymbol} @ ~$${summary.benchmarkPrice.toFixed(2)} | OR ${hedge.optionHedge.action} ${hedge.optionHedge.contracts}x ${hedge.benchmarkSymbol} ${hedge.optionHedge.strike} ${hedge.optionHedge.contractType}`;
    navigator.clipboard.writeText(text);
    setCopiedHedge(true);
    setTimeout(() => setCopiedHedge(false), 2500);
  };

  // SVG dimensions for Scenario Shock Curve
  const svgWidth = 840;
  const svgHeight = 240;
  const padding = { top: 25, right: 35, bottom: 40, left: 65 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const pnlValues = summary.shockCurve.map((p) => p.estimatedPnLDollar);
  const minPnL = Math.min(...pnlValues, -500);
  const maxPnL = Math.max(...pnlValues, 500);
  const pnlRange = maxPnL - minPnL || 1;

  const minPct = -15;
  const maxPct = 15;
  const pctRange = maxPct - minPct;

  const scaleX = (pct: number) => padding.left + ((pct - minPct) / pctRange) * chartW;
  const scaleY = (pnl: number) => padding.top + chartH - ((pnl - minPnL) / pnlRange) * chartH;

  const zeroY = scaleY(0);
  const zeroX = scaleX(0);

  const curvePoints = summary.shockCurve
    .map((pt) => `${scaleX(pt.shockPct)},${scaleY(pt.estimatedPnLDollar)}`)
    .join(' ');

  return (
    <div className="flex flex-col gap-4 font-mono text-[#e2e8f0]">
      
      {/* 1. TOP BENCHMARK CONTROLS & EXECUTIVE HEADER */}
      <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm uppercase tracking-wider">
                PORTFOLIO BETA WEIGHTING
              </span>
              <span className="text-[10px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-2 py-0.5 rounded font-black">
                {summary.benchmark.symbol} BENCHMARK
              </span>
              <span className="text-[10px] text-[#64748b]">
                {summary.totalPositionsCount} OPEN POSITIONS
              </span>
            </div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5">
              Standardizes all multi-asset deltas against {summary.benchmark.name} to measure aggregate systematic market risk.
            </div>
          </div>
        </div>

        {/* Benchmark Selector & Target Delta Stepper */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Benchmark Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#070a12] p-1 rounded-lg border border-[#1e293b]">
            <span className="text-[10px] text-[#64748b] font-bold px-1.5 uppercase">BENCHMARK:</span>
            {(['SPY', 'QQQ', 'IWM', 'DIA'] as BenchmarkSymbol[]).map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  playKeyClick();
                  setSelectedBenchmark(sym);
                }}
                className={`px-2.5 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                  selectedBenchmark === sym
                    ? 'bg-[#38bdf8] text-black shadow-sm shadow-[#38bdf8]/40'
                    : 'text-[#8b9bb4] hover:text-white hover:bg-[#151f33]'
                }`}
                title={BENCHMARK_DEFINITIONS[sym].description}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Target Beta Delta Stepper */}
          <div className="flex items-center gap-1 bg-[#070a12] p-1 rounded-lg border border-[#1e293b]">
            <span className="text-[10px] text-[#64748b] font-bold px-1.5 uppercase">TARGET β-Δ:</span>
            <button
              onClick={() => {
                playKeyClick();
                setTargetBetaDelta((prev) => prev - 25);
              }}
              className="px-1.5 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] text-xs font-bold"
              title="Decrease target beta delta"
            >
              -25
            </button>
            <input
              type="number"
              value={targetBetaDelta}
              onChange={(e) => setTargetBetaDelta(parseFloat(e.target.value) || 0)}
              className="w-14 bg-transparent text-center font-black text-xs text-white outline-none"
            />
            <button
              onClick={() => {
                playKeyClick();
                setTargetBetaDelta((prev) => prev + 25);
              }}
              className="px-1.5 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] text-xs font-bold"
              title="Increase target beta delta"
            >
              +25
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setTargetBetaDelta(0);
              }}
              className="px-1.5 py-0.5 rounded bg-[#0284c7]/20 text-[#38bdf8] hover:bg-[#0284c7]/40 text-[10px] font-bold"
              title="Reset to Delta Neutral (0.0)"
            >
              0 (NEUTRAL)
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE METRIC KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
        
        {/* Metric 1: Net Beta-Weighted Delta */}
        <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
            <span>NET β-WEIGHTED DELTA</span>
            <span className="text-[9px] text-[#38bdf8]">{selectedBenchmark} EQ.</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl font-black ${
              summary.totalNetBetaWeightedDelta > 15
                ? 'text-[#00e676]'
                : summary.totalNetBetaWeightedDelta < -15
                ? 'text-[#ff334b]'
                : 'text-[#ffd600]'
            }`}>
              {summary.totalNetBetaWeightedDelta >= 0 ? '+' : ''}
              {summary.totalNetBetaWeightedDelta.toFixed(1)}
            </span>
            <span className="text-[11px] text-[#94a3b8]">shs</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[9.5px]">
            <span className="text-[#64748b]">Raw Delta: {summary.totalNetRawDelta >= 0 ? '+' : ''}{summary.totalNetRawDelta.toFixed(1)}</span>
            <span className={`font-black px-1.5 py-0.2 rounded text-[8.5px] ${
              summary.directionalStance === 'HEAVILY_BULLISH' || summary.directionalStance === 'MODERATELY_BULLISH'
                ? 'bg-[#00e676]/20 text-[#00e676]'
                : summary.directionalStance === 'DELTA_NEUTRAL'
                ? 'bg-[#ffd600]/20 text-[#ffd600]'
                : 'bg-[#ff334b]/20 text-[#ff334b]'
            }`}>
              {summary.directionalStance.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Metric 2: Net Beta-Weighted Dollar Delta */}
        <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
            <span>β-DOLLAR EXPOSURE</span>
            <DollarSign className="w-3.5 h-3.5 text-[#38bdf8]" />
          </div>
          <div className="text-xl font-black text-white mt-1">
            {summary.totalNetBetaWeightedDollarDelta >= 0 ? '+' : ''}$
            {Math.abs(summary.totalNetBetaWeightedDollarDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1">
            Net dollar impact per 100% {selectedBenchmark} move
          </div>
        </div>

        {/* Metric 3: Portfolio Weighted Beta */}
        <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
            <span>PORTFOLIO BETA</span>
            <Activity className="w-3.5 h-3.5 text-[#ff9900]" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-[#ff9900]">
              {summary.portfolioWeightedBeta.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#8b9bb4]">
              vs {selectedBenchmark} (1.00)
            </span>
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1">
            {summary.portfolioWeightedBeta > 1.2
              ? 'High Systematic Sensitivity'
              : summary.portfolioWeightedBeta < 0.8
              ? 'Low Systematic Volatility'
              : 'Market-Correlated Volatility'}
          </div>
        </div>

        {/* Metric 4: Net Beta Gamma */}
        <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
            <span>NET β-GAMMA</span>
            <Zap className="w-3.5 h-3.5 text-[#00e676]" />
          </div>
          <div className="text-xl font-black text-[#cbd5e1] mt-1">
            {summary.totalNetBetaWeightedGamma >= 0 ? '+' : ''}
            {summary.totalNetBetaWeightedGamma.toFixed(3)}
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1">
            Delta expansion rate per $1.00 {selectedBenchmark} shift
          </div>
        </div>

        {/* Metric 5: Aggregate Theta / Time Decay */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-[#0b101c] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
            <span>PORTFOLIO THETA</span>
            <span className="text-[9px] text-[#8b9bb4]">1-DAY DECAY</span>
          </div>
          <div className={`text-xl font-black mt-1 ${summary.totalNetTheta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
            {summary.totalNetTheta >= 0 ? '+' : ''}${summary.totalNetTheta.toFixed(2)}/day
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1">
            Vega: {summary.totalNetVega >= 0 ? '+' : ''}${summary.totalNetVega.toFixed(2)} / 1% IV
          </div>
        </div>

      </div>

      {/* DIRECTIONAL HEADLINE BANNER */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-pulse" />
          <span className="font-black text-white">SYSTEMATIC STANCE:</span>
          <span className="text-[#38bdf8] font-bold">{summary.directionalHeadline}</span>
        </div>
        <div className="text-[11px] text-[#94a3b8] flex items-center gap-2">
          <span>{summary.benchmark.name}: <strong className="text-white">${summary.benchmarkPrice.toFixed(2)}</strong></span>
          <span>·</span>
          <span>Total Notional: <strong className="text-white">${summary.totalPortfolioNotional.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></span>
        </div>
      </div>

      {/* 3. INTERACTIVE BENCHMARK SHOCK PAYOFF DIAGRAM & STRESS MATRIX */}
      <div className="bg-[#080d19] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00e676]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {summary.benchmark.symbol} MARKET SHOCK SIMULATION CURVE (-15% TO +15%)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#8b9bb4]">
              Simulates portfolio P&L response as {summary.benchmark.symbol} moves, factoring in Beta-Delta &amp; Gamma curvature.
            </span>
          </div>
        </div>

        {/* SVG Payoff Curve */}
        <div className="w-full overflow-x-auto no-scrollbar relative bg-[#050811] rounded-lg border border-[#141d30]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[260px] select-none"
          >
            {/* Grid Lines */}
            {[-10, -5, 0, 5, 10].map((pct) => (
              <g key={`grid-x-${pct}`}>
                <line
                  x1={scaleX(pct)}
                  y1={padding.top}
                  x2={scaleX(pct)}
                  y2={padding.top + chartH}
                  stroke={pct === 0 ? '#38bdf8' : '#1e293b'}
                  strokeDasharray={pct === 0 ? 'none' : '3,3'}
                  strokeWidth={pct === 0 ? 1.5 : 1}
                  opacity={pct === 0 ? 0.7 : 0.4}
                />
                <text
                  x={scaleX(pct)}
                  y={padding.top + chartH + 18}
                  fill={pct === 0 ? '#38bdf8' : '#64748b'}
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight={pct === 0 ? 'bold' : 'normal'}
                >
                  {pct >= 0 ? `+${pct}%` : `${pct}%`}
                </text>
              </g>
            ))}

            {/* Zero P&L Line */}
            <line
              x1={padding.left}
              y1={zeroY}
              x2={padding.left + chartW}
              y2={zeroY}
              stroke="#475569"
              strokeDasharray="4,4"
              strokeWidth="1.2"
              opacity="0.8"
            />
            <text
              x={padding.left - 8}
              y={zeroY + 3}
              fill="#94a3b8"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
            >
              $0.00
            </text>

            {/* Top / Bottom Y labels */}
            <text
              x={padding.left - 8}
              y={padding.top + 10}
              fill="#00e676"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
              fontWeight="bold"
            >
              +${maxPnL.toFixed(0)}
            </text>
            <text
              x={padding.left - 8}
              y={padding.top + chartH}
              fill="#ff334b"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
              fontWeight="bold"
            >
              -${Math.abs(minPnL).toFixed(0)}
            </text>

            {/* Payoff Polyline */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              points={curvePoints}
            />

            {/* Shock Data Points */}
            {summary.shockCurve.map((pt, idx) => {
              const cx = scaleX(pt.shockPct);
              const cy = scaleY(pt.estimatedPnLDollar);
              const isHovered = hoveredShockIndex === idx;

              return (
                <g
                  key={pt.shockPct}
                  onMouseEnter={() => setHoveredShockIndex(idx)}
                  onMouseLeave={() => setHoveredShockIndex(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill={pt.estimatedPnLDollar >= 0 ? '#00e676' : '#ff334b'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  {isHovered && (
                    <g>
                      <rect
                        x={Math.min(cx - 70, svgWidth - 160)}
                        y={Math.max(10, cy - 45)}
                        width="145"
                        height="40"
                        rx="4"
                        fill="#0f172a"
                        stroke="#38bdf8"
                        strokeWidth="1"
                      />
                      <text
                        x={Math.min(cx - 65, svgWidth - 155)}
                        y={Math.max(24, cy - 31)}
                        fill="#ffffff"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {pt.shockPct >= 0 ? `+${pt.shockPct}%` : `${pt.shockPct}%`} ({selectedBenchmark} ${pt.benchmarkStressedPrice})
                      </text>
                      <text
                        x={Math.min(cx - 65, svgWidth - 155)}
                        y={Math.max(38, cy - 17)}
                        fill={pt.estimatedPnLDollar >= 0 ? '#00e676' : '#ff334b'}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="black"
                      >
                        PnL: {pt.estimatedPnLDollar >= 0 ? '+' : ''}${pt.estimatedPnLDollar.toFixed(2)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Quick Scenario Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className="text-[#64748b] uppercase font-bold">KEY BENCHMARK SCENARIOS:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '-10% CRASH', pct: -10 },
              { label: '-5% PULLBACK', pct: -5 },
              { label: '-2% DIP', pct: -2 },
              { label: '0% FLAT', pct: 0 },
              { label: '+2% BOUNCE', pct: 2 },
              { label: '+5% RALLY', pct: 5 },
              { label: '+10% SURGE', pct: 10 },
            ].map((scen) => {
              const pt = summary.shockCurve.find((p) => p.shockPct === scen.pct);
              if (!pt) return null;
              const isProfit = pt.estimatedPnLDollar >= 0;
              return (
                <div
                  key={scen.pct}
                  className="px-2 py-1 rounded bg-[#0f172a] border border-[#1e293b] flex items-center gap-1.5"
                >
                  <span className="text-[#94a3b8]">{scen.label}:</span>
                  <span className={`font-black ${isProfit ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                    {isProfit ? '+' : ''}${pt.estimatedPnLDollar.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. POSITION-BY-POSITION BETA WEIGHTING BLOTTER */}
      <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
        <div className="bg-[#0f172a] px-3 py-2 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#ff9900]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              POSITION-BY-POSITION BETA RISK MATRIX ({sortedPositions.length})
            </span>
          </div>

          {/* Table Sort controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748b] text-[10px] uppercase font-bold">SORT BY:</span>
            <button
              onClick={() => {
                playKeyClick();
                if (sortField === 'betaDelta') setSortAsc(!sortAsc);
                else { setSortField('betaDelta'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sortField === 'betaDelta' ? 'bg-[#38bdf8] text-black font-black' : 'bg-[#1e293b] text-[#8b9bb4]'
              }`}
            >
              β-DELTA {sortField === 'betaDelta' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => {
                playKeyClick();
                if (sortField === 'riskContribution') setSortAsc(!sortAsc);
                else { setSortField('riskContribution'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sortField === 'riskContribution' ? 'bg-[#ff9900] text-black font-black' : 'bg-[#1e293b] text-[#8b9bb4]'
              }`}
            >
              % RISK {sortField === 'riskContribution' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => {
                playKeyClick();
                if (sortField === 'notional') setSortAsc(!sortAsc);
                else { setSortField('notional'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sortField === 'notional' ? 'bg-[#00e676] text-black font-black' : 'bg-[#1e293b] text-[#8b9bb4]'
              }`}
            >
              NOTIONAL {sortField === 'notional' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-[#070c16] text-[#64748b] text-[9.5px] uppercase border-b border-[#1e293b]">
              <tr>
                <th className="py-2 px-3 text-left">SYMBOL / STRATEGY</th>
                <th className="py-2 px-3 text-left">TYPE</th>
                <th className="py-2 px-3">SPOT PRICE</th>
                <th className="py-2 px-3">ASSET BETA (β)</th>
                <th className="py-2 px-3 text-[#c084fc]">TRADE IV</th>
                <th className="py-2 px-3">REL. BETA</th>
                <th className="py-2 px-3">RAW DELTA (Δ)</th>
                <th className="py-2 px-3 text-[#38bdf8]">β-WEIGHTED DELTA</th>
                <th className="py-2 px-3">β-DOLLAR DELTA</th>
                <th className="py-2 px-3 text-center">% RISK CONTR.</th>
                <th className="py-2 px-3 text-center">BIAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33] font-mono text-[11px]">
              {sortedPositions.map((pos) => {
                const isBull = pos.betaWeightedDelta > 0;
                return (
                  <tr key={pos.positionId} className="hover:bg-[#0f172a] transition-colors">
                    {/* Symbol & Strategy */}
                    <td className="py-2.5 px-3 text-left">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => onSelectTicker && onSelectTicker(pos.ticker)}
                          className="font-black text-white hover:text-[#38bdf8] cursor-pointer text-sm"
                          title="Click to inspect symbol"
                        >
                          {pos.ticker}
                        </span>
                        <span className="text-[10px] text-[#8b9bb4] truncate max-w-[170px]">
                          {pos.strategyName}
                        </span>
                      </div>
                    </td>

                    {/* Asset Type */}
                    <td className="py-2.5 px-3 text-left">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        pos.assetCategory === 'stock'
                          ? 'bg-[#3b82f6]/20 text-[#60a5fa]'
                          : pos.assetCategory === 'future'
                          ? 'bg-[#ffd600]/20 text-[#ffd600]'
                          : 'bg-[#00e676]/20 text-[#00e676]'
                      }`}>
                        {pos.assetCategory}
                      </span>
                    </td>

                    {/* Spot Price */}
                    <td className="py-2.5 px-3 text-white font-bold">
                      ${pos.spotPrice.toFixed(2)}
                    </td>

                    {/* Asset Beta */}
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[#ffd600]">{pos.assetBeta.toFixed(2)}</span>
                    </td>

                    {/* Trade IV */}
                    <td className="py-2.5 px-3" title={`Implied Volatility when trade was executed: ${((pos.entryIV ?? 0.25) * 100).toFixed(1)}% | Current Live IV: ${((pos.currentIV ?? 0.25) * 100).toFixed(1)}%`}>
                      <div className="font-bold text-[#f3e8ff]">
                        {((pos.entryIV ?? 0.25) * 100).toFixed(1)}%
                      </div>
                      <div className="text-[8.5px] text-[#8b9bb4]">
                        LIVE: {((pos.currentIV ?? 0.25) * 100).toFixed(1)}%
                      </div>
                    </td>

                    {/* Relative Beta */}
                    <td className="py-2.5 px-3 text-[#cbd5e1]">
                      {pos.relativeBeta.toFixed(2)}x
                    </td>

                    {/* Raw Delta */}
                    <td className="py-2.5 px-3 text-[#94a3b8]">
                      {pos.rawDelta >= 0 ? '+' : ''}{pos.rawDelta.toFixed(1)}
                    </td>

                    {/* Beta-Weighted Delta */}
                    <td className="py-2.5 px-3">
                      <span className={`font-black text-sm ${
                        pos.betaWeightedDelta > 5
                          ? 'text-[#00e676]'
                          : pos.betaWeightedDelta < -5
                          ? 'text-[#ff334b]'
                          : 'text-[#ffd600]'
                      }`}>
                        {pos.betaWeightedDelta >= 0 ? '+' : ''}{pos.betaWeightedDelta.toFixed(1)}
                      </span>
                      <span className="text-[9px] text-[#64748b] ml-1">shs</span>
                    </td>

                    {/* Beta-Weighted Dollar Delta */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      {pos.betaWeightedDollarDelta >= 0 ? '+' : ''}$
                      {Math.abs(pos.betaWeightedDollarDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>

                    {/* Risk Contribution % */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#38bdf8] h-full rounded-full"
                            style={{ width: `${Math.min(100, pos.riskContributionPct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#38bdf8]">
                          {pos.riskContributionPct}%
                        </span>
                      </div>
                    </td>

                    {/* Bias */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                        isBull
                          ? 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30'
                          : 'bg-[#ff334b]/15 text-[#ff334b] border border-[#ff334b]/30'
                      }`}>
                        {isBull ? 'LONG' : 'SHORT'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#070c16] border-t-2 border-[#1e293b] font-bold text-white">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 text-left text-[#38bdf8]">
                  PORTFOLIO TOTALS (STANDARDIZED TO {selectedBenchmark})
                </td>
                <td className="py-2.5 px-3">
                  {summary.totalNetRawDelta >= 0 ? '+' : ''}{summary.totalNetRawDelta.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-[#38bdf8] font-black text-sm">
                  {summary.totalNetBetaWeightedDelta >= 0 ? '+' : ''}{summary.totalNetBetaWeightedDelta.toFixed(1)} shs
                </td>
                <td className="py-2.5 px-3 font-black">
                  {summary.totalNetBetaWeightedDollarDelta >= 0 ? '+' : ''}$
                  {Math.abs(summary.totalNetBetaWeightedDollarDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2.5 px-3 text-center text-[#ffd600]">
                  100.0%
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] text-[#38bdf8]">{summary.directionalStance}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. INTERACTIVE BETA HEDGE CALCULATOR & REBALANCER */}
      <div className="bg-[#0b101c] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00e676]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              PORTFOLIO BETA HEDGE CALCULATOR &amp; DELTA REBALANCER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                setIsHedgeSimulated(!isHedgeSimulated);
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isHedgeSimulated
                  ? 'bg-[#00e676] text-black border-[#00e676]'
                  : 'bg-[#141b28] hover:bg-[#1e2638] text-[#94a3b8] border-[#334155]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isHedgeSimulated ? 'HEDGE ACTIVE (SIMULATED)' : 'SIMULATE HEDGE IMPACT'}</span>
            </button>
            <button
              onClick={handleCopyHedge}
              className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copiedHedge ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5 text-[#38bdf8]" />}
              <span>{copiedHedge ? 'COPIED TO CLIPBOARD' : 'COPY HEDGE TICKET'}</span>
            </button>
          </div>
        </div>

        {/* Hedge Options Split: Stock vs Put Tail Hedge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          
          {/* Method A: Direct Benchmark ETF Shares */}
          <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between border-b border-[#141d30] pb-1.5">
                <span className="text-[10px] text-[#38bdf8] uppercase font-bold flex items-center gap-1">
                  <span>METHOD 1: BENCHMARK SHARES HEDGE</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  summary.hedgeRecommendation.stockHedge.action === 'SELL'
                    ? 'bg-[#ff334b]/20 text-[#ff334b]'
                    : summary.hedgeRecommendation.stockHedge.action === 'BUY'
                    ? 'bg-[#00e676]/20 text-[#00e676]'
                    : 'bg-[#1e293b] text-[#8b9bb4]'
                }`}>
                  {summary.hedgeRecommendation.stockHedge.action} {summary.hedgeRecommendation.stockHedge.shares} SHARES
                </span>
              </div>
              <p className="text-[11px] text-[#cbd5e1] mt-2">
                {summary.hedgeRecommendation.stockHedge.description}
              </p>
            </div>

            <div className="bg-[#0f172a] p-2 rounded border border-[#1e293b] flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[#64748b] block text-[9.5px]">ESTIMATED NOTIONAL</span>
                <span className="text-white font-bold">${summary.hedgeRecommendation.stockHedge.estimatedCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[9.5px]">TARGET NET β-Δ</span>
                <span className="text-[#00e676] font-black">{targetBetaDelta.toFixed(1)} shs</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[9.5px]">INSTRUMENT</span>
                <span className="text-[#38bdf8] font-bold">{summary.benchmark.symbol} ETF</span>
              </div>
            </div>
          </div>

          {/* Method B: Benchmark 30-DTE Options Tail Hedge */}
          <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between border-b border-[#141d30] pb-1.5">
                <span className="text-[10px] text-[#00e676] uppercase font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#00e676]" />
                  <span>METHOD 2: ASYMMETRIC OPTIONS TAIL HEDGE</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 uppercase">
                  {summary.hedgeRecommendation.optionHedge.action} {summary.hedgeRecommendation.optionHedge.contracts}x CONTRACTS
                </span>
              </div>
              <p className="text-[11px] text-[#cbd5e1] mt-2">
                {summary.hedgeRecommendation.optionHedge.description}
              </p>
            </div>

            <div className="bg-[#0f172a] p-2 rounded border border-[#1e293b] flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[#64748b] block text-[9.5px]">ESTIMATED PREMIUM</span>
                <span className="text-white font-bold">${summary.hedgeRecommendation.optionHedge.totalPremiumCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[9.5px]">STRIKE &amp; EXPIRATION</span>
                <span className="text-[#ffd600] font-bold">${summary.hedgeRecommendation.optionHedge.strike} · 30 DTE</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[9.5px]">UPSIDE PRESERVED</span>
                <span className="text-[#00e676] font-bold">100% UNLIMITED</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
