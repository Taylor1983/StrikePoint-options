import React from 'react';
import {
  SmartOrderRoutingPlan,
  ExchangeVenue,
  RoutingOptimizationMode,
} from '../services/smartOrderRoutingService';
import { playKeyClick } from '../utils/terminalSound';
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  ExternalLink,
  Sliders,
  DollarSign,
  Clock,
  Sparkles,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface ExchangeRoutingMonitorOverlayProps {
  plan: SmartOrderRoutingPlan;
  onClose: () => void;
  onApplyPlan?: () => void;
  onExecuteTrade?: () => void;
  isExecuting?: boolean;
  onToggleCanadianExchanges: (enabled: boolean) => void;
  onChangeOptimizationMode: (mode: RoutingOptimizationMode) => void;
  onRefreshQuotes: () => void;
}

export const ExchangeRoutingMonitorOverlay: React.FC<ExchangeRoutingMonitorOverlayProps> = ({
  plan,
  onClose,
  onApplyPlan,
  onExecuteTrade,
  isExecuting = false,
  onToggleCanadianExchanges,
  onChangeOptimizationMode,
  onRefreshQuotes,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-200 font-sans text-[#e2e8f0]">
      <div className="bg-[#090d16] border-2 border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* TOP MONITOR HEADER */}
        <div className="bg-[#0f172a] px-4 py-3 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00e676]/15 border border-[#00e676]/40 text-[#00e676] text-xs font-mono font-black tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
              <span>SMART ORDER ROUTING MONITOR</span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-sm font-black text-[#ff9900]">{plan.symbol}</span>
              <span className="text-xs text-white font-bold bg-[#1e293b] px-2 py-0.5 rounded border border-[#334155]">
                {plan.strategyName.toUpperCase()}
              </span>
              <span className="text-xs text-[#38bdf8] font-bold bg-[#0284c7]/20 px-2 py-0.5 rounded border border-[#0284c7]/40">
                {plan.totalOrderSets} {plan.totalOrderSets === 1 ? 'SET' : 'SETS'} ({plan.totalContractsOverall} CONTRACTS)
              </span>
              {plan.isDualListedOrCrossBorder && (
                <span className="text-[10px] text-[#ffd600] font-black bg-[#ffd600]/15 px-2 py-0.5 rounded border border-[#ffd600]/40 flex items-center gap-1">
                  <span>🇨🇦 US/CAD DUAL-LISTED</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                onRefreshQuotes();
              }}
              className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-xs text-[#94a3b8] hover:text-white flex items-center gap-1.5 transition-colors font-mono cursor-pointer"
              title="Refresh live liquidity quotes across venues"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SYNC DOM</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
              title="Close monitor overlay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTROLS STRIP: OPTIMIZATION POLICY & CANADIAN TOGGLE */}
        <div className="bg-[#0b1120] px-4 py-2 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8b9bb4] uppercase font-bold flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[#ff9900]" />
              <span>ROUTING POLICY:</span>
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'MIN_SLIPPAGE', label: 'MIN SLIPPAGE (OPTIMAL)' },
                  { id: 'MAX_REBATE', label: 'MAX REBATES' },
                  { id: 'FAST_FILL', label: 'LOW LATENCY (<100μs)' },
                  { id: 'BALANCED_CROSS_BORDER', label: 'CROSS-BORDER DUAL' },
                ] as { id: RoutingOptimizationMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    playKeyClick();
                    onChangeOptimizationMode(mode.id);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    plan.optimizationMode === mode.id
                      ? 'bg-[#ff9900] text-black font-black'
                      : 'bg-[#141d30] text-[#8b9bb4] hover:text-white border border-[#223150]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canadian Exchanges Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-[#141d30] px-2.5 py-1 rounded border border-[#223150] hover:border-[#38bdf8]/50 transition-colors">
              <input
                type="checkbox"
                checked={plan.includeCanadianExchanges}
                onChange={(e) => {
                  playKeyClick();
                  onToggleCanadianExchanges(e.target.checked);
                }}
                className="accent-[#38bdf8] cursor-pointer"
              />
              <span className="text-white text-[11px] font-bold flex items-center gap-1">
                <span>🇨🇦 CANADIAN EXCHANGES (MX / TSX)</span>
              </span>
            </label>
          </div>
        </div>

        {/* PRIMARY KPI EXECUTIVE METRICS STRIP */}
        <div className="bg-[#080d19] px-4 py-3 border-b border-[#1e293b] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono shrink-0">
          
          <div className="bg-[#0f172a] p-2.5 rounded-xl border border-[#1e293b] flex flex-col justify-between">
            <span className="text-[10px] text-[#8b9bb4] uppercase">ESTIMATED SLIPPAGE SAVINGS</span>
            <span className="text-base font-black text-[#00e676] mt-0.5">
              +${plan.totalSlippageSavingsDollars.toFixed(2)}
            </span>
            <span className="text-[9.5px] text-[#64748b]">
              vs single-venue sweep (${plan.singleVenueBenchmarkPrice.toFixed(2)})
            </span>
          </div>

          <div className="bg-[#0f172a] p-2.5 rounded-xl border border-[#1e293b] flex flex-col justify-between">
            <span className="text-[10px] text-[#8b9bb4] uppercase">EFFECTIVE NET PRICE</span>
            <span className="text-base font-black text-white mt-0.5">
              ${plan.smartRoutedPrice.toFixed(2)}{' '}
              <span className="text-xs font-bold text-[#8b9bb4]">
                {plan.isDebit ? 'DEBIT' : 'CREDIT'}
              </span>
            </span>
            <span className="text-[9.5px] text-[#00e676]">
              +${plan.netSlippagePerShare.toFixed(2)} price improvement/sh
            </span>
          </div>

          <div className="bg-[#0f172a] p-2.5 rounded-xl border border-[#1e293b] flex flex-col justify-between">
            <span className="text-[10px] text-[#8b9bb4] uppercase">VENUE ALLOCATION SPLIT</span>
            <div className="text-xs font-black text-white mt-0.5 flex items-center gap-1 flex-wrap">
              {plan.exchangeAllocations.map((v) => (
                <span
                  key={v.exchange}
                  className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]"
                >
                  {v.flag} {v.exchange} ({v.percentOfTotalOrder}%)
                </span>
              ))}
            </div>
            <span className="text-[9.5px] text-[#64748b]">
              Split across {plan.exchangeAllocations.length} distinct books
            </span>
          </div>

          <div className="bg-[#0f172a] p-2.5 rounded-xl border border-[#1e293b] flex flex-col justify-between">
            <span className="text-[10px] text-[#8b9bb4] uppercase">EXECUTION SPEED LATENCY</span>
            <span className="text-base font-black text-[#38bdf8] mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{plan.effectiveExecutionSpeedMicros}μs</span>
            </span>
            <span className="text-[9.5px] text-[#64748b]">
              Ultra-low latency parallel dispatch
            </span>
          </div>

          <div className="bg-[#0f172a] p-2.5 rounded-xl border border-[#1e293b] flex flex-col justify-between">
            <span className="text-[10px] text-[#8b9bb4] uppercase">LEGGING RISK MITIGATION</span>
            <span className="text-base font-black text-[#00e676] mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#00e676]" />
              <span>ZERO RISK</span>
            </span>
            <span className="text-[9.5px] text-[#64748b]">
              Atomic Intermarket Sweep (ISO) Lock
            </span>
          </div>

        </div>

        {/* MAIN BODY: SPLIT VIEW OF TOPOLOGY ROUTING FLOW & DETAILED LEG-BY-LEG MATRIX */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-4 bg-[#060911]">
          
          {/* SECTION 1: INTERACTIVE ROUTING FLOW TOPOLOGY */}
          <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00e676]" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  REAL-TIME SMART ORDER ROUTING TOPOLOGY
                </span>
              </div>
              <span className="text-[10px] text-[#64748b]">
                ALGORITHM: {plan.algorithmVersion} · PARALLEL DISPATCH
              </span>
            </div>

            {/* FLOW DIAGRAM NODES */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center py-2">
              
              {/* NODE 1: ORDER INPUT */}
              <div className="md:col-span-3 bg-[#11192e] border-2 border-[#ff9900]/60 rounded-xl p-3 flex flex-col items-center text-center shadow-lg shadow-[#ff9900]/5">
                <span className="text-[9.5px] text-[#8b9bb4] uppercase font-bold">CLIENT STRATEGY ORDER</span>
                <span className="text-sm font-black text-white mt-0.5">{plan.strategyName}</span>
                <span className="text-xs font-mono font-bold text-[#ff9900]">
                  {plan.totalContractsOverall} Contracts ({plan.totalOrderSets}x Sets)
                </span>
                <div className="mt-2 text-[9px] text-[#64748b] bg-[#0b0f19] px-2 py-0.5 rounded border border-[#1e293b]">
                  Target: ${plan.smartRoutedPrice.toFixed(2)} {plan.isDebit ? 'DEBIT' : 'CREDIT'}
                </div>
              </div>

              {/* ARROW 1 */}
              <div className="md:col-span-1 flex justify-center items-center">
                <ArrowRight className="w-5 h-5 text-[#ff9900] hidden md:block animate-pulse" />
                <div className="w-0.5 h-4 bg-[#ff9900] md:hidden" />
              </div>

              {/* NODE 2: SOR CORE */}
              <div className="md:col-span-3 bg-[#11192e] border-2 border-[#00e676]/60 rounded-xl p-3 flex flex-col items-center text-center shadow-lg shadow-[#00e676]/5">
                <span className="text-[9.5px] text-[#00e676] uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#00e676]" />
                  <span>SOR SLIPPAGE ENGINE</span>
                </span>
                <span className="text-xs font-bold text-white mt-0.5">Microsecond Liquidity Arb</span>
                <span className="text-[10px] text-[#94a3b8] mt-1">
                  Evaluates Depth · Spreads · Rebates across 5 Books
                </span>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] font-bold">
                    -${plan.totalSlippageSavingsDollars.toFixed(2)} SLIPPAGE
                  </span>
                </div>
              </div>

              {/* ARROW 2 */}
              <div className="md:col-span-1 flex justify-center items-center">
                <ArrowRight className="w-5 h-5 text-[#00e676] hidden md:block animate-pulse" />
                <div className="w-0.5 h-4 bg-[#00e676] md:hidden" />
              </div>

              {/* NODE 3: MULTI-EXCHANGE DISPATCH */}
              <div className="md:col-span-4 bg-[#11192e] border border-[#1e293b] rounded-xl p-2.5 flex flex-col gap-1.5">
                <span className="text-[9.5px] text-[#8b9bb4] uppercase font-bold text-center block border-b border-[#1e293b] pb-1">
                  ACTIVE VENUE ALLOCATION
                </span>
                <div className="flex flex-col gap-1 text-[10px]">
                  {plan.exchangeAllocations.map((v) => (
                    <div
                      key={v.exchange}
                      className="flex items-center justify-between py-1 px-2 rounded bg-[#0b0f19] border border-[#1e293b]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{v.flag}</span>
                        <span className="font-bold text-white">{v.exchange}</span>
                        <span className="text-[9px] text-[#64748b]">{v.exchangeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black">{v.totalContracts}x</span>
                        <span className="text-[#38bdf8] font-bold text-[9px]">{v.percentOfTotalOrder}%</span>
                        <span className="text-[8.5px] text-[#64748b]">{v.fillSpeedRank}μs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: LEG-BY-LEG EXCHANGE SPLIT BREAKDOWN (CRITICAL FEATURE) */}
          <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff9900]" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  MULTI-LEG EXCHANGE ROUTING SPLIT MATRIX (LEG-BY-LEG)
                </span>
              </div>
              <span className="text-[10.5px] text-[#38bdf8] font-bold">
                Highlights which leg is being routed to which exchange
              </span>
            </div>

            {/* LEG CARDS */}
            <div className="flex flex-col gap-3">
              {plan.legSplits.map((leg, lIdx) => {
                const isBuy = leg.action === 'buy';
                return (
                  <div
                    key={leg.legId}
                    className="bg-[#090d16] border-2 border-[#1e293b] rounded-xl p-3 flex flex-col gap-2.5 transition-all hover:border-[#334155]"
                  >
                    {/* Leg Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#151c2d] pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#1e293b] text-white">
                          LEG {lIdx + 1} OF {plan.legSplits.length}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                            isBuy
                              ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                              : 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                          }`}
                        >
                          {leg.action} {leg.totalContracts}x
                        </span>

                        <span className="text-sm font-black text-white">
                          ${leg.strike.toFixed(2)} {leg.type.toUpperCase()}
                        </span>

                        <span className="text-xs text-[#8b9bb4]">
                          {leg.expiration} ({leg.dte}d)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div>
                          <span className="text-[#64748b] text-[9.5px]">NATURAL QUOTE: </span>
                          <span className="text-white font-bold">${leg.baseQuotedPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#64748b] text-[9.5px]">WEIGHTED SOR FILL: </span>
                          <span className="text-[#00e676] font-black">${leg.weightedFillPrice.toFixed(2)}</span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-[#00e676]/15 text-[#00e676] font-bold text-[10px]">
                          +${leg.legSlippageSavings.toFixed(2)} SAVED
                        </div>
                      </div>
                    </div>

                    {/* Routing Allocations Across Venues for this Leg */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-[#8b9bb4] uppercase font-bold">
                        EXCHANGE ROUTING ALLOCATION FOR THIS LEG:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {leg.allocations.map((alloc) => (
                          <div
                            key={alloc.exchange}
                            className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-2.5 flex flex-col justify-between gap-1.5"
                          >
                            <div className="flex items-center justify-between border-b border-[#1e2638] pb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{alloc.flag}</span>
                                <span className="font-black text-white text-xs">{alloc.exchange}</span>
                                <span className="text-[9px] text-[#64748b]">({alloc.country})</span>
                              </div>
                              <span className="text-xs font-black text-[#ff9900]">
                                {alloc.contracts} Contracts ({alloc.percentOfLeg}%)
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-[#1e2638] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#38bdf8] h-full rounded-full transition-all duration-300"
                                style={{ width: `${alloc.percentOfLeg}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <div>
                                <span className="text-[#64748b] text-[9.5px] block">EXEC PRICE</span>
                                <span className="font-bold text-white">${alloc.fillPrice.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[#64748b] text-[9.5px] block">PRICE IMPRV</span>
                                <span className="font-bold text-[#00e676]">+{alloc.priceImprovement * 100}¢</span>
                              </div>
                              <div>
                                <span className="text-[#64748b] text-[9.5px] block">LATENCY</span>
                                <span className="font-bold text-[#38bdf8]">{alloc.latencyMicros}μs</span>
                              </div>
                            </div>

                            <div className="text-[9.5px] text-[#94a3b8] italic bg-[#090d16] p-1.5 rounded border border-[#141b2b]">
                              {alloc.rationale}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: EXCHANGE LIQUIDITY PROFILES COMPARISON MATRIX */}
          <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  INTERMARKET VENUE LIQUIDITY COMPARISON (US &amp; CANADIAN EXCHANGES)
                </span>
              </div>
              <span className="text-[10px] text-[#64748b]">
                Real-Time Top-of-Book Quotes &amp; Depth Profiles
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-[#090d16] text-[#64748b] text-[9.5px] uppercase border-b border-[#1e293b]">
                  <tr>
                    <th className="py-1.5 px-2 text-left">EXCHANGE VENUE</th>
                    <th className="py-1.5 px-2 text-left">REGION</th>
                    <th className="py-1.5 px-2">BID / ASK</th>
                    <th className="py-1.5 px-2">SPREAD</th>
                    <th className="py-1.5 px-2">BBO DEPTH</th>
                    <th className="py-1.5 px-2">CUM 5-LVL</th>
                    <th className="py-1.5 px-2">FEE / REBATE</th>
                    <th className="py-1.5 px-2">LATENCY</th>
                    <th className="py-1.5 px-2">LIQUIDITY SCORE</th>
                    <th className="py-1.5 px-2 text-right">ALLOCATED QTY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151c2d]">
                  {plan.liquidityProfiles.map((prof) => {
                    const alloc = plan.exchangeAllocations.find((a) => a.exchange === prof.exchange);
                    const isAllocated = Boolean(alloc && alloc.totalContracts > 0);

                    return (
                      <tr
                        key={prof.exchange}
                        className={`transition-colors ${
                          isAllocated ? 'bg-[#0f172a] hover:bg-[#162035]' : 'bg-[#080c16] opacity-60'
                        }`}
                      >
                        <td className="py-2 px-2 text-left font-bold text-white flex items-center gap-1.5">
                          <span>{prof.flag}</span>
                          <span className={isAllocated ? 'text-[#ff9900] font-black' : 'text-slate-300'}>
                            {prof.exchange}
                          </span>
                          <span className="text-[10px] text-[#64748b] font-normal">
                            ({prof.name})
                          </span>
                        </td>

                        <td className="py-2 px-2 text-left text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              prof.country === 'CA'
                                ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                                : 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30'
                            }`}
                          >
                            {prof.country === 'CA' ? '🇨🇦 CANADA' : '🇺🇸 UNITED STATES'}
                          </span>
                        </td>

                        <td className="py-2 px-2 text-white">
                          ${prof.bid.toFixed(2)} × ${prof.ask.toFixed(2)}
                        </td>

                        <td className="py-2 px-2">
                          <span className="text-[#38bdf8] font-bold">${prof.spread.toFixed(2)}</span>
                          <span className="text-[9.5px] text-[#64748b] ml-1">({prof.spreadBps} bps)</span>
                        </td>

                        <td className="py-2 px-2 text-white font-bold">{prof.depthSize}x</td>
                        <td className="py-2 px-2 text-[#94a3b8]">{prof.totalBookDepth}x</td>

                        <td className="py-2 px-2 font-bold">
                          {prof.rebateFeePerContract < 0 ? (
                            <span className="text-[#00e676]">
                              -${Math.abs(prof.rebateFeePerContract).toFixed(2)} (REBATE)
                            </span>
                          ) : (
                            <span className="text-[#94a3b8]">
                              +${prof.rebateFeePerContract.toFixed(2)} fee
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-2 text-[#38bdf8]">{prof.latencyMicros}μs</td>

                        <td className="py-2 px-2 font-black">
                          <span
                            className={
                              prof.liquidityScore >= 90
                                ? 'text-[#00e676]'
                                : prof.liquidityScore >= 75
                                ? 'text-[#ffd600]'
                                : 'text-[#ff334b]'
                            }
                          >
                            {prof.liquidityScore} / 100
                          </span>
                        </td>

                        <td className="py-2 px-2 text-right">
                          {isAllocated ? (
                            <span className="px-2 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] font-black border border-[#ff9900]/40">
                              {alloc?.totalContracts}x ({alloc?.percentOfTotalOrder}%)
                            </span>
                          ) : (
                            <span className="text-[#64748b] text-[10px]">0x (Bypassed)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-[#0f172a] px-4 py-3 border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#00e676]">
              <CheckCircle className="w-4 h-4 text-[#00e676]" />
              <span className="font-bold">SMART ROUTING PLAN READY</span>
            </div>
            <span className="text-[#8b9bb4] hidden sm:inline">
              Total Slippage Saved: <strong className="text-white">+${plan.totalSlippageSavingsDollars.toFixed(2)}</strong> across {plan.exchangeAllocations.length} exchanges
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                if (onApplyPlan) onApplyPlan();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold transition-colors cursor-pointer"
            >
              APPLY PLAN &amp; RETURN
            </button>

            {onExecuteTrade && (
              <button
                disabled={isExecuting}
                onClick={() => {
                  playKeyClick();
                  onExecuteTrade();
                }}
                className={`px-5 py-2 rounded-xl font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xl ${
                  isExecuting
                    ? 'bg-[#334155] text-[#94a3b8] cursor-wait'
                    : plan.isDebit
                    ? 'bg-[#ff334b] hover:bg-[#ff4d63] text-white shadow-[#ff334b]/20'
                    : 'bg-[#00e676] hover:bg-[#1cf387] text-black shadow-[#00e676]/20'
                }`}
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>EXECUTING MULTI-EXCHANGE SWEEP...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      EXECUTE SMART ROUTED ORDER @ ${plan.smartRoutedPrice.toFixed(2)}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
