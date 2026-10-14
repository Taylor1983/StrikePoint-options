import React, { useState, useMemo } from 'react';
import {
  Ticker,
  ExpirationOptionChain,
  Position,
  TradeLeg,
} from '../types/options';
import {
  calculateVegaTermStructure,
  calculateAllExpirationsAllStrikesVega,
  ExpirationVegaPoint,
  VegaMaturityBucket,
  StrikeVegaCell,
  AllExpirationsAllStrikesVegaMatrix,
} from '../utils/vegaTermStructure';
import {
  EXPIRY_COLOR_PALETTE,
  DTE_EXPLICIT_COLORS,
  ExpiryColorStyle,
} from './VolatilityLabView';
import {
  Activity,
  TrendingUp,
  Sparkles,
  Layers,
  Sliders,
  Info,
  Calendar,
  Zap,
  BarChart2,
  DollarSign,
  ArrowRight,
  Maximize2,
  Check,
  Percent,
  Compass,
  Grid,
  Table,
  Search,
  Filter,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Flame,
  Shield,
  Clock,
  Plus,
  Palette,
  CheckCircle,
  Minimize2,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

interface VegaTermStructureViewProps {
  ticker: Ticker;
  chains: ExpirationOptionChain[];
  positions?: Position[];
  legs?: TradeLeg[];
  selectedDte?: number;
  onSelectDte?: (dte: number) => void;
  onNavigateToChain?: () => void;
  onNavigateToValuation?: () => void;
  onApplyStrategyTemplate?: (templateId: string) => void;
}

export type VegaChartCurveMetric = 'absolute' | 'weighted' | 'vomma' | 'veta' | 'elasticity';
export type VegaColorTheme = 'vivid' | 'term-gradient' | 'category';

export const VegaTermStructureView: React.FC<VegaTermStructureViewProps> = ({
  ticker,
  chains,
  positions = [],
  legs = [],
  selectedDte,
  onSelectDte,
  onNavigateToChain,
  onNavigateToValuation,
  onApplyStrategyTemplate,
}) => {
  // View mode switcher:
  // 'skews': All Expirations Vega Skew Curves Overlay (like Volatility Skews!)
  // 'matrix': 2D Heatmap Grid (All Strikes x All Expirations)
  // 'blotter': Hierarchical Multi-Expiration Strike Table
  // 'atm-curve': Constant Maturity DTE Term Structure Curve & Shock Simulator
  const [viewMode, setViewMode] = useState<'skews' | 'matrix' | 'blotter' | 'atm-curve'>('skews');

  // Skew Chart Controls (Matching Volatility Skews UX)
  const [curveMetric, setCurveMetric] = useState<VegaChartCurveMetric>('absolute');
  const [xAxisMode, setXAxisMode] = useState<'moneyness' | 'strike'>('moneyness');
  const [colorTheme, setColorTheme] = useState<VegaColorTheme>('vivid');
  const [hoveredStrike, setHoveredStrike] = useState<number | null>(null);
  const [hoveredTenorDte, setHoveredTenorDte] = useState<number | null>(null);

  // Enabled expirations for the skew overlay chart
  const [enabledSkewDtes, setEnabledSkewDtes] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    (chains || []).forEach((c) => {
      init[c.dte] = true;
    });
    return init;
  });

  // Matrix metric selector
  const [matrixMetric, setMatrixMetric] = useState<'vega' | 'weighted' | 'vomma' | 'veta' | 'notional' | 'elasticity'>('vega');
  const [strikeRange, setStrikeRange] = useState<'all' | '5' | '10' | '20' | 'puts' | 'calls'>('all');
  const [strikeSearch, setStrikeSearch] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<StrikeVegaCell | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Expanded tenors in blotter view
  const [expandedTenors, setExpandedTenors] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    if (chains && chains.length > 0) {
      init[chains[0].dte] = true;
      if (chains[1]) init[chains[1].dte] = true;
    }
    return init;
  });

  // ATM Curve interactive toggles
  const [showAbsoluteVega, setShowAbsoluteVega] = useState<boolean>(true);
  const [showWeightedVega, setShowWeightedVega] = useState<boolean>(true);
  const [show25DeltaSkew, setShow25DeltaSkew] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<ExpirationVegaPoint | null>(null);
  const [simVolShock, setSimVolShock] = useState<number>(0);
  const [simCurveTwist, setSimCurveTwist] = useState<number>(0);

  // Compute 2D Matrix of All Expirations and All Strikes
  const matrixData: AllExpirationsAllStrikesVegaMatrix = useMemo(() => {
    return calculateAllExpirationsAllStrikesVega(ticker, chains);
  }, [ticker, chains]);

  // Compute Vega Term Structure Analytics
  const analytics = useMemo(() => {
    return calculateVegaTermStructure(ticker, chains, positions, legs);
  }, [ticker, chains, positions, legs]);

  const { points, maturityBuckets, totalPortfolioNetVega, totalPortfolioWeightedVega } = analytics;

  // ---------------------------------------------------------------------------------
  // COLOR SCHEME LOGIC (Matching Volatility Skews)
  // ---------------------------------------------------------------------------------
  const getExpiryColor = (dte: number, index: number): ExpiryColorStyle => {
    if (colorTheme === 'vivid') {
      if (DTE_EXPLICIT_COLORS[dte]) {
        return DTE_EXPLICIT_COLORS[dte];
      }
      return EXPIRY_COLOR_PALETTE[index % EXPIRY_COLOR_PALETTE.length];
    }

    if (colorTheme === 'term-gradient') {
      const total = Math.max(1, (chains || []).length - 1);
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
    if (dte <= 25) {
      return { stroke: '#f97316', label: 'Weekly', bg: 'bg-orange-500', glow: 'rgba(249, 115, 22, 0.5)' };
    }
    if (dte <= 65) {
      return { stroke: '#06b6d4', label: 'Monthly', bg: 'bg-cyan-500', glow: 'rgba(6, 182, 212, 0.5)' };
    }
    if (dte <= 180) {
      return { stroke: '#10b981', label: 'Quarterly', bg: 'bg-emerald-500', glow: 'rgba(16, 185, 129, 0.5)' };
    }
    return { stroke: '#a855f7', label: 'LEAPS', bg: 'bg-purple-500', glow: 'rgba(168, 85, 247, 0.5)' };
  };

  // ---------------------------------------------------------------------------------
  // MULTI-EXPIRATION VEGA SKEWS SVG GEOMETRY
  // ---------------------------------------------------------------------------------
  const skewSvgWidth = 880;
  const skewSvgHeight = 350;
  const skewPadding = { top: 30, right: 35, bottom: 45, left: 65 };

  const moneynessDomain = [85, 115];
  const strikeDomain = [
    Number((ticker.price * 0.85).toFixed(1)),
    Number((ticker.price * 1.15).toFixed(1)),
  ];

  // Helper to extract numeric value for a cell based on curveMetric
  const getCellMetricValue = (cell: StrikeVegaCell | undefined): number => {
    if (!cell) return 0;
    switch (curveMetric) {
      case 'absolute':
        return cell.avgVega;
      case 'weighted':
        return cell.weightedVega30;
      case 'vomma':
        return Math.max(0, cell.vomma);
      case 'veta':
        return Math.abs(cell.veta);
      case 'elasticity':
        return (cell.callVegaPerShare || 0) * 100;
      default:
        return cell.avgVega;
    }
  };

  // Calculate maximum Y across all active curves and strikes
  const skewMaxY = useMemo(() => {
    let max = 0;
    for (const strike of matrixData.strikes) {
      for (const exp of matrixData.expirations) {
        if (!enabledSkewDtes[exp.dte]) continue;
        const cell = matrixData.matrix[strike]?.[exp.dte];
        const val = getCellMetricValue(cell);
        if (val > max) max = val;
      }
    }
    return Math.max(5, max * 1.12);
  }, [matrixData, enabledSkewDtes, curveMetric]);

  // Coordinate projection
  const getSkewX = (val: number) => {
    const [domainMin, domainMax] = xAxisMode === 'moneyness' ? moneynessDomain : strikeDomain;
    const ratio = (val - domainMin) / (domainMax - domainMin || 1);
    return skewPadding.left + ratio * (skewSvgWidth - skewPadding.left - skewPadding.right);
  };

  const getSkewY = (val: number) => {
    const ratio = val / (skewMaxY || 1);
    return skewSvgHeight - skewPadding.bottom - ratio * (skewSvgHeight - skewPadding.top - skewPadding.bottom);
  };

  // Generate SVG path for an expiration curve across strikes
  const getSkewPathForExpiration = (expDte: number): string => {
    const relevantStrikes = matrixData.strikes.filter((s) => {
      const pct = (s / ticker.price) * 100;
      return pct >= 84 && pct <= 116;
    });

    const pts = relevantStrikes.map((s) => {
      const cell = matrixData.matrix[s]?.[expDte];
      const val = getCellMetricValue(cell);
      const xVal = xAxisMode === 'moneyness' ? (s / ticker.price) * 100 : s;
      return {
        x: getSkewX(xVal),
        y: getSkewY(val),
      };
    });

    if (pts.length === 0) return '';
    return pts.reduce((acc, p, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, '');
  };

  // Handle interactive hover over SVG to track crosshair
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = skewSvgWidth / rect.width;
    const svgX = mouseX * scaleX;

    if (svgX < skewPadding.left || svgX > skewSvgWidth - skewPadding.right) {
      setHoveredStrike(null);
      return;
    }

    const [domainMin, domainMax] = xAxisMode === 'moneyness' ? moneynessDomain : strikeDomain;
    const frac = (svgX - skewPadding.left) / (skewSvgWidth - skewPadding.left - skewPadding.right);
    const domainVal = domainMin + frac * (domainMax - domainMin);

    // Find closest strike
    let closestStrike = matrixData.strikes[0];
    let minDiff = Infinity;
    matrixData.strikes.forEach((s) => {
      const cmpVal = xAxisMode === 'moneyness' ? (s / ticker.price) * 100 : s;
      const diff = Math.abs(cmpVal - domainVal);
      if (diff < minDiff) {
        minDiff = diff;
        closestStrike = s;
      }
    });

    setHoveredStrike(closestStrike);
  };

  // Hovered crosshair X coordinate
  const hoveredCrosshairX = useMemo(() => {
    if (!hoveredStrike) return null;
    const xVal = xAxisMode === 'moneyness' ? (hoveredStrike / ticker.price) * 100 : hoveredStrike;
    return getSkewX(xVal);
  }, [hoveredStrike, xAxisMode, ticker.price]);

  // ---------------------------------------------------------------------------------
  // ATM TERM STRUCTURE CURVE GEOMETRY
  // ---------------------------------------------------------------------------------
  const svgWidth = 880;
  const svgHeight = 320;
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };

  const yMax = useMemo(() => {
    let max = 0;
    points.forEach((p) => {
      if (showAbsoluteVega && p.atmVega100 > max) max = p.atmVega100;
      if (showWeightedVega && p.weightedVega30 > max) max = p.weightedVega30;
      if (show25DeltaSkew) {
        if (p.call25DeltaVega > max) max = p.call25DeltaVega;
        if (p.put25DeltaVega > max) max = p.put25DeltaVega;
      }
    });
    return Math.max(10, max * 1.15);
  }, [points, showAbsoluteVega, showWeightedVega, show25DeltaSkew]);

  const dteDomain = useMemo(() => {
    if (points.length === 0) return [0, 365];
    const dtes = points.map((p) => p.dte);
    return [Math.min(...dtes), Math.max(...dtes)];
  }, [points]);

  const getX = (dte: number) => {
    const [minDte, maxDte] = dteDomain;
    const ratio = (dte - minDte) / (maxDte - minDte || 1);
    return padding.left + ratio * (svgWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const ratio = Math.max(0, val) / (yMax || 1);
    return svgHeight - padding.bottom - ratio * (svgHeight - padding.top - padding.bottom);
  };

  const absoluteVegaPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, idx) => {
      const x = getX(p.dte);
      const y = getY(p.atmVega100);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [points, yMax, dteDomain]);

  const weightedVegaPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, idx) => {
      const x = getX(p.dte);
      const y = getY(p.weightedVega30);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [points, yMax, dteDomain]);

  const call25Path = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, idx) => {
      const x = getX(p.dte);
      const y = getY(p.call25DeltaVega);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [points, yMax, dteDomain]);

  const put25Path = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, idx) => {
      const x = getX(p.dte);
      const y = getY(p.put25DeltaVega);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [points, yMax, dteDomain]);

  // Filter strikes for matrix table
  const filteredStrikes = useMemo(() => {
    let result = matrixData.strikes;
    const spot = ticker.price;

    if (strikeSearch.trim()) {
      const q = strikeSearch.trim();
      result = result.filter((s) => String(s).includes(q));
    }

    if (strikeRange === '5') {
      result = result.filter((s) => Math.abs(s - spot) / spot <= 0.05);
    } else if (strikeRange === '10') {
      result = result.filter((s) => Math.abs(s - spot) / spot <= 0.10);
    } else if (strikeRange === '20') {
      result = result.filter((s) => Math.abs(s - spot) / spot <= 0.20);
    } else if (strikeRange === 'puts') {
      result = result.filter((s) => s <= spot * 1.02);
    } else if (strikeRange === 'calls') {
      result = result.filter((s) => s >= spot * 0.98);
    }

    return result;
  }, [matrixData.strikes, ticker.price, strikeRange, strikeSearch]);

  // Color intensity mapper for Vega cells
  const getCellColor = (val: number, max: number, isATM: boolean) => {
    if (val <= 0) return 'bg-[#090d16] text-[#64748b]';
    const ratio = Math.max(0, Math.min(1, val / (max || 1)));

    if (ratio > 0.8) {
      return isATM
        ? 'bg-[#ff9900]/30 text-[#ffaa00] font-black border border-[#ff9900]/60 shadow-[0_0_8px_rgba(255,153,0,0.3)]'
        : 'bg-[#ff9900]/25 text-[#ff9900] font-black border border-[#ff9900]/40';
    }
    if (ratio > 0.6) {
      return 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold border border-[#00e5ff]/30';
    }
    if (ratio > 0.4) {
      return 'bg-[#38bdf8]/15 text-[#38bdf8] font-bold border border-[#38bdf8]/20';
    }
    if (ratio > 0.2) {
      return 'bg-[#0284c7]/10 text-[#93c5fd] border border-[#0284c7]/15';
    }
    return 'bg-[#0b101d] text-[#8b9bb4]';
  };

  const formatCellValue = (cell: StrikeVegaCell | undefined) => {
    if (!cell) return '-';
    switch (matrixMetric) {
      case 'vega':
        return `$${cell.avgVega.toFixed(1)}`;
      case 'weighted':
        return `$${cell.weightedVega30.toFixed(1)}`;
      case 'vomma':
        return `+${cell.vomma.toFixed(2)}`;
      case 'veta':
        return `${cell.veta.toFixed(2)}`;
      case 'notional':
        return cell.marketVegaNotional > 1000
          ? `$${(cell.marketVegaNotional / 1000).toFixed(0)}k`
          : `$${cell.marketVegaNotional}`;
      case 'elasticity':
        return `${cell.callVegaPerShare > 0 ? (cell.callVegaPerShare * 100).toFixed(1) : '0'}%`;
      default:
        return `$${cell.avgVega.toFixed(1)}`;
    }
  };

  const handleExportCSV = () => {
    playExecutionChime();
    const headers = ['Strike', 'Moneyness%', ...matrixData.expirations.map((e) => `${e.month}_${e.dte}D_Vega`)];
    const rows = matrixData.strikes.map((s) => {
      const rowVals = [
        s.toFixed(1),
        ((s / ticker.price) * 100).toFixed(1) + '%',
        ...matrixData.expirations.map((e) => {
          const cell = matrixData.matrix[s]?.[e.dte];
          return cell ? cell.avgVega.toFixed(2) : '0';
        }),
      ];
      return rowVals.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    try {
      navigator.clipboard?.writeText(csv);
      setCopiedNotification('Vega surface (all expirations & all strikes) copied to clipboard as CSV!');
      setTimeout(() => setCopiedNotification(null), 3500);
    } catch {}
  };

  const toggleAllTenors = (expand: boolean) => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    if (expand) {
      matrixData.expirations.forEach((e) => {
        updated[e.dte] = true;
      });
    }
    setExpandedTenors(updated);
  };

  // Bulk toggle for skew overlay chart
  const setAllSkewTenors = (state: boolean) => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    matrixData.expirations.forEach((e) => {
      updated[e.dte] = state;
    });
    setEnabledSkewDtes(updated);
  };

  const filterSkewPreset = (type: 'front' | 'mid' | 'leaps') => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    matrixData.expirations.forEach((e) => {
      if (type === 'front') updated[e.dte] = e.dte <= 30;
      else if (type === 'mid') updated[e.dte] = e.dte > 30 && e.dte <= 120;
      else updated[e.dte] = e.dte > 120;
    });
    setEnabledSkewDtes(updated);
  };

  return (
    <div className="bg-[#07090e] border border-[#1e2638] rounded-lg shadow-2xl p-3 sm:p-4 flex flex-col gap-4 text-xs font-sans select-none">
      {/* 1. Header Banner & Term Structure Regime */}
      <div className="bg-[#0b101c] border border-[#ff9900]/30 rounded p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#ff9900]/10 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900] shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-white tracking-wide uppercase">
                {ticker.symbol} VEGA ALL EXPIRATIONS &amp; ALL STRIKES ENGINE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 font-mono font-black">
                {matrixData.expirations.length} TENORS · {matrixData.strikes.length} STRIKES
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 font-mono font-bold">
                {analytics.regimeLabel}
              </span>
            </div>
            <div className="text-[11px] text-[#8b9bb4] mt-0.5 flex flex-wrap items-center gap-2">
              <span>Spot: <strong className="text-white font-mono">${ticker.price.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Front-Month ATM: <strong className="text-[#00e5ff]">${analytics.frontMonthVega.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Back-Month ATM: <strong className="text-[#ff9900]">${analytics.backMonthVega.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Term Multiplier: <strong className="text-white">{analytics.vegaSlopeRatio}x</strong></span>
              <span>·</span>
              <span>Surface Max Vega: <strong className="text-[#ffd600]">${matrixData.maxVega.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Shortcuts & CSV Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 bg-[#141b28] hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white border border-[#222d44] rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export complete Vega Surface matrix to CSV clipboard"
          >
            <Copy className="w-3.5 h-3.5 text-[#00d2ff]" />
            <span className="hidden sm:inline">COPY CSV MATRIX</span>
          </button>

          {onNavigateToValuation && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToValuation();
              }}
              className="px-2.5 py-1.5 bg-[#141b28] hover:bg-[#1e293b] text-white border border-[#222d44] hover:border-[#ff9900]/50 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>OVME</span>
              <ArrowRight className="w-3 h-3 text-[#ff9900]" />
            </button>
          )}

          {onNavigateToChain && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToChain();
              }}
              className="px-2.5 py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black rounded text-xs font-black transition-all flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <span>OPTION CHAIN</span>
            </button>
          )}
        </div>
      </div>

      {/* Copy notification popup */}
      {copiedNotification && (
        <div className="bg-[#00e676]/20 border border-[#00e676] text-[#00e676] px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* 2. Top Summary Metric Cards (5 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#ef4444]" />
            <span>Front ATM Vega ({analytics.frontMonthDte}D)</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
            ${analytics.frontMonthVega.toFixed(2)}
            <span className="text-[10px] text-[#8b9bb4] font-normal ml-1">/ 1% IV</span>
          </div>
          <div className="text-[9px] text-[#64748b]">
            Short tenor; sharp narrow Vega peak
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#a855f7]" />
            <span>Back ATM Vega ({analytics.backMonthDte}D)</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-[#ff9900] mt-1">
            ${analytics.backMonthVega.toFixed(2)}
            <span className="text-[10px] text-[#8b9bb4] font-normal ml-1">/ 1% IV</span>
          </div>
          <div className="text-[9px] text-[#64748b]">
            Broad, towering Vega curvature (&radic;T)
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#00e5ff]" />
            <span>Term Multiplier</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-[#00e5ff] mt-1">
            {analytics.vegaSlopeRatio}x
          </div>
          <div className="text-[9px] text-[#64748b]">
            Back-to-front maturity Vega ratio
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#ffd600]" />
            <span>Surface Peak Vega</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-[#ffd600] mt-1">
            ${matrixData.maxVega.toFixed(2)}
          </div>
          <div className="text-[9px] text-[#64748b]">
            Maximum Vega across all strikes &amp; tenors
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-[#00e676]" />
            <span>Portfolio Net Vega</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-[#00e676] mt-1">
            {totalPortfolioNetVega >= 0 ? `+$${totalPortfolioNetVega.toFixed(2)}` : `-$${Math.abs(totalPortfolioNetVega).toFixed(2)}`}
          </div>
          <div className="text-[9px] text-[#64748b]">
            Weighted: ${totalPortfolioWeightedVega.toFixed(2)} (D-Vega)
          </div>
        </div>
      </div>

      {/* 3. Primary View Mode Navigation Bar */}
      <div className="bg-[#0a0f1c] border border-[#1e2638] rounded-lg p-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#070a12] p-1 border border-[#1a2336] rounded">
          {/* SKEW OVERLAY TAB (Exact match to "show vega term structure all expirations like volatility skews") */}
          <button
            onClick={() => {
              playKeyClick();
              setViewMode('skews');
            }}
            className={`px-3 py-1.5 rounded text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'skews'
                ? 'bg-[#00e5ff] text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>VEGA SKEWS (ALL EXPIRATIONS OVERLAY)</span>
          </button>

          {/* 2D HEATMAP GRID */}
          <button
            onClick={() => {
              playKeyClick();
              setViewMode('matrix');
            }}
            className={`px-3 py-1.5 rounded text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-[#ff9900] text-black shadow-[0_0_12px_rgba(255,153,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>2D HEATMAP MATRIX</span>
          </button>

          {/* BLOTTER */}
          <button
            onClick={() => {
              playKeyClick();
              setViewMode('blotter');
            }}
            className={`px-3 py-1.5 rounded text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'blotter'
                ? 'bg-[#a855f7] text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>STRIKE BLOTTER</span>
          </button>

          {/* ATM CURVE */}
          <button
            onClick={() => {
              playKeyClick();
              setViewMode('atm-curve');
            }}
            className={`px-3 py-1.5 rounded text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'atm-curve'
                ? 'bg-[#ffd600] text-black shadow-[0_0_12px_rgba(255,214,0,0.4)]'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ATM DTE CURVE</span>
          </button>
        </div>

        {/* View Controls: Metric Selector */}
        {viewMode === 'skews' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Color Palette */}
            <div className="flex items-center gap-1 bg-[#101726] p-0.5 rounded border border-[#1e2a44] text-[10px]">
              <span className="text-[#8b9bb4] px-1 font-bold flex items-center gap-1">
                <Palette className="w-3 h-3 text-[#ff9900]" />
                THEME:
              </span>
              <button
                onClick={() => setColorTheme('vivid')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  colorTheme === 'vivid' ? 'bg-[#c084fc] text-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                VIVID
              </button>
              <button
                onClick={() => setColorTheme('term-gradient')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  colorTheme === 'term-gradient' ? 'bg-[#00e5ff] text-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                GRADIENT
              </button>
              <button
                onClick={() => setColorTheme('category')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  colorTheme === 'category' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                TENORS
              </button>
            </div>

            {/* Metric Mode */}
            <div className="flex items-center gap-1 bg-[#101726] p-0.5 rounded border border-[#1e2a44] text-[10px]">
              <span className="text-[#8b9bb4] px-1 font-bold">METRIC:</span>
              <button
                onClick={() => setCurveMetric('absolute')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  curveMetric === 'absolute' ? 'bg-[#ff9900] text-black font-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
                title="Absolute Vega ($ per 1% IV shift per 100-share contract)"
              >
                ABSOLUTE VEGA ($)
              </button>
              <button
                onClick={() => setCurveMetric('weighted')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  curveMetric === 'weighted' ? 'bg-[#00e5ff] text-black font-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
                title="Constant Maturity 30-Day Normalized Vega (D-Vega = Vega * sqrt(30/DTE))"
              >
                30D WEIGHTED
              </button>
              <button
                onClick={() => setCurveMetric('vomma')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  curveMetric === 'vomma' ? 'bg-[#a855f7] text-white font-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
                title="Vomma (Volga = dVega/dIV)"
              >
                VOMMA
              </button>
            </div>

            {/* X-Axis Mode */}
            <div className="flex items-center gap-1 bg-[#101726] p-0.5 rounded border border-[#1e2a44] text-[10px]">
              <span className="text-[#8b9bb4] px-1 font-bold">X-AXIS:</span>
              <button
                onClick={() => setXAxisMode('moneyness')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  xAxisMode === 'moneyness' ? 'bg-[#00e5ff] text-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                % MONEYNESS
              </button>
              <button
                onClick={() => setXAxisMode('strike')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  xAxisMode === 'strike' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                STRIKE ($)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. VIEW MODE: ALL EXPIRATIONS VEGA SKEWS OVERLAY (LIKE VOLATILITY SKEWS) */}
      {viewMode === 'skews' && (
        <div className="bg-[#07090e] border border-[#1e2638] rounded-lg shadow-2xl overflow-hidden flex flex-col gap-3 p-3">
          {/* Chart Header Bar */}
          <div className="bg-[#090d16] px-3 py-2 border border-[#1e2638] rounded flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff] animate-pulse" />
              <span className="font-black text-white text-xs tracking-wider uppercase">
                {ticker.symbol} VEGA SKEW &amp; SMILE OVERLAY ({Object.values(enabledSkewDtes).filter(Boolean).length} OF {matrixData.expirations.length} EXPIRATIONS DISPLAYED)
              </span>
            </div>

            {/* Fast Tenor Filters */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-[#8b9bb4] hidden sm:inline">QUICK FILTERS:</span>
              <button
                onClick={() => setAllSkewTenors(true)}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e293b] text-[#00e5ff] rounded border border-[#222d44] font-bold cursor-pointer"
              >
                ALL ON
              </button>
              <button
                onClick={() => filterSkewPreset('front')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e293b] text-[#ef4444] rounded border border-[#222d44] font-bold cursor-pointer"
              >
                FRONT (&le;30D)
              </button>
              <button
                onClick={() => filterSkewPreset('mid')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e293b] text-[#38bdf8] rounded border border-[#222d44] font-bold cursor-pointer"
              >
                MID (30-120D)
              </button>
              <button
                onClick={() => filterSkewPreset('leaps')}
                className="px-2 py-0.5 bg-[#141b28] hover:bg-[#1e293b] text-[#a855f7] rounded border border-[#222d44] font-bold cursor-pointer"
              >
                LEAPS (&gt;120D)
              </button>
            </div>
          </div>

          {/* The Multi-Curve SVG Canvas */}
          <div className="relative bg-[#06080f] border border-[#1e2638] rounded-lg p-2 overflow-x-auto">
            <svg
              viewBox={`0 0 ${skewSvgWidth} ${skewSvgHeight}`}
              className="w-full h-auto min-w-[720px] cursor-crosshair"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={() => setHoveredStrike(null)}
            >
              <defs>
                <filter id="vegaGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Y-Axis Horizontal Grid Lines */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac) => {
                const y = getSkewY(skewMaxY * frac);
                return (
                  <g key={frac}>
                    <line
                      x1={skewPadding.left}
                      y1={y}
                      x2={skewSvgWidth - skewPadding.right}
                      y2={y}
                      stroke="#141c2c"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={skewPadding.left - 8}
                      y={y + 3.5}
                      fill="#64748b"
                      fontSize="9.5"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {curveMetric === 'vomma'
                        ? `+${(skewMaxY * frac).toFixed(2)}`
                        : `$${(skewMaxY * frac).toFixed(0)}`}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Vertical Grid Lines */}
              {[85, 90, 95, 100, 105, 110, 115].map((mVal) => {
                const strikeVal = Number((ticker.price * (mVal / 100)).toFixed(1));
                const xPos = getSkewX(xAxisMode === 'moneyness' ? mVal : strikeVal);
                const isSpot = mVal === 100;

                return (
                  <g key={mVal}>
                    <line
                      x1={xPos}
                      y1={skewPadding.top}
                      x2={xPos}
                      y2={skewSvgHeight - skewPadding.bottom}
                      stroke={isSpot ? '#ff9900' : '#141c2c'}
                      strokeWidth={isSpot ? 1.5 : 1}
                      strokeDasharray={isSpot ? '4 2' : '3 3'}
                      strokeOpacity={isSpot ? 0.7 : 1}
                    />
                    <text
                      x={xPos}
                      y={skewSvgHeight - skewPadding.bottom + 16}
                      fill={isSpot ? '#ff9900' : '#8b9bb4'}
                      fontWeight={isSpot ? 'bold' : 'normal'}
                      fontSize="9.5"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {xAxisMode === 'moneyness' ? `${mVal}%` : `$${strikeVal}`}
                    </text>
                    {isSpot && (
                      <text
                        x={xPos}
                        y={skewPadding.top - 10}
                        fill="#ff9900"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        SPOT: ${ticker.price.toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Plotted Vega Curves for Every Enabled Expiration */}
              {matrixData.expirations.map((exp, idx) => {
                if (!enabledSkewDtes[exp.dte]) return null;
                const pathStr = getSkewPathForExpiration(exp.dte);
                const colorStyle = getExpiryColor(exp.dte, idx);
                const isHoveredTenor = hoveredTenorDte === exp.dte;

                return (
                  <g key={exp.dte}>
                    <path
                      d={pathStr}
                      fill="none"
                      stroke={colorStyle.stroke}
                      strokeWidth={isHoveredTenor ? 3.5 : 2.2}
                      strokeOpacity={hoveredTenorDte && !isHoveredTenor ? 0.35 : 0.95}
                      filter={isHoveredTenor ? 'url(#vegaGlow)' : undefined}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredTenorDte(exp.dte)}
                      onMouseLeave={() => setHoveredTenorDte(null)}
                    />
                  </g>
                );
              })}

              {/* Vertical Crosshair Line when Hovering */}
              {hoveredCrosshairX !== null && (
                <g>
                  <line
                    x1={hoveredCrosshairX}
                    y1={skewPadding.top}
                    x2={hoveredCrosshairX}
                    y2={skewSvgHeight - skewPadding.bottom}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    strokeOpacity="0.8"
                  />
                  <circle
                    cx={hoveredCrosshairX}
                    cy={skewSvgHeight - skewPadding.bottom}
                    r="4"
                    fill="#ffd600"
                  />
                </g>
              )}
            </svg>

            {/* Hover Floating Tooltip HUD: Cross-Maturity Vega Readout */}
            {hoveredStrike && (
              <div className="absolute top-4 right-4 bg-[#0a101d]/95 border border-[#1e2a44] backdrop-blur-md rounded-lg p-3 shadow-2xl z-30 max-w-[280px] font-mono text-[11px] animate-in fade-in duration-100">
                <div className="flex items-center justify-between border-b border-[#1e2a44] pb-1.5 mb-2">
                  <span className="font-bold text-white text-xs">
                    STRIKE: ${hoveredStrike.toFixed(1)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] font-black">
                    {((hoveredStrike / ticker.price) * 100).toFixed(1)}% MONEYNESS
                  </span>
                </div>

                <div className="text-[10px] text-[#8b9bb4] mb-1.5">
                  Vega ({curveMetric.toUpperCase()}) across active tenors:
                </div>

                <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-1">
                  {matrixData.expirations
                    .filter((e) => enabledSkewDtes[e.dte])
                    .map((e, idx) => {
                      const cell = matrixData.matrix[hoveredStrike]?.[e.dte];
                      const val = getCellMetricValue(cell);
                      const color = getExpiryColor(e.dte, idx);

                      return (
                        <div key={e.dte} className="flex items-center justify-between text-[10.5px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.stroke }} />
                            <span className="text-white font-bold">{e.month}</span>
                            <span className="text-[#8b9bb4] text-[9.5px]">({e.dte}D)</span>
                          </div>
                          <span className="font-bold font-mono" style={{ color: color.stroke }}>
                            ${val.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Expiration Pills (Below Chart - Click to Toggle, Color Swatches) */}
          <div className="bg-[#080d18] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-white">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#ff9900]" />
                <span>EXPIRATION CURVES LEGEND ({matrixData.expirations.length} TENORS)</span>
              </span>
              <span className="text-[10px] text-[#8b9bb4] font-mono">
                Click pill to toggle visibility · Hover curve to highlight
              </span>
            </div>

            {/* Scrollable Pills Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {matrixData.expirations.map((exp, idx) => {
                const isEnabled = !!enabledSkewDtes[exp.dte];
                const color = getExpiryColor(exp.dte, idx);
                const isHovered = hoveredTenorDte === exp.dte;

                return (
                  <button
                    key={exp.dte}
                    onClick={() => {
                      playKeyClick();
                      setEnabledSkewDtes((prev) => ({ ...prev, [exp.dte]: !prev[exp.dte] }));
                    }}
                    onMouseEnter={() => setHoveredTenorDte(exp.dte)}
                    onMouseLeave={() => setHoveredTenorDte(null)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isEnabled
                        ? isHovered
                          ? 'bg-[#152238] border-white text-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                          : 'bg-[#0f1726] border-[#1e2a44] text-white hover:border-[#38bdf8]'
                        : 'bg-[#06080e] border-[#141b28] text-[#55637a] opacity-50'
                    }`}
                    title={`${exp.month} ${exp.formattedDate} (${exp.dte} Days). ATM Vega: $${exp.atmVega.toFixed(1)}. Click to toggle curve.`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isEnabled ? color.stroke : '#475569',
                        boxShadow: isEnabled ? `0 0 6px ${color.stroke}` : 'none',
                      }}
                    />
                    <span>{exp.month}</span>
                    <span className="text-[9.5px] opacity-75">{exp.dte}d</span>
                    <span
                      className="text-[9.5px] font-black ml-0.5"
                      style={{ color: isEnabled ? color.stroke : '#64748b' }}
                    >
                      ${exp.atmVega.toFixed(0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantitative Desk Observations on Vega Smile & Skew */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5">
              <span className="text-[10px] font-bold text-[#ff9900] uppercase block">
                Term Structure Vol-of-Vol Expansion
              </span>
              <p className="text-[10.5px] text-[#8b9bb4] mt-1 leading-relaxed">
                Short-dated curves (0D to 16D) exhibit steep, localized peaks directly at spot price, decaying rapidly outside ATM. Long-dated tenors (90D to 720D) broaden into expansive parabolic wings, creating large absolute Vega exposure across wide price channels.
              </p>
            </div>

            <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5">
              <span className="text-[10px] font-bold text-[#00e5ff] uppercase block">
                Constant Maturity 30D Normalization
              </span>
              <p className="text-[10.5px] text-[#8b9bb4] mt-1 leading-relaxed">
                Toggle metric to <strong className="text-white">30D WEIGHTED</strong> to normalize all tenors using Vega (30D) = Vega × √(30 / DTE). This removes the √(T) duration bias and reveals the genuine volatility velocity skew across strikes.
              </p>
            </div>

            <div className="bg-[#090d16] border border-[#1e2638] rounded p-2.5">
              <span className="text-[10px] font-bold text-[#a855f7] uppercase block">
                Calendar Spread Relative Value Edge
              </span>
              <p className="text-[10.5px] text-[#8b9bb4] mt-1 leading-relaxed">
                Calendar traders capture the vertical spread between front-month and back-month curves. Selling near-term options captures rapid theta decay with minimal Vega drag, while buying long-dated options locks in elevated structural Vega sensitivity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE: 2D VEGA SURFACE MATRIX (HEATMAP) */}
      {viewMode === 'matrix' && (
        <div className="border border-[#1e2638] rounded-lg overflow-hidden flex flex-col bg-[#080d18]">
          <div className="bg-[#0d1424] px-4 py-2.5 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3 font-bold text-white text-xs">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-[#ff9900]" />
              <span className="uppercase tracking-wide">
                2D VEGA SURFACE MATRIX: {filteredStrikes.length} STRIKES &times; {matrixData.expirations.length} EXPIRATIONS
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono text-[#8b9bb4]">
              <span>LOW VEGA</span>
              <div className="flex items-center h-2 w-28 rounded bg-gradient-to-r from-[#0284c7]/20 via-[#00e5ff]/50 to-[#ff9900]" />
              <span className="text-[#ff9900] font-bold">PEAK VEGA (${matrixData.maxVega.toFixed(1)})</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[580px] relative">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="sticky top-0 z-20 bg-[#060a12] border-b border-[#1e2638] shadow-sm">
                <tr className="text-[#8b9bb4] uppercase text-[10px] font-mono">
                  <th className="sticky left-0 z-30 bg-[#060a12] py-2.5 px-3 border-r border-[#1e2638] w-24">
                    Strike ($)
                  </th>
                  <th className="sticky left-24 z-30 bg-[#060a12] py-2.5 px-2.5 border-r border-[#1e2638] w-20 text-right">
                    Moneyness
                  </th>

                  {matrixData.expirations.map((exp) => (
                    <th
                      key={exp.dte}
                      className="py-2.5 px-2 text-center min-w-[76px] border-r border-[#151f33] hover:bg-[#101726] transition-colors cursor-pointer"
                      onClick={() => {
                        playKeyClick();
                        if (onSelectDte) onSelectDte(exp.dte);
                      }}
                      title={`${exp.month} ${exp.formattedDate} (${exp.dte} Days). ATM Vega: $${exp.atmVega.toFixed(0)}`}
                    >
                      <div className="text-white font-bold">{exp.month}</div>
                      <div className="text-[9px] text-[#38bdf8] font-bold">{exp.dte}D</div>
                      <div className="text-[8px] text-[#64748b]">ATM: ${exp.atmVega.toFixed(0)}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#101726] font-mono text-[11px]">
                {filteredStrikes.map((strike) => {
                  const moneyness = Number(((strike / ticker.price) * 100).toFixed(1));
                  const isAtm = Math.abs(strike - ticker.price) / ticker.price < 0.015;

                  return (
                    <tr
                      key={strike}
                      className={`hover:bg-[#0f172a]/60 transition-colors ${
                        isAtm ? 'bg-[#ff9900]/10 font-bold' : ''
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 py-1.5 px-3 border-r border-[#1e2638] font-bold ${
                          isAtm
                            ? 'bg-[#1a1708] text-[#ff9900] border-l-2 border-l-[#ff9900]'
                            : strike < ticker.price
                            ? 'bg-[#080d18] text-[#ef4444]'
                            : 'bg-[#080d18] text-[#00e676]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>${strike.toFixed(1)}</span>
                          {isAtm && <span className="text-[8px] px-1 rounded bg-[#ff9900] text-black font-black">ATM</span>}
                        </div>
                      </td>

                      <td className="sticky left-24 z-10 bg-[#080d18] py-1.5 px-2.5 border-r border-[#1e2638] text-right text-[#8b9bb4]">
                        {moneyness}%
                      </td>

                      {matrixData.expirations.map((exp) => {
                        const cell = matrixData.matrix[strike]?.[exp.dte];
                        const cellVal = cell ? cell.avgVega : 0;
                        const isSelected = selectedCell && selectedCell.strike === strike && selectedCell.dte === exp.dte;
                        const cellColorClass = getCellColor(cellVal, matrixData.maxVega, isAtm);

                        return (
                          <td
                            key={exp.dte}
                            onClick={() => {
                              playKeyClick();
                              if (cell) setSelectedCell(cell);
                            }}
                            className={`py-1.5 px-2 text-center border-r border-[#121929] cursor-pointer transition-all ${cellColorClass} ${
                              isSelected ? 'ring-2 ring-[#ffd600] z-10' : 'hover:scale-105'
                            }`}
                            title={`Strike: $${strike} | ${exp.month} (${exp.dte}D)\nVega: $${cell?.avgVega}\nWeighted: $${cell?.weightedVega30}\nClick to inspect`}
                          >
                            {formatCellValue(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VIEW MODE: MULTI-EXPIRATION STRIKE BLOTTER */}
      {viewMode === 'blotter' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-[#0a0f1c] border border-[#1e2638] rounded p-2.5">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <Table className="w-4 h-4 text-[#00e5ff]" />
              <span>HIERARCHICAL MULTI-EXPIRATION STRIKE BLOTTER</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAllTenors(true)}
                className="px-2.5 py-1 bg-[#141b28] hover:bg-[#1e293b] text-[#00e5ff] border border-[#00e5ff]/30 rounded text-[10px] font-bold cursor-pointer"
              >
                + Expand All Tenors
              </button>
              <button
                onClick={() => toggleAllTenors(false)}
                className="px-2.5 py-1 bg-[#141b28] hover:bg-[#1e293b] text-[#8b9bb4] hover:text-white border border-[#222d44] rounded text-[10px] font-bold cursor-pointer"
              >
                - Collapse All
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {matrixData.expirations.map((exp) => {
              const isExpanded = !!expandedTenors[exp.dte];
              const strikesForTenor = filteredStrikes;

              return (
                <div
                  key={exp.dte}
                  className="bg-[#080d18] border border-[#1e2638] rounded-lg overflow-hidden transition-all shadow-sm"
                >
                  <div
                    onClick={() => {
                      playKeyClick();
                      setExpandedTenors((prev) => ({ ...prev, [exp.dte]: !prev[exp.dte] }));
                    }}
                    className="bg-[#0d1424] hover:bg-[#121c32] p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b border-[#1e2638]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[#38bdf8]">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          {exp.month} EXPIRATION ({exp.formattedDate})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 font-mono text-[10px] font-bold">
                          {exp.dte} DTE
                        </span>
                        <span className="text-[11px] text-[#8b9bb4]">
                          ATM Strike: <strong className="text-white font-mono">${exp.atmStrike.toFixed(1)}</strong>
                        </span>
                        <span className="text-[11px] text-[#8b9bb4]">
                          ATM Vega: <strong className="text-[#ff9900] font-mono">${exp.atmVega.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-[#8b9bb4]">
                      {isExpanded ? 'Click to collapse' : `Click to view ${strikesForTenor.length} strikes`}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="bg-[#060a12] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px] font-mono">
                            <th className="py-2 px-3">Strike ($)</th>
                            <th className="py-2 px-3 text-right">Moneyness</th>
                            <th className="py-2 px-3 text-right text-[#00e5ff]">Call Vega ($)</th>
                            <th className="py-2 px-3 text-right text-[#00e5ff]">Put Vega ($)</th>
                            <th className="py-2 px-3 text-right text-[#ff9900]">Avg Vega / Contract</th>
                            <th className="py-2 px-3 text-right text-[#ffd600]">30D D-Vega</th>
                            <th className="py-2 px-3 text-right text-[#a855f7]">Vomma (Volga)</th>
                            <th className="py-2 px-3 text-right text-[#ff334b]">Veta (Decay/d)</th>
                            <th className="py-2 px-3 text-right text-slate-300">Call / Put IV</th>
                            <th className="py-2 px-3 text-right text-[#8b9bb4]">Open Interest</th>
                            <th className="py-2 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#121929] font-mono text-[11px]">
                          {strikesForTenor.map((strike) => {
                            const cell = matrixData.matrix[strike]?.[exp.dte];
                            if (!cell) return null;
                            const isAtm = cell.isATM;

                            return (
                              <tr
                                key={strike}
                                onClick={() => {
                                  playKeyClick();
                                  setSelectedCell(cell);
                                }}
                                className={`hover:bg-[#121929] cursor-pointer transition-colors ${
                                  isAtm ? 'bg-[#ff9900]/10 font-bold' : ''
                                }`}
                              >
                                <td className="py-2 px-3 font-bold text-white">
                                  <div className="flex items-center gap-1.5">
                                    <span className={strike < ticker.price ? 'text-[#ef4444]' : 'text-[#00e676]'}>
                                      ${strike.toFixed(1)}
                                    </span>
                                    {isAtm && (
                                      <span className="text-[8px] px-1 bg-[#ff9900] text-black font-black rounded">
                                        ATM
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right text-[#8b9bb4]">
                                  {cell.moneynessPct}%
                                </td>
                                <td className="py-2 px-3 text-right text-[#00e5ff] font-bold">
                                  ${cell.callVega.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right text-[#00e5ff] font-bold">
                                  ${cell.putVega.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right text-[#ff9900] font-black">
                                  ${cell.avgVega.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right text-[#ffd600] font-bold">
                                  ${cell.weightedVega30.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right text-[#a855f7]">
                                  +{cell.vomma.toFixed(3)}
                                </td>
                                <td className="py-2 px-3 text-right text-[#ff334b]">
                                  {cell.veta.toFixed(3)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-300">
                                  {(cell.callIV * 100).toFixed(1)}% / {(cell.putIV * 100).toFixed(1)}%
                                </td>
                                <td className="py-2 px-3 text-right text-[#8b9bb4]">
                                  {cell.totalOI.toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playKeyClick();
                                      if (onApplyStrategyTemplate) {
                                        onApplyStrategyTemplate('call-calendar-spread');
                                      } else if (onNavigateToValuation) {
                                        onNavigateToValuation();
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-[#141b28] hover:bg-[#ff9900] hover:text-black text-[#ff9900] border border-[#ff9900]/40 text-[9px] font-bold transition-all cursor-pointer"
                                  >
                                    TRADE
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. VIEW MODE: ATM TERM STRUCTURE & VOLATILITY SHOCK SIMULATOR */}
      {viewMode === 'atm-curve' && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#0b101c] border border-[#1e2638] rounded p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white uppercase">Curve Toggles:</span>
              <button
                onClick={() => setShowAbsoluteVega((prev) => !prev)}
                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  showAbsoluteVega
                    ? 'bg-[#ff9900] text-black border-[#ff9900]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#222d44]'
                }`}
              >
                Absolute Vega ($)
              </button>
              <button
                onClick={() => setShowWeightedVega((prev) => !prev)}
                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  showWeightedVega
                    ? 'bg-[#00e5ff] text-black border-[#00e5ff]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#222d44]'
                }`}
              >
                30D Weighted Vega (D-Vega)
              </button>
              <button
                onClick={() => setShow25DeltaSkew((prev) => !prev)}
                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  show25DeltaSkew
                    ? 'bg-[#a855f7] text-white border-[#a855f7]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#222d44]'
                }`}
              >
                25Δ Call/Put Vega Skew
              </button>
            </div>
          </div>

          <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[700px]">
              {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                const y = getY(yMax * frac);
                return (
                  <g key={frac}>
                    <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#1b2537" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                      ${(yMax * frac).toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {showAbsoluteVega && <path d={absoluteVegaPath} fill="none" stroke="#ff9900" strokeWidth="2.5" />}
              {showWeightedVega && <path d={weightedVegaPath} fill="none" stroke="#00e5ff" strokeWidth="2" strokeDasharray="4 4" />}
              {show25DeltaSkew && (
                <>
                  <path d={call25Path} fill="none" stroke="#22c55e" strokeWidth="1.5" />
                  <path d={put25Path} fill="none" stroke="#ef4444" strokeWidth="1.5" />
                </>
              )}

              {points.map((p) => {
                const x = getX(p.dte);
                const y = getY(p.atmVega100);
                const isSelected = selectedDte === p.dte;

                return (
                  <g
                    key={p.dte}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => {
                      playKeyClick();
                      if (onSelectDte) onSelectDte(p.dte);
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={x} cy={y} r={isSelected ? 6 : 4} fill={isSelected ? '#ffd600' : '#ff9900'} stroke="#000" strokeWidth="1.5" />
                    <text x={x} y={svgHeight - 15} fill="#8b9bb4" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {p.dte}D
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* 8. Selected Cell Deep Inspector Modal / HUD */}
      {selectedCell && (
        <div className="bg-[#0b101d] border border-[#ff9900]/50 rounded-lg p-3.5 flex flex-col gap-3 shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-[#1e2a44] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff9900] animate-pulse" />
              <span className="font-black text-white text-xs">
                STRIKE INSPECTOR: ${selectedCell.strike.toFixed(1)} · {selectedCell.month} ({selectedCell.dte} DTE)
              </span>
              <span className="text-[10px] text-[#8b9bb4]">
                Moneyness: <strong className="text-white">{selectedCell.moneynessPct}%</strong>
              </span>
            </div>

            <button
              onClick={() => setSelectedCell(null)}
              className="text-[#8b9bb4] hover:text-white p-1 rounded hover:bg-[#141b28] cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
            <div className="bg-[#070a12] p-2 rounded border border-[#1e2a44]">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Avg Contract Vega</span>
              <span className="text-sm font-black text-[#ff9900]">${selectedCell.avgVega.toFixed(2)}</span>
            </div>

            <div className="bg-[#070a12] p-2 rounded border border-[#1e2a44]">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">30D Weighted Vega</span>
              <span className="text-sm font-black text-[#00e5ff]">${selectedCell.weightedVega30.toFixed(2)}</span>
            </div>

            <div className="bg-[#070a12] p-2 rounded border border-[#1e2a44]">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Vomma (Volga)</span>
              <span className="text-sm font-bold text-[#a855f7]">+{selectedCell.vomma.toFixed(3)}</span>
            </div>

            <div className="bg-[#070a12] p-2 rounded border border-[#1e2a44]">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Veta (Decay/d)</span>
              <span className="text-sm font-bold text-[#ff334b]">{selectedCell.veta.toFixed(3)}</span>
            </div>

            <div className="bg-[#070a12] p-2 rounded border border-[#1e2a44]">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Call / Put IV</span>
              <span className="text-xs font-bold text-white">
                {(selectedCell.callIV * 100).toFixed(1)}% / {(selectedCell.putIV * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#070a12] p-2 rounded border border-[#1e2a44]">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Open Interest</span>
              <span className="text-xs font-bold text-[#cbd5e1]">{selectedCell.totalOI.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1e2a44]">
            <span className="text-[10px] text-[#8b9bb4]">
              Call Quote: Bid ${selectedCell.callBid.toFixed(2)} / Ask ${selectedCell.callAsk.toFixed(2)} · Put Quote: Bid ${selectedCell.putBid.toFixed(2)} / Ask ${selectedCell.putAsk.toFixed(2)}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playKeyClick();
                  if (onApplyStrategyTemplate) onApplyStrategyTemplate('call-calendar-spread');
                  else if (onNavigateToValuation) onNavigateToValuation();
                }}
                className="px-3 py-1 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-black text-xs rounded transition-all shadow-sm cursor-pointer"
              >
                TRADE CALENDAR WITH THIS STRIKE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Quantitative Derivatives Desk Note */}
      <div className="bg-[#070b14] border border-[#1e2638] rounded-lg p-3.5 flex flex-col gap-2.5 text-xs text-[#8b9bb4]">
        <div className="flex items-center gap-2 font-bold text-white text-xs border-b border-[#1e2638] pb-1.5">
          <Info className="w-4 h-4 text-[#00e5ff]" />
          <span>QUANTITATIVE DERIVATIVES DESK NOTE: FULL VEGA SURFACE DYNAMICS</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          In the Black-Scholes framework, Vega reaches its theoretical maximum at exactly the At-The-Money (ATM) strike where moneyness S/K &approx; 1. Across expirations, absolute Vega expands with &radic;T (square root of time to expiry), which is why back-month LEAPS options possess significantly higher Vega sensitivity than weekly tenors. Traders use this multi-curve overlay to pinpoint volatility curvature across maturities and construct calibrated calendar, diagonal, and ratio volatility trades.
        </p>
      </div>
    </div>
  );
};
