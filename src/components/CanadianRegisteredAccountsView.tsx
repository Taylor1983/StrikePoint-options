import React, { useState } from 'react';
import {
  CanadianAccount,
  USDCAD_EXCHANGE_RATE,
  calculateNorbertsGambit,
  convertCurrency,
} from '../services/canadianAccounts';
import {
  ShieldCheck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Info,
  CheckCircle,
  Building,
  RefreshCw,
  Calculator,
  FileText,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { maskCurrency } from '../utils/privacy';

interface CanadianRegisteredAccountsViewProps {
  accounts: CanadianAccount[];
  activeAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onNavigateToGIC?: () => void;
  isPrivacyMode?: boolean;
}

export const CanadianRegisteredAccountsView: React.FC<CanadianRegisteredAccountsViewProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onNavigateToGIC,
  isPrivacyMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'cra_limits' | 'norberts_gambit' | 'tax_treaty' | 'options_rules' | 'gic_cdic'>('accounts');
  const [gambitAmount, setGambitAmount] = useState<number>(10000);
  const [gambitDirection, setGambitDirection] = useState<'CAD_TO_USD' | 'USD_TO_CAD'>('CAD_TO_USD');

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  // Compute total consolidated balances across all accounts
  const totalNetLiqCad = accounts.reduce((acc, a) => {
    const valInCad = a.currency === 'CAD'
      ? a.cashBalance + a.positions.reduce((pAcc, p) => pAcc + p.currentMark, 0)
      : (a.cashBalance + a.positions.reduce((pAcc, p) => pAcc + p.currentMark, 0)) * USDCAD_EXCHANGE_RATE;
    return acc + valInCad;
  }, 0);
  const totalNetLiqUsd = totalNetLiqCad / USDCAD_EXCHANGE_RATE;

  const gambitResult = calculateNorbertsGambit(gambitAmount, gambitDirection);

  return (
    <div className="w-full flex flex-col gap-3 font-mono text-xs">
      {/* Sub-Navigation Strip */}
      <div className="bg-[#080c14] border border-[#1e2638] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'accounts', label: '1. ACCOUNTS DIRECTORY & BLOTTER' },
            { id: 'cra_limits', label: '2. CRA CONTRIBUTION LIMITS' },
            { id: 'norberts_gambit', label: "3. NORBERT'S GAMBIT (FX OPTIMIZER)" },
            { id: 'tax_treaty', label: '4. ARTICLE XXI TAX TREATY' },
            { id: 'options_rules', label: '5. CRA OPTIONS RULES' },
            { id: 'gic_cdic', label: '6. GICs & CDIC INSURANCE' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                playKeyClick();
                setActiveTab(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-sm'
                  : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e293b] hover:text-white hover:border-[#334155]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10.5px] text-[#8b9bb4] shrink-0 font-mono">
          <span>USDCAD: <strong className="text-white">{USDCAD_EXCHANGE_RATE.toFixed(4)}</strong></span>
          <span>•</span>
          <span className="text-[#00e676]">Bank Spread: 1.95% vs Gambit 0.15%</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#050811] border border-[#1e2638] rounded-lg p-4 space-y-4">
        {/* TAB 1: ACCOUNTS DIRECTORY */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            {/* Consolidated Portfolio Banner */}
            <div className="bg-gradient-to-r from-[#0c1428] via-[#091020] to-[#0c1428] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider font-bold">
                    CONSOLIDATED CANADIAN PORTFOLIO (ALL {accounts.length} ACCOUNTS)
                  </span>
                  <span className="bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.5 rounded text-[9px] font-black border border-[#00e676]/30">
                    LIVE CONVERSION
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl font-black text-white">
                    {maskCurrency(totalNetLiqCad, isPrivacyMode, '$', 2)} CAD
                  </span>
                  <span className="text-sm font-bold text-[#00d2ff]">
                    ≈ {maskCurrency(totalNetLiqUsd, isPrivacyMode, '$', 2)} USD
                  </span>
                </div>
                <div className="text-[10.5px] text-[#94a3b8] mt-1">
                  Includes registered tax-advantaged accounts (TFSA, RRSP, FHSA, RESP) and non-registered margin portfolios.
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#080d18] px-3 py-2 rounded border border-[#1e293b]">
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
                            {maskCurrency(netLiq, isPrivacyMode, '$', 2)}{' '}
                            <span className="text-[10px] text-[#8b9bb4]">{acc.currency}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[#8b9bb4]">
                          <span>Cash: {maskCurrency(acc.cashBalance, isPrivacyMode, '$', 2)}</span>
                          <span className={totalUnrealized >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                            {totalUnrealized >= 0 ? '+' : ''}${totalUnrealized.toFixed(0)} P&amp;L
                          </span>
                        </div>
                      </div>

                      {/* Options Level & CRA Notes */}
                      <div className="text-[9.5px] text-[#94a3b8] space-y-1 mb-3">
                        <div className="flex items-center gap-1 text-[#cbd5e1]">
                          <ShieldCheck className="w-3 h-3 text-[#00d2ff] shrink-0" />
                          <span>Trading Auth: <strong>{acc.optionsLevel}</strong></span>
                        </div>
                        <div className="text-[#64748b] leading-relaxed">
                          {acc.taxStatusDescription}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-2 border-t border-[#1a2336] flex items-center justify-between">
                      <span className="text-[9.5px] text-[#8b9bb4]">
                        {acc.positions.length} Open Positions
                      </span>

                      <button
                        onClick={() => {
                          playExecutionChime();
                          onSelectAccount(acc.id);
                        }}
                        className={`px-3 py-1 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#ff9900] text-black font-black'
                            : 'bg-[#152035] hover:bg-[#1e2e4c] text-white border border-[#2b3c5a]'
                        }`}
                      >
                        {isSelected ? 'ACTIVE TRADING ACCOUNT' : 'SELECT ACCOUNT'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CRA CONTRIBUTION LIMITS */}
        {activeTab === 'cra_limits' && (
          <div className="space-y-4">
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-[#00e676]" />
                <span className="text-white font-extrabold text-sm uppercase">
                  CRA Official Registered Accounts Contribution Matrix (2024–2026)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e293b] text-[#8b9bb4] text-[10.5px]">
                      <th className="py-2 px-3">ACCOUNT</th>
                      <th className="py-2 px-3">ANNUAL LIMIT</th>
                      <th className="py-2 px-3">LIFETIME / CUMULATIVE</th>
                      <th className="py-2 px-3">DEDUCTION TYPE</th>
                      <th className="py-2 px-3">OVER-CONTRIBUTION PENALTY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#131b2c] text-[11px]">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#00d2ff]">TFSA (Tax-Free Savings)</td>
                      <td className="py-2.5 px-3 text-white">$7,000 / year (Indexed)</td>
                      <td className="py-2.5 px-3 text-[#00e676]">$95,000 (if 18 in 2009)</td>
                      <td className="py-2.5 px-3 text-[#8b9bb4]">None (Tax-free growth &amp; withdrawals)</td>
                      <td className="py-2.5 px-3 text-[#ff334b] font-bold">1% per month on excess balance</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#ff9900]">RRSP (Retirement Savings)</td>
                      <td className="py-2.5 px-3 text-white">18% of earned income (Max $31,560)</td>
                      <td className="py-2.5 px-3 text-[#00e676]">Cumulative unused room carried forward</td>
                      <td className="py-2.5 px-3 text-[#00e676]">Direct pre-tax deduction against income</td>
                      <td className="py-2.5 px-3 text-[#ff334b] font-bold">1% per month over $2,000 lifetime grace buffer</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#a855f7]">FHSA (First Home Savings)</td>
                      <td className="py-2.5 px-3 text-white">$8,000 / year</td>
                      <td className="py-2.5 px-3 text-[#00e676]">$40,000 Lifetime Cap</td>
                      <td className="py-2.5 px-3 text-[#00e676]">Tax-deductible in + Tax-free out (qualifying)</td>
                      <td className="py-2.5 px-3 text-[#ff334b] font-bold">1% per month on excess</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#38bdf8]">RESP (Education Savings)</td>
                      <td className="py-2.5 px-3 text-white">No annual limit (CESG matches 20% on $2.5k)</td>
                      <td className="py-2.5 px-3 text-[#00e676]">$50,000 per beneficiary lifetime</td>
                      <td className="py-2.5 px-3 text-[#8b9bb4]">Non-deductible contributions, taxed to student</td>
                      <td className="py-2.5 px-3 text-[#ff334b] font-bold">1% per month on excess over $50,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NORBERT'S GAMBIT (FX OPTIMIZER) */}
        {activeTab === 'norberts_gambit' && (
          <div className="space-y-4">
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#ffd600]" />
                  <span className="text-white font-extrabold text-sm uppercase">
                    Norbert's Gambit Arbitrage Engine (DLR.TO / DLR.U.TO)
                  </span>
                </div>
                <span className="bg-[#ffd600]/20 text-[#ffd600] px-2 py-0.5 rounded text-[10px] font-bold border border-[#ffd600]/30">
                  Save ~1.80% vs Bank Retail FX Spreads
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-[#080d18] p-3 rounded border border-[#1e2638]">
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">CONVERSION DIRECTION:</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGambitDirection('CAD_TO_USD')}
                      className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
                        gambitDirection === 'CAD_TO_USD'
                          ? 'bg-[#00d2ff] text-black border-[#00d2ff]'
                          : 'bg-[#121a2c] text-[#8b9bb4] border-[#1e293b]'
                      }`}
                    >
                      CAD &rarr; USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setGambitDirection('USD_TO_CAD')}
                      className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
                        gambitDirection === 'USD_TO_CAD'
                          ? 'bg-[#00d2ff] text-black border-[#00d2ff]'
                          : 'bg-[#121a2c] text-[#8b9bb4] border-[#1e293b]'
                      }`}
                    >
                      USD &rarr; CAD
                    </button>
                  </div>
                </div>

                <div className="bg-[#080d18] p-3 rounded border border-[#1e2638]">
                  <label className="text-[10px] text-[#8b9bb4] block mb-1">CAPITAL AMOUNT TO CONVERT:</label>
                  <input
                    type="number"
                    value={gambitAmount}
                    onChange={(e) => setGambitAmount(Math.max(100, Number(e.target.value)))}
                    className="w-full bg-[#121a2c] text-white px-2.5 py-1.5 rounded border border-[#1e293b] font-bold text-sm"
                  />
                </div>

                <div className="bg-[#080d18] p-3 rounded border border-[#1e2638] flex flex-col justify-between">
                  <span className="text-[10px] text-[#8b9bb4]">NET ESTIMATED SAVINGS:</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-[#00e676]">
                      +${gambitResult.netSavingsCad.toFixed(2)} CAD
                    </span>
                    <span className="text-[10px] text-[#8b9bb4]">vs ~1.95% FX Spread</span>
                  </div>
                </div>
              </div>

              {/* Execution Steps */}
              <div className="bg-[#080c16] p-3 rounded border border-[#1e2638] space-y-2 text-[11px]">
                <div className="font-bold text-white text-xs mb-1">Institutional Journaling Steps:</div>
                <div className="flex items-center gap-2 text-[#cbd5e1]">
                  <span className="w-5 h-5 rounded-full bg-[#00d2ff]/20 text-[#00d2ff] flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Buy <strong>{gambitResult.sharesToTrade.toLocaleString()} shares</strong> of Horizons DLR.TO on TSX at ${gambitResult.dlrSharePriceCad} CAD.</span>
                </div>
                <div className="flex items-center gap-2 text-[#cbd5e1]">
                  <span className="w-5 h-5 rounded-full bg-[#00d2ff]/20 text-[#00d2ff] flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Request broker trade desk to journal shares from DLR.TO (CAD side) to DLR.U.TO (USD side). Zero tax event.</span>
                </div>
                <div className="flex items-center gap-2 text-[#cbd5e1]">
                  <span className="w-5 h-5 rounded-full bg-[#00d2ff]/20 text-[#00d2ff] flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Sell shares of DLR.U.TO on TSX USD line to yield <strong>${gambitResult.netTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {gambitResult.targetCurrency}</strong>.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARTICLE XXI US-CAN TAX TREATY */}
        {activeTab === 'tax_treaty' && (
          <div className="space-y-4">
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-white font-extrabold text-sm uppercase">
                  Article XXI: US-Canada Income Tax Treaty (Withholding Tax Optimization)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                <div className="bg-[#080d18] p-3.5 rounded border border-[#00e676]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00e676]">RRSP &amp; RRIF (EXEMPT)</span>
                    <span className="bg-[#00e676]/20 text-[#00e676] px-2 py-0.5 rounded text-[9px] font-bold">0% WITHHOLDING</span>
                  </div>
                  <p className="text-[#8b9bb4] leading-relaxed">
                    Under Article XXI(2) of the Treaty, US equity dividends paid directly to a recognized Canadian pension/retirement vehicle (RRSP/RRIF) are <strong>100% exempt from the standard 15% US IRS Non-Resident Withholding Tax</strong>. Ideal for SPY, AAPL, MSFT, and US dividend aristocrats.
                  </p>
                </div>

                <div className="bg-[#080d18] p-3.5 rounded border border-[#ff334b]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#ff334b]">TFSA, FHSA &amp; RESP (NON-EXEMPT)</span>
                    <span className="bg-[#ff334b]/20 text-[#ff334b] px-2 py-0.5 rounded text-[9px] font-bold">15% IRS WITHHELD</span>
                  </div>
                  <p className="text-[#8b9bb4] leading-relaxed">
                    The IRS does not recognize TFSAs or FHSAs as retirement trusts. Any dividends from US companies incur an irreversible <strong>15% withholding tax drag</strong> that cannot be recovered via Canadian foreign tax credits (FTC). Prefer Canadian equities (RY, TD, ENB) or non-dividend growth in TFSAs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CRA OPTIONS RULES MATRIX */}
        {activeTab === 'options_rules' && (
          <div className="space-y-4">
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ffd600]" />
                <span className="text-white font-extrabold text-sm uppercase">
                  Income Tax Act Section 146 / 146.2 Registered Options Compliance
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-[#080d18] p-3 rounded border border-[#1e2638]">
                  <span className="text-[#00e676] font-bold block mb-1">✔ PERMITTED STRATEGIES</span>
                  <ul className="text-[#8b9bb4] space-y-1.5 list-disc pl-4">
                    <li>Long Calls and Long Puts (Risk strictly capped at premium paid)</li>
                    <li>Covered Calls (Writing call contracts against 100 long shares)</li>
                    <li>Cash-Secured Puts (Fully collateralized with cash balance)</li>
                    <li>Debit Spreads &amp; Collars (Where max loss cannot exceed capital held)</li>
                  </ul>
                </div>

                <div className="bg-[#080d18] p-3 rounded border border-[#ff334b]/40">
                  <span className="text-[#ff334b] font-bold block mb-1">✖ PROHIBITED (CRA ADVANTAGE TAX)</span>
                  <ul className="text-[#8b9bb4] space-y-1.5 list-disc pl-4">
                    <li>Naked Calls / Uncovered Options (Exposes registered account to unlimited risk)</li>
                    <li>Short Stock Sales (Borrowing shares violates Section 146 trust rules)</li>
                    <li>Negative Cash Balances (Borrowing money triggers 100% advantage tax penalty)</li>
                    <li>Day-trading frequency deemed as carrying on an active business by CRA</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: GICs & CDIC INSURANCE */}
        {activeTab === 'gic_cdic' && (
          <div className="space-y-4">
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00e676]" />
                  <span className="text-white font-extrabold text-sm uppercase">
                    CDIC (Canada Deposit Insurance Corporation) Protection Envelopes
                  </span>
                </div>
                {onNavigateToGIC && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      onNavigateToGIC();
                    }}
                    className="px-2.5 py-1 bg-[#00e676]/20 hover:bg-[#00e676] hover:text-black text-[#00e676] border border-[#00e676]/40 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    OPEN GIC HUB &rarr;
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[#8b9bb4] leading-relaxed">
                Eligible GICs held across Schedule I chartered Canadian banks are insured up to <strong>$100,000 CAD per insured category</strong> per institution (Separate $100k envelopes for Non-registered, TFSA, RRSP, FHSA, and RESP).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
