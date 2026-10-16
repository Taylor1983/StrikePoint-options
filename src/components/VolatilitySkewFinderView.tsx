import React, { useState, useMemo } from 'react';
import { Ticker, ExpirationOptionChain, Position } from '../types/options';
import {
  SKEW_UNIVERSE_DATA,
  SkewUniverseItem,
  SkewAssetClass,
  SkewRegime,
  TickerSkewAnalytics,
  getSkewAnalyticsForTicker,
  SkewTradeOpportunity,
} from '../services/volatilitySkewData';
import { playKeyClick } from '../utils/terminalSound';
import {
  Activity,
  Layers,
  TrendingUp,
  TrendingDown,
  Sliders,
  Filter,
  ArrowUpDown,
  Search,
  Zap,
  ShieldAlert,
  Target,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Percent,
  Check,
  ChevronRight,
  Info,
  DollarSign,
  BarChart2,
  Calendar,
  Flame,
} from 'lucide-react';

interface VolatilitySkewFinderViewProps {
  ticker: Ticker;
  allChains?: ExpirationOptionChain[];
  positions?: Position[];
  onSelectTicker?: (symbol: string) => void;
  onNavigateToChain?: () => void;
  onNavigateToSurface?: () => void;
  onNavigateToCone?: () => void;
  onNavigateToHIVG?: () => void;
  onNavigateToFTS?: () => void;
  onApplyTrade?: (opp: SkewTradeOpportunity) => void;
}

type SkewViewMode = 'universe' | 'curve' | 'trades' | 'term';
type XAxisMetric = 'moneyness' | 'strike' | 'delta';
type UniverseSortField =
  | 'rr25_asc' // Steepest Put Skew (most negative RR)
  | 'rr25_desc' // Flattest / Highest Call Skew
  | 'percentile' // Highest 1Y Skew Percentile
  | 'atm_iv' // Highest IV
  | 'fly25'; // Highest Butterfly / Wings

