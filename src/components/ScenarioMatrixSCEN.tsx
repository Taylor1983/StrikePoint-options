import React, { useState, useMemo } from 'react';
import { TradeLeg, Ticker } from '../types/options';
import { calculateScenarioMatrix, analyzeStrategy } from '../utils/blackScholes';
import { playKeyClick } from '../utils/terminalSound';
import { Table, Sliders, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';

interface ScenarioMatrixSCENProps {
  ticker: Ticker;
  legs: TradeLeg[];
  onNavigateToBuilder: () => void;
  onApplyStrategyTemplate: (templateName: string) => void;
}

export const ScenarioMatrixSCEN: React.FC<ScenarioMatrixSCENProps> = ({
  ticker,
  legs,
  onNavigateToBuilder,
  onApplyStrategyTemplate,
}) => {
  const [daysPassed, setDaysPassed] = useState<number>(0);

  const priceShocks = [-10, -6, -3, 0, 3, 6, 10];
  const volShocks = [-10, -5, 0, 5, 10];

  const analysis = useMemo(() => {
    return analyzeStrategy(legs, ticker.price);
  }, [legs, ticker.price]);

  const maxDte = useMemo(() => {
    return legs.length > 0 ? Math.max(...legs.map((l) => l.dte)) : 30;
  }, [legs]);

  const scenarioData = useMemo(() => {
    if (legs.length === 0) return null;
    return calculateScenarioMatrix(legs, ticker.price, priceShocks, volShocks, daysPassed);
  }, [legs, ticker.price, priceShocks, volShocks, daysPassed]);

  // Find min and max for color scaling
  const { minPnl, maxPnl } = useMemo(() => {
    if (!scenarioData) return { minPnl: 0, maxPnl: 0 };
    let min = Infinity;
    let max = -Infinity;
    scenarioData.matrix.forEach((row) => {
      row.forEach((cell) => {
        if (cell.simulatedPnl < min) min = cell.simulatedPnl;
        if (cell.simulatedPnl > max) max = cell.simulatedPnl;
      });
    });
    return { minPnl: min, maxPnl: max };
  }, [scenarioData]);

  const getCellBgColor = (pnl: number) => {
    if (pnl === 0) return 'bg-[#0f1422] text-[#8b9bb4]';
    if (pnl > 0) {
      const intensity = maxPnl > 0 ? Math.min(1, pnl / maxPnl) : 0.5;
      if (intensity > 0.6) return 'bg-[#00e676]/30 text-[#00e676] font-black border border-[#00e676]/40';
      if (intensity > 0.3) return 'bg-[#00e676]/20 text-[#00e676] font-bold';
      return 'bg-[#00e676]/10 text-[#00e676]';
    } else {
      const intensity = minPnl < 0 ? Math.min(1, Math.abs(pnl) / Math.abs(minPnl)) : 0.5;
      if (intensity > 0.6) return 'bg-[#ff334b]/30 text-[#ff334b] font-black border border-[#ff334b]/40';
      if (intensity > 0.3) return 'bg-[#ff334b]/20 text-[#ff334b] font-bold';
      return 'bg-[#ff334b]/10 text-[#ff334b]';
    }
  };

  if (legs.length === 0) {
    return (
      <div className="p-4 sm:p-6 w-full max-w-full ml-0 mr-auto text-left font-mono text-xs">
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-6 sm:p-10 text-left">
          <Table className="w-10 h-10 text-[#ff9900] mb-3" />
          <h3 className="text-sm font-bold text-white mb-2">SCEN // NO POSITION TO STRESS TEST</h3>
          <p className="text-xs text-[#8b9bb4] max-w-md mb-5">
            Load an options position to calculate the institutional 2D Price Shock vs. Volatility
            Shock stress-testing matrix.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('covered-call');
              }}
              className="px-3 py-1.5 bg-[#ff9900] text-black font-extrabold rounded hover:bg-[#ffaa22] transition-all shadow-[0_0_12px_rgba(255,153,0,0.3)] cursor-pointer"
            >
              Load Covered Call
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('iron-condor');
              }}
              className="px-3 py-1.5 bg-[#141b28] text-[#ffd600] border border-[#ffd600]/40 font-bold rounded cursor-pointer"
            >
              Load Iron Condor
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('bull-call-spread');
              }}
              className="px-3 py-1.5 bg-[#141b28] text-[#00d2ff] border border-[#00d2ff]/40 font-bold rounded cursor-pointer"
            >
              Load Bull Call Spread
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-5 w-full max-w-full ml-0 mr-auto text-left flex flex-col gap-4 font-mono text-xs">
      {/* Header Info */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#ff9900] font-black text-sm">
              {ticker.symbol} US Equity SCEN
            </span>
            <span className="text-[#8b9bb4] text-[11px]">
              // 2D PRICE SHOCK vs. VOLATILITY SHOCK MATRIX
            </span>
            <span className="bg-[#1a2336] text-[#ffd600] px-2 py-0.5 rounded text-[10px] font-bold">
              {analysis.name}
            </span>
          </div>
          <div className="text-[11px] text-[#8b9bb4] mt-1">
            Current Stock Price: <strong className="text-white">${ticker.price.toFixed(2)}</strong> ·
            Current IV: <strong className="text-[#00d2ff]">{(ticker.currentIV * 100).toFixed(1)}%</strong>
          </div>
        </div>

        {/* Time decay slider */}
        <div className="flex items-center gap-3 bg-[#0b0f1a] border border-[#1e2638] px-3 py-1.5 rounded">
          <div className="flex flex-col">
            <div className="flex justify-between text-[10px] text-[#8b9bb4]">
              <span>Scenario Time Horizon:</span>
              <span className="text-[#00d2ff] font-bold">T+{daysPassed} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(1, maxDte)}
              value={daysPassed}
              onChange={(e) => setDaysPassed(parseInt(e.target.value, 10))}
              className="w-36 accent-[#00d2ff] h-1.5 bg-[#141b28] rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2D Heatmap Matrix Table */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
        <div className="bg-[#090d16] border-b border-[#1e2638] px-4 py-2 flex items-center justify-between text-[11px]">
          <span className="font-bold text-white uppercase">Projected Net P&L Matrix ($)</span>
          <span className="text-[#8b9bb4]">Columns = Volatility Shift (Vega) · Rows = Underlying Price Move (Delta/Gamma)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b0f1a] border-b border-[#1e2638] text-[#8b9bb4]">
                <th className="py-2.5 px-3 text-left font-bold text-[#ff9900] border-r border-[#1e2638]">
                  PRICE MOVE (%)
                </th>
                <th className="py-2.5 px-3 text-left font-bold text-white border-r border-[#1e2638]">
                  SIMULATED PRICE
                </th>
                {volShocks.map((v) => (
                  <th key={v} className="py-2.5 px-3 font-bold border-r border-[#1e2638]">
                    <span className={v > 0 ? 'text-[#00e676]' : v < 0 ? 'text-[#ff334b]' : 'text-white'}>
                      {v > 0 ? `+${v}% IV` : v < 0 ? `${v}% IV` : 'UNCH (0% IV)'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b28]">
              {scenarioData?.matrix.map((row, rIdx) => {
                const pShock = row[0].priceShockPct;
                const simPrice = row[0].simulatedPrice;
                const isZeroShock = pShock === 0;

                return (
                  <tr
                    key={rIdx}
                    className={`hover:bg-[#121929] transition-colors ${
                      isZeroShock ? 'bg-[#182236]/40 font-bold ring-1 ring-[#ff9900]/30' : ''
                    }`}
                  >
                    {/* Price Shock % */}
                    <td
                      className={`py-2 px-3 text-left font-bold border-r border-[#1e2638] ${
                        pShock > 0 ? 'text-[#00e676]' : pShock < 0 ? 'text-[#ff334b]' : 'text-[#ff9900]'
                      }`}
                    >
                      {pShock > 0 ? `+${pShock}%` : pShock < 0 ? `${pShock}%` : '0% (Current)'}
                    </td>

                    {/* Simulated Price */}
                    <td className="py-2 px-3 text-left font-bold text-white border-r border-[#1e2638]">
                      ${simPrice.toFixed(2)}
                    </td>

                    {/* Cell P&L for each Vol Shock */}
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2 px-3 border-r border-[#1e2638] font-bold ${getCellBgColor(
                          cell.simulatedPnl
                        )}`}
                      >
                        {cell.simulatedPnl >= 0 ? '+' : ''}${cell.simulatedPnl.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extreme Scenario Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#07090e] border border-[#00e676]/30 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">Best Case Matrix Outcome</div>
            <div className="text-xl font-black text-[#00e676]">
              +${maxPnl.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#8b9bb4] mt-1">Peak upside in simulated boundaries</div>
          </div>
          <div className="w-10 h-10 rounded bg-[#00e676]/10 flex items-center justify-center text-[#00e676]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#07090e] border border-[#ff334b]/30 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">Worst Case Matrix Drawdown</div>
            <div className="text-xl font-black text-[#ff334b]">
              -${Math.abs(minPnl).toFixed(2)}
            </div>
            <div className="text-[10px] text-[#8b9bb4] mt-1">Maximum tail-risk stress point</div>
          </div>
          <div className="w-10 h-10 rounded bg-[#ff334b]/10 flex items-center justify-center text-[#ff334b]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
