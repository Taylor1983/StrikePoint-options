import React, { useState, useMemo } from 'react';
import {
  GICSSector,
  GICSEquity,
  GICSSectorId,
  GICS_CANADA_SECTORS,
  GICS_CANADA_EQUITIES,
  GICS_CANADA_MACRO,
} from '../services/gicsCanadaData';
import { Ticker } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  Building2,
  Flame,
  Train,
  Pickaxe,
  Cpu,
  ShoppingCart,
  Zap,
  Coffee,
  Radio,
  Home,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  BarChart2,
  PieChart,
  RefreshCw,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { CanadianAccount } from '../services/canadianAccounts';
import { GuaranteedInvestmentCertificatesView } from './GuaranteedInvestmentCertificatesView';

interface GICSCanadaViewProps {
  onSelectTicker?: (symbol: string) => void;
  onNavigateToChain?: (symbol: string) => void;
  onNavigateToChart?: (symbol: string) => void;
  onNavigateToValuation?: (symbol: string) => void;
  onNavigateToRisk?: (symbol: string) => void;
  onOpenTSXFuturesHub?: () => void;
  onOpenCanadianSuite?: () => void;
  initialTab?: 'sectors' | 'constituents' | 'macro' | 'dividends' | 'gic';
  canadianAccounts?: CanadianAccount[];
  onUpdateAccounts?: (accounts: CanadianAccount[]) => void;
}

