import React, { useState, useMemo } from 'react';
import {
  FUTURES_TERM_STRUCTURES,
  FuturesTermStructure,
  FuturesContract,
  FuturesCategory,
  calculateCurveShapeMetrics,
  calculateCalendarSpreads,
  calculateBasisAnalysis,
  calculateVixSuiteMetrics,
} from '../services/futuresTermStructureData';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Sliders,
  Sparkles,
  ArrowRight,
  Maximize2,
  Table,
  BarChart2,
  Compass,
  Zap,
  Info,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Clock,
  Flame,
  Globe,
  SlidersHorizontal,
  DollarSign,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface FuturesTermStructureViewProps {
  initialStructureId?: string;
  onNavigateToChain?: (symbol: string) => void;
  onOpenOrderTicket?: (symbol: string) => void;
  onNavigateToRisk?: () => void;
  onNavigateToYieldCurve?: () => void;
  onOpenTSXFuturesHub?: () => void;
  onPopOut?: () => void;
}

export type FtsTab = 'curve' | 'spreads' | 'blotter' | 'simulator';
export type CurveMetricMode = 'price' | 'basis' | 'roll_yield';
export type HistoricalShiftView = 'none' | '1d' | '1w' | '1m' | '3m' | 'all';

export const FuturesTermStructureView: React.FC<FuturesTermStructureViewProps> = ({
  initialStructureId = 'VIX',
  onNavigateToChain,
  onOpenOrderTicket,
  onNavigateToRisk,
  onNavigateToYieldCurve,
  onOpenTSXFuturesHub,
  onPopOut,
}) => {
  // Navigation & Category Filtering
  const [selectedStructureId, setSelectedStructureId] = useState<string>(initialStructureId);
  const [selectedCategory, setSelectedCategory] = useState<FuturesCategory | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<FtsTab>('curve');

  // Curve Chart Controls
  const [metricMode, setMetricMode] = useState<CurveMetricMode>('price');
  const [historicalShift, setHistoricalShift] = useState<HistoricalShiftView>('1w');
  const [selectedContractIndex, setSelectedContractIndex] = useState<number>(0);
  const [hoveredContractIndex, setHoveredContractIndex] = useState<number | null>(null);

  // Scenario Simulator Controls
  const [simParallelShiftPct, setSimParallelShiftPct] = useState<number>(0); // -20% to +20%
  const [simSlopeTwistPct, setSimSlopeTwistPct] = useState<number>(0);       // -10% to +10%

  // Calendar Spread Calculator State
  const [calcFrontIndex, setCalcFrontIndex] = useState<number>(0);
  const [calcBackIndex, setCalcBackIndex] = useState<number>(1);
  const [calcContractsCount, setCalcContractsCount] = useState<number>(5);

  // Filtered Futures list
  const filteredStructures = useMemo(() => {
    if (selectedCategory === 'ALL') return FUTURES_TERM_STRUCTURES;
    return FUTURES_TERM_STRUCTURES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  const currentStructure = useMemo(() => {
    return (
      FUTURES_TERM_STRUCTURES.find((s) => s.id === selectedStructureId) ||
      FUTURES_TERM_STRUCTURES[0]
    );
  }, [selectedStructureId]);

  // Calculations for current structure
  const shapeMetrics = useMemo(() => {
    return calculateCurveShapeMetrics(currentStructure);
  }, [currentStructure]);

  const calendarSpreads = useMemo(() => {
    return calculateCalendarSpreads(currentStructure);
  }, [currentStructure]);

  const vixMetrics = useMemo(() => {
    return calculateVixSuiteMetrics(currentStructure);
  }, [currentStructure]);

  const activeContract: FuturesContract = useMemo(() => {
    const idx = Math.min(selectedContractIndex, currentStructure.contracts.length - 1);
    return currentStructure.contracts[idx] || currentStructure.contracts[0];
  }, [currentStructure, selectedContractIndex]);

  const activeContractBasis = useMemo(() => {
    return calculateBasisAnalysis(
      currentStructure.spotPrice,
      activeContract,
      currentStructure.pricingModel
    );
  }, [currentStructure, activeContract]);

  // Simulated contracts under stress
  const simulatedContracts = useMemo(() => {
    return currentStructure.contracts.map((c, idx) => {
      // Parallel shift:
      let price = c.lastPrice * (1 + simParallelShiftPct / 100);
      // Slope twist:
      // Front months move opposite to far months based on tenor distance
      const tenorWeight = (idx / (currentStructure.contracts.length - 1) - 0.5) * 2; // -1.0 to +1.0
      price = price * (1 + (simSlopeTwistPct / 100) * tenorWeight);
      return {
        ...c,
        simulatedPrice: Number(price.toFixed(c.lastPrice < 10 ? 3 : 2)),
      };
    });
  }, [currentStructure, simParallelShiftPct, simSlopeTwistPct]);

  // SVG Chart Dimensions & Computations
  const chartWidth = 840;
  const chartHeight = 300;
  const padding = { top: 25, right: 35, bottom: 45, left: 65 };

  const chartData = useMemo(() => {
    const contracts = currentStructure.contracts;
    if (!contracts || contracts.length === 0)
      return {
        points: [],
        yMin: 0,
        yMax: 100,
        getX: () => 0,
        getY: () => 0,
        spotY: 0,
      };

    let values: number[] = [];
    if (metricMode === 'price') {
      values = contracts.map((c) => c.lastPrice);
      if (historicalShift === '1d' || historicalShift === 'all') values.push(...contracts.map((c) => c.historicalShift1D));
      if (historicalShift === '1w' || historicalShift === 'all') values.push(...contracts.map((c) => c.historicalShift1W));
      if (historicalShift === '1m' || historicalShift === 'all') values.push(...contracts.map((c) => c.historicalShift1M));
      if (historicalShift === '3m' || historicalShift === 'all') values.push(...contracts.map((c) => c.historicalShift3M));
      values.push(currentStructure.spotPrice);
    } else if (metricMode === 'basis') {
      values = contracts.map((c) => c.lastPrice - currentStructure.spotPrice);
    } else {
      // roll yield to next contract
      values = contracts.map((c, i) => {
        if (i === 0) return 0;
        const prev = contracts[i - 1];
        const dteDiff = Math.max(1, c.daysToExpiration - prev.daysToExpiration);
        return ((prev.lastPrice - c.lastPrice) / prev.lastPrice) * (365 / dteDiff) * 100;
      });
    }

    let min = Math.min(...values);
    let max = Math.max(...values);
    const span = max - min || 1;
    const yMin = min - span * 0.12;
    const yMax = max + span * 0.12;

    const getX = (idx: number) => {
      if (contracts.length <= 1) return padding.left;
      return (
        padding.left +
        (idx / (contracts.length - 1)) * (chartWidth - padding.left - padding.right)
      );
    };

    const getY = (val: number) => {
      const clamped = Math.max(yMin, Math.min(yMax, val));
      return (
        chartHeight -
        padding.bottom -
        ((clamped - yMin) / (yMax - yMin)) * (chartHeight - padding.top - padding.bottom)
      );
    };

    const points = contracts.map((c, idx) => {
      const val =
        metricMode === 'price'
          ? c.lastPrice
          : metricMode === 'basis'
          ? c.lastPrice - currentStructure.spotPrice
          : idx === 0
          ? 0
          : ((contracts[idx - 1].lastPrice - c.lastPrice) / contracts[idx - 1].lastPrice) *
            (365 / Math.max(1, c.daysToExpiration - contracts[idx - 1].daysToExpiration)) *
            100;

      return {
        contract: c,
        x: getX(idx),
        y: getY(val),
        val,
        y1d: getY(c.historicalShift1D),
        y1w: getY(c.historicalShift1W),
        y1m: getY(c.historicalShift1M),
        y3m: getY(c.historicalShift3M),
      };
    });

    const spotY = getY(currentStructure.spotPrice);

    return { points, yMin, yMax, getX, getY, spotY };
  }, [currentStructure, metricMode, historicalShift]);

  // Construct SVG paths
  const currentPath = useMemo(() => {
    if (!chartData.points.length) return '';
    return chartData.points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [chartData]);

  const path1D = useMemo(() => {
    if (!chartData.points.length) return '';
    return chartData.points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y1d}` : `${acc} L ${pt.x} ${pt.y1d}`;
    }, '');
  }, [chartData]);

  const path1W = useMemo(() => {
    if (!chartData.points.length) return '';
    return chartData.points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y1w}` : `${acc} L ${pt.x} ${pt.y1w}`;
    }, '');
  }, [chartData]);

  const path1M = useMemo(() => {
    if (!chartData.points.length) return '';
    return chartData.points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y1m}` : `${acc} L ${pt.x} ${pt.y1m}`;
    }, '');
  }, [chartData]);

  const path3M = useMemo(() => {
    if (!chartData.points.length) return '';
    return chartData.points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y3m}` : `${acc} L ${pt.x} ${pt.y3m}`;
    }, '');
  }, [chartData]);

  // Area under current curve
  const areaPath = useMemo(() => {
    if (!chartData.points.length) return '';
    const first = chartData.points[0];
    const last = chartData.points[chartData.points.length - 1];
    const baselineY = chartHeight - padding.bottom;
    return `${currentPath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }, [currentPath, chartData]);

  return (
    <div className="flex flex-col h-full bg-[#05070a] text-slate-100 font-mono select-none overflow-hidden text-xs">
      {/* 1. TOP HEADER / BLOOMBERG NAVIGATION ROW */}
      <div className="bg-[#080d1a] border-b border-[#1e293b] px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#ff9900]/15 border border-[#ff9900]/40 rounded text-[#ff9900] font-bold">
            <TrendingUp className="w-4 h-4 text-[#ff9900]" />
            <span>FTS &lt;GO&gt;</span>
          </div>
          <div>
            <span className="font-extrabold text-white text-sm tracking-wide">
              FUTURES TERM STRUCTURE &amp; FORWARD CURVE ENGINE
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400">
              Contango vs Backwardation • Roll Yield Matrix • Inter-Month Spreads • Cost of Carry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenTSXFuturesHub && (
            <button
              onClick={() => {
                playKeyClick();
                onOpenTSXFuturesHub();
              }}
              className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] border border-[#0284c7]/40 rounded text-[11px] font-bold flex items-center gap-1"
              title="Open Canadian TSX Montreal Exchange Futures Platform"
            >
              <span>🇨🇦 TSX FUTURES HUB</span>
            </button>
          )}

          {onNavigateToYieldCurve && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToYieldCurve();
              }}
              className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-amber-400 border border-amber-500/30 rounded text-[11px] font-bold flex items-center gap-1"
              title="Compare with Sovereign Yield Curves (YC)"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SOVEREIGN YC</span>
            </button>
          )}

          {onPopOut && (
            <button
              onClick={() => {
                playKeyClick();
                onPopOut();
              }}
              className="p-1.5 bg-[#141d2f] hover:bg-[#1e293b] text-slate-300 hover:text-white rounded border border-[#1e293b]"
              title="Pop-out in floating terminal window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. CATEGORY & MARKET SELECTOR STRIP */}
      <div className="bg-[#0a0f1d] border-b border-[#141b2a] px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1">
          {(['ALL', 'VOLATILITY', 'ENERGY', 'EQUITY_INDICES', 'METALS', 'RATES', 'CRYPTO'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => {
                  playKeyClick();
                  setSelectedCategory(cat);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#ff9900] text-black shadow-sm font-black'
                    : 'bg-[#101726] text-slate-400 hover:text-slate-200 border border-[#1e293b]'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            )
          )}
        </div>

        {/* Selected Market Quick Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {filteredStructures.map((s) => {
            const isSelected = s.id === currentStructure.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  playKeyClick();
                  setSelectedStructureId(s.id);
                  setSelectedContractIndex(0);
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#1e293b] text-white border-2 border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.25)]'
                    : 'bg-[#0f1524] text-slate-400 hover:text-slate-200 border border-[#1a2333]'
                }`}
              >
                <span className="font-extrabold" style={{ color: isSelected ? s.color : undefined }}>
                  {s.symbol}
                </span>
                <span className="text-[10px] text-slate-300">{s.name.split(' ')[0]}</span>
                <span
                  className={`text-[9.5px] font-mono px-1 rounded ${
                    s.spotChange >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                  }`}
                >
                  {s.spotPrice < 10 ? s.spotPrice.toFixed(3) : s.spotPrice.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. HERO OVERVIEW RIBBON: SPOT, SHAPE METRICS, REGIME BADGE */}
      <div className="bg-[#0b1120] border-b border-[#1e293b] px-3 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 items-center">
        {/* Spot Quote */}
        <div className="flex flex-col">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>CASH SPOT ({currentStructure.symbol})</span>
            <span className="px-1 py-0.2 bg-[#1e293b] rounded text-[9px] text-[#ff9900]">
              {currentStructure.exchange}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-white font-mono">
              {currentStructure.currency === 'CAD' ? 'C$' : '$'}
              {currentStructure.spotPrice < 10
                ? currentStructure.spotPrice.toFixed(3)
                : currentStructure.spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                currentStructure.spotChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currentStructure.spotChange >= 0 ? '+' : ''}
              {currentStructure.spotChange.toFixed(2)} ({currentStructure.spotChangePct >= 0 ? '+' : ''}
              {currentStructure.spotChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Front-to-Second Month Spread (M1-M2) */}
        <div className="flex flex-col border-l border-[#1e293b] pl-3">
          <span className="text-[10px] text-slate-400">M1 - M2 ROLL SPREAD</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-sm font-black font-mono ${
                shapeMetrics.m1m2Spread >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {shapeMetrics.m1m2Spread >= 0 ? '+' : ''}
              {shapeMetrics.m1m2Spread < 5
                ? shapeMetrics.m1m2Spread.toFixed(3)
                : shapeMetrics.m1m2Spread.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              ({shapeMetrics.m1m2SpreadPct >= 0 ? '+' : ''}
              {shapeMetrics.m1m2SpreadPct.toFixed(2)}%)
            </span>
          </div>
          <span className="text-[9px] text-slate-400">
            {currentStructure.contracts[0]?.monthCode} vs {currentStructure.contracts[1]?.monthCode}
          </span>
        </div>

        {/* Annualized Roll Yield */}
        <div className="flex flex-col border-l border-[#1e293b] pl-3">
          <span className="text-[10px] text-slate-400">ANNUALIZED ROLL YIELD</span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-sm font-black font-mono ${
                shapeMetrics.annualizedRollYield >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {shapeMetrics.annualizedRollYield >= 0 ? '+' : ''}
              {shapeMetrics.annualizedRollYield.toFixed(2)}%
            </span>
            <span className="text-[9px] text-slate-400">/ year</span>
          </div>
          <span className="text-[9px] text-slate-400">
            {shapeMetrics.annualizedRollYield >= 0 ? 'Positive carry for longs' : 'Negative drag on longs'}
          </span>
        </div>

        {/* Full Strip Term Spread (M1 to Far) */}
        <div className="flex flex-col border-l border-[#1e293b] pl-3">
          <span className="text-[10px] text-slate-400">M1 TO STRIP END SPREAD</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-sm font-black font-mono ${
                shapeMetrics.m1LastSpread >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {shapeMetrics.m1LastSpread >= 0 ? '+' : ''}
              {shapeMetrics.m1LastSpread.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              ({shapeMetrics.m1LastSpreadPct >= 0 ? '+' : ''}
              {shapeMetrics.m1LastSpreadPct.toFixed(1)}%)
            </span>
          </div>
          <span className="text-[9px] text-slate-400">{currentStructure.contracts.length} active delivery tenors</span>
        </div>

        {/* Curve Regime Status Badge */}
        <div className="col-span-2 flex flex-col justify-center border-l border-[#1e293b] pl-3 bg-[#0d1424] p-1.5 rounded">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
              CURVE SHAPE REGIME
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm"
              style={{
                backgroundColor: `${shapeMetrics.regimeColor}25`,
                color: shapeMetrics.regimeColor,
                border: `1px solid ${shapeMetrics.regimeColor}60`,
              }}
            >
              {shapeMetrics.regimeLabel}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-300 mt-0.5 leading-snug line-clamp-1">
            {shapeMetrics.slopeSummary}
          </p>
        </div>
      </div>

      {/* VIX SPECIFIC DASHBOARD STRIP (Only when VIX is selected) */}
      {vixMetrics && (
        <div className="bg-[#05111c] border-b border-[#0284c7]/30 px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#00e5ff]/20 text-[#00e5ff] rounded font-black text-[10px] border border-[#00e5ff]/40">
              VIX VOLATILITY SUITE
            </span>
            <span className="text-slate-300 text-[11px]">
              VX1: <strong className="text-white font-mono">{vixMetrics.vx1.toFixed(2)}</strong> • VX2:{' '}
              <strong className="text-white font-mono">{vixMetrics.vx2.toFixed(2)}</strong> • VX2/VX1 Ratio:{' '}
              <strong className="text-[#00e5ff] font-mono">{vixMetrics.vxRatio}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="text-slate-400">30-Day Constant Maturity Forward: </span>
              <span className="text-amber-300 font-bold font-mono">{vixMetrics.constantMaturity30D}</span>
            </div>
            <div>
              <span className="text-slate-400">ETP Daily Roll Drag (UVXY/VXX): </span>
              <span className="text-rose-400 font-bold font-mono">{vixMetrics.dailyDragPct}% / day</span>
            </div>
            <div>
              <span className="text-slate-400">Short Volatility Yield (SVIX): </span>
              <span className="text-emerald-400 font-bold font-mono">
                +{vixMetrics.annualizedShortVolYield}% ann.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE WITH SUB-TABS */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#090d18] border-b border-[#141b2a] shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('curve');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'curve'
                ? 'bg-[#1e293b] text-[#ff9900] border-b-2 border-[#ff9900] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>FORWARD CURVE CHART</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('spreads');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'spreads'
                ? 'bg-[#1e293b] text-[#ff9900] border-b-2 border-[#ff9900] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>CALENDAR SPREAD MATRIX ({calendarSpreads.length})</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('blotter');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'blotter'
                ? 'bg-[#1e293b] text-[#ff9900] border-b-2 border-[#ff9900] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>CONTRACT STRIP BLOTTER ({currentStructure.contracts.length})</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('simulator');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'simulator'
                ? 'bg-[#1e293b] text-[#ff9900] border-b-2 border-[#ff9900] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>CURVE SHOCK SIMULATOR</span>
          </button>
        </div>

        {/* View Controls (Relevant for Curve Chart) */}
        {activeTab === 'curve' && (
          <div className="flex items-center gap-2">
            {/* Metric Mode */}
            <div className="flex items-center gap-1 bg-[#101726] border border-[#1e293b] rounded p-0.5 text-[10px]">
              {(['price', 'basis', 'roll_yield'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    playKeyClick();
                    setMetricMode(m);
                  }}
                  className={`px-2 py-0.5 rounded uppercase font-bold ${
                    metricMode === m ? 'bg-[#ff9900] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'price' ? 'Price ($)' : m === 'basis' ? 'Basis (F - S)' : 'Roll Yield %'}
                </button>
              ))}
            </div>

            {/* Historical Curve Shift */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 border-l border-[#1e293b] pl-2">
              <span className="hidden md:inline">Shift:</span>
              {(['none', '1d', '1w', '1m', '3m', 'all'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    playKeyClick();
                    setHistoricalShift(h);
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                    historicalShift === h
                      ? 'bg-[#38bdf8] text-black'
                      : 'bg-[#101726] text-slate-400 hover:text-slate-200 border border-[#1e293b]'
                  }`}
                >
                  {h === 'none' ? 'OFF' : h.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. ACTIVE TAB VIEW AREA */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {/* ========================================================
            TAB 1: INTERACTIVE FORWARD CURVE CHART (SVG)
            ======================================================== */}
        {activeTab === 'curve' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Chart Column (3 cols) */}
            <div className="lg:col-span-3 bg-[#080d19] border border-[#1e293b] rounded-lg p-3 flex flex-col shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-xs tracking-wider">
                    {currentStructure.name.toUpperCase()} · FORWARD TERM STRUCTURE
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({currentStructure.multiplier.toLocaleString()} {currentStructure.unit})
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-[#ff9900] inline-block rounded-full"></span>
                    <span className="text-white font-bold">Current Live Curve</span>
                  </div>
                  {historicalShift !== 'none' && (
                    <div className="flex items-center gap-2 text-slate-400">
                      {(historicalShift === '1d' || historicalShift === 'all') && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-[#38bdf8] inline-block"></span>
                          <span>1D Ago</span>
                        </span>
                      )}
                      {(historicalShift === '1w' || historicalShift === 'all') && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-[#a855f7] inline-block"></span>
                          <span>1W Ago</span>
                        </span>
                      )}
                      {(historicalShift === '1m' || historicalShift === 'all') && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-[#f59e0b] inline-block"></span>
                          <span>1M Ago</span>
                        </span>
                      )}
                      {(historicalShift === '3m' || historicalShift === 'all') && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-[#ef4444] inline-block"></span>
                          <span>3M Ago</span>
                        </span>
                      )}
                    </div>
                  )}
                  {metricMode === 'price' && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block"></span>
                      <span>Spot ({currentStructure.spotPrice < 10 ? currentStructure.spotPrice.toFixed(3) : currentStructure.spotPrice.toFixed(2)})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SVG Canvas Container */}
              <div className="w-full relative h-[320px] bg-[#050811] rounded border border-[#141b2a] overflow-hidden flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff9900" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ff9900" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                    const y =
                      padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                    const val =
                      chartData.yMax - ratio * (chartData.yMax - chartData.yMin);
                    return (
                      <g key={ratio}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {metricMode === 'price'
                            ? val < 10
                              ? val.toFixed(3)
                              : val.toFixed(1)
                            : metricMode === 'basis'
                            ? (val >= 0 ? '+' : '') + val.toFixed(2)
                            : (val >= 0 ? '+' : '') + val.toFixed(1) + '%'}
                        </text>
                      </g>
                    );
                  })}

                  {/* Spot Price Reference Line (if price mode) */}
                  {metricMode === 'price' &&
                    chartData.spotY !== undefined &&
                    chartData.spotY >= padding.top &&
                    chartData.spotY <= chartHeight - padding.bottom && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={chartData.spotY}
                          x2={chartWidth - padding.right}
                          y2={chartData.spotY}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                          strokeWidth="1.2"
                        />
                        <text
                          x={chartWidth - padding.right + 4}
                          y={chartData.spotY + 3}
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          SPOT
                        </text>
                      </g>
                    )}

                  {/* Area fill */}
                  {metricMode === 'price' && (
                    <path d={areaPath} fill="url(#curveGradient)" />
                  )}

                  {/* Historical Shift Curves */}
                  {(historicalShift === '3m' || historicalShift === 'all') && (
                    <path
                      d={path3M}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      opacity="0.6"
                    />
                  )}
                  {(historicalShift === '1m' || historicalShift === 'all') && (
                    <path
                      d={path1M}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                  )}
                  {(historicalShift === '1w' || historicalShift === 'all') && (
                    <path
                      d={path1W}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="1.8"
                      strokeDasharray="2 2"
                      opacity="0.75"
                    />
                  )}
                  {(historicalShift === '1d' || historicalShift === 'all') && (
                    <path
                      d={path1D}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                      opacity="0.8"
                    />
                  )}

                  {/* Current Active Curve */}
                  <path
                    d={currentPath}
                    fill="none"
                    stroke="#ff9900"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Nodes on current curve */}
                  {chartData.points.map((pt, idx) => {
                    const isSelected = selectedContractIndex === idx;
                    const isHovered = hoveredContractIndex === idx;
                    return (
                      <g
                        key={pt.contract.ticker}
                        className="cursor-pointer"
                        onClick={() => {
                          playKeyClick();
                          setSelectedContractIndex(idx);
                        }}
                        onMouseEnter={() => setHoveredContractIndex(idx)}
                        onMouseLeave={() => setHoveredContractIndex(null)}
                      >
                        {/* Glow on selected */}
                        {isSelected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="11"
                            fill="#ff9900"
                            opacity="0.25"
                          />
                        )}

                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? 6 : isHovered ? 5 : 4}
                          fill={isSelected ? '#ffffff' : '#ff9900'}
                          stroke={isSelected ? '#ff9900' : '#050811'}
                          strokeWidth="2"
                        />

                        {/* Value label above node */}
                        <text
                          x={pt.x}
                          y={pt.y - 9}
                          fill={isSelected ? '#ffffff' : '#cbd5e1'}
                          fontSize={isSelected ? '10' : '9'}
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {metricMode === 'price'
                            ? pt.contract.lastPrice < 10
                              ? pt.contract.lastPrice.toFixed(3)
                              : pt.contract.lastPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                            : metricMode === 'basis'
                            ? (pt.val >= 0 ? '+' : '') + pt.val.toFixed(2)
                            : (pt.val >= 0 ? '+' : '') + pt.val.toFixed(1) + '%'}
                        </text>

                        {/* X-axis Contract Month Label */}
                        <text
                          x={pt.x}
                          y={chartHeight - padding.bottom + 16}
                          fill={isSelected ? '#ff9900' : '#94a3b8'}
                          fontSize="9.5"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {pt.contract.monthCode}
                        </text>
                        <text
                          x={pt.x}
                          y={chartHeight - padding.bottom + 27}
                          fill="#64748b"
                          fontSize="8"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {pt.contract.daysToExpiration}d
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Bottom Quick-Action Bar */}
              <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex flex-wrap items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="text-slate-400">Selected Tenor:</span>
                  <span className="font-extrabold text-[#ff9900]">
                    {activeContract.ticker}
                  </span>
                  <span>({activeContract.contractMonth} • {activeContract.daysToExpiration} DTE)</span>
                  <span className="text-slate-400">|</span>
                  <span>
                    Last: <strong className="text-white">${activeContract.lastPrice.toLocaleString()}</strong>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span>
                    Basis to Spot:{' '}
                    <strong
                      className={
                        activeContractBasis.basisDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {activeContractBasis.basisDollar >= 0 ? '+' : ''}
                      {activeContractBasis.basisDollar.toFixed(2)} ({activeContractBasis.basisBps >= 0 ? '+' : ''}
                      {activeContractBasis.basisBps.toFixed(0)} bps)
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {onOpenOrderTicket && (
                    <button
                      onClick={() => {
                        playExecutionChime();
                        onOpenOrderTicket(currentStructure.symbol);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold rounded text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>TRADE {activeContract.monthCode}</span>
                    </button>
                  )}

                  {onNavigateToChain && (
                    <button
                      onClick={() => {
                        playKeyClick();
                        onNavigateToChain(currentStructure.symbol);
                      }}
                      className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] border border-[#0284c7]/40 rounded text-[11px] font-bold"
                    >
                      <span>OPTIONS ON FUTURES (FOP)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Contract Inspector & Cost of Carry Decomposition (1 col) */}
            <div className="flex flex-col gap-3">
              {/* Selected Contract Detail Card */}
              <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#ff9900]" />
                    <span className="font-bold text-white text-xs">CONTRACT SPECIFICATION</span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-[#ff9900]/20 text-[#ff9900] rounded text-[10px] font-black">
                    {activeContract.monthCode}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Ticker</span>
                    <span className="font-bold text-white">{activeContract.ticker}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Delivery Expiration</span>
                    <span className="font-mono text-slate-200">{activeContract.deliveryDate} ({activeContract.daysToExpiration}d)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Trade</span>
                    <span className="font-black text-white font-mono">
                      ${activeContract.lastPrice < 10 ? activeContract.lastPrice.toFixed(3) : activeContract.lastPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bid / Ask</span>
                    <span className="font-mono text-slate-200">
                      {activeContract.bid} / {activeContract.ask}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Net Change</span>
                    <span className={`font-bold font-mono ${activeContract.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeContract.netChange >= 0 ? '+' : ''}{activeContract.netChange.toFixed(2)} ({activeContract.percentChange >= 0 ? '+' : ''}{activeContract.percentChange.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">24h Contract Volume</span>
                    <span className="font-mono text-slate-200">{activeContract.volume.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Open Interest (OI)</span>
                    <span className="font-mono text-[#00e5ff] font-bold">{activeContract.openInterest.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Implied Volatility (IV)</span>
                    <span className="font-mono text-amber-400">{activeContract.impliedVolatility}%</span>
                  </div>
                  <div className="flex justify-between border-t border-[#1e293b] pt-1.5">
                    <span className="text-slate-400">Notional Contract Value</span>
                    <span className="font-bold text-white font-mono">
                      ${(activeContract.lastPrice * currentStructure.multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost of Carry Model Decomposition */}
              <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span className="font-bold text-white text-xs">COST OF CARRY MODEL</span>
                  </div>
                  <span className="text-[10px] text-slate-400">F = S · e^(c·T)</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk-Free Rate (r)</span>
                    <span className="font-mono text-slate-200">
                      {(currentStructure.pricingModel.riskFreeRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  {currentStructure.pricingModel.dividendYield !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dividend Yield (q)</span>
                      <span className="font-mono text-emerald-400">
                        -{(currentStructure.pricingModel.dividendYield * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {currentStructure.pricingModel.storageCostPct !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage &amp; Insurance (u)</span>
                      <span className="font-mono text-amber-400">
                        +{(currentStructure.pricingModel.storageCostPct * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {currentStructure.pricingModel.convenienceYieldPct !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Convenience Yield (y)</span>
                      <span className="font-mono text-rose-400">
                        -{(currentStructure.pricingModel.convenienceYieldPct * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#1e293b] pt-1.5 flex justify-between">
                    <span className="text-slate-400">Theoretical Fair Value</span>
                    <span className="font-bold text-white font-mono">
                      ${activeContractBasis.theoreticalFairValue < 10
                        ? activeContractBasis.theoreticalFairValue.toFixed(3)
                        : activeContractBasis.theoreticalFairValue.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Model Mispricing Edge</span>
                    <span
                      className={`font-bold font-mono ${
                        activeContractBasis.mispricingBps >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {activeContractBasis.mispricingBps >= 0 ? '+' : ''}
                      {activeContractBasis.mispricingBps.toFixed(1)} bps
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: CALENDAR SPREAD MATRIX & ROLL YIELD CALCULATOR
            ======================================================== */}
        {activeTab === 'spreads' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Spreads Table (2 cols) */}
            <div className="lg:col-span-2 bg-[#080d19] border border-[#1e293b] rounded-lg p-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#ff9900]" />
                  <span className="font-extrabold text-white text-xs">
                    INTER-MONTH CALENDAR SPREAD MATRIX &amp; ROLL CAPTURE
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Spread = Front Month - Back Month
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1120] text-slate-400 border-b border-[#1e293b] text-[10px]">
                      <th className="py-2 px-2.5">SPREAD PAIR</th>
                      <th className="py-2 px-2">FRONT</th>
                      <th className="py-2 px-2">BACK</th>
                      <th className="py-2 px-2 text-right">SPREAD ($)</th>
                      <th className="py-2 px-2 text-right">CHG</th>
                      <th className="py-2 px-2 text-center">52W RANK</th>
                      <th className="py-2 px-2 text-right">ANNUAL ROLL</th>
                      <th className="py-2 px-2 text-center">TRADE STRATEGY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141d2f]">
                    {calendarSpreads.map((sp) => (
                      <tr key={sp.id} className="hover:bg-[#0f172a] transition-colors">
                        <td className="py-2.5 px-2.5 font-bold text-white flex flex-col">
                          <span>{sp.label}</span>
                          <span className="text-[9.5px] text-slate-400 font-normal">{sp.interpretation}</span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">
                          ${sp.frontPrice < 10 ? sp.frontPrice.toFixed(3) : sp.frontPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">
                          ${sp.backPrice < 10 ? sp.backPrice.toFixed(3) : sp.backPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold">
                          <span className={sp.spread >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {sp.spread >= 0 ? '+' : ''}
                            {sp.spread < 5 ? sp.spread.toFixed(3) : sp.spread.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                          <span className={sp.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {sp.netChange >= 0 ? '+' : ''}{sp.netChange.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#ff9900]"
                                style={{ width: `${sp.percentile52W}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{sp.percentile52W}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold">
                          <span className={sp.annualizedRollReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {sp.annualizedRollReturn >= 0 ? '+' : ''}{sp.annualizedRollReturn.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              sp.regime === 'CONTANGO'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                            }`}
                          >
                            {sp.tradeType.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Custom Calendar Spread Calculator (1 col) */}
            <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 mb-3">
                  <Compass className="w-4 h-4 text-[#38bdf8]" />
                  <span className="font-extrabold text-white text-xs">
                    CUSTOM CALENDAR SPREAD CALCULATOR
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Front Leg Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      FRONT LEG (NEAR CONTRACT)
                    </label>
                    <select
                      value={calcFrontIndex}
                      onChange={(e) => setCalcFrontIndex(Number(e.target.value))}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1.5 text-white font-mono text-xs"
                    >
                      {currentStructure.contracts.map((c, i) => (
                        <option key={c.ticker} value={i}>
                          {c.ticker} ({c.contractMonth} • ${c.lastPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Back Leg Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      BACK LEG (FAR CONTRACT)
                    </label>
                    <select
                      value={calcBackIndex}
                      onChange={(e) => setCalcBackIndex(Number(e.target.value))}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1.5 text-white font-mono text-xs"
                    >
                      {currentStructure.contracts.map((c, i) => (
                        <option key={c.ticker} value={i} disabled={i <= calcFrontIndex}>
                          {c.ticker} ({c.contractMonth} • ${c.lastPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Contracts */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      NUMBER OF SPREAD CONTRACTS
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={calcContractsCount}
                        onChange={(e) => setCalcContractsCount(Number(e.target.value))}
                        className="flex-1 accent-[#ff9900]"
                      />
                      <span className="font-mono text-white font-bold w-8 text-right">
                        {calcContractsCount}x
                      </span>
                    </div>
                  </div>

                  {/* Result Calculation Breakdown */}
                  {(() => {
                    const c1 = currentStructure.contracts[calcFrontIndex] || currentStructure.contracts[0];
                    const c2 = currentStructure.contracts[calcBackIndex] || currentStructure.contracts[1];
                    const spreadValue = c1.lastPrice - c2.lastPrice;
                    const dollarSpread = spreadValue * currentStructure.multiplier * calcContractsCount;
                    const dteDiff = Math.max(1, c2.daysToExpiration - c1.daysToExpiration);
                    const dailyCarry = dollarSpread / dteDiff;

                    return (
                      <div className="bg-[#0b1120] border border-[#1e293b] rounded p-2.5 space-y-1.5 mt-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Spread Unit Differential</span>
                          <span className="font-mono text-white font-bold">
                            {spreadValue >= 0 ? '+' : ''}{spreadValue.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Total Notional Spread P&amp;L</span>
                          <span className={`font-mono font-bold ${dollarSpread >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {dollarSpread >= 0 ? '+' : ''}${Math.abs(dollarSpread).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Estimated Daily Roll Theta</span>
                          <span className="font-mono text-amber-300 font-bold">
                            ${Math.abs(dailyCarry).toFixed(2)} / day
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {onOpenOrderTicket && (
                <button
                  onClick={() => {
                    playExecutionChime();
                    onOpenOrderTicket(currentStructure.symbol);
                  }}
                  className="w-full mt-3 py-2 bg-[#ff9900] hover:bg-[#e68a00] text-black font-extrabold rounded text-xs flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Zap className="w-4 h-4" />
                  <span>TRANSACT CALENDAR SPREAD ({calcContractsCount}x)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: FULL CONTRACT STRIP BLOTTER
            ======================================================== */}
        {activeTab === 'blotter' && (
          <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-[#ff9900]" />
                <span className="font-extrabold text-white text-xs">
                  {currentStructure.name.toUpperCase()} · FULL CONTRACT STRIP BLOTTER
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                All Active Delivery Months • Click any row to inspect
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0b1120] text-slate-400 border-b border-[#1e293b] text-[10px]">
                    <th className="py-2 px-2.5">CONTRACT</th>
                    <th className="py-2 px-2">MONTH CODE</th>
                    <th className="py-2 px-2">EXPIRATION</th>
                    <th className="py-2 px-2 text-right">DTE</th>
                    <th className="py-2 px-2 text-right">LAST</th>
                    <th className="py-2 px-2 text-right">NET CHG</th>
                    <th className="py-2 px-2 text-right">% CHG</th>
                    <th className="py-2 px-2 text-right">BID</th>
                    <th className="py-2 px-2 text-right">ASK</th>
                    <th className="py-2 px-2 text-right">SPREAD TO M1</th>
                    <th className="py-2 px-2 text-right">BASIS TO SPOT</th>
                    <th className="py-2 px-2 text-right">VOLUME</th>
                    <th className="py-2 px-2 text-right">OPEN INTEREST</th>
                    <th className="py-2 px-2 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141d2f]">
                  {currentStructure.contracts.map((c, idx) => {
                    const isSelected = selectedContractIndex === idx;
                    const spreadToM1 = c.lastPrice - currentStructure.contracts[0].lastPrice;
                    const basis = c.lastPrice - currentStructure.spotPrice;
                    return (
                      <tr
                        key={c.ticker}
                        onClick={() => {
                          playKeyClick();
                          setSelectedContractIndex(idx);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#1e293b]/70 border-l-2 border-[#ff9900]' : 'hover:bg-[#0f172a]'
                        }`}
                      >
                        <td className="py-2.5 px-2.5 font-bold text-white flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? '#ff9900' : '#64748b' }}
                          ></span>
                          <span>{c.ticker}</span>
                        </td>
                        <td className="py-2.5 px-2 font-mono font-bold text-[#ff9900]">{c.monthCode}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">{c.deliveryDate}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">{c.daysToExpiration}d</td>
                        <td className="py-2.5 px-2 text-right font-mono font-extrabold text-white">
                          ${c.lastPrice < 10 ? c.lastPrice.toFixed(3) : c.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-mono font-bold ${c.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.netChange >= 0 ? '+' : ''}{c.netChange.toFixed(2)}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-mono text-[11px] ${c.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.percentChange >= 0 ? '+' : ''}{c.percentChange.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-300">{c.bid}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-300">{c.ask}</td>
                        <td className={`py-2.5 px-2 text-right font-mono ${spreadToM1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {spreadToM1 >= 0 ? '+' : ''}{spreadToM1.toFixed(2)}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-mono font-bold ${basis >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {basis >= 0 ? '+' : ''}{basis.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-300">{c.volume.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-[#00e5ff] font-bold">{c.openInterest.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-center">
                          {onOpenOrderTicket && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playExecutionChime();
                                onOpenOrderTicket(currentStructure.symbol);
                              }}
                              className="px-2 py-0.5 bg-[#101726] hover:bg-[#ff9900] text-slate-300 hover:text-black rounded text-[10px] font-bold border border-[#1e293b]"
                            >
                              TRADE
                            </button>
                          )}
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
            TAB 4: CURVE STRESS & SCENARIO SHOCK SIMULATOR
            ======================================================== */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Controls (1 col) */}
            <div className="bg-[#080d19] border border-[#1e293b] rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#ff9900]" />
                    <span className="font-extrabold text-white text-xs">
                      CURVE STRESS SHOCK CONTROLS
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setSimParallelShiftPct(0);
                      setSimSlopeTwistPct(0);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Reset simulation parameters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Parallel Price Shift Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-300 font-bold">1. Parallel Price Shift</span>
                      <span className={`font-mono font-black ${simParallelShiftPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {simParallelShiftPct >= 0 ? '+' : ''}{simParallelShiftPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={simParallelShiftPct}
                      onChange={(e) => setSimParallelShiftPct(Number(e.target.value))}
                      className="w-full accent-[#ff9900]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Uniform price shock applied equally across all delivery tenors.
                    </span>
                  </div>

                  {/* Curve Twist / Slope Shock Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-300 font-bold">2. Curve Slope Twist Shock</span>
                      <span className={`font-mono font-black ${simSlopeTwistPct >= 0 ? 'text-[#00e5ff]' : 'text-amber-400'}`}>
                        {simSlopeTwistPct >= 0 ? '+' : ''}{simSlopeTwistPct}% ({simSlopeTwistPct > 0 ? 'Steepener' : simSlopeTwistPct < 0 ? 'Flattener' : 'Neutral'})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={simSlopeTwistPct}
                      onChange={(e) => setSimSlopeTwistPct(Number(e.target.value))}
                      className="w-full accent-[#00e5ff]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Positive twists steepen the curve (expand contango); negative twists flatten or invert.
                    </span>
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-2 border-t border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold">
                      HISTORICAL SCENARIO PRESETS
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          playKeyClick();
                          setSimParallelShiftPct(15);
                          setSimSlopeTwistPct(-6);
                        }}
                        className="p-1.5 bg-[#101726] hover:bg-[#1e293b] text-slate-300 rounded text-[10px] font-bold border border-[#1e293b] text-left"
                      >
                        ⚡ Supply Crunch (Oil/Metals)
                      </button>
                      <button
                        onClick={() => {
                          playKeyClick();
                          setSimParallelShiftPct(-12);
                          setSimSlopeTwistPct(8);
                        }}
                        className="p-1.5 bg-[#101726] hover:bg-[#1e293b] text-slate-300 rounded text-[10px] font-bold border border-[#1e293b] text-left"
                      >
                        🌊 Storage Glut (Super-Contango)
                      </button>
                      <button
                        onClick={() => {
                          playKeyClick();
                          setSimParallelShiftPct(40);
                          setSimSlopeTwistPct(-10);
                        }}
                        className="p-1.5 bg-[#101726] hover:bg-[#1e293b] text-slate-300 rounded text-[10px] font-bold border border-[#1e293b] text-left"
                      >
                        🚨 VIX Panic Spike (Inversion)
                      </button>
                      <button
                        onClick={() => {
                          playKeyClick();
                          setSimParallelShiftPct(0);
                          setSimSlopeTwistPct(0);
                        }}
                        className="p-1.5 bg-[#101726] hover:bg-[#1e293b] text-slate-300 rounded text-[10px] font-bold border border-[#1e293b] text-left"
                      >
                        🔄 Baseline / Live Curve
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {onNavigateToRisk && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onNavigateToRisk();
                  }}
                  className="w-full mt-3 py-2 bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] border border-[#0284c7]/40 rounded font-bold text-xs flex items-center justify-center gap-1"
                >
                  <span>PORTFOLIO STRESS ENGINE (RISK)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results Table & Curve Comparison (2 cols) */}
            <div className="lg:col-span-2 bg-[#080d19] border border-[#1e293b] rounded-lg p-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-2">
                <span className="font-extrabold text-white text-xs">
                  SHOCKED TERM STRUCTURE VS CURRENT BASELINE
                </span>
                <span className="text-[10px] text-slate-400">
                  Computed Contract Pricing Post-Shock
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1120] text-slate-400 border-b border-[#1e293b] text-[10px]">
                      <th className="py-2 px-2.5">CONTRACT</th>
                      <th className="py-2 px-2">TENOR</th>
                      <th className="py-2 px-2 text-right">BASELINE ($)</th>
                      <th className="py-2 px-2 text-right">SHOCKED ($)</th>
                      <th className="py-2 px-2 text-right">SHOCK DIFF ($)</th>
                      <th className="py-2 px-2 text-right">SHOCK DIFF (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141d2f]">
                    {simulatedContracts.map((c) => {
                      const diff = c.simulatedPrice - c.lastPrice;
                      const diffPct = (diff / c.lastPrice) * 100;
                      return (
                        <tr key={c.ticker} className="hover:bg-[#0f172a]">
                          <td className="py-2.5 px-2.5 font-bold text-white">{c.ticker}</td>
                          <td className="py-2.5 px-2 font-mono text-slate-400">{c.contractMonth}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                            ${c.lastPrice < 10 ? c.lastPrice.toFixed(3) : c.lastPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-[#ff9900]">
                            ${c.simulatedPrice < 10 ? c.simulatedPrice.toFixed(3) : c.simulatedPrice.toLocaleString()}
                          </td>
                          <td className={`py-2.5 px-2 text-right font-mono font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diff >= 0 ? '+' : ''}{diff < 10 ? diff.toFixed(3) : diff.toFixed(2)}
                          </td>
                          <td className={`py-2.5 px-2 text-right font-mono ${diffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
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
      </div>

      {/* 6. BOTTOM STATUS / BLOOMBERG FOOTER */}
      <div className="bg-[#050811] border-t border-[#141b2a] px-3 py-1.5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE FORWARD FEED CONNECTED
          </span>
          <span>MARKET: {currentStructure.exchange}</span>
          <span>CURRENCY: {currentStructure.currency}</span>
          <span>TICK SIZE: {currentStructure.tickSize}</span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>SHORTCUT: TYPE <strong className="text-white">FTS &lt;GO&gt;</strong> OR <strong className="text-white">TERM &lt;GO&gt;</strong></span>
          <span>BLOOMBERG COMMODITY &amp; DERIVATIVES SUITE</span>
        </div>
      </div>
    </div>
  );
};
