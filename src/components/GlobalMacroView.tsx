import React, { useState, useMemo, useEffect } from 'react';
import {
  GLOBAL_MACRO_ECONOMIES,
  CENTRAL_BANK_TRACKER,
  MACRO_REGIME_QUADRANTS,
  GLOBAL_INFLATION_COMPONENTS,
  GLOBAL_ECONOMIC_CALENDAR,
  MACRO_SCENARIO_SHOCKS,
  EconomyMacroProfile,
  MacroRegion,
  MacroScenarioShockModel,
} from '../services/globalMacroData';
import {
  COUNTRY_GEO_RISK_DATA,
  CountryRiskRegion,
} from '../services/countryRiskData';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { YieldCurveView } from './YieldCurveView';
import { OPECMeetingsView } from './OPECMeetingsView';
import { TariffTrackerView } from './TariffTrackerView';
import { DefconLevelView } from './DefconLevelView';
import { Ticker, TradeLeg } from '../types/options';
import { INITIAL_TICKERS } from '../services/marketData';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Calendar,
  AlertTriangle,
  Zap,
  BarChart2,
  DollarSign,
  PieChart,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Flame,
  Search,
  Sliders,
  ExternalLink,
  Filter,
} from 'lucide-react';

interface GlobalMacroViewProps {
  onNavigateToYieldCurve?: () => void;
  onNavigateToTariff?: () => void;
  onNavigateToOpec?: () => void;
  onNavigateToRisk?: () => void;
  onNavigateToChain?: (symbol?: string) => void;
  initialTab?: MacroTab;
  currentTicker?: Ticker;
  onSelectTicker?: (symbol: string) => void;
  onNavigateToValuation?: () => void;
  onApplyStrategyLegs?: (newLegs: TradeLeg[]) => void;
  onNavigateToGeoRisk?: () => void;
  onSubTabChange?: (tab: MacroTab) => void;
}

export type MacroTab =
  | 'economies'
  | 'yield_curve'
  | 'tariff'
  | 'defcon'
  | 'geopolitical'
  | 'central_banks'
  | 'opec'
  | 'regime'
  | 'inflation'
  | 'calendar'
  | 'simulator';

