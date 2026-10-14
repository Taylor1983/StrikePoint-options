import React, { useState, useMemo } from 'react';
import { Ticker } from '../types/options';
import {
  COUNTRY_GEO_RISK_DATA,
  CountryRiskRegion,
} from '../services/countryRiskData';
import {
  YIELD_CURVE_DATA,
  YIELD_CURVE_SPREADS,
  YieldCurvePoint,
  G20_YIELD_CURVES,
} from '../services/yieldCurveData';
import { playKeyClick } from '../utils/terminalSound';
import {
  AlertTriangle,
  Snowflake,
  TrendingUp,
  TrendingDown,
  Globe,
  Activity,
  LineChart,
  Maximize2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Layers,
  Zap,
} from 'lucide-react';

interface OptionsAnalysisSidebarGadgetProps {
  selectedTicker: Ticker;
  atmMetrics: {
    straddleCost: number;
    movePct: number;
    atmStrike?: number;
    callPrice?: number;
    putPrice?: number;
    impliedMovePct?: number;
  };
  currentTickerPcr: number | string;
  onSelectTicker: (symbol: string) => void;
  onOpenFullGeoRiskModal?: () => void;
  onNavigateToTariff?: () => void;
  onOpenNetGamma?: () => void;
  onNavigateToYieldCurve?: () => void;
}

type GadgetTab = 'analytics' | 'georisk' | 'yieldcurve';