export const VolatilitySkewFinderView: React.FC<VolatilitySkewFinderViewProps> = ({
  ticker,
  allChains,
  positions = [],
  onSelectTicker,
  onNavigateToChain,
  onNavigateToSurface,
  onNavigateToCone,
  onNavigateToHIVG,
  onNavigateToFTS,
  onApplyTrade,
}) => {
  // Navigation Mode
  const [activeMode, setActiveMode] = useState<SkewViewMode>('universe');

  // Universe Scanner Controls
  const [universeCategory, setUniverseCategory] = useState<SkewAssetClass | 'ALL'>('ALL');
  const [universeSort, setUniverseSort] = useState<UniverseSortField>('rr25_asc');
  const [universeSearch, setUniverseSearch] = useState<string>('');
  const [selectedUniverseSymbol, setSelectedUniverseSymbol] = useState<string>(ticker.symbol);

  // Curve Workstation Controls
  const [xAxisMetric, setXAxisMetric] = useState<XAxisMetric>('moneyness');
  const [selectedTenorDte, setSelectedTenorDte] = useState<number>(30);
  const [showFlatBaseline, setShowFlatBaseline] = useState<boolean>(true);
  const [showPastMonthBaseline, setShowPastMonthBaseline] = useState<boolean>(true);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Skew Simulator Interactive Sliders
  const [simIvBump, setSimIvBump] = useState<number>(0); // -10 to +10 pts
  const [simSkewTilt, setSimSkewTilt] = useState<number>(1.0); // 0.5x (flat) to 2.0x (steep)
  const [simWingCurvature, setSimWingCurvature] = useState<number>(1.0); // 0.5x to 1.8x

  // Trade Execution Notice
  const [stagedTradeNotice, setStagedTradeNotice] = useState<string | null>(null);

  // Active Ticker Analytics
  const activeTickerData: Ticker = useMemo(() => {
    if (selectedUniverseSymbol === ticker.symbol) return ticker;
    const match = SKEW_UNIVERSE_DATA.find((u) => u.symbol === selectedUniverseSymbol);
    if (match) {
      return {
        ...ticker,
        symbol: match.symbol,
        name: match.name,
        price: match.spotPrice,
        change: Number(((match.spotPrice * match.changePct) / 100).toFixed(2)),
        changePercent: match.changePct,
        currentIV: match.atmIv30 / 100,
      };
    }
    return ticker;
  }, [ticker, selectedUniverseSymbol]);

  // Compute Full Skew Analytics
  const analytics: TickerSkewAnalytics = useMemo(() => {
    return getSkewAnalyticsForTicker(activeTickerData, allChains);
  }, [activeTickerData, allChains]);

  // Filtered & Sorted Universe Data
  const filteredUniverse = useMemo(() => {
    let list = [...SKEW_UNIVERSE_DATA];

    if (universeCategory !== 'ALL') {
      list = list.filter((item) => item.assetClass === universeCategory);
    }

    if (universeSearch.trim()) {
      const q = universeSearch.toLowerCase().trim();
      list = list.filter(
        (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (universeSort === 'rr25_asc') return a.riskReversal25 - b.riskReversal25; // Steepest put skew first
      if (universeSort === 'rr25_desc') return b.riskReversal25 - a.riskReversal25; // Flattest/Call skew first
      if (universeSort === 'percentile') return b.skewPercentile1y - a.skewPercentile1y;
      if (universeSort === 'atm_iv') return b.atmIv30 - a.atmIv30;
      if (universeSort === 'fly25') return b.butterfly25 - a.butterfly25;
      return 0;
    });

    return list;
  }, [universeCategory, universeSort, universeSearch]);

  // Simulated Strike Curve with Slider Modifiers
  const simulatedStrikeCurve = useMemo(() => {
    return analytics.strikeCurve.map((pt) => {
      const mOffset = (pt.moneyness - 100) / 100;
      // Apply tilt to skew component
      const rawSkew = pt.blendedIv - analytics.atmIv30;
      const modifiedSkew = rawSkew * simSkewTilt;
      const modifiedWings = (pt.blendedIv - analytics.atmIv30) * (simWingCurvature - 1);
      const modifiedIv = Math.max(
        6,
        Number((analytics.atmIv30 + simIvBump + modifiedSkew + modifiedWings).toFixed(2))
      );

      return {
        ...pt,
        simulatedIv: modifiedIv,
      };
    });
  }, [analytics, simIvBump, simSkewTilt, simWingCurvature]);

  // Chart Dimensions
  const svgWidth = 880;
  const svgHeight = 320;
  const padding = { top: 25, right: 65, bottom: 35, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Min and Max IV for scaling
  const { minIv, maxIv } = useMemo(() => {
    const vals: number[] = [];
    simulatedStrikeCurve.forEach((p) => {
      vals.push(p.blendedIv, p.theoreticalFlatIv, p.oneMonthAgoIv, p.simulatedIv);
    });
    const minVal = Math.max(5, Math.floor(Math.min(...vals) * 0.88));
    const maxVal = Math.ceil(Math.max(...vals) * 1.12);
    return { minIv: minVal, maxIv: Math.max(maxVal, minVal + 12) };
  }, [simulatedStrikeCurve]);

  // Coordinate mappers
  const getX = (index: number) => {
    return padding.left + (index / (simulatedStrikeCurve.length - 1 || 1)) * plotWidth;
  };

  const getY = (iv: number) => {
    const clamped = Math.max(minIv, Math.min(maxIv, iv));
    return padding.top + plotHeight - ((clamped - minIv) / (maxIv - minIv || 1)) * plotHeight;
  };

  // Build SVG path
  const currentCurvePath = useMemo(() => {
    let d = '';
    simulatedStrikeCurve.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.simulatedIv);
      d += `${idx === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  }, [simulatedStrikeCurve, minIv, maxIv]);

  const pastMonthPath = useMemo(() => {
    if (!showPastMonthBaseline) return '';
    let d = '';
    simulatedStrikeCurve.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.oneMonthAgoIv);
      d += `${idx === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  }, [simulatedStrikeCurve, showPastMonthBaseline, minIv, maxIv]);

  const flatBaselinePath = useMemo(() => {
    if (!showFlatBaseline) return '';
    const y = getY(analytics.atmIv30);
    return `M ${padding.left} ${y.toFixed(1)} L ${svgWidth - padding.right} ${y.toFixed(1)}`;
  }, [showFlatBaseline, analytics.atmIv30, minIv, maxIv]);

  // Stage Trade Handler
  const handleStageTrade = (opp: SkewTradeOpportunity) => {
    playKeyClick();
    if (onApplyTrade) {
      onApplyTrade(opp);
    }
    setStagedTradeNotice(`Staged ${opp.strategyBadge}: ${opp.title}`);
    setTimeout(() => setStagedTradeNotice(null), 3500);
  };

  // Active Hovered Point
  const activePt =
    hoveredPointIdx !== null && simulatedStrikeCurve[hoveredPointIdx]
      ? simulatedStrikeCurve[hoveredPointIdx]
      : simulatedStrikeCurve[Math.floor(simulatedStrikeCurve.length / 2)];

  return (
    <div className="p-2 sm:p-4 w-full max-w-full ml-0 mr-auto flex flex-col gap-3 font-mono text-xs select-none text-left">
      {/* ========================================================
          1. INSTITUTIONAL BLOOMBERG TERMINAL TOP HEADER
      ======================================================== */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded-t-lg shadow-2xl overflow-hidden">
        <div className="bg-[#090d16] px-4 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
          {/* Left: Command & Ticker Badge */}
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 bg-[#ff9900] text-black font-black rounded text-xs tracking-wider">
              SKEW &lt;GO&gt;
            </span>
            <span className="text-[#ff9900] font-black text-sm tracking-wide">
              {activeTickerData.symbol}
            </span>
            <span className="text-white font-bold hidden sm:inline">{activeTickerData.name}</span>
            <span className="text-[#8b9bb4] text-[11px] hidden md:inline">
              // VOLATILITY SKEW FINDER &amp; ARBITRAGE SCANNER
            </span>
            <div className="flex items-center gap-2 text-xs bg-[#111726] px-2.5 py-0.5 rounded border border-[#1e2638]">
              <span className="text-[#8b9bb4]">LAST:</span>
              <strong className="text-white">${activeTickerData.price.toFixed(2)}</strong>
              <span
                className={`font-bold ${
                  activeTickerData.change >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                }`}
              >
                {activeTickerData.change >= 0 ? '+' : ''}
                {activeTickerData.change.toFixed(2)} ({activeTickerData.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Right: Quick Terminal Navigation Keys */}
          <div className="flex items-center gap-2 text-[11px]">
            {onNavigateToChain && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToChain();
                }}
                className="px-2 py-0.5 rounded border border-[#2d3748] bg-[#141b2a] text-[#8b9bb4] hover:text-[#ff9900] hover:border-[#ff9900] transition-colors"
              >
                &lt;OMON CHAIN&gt;
              </button>
            )}
            {onNavigateToSurface && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToSurface();
                }}
                className="px-2 py-0.5 rounded border border-[#2d3748] bg-[#141b2a] text-[#8b9bb4] hover:text-[#00e5ff] hover:border-[#00e5ff] transition-colors"
              >
                &lt;SURF 3D&gt;
              </button>
            )}
            {onNavigateToHIVG && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToHIVG();
                }}
                className="px-2 py-0.5 rounded border border-[#2d3748] bg-[#141b2a] text-[#8b9bb4] hover:text-[#fbbf24] hover:border-[#fbbf24] transition-colors"
              >
                &lt;HIVG VOL&gt;
              </button>
            )}
            {onNavigateToFTS && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToFTS();
                }}
                className="px-2 py-0.5 rounded border border-[#ff9900]/40 bg-[#ff9900]/10 text-[#ff9900] hover:bg-[#ff9900] hover:text-black font-bold transition-all flex items-center gap-1"
              >
                <span>&lt;FTS CURVE&gt;</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Volatility Skew KPI HUD Strip */}
        <div className="bg-[#05070a] px-4 py-2 border-b border-[#141b2a] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-[11px]">
          <div>
            <div className="text-[#8b9bb4] text-[10px]">30D ATM IV</div>
            <div className="text-base font-black text-white">{analytics.atmIv30.toFixed(1)}%</div>
            <div className="text-[9px] text-[#8b9bb4]">Neutral Baseline</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">25Δ RISK REVERSAL</div>
            <div
              className={`text-base font-black ${
                analytics.rr25 < 0 ? 'text-[#ff334b]' : 'text-[#00e5ff]'
              }`}
            >
              {analytics.rr25 >= 0 ? '+' : ''}
              {analytics.rr25.toFixed(1)} pts
            </div>
            <div className="text-[9px] text-[#8b9bb4]">
              {analytics.rr25 < 0 ? 'Put Bid > Call' : 'Call Bid > Put'}
            </div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">10Δ TAIL SKEW</div>
            <div
              className={`text-base font-black ${
                analytics.rr10 < 0 ? 'text-[#ff334b]' : 'text-[#00e5ff]'
              }`}
            >
              {analytics.rr10 >= 0 ? '+' : ''}
              {analytics.rr10.toFixed(1)} pts
            </div>
            <div className="text-[9px] text-[#8b9bb4]">Black Swan Wing</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">25Δ BUTTERFLY (FLY)</div>
            <div className="text-base font-black text-[#fbbf24]">
              +{analytics.fly25.toFixed(2)} pts
            </div>
            <div className="text-[9px] text-[#8b9bb4]">Smile Curvature</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">SKEW SLOPE (dσ/dK)</div>
            <div className="text-base font-black text-white">{analytics.skewSlope.toFixed(2)}</div>
            <div className="text-[9px] text-[#8b9bb4]">Slope Steeper &gt;0.3</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">1Y SKEW PERCENTILE</div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[#ff9900]">
                {analytics.skewPercentile1y}%
              </span>
              <div className="w-12 h-1.5 bg-[#1e2638] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff9900]"
                  style={{ width: `${analytics.skewPercentile1y}%` }}
                />
              </div>
            </div>
            <div className="text-[9px] text-[#8b9bb4]">
              {analytics.skewPercentile1y >= 80 ? 'Historically Steep' : 'Historically Calm'}
            </div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">REGIME STATUS</div>
            <span
              className="inline-block text-[10px] font-black px-1.5 py-0.5 rounded border mt-0.5"
              style={{
                borderColor: analytics.overallRegimeColor,
                color: analytics.overallRegimeColor,
                backgroundColor: `${analytics.overallRegimeColor}15`,
              }}
            >
              {analytics.overallRegime.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* View Mode Switcher Sub-Tabs */}
        <div className="bg-[#080d16] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638]">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'universe', label: '[1] UNIVERSE SKEW SCANNER', icon: BarChart2 },
              { id: 'curve', label: '[2] DETAILED SKEW CURVE', icon: Activity },
              { id: 'trades', label: '[3] SKEW TRADE FINDER', icon: Target },
              { id: 'term', label: '[4] TERM STRUCTURE & SIMULATOR', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playKeyClick();
                    setActiveMode(tab.id as SkewViewMode);
                  }}
                  className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                      : 'bg-[#101726] border border-[#1e2638] text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Staged trade success notice */}
          {stagedTradeNotice && (
            <div className="text-[11px] text-[#00e676] bg-[#00e676]/10 border border-[#00e676]/40 px-2 py-0.5 rounded font-bold animate-pulse">
              {stagedTradeNotice}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          2. VIEW 1: UNIVERSE SKEW SCANNER (CROSS-ASSET RANKINGS)
      ======================================================== */}
      {activeMode === 'universe' && (
        <div className="bg-[#070a12] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-3 shadow-xl">
          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1c] p-2.5 rounded border border-[#1e2638]">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[#64748b] text-[10px] font-bold mr-1">SECTOR:</span>
              {(['ALL', 'TECH', 'INDEX', 'CANADIAN', 'COMMODITY', 'CRYPTO'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      playKeyClick();
                      setUniverseCategory(cat);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      universeCategory === cat
                        ? 'bg-[#00e5ff] text-black border-[#00e5ff] font-black'
                        : 'bg-[#101726] border-[#1e2638] text-[#8b9bb4] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Sorter Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#64748b] text-[10px] font-bold flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                <span>SORT BY:</span>
              </span>
              <select
                value={universeSort}
                onChange={(e) => {
                  playKeyClick();
                  setUniverseSort(e.target.value as UniverseSortField);
                }}
                className="bg-[#121929] border border-[#2d3748] text-white text-[10px] rounded px-2 py-1 outline-none font-bold"
              >
                <option value="rr25_asc">Steepest Put Skew (High Crash Bid)</option>
                <option value="rr25_desc">Flattest / Call Skew Surge</option>
                <option value="percentile">1Y Skew Percentile (Highest)</option>
                <option value="atm_iv">ATM Implied Volatility (Highest)</option>
                <option value="fly25">25Δ Butterfly (Fat Tails)</option>
              </select>

              {/* Ticker Search */}
              <div className="relative">
                <Search className="w-3 h-3 text-[#64748b] absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Filter ticker..."
                  value={universeSearch}
                  onChange={(e) => setUniverseSearch(e.target.value)}
                  className="bg-[#121929] border border-[#2d3748] text-white text-[10px] rounded pl-6 pr-2 py-1 w-32 outline-none uppercase font-bold"
                />
              </div>
            </div>
          </div>

          {/* Cross-Asset Skew Universe Table */}
          <div className="overflow-x-auto border border-[#1e2638] rounded">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#0c1220] text-[#8b9bb4] border-b border-[#1e2638] text-[10px]">
                  <th className="p-2 font-bold">TICKER / NAME</th>
                  <th className="p-2 font-bold">ASSET CLASS</th>
                  <th className="p-2 font-bold text-right">LAST</th>
                  <th className="p-2 font-bold text-right">30D ATM IV</th>
                  <th className="p-2 font-bold text-right">25Δ PUT IV</th>
                  <th className="p-2 font-bold text-right">25Δ CALL IV</th>
                  <th className="p-2 font-bold text-right">25Δ RISK REV</th>
                  <th className="p-2 font-bold text-right">10Δ TAIL RR</th>
                  <th className="p-2 font-bold text-right">25Δ FLY</th>
                  <th className="p-2 font-bold text-center">1Y SKEW %ILE</th>
                  <th className="p-2 font-bold">SKEW REGIME</th>
                  <th className="p-2 font-bold">INSTITUTIONAL STRATEGY BIAS</th>
                  <th className="p-2 font-bold text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2c]">
                {filteredUniverse.map((item) => {
                  const isSelected = selectedUniverseSymbol === item.symbol;
                  const isPutSkew = item.riskReversal25 < 0;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => {
                        playKeyClick();
                        setSelectedUniverseSymbol(item.symbol);
                        if (onSelectTicker) onSelectTicker(item.symbol);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#18233a] border-l-2 border-[#ff9900]'
                          : 'hover:bg-[#0f1626]'
                      }`}
                    >
                      <td className="p-2 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#ff9900] font-black">{item.symbol}</span>
                          <span className="text-[#8b9bb4] text-[9.5px] truncate max-w-[130px]">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      <td className="p-2">
                        <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 border border-[#2d3748] text-[#8b9bb4] font-bold">
                          {item.assetClass}
                        </span>
                      </td>

                      <td className="p-2 text-right font-mono font-bold text-white">
                        ${item.spotPrice.toFixed(2)}
                      </td>

                      <td className="p-2 text-right font-mono text-white font-bold">
                        {item.atmIv30.toFixed(1)}%
                      </td>

                      <td className="p-2 text-right font-mono text-[#ff334b]">
                        {item.putIv25.toFixed(1)}%
                      </td>

                      <td className="p-2 text-right font-mono text-[#00e5ff]">
                        {item.callIv25.toFixed(1)}%
                      </td>

                      <td
                        className={`p-2 text-right font-mono font-black ${
                          isPutSkew ? 'text-[#ff334b]' : 'text-[#00e5ff]'
                        }`}
                      >
                        {item.riskReversal25 >= 0 ? '+' : ''}
                        {item.riskReversal25.toFixed(1)} pts
                      </td>

                      <td
                        className={`p-2 text-right font-mono ${
                          item.riskReversal10 < 0 ? 'text-[#ff334b]' : 'text-[#00e5ff]'
                        }`}
                      >
                        {item.riskReversal10 >= 0 ? '+' : ''}
                        {item.riskReversal10.toFixed(1)} pts
                      </td>

                      <td className="p-2 text-right font-mono text-[#fbbf24]">
                        +{item.butterfly25.toFixed(2)}
                      </td>

                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono font-bold text-[#ff9900]">
                            {item.skewPercentile1y}%
                          </span>
                          <div className="w-10 h-1.5 bg-[#151c2e] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                item.skewPercentile1y >= 80 ? 'bg-[#ff334b]' : 'bg-[#ff9900]'
                              }`}
                              style={{ width: `${item.skewPercentile1y}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-2">
                        <span
                          className="px-1.5 py-0.2 rounded border text-[9px] font-black"
                          style={{
                            borderColor: item.regimeColor,
                            color: item.regimeColor,
                            backgroundColor: `${item.regimeColor}12`,
                          }}
                        >
                          {item.regimeLabel}
                        </span>
                      </td>

                      <td className="p-2 text-[10px] text-[#cbd5e1] max-w-[220px] truncate">
                        {item.tradeBias}
                      </td>

                      <td className="p-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playKeyClick();
                            setSelectedUniverseSymbol(item.symbol);
                            setActiveMode('curve');
                          }}
                          className="px-2 py-0.5 rounded bg-[#ff9900]/20 hover:bg-[#ff9900] text-[#ff9900] hover:text-black font-bold text-[9.5px] transition-all"
                        >
                          CHART SKEW
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          3. VIEW 2: DETAILED SKEW CURVE WORKSTATION
      ======================================================== */}
      {activeMode === 'curve' && (
        <div className="bg-[#070a12] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-3 shadow-xl">
          {/* Workstation Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1c] p-2.5 rounded border border-[#1e2638]">
            {/* X-Axis Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#8b9bb4] text-[10px] font-bold">X-AXIS METRIC:</span>
              <div className="flex items-center gap-1 bg-[#121929] p-0.5 rounded border border-[#1e2638]">
                {[
                  { id: 'moneyness', label: 'MONEYNESS (K/S %)' },
                  { id: 'strike', label: 'STRIKE ($)' },
                  { id: 'delta', label: 'DELTA (Δ)' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => {
                      playKeyClick();
                      setXAxisMetric(btn.id as XAxisMetric);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      xAxisMetric === btn.id
                        ? 'bg-[#ff9900] text-black font-black shadow-sm'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Baseline Overlays Toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFlatBaseline}
                  onChange={(e) => {
                    playKeyClick();
                    setShowFlatBaseline(e.target.checked);
                  }}
                  className="accent-[#00e5ff] rounded"
                />
                <span className="w-2.5 h-0.5 bg-[#00e5ff] inline-block" />
                <span className="text-[#8b9bb4]">Flat Vol Baseline</span>
              </label>

              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPastMonthBaseline}
                  onChange={(e) => {
                    playKeyClick();
                    setShowPastMonthBaseline(e.target.checked);
                  }}
                  className="accent-[#c084fc] rounded"
                />
                <span className="w-2.5 h-0.5 bg-[#c084fc] border-t border-dashed inline-block" />
                <span className="text-[#8b9bb4]">1M Ago Skew</span>
              </label>

              {/* Tenor Maturity Pills */}
              <div className="flex items-center gap-1 ml-2">
                {[7, 30, 60, 90, 180].map((dte) => (
                  <button
                    key={dte}
                    onClick={() => {
                      playKeyClick();
                      setSelectedTenorDte(dte);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all ${
                      selectedTenorDte === dte
                        ? 'bg-[#ff9900] text-black border-[#ff9900]'
                        : 'bg-[#101726] border-[#1e2638] text-[#8b9bb4] hover:text-white'
                    }`}
                  >
                    {dte}D
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive SVG Skew Curve Viewport */}
          <div className="bg-[#05070a] border border-[#1e2638] rounded-lg p-2 relative overflow-hidden">
            {/* Top Legend Readout */}
            <div className="flex flex-wrap items-center justify-between text-[11px] mb-1 px-2">
              <div className="flex items-center gap-3">
                <span className="text-[#ff9900] font-black">
                  ── ACTIVE SKEW SMIRK ({selectedTenorDte}D Tenor)
                </span>
                {showPastMonthBaseline && (
                  <span className="text-[#c084fc]">┈┈ 1-Month Ago Curve</span>
                )}
                {showFlatBaseline && (
                  <span className="text-[#00e5ff]">
                    ── Flat ATM Baseline ({analytics.atmIv30.toFixed(1)}%)
                  </span>
                )}
              </div>

              {/* Cursor Point Inspection */}
              {activePt && (
                <div className="flex items-center gap-2 bg-[#0d1424] px-2 py-0.5 rounded border border-[#1e2638] text-[10px]">
                  <span className="text-[#8b9bb4]">Strike:</span>
                  <strong className="text-white">${activePt.strike.toFixed(2)}</strong>
                  <span className="text-[#8b9bb4]">Moneyness:</span>
                  <strong className="text-[#ff9900]">{activePt.moneyness}%</strong>
                  <span className="text-[#8b9bb4]">Delta:</span>
                  <strong className="text-[#00e676]">{activePt.delta}Δ</strong>
                  <span className="text-[#8b9bb4]">IV:</span>
                  <strong className="text-[#00e5ff]">{activePt.simulatedIv.toFixed(1)}%</strong>
                </div>
              )}
            </div>

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[360px] select-none cursor-crosshair"
              onMouseLeave={() => setHoveredPointIdx(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
                const relX = mouseX - padding.left;
                const ratio = Math.max(0, Math.min(1, relX / plotWidth));
                const idx = Math.round(ratio * (simulatedStrikeCurve.length - 1));
                if (idx >= 0 && idx < simulatedStrikeCurve.length) {
                  setHoveredPointIdx(idx);
                }
              }}
            >
              {/* Horizontal Volatility Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const ivVal = minIv + (maxIv - minIv) * pct;
                const y = getY(ivVal);
                return (
                  <g key={`iv-grid-${idx}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#141c2c"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={padding.left - 6}
                      y={y + 3.5}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                    >
                      {ivVal.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* Vertical Moneyness / Strike Gridlines */}
              {simulatedStrikeCurve.map((pt, idx) => {
                if (idx % 4 !== 0 && idx !== simulatedStrikeCurve.length - 1) return null;
                const x = getX(idx);
                const label =
                  xAxisMetric === 'moneyness'
                    ? `${pt.moneyness}%`
                    : xAxisMetric === 'strike'
                    ? `$${pt.strike.toFixed(0)}`
                    : `${pt.delta}Δ`;

                return (
                  <g key={`x-grid-${idx}`}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + plotHeight}
                      stroke="#141c2c"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={x}
                      y={padding.top + plotHeight + 16}
                      fill="#8b9bb4"
                      fontSize="8.5"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Spot Price Vertical Line (100% Moneyness) */}
              {(() => {
                const atmIdx = simulatedStrikeCurve.findIndex((p) => p.moneyness >= 100);
                if (atmIdx >= 0) {
                  const atmX = getX(atmIdx);
                  return (
                    <g>
                      <line
                        x1={atmX}
                        y1={padding.top}
                        x2={atmX}
                        y2={padding.top + plotHeight}
                        stroke="#00e5ff"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.7"
                      />
                      <rect
                        x={atmX - 28}
                        y={padding.top - 18}
                        width={56}
                        height={14}
                        rx="2"
                        fill="#00e5ff"
                      />
                      <text
                        x={atmX}
                        y={padding.top - 8}
                        fill="#000"
                        fontSize="8"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        ATM SPOT
                      </text>
                    </g>
                  );
                }
                return null;
              })()}

              {/* Theoretical Flat Baseline */}
              {showFlatBaseline && (
                <path
                  d={flatBaselinePath}
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.6"
                />
              )}

              {/* 1-Month-Ago Skew Path */}
              {showPastMonthBaseline && (
                <path
                  d={pastMonthPath}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                  opacity="0.75"
                />
              )}

              {/* Active Volatility Skew Curve */}
              <path
                d={currentCurvePath}
                fill="none"
                stroke="#ff9900"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_rgba(255,153,0,0.5)]"
              />

              {/* Curve Data Nodes */}
              {simulatedStrikeCurve.map((pt, idx) => {
                if (idx % 2 !== 0) return null;
                const x = getX(idx);
                const y = getY(pt.simulatedIv);
                const isHovered = hoveredPointIdx === idx;

                return (
                  <circle
                    key={`node-${idx}`}
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 3}
                    fill={isHovered ? '#ffffff' : '#ff9900'}
                    stroke="#05070a"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Crosshair Cursor on Hover */}
              {hoveredPointIdx !== null && (
                <g>
                  <line
                    x1={getX(hoveredPointIdx)}
                    y1={padding.top}
                    x2={getX(hoveredPointIdx)}
                    y2={padding.top + plotHeight}
                    stroke="#ff9900"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={padding.left}
                    y1={getY(activePt.simulatedIv)}
                    x2={svgWidth - padding.right}
                    y2={getY(activePt.simulatedIv)}
                    stroke="#ff9900"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <rect
                    x={svgWidth - padding.right + 2}
                    y={getY(activePt.simulatedIv) - 7}
                    width={58}
                    height={14}
                    rx="2"
                    fill="#ff9900"
                  />
                  <text
                    x={svgWidth - padding.right + 31}
                    y={getY(activePt.simulatedIv) + 3.5}
                    fill="#000"
                    fontSize="8.5"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    {activePt.simulatedIv.toFixed(1)}%
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* ========================================================
          4. VIEW 3: SKEW TRADE FINDER (QUANT OPPORTUNITIES)
      ======================================================== */}
      {activeMode === 'trades' && (
        <div className="bg-[#070a12] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#ff9900]" />
              <span className="text-white font-extrabold text-sm">
                QUANT SKEW ARBITRAGE &amp; MISPRICING OPPORTUNITY FINDER
              </span>
            </div>
            <span className="text-[#8b9bb4] text-[10px]">
              {analytics.opportunities.length} Algorithmic Setups Ranked by Skew Edge
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-[#0b0f19] border border-[#1e2638] hover:border-[#ff9900]/70 rounded-lg p-3 flex flex-col justify-between gap-2.5 transition-all shadow-md group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#ff9900]/15 border border-[#ff9900]/50 text-[#ff9900] font-black text-[9.5px]">
                      {opp.strategyBadge}
                    </span>
                    <span className="text-[10px] text-[#8b9bb4] font-mono">{opp.expiration}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                        opp.urgency === 'HIGH'
                          ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                          : 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                      }`}
                    >
                      {opp.urgency} EDGE
                    </span>
                  </div>

                  <h4 className="text-white font-black text-xs group-hover:text-[#ff9900] transition-colors">
                    {opp.title}
                  </h4>

                  <div className="bg-[#06080e] p-2 rounded border border-[#141b2a] my-2 text-[10.5px] font-mono">
                    <div className="text-[#00e5ff] font-bold">{opp.legsDescription}</div>
                    <div className="flex justify-between items-center text-[#8b9bb4] mt-1 text-[9.5px]">
                      <span>Skew Edge:</span>
                      <strong className="text-[#fbbf24]">{opp.skewEdge}</strong>
                    </div>
                  </div>

                  <p className="text-[#cbd5e1] text-[11px] leading-relaxed mb-2">
                    {opp.rationale}
                  </p>
                </div>

                <div className="border-t border-[#141b2a] pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[10px]">
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">NET PREMIUM</span>
                      <strong className={opp.isCredit ? 'text-[#00e676]' : 'text-white'}>
                        {opp.netPremium}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">MAX PROFIT</span>
                      <strong className="text-white">{opp.maxProfit}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">EST. POP</span>
                      <strong className="text-[#00e5ff]">{opp.pop}%</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStageTrade(opp)}
                    className="px-3 py-1 bg-[#ff9900] hover:bg-[#e68a00] text-black font-black rounded text-[10.5px] flex items-center gap-1 shadow-md transition-all active:scale-95"
                  >
                    <span>LOAD STRATEGY</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          5. VIEW 4: SKEW TERM STRUCTURE & INTERACTIVE SIMULATOR
      ======================================================== */}
      {activeMode === 'term' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Col 1 & 2: Skew Term Structure Curve & Table */}
          <div className="lg:col-span-2 bg-[#070a12] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
              <span className="text-white font-extrabold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#ff9900]" />
                <span>TERM STRUCTURE OF 25-DELTA RISK REVERSAL &amp; DECAY</span>
              </span>
              <span className="text-[#8b9bb4] text-[10px]">Power-Law Decay (1 / √T)</span>
            </div>

            <div className="overflow-x-auto border border-[#1e2638] rounded">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0a0f1c] text-[#8b9bb4] border-b border-[#1e2638] text-[10px]">
                    <th className="p-2 font-bold">MATURITY</th>
                    <th className="p-2 font-bold text-right">DTE</th>
                    <th className="p-2 font-bold text-right">ATM IV</th>
                    <th className="p-2 font-bold text-right">25Δ PUT</th>
                    <th className="p-2 font-bold text-right">25Δ CALL</th>
                    <th className="p-2 font-bold text-right">25Δ RR</th>
                    <th className="p-2 font-bold text-right">25Δ FLY</th>
                    <th className="p-2 font-bold text-right">SKEW SLOPE</th>
                    <th className="p-2 font-bold text-right">25Δ PUT STRIKE</th>
                    <th className="p-2 font-bold text-right">25Δ CALL STRIKE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131b2c] font-mono">
                  {analytics.termStructure.map((t) => (
                    <tr key={t.dte} className="hover:bg-[#0f1626]">
                      <td className="p-2 font-bold text-white">{t.formattedDate}</td>
                      <td className="p-2 text-right text-[#8b9bb4]">{t.dte}d</td>
                      <td className="p-2 text-right text-white">{t.atmIv.toFixed(1)}%</td>
                      <td className="p-2 text-right text-[#ff334b]">{t.putIv25.toFixed(1)}%</td>
                      <td className="p-2 text-right text-[#00e5ff]">{t.callIv25.toFixed(1)}%</td>
                      <td
                        className={`p-2 text-right font-black ${
                          t.rr25 < 0 ? 'text-[#ff334b]' : 'text-[#00e5ff]'
                        }`}
                      >
                        {t.rr25 >= 0 ? '+' : ''}
                        {t.rr25.toFixed(1)} pts
                      </td>
                      <td className="p-2 text-right text-[#fbbf24]">+{t.fly25.toFixed(2)}</td>
                      <td className="p-2 text-right text-white">{t.skewSlope.toFixed(2)}</td>
                      <td className="p-2 text-right text-[#ff334b]">${t.put25Strike}</td>
                      <td className="p-2 text-right text-[#00e5ff]">${t.call25Strike}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Col 3: Interactive Skew Shock Simulator */}
          <div className="bg-[#070a12] border border-[#1e2638] rounded-lg p-3 flex flex-col justify-between gap-3 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5 mb-3">
                <span className="text-[#ff9900] font-black text-xs flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>SKEW STRESS SIMULATOR</span>
                </span>
                <button
                  onClick={() => {
                    playKeyClick();
                    setSimIvBump(0);
                    setSimSkewTilt(1.0);
                    setSimWingCurvature(1.0);
                  }}
                  className="text-[10px] text-[#8b9bb4] hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>RESET</span>
                </button>
              </div>

              {/* Slider 1: Parallel IV Bump */}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8b9bb4]">Parallel IV Shift:</span>
                  <strong className={simIvBump >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                    {simIvBump >= 0 ? '+' : ''}
                    {simIvBump.toFixed(1)}% IV
                  </strong>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={simIvBump}
                  onChange={(e) => setSimIvBump(parseFloat(e.target.value))}
                  className="w-full accent-[#ff9900] h-1.5 bg-[#151c2e] rounded cursor-pointer"
                />
              </div>

              {/* Slider 2: Skew Steepening Tilt */}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8b9bb4]">Skew Slope Tilt:</span>
                  <strong className="text-[#00e5ff]">{simSkewTilt.toFixed(2)}x (Multiplier)</strong>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={simSkewTilt}
                  onChange={(e) => setSimSkewTilt(parseFloat(e.target.value))}
                  className="w-full accent-[#00e5ff] h-1.5 bg-[#151c2e] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[#64748b]">
                  <span>Flat Skew (0.4x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Extreme Steep (2.2x)</span>
                </div>
              </div>

              {/* Slider 3: Wing Curvature (Butterfly) */}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8b9bb4]">Wing Fatness (Fly):</span>
                  <strong className="text-[#fbbf24]">
                    {simWingCurvature.toFixed(2)}x (Kurtosis)
                  </strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={simWingCurvature}
                  onChange={(e) => setSimWingCurvature(parseFloat(e.target.value))}
                  className="w-full accent-[#fbbf24] h-1.5 bg-[#151c2e] rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-[#0b101c] p-2.5 rounded border border-[#1e2638] text-[10.5px]">
              <span className="text-[#ff9900] font-black block mb-1">
                STRESS TEST IMPLICATIONS:
              </span>
              <p className="text-[#94a3b8] leading-relaxed">
                Steepening skew to {simSkewTilt.toFixed(2)}x inflates 25-delta put values by{' '}
                <strong className="text-white">
                  +{(Math.abs(analytics.rr25) * (simSkewTilt - 1)).toFixed(1)} pts
                </strong>
                . Risk reversals will yield richer positive carry while OTM put spreads expand in
                premium.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
