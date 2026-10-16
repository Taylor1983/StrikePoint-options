import React, { useState, useMemo } from 'react';
import {
  OPTIONS_STRATEGY_EDUCATION_LIST,
  VOLATILITY_SKEW_LESSONS,
  EVENT_RISK_SAMPLE_CASES,
  GREEKS_TERM_STRUCTURE_SYLLABUS,
  diagnoseOptionValuation,
  StrategyEducationCard,
} from '../services/optionsEducationData';
import { Ticker, TradeLeg } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Zap,
  Target,
  Shield,
  HelpCircle,
  Percent,
  Sliders,
  DollarSign,
  AlertTriangle,
  Compass,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Info,
  Calendar,
  Flame,
  Award,
} from 'lucide-react';

interface OptionsEducationViewProps {
  currentTicker: Ticker;
  allTickers?: Record<string, Ticker>;
  onStageStrategy?: (legs: TradeLeg[], tickerSymbol: string) => void;
  onNavigateToChain?: (symbol: string) => void;
  onNavigateToRisk?: (legs: TradeLeg[], tickerSymbol: string) => void;
  onNavigateToVolLab?: () => void;
  onPopOut?: () => void;
}

type AcademyTab =
  | 'strategies'
  | 'skew'
  | 'event_risk'
  | 'probability'
  | 'greeks_term'
  | 'valuation_diagnostic';

