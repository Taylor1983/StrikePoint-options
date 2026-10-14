import React, { useState } from 'react';
import {
  COUNTRY_GEO_RISK_DATA,
  CountryRiskRegion,
} from '../services/countryRiskData';
import { playKeyClick } from '../utils/terminalSound';
import {
  Globe,
  X,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ExternalLink,
  Zap,
  Activity,
  Layers,
  Filter,
} from 'lucide-react';

interface CountryRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicker: (symbol: string) => void;
  onNavigateToScreen?: (screen: string) => void;
}

export const CountryRiskModal: React.FC<CountryRiskModalProps> = ({
  isOpen,
  onClose,
  onSelectTicker,
  onNavigateToScreen,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>('mideast-gulf');
  const [filterTier, setFilterTier] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredRegions = COUNTRY_GEO_RISK_DATA.filter((r) => {
    if (filterTier === 'ALL') return true;
    return r.riskTier === filterTier;
  });

  const selectedRegion =
    COUNTRY_GEO_RISK_DATA.find((r) => r.id === selectedRegionId) ||
    COUNTRY_GEO_RISK_DATA[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="bg-[#121212] border-2 border-[#3c3c3c] w-full max-w-5xl max-h-[90vh] flex flex-col rounded shadow-2xl overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="bg-[#1e1e1e] border-b border-[#3c3c3c] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#ef4444] animate-pulse" />
            <span className="font-bold text-sm text-white tracking-wider">
              GEO-POLITICAL & COUNTRY RISK PREMIUM MONITOR // &lt;GEO RISK&gt;
            </span>
            <span className="bg-[#ef4444] text-white text-[9px] font-bold px-2 py-0.5 rounded">
              CROSS-ASSET TAIL RISK
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#8c8c8c]">
              LIVE SKEW &amp; SOVEREIGN CDS ANALYTICS
            </span>
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="text-[#8c8c8c] hover:text-white hover:bg-[#333] p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Macro KPI Strip */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-[#181818] border-b border-[#2c2c2c] text-xs">
          <div className="bg-[#0f0f0f] border border-[#2d2d2d] p-2 rounded">
            <span className="text-[9px] text-[#8c8c8c] block uppercase">
              Average Geo Vol Premium
            </span>
            <div className="text-base font-bold text-[#ffd600] mt-0.5">
              +7.5 vol pts
            </div>
            <span className="text-[9px] text-[#f87171]">
              Elevated vs 5-Yr Realized Baseline
            </span>
          </div>

          <div className="bg-[#0f0f0f] border border-[#2d2d2d] p-2 rounded">
            <span className="text-[9px] text-[#8c8c8c] block uppercase">
              Active Critical Flashpoints
            </span>
            <div className="text-base font-bold text-[#ef4444] mt-0.5">
              2 Regions (Gulf / Taiwan)
            </div>
            <span className="text-[9px] text-[#ff8080]">
              Score &gt;80 / Extreme Call/Put Skew
            </span>
          </div>

          <div className="bg-[#0f0f0f] border border-[#2d2d2d] p-2 rounded">
            <span className="text-[9px] text-[#8c8c8c] block uppercase">
              Highest Skew Asymmetry
            </span>
            <div className="text-base font-bold text-[#00d2ff] mt-0.5">
              /CL Crude (+7.2% Call Skew)
            </div>
            <span className="text-[9px] text-[#aaa]">
              SMH Semis (+6.1% Put Skew)
            </span>
          </div>

          <div className="bg-[#0f0f0f] border border-[#2d2d2d] p-2 rounded">
            <span className="text-[9px] text-[#8c8c8c] block uppercase">
              Primary Safe-Haven Flow
            </span>
            <div className="text-base font-bold text-[#a3e635] mt-0.5">
              Gold (/GC) &amp; USD (/DX)
            </div>
            <span className="text-[9px] text-[#aaa]">
              Call Open Interest up +32%
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 bg-[#161616] border-b border-[#2c2c2c] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8c8c8c]" />
            <span className="text-[#8c8c8c] text-[10px]">Filter Risk Tier:</span>
            {['ALL', 'CRITICAL', 'ELEVATED', 'MODERATE'].map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  playKeyClick();
                  setFilterTier(tier);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  filterTier === tier
                    ? tier === 'CRITICAL'
                      ? 'bg-[#ef4444] text-white'
                      : tier === 'ELEVATED'
                      ? 'bg-[#f97316] text-black'
                      : tier === 'MODERATE'
                      ? 'bg-[#eab308] text-black'
                      : 'bg-[#ff9900] text-black'
                    : 'bg-[#222] text-[#888] hover:text-white border border-[#333]'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-[#777]">
            Showing {filteredRegions.length} of {COUNTRY_GEO_RISK_DATA.length} Global Risk Corridors
          </span>
        </div>

        {/* Content Body: Split Heatmap Grid & Detailed Intel Card */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-12 gap-4">
          {/* Heatmap Grid (7 Cols) */}
          <div className="col-span-7 flex flex-col gap-2.5">
            <div className="text-[11px] font-bold text-white flex items-center justify-between pb-1 border-b border-[#2d2d2d]">
              <span>REGIONAL RISK HEATMAP TILES</span>
              <span className="text-[9px] text-[#8c8c8c]">Click tile for full options intelligence</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredRegions.map((region) => {
                const isSelected = region.id === selectedRegion.id;
                const tierStyles = {
                  CRITICAL: {
                    bg: 'bg-[#2c0d0d] hover:bg-[#381010]',
                    activeBg: 'bg-[#4a1010]',
                    border: 'border-[#ef4444]',
                    badge: 'bg-[#ef4444] text-white',
                    volBadge: 'text-[#f87171]',
                  },
                  ELEVATED: {
                    bg: 'bg-[#2c1706] hover:bg-[#3b1f08]',
                    activeBg: 'bg-[#4d2507]',
                    border: 'border-[#f97316]',
                    badge: 'bg-[#f97316] text-black font-bold',
                    volBadge: 'text-[#fb923c]',
                  },
                  MODERATE: {
                    bg: 'bg-[#262208] hover:bg-[#332e0a]',
                    activeBg: 'bg-[#423b08]',
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
                      setSelectedRegionId(region.id);
                    }}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? `${tierStyles.activeBg} ${tierStyles.border} shadow-lg ring-2 ring-[#ffd600]/40 scale-[1.01]`
                        : `${tierStyles.bg} border-[#333] hover:border-[#666]`
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
                        <span className="text-[#ccc] font-bold text-xs">
                          {region.sovereignCdsBps} bps
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 text-[8.5px] text-[#ffd600] flex items-center justify-between">
                      <span>{region.skewBias === 'UPSIDE_CALL' ? '▲ Extreme Call Skew' : '▼ Downside Put Skew'}</span>
                      <span className="text-[#8c8c8c] text-[8px]">
                        {region.proxyTickers.slice(0, 3).join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep-Dive Intelligence Details (5 Cols) */}
          <div className="col-span-5 flex flex-col gap-3">
            <div className="text-[11px] font-bold text-white pb-1 border-b border-[#2d2d2d] flex items-center justify-between">
              <span>INTELLIGENCE &amp; HEDGING STRATEGY</span>
              <span className="text-[9px] text-[#ffd600]">{selectedRegion.region}</span>
            </div>

            <div className="bg-[#171717] border border-[#333] p-3 rounded flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedRegion.flag}</span>
                    <h3 className="font-bold text-sm text-white">
                      {selectedRegion.countryOrBloc}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[#8c8c8c] mt-0.5">
                    {selectedRegion.skewBiasLabel}
                  </p>
                </div>
                <span className="px-2 py-1 rounded bg-[#ef4444] text-white font-bold text-xs">
                  Score {selectedRegion.riskScore}/100
                </span>
              </div>

              {/* Threat Catalyst */}
              <div className="bg-[#1f1616] border border-[#401a1a] p-2.5 rounded">
                <span className="text-[9px] text-[#ef4444] font-bold uppercase tracking-wider block mb-1">
                  Primary Threat Catalyst
                </span>
                <p className="text-xs text-[#ddd] leading-relaxed">
                  {selectedRegion.primaryThreatCatalyst}
                </p>
              </div>

              {/* Options Pricing Impact */}
              <div className="bg-[#151c22] border border-[#1e3445] p-2.5 rounded">
                <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block mb-1">
                  Options Market Pricing &amp; Skew Distortion
                </span>
                <p className="text-xs text-[#bbb] leading-relaxed">
                  {selectedRegion.optionsImpactSummary}
                </p>
              </div>

              {/* Affected Proxy Tickers */}
              <div>
                <span className="text-[9px] text-[#8c8c8c] uppercase tracking-wider block mb-1.5">
                  Affected Proxy Assets (Click to Inspect)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRegion.proxyTickers.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => {
                        playKeyClick();
                        onSelectTicker(sym);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-[#222] hover:bg-[#ff9900] hover:text-black text-[#00d2ff] font-bold rounded border border-[#3c3c3c] text-xs transition-all flex items-center gap-1"
                    >
                      <span>{sym}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Hedging Play */}
              <div className="bg-[#112415] border border-[#1b4b24] p-2.5 rounded">
                <span className="text-[9px] text-[#a3e635] font-bold uppercase tracking-wider block mb-1">
                  Institutional Hedging Recommendation
                </span>
                <p className="text-xs text-[#d9f99d] leading-relaxed">
                  {selectedRegion.recommendedHedgingPlay}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#181818] border-t border-[#3c3c3c] px-4 py-2 flex items-center justify-between text-xs text-[#8c8c8c]">
          <span>
            Tip: Select any proxy ticker to immediately update options matrix and volatility surface.
          </span>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded text-xs"
          >
            Close Terminal [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
