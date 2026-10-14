import React, { useState, useMemo } from 'react';
import {
  G20_YIELD_CURVES,
  G20CountryYieldCurve,
  SovereignTenorPoint,
  calculateSovereignSpread,
} from '../services/yieldCurveData';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Globe,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Filter,
  Check,
  RotateCcw,
  Zap,
  Info,
  Calendar,
  AlertTriangle,
  Download,
  Share2,
  Table,
} from 'lucide-react';

interface YieldCurveViewProps {
  onNavigateToRisk?: () => void;
  onNavigateToOptions?: () => void;
  onNavigateToGeoRisk?: () => void;
}

export type YcViewTab = 'comparison' | 'matrix' | 'spreads' | 'simulator';
export type YcMetricMode = 'nominal' | 'real' | 'spread-us' | 'spread-bund';
export type YcRegionFilter = 'ALL' | 'G7' | 'EUROPE' | 'AMERICAS' | 'APAC' | 'EM' | 'INVERTED';

export const YieldCurveView: React.FC<YieldCurveViewProps> = ({
  onNavigateToRisk,
  onNavigateToOptions,
  onNavigateToGeoRisk,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<YcViewTab>('comparison');

  // Comparison & Chart Controls
  const [metricMode, setMetricMode] = useState<YcMetricMode>('nominal');
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([
    'US',
    'DE',
    'JP',
    'GB',
    'CN',
    'BR',
  ]);
  const [primaryCountryId, setPrimaryCountryId] = useState<string>('US');
  const [hoveredTenorIndex, setHoveredTenorIndex] = useState<number | null>(null);

  // Matrix Filter & Search
  const [regionFilter, setRegionFilter] = useState<YcRegionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'yield10Y' | 'spread2s10s' | 'realYield10Y' | 'policyRate' | 'country'>('yield10Y');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Simulator Controls
  const [simShockBps, setSimShockBps] = useState<number>(0);
  const [simTwistBps, setSimTwistBps] = useState<number>(0); // steepener/flattener

  // Notification for CSV Export
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const primaryCountry = useMemo(() => {
    return G20_YIELD_CURVES.find((c) => c.id === primaryCountryId) || G20_YIELD_CURVES[0];
  }, [primaryCountryId]);

  // Standard tenors across G20
  const STANDARD_TENORS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];

  // Filtered countries for the matrix
  const filteredCountries = useMemo(() => {
    let list = G20_YIELD_CURVES;

    if (regionFilter === 'G7') list = list.filter((c) => c.isG7);
    else if (regionFilter === 'EUROPE') list = list.filter((c) => c.region === 'Europe');
    else if (regionFilter === 'AMERICAS') list = list.filter((c) => c.region === 'Americas');
    else if (regionFilter === 'APAC') list = list.filter((c) => c.region === 'Asia-Pacific');
    else if (regionFilter === 'EM') list = list.filter((c) => c.region === 'Emerging Markets');
    else if (regionFilter === 'INVERTED') list = list.filter((c) => c.curveShape === 'INVERTED' || c.spread2s10s < 0);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.country.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.sovereignBondName.toLowerCase().includes(q) ||
          c.currency.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [regionFilter, searchQuery, sortField, sortAsc]);

  // Quick Preset Selection for Chart
  const handleSelectPreset = (preset: 'G7' | 'ALL' | 'EM' | 'EUROPE' | 'INVERTED') => {
    playKeyClick();
    if (preset === 'G7') {
      setSelectedCountryIds(G20_YIELD_CURVES.filter((c) => c.isG7).map((c) => c.id));
    } else if (preset === 'ALL') {
      setSelectedCountryIds(G20_YIELD_CURVES.map((c) => c.id));
    } else if (preset === 'EM') {
      setSelectedCountryIds(['BR', 'MX', 'IN', 'ZA', 'TR', 'ID', 'SA']);
    } else if (preset === 'EUROPE') {
      setSelectedCountryIds(['DE', 'FR', 'IT', 'GB', 'EU', 'RU']);
    } else if (preset === 'INVERTED') {
      setSelectedCountryIds(
        G20_YIELD_CURVES.filter((c) => c.spread2s10s < 0 || c.curveShape === 'INVERTED').map((c) => c.id)
      );
    }
  };

  const toggleCountrySelection = (id: string) => {
    playKeyClick();
    setSelectedCountryIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((cId) => cId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // -----------------------------------------------------------------------------
  // MULTI-CURVE SVG GEOMETRY
  // -----------------------------------------------------------------------------
  const svgWidth = 860;
  const svgHeight = 360;
  const padding = { top: 35, right: 35, bottom: 45, left: 60 };

  // Calculate curve point value based on current metric mode and simulation shocks
  const getPointValue = (country: G20CountryYieldCurve, pt: SovereignTenorPoint): number => {
    let base = pt.yield;

    if (metricMode === 'real') {
      base = base - country.cpiInflation;
    } else if (metricMode === 'spread-us') {
      const usCurve = G20_YIELD_CURVES.find((c) => c.id === 'US')!;
      const usPt = usCurve.points.find((p) => p.tenor === pt.tenor) || usCurve.points[usCurve.points.length - 1];
      base = (base - usPt.yield) * 100; // in bps
    } else if (metricMode === 'spread-bund') {
      const deCurve = G20_YIELD_CURVES.find((c) => c.id === 'DE')!;
      const dePt = deCurve.points.find((p) => p.tenor === pt.tenor) || deCurve.points[deCurve.points.length - 1];
      base = (base - dePt.yield) * 100; // in bps
    }

    // Apply simulation shock if primary country
    if (activeTab === 'simulator' && country.id === primaryCountryId) {
      const shift = simShockBps / 100;
      // Twist: short end drops/rises vs long end
      const twistFactor = (pt.years - 5) / 25; // -0.2 to +1.0
      const twist = (simTwistBps * twistFactor) / 100;
      base += shift + twist;
    }

    return base;
  };

  // Determine Y Domain across active curves
  const yDomain = useMemo(() => {
    const activeCurves = G20_YIELD_CURVES.filter((c) => selectedCountryIds.includes(c.id));
    if (activeCurves.length === 0) return [0, 10];

    let min = Infinity;
    let max = -Infinity;

    activeCurves.forEach((c) => {
      c.points.forEach((pt) => {
        const val = getPointValue(c, pt);
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });

    if (metricMode.startsWith('spread')) {
      const paddingBps = Math.max(50, (max - min) * 0.15);
      return [Math.floor((min - paddingBps) / 50) * 50, Math.ceil((max + paddingBps) / 50) * 50];
    } else {
      const pad = Math.max(1, (max - min) * 0.12);
      return [Math.floor(min - pad), Math.ceil(max + pad)];
    }
  }, [selectedCountryIds, metricMode, activeTab, simShockBps, simTwistBps, primaryCountryId]);

  const getYCoord = (val: number) => {
    const [yMin, yMax] = yDomain;
    const ratio = (val - yMin) / (yMax - yMin || 1);
    return svgHeight - padding.bottom - ratio * (svgHeight - padding.top - padding.bottom);
  };

  const getXCoord = (index: number) => {
    const total = STANDARD_TENORS.length - 1;
    return padding.left + (index / total) * (svgWidth - padding.left - padding.right);
  };

  const getSvgPathForCountry = (country: G20CountryYieldCurve): string => {
    const coords: { x: number; y: number }[] = [];

    STANDARD_TENORS.forEach((tenor, idx) => {
      const pt = country.points.find((p) => p.tenor === tenor);
      if (pt) {
        const val = getPointValue(country, pt);
        coords.push({
          x: getXCoord(idx),
          y: getYCoord(val),
        });
      }
    });

    if (coords.length === 0) return '';
    return coords.reduce((acc, p, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, '');
  };

  // CSV Export handler
  const handleExportCSV = () => {
    playExecutionChime();
    const headers = ['Country', 'Code', 'Currency', 'PolicyRate', '2Y', '10Y', '30Y', '2s10s_Spread_bps', '3m10s_Spread_bps', 'RealYield_10Y', 'CPI_YoY', 'Rating', '5Y_CDS'];
    const rows = G20_YIELD_CURVES.map((c) => [
      c.country,
      c.id,
      c.currency,
      c.policyRate.toFixed(2),
      c.yield2Y.toFixed(2),
      c.yield10Y.toFixed(2),
      c.yield30Y.toFixed(2),
      c.spread2s10s,
      c.spread3m10s,
      c.realYield10Y.toFixed(2),
      c.cpiInflation.toFixed(1),
      c.creditRating,
      c.cds5YSpread,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    try {
      navigator.clipboard?.writeText(csvContent);
      setToastMessage('G20 sovereign yield curve matrix copied to clipboard!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b12] text-[#d1d5db] font-mono overflow-y-auto select-none p-2 sm:p-4">
      {/* 1. Header Banner & Global Macro Summary */}
      <div className="bg-[#0b101d] border border-[#1e2a44] rounded-lg p-3 sm:p-4 mb-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1e2a44] pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#ff9900]/10 border border-[#ff9900]/30 flex items-center justify-center text-[#ff9900] shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-base sm:text-lg font-black tracking-wide">
                  G20 SOVEREIGN YIELD CURVES &amp; GLOBAL TERM STRUCTURE
                </span>
                <span className="text-[10px] text-[#ff9900] bg-[#ff9900]/15 border border-[#ff9900]/40 px-2 py-0.5 rounded font-bold">
                  20 SOVEREIGN ENTITIES
                </span>
              </div>
              <p className="text-xs text-[#8b9bb4] mt-0.5">
                Benchmark sovereign bond term structures, 2s10s recession spreads, real yields, policy rates &amp; carry differentials
              </p>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded bg-[#141d2f] hover:bg-[#1f2d48] border border-[#223150] text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy G20 sovereign curves as CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#ff9900]" />
              <span>EXPORT CSV</span>
            </button>
            {onNavigateToGeoRisk && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToGeoRisk();
                }}
                className="px-2.5 py-1.5 rounded bg-[#200e12] hover:bg-[#34141a] border border-[#ef4444]/40 text-xs font-bold text-[#ef4444] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cross-link to Country Geo-Political Risk Heatmap"
              >
                <span>GEO RISK</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Global Sovereign Macro Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="bg-[#0e1526] p-2.5 rounded border border-[#1b263b]">
            <span className="text-[10px] text-[#8b9bb4] block uppercase">G20 Inverted Curves</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-[#ef4444]">
                {G20_YIELD_CURVES.filter((c) => c.spread2s10s < 0).length} of 20
              </span>
              <span className="text-[9px] text-[#8b9bb4]">
                ({Math.round((G20_YIELD_CURVES.filter((c) => c.spread2s10s < 0).length / 20) * 100)}%)
              </span>
            </div>
            <span className="text-[9.5px] text-[#ef4444] block mt-0.5 truncate">MX, TR, AR, RU Inverted</span>
          </div>

          <div className="bg-[#0e1526] p-2.5 rounded border border-[#1b263b]">
            <span className="text-[10px] text-[#8b9bb4] block uppercase">US 10Y Benchmark</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-[#00e5ff]">3.75%</span>
              <span className="text-[9px] text-[#22c55e] font-bold">2s10s +11 bps</span>
            </div>
            <span className="text-[9.5px] text-[#8b9bb4] block mt-0.5">Real Yield: +0.85%</span>
          </div>

          <div className="bg-[#0e1526] p-2.5 rounded border border-[#1b263b]">
            <span className="text-[10px] text-[#8b9bb4] block uppercase">German 10Y Bund</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-[#ff9900]">2.18%</span>
              <span className="text-[9px] text-[#8b9bb4]">vs US -157 bps</span>
            </div>
            <span className="text-[9.5px] text-[#8b9bb4] block mt-0.5">ECB Deposit: 3.65%</span>
          </div>

          <div className="bg-[#0e1526] p-2.5 rounded border border-[#1b263b]">
            <span className="text-[10px] text-[#8b9bb4] block uppercase">Japan 10Y JGB</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-[#ff334b]">0.84%</span>
              <span className="text-[9px] text-[#ff9900] font-bold">Steep (+46 bps)</span>
            </div>
            <span className="text-[9.5px] text-[#8b9bb4] block mt-0.5">BOJ Rate: 0.25%</span>
          </div>

          <div className="bg-[#0e1526] p-2.5 rounded border border-[#1b263b]">
            <span className="text-[10px] text-[#8b9bb4] block uppercase">Highest Real Yield</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-[#10b981]">🇧🇷 Brazil (+7.91%)</span>
            </div>
            <span className="text-[9.5px] text-[#8b9bb4] block mt-0.5">10Y: 12.15% · CPI: 4.2%</span>
          </div>

          <div className="bg-[#0e1526] p-2.5 rounded border border-[#1b263b]">
            <span className="text-[10px] text-[#8b9bb4] block uppercase">Deepest Inversion</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-black text-[#dc2626]">🇹🇷 Turkey (-1270 bps)</span>
            </div>
            <span className="text-[9.5px] text-[#8b9bb4] block mt-0.5">2Y 41.2% vs 10Y 28.5%</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Navigation Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1e2a44] pb-2 mb-3 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('comparison');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-[#ff9900] text-black shadow-[0_0_12px_rgba(255,153,0,0.3)]'
                : 'bg-[#141b28] text-[#8b9bb4] hover:text-white hover:bg-[#1a2336]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>MULTI-CURVE OVERLAY</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('matrix');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-[#00e5ff] text-black shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'bg-[#141b28] text-[#8b9bb4] hover:text-white hover:bg-[#1a2336]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>ALL G20 MATRIX ({G20_YIELD_CURVES.length})</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('spreads');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'spreads'
                ? 'bg-[#22c55e] text-black shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                : 'bg-[#141b28] text-[#8b9bb4] hover:text-white hover:bg-[#1a2336]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SOVEREIGN SPREADS &amp; CARRY</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('simulator');
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#a855f7] text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-[#141b28] text-[#8b9bb4] hover:text-white hover:bg-[#1a2336]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>RATE SHOCK SIMULATOR</span>
          </button>
        </div>

        {/* Active Toast Notification */}
        {toastMessage && (
          <span className="text-[11px] text-[#22c55e] bg-[#092211] border border-[#22c55e]/50 px-2 py-0.5 rounded font-bold animate-in fade-in shrink-0">
            {toastMessage}
          </span>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: MULTI-CURVE SOVEREIGN YIELD CURVE COMPARISON CHART            */}
      {/* ===================================================================== */}
      {activeTab === 'comparison' && (
        <div className="flex flex-col gap-3">
          {/* Chart Controls Bar */}
          <div className="bg-[#0b101c] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Metric Mode Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#8b9bb4] font-bold uppercase text-[10px]">Metric Mode:</span>
              <div className="bg-[#141b28] p-0.5 rounded border border-[#222d44] flex items-center gap-1">
                <button
                  onClick={() => setMetricMode('nominal')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    metricMode === 'nominal' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  Nominal Yield (%)
                </button>
                <button
                  onClick={() => setMetricMode('real')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    metricMode === 'real' ? 'bg-[#10b981] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  Real Yield (Yield - CPI)
                </button>
                <button
                  onClick={() => setMetricMode('spread-us')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    metricMode === 'spread-us' ? 'bg-[#00e5ff] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  Spread vs US (bps)
                </button>
                <button
                  onClick={() => setMetricMode('spread-bund')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    metricMode === 'spread-bund' ? 'bg-[#a855f7] text-white' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  Spread vs Bund (bps)
                </button>
              </div>
            </div>

            {/* Quick Country Group Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#8b9bb4] font-bold uppercase text-[10px]">Presets:</span>
              <button
                onClick={() => handleSelectPreset('G7')}
                className="px-2 py-0.5 rounded bg-[#141b28] hover:bg-[#1e2a44] border border-[#222d44] text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                G7 Economies
              </button>
              <button
                onClick={() => handleSelectPreset('EUROPE')}
                className="px-2 py-0.5 rounded bg-[#141b28] hover:bg-[#1e2a44] border border-[#222d44] text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Europe
              </button>
              <button
                onClick={() => handleSelectPreset('EM')}
                className="px-2 py-0.5 rounded bg-[#141b28] hover:bg-[#1e2a44] border border-[#222d44] text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Emerging Markets
              </button>
              <button
                onClick={() => handleSelectPreset('INVERTED')}
                className="px-2 py-0.5 rounded bg-[#200e12] hover:bg-[#34141a] border border-[#ef4444]/40 text-[11px] font-bold text-[#ef4444] transition-colors cursor-pointer"
              >
                Inverted Only
              </button>
              <button
                onClick={() => handleSelectPreset('ALL')}
                className="px-2 py-0.5 rounded bg-[#141b28] hover:bg-[#1e2a44] border border-[#222d44] text-[11px] font-bold text-[#ff9900] transition-colors cursor-pointer"
              >
                All 20 G20
              </button>
            </div>
          </div>

          {/* Interactive Country Toggle Pills Bar */}
          <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-wrap gap-1.5">
            {G20_YIELD_CURVES.map((c) => {
              const isSelected = selectedCountryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCountrySelection(c.id)}
                  className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#162035] text-white border-white/40 shadow-sm'
                      : 'bg-[#0f1422] text-[#6b7280] border-[#1e2638] hover:text-[#9ca3af]'
                  }`}
                  style={{
                    borderLeftColor: isSelected ? c.color : undefined,
                    borderLeftWidth: isSelected ? '3px' : undefined,
                  }}
                >
                  <span>{c.flag}</span>
                  <span>{c.id}</span>
                  <span className="font-normal text-[10px] text-[#8b9bb4]">({c.yield10Y.toFixed(2)}%)</span>
                </button>
              );
            })}
          </div>

          {/* Main Yield Curves Canvas (SVG) */}
          <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 overflow-x-auto shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-[#8b9bb4] mb-2 px-2">
              <span className="font-bold text-white flex items-center gap-2">
                <span>BENCHMARK YIELD CURVES OVERLAY</span>
                <span className="text-[10px] text-[#8b9bb4] font-normal">
                  ({selectedCountryIds.length} curves displayed · X: Tenor Duration · Y:{' '}
                  {metricMode === 'nominal'
                    ? 'Yield (%)'
                    : metricMode === 'real'
                    ? 'Real Yield (%)'
                    : 'Spread (bps)'}
                  )
                </span>
              </span>

              {hoveredTenorIndex !== null && (
                <span className="text-white font-mono font-bold bg-[#141d2f] px-2 py-0.5 rounded border border-[#223150]">
                  TENOR: {STANDARD_TENORS[hoveredTenorIndex]}
                </span>
              )}
            </div>

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[750px] overflow-visible"
              onMouseLeave={() => setHoveredTenorIndex(null)}
            >
              {/* Horizontal Grid lines and Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                const [yMin, yMax] = yDomain;
                const val = yMin + frac * (yMax - yMin);
                const y = getYCoord(val);
                return (
                  <g key={frac}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#1b2537"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 3.5}
                      fill="#64748b"
                      fontSize="9.5"
                      textAnchor="end"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {metricMode.startsWith('spread') ? `${val.toFixed(0)} bps` : `${val.toFixed(1)}%`}
                    </text>
                  </g>
                );
              })}

              {/* Zero-line demarcation for spreads or real yields */}
              {yDomain[0] < 0 && yDomain[1] > 0 && (
                <line
                  x1={padding.left}
                  y1={getYCoord(0)}
                  x2={svgWidth - padding.right}
                  y2={getYCoord(0)}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              )}

              {/* Vertical Tenor grid lines & X-axis labels */}
              {STANDARD_TENORS.map((tenor, idx) => {
                const x = getXCoord(idx);
                const isHovered = hoveredTenorIndex === idx;
                return (
                  <g
                    key={tenor}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTenorIndex(idx)}
                  >
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={svgHeight - padding.bottom}
                      stroke={isHovered ? '#ff9900' : '#141d2f'}
                      strokeWidth={isHovered ? 1.5 : 1}
                      strokeDasharray={isHovered ? undefined : '2 2'}
                    />
                    <text
                      x={x}
                      y={svgHeight - padding.bottom + 16}
                      fill={isHovered ? '#ffd600' : '#8b9bb4'}
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      {tenor}
                    </text>
                  </g>
                );
              })}

              {/* Render Sovereign Yield Curves */}
              {G20_YIELD_CURVES.filter((c) => selectedCountryIds.includes(c.id)).map((country) => {
                const path = getSvgPathForCountry(country);
                const isPrimary = country.id === primaryCountryId;

                return (
                  <g key={country.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke={country.color}
                      strokeWidth={isPrimary ? 3.0 : 2.0}
                      strokeOpacity={0.9}
                      className="transition-all hover:stroke-width-[3.5] cursor-pointer"
                      onClick={() => setPrimaryCountryId(country.id)}
                    />

                    {/* Nodes at each tenor */}
                    {country.points.map((pt) => {
                      const tenorIdx = STANDARD_TENORS.indexOf(pt.tenor);
                      if (tenorIdx === -1) return null;
                      const x = getXCoord(tenorIdx);
                      const y = getYCoord(getPointValue(country, pt));
                      const isHoveredTenor = hoveredTenorIndex === tenorIdx;

                      return (
                        <circle
                          key={pt.tenor}
                          cx={x}
                          cy={y}
                          r={isHoveredTenor ? 5 : isPrimary ? 3.5 : 2.5}
                          fill={country.color}
                          stroke="#000"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {/* Hovered Tenor Interactive Value Crosshair Strip */}
            {hoveredTenorIndex !== null && (
              <div className="mt-2 p-2.5 bg-[#0b101c] border border-[#ff9900]/40 rounded flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-[#ff9900] uppercase text-[10.5px]">
                  {STANDARD_TENORS[hoveredTenorIndex]} TENOR SNAPSHOT:
                </span>
                {G20_YIELD_CURVES.filter((c) => selectedCountryIds.includes(c.id)).map((c) => {
                  const pt = c.points.find((p) => p.tenor === STANDARD_TENORS[hoveredTenorIndex]);
                  if (!pt) return null;
                  const val = getPointValue(c, pt);
                  return (
                    <div key={c.id} className="flex items-center gap-1.5 font-mono">
                      <span>{c.flag}</span>
                      <span className="text-[#8b9bb4]">{c.id}:</span>
                      <span className="font-bold text-white">
                        {metricMode.startsWith('spread') ? `${val.toFixed(0)} bps` : `${val.toFixed(2)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Country Inspector Card */}
          <div className="bg-[#0b101d] border border-[#1e2a44] rounded-lg p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2a44] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{primaryCountry.flag}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-sm">
                      {primaryCountry.country.toUpperCase()} — {primaryCountry.sovereignBondName}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                        primaryCountry.curveShape === 'INVERTED'
                          ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                          : primaryCountry.curveShape === 'STEEP'
                          ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900]/40'
                          : 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/40'
                      }`}
                    >
                      {primaryCountry.curveShape} CURVE
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8b9bb4]">
                    Central Bank: {primaryCountry.centralBank} · Policy Rate: {primaryCountry.policyRate.toFixed(2)}% ·
                    CPI: {primaryCountry.cpiInflation.toFixed(1)}% · Rating: {primaryCountry.creditRating}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div>
                  <span className="text-[#8b9bb4] text-[10px] block">2s10s SPREAD</span>
                  <span
                    className={`font-black ${
                      primaryCountry.spread2s10s < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'
                    }`}
                  >
                    {primaryCountry.spread2s10s > 0 ? `+${primaryCountry.spread2s10s}` : primaryCountry.spread2s10s} bps
                  </span>
                </div>
                <div>
                  <span className="text-[#8b9bb4] text-[10px] block">REAL 10Y</span>
                  <span
                    className={`font-black ${
                      primaryCountry.realYield10Y >= 0 ? 'text-[#00e5ff]' : 'text-[#ef4444]'
                    }`}
                  >
                    {primaryCountry.realYield10Y >= 0 ? `+${primaryCountry.realYield10Y.toFixed(2)}` : primaryCountry.realYield10Y.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#cbd5e1] leading-relaxed mb-3">{primaryCountry.summary}</p>

            {/* Tenors Strip */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 text-center font-mono">
              {primaryCountry.points.map((pt) => (
                <div key={pt.tenor} className="bg-[#070d18] border border-[#1b263b] rounded p-1.5">
                  <span className="text-[10px] text-[#8b9bb4] block font-bold">{pt.tenor}</span>
                  <span className="text-xs font-black text-white">{pt.yield.toFixed(2)}%</span>
                  <span
                    className={`text-[9px] block ${
                      pt.change1D >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}
                  >
                    {pt.change1D >= 0 ? `+${pt.change1D.toFixed(1)}` : pt.change1D.toFixed(1)} bps
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ALL G20 SOVEREIGN YIELD CURVES DIRECTORY MATRIX               */}
      {/* ===================================================================== */}
      {activeTab === 'matrix' && (
        <div className="flex flex-col gap-3">
          {/* Filters Bar */}
          <div className="bg-[#0b101c] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Region Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#8b9bb4] font-bold uppercase text-[10px]">Filter Region:</span>
              {(['ALL', 'G7', 'EUROPE', 'AMERICAS', 'APAC', 'EM', 'INVERTED'] as YcRegionFilter[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    regionFilter === r
                      ? 'bg-[#00e5ff] text-black shadow-sm'
                      : 'bg-[#141b28] text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  {r === 'ALL'
                    ? 'All G20 (20)'
                    : r === 'G7'
                    ? 'G7'
                    : r === 'EM'
                    ? 'Emerging'
                    : r === 'INVERTED'
                    ? 'Inverted Curves'
                    : r}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search Country, Bond, or Currency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#141b28] border border-[#222d44] text-xs px-2.5 py-1 rounded text-white outline-none w-48 sm:w-64 placeholder-[#64748b]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#8b9bb4] hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-[#090d16] border border-[#1e2638] rounded-lg overflow-x-auto shadow-inner">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#0e1526] border-b border-[#1e2638] text-[10px] text-[#8b9bb4] uppercase tracking-wider">
                  <th
                    className="p-2.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('country');
                      setSortAsc((prev) => !prev);
                    }}
                  >
                    Country / Sovereign Bond
                  </th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('policyRate');
                      setSortAsc((prev) => !prev);
                    }}
                  >
                    Policy Rate
                  </th>
                  <th className="p-2.5">2Y Yield</th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('yield10Y');
                      setSortAsc((prev) => !prev);
                    }}
                  >
                    10Y Yield
                  </th>
                  <th className="p-2.5">30Y Yield</th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('spread2s10s');
                      setSortAsc((prev) => !prev);
                    }}
                  >
                    2s10s Spread
                  </th>
                  <th className="p-2.5">3M10s (Recession)</th>
                  <th
                    className="p-2.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('realYield10Y');
                      setSortAsc((prev) => !prev);
                    }}
                  >
                    Real 10Y Yield
                  </th>
                  <th className="p-2.5">CPI YoY</th>
                  <th className="p-2.5">Rating / 5Y CDS</th>
                  <th className="p-2.5 text-center">Curve Shape</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151e30]">
                {filteredCountries.map((c) => {
                  const isPrimary = c.id === primaryCountryId;
                  const isInverted = c.spread2s10s < 0;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-[#121a2c] transition-colors cursor-pointer ${
                        isPrimary ? 'bg-[#101728]' : ''
                      }`}
                      onClick={() => {
                        setPrimaryCountryId(c.id);
                        if (!selectedCountryIds.includes(c.id)) {
                          setSelectedCountryIds((prev) => [...prev, c.id]);
                        }
                      }}
                    >
                      {/* Country & Bond */}
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <div>
                            <span className="font-bold text-white block">
                              {c.country} ({c.id})
                            </span>
                            <span className="text-[10px] text-[#8b9bb4] truncate max-w-[200px] block">
                              {c.sovereignBondName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Policy Rate */}
                      <td className="p-2.5 font-bold text-[#ffd600]">
                        {c.policyRate.toFixed(2)}%
                      </td>

                      {/* 2Y Yield */}
                      <td className="p-2.5 font-bold text-white">
                        {c.yield2Y.toFixed(2)}%
                      </td>

                      {/* 10Y Yield */}
                      <td className="p-2.5">
                        <span className="font-bold text-[#00e5ff] text-sm">
                          {c.yield10Y.toFixed(2)}%
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] block">
                          vs US: {c.spreadVsUS10Y >= 0 ? `+${c.spreadVsUS10Y}` : c.spreadVsUS10Y} bps
                        </span>
                      </td>

                      {/* 30Y Yield */}
                      <td className="p-2.5 font-bold text-white">
                        {c.yield30Y.toFixed(2)}%
                      </td>

                      {/* 2s10s Spread */}
                      <td className="p-2.5">
                        <span
                          className={`font-black ${
                            isInverted ? 'text-[#ef4444]' : 'text-[#22c55e]'
                          }`}
                        >
                          {c.spread2s10s > 0 ? `+${c.spread2s10s}` : c.spread2s10s} bps
                        </span>
                      </td>

                      {/* 3M10s Spread */}
                      <td className="p-2.5">
                        <span
                          className={`font-bold ${
                            c.spread3m10s < 0 ? 'text-[#ff334b]' : 'text-[#8b9bb4]'
                          }`}
                        >
                          {c.spread3m10s > 0 ? `+${c.spread3m10s}` : c.spread3m10s} bps
                        </span>
                      </td>

                      {/* Real 10Y */}
                      <td className="p-2.5 font-bold">
                        <span className={c.realYield10Y >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                          {c.realYield10Y >= 0 ? `+${c.realYield10Y.toFixed(2)}` : c.realYield10Y.toFixed(2)}%
                        </span>
                      </td>

                      {/* CPI Inflation */}
                      <td className="p-2.5 text-[#cbd5e1]">
                        {c.cpiInflation.toFixed(1)}%
                      </td>

                      {/* Rating & CDS */}
                      <td className="p-2.5">
                        <span className="text-white font-bold block">{c.creditRating}</span>
                        <span className="text-[9.5px] text-[#8b9bb4]">
                          CDS: {c.cds5YSpread} bps
                        </span>
                      </td>

                      {/* Curve Shape */}
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded border inline-block ${
                            c.curveShape === 'INVERTED'
                              ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                              : c.curveShape === 'STEEP'
                              ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900]/40'
                              : 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/40'
                          }`}
                        >
                          {c.curveShape}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playKeyClick();
                            setPrimaryCountryId(c.id);
                            if (!selectedCountryIds.includes(c.id)) {
                              setSelectedCountryIds((prev) => [...prev, c.id]);
                            }
                            setActiveTab('comparison');
                          }}
                          className="px-2 py-1 rounded bg-[#141d2f] hover:bg-[#ff9900] hover:text-black border border-[#223150] text-[10px] font-bold text-[#ff9900] transition-colors cursor-pointer"
                        >
                          GRAPH CURVE
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

      {/* ===================================================================== */}
      {/* TAB 3: SOVEREIGN SPREADS & FX CARRY TRADE MATRIX                      */}
      {/* ===================================================================== */}
      {activeTab === 'spreads' && (
        <div className="flex flex-col gap-3">
          <div className="bg-[#0b101c] border border-[#1e2638] rounded-lg p-3 text-xs leading-relaxed">
            <span className="text-white font-bold text-sm block mb-1">
              SOVEREIGN YIELD DIFFERENTIALS &amp; GLOBAL CARRY TRADE ENGINE
            </span>
            <p className="text-[#8b9bb4]">
              Institutional spreads between key benchmark curves (US Treasuries, German Bunds, Japan JGBs).
              Higher nominal yield differentials create structural currency carry trade flows, while real yield
              differentials drive long-term purchasing power parity (PPP) equilibrium.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* US vs Major Sovereign Spreads */}
            <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3">
              <span className="text-xs font-bold text-[#00e5ff] uppercase block border-b border-[#1e2638] pb-1.5 mb-2.5">
                US 10Y Yield Spreads (UST 3.75%)
              </span>
              <div className="flex flex-col gap-2 text-xs font-mono">
                {G20_YIELD_CURVES.filter((c) => c.id !== 'US').slice(0, 8).map((c) => {
                  const spread = Math.round((c.yield10Y - 3.75) * 100);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-1.5 rounded bg-[#0e1526] hover:bg-[#141e34] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{c.flag}</span>
                        <span className="text-white font-bold">{c.country}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-black ${
                            spread >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                          }`}
                        >
                          {spread >= 0 ? `+${spread}` : spread} bps
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] block">
                          10Y: {c.yield10Y.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Germany Bund vs Major European Sovereigns */}
            <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3">
              <span className="text-xs font-bold text-[#ff9900] uppercase block border-b border-[#1e2638] pb-1.5 mb-2.5">
                German Bund 10Y Spreads (Bund 2.18%)
              </span>
              <div className="flex flex-col gap-2 text-xs font-mono">
                {G20_YIELD_CURVES.filter((c) => c.region === 'Europe' && c.id !== 'DE').map((c) => {
                  const spread = Math.round((c.yield10Y - 2.18) * 100);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-1.5 rounded bg-[#0e1526] hover:bg-[#141e34] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{c.flag}</span>
                        <span className="text-white font-bold">{c.country}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-black ${
                            spread >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                          }`}
                        >
                          {spread >= 0 ? `+${spread}` : spread} bps
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] block">
                          10Y: {c.yield10Y.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* High Real Yield Carry Trade Opportunities */}
            <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3">
              <span className="text-xs font-bold text-[#10b981] uppercase block border-b border-[#1e2638] pb-1.5 mb-2.5">
                Highest Real Yields (Nominal - Inflation)
              </span>
              <div className="flex flex-col gap-2 text-xs font-mono">
                {[...G20_YIELD_CURVES]
                  .sort((a, b) => b.realYield10Y - a.realYield10Y)
                  .slice(0, 6)
                  .map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-1.5 rounded bg-[#0e1526] hover:bg-[#141e34] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#8b9bb4] font-bold">#{idx + 1}</span>
                        <span>{c.flag}</span>
                        <span className="text-white font-bold">{c.country}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#10b981]">
                          +{c.realYield10Y.toFixed(2)}%
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] block">
                          Nom: {c.yield10Y.toFixed(2)}% · CPI: {c.cpiInflation.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CENTRAL BANK RATE SHOCK & TWIST SCENARIO SIMULATOR            */}
      {/* ===================================================================== */}
      {activeTab === 'simulator' && (
        <div className="flex flex-col gap-3">
          <div className="bg-[#0b101c] border border-[#1e2638] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-white font-black text-sm block">
                CENTRAL BANK MONETARY POLICY &amp; RATE SHOCK SIMULATOR
              </span>
              <p className="text-xs text-[#8b9bb4] mt-0.5">
                Simulate parallel rate shifts (rate hike / cut cycles) and curve twists (steepening / flattening) on{' '}
                <strong className="text-white">{primaryCountry.country}</strong> sovereign curve.
              </p>
            </div>

            {/* Target Country Selector for Simulator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8b9bb4] uppercase font-bold">Target Curve:</span>
              <select
                value={primaryCountryId}
                onChange={(e) => setPrimaryCountryId(e.target.value)}
                className="bg-[#141b28] border border-[#222d44] rounded px-3 py-1.5 text-xs text-white outline-none font-bold"
              >
                {G20_YIELD_CURVES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {c.country} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Parallel Shift Slider */}
            <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase">Parallel Rate Shift:</span>
                <span className="font-bold text-sm font-mono text-[#00e5ff]">
                  {simShockBps >= 0 ? `+${simShockBps}` : simShockBps} bps
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="200"
                step="5"
                value={simShockBps}
                onChange={(e) => setSimShockBps(Number(e.target.value))}
                className="w-full accent-[#00e5ff] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8b9bb4]">
                <span>-150 bps (Aggressive Easing)</span>
                <span>0 bps (Current)</span>
                <span>+200 bps (Severe Tightening)</span>
              </div>
            </div>

            {/* 2. Curve Twist Slider */}
            <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase">Curve Slope Twist:</span>
                <span className="font-bold text-sm font-mono text-[#a855f7]">
                  {simTwistBps >= 0 ? `+${simTwistBps}` : simTwistBps} bps (
                  {simTwistBps > 0 ? 'Steepener' : simTwistBps < 0 ? 'Flattener' : 'Neutral'})
                </span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="5"
                value={simTwistBps}
                onChange={(e) => setSimTwistBps(Number(e.target.value))}
                className="w-full accent-[#a855f7] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8b9bb4]">
                <span>-60 bps (Bear Flattener / Inversion)</span>
                <span>0 bps</span>
                <span>+60 bps (Bull Steepener)</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          {(simShockBps !== 0 || simTwistBps !== 0) && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSimShockBps(0);
                  setSimTwistBps(0);
                }}
                className="px-3 py-1.5 rounded bg-[#141d2f] hover:bg-[#1e2a44] border border-[#223150] text-xs font-bold text-[#ff9900] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Simulation to Actual Market Baseline</span>
              </button>
            </div>
          )}

          {/* Shocked Curve Points Table */}
          <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 overflow-x-auto">
            <span className="text-xs font-bold text-white mb-2 block">
              Simulated {primaryCountry.country} Yields vs Baseline:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 text-center font-mono">
              {primaryCountry.points.map((pt) => {
                const shocked = getPointValue(primaryCountry, pt);
                const deltaBps = Math.round((shocked - pt.yield) * 100);

                return (
                  <div key={pt.tenor} className="bg-[#0e1526] border border-[#1b263b] rounded p-2">
                    <span className="text-[10px] text-[#8b9bb4] block font-bold">{pt.tenor}</span>
                    <span className="text-xs font-black text-white">{shocked.toFixed(2)}%</span>
                    <span className="text-[9.5px] text-[#8b9bb4] block">Orig: {pt.yield.toFixed(2)}%</span>
                    <span
                      className={`text-[9px] font-bold block ${
                        deltaBps > 0 ? 'text-[#22c55e]' : deltaBps < 0 ? 'text-[#ef4444]' : 'text-[#8b9bb4]'
                      }`}
                    >
                      {deltaBps >= 0 ? `+${deltaBps}` : deltaBps} bps
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