export const OptionsAnalysisSidebarGadget: React.FC<OptionsAnalysisSidebarGadgetProps> = ({
  selectedTicker,
  atmMetrics,
  currentTickerPcr,
  onSelectTicker,
  onOpenFullGeoRiskModal,
  onNavigateToTariff,
  onOpenNetGamma,
  onNavigateToYieldCurve,
}) => {
  const [activeTab, setActiveTab] = useState<GadgetTab>('analytics');
  const [selectedGeoRegionId, setSelectedGeoRegionId] = useState<string>('mideast-gulf');
  const [selectedYcCountryId, setSelectedYcCountryId] = useState<string>('US');
  const [hoveredSparklineIdx, setHoveredSparklineIdx] = useState<number | null>(null);
  const [simulatedIvRankOverride, setSimulatedIvRankOverride] = useState<number | null>(null);

  // Active IV rank (supports testing simulated extreme values or using real live ticker value)
  const currentIvRank = simulatedIvRankOverride ?? selectedTicker.ivRank;

  // Determine IV Rank Alert State
  const isHighIvAlert = currentIvRank >= 80;
  const isLowIvAlert = currentIvRank <= 20;

  // Generate deterministic 30-day IV Rank history for the selected ticker
  const ivRankHistory = useMemo(() => {
    // If the ticker has pre-defined history, use it, else synthesize realistic 30-day walk
    const history: { day: number; date: string; rank: number }[] = [];
    const baseVal = currentIvRank;
    
    // Seed using ticker symbol characters
    let seed = 0;
    for (let i = 0; i < selectedTicker.symbol.length; i++) {
      seed += selectedTicker.symbol.charCodeAt(i);
    }

    const today = new Date('2026-10-01T00:00:00Z');
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (i === 0) {
        history.push({ day: 0, date: dateStr, rank: baseVal });
      } else {
        // pseudo-random oscillation that converges smoothly to baseVal
        const noise = Math.sin((i * 13 + seed) * 0.45) * 12 + Math.cos((i * 7 + seed) * 0.3) * 6;
        const trend = (i / 30) * ((seed % 15) - 7);
        const calculated = Math.round(Math.max(4, Math.min(96, baseVal + noise * (i / 20) + trend)));
        history.push({ day: -i, date: dateStr, rank: calculated });
      }
    }
    return history;
  }, [selectedTicker.symbol, currentIvRank]);

  // Statistics for the 30-day period
  const stats = useMemo(() => {
    const ranks = ivRankHistory.map((h) => h.rank);
    const min = Math.min(...ranks);
    const max = Math.max(...ranks);
    const avg = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
    const start = ranks[0];
    const end = ranks[ranks.length - 1];
    const change = end - start;
    return { min, max, avg, change };
  }, [ivRankHistory]);

  // Currently selected Geopolitical Risk region
  const selectedRegion = useMemo(() => {
    return (
      COUNTRY_GEO_RISK_DATA.find((r) => r.id === selectedGeoRegionId) ||
      COUNTRY_GEO_RISK_DATA[0]
    );
  }, [selectedGeoRegionId]);

  // Sparkline dimensions
  const sparkWidth = 232;
  const sparkHeight = 60;
  const padTop = 6;
  const padBottom = 8;
  const padLeft = 4;
  const padRight = 4;

  const getYForRank = (rank: number) => {
    // 0 to 100% mapped to sparkHeight - padBottom to padTop
    const clamped = Math.max(0, Math.min(100, rank));
    return sparkHeight - padBottom - (clamped / 100) * (sparkHeight - padTop - padBottom);
  };

  const getXForIndex = (index: number) => {
    return padLeft + (index / (ivRankHistory.length - 1)) * (sparkWidth - padLeft - padRight);
  };

  const sparklinePath = useMemo(() => {
    return ivRankHistory
      .map((pt, idx) => {
        const x = getXForIndex(idx).toFixed(1);
        const y = getYForRank(pt.rank).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [ivRankHistory]);

  const sparklineArea = useMemo(() => {
    if (ivRankHistory.length === 0) return '';
    const firstX = getXForIndex(0).toFixed(1);
    const lastX = getXForIndex(ivRankHistory.length - 1).toFixed(1);
    const bottomY = (sparkHeight - padBottom).toFixed(1);
    return `${sparklinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [sparklinePath, ivRankHistory]);

  const hoveredPoint = hoveredSparklineIdx !== null ? ivRankHistory[hoveredSparklineIdx] : null;

  // Color selection based on alert state
  const sparkStrokeColor = isHighIvAlert
    ? '#ff3344'
    : isLowIvAlert
    ? '#00e5ff'
    : '#ff9900';

  const sparkGradId = `ivSparkGrad-${selectedTicker.symbol}`;

  // PCR sentiment
  const pcrNum = typeof currentTickerPcr === 'number' ? currentTickerPcr : parseFloat(currentTickerPcr) || 1.0;
  const pcrDisplay = typeof currentTickerPcr === 'number' ? currentTickerPcr.toFixed(2) : currentTickerPcr;
  const impliedMove = atmMetrics.impliedMovePct ?? atmMetrics.movePct;
  const pcrSentiment =
    pcrNum > 1.15
      ? { label: 'BEARISH PUT BIAS', color: '#ff3344' }
      : pcrNum < 0.75
      ? { label: 'BULLISH CALL BIAS', color: '#00e676' }
      : { label: 'NEUTRAL', color: '#ffd600' };

  return (
    <div className="gadget flex flex-col border border-[#3c3c3c] bg-[#1a1a1a] select-none">
      {/* Gadget Header with Switcher Tabs */}
      <div className="gadget-header flex items-center justify-between !py-1 !px-2 bg-[#252525] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-1">
          <span className="font-bold text-[10px] text-[#ff9900] tracking-wide">
            OPTIONS ANALYSIS
          </span>
          {isHighIvAlert && (
            <span className="animate-pulse bg-[#ff3344] text-white text-[8px] font-bold px-1 py-0.2 rounded">
              HIGH
            </span>
          )}
          {isLowIvAlert && (
            <span className="animate-pulse bg-[#00b0ff] text-black text-[8px] font-bold px-1 py-0.2 rounded">
              LOW
            </span>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-0.5 bg-[#141414] p-0.5 rounded border border-[#333]">
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('analytics');
            }}
            title="Options Metrics & 30D IV Rank Sparkline"
            className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#ff9900] text-black shadow'
                : 'text-[#8c8c8c] hover:text-white'
            }`}
          >
            IV STATS
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('georisk');
            }}
            title="Country & Geopolitical Risk Heatmap"
            className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all flex items-center gap-1 ${
              activeTab === 'georisk'
                ? 'bg-[#ef4444] text-white shadow'
                : 'text-[#ef4444] hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-ping" />
            GEO RISK
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('yieldcurve');
            }}
            title="US Treasury Yield Curve"
            className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all ${
              activeTab === 'yieldcurve'
                ? 'bg-[#ffd600] text-black shadow'
                : 'text-[#ffd600] hover:text-white'
            }`}
          >
            YIELD
          </button>
        </div>
      </div>

      <div className="gadget-content !p-2">
        {/* ========================================================================= */}
        {/* TAB 1: IV ANALYTICS & 30-DAY SPARKLINE WITH 20/80 ALERT TRIGGERS          */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-2.5">
            {/* IV Rank Alert Banner (Dynamic when >80% or <20%) */}
            {isHighIvAlert && (
              <div className="p-1.5 bg-[#3b0b0b] border border-[#ff3344] rounded flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-[#ff3344] shrink-0" />
                <div className="flex-1 text-[9px] leading-tight">
                  <div className="font-bold text-[#ff3344] flex justify-between">
                    <span>⚠️ HIGH IV ALERT ({currentIvRank}%)</span>
                    <span>&gt;80% LEVEL</span>
                  </div>
                  <div className="text-[#fca5a5] text-[8px] mt-0.5">
                    Premium is overpriced. Favor Short Vega, Credit Spreads & Strangles.
                  </div>
                </div>
              </div>
            )}

            {isLowIvAlert && (
              <div className="p-1.5 bg-[#082838] border border-[#00d2ff] rounded flex items-center gap-2 animate-pulse">
                <Snowflake className="w-4 h-4 text-[#00d2ff] shrink-0" />
                <div className="flex-1 text-[9px] leading-tight">
                  <div className="font-bold text-[#00d2ff] flex justify-between">
                    <span>❄️ LOW IV ALERT ({currentIvRank}%)</span>
                    <span>&lt;20% LEVEL</span>
                  </div>
                  <div className="text-[#bae6fd] text-[8px] mt-0.5">
                    Premium is cheap. Favor Long Options, Debit Spreads & Calendars.
                  </div>
                </div>
              </div>
            )}

            {!isHighIvAlert && !isLowIvAlert && (
              <div className="p-1 px-1.5 bg-[#222] border border-[#333] rounded flex items-center justify-between text-[8px] text-[#8c8c8c]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#43a047]" />
                  <span>IV Rank in Normal Range (20% – 80%)</span>
                </div>
                <span className="text-[#ccc] font-mono">{currentIvRank}%</span>
              </div>
            )}

            {/* ATM Straddle & Expected Move */}
            <div className="bg-[#141414] border border-[#2d2d2d] rounded p-2">
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <span className="text-[8.5px] uppercase tracking-wider text-[#8c8c8c] block font-mono">
                    ATM STRADDLE COST
                  </span>
                  <div className="text-[15px] font-bold text-[#ffd600] font-mono leading-none mt-0.5">
                    ${atmMetrics.straddleCost.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8.5px] uppercase tracking-wider text-[#8c8c8c] block font-mono">
                    IMPLIED MOVE
                  </span>
                  <span className="text-[12px] font-bold text-white font-mono">
                    ±${(atmMetrics.straddleCost * 0.85).toFixed(2)} ({impliedMove.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#262626]">
                <div className={`p-1 rounded ${isHighIvAlert ? 'bg-[#ff1744]/15 border border-[#ff1744]/50' : isLowIvAlert ? 'bg-[#00d2ff]/15 border border-[#00d2ff]/50' : 'bg-[#1e1e1e]'}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] text-[#8c8c8c] font-mono">IV RANK</label>
                    {isHighIvAlert ? (
                      <span className="text-[7.5px] text-[#ff3344] font-bold">ALERT &gt;80%</span>
                    ) : isLowIvAlert ? (
                      <span className="text-[7.5px] text-[#00d2ff] font-bold">ALERT &lt;20%</span>
                    ) : (
                      <span className="text-[7.5px] text-[#8c8c8c]">NORMAL</span>
                    )}
                  </div>
                  <div
                    className={`font-bold text-[14px] font-mono ${
                      isHighIvAlert
                        ? 'text-[#ff3344]'
                        : isLowIvAlert
                        ? 'text-[#00d2ff]'
                        : 'text-[#ff9900]'
                    }`}
                  >
                    {currentIvRank}%
                  </div>
                </div>

                <div className="p-1 rounded bg-[#1e1e1e]">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] text-[#8c8c8c] font-mono">P/C RATIO</label>
                    <span className="text-[7.5px] font-bold" style={{ color: pcrSentiment.color }}>
                      {pcrSentiment.label.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-[#00d2ff] font-bold text-[14px] font-mono">
                    {pcrDisplay}x
                  </div>
                </div>
              </div>
            </div>

            {/* 30-DAY HISTORICAL IV RANK SPARKLINE */}
            <div className="bg-[#141414] border border-[#2d2d2d] rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#ff9900]" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider font-mono">
                    30-Day IV Rank History
                  </span>
                </div>
                <div className="text-[8px] font-mono text-[#8c8c8c]">
                  {hoveredPoint ? (
                    <span className="text-white font-bold">
                      {hoveredPoint.date}: <span className="text-[#ffd600]">{hoveredPoint.rank}%</span>
                    </span>
                  ) : (
                    <span>Trend: <strong className={stats.change >= 0 ? 'text-[#ff3344]' : 'text-[#43a047]'}>{stats.change >= 0 ? '+' : ''}{stats.change}%</strong></span>
                  )}
                </div>
              </div>

              {/* SVG Sparkline Container with 20% & 80% Threshold Lines */}
              <div className="relative border border-[#262626] bg-[#0c0c0c] rounded p-1 overflow-hidden">
                <svg
                  width="100%"
                  height={sparkHeight}
                  viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
                  preserveAspectRatio="none"
                  className="overflow-visible cursor-crosshair block"
                  onMouseLeave={() => setHoveredSparklineIdx(null)}
                >
                  <defs>
                    <linearGradient id={sparkGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sparkStrokeColor} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={sparkStrokeColor} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* 80% High IV Threshold Reference Line */}
                  <line
                    x1={padLeft}
                    y1={getYForRank(80)}
                    x2={sparkWidth - padRight}
                    y2={getYForRank(80)}
                    stroke="#ff3344"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                    opacity="0.8"
                  />
                  <text
                    x={sparkWidth - padRight - 1}
                    y={getYForRank(80) - 2}
                    fill="#ff3344"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight="bold"
                  >
                    80% HIGH
                  </text>

                  {/* 20% Low IV Threshold Reference Line */}
                  <line
                    x1={padLeft}
                    y1={getYForRank(20)}
                    x2={sparkWidth - padRight}
                    y2={getYForRank(20)}
                    stroke="#00d2ff"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                    opacity="0.8"
                  />
                  <text
                    x={sparkWidth - padRight - 1}
                    y={getYForRank(20) - 2}
                    fill="#00d2ff"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight="bold"
                  >
                    20% LOW
                  </text>

                  {/* Area fill */}
                  <path d={sparklineArea} fill={`url(#${sparkGradId})`} />

                  {/* Polyline line stroke */}
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke={sparkStrokeColor}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Current Day End Point Dot */}
                  <circle
                    cx={getXForIndex(ivRankHistory.length - 1)}
                    cy={getYForRank(currentIvRank)}
                    r="3"
                    fill={sparkStrokeColor}
                    stroke="#fff"
                    strokeWidth="1"
                    className="animate-pulse"
                  />

                  {/* Hover indicator crosshair */}
                  {hoveredSparklineIdx !== null && (
                    <>
                      <line
                        x1={getXForIndex(hoveredSparklineIdx)}
                        y1={padTop}
                        x2={getXForIndex(hoveredSparklineIdx)}
                        y2={sparkHeight - padBottom}
                        stroke="#fff"
                        strokeWidth="0.75"
                        strokeDasharray="1,1"
                      />
                      <circle
                        cx={getXForIndex(hoveredSparklineIdx)}
                        cy={getYForRank(ivRankHistory[hoveredSparklineIdx].rank)}
                        r="3.5"
                        fill="#ffd600"
                        stroke="#000"
                        strokeWidth="1"
                      />
                    </>
                  )}

                  {/* Interactive invisible hit areas */}
                  {ivRankHistory.map((_, idx) => {
                    const x = getXForIndex(idx);
                    const widthPerCol = sparkWidth / ivRankHistory.length;
                    return (
                      <rect
                        key={idx}
                        x={x - widthPerCol / 2}
                        y={0}
                        width={widthPerCol}
                        height={sparkHeight}
                        fill="transparent"
                        onMouseEnter={() => setHoveredSparklineIdx(idx)}
                      />
                    );
                  })}
                </svg>

                {/* Legend indicator underneath chart */}
                <div className="flex justify-between items-center text-[7.5px] font-mono text-[#777] mt-1 pt-1 border-t border-[#1f1f1f]">
                  <span>30D Low: <strong className="text-[#00d2ff]">{stats.min}%</strong></span>
                  <span>30D Avg: <strong className="text-[#ccc]">{stats.avg}%</strong></span>
                  <span>30D High: <strong className="text-[#ff3344]">{stats.max}%</strong></span>
                </div>
              </div>

              {/* Alert Testing Controls */}
              <div className="mt-1.5 flex items-center justify-between text-[7.5px] text-[#777]">
                <span className="font-mono">Simulate Alert:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSimulatedIvRankOverride(15);
                    }}
                    title="Simulate Low IV (<20%) Alert"
                    className={`px-1 py-0.5 rounded border text-[7.5px] font-mono ${
                      simulatedIvRankOverride === 15
                        ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-bold'
                        : 'border-[#333] hover:text-[#00d2ff]'
                    }`}
                  >
                    15% (Low)
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSimulatedIvRankOverride(50);
                    }}
                    title="Simulate Normal IV (50%)"
                    className={`px-1 py-0.5 rounded border text-[7.5px] font-mono ${
                      simulatedIvRankOverride === 50
                        ? 'bg-[#ff9900] text-black border-[#ff9900] font-bold'
                        : 'border-[#333] hover:text-[#ff9900]'
                    }`}
                  >
                    50% (Norm)
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSimulatedIvRankOverride(88);
                    }}
                    title="Simulate High IV (>80%) Alert"
                    className={`px-1 py-0.5 rounded border text-[7.5px] font-mono ${
                      simulatedIvRankOverride === 88
                        ? 'bg-[#ff3344] text-white border-[#ff3344] font-bold'
                        : 'border-[#333] hover:text-[#ff3344]'
                    }`}
                  >
                    88% (High)
                  </button>
                  {simulatedIvRankOverride !== null && (
                    <button
                      onClick={() => {
                        playKeyClick();
                        setSimulatedIvRankOverride(null);
                      }}
                      title="Reset to Actual Ticker IV Rank"
                      className="px-1 py-0.5 rounded border border-[#444] text-white hover:bg-[#333] text-[7.5px]"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Volatility Diagnostics Strip */}
            <div className="grid grid-cols-2 gap-1 text-[8.5px] font-mono bg-[#141414] p-1.5 rounded border border-[#2d2d2d]">
              <div className="flex justify-between">
                <span className="text-[#8c8c8c]">HIST VOL (30D):</span>
                <span className="text-white font-bold">
                  {(selectedTicker.historicalVol30d * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c8c8c]">IMP VOL (30D):</span>
                <span className="text-[#ffd600] font-bold">
                  {(selectedTicker.currentIV * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between col-span-2 pt-1 border-t border-[#222]">
                <span className="text-[#8c8c8c]">IV/HV PREMIUM SPREAD:</span>
                <span
                  className={`font-bold ${
                    selectedTicker.currentIV >= selectedTicker.historicalVol30d
                      ? 'text-[#ff3344]'
                      : 'text-[#00d2ff]'
                  }`}
                >
                  {((selectedTicker.currentIV - selectedTicker.historicalVol30d) * 100).toFixed(1)} pts
                  {selectedTicker.currentIV > selectedTicker.historicalVol30d ? ' (Rich)' : ' (Cheap)'}
                </span>
              </div>
              <div
                onClick={() => {
                  if (onOpenNetGamma) {
                    playKeyClick();
                    onOpenNetGamma();
                  }
                }}
                className="flex justify-between items-center col-span-2 pt-1 border-t border-[#222] cursor-pointer hover:bg-white/5 px-0.5 rounded transition-all group"
                title="Click to open comprehensive Net Gamma Exposure (GEX) Engine"
              >
                <span className="text-[#a855f7] flex items-center gap-1 font-bold group-hover:underline">
                  <Zap className="w-2.5 h-2.5 text-[#a855f7]" />
                  <span>NET GAMMA (GEX):</span>
                </span>
                <span className="font-bold text-[#a855f7] flex items-center gap-1">
                  <span>{selectedTicker.ivRank < 50 ? '+$1.84B' : '-$420M'}</span>
                  <span className="text-[7.5px] text-[#ffd600] font-normal">
                    (Flip: ${(selectedTicker.price * (selectedTicker.ivRank < 50 ? 0.985 : 1.015)).toFixed(1)})
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: COUNTRY & GEO-POLITICAL RISK DASHBOARD WITH VISUAL HEATMAPS        */}
        {/* ========================================================================= */}
        {activeTab === 'georisk' && (
          <div className="flex flex-col gap-2">
            {/* Header & Subtitle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-bold text-white flex items-center gap-1 font-mono">
                  <Globe className="w-3.5 h-3.5 text-[#ef4444]" />
                  GLOBAL RISK HEATMAP
                </span>
                <p className="text-[7.5px] text-[#8c8c8c]">
                  Geopolitical risk premiums in options pricing
                </p>
              </div>
              {onOpenFullGeoRiskModal && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenFullGeoRiskModal();
                  }}
                  title="Expand to Full Geo Risk Terminal View"
                  className="p-1 text-[#8c8c8c] hover:text-[#ef4444] transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* VISUAL HEATMAP GRID (6 REGIONS) */}
            <div className="grid grid-cols-2 gap-1.5">
              {COUNTRY_GEO_RISK_DATA.map((region) => {
                const isSelected = region.id === selectedGeoRegionId;
                
                // Color mappings based on risk tier
                const tierStyles = {
                  CRITICAL: {
                    bg: 'bg-[#2b0c0c] hover:bg-[#381010]',
                    activeBg: 'bg-[#400e0e]',
                    border: 'border-[#ef4444]',
                    badge: 'bg-[#ef4444] text-white',
                    volBadge: 'text-[#f87171]',
                  },
                  ELEVATED: {
                    bg: 'bg-[#2b1706] hover:bg-[#381f08]',
                    activeBg: 'bg-[#422208]',
                    border: 'border-[#f97316]',
                    badge: 'bg-[#f97316] text-black font-bold',
                    volBadge: 'text-[#fb923c]',
                  },
                  MODERATE: {
                    bg: 'bg-[#262208] hover:bg-[#332e0a]',
                    activeBg: 'bg-[#3d370b]',
                    border: 'border-[#eab308]',
                    badge: 'bg-[#eab308] text-black font-bold',
                    volBadge: 'text-[#facc15]',
                  },
                  LOW: {
                    bg: 'bg-[#0a2312] hover:bg-[#0f2e18]',
                    activeBg: 'bg-[#133d1f]',
                    border: 'border-[#22c55e]',
                    badge: 'bg-[#22c55e] text-black font-bold',
                    volBadge: 'text-[#4ade80]',
                  },
                }[region.riskTier];

                return (
                  <div
                    key={region.id}
                    onClick={() => {
                      playKeyClick();
                      setSelectedGeoRegionId(region.id);
                    }}
                    className={`p-1.5 rounded cursor-pointer transition-all border ${
                      isSelected
                        ? `${tierStyles.activeBg} ${tierStyles.border} shadow-md scale-[1.01] ring-1 ring-white/30`
                        : `${tierStyles.bg} border-[#333] hover:border-[#555]`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1 truncate font-mono">
                        <span>{region.flag}</span>
                        <span className="truncate">{region.region}</span>
                      </span>
                      <span className={`text-[7px] px-1 py-0.2 rounded font-mono ${tierStyles.badge}`}>
                        {region.riskScore}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-[8px] font-mono">
                      <span className="text-[#8c8c8c]">OPTIONS IV:</span>
                      <span className={`font-bold ${tierStyles.volBadge}`}>
                        +{region.impliedVolPremiumPts.toFixed(1)} pts
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[7.5px] font-mono mt-0.5">
                      <span className="text-[#8c8c8c]">CDS:</span>
                      <span className="text-[#ccc]">{region.sovereignCdsBps} bps</span>
                      <span className="text-[7px] text-[#ff9900] truncate max-w-[65px]">
                        {region.skewBias === 'UPSIDE_CALL' ? '▲ Call Skew' : '▼ Put Skew'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-between text-[7px] font-mono px-1 py-0.5 bg-[#141414] rounded border border-[#222]">
              <span className="text-[#8c8c8c]">RISK INTENSITY:</span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-[#22c55e]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> &lt;40
                </span>
                <span className="flex items-center gap-0.5 text-[#eab308]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" /> 40-60
                </span>
                <span className="flex items-center gap-0.5 text-[#f97316]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" /> 60-80
                </span>
                <span className="flex items-center gap-0.5 text-[#ef4444]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" /> 80+
                </span>
              </div>
            </div>

            {/* Selected Region Detailed Intelligence Card */}
            {selectedRegion && (
              <div className="p-2 bg-[#141414] border border-[#333] rounded flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-[#262626] pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{selectedRegion.flag}</span>
                    <div>
                      <div className="text-[10px] font-bold text-white leading-tight font-mono">
                        {selectedRegion.countryOrBloc}
                      </div>
                      <div className="text-[8px] text-[#8c8c8c]">
                        {selectedRegion.skewBiasLabel}
                      </div>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444] text-white font-mono">
                    {selectedRegion.riskTier} ({selectedRegion.riskScore}/100)
                  </span>
                </div>

                {/* Threat Catalyst */}
                <div className="text-[8px] text-[#ccc] leading-relaxed">
                  <strong className="text-[#ef4444]">Catalyst: </strong>
                  {selectedRegion.primaryThreatCatalyst}
                </div>

                {/* Options Impact */}
                <div className="text-[8px] text-[#aaa] leading-relaxed bg-[#1d1d1d] p-1.5 rounded border border-[#262626]">
                  <strong className="text-[#ffd600]">Options Pricing Impact: </strong>
                  {selectedRegion.optionsImpactSummary}
                </div>

                {/* Affected Proxy Tickers with 1-click select */}
                <div className="flex flex-wrap items-center gap-1 text-[8px]">
                  <span className="text-[#8c8c8c] font-mono">Proxy Tickers:</span>
                  {selectedRegion.proxyTickers.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => {
                        playKeyClick();
                        onSelectTicker(sym);
                      }}
                      className="px-1.5 py-0.5 bg-[#222] hover:bg-[#ff9900] hover:text-black text-[#00d2ff] font-bold rounded border border-[#333] transition-all text-[8px] font-mono"
                      title={`Select ${sym} in terminal`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                {/* Hedging Play */}
                <div className="text-[7.5px] text-[#a3e635] bg-[#162512] p-1 rounded border border-[#22501d] leading-tight">
                  <strong>Hedging: </strong>
                  {selectedRegion.recommendedHedgingPlay}
                </div>
              </div>
            )}

            {/* Tariff & Trade War Monitor Quick Trigger */}
            {onNavigateToTariff && (
              <div
                onClick={() => {
                  playKeyClick();
                  onNavigateToTariff();
                }}
                className="p-1.5 bg-[#201508] border border-[#f97316]/50 hover:border-[#f97316] rounded cursor-pointer transition-all flex items-center justify-between text-[8px]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🛡️</span>
                  <div>
                    <span className="text-white font-bold block">TARIFF &amp; TRADE WAR RADAR</span>
                    <span className="text-[#8c8c8c] text-[7px]">6 Active &amp; Proposed Protectionist Regimes</span>
                  </div>
                </div>
                <span className="text-[#ff9900] font-bold text-[8px] flex items-center gap-0.5">
                  Launch &lt;TRFF&gt; &gt;
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: G20 SOVEREIGN YIELD CURVES & RATE MACRO SPREADS                    */}
        {/* ========================================================================= */}
        {activeTab === 'yieldcurve' && (() => {
          const currentYc = G20_YIELD_CURVES.find((c) => c.id === selectedYcCountryId) || G20_YIELD_CURVES[0];
          const minYield = Math.max(0, Math.min(...currentYc.points.map((p) => p.yield)) - 0.5);
          const maxYield = Math.max(...currentYc.points.map((p) => p.yield)) + 0.5;
          const range = Math.max(0.5, maxYield - minYield);

          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] font-bold text-white flex items-center gap-1 font-mono">
                    <LineChart className="w-3.5 h-3.5 text-[#ffd600]" />
                    G20 YIELD CURVES ({G20_YIELD_CURVES.length})
                  </span>
                  <p className="text-[7.5px] text-[#8c8c8c]">
                    Sovereign term structures & carry
                  </p>
                </div>

                {/* Country Selector Dropdown */}
                <select
                  value={selectedYcCountryId}
                  onChange={(e) => {
                    playKeyClick();
                    setSelectedYcCountryId(e.target.value);
                  }}
                  className="bg-[#1a1a1a] border border-[#333] text-[9px] text-[#ffd600] font-bold px-1.5 py-0.5 rounded outline-none cursor-pointer"
                >
                  {G20_YIELD_CURVES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag} {c.id} ({c.yield10Y.toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Country Badge & 2s10s Indicator */}
              <div className="flex items-center justify-between bg-[#141414] p-1.5 rounded border border-[#222] text-[8px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{currentYc.flag}</span>
                  <div>
                    <span className="text-white font-bold">{currentYc.country}</span>
                    <span className="text-[#8c8c8c] text-[7px] block">
                      Rate: {currentYc.policyRate.toFixed(2)}% · Real 10Y: {currentYc.realYield10Y >= 0 ? `+${currentYc.realYield10Y.toFixed(2)}` : currentYc.realYield10Y.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold px-1 py-0.2 rounded ${
                      currentYc.spread2s10s < 0
                        ? 'bg-[#ef4444]/20 text-[#ef4444]'
                        : 'bg-[#22c55e]/20 text-[#22c55e]'
                    }`}
                  >
                    2s10s: {currentYc.spread2s10s > 0 ? `+${currentYc.spread2s10s}` : currentYc.spread2s10s} bps
                  </span>
                  <span className="text-[7px] text-[#8c8c8c] block mt-0.5">
                    10Y: {currentYc.yield10Y.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Yield Curve Mini SVG Visualization */}
              <div className="border border-[#262626] bg-[#0c0c0c] rounded p-1.5">
                <div className="flex justify-between text-[7px] font-mono text-[#777] mb-1">
                  <span>1M ({currentYc.points[0]?.yield.toFixed(2)}%)</span>
                  <span>2Y ({currentYc.yield2Y.toFixed(2)}%)</span>
                  <span>10Y ({currentYc.yield10Y.toFixed(2)}%)</span>
                  <span>30Y ({currentYc.yield30Y.toFixed(2)}%)</span>
                </div>

                {/* Curve Line SVG */}
                <svg width="100%" height="45" viewBox="0 0 220 45" className="overflow-visible block">
                  {(() => {
                    const pts = currentYc.points.map((p, idx) => {
                      const x = 5 + (idx / (currentYc.points.length - 1 || 1)) * 210;
                      const y = 40 - ((p.yield - minYield) / range) * 35;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    const pathCur = `M ${pts.join(' L ')}`;

                    return (
                      <>
                        <path
                          d={pathCur}
                          fill="none"
                          stroke={currentYc.color || '#ffd600'}
                          strokeWidth="2.0"
                          strokeLinecap="round"
                        />
                        {currentYc.points.map((p, idx) => {
                          const x = 5 + (idx / (currentYc.points.length - 1 || 1)) * 210;
                          const y = 40 - ((p.yield - minYield) / range) * 35;
                          return (
                            <circle
                              key={p.tenor}
                              cx={x}
                              cy={y}
                              r="2"
                              fill={currentYc.color || '#ffd600'}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                <div className="flex justify-between items-center text-[7.5px] font-mono pt-1 border-t border-[#1a1a1a]">
                  <span className="text-[#8c8c8c]">
                    Tenor range: {currentYc.points[0]?.tenor} to {currentYc.points[currentYc.points.length - 1]?.tenor}
                  </span>
                  <span
                    className={
                      currentYc.curveShape === 'INVERTED'
                        ? 'text-[#ef4444] font-bold'
                        : currentYc.curveShape === 'STEEP'
                        ? 'text-[#ff9900] font-bold'
                        : 'text-[#22c55e]'
                    }
                  >
                    {currentYc.curveShape}
                  </span>
                </div>
              </div>

              {/* Quick Spreads */}
              <div className="grid grid-cols-2 gap-1 text-[7.5px] font-mono">
                <div className="p-1 bg-[#141414] border border-[#262626] rounded flex justify-between">
                  <span className="text-[#8c8c8c]">2s10s Spread:</span>
                  <span className={`font-bold ${currentYc.spread2s10s < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                    {currentYc.spread2s10s > 0 ? '+' : ''}{currentYc.spread2s10s} bps
                  </span>
                </div>
                <div className="p-1 bg-[#141414] border border-[#262626] rounded flex justify-between">
                  <span className="text-[#8c8c8c]">3M10s (Recession):</span>
                  <span className={`font-bold ${currentYc.spread3m10s < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                    {currentYc.spread3m10s > 0 ? '+' : ''}{currentYc.spread3m10s} bps
                  </span>
                </div>
              </div>

              {/* Launcher to Full G20 Yield Curves Screen */}
              {onNavigateToYieldCurve && (
                <div
                  onClick={() => {
                    playKeyClick();
                    onNavigateToYieldCurve();
                  }}
                  className="p-1.5 bg-[#0a1b24] border border-[#00e5ff]/50 hover:border-[#00e5ff] rounded cursor-pointer transition-all flex items-center justify-between text-[8px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">🌐</span>
                    <div>
                      <span className="text-white font-bold block">ALL G20 YIELD CURVES</span>
                      <span className="text-[#8c8c8c] text-[7px]">Compare 20 Sovereign Bond Markets</span>
                    </div>
                  </div>
                  <span className="text-[#00e5ff] font-bold text-[8px] flex items-center gap-0.5">
                    Launch &lt;YC&gt; &gt;
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
