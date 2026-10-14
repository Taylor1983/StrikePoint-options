import React, { useState } from 'react';
import {
  CanadianAccount,
  CanadianAccountType,
  USDCAD_EXCHANGE_RATE,
  calculateNorbertsGambit,
  convertCurrency,
} from '../services/canadianAccounts';
import {
  X,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Info,
  CheckCircle,
  Building,
  RefreshCw,
  FileText,
  Calculator,
  ExternalLink,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

interface CanadianAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: CanadianAccount[];
  activeAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onNavigateToGIC?: () => void;
}

export const CanadianAccountsModal: React.FC<CanadianAccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onNavigateToGIC,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'cra_limits' | 'norberts_gambit' | 'tax_treaty' | 'options_rules' | 'gic_cdic'>('accounts');
  const [gambitAmount, setGambitAmount] = useState<number>(10000);
  const [gambitDirection, setGambitDirection] = useState<'CAD_TO_USD' | 'USD_TO_CAD'>('CAD_TO_USD');

  if (!isOpen) return null;

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  // Compute total consolidated balances across all accounts
  const totalNetLiqCad = accounts.reduce((acc, a) => {
    const valInCad = a.currency === 'CAD' ? a.cashBalance + a.positions.reduce((pAcc, p) => pAcc + p.currentMark, 0) : (a.cashBalance + a.positions.reduce((pAcc, p) => pAcc + p.currentMark, 0)) * USDCAD_EXCHANGE_RATE;
    return acc + valInCad;
  }, 0);
  const totalNetLiqUsd = totalNetLiqCad / USDCAD_EXCHANGE_RATE;

  const gambitResult = calculateNorbertsGambit(gambitAmount, gambitDirection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col font-mono text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0e1424] px-5 py-3.5 border-b border-[#1e2638] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/30 text-base">
              🇨🇦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm uppercase tracking-wide">
                  CANADIAN ACCOUNTS & CRA TAX SUITE
                </span>
                <span className="bg-[#00d2ff]/20 text-[#00d2ff] font-bold px-2 py-0.5 rounded text-[10px] border border-[#00d2ff]/30">
                  {accounts.length} ACCOUNTS CONFIGURED
                </span>
                <span className="bg-[#ffd600]/20 text-[#ffd600] font-bold px-2 py-0.5 rounded text-[10px] border border-[#ffd600]/30">
                  1 USD = {USDCAD_EXCHANGE_RATE.toFixed(4)} CAD
                </span>
              </div>
              <p className="text-[10.5px] text-[#8b9bb4]">
                Registered Accounts (TFSA, RRSP, FHSA, RESP), Non-Registered Margin, CRA Contribution Tracking & Norbert's Gambit
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

        {/* Tab Navigation */}
        <div className="bg-[#080c14] border-b border-[#1e2638] px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'accounts', label: 'ACCOUNTS DIRECTORY & BLOTTER' },
            { id: 'cra_limits', label: 'CRA CONTRIBUTION LIMITS' },
            { id: 'norberts_gambit', label: "NORBERT'S GAMBIT (FX OPTIMIZER)" },
            { id: 'tax_treaty', label: 'ARTICLE XXI US-CAN TAX TREATY' },
            { id: 'options_rules', label: 'CRA OPTIONS RULES MATRIX' },
            { id: 'gic_cdic', label: 'GICs & CDIC DEPOSIT ENVELOPES' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                playKeyClick();
                setActiveTab(tab.id as any);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all shrink-0 border ${
                activeTab === tab.id
                  ? 'bg-[#ff9900] text-black border-[#ff9900] shadow-sm'
                  : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e293b] hover:text-white hover:border-[#334155]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#050811] space-y-5">
          {/* TAB 1: ACCOUNTS DIRECTORY */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              {/* Consolidated Portfolio Banner */}
              <div className="bg-gradient-to-r from-[#0c1428] via-[#091020] to-[#0c1428] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider font-bold">
                      CONSOLIDATED PORTFOLIO VALUE (ALL {accounts.length} CANADIAN ACCOUNTS)
                    </span>
                    <span className="bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.5 rounded text-[9px] font-black border border-[#00e676]/30">
                      LIVE CONVERSION
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-2xl font-black text-white">
                      ${totalNetLiqCad.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                    </span>
                    <span className="text-sm font-bold text-[#00d2ff]">
                      ≈ ${totalNetLiqUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[#94a3b8] mt-1">
                    Includes TFSA, RRSP, FHSA, RESP, and Non-Registered Margin portfolios.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8b9bb4]">Active Trading Account:</span>
                  <span className="px-2.5 py-1 bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/50 rounded font-black text-xs">
                    {activeAccount.name}
                  </span>
                </div>
              </div>

              {/* Accounts Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {accounts.map((acc) => {
                  const isSelected = acc.id === activeAccountId;
                  const posValue = acc.positions.reduce((pSum, p) => pSum + p.currentMark, 0);
                  const netLiq = acc.cashBalance + posValue;
                  const totalUnrealized = acc.positions.reduce((pSum, p) => pSum + p.unrealizedPnL, 0);

                  return (
                    <div
                      key={acc.id}
                      className={`bg-[#0b101e] border rounded-lg p-3.5 flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-[#ff9900] shadow-[0_0_15px_rgba(255,153,0,0.2)] bg-[#0f172a]'
                          : 'border-[#1e293b] hover:border-[#334155]'
                      }`}
                    >
                      <div>
                        {/* Top: Institution & Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[9px] text-[#8b9bb4] uppercase tracking-wider block">
                              {acc.institution} · {acc.accountNumber}
                            </span>
                            <div className="font-extrabold text-white text-xs mt-0.5">{acc.name}</div>
                          </div>
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded border"
                            style={{
                              backgroundColor: `${acc.color}20`,
                              borderColor: `${acc.color}50`,
                              color: acc.color,
                            }}
                          >
                            {acc.code}
                          </span>
                        </div>

                        {/* Balance Readout */}
                        <div className="bg-[#050811] p-2.5 rounded border border-[#1e2638] my-2">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[9.5px] text-[#64748b]">NET LIQUIDITY:</span>
                            <span className="font-black text-white text-sm">
                              ${netLiq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                              <span className="text-[10px] text-[#8b9bb4]">{acc.currency}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-[#8b9bb4]">
                            <span>Cash: ${acc.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className={totalUnrealized >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                              {totalUnrealized >= 0 ? '+' : ''}${totalUnrealized.toFixed(0)} P&L
                            </span>
                          </div>
                        </div>

                        {/* Options Level & CRA Notes */}
                        <div className="text-[9.5px] text-[#94a3b8] space-y-1 mb-3">
                          <div className="flex items-center gap-1 text-[#cbd5e1]">
                            <ShieldCheck className="w-3 h-3 text-[#00d2ff] shrink-0" />
                            <span className="truncate">{acc.optionsLevelLabel}</span>
                          </div>
                          <div className="text-[#64748b] leading-tight">
                            {acc.taxStatusDescription}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          playExecutionChime();
                          onSelectAccount(acc.id);
                        }}
                        className={`w-full py-1.5 px-3 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#ff9900] text-black font-black'
                            : 'bg-[#141d33] hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white border border-[#222d44]'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>ACTIVE ACCOUNT</span>
                          </>
                        ) : (
                          <span>SWITCH TO THIS ACCOUNT</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CRA CONTRIBUTION LIMITS */}
          {activeTab === 'cra_limits' && (
            <div className="space-y-4">
              <div className="bg-[#0b101e] border border-[#1e293b] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="w-4 h-4 text-[#ff9900]" />
                  <span className="font-extrabold text-white text-xs">
                    CANADA REVENUE AGENCY (CRA) REGISTERED CONTRIBUTION ROOM TRACKER (2026)
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9bb4]">
                  Track annual limits, cumulative contribution room, and avoid the punitive 1% per month CRA over-contribution penalty.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TFSA Room Card */}
                <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-[#00d2ff] text-sm">🇨🇦 TFSA LIMIT</span>
                      <span className="bg-[#00d2ff]/20 text-[#00d2ff] text-[9px] px-2 py-0.5 rounded font-bold">
                        TAX-FREE
                      </span>
                    </div>
                    <div className="text-xl font-black text-white mb-1">$7,000 CAD <span className="text-xs text-[#8b9bb4]">/ YEAR</span></div>
                    <p className="text-[10px] text-[#8b9bb4] mb-3">Cumulative lifetime room since 2009: $95,000 CAD</p>

                    <div className="space-y-2 bg-[#050811] p-3 rounded border border-[#1e2638] text-[10.5px]">
                      <div className="flex justify-between text-[#cbd5e1]">
                        <span>Contributed This Year:</span>
                        <strong className="text-white">$4,500 CAD</strong>
                      </div>
                      <div className="w-full bg-[#1e2638] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#00d2ff] h-full rounded-full" style={{ width: `${(4500 / 7000) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[#00e676] font-bold">
                        <span>Available Room Remaining:</span>
                        <span>$2,500 CAD</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-[#64748b]">
                    Withdrawals from TFSA re-add to contribution room on January 1 of the following calendar year.
                  </div>
                </div>

                {/* RRSP Room Card */}
                <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-[#00e676] text-sm">🇨🇦 RRSP DEDUCTION</span>
                      <span className="bg-[#00e676]/20 text-[#00e676] text-[9px] px-2 py-0.5 rounded font-bold">
                        TAX-DEFERRED
                      </span>
                    </div>
                    <div className="text-xl font-black text-white mb-1">$31,560 CAD <span className="text-xs text-[#8b9bb4]">/ MAX</span></div>
                    <p className="text-[10px] text-[#8b9bb4] mb-3">18% of prior earned income up to CRA dollar ceiling</p>

                    <div className="space-y-2 bg-[#050811] p-3 rounded border border-[#1e2638] text-[10.5px]">
                      <div className="flex justify-between text-[#cbd5e1]">
                        <span>Deducted This Year:</span>
                        <strong className="text-white">$12,000 CAD</strong>
                      </div>
                      <div className="w-full bg-[#1e2638] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#00e676] h-full rounded-full" style={{ width: `${(12000 / 31560) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[#00e676] font-bold">
                        <span>Unused Deduction Room:</span>
                        <span>$19,560 CAD</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-[#64748b]">
                    Contributions directly lower your taxable income bracket on your federal T1 tax return.
                  </div>
                </div>

                {/* FHSA Room Card */}
                <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-[#ff9900] text-sm">🇨🇦 FHSA FIRST HOME</span>
                      <span className="bg-[#ff9900]/20 text-[#ff9900] text-[9px] px-2 py-0.5 rounded font-bold">
                        DUAL BENEFIT
                      </span>
                    </div>
                    <div className="text-xl font-black text-white mb-1">$8,000 CAD <span className="text-xs text-[#8b9bb4]">/ YEAR</span></div>
                    <p className="text-[10px] text-[#8b9bb4] mb-3">Lifetime maximum: $40,000 CAD across 5 years</p>

                    <div className="space-y-2 bg-[#050811] p-3 rounded border border-[#1e2638] text-[10.5px]">
                      <div className="flex justify-between text-[#cbd5e1]">
                        <span>Contributed This Year:</span>
                        <strong className="text-[#ffd600]">$8,000 CAD (MAXED)</strong>
                      </div>
                      <div className="w-full bg-[#1e2638] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#ff9900] h-full rounded-full" style={{ width: '100%' }} />
                      </div>
                      <div className="flex justify-between text-[#8b9bb4] font-bold">
                        <span>2026 Room Remaining:</span>
                        <span>$0 CAD (100% Filled)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-[#64748b]">
                    Withdrawals for qualifying first-home down payment are completely tax-free without repayment requirements.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NORBERT'S GAMBIT SIMULATOR */}
          {activeTab === 'norberts_gambit' && (
            <div className="space-y-4">
              <div className="bg-[#0b101e] border border-[#1e293b] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-[#00d2ff]" />
                  <span className="font-extrabold text-white text-xs">
                    NORBERT'S GAMBIT (DLR / DLR.U) CAD ⇄ USD CONVERSION SIMULATOR
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9bb4]">
                  Canadian investors use Horizons DLR ETF on the Toronto Stock Exchange (TSX) to exchange currencies at the spot mid-market rate, bypassing the typical 1.5% to 2.5% bank foreign exchange fee.
                </p>
              </div>

              {/* Calculator Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0b101e] border border-[#1e293b] p-4 rounded-lg space-y-3">
                  <span className="text-[10px] font-bold text-[#8b9bb4] uppercase block">
                    CONVERSION PARAMETERS
                  </span>

                  <div>
                    <label className="text-[10px] text-[#64748b] block mb-1">Conversion Direction:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          playKeyClick();
                          setGambitDirection('CAD_TO_USD');
                        }}
                        className={`py-1.5 px-3 rounded font-bold text-xs border ${
                          gambitDirection === 'CAD_TO_USD'
                            ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black'
                            : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e293b]'
                        }`}
                      >
                        CAD ➔ USD
                      </button>
                      <button
                        onClick={() => {
                          playKeyClick();
                          setGambitDirection('USD_TO_CAD');
                        }}
                        className={`py-1.5 px-3 rounded font-bold text-xs border ${
                          gambitDirection === 'USD_TO_CAD'
                            ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black'
                            : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e293b]'
                        }`}
                      >
                        USD ➔ CAD
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#64748b] block mb-1">
                      Amount to Convert ({gambitDirection === 'CAD_TO_USD' ? 'CAD' : 'USD'}):
                    </label>
                    <input
                      type="number"
                      step={500}
                      min={1000}
                      value={gambitAmount}
                      onChange={(e) => setGambitAmount(Number(e.target.value) || 0)}
                      className="w-full bg-[#050811] border border-[#1e2638] rounded px-3 py-1.5 text-white font-mono font-bold focus:border-[#ff9900] focus:outline-none"
                    />
                  </div>

                  <div className="text-[10px] text-[#8b9bb4] bg-[#050811] p-2.5 rounded border border-[#1e2638] space-y-1">
                    <div className="flex justify-between">
                      <span>DLR.TO (CAD Share Price):</span>
                      <strong className="text-white">${gambitResult.dlrSharePriceCad.toFixed(2)} CAD</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>DLR.U.TO (USD Share Price):</span>
                      <strong className="text-white">${gambitResult.dlrSharePriceUsd.toFixed(2)} USD</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Shares to Buy on TSX:</span>
                      <strong className="text-[#ff9900]">{gambitResult.sharesToTrade.toLocaleString()} shs</strong>
                    </div>
                  </div>
                </div>

                {/* Savings Breakdown */}
                <div className="bg-[#0b101e] border-2 border-[#00e676]/40 p-4 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-[#00e676] uppercase">
                        ESTIMATED SAVINGS VS RETAIL BIG-5 BANK
                      </span>
                      <span className="bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.5 rounded text-[9px] font-black">
                        ZERO SPREAD
                      </span>
                    </div>

                    <div className="text-2xl font-black text-[#00e676] my-2">
                      +${gambitResult.netSavingsCad.toFixed(2)} CAD Saved
                    </div>

                    <p className="text-[10.5px] text-[#94a3b8] mb-4">
                      Big-5 Canadian banks charge a 1.5%–2.5% FX markup. Norbert's Gambit exchanges via TSX inter-listed units at institutional spot.
                    </p>

                    <div className="space-y-1.5 text-[10.5px] border-t border-[#1e293b] pt-3">
                      <div className="flex justify-between text-[#8b9bb4]">
                        <span>Bank Retail Spread Markup (2.0%):</span>
                        <span className="text-[#ff334b] font-bold">-${gambitResult.retailBankSpreadCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#8b9bb4]">
                        <span>Brokerage ECN & Journal Fee:</span>
                        <span className="text-white">~${gambitResult.norbertsGambitBrokerFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold pt-1 border-t border-[#1e2638]">
                        <span>Net Received:</span>
                        <span className="text-[#00d2ff]">
                          ${gambitResult.netTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                          {gambitResult.targetCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e293b] text-[9.5px] text-[#64748b]">
                    Supported at Questrade, TD Direct Investing, BMO InvestorLine, RBC Direct Investing, and National Bank Direct Brokerage.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARTICLE XXI US-CAN TAX TREATY */}
          {activeTab === 'tax_treaty' && (
            <div className="space-y-4">
              <div className="bg-[#0b101e] border border-[#1e293b] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[#ffd600]" />
                  <span className="font-extrabold text-white text-xs">
                    ARTICLE XXI OF THE US-CANADA INCOME TAX CONVENTION (DIVIDEND WITHHOLDING TAX)
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9bb4]">
                  Optimize where you hold US vs Canadian dividend stocks to avoid unrecoverable 15% IRS non-resident withholding taxes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RRSP Advantage */}
                <div className="bg-[#0b101e] border-2 border-[#00e676]/40 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-[#00e676] font-black text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>RRSP / RRIF: 0% US WITHHOLDING TAX</span>
                  </div>
                  <p className="text-[11px] text-[#cbd5e1] leading-relaxed mb-3">
                    Under Article XXI, paragraph 2 of the Canada-US Tax Treaty, the IRS formally recognizes Canadian registered pension and retirement plans.
                  </p>
                  <div className="bg-[#050811] p-3 rounded border border-[#1e2638] text-[10.5px] space-y-2">
                    <div className="text-white font-bold">Recommended Asset Allocation:</div>
                    <p className="text-[#94a3b8]">
                      • <strong>Hold here:</strong> US dividend payers (e.g. MSFT, AAPL, JNJ, KO) and US-listed ETFs (SPY, VOO, QQQ).
                    </p>
                    <p className="text-[#94a3b8]">
                      • <strong>Benefit:</strong> You receive 100% of the gross dividend with zero IRS deduction.
                    </p>
                  </div>
                </div>

                {/* TFSA & FHSA Consideration */}
                <div className="bg-[#0b101e] border border-[#ffd600]/40 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-[#ffd600] font-black text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>TFSA / FHSA / RESP: 15% TAX WITHHELD</span>
                  </div>
                  <p className="text-[11px] text-[#cbd5e1] leading-relaxed mb-3">
                    The IRS does NOT classify the TFSA or FHSA as a retirement pension. Therefore, US-listed dividend stocks face automatic 15% withholding at source.
                  </p>
                  <div className="bg-[#050811] p-3 rounded border border-[#1e2638] text-[10.5px] space-y-2">
                    <div className="text-white font-bold">Recommended Asset Allocation:</div>
                    <p className="text-[#94a3b8]">
                      • <strong>Hold here:</strong> Canadian high-dividend stocks (RY.TO, ENB.TO, TD.TO), Canadian index ETFs (XIU.TO, VFV.TO), or non-dividend growth stocks.
                    </p>
                    <p className="text-[#94a3b8]">
                      • <strong>Note:</strong> Capital gains are still 100% tax-free in TFSA. Only US dividends are shaved by 15%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CRA OPTIONS RULES MATRIX */}
          {activeTab === 'options_rules' && (
            <div className="space-y-4">
              <div className="bg-[#0b101e] border border-[#1e2638] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#00d2ff]" />
                  <span className="font-extrabold text-white text-xs">
                    CRA OPTIONS ELIGIBILITY RULES FOR CANADIAN BROKERAGE ACCOUNTS
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9bb4]">
                  The Income Tax Act strictly enforces that registered accounts cannot borrow on margin or issue uncollateralized guarantees.
                </p>
              </div>

              <div className="overflow-x-auto border border-[#1e2638] rounded bg-[#070b14]">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#0e1424] text-[#8b9bb4] text-[10px] uppercase border-b border-[#1e2638]">
                      <th className="py-2.5 px-3">Options Strategy</th>
                      <th className="py-2.5 px-3 text-center">TFSA</th>
                      <th className="py-2.5 px-3 text-center">RRSP / RRIF</th>
                      <th className="py-2.5 px-3 text-center">FHSA</th>
                      <th className="py-2.5 px-3 text-center">Margin (Non-Reg)</th>
                      <th className="py-2.5 px-3">CRA / Brokerage Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2638]/50">
                    <tr>
                      <td className="py-2 px-3 font-bold text-white">Covered Call (Buy-Write)</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#cbd5e1] text-[10px]">Fully collateralized by 100 shares underlying</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-white">Long Call / Long Put</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#cbd5e1] text-[10px]">Defined risk, 100% paid upfront in cash</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-white">Protective / Married Put</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#cbd5e1] text-[10px]">Downside insurance hedge for equity holdings</td>
                    </tr>
                    <tr className="bg-[#ff334b]/5">
                      <td className="py-2 px-3 font-bold text-[#ff334b]">Vertical Debit & Credit Spreads</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#94a3b8] text-[10px]">Requires margin collateral under IIROC rules</td>
                    </tr>
                    <tr className="bg-[#ff334b]/5">
                      <td className="py-2 px-3 font-bold text-[#ff334b]">Iron Condors & Butterflies</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#94a3b8] text-[10px]">Multi-leg margin requirement not permitted</td>
                    </tr>
                    <tr className="bg-[#ff334b]/5">
                      <td className="py-2 px-3 font-bold text-[#ff334b]">Naked Short Calls / Puts</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#94a3b8] text-[10px]">Undefined risk; violates CRA registered status</td>
                    </tr>
                    <tr className="bg-[#ff334b]/5">
                      <td className="py-2 px-3 font-bold text-[#ff334b]">Short Equities & Commodity Futures</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#ff334b] font-bold">PROHIBITED</td>
                      <td className="py-2 px-3 text-center text-[#00e676] font-bold">ALLOWED</td>
                      <td className="py-2 px-3 text-[#94a3b8] text-[10px]">Borrowing securities not allowed in registered trusts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: GICs & CDIC DEPOSIT ENVELOPES */}
          {activeTab === 'gic_cdic' && (
            <div className="space-y-4">
              <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-extrabold text-white">
                    GUARANTEED INVESTMENT CERTIFICATES (GICs) IN REGISTERED &amp; CASH PORTFOLIOS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[10px] font-bold border border-[#00e676]/30">
                    QUALIFIED INVESTMENT UNDER CRA INCOME TAX ACT
                  </span>
                </div>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  GICs are 100% qualified investments across all Canadian accounts (TFSA, RRSP, FHSA, RESP, Corporate &amp; Non-Registered Margin). All eligible GIC deposits are insured up to <strong>C$100,000 per insured category per CDIC member institution</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-[11px]">
                  <div className="bg-[#070b14] p-3 rounded border border-[#162033] flex flex-col gap-1">
                    <span className="text-[#ff9900] font-bold">TFSA GIC Treatment</span>
                    <span className="text-[#cbd5e1]">100% Tax-Free Interest. Ideal for cash buffers and capital preservation without consuming volatile risk budget.</span>
                  </div>

                  <div className="bg-[#070b14] p-3 rounded border border-[#162033] flex flex-col gap-1">
                    <span className="text-[#38bdf8] font-bold">RRSP / RRIF GIC Treatment</span>
                    <span className="text-[#cbd5e1]">Tax-deferred growth. Eliminates standard income tax drag on fixed-income yields until eventual retirement drawdown.</span>
                  </div>

                  <div className="bg-[#070b14] p-3 rounded border border-[#162033] flex flex-col gap-1">
                    <span className="text-[#00e676] font-bold">FHSA GIC Treatment</span>
                    <span className="text-[#cbd5e1]">Tax-deductible contributions + 100% tax-free interest when withdrawn for qualifying first home purchase. Zero downside risk.</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded bg-[#050810] border border-[#1e293b] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10.5px] text-[#8b9bb4]">
                    <span>Current Top Canadian 1-Yr Fixed: <strong className="text-[#00e676]">4.40% APY</strong></span>
                    <span className="mx-2">·</span>
                    <span>5-Yr Fixed: <strong className="text-[#00e676]">4.15% APY</strong></span>
                  </div>
                  {onNavigateToGIC ? (
                    <button
                      type="button"
                      onClick={() => {
                        playExecutionChime();
                        onClose();
                        onNavigateToGIC();
                      }}
                      className="px-3 py-1.5 rounded bg-[#00e676] hover:bg-[#00c853] text-black font-extrabold text-[10.5px] flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                    >
                      <span>LAUNCH GIC ROLLOVER &amp; PURCHASE DESK &rarr;</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#ff9900] font-bold">
                      Access full GIC terminal with compound calculator via &lt;GIC&gt; key
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0e1424] px-5 py-3 border-t border-[#1e2638] flex items-center justify-between shrink-0">
          <div className="text-[10.5px] text-[#8b9bb4]">
            Canadian Brokerage Support: Questrade · TD Direct Investing · Wealthsimple · RBC DI · BMO · Interactive Brokers Canada
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#1e2638] hover:bg-[#2b354d] text-white font-bold text-xs transition-all"
          >
            Close Canadian Suite
          </button>
        </div>
      </div>
    </div>
  );
};
