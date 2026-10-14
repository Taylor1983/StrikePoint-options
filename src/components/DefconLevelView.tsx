import React, { useState, useMemo } from 'react';
import {
  DEFCON_LEVELS,
  COMBATANT_COMMANDS,
  DEFCON_BREAKING_NEWS,
  DEFENSE_PRIME_TICKERS,
  DEFCON_SCENARIOS,
  DefconLevelNumber,
  CombatantCommandDefcon,
} from '../services/defconData';
import { playKeyClick, playTickBlip, playExecutionChime } from '../utils/terminalSound';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Globe,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Zap,
  ExternalLink,
  ChevronRight,
  Shield,
  Eye,
  Sliders,
  DollarSign,
} from 'lucide-react';

interface DefconLevelViewProps {
  onSelectTicker: (symbol: string) => void;
  onNavigateToRisk: () => void;
  onNavigateToOptions: () => void;
}

export const DefconLevelView: React.FC<DefconLevelViewProps> = ({
  onSelectTicker,
  onNavigateToRisk,
  onNavigateToOptions,
}) => {
  const currentOverallDefcon: DefconLevelNumber = 3;
  const [selectedCommand, setSelectedCommand] = useState<CombatantCommandDefcon>(COMBATANT_COMMANDS[0]);
  const [inspectedLevel, setInspectedLevel] = useState<DefconLevelNumber>(3);
  const [simulatedLevel, setSimulatedLevel] = useState<DefconLevelNumber>(3);

  const activeLevelInfo = DEFCON_LEVELS[inspectedLevel];
  const activeScenario = useMemo(() => {
    return (
      DEFCON_SCENARIOS.find((s) => s.targetLevel === simulatedLevel) || {
        targetLevel: 3 as DefconLevelNumber,
        title: 'DEFCON 3: ELEVATED MILITARY MOBILIZATION (CURRENT STATUS)',
        triggerEvent: 'Air Force combat squadrons on 15-minute scramble; Carrier Strike Groups in active containment.',
        sp500ProjectedImpact: -1.2,
        crudeOilProjectedImpact: 4.8,
        goldProjectedImpact: 2.1,
        vixProjectedLevel: 21.4,
        defensePrimesImpact: 3.5,
        recommendedOptionsHedge: 'Underlying Defense Calls + Energy Call Spreads (/CL)',
      }
    );
  }, [simulatedLevel]);

  return (
    <div className="flex flex-col h-full bg-[#121417] border border-[var(--border)] rounded overflow-hidden font-mono text-xs select-none">
      {/* ========================================================
          1. HEADER HERO: DEFCONLEVEL.COM OSINT MONITORING SUITE
      ======================================================== */}
      <div className="bg-[#181b20] border-b border-[var(--border)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#ffd600]/15 border border-[#ffd600]/40 text-[#ffd600] animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#ffd600] font-black text-sm tracking-wider">
                DEFCON LEVEL INTELLIGENCE SYSTEM
              </span>
              <span className="px-2 py-0.5 rounded bg-[#222] border border-[#333] text-[#8c8c8c] text-[9px] font-bold">
                OSINT SOURCE: DEFCONLEVEL.COM
              </span>
              <span className="flex items-center gap-1 text-[9px] text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.2 rounded border border-[#00e676]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping" />
                LIVE MILITARY TELEMETRY
              </span>
            </div>
            <div className="text-[10px] text-[#8c8c8c] flex items-center gap-2 mt-0.5">
              <span>National Defense Readiness Condition Tracker &amp; Financial War-Risk Matrix</span>
              <span>·</span>
              <a
                href="https://www.defconlevel.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#00d2ff] hover:underline flex items-center gap-0.5"
              >
                defconlevel.com <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Global Threat Badges Ribbon */}
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <div className="px-2.5 py-1 rounded bg-[#ffd600]/15 border border-[#ffd600]/40 text-[#ffd600] font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>US DEFCON LEVEL: <strong>3 (ROUND HOUSE)</strong></span>
          </div>

          <div className="px-2 py-1 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 text-[#ff9900] font-bold">
            FPCON: <strong>BRAVO</strong>
          </div>

          <div className="px-2 py-1 rounded bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-[#00d2ff] font-bold">
            INFOCON: <strong>CONDITION 3</strong>
          </div>

          <div className="px-2 py-1 rounded bg-[#ff334b]/15 border border-[#ff334b]/40 text-[#ff334b] font-bold">
            CYBERCOM: <strong>SEVERE APT PROBING</strong>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
        {/* ========================================================
            2. FIVE DEFCON LEVELS MASTER GAUGE
        ======================================================== */}
        <div className="bg-[#15181c] border border-[var(--border)] rounded p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[var(--accent)] text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>DEFENSE READINESS CONDITION (DEFCON) LEVELS</span>
              </span>
              <span className="text-[10px] text-[#8c8c8c]">
                Click any level to inspect military deployment mandate &amp; options pricing impact
              </span>
            </div>
            <span className="text-[10px] text-[#8c8c8c]">
              Current Global State: <strong className="text-[#ffd600]">DEFCON 3</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {([5, 4, 3, 2, 1] as DefconLevelNumber[]).map((lvl) => {
              const info = DEFCON_LEVELS[lvl];
              const isCurrent = currentOverallDefcon === lvl;
              const isSelected = inspectedLevel === lvl;

              return (
                <button
                  key={lvl}
                  onClick={() => {
                    playKeyClick();
                    setInspectedLevel(lvl);
                  }}
                  className={`p-2.5 rounded border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                    isSelected
                      ? `${info.bgClass} ${info.borderClass} ring-1 ring-${info.color}`
                      : 'bg-[#101215] border-[#262c33] hover:border-[#444]'
                  }`}
                  style={{
                    borderColor: isSelected ? info.color : undefined,
                  }}
                >
                  {isCurrent && (
                    <div
                      className="absolute top-0 right-0 px-1.5 py-0.5 text-[8px] font-black uppercase text-black"
                      style={{ backgroundColor: info.color }}
                    >
                      CURRENT
                    </div>
                  )}

                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black" style={{ color: info.color }}>
                        DEFCON {lvl}
                      </span>
                      <span className="text-[9px] font-bold text-white uppercase tracking-tight">
                        {info.codeName}
                      </span>
                    </div>
                    <div className="text-[10px] font-semibold text-[#ccc] mt-1 leading-snug">
                      {info.readinessDescription}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#262c33] flex items-center justify-between text-[8.5px] text-[#8c8c8c]">
                    <span>STATUS</span>
                    <span className="font-bold" style={{ color: info.color }}>
                      {lvl === 1
                        ? 'MAX CRITICAL'
                        : lvl === 2
                        ? 'IMMOBILIZED 6H'
                        : lvl === 3
                        ? '15-MIN AIR MOB'
                        : lvl === 4
                        ? 'INTEL ENHANCED'
                        : 'PEACETIME'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inspected Level Deep Dive Drawer */}
          <div className="bg-[#0f1114] border border-[#262c33] rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1 border-r border-[#262c33] pr-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm" style={{ color: activeLevelInfo.color }}>
                  DEFCON {activeLevelInfo.level} · {activeLevelInfo.codeName}
                </span>
                <span className="text-[10px] text-[#8c8c8c]">({activeLevelInfo.readinessDescription})</span>
              </div>
              <p className="text-[#a1a1aa] text-[11px] leading-relaxed mt-1">
                {activeLevelInfo.usMilitaryReadiness}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#00d2ff] flex items-center gap-1 text-[11px]">
                <Activity className="w-3.5 h-3.5" />
                <span>FINANCIAL MARKETS &amp; OPTIONS PRICING PROFILE</span>
              </span>
              <p className="text-[#cbd5e1] text-[11px] leading-relaxed mt-1">
                {activeLevelInfo.optionsAndMarketImpact}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            3. COMBATANT COMMAND STATUS & THEATER INTELLIGENCE
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left 2 Cols: Unified Combatant Commands Grid */}
          <div className="lg:col-span-2 bg-[#15181c] border border-[var(--border)] rounded p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-[#262c33] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#00d2ff]" />
                  <span>UNIFIED COMBATANT COMMANDS (COCOM) ALERT POSTURE</span>
                </span>
                <span className="text-[10px] text-[#8c8c8c]">6 Strategic Global Theaters</span>
              </div>
              <span className="text-[9.5px] text-[#8c8c8c]">Click command to inspect proxies</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMBATANT_COMMANDS.map((cocom) => {
                const defInfo = DEFCON_LEVELS[cocom.currentLevel];
                const isSelected = selectedCommand.id === cocom.id;

                return (
                  <div
                    key={cocom.id}
                    onClick={() => {
                      playKeyClick();
                      setSelectedCommand(cocom);
                    }}
                    className={`p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#1b2026] border-[#00d2ff] ring-1 ring-[#00d2ff]/50'
                        : 'bg-[#101215] border-[#262c33] hover:border-[#444]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white text-[12px]">{cocom.shortName}</span>
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                          style={{
                            backgroundColor: `${defInfo.color}25`,
                            color: defInfo.color,
                            border: `1px solid ${defInfo.color}50`,
                          }}
                        >
                          DEFCON {cocom.currentLevel}
                        </span>
                      </div>
                      <div className="text-[9px] text-[#8c8c8c] mt-0.5">{cocom.name}</div>
                      <div className="text-[10px] font-bold text-[#ffd600] mt-1.5 line-clamp-1">
                        {cocom.statusHeadline}
                      </div>
                      <div className="text-[9.5px] text-[#a1a1aa] mt-1 line-clamp-2 leading-relaxed">
                        {cocom.operationalDetail}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#262c33] flex items-center justify-between text-[9px]">
                      <div className="flex items-center gap-1 text-[#8c8c8c]">
                        <span>Proxies:</span>
                        <span className="text-[#00d2ff] font-bold">
                          {cocom.optionsProxyTickers.slice(0, 3).join(', ')}
                        </span>
                      </div>
                      <span className="text-[#64748b]">{cocom.lastUpdated}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected COCOM Detail Dossier */}
            <div className="bg-[#0f1216] border border-[#262c33] rounded p-3 flex flex-col gap-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262c33] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm">
                    {selectedCommand.name} ({selectedCommand.shortName})
                  </span>
                  <span className="text-[10px] text-[#8c8c8c]">HQ: {selectedCommand.headquarters}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#8c8c8c]">Trade Proxies:</span>
                  {selectedCommand.optionsProxyTickers.map((t) => (
                    <button
                      key={t}
                      onClick={(e) => {
                        e.stopPropagation();
                        playKeyClick();
                        onSelectTicker(t);
                        onNavigateToOptions();
                      }}
                      className="px-2 py-0.5 rounded bg-[#00d2ff]/20 hover:bg-[#00d2ff] hover:text-black text-[#00d2ff] font-bold text-[9.5px] border border-[#00d2ff]/40 transition-all"
                    >
                      {t} OMON &gt;
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] mt-1">
                <div>
                  <span className="text-[9px] text-[#8c8c8c] block uppercase">PRIMARY ESCALATION CATALYST</span>
                  <span className="text-[#cbd5e1] font-semibold">{selectedCommand.primaryCatalyst}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8c8c8c] block uppercase">IDENTIFIED THREAT ACTORS</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedCommand.threatActors.map((actor) => (
                      <span
                        key={actor}
                        className="px-1.5 py-0.2 rounded bg-[#ff334b]/15 text-[#ff8090] border border-[#ff334b]/30 text-[9px] font-bold"
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: DEFCON Breaking OSINT Wire */}
          <div className="bg-[#15181c] border border-[var(--border)] rounded p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-[#262c33] pb-2">
              <span className="font-extrabold text-[var(--accent)] text-xs flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#ff334b] animate-pulse" />
                <span>DEFCONLEVEL.COM OSINT WIRE</span>
              </span>
              <span className="text-[9px] text-[#00e676] font-bold">5 ALERTS ACTIVE</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[460px] pr-1">
              {DEFCON_BREAKING_NEWS.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#101215] border border-[#262c33] hover:border-[#444] rounded p-2.5 flex flex-col gap-1.5 transition-all"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded font-black text-[8px] ${
                          item.severity === 'CRITICAL'
                            ? 'bg-[#ff334b] text-black font-extrabold'
                            : item.severity === 'HIGH'
                            ? 'bg-[#ff9900] text-black font-bold'
                            : 'bg-[#00d2ff] text-black font-bold'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[#ffd600] font-bold">{item.theater}</span>
                    </div>
                    <span className="text-[#64748b] font-mono">{item.time}</span>
                  </div>

                  <div className="text-[11px] font-bold text-white leading-snug">
                    {item.headline}
                  </div>

                  <div className="text-[9.5px] text-[#8c8c8c] flex items-center justify-between pt-1 border-t border-[#1e2329]">
                    <span className="text-[#94a3b8]">{item.source}</span>
                  </div>

                  <div className="p-1 rounded bg-[#0d0f12] border border-[#222] text-[9.5px] text-[#34d399] flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[#34d399] shrink-0" />
                    <span>{item.marketImpact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            4. DEFENSE EQUITIES & WAR-RISK DERIVATIVES BOARD
        ======================================================== */}
        <div className="bg-[#15181c] border border-[var(--border)] rounded p-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262c33] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#ffd600] text-xs flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-[#ffd600]" />
                <span>AEROSPACE, DEFENSE PRIMES &amp; COMMODITY HEDGES</span>
              </span>
              <span className="text-[10px] text-[#8c8c8c]">
                Options Skew &amp; Escalation Beta Monitoring
              </span>
            </div>
            <div className="text-[10px] text-[#8c8c8c]">
              Click any contractor to inspect implied volatility and options chains
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {DEFENSE_PRIME_TICKERS.map((stock) => (
              <div
                key={stock.symbol}
                className="bg-[#101215] border border-[#262c33] hover:border-[#00d2ff]/60 rounded p-3 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playKeyClick();
                          onSelectTicker(stock.symbol);
                          onNavigateToOptions();
                        }}
                        className="font-black text-white text-sm hover:text-[#00d2ff] hover:underline"
                        title="Open Options Chain (OMON)"
                      >
                        {stock.symbol}
                      </button>
                      <span className="text-[10px] text-[#8c8c8c] truncate max-w-[130px]">
                        {stock.name}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-white text-xs">${stock.price.toFixed(2)}</span>
                      <span
                        className={`text-[10px] font-bold ml-1.5 ${
                          stock.change >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'
                        }`}
                      >
                        {stock.change >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-[9.5px] text-[#ffd600] font-semibold mt-1">
                    {stock.role}
                  </div>

                  <div className="text-[9px] text-[#8c8c8c] mt-0.5 leading-snug">
                    Programs: {stock.primaryDefenseProgram}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-[#0b0d0f] p-2 rounded border border-[#20252b] mt-2.5 text-center text-[10px]">
                    <div>
                      <span className="text-[8.5px] text-[#8c8c8c] block">30D IV</span>
                      <span className="font-bold text-white">{(stock.currentIV * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-[#8c8c8c] block">IV RANK</span>
                      <span className="font-bold text-[#ff9900]">{stock.ivRank}%</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-[#8c8c8c] block">DEFCON BETA</span>
                      <span className="font-extrabold text-[#00d2ff]">{stock.defconBeta}x</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#20252b] flex items-center justify-between">
                  <div className="text-[9px] text-[#a1a1aa] truncate max-w-[200px]" title={stock.topPlay}>
                    <span className="text-[#8c8c8c]">Institutional Play:</span> {stock.topPlay}
                  </div>

                  <button
                    onClick={() => {
                      playKeyClick();
                      onSelectTicker(stock.symbol);
                      onNavigateToRisk();
                    }}
                    className="px-2 py-0.5 rounded bg-[#00d2ff]/20 hover:bg-[#00d2ff] hover:text-black text-[#00d2ff] font-bold text-[9px] border border-[#00d2ff]/40 transition-all shrink-0 ml-1"
                  >
                    RISK &gt;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            5. DEFCON ESCALATION STRESS-TEST SCENARIO SIMULATOR
        ======================================================== */}
        <div className="bg-[#15181c] border border-[var(--border)] rounded p-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262c33] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#00d2ff] text-xs flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                <span>DEFCON MILITARY ESCALATION STRESS-TEST SIMULATOR</span>
              </span>
              <span className="text-[10px] text-[#8c8c8c]">
                Model market volatility, crude oil shocks, and options hedge requirements
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8c8c8c]">Simulate Level:</span>
              {([4, 3, 2, 1] as DefconLevelNumber[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    playKeyClick();
                    setSimulatedLevel(lvl);
                  }}
                  className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] border transition-all ${
                    simulatedLevel === lvl
                      ? 'bg-[#ffd600] text-black border-[#ffd600]'
                      : 'bg-[#101215] text-[#8c8c8c] border-[#2a3038] hover:text-white'
                  }`}
                >
                  DEFCON {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0f1216] border border-[#262c33] rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-1 flex flex-col gap-2 border-r border-[#262c33] pr-3">
              <span className="text-[9px] font-bold text-[#ffd600] uppercase tracking-wider">
                SIMULATION SCENARIO
              </span>
              <div className="font-extrabold text-white text-sm leading-snug">
                {activeScenario.title}
              </div>
              <p className="text-[#a1a1aa] text-[10.5px] leading-relaxed">
                {activeScenario.triggerEvent}
              </p>
            </div>

            {/* Projected Shocks Grid */}
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-[#13161a] p-2.5 rounded border border-[#23282f] flex flex-col justify-between">
                <span className="text-[9px] text-[#8c8c8c]">S&amp;P 500 IMPACT</span>
                <span
                  className={`text-base font-black ${
                    activeScenario.sp500ProjectedImpact >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'
                  }`}
                >
                  {activeScenario.sp500ProjectedImpact >= 0 ? '+' : ''}{activeScenario.sp500ProjectedImpact}%
                </span>
                <span className="text-[8.5px] text-[#8c8c8c]">Equity Shock</span>
              </div>

              <div className="bg-[#13161a] p-2.5 rounded border border-[#23282f] flex flex-col justify-between">
                <span className="text-[9px] text-[#8c8c8c]">CRUDE OIL (/CL)</span>
                <span className="text-base font-black text-[#ffd600]">
                  +{activeScenario.crudeOilProjectedImpact}%
                </span>
                <span className="text-[8.5px] text-[#8c8c8c]">Supply Interdiction</span>
              </div>

              <div className="bg-[#13161a] p-2.5 rounded border border-[#23282f] flex flex-col justify-between">
                <span className="text-[9px] text-[#8c8c8c]">GOLD (GLD)</span>
                <span className="text-base font-black text-[#ffd600]">
                  +{activeScenario.goldProjectedImpact}%
                </span>
                <span className="text-[8.5px] text-[#8c8c8c]">Safe Haven Flight</span>
              </div>

              <div className="bg-[#13161a] p-2.5 rounded border border-[#23282f] flex flex-col justify-between">
                <span className="text-[9px] text-[#8c8c8c]">PROJECTED VIX</span>
                <span className="text-base font-black text-[#00d2ff]">
                  {activeScenario.vixProjectedLevel.toFixed(1)}
                </span>
                <span className="text-[8.5px] text-[#8c8c8c]">Vol Expansion</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#101215] border border-[#262c33] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8c8c8c]">Recommended Defense Hedge:</span>
              <strong className="text-[#34d399] font-mono">{activeScenario.recommendedOptionsHedge}</strong>
            </div>

            <button
              onClick={() => {
                playExecutionChime();
                onNavigateToRisk();
              }}
              className="px-3 py-1 bg-[#10b981]/20 hover:bg-[#10b981] hover:text-black text-[#34d399] font-extrabold rounded border border-[#10b981]/50 text-[10px] transition-all"
            >
              Analyze in Risk Profile &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
