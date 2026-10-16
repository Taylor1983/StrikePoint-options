import React, { useState, useMemo, useEffect } from 'react';
import { Ticker, ExpirationOptionChain, OptionContract, Position, TradeLeg } from '../types/options';
import {
  calculateSkewMetricsForChain,
  ExpirationSkewSummary,
} from '../utils/blackScholes';
import { generateAllOptionChainsForTicker } from '../services/marketData';
import { playKeyClick } from '../utils/terminalSound';
import {
  Activity,
  Layers,
  Grid,
  TrendingUp,
  Info,
  Calendar,
  Eye,
  Check,
  BarChart2,
  Sliders,
  ChevronRight,
  ArrowRight,
  Box,
  Palette,
  Zap,
} from 'lucide-react';
import { HistoricalImpliedVolChart } from './HistoricalImpliedVolChart';
import { VolatilitySurface3D } from './VolatilitySurface3D';
import { VegaTermStructureView } from './VegaTermStructureView';

interface VolatilityLabViewProps {
  ticker: Ticker;
  chain: ExpirationOptionChain;
  allChains?: ExpirationOptionChain[];
  positions?: Position[];
  legs?: TradeLeg[];
  selectedDte?: number;
  initialTab?: 'overlay' | 'term' | 'vega' | 'combined' | 'surface' | 'single' | 'hivg';
  onSelectDte?: (dte: number) => void;
  onNavigateToChain?: () => void;
  onNavigateToCone?: () => void;
  onNavigateToValuation?: () => void;
  onNavigateToVega?: () => void;
  onNavigateToSkewFinder?: () => void;
  onApplyStrategyTemplate?: (templateId: string) => void;
}

// Institutional Bloomberg Terminal colors for expiration curves
export interface ExpiryColorStyle {
  stroke: string;
  label: string;
  bg: string;
  glow: string;
}

// Curated high-contrast palette guaranteeing every expiration gets a distinct color
export const EXPIRY_COLOR_PALETTE: ExpiryColorStyle[] = [
  { stroke: '#ef4444', label: 'Crimson', bg: 'bg-red-500', glow: 'rgba(239, 68, 68, 0.45)' },        // 0D Front
  { stroke: '#f97316', label: 'Tangerine', bg: 'bg-orange-500', glow: 'rgba(249, 115, 22, 0.45)' },  // 2D
  { stroke: '#ff9900', label: 'Amber', bg: 'bg-[#ff9900]', glow: 'rgba(255, 153, 0, 0.45)' },        // 5D
  { stroke: '#facc15', label: 'Gold', bg: 'bg-yellow-400', glow: 'rgba(250, 204, 21, 0.45)' },       // 9D
  { stroke: '#a3e635', label: 'Chartreuse', bg: 'bg-lime-400', glow: 'rgba(163, 230, 53, 0.45)' },   // 12D
  { stroke: '#84cc16', label: 'Lime', bg: 'bg-lime-500', glow: 'rgba(132, 204, 22, 0.45)' },         // 16D
  { stroke: '#22c55e', label: 'Neon Green', bg: 'bg-green-500', glow: 'rgba(34, 197, 94, 0.45)' },   // 19D
  { stroke: '#10b981', label: 'Emerald', bg: 'bg-emerald-500', glow: 'rgba(16, 185, 129, 0.45)' },   // 23D
  { stroke: '#06b6d4', label: 'Cyan', bg: 'bg-cyan-500', glow: 'rgba(6, 182, 212, 0.45)' },          // 30D
  { stroke: '#00e5ff', label: 'Electric Cyan', bg: 'bg-[#00e5ff]', glow: 'rgba(0, 229, 255, 0.45)' }, // 33D
  { stroke: '#38bdf8', label: 'Sky Blue', bg: 'bg-sky-400', glow: 'rgba(56, 189, 248, 0.45)' },      // 45D
  { stroke: '#3b82f6', label: 'Cobalt', bg: 'bg-blue-500', glow: 'rgba(59, 130, 246, 0.45)' },        // 60D
  { stroke: '#4f46e5', label: 'Royal Blue', bg: 'bg-indigo-600', glow: 'rgba(79, 70, 229, 0.45)' },  // 61D
  { stroke: '#6366f1', label: 'Indigo', bg: 'bg-indigo-500', glow: 'rgba(99, 102, 241, 0.45)' },     // 90D
  { stroke: '#8b5cf6', label: 'Violet', bg: 'bg-violet-500', glow: 'rgba(139, 92, 246, 0.45)' },     // 120D
  { stroke: '#a855f7', label: 'Purple', bg: 'bg-purple-500', glow: 'rgba(168, 85, 247, 0.45)' },     // 180D
  { stroke: '#c084fc', label: 'Orchid', bg: 'bg-purple-400', glow: 'rgba(192, 132, 252, 0.45)' },     // 270D
  { stroke: '#ec4899', label: 'Pink', bg: 'bg-pink-500', glow: 'rgba(236, 72, 153, 0.45)' },         // 365D
  { stroke: '#f43f5e', label: 'Rose', bg: 'bg-rose-500', glow: 'rgba(244, 63, 94, 0.45)' },          // 540D
  { stroke: '#14b8a6', label: 'Teal', bg: 'bg-teal-500', glow: 'rgba(20, 184, 166, 0.45)' },         // 720D
];

// Dedicated color matching for all standard expiration presets
export const DTE_EXPLICIT_COLORS: Record<number, ExpiryColorStyle> = {
  0: { stroke: '#ef4444', label: 'Crimson (0D)', bg: 'bg-red-500', glow: 'rgba(239, 68, 68, 0.5)' },
  2: { stroke: '#f97316', label: 'Tangerine (2D)', bg: 'bg-orange-500', glow: 'rgba(249, 115, 22, 0.5)' },
  5: { stroke: '#ff9900', label: 'Amber (5D)', bg: 'bg-[#ff9900]', glow: 'rgba(255, 153, 0, 0.5)' },
  9: { stroke: '#facc15', label: 'Gold (9D)', bg: 'bg-yellow-400', glow: 'rgba(250, 204, 21, 0.5)' },
  12: { stroke: '#a3e635', label: 'Chartreuse (12D)', bg: 'bg-lime-400', glow: 'rgba(163, 230, 53, 0.5)' },
  16: { stroke: '#84cc16', label: 'Lime (16D)', bg: 'bg-lime-500', glow: 'rgba(132, 204, 22, 0.5)' },
  19: { stroke: '#22c55e', label: 'Green (19D)', bg: 'bg-green-500', glow: 'rgba(34, 197, 94, 0.5)' },
  23: { stroke: '#10b981', label: 'Emerald (23D)', bg: 'bg-emerald-500', glow: 'rgba(16, 185, 129, 0.5)' },
  30: { stroke: '#06b6d4', label: 'Cyan (30D)', bg: 'bg-cyan-500', glow: 'rgba(6, 182, 212, 0.5)' },
  33: { stroke: '#00e5ff', label: 'Neon Cyan (33D)', bg: 'bg-[#00e5ff]', glow: 'rgba(0, 229, 255, 0.5)' },
  45: { stroke: '#38bdf8', label: 'Sky Blue (45D)', bg: 'bg-sky-400', glow: 'rgba(56, 189, 248, 0.5)' },
  60: { stroke: '#3b82f6', label: 'Cobalt (60D)', bg: 'bg-blue-500', glow: 'rgba(59, 130, 246, 0.5)' },
  61: { stroke: '#4f46e5', label: 'Royal Blue (61D)', bg: 'bg-indigo-600', glow: 'rgba(79, 70, 229, 0.5)' },
  90: { stroke: '#6366f1', label: 'Indigo (90D)', bg: 'bg-indigo-500', glow: 'rgba(99, 102, 241, 0.5)' },
  96: { stroke: '#7c3aed', label: 'Deep Violet (96D)', bg: 'bg-violet-600', glow: 'rgba(124, 58, 237, 0.5)' },
  120: { stroke: '#8b5cf6', label: 'Violet (120D)', bg: 'bg-violet-500', glow: 'rgba(139, 92, 246, 0.5)' },
  180: { stroke: '#a855f7', label: 'Purple (180D)', bg: 'bg-purple-500', glow: 'rgba(168, 85, 247, 0.5)' },
  270: { stroke: '#c084fc', label: 'Orchid (270D)', bg: 'bg-purple-400', glow: 'rgba(192, 132, 252, 0.5)' },
  365: { stroke: '#ec4899', label: 'Pink (365D)', bg: 'bg-pink-500', glow: 'rgba(236, 72, 153, 0.5)' },
  540: { stroke: '#f43f5e', label: 'Rose (540D)', bg: 'bg-rose-500', glow: 'rgba(244, 63, 94, 0.5)' },
  720: { stroke: '#14b8a6', label: 'Teal (720D)', bg: 'bg-teal-500', glow: 'rgba(20, 184, 166, 0.5)' },
};

