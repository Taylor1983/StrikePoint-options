import React, { useState, useMemo } from 'react';
import {
  OPEC_MEETINGS_DATA,
  OPEC_AGGREGATE_STATS,
  OpecMeetingEvent,
  OpecIvTimelinePoint,
  calculateOpecExpectedMove,
} from '../services/opecData';
import { Ticker, TradeLeg } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import {
  Flame,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  MapPin,
  BarChart3,
  Layers,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface OPECMeetingsViewProps {
  currentTicker: Ticker;
  onSelectTicker: (symbol: string) => void;
  onNavigateToChain: () => void;
  onNavigateToValuation: () => void;
  onApplyStrategyLegs?: (legs: TradeLeg[]) => void;
}

type ChartMode = 'iv_vs_price' | 'call_vs_put_skew' | 'straddle_decay';

export const OPECMeetingsView: React.FC<OPECMeetingsViewProps> = ({
  currentTicker,
  onSelectTicker,
  onNavigateToChain,
  onNavigateToValuation,
  onApplyStrategyLegs,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(OPEC_MEETINGS_DATA[0].id);
  const [filterType, setFilterType] = useState<'ALL' | 'UPCOMING' | 'ONOMM' | 'EXTRAORDINARY'>('ALL');
  const [chartMode, setChartMode] = useState<ChartMode>('iv_vs_price');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const selectedEvent = useMemo(() => {
    return OPEC_MEETINGS_DATA.find((e) => e.id === selectedEventId) || OPEC_MEETINGS_DATA[0];
  }, [selectedEventId]);

  const filteredEvents = useMemo(() => {
    if (filterType === 'UPCOMING') return OPEC_MEETINGS_DATA.filter((e) => e.status === 'upcoming');
    if (filterType === 'ONOMM') return OPEC_MEETINGS_DATA.filter((e) => e.type === 'ONOMM' || e.type === 'JMMC');
    if (filterType === 'EXTRAORDINARY') return OPEC_MEETINGS_DATA.filter((e) => e.type === 'EXTRAORDINARY');
    return OPEC_MEETINGS_DATA;
  }, [filterType]);

  // Current Expected Move Calculation for WTI Spot
  const wtiSpot = currentTicker.symbol === '/CL' ? currentTicker.price : 68.45;
  const currentExpectedMove = useMemo(() => {
    return calculateOpecExpectedMove(wtiSpot, selectedEvent.ivPeakPreMeeting / 100, Math.max(1, selectedEvent.daysToEvent));
  }, [wtiSpot, selectedEvent]);

  // SVG Chart Dimensions & Computations
  const timeline = selectedEvent.ivTimeline;
  const chartWidth = 760;
  const chartHeight = 240;
  const padding = { top: 25, right: 55, bottom: 35, left: 50 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Min / Max for scales
  const ivValues = timeline.map((p) => p.iv);
  const minIv = Math.max(15, Math.floor(Math.min(...ivValues) - 3));
  const maxIv = Math.ceil(Math.max(...ivValues) + 3);

  const priceValues = timeline.map((p) => p.wtiPrice);
  const minPrice = Math.floor(Math.min(...priceValues) - 2);
  const maxPrice = Math.ceil(Math.max(...priceValues) + 2);

  const straddleValues = timeline.map((p) => p.straddlePrice);
  const minStraddle = Math.max(0.5, Math.min(...straddleValues) * 0.85);
  const maxStraddle = Math.max(...straddleValues) * 1.15;

  const getX = (index: number) => {
    if (timeline.length <= 1) return padding.left;
    return padding.left + (index / (timeline.length - 1)) * innerWidth;
  };

  const getYIv = (iv: number) => {
    return padding.top + innerHeight - ((iv - minIv) / (maxIv - minIv)) * innerHeight;
  };

  const getYPrice = (price: number) => {
    return padding.top + innerHeight - ((price - minPrice) / (maxPrice - minPrice)) * innerHeight;
  };

  const getYStraddle = (val: number) => {
    return padding.top + innerHeight - ((val - minStraddle) / (maxStraddle - minStraddle)) * innerHeight;
  };

  // Build SVG Path Strings
  const ivPath = timeline
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYIv(p.iv)}`)
    .join(' ');

  const pricePath = timeline
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYPrice(p.wtiPrice)}`)
    .join(' ');

  const callSkewPath = timeline
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYIv(p.callSkewIv)}`)
    .join(' ');

  const putSkewPath = timeline
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYIv(p.putSkewIv)}`)
    .join(' ');

  const straddlePath = timeline
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYStraddle(p.straddlePrice)}`)
    .join(' ');

  // Decision Day Index in timeline
  const decisionIndex = timeline.findIndex((p) => p.dayOffset === 0);

  // Strategy Loader Handler
  const handleLoadStrategy = (strat: { name: string; legs: string }) => {
    playKeyClick();
    if (currentTicker.symbol !== '/CL') {
      onSelectTicker('/CL');
    }

    if (onApplyStrategyLegs) {
      const strikeBase = Math.round(wtiSpot);
      let newLegs: TradeLeg[] = [];

      if (strat.name.includes('Calendar')) {
        newLegs = [
          {
            id: `opec-leg-${Date.now()}-1`,
            type: 'call',
            action: 'sell',
            strike: strikeBase,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: selectedEvent.ivPeakPreMeeting / 100,
            premium: 2.85,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
          {
            id: `opec-leg-${Date.now()}-2`,
            type: 'call',
            action: 'buy',
            strike: strikeBase,
            expiration: 'Dec 18, 2026',
            dte: 79,
            iv: (selectedEvent.ivPeakPreMeeting - 8) / 100,
            premium: 4.10,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
        ];
      } else if (strat.name.includes('Iron Condor')) {
        newLegs = [
          {
            id: `opec-leg-${Date.now()}-1`,
            type: 'put',
            action: 'buy',
            strike: strikeBase - 6,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: (selectedEvent.ivPeakPreMeeting + 2) / 100,
            premium: 0.65,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
          {
            id: `opec-leg-${Date.now()}-2`,
            type: 'put',
            action: 'sell',
            strike: strikeBase - 3,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: selectedEvent.ivPeakPreMeeting / 100,
            premium: 1.45,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
          {
            id: `opec-leg-${Date.now()}-3`,
            type: 'call',
            action: 'sell',
            strike: strikeBase + 3,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: selectedEvent.ivPeakPreMeeting / 100,
            premium: 1.50,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
          {
            id: `opec-leg-${Date.now()}-4`,
            type: 'call',
            action: 'buy',
            strike: strikeBase + 6,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: (selectedEvent.ivPeakPreMeeting - 1) / 100,
            premium: 0.60,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
        ];
      } else {
        // Reverse Risk Reversal
        newLegs = [
          {
            id: `opec-leg-${Date.now()}-1`,
            type: 'put',
            action: 'sell',
            strike: strikeBase - 4,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: selectedEvent.ivPeakPreMeeting / 100,
            premium: 1.10,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
          {
            id: `opec-leg-${Date.now()}-2`,
            type: 'call',
            action: 'buy',
            strike: strikeBase + 3,
            expiration: 'Oct 16, 2026',
            dte: 16,
            iv: (selectedEvent.ivPeakPreMeeting + 3) / 100,
            premium: 1.35,
            contracts: 1,
            multiplier: 1000,
            underlyingSymbol: '/CL',
          },
        ];
      }
      onApplyStrategyLegs(newLegs);
    }
    onNavigateToValuation();
  };

  const activePoint = hoveredPointIndex !== null ? timeline[hoveredPointIndex] : timeline[timeline.length - 1];

  return (
    <div className="flex flex-col gap-3 font-mono text-xs select-none w-full max-w-full ml-0 mr-auto text-left pb-6">
      {/* Top Banner & Institutional Context */}
      <div className="bg-[#0c1017] border border-[#ff9900]/40 rounded p-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(255,153,0,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#ff9900]/15 border border-[#ff9900]/50 flex items-center justify-center text-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.2)]">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-sm tracking-wide">
                OPEC+ MEETINGS &amp; CRUDE IMPLIED VOLATILITY (OVX) INTELLIGENCE
              </span>
              <span className="bg-[#ff9900] text-black text-[10px] font-black px-1.5 py-0.2 rounded">
                ENERGY MACRO
              </span>
              <span className="text-[#888] text-[11px]">CME /CL 1,000 bbl</span>
            </div>
            <div className="text-[#8b9bb4] text-[11px] mt-0.5">
              Quantitative analysis of Pre-Meeting IV Run-up, Post-Decision IV Crush, Straddle Pricing &amp; Production Quota Asymmetry.
            </div>
          </div>
        </div>

        {/* Quick Underlying Commodity Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-[#141b2a] border border-[#222d44] px-2.5 py-1 rounded">
          <span className="text-[#888] text-[10px] font-bold">ENERGY ASSETS:</span>
          {['/CL', 'BP', 'XOM', 'CVX', 'OXY', 'XLE'].map((sym) => {
            const isSel = currentTicker.symbol === sym;
            return (
              <button
                key={sym}
                onClick={() => {
                  playKeyClick();
                  onSelectTicker(sym);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  isSel
                    ? 'bg-[#ff9900] text-black font-extrabold shadow-[0_0_6px_rgba(255,153,0,0.4)]'
                    : 'bg-[#1b2333] text-[#aaa] hover:text-white hover:bg-[#253046]'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#8b9bb4] text-[10px] font-bold flex items-center justify-between">
            <span>NEXT OPEC EVENT</span>
            <Calendar className="w-3 h-3 text-[#ff9900]" />
          </div>
          <div className="mt-1">
            <div className="text-white font-extrabold text-sm flex items-center gap-1.5">
              <span>{OPEC_AGGREGATE_STATS.nextMeetingDate}</span>
              <span className="bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 text-[9px] px-1 rounded font-bold">
                T-{OPEC_AGGREGATE_STATS.daysToNextMeeting}d
              </span>
            </div>
            <div className="text-[#ff9900] text-[10px] font-semibold truncate mt-0.5">57th JMMC Review</div>
          </div>
        </div>

        <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#8b9bb4] text-[10px] font-bold flex items-center justify-between">
            <span>WTI CRUDE (/CL) SPOT</span>
            <Activity className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1">
            <div className="text-white font-extrabold text-sm">
              ${wtiSpot.toFixed(2)}{' '}
              <span className="text-[10px] text-[#00e676] font-semibold">
                +{currentTicker.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-[#888] text-[10px]">$1,000/pt · CME Physical</div>
          </div>
        </div>

        <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#8b9bb4] text-[10px] font-bold flex items-center justify-between">
            <span>CBOE OVX INDEX</span>
            <TrendingUp className="w-3 h-3 text-[#ff9900]" />
          </div>
          <div className="mt-1">
            <div className="text-[#ff9900] font-extrabold text-sm">
              {OPEC_AGGREGATE_STATS.currentOvx.toFixed(1)}%
            </div>
            <div className="text-[#8b9bb4] text-[10px]">
              {OPEC_AGGREGATE_STATS.currentOvxPercentile}th Percentile (Elevated)
            </div>
          </div>
        </div>

        <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#8b9bb4] text-[10px] font-bold flex items-center justify-between">
            <span>AVG PRE-MEET IV RUN-UP</span>
            <Zap className="w-3 h-3 text-[#00e676]" />
          </div>
          <div className="mt-1">
            <div className="text-[#00e676] font-extrabold text-sm">
              +{OPEC_AGGREGATE_STATS.avgPreMeetingRunUpPts.toFixed(1)} pts
            </div>
            <div className="text-[#8b9bb4] text-[10px]">
              +{OPEC_AGGREGATE_STATS.avgPreMeetingRunUpPct.toFixed(1)}% over 10 sessions
            </div>
          </div>
        </div>

        <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#8b9bb4] text-[10px] font-bold flex items-center justify-between">
            <span>AVG POST-MEET IV CRUSH</span>
            <TrendingDown className="w-3 h-3 text-[#ff334b]" />
          </div>
          <div className="mt-1">
            <div className="text-[#ff334b] font-extrabold text-sm">
              {OPEC_AGGREGATE_STATS.avgPostMeetingCrushPts.toFixed(1)} pts
            </div>
            <div className="text-[#8b9bb4] text-[10px]">
              {OPEC_AGGREGATE_STATS.avgPostMeetingCrushPct.toFixed(1)}% 24h deflation
            </div>
          </div>
        </div>

        <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#8b9bb4] text-[10px] font-bold flex items-center justify-between">
            <span>SHORT STRADDLE WIN RATE</span>
            <Shield className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1">
            <div className="text-cyan-400 font-extrabold text-sm">
              {OPEC_AGGREGATE_STATS.shortStraddleWinRate.toFixed(1)}%
            </div>
            <div className="text-[#8b9bb4] text-[10px]">
              Implied ±5.4% vs Realized ±3.8%
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Event Selector & Details | Right Interactive IV Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Event Browser & Selector */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-2 mb-2">
              <span className="text-white font-extrabold text-xs flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#ff9900]" />
                MEETING &amp; EVENT ARCHIVE
              </span>
              <span className="text-[#888] text-[10px]">{OPEC_MEETINGS_DATA.length} Events Logged</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 mb-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { label: 'ALL', val: 'ALL' },
                { label: 'UPCOMING', val: 'UPCOMING' },
                { label: 'SUMMITS', val: 'ONOMM' },
                { label: 'SURPRISES', val: 'EXTRAORDINARY' },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => {
                    playKeyClick();
                    setFilterType(f.val as any);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    filterType === f.val
                      ? 'bg-[#ff9900] text-black font-extrabold'
                      : 'bg-[#141b2a] text-[#888] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Event List */}
            <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredEvents.map((evt) => {
                const isSelected = evt.id === selectedEventId;
                const isUpcoming = evt.status === 'upcoming';
                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      playKeyClick();
                      setSelectedEventId(evt.id);
                    }}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#182236] border-[#ff9900] text-white shadow-[0_0_8px_rgba(255,153,0,0.25)]'
                        : 'bg-[#0a0e17] border-[#182030] text-[#a0aec0] hover:bg-[#121927] hover:border-[#2a364f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isUpcoming
                              ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 animate-pulse'
                              : 'bg-[#1e2638] text-[#8b9bb4]'
                          }`}
                        >
                          {isUpcoming ? `T-${evt.daysToEvent}d UPCOMING` : evt.date}
                        </span>
                        <span className="text-[10px] text-[#ff9900] font-semibold">{evt.typeLabel}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8b9bb4]">
                        Peak IV: <strong className="text-white">{evt.ivPeakPreMeeting.toFixed(1)}%</strong>
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-white line-clamp-1">{evt.name}</div>

                    <div className="flex items-center justify-between text-[10px] mt-1.5 pt-1 border-t border-[#1e2638]/70 text-[#8b9bb4]">
                      <span className="flex items-center gap-1">
                        IV Crush:{' '}
                        <strong
                          className={evt.ivCrushPts < 0 ? 'text-[#ff334b]' : 'text-[#00e676]'}
                        >
                          {evt.ivCrushPts > 0 ? '+' : ''}
                          {evt.ivCrushPts.toFixed(1)} pts ({evt.ivCrushPct.toFixed(0)}%)
                        </strong>
                      </span>
                      <span>
                        Spot Move:{' '}
                        {evt.wtiChangePct !== undefined ? (
                          <strong
                            className={evt.wtiChangePct >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}
                          >
                            {evt.wtiChangePct >= 0 ? '+' : ''}
                            {evt.wtiChangePct.toFixed(2)}%
                          </strong>
                        ) : (
                          <strong className="text-cyan-400">±{evt.impliedMovePct.toFixed(1)}% Impl</strong>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Policy & Driver Summary Card */}
          <div className="bg-[#0f1422] border border-[#1e2638] rounded p-2.5">
            <div className="text-[#ff9900] font-bold text-xs mb-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>STATED POLICY &amp; DECISION DRIVERS</span>
            </div>
            <div className="text-white text-[11px] font-semibold leading-relaxed mb-2">
              {selectedEvent.quotaAction}
            </div>
            <div className="text-[#8b9bb4] text-[10px] leading-relaxed mb-2 bg-[#090d14] p-2 rounded border border-[#192234]">
              {selectedEvent.policySummary}
            </div>
            <div className="space-y-1">
              {selectedEvent.keyDrivers.map((driver, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-[#ccd5e2]">
                  <span className="text-[#ff9900] font-bold">•</span>
                  <span>{driver}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Volatility Chart & Evolution Breakdown */}
        <div className="lg:col-span-8 flex flex-col gap-2.5">
          {/* Chart Header & Controls */}
          <div className="bg-[#0f1422] border border-[#1e2638] rounded p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold text-sm">{selectedEvent.name}</span>
                  <span className="bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 text-[9px] px-1.5 py-0.2 rounded font-bold">
                    {selectedEvent.status === 'upcoming' ? 'EVENT PROJECTION' : 'HISTORICAL EVENT REPLAY'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#8b9bb4] mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#ff9900]" />
                    {selectedEvent.date} @ {selectedEvent.decisionTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    {selectedEvent.location}
                  </span>
                </div>
              </div>

              {/* Chart Mode Switcher */}
              <div className="flex items-center gap-1 bg-[#141b2a] border border-[#222d44] p-0.5 rounded">
                <button
                  onClick={() => {
                    playKeyClick();
                    setChartMode('iv_vs_price');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    chartMode === 'iv_vs_price'
                      ? 'bg-[#ff9900] text-black font-extrabold'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  IV vs. SPOT PRICE
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setChartMode('call_vs_put_skew');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    chartMode === 'call_vs_put_skew'
                      ? 'bg-[#ff9900] text-black font-extrabold'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  25D CALL vs. PUT SKEW
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setChartMode('straddle_decay');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    chartMode === 'straddle_decay'
                      ? 'bg-[#ff9900] text-black font-extrabold'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  STRADDLE DECAY ($)
                </button>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="relative bg-[#090d14] border border-[#192234] rounded p-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto overflow-visible select-none"
              >
                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = padding.top + innerHeight * ratio;
                  const ivVal = maxIv - ratio * (maxIv - minIv);
                  const priceVal = maxPrice - ratio * (maxPrice - minPrice);
                  return (
                    <g key={idx}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke="#1a2336"
                        strokeDasharray="2,2"
                      />
                      {/* Left Y Axis Label (IV %) */}
                      <text
                        x={padding.left - 6}
                        y={y + 3}
                        fill="#ff9900"
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {ivVal.toFixed(0)}%
                      </text>
                      {/* Right Y Axis Label (Price $) */}
                      <text
                        x={chartWidth - padding.right + 6}
                        y={y + 3}
                        fill="#00d2ff"
                        fontSize="9"
                        textAnchor="start"
                        fontFamily="monospace"
                      >
                        ${priceVal.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Event Decision Marker Line */}
                {decisionIndex !== -1 && (
                  <g>
                    <line
                      x1={getX(decisionIndex)}
                      y1={padding.top}
                      x2={getX(decisionIndex)}
                      y2={chartHeight - padding.bottom}
                      stroke="#ff334b"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                    <rect
                      x={getX(decisionIndex) - 45}
                      y={padding.top - 18}
                      width={90}
                      height={16}
                      fill="#ff334b"
                      rx="2"
                    />
                    <text
                      x={getX(decisionIndex)}
                      y={padding.top - 6}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      DECISION DAY 0
                    </text>
                  </g>
                )}

                {/* Mode 1: IV Line vs Price Line */}
                {chartMode === 'iv_vs_price' && (
                  <>
                    {/* Price Line (Cyan) */}
                    <path
                      d={pricePath}
                      fill="none"
                      stroke="#00d2ff"
                      strokeWidth="2"
                      strokeOpacity="0.85"
                    />
                    {/* IV Line (Amber Glowing) */}
                    <path
                      d={ivPath}
                      fill="none"
                      stroke="#ff9900"
                      strokeWidth="2.5"
                      className="drop-shadow-[0_0_8px_rgba(255,153,0,0.5)]"
                    />
                  </>
                )}

                {/* Mode 2: Call Skew vs Put Skew */}
                {chartMode === 'call_vs_put_skew' && (
                  <>
                    <path
                      d={callSkewPath}
                      fill="none"
                      stroke="#00e676"
                      strokeWidth="2"
                      strokeDasharray="4,2"
                    />
                    <path
                      d={putSkewPath}
                      fill="none"
                      stroke="#ff334b"
                      strokeWidth="2"
                      strokeDasharray="4,2"
                    />
                    <path
                      d={ivPath}
                      fill="none"
                      stroke="#ff9900"
                      strokeWidth="2.5"
                    />
                  </>
                )}

                {/* Mode 3: Straddle Decay Curve */}
                {chartMode === 'straddle_decay' && (
                  <>
                    <path
                      d={straddlePath}
                      fill="none"
                      stroke="#ffd600"
                      strokeWidth="2.5"
                      className="drop-shadow-[0_0_8px_rgba(255,214,0,0.5)]"
                    />
                  </>
                )}

                {/* Timeline Data Points & Hit Targets */}
                {timeline.map((p, idx) => {
                  const x = getX(idx);
                  const y = chartMode === 'straddle_decay' ? getYStraddle(p.straddlePrice) : getYIv(p.iv);
                  const isHovered = hoveredPointIndex === idx;
                  const isPeak = p.iv === selectedEvent.ivPeakPreMeeting;
                  const isDecision = p.dayOffset === 0;

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Transparent wider hit area */}
                      <circle cx={x} cy={y} r="14" fill="transparent" />

                      {/* Point Marker */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? '6' : isPeak ? '5' : '3.5'}
                        fill={isDecision ? '#ff334b' : isPeak ? '#ff9900' : '#ffffff'}
                        stroke="#05070a"
                        strokeWidth="1.5"
                      />

                      {/* Bottom X-Axis Labels */}
                      <text
                        x={x}
                        y={chartHeight - padding.bottom + 14}
                        fill={isDecision ? '#ff334b' : isHovered ? '#ffffff' : '#8b9bb4'}
                        fontSize="8.5"
                        fontWeight={isDecision || isHovered ? 'bold' : 'normal'}
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {p.dayLabel}
                      </text>
                      <text
                        x={x}
                        y={chartHeight - padding.bottom + 24}
                        fill="#55647a"
                        fontSize="7.5"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {p.date}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Hover Crosshair */}
                {hoveredPointIndex !== null && (
                  <line
                    x1={getX(hoveredPointIndex)}
                    y1={padding.top}
                    x2={getX(hoveredPointIndex)}
                    y2={chartHeight - padding.bottom}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                )}
              </svg>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between text-[10px] mt-2 pt-1.5 border-t border-[#1e2638] px-1 text-[#8b9bb4]">
                <div className="flex items-center gap-4">
                  {chartMode === 'iv_vs_price' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#ff9900] rounded" />
                        <span className="text-[#ff9900] font-bold">Implied Volatility (IV %)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#00d2ff] rounded" />
                        <span className="text-[#00d2ff] font-bold">/CL Crude Spot Price ($/bbl)</span>
                      </div>
                    </>
                  )}
                  {chartMode === 'call_vs_put_skew' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#00e676] rounded" />
                        <span className="text-[#00e676] font-bold">25-Delta Call IV (%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#ff334b] rounded" />
                        <span className="text-[#ff334b] font-bold">25-Delta Put IV (%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-[#ff9900] rounded" />
                        <span className="text-[#ff9900] font-bold">ATM IV (%)</span>
                      </div>
                    </>
                  )}
                  {chartMode === 'straddle_decay' && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-[#ffd600] rounded" />
                      <span className="text-[#ffd600] font-bold">ATM Front-Month Straddle Cost ($)</span>
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-[#888]">
                  Hover over points to inspect event step commentary
                </div>
              </div>
            </div>

            {/* Hovered / Active Point Details Banner */}
            <div className="bg-[#121927] border border-[#222d44] rounded p-2.5 mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#1a2336] px-2.5 py-1 rounded text-center border border-[#2b3a56]">
                  <div className="text-[#888] text-[9px]">STEP</div>
                  <div className="text-white font-extrabold text-xs">{activePoint.dayLabel}</div>
                  <div className="text-[#8b9bb4] text-[9px]">{activePoint.date}</div>
                </div>
                <div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-[#ff9900]">IV: {activePoint.iv.toFixed(1)}%</span>
                    <span className="text-cyan-400">Spot: ${activePoint.wtiPrice.toFixed(2)}</span>
                    <span className="text-[#ffd600]">Straddle: ${activePoint.straddlePrice.toFixed(2)}</span>
                    <span className="text-[#8b9bb4]">OVX: {activePoint.ovxIndex.toFixed(1)}</span>
                  </div>
                  <div className="text-[#a0aec0] text-[10px] mt-0.5">
                    {activePoint.commentary}
                  </div>
                </div>
              </div>

              {/* Call Skew vs Put Skew Readout */}
              <div className="flex items-center gap-2 text-[10px] bg-[#090d14] px-2 py-1 rounded border border-[#192234] shrink-0">
                <span className="text-[#888]">Skew:</span>
                <span className="text-[#00e676]">25D C: {activePoint.callSkewIv.toFixed(1)}%</span>
                <span className="text-[#888]">vs</span>
                <span className="text-[#ff334b]">25D P: {activePoint.putSkewIv.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Pre-Meeting IV Velocity & Strategy Playbook */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Box 1: Quantitative Volatility Mechanics */}
            <div className="bg-[#0f1422] border border-[#1e2638] rounded p-3">
              <div className="text-white font-extrabold text-xs mb-2 flex items-center justify-between border-b border-[#1e2638] pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#ff9900]" />
                  VOLATILITY TRAJECTORY BREAKDOWN
                </span>
                <span className="text-[#888] text-[10px]">T-15d to T+1d</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center p-1.5 bg-[#0a0e17] rounded border border-[#182030]">
                  <span className="text-[#8b9bb4]">Baseline IV (-15 Days Out):</span>
                  <span className="text-white font-bold">{selectedEvent.iv15dPrior.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-[#0a0e17] rounded border border-[#182030]">
                  <span className="text-[#8b9bb4]">Peak Pre-Meeting IV (-1 Day Out):</span>
                  <span className="text-[#ff9900] font-extrabold">{selectedEvent.ivPeakPreMeeting.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-[#0a0e17] rounded border border-[#182030]">
                  <span className="text-[#8b9bb4]">Pre-Event IV Run-Up:</span>
                  <span className="text-[#00e676] font-bold">
                    +{selectedEvent.ivRunUpPts.toFixed(1)} pts (+{((selectedEvent.ivRunUpPts / selectedEvent.iv15dPrior) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-[#0a0e17] rounded border border-[#182030]">
                  <span className="text-[#8b9bb4]">Post-Announcement IV Crush (+1 Day):</span>
                  <span className={selectedEvent.ivCrushPts < 0 ? 'text-[#ff334b] font-extrabold' : 'text-[#00e676] font-extrabold'}>
                    {selectedEvent.ivCrushPts > 0 ? '+' : ''}{selectedEvent.ivCrushPts.toFixed(1)} pts ({selectedEvent.ivCrushPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-[#0a0e17] rounded border border-[#1e2638]">
                  <span className="text-[#8b9bb4]">Priced Straddle Move vs Realized:</span>
                  <span className="font-bold text-white">
                    Implied ±{selectedEvent.impliedMovePct.toFixed(1)}% vs Realized {selectedEvent.realizedMovePct !== undefined ? `±${selectedEvent.realizedMovePct.toFixed(2)}%` : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Skew Insight Badge */}
              <div className="mt-3 p-2 bg-[#ff9900]/10 border border-[#ff9900]/30 rounded text-[10px] text-[#ff9900] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Skew Note:</strong> {selectedEvent.skewOrientation === 'CALL_SKEW_ELEVATED'
                    ? 'Upside Call skew trades at a premium over Puts due to fears of surprise unilateral Saudi/OPEC supply curtailments.'
                    : selectedEvent.skewOrientation === 'PUT_SKEW_ELEVATED'
                    ? 'Downside Put skew dominates as market fears economic recession demand destruction outstripping quota curbs.'
                    : 'Balanced symmetric volatility smile into weekly inventory reporting.'}
                </span>
              </div>
            </div>

            {/* Box 2: Actionable Strategy Playbook */}
            <div className="bg-[#0f1422] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
              <div>
                <div className="text-white font-extrabold text-xs mb-2 flex items-center justify-between border-b border-[#1e2638] pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    RECOMMENDED OPEC OPTIONS STRATEGIES
                  </span>
                  <span className="text-[#888] text-[10px]">1-Click Execution</span>
                </div>

                <div className="space-y-2">
                  {selectedEvent.recommendedStrategies.map((strat, i) => (
                    <div
                      key={i}
                      className="p-2 bg-[#0a0e17] border border-[#182030] rounded hover:border-[#ff9900]/50 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold text-[11px]">{strat.name}</span>
                        <span className="bg-[#1e2638] text-cyan-400 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                          {strat.riskProfile}
                        </span>
                      </div>
                      <div className="text-[#8b9bb4] text-[10px] mb-1.5">{strat.description}</div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-[#ff9900] font-mono">{strat.legs}</span>
                        <button
                          onClick={() => handleLoadStrategy(strat)}
                          className="bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all"
                        >
                          <span>Load Strategy</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Link to Standard Options Chain */}
              <div className="mt-3 pt-2 border-t border-[#1e2638] flex items-center justify-between">
                <span className="text-[#888] text-[10px]">Trade /CL Crude Oil Options:</span>
                <button
                  onClick={() => {
                    playKeyClick();
                    if (currentTicker.symbol !== '/CL') onSelectTicker('/CL');
                    onNavigateToChain();
                  }}
                  className="bg-[#141b2a] hover:bg-[#1f293d] border border-[#2b3a56] text-[#00d2ff] hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  <span>Open /CL Option Chain (OMON)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