export const GlobalMacroView: React.FC<GlobalMacroViewProps> = ({
  onNavigateToYieldCurve,
  onNavigateToTariff,
  onNavigateToOpec,
  onNavigateToRisk,
  onNavigateToChain,
  initialTab = 'economies',
  currentTicker,
  onSelectTicker,
  onNavigateToValuation,
  onApplyStrategyLegs,
  onNavigateToGeoRisk,
  onSubTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<MacroTab>(initialTab);

  const handleTabChange = (newTab: MacroTab) => {
    setActiveTab(newTab);
    if (onSubTabChange) {
      onSubTabChange(newTab);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const activeTicker: Ticker = currentTicker || INITIAL_TICKERS['SPY'];
  const handleSelectTicker = onSelectTicker || (() => {});
  const handleNavigateToValuation = onNavigateToValuation || (() => {});
  const handleNavigateToRisk = onNavigateToRisk || (() => {});

  const [selectedRegion, setSelectedRegion] = useState<MacroRegion>('GLOBAL');
  const [selectedEconomyId, setSelectedEconomyId] = useState<string>('US');
  const [selectedShockId, setSelectedShockId] = useState<string>('cpi-reacceleration');
  const [calendarImportanceFilter, setCalendarImportanceFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [sortField, setSortField] = useState<keyof EconomyMacroProfile | 'gdp' | 'cpi' | 'rate' | 'yield'>('gdp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Geopolitical & Country Risk State
  const [selectedGeoRegionId, setSelectedGeoRegionId] = useState<string>('mideast-gulf');
  const [geoFilterTier, setGeoFilterTier] = useState<string>('ALL');

  const filteredGeoRegions = useMemo(() => {
    return COUNTRY_GEO_RISK_DATA.filter((r) => {
      if (geoFilterTier === 'ALL') return true;
      return r.riskTier === geoFilterTier;
    });
  }, [geoFilterTier]);

  const activeGeoRegion = useMemo(() => {
    return COUNTRY_GEO_RISK_DATA.find((r) => r.id === selectedGeoRegionId) || COUNTRY_GEO_RISK_DATA[0];
  }, [selectedGeoRegionId]);

  // Filtered economies by selected region
  const filteredEconomies = useMemo(() => {
    return GLOBAL_MACRO_ECONOMIES.filter((eco) => {
      if (selectedRegion === 'GLOBAL') return true;
      if (selectedRegion === 'G7') return ['US', 'EZ', 'JP', 'UK', 'CA'].includes(eco.id);
      return eco.region === selectedRegion;
    });
  }, [selectedRegion]);

  // Currently selected economy profile
  const activeEconomy = useMemo(() => {
    return GLOBAL_MACRO_ECONOMIES.find((e) => e.id === selectedEconomyId) || GLOBAL_MACRO_ECONOMIES[0];
  }, [selectedEconomyId]);

  // Active scenario shock
  const activeShock = useMemo(() => {
    return MACRO_SCENARIO_SHOCKS.find((s) => s.id === selectedShockId) || MACRO_SCENARIO_SHOCKS[0];
  }, [selectedShockId]);

  // Filtered calendar events
  const filteredEvents = useMemo(() => {
    return GLOBAL_ECONOMIC_CALENDAR.filter((evt) => {
      if (calendarImportanceFilter === 'ALL') return true;
      return evt.importance === calendarImportanceFilter;
    });
  }, [calendarImportanceFilter]);

  // Global Macro Summary Stats
  const globalAggregates = useMemo(() => {
    const totalGdp = GLOBAL_MACRO_ECONOMIES.reduce((sum, e) => sum + e.gdp.nominalGdpTrillionUsd, 0);
    const avgGdpGrowth = GLOBAL_MACRO_ECONOMIES.reduce((sum, e) => sum + e.gdp.realGdpYoY, 0) / GLOBAL_MACRO_ECONOMIES.length;
    const avgCpi = GLOBAL_MACRO_ECONOMIES.reduce((sum, e) => sum + e.inflation.headlineCpiYoY, 0) / GLOBAL_MACRO_ECONOMIES.length;
    const avg10Y = GLOBAL_MACRO_ECONOMIES.reduce((sum, e) => sum + e.fiscalAndSovereign.yield10Y, 0) / GLOBAL_MACRO_ECONOMIES.length;
    const dovishCount = GLOBAL_MACRO_ECONOMIES.filter((e) => e.centralBank.stance === 'DOVISH').length;
    const dovishPct = Math.round((dovishCount / GLOBAL_MACRO_ECONOMIES.length) * 100);

    return {
      totalGdpUsdTrillion: totalGdp.toFixed(1),
      avgGdpGrowthYoY: avgGdpGrowth.toFixed(1),
      avgCpiYoY: avgCpi.toFixed(1),
      avg10Y: avg10Y.toFixed(2),
      dovishPct,
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0d12] border border-[var(--border)] rounded text-xs font-mono select-none overflow-hidden text-[#d1d5db]">
      {/* ========================================================
          1. TERMINAL HEADER BANNER & GLOBAL MACRO TICKER
      ======================================================== */}
      <div className="bg-[#0e1218] border-b border-[#1e2530] p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 text-[#ff9900]">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-wider flex items-center gap-1.5">
                <span>GLOBAL MACROECONOMIC DATA ENGINE</span>
                <span className="text-[#ff9900] text-xs font-normal">ECST / MACR &lt;GO&gt;</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40">
                LIVE G10 + EM FEED
              </span>
            </div>
            <span className="text-[10px] text-[#8c8c8c] block mt-0.5">
              Comprehensive Cross-Border GDP, Central Bank Rates, Inflation Breakevens, Labor &amp; Business Cycle Regimes
            </span>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          {onNavigateToYieldCurve && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToYieldCurve();
              }}
              className="px-2.5 py-1 rounded bg-[#1e2530] hover:bg-[#283242] text-[#38bdf8] font-bold text-[10px] border border-[#38bdf8]/40 flex items-center gap-1 transition-all"
            >
              <span>YC SOVEREIGN CURVES &gt;</span>
            </button>
          )}
          {onNavigateToTariff && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToTariff();
              }}
              className="px-2.5 py-1 rounded bg-[#1e2530] hover:bg-[#283242] text-[#ffd600] font-bold text-[10px] border border-[#ffd600]/40 flex items-center gap-1 transition-all"
            >
              <span>TARIFF TRACKER &gt;</span>
            </button>
          )}
          {onNavigateToOpec && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToOpec();
              }}
              className="px-2.5 py-1 rounded bg-[#1e2530] hover:bg-[#283242] text-[#ff9900] font-bold text-[10px] border border-[#ff9900]/40 flex items-center gap-1 transition-all"
            >
              <span>OPEC ENERGY MACRO &gt;</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Macro KPI Strip */}
      <div className="bg-[#0b0e14] border-b border-[#181f2a] px-3 py-2 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-[10.5px]">
        {/* Real GDP Growth */}
        <div className="bg-[#12161f] border border-[#1e2634] rounded p-2 flex flex-col justify-between">
          <span className="text-[9px] text-[#8c8c8c] font-bold">GLOBAL GDP (SAMPLE)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-white">${globalAggregates.totalGdpUsdTrillion}T</span>
            <span className="text-[9.5px] font-bold text-[var(--bull)]">+{globalAggregates.avgGdpGrowthYoY}% YoY</span>
          </div>
          <span className="text-[8px] text-[#8c8c8c]">Combined economic output</span>
        </div>

        {/* Global Inflation */}
        <div className="bg-[#12161f] border border-[#1e2634] rounded p-2 flex flex-col justify-between">
          <span className="text-[9px] text-[#8c8c8c] font-bold">MEDIAN HEADLINE INFLATION</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-[#00e676]">{globalAggregates.avgCpiYoY}%</span>
            <span className="text-[9px] font-bold text-[#8c8c8c]">(Target ~2.0%)</span>
          </div>
          <span className="text-[8px] text-[#8c8c8c]">Normalizing from 2022-23 peaks</span>
        </div>

        {/* Central Bank Policy Cycle */}
        <div className="bg-[#12161f] border border-[#1e2634] rounded p-2 flex flex-col justify-between">
          <span className="text-[9px] text-[#8c8c8c] font-bold">MONETARY POLICY CYCLE</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-[#38bdf8]">{globalAggregates.dovishPct}% EASING</span>
            <span className="text-[9px] font-bold text-[#38bdf8]">Rate Cut Phase</span>
          </div>
          <span className="text-[8px] text-[#8c8c8c]">Synchronous global rate reductions</span>
        </div>

        {/* Benchmark 10Y Yield */}
        <div className="bg-[#12161f] border border-[#1e2634] rounded p-2 flex flex-col justify-between">
          <span className="text-[9px] text-[#8c8c8c] font-bold">G10 10Y BENCHMARK YIELD</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-[#ffd600]">{globalAggregates.avg10Y}%</span>
            <span className="text-[9px] font-bold text-white">US 10Y: 4.02%</span>
          </div>
          <span className="text-[8px] text-[#8c8c8c]">2Y-10Y curve disinverting</span>
        </div>

        {/* Dominant Macro Regime */}
        <div className="bg-[#12161f] border border-[#1e2634] rounded p-2 flex flex-col justify-between">
          <span className="text-[9px] text-[#ff9900] font-bold">DOMINANT MACRO REGIME</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs font-black text-[#00e676] truncate">DISINFLATION (Q4)</span>
            <span className="text-[9px] font-bold text-[#00e676]">64% Prob</span>
          </div>
          <span className="text-[8px] text-[#8c8c8c]">Bullish duration &amp; mega-cap tech</span>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="bg-[#0d1017] border-b border-[#181f2a] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'economies', label: '1. GLOBAL ECONOMIES', icon: Globe },
              { id: 'yield_curve', label: '2. G20 YIELD CURVES', icon: TrendingUp },
              { id: 'tariff', label: '3. TARIFF TRACKER', icon: ShieldAlert },
              { id: 'defcon', label: '4. DEFCON LEVEL 3', icon: AlertTriangle },
              { id: 'geopolitical', label: '5. GEOPOLITICAL RISK', icon: ShieldAlert },
              { id: 'central_banks', label: '6. CENTRAL BANK RATES', icon: DollarSign },
              { id: 'opec', label: '7. OPEC & ENERGY IV', icon: Flame },
              { id: 'regime', label: '8. MACRO REGIMES', icon: PieChart },
              { id: 'inflation', label: '9. INFLATION PASS-THROUGH', icon: Activity },
              { id: 'calendar', label: '10. MACRO CALENDAR', icon: Calendar },
              { id: 'simulator', label: '11. SHOCK SIMULATOR', icon: Zap },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  playKeyClick();
                  handleTabChange(t.id);
                }}
                className={`px-3 py-1.5 rounded font-bold text-[10.5px] transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                  isActive
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-md'
                    : 'bg-[#121620] text-[#9ca3af] border-[#222b3a] hover:border-[#ff9900]/50 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#8c8c8c] hidden md:inline">REGION:</span>
          <div className="flex items-center bg-[#090b10] p-0.5 rounded border border-[#1e2634] text-[9.5px]">
            {(['GLOBAL', 'G7', 'NORTH_AMERICA', 'EUROPE', 'ASIA_PACIFIC', 'EMERGING'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  playKeyClick();
                  setSelectedRegion(r);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  selectedRegion === r ? 'bg-white text-black font-extrabold' : 'text-[#8c8c8c] hover:text-white'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* ========================================================
            TAB 1: GLOBAL ECONOMIES DASHBOARD
        ======================================================== */}
        {activeTab === 'economies' && (
          <div className="flex flex-col gap-3">
            {/* Economy Quick Selector Pill Strip */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {filteredEconomies.map((eco) => {
                const isSelected = selectedEconomyId === eco.id;
                return (
                  <button
                    key={eco.id}
                    onClick={() => {
                      playKeyClick();
                      setSelectedEconomyId(eco.id);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-2 border shrink-0 ${
                      isSelected
                        ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900] font-black shadow-md ring-1 ring-[#ff9900]'
                        : 'bg-[#121620] text-[#d1d5db] border-[#222b3a] hover:border-[#ff9900]/50 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{eco.flag}</span>
                    <span className="font-bold">{eco.name}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${
                      eco.centralBank.stance === 'DOVISH'
                        ? 'bg-[#00e676]/20 text-[#00e676]'
                        : eco.centralBank.stance === 'HAWKISH'
                        ? 'bg-[#ff334b]/20 text-[#ff334b]'
                        : 'bg-[#ffd600]/20 text-[#ffd600]'
                    }`}>
                      {eco.centralBank.policyRate}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Economy Deep-Dive Showcase */}
            <div className="bg-[#10141c] border border-[#222a38] rounded-lg p-3.5 flex flex-col gap-3">
              {/* Header Info Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2432] pb-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeEconomy.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">{activeEconomy.name}</span>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#1e2636] text-[#38bdf8] border border-[#2e3c54]">
                        {activeEconomy.currency} ({activeEconomy.currencySymbol})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                        activeEconomy.centralBank.stance === 'DOVISH'
                          ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                          : activeEconomy.centralBank.stance === 'HAWKISH'
                          ? 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/40'
                          : 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/40'
                      }`}>
                        {activeEconomy.centralBank.stance} STANCE ({activeEconomy.centralBank.policyRate}%)
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8c8c8c]">
                      {activeEconomy.centralBank.name} ({activeEconomy.centralBank.abbreviation}) &bull; Next Meeting: {activeEconomy.centralBank.nextMeeting}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-[#141a24] px-3 py-1.5 rounded border border-[#253042] flex flex-col">
                    <span className="text-[8.5px] text-[#8c8c8c]">NOMINAL GDP</span>
                    <span className="font-extrabold text-white font-mono">${activeEconomy.gdp.nominalGdpTrillionUsd}T USD</span>
                  </div>
                  <div className="bg-[#141a24] px-3 py-1.5 rounded border border-[#253042] flex flex-col">
                    <span className="text-[8.5px] text-[#8c8c8c]">GDP PER CAPITA</span>
                    <span className="font-extrabold text-[#38bdf8] font-mono">${activeEconomy.gdp.gdpPerCapitaUsd.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#141a24] px-3 py-1.5 rounded border border-[#253042] flex flex-col">
                    <span className="text-[8.5px] text-[#8c8c8c]">DEBT / GDP RATIO</span>
                    <span className={`font-extrabold font-mono ${activeEconomy.fiscalAndSovereign.debtToGdpPct > 100 ? 'text-[#ff9900]' : 'text-white'}`}>
                      {activeEconomy.fiscalAndSovereign.debtToGdpPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 5-Card Macro Pillar Quadrants */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Growth & GDP */}
                <div className="bg-[#141822] border border-[#202836] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#242e3e] pb-1">
                    <span className="text-[9.5px] text-[#38bdf8] font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#38bdf8]" />
                      <span>REAL GDP GROWTH</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#1f293d] text-white">
                      {activeEconomy.gdp.trend}
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-black text-white">+{activeEconomy.gdp.realGdpYoY}%</span>
                    <span className="text-[9px] text-[#8c8c8c] block">QoQ Ann: +{activeEconomy.gdp.realGdpQoQAnn}%</span>
                  </div>
                  {/* Historical mini bars */}
                  <div className="flex items-end gap-1 h-8 pt-1 border-t border-[#242e3e]">
                    {activeEconomy.gdp.history12M.map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-[#38bdf8]/60 hover:bg-[#38bdf8] rounded-t transition-all"
                          style={{ height: `${Math.max(4, Math.min(28, (val / 8) * 28))}px` }}
                          title={`GDP YoY: ${val}%`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Inflation & CPI */}
                <div className="bg-[#141822] border border-[#202836] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#242e3e] pb-1">
                    <span className="text-[9.5px] text-[#ff9900] font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#ff9900]" />
                      <span>INFLATION (CPI)</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#1f293d] text-[#00e676]">
                      {activeEconomy.inflation.trend}
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-[#ff9900]">{activeEconomy.inflation.headlineCpiYoY}%</span>
                      <span className="text-[9px] text-[#8c8c8c]">Target {activeEconomy.inflation.targetRate}%</span>
                    </div>
                    <span className="text-[9px] text-[#8c8c8c] block">Core CPI: {activeEconomy.inflation.coreCpiYoY}% | PPI: {activeEconomy.inflation.ppiYoY}%</span>
                  </div>
                  {/* Historical CPI trend bars */}
                  <div className="flex items-end gap-1 h-8 pt-1 border-t border-[#242e3e]">
                    {activeEconomy.inflation.history12M.map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-[#ff9900]/60 hover:bg-[#ff9900] rounded-t transition-all"
                          style={{ height: `${Math.max(4, Math.min(28, (val / 6) * 28))}px` }}
                          title={`CPI YoY: ${val}%`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Central Bank Policy */}
                <div className="bg-[#141822] border border-[#202836] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#242e3e] pb-1">
                    <span className="text-[9.5px] text-[#00e676] font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-[#00e676]" />
                      <span>MONETARY POLICY</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#00e676]/20 text-[#00e676]">
                      {activeEconomy.centralBank.lastAction}
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-black text-white">{activeEconomy.centralBank.policyRate}%</span>
                    <span className="text-[9px] text-[#8c8c8c] block truncate" title={activeEconomy.centralBank.rateUnit}>
                      {activeEconomy.centralBank.meetingExpectation}
                    </span>
                  </div>
                  <div className="text-[8.5px] text-[#8c8c8c] pt-1 border-t border-[#242e3e] truncate" title={activeEconomy.centralBank.guidanceSummary}>
                    {activeEconomy.centralBank.guidanceSummary}
                  </div>
                </div>

                {/* 4. Labor Market */}
                <div className="bg-[#141822] border border-[#202836] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#242e3e] pb-1">
                    <span className="text-[9.5px] text-[#c084fc] font-bold flex items-center gap-1">
                      <Activity className="w-3 h-3 text-[#c084fc]" />
                      <span>LABOR &amp; JOBS</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#1f293d] text-white">
                      {activeEconomy.labor.laborMarketCondition}
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-black text-white">{activeEconomy.labor.unemploymentRate}%</span>
                    <span className="text-[9px] text-[#8c8c8c] block">Wage Gains: +{activeEconomy.labor.wageGrowthYoY}% YoY</span>
                  </div>
                  <div className="text-[8.5px] text-[#8c8c8c] pt-1 border-t border-[#242e3e]">
                    Payrolls / Jobs: <strong className="text-white">+{activeEconomy.labor.nonfarmPayrollsOrJobCreationK}k</strong>
                  </div>
                </div>

                {/* 5. Business Activity PMIs */}
                <div className="bg-[#141822] border border-[#202836] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-[#242e3e] pb-1">
                    <span className="text-[9.5px] text-[#ffd600] font-bold flex items-center gap-1">
                      <BarChart2 className="w-3 h-3 text-[#ffd600]" />
                      <span>PMI COMPOSITE</span>
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                      activeEconomy.activity.compositePmi >= 50 ? 'bg-[#00e676]/20 text-[#00e676]' : 'bg-[#ff334b]/20 text-[#ff334b]'
                    }`}>
                      {activeEconomy.activity.compositePmi >= 50 ? 'EXPANSION' : 'CONTRACTION'}
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-black text-white">{activeEconomy.activity.compositePmi}</span>
                    <span className="text-[9px] text-[#8c8c8c] block">Mfg {activeEconomy.activity.manufacturingPmi} | Svc {activeEconomy.activity.servicesPmi}</span>
                  </div>
                  <div className="text-[8.5px] text-[#8c8c8c] pt-1 border-t border-[#242e3e]">
                    Retail Sales: <strong className="text-white">+{activeEconomy.activity.retailSalesYoY}% YoY</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Cross-Border Comparison Table */}
            <div className="bg-[#10141c] border border-[#222a38] rounded-lg p-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2432] pb-2">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#ff9900]" />
                  <span>CROSS-BORDER MACROECONOMIC METRICS BENCHMARK</span>
                </span>
                <span className="text-[10px] text-[#8c8c8c]">
                  Click any country to inspect full macroeconomic profile &bull; Sortable matrix
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="border-b border-[#222a38] bg-[#0c1017] text-[#8c8c8c] text-[9.5px] uppercase">
                      <th className="py-2 px-2.5">COUNTRY / BLOC</th>
                      <th className="py-2 px-2 text-right">REAL GDP YoY</th>
                      <th className="py-2 px-2 text-right text-[#ff9900]">HEADLINE CPI</th>
                      <th className="py-2 px-2 text-right">CORE CPI</th>
                      <th className="py-2 px-2 text-right text-[#00e676]">POLICY RATE</th>
                      <th className="py-2 px-2 text-center">STANCE</th>
                      <th className="py-2 px-2 text-right text-[#ffd600]">10Y YIELD</th>
                      <th className="py-2 px-2 text-right">2Y-10Y SPREAD</th>
                      <th className="py-2 px-2 text-right">COMPOSITE PMI</th>
                      <th className="py-2 px-2 text-right">UNEMPLOYMENT</th>
                      <th className="py-2 px-2 text-right">DEBT / GDP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18202c]">
                    {filteredEconomies.map((eco) => {
                      const isSelected = eco.id === selectedEconomyId;
                      return (
                        <tr
                          key={eco.id}
                          onClick={() => {
                            playKeyClick();
                            setSelectedEconomyId(eco.id);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#ff9900]/10 font-bold' : 'hover:bg-[#161c27]'
                          }`}
                        >
                          <td className="py-2 px-2.5 flex items-center gap-2">
                            <span className="text-base">{eco.flag}</span>
                            <div>
                              <span className="font-bold text-white block">{eco.name}</span>
                              <span className="text-[8.5px] text-[#8c8c8c]">{eco.centralBank.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-white">
                            +{eco.gdp.realGdpYoY}%
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-black text-[#ff9900]">
                            {eco.inflation.headlineCpiYoY}%
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[#cbd5e1]">
                            {eco.inflation.coreCpiYoY}%
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-black text-[#00e676]">
                            {eco.centralBank.policyRate}%
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${
                              eco.centralBank.stance === 'DOVISH'
                                ? 'bg-[#00e676]/20 text-[#00e676]'
                                : eco.centralBank.stance === 'HAWKISH'
                                ? 'bg-[#ff334b]/20 text-[#ff334b]'
                                : 'bg-[#ffd600]/20 text-[#ffd600]'
                            }`}>
                              {eco.centralBank.stance}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-[#ffd600]">
                            {eco.fiscalAndSovereign.yield10Y}%
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold">
                            <span className={eco.fiscalAndSovereign.spread2Y10Y >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                              {eco.fiscalAndSovereign.spread2Y10Y >= 0 ? '+' : ''}{eco.fiscalAndSovereign.spread2Y10Y} bps
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold">
                            <span className={eco.activity.compositePmi >= 50 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                              {eco.activity.compositePmi}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[#cbd5e1]">
                            {eco.labor.unemploymentRate}%
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[#cbd5e1]">
                            {eco.fiscalAndSovereign.debtToGdpPct}%
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

        {/* ========================================================
            TAB 2: CENTRAL BANK POLICY TRACKER
        ======================================================== */}
        {activeTab === 'central_banks' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#10141c] border border-[#222a38] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2432] pb-2">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#00e676]" />
                  <span>G10 &amp; MAJOR CENTRAL BANK POLICY CYCLE TRACKER</span>
                </span>
                <span className="text-[10px] text-[#8c8c8c]">
                  Market-Implied Rate Probabilities, Terminal Rates, Dot Plot Projections &amp; Balance Sheet Policies
                </span>
              </div>

              {/* Central Banks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {CENTRAL_BANK_TRACKER.map((cb) => (
                  <div key={cb.id} className="bg-[#141822] border border-[#222c3c] rounded-lg p-3 flex flex-col justify-between gap-2.5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#20293a] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cb.flag}</span>
                        <div>
                          <span className="font-black text-white text-xs block">{cb.bankName}</span>
                          <span className="text-[9px] text-[#8c8c8c]">{cb.governor} &bull; {cb.country}</span>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        cb.cycleStage === 'EASING_CYCLE'
                          ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                          : cb.cycleStage === 'NORMALIZATION'
                          ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40'
                          : 'bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/40'
                      }`}>
                        {cb.cycleStage.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Rate Display */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] text-[#8c8c8c] block">{cb.rateLabel}</span>
                        <span className="text-2xl font-black text-white">{cb.currentRate}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8.5px] text-[#8c8c8c] block">NEXT MEETING:</span>
                        <span className="text-[10px] font-bold text-[#ff9900]">{cb.nextMeetingDate}</span>
                      </div>
                    </div>

                    {/* Market-Implied Probability Bar */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8.5px]">
                        <span className="text-[#00e676] font-bold">Cut: {cb.cutProbPct}%</span>
                        <span className="text-white font-bold">Hold: {cb.holdProbPct}%</span>
                        <span className="text-[#ff334b] font-bold">Hike: {cb.hikeProbPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#222834] rounded-full overflow-hidden flex">
                        <div style={{ width: `${cb.cutProbPct}%` }} className="bg-[#00e676] h-full" />
                        <div style={{ width: `${cb.holdProbPct}%` }} className="bg-[#94a3b8] h-full" />
                        <div style={{ width: `${cb.hikeProbPct}%` }} className="bg-[#ff334b] h-full" />
                      </div>
                    </div>

                    {/* Projections Strip */}
                    <div className="grid grid-cols-3 gap-1 bg-[#0f121a] p-1.5 rounded border border-[#1e2534] text-center text-[9px]">
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">END 2026</span>
                        <span className="font-bold text-white">{cb.expectedRateEndOf2026}%</span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">END 2027</span>
                        <span className="font-bold text-[#38bdf8]">{cb.expectedRateEndOf2027}%</span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">R* NEUTRAL</span>
                        <span className="font-bold text-[#c084fc]">{cb.neutralRateEst}%</span>
                      </div>
                    </div>

                    {/* Balance Sheet Action & Risk */}
                    <div className="text-[8.5px] text-[#8c8c8c] pt-1.5 border-t border-[#20293a] flex flex-col gap-0.5">
                      <span><strong>QT / Balance Sheet:</strong> {cb.balanceSheetAction}</span>
                      <span className="truncate" title={cb.keyRiskFactor}><strong>Risk:</strong> {cb.keyRiskFactor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: MACRO REGIME & ALLOCATION
        ======================================================== */}
        {activeTab === 'regime' && (
          <div className="flex flex-col gap-3">
            {/* 4-Quadrant Framework Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MACRO_REGIME_QUADRANTS.map((quad) => {
                const isCurrent = quad.isCurrent;
                return (
                  <div
                    key={quad.quadrantId}
                    className={`rounded-lg p-3.5 flex flex-col justify-between gap-3 border transition-all ${
                      isCurrent
                        ? 'bg-[#101822] border-[#00e676] shadow-[0_0_20px_rgba(0,230,118,0.15)] ring-1 ring-[#00e676]'
                        : 'bg-[#10141c] border-[#222a38] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#202838] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{quad.quadrantName}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#00e676] text-black animate-pulse">
                            ACTIVE REGIME ({quad.score}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold">
                        <span className={quad.growthStatus === 'ACCELERATING' ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                          Growth {quad.growthStatus}
                        </span>
                        <span>&bull;</span>
                        <span className={quad.inflationStatus === 'FALLING' ? 'text-[#00e676]' : 'text-[#ff9900]'}>
                          CPI {quad.inflationStatus}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#cbd5e1] leading-relaxed">
                      {quad.macroDescription}
                    </p>

                    {/* Asset Playbook Table */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-[#0b0e14] p-2 rounded border border-[#1a2332] text-center text-[9px]">
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">EQUITIES</span>
                        <span className={`font-bold ${quad.assetPlaybook.equities === 'OVERWEIGHT' ? 'text-[#00e676]' : quad.assetPlaybook.equities === 'UNDERWEIGHT' ? 'text-[#ff334b]' : 'text-white'}`}>
                          {quad.assetPlaybook.equities}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">BONDS DURATION</span>
                        <span className={`font-bold ${quad.assetPlaybook.bondsDuration === 'OVERWEIGHT' ? 'text-[#00e676]' : quad.assetPlaybook.bondsDuration === 'UNDERWEIGHT' ? 'text-[#ff334b]' : 'text-white'}`}>
                          {quad.assetPlaybook.bondsDuration}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">COMMODITIES</span>
                        <span className={`font-bold ${quad.assetPlaybook.commodities === 'OVERWEIGHT' ? 'text-[#00e676]' : quad.assetPlaybook.commodities === 'UNDERWEIGHT' ? 'text-[#ff334b]' : 'text-white'}`}>
                          {quad.assetPlaybook.commodities}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">GOLD</span>
                        <span className={`font-bold ${quad.assetPlaybook.gold === 'OVERWEIGHT' ? 'text-[#00e676]' : quad.assetPlaybook.gold === 'UNDERWEIGHT' ? 'text-[#ff334b]' : 'text-white'}`}>
                          {quad.assetPlaybook.gold}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">CASH</span>
                        <span className={`font-bold ${quad.assetPlaybook.cash === 'OVERWEIGHT' ? 'text-[#00e676]' : quad.assetPlaybook.cash === 'UNDERWEIGHT' ? 'text-[#ff334b]' : 'text-white'}`}>
                          {quad.assetPlaybook.cash}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8c8c8c] block text-[8px]">US DOLLAR</span>
                        <span className={`font-bold ${quad.assetPlaybook.dollar === 'OVERWEIGHT' ? 'text-[#00e676]' : quad.assetPlaybook.dollar === 'UNDERWEIGHT' ? 'text-[#ff334b]' : 'text-white'}`}>
                          {quad.assetPlaybook.dollar}
                        </span>
                      </div>
                    </div>

                    {/* Recommended vs Vulnerable Sectors */}
                    <div className="grid grid-cols-2 gap-2 text-[9px] pt-1 border-t border-[#1c2432]">
                      <div>
                        <span className="text-[#00e676] font-bold block mb-0.5">Top Outperformers:</span>
                        <span className="text-[#cbd5e1]">{quad.recommendedSectors.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-[#ff334b] font-bold block mb-0.5">Underperformers / Hedges:</span>
                        <span className="text-[#cbd5e1]">{quad.vulnerableSectors.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INFLATION BREAKDOWN & COMMODITY PASS-THROUGH
        ======================================================== */}
        {activeTab === 'inflation' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#10141c] border border-[#222a38] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2432] pb-2">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#ff9900]" />
                  <span>US &amp; GLOBAL INFLATION SUB-COMPONENT DECOMPOSITION</span>
                </span>
                <span className="text-[10px] text-[#8c8c8c]">
                  Shelter Lag, Energy Disinflation, Supercore Services &amp; 5Y5Y Forward Breakevens
                </span>
              </div>

              {/* Sub-Components Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="border-b border-[#222a38] bg-[#0c1017] text-[#8c8c8c] text-[9.5px] uppercase">
                      <th className="py-2 px-2.5">CPI BASKET CATEGORY</th>
                      <th className="py-2 px-2">KEY COMPONENT</th>
                      <th className="py-2 px-2 text-right">WEIGHT IN CPI</th>
                      <th className="py-2 px-2 text-right text-[#ff9900]">CURRENT YoY</th>
                      <th className="py-2 px-2 text-right">PRIOR YoY</th>
                      <th className="py-2 px-2 text-center">IMPACT</th>
                      <th className="py-2 px-2.5">MACRO COMMENTARY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18202c]">
                    {GLOBAL_INFLATION_COMPONENTS.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#141a24]">
                        <td className="py-2 px-2.5 font-bold text-white">{item.category}</td>
                        <td className="py-2 px-2 text-[#cbd5e1]">{item.component}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-white">
                          {item.weightPct > 0 ? `${item.weightPct}%` : 'Benchmark'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black text-[#ff9900]">
                          {item.currentYoY > 0 ? `+${item.currentYoY}%` : `${item.currentYoY}%`}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[#8c8c8c]">
                          {item.priorYoY > 0 ? `+${item.priorYoY}%` : `${item.priorYoY}%`}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            item.impactScore === 'HIGH'
                              ? 'bg-[#ff9900]/20 text-[#ff9900]'
                              : item.impactScore === 'MEDIUM'
                              ? 'bg-[#ffd600]/20 text-[#ffd600]'
                              : 'bg-[#38bdf8]/20 text-[#38bdf8]'
                          }`}>
                            {item.impactScore}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-[9.5px] text-[#cbd5e1]">
                          {item.commentary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: HIGH-IMPACT CALENDAR
        ======================================================== */}
        {activeTab === 'calendar' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#10141c] border border-[#222a38] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2432] pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#38bdf8]" />
                  <span className="font-extrabold text-white text-xs">GLOBAL ECONOMIC RELEASES &amp; CATALYSTS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8c8c8c]">IMPORTANCE:</span>
                  <div className="flex items-center bg-[#090b10] p-0.5 rounded border border-[#1e2634] text-[9.5px]">
                    {(['ALL', 'CRITICAL', 'HIGH'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          playKeyClick();
                          setCalendarImportanceFilter(filter);
                        }}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          calendarImportanceFilter === filter ? 'bg-[#ff9900] text-black font-extrabold' : 'text-[#8c8c8c] hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calendar Events List */}
              <div className="flex flex-col gap-2">
                {filteredEvents.map((evt) => (
                  <div key={evt.id} className="bg-[#141822] border border-[#20293a] rounded-lg p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-[#ff9900]/40 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{evt.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{evt.indicator}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${
                            evt.importance === 'CRITICAL' ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40' : 'bg-[#ff9900]/20 text-[#ff9900]'
                          }`}>
                            {evt.importance}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            evt.status === 'COMPLETED' ? 'bg-[#00e676]/20 text-[#00e676]' : 'bg-[#38bdf8]/20 text-[#38bdf8]'
                          }`}>
                            {evt.status}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-[#8c8c8c] block mt-0.5">
                          {evt.date} @ {evt.timeEst} EST &bull; Period: {evt.period} &bull; {evt.marketImpactAssessment}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                      {evt.actual && (
                        <div className="text-right">
                          <span className="text-[8px] text-[#8c8c8c] block">ACTUAL:</span>
                          <span className="font-black text-[#00e676]">{evt.actual}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-[8px] text-[#8c8c8c] block">CONSENSUS:</span>
                        <span className="font-bold text-white">{evt.consensus}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-[#8c8c8c] block">PRIOR:</span>
                        <span className="font-bold text-[#8c8c8c]">{evt.previous}</span>
                      </div>

                      {/* Affected Tickers Pills */}
                      <div className="flex items-center gap-1">
                        {evt.affectedTickers.map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              playKeyClick();
                              if (onNavigateToChain) onNavigateToChain(t);
                            }}
                            className="px-1.5 py-0.5 bg-[#1b2230] hover:bg-[#ff9900] hover:text-black rounded text-[8.5px] font-bold text-[#38bdf8] transition-colors"
                            title={`Open options chain for ${t}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: MACRO SCENARIO SHOCK SIMULATOR
        ======================================================== */}
        {activeTab === 'simulator' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#10141c] border border-[#222a38] rounded-lg p-3.5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2432] pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ff9900]" />
                  <span className="font-extrabold text-white text-xs">MACRO SHOCK &amp; ASSET CLASS SENSITIVITY SIMULATOR</span>
                </div>
                <span className="text-[10px] text-[#8c8c8c]">
                  Simulate cross-market shocks and discover institutional options hedging structures
                </span>
              </div>

              {/* Scenario Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {MACRO_SCENARIO_SHOCKS.map((shock) => {
                  const isSelected = selectedShockId === shock.id;
                  return (
                    <button
                      key={shock.id}
                      onClick={() => {
                        playKeyClick();
                        setSelectedShockId(shock.id);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-mono transition-all border shrink-0 ${
                        isSelected
                          ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-md'
                          : 'bg-[#141822] text-[#d1d5db] border-[#222c3c] hover:border-[#ff9900]/50 hover:text-white'
                      }`}
                    >
                      {shock.name}
                    </button>
                  );
                })}
              </div>

              {/* Scenario Impact Display */}
              <div className="bg-[#141924] border border-[#232d3e] rounded-lg p-3.5 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#20293a] pb-2">
                  <div>
                    <span className="text-sm font-black text-white">{activeShock.name}</span>
                    <span className="text-[10px] text-[#ff9900] block mt-0.5">
                      <strong>TRIGGER:</strong> {activeShock.triggerEvent}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#1f2838] text-white">
                    {activeShock.category.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-[10.5px] text-[#cbd5e1] leading-relaxed">
                  {activeShock.description}
                </p>

                {/* Projected Cross-Market Shock Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-center text-xs">
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">S&amp;P 500</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.sp500Pct >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                      {activeShock.projectedMarketMoves.sp500Pct >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.sp500Pct}%
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">NASDAQ 100</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.nasdaq100Pct >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                      {activeShock.projectedMarketMoves.nasdaq100Pct >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.nasdaq100Pct}%
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">US 10Y YIELD</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.us10YYieldBps >= 0 ? 'text-[#ff9900]' : 'text-[#38bdf8]'}`}>
                      {activeShock.projectedMarketMoves.us10YYieldBps >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.us10YYieldBps} bps
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">DOLLAR DXY</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.dollarIndexDxyPct >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                      {activeShock.projectedMarketMoves.dollarIndexDxyPct >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.dollarIndexDxyPct}%
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">CRUDE OIL</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.crudeOilPct >= 0 ? 'text-[#ff9900]' : 'text-[#38bdf8]'}`}>
                      {activeShock.projectedMarketMoves.crudeOilPct >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.crudeOilPct}%
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">GOLD</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.goldPct >= 0 ? 'text-[#ffd600]' : 'text-[#cbd5e1]'}`}>
                      {activeShock.projectedMarketMoves.goldPct >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.goldPct}%
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">VIX VOLATILITY</span>
                    <span className={`font-black ${activeShock.projectedMarketMoves.vixVolPoints >= 0 ? 'text-[#ff334b]' : 'text-[#00e676]'}`}>
                      {activeShock.projectedMarketMoves.vixVolPoints >= 0 ? '+' : ''}{activeShock.projectedMarketMoves.vixVolPoints} pts
                    </span>
                  </div>
                  <div className="bg-[#0f121a] p-2 rounded border border-[#1e2534]">
                    <span className="text-[8.5px] text-[#8c8c8c] block">HY SPREADS</span>
                    <span className="font-black text-white">
                      +{activeShock.projectedMarketMoves.highYieldCreditSpreadBps} bps
                    </span>
                  </div>
                </div>

                {/* Central Bank Expected Response & Strategy Playbook */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#20293a] text-xs">
                  <div className="bg-[#10141c] p-2.5 rounded border border-[#1d2532]">
                    <span className="text-[#38bdf8] font-bold block mb-1">Central Bank Policy Reaction:</span>
                    <p className="text-[10px] text-[#cbd5e1]">{activeShock.centralBankReaction}</p>
                  </div>
                  <div className="bg-[#10141c] p-2.5 rounded border border-[#1d2532] flex flex-col justify-between">
                    <div>
                      <span className="text-[#00e676] font-bold block mb-1">Institutional Options Strategy Playbook:</span>
                      <p className="text-[10px] text-[#cbd5e1]">{activeShock.optionsStrategyPlaybook}</p>
                    </div>
                    {onNavigateToRisk && (
                      <button
                        onClick={() => {
                          playExecutionChime();
                          onNavigateToRisk();
                        }}
                        className="mt-2 self-start px-2.5 py-1 rounded bg-[#ff9900]/20 hover:bg-[#ff9900] hover:text-black text-[#ff9900] font-bold text-[9.5px] border border-[#ff9900]/40 transition-all flex items-center gap-1"
                      >
                        <span>Model Stress in Risk Profile &gt;</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: G20 SOVEREIGN YIELD CURVES */}
        {activeTab === 'yield_curve' && (
          <div className="pt-2">
            <YieldCurveView
              onNavigateToRisk={onNavigateToRisk}
              onNavigateToOptions={() => {
                if (onNavigateToChain) onNavigateToChain('SPY');
              }}
              onNavigateToGeoRisk={onNavigateToGeoRisk}
            />
          </div>
        )}

        {/* TAB 4: OPEC & ENERGY IV */}
        {activeTab === 'opec' && (
          <div className="pt-2">
            <OPECMeetingsView
              currentTicker={activeTicker}
              onSelectTicker={handleSelectTicker}
              onNavigateToChain={() => {
                if (onNavigateToChain) onNavigateToChain('USO');
              }}
              onNavigateToValuation={handleNavigateToValuation}
              onApplyStrategyLegs={onApplyStrategyLegs}
            />
          </div>
        )}

        {/* TAB 5: TARIFF TRACKER */}
        {activeTab === 'tariff' && (
          <div className="pt-2">
            <TariffTrackerView
              currentTicker={activeTicker}
              onSelectTicker={handleSelectTicker}
              onNavigateToChain={() => {
                if (onNavigateToChain) onNavigateToChain('FXI');
              }}
              onNavigateToValuation={handleNavigateToValuation}
              onApplyStrategyLegs={onApplyStrategyLegs}
            />
          </div>
        )}

        {/* TAB 4: DEFCON LEVEL 3 */}
        {activeTab === 'defcon' && (
          <div className="pt-2">
            <DefconLevelView
              onSelectTicker={handleSelectTicker}
              onNavigateToRisk={handleNavigateToRisk}
              onNavigateToOptions={() => {
                if (onNavigateToChain) onNavigateToChain('LMT');
              }}
            />
          </div>
        )}

        {/* TAB 5: GEOPOLITICAL & COUNTRY RISK PREMIUM MONITOR */}
        {activeTab === 'geopolitical' && (
          <div className="flex flex-col gap-3 font-mono text-xs">
            {/* Geo Macro Risk Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#0f131a] border border-[#1e2634] p-3 rounded text-xs">
              <div className="bg-[#141a24] border border-[#222c3c] p-2.5 rounded">
                <span className="text-[9px] text-[#8c8c8c] block uppercase font-bold">Average Geo Vol Premium</span>
                <div className="text-base font-black text-[#ffd600] mt-0.5">+7.5 vol pts</div>
                <span className="text-[9px] text-[#f87171]">Elevated vs 5-Yr Realized Baseline</span>
              </div>

              <div className="bg-[#141a24] border border-[#222c3c] p-2.5 rounded">
                <span className="text-[9px] text-[#8c8c8c] block uppercase font-bold">Active Critical Flashpoints</span>
                <div className="text-base font-black text-[#ef4444] mt-0.5">2 Regions (Gulf / Taiwan)</div>
                <span className="text-[9px] text-[#ff8080]">Score &gt;80 / Extreme Call/Put Skew</span>
              </div>

              <div className="bg-[#141a24] border border-[#222c3c] p-2.5 rounded">
                <span className="text-[9px] text-[#8c8c8c] block uppercase font-bold">Highest Skew Asymmetry</span>
                <div className="text-base font-black text-[#00e5ff] mt-0.5">/CL Crude (+7.2% Call Skew)</div>
                <span className="text-[9px] text-[#9ca3af]">SMH Semis (+6.1% Put Skew)</span>
              </div>

              <div className="bg-[#141a24] border border-[#222c3c] p-2.5 rounded">
                <span className="text-[9px] text-[#8c8c8c] block uppercase font-bold">Primary Safe-Haven Flow</span>
                <div className="text-base font-black text-[#a3e635] mt-0.5">Gold (/GC) &amp; USD (/DX)</div>
                <span className="text-[9px] text-[#9ca3af]">Call Open Interest up +32%</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="px-3 py-2 bg-[#0d1118] border border-[#1e2634] rounded flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#8c8c8c]" />
                <span className="text-[#8c8c8c] text-[10.5px] font-bold">FILTER RISK TIER:</span>
                {(['ALL', 'CRITICAL', 'ELEVATED', 'MODERATE'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => {
                      playKeyClick();
                      setGeoFilterTier(tier);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                      geoFilterTier === tier
                        ? tier === 'CRITICAL'
                          ? 'bg-[#ef4444] text-white shadow-sm'
                          : tier === 'ELEVATED'
                          ? 'bg-[#f97316] text-black shadow-sm'
                          : tier === 'MODERATE'
                          ? 'bg-[#eab308] text-black shadow-sm'
                          : 'bg-[#ff9900] text-black shadow-sm'
                        : 'bg-[#141a24] text-[#8c8c8c] hover:text-white border border-[#222c3c]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-[#8c8c8c]">
                Showing {filteredGeoRegions.length} of {COUNTRY_GEO_RISK_DATA.length} Global Risk Corridors
              </span>
            </div>

            {/* Split Heatmap Grid & Intelligence Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Regional Heatmap Tiles (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-2">
                <div className="text-[11px] font-bold text-white flex items-center justify-between pb-1 border-b border-[#1e2634]">
                  <span>REGIONAL GEOPOLITICAL RISK TILES</span>
                  <span className="text-[9.5px] text-[#8c8c8c]">Click tile for options intelligence &amp; hedging</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredGeoRegions.map((region) => {
                    const isSelected = region.id === activeGeoRegion.id;
                    const tierStyles = {
                      CRITICAL: {
                        bg: 'bg-[#2a0e0e] hover:bg-[#381414]',
                        activeBg: 'bg-[#401212]',
                        border: 'border-[#ef4444]',
                        badge: 'bg-[#ef4444] text-white',
                        volBadge: 'text-[#f87171]',
                      },
                      ELEVATED: {
                        bg: 'bg-[#281507] hover:bg-[#381c09]',
                        activeBg: 'bg-[#422008]',
                        border: 'border-[#f97316]',
                        badge: 'bg-[#f97316] text-black font-bold',
                        volBadge: 'text-[#fb923c]',
                      },
                      MODERATE: {
                        bg: 'bg-[#262208] hover:bg-[#332e0a]',
                        activeBg: 'bg-[#3b3509]',
                        border: 'border-[#eab308]',
                        badge: 'bg-[#eab308] text-black font-bold',
                        volBadge: 'text-[#facc15]',
                      },
                      LOW: {
                        bg: 'bg-[#0a2312] hover:bg-[#0f2e18]',
                        activeBg: 'bg-[#154722]',
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
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          isSelected
                            ? `${tierStyles.activeBg} ${tierStyles.border} shadow-lg ring-2 ring-[#ffd600]/40 scale-[1.01]`
                            : `${tierStyles.bg} border-[#222c3c] hover:border-[#445268]`
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">{region.flag}</span>
                            <div>
                              <div className="font-bold text-white text-xs">{region.region}</div>
                              <div className="text-[9px] text-[#8c8c8c] truncate max-w-[140px]">
                                {region.countryOrBloc}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${tierStyles.badge}`}>
                            {region.riskTier} ({region.riskScore})
                          </span>
                        </div>

                        {/* Metric Bars */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#333] text-[9.5px]">
                          <div>
                            <span className="text-[#8c8c8c] block text-[8px]">OPTIONS VOL PREMIUM</span>
                            <span className={`font-bold text-xs ${tierStyles.volBadge}`}>
                              +{region.impliedVolPremiumPts.toFixed(1)} vol pts
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#8c8c8c] block text-[8px]">SOVEREIGN CDS</span>
                            <span className="text-[#cbd5e1] font-bold text-xs font-mono">
                              {region.sovereignCdsBps} bps
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5 text-[8.5px] text-[#ffd600] flex items-center justify-between">
                          <span>{region.skewBias === 'UPSIDE_CALL' ? '▲ Extreme Call Skew' : '▼ Downside Put Skew'}</span>
                          <span className="text-[#8c8c8c] text-[8px] truncate max-w-[120px]">
                            {region.proxyTickers.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deep-Dive Intelligence Details (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-2">
                <div className="text-[11px] font-bold text-white pb-1 border-b border-[#1e2634] flex items-center justify-between">
                  <span>INTELLIGENCE &amp; HEDGING STRATEGY</span>
                  <span className="text-[9.5px] text-[#ffd600]">{activeGeoRegion.region}</span>
                </div>

                <div className="bg-[#121620] border border-[#1e2638] p-3 rounded flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{activeGeoRegion.flag}</span>
                        <h3 className="font-bold text-sm text-white">
                          {activeGeoRegion.countryOrBloc}
                        </h3>
                      </div>
                      <p className="text-[10px] text-[#8c8c8c] mt-0.5">
                        {activeGeoRegion.skewBiasLabel}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#ef4444] text-white font-bold text-xs font-mono">
                      Score {activeGeoRegion.riskScore}/100
                    </span>
                  </div>

                  {/* Threat Catalyst */}
                  <div className="bg-[#241111] border border-[#481c1c] p-2.5 rounded">
                    <span className="text-[9px] text-[#ef4444] font-bold uppercase tracking-wider block mb-1">
                      Primary Threat Catalyst
                    </span>
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">
                      {activeGeoRegion.primaryThreatCatalyst}
                    </p>
                  </div>

                  {/* Options Pricing Impact */}
                  <div className="bg-[#0f1d28] border border-[#1a3850] p-2.5 rounded">
                    <span className="text-[9px] text-[#00e5ff] font-bold uppercase tracking-wider block mb-1">
                      Options Market Pricing &amp; Skew Distortion
                    </span>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed">
                      {activeGeoRegion.optionsImpactSummary}
                    </p>
                  </div>

                  {/* Affected Proxy Tickers */}
                  <div>
                    <span className="text-[9px] text-[#8c8c8c] uppercase tracking-wider block mb-1.5 font-bold">
                      Affected Proxy Assets (Click to Inspect Matrix &amp; Chain)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeGeoRegion.proxyTickers.map((sym) => (
                        <button
                          key={sym}
                          onClick={() => {
                            playKeyClick();
                            handleSelectTicker(sym);
                            if (onNavigateToChain) onNavigateToChain(sym);
                          }}
                          className="px-2.5 py-1 bg-[#1a2230] hover:bg-[#ff9900] hover:text-black text-[#00e5ff] font-bold rounded border border-[#2a374c] text-xs transition-all flex items-center gap-1 cursor-pointer"
                          title={`Select ${sym} and open options chain`}
                        >
                          <span>{sym}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Hedging Play */}
                  <div className="bg-[#0e2114] border border-[#194b28] p-2.5 rounded">
                    <span className="text-[9px] text-[#a3e635] font-bold uppercase tracking-wider block mb-1">
                      Institutional Hedging Recommendation
                    </span>
                    <p className="text-xs text-[#d9f99d] leading-relaxed">
                      {activeGeoRegion.recommendedHedgingPlay}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
