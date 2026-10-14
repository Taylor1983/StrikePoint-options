import React, { useState, useEffect } from 'react';
import { Ticker, Order, Position, TradeLeg } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { X, DollarSign, TrendingUp, TrendingDown, ArrowRight, ShieldAlert, Sparkles, PieChart, Layers } from 'lucide-react';

interface StockTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: Ticker;
  cashBalance: number;
  onExecuteTrade: (order: Order, position: Position) => void;
  initialFractionalMode?: boolean;
}

export const StockTradeModal: React.FC<StockTradeModalProps> = ({
  isOpen,
  onClose,
  ticker,
  cashBalance,
  onExecuteTrade,
  initialFractionalMode = false,
}) => {
  if (!isOpen) return null;

  const isFuture = ticker.symbol.startsWith('/') || ticker.assetType === 'future';
  const defaultQuantity = isFuture ? 1 : initialFractionalMode ? 0.5 : 10;

  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [entryMode, setEntryMode] = useState<'shares' | 'dollars'>('shares');
  const [quantity, setQuantity] = useState<number>(defaultQuantity);
  const [dollarAmount, setDollarAmount] = useState<number>(defaultQuantity * ticker.price);
  const [limitPrice, setLimitPrice] = useState<number>(ticker.price);

  const multiplier = isFuture ? (ticker.multiplier || 50) : 1;
  const executionPrice = orderType === 'market' ? ticker.price : limitPrice;
  const currencyPrefix = ticker.currency === 'CAD' || ticker.symbol.endsWith('.TO') ? 'C$' : '$';

  // Synchronize when executionPrice changes
  useEffect(() => {
    if (entryMode === 'dollars' && !isFuture && executionPrice > 0) {
      const calculatedQty = Number((dollarAmount / executionPrice).toFixed(4));
      setQuantity(calculatedQty > 0 ? calculatedQty : 0.0001);
    }
  }, [executionPrice, entryMode, dollarAmount, isFuture]);

  const handleShareChange = (val: number) => {
    const safeQty = Math.max(isFuture ? 1 : 0.0001, Number(val));
    setQuantity(safeQty);
    setDollarAmount(Number((safeQty * executionPrice).toFixed(2)));
  };

  const handleDollarChange = (dollars: number) => {
    const safeDollars = Math.max(1, Number(dollars));
    setDollarAmount(safeDollars);
    if (executionPrice > 0) {
      const calculatedQty = Number((safeDollars / executionPrice).toFixed(4));
      setQuantity(calculatedQty > 0 ? calculatedQty : 0.0001);
    }
  };

  // Notional value & estimated cash/margin requirement
  const notionalCost = Number((quantity * executionPrice * multiplier).toFixed(2));
  // Margin required: full cash for stock buy, or initial margin for futures
  const futureMarginPerContract = ticker.symbol === '/SXF'
    ? 14200
    : ticker.symbol === '/SXM'
    ? 3550
    : ticker.symbol === '/SCF'
    ? 11800
    : ticker.symbol === '/CGB'
    ? 2800
    : ticker.symbol === '/CRA'
    ? 1250
    : ticker.symbol === '/CGF'
    ? 1900
    : ticker.symbol === '/6C'
    ? 1650
    : 5000;
  const marginRequired = isFuture ? quantity * futureMarginPerContract : notionalCost;
  const hasSufficientBP = cashBalance >= marginRequired;

  const isFractional = !isFuture && quantity % 1 !== 0;

  const handleSendOrder = () => {
    if (!hasSufficientBP && action === 'buy') {
      return;
    }

    playExecutionChime();

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const orderId = `ORD-${isFuture ? 'FUT' : isFractional ? 'FRAC' : 'STK'}-${Date.now().toString().slice(-6)}`;
    const positionId = `POS-${isFuture ? 'FUT' : isFractional ? 'FRAC' : 'STK'}-${Date.now().toString().slice(-6)}`;
    const tradeIV = ticker.currentIV || 0.25;

    const formattedSharesStr = quantity % 1 === 0 ? `${quantity}` : `${quantity.toFixed(4)}`;

    const leg: TradeLeg = {
      id: `leg-${orderId}`,
      type: isFuture ? 'future' : 'stock',
      action,
      strike: executionPrice,
      expiration: isFuture ? 'Front Month' : 'Perpetual',
      dte: 0,
      iv: tradeIV,
      premium: executionPrice,
      contracts: quantity,
      multiplier,
      underlyingSymbol: ticker.symbol,
    };

    const isDebit = action === 'buy';
    const cashImpact = isDebit ? notionalCost : -notionalCost;

    const newOrder: Order = {
      id: orderId,
      timestamp,
      ticker: ticker.symbol,
      strategyName: `${action === 'buy' ? 'Long' : 'Short'} ${isFuture ? 'Futures' : 'Stock'} (${formattedSharesStr} ${isFuture ? 'cts' : 'shs'})${isFractional ? ' [Fractional]' : ''}`,
      type: orderType,
      limitPrice: executionPrice,
      legs: [leg],
      contracts: quantity,
      netDebitCredit: cashImpact,
      totalCost: notionalCost,
      status: 'filled',
      assetCategory: isFuture ? 'future' : 'stock',
      sharesOrContracts: quantity,
      entryIV: tradeIV,
      tradeIV,
    };

    const newPosition: Position = {
      id: positionId,
      ticker: ticker.symbol,
      strategyName: `${action === 'buy' ? 'Long' : 'Short'} ${isFuture ? 'Future' : 'Stock'} (${formattedSharesStr} ${isFuture ? 'cts' : 'shs'})`,
      openedAt: timestamp,
      legs: [leg],
      contracts: quantity,
      entryCost: cashImpact,
      currentMark: cashImpact,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      assetCategory: isFuture ? 'future' : 'stock',
      sharesOrContracts: quantity,
      entryIV: tradeIV,
      tradeIV,
    };

    onExecuteTrade(newOrder, newPosition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono text-xs">
      <div className="bg-[#1e1e1e] border-2 border-[var(--accent)] rounded max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[var(--sidebar-bg)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)] font-black text-sm">
              {isFuture ? 'FUTURES ORDER TICKET' : 'EQUITY & ETF ORDER TICKET'}
            </span>
            <span className="text-[#fff] font-bold">
              {ticker.symbol} · ${ticker.price.toFixed(2)}
            </span>
            <span className={ticker.change >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
              {ticker.change >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
            </span>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="text-[#8c8c8c] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3.5">
          {/* Action Tabs: BUY vs SELL */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                playKeyClick();
                setAction('buy');
              }}
              className={`py-2 rounded font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
                action === 'buy'
                  ? 'bg-[var(--bull)] text-white shadow-md'
                  : 'bg-[#141b28] text-[#8c8c8c] border border-[#222d44] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY / GO LONG</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setAction('sell');
              }}
              className={`py-2 rounded font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${
                action === 'sell'
                  ? 'bg-[var(--bear)] text-white shadow-md'
                  : 'bg-[#141b28] text-[#8c8c8c] border border-[#222d44] hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL / GO SHORT</span>
            </button>
          </div>

          {/* Fractional Trading Mode Switcher (Shares vs Dollars) */}
          {!isFuture && (
            <div className="flex items-center justify-between bg-[#12151b] border border-[#232d42] p-1.5 rounded text-[10.5px]">
              <div className="flex items-center gap-1.5 font-bold text-[#8b9bb4]">
                <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span className="text-white">FRACTIONAL TRADING:</span>
                <span className="text-[#00e676] text-[9px] px-1 py-0.2 rounded bg-[#00e676]/10 border border-[#00e676]/30 font-black">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#090c12] p-0.5 rounded border border-[#1e2638]">
                <button
                  onClick={() => {
                    playKeyClick();
                    setEntryMode('shares');
                  }}
                  className={`px-2.5 py-0.5 rounded font-extrabold transition-all ${
                    entryMode === 'shares'
                      ? 'bg-[#00d2ff] text-black shadow-sm'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  BY SHARES
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setEntryMode('dollars');
                  }}
                  className={`px-2.5 py-0.5 rounded font-extrabold transition-all flex items-center gap-0.5 ${
                    entryMode === 'dollars'
                      ? 'bg-[#ffd600] text-black shadow-sm'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>BY DOLLARS ($)</span>
                </button>
              </div>
            </div>
          )}

          {/* Quantity or Dollar Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] text-[#8c8c8c] font-bold">
              <span>
                {isFuture
                  ? 'NUMBER OF CONTRACTS:'
                  : entryMode === 'dollars'
                  ? `INVESTMENT AMOUNT (${currencyPrefix}):`
                  : 'NUMBER OF SHARES (FRACTIONAL PERMITTED):'}
              </span>
              {!isFuture && (
                <span className="text-[#38bdf8] font-mono">
                  {entryMode === 'dollars'
                    ? `≈ ${quantity.toFixed(4)} Shares`
                    : `≈ ${currencyPrefix}${notionalCost.toFixed(2)} Notional`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {entryMode === 'shares' || isFuture ? (
                <input
                  type="number"
                  step={isFuture ? 1 : 0.0001}
                  min={isFuture ? 1 : 0.0001}
                  max="100000"
                  value={quantity}
                  onChange={(e) => handleShareChange(parseFloat(e.target.value) || 0)}
                  className="bg-[#111] border border-[#3c3c3c] text-white font-extrabold text-sm px-3 py-1.5 rounded w-36 font-mono focus:border-[#00d2ff] focus:outline-none"
                  placeholder="0.0000"
                />
              ) : (
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1.5 text-sm font-bold text-[#ffd600]">
                    {currencyPrefix}
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="1000000"
                    value={dollarAmount}
                    onChange={(e) => handleDollarChange(parseFloat(e.target.value) || 0)}
                    className="bg-[#111] border border-[#3c3c3c] text-[#ffd600] font-extrabold text-sm pl-7 pr-3 py-1.5 rounded w-full font-mono focus:border-[#ffd600] focus:outline-none"
                    placeholder="100.00"
                  />
                </div>
              )}

              {/* Quick Quick Preset Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {isFuture ? (
                  [1, 2, 5, 10].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => {
                        playKeyClick();
                        handleShareChange(qty);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                        quantity === qty
                          ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                          : 'bg-[#181a1d] text-[#8c8c8c] border-[#333] hover:text-white'
                      }`}
                    >
                      {qty} ct
                    </button>
                  ))
                ) : entryMode === 'shares' ? (
                  [0.1, 0.25, 0.5, 1, 5, 10, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => {
                        playKeyClick();
                        handleShareChange(qty);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                        Math.abs(quantity - qty) < 0.0001
                          ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-extrabold'
                          : 'bg-[#181a1d] text-[#8c8c8c] border-[#333] hover:text-white'
                      }`}
                    >
                      {qty < 1 ? `${qty} sh` : `${qty}`}
                    </button>
                  ))
                ) : (
                  [25, 50, 100, 250, 500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        playKeyClick();
                        handleDollarChange(amt);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                        Math.abs(dollarAmount - amt) < 0.01
                          ? 'bg-[#ffd600] text-black border-[#ffd600] font-extrabold'
                          : 'bg-[#181a1d] text-[#8c8c8c] border-[#333] hover:text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))
                )}

                {/* Max Cash BP Button */}
                {!isFuture && cashBalance > 0 && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      if (entryMode === 'dollars') {
                        handleDollarChange(Math.floor(cashBalance));
                      } else {
                        handleShareChange(Number((cashBalance / executionPrice).toFixed(4)));
                      }
                    }}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#34d399] border border-[#10b981]/40 transition-all shrink-0"
                    title="Fill entire available account buying power"
                  >
                    MAX BP
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Order Type & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#8c8c8c] font-bold block mb-1">
                ORDER TYPE:
              </label>
              <select
                value={orderType}
                onChange={(e) => {
                  playKeyClick();
                  setOrderType(e.target.value as 'market' | 'limit');
                }}
                className="w-full bg-[#111] border border-[#3c3c3c] text-white px-2 py-1.5 rounded font-mono font-bold"
              >
                <option value="market">MARKET</option>
                <option value="limit">LIMIT</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8c8c8c] font-bold block mb-1">
                {orderType === 'market' ? 'MARKET PRICE ($):' : 'LIMIT PRICE ($):'}
              </label>
              <input
                type="number"
                step={ticker.tickSize || 0.01}
                disabled={orderType === 'market'}
                value={orderType === 'market' ? ticker.price : limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || ticker.price)}
                className={`w-full bg-[#111] border border-[#3c3c3c] text-white px-2 py-1.5 rounded font-mono font-bold ${
                  orderType === 'market' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Execution Cost & Buying Power Impact Details */}
          <div className="bg-[#121417] border border-[#2d3339] p-3 rounded flex flex-col gap-2 text-[11px]">
            <div className="flex justify-between items-center text-[#8c8c8c]">
              <span>Shares / Unit Allocation:</span>
              <span className="text-white font-mono font-bold flex items-center gap-1.5">
                <span>{quantity % 1 === 0 ? quantity : quantity.toFixed(4)} {isFuture ? 'cts' : 'shares'}</span>
                {isFractional && (
                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 font-bold">
                    FRACTIONAL
                  </span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#8c8c8c]">
              <span>Estimated Notional Value:</span>
              <span className="text-white font-extrabold font-mono">
                {currencyPrefix}{notionalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#8c8c8c]">
              <span>Required Cash / Margin:</span>
              <span className="text-[#ffd600] font-extrabold font-mono">
                {currencyPrefix}{marginRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#8c8c8c]">
              <span className="flex items-center gap-1 text-[#c084fc]">
                <span>Trade Implied Volatility (IV):</span>
              </span>
              <span className="text-[#c084fc] font-extrabold font-mono flex items-center gap-1.5">
                <span>{((ticker.currentIV || 0.25) * 100).toFixed(1)}%</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#d8b4fe]">
                  LOGGED AT FILL
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-[#26292d] pt-1.5">
              <span className="text-[#8c8c8c]">Available Account BP:</span>
              <span className={hasSufficientBP ? 'text-[var(--bull)] font-bold' : 'text-[var(--bear)] font-bold'}>
                ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#8c8c8c]">
              <span>Cash Remaining After Fill:</span>
              <span className="font-mono text-white">
                ${Math.max(0, action === 'buy' ? cashBalance - notionalCost : cashBalance + notionalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {!hasSufficientBP && action === 'buy' && (
            <div className="bg-[#e53935]/20 border border-[#e53935]/50 text-[#e53935] p-2 rounded flex items-center gap-2 text-[10px]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Insufficient Buying Power to execute this order. Reduce quantity or trade a smaller dollar fraction.</span>
            </div>
          )}
        </div>

        {/* Footer Execution Action */}
        <div className="bg-[var(--sidebar-bg)] border-t border-[var(--border)] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="tos-btn px-4"
          >
            CANCEL
          </button>

          <button
            onClick={handleSendOrder}
            disabled={(!hasSufficientBP && action === 'buy') || quantity <= 0}
            className={`px-6 py-2 rounded font-black text-xs transition-all shadow-lg flex items-center gap-2 ${
              action === 'buy'
                ? 'bg-[var(--bull)] hover:bg-[#4caf50] text-white'
                : 'bg-[var(--bear)] hover:bg-[#ef5350] text-white'
            } ${((!hasSufficientBP && action === 'buy') || quantity <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>TRANSMIT {action.toUpperCase()} ORDER ({quantity % 1 === 0 ? quantity : quantity.toFixed(4)} SHS)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
