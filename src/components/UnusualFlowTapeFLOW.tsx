import React, { useState } from 'react';
import { UnusualFlowItem, TradeLeg, Ticker } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import {
  Flame,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Zap,
  Layers,
} from 'lucide-react';

interface UnusualFlowTapeFLOWProps {
  flowItems: UnusualFlowItem[];
  onMirrorTrade: (leg: TradeLeg, tickerSymbol: string) => void;
  tickers: Record<string, Ticker>;
  onNavigateToPcr?: () => void;
}

export const UnusualFlowTapeFLOW: React.FC<UnusualFlowTapeFLOWProps> = ({
  flowItems,
  onMirrorTrade,
  tickers,
  onNavigateToPcr,
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string>('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CALL' | 'PUT'>('ALL');
  const [minPremium, setMinPremium] = useState<number>(0);

  const filteredItems = flowItems.filter((item) => {
    if (selectedTicker !== 'ALL' && item.ticker !== selectedTicker) return false;
    if (sentimentFilter !== 'ALL' && item.sentiment !== sentimentFilter) return false;
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (item.premium < minPremium) return false;
    return true;
  });

  // Flow P/C analytics
  const flowPcr = React.useMemo(() => {
    let callPrem = 0;
    let putPrem = 0;
    let callContracts = 0;
    let putContracts = 0;
    filteredItems.forEach((f) => {
      if (f.type === 'CALL') {
        callPrem += f.premium;
        callContracts += f.contracts;
      } else {
        putPrem += f.premium;
        putContracts += f.contracts;
      }
    });
    const pcrVol = callContracts > 0 ? Number((putContracts / callContracts).toFixed(2)) : 1.0;
    const pcrDollar = callPrem > 0 ? Number((putPrem / callPrem).toFixed(2)) : 1.0;
    const totalPrem = callPrem + putPrem;
    const callPct = totalPrem > 0 ? (callPrem / totalPrem) * 100 : 50;
    const putPct = 100 - callPct;
    return { callPrem, putPrem, callContracts, putContracts, pcrVol, pcrDollar, callPct, putPct };
  }, [filteredItems]);

  const handleMirror = (item: UnusualFlowItem) => {
    playKeyClick();
    const newLeg: TradeLeg = {
      id: `flow-mirror-${Date.now()}`,
      type: item.type.toLowerCase() as 'call' | 'put',
      action: 'buy', // buying alongside the whale
      strike: item.strike,
      expiration: item.expiration,
      dte: item.dte,
      iv: item.impliedVol,
      premium: item.pricePerShare,
      contracts: 1,
    };
    onMirrorTrade(newLeg, item.ticker);
  };

  return (
    <div className="p-3 lg:p-5 w-full max-w-full ml-0 mr-auto text-left flex flex-col gap-4 font-mono text-xs">
      {/* Header Info */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#ff9900]/10 border border-[#ff9900]/30 flex items-center justify-center text-[#ff9900]">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff9900] font-black text-sm">
                FLOW // UNUSUAL INSTITUTIONAL OPTIONS TAPE
              </span>
              <span className="bg-[#00e676]/20 text-[#00e676] px-2 py-0.5 rounded text-[10px] font-bold">
                REAL-TIME OPRA STREAM
              </span>
            </div>
            <div className="text-[11px] text-[#8b9bb4] mt-0.5">
              Live multi-exchange sweep and block detection · Golden sweeps with Vol {'>'} OI
            </div>
          </div>
        </div>

        {/* Quick Ticker Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['ALL', 'NVDA', 'SPY', 'TSLA', 'AAPL', 'META', 'AMD'].map((sym) => (
            <button
              key={sym}
              onClick={() => {
                playKeyClick();
                setSelectedTicker(sym);
              }}
              className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                selectedTicker === sym
                  ? 'bg-[#ff9900] text-black border-[#ff9900]'
                  : 'bg-[#0f1422] text-[#8b9bb4] border-[#1e2638] hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-[#0b0f1a] border border-[#1e2638] rounded p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sentiment Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#8b9bb4] text-[10px] uppercase">Sentiment:</span>
            <div className="flex bg-[#05070a] border border-[#1e2638] rounded p-0.5">
              {(['ALL', 'BULLISH', 'BEARISH'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    playKeyClick();
                    setSentimentFilter(s);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sentimentFilter === s
                      ? s === 'BULLISH'
                        ? 'bg-[#00e676] text-black'
                        : s === 'BEARISH'
                        ? 'bg-[#ff334b] text-white'
                        : 'bg-[#ff9900] text-black'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Call/Put Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#8b9bb4] text-[10px] uppercase">Type:</span>
            <div className="flex bg-[#05070a] border border-[#1e2638] rounded p-0.5">
              {(['ALL', 'CALL', 'PUT'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    playKeyClick();
                    setTypeFilter(t);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    typeFilter === t ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Min Premium */}
          <div className="flex items-center gap-1">
            <span className="text-[#8b9bb4] text-[10px] uppercase">Min Size:</span>
            <div className="flex bg-[#05070a] border border-[#1e2638] rounded p-0.5">
              {[
                { label: 'ALL', val: 0 },
                { label: '$500K+', val: 500000 },
                { label: '$1M+', val: 1000000 },
                { label: '$2M+', val: 2000000 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    playKeyClick();
                    setMinPremium(p.val);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    minPremium === p.val ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[#8b9bb4] text-[11px]">
          Showing <strong>{filteredItems.length}</strong> institutional orders
        </div>
      </div>

      {/* Tape Put/Call Flow Stats Ribbon */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <div className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">TAPE P/C (VOL)</div>
            <div className="text-base font-black font-mono flex items-center gap-1.5">
              <span className={flowPcr.pcrVol < 0.8 ? 'text-[#00e676]' : flowPcr.pcrVol > 1.1 ? 'text-[#ff334b]' : 'text-[#ffb020]'}>
                {flowPcr.pcrVol.toFixed(2)}x
              </span>
              <span className="text-[10px] text-[#8b9bb4] font-normal">
                ({flowPcr.callContracts.toLocaleString()} calls / {flowPcr.putContracts.toLocaleString()} puts)
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1e2638] hidden sm:block" />

          <div>
            <div className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">DOLLAR PREMIUM P/C</div>
            <div className="text-base font-black font-mono flex items-center gap-1.5">
              <span className={flowPcr.pcrDollar < 0.8 ? 'text-[#00e676]' : flowPcr.pcrDollar > 1.1 ? 'text-[#ff334b]' : 'text-[#ffd600]'}>
                {flowPcr.pcrDollar.toFixed(2)}x
              </span>
              <span className="text-[10px] text-[#8b9bb4] font-normal">
                (${(flowPcr.callPrem / 1000000).toFixed(2)}M calls / ${(flowPcr.putPrem / 1000000).toFixed(2)}M puts)
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1e2638] hidden md:block" />

          {/* Ratio Progress Bar */}
          <div className="hidden lg:flex flex-col gap-1 min-w-[180px]">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#00e676]">Calls: {flowPcr.callPct.toFixed(0)}%</span>
              <span className="text-[#ff334b]">Puts: {flowPcr.putPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-[#141b2a] rounded-full overflow-hidden flex border border-[#1e2638]">
              <div className="bg-[#00e676]" style={{ width: `${flowPcr.callPct}%` }} />
              <div className="bg-[#ff334b]" style={{ width: `${flowPcr.putPct}%` }} />
            </div>
          </div>
        </div>

        {onNavigateToPcr && (
          <button
            onClick={() => {
              playKeyClick();
              onNavigateToPcr();
            }}
            className="px-3 py-1 bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 rounded text-xs font-bold transition-all flex items-center gap-1.5"
            title="Open Institutional Put/Call Ratio Analyzer <F11 PCR>"
          >
            <span>ANALYZE P/C RATIO</span>
            <span className="text-[10px] opacity-75">{'<PCR>'}</span>
          </button>
        )}
      </div>

      {/* Flow Items Table */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-[#090d16] border-b-2 border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Ticker</th>
                <th className="py-2.5 px-3">Contract / Strike</th>
                <th className="py-2.5 px-3">Order Type</th>
                <th className="py-2.5 px-3 text-right">Contracts</th>
                <th className="py-2.5 px-3 text-right">Premium ($)</th>
                <th className="py-2.5 px-3 text-right">Vol / OI</th>
                <th className="py-2.5 px-3">Venue</th>
                <th className="py-2.5 px-3">Sentiment</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101624]">
              {filteredItems.map((item) => {
                const isCall = item.type === 'CALL';
                const isBullish = item.sentiment === 'BULLISH';
                const isSweep = item.orderType === 'SWEEP';

                return (
                  <tr key={item.id} className="hover:bg-[#121929] transition-colors">
                    {/* Time */}
                    <td className="py-2.5 px-3 text-[#8b9bb4] font-mono">{item.time}</td>

                    {/* Ticker */}
                    <td className="py-2.5 px-3 font-black text-white">{item.ticker}</td>

                    {/* Contract Details */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={isCall ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                          ${item.strike} {item.type}
                        </span>
                        <span className="text-[#8b9bb4] text-[10px]">({item.expiration})</span>
                      </div>
                      <div className="text-[10px] text-[#64748b]">{item.details}</div>
                    </td>

                    {/* Order Type */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          isSweep
                            ? 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/40'
                            : 'bg-[#00d2ff]/20 text-[#00d2ff] border-[#00d2ff]/40'
                        }`}
                      >
                        {item.orderType}
                      </span>
                    </td>

                    {/* Contracts */}
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {item.contracts.toLocaleString()}x
                    </td>

                    {/* Premium */}
                    <td className="py-2.5 px-3 text-right font-black text-[#ff9900]">
                      ${(item.premium / 1000).toFixed(0)}K
                    </td>

                    {/* Vol / OI ratio */}
                    <td className="py-2.5 px-3 text-right text-[11px]">
                      <span className="text-white font-bold">{item.volume.toLocaleString()}</span>
                      <span className="text-[#64748b]"> / {item.openInterest.toLocaleString()}</span>
                    </td>

                    {/* Venue */}
                    <td className="py-2.5 px-3 text-[#8b9bb4] font-bold text-[10px]">
                      {item.exchange}
                    </td>

                    {/* Sentiment */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          isBullish
                            ? 'bg-[#00e676]/20 text-[#00e676]'
                            : 'bg-[#ff334b]/20 text-[#ff334b]'
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleMirror(item)}
                        className="px-2.5 py-1 bg-[#1a2336] hover:bg-[#ff9900] text-[#ff9900] hover:text-black border border-[#2a3854] hover:border-[#ff9900] rounded text-[10px] font-bold transition-all shadow-sm"
                      >
                        MIRROR IN OVME
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
