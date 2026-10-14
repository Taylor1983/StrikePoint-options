import React, { useState, useMemo } from 'react';
import {
  TARIFF_REGIMES_DATA,
  TICKER_TARIFF_VULNERABILITY_DATA,
  TARIFF_MILESTONES_CALENDAR,
  TARIFF_MACRO_AGGREGATES,
  TariffRegime,
  TickerTariffVulnerability,
  TariffMilestone,
} from '../services/tariffData';
import { Ticker, TradeLeg } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import {
  ShieldAlert,
  AlertTriangle,
  Globe,
  Sliders,
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
  Activity,
  ArrowRight,
  ExternalLink,
  Zap,
  BarChart3,
  HelpCircle,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';

interface TariffTrackerViewProps {
  currentTicker: Ticker;
  onSelectTicker: (symbol: string) => void;
  onNavigateToChain: () => void;
  onNavigateToValuation: () => void;
  onApplyStrategyLegs?: (legs: TradeLeg[]) => void;
}

type TabType = 'regimes' | 'matrix' | 'simulator' | 'calendar';

export const TariffTrackerView: React.FC<TariffTrackerViewProps> = ({
  currentTicker,
  onSelectTicker,
  onNavigateToChain,
  onNavigateToValuation,
  onApplyStrategyLegs,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('regimes');
  const [selectedRegimeId, setSelectedRegimeId] = useState<string>('us-universal-baseline');
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [selectedTickerRow, setSelectedTickerRow] = useState<string>(currentTicker.symbol);

  // Simulator State
  const [simulatedBaseTariffRate, setSimulatedBaseTariffRate] = useState<number>(15);
  const [simulatedChinaSurcharge, setSimulatedChinaSurcharge] = useState<number>(50);
  const [simulatedAutoTariff, setSimulatedAutoTariff] = useState<number>(25);

  const selectedRegime = useMemo(() => {
    return (
      TARIFF_REGIMES_DATA.find((r) => r.id === selectedRegimeId) ||
      TARIFF_REGIMES_DATA[0]
    );
  }, [selectedRegimeId]);

  const filteredTickerMatrix = useMemo(() => {
    if (matrixFilter === 'ALL') return TICKER_TARIFF_VULNERABILITY_DATA;
    return TICKER_TARIFF_VULNERABILITY_DATA.filter((t) => t.vulnerabilityTier === matrixFilter);
  }, [matrixFilter]);

  const selectedTickerData = useMemo(() => {
    return (
      TICKER_TARIFF_VULNERABILITY_DATA.find((t) => t.symbol === selectedTickerRow) ||
      TICKER_TARIFF_VULNERABILITY_DATA[0]
    );
  }, [selectedTickerRow]);

  // Live simulation calculations
  const simulationResults = useMemo(() => {
    const weightedRate = (simulatedBaseTariffRate * 0.5) + (simulatedChinaSurcharge * 0.3) + (simulatedAutoTariff * 0.2);
    const epsDrag = -((weightedRate / 10) * 2.85).toFixed(1);
    const cpiBps = Math.round((weightedRate / 10) * 48);
    const ivSpikePts = +((weightedRate / 10) * 4.2).toFixed(1);
    const tenYrYieldBps = Math.round((weightedRate / 10) * 14);

    return {
      weightedRate: weightedRate.toFixed(1),
      epsDrag,
      cpiBps,
      ivSpikePts,
      tenYrYieldBps,
    };
  }, [simulatedBaseTariffRate, simulatedChinaSurcharge, simulatedAutoTariff]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] text-[#e2e8f0] font-mono select-none overflow-hidden">
      {/* Top Terminal Status Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#ef4444]/20 border border-[#ef4444]/50 rounded text-[#ef4444]">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wider flex items-center gap-1.5">
                GLOBAL TARIFF &amp; TRADE WAR MONITOR // &lt;TRFF&gt;
              </h1>
              <span className="bg-[#ef4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                LIVE PROTECTIONISM RADAR
              </span>
            </div>
            <p className="text-[10px] text-[#8c8c8c] mt-0.5">
              Cross-border import duties, Section 301 tech surcharges, supply chain vulnerability &amp; options skew
            </p>
          </div>
        </div>

        {/* Global Macro KPI Strip */}
        <div className="flex items-center gap-2">
          <div className="bg-[#0d0d0d] border border-[#2d2d2d] px-2.5 py-1 rounded text-right">
            <span className="text-[8px] text-[#8c8c8c] block uppercase">Trade Under Tariff</span>
            <span className="text-xs font-bold text-[#ffd600]">
              ${(TARIFF_MACRO_AGGREGATES.totalTradeUnderTariffUsdBn / 1000).toFixed(2)}T USD
            </span>
          </div>

          <div className="bg-[#0d0d0d] border border-[#2d2d2d] px-2.5 py-1 rounded text-right">
            <span className="text-[8px] text-[#8c8c8c] block uppercase">Effective US Tariff</span>
            <span className="text-xs font-bold text-[#ef4444]">
              {TARIFF_MACRO_AGGREGATES.averageEffectiveTariffPct}% (vs {TARIFF_MACRO_AGGREGATES.baselinePreTariffRatePct}%)
            </span>
          </div>

          <div className="bg-[#0d0d0d] border border-[#2d2d2d] px-2.5 py-1 rounded text-right">
            <span className="text-[8px] text-[#8c8c8c] block uppercase">Core CPI Shock</span>
            <span className="text-xs font-bold text-[#f97316]">
              +{TARIFF_MACRO_AGGREGATES.cpiPassThroughInflationBps} bps
            </span>
          </div>

          <div className="bg-[#0d0d0d] border border-[#2d2d2d] px-2.5 py-1 rounded text-right">
            <span className="text-[8px] text-[#8c8c8c] block uppercase">S&amp;P 500 EPS Drag</span>
            <span className="text-xs font-bold text-[#ef4444]">
              {TARIFF_MACRO_AGGREGATES.sp500AggregateEpsDragPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tab Bar */}
      <div className="bg-[#181818] border-b border-[#2d2d2d] px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('regimes');
            }}
            className={`px-3 py-1 font-bold rounded text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'regimes'
                ? 'bg-[#ff9900] text-black shadow'
                : 'text-[#8c8c8c] hover:text-white bg-[#222]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            TARIFF REGIMES &amp; POLICIES ({TARIFF_REGIMES_DATA.length})
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('matrix');
            }}
            className={`px-3 py-1 font-bold rounded text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-[#ff9900] text-black shadow'
                : 'text-[#8c8c8c] hover:text-white bg-[#222]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            TICKER VULNERABILITY MATRIX
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('simulator');
            }}
            className={`px-3 py-1 font-bold rounded text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-[#00d2ff] text-black shadow'
                : 'text-[#00d2ff] hover:text-white bg-[#222]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            IMPACT SIMULATOR &amp; CALCULATOR
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveTab('calendar');
            }}
            className={`px-3 py-1 font-bold rounded text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-[#ffd600] text-black shadow'
                : 'text-[#ffd600] hover:text-white bg-[#222]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            POLICY MILESTONES &amp; DEADLINES
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#8c8c8c]">
          <span>CURRENT FOCUS TICKER:</span>
          <span className="text-white font-bold bg-[#262626] px-2 py-0.5 rounded border border-[#333]">
            {currentTicker.symbol} (${currentTicker.price.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ========================================================================= */}
        {/* TAB 1: ACTIVE & PENDING TARIFF REGIMES                                   */}
        {/* ========================================================================= */}
        {activeTab === 'regimes' && (
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left Column: List of Tariff Regimes (6 cols) */}
            <div className="col-span-6 flex flex-col gap-2.5">
              <div className="text-xs font-bold text-white flex items-center justify-between pb-1 border-b border-[#2d2d2d]">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#ff9900]" />
                  ACTIVE &amp; PROPOSED TRADE RESTRICTION REGIMES
                </span>
                <span className="text-[10px] text-[#8c8c8c]">Select regime to inspect options impact</span>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
                {TARIFF_REGIMES_DATA.map((regime) => {
                  const isSelected = regime.id === selectedRegime.id;
                  const statusStyles = {
                    ACTIVE: 'bg-[#ef4444] text-white',
                    PROPOSED: 'bg-[#f97316] text-black font-bold',
                    UNDER_REVIEW: 'bg-[#eab308] text-black font-bold',
                    RETALIATION_ACTIVE: 'bg-[#dc2626] text-white font-bold',
                  }[regime.status];

                  return (
                    <div
                      key={regime.id}
                      onClick={() => {
                        playKeyClick();
                        setSelectedRegimeId(regime.id);
                      }}
                      className={`p-3 rounded border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#261e12] border-[#ff9900] shadow-lg ring-1 ring-[#ff9900]/50 scale-[1.005]'
                          : 'bg-[#181818] border-[#333] hover:border-[#555] hover:bg-[#1f1f1f]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{regime.originFlag}</span>
                          <div>
                            <div className="font-bold text-sm text-white leading-tight">
                              {regime.name}
                            </div>
                            <div className="text-[10px] text-[#8c8c8c] mt-0.5">
                              Target: {regime.targetFlag} {regime.targetCountryOrBloc} • {regime.shortCode}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${statusStyles}`}>
                          {regime.status}
                        </span>
                      </div>

                      {/* Quantitative Metric Strip */}
                      <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-[#2a2a2a] text-[10px]">
                        <div>
                          <span className="text-[#8c8c8c] block text-[8.5px]">STATUTORY RATE</span>
                          <span className="font-bold text-white">
                            {regime.baseRatePct}% – {regime.peakRatePct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8c8c8c] block text-[8.5px]">TRADE VALUE</span>
                          <span className="font-bold text-[#ffd600]">
                            ${regime.scopeValueUsdBn}B USD
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8c8c8c] block text-[8.5px]">OPTIONS IV IMPACT</span>
                          <span className="font-bold text-[#ef4444]">
                            +{regime.optionsIvImpactPts.toFixed(1)} vol pts
                          </span>
                        </div>
                      </div>

                      {/* Primary vulnerable tickers tags */}
                      <div className="mt-2 flex items-center justify-between text-[9px]">
                        <span className="text-[#8c8c8c]">Exposed Tickers:</span>
                        <div className="flex items-center gap-1">
                          {regime.primaryVulnerableTickers.slice(0, 4).map((sym) => (
                            <span
                              key={sym}
                              className="px-1.5 py-0.2 bg-[#2a2a2a] text-[#00d2ff] font-bold rounded border border-[#3a3a3a]"
                            >
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Deep-Dive Intelligence Card (6 cols) */}
            <div className="col-span-6 flex flex-col gap-3">
              <div className="text-xs font-bold text-white flex items-center justify-between pb-1 border-b border-[#2d2d2d]">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#ef4444]" />
                  REGULATORY DETAILS &amp; OPTIONS PRICING DISTORTION
                </span>
                <span className="text-[10px] text-[#ffd600] font-mono">{selectedRegime.shortCode}</span>
              </div>

              <div className="bg-[#181818] border border-[#333] rounded p-4 flex flex-col gap-3.5">
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-[#2a2a2a] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedRegime.originFlag}</span>
                      <h2 className="text-base font-bold text-white">
                        {selectedRegime.name}
                      </h2>
                    </div>
                    <div className="text-xs text-[#8c8c8c] mt-1">
                      Origin: <strong className="text-white">{selectedRegime.originCountry}</strong> ➔ Target: <strong className="text-[#ffd600]">{selectedRegime.targetCountryOrBloc}</strong> ({selectedRegime.targetFlag})
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#ef4444] text-white">
                      Peak {selectedRegime.peakRatePct}% Duty
                    </span>
                    <span className="block text-[9px] text-[#8c8c8c] mt-1">
                      Review: {selectedRegime.reviewDate}
                    </span>
                  </div>
                </div>

                {/* Policy Summary */}
                <div>
                  <span className="text-[10px] font-bold text-[#ffd600] uppercase tracking-wider block mb-1">
                    Statutory Framework &amp; Implementation Scope
                  </span>
                  <p className="text-xs text-[#ccc] leading-relaxed bg-[#202020] p-2.5 rounded border border-[#2d2d2d]">
                    {selectedRegime.policySummary}
                  </p>
                </div>

                {/* Options Market Skew & Implied Volatility Impact */}
                <div className="bg-[#151c24] border border-[#1e3245] p-3 rounded flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#00d2ff] uppercase tracking-wider">
                      Options Pricing &amp; Implied Volatility Skew
                    </span>
                    <span className="text-[10px] font-bold text-[#ef4444]">
                      +{selectedRegime.optionsIvImpactPts.toFixed(1)} Vol Pts Shock
                    </span>
                  </div>
                  <p className="text-xs text-[#b8daf2] leading-relaxed">
                    {selectedRegime.optionsMarketPricing}
                  </p>
                  <div className="mt-1 text-[10px] text-[#fca5a5] flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span><strong>Skew Distortion: </strong>{selectedRegime.skewDistortion}</span>
                  </div>
                </div>

                {/* Primary HTS Product Categories & Sectors */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#202020] p-2 rounded border border-[#2d2d2d]">
                    <span className="text-[9px] text-[#8c8c8c] block uppercase mb-1">Impacted Sectors</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegime.sectorsAffected.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-[#2c2c2c] text-[#ffd600] text-[9px] rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#202020] p-2 rounded border border-[#2d2d2d]">
                    <span className="text-[9px] text-[#8c8c8c] block uppercase mb-1">Key HTS Harmonized Codes</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegime.primaryHtsCodes.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 bg-[#2c2c2c] text-[#00d2ff] text-[9px] rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Affected Proxy Tickers with 1-Click Select & Chain Navigation */}
                <div>
                  <span className="text-[10px] font-bold text-[#8c8c8c] uppercase tracking-wider block mb-1.5">
                    Exposed Equities &amp; Futures (Click to Inspect)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRegime.primaryVulnerableTickers.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          playKeyClick();
                          onSelectTicker(sym);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          currentTicker.symbol === sym
                            ? 'bg-[#ff9900] text-black border-[#ff9900] shadow'
                            : 'bg-[#222] text-[#00d2ff] border-[#333] hover:border-[#666]'
                        }`}
                      >
                        <span>{sym}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        playKeyClick();
                        onNavigateToChain();
                      }}
                      className="ml-auto px-2.5 py-1 bg-[#292929] hover:bg-[#333] text-white rounded text-xs border border-[#444] transition-all"
                    >
                      Open in Option Chain (OMON) &gt;
                    </button>
                  </div>
                </div>

                {/* Institutional Options Hedging Recommendation */}
                <div className="bg-[#122416] border border-[#1b4e24] p-3 rounded">
                  <span className="text-[10px] font-bold text-[#a3e635] uppercase tracking-wider block mb-1">
                    Institutional Hedging &amp; Trading Playbook
                  </span>
                  <p className="text-xs text-[#d9f99d] leading-relaxed">
                    {selectedRegime.institutionalHedgingPlay}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TICKER VULNERABILITY MATRIX                                       */}
        {/* ========================================================================= */}
        {activeTab === 'matrix' && (
          <div className="flex flex-col gap-3 h-full">
            {/* Filter and stats toolbar */}
            <div className="flex items-center justify-between bg-[#181818] p-2.5 rounded border border-[#2d2d2d] text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#8c8c8c]" />
                <span className="text-[#8c8c8c]">Filter Vulnerability Tier:</span>
                {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => {
                      playKeyClick();
                      setMatrixFilter(tier);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      matrixFilter === tier
                        ? tier === 'CRITICAL'
                          ? 'bg-[#ef4444] text-white'
                          : tier === 'HIGH'
                          ? 'bg-[#f97316] text-black'
                          : tier === 'MODERATE'
                          ? 'bg-[#eab308] text-black'
                          : tier === 'LOW'
                          ? 'bg-[#22c55e] text-black'
                          : 'bg-[#ff9900] text-black'
                        : 'bg-[#222] text-[#888] hover:text-white border border-[#333]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-[#8c8c8c]">
                Showing <strong className="text-white">{filteredTickerMatrix.length}</strong> monitored assets
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-[#181818] border border-[#2d2d2d] rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#202020] text-[#8c8c8c] text-[10px] border-b border-[#333]">
                    <th className="py-2 px-3">TICKER</th>
                    <th className="py-2 px-3">SECTOR</th>
                    <th className="py-2 px-3 text-center">FOREIGN SUPPLY</th>
                    <th className="py-2 px-3 text-center">FOREIGN REV</th>
                    <th className="py-2 px-3 text-center">TARIFF BETA</th>
                    <th className="py-2 px-3 text-center">TIER</th>
                    <th className="py-2 px-3 text-right">EST. EPS DRAG</th>
                    <th className="py-2 px-3 text-right">IV SPIKE POTENTIAL</th>
                    <th className="py-2 px-3 text-right">PUT SKEW</th>
                    <th className="py-2 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredTickerMatrix.map((item) => {
                    const isSelected = item.symbol === currentTicker.symbol;
                    const tierBadge = {
                      CRITICAL: 'bg-[#ef4444] text-white font-bold',
                      HIGH: 'bg-[#f97316] text-black font-bold',
                      MODERATE: 'bg-[#eab308] text-black font-bold',
                      LOW: 'bg-[#22c55e] text-black font-bold',
                    }[item.vulnerabilityTier];

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => {
                          playKeyClick();
                          setSelectedTickerRow(item.symbol);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#261f12] hover:bg-[#2e2616]'
                            : 'hover:bg-[#1f1f1f]'
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-white">
                          <span className={item.symbol.startsWith('/') ? 'text-[#ffd600]' : 'text-[#00d2ff]'}>
                            {item.symbol}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#aaa]">{item.sector}</td>
                        <td className="py-2 px-3 text-center font-mono">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 bg-[#2d2d2d] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#ef4444] h-full"
                                style={{ width: `${item.foreignSupplyChainPct}%` }}
                              />
                            </div>
                            <span className="text-[10px]">{item.foreignSupplyChainPct}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] text-[#bbb]">
                          {item.foreignRevenuePct}%
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={item.tariffBeta > 1.5 ? 'text-[#ef4444]' : item.tariffBeta > 1.0 ? 'text-[#f97316]' : 'text-[#22c55e]'}>
                            {item.tariffBeta.toFixed(2)}x
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] ${tierBadge}`}>
                            {item.vulnerabilityTier}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={item.estimatedEpsDragPct < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}>
                            {item.estimatedEpsDragPct > 0 ? '+' : ''}{item.estimatedEpsDragPct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#ffd600]">
                          +{item.impliedVolSpikePotentialPts.toFixed(1)} pts
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[10px]">
                          <span className={item.optionsPutSkewBps > 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}>
                            {item.optionsPutSkewBps > 0 ? '+' : ''}{item.optionsPutSkewBps} bps
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playKeyClick();
                              onSelectTicker(item.symbol);
                            }}
                            className="px-2 py-0.5 bg-[#2a2a2a] hover:bg-[#ff9900] hover:text-black text-white text-[9px] rounded font-bold transition-all"
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

            {/* Selected Ticker Deep Dive Row Inspector */}
            {selectedTickerData && (
              <div className="bg-[#161616] border border-[#333] p-3 rounded flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {selectedTickerData.name} ({selectedTickerData.symbol})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[#ffd600] font-mono text-[10px]">
                      Beta: {selectedTickerData.tariffBeta}x
                    </span>
                  </div>
                  <div className="text-[#8c8c8c] text-[10px] mt-0.5">
                    Recommended Trade: <strong className="text-[#a3e635]">{selectedTickerData.recommendedPlay}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playKeyClick();
                      onSelectTicker(selectedTickerData.symbol);
                      onNavigateToChain();
                    }}
                    className="px-3 py-1.5 bg-[#ff9900] text-black font-bold rounded text-xs hover:bg-[#ffaa22] transition-all flex items-center gap-1"
                  >
                    <span>Inspect {selectedTickerData.symbol} Options (OMON)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => {
                      playKeyClick();
                      onSelectTicker(selectedTickerData.symbol);
                      onNavigateToValuation();
                    }}
                    className="px-3 py-1.5 bg-[#252525] text-white hover:bg-[#333] rounded text-xs border border-[#444] transition-all"
                  >
                    Evaluate (OVME) &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TARIFF IMPACT SIMULATOR & CALCULATOR                               */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left Controls (5 cols) */}
            <div className="col-span-5 bg-[#181818] border border-[#333] rounded p-4 flex flex-col gap-4">
              <div className="border-b border-[#2d2d2d] pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#00d2ff]" />
                  TRADE WAR &amp; TARIFF IMPACT SIMULATOR
                </h3>
                <p className="text-[10px] text-[#8c8c8c] mt-0.5">
                  Model stagflationary EPS compression, implied volatility spikes, and bond yield adjustments
                </p>
              </div>

              {/* Slider 1: Universal Baseline Tariff */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[#8c8c8c]">Universal Baseline Import Tariff:</label>
                  <span className="font-bold text-[#ffd600] font-mono text-sm">
                    {simulatedBaseTariffRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="1"
                  value={simulatedBaseTariffRate}
                  onChange={(e) => setSimulatedBaseTariffRate(Number(e.target.value))}
                  className="w-full accent-[#ffd600] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[#666]">
                  <span>0% (Free Trade)</span>
                  <span>10% (Baseline)</span>
                  <span>20% (Aggressive)</span>
                  <span>35% (Extreme)</span>
                </div>
              </div>

              {/* Slider 2: China Strategic Surcharge */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[#8c8c8c]">China Strategic Goods Surcharge (Section 301):</label>
                  <span className="font-bold text-[#ef4444] font-mono text-sm">
                    {simulatedChinaSurcharge}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={simulatedChinaSurcharge}
                  onChange={(e) => setSimulatedChinaSurcharge(Number(e.target.value))}
                  className="w-full accent-[#ef4444] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[#666]">
                  <span>0% (Status Quo)</span>
                  <span>25%</span>
                  <span>60% (Proposed)</span>
                  <span>100% (Clean Tech)</span>
                </div>
              </div>

              {/* Slider 3: Automotive & Nearshoring Tariffs */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[#8c8c8c]">Automotive &amp; USMCA Transshipment Tariff:</label>
                  <span className="font-bold text-[#f97316] font-mono text-sm">
                    {simulatedAutoTariff}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={simulatedAutoTariff}
                  onChange={(e) => setSimulatedAutoTariff(Number(e.target.value))}
                  className="w-full accent-[#f97316] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[#666]">
                  <span>0%</span>
                  <span>25% (Mexico Steel/EVs)</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Reset / Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-[#2d2d2d] text-xs">
                <span className="text-[#8c8c8c] text-[10px]">Scenarios:</span>
                <button
                  onClick={() => {
                    playKeyClick();
                    setSimulatedBaseTariffRate(0);
                    setSimulatedChinaSurcharge(25);
                    setSimulatedAutoTariff(0);
                  }}
                  className="px-2 py-0.5 bg-[#252525] hover:bg-[#333] text-white rounded text-[10px]"
                >
                  Status Quo
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setSimulatedBaseTariffRate(10);
                    setSimulatedChinaSurcharge(60);
                    setSimulatedAutoTariff(25);
                  }}
                  className="px-2 py-0.5 bg-[#ff9900]/20 border border-[#ff9900]/40 text-[#ff9900] font-bold rounded text-[10px]"
                >
                  Universal 10% + 60% China
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setSimulatedBaseTariffRate(20);
                    setSimulatedChinaSurcharge(100);
                    setSimulatedAutoTariff(35);
                  }}
                  className="px-2 py-0.5 bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444] font-bold rounded text-[10px]"
                >
                  Maximum Trade War
                </button>
              </div>
            </div>

            {/* Right Output Dashboard (7 cols) */}
            <div className="col-span-7 flex flex-col gap-3">
              {/* Macro Impact KPI Cards */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-[#181818] border border-[#333] p-2.5 rounded">
                  <span className="text-[9px] text-[#8c8c8c] block uppercase">Weighted Tariff Drag</span>
                  <div className="text-base font-bold text-[#ffd600] font-mono mt-0.5">
                    {simulationResults.weightedRate}%
                  </div>
                  <span className="text-[8px] text-[#8c8c8c]">Trade-weighted index</span>
                </div>

                <div className="bg-[#181818] border border-[#333] p-2.5 rounded">
                  <span className="text-[9px] text-[#8c8c8c] block uppercase">S&amp;P 500 EPS Margin Drag</span>
                  <div className="text-base font-bold text-[#ef4444] font-mono mt-0.5">
                    {simulationResults.epsDrag}%
                  </div>
                  <span className="text-[8px] text-[#fca5a5]">-$7.40 / share est.</span>
                </div>

                <div className="bg-[#181818] border border-[#333] p-2.5 rounded">
                  <span className="text-[9px] text-[#8c8c8c] block uppercase">Options IV Expansion</span>
                  <div className="text-base font-bold text-[#ef4444] font-mono mt-0.5">
                    +{simulationResults.ivSpikePts} pts
                  </div>
                  <span className="text-[8px] text-[#fca5a5]">SPY/QQQ VIX baseline</span>
                </div>

                <div className="bg-[#181818] border border-[#333] p-2.5 rounded">
                  <span className="text-[9px] text-[#8c8c8c] block uppercase">10Y Term Premium</span>
                  <div className="text-base font-bold text-[#00d2ff] font-mono mt-0.5">
                    +{simulationResults.tenYrYieldBps} bps
                  </div>
                  <span className="text-[8px] text-[#bae6fd]">Fiscal deficit &amp; CPI shock</span>
                </div>
              </div>

              {/* Sector Vulnerability Breakdown Bar Chart */}
              <div className="bg-[#181818] border border-[#333] p-3.5 rounded flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs border-b border-[#2d2d2d] pb-1.5">
                  <span className="font-bold text-white">PROJECTED SECTOR EPS MARGIN SQUEEZE</span>
                  <span className="text-[10px] text-[#8c8c8c]">Under Active Simulation Inputs</span>
                </div>

                {/* Bars */}
                {[
                  { sector: 'Consumer Electronics & Hardware (AAPL, NVDA)', drag: Number(simulationResults.epsDrag) * 1.45, color: '#ef4444' },
                  { sector: 'Automotive & Clean Transport (TSLA, GM, F)', drag: Number(simulationResults.epsDrag) * 1.30, color: '#f97316' },
                  { sector: 'Industrial Machinery & Equipment (CAT, DE)', drag: Number(simulationResults.epsDrag) * 1.15, color: '#eab308' },
                  { sector: 'Retail & Consumer Goods (WMT, TGT, NKE)', drag: Number(simulationResults.epsDrag) * 1.10, color: '#eab308' },
                  { sector: 'Enterprise Software & Cloud Platforms (MSFT)', drag: Number(simulationResults.epsDrag) * 0.35, color: '#22c55e' },
                ].map((row) => (
                  <div key={row.sector} className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#ccc]">{row.sector}</span>
                      <span className="font-bold font-mono" style={{ color: row.color }}>
                        {row.drag.toFixed(1)}% EPS
                      </span>
                    </div>
                    <div className="w-full bg-[#252525] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.abs(row.drag) * 6.5)}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Volatility Trading Playbook for Simulation Output */}
              <div className="bg-[#181818] border border-[#333] p-3 rounded text-xs flex flex-col gap-1.5">
                <span className="font-bold text-[#a3e635] text-xs">
                  Optimal Volatility Positioning for Simulated Regime:
                </span>
                <p className="text-[11px] text-[#ccc] leading-relaxed">
                  With simulated aggregate tariff drag at <strong className="text-[#ffd600]">{simulationResults.weightedRate}%</strong>, 
                  institutional desk bias favors <strong>Long Volatility Gamma Straddles</strong> on tech hardware exporters (NVDA, AAPL) 
                  coupled with <strong>Short Put Spreads</strong> on defensive enterprise software (MSFT), and <strong>Long Gold (/GC) Call Spreads</strong> as a currency debasement and stagflation shield.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: POLICY MILESTONES & REGULATORY DEADLINES                           */}
        {/* ========================================================================= */}
        {activeTab === 'calendar' && (
          <div className="flex flex-col gap-3 h-full">
            <div className="bg-[#181818] p-3 rounded border border-[#2d2d2d] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4 text-[#ffd600]" />
                  TRADE POLICY MILESTONE CALENDAR &amp; REGULATORY DEADLINES
                </span>
                <p className="text-[10px] text-[#8c8c8c] mt-0.5">
                  Statutory deadlines, WTO panel disputes, BIS export control updates, and trade agreement reviews
                </p>
              </div>
              <span className="bg-[#ef4444] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                NEXT DEADLINE: 35 DAYS
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {TARIFF_MILESTONES_CALENDAR.map((m) => {
                const importanceBadge = {
                  CRITICAL: 'bg-[#ef4444] text-white font-bold',
                  HIGH: 'bg-[#f97316] text-black font-bold',
                  MEDIUM: 'bg-[#eab308] text-black font-bold',
                }[m.importance];

                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-[#181818] border border-[#333] hover:border-[#555] rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-[#242424] border border-[#3a3a3a] px-3 py-1.5 rounded text-center min-w-[70px]">
                        <span className="text-[14px] font-bold text-[#ffd600] font-mono block leading-none">
                          {m.daysRemaining}d
                        </span>
                        <span className="text-[8px] text-[#8c8c8c] uppercase mt-1 block">Countdown</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{m.title}</h4>
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] ${importanceBadge}`}>
                            {m.importance}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#292929] text-[#8c8c8c] text-[8.5px] font-mono">
                            {m.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#aaa] mt-1 leading-relaxed max-w-3xl">
                          {m.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[9px] text-[#8c8c8c]">Target Assets:</span>
                          {m.tickersImpacted.map((sym) => (
                            <button
                              key={sym}
                              onClick={() => {
                                playKeyClick();
                                onSelectTicker(sym);
                              }}
                              className="px-1.5 py-0.5 bg-[#252525] hover:bg-[#ff9900] hover:text-black text-[#00d2ff] font-bold rounded text-[9px] transition-all"
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-white block">{m.date}</span>
                      <button
                        onClick={() => {
                          playKeyClick();
                          if (m.tickersImpacted[0]) onSelectTicker(m.tickersImpacted[0]);
                          onNavigateToChain();
                        }}
                        className="mt-1.5 px-2.5 py-1 bg-[#252525] hover:bg-[#333] text-[#ff9900] rounded text-[10px] border border-[#3c3c3c] transition-all"
                      >
                        Trade Catalyst &gt;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