export const GICSCanadaView: React.FC<GICSCanadaViewProps> = ({
  onSelectTicker,
  onNavigateToChain,
  onNavigateToChart,
  onNavigateToValuation,
  onNavigateToRisk,
  onOpenTSXFuturesHub,
  onOpenCanadianSuite,
  initialTab = 'sectors',
  canadianAccounts,
  onUpdateAccounts,
}) => {
  const [selectedSectorId, setSelectedSectorId] = useState<GICSSectorId | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'sectors' | 'constituents' | 'macro' | 'dividends' | 'gic'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'marketCap' | 'change' | 'yield' | 'pe' | 'name'>('marketCap');
  const [sortAsc, setSortAsc] = useState(false);
  const [timeframe, setTimeframe] = useState<'1d' | '5d' | '1m' | 'ytd'>('1d');

  const macro = GICS_CANADA_MACRO;
  const sectors = GICS_CANADA_SECTORS;

  const getSectorIcon = (id: GICSSectorId) => {
    switch (id) {
      case 'financials':
        return <Building2 className="w-4 h-4 text-[#38bdf8]" />;
      case 'energy':
        return <Flame className="w-4 h-4 text-[#f97316]" />;
      case 'industrials':
        return <Train className="w-4 h-4 text-[#a855f7]" />;
      case 'materials':
        return <Pickaxe className="w-4 h-4 text-[#eab308]" />;
      case 'infotech':
        return <Cpu className="w-4 h-4 text-[#00d2ff]" />;
      case 'consumer_staples':
        return <ShoppingCart className="w-4 h-4 text-[#10b981]" />;
      case 'utilities':
        return <Zap className="w-4 h-4 text-[#06b6d4]" />;
      case 'consumer_disc':
        return <Coffee className="w-4 h-4 text-[#ec4899]" />;
      case 'comm_services':
        return <Radio className="w-4 h-4 text-[#8b5cf6]" />;
      case 'real_estate':
        return <Home className="w-4 h-4 text-[#14b8a6]" />;
      case 'health_care':
        return <HeartPulse className="w-4 h-4 text-[#ef4444]" />;
      default:
        return <Layers className="w-4 h-4 text-white" />;
    }
  };

  const filteredEquities = useMemo(() => {
    let list = GICS_CANADA_EQUITIES;

    if (selectedSectorId !== 'all') {
      list = list.filter((eq) => eq.sectorId === selectedSectorId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (eq) =>
          eq.symbol.toLowerCase().includes(q) ||
          eq.tsxTicker.toLowerCase().includes(q) ||
          eq.name.toLowerCase().includes(q) ||
          eq.subIndustry.toLowerCase().includes(q) ||
          (eq.usTicker && eq.usTicker.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let diff = 0;
      if (sortField === 'change') {
        diff = a.changePct - b.changePct;
      } else if (sortField === 'yield') {
        diff = a.dividendYield - b.dividendYield;
      } else if (sortField === 'pe') {
        diff = (parseFloat(a.peRatio) || 0) - (parseFloat(b.peRatio) || 0);
      } else if (sortField === 'name') {
        diff = a.name.localeCompare(b.name);
      } else {
        // Market cap sort (parse $...B)
        const capA = parseFloat(a.marketCapCad.replace(/[^0-9.]/g, '')) || 0;
        const capB = parseFloat(b.marketCapCad.replace(/[^0-9.]/g, '')) || 0;
        diff = capA - capB;
      }
      return sortAsc ? diff : -diff;
    });
  }, [selectedSectorId, searchQuery, sortField, sortAsc]);

  const handleSelectEquity = (eq: GICSEquity) => {
    playExecutionChime();
    if (onSelectTicker) {
      onSelectTicker(eq.symbol);
    }
  };

  const handleExportCSV = () => {
    playKeyClick();
    const headers = ['Symbol', 'TSX Ticker', 'US Ticker', 'Name', 'Sector', 'Sub-Industry', 'Price CAD', 'Change %', 'Market Cap', 'P/E', 'Yield %', 'Beta'];
    const rows = filteredEquities.map((e) => [
      e.symbol,
      e.tsxTicker,
      e.usTicker || 'N/A',
      `"${e.name}"`,
      e.sectorId.toUpperCase(),
      `"${e.subIndustry}"`,
      e.priceCad.toFixed(2),
      e.changePct.toFixed(2) + '%',
      e.marketCapCad,
      e.peRatio,
      e.dividendYield.toFixed(2) + '%',
      e.beta.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GICS_Canada_Constituents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-3 font-mono text-xs select-none">
      {/* Top Bloomberg Ribbon for S&P/TSX Composite */}
      <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-2.5 sm:p-3 shadow-md flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182338] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-white flex items-center gap-1.5 tracking-wider">
              <span>🇨🇦</span>
              <span className="text-[#ff9900]">GICS CANADA</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 font-mono">
                S&amp;P/TSX COMPOSITE
              </span>
            </span>
            <span className="text-[10px] text-[#64748b] hidden md:inline">
              Global Industry Classification Standard · 11 Sectors · TSX &amp; Montreal Exchange (MX)
            </span>
          </div>

          {/* Quick Hub Launchers */}
          <div className="flex items-center gap-1.5">
            {onOpenTSXFuturesHub && (
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  onOpenTSXFuturesHub();
                }}
                className="px-2 py-1 rounded bg-[#00d2ff]/15 hover:bg-[#00d2ff]/25 text-[#00d2ff] border border-[#00d2ff]/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open Montreal Exchange & TSX Futures Hub (/SXF, /SXM, /CGB)"
              >
                <Layers className="w-3 h-3" />
                <span>TSX FUTURES HUB</span>
              </button>
            )}
            {onOpenCanadianSuite && (
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  onOpenCanadianSuite();
                }}
                className="px-2 py-1 rounded bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open Canadian Accounts & Tax Suite (TFSA, RRSP, FHSA)"
              >
                <span>🇨🇦 TFSA · RRSP</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2 py-1 rounded bg-[#1e293b] hover:bg-[#27354d] text-white border border-[#334155] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Export GICS Canada constituents to CSV"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">EXPORT CSV</span>
            </button>
          </div>
        </div>

        {/* Real-time Macro & Benchmark Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-[10px]">
          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">S&amp;P/TSX Composite</span>
            <div className="flex items-baseline gap-1 font-bold">
              <span className="text-white text-xs">{macro.tsxCompositeLevel.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-[#00e676] text-[9.5px]">+{macro.tsxChangePct}%</span>
            </div>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">TSX Market Cap</span>
            <span className="text-white font-bold text-xs">C${macro.totalMarketCapCadTrillions.toFixed(2)} Trillion</span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">Bank of Canada Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[#38bdf8] font-bold text-xs">{macro.bocTargetRate.toFixed(2)}%</span>
              <span className="text-[#64748b] text-[8.5px]">Easing</span>
            </div>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">GoC 10-Yr Yield</span>
            <span className="text-[#ffd600] font-bold text-xs">{macro.goc10YearYield.toFixed(2)}%</span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">USD / CAD FX</span>
            <span className="text-white font-bold text-xs">{macro.usdcadRate.toFixed(4)}</span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">WCS Oil Spread</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[#f97316] font-bold text-xs">-${macro.wcsWtiSpread.toFixed(2)}</span>
              <span className="text-[#64748b] text-[8.5px]">(TMX Egress)</span>
            </div>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">Gold Spot (CAD)</span>
            <span className="text-[#eab308] font-bold text-xs">C${macro.goldCadPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-[#090d18] border border-[#1e2a44] rounded-lg p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setActiveTab('sectors');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'sectors'
                ? 'bg-[#ff9900] text-black shadow-md font-black'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141d30]'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>11 GICS SECTORS &amp; HEATMAP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setActiveTab('constituents');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'constituents'
                ? 'bg-[#ff9900] text-black shadow-md font-black'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141d30]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>CONSTITUENTS BLOTTER ({filteredEquities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setActiveTab('macro');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'macro'
                ? 'bg-[#ff9900] text-black shadow-md font-black'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141d30]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>MACRO &amp; SECTOR ROTATION</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setActiveTab('dividends');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'dividends'
                ? 'bg-[#ff9900] text-black shadow-md font-black'
                : 'text-[#8b9bb4] hover:text-white hover:bg-[#141d30]'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>DIVIDEND &amp; YIELD SPREADS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setActiveTab('gic');
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'gic'
                ? 'bg-[#00e676] text-black shadow-md font-black'
                : 'text-[#00e676] hover:text-white hover:bg-[#141d30]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#00e676]" />
            <span>GUARANTEED INVESTMENT CERTIFICATES (GIC)</span>
            <span className="px-1.5 py-0.2 rounded bg-[#00e676]/20 text-[#00e676] text-[8.5px] border border-[#00e676]/40 font-mono">
              CDIC 100%
            </span>
          </button>
        </div>

        {/* Timeframe Filter for Sector Returns */}
        <div className="flex items-center gap-1 text-[10px] bg-[#070b14] px-1.5 py-0.5 rounded border border-[#1a253a]">
          <span className="text-[#64748b]">TIMEFRAME:</span>
          {(['1d', '5d', '1m', 'ytd'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                playKeyClick();
                setTimeframe(tf);
              }}
              className={`px-1.5 py-0.5 rounded font-bold uppercase cursor-pointer ${
                timeframe === tf ? 'bg-[#38bdf8] text-black font-extrabold' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* S&P/TSX Weighting Proportional Strip */}
      {activeTab !== 'gic' && (
        <div className="bg-[#070b14] p-2 rounded-lg border border-[#192338] shadow-sm flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#8b9bb4] font-bold uppercase tracking-wider flex items-center gap-1">
            <span>S&amp;P/TSX COMPOSITE WEIGHTINGS BREAKDOWN:</span>
          </span>
          <span className="text-[#64748b]">Total 100.0% · Financials &amp; Energy dominate 49.2% of TSX</span>
        </div>

        {/* Visual segmented bar */}
        <div className="w-full h-3 rounded overflow-hidden flex bg-[#1e293b]">
          {sectors.map((s) => (
            <div
              key={s.id}
              style={{
                width: `${s.tsxWeightPct}%`,
                backgroundColor: s.color,
              }}
              className="h-full transition-all hover:opacity-80 cursor-pointer"
              title={`${s.name}: ${s.tsxWeightPct}% of S&P/TSX Composite (C$${s.marketCapCadBillions}B)`}
              onClick={() => {
                playKeyClick();
                setSelectedSectorId(s.id);
                setActiveTab('constituents');
              }}
            />
          ))}
        </div>

        {/* Sector Quick Buttons Filter Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setSelectedSectorId('all');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 cursor-pointer transition-colors ${
              selectedSectorId === 'all'
                ? 'bg-[#ff9900] text-black font-extrabold'
                : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
            }`}
          >
            ALL SECTORS (11)
          </button>
          {sectors.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                playKeyClick();
                setSelectedSectorId(s.id);
              }}
              style={{
                borderColor: selectedSectorId === s.id ? s.color : 'rgba(30,42,68,0.7)',
                backgroundColor: selectedSectorId === s.id ? s.badgeBg : '#0f172a',
                color: selectedSectorId === s.id ? s.color : '#94a3b8',
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 flex items-center gap-1 cursor-pointer transition-colors hover:text-white"
            >
              <span>{s.shortName}</span>
              <span className="opacity-75 text-[9px] font-mono">{s.tsxWeightPct}%</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* VIEW 1: 11 GICS SECTORS & HEATMAP */}
      {activeTab === 'sectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {sectors.map((s) => {
            const chg =
              timeframe === '1d'
                ? s.change1d
                : timeframe === '5d'
                ? s.change5d
                : timeframe === '1m'
                ? s.change1m
                : s.changeYtd;
            const isPos = chg >= 0;

            return (
              <div
                key={s.id}
                onClick={() => {
                  playKeyClick();
                  setSelectedSectorId(s.id);
                  setActiveTab('constituents');
                }}
                className={`bg-[#0a0f1c] rounded-lg border p-3 flex flex-col gap-2.5 transition-all cursor-pointer hover:border-[#38bdf8] group shadow-sm ${
                  selectedSectorId === s.id ? 'border-[#ff9900] bg-[#0d1424]' : 'border-[#1b263b]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: s.badgeBg, color: s.color }}
                      className="p-1.5 rounded border border-white/10 shrink-0"
                    >
                      {getSectorIcon(s.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white text-xs group-hover:text-[#38bdf8] transition-colors">
                          {s.name}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-[#64748b] font-mono">
                          GICS {s.gicsCode}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8b9bb4]">
                        Weight: <strong className="text-white">{s.tsxWeightPct}%</strong> · C${s.marketCapCadBillions}B
                      </span>
                    </div>
                  </div>

                  {/* Return badge */}
                  <div
                    className={`px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 shrink-0 ${
                      isPos ? 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30' : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                    }`}
                  >
                    {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>{isPos ? `+${chg.toFixed(2)}%` : `${chg.toFixed(2)}%`}</span>
                  </div>
                </div>

                <p className="text-[10.5px] text-[#94a3b8] leading-relaxed line-clamp-2">
                  {s.description}
                </p>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-4 gap-1 font-mono text-[9.5px] bg-[#070b14] p-1.5 rounded border border-[#162033]">
                  <div>
                    <span className="text-[#64748b] block text-[8px]">P/E MULT</span>
                    <span className="text-white font-bold">{s.peRatio}x</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[8px]">DIV YIELD</span>
                    <span className="text-[#00e676] font-bold">{s.dividendYield.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[8px]">SECTOR IV</span>
                    <span className="text-[#00d2ff] font-bold">{s.impliedVol.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[8px]">BREADTH</span>
                    <span className="text-[#ffd600] font-bold">{s.advancers}↑ {s.decliners}↓</span>
                  </div>
                </div>

                {/* Top Holdings Pills */}
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#152033]">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[#64748b] text-[9px]">Top:</span>
                    {s.topHoldings.slice(0, 4).map((h) => (
                      <span key={h} className="px-1 py-0.2 rounded bg-[#131c2d] text-[#cbd5e1] font-mono text-[9px]">
                        {h.replace('.TO', '')}
                      </span>
                    ))}
                  </div>

                  <span className="text-[#38bdf8] text-[9.5px] font-bold flex items-center gap-0.5 group-hover:underline">
                    <span>View Equities</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: CONSTITUENTS BLOTTER TABLE */}
      {activeTab === 'constituents' && (
        <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg overflow-hidden shadow-md flex flex-col gap-2">
          {/* Controls Bar */}
          <div className="p-2.5 bg-[#0a1020] border-b border-[#18243c] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter Canadian equities by ticker, name, or sub-industry (e.g. RY, SHOP, Pipeline)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#050810] border border-[#22304c] rounded text-white text-xs placeholder:text-[#556987] focus:outline-none focus:border-[#ff9900]"
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 py-1 bg-[#1e293b] text-white rounded text-[10px] hover:bg-[#334155]"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10.5px]">
              <span className="text-[#64748b]">SORT BY:</span>
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'marketCap') setSortAsc(!sortAsc);
                  else {
                    setSortField('marketCap');
                    setSortAsc(false);
                  }
                }}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  sortField === 'marketCap' ? 'bg-[#ff9900] text-black font-extrabold' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                Market Cap {sortField === 'marketCap' && (sortAsc ? '▲' : '▼')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'change') setSortAsc(!sortAsc);
                  else {
                    setSortField('change');
                    setSortAsc(false);
                  }
                }}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  sortField === 'change' ? 'bg-[#ff9900] text-black font-extrabold' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                Day Change {sortField === 'change' && (sortAsc ? '▲' : '▼')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'yield') setSortAsc(!sortAsc);
                  else {
                    setSortField('yield');
                    setSortAsc(false);
                  }
                }}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  sortField === 'yield' ? 'bg-[#ff9900] text-black font-extrabold' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                Yield % {sortField === 'yield' && (sortAsc ? '▲' : '▼')}
              </button>
            </div>
          </div>

          {/* Equities Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#050810] text-[#64748b] text-[10px] border-b border-[#1c2840] select-none">
                  <th className="py-2 px-3">TICKER / CO</th>
                  <th className="py-2 px-2">SECTOR</th>
                  <th className="py-2 px-2">GICS SUB-INDUSTRY</th>
                  <th className="py-2 px-2 text-right">PRICE (C$)</th>
                  <th className="py-2 px-2 text-right">CHANGE</th>
                  <th className="py-2 px-2 text-right">DIV YIELD</th>
                  <th className="py-2 px-2 text-right">P/E</th>
                  <th className="py-2 px-2 text-right">MKT CAP</th>
                  <th className="py-2 px-2 text-center">BETA</th>
                  <th className="py-2 px-2 text-center">DUAL (US)</th>
                  <th className="py-2 px-3 text-center">INSTITUTIONAL ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d30]">
                {filteredEquities.map((eq) => {
                  const isPos = eq.changePct >= 0;
                  const sec = sectors.find((s) => s.id === eq.sectorId);

                  return (
                    <tr
                      key={eq.symbol}
                      className="hover:bg-[#0e1628] transition-colors group cursor-pointer"
                      onClick={() => handleSelectEquity(eq)}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs group-hover:text-[#38bdf8] transition-colors">
                            {eq.tsxTicker}
                          </span>
                          <span className="text-[10.5px] text-[#8b9bb4] truncate max-w-[150px]">
                            {eq.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-2">
                        <span
                          style={{ color: sec?.color }}
                          className="px-1.5 py-0.5 rounded bg-black/40 text-[9.5px] font-bold"
                        >
                          {sec?.shortName || eq.sectorId.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-2 px-2 text-[10.5px] text-[#94a3b8] truncate max-w-[170px]">
                        {eq.subIndustry}
                      </td>

                      <td className="py-2 px-2 text-right font-bold text-white">
                        ${eq.priceCad.toFixed(2)}
                      </td>

                      <td className={`py-2 px-2 text-right font-bold ${isPos ? 'text-[#00e676]' : 'text-[#ef4444]'}`}>
                        {isPos ? `+${eq.changePct.toFixed(2)}%` : `${eq.changePct.toFixed(2)}%`}
                      </td>

                      <td className="py-2 px-2 text-right font-bold text-[#00e676]">
                        {eq.dividendYield > 0 ? `${eq.dividendYield.toFixed(2)}%` : '-'}
                      </td>

                      <td className="py-2 px-2 text-right text-[#cbd5e1]">
                        {eq.peRatio}x
                      </td>

                      <td className="py-2 px-2 text-right font-bold text-white">
                        {eq.marketCapCad}
                      </td>

                      <td className="py-2 px-2 text-center text-[#8b9bb4]">
                        {eq.beta.toFixed(2)}
                      </td>

                      <td className="py-2 px-2 text-center font-mono">
                        {eq.usTicker ? (
                          <span className="text-[#38bdf8] text-[10px] font-bold">NYSE: {eq.usTicker}</span>
                        ) : (
                          <span className="text-[#475569] text-[9px]">TSX Only</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {onNavigateToChain && (
                            <button
                              type="button"
                              onClick={() => {
                                playExecutionChime();
                                onNavigateToChain(eq.symbol);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#00d2ff]/15 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/40 text-[9px] font-bold cursor-pointer"
                              title={`Open ${eq.symbol} Montreal Exchange (MX) Option Chain`}
                            >
                              OPTS
                            </button>
                          )}

                          {onNavigateToChart && (
                            <button
                              type="button"
                              onClick={() => {
                                playKeyClick();
                                onNavigateToChart(eq.symbol);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#ff9900]/15 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 text-[9px] font-bold cursor-pointer"
                              title={`View ${eq.symbol} Technicals & Candlestick Chart`}
                            >
                              CHART
                            </button>
                          )}

                          {onNavigateToValuation && (
                            <button
                              type="button"
                              onClick={() => {
                                playKeyClick();
                                onNavigateToValuation(eq.symbol);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 hover:bg-[#38bdf8]/30 text-[#38bdf8] border border-[#38bdf8]/40 text-[9px] font-bold cursor-pointer"
                              title={`Valuation & Greeks Model (OVME) for ${eq.symbol}`}
                            >
                              OVME
                            </button>
                          )}

                          {onNavigateToRisk && (
                            <button
                              type="button"
                              onClick={() => {
                                playKeyClick();
                                onNavigateToRisk(eq.symbol);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#10b981]/15 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 text-[9px] font-bold cursor-pointer"
                              title={`Risk Profile & Payoff for ${eq.symbol}`}
                            >
                              RISK
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MACRO & SECTOR ROTATION INTELLIGENCE */}
      {activeTab === 'macro' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Regime overview card */}
          <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
            <div className="flex items-center gap-2 border-b border-[#182338] pb-2">
              <Compass className="w-4 h-4 text-[#ff9900]" />
              <span className="font-extrabold text-white text-xs">
                CANADIAN BUSINESS CYCLE &amp; REGIME
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#070b14] border border-[#172236] flex flex-col gap-1.5">
              <span className="text-[#64748b] text-[9px] uppercase font-bold">CURRENT REGIME:</span>
              <span className="font-black text-sm text-[#00e676]">{macro.businessCycleRegime}</span>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-1">
                {macro.cycleDescription}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 text-[10.5px]">
              <span className="text-[#8b9bb4] font-bold uppercase text-[9.5px]">KEY CATALYSTS &amp; DRIVERS:</span>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#070b14] border border-[#162033]">
                <span className="text-[#94a3b8]">Bank of Canada Next Policy:</span>
                <span className="text-white font-bold">{macro.bocNextDecision}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#070b14] border border-[#162033]">
                <span className="text-[#94a3b8]">Trans Mountain (TMX) Pipeline:</span>
                <span className="text-[#00e676] font-bold">Operational (590k bpd)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#070b14] border border-[#162033]">
                <span className="text-[#94a3b8]">Mortgage Renewal Wall (2025-2026):</span>
                <span className="text-[#ffd600] font-bold">C$350B / Year (Mitigated)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#070b14] border border-[#162033]">
                <span className="text-[#94a3b8]">LNG Canada Phase 1 (Kitimat):</span>
                <span className="text-[#00d2ff] font-bold">Commercial Start 2025</span>
              </div>
            </div>
          </div>

          {/* Institutional Recommendations Matrix */}
          <div className="lg:col-span-2 bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between border-b border-[#182338] pb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-extrabold text-white text-xs">
                  INSTITUTIONAL SECTOR ROTATION MODEL (S&amp;P/TSX)
                </span>
              </div>
              <span className="text-[10px] text-[#64748b]">Quant tactical allocation model</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {macro.sectorRecommendations.map((rec) => {
                const sec = sectors.find((s) => s.id === rec.sectorId);
                const isOW = rec.rating === 'Overweight';
                const isUW = rec.rating === 'Underweight';

                return (
                  <div
                    key={rec.sectorId}
                    className="p-2.5 rounded bg-[#070b14] border border-[#162033] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getSectorIcon(rec.sectorId)}
                        <span className="font-bold text-white text-xs">{sec?.name}</span>
                        <span className="text-[9px] text-[#64748b]">({sec?.tsxWeightPct}%)</span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[9.5px] font-black font-mono ${
                          isOW
                            ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                            : isUW
                            ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                            : 'bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/40'
                        }`}
                      >
                        {rec.rating}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-[#94a3b8] leading-relaxed">
                      {rec.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: DIVIDEND & YIELD SPREADS RADAR */}
      {activeTab === 'dividends' && (
        <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[#182338] pb-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#00e676]" />
              <span className="font-extrabold text-white text-xs">
                CANADIAN SECTOR DIVIDEND YIELDS VS. 10-YEAR GOC BOND BENCHMARK
              </span>
            </div>
            <span className="text-[10px] text-[#64748b]">
              GoC 10-Yr Benchmark Yield: <strong className="text-[#ffd600]">{macro.goc10YearYield}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectors.map((s) => {
              const spread = s.dividendYield - macro.goc10YearYield;
              const hasPositiveSpread = spread > 0;

              return (
                <div
                  key={s.id}
                  className="bg-[#0b101c] p-3 rounded border border-[#172236] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSectorIcon(s.id)}
                      <div>
                        <span className="font-bold text-white text-xs">{s.name}</span>
                        <span className="text-[9px] text-[#64748b] block">{s.tsxWeightPct}% TSX Weight</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-[#00e676]">{s.dividendYield.toFixed(2)}%</span>
                      <span className={`block text-[9.5px] font-mono ${hasPositiveSpread ? 'text-[#00e676]' : 'text-[#8b9bb4]'}`}>
                        {hasPositiveSpread ? `+${spread.toFixed(2)}% vs GoC 10Y` : `${spread.toFixed(2)}% vs GoC 10Y`}
                      </span>
                    </div>
                  </div>

                  {/* Visual Yield Bar */}
                  <div className="w-full bg-[#1e293b] h-2 rounded overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (s.dividendYield / 8.5) * 100)}%` }}
                      className="h-full bg-[#00e676] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9.5px] text-[#8b9bb4]">
                    <span>Eligible Dividend Tax Credit Applies</span>
                    <span>P/E: <strong className="text-white">{s.peRatio}x</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: GUARANTEED INVESTMENT CERTIFICATES (GIC) */}
      {activeTab === 'gic' && (
        <GuaranteedInvestmentCertificatesView
          accounts={canadianAccounts}
          onUpdateAccounts={onUpdateAccounts}
          onOpenCanadianSuite={onOpenCanadianSuite}
          onNavigateToSectors={() => setActiveTab('sectors')}
        />
      )}
    </div>
  );
};
