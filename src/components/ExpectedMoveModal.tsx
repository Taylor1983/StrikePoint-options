import React, { useState } from 'react';
import { Ticker, ExpirationOptionChain } from '../types/options';
import { X, Activity, TrendingUp, AlertTriangle, HelpCircle, Calendar, BarChart2, ShieldCheck } from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';

interface ExpectedMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: Ticker;
  currentChain: ExpirationOptionChain;
  allChains?: ExpirationOptionChain[];
  onOpenRiskProfile?: () => void;
  onOpenCone?: () => void;
}

export const ExpectedMoveModal: React.FC<ExpectedMoveModalProps> = ({
  isOpen,
  onClose,
  ticker,
  currentChain,
  allChains = [],
  onOpenRiskProfile,
  onOpenCone,
}) => {
  if (!isOpen) return null;

  const S = ticker.price;
  const atmIv = ticker.currentIV || 0.25;
  const dte = currentChain.dte || 30;

  // 1. Implied Volatility Standard Deviation formula: S * IV * sqrt(DTE / 365)
  const oneSigmaMove = S * atmIv * Math.sqrt(Math.max(1, dte) / 365);
  const twoSigmaMove = oneSigmaMove * 2;
  const threeSigmaMove = oneSigmaMove * 3;

  // Daily Expected Move: S * IV / sqrt(252)
  const dailyMove = (S * atmIv) / Math.sqrt(252);
  // Weekly Expected Move: S * IV * sqrt(5 / 252)
  const weeklyMove = S * atmIv * Math.sqrt(5 / 252);

  // 2. ATM Straddle Implied Move: ATM Call Price + ATM Put Price
  let atmCallPrice = 0;
  let atmPutPrice = 0;
  let minDiff = Infinity;
  let atmStrike = S;

  if (currentChain.calls.length > 0) {
    currentChain.calls.forEach((c) => {
      const diff = Math.abs(c.strike - S);
      if (diff < minDiff) {
        minDiff = diff;
        atmStrike = c.strike;
        atmCallPrice = c.ask || c.last;
      }
    });
    const put = currentChain.puts.find((p) => p.strike === atmStrike);
    if (put) {
      atmPutPrice = put.ask || put.last;
    }
  }

  const straddlePrice = atmCallPrice + atmPutPrice;
  // Floor market makers rule of thumb: ~85% of straddle cost represents ~68% probability 1-sigma move
  const straddleMove = straddlePrice > 0 ? straddlePrice : oneSigmaMove;
  const straddleMovePct = (straddleMove / S) * 100;

  // Compute table for all expirations
  const expMoves = (allChains.length > 0 ? allChains : [currentChain]).map((ch) => {
    const chDte = Math.max(1, ch.dte);
    const chIv = ch.avgIV || atmIv;
    const move = S * chIv * Math.sqrt(chDte / 365);
    const movePct = (move / S) * 100;
    return {
      date: ch.formattedDate,
      dte: chDte,
      iv: chIv,
      moveDollar: move,
      movePct,
      lower: S - move,
      upper: S + move,
      lower2: S - move * 2,
      upper2: S + move * 2,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden font-mono text-xs my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0e1424] px-5 py-3 border-b border-[#1e2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-extrabold text-sm">{ticker.symbol} EXPECTED PRICE MOVE</span>
                <span className="bg-[#00d2ff]/20 text-[#00d2ff] px-2 py-0.5 rounded text-[10px] font-bold border border-[#00d2ff]/30">
                  SPOT: ${S.toFixed(2)}
                </span>
                <span className="text-[#8c8c8c] text-[11px]">
                  IV: {(atmIv * 100).toFixed(1)}% · IVR: {ticker.ivRank}%
                </span>
              </div>
              <p className="text-[10px] text-[#8b9bb4]">
                Market-implied distribution based on ATM options pricing & Black-Scholes standard deviation models
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 text-[#8b9bb4] hover:text-white rounded hover:bg-[#1e2638] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Cards: Key Expected Move Metrics */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#080c14] border-b border-[#1e2638]">
          {/* Active DTE 1-Sigma Expected Move */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b9bb4] text-[10px]">
              <span>ACTIVE CYCLE (1σ · 68.2%)</span>
              <span className="text-[#00d2ff] font-bold">{dte} DTE</span>
            </div>
            <div className="my-2">
              <div className="text-xl font-black text-white">±${oneSigmaMove.toFixed(2)}</div>
              <div className="text-[#00e676] text-xs font-bold">±{((oneSigmaMove / S) * 100).toFixed(2)}%</div>
            </div>
            <div className="text-[9.5px] text-[#94a3b8] bg-[#050811] px-2 py-1 rounded border border-[#1e293b]">
              Range: <strong className="text-white">${(S - oneSigmaMove).toFixed(2)}</strong> –{' '}
              <strong className="text-white">${(S + oneSigmaMove).toFixed(2)}</strong>
            </div>
          </div>

          {/* 2-Sigma Expected Move */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b9bb4] text-[10px]">
              <span>OUTLIER BAND (2σ · 95.4%)</span>
              <span className="text-[#ffd600] font-bold">TAIL RISK</span>
            </div>
            <div className="my-2">
              <div className="text-xl font-black text-[#ffd600]">±${twoSigmaMove.toFixed(2)}</div>
              <div className="text-[#ffd600] text-xs font-bold">±{((twoSigmaMove / S) * 100).toFixed(2)}%</div>
            </div>
            <div className="text-[9.5px] text-[#94a3b8] bg-[#050811] px-2 py-1 rounded border border-[#1e293b]">
              Range: <strong className="text-white">${(S - twoSigmaMove).toFixed(2)}</strong> –{' '}
              <strong className="text-white">${(S + twoSigmaMove).toFixed(2)}</strong>
            </div>
          </div>

          {/* ATM Straddle Implied Move */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b9bb4] text-[10px]">
              <span>ATM STRADDLE COST</span>
              <span className="text-[#ff9900] font-bold">K={atmStrike}</span>
            </div>
            <div className="my-2">
              <div className="text-xl font-black text-[#ff9900]">±${straddleMove.toFixed(2)}</div>
              <div className="text-[#ff9900] text-xs font-bold">±{straddleMovePct.toFixed(2)}%</div>
            </div>
            <div className="text-[9.5px] text-[#94a3b8] bg-[#050811] px-2 py-1 rounded border border-[#1e293b]">
              Breakeven: <strong className="text-white">${(S - straddleMove).toFixed(2)}</strong> /{' '}
              <strong className="text-white">${(S + straddleMove).toFixed(2)}</strong>
            </div>
          </div>

          {/* Short-Term / Daily Move */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b9bb4] text-[10px]">
              <span>SHORT-TERM INTERVALS</span>
              <span className="text-[#8c8c8c]">1D / 1W</span>
            </div>
            <div className="my-2 flex justify-between items-baseline">
              <div>
                <span className="text-[9px] text-[#8c8c8c] block">1-DAY</span>
                <span className="text-sm font-bold text-white">±${dailyMove.toFixed(2)}</span>
                <span className="text-[9px] text-[#00e676] ml-1">({((dailyMove / S) * 100).toFixed(1)}%)</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8c8c8c] block">1-WEEK</span>
                <span className="text-sm font-bold text-white">±${weeklyMove.toFixed(2)}</span>
                <span className="text-[9px] text-[#00e676] ml-1">({((weeklyMove / S) * 100).toFixed(1)}%)</span>
              </div>
            </div>
            {ticker.daysToEarnings !== null && ticker.daysToEarnings !== undefined ? (
              <div className="text-[9.5px] text-[#ffd600] bg-[#ffd600]/10 px-2 py-0.5 rounded border border-[#ffd600]/30 flex items-center justify-between">
                <span>EARNINGS ({ticker.daysToEarnings}d):</span>
                <strong>±{ticker.earningsEstimatedMovePct || (atmIv * 100 * 0.4).toFixed(1)}%</strong>
              </div>
            ) : (
              <div className="text-[9.5px] text-[#8c8c8c] bg-[#050811] px-2 py-0.5 rounded border border-[#1e293b]">
                No binary catalyst scheduled
              </div>
            )}
          </div>
        </div>

        {/* Expirations Expected Move Table */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span className="font-extrabold text-white text-xs">EXPECTED MOVES ACROSS EXPIRATION CYCLES</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-[#8b9bb4]">
                <span className="w-2 h-2 rounded-full bg-[#00e676]" /> 68.2% Probability (1σ)
              </span>
              <span className="flex items-center gap-1 text-[#8b9bb4]">
                <span className="w-2 h-2 rounded-full bg-[#ffd600]" /> 95.4% Probability (2σ)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#1e2638] rounded bg-[#070b14]">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#0e1424] text-[#8b9bb4] text-[10px] uppercase border-b border-[#1e2638]">
                  <th className="py-2 px-3">Expiration</th>
                  <th className="py-2 px-2 text-center">DTE</th>
                  <th className="py-2 px-2 text-center">Avg IV</th>
                  <th className="py-2 px-3 text-right">Expected Move (±$)</th>
                  <th className="py-2 px-3 text-right">Expected Move (%)</th>
                  <th className="py-2 px-3 text-center">1σ Range (68.2%)</th>
                  <th className="py-2 px-3 text-center">2σ Range (95.4%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2638]/50">
                {expMoves.map((row, idx) => (
                  <tr
                    key={row.date}
                    className={`hover:bg-[#141d33] transition-colors ${
                      row.dte === dte ? 'bg-[#ff9900]/10 border-l-2 border-[#ff9900]' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                      {row.date}
                      {row.dte === dte && (
                        <span className="bg-[#ff9900] text-black text-[9px] px-1 rounded font-black">ACTIVE</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center text-[#cbd5e1]">{row.dte}d</td>
                    <td className="py-2 px-2 text-center text-[#00d2ff] font-bold">{(row.iv * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right font-bold text-white">±${row.moveDollar.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-extrabold text-[#00e676]">
                      ±{row.movePct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-center text-[#cbd5e1]">
                      ${row.lower.toFixed(2)} — ${row.upper.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center text-[#ffd600]">
                      ${row.lower2.toFixed(2)} — ${row.upper2.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Educational / Trading Mechanics Note */}
          <div className="bg-[#0b101e] border border-[#1e293b] p-3.5 rounded flex items-start gap-3 text-[11px] text-[#94a3b8] leading-relaxed">
            <HelpCircle className="w-5 h-5 text-[#ff9900] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">How Institutional Traders Use Expected Moves:</strong>
              <div className="mt-1 space-y-1">
                <p>
                  • <strong>Iron Condors & Credit Spreads:</strong> Placing short strikes outside the 1σ expected move
                  (approx 16 delta) targets a ~68% to 85% statistical win rate.
                </p>
                <p>
                  • <strong>Long Straddles & Breakout Plays:</strong> Buying volatility only pays off if the underlying
                  moves <span className="text-[#00e676] font-bold">further than the implied expected move</span> by
                  expiration.
                </p>
                <p>
                  • <strong>Earnings & Catalysts:</strong> Historical stock moves typically land inside the expected
                  move ~70% of the time, causing rapid post-event IV crush.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#0e1424] px-5 py-3 border-t border-[#1e2638] flex items-center justify-between">
          <div className="text-[10px] text-[#8c8c8c]">
            Bloomberg Options Pricing & Analytics · Ref: BSM-EXP-MOVE-ENGINE
          </div>

          <div className="flex items-center gap-2">
            {onOpenCone && (
              <button
                onClick={() => {
                  playKeyClick();
                  onClose();
                  onOpenCone();
                }}
                className="px-3 py-1.5 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>OPEN PROBABILITY CONE &lt;CONE&gt;</span>
              </button>
            )}

            {onOpenRiskProfile && (
              <button
                onClick={() => {
                  playKeyClick();
                  onClose();
                  onOpenRiskProfile();
                }}
                className="px-3 py-1.5 rounded bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/40 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>VIEW IN RISK PROFILE &lt;RISK&gt;</span>
              </button>
            )}

            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-[#1e2638] hover:bg-[#2b354d] text-white font-bold text-xs transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
