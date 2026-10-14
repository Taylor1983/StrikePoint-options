import React, { useState } from 'react';
import { Ticker, ExpirationOptionChain, OptionContract, TradeLeg } from '../types/options';
import { EXPIRATION_PRESETS } from '../services/marketData';
import { SlidersHorizontal, Plus, ShieldCheck, Check } from 'lucide-react';

interface OptionsChainViewProps {
  ticker: Ticker;
  chain: ExpirationOptionChain;
  activeDte: number;
  onSelectDte: (dte: number) => void;
  builderLegs: TradeLeg[];
  onAddLeg: (leg: TradeLeg) => void;
  onRemoveLeg: (legId: string) => void;
  onApplyStrategyTemplate: (templateName: string) => void;
  showGreeks: boolean;
  setShowGreeks: (show: boolean) => void;
  onOpenMarketDepth?: (type: 'call' | 'put', strike: number) => void;
}

export const OptionsChainView: React.FC<OptionsChainViewProps> = ({
  ticker,
  chain,
  activeDte,
  onSelectDte,
  builderLegs,
  onAddLeg,
  onRemoveLeg,
  onApplyStrategyTemplate,
  showGreeks,
  setShowGreeks,
  onOpenMarketDepth,
}) => {
  const [strikeFilter, setStrikeFilter] = useState<'10' | '16' | 'all'>('16');

  // Filter strikes around ATM
  const currentPrice = ticker.price;
  const filteredContracts = React.useMemo(() => {
    if (strikeFilter === 'all') {
      return { calls: chain.calls, puts: chain.puts };
    }
    const count = parseInt(strikeFilter, 10);
    // Find index of strike closest to current price
    let closestIndex = 0;
    let minDiff = Infinity;
    chain.calls.forEach((c, idx) => {
      const diff = Math.abs(c.strike - currentPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    const half = Math.floor(count / 2);
    const start = Math.max(0, closestIndex - half);
    const end = Math.min(chain.calls.length, start + count);

    return {
      calls: chain.calls.slice(start, end),
      puts: chain.puts.slice(start, end),
    };
  }, [chain, currentPrice, strikeFilter]);

  const handleLegClick = (
    type: 'call' | 'put',
    action: 'buy' | 'sell',
    contract: OptionContract
  ) => {
    // Check if leg already exists in builder with same strike, type and action
    const existingIndex = builderLegs.findIndex(
      (l) => l.strike === contract.strike && l.type === type && l.action === action
    );

    if (existingIndex >= 0) {
      onRemoveLeg(builderLegs[existingIndex].id);
      return;
    }

    const premium = action === 'buy' ? contract.ask : contract.bid;
    const newLeg: TradeLeg = {
      id: `${type}-${action}-${contract.strike}-${chain.dte}-${Date.now()}`,
      type,
      action,
      strike: contract.strike,
      expiration: chain.formattedDate,
      dte: chain.dte,
      iv: contract.iv,
      premium,
      contracts: 1,
    };

    onAddLeg(newLeg);
  };

  const isLegSelected = (strike: number, type: 'call' | 'put', action: 'buy' | 'sell') => {
    return builderLegs.some(
      (l) => l.strike === strike && l.type === type && l.action === action
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Expiration Strip & Strategy Builder Quick Presets */}
      <div className="border-b border-slate-800 bg-slate-900/40 p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Expirations Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Expiry:
          </span>
          {EXPIRATION_PRESETS.map((preset) => {
            const active = activeDte === preset.days;
            return (
              <button
                key={preset.days}
                onClick={() => onSelectDte(preset.days)}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all shrink-0 ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Strategy Presets & Chain Controls */}
        <div className="flex items-center gap-2">
          {/* Strategy preset picker */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 hidden sm:inline">Strategy:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onApplyStrategyTemplate(e.target.value);
                  e.target.value = ''; // reset select
                }
              }}
              defaultValue=""
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>
                Select Pre-built Strategy...
              </option>
              <optgroup label="Single Leg">
                <option value="long-call">Single: Long Call (Bullish)</option>
                <option value="short-call">Single: Short Call (Naked)</option>
                <option value="long-put">Single: Long Put (Bearish)</option>
                <option value="cash-secured-put">Single: Cash-Secured Put</option>
              </optgroup>
              <optgroup label="Vertical Spreads">
                <option value="bull-call-spread">Spread: Bull Call Debit Spread (+Δ)</option>
                <option value="bear-call-spread">Credit: Bear Call Credit Spread (+Θ)</option>
                <option value="bull-put-spread">Credit: Bull Put Credit Spread (+Θ)</option>
                <option value="bear-put-spread">Spread: Bear Put Debit Spread (-Δ)</option>
              </optgroup>
              <optgroup label="Volatility / Straddles">
                <option value="long-straddle">Volatility: Long Straddle</option>
                <option value="short-straddle">Volatility: Short Straddle</option>
                <option value="long-strangle">Volatility: Long Strangle</option>
                <option value="short-strangle">Volatility: Short Strangle</option>
                <option value="long-guts">Volatility: Long Guts</option>
              </optgroup>
              <optgroup label="Wings / Condors & Butterflies">
                <option value="iron-condor">Neutral: Iron Condor (4-Leg)</option>
                <option value="reverse-iron-condor">Breakout: Reverse Iron Condor</option>
                <option value="iron-butterfly">Neutral: Iron Butterfly</option>
                <option value="long-call-butterfly">Neutral: Call Butterfly (1-2-1)</option>
                <option value="long-put-butterfly">Neutral: Put Butterfly (1-2-1)</option>
                <option value="broken-wing-call-butterfly">Ratio: Broken Wing Call Butterfly</option>
                <option value="long-call-condor">Neutral: Long Call Condor</option>
              </optgroup>
              <optgroup label="Time / Calendars & Diagonals">
                <option value="call-calendar-spread">Time: Call Calendar Spread</option>
                <option value="put-calendar-spread">Time: Put Calendar Spread</option>
                <option value="poor-mans-covered-call">Diagonal: Poor Man's Covered Call (PMCC)</option>
                <option value="poor-mans-covered-put">Diagonal: Poor Man's Covered Put (PMCP)</option>
                <option value="double-calendar-spread">Time: Double Calendar Spread</option>
              </optgroup>
              <optgroup label="Equities & Synthetics">
                <option value="covered-call">Income: Covered Call (Buy-Write)</option>
                <option value="protective-put">Hedge: Protective Put</option>
                <option value="collar">Hedge: Collar (Zero-Cost)</option>
                <option value="synthetic-long-stock">Synthetic: Synthetic Long Stock</option>
                <option value="synthetic-short-stock">Synthetic: Synthetic Short Stock</option>
              </optgroup>
              <optgroup label="Ratios & Exotics">
                <option value="jade-lizard">Exotic: Jade Lizard (Zero Upside Risk)</option>
                <option value="reverse-jade-lizard">Exotic: Reverse Jade Lizard</option>
                <option value="call-ratio-backspread">Breakout: Call Ratio Backspread</option>
                <option value="put-ratio-backspread">Crash Hedge: Put Ratio Backspread</option>
                <option value="box-spread">Arbitrage: Box Spread</option>
              </optgroup>
            </select>
          </div>

          {/* Greek Toggle */}
          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
              showGreeks
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Greeks</span>
          </button>

          {/* Strikes view count */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setStrikeFilter('10')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                strikeFilter === '10' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              10
            </button>
            <button
              onClick={() => setStrikeFilter('16')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                strikeFilter === '16' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              16
            </button>
            <button
              onClick={() => setStrikeFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                strikeFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Main Chain Data Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header Row */}
          <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              {/* Calls Side Headers */}
              {showGreeks && (
                <>
                  <th className="py-2 px-2 text-right">Delta</th>
                  <th className="py-2 px-2 text-right">Theta</th>
                  <th className="py-2 px-2 text-right">Vega</th>
                </>
              )}
              <th className="py-2 px-2 text-right">Vol</th>
              <th className="py-2 px-2 text-right">OI</th>
              <th className="py-2 px-2 text-right">IV</th>
              <th className="py-2 px-2 text-right text-emerald-400 font-semibold">Bid</th>
              <th className="py-2 px-2 text-right text-emerald-400 font-semibold">Ask</th>
              <th className="py-2 px-2 text-right text-amber-400 font-semibold">Spread</th>

              {/* Center Strike Header */}
              <th className="py-2 px-4 text-center font-bold text-white bg-slate-950/80 border-x border-slate-800">
                STRIKE
              </th>

              {/* Puts Side Headers */}
              <th className="py-2 px-2 text-left text-amber-400 font-semibold">Spread</th>
              <th className="py-2 px-2 text-left text-rose-400 font-semibold">Bid</th>
              <th className="py-2 px-2 text-left text-rose-400 font-semibold">Ask</th>
              <th className="py-2 px-2 text-left">IV</th>
              <th className="py-2 px-2 text-left">OI</th>
              <th className="py-2 px-2 text-left">Vol</th>
              {showGreeks && (
                <>
                  <th className="py-2 px-2 text-left">Delta</th>
                  <th className="py-2 px-2 text-left">Theta</th>
                  <th className="py-2 px-2 text-left">Vega</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
            {filteredContracts.calls.map((call, idx) => {
              const put = filteredContracts.puts[idx] || call;
              const strike = call.strike;
              const isAtm =
                Math.abs(strike - currentPrice) <=
                (filteredContracts.calls[1] ? Math.abs(filteredContracts.calls[1].strike - strike) : 1);

              // Selection states
              const callBuySelected = isLegSelected(strike, 'call', 'buy');
              const callSellSelected = isLegSelected(strike, 'call', 'sell');
              const putBuySelected = isLegSelected(strike, 'put', 'buy');
              const putSellSelected = isLegSelected(strike, 'put', 'sell');

              return (
                <tr
                  key={strike}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isAtm ? 'bg-slate-800/20' : ''
                  }`}
                >
                  {/* CALLS SIDE */}
                  {/* Delta, Theta, Vega */}
                  {showGreeks && (
                    <>
                      <td
                        className={`py-1.5 px-2 text-right ${
                          call.itm ? 'bg-emerald-950/20 text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {call.delta.toFixed(2)}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right ${
                          call.itm ? 'bg-emerald-950/20 text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {call.theta.toFixed(2)}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right ${
                          call.itm ? 'bg-emerald-950/20 text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {call.vega.toFixed(2)}
                      </td>
                    </>
                  )}

                  {/* Volume */}
                  <td
                    className={`py-1.5 px-2 text-right ${
                      call.itm ? 'bg-emerald-950/20 text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {call.volume.toLocaleString()}
                  </td>

                  {/* Open Interest */}
                  <td
                    className={`py-1.5 px-2 text-right ${
                      call.itm ? 'bg-emerald-950/20 text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {call.openInterest.toLocaleString()}
                  </td>

                  {/* IV */}
                  <td
                    className={`py-1.5 px-2 text-right ${
                      call.itm ? 'bg-emerald-950/20 text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {(call.iv * 100).toFixed(1)}%
                  </td>

                  {/* Call Bid (Click to SELL call) */}
                  <td className={`py-1.5 px-1 text-right ${call.itm ? 'bg-emerald-950/20' : ''}`}>
                    <button
                      onClick={() => handleLegClick('call', 'sell', call)}
                      title={`Sell ${strike} Call @ $${call.bid.toFixed(2)}`}
                      className={`w-full py-0.5 px-1.5 rounded transition-colors text-right ${
                        callSellSelected
                          ? 'bg-rose-600 text-white font-bold'
                          : 'hover:bg-rose-500/20 hover:text-rose-300 text-slate-200'
                      }`}
                    >
                      {call.bid.toFixed(2)}
                    </button>
                  </td>

                  {/* Call Ask (Click to BUY call) */}
                  <td className={`py-1.5 px-1 text-right ${call.itm ? 'bg-emerald-950/20' : ''}`}>
                    <button
                      onClick={() => handleLegClick('call', 'buy', call)}
                      title={`Buy ${strike} Call @ $${call.ask.toFixed(2)}`}
                      className={`w-full py-0.5 px-1.5 rounded transition-colors text-right ${
                        callBuySelected
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200'
                      }`}
                    >
                      {call.ask.toFixed(2)}
                    </button>
                  </td>

                  {/* Call Spread & Depth trigger */}
                  <td
                    onClick={() => onOpenMarketDepth && onOpenMarketDepth('call', strike)}
                    className="py-1.5 px-2 text-right text-amber-400 font-mono font-bold cursor-pointer hover:underline"
                    title={`Bid-Ask Spread: $${(call.ask - call.bid).toFixed(2)} · Click to open Market Depth`}
                  >
                    ${(call.ask - call.bid).toFixed(2)}
                  </td>

                  {/* CENTER STRIKE */}
                  <td className="py-1.5 px-3 text-center bg-slate-950 font-bold border-x border-slate-800 relative">
                    <span
                      className={`${
                        isAtm
                          ? 'text-amber-300 ring-1 ring-amber-400/50 bg-amber-400/10 px-2 py-0.5 rounded'
                          : 'text-white'
                      }`}
                    >
                      {strike.toFixed(2)}
                    </span>
                  </td>

                  {/* PUTS SIDE */}
                  {/* Put Spread & Depth trigger */}
                  <td
                    onClick={() => onOpenMarketDepth && onOpenMarketDepth('put', strike)}
                    className="py-1.5 px-2 text-left text-amber-400 font-mono font-bold cursor-pointer hover:underline"
                    title={`Bid-Ask Spread: $${(put.ask - put.bid).toFixed(2)} · Click to open Market Depth`}
                  >
                    ${(put.ask - put.bid).toFixed(2)}
                  </td>

                  {/* Put Bid (Click to SELL put) */}
                  <td className={`py-1.5 px-1 text-left ${put.itm ? 'bg-rose-950/20' : ''}`}>
                    <button
                      onClick={() => handleLegClick('put', 'sell', put)}
                      title={`Sell ${strike} Put @ $${put.bid.toFixed(2)}`}
                      className={`w-full py-0.5 px-1.5 rounded transition-colors text-left ${
                        putSellSelected
                          ? 'bg-rose-600 text-white font-bold'
                          : 'hover:bg-rose-500/20 hover:text-rose-300 text-slate-200'
                      }`}
                    >
                      {put.bid.toFixed(2)}
                    </button>
                  </td>

                  {/* Put Ask (Click to BUY put) */}
                  <td className={`py-1.5 px-1 text-left ${put.itm ? 'bg-rose-950/20' : ''}`}>
                    <button
                      onClick={() => handleLegClick('put', 'buy', put)}
                      title={`Buy ${strike} Put @ $${put.ask.toFixed(2)}`}
                      className={`w-full py-0.5 px-1.5 rounded transition-colors text-left ${
                        putBuySelected
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200'
                      }`}
                    >
                      {put.ask.toFixed(2)}
                    </button>
                  </td>

                  {/* IV */}
                  <td
                    className={`py-1.5 px-2 text-left ${
                      put.itm ? 'bg-rose-950/20 text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {(put.iv * 100).toFixed(1)}%
                  </td>

                  {/* Open Interest */}
                  <td
                    className={`py-1.5 px-2 text-left ${
                      put.itm ? 'bg-rose-950/20 text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {put.openInterest.toLocaleString()}
                  </td>

                  {/* Volume */}
                  <td
                    className={`py-1.5 px-2 text-left ${
                      put.itm ? 'bg-rose-950/20 text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {put.volume.toLocaleString()}
                  </td>

                  {/* Greeks */}
                  {showGreeks && (
                    <>
                      <td
                        className={`py-1.5 px-2 text-left ${
                          put.itm ? 'bg-rose-950/20 text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {put.delta.toFixed(2)}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-left ${
                          put.itm ? 'bg-rose-950/20 text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {put.theta.toFixed(2)}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-left ${
                          put.itm ? 'bg-rose-950/20 text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {put.vega.toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Instructions footer */}
      <div className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950/60 border border-emerald-800/50" />
            <span>ITM Calls ({'<'} stock price)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-950/60 border border-rose-800/50" />
            <span>ITM Puts ({'>'} stock price)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/30 border border-amber-400/60" />
            <span>ATM Strike</span>
          </div>
        </div>

        <div className="text-slate-500 text-[11px]">
          Click <span className="text-emerald-400 font-semibold">Ask to Buy</span> · Click{' '}
          <span className="text-rose-400 font-semibold">Bid to Sell</span>
        </div>
      </div>
    </div>
  );
};