export const OptionsEducationView: React.FC<OptionsEducationViewProps> = ({
  currentTicker,
  allTickers = {},
  onStageStrategy,
  onNavigateToChain,
  onNavigateToRisk,
  onNavigateToVolLab,
  onPopOut,
}) => {
  const [activeTab, setActiveTab] = useState<AcademyTab>('strategies');

  // Strategy Payoff Visualizer State
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('iron-condor');
  const [simulatedPriceOffsetPct, setSimulatedPriceOffsetPct] = useState<number>(0);

  // Skew Lesson Selected
  const [selectedSkewLessonId, setSelectedSkewLessonId] = useState<string>('equity-put-smirk');

  // Greek Term Structure Selected
  const [selectedGreek, setSelectedGreek] = useState<'DELTA' | 'GAMMA' | 'THETA' | 'VEGA' | 'RHO'>('GAMMA');

  // Diagnostic Scanner State
  const [diagTicker, setDiagTicker] = useState<string>(currentTicker.symbol || 'SPY');
  const [customIv, setCustomIv] = useState<number>(
    currentTicker.currentIV ? Math.round(currentTicker.currentIV * 100) : 28
  );
  const [customHv, setCustomHv] = useState<number>(20);
  const [customIvr, setCustomIvr] = useState<number>(currentTicker.ivRank ?? 62);

  // Interactive Expected Move Calculator State
  const [calcSpot, setCalcSpot] = useState<number>(currentTicker.price || 120);
  const [calcIv, setCalcIv] = useState<number>(currentTicker.currentIV ? Math.round(currentTicker.currentIV * 100) : 45);
  const [calcDte, setCalcDte] = useState<number>(7);

  // Current selected strategy
  const activeStrategy = useMemo(() => {
    return (
      OPTIONS_STRATEGY_EDUCATION_LIST.find((s) => s.id === selectedStrategyId) ||
      OPTIONS_STRATEGY_EDUCATION_LIST[0]
    );
  }, [selectedStrategyId]);

  // Current spot for strategy simulation
  const spotPrice = currentTicker.price || 100;
  const simulatedSpot = spotPrice * (1 + simulatedPriceOffsetPct / 100);

  // Strategy Payoff Points
  const payoffData = useMemo(() => {
    return activeStrategy.getPayoffPoints(spotPrice);
  }, [activeStrategy, spotPrice]);

  // Expected move calculation results
  const expectedMoveDollars = useMemo(() => {
    return Number((calcSpot * (calcIv / 100) * Math.sqrt(Math.max(1, calcDte) / 365)).toFixed(2));
  }, [calcSpot, calcIv, calcDte]);

  const expectedMovePct = useMemo(() => {
    return Number(((expectedMoveDollars / (calcSpot || 1)) * 100).toFixed(2));
  }, [expectedMoveDollars, calcSpot]);

  // Diagnostic result
  const diagnosticResult = useMemo(() => {
    const tick = allTickers[diagTicker] || currentTicker;
    const spot = tick.price || 100;
    return diagnoseOptionValuation(
      diagTicker,
      spot,
      customIv,
      customHv,
      customIvr,
      Math.min(100, Math.round(customIvr * 0.95))
    );
  }, [diagTicker, customIv, customHv, customIvr, allTickers, currentTicker]);

  // Handle stage strategy to builder
  const handleStageActiveStrategy = () => {
    playExecutionChime();
    const legs = activeStrategy.exampleLegs(spotPrice);
    if (onStageStrategy) {
      onStageStrategy(legs, currentTicker.symbol);
    } else if (onNavigateToRisk) {
      onNavigateToRisk(legs, currentTicker.symbol);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] text-[#cbd5e1] font-mono text-xs overflow-y-auto select-none p-3 gap-3">
      {/* ========================================================
          1. HEADER & COMMAND BAR
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900] shadow-[0_0_14px_rgba(255,153,0,0.3)]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-black text-sm tracking-wider">
                OPTIONS ACADEMY &amp; DERIVATIVES MASTERCLASS
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 font-bold">
                &lt;EDUC&gt;
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 font-bold">
                INSTITUTIONAL QUANTITATIVE SYLLABUS
              </span>
            </div>
            <p className="text-[#8b9bb4] text-[10.5px]">
              Interactive Strategy Risk Profiles · Volatility Skews &amp; Smirks · Binary Event Risk &amp; IV Crush · Probability Pricing · Greeks Term Structure · Over/Undervalued Scanner
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onNavigateToVolLab && (
            <button
              onClick={onNavigateToVolLab}
              className="px-2.5 py-1 bg-[#141b2a] hover:bg-[#1a2336] text-[#00e5ff] border border-[#00e5ff]/40 rounded text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title="Open Volatility Lab & Skew Engine <VOLS>"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>VOL LAB &lt;VOLS&gt;</span>
            </button>
          )}

          {onPopOut && (
            <button
              onClick={onPopOut}
              className="p-1 rounded bg-[#141b2a] hover:bg-[#1e2638] text-[#00e5ff] border border-[#00e5ff]/40 cursor-pointer"
              title="Pop out Options Academy in a floating window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          2. MASTERCLASS NAVIGATION TABS (6 KEY MODULES)
      ======================================================== */}
      <div className="flex items-center gap-1.5 bg-[#0b0f19] border border-[#1e2638] p-1.5 rounded-lg overflow-x-auto no-scrollbar shadow">
        {[
          { id: 'strategies', label: '1. STRATEGIES & RISK PROFILES', icon: Layers, desc: 'Interactive Payoffs & Wings' },
          { id: 'skew', label: '2. VOLATILITY SKEWS & SMIRKS', icon: Sliders, desc: 'Equity Put Skew vs Call Inversions' },
          { id: 'event_risk', label: '3. EVENT RISK & IV CRUSH', icon: AlertTriangle, desc: 'Earnings Traps & Expected Moves' },
          { id: 'probability', label: '4. PROBABILITY & PRICING', icon: Target, desc: 'Normal Distribution & POP vs POT' },
          { id: 'greeks_term', label: '5. GREEKS TERM STRUCTURE', icon: Compass, desc: 'Delta, Gamma, Theta, Vega Decay' },
          { id: 'valuation_diagnostic', label: '6. OVER / UNDERVALUED SCANNER', icon: Award, desc: 'IV vs HV Diagnostic Engine' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playKeyClick();
                setActiveTab(tab.id as AcademyTab);
              }}
              className={`px-3 py-1.5 rounded text-[11px] font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#ff9900] text-black shadow-[0_0_12px_rgba(255,153,0,0.4)]'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          MODULE 1: STRATEGIES WITH INTERACTIVE RISK PROFILES
      ======================================================== */}
      {activeTab === 'strategies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Col 1-4: Strategy Selector Menu */}
          <div className="lg:col-span-4 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2 shadow-lg max-h-[720px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5 text-[#8b9bb4] text-[10px] font-bold">
              <span>SELECT DERIVATIVES STRATEGY</span>
              <span className="text-[#ff9900]">{OPTIONS_STRATEGY_EDUCATION_LIST.length} Pre-Modeled</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {OPTIONS_STRATEGY_EDUCATION_LIST.map((strat) => {
                const isSelected = strat.id === selectedStrategyId;
                return (
                  <div
                    key={strat.id}
                    onClick={() => {
                      playKeyClick();
                      setSelectedStrategyId(strat.id);
                      setSimulatedPriceOffsetPct(0);
                    }}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-[#ff9900]/15 border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.25)]'
                        : 'bg-[#070a13] border-[#161f30] hover:border-[#8b9bb4]/40 hover:bg-[#0d1322]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-xs ${isSelected ? 'text-[#ff9900]' : 'text-white'}`}>
                        {strat.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                          strat.bias === 'BULLISH'
                            ? 'bg-[#00e676]/20 text-[#00e676]'
                            : strat.bias === 'BEARISH'
                            ? 'bg-[#ff334b]/20 text-[#ff334b]'
                            : 'bg-[#00e5ff]/20 text-[#00e5ff]'
                        }`}
                      >
                        {strat.bias}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9.5px] text-[#8b9bb4]">
                      <span>POP: <strong className="text-white">{strat.popRange}</strong></span>
                      <span className={strat.thetaBias === 'POSITIVE_THETA' ? 'text-[#00e676]' : 'text-[#ff9900]'}>
                        {strat.thetaBias === 'POSITIVE_THETA' ? '+Θ Decay' : '-Θ Decay'}
                      </span>
                      <span className="text-[#c084fc]">{strat.volatilityBias.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 5-12: Interactive Payoff Visualizer & Strategy Masterclass */}
          <div className="lg:col-span-8 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 flex flex-col gap-3 shadow-lg">
            {/* Header with Stage Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black text-base">{activeStrategy.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e293b] text-[#cbd5e1] border border-[#334155] font-bold">
                    {activeStrategy.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                  Typical Expiration: <strong className="text-white">{activeStrategy.typicalDte}</strong> &bull; Ideal IV Regime: <strong className="text-[#facc15]">{activeStrategy.idealIvEnvironment.replace('_', ' ')}</strong>
                </div>
              </div>

              <button
                onClick={handleStageActiveStrategy}
                className="px-3.5 py-1.5 bg-[#ff9900] hover:bg-[#e68a00] text-black font-black rounded text-[11px] flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>STAGE IN BUILDER &lt;OVME&gt;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive SVG Payoff Diagram */}
            <div className="bg-[#06080e] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10.5px]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-extrabold flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-[#00e676] inline-block" />
                    <span>T+Exp Payoff Line</span>
                  </span>
                  <span className="text-[#00e5ff] font-extrabold flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-[#00e5ff] inline-block border-t border-dashed" />
                    <span>T+0 Greek Curvature</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[#8b9bb4]">
                  <span>Underlying Price: <strong className="text-white">${simulatedSpot.toFixed(2)}</strong></span>
                  <span className={simulatedPriceOffsetPct >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                    ({simulatedPriceOffsetPct >= 0 ? '+' : ''}{simulatedPriceOffsetPct}%)
                  </span>
                </div>
              </div>

              {/* Payoff Graph */}
              <div className="h-56 w-full relative flex items-center justify-center">
                {payoffData.length > 0 && (() => {
                  const prices = payoffData.map((d) => d.price);
                  const pnls = payoffData.map((d) => d.pnlExp);
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  const maxPnl = Math.max(200, ...pnls);
                  const minPnl = Math.min(-200, ...pnls);
                  const pnlRange = maxPnl - minPnl || 1;

                  const getX = (p: number) => 35 + ((p - minPrice) / (maxPrice - minPrice || 1)) * 630;
                  const getY = (val: number) => 190 - ((val - minPnl) / pnlRange) * 165;

                  const zeroY = getY(0);

                  const expPoints = payoffData.map((d) => `${getX(d.price).toFixed(1)},${getY(d.pnlExp).toFixed(1)}`).join(' ');
                  const t0Points = payoffData.map((d) => `${getX(d.price).toFixed(1)},${getY(d.pnlT0).toFixed(1)}`).join(' ');

                  // Current Simulated Point on curve
                  const currentSimPrice = simulatedSpot;
                  const currentSimX = getX(currentSimPrice);

                  return (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200">
                      {/* Zero P&L Axis */}
                      <line x1="30" y1={zeroY} x2="675" y2={zeroY} stroke="#334155" strokeWidth="1.2" strokeDasharray="3 3" />
                      <text x="680" y={zeroY + 3} fill="#64748b" fontSize="9" textAnchor="start">
                        $0 P&amp;L
                      </text>

                      {/* T+Exp Payoff Line */}
                      <polyline points={expPoints} fill="none" stroke="#00e676" strokeWidth="2.5" />

                      {/* T+0 Curved Line */}
                      <polyline points={t0Points} fill="none" stroke="#00e5ff" strokeWidth="1.8" strokeDasharray="4 2" />

                      {/* Simulated Spot Vertical Marker */}
                      <line x1={currentSimX} y1="15" x2={currentSimX} y2="190" stroke="#ff9900" strokeWidth="1.5" strokeDasharray="2 2" />
                      <circle cx={currentSimX} cy={zeroY} r="3.5" fill="#ff9900" />
                      <text x={currentSimX} y="12" fill="#ff9900" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                        ${currentSimPrice.toFixed(1)}
                      </text>
                    </svg>
                  );
                })()}
              </div>

              {/* Price Simulation Slider */}
              <div className="flex items-center gap-3 bg-[#0a0f1d] p-2 rounded border border-[#162033]">
                <span className="text-[10px] text-[#8b9bb4] whitespace-nowrap font-bold">
                  SIMULATE STOCK PRICE MOVE:
                </span>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.5"
                  value={simulatedPriceOffsetPct}
                  onChange={(e) => setSimulatedPriceOffsetPct(parseFloat(e.target.value))}
                  className="w-full accent-[#ff9900] cursor-pointer"
                />
                <button
                  onClick={() => setSimulatedPriceOffsetPct(0)}
                  className="px-2 py-0.5 rounded bg-[#1e2638] text-[9.5px] hover:text-white"
                >
                  RESET
                </button>
              </div>
            </div>

            {/* Metrics & Breakevens Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div className="bg-[#070a13] p-2.5 rounded border border-[#1e2638]">
                <span className="text-[#8b9bb4] block text-[9px]">MAX PROFIT</span>
                <strong className="text-[#00e676] text-xs">{activeStrategy.maxProfitDesc}</strong>
              </div>
              <div className="bg-[#070a13] p-2.5 rounded border border-[#1e2638]">
                <span className="text-[#8b9bb4] block text-[9px]">MAX LOSS / RISK</span>
                <strong className="text-[#ff334b] text-xs">{activeStrategy.maxLossDesc}</strong>
              </div>
              <div className="bg-[#070a13] p-2.5 rounded border border-[#1e2638]">
                <span className="text-[#8b9bb4] block text-[9px]">BREAKEVEN FORMULA</span>
                <strong className="text-[#00e5ff] text-[10px]">{activeStrategy.breakevenFormula}</strong>
              </div>
              <div className="bg-[#070a13] p-2.5 rounded border border-[#1e2638]">
                <span className="text-[#8b9bb4] block text-[9px]">EST. POP (WIN RATE)</span>
                <strong className="text-[#facc15] text-xs">{activeStrategy.popRange}</strong>
              </div>
            </div>

            {/* Playbook Cards: Best Used For & Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
              <div className="bg-[#070a13] p-3 rounded border border-[#1e2638] flex flex-col gap-1">
                <span className="text-[#00e676] font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OPTIMAL USAGE &amp; EDGE</span>
                </span>
                <p className="text-[#cbd5e1] leading-relaxed">{activeStrategy.bestUsedFor}</p>
              </div>

              <div className="bg-[#070a13] p-3 rounded border border-[#1e2638] flex flex-col gap-1">
                <span className="text-[#ff9900] font-bold text-[10px] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>MANAGEMENT &amp; EXIT DISCIPLINE</span>
                </span>
                <p className="text-[#cbd5e1] leading-relaxed">{activeStrategy.managementRules}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODULE 2: VOLATILITY SKEWS & SMIRKS
      ======================================================== */}
      {activeTab === 'skew' && (
        <div className="flex flex-col gap-3">
          {/* Top Banner */}
          <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 shadow flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#ff9900]" />
              <h3 className="text-white font-extrabold text-sm">
                THE GEOMETRY OF VOLATILITY SKEW: SMIRKS, SMILES &amp; SQUEEZE INVERSIONS
              </h3>
            </div>
            <p className="text-[#cbd5e1] text-[11px] leading-relaxed">
              Black-Scholes originally assumed constant volatility across all strike prices (a flat line). The 1987 crash proved that markets price crash risk asymmetrically. Today, options traders trade the <strong>volatility surface geometry</strong> — harvesting edge from over-demanded wings.
            </p>
          </div>

          {/* Interactive Skew Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {VOLATILITY_SKEW_LESSONS.map((lesson) => {
              const isSelected = selectedSkewLessonId === lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => {
                    playKeyClick();
                    setSelectedSkewLessonId(lesson.id);
                  }}
                  className={`bg-[#0b0f19] border rounded-lg p-3.5 flex flex-col justify-between gap-3 cursor-pointer transition-all shadow-md ${
                    isSelected
                      ? 'border-[#ff9900] shadow-[0_0_14px_rgba(255,153,0,0.3)] bg-[#0d1222]'
                      : 'border-[#1e2638] hover:border-[#8b9bb4]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] font-black">
                        {lesson.type.replace('_', ' ')}
                      </span>
                      <span className="text-[9.5px] text-[#8b9bb4]">Real-World Geometry</span>
                    </div>

                    <h4 className="text-white font-black text-sm my-1">{lesson.title}</h4>
                    <p className="text-[#8b9bb4] text-[10px] mb-2">{lesson.subtitle}</p>

                    {/* SVG Skew Curve Preview */}
                    <div className="h-32 w-full bg-[#06080e] rounded border border-[#1e2638] p-2 my-2 flex items-center justify-center">
                      {(() => {
                        const pts = lesson.samplePoints;
                        const ivs = pts.map((p) => p.iv);
                        const minIv = Math.min(...ivs) - 2;
                        const maxIv = Math.max(...ivs) + 2;
                        const range = maxIv - minIv || 1;

                        const polyStr = pts
                          .map((p, idx) => {
                            const x = 20 + (idx / (pts.length - 1)) * 220;
                            const y = 110 - ((p.iv - minIv) / range) * 90;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ');

                        return (
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 260 120">
                            {/* Flat Black Scholes Benchmark */}
                            <line x1="20" y1="60" x2="240" y2="60" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                            <text x="242" y="63" fill="#64748b" fontSize="8">
                              BSM Flat
                            </text>

                            {/* Actual Skew Curve */}
                            <polyline
                              points={polyStr}
                              fill="none"
                              stroke={lesson.type === 'PUT_SKEW' ? '#ff334b' : lesson.type === 'CALL_SKEW' ? '#00e676' : '#00e5ff'}
                              strokeWidth="2.5"
                            />

                            {/* Strike Points */}
                            {pts.map((p, idx) => {
                              const x = 20 + (idx / (pts.length - 1)) * 220;
                              const y = 110 - ((p.iv - minIv) / range) * 90;
                              return (
                                <circle
                                  key={idx}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#ff9900"
                                  stroke="#06080e"
                                  strokeWidth="1.5"
                                />
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>

                    <p className="text-[#cbd5e1] text-[11px] leading-relaxed mb-2">
                      {lesson.explanation}
                    </p>
                  </div>

                  <div className="border-t border-[#1e2638] pt-2 text-[10px] flex flex-col gap-1">
                    <div>
                      <strong className="text-[#ff9900]">Driver: </strong>
                      <span className="text-[#8b9bb4]">{lesson.institutionalDriver}</span>
                    </div>
                    <div>
                      <strong className="text-[#00e676]">How to Exploit: </strong>
                      <span className="text-white">{lesson.howToExploit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          MODULE 3: EVENT RISK & IV CRUSH MECHANICS
      ======================================================== */}
      {activeTab === 'event_risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Column: Interactive Expected Move Calculator & Retail Trap */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Expected Move Calculator */}
            <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-[#1e2638] pb-1.5">
                <Target className="w-4 h-4 text-[#ff9900]" />
                <h3 className="text-white font-extrabold text-sm">
                  QUANTITATIVE EXPECTED MOVE CALCULATOR
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9.5px] text-[#8b9bb4] block mb-1">SPOT PRICE ($)</label>
                  <input
                    type="number"
                    value={calcSpot}
                    onChange={(e) => setCalcSpot(parseFloat(e.target.value) || 100)}
                    className="w-full bg-[#06080e] border border-[#1e2638] rounded px-2 py-1 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-[#8b9bb4] block mb-1">EVENT IV (%)</label>
                  <input
                    type="number"
                    value={calcIv}
                    onChange={(e) => setCalcIv(parseFloat(e.target.value) || 20)}
                    className="w-full bg-[#06080e] border border-[#1e2638] rounded px-2 py-1 text-[#facc15] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-[#8b9bb4] block mb-1">DTE DAYS</label>
                  <input
                    type="number"
                    value={calcDte}
                    onChange={(e) => setCalcDte(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#06080e] border border-[#1e2638] rounded px-2 py-1 text-white text-xs font-bold"
                  />
                </div>
              </div>

              {/* Calculated Outputs */}
              <div className="bg-[#06080f] p-3 rounded border border-[#1e2638] flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-[#8b9bb4] block">MARKET EXPECTED MOVE</span>
                  <span className="text-lg font-black text-[#ff9900]">
                    &plusmn;${expectedMoveDollars} ({expectedMovePct}%)
                  </span>
                </div>
                <div className="text-right text-[10px]">
                  <span className="text-[#8b9bb4] block">Price Range (1σ Band):</span>
                  <strong className="text-white">
                    ${(calcSpot - expectedMoveDollars).toFixed(1)} &mdash; ${(calcSpot + expectedMoveDollars).toFixed(1)}
                  </strong>
                </div>
              </div>

              <div className="text-[10px] text-[#8b9bb4] bg-[#070a13] p-2 rounded border border-[#162033] flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#00e5ff] shrink-0 mt-0.5" />
                <span>
                  <strong>Formulas Used:</strong><br />
                  1. Analytical: <code className="text-[#00e5ff]">S &times; IV &times; &radic;(DTE / 365)</code><br />
                  2. Pit Rule of Thumb: <code className="text-[#00e676]">0.85 &times; (ATM Straddle Price)</code>
                </span>
              </div>
            </div>

            {/* The Retail Earnings Trap Breakdown */}
            <div className="bg-[#0b0f19] border border-[#ff334b]/40 rounded-lg p-3.5 shadow flex flex-col gap-2">
              <span className="text-[#ff334b] font-black text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>THE CLASSIC RETAIL EARNINGS VOLATILITY TRAP</span>
              </span>
              <p className="text-[#cbd5e1] text-[11px] leading-relaxed">
                <strong>Scenario:</strong> You buy a Call option before earnings for $6.00 at 110% IV. The stock reports earnings and rallies +3.5%. You log in expecting a huge win, but your call is now worth only $3.20 (-47% loss). <strong>Why?</strong>
              </p>
              <div className="bg-[#06080e] p-2.5 rounded border border-[#ff334b]/30 text-[10.5px]">
                <div className="text-[#00e676]">+ Delta Intrinsic Gain: +$1.40</div>
                <div className="text-[#ff334b]">- Vega Volatility Crush (-65 pts IV drop): -$4.20</div>
                <div className="border-t border-[#1e2638] pt-1 mt-1 font-black text-white">
                  Net Outcome: -$2.80 (-46.7% Loss despite predicting direction correctly!)
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Case Studies & High-Probability Execution */}
          <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
              <span className="text-white font-extrabold text-sm">
                INSTITUTIONAL EVENT RISK PLAYBOOKS &amp; REAL-WORLD CASES
              </span>
              <span className="text-[#8b9bb4] text-[10px]">Overpriced vs Underpriced Vol</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {EVENT_RISK_SAMPLE_CASES.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#06080e] border border-[#1e2638] rounded p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] font-black text-xs">
                        {item.ticker}
                      </span>
                      <strong className="text-white text-xs">{item.eventName}</strong>
                      <span className="text-[#8b9bb4] text-[10px]">({item.eventDate})</span>
                    </div>
                    <span
                      className={`text-[9.5px] px-2 py-0.5 rounded font-black ${
                        item.verdict === 'OVERPRICED_VOL'
                          ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                          : 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                      }`}
                    >
                      {item.verdict.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-[10px] bg-[#0a0f1d] p-2 rounded">
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">PRE-EVENT IV</span>
                      <strong className="text-[#facc15]">{item.preEventIv}%</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">POST-CRUSH IV</span>
                      <strong className="text-white">{item.estimatedPostEventIv}%</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">PRICED MOVE</span>
                      <strong className="text-[#ff9900]">&plusmn;{item.pricedExpectedMovePct}%</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] block text-[9px]">HISTORICAL GAP</span>
                      <strong className="text-[#00e676]">&plusmn;{item.historicalAverageMovePct}%</strong>
                    </div>
                  </div>

                  <p className="text-[#cbd5e1] text-[10.5px] leading-relaxed">
                    {item.lessonNote}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODULE 4: PROBABILITY & OPTIONS PRICING
      ======================================================== */}
      {activeTab === 'probability' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Column: Probability Bell Curve & Normal Distribution */}
          <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
              <span className="text-white font-extrabold text-sm flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#00e5ff]" />
                <span>THE GAUSSIAN BELL CURVE &amp; OPTIONS PROBABILITY BANDS</span>
              </span>
              <span className="text-[#8b9bb4] text-[10px]">1σ, 2σ, 3σ Bounds</span>
            </div>

            {/* Bell Curve SVG */}
            <div className="h-56 w-full bg-[#06080e] rounded border border-[#1e2638] p-2 relative flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180">
                <defs>
                  <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* 1 Sigma Shaded Zone (68.2%) */}
                <rect x="200" y="20" width="200" height="135" fill="rgba(0, 229, 255, 0.08)" />

                {/* 2 Sigma Shaded Zone (95.4%) */}
                <rect x="100" y="20" width="400" height="135" fill="rgba(0, 229, 255, 0.04)" />

                {/* Bell Curve Line */}
                <path
                  d="M 20 155 Q 150 155, 230 110 T 300 25 T 370 110 Q 450 155, 580 155"
                  fill="url(#bellGrad)"
                  stroke="#00e5ff"
                  strokeWidth="2.5"
                />

                {/* Center Mean */}
                <line x1="300" y1="20" x2="300" y2="155" stroke="#ff9900" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="300" y="15" fill="#ff9900" fontSize="10" textAnchor="middle" fontWeight="bold">
                  ATM Spot ($100)
                </text>

                {/* -1 Sigma and +1 Sigma */}
                <line x1="200" y1="40" x2="200" y2="155" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="400" y1="40" x2="400" y2="155" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <text x="200" y="170" fill="#cbd5e1" fontSize="9" textAnchor="middle">
                  -1σ (68.2% Inside)
                </text>
                <text x="400" y="170" fill="#cbd5e1" fontSize="9" textAnchor="middle">
                  +1σ
                </text>

                {/* -2 Sigma and +2 Sigma */}
                <line x1="100" y1="80" x2="100" y2="155" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="500" y1="80" x2="500" y2="155" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <text x="100" y="170" fill="#94a3b8" fontSize="8.5" textAnchor="middle">
                  -2σ (95.4%)
                </text>
                <text x="500" y="170" fill="#94a3b8" fontSize="8.5" textAnchor="middle">
                  +2σ
                </text>
              </svg>
            </div>

            {/* Confidence Table */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-[#070a13] p-2 rounded border border-[#1e2638]">
                <span className="text-[#00e5ff] font-bold block text-xs">1-SIGMA (1σ)</span>
                <span className="text-white font-black">68.27%</span>
                <span className="text-[#8b9bb4] block text-[9px]">Inside Band</span>
              </div>
              <div className="bg-[#070a13] p-2 rounded border border-[#1e2638]">
                <span className="text-[#00e676] font-bold block text-xs">2-SIGMA (2σ)</span>
                <span className="text-white font-black">95.45%</span>
                <span className="text-[#8b9bb4] block text-[9px]">Inside Band</span>
              </div>
              <div className="bg-[#070a13] p-2 rounded border border-[#1e2638]">
                <span className="text-[#c084fc] font-bold block text-xs">3-SIGMA (3σ)</span>
                <span className="text-white font-black">99.73%</span>
                <span className="text-[#8b9bb4] block text-[9px]">Near Certainty</span>
              </div>
            </div>
          </div>

          {/* Right Column: POP vs POT vs Delta Rule */}
          <div className="lg:col-span-5 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
            <span className="text-white font-extrabold text-sm border-b border-[#1e2638] pb-1.5">
              THE THREE CRITICAL PROBABILITY METRICS
            </span>

            {/* Metric 1: Delta as Probability */}
            <div className="bg-[#06080e] p-2.5 rounded border border-[#1e2638] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <strong className="text-[#00e5ff]">1. Probability of Expiring ITM (P_ITM &asymp; &Delta;)</strong>
                <span className="text-[10px] text-[#ff9900] font-bold">Delta Rule</span>
              </div>
              <p className="text-[#cbd5e1] text-[10.5px] leading-relaxed">
                An option's Delta ($\Delta$) serves as an excellent shorthand for its probability of expiring in-the-money. A 16-Delta Put has approximately a <strong>16% chance</strong> of finishing ITM, and an <strong>84% chance</strong> of expiring worthless (1-Sigma boundary).
              </p>
            </div>

            {/* Metric 2: Probability of Touch (POT) */}
            <div className="bg-[#06080e] p-2.5 rounded border border-[#1e2638] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <strong className="text-[#facc15]">2. Probability of Touch (POT &asymp; 2 &times; &Delta;)</strong>
                <span className="text-[10px] text-[#ff334b] font-bold">2x Multiplier</span>
              </div>
              <p className="text-[#cbd5e1] text-[10.5px] leading-relaxed">
                The probability that the underlying stock will <strong>touch your strike at any time</strong> prior to expiration is roughly <strong>double</strong> the probability of expiring ITM. If your short strike has a 15% probability of expiring ITM, expect it to be touched ~30% of the time!
              </p>
            </div>

            {/* Metric 3: Probability of Profit (POP) */}
            <div className="bg-[#06080e] p-2.5 rounded border border-[#1e2638] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <strong className="text-[#00e676]">3. Probability of Profit (POP)</strong>
                <span className="text-[10px] text-[#00e676] font-bold">Accounts for Credit</span>
              </div>
              <p className="text-[#cbd5e1] text-[10.5px] leading-relaxed">
                Unlike P_ITM, POP takes into account the net premium collected or paid. Because you collect premium on credit spreads, your breakeven is pushed further away, meaning <strong>POP is always higher than Probability of OTM</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODULE 5: TERM STRUCTURE OF GREEKS SENSITIVITY
      ======================================================== */}
      {activeTab === 'greeks_term' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Column: Greek Switcher */}
          <div className="lg:col-span-4 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2 shadow">
            <span className="text-[#8b9bb4] text-[10px] font-bold uppercase border-b border-[#1e2638] pb-1">
              CHOOSE GREEK DIMENSION
            </span>

            {GREEKS_TERM_STRUCTURE_SYLLABUS.map((g) => {
              const isSelected = selectedGreek === g.greek;
              return (
                <div
                  key={g.greek}
                  onClick={() => {
                    playKeyClick();
                    setSelectedGreek(g.greek);
                  }}
                  className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#ff9900]/15 border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.3)]'
                      : 'bg-[#070a13] border-[#161f30] hover:border-[#8b9bb4]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white flex items-center gap-1.5">
                      <span className="text-[#ff9900] text-base">{g.symbol}</span>
                      <span>{g.greek}</span>
                    </span>
                    <span className="text-[9px] px-1.5 rounded bg-[#1e293b] text-[#8b9bb4]">
                      {g.order.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[#8b9bb4] text-[10px] line-clamp-2">{g.definition}</p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Greek Term Structure Curve & Maturity Sensitivity */}
          {(() => {
            const currentGreekData = GREEKS_TERM_STRUCTURE_SYLLABUS.find((g) => g.greek === selectedGreek) || GREEKS_TERM_STRUCTURE_SYLLABUS[0];
            return (
              <div className="lg:col-span-8 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-[#ff9900]">{currentGreekData.symbol}</span>
                    <span className="text-white font-extrabold text-sm">{currentGreekData.greek} SENSITIVITY TERM STRUCTURE</span>
                  </div>
                  <span className="text-[#00e5ff] text-[10px] font-mono">{currentGreekData.unit}</span>
                </div>

                {/* Term Structure Table */}
                <div className="border border-[#1e2638] rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#06080e] text-[#8b9bb4] text-[9.5px]">
                      <tr>
                        <th className="py-2 px-3">Maturity (DTE)</th>
                        <th className="py-2 px-3 text-right">ATM Greek Value</th>
                        <th className="py-2 px-3">Behavior &amp; Curvature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141b28]">
                      {currentGreekData.atmSensitivityByDte.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#0c1220] transition-colors">
                          <td className="py-2 px-3 font-bold text-white">{row.label}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-[#ff9900]">
                            {row.atmValue.toFixed(currentGreekData.greek === 'GAMMA' ? 3 : 2)}
                          </td>
                          <td className="py-2 px-3 text-[#cbd5e1]">{row.curvature}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Takeaway & Retail Trap */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="bg-[#070a13] p-3 rounded border border-[#1e2638]">
                    <span className="text-[#00e676] font-bold text-[10px] block mb-1">
                      INSTITUTIONAL QUANTITATIVE TAKEAWAY
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">{currentGreekData.keyTakeaway}</p>
                  </div>
                  <div className="bg-[#070a13] p-3 rounded border border-[#1e2638]">
                    <span className="text-[#ff334b] font-bold text-[10px] block mb-1">
                      COMMON RETAIL TRAP TO AVOID
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">{currentGreekData.commonTrap}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================
          MODULE 6: HOW TO TELL IF OPTIONS ARE OVER- OR UNDERVALUED
      ======================================================== */}
      {activeTab === 'valuation_diagnostic' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Column: Educational 5-Step Checklist */}
          <div className="lg:col-span-5 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
            <span className="text-white font-extrabold text-sm border-b border-[#1e2638] pb-1.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#ff9900]" />
              <span>THE 5-STEP OPTION VALUATION CHECKLIST</span>
            </span>

            <div className="flex flex-col gap-2 text-[10.5px]">
              <div className="bg-[#06080e] p-2 rounded border border-[#1e2638]">
                <strong className="text-[#facc15] block">1. Volatility Risk Premium (VRP)</strong>
                <p className="text-[#8b9bb4] mt-0.5">
                  Implied Volatility historically exceeds Realized/Historical Volatility ~83% of trading days. This spread is the statistical "insurance premium" captured by net option sellers.
                </p>
              </div>

              <div className="bg-[#06080e] p-2 rounded border border-[#1e2638]">
                <strong className="text-[#00e5ff] block">2. IV Rank (IVR) vs IV Percentile (IVP)</strong>
                <p className="text-[#8b9bb4] mt-0.5">
                  IVR &gt; 50 = Premium is rich (favor credit spreads &amp; iron condors). IVR &lt; 25 = Premium is cheap (favor long debit spreads &amp; calendars).
                </p>
              </div>

              <div className="bg-[#06080e] p-2 rounded border border-[#1e2638]">
                <strong className="text-[#00e676] block">3. IV / HV Ratio</strong>
                <p className="text-[#8b9bb4] mt-0.5">
                  Ratio &gt; 1.25x confirms options are statistically overvalued relative to recent underlying realized movement. Ratio &lt; 0.85x indicates underpricing.
                </p>
              </div>

              <div className="bg-[#06080e] p-2 rounded border border-[#1e2638]">
                <strong className="text-[#c084fc] block">4. Expected Move vs Historical Average</strong>
                <p className="text-[#8b9bb4] mt-0.5">
                  If straddle prices an 8% earnings gap but the stock has historically only moved 4.2%, options are severely overvalued.
                </p>
              </div>

              <div className="bg-[#06080e] p-2 rounded border border-[#1e2638]">
                <strong className="text-[#ff334b] block">5. Term Structure Slope (Contango / Backwardation)</strong>
                <p className="text-[#8b9bb4] mt-0.5">
                  Front-month IV spiking above back-month IV (backwardation) indicates near-term panic, creating rich premium selling opportunities.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Option Valuation Scanner */}
          <div className="lg:col-span-7 bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 shadow flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
              <span className="text-white font-extrabold text-sm">
                LIVE OPTION VALUATION &amp; EDGE DIAGNOSTIC SCANNER
              </span>
              <span className="text-[#8b9bb4] text-[10px]">Statistical Edge Detector</span>
            </div>

            {/* Quick Ticker Selectors */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#8b9bb4]">TEST TICKER:</span>
              {['SPY', 'NVDA', 'TSLA', 'AAPL', 'QQQ', 'MSFT', 'AMZN'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => {
                    playKeyClick();
                    setDiagTicker(sym);
                    const tick = allTickers[sym] || currentTicker;
                    if (tick.currentIV) setCustomIv(Math.round(tick.currentIV * 100));
                    if (tick.ivRank) setCustomIvr(tick.ivRank);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    diagTicker === sym
                      ? 'bg-[#ff9900] text-black font-black'
                      : 'bg-[#141b2a] text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Diagnostic Inputs */}
            <div className="grid grid-cols-3 gap-2 bg-[#06080e] p-2.5 rounded border border-[#1e2638]">
              <div>
                <label className="text-[9.5px] text-[#8b9bb4] block mb-1">IMPLIED VOL (IV %)</label>
                <input
                  type="number"
                  value={customIv}
                  onChange={(e) => setCustomIv(parseFloat(e.target.value) || 20)}
                  className="w-full bg-[#0a0f1d] border border-[#1e2638] rounded px-2 py-1 text-[#facc15] font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-[#8b9bb4] block mb-1">HISTORICAL VOL (HV %)</label>
                <input
                  type="number"
                  value={customHv}
                  onChange={(e) => setCustomHv(parseFloat(e.target.value) || 15)}
                  className="w-full bg-[#0a0f1d] border border-[#1e2638] rounded px-2 py-1 text-[#00e5ff] font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-[#8b9bb4] block mb-1">IV RANK (0 - 100)</label>
                <input
                  type="number"
                  value={customIvr}
                  onChange={(e) => setCustomIvr(parseInt(e.target.value) || 50)}
                  className="w-full bg-[#0a0f1d] border border-[#1e2638] rounded px-2 py-1 text-white font-bold text-xs"
                />
              </div>
            </div>

            {/* Diagnostic Output Verdict Card */}
            <div className="bg-[#070a13] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-[#8b9bb4] block">QUANTITATIVE VALUATION VERDICT</span>
                  <span className={`text-base font-black px-2 py-0.5 rounded border inline-block mt-0.5 ${diagnosticResult.verdictBadgeColor}`}>
                    {diagnosticResult.verdict.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] text-[#8b9bb4] block">CONFIDENCE SCORE</span>
                  <span className="text-lg font-black text-white">{diagnosticResult.confidenceScore}%</span>
                </div>
              </div>

              {/* Spread Details */}
              <div className="grid grid-cols-3 gap-2 text-[10px] bg-[#06080e] p-2 rounded my-1">
                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">IV / HV RATIO</span>
                  <strong className="text-white text-xs">{diagnosticResult.ivHvRatio}x</strong>
                </div>
                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">VRP VOL SPREAD</span>
                  <strong className={diagnosticResult.vrpSpread >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                    {diagnosticResult.vrpSpread >= 0 ? '+' : ''}{diagnosticResult.vrpSpread} pts
                  </strong>
                </div>
                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">30-DAY EXPECTED MOVE</span>
                  <strong className="text-[#ff9900]">&plusmn;{diagnosticResult.expectedMovePct}%</strong>
                </div>
              </div>

              <p className="text-[#cbd5e1] text-[11px] leading-relaxed">
                {diagnosticResult.rationale}
              </p>

              {/* Recommended Strategies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                <div className="bg-[#0b1320] p-2 rounded border border-[#00e676]/30">
                  <span className="text-[#00e676] font-bold text-[10px] block mb-1">
                    RECOMMENDED STRATEGIES:
                  </span>
                  <ul className="text-[10px] text-white flex flex-col gap-0.5 list-disc pl-4">
                    {diagnosticResult.recommendedStrategies.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#190d14] p-2 rounded border border-[#ff334b]/30">
                  <span className="text-[#ff334b] font-bold text-[10px] block mb-1">
                    STRATEGIES TO AVOID:
                  </span>
                  <ul className="text-[10px] text-[#94a3b8] flex flex-col gap-0.5 list-disc pl-4">
                    {diagnosticResult.strategiesToAvoid.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