export type SkewColorMode = 'vivid' | 'term-gradient' | 'category';

export const VolatilityLabView: React.FC<VolatilityLabViewProps> = ({
  ticker,
  chain,
  allChains: propAllChains,
  positions = [],
  legs = [],
  selectedDte = chain.dte,
  initialTab = 'overlay',
  onSelectDte,
  onNavigateToChain,
  onNavigateToCone,
  onNavigateToValuation,
  onNavigateToVega,
  onNavigateToSkewFinder,
  onApplyStrategyTemplate,
}) => {
  // Ensure we have chains across all standard expirations
  const chains = useMemo(() => {
    if (propAllChains && propAllChains.length > 0) {
      return propAllChains;
    }
    return generateAllOptionChainsForTicker(ticker);
  }, [propAllChains, ticker]);

  // Active view tab:
  // 'overlay': All Expirations Multi-Skew Overlay
  // 'term': Term Structure Curve (ATM IV vs DTE)
  // 'vega': Institutional Vega Term Structure & Constant Maturity Buckets
  // 'combined': Unified Volatility & Vega Term Structure Dual View
  // 'surface': 3D Volatility Surface / 2D Heatmap
  // 'single': Single Expiration Call vs Put Smirk
  // 'hivg': Historical vs Implied Volatility Chart & Cones
  const [activeTab, setActiveTab] = useState<'overlay' | 'term' | 'vega' | 'combined' | 'surface' | 'single' | 'hivg'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Surface view mode: '3d' (Interactive Three.js WebGL) or 'grid' (2D Matrix Table)
  const [surfaceSubView, setSurfaceSubView] = useState<'3d' | 'grid'>('3d');

  // Filter state for enabled expirations in overlay view
  const [enabledDtes, setEnabledDtes] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const c of chains) {
      init[c.dte] = true;
    }
    return init;
  });

  // Hovered expiration line to highlight
  const [highlightedDte, setHighlightedDte] = useState<number | null>(null);

  // Volatility Skew Color Theme Mode:
  // 'vivid': Distinct high-contrast institutional color for each expiration
  // 'term-gradient': Spectral heat gradient from front-month hot red/amber to LEAPS cool violet
  // 'category': Grouped by tenor class (Weekly, Monthly, Quarterly, LEAPS)
  const [colorMode, setColorMode] = useState<SkewColorMode>('vivid');

  // Dynamic distinct color resolver for each volatility skew curve
  const getExpiryColor = (dte: number, index: number = 0): ExpiryColorStyle => {
    if (colorMode === 'vivid') {
      if (DTE_EXPLICIT_COLORS[dte]) {
        return DTE_EXPLICIT_COLORS[dte];
      }
      return EXPIRY_COLOR_PALETTE[index % EXPIRY_COLOR_PALETTE.length];
    }

    if (colorMode === 'term-gradient') {
      const total = Math.max(1, chains.length - 1);
      const ratio = Math.max(0, Math.min(1, index / total));
      const stops = [
        { r: 239, g: 68, b: 68 },   // 0.0: Crimson
        { r: 249, g: 115, b: 22 },  // 0.2: Tangerine
        { r: 234, g: 179, b: 8 },   // 0.4: Gold
        { r: 34, g: 197, b: 94 },   // 0.6: Emerald
        { r: 6, g: 182, b: 212 },   // 0.8: Cyan
        { r: 168, g: 85, b: 247 },  // 1.0: Purple
      ];
      const scaled = ratio * (stops.length - 1);
      const idx = Math.floor(scaled);
      const frac = scaled - idx;
      const c1 = stops[idx];
      const c2 = stops[Math.min(stops.length - 1, idx + 1)];
      const r = Math.round(c1.r + (c2.r - c1.r) * frac);
      const g = Math.round(c1.g + (c2.g - c1.g) * frac);
      const b = Math.round(c1.b + (c2.b - c1.b) * frac);
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      return {
        stroke: hex,
        label: `${dte}D Spectral`,
        bg: 'bg-white',
        glow: `rgba(${r}, ${g}, ${b}, 0.5)`,
      };
    }

    // Category / Tenor class
    if (dte <= 23) {
      const colors = ['#f97316', '#ff9900', '#facc15', '#fb923c', '#fdba74'];
      const stroke = colors[index % colors.length];
      return { stroke, label: 'Weekly', bg: 'bg-orange-500', glow: 'rgba(249, 115, 22, 0.5)' };
    }
    if (dte <= 60) {
      const colors = ['#06b6d4', '#00e5ff', '#38bdf8', '#3b82f6'];
      const stroke = colors[index % colors.length];
      return { stroke, label: 'Monthly', bg: 'bg-cyan-500', glow: 'rgba(6, 182, 212, 0.5)' };
    }
    if (dte <= 180) {
      const colors = ['#10b981', '#14b8a6', '#22c55e', '#34d399'];
      const stroke = colors[index % colors.length];
      return { stroke, label: 'Quarterly', bg: 'bg-emerald-500', glow: 'rgba(16, 185, 129, 0.5)' };
    }
    const leapColors = ['#8b5cf6', '#a855f7', '#c084fc', '#ec4899', '#f43f5e'];
    const stroke = leapColors[index % leapColors.length];
    return { stroke, label: 'LEAPS', bg: 'bg-purple-500', glow: 'rgba(139, 92, 246, 0.5)' };
  };

  // X-axis mode: '% Moneyness' (K / S * 100) or 'Absolute Strike' ($)
  const [xAxisMode, setXAxisMode] = useState<'moneyness' | 'strike'>('moneyness');

  // Curve type: 'composite' (OTM Puts + OTM Calls), 'puts' (Puts Only), 'calls' (Calls Only)
  const [skewCurveType, setSkewCurveType] = useState<'composite' | 'puts' | 'calls'>('composite');

  // Interactive mouse hover crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compute quantitative skew metrics across all expirations
  const skewSummaries: ExpirationSkewSummary[] = useMemo(() => {
    return chains.map((c) => calculateSkewMetricsForChain(c, ticker.price));
  }, [chains, ticker.price]);

  // Active chain for single view or highlighted stats
  const activeChain = useMemo(() => {
    return chains.find((c) => c.dte === selectedDte) || chain;
  }, [chains, selectedDte, chain]);

  const activeSkewSummary = useMemo(() => {
    return calculateSkewMetricsForChain(activeChain, ticker.price);
  }, [activeChain, ticker.price]);

  // Calculate Term Structure characteristics (Contango vs Backwardation)
  const termStructureAnalysis = useMemo(() => {
    const frontATM = skewSummaries[0]?.atmIV || ticker.currentIV;
    const backATM = skewSummaries[skewSummaries.length - 1]?.atmIV || ticker.currentIV;
    const spread = backATM - frontATM;
    const isContango = spread >= 0;

    if (chains.length < 2) {
      return {
        isContango: true,
        spread: 0,
        frontATM,
        backATM,
        frontDte: chains[0]?.dte || 30,
        backDte: chains[0]?.dte || 30,
      };
    }

    return {
      isContango,
      spread,
      frontATM,
      backATM,
      frontDte: chains[0].dte,
      backDte: chains[chains.length - 1].dte,
    };
  }, [chains, skewSummaries, ticker.currentIV]);

  // SVG Chart dimensions
  const svgWidth = 840;
  const svgHeight = 330;
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };

  // Calculate Moneyness Domain: from 85% to 115%
  // or Strike Domain: from 0.85 * S to 1.15 * S
  const moneynessDomain = [85, 115];
  const strikeDomain = [
    Number((ticker.price * 0.85).toFixed(1)),
    Number((ticker.price * 1.15).toFixed(1)),
  ];

  // Dynamic IV bounds across all visible expirations
  const { minIV, maxIV } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const c of chains) {
      if (!enabledDtes[c.dte]) continue;
      for (const call of c.calls) {
        if (call.iv < min) min = call.iv;
        if (call.iv > max) max = call.iv;
      }
      for (const put of c.puts) {
        if (put.iv < min) min = put.iv;
        if (put.iv > max) max = put.iv;
      }
    }

    if (!isFinite(min) || !isFinite(max)) {
      min = ticker.currentIV * 0.6;
      max = ticker.currentIV * 1.4;
    }

    // Add 10% headroom
    return {
      minIV: Math.max(0.04, min * 0.92),
      maxIV: max * 1.1,
    };
  }, [chains, enabledDtes, ticker.currentIV]);

  // Coordinate projection helpers
  const getX = (val: number) => {
    const [domainMin, domainMax] = xAxisMode === 'moneyness' ? moneynessDomain : strikeDomain;
    const ratio = (val - domainMin) / (domainMax - domainMin || 1);
    return padding.left + ratio * (svgWidth - padding.left - padding.right);
  };

  const getY = (iv: number) => {
    const ratio = (iv - minIV) / (maxIV - minIV || 1);
    return svgHeight - padding.bottom - ratio * (svgHeight - padding.top - padding.bottom);
  };

  // Helper to extract relevant curve points for a chain
  const getCurvePoints = (c: ExpirationOptionChain) => {
    const points: { xVal: number; strike: number; moneyness: number; iv: number }[] = [];

    // All strikes in this chain
    const allStrikes = c.calls.map((call) => call.strike);

    for (const s of allStrikes) {
      const call = c.calls.find((item) => item.strike === s);
      const put = c.puts.find((item) => item.strike === s);
      const moneynessPct = (s / ticker.price) * 100;

      let chosenIV = call?.iv || c.avgIV;
      if (skewCurveType === 'composite') {
        // Standard Volatility Smile: OTM Puts when strike < spot, OTM Calls when strike > spot
        if (s <= ticker.price && put) {
          chosenIV = put.iv;
        } else if (call) {
          chosenIV = call.iv;
        }
      } else if (skewCurveType === 'puts' && put) {
        chosenIV = put.iv;
      } else if (skewCurveType === 'calls' && call) {
        chosenIV = call.iv;
      }

      points.push({
        xVal: xAxisMode === 'moneyness' ? moneynessPct : s,
        strike: s,
        moneyness: moneynessPct,
        iv: chosenIV,
      });
    }

    return points.sort((a, b) => a.xVal - b.xVal);
  };

  // Quick filter presets
  const handleToggleAll = (enable: boolean) => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    for (const c of chains) {
      updated[c.dte] = enable;
    }
    setEnabledDtes(updated);
  };

  const handleToggleFrontMonths = () => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    for (const c of chains) {
      updated[c.dte] = c.dte <= 30;
    }
    setEnabledDtes(updated);
  };

  const handleToggleBackMonths = () => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    for (const c of chains) {
      updated[c.dte] = c.dte > 30;
    }
    setEnabledDtes(updated);
  };

  // Reference points for hover calculation (from the chain with the most strikes or activeChain)
  const referencePoints = useMemo(() => {
    return getCurvePoints(activeChain);
  }, [activeChain, xAxisMode, skewCurveType]);

  const hoveredRefPoint = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < referencePoints.length
    ? referencePoints[hoverIndex]
    : null;

  return (
    <div className="p-2 sm:p-3 lg:p-4 w-full max-w-full ml-0 mr-auto flex flex-col gap-3 font-mono text-xs select-none text-left">
      {/* Bloomberg Navigation Header */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 lg:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#ff9900]/10 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff9900] font-black text-base tracking-wider">
                {ticker.symbol} US EQUITY
              </span>
              <span className="px-1.5 py-0.5 bg-[#141b28] border border-[#2b354d] text-white text-[10px] font-bold rounded">
                VOLS
              </span>
              <span className="text-[#8b9bb4] text-xs">
                // MULTI-EXPIRATION VOLATILITY SKEW & SURFACE ANALYZER
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8b9bb4] mt-1">
              <span>
                Spot: <strong className="text-white font-mono">${ticker.price.toFixed(2)}</strong>
              </span>
              <span>·</span>
              <span>
                ATM IV: <strong className="text-[#00e5ff]">{(ticker.currentIV * 100).toFixed(1)}%</strong>
              </span>
              <span>·</span>
              <span>
                30D Realized: <strong className="text-[#cbd5e1]">{(ticker.historicalVol30d * 100).toFixed(1)}%</strong>
              </span>
              <span>·</span>
              <span>
                IV Rank:{' '}
                <strong className={ticker.ivRank >= 50 ? 'text-[#ff334b]' : 'text-[#00e676]'}>
                  {ticker.ivRank}%
                </strong>
              </span>
              <span>·</span>
              <span>
                Term Slope:{' '}
                <strong className={termStructureAnalysis.isContango ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                  {termStructureAnalysis.isContango ? 'CONTANGO (+)' : 'BACKWARDATION (-)'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-[#0b0f19] p-1 border border-[#1e2638] rounded flex-wrap">
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('combined');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'combined'
                ? 'bg-[#00e5ff] text-black shadow-[0_0_10px_rgba(0,229,255,0.4)] font-black'
                : 'text-[#00e5ff] hover:text-white hover:bg-[#141b28]'
            }`}
            title="Unified View: Implied Volatility & Vega Term Structure Under The Same Tab"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>VOLATILITY &amp; VEGA</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('vega');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'vega'
                ? 'bg-[#00e5ff] text-black shadow-[0_0_10px_rgba(0,229,255,0.4)] font-black'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
            title="Institutional Vega Term Structure, Constant Maturity (30D, 60D, 90D...) & All-Strikes Matrix"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>VEGA TERM STRUCTURE</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('term');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'term'
                ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ATM TERM STRUCTURE</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('overlay');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'overlay'
                ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ALL EXPIRATIONS SKEW</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('surface');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'surface'
                ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D VOLATILITY SURFACE</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('single');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'single'
                ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>SINGLE EXPR SMIRK</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('hivg');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'hivg'
                ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>HISTORICAL VS IMPLIED (HIVG)</span>
          </button>

          {onNavigateToSkewFinder && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToSkewFinder();
              }}
              className="px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all text-[#ff9900] bg-[#ff9900]/10 border border-[#ff9900]/30 hover:bg-[#ff9900]/20 hover:text-white"
              title="Launch Quant Volatility Skew Finder & Arbitrage Scanner <SKEW>"
            >
              <Sliders className="w-3.5 h-3.5 text-[#ff9900]" />
              <span>SKEW FINDER</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP SUMMARY CARDS: VOLATILITY REGIME, 25-DELTA RISK REVERSAL, SKEW RATIO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: 25-Delta Risk Reversal Index */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] font-bold uppercase">
            <span>25Δ Risk Reversal (Front Month)</span>
            <span className="text-[#ff9900]">{chains[0]?.dte} DTE</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                (skewSummaries[0]?.riskReversal25D || 0) < -0.03
                  ? 'text-[#ff334b]'
                  : 'text-[#ffd600]'
              }`}
            >
              {((skewSummaries[0]?.riskReversal25D || 0) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#8b9bb4]">
              Call IV - Put IV
            </span>
          </div>
          <div className="text-[10px] text-[#64748b] mt-1">
            Negative RR indicates market willingness to pay premium for downside put hedges.
          </div>
        </div>

        {/* Card 2: Put Skew Ratio */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] font-bold uppercase">
            <span>Put / ATM Skew Multiple</span>
            <span className="text-[#00e5ff]">{chains[0]?.dte} DTE</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#00e5ff]">
              {(skewSummaries[0]?.putSkewRatio || 1.15).toFixed(2)}x
            </span>
            <span className="text-[10px] text-[#8b9bb4]">
              25Δ Put IV / ATM
            </span>
          </div>
          <div className="text-[10px] text-[#64748b] mt-1">
            OTM puts trading at a {(((skewSummaries[0]?.putSkewRatio || 1.15) - 1) * 100).toFixed(0)}% premium to ATM options.
          </div>
        </div>

        {/* Card 3: Term Structure Slope */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] font-bold uppercase">
            <span>Term Structure Slope</span>
            <span className="text-[#8b9bb4]">{termStructureAnalysis.frontDte}D - {termStructureAnalysis.backDte}D</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                termStructureAnalysis.isContango ? 'text-[#00e676]' : 'text-[#ff334b]'
              }`}
            >
              {termStructureAnalysis.spread >= 0 ? '+' : ''}
              {(termStructureAnalysis.spread * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#8b9bb4]">
              {termStructureAnalysis.isContango ? 'Contango' : 'Backwardation'}
            </span>
          </div>
          <div className="text-[10px] text-[#64748b] mt-1">
            {termStructureAnalysis.isContango
              ? 'Front-month vol discounted relative to long-dated contracts.'
              : 'Front-month vol elevated due to near-term catalyst or stress.'}
          </div>
        </div>

        {/* Card 4: Historical Variance Premium */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] font-bold uppercase">
            <span>Variance Risk Premium (VRP)</span>
            <span className="text-[#ffd600]">IV vs 30D HV</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                ticker.currentIV >= ticker.historicalVol30d ? 'text-[#00e676]' : 'text-[#ff334b]'
              }`}
            >
              {ticker.currentIV >= ticker.historicalVol30d ? '+' : ''}
              {((ticker.currentIV - ticker.historicalVol30d) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#8b9bb4]">
              IV {(ticker.currentIV * 100).toFixed(1)}% vs HV {(ticker.historicalVol30d * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-[#64748b] mt-1">
            {ticker.currentIV >= ticker.historicalVol30d
              ? 'Implied vol exceeds realized; favorable for premium selling.'
              : 'Implied vol below realized; favorable for long gamma/vega.'}
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: ALL EXPIRATIONS MULTI-SKEW OVERLAY */}
      {activeTab === 'overlay' && (
        <div className="flex flex-col gap-3">
          {/* Main Chart Card */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded shadow-2xl overflow-hidden">
            {/* Chart Toolbar */}
            <div className="bg-[#090d16] px-3 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff9900]" />
                  <span>Volatility Skews Across All Expirations</span>
                </span>
                <span className="text-[#8b9bb4] text-[11px]">
                  ({chains.length} Active Expirations Loaded)
                </span>
              </div>

              {/* Controls: X-Axis Mode, Curve Type & Color Palette */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Skew Color Theme Mode */}
                <div className="flex items-center gap-1 bg-[#141b28] p-0.5 rounded border border-[#2b354d] text-[10px]">
                  <span className="text-[#8b9bb4] px-1.5 font-bold flex items-center gap-1">
                    <Palette className="w-3 h-3 text-[#ff9900]" />
                    PALETTE:
                  </span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setColorMode('vivid');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      colorMode === 'vivid'
                        ? 'bg-[#c084fc] text-black font-extrabold shadow-sm'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Distinct high-contrast Bloomberg color for every expiration"
                  >
                    MULTI-COLOR
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setColorMode('term-gradient');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      colorMode === 'term-gradient'
                        ? 'bg-[#00e5ff] text-black font-extrabold shadow-sm'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Maturity heat-gradient: Warm front-month to cool LEAPS"
                  >
                    TERM HEATMAP
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setColorMode('category');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      colorMode === 'category'
                        ? 'bg-[#ff9900] text-black font-extrabold shadow-sm'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Grouped by tenor class: Weekly, Monthly, Quarterly, and LEAPS"
                  >
                    BY TENOR
                  </button>
                </div>

                {/* Curve Type Selector */}
                <div className="flex items-center gap-1 bg-[#141b28] p-0.5 rounded border border-[#2b354d] text-[10px]">
                  <span className="text-[#8b9bb4] px-1.5 font-bold">CURVE:</span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSkewCurveType('composite');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      skewCurveType === 'composite'
                        ? 'bg-[#ff9900] text-black'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Composite OTM Smile (OTM Puts below ATM, OTM Calls above ATM)"
                  >
                    COMPOSITE OTM
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSkewCurveType('puts');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      skewCurveType === 'puts'
                        ? 'bg-[#ff334b] text-white'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Plot only Put option implied volatility"
                  >
                    PUTS ONLY
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSkewCurveType('calls');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      skewCurveType === 'calls'
                        ? 'bg-[#00e676] text-black'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Plot only Call option implied volatility"
                  >
                    CALLS ONLY
                  </button>
                </div>

                {/* X-Axis Selector */}
                <div className="flex items-center gap-1 bg-[#141b28] p-0.5 rounded border border-[#2b354d] text-[10px]">
                  <span className="text-[#8b9bb4] px-1.5 font-bold">X-AXIS:</span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setXAxisMode('moneyness');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      xAxisMode === 'moneyness'
                        ? 'bg-[#00e5ff] text-black'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Percentage Moneyness (Strike / Spot * 100) — Standard quantitative benchmark"
                  >
                    % MONEYNESS
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setXAxisMode('strike');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      xAxisMode === 'strike'
                        ? 'bg-[#00e5ff] text-black'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                    title="Absolute Dollar Strike Price"
                  >
                    STRIKE ($)
                  </button>
                </div>
              </div>
            </div>

            {/* Expiration Filter Pills Strip */}
            <div className="bg-[#05070a] px-3 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#64748b] text-[10px] font-bold mr-1">EXPIRATIONS:</span>
                {chains.map((c, index) => {
                  const style = getExpiryColor(c.dte, index);
                  const isEnabled = !!enabledDtes[c.dte];
                  const isHighlighted = highlightedDte === c.dte;

                  return (
                    <button
                      key={c.dte}
                      onClick={() => {
                        playKeyClick();
                        setEnabledDtes((prev) => ({ ...prev, [c.dte]: !prev[c.dte] }));
                      }}
                      onMouseEnter={() => setHighlightedDte(c.dte)}
                      onMouseLeave={() => setHighlightedDte(null)}
                      style={
                        isEnabled && isHighlighted
                          ? { borderColor: style.stroke, boxShadow: `0 0 10px ${style.glow}` }
                          : isEnabled
                          ? { borderColor: `${style.stroke}55` }
                          : undefined
                      }
                      className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-all text-[10px] font-bold ${
                        isEnabled
                          ? 'bg-[#0c121e] text-white hover:border-white'
                          : 'border-[#1e2638] bg-[#06080d] text-[#475569] opacity-50'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block transition-transform"
                        style={{
                          backgroundColor: isEnabled ? style.stroke : '#475569',
                          boxShadow: isEnabled ? `0 0 6px ${style.stroke}` : undefined,
                        }}
                      />
                      <span style={{ color: isEnabled ? (isHighlighted ? style.stroke : '#ffffff') : '#64748b' }}>
                        {c.dte}D
                      </span>
                      <span className="text-[#8b9bb4] font-normal text-[9px]">{c.formattedDate.split(',')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  onClick={() => handleToggleAll(true)}
                  className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white rounded border border-[#2b354d]"
                >
                  ALL ({chains.length})
                </button>
                <button
                  onClick={handleToggleFrontMonths}
                  className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white rounded border border-[#2b354d]"
                >
                  FRONT (≤30D)
                </button>
                <button
                  onClick={handleToggleBackMonths}
                  className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white rounded border border-[#2b354d]"
                >
                  BACK (&gt;30D)
                </button>
              </div>
            </div>

            {/* High-Resolution SVG Multi-Curve Overlay */}
            <div className="p-3 bg-[#05070a] relative overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-80 select-none cursor-crosshair"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
                  // Find closest index in referencePoints
                  let closestIdx = 0;
                  let minDistance = Infinity;
                  referencePoints.forEach((pt, idx) => {
                    const px = getX(pt.xVal);
                    const dist = Math.abs(px - mouseX);
                    if (dist < minDistance) {
                      minDistance = dist;
                      closestIdx = idx;
                    }
                  });
                  setHoverIndex(closestIdx);
                }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  {/* Subtle Glow Filter for curves */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines (IV %) */}
                {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((ivLevel) => {
                  if (ivLevel < minIV || ivLevel > maxIV) return null;
                  const y = getY(ivLevel);
                  return (
                    <g key={ivLevel}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#1e2638"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="JetBrains Mono"
                        textAnchor="end"
                      >
                        {(ivLevel * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}

                {/* Vertical ATM Line (100% Moneyness or Stock Price) */}
                {(() => {
                  const atmVal = xAxisMode === 'moneyness' ? 100 : ticker.price;
                  const atmX = getX(atmVal);
                  return (
                    <g>
                      <line
                        x1={atmX}
                        y1={padding.top}
                        x2={atmX}
                        y2={svgHeight - padding.bottom}
                        stroke="#ffd600"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <rect
                        x={atmX - 35}
                        y={padding.top - 18}
                        width="70"
                        height="15"
                        fill="#141b28"
                        stroke="#ffd600"
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x={atmX}
                        y={padding.top - 7}
                        fill="#ffd600"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        ATM (${ticker.price.toFixed(1)})
                      </text>
                    </g>
                  );
                })()}

                {/* Multi-Expiration Skew Curves */}
                {chains.map((c, index) => {
                  if (!enabledDtes[c.dte]) return null;
                  const style = getExpiryColor(c.dte, index);
                  const points = getCurvePoints(c);
                  if (points.length < 2) return null;

                  const isHighlighted = highlightedDte === c.dte;
                  const isDimmed = highlightedDte !== null && !isHighlighted;

                  // Build smooth SVG path
                  const pathData = points.reduce((acc, pt, idx) => {
                    const x = getX(pt.xVal);
                    const y = getY(pt.iv);
                    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }, '');

                  return (
                    <g
                      key={c.dte}
                      className="transition-opacity duration-150 cursor-pointer"
                      onMouseEnter={() => setHighlightedDte(c.dte)}
                      onMouseLeave={() => setHighlightedDte(null)}
                    >
                      {/* Invisible wider hit area for easy hover targeting */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                      />

                      {/* Visible colored skew curve */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={style.stroke}
                        strokeWidth={isHighlighted ? 3.5 : 2}
                        strokeOpacity={isDimmed ? 0.2 : 0.95}
                        filter={isHighlighted ? 'url(#glow)' : undefined}
                      />

                      {/* Small point markers on nodes */}
                      {points.map((pt, pIdx) => {
                        const x = getX(pt.xVal);
                        const y = getY(pt.iv);
                        return (
                          <circle
                            key={pIdx}
                            cx={x}
                            cy={y}
                            r={isHighlighted ? 3.5 : 1.8}
                            fill={style.stroke}
                            fillOpacity={isDimmed ? 0.2 : 0.9}
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* Interactive Crosshair Tracking */}
                {hoveredRefPoint && (
                  <g>
                    {/* Vertical tracking dashed line */}
                    {(() => {
                      const hx = getX(hoveredRefPoint.xVal);
                      return (
                        <g>
                          <line
                            x1={hx}
                            y1={padding.top}
                            x2={hx}
                            y2={svgHeight - padding.bottom}
                            stroke="#ffffff"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            strokeOpacity="0.75"
                          />
                          <circle cx={hx} cy={getY(hoveredRefPoint.iv)} r="4" fill="#ff9900" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* X-Axis bottom ticks */}
                {xAxisMode === 'moneyness'
                  ? [85, 90, 95, 100, 105, 110, 115].map((m) => {
                      const x = getX(m);
                      return (
                        <g key={m}>
                          <line
                            x1={x}
                            y1={svgHeight - padding.bottom}
                            x2={x}
                            y2={svgHeight - padding.bottom + 4}
                            stroke="#475569"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={svgHeight - padding.bottom + 16}
                            fill={m === 100 ? '#ffd600' : '#8b9bb4'}
                            fontSize="9"
                            fontWeight={m === 100 ? 'bold' : 'normal'}
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            {m}%
                          </text>
                          <text
                            x={x}
                            y={svgHeight - padding.bottom + 27}
                            fill="#64748b"
                            fontSize="7.5"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            ${(ticker.price * (m / 100)).toFixed(1)}
                          </text>
                        </g>
                      );
                    })
                  : (() => {
                      // Generate 7 strike labels across strike domain
                      const [minS, maxS] = strikeDomain;
                      const step = (maxS - minS) / 6;
                      return Array.from({ length: 7 }, (_, i) => minS + i * step).map((s) => {
                        const x = getX(s);
                        return (
                          <g key={s}>
                            <line
                              x1={x}
                              y1={svgHeight - padding.bottom}
                              x2={x}
                              y2={svgHeight - padding.bottom + 4}
                              stroke="#475569"
                              strokeWidth="1"
                            />
                            <text
                              x={x}
                              y={svgHeight - padding.bottom + 16}
                              fill="#8b9bb4"
                              fontSize="9"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              ${s.toFixed(1)}
                            </text>
                            <text
                              x={x}
                              y={svgHeight - padding.bottom + 27}
                              fill="#64748b"
                              fontSize="7.5"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              {((s / ticker.price) * 100).toFixed(0)}%
                            </text>
                          </g>
                        );
                      });
                    })()}

                {/* Y-Axis Label */}
                <text
                  x={padding.left - 42}
                  y={padding.top - 8}
                  fill="#8b9bb4"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  textAnchor="start"
                >
                  IMPLIED VOLATILITY (IV)
                </text>

                {/* X-Axis Center Label */}
                <text
                  x={svgWidth / 2}
                  y={svgHeight - 6}
                  fill="#8b9bb4"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {xAxisMode === 'moneyness' ? 'OPTION MONEYNESS (% OF SPOT)' : 'OPTION STRIKE PRICE ($)'}
                </text>
              </svg>

              {/* Floating Crosshair Hover Card */}
              {hoveredRefPoint && (
                <div className="mt-2 bg-[#090d16] border border-[#2b354d] rounded p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[#8b9bb4] text-[10px]">SELECTED LEVEL: </span>
                      <strong className="text-white text-sm">
                        ${hoveredRefPoint.strike.toFixed(2)}
                      </strong>
                      <span className="text-[#ff9900] ml-1 font-bold">
                        ({hoveredRefPoint.moneyness.toFixed(1)}% Moneyness)
                      </span>
                    </div>
                    <span className="text-[#64748b]">|</span>
                    <div>
                      <span className="text-[#8b9bb4] text-[10px]">DISTANCE TO SPOT: </span>
                      <strong className={hoveredRefPoint.strike >= ticker.price ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                        {hoveredRefPoint.strike >= ticker.price ? '+' : ''}
                        {(hoveredRefPoint.strike - ticker.price).toFixed(2)} (
                        {(((hoveredRefPoint.strike - ticker.price) / ticker.price) * 100).toFixed(1)}%)
                      </strong>
                    </div>
                  </div>

                  {/* Multi-expiry IV values at this strike */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="text-[#8b9bb4] text-[10px] font-bold">IV BY EXPIRATION:</span>
                    {chains
                      .filter((c) => enabledDtes[c.dte])
                      .map((c) => {
                        const chainIndex = chains.findIndex((item) => item.dte === c.dte);
                        const style = getExpiryColor(c.dte, chainIndex >= 0 ? chainIndex : 0);
                        const call = c.calls.find((item) => item.strike === hoveredRefPoint.strike);
                        const put = c.puts.find((item) => item.strike === hoveredRefPoint.strike);
                        let val = call?.iv || c.avgIV;
                        if (skewCurveType === 'composite') {
                          val = hoveredRefPoint.strike <= ticker.price ? (put?.iv || val) : (call?.iv || val);
                        } else if (skewCurveType === 'puts') {
                          val = put?.iv || val;
                        } else {
                          val = call?.iv || val;
                        }

                        return (
                          <div key={c.dte} className="flex items-center gap-1 font-mono">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: style.stroke, boxShadow: `0 0 5px ${style.stroke}` }}
                            />
                            <span style={{ color: style.stroke }} className="font-semibold">{c.dte}D:</span>
                            <span className="text-white font-bold">{(val * 100).toFixed(1)}%</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Quantitative Interpretation Banner */}
            <div className="bg-[#090d16] px-3 py-2 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8b9bb4]">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#ff9900]" />
                <span>
                  <strong className="text-white">QUANT SKEW DYNAMICS:</strong> Shorter DTE curves exhibit steeper downside slope{' '}
                  <span className="text-[#ff9900]">(dσ/dK ∝ 1/√T)</span> due to discrete jump risk and gamma hedging.
                  Longer expirations flatten towards the forward central limit mean.
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#64748b]">
                <span>Source: BSM Numerical Inversion &amp; Volatility Smile Matrix</span>
              </div>
            </div>
          </div>

          {/* MASTER SKEW & RISK REVERSAL TABLE ACROSS ALL EXPIRATIONS */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
            <div className="bg-[#090d16] px-4 py-2 border-b border-[#1e2638] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase text-xs">
                  All Expirations Volatility Skew &amp; Risk Reversal Matrix
                </span>
                <span className="text-[#8b9bb4] text-[10px]">// 10Δ, 25Δ, 50Δ (ATM) DISPERSION</span>
              </div>
              <div className="text-[10px] text-[#8b9bb4]">
                Click <strong className="text-[#ff9900]">VIEW CHAIN</strong> to inspect contracts in OMON
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#0c121e] text-[#8b9bb4] border-b border-[#1e2638] uppercase text-[10px]">
                    <th className="py-2.5 px-3">EXPIRATION</th>
                    <th className="py-2.5 px-2 text-center">DTE</th>
                    <th className="py-2.5 px-3 text-right">10Δ PUT IV</th>
                    <th className="py-2.5 px-3 text-right">25Δ PUT IV</th>
                    <th className="py-2.5 px-3 text-right font-bold text-[#ffd600]">ATM (50Δ) IV</th>
                    <th className="py-2.5 px-3 text-right">25Δ CALL IV</th>
                    <th className="py-2.5 px-3 text-right">10Δ CALL IV</th>
                    <th className="py-2.5 px-3 text-right">25Δ RISK REV</th>
                    <th className="py-2.5 px-3 text-right">PUT / ATM RATIO</th>
                    <th className="py-2.5 px-3 text-right">25Δ FLY</th>
                    <th className="py-2.5 px-3 text-center">SKEW REGIME</th>
                    <th className="py-2.5 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28]">
                  {skewSummaries.map((summary, idx) => {
                    const style = getExpiryColor(summary.dte, idx);
                    const isSelected = summary.dte === selectedDte;
                    const isHighlighted = highlightedDte === summary.dte;

                    return (
                      <tr
                        key={summary.dte}
                        onMouseEnter={() => setHighlightedDte(summary.dte)}
                        onMouseLeave={() => setHighlightedDte(null)}
                        style={isHighlighted ? { backgroundColor: `${style.stroke}15` } : undefined}
                        className={`hover:bg-[#141b28]/60 transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#ff9900]/10 border-l-2 border-[#ff9900]' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: style.stroke, boxShadow: `0 0 6px ${style.stroke}aa` }}
                          />
                          <span>{summary.formattedDate}</span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold" style={{ color: style.stroke }}>
                          {summary.dte}d
                        </td>
                        <td className="py-2 px-3 text-right text-[#ff334b]">
                          {(summary.put10DeltaIV * 100).toFixed(1)}%
                          <span className="text-[9px] text-[#64748b] block">${summary.put10DeltaStrike}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#f87171] font-bold">
                          {(summary.put25DeltaIV * 100).toFixed(1)}%
                          <span className="text-[9px] text-[#64748b] block">${summary.put25DeltaStrike}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#ffd600] font-black bg-[#141b28]/40">
                          {(summary.atmIV * 100).toFixed(1)}%
                          <span className="text-[9px] text-[#8b9bb4] block">${summary.atmStrike}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#4ade80] font-bold">
                          {(summary.call25DeltaIV * 100).toFixed(1)}%
                          <span className="text-[9px] text-[#64748b] block">${summary.call25DeltaStrike}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#00e676]">
                          {(summary.call10DeltaIV * 100).toFixed(1)}%
                          <span className="text-[9px] text-[#64748b] block">${summary.call10DeltaStrike}</span>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-black ${
                            summary.riskReversal25D < 0 ? 'text-[#ff334b]' : 'text-[#00e676]'
                          }`}
                        >
                          {(summary.riskReversal25D * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right text-[#00e5ff] font-bold">
                          {summary.putSkewRatio.toFixed(2)}x
                        </td>
                        <td className="py-2 px-3 text-right text-[#c084fc]">
                          {summary.butterfly25D >= 0 ? '+' : ''}
                          {(summary.butterfly25D * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              summary.skewRegime === 'EXTREME PUT SKEW'
                                ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                                : summary.skewRegime === 'STEEP DOWNSIDE'
                                ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40'
                                : 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                            }`}
                          >
                            {summary.skewRegime}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => {
                              playKeyClick();
                              if (onSelectDte) onSelectDte(summary.dte);
                              if (onNavigateToChain) onNavigateToChain();
                            }}
                            className="px-2 py-1 bg-[#1e2638] hover:bg-[#ff9900] text-[#cbd5e1] hover:text-black font-bold rounded text-[10px] transition-all flex items-center gap-1 mx-auto"
                          >
                            <span>OMON</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
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

      {/* VIEW TAB 2: ATM TERM STRUCTURE CURVE */}
      {(activeTab === 'term' || activeTab === 'combined') && (
        <div className="bg-[#07090e] border border-[#1e2638] rounded shadow-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-3">
            <div>
              <div className="text-sm font-black text-white uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#ff9900]" />
                <span>Constant Maturity ATM Implied Volatility Term Structure</span>
              </div>
              <div className="text-[11px] text-[#8b9bb4] mt-0.5">
                Market Slope: <strong className={termStructureAnalysis.isContango ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                  {termStructureAnalysis.isContango ? 'CONTANGO (UPWARD SLOPING)' : 'BACKWARDATION (INVERTED)'}
                </strong> · Front ATM: {(termStructureAnalysis.frontATM * 100).toFixed(1)}% vs Back ATM: {(termStructureAnalysis.backATM * 100).toFixed(1)}%
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#00e5ff] inline-block rounded" />
                <span className="text-[#cbd5e1]">ATM Implied Volatility</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#cbd5e1] inline-block border-t border-dashed border-[#cbd5e1]" />
                <span className="text-[#8b9bb4]">30D Realized Vol ({(ticker.historicalVol30d * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Term Structure Chart */}
          <div className="bg-[#05070a] p-3 rounded border border-[#1e2638]">
            <svg viewBox={`0 0 ${svgWidth} 260`} className="w-full h-64 select-none">
              {(() => {
                const termPadding = { top: 25, right: 35, bottom: 40, left: 60 };
                const tWidth = svgWidth;
                const tHeight = 260;

                const minDte = Math.min(...chains.map((c) => c.dte));
                const maxDte = Math.max(...chains.map((c) => c.dte));

                const allAtmIVs = skewSummaries.map((s) => s.atmIV);
                const tMinIV = Math.min(...allAtmIVs, ticker.historicalVol30d) * 0.9;
                const tMaxIV = Math.max(...allAtmIVs, ticker.historicalVol30d) * 1.1;

                const getTX = (dte: number) => {
                  return (
                    termPadding.left +
                    ((dte - minDte) / (maxDte - minDte || 1)) * (tWidth - termPadding.left - termPadding.right)
                  );
                };

                const getTY = (iv: number) => {
                  return (
                    tHeight -
                    termPadding.bottom -
                    ((iv - tMinIV) / (tMaxIV - tMinIV || 1)) * (tHeight - termPadding.top - termPadding.bottom)
                  );
                };

                // Path for ATM IV
                const atmPath = skewSummaries.reduce((acc, s, idx) => {
                  const x = getTX(s.dte);
                  const y = getTY(s.atmIV);
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }, '');

                // Realized Vol line
                const realizedY = getTY(ticker.historicalVol30d);

                return (
                  <g>
                    {/* Horizontal grid lines */}
                    {[0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5].map((level) => {
                      if (level < tMinIV || level > tMaxIV) return null;
                      const y = getTY(level);
                      return (
                        <g key={level}>
                          <line
                            x1={termPadding.left}
                            y1={y}
                            x2={tWidth - termPadding.right}
                            y2={y}
                            stroke="#1e2638"
                            strokeWidth="1"
                            strokeDasharray="2 3"
                          />
                          <text
                            x={termPadding.left - 6}
                            y={y + 3}
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="JetBrains Mono"
                            textAnchor="end"
                          >
                            {(level * 100).toFixed(0)}%
                          </text>
                        </g>
                      );
                    })}

                    {/* 30D Realized Vol reference line */}
                    <line
                      x1={termPadding.left}
                      y1={realizedY}
                      x2={tWidth - termPadding.right}
                      y2={realizedY}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={tWidth - termPadding.right}
                      y={realizedY - 6}
                      fill="#cbd5e1"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                    >
                      30D Realized ({(ticker.historicalVol30d * 100).toFixed(1)}%)
                    </text>

                    {/* ATM Term Structure Path */}
                    <path d={atmPath} fill="none" stroke="#00e5ff" strokeWidth="3" filter="url(#glow)" />

                    {/* Nodes for each expiration */}
                    {skewSummaries.map((s, idx) => {
                      const x = getTX(s.dte);
                      const y = getTY(s.atmIV);
                      const nodeStyle = getExpiryColor(s.dte, idx);
                      return (
                        <g key={s.dte}>
                          <circle cx={x} cy={y} r="5" fill={nodeStyle.stroke} stroke="#05070a" strokeWidth="2" />
                          <rect
                            x={x - 22}
                            y={y - 20}
                            width="44"
                            height="14"
                            fill="#141b28"
                            stroke={nodeStyle.stroke}
                            strokeWidth="1"
                            rx="2"
                          />
                          <text
                            x={x}
                            y={y - 10}
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            {(s.atmIV * 100).toFixed(1)}%
                          </text>

                          {/* X-axis labels */}
                          <line
                            x1={x}
                            y1={tHeight - termPadding.bottom}
                            x2={x}
                            y2={tHeight - termPadding.bottom + 4}
                            stroke="#475569"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={tHeight - termPadding.bottom + 16}
                            fill="#ff9900"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            {s.dte}D
                          </text>
                          <text
                            x={x}
                            y={tHeight - termPadding.bottom + 26}
                            fill="#64748b"
                            fontSize="7.5"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            {s.formattedDate.split(',')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#090d16] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">30-Day Constant Maturity IV</div>
              <div className="text-xl font-black text-white mt-1">{(ticker.currentIV * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-[#64748b] mt-1">Directly benchmarked to standard equity straddle pricing.</div>
            </div>
            <div className="bg-[#090d16] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">Front vs Back Calendar Spread</div>
              <div className="text-xl font-black text-[#00e5ff] mt-1">
                {(termStructureAnalysis.spread * 100).toFixed(1)}% pts
              </div>
              <div className="text-[10px] text-[#64748b] mt-1">
                {termStructureAnalysis.isContango ? 'Normal term risk premium' : 'Event volatility spike'}
              </div>
            </div>
            <div className="bg-[#090d16] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">Recommended Trade Structuring</div>
              <div className="text-xs font-bold text-[#ffd600] mt-1">
                {termStructureAnalysis.isContango
                  ? 'Calendar Spreads: Sell Front / Buy Back'
                  : 'Reverse Calendars: Buy Front / Sell Back'}
              </div>
              <div className="text-[10px] text-[#64748b] mt-1">Exploiting term structure curvature mispricings.</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2.5: INSTITUTIONAL VEGA TERM STRUCTURE & ALL-EXPIRATIONS ALL-STRIKES MATRIX */}
      {(activeTab === 'vega' || activeTab === 'combined') && (
        <div className="flex flex-col gap-3">
          <VegaTermStructureView
            ticker={ticker}
            chains={chains}
            positions={positions}
            legs={legs}
            selectedDte={selectedDte}
            onSelectDte={onSelectDte}
            onNavigateToChain={onNavigateToChain}
            onNavigateToValuation={onNavigateToValuation}
            onApplyStrategyTemplate={onApplyStrategyTemplate}
          />
        </div>
      )}

      {/* VIEW TAB 3: 3D VOLATILITY SURFACE & 2D MATRIX */}
      {activeTab === 'surface' && (
        <div className="flex flex-col gap-3">
          {/* Subview Selector Header */}
          <div className="bg-[#05070a] border border-[#1e2638] rounded p-2 flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-[#8b9bb4] text-[10px] font-bold uppercase">SURFACE DISPLAY MODE:</span>
              <button
                onClick={() => {
                  playKeyClick();
                  setSurfaceSubView('3d');
                }}
                className={`px-3 py-1 rounded text-xs font-black flex items-center gap-1.5 transition-all ${
                  surfaceSubView === '3d'
                    ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                    : 'bg-[#0f1422] text-[#8b9bb4] hover:text-white border border-[#1e2638]'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D INTERACTIVE SURFACE (WEBGL)</span>
              </button>

              <button
                onClick={() => {
                  playKeyClick();
                  setSurfaceSubView('grid');
                }}
                className={`px-3 py-1 rounded text-xs font-black flex items-center gap-1.5 transition-all ${
                  surfaceSubView === 'grid'
                    ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                    : 'bg-[#0f1422] text-[#8b9bb4] hover:text-white border border-[#1e2638]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>2D DISPERSION MATRIX</span>
              </button>
            </div>

            <div className="text-[10px] text-[#8b9bb4]">
              Institutional volatility surface for {ticker.symbol} · {chains.length} Expirations
            </div>
          </div>

          {/* Subview 1: 3D Three.js Surface */}
          {surfaceSubView === '3d' && (
            <VolatilitySurface3D
              ticker={ticker}
              allChains={chains}
              onNavigateToChain={onNavigateToChain}
              onNavigateToHIVG={() => {
                playKeyClick();
                setActiveTab('hivg');
              }}
              onNavigateToSkews={() => {
                playKeyClick();
                setActiveTab('overlay');
              }}
              onNavigateToValuation={onNavigateToValuation}
            />
          )}

          {/* Subview 2: 2D Dispersion Matrix Grid */}
          {surfaceSubView === 'grid' && (
            <div className="bg-[#07090e] border border-[#1e2638] rounded shadow-2xl p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-3">
                <div>
                  <div className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Grid className="w-4 h-4 text-[#ff9900]" />
                    <span>2D Volatility Surface Grid (Strike vs Expiration Maturity)</span>
                  </div>
                  <div className="text-[11px] text-[#8b9bb4] mt-0.5">
                    Complete institutional dispersion matrix mapping implied volatility across all strikes and expirations.
                  </div>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-[#8b9bb4]">LOW IV</span>
                  <div className="flex h-3 w-36 rounded overflow-hidden">
                    <div className="w-1/4 bg-[#1e293b]" />
                    <div className="w-1/4 bg-[#0369a1]" />
                    <div className="w-1/4 bg-[#d97706]" />
                    <div className="w-1/4 bg-[#dc2626]" />
                  </div>
                  <span className="text-[#ff334b] font-bold">HIGH IV</span>
                </div>
              </div>

              {/* Matrix Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-center font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#0c121e] text-[#8b9bb4] border-b border-[#1e2638]">
                      <th className="py-2 px-3 text-left">EXPIRY / DTE</th>
                      {[85, 90, 95, 100, 105, 110, 115].map((m) => (
                        <th key={m} className={`py-2 px-2.5 ${m === 100 ? 'text-[#ffd600] font-black' : ''}`}>
                          {m}%
                          <span className="block text-[8px] text-[#64748b]">
                            ${(ticker.price * (m / 100)).toFixed(0)}
                          </span>
                        </th>
                      ))}
                      <th className="py-2 px-3">25Δ RR</th>
                      <th className="py-2 px-3">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141b28]">
                    {chains.map((c, index) => {
                      const summary = calculateSkewMetricsForChain(c, ticker.price);
                      const style = getExpiryColor(c.dte, index);

                      return (
                        <tr key={c.dte} className="hover:bg-[#141b28]/50 transition-colors">
                          <td className="py-2.5 px-3 text-left font-bold text-white flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: style.stroke, boxShadow: `0 0 6px ${style.stroke}aa` }}
                            />
                            <span>{c.formattedDate.split(',')[0]}</span>
                            <span className="font-bold text-[10px]" style={{ color: style.stroke }}>
                              ({c.dte}d)
                            </span>
                          </td>

                          {[85, 90, 95, 100, 105, 110, 115].map((m) => {
                            const targetStrike = ticker.price * (m / 100);
                            let closest = c.calls[0];
                            let minD = Infinity;
                            for (const contract of c.calls) {
                              const d = Math.abs(contract.strike - targetStrike);
                              if (d < minD) {
                                minD = d;
                                closest = contract;
                              }
                            }
                            const putClosest = c.puts.find((p) => p.strike === closest.strike);
                            const ivVal = m <= 100 && putClosest ? putClosest.iv : closest.iv;

                            let cellBg = 'bg-[#0f172a] text-[#cbd5e1]';
                            if (ivVal > ticker.currentIV * 1.35) {
                              cellBg = 'bg-[#7f1d1d] text-[#fecaca] font-black';
                            } else if (ivVal > ticker.currentIV * 1.15) {
                              cellBg = 'bg-[#78350f] text-[#fef3c7] font-bold';
                            } else if (ivVal > ticker.currentIV * 0.95) {
                              cellBg = 'bg-[#1e293b] text-[#e2e8f0]';
                            } else {
                              cellBg = 'bg-[#064e3b] text-[#a7f3d0]';
                            }

                            return (
                              <td key={m} className="p-1">
                                <div className={`p-1.5 rounded text-[10px] ${cellBg} border border-black/30`}>
                                  {(ivVal * 100).toFixed(1)}%
                                </div>
                              </td>
                            );
                          })}

                          <td
                            className={`py-2 px-3 text-right font-black ${
                              summary.riskReversal25D < 0 ? 'text-[#ff334b]' : 'text-[#00e676]'
                            }`}
                          >
                            {(summary.riskReversal25D * 100).toFixed(1)}%
                          </td>

                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => {
                                playKeyClick();
                                if (onSelectDte) onSelectDte(c.dte);
                                if (onNavigateToChain) onNavigateToChain();
                              }}
                              className="px-2 py-0.5 bg-[#141b28] hover:bg-[#ff9900] text-[#cbd5e1] hover:text-black font-bold rounded text-[9px] border border-[#2b354d]"
                            >
                              SELECT
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
        </div>
      )}

      {/* VIEW TAB 4: SINGLE EXPIRATION SMIRK DEEP DIVE */}
      {activeTab === 'single' && (
        <div className="bg-[#07090e] border border-[#1e2638] rounded shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-[#090d16] px-4 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase text-xs">
                Single Expiration Volatility Smirk — {activeChain.formattedDate} ({activeChain.dte} DTE)
              </span>
            </div>

            {/* Expiration Switcher */}
            <div className="flex items-center gap-1">
              <span className="text-[#8b9bb4] text-[10px] mr-1">SWITCH EXPIRY:</span>
              {chains.map((c) => (
                <button
                  key={c.dte}
                  onClick={() => {
                    playKeyClick();
                    if (onSelectDte) onSelectDte(c.dte);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.dte === activeChain.dte
                      ? 'bg-[#ff9900] text-black'
                      : 'bg-[#141b28] text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  {c.dte}D
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#05070a]">
            {/* Single smirk chart with Call IV vs Put IV */}
            <svg viewBox={`0 0 ${svgWidth} 230`} className="w-full h-64 select-none">
              {(() => {
                const sStrikes = activeChain.calls.map((c) => c.strike);
                const sMinStrike = Math.min(...sStrikes);
                const sMaxStrike = Math.max(...sStrikes);

                const sMinIV = Math.min(...activeChain.calls.map((c) => c.iv), ...activeChain.puts.map((p) => p.iv)) * 0.9;
                const sMaxIV = Math.max(...activeChain.calls.map((c) => c.iv), ...activeChain.puts.map((p) => p.iv)) * 1.1;

                const getSX = (strike: number) => {
                  return (
                    padding.left +
                    ((strike - sMinStrike) / (sMaxStrike - sMinStrike || 1)) * (svgWidth - padding.left - padding.right)
                  );
                };

                const getSY = (iv: number) => {
                  return (
                    230 -
                    padding.bottom -
                    ((iv - sMinIV) / (sMaxIV - sMinIV || 1)) * (230 - padding.top - padding.bottom)
                  );
                };

                const callIvPath = activeChain.calls.reduce((acc, c, idx) => {
                  const x = getSX(c.strike);
                  const y = getSY(c.iv);
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }, '');

                const putIvPath = activeChain.puts.reduce((acc, p, idx) => {
                  const x = getSX(p.strike);
                  const y = getSY(p.iv);
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }, '');

                const stockX = getSX(ticker.price);

                return (
                  <g>
                    {/* Grid */}
                    {[sMinIV, (sMinIV + sMaxIV) / 2, sMaxIV].map((iv, idx) => {
                      const y = getSY(iv);
                      return (
                        <g key={idx}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={svgWidth - padding.right}
                            y2={y}
                            stroke="#1e2638"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <text
                            x={padding.left - 6}
                            y={y + 3}
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="JetBrains Mono"
                            textAnchor="end"
                          >
                            {(iv * 100).toFixed(0)}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Stock Price */}
                    <line
                      x1={stockX}
                      y1={padding.top}
                      x2={stockX}
                      y2={230 - padding.bottom}
                      stroke="#ffd600"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={stockX}
                      y={padding.top - 4}
                      fill="#ffd600"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      Stock ${ticker.price.toFixed(2)}
                    </text>

                    {/* Curves */}
                    <path d={putIvPath} fill="none" stroke="#ff334b" strokeWidth="2.5" />
                    <path d={callIvPath} fill="none" stroke="#00e676" strokeWidth="2.5" strokeDasharray="3 2" />

                    {/* Strike labels */}
                    {sStrikes
                      .filter((_, i) => i % 2 === 0)
                      .map((s) => (
                        <text
                          key={s}
                          x={getSX(s)}
                          y={230 - padding.bottom + 16}
                          fill="#8b9bb4"
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                          textAnchor="middle"
                        >
                          ${s}
                        </text>
                      ))}
                  </g>
                );
              })()}
            </svg>

            <div className="flex items-center justify-between text-xs text-[#8b9bb4] mt-2 border-t border-[#1e2638] pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#ff334b] inline-block" />
                  <span className="text-[#cbd5e1]">Puts IV (Downside Skew)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#00e676] inline-block" />
                  <span className="text-[#cbd5e1]">Calls IV</span>
                </div>
              </div>
              <div>
                Average ATM IV: <strong className="text-white">{(activeChain.avgIV * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 5: HISTORICAL AND IMPLIED VOLATILITY (HIVG) */}
      {activeTab === 'hivg' && (
        <HistoricalImpliedVolChart
          ticker={ticker}
          allChains={chains}
          onNavigateToChain={onNavigateToChain}
          onNavigateToCone={onNavigateToCone}
          onNavigateToValuation={onNavigateToValuation}
          onNavigateToSkews={() => {
            playKeyClick();
            setActiveTab('overlay');
          }}
        />
      )}
    </div>
  );
};
