import React, { useState, useMemo, useEffect } from 'react';
import {
  GICRateItem,
  GICType,
  CANADIAN_GIC_RATES,
  CANADIAN_GIC_ISSUERS,
  CDIC_COVERAGE_RULES,
  calculateGICMaturity,
  calculateGICLadder,
  PurchasedGIC,
  GICRolloverInstruction,
  GICMaturityAlert,
  GICAlertSettings,
  getPurchasedGICs,
  savePurchasedGICs,
  executeGICPurchase,
  updateGICRollover,
  executeMaturityOrRollover,
  earlyRedeemGIC,
  generateMaturityAlerts,
  getGICAlertSettings,
  saveGICAlertSettings,
  snoozeGICAlert,
  clearGICSnooze,
} from '../services/gicCanadaService';
import { CanadianAccount, INITIAL_CANADIAN_ACCOUNTS, USDCAD_EXCHANGE_RATE } from '../services/canadianAccounts';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  ShieldCheck,
  Percent,
  Calculator,
  Building,
  TrendingUp,
  Layers,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  Download,
  RefreshCw,
  ShoppingCart,
  AlertCircle,
  Clock,
  Check,
  X,
  History,
  FileText,
  ChevronDown,
  Bell,
  BellRing,
  AlertTriangle,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Timer,
} from 'lucide-react';

interface GuaranteedInvestmentCertificatesViewProps {
  accounts?: CanadianAccount[];
  activeAccountId?: string;
  onUpdateAccounts?: (updated: CanadianAccount[]) => void;
  onOpenCanadianSuite?: () => void;
  onNavigateToSectors?: () => void;
}

export const GuaranteedInvestmentCertificatesView: React.FC<GuaranteedInvestmentCertificatesViewProps> = ({
  accounts = INITIAL_CANADIAN_ACCOUNTS,
  activeAccountId = 'act-tfsa',
  onUpdateAccounts,
  onOpenCanadianSuite,
  onNavigateToSectors,
}) => {
  const [subTab, setSubTab] = useState<'rates' | 'holdings' | 'alerts' | 'calculator' | 'ladder' | 'issuers' | 'cdic'>('rates');
  const [selectedType, setSelectedType] = useState<GICType | 'all'>('all');
  const [selectedTerm, setSelectedTerm] = useState<number | 'all'>('all');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'TFSA' | 'RRSP' | 'FHSA' | 'NON_REG'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Local accounts state in case onUpdateAccounts is not controlled from parent
  const [localAccounts, setLocalAccounts] = useState<CanadianAccount[]>(accounts);
  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  // Purchased GICs State & Persistence
  const [purchasedGICs, setPurchasedGICs] = useState<PurchasedGIC[]>(() => getPurchasedGICs());
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Notification & Alert Settings State
  const [alertSettings, setAlertSettings] = useState<GICAlertSettings>(() => getGICAlertSettings());
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [alertsAccountFilter, setAlertsAccountFilter] = useState<string>('ALL');
  const [showSnoozedAlerts, setShowSnoozedAlerts] = useState(false);

  // Holdings tab filters
  const [holdingsAccountFilter, setHoldingsAccountFilter] = useState<string>('ALL');
  const [holdingsStatusFilter, setHoldingsStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MATURED'>('ACTIVE');

  // Purchase Order Ticket Modal State
  const [isOrderTicketOpen, setIsOrderTicketOpen] = useState(false);
  const [ticketRate, setTicketRate] = useState<GICRateItem>(CANADIAN_GIC_RATES[0]);
  const [orderAccountId, setOrderAccountId] = useState<string>(activeAccountId || 'act-tfsa');
  const [orderPrincipal, setOrderPrincipal] = useState<number>(10000);
  const [orderFrequency, setOrderFrequency] = useState<'Annual' | 'Semi-Annual' | 'Monthly' | 'At Maturity'>('Annual');
  const [orderRollover, setOrderRollover] = useState<GICRolloverInstruction>('ROLLOVER_FULL');

  // Ladder Order Modal State
  const [isLadderOrderOpen, setIsLadderOrderOpen] = useState(false);
  const [ladderOrderAccountId, setLadderOrderAccountId] = useState<string>(activeAccountId || 'act-tfsa');

  // Calculator State
  const [calcPrincipal, setCalcPrincipal] = useState<number>(25000);
  const [calcRate, setCalcRate] = useState<number>(4.35);
  const [calcTermMonths, setCalcTermMonths] = useState<number>(12);
  const [calcFrequency, setCalcFrequency] = useState<'Annual' | 'Semi-Annual' | 'Monthly' | 'At Maturity'>('Annual');

  // Ladder Strategy State
  const [ladderCapital, setLadderCapital] = useState<number>(50000);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Compute Active Alerts
  const allAlerts = useMemo(() => {
    return generateMaturityAlerts(purchasedGICs, alertSettings);
  }, [purchasedGICs, alertSettings]);

  const activeAlerts = useMemo(() => {
    return allAlerts.filter((a) => showSnoozedAlerts || !a.isSnoozed);
  }, [allAlerts, showSnoozedAlerts]);

  const filteredAlerts = useMemo(() => {
    return activeAlerts.filter((a) => {
      if (alertsAccountFilter !== 'ALL' && a.accountCode !== alertsAccountFilter) return false;
      return true;
    });
  }, [activeAlerts, alertsAccountFilter]);

  const criticalAlerts = useMemo(() => {
    return activeAlerts.filter((a) => a.urgency === 'CRITICAL');
  }, [activeAlerts]);

  const hasCriticalAlerts = criticalAlerts.length > 0;

  // Sound chime and toast notification on initial mount if critical alerts exist
  useEffect(() => {
    if (alertSettings.autoCheckOnMount && criticalAlerts.length > 0) {
      if (alertSettings.soundAlertEnabled) {
        playExecutionChime();
      }
      setToastMessage({
        text: `🚨 ${criticalAlerts.length} GIC Certificate${criticalAlerts.length > 1 ? 's' : ''} nearing maturity (${criticalAlerts[0].daysRemaining}d left). Review rollover options in Maturity Alerts.`,
        type: 'warn',
      });
    }
  }, []);

  // Helper to get selected account for order
  const currentOrderAccount = useMemo(() => {
    return localAccounts.find((a) => a.id === orderAccountId) || localAccounts[0];
  }, [localAccounts, orderAccountId]);

  // Calculations for current Order Ticket
  const orderMaturityResult = useMemo(() => {
    return calculateGICMaturity(orderPrincipal, ticketRate.rateAnnualPct, ticketRate.termMonths, orderFrequency);
  }, [orderPrincipal, ticketRate, orderFrequency]);

  // Filtered GIC Rates
  const filteredRates = useMemo(() => {
    return CANADIAN_GIC_RATES.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedTerm !== 'all' && item.termMonths !== selectedTerm) return false;
      if (accountFilter !== 'ALL' && !item.registeredEligible.includes(accountFilter as any)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesIssuer = item.issuer.toLowerCase().includes(q) || item.issuerShort.toLowerCase().includes(q);
        const matchesTerm = item.termLabel.toLowerCase().includes(q);
        const matchesFeatures = item.features.some((f) => f.toLowerCase().includes(q));
        if (!matchesIssuer && !matchesTerm && !matchesFeatures) return false;
      }
      return true;
    }).sort((a, b) => b.rateAnnualPct - a.rateAnnualPct);
  }, [selectedType, selectedTerm, accountFilter, searchQuery]);

  // Calculations
  const maturityResult = useMemo(() => {
    return calculateGICMaturity(calcPrincipal, calcRate, calcTermMonths, calcFrequency);
  }, [calcPrincipal, calcRate, calcTermMonths, calcFrequency]);

  const ladderResult = useMemo(() => {
    return calculateGICLadder(ladderCapital);
  }, [ladderCapital]);

  // Holdings metrics
  const activeGICs = useMemo(() => {
    return purchasedGICs.filter((g) => g.status === 'ACTIVE');
  }, [purchasedGICs]);

  const filteredHoldings = useMemo(() => {
    return purchasedGICs.filter((g) => {
      if (holdingsStatusFilter !== 'ALL' && g.status !== holdingsStatusFilter) return false;
      if (holdingsAccountFilter !== 'ALL' && g.accountCode !== holdingsAccountFilter) return false;
      return true;
    });
  }, [purchasedGICs, holdingsStatusFilter, holdingsAccountFilter]);

  const holdingsMetrics = useMemo(() => {
    const totalPrincipal = activeGICs.reduce((acc, g) => acc + g.principalCad, 0);
    const totalAccrued = activeGICs.reduce((acc, g) => acc + g.accruedInterestCad, 0);
    const totalProjectedInterest = activeGICs.reduce((acc, g) => acc + g.projectedTotalInterestCad, 0);
    const totalMaturityValue = activeGICs.reduce((acc, g) => acc + g.projectedMaturityValueCad, 0);
    const weightedYield =
      totalPrincipal > 0
        ? activeGICs.reduce((acc, g) => acc + g.annualRatePct * g.principalCad, 0) / totalPrincipal
        : 0;
    const cdicCovered = activeGICs.reduce((acc, g) => acc + (g.cdicInsured ? g.cdicCoverageAmountCad : 0), 0);

    return {
      totalPrincipal,
      totalAccrued,
      totalProjectedInterest,
      totalMaturityValue,
      weightedYield,
      cdicCovered,
      activeCount: activeGICs.length,
      totalCount: purchasedGICs.length,
    };
  }, [activeGICs, purchasedGICs]);

  // Open Purchase Ticket for specific rate
  const handleOpenBuyTicket = (rate: GICRateItem) => {
    playKeyClick();
    setTicketRate(rate);
    setOrderPrincipal(Math.max(rate.minInvestmentCad, 10000));
    setOrderFrequency(rate.compoundingFrequency);
    setIsOrderTicketOpen(true);
  };

  // Open Purchase Ticket from Calculator
  const handleOpenBuyFromCalculator = () => {
    playKeyClick();
    const matchingRate =
      CANADIAN_GIC_RATES.find(
        (r) => r.termMonths === calcTermMonths && Math.abs(r.rateAnnualPct - calcRate) < 0.2
      ) || CANADIAN_GIC_RATES[0];

    setTicketRate({
      ...matchingRate,
      rateAnnualPct: calcRate,
      termMonths: calcTermMonths,
      termLabel: `${calcTermMonths < 12 ? `${calcTermMonths} Mo` : `${calcTermMonths / 12} Yr`} Custom`,
    });
    setOrderPrincipal(calcPrincipal);
    setOrderFrequency(calcFrequency);
    setIsOrderTicketOpen(true);
  };

  // Confirm GIC Purchase
  const handleConfirmPurchase = () => {
    if (!currentOrderAccount) return;

    if (orderPrincipal < ticketRate.minInvestmentCad) {
      setToastMessage({
        text: `Minimum deposit for ${ticketRate.issuerShort} is C$${ticketRate.minInvestmentCad.toLocaleString()}`,
        type: 'warn',
      });
      return;
    }

    if (currentOrderAccount.cashBalance < orderPrincipal) {
      setToastMessage({
        text: `Insufficient cash in ${currentOrderAccount.name}. Available: C$${currentOrderAccount.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        type: 'warn',
      });
      return;
    }

    // Deduct cash from account
    const updatedAccounts = localAccounts.map((acc) => {
      if (acc.id === currentOrderAccount.id) {
        return {
          ...acc,
          cashBalance: Math.max(0, acc.cashBalance - orderPrincipal),
        };
      }
      return acc;
    });

    setLocalAccounts(updatedAccounts);
    if (onUpdateAccounts) {
      onUpdateAccounts(updatedAccounts);
    }

    // Execute GIC Purchase
    const newGIC = executeGICPurchase({
      rateItem: ticketRate,
      accountId: currentOrderAccount.id,
      accountName: currentOrderAccount.name,
      accountCode: currentOrderAccount.code as any,
      principalCad: orderPrincipal,
      rolloverInstruction: orderRollover,
      compoundingFrequency: orderFrequency,
    });

    setPurchasedGICs(getPurchasedGICs());
    setIsOrderTicketOpen(false);
    playExecutionChime();

    setToastMessage({
      text: `GIC CERTIFICATE ISSUED: ${newGIC.certificateNumber} · C$${orderPrincipal.toLocaleString()} at ${ticketRate.rateAnnualPct.toFixed(2)}% in ${currentOrderAccount.code}`,
      type: 'success',
    });

    // Navigate to holdings tab to show the new certificate
    setSubTab('holdings');
  };

  // Update Rollover Instruction on an active certificate
  const handleUpdateRolloverInstruction = (gicId: string, newInstruction: GICRolloverInstruction) => {
    playKeyClick();
    const result = updateGICRollover(gicId, newInstruction);
    setPurchasedGICs(result.allGICs);

    const label =
      newInstruction === 'ROLLOVER_FULL'
        ? 'Auto-Rollover (Full Compound)'
        : newInstruction === 'ROLLOVER_PRINCIPAL'
        ? 'Rollover Principal Only (Cash Out Interest)'
        : 'Full Cash Payout on Maturity';

    setToastMessage({
      text: `Rollover instruction updated on ${result.updatedGIC.certificateNumber}: ${label}`,
      type: 'info',
    });
  };

  // Snooze Alert Handler
  const handleSnoozeAlert = (gicId: string, days: number = 7) => {
    playKeyClick();
    const updated = snoozeGICAlert(gicId, days);
    setAlertSettings(updated);
    setToastMessage({
      text: `Maturity notification snoozed for ${days} days.`,
      type: 'info',
    });
  };

  // Clear Snooze Handler
  const handleClearSnooze = (gicId: string) => {
    playKeyClick();
    const updated = clearGICSnooze(gicId);
    setAlertSettings(updated);
    setToastMessage({
      text: `Notification snooze removed.`,
      type: 'info',
    });
  };

  // Execute Maturity & Rollover Action (Instant Real-time Simulation)
  const handleExecuteRolloverSimulation = (gicId: string) => {
    playKeyClick();
    const target = purchasedGICs.find((g) => g.id === gicId);
    if (!target) return;

    const result = executeMaturityOrRollover(gicId);
    setPurchasedGICs(result.allGICs);

    // If cash was credited, credit to account cash balance
    if (result.cashCreditCad > 0) {
      const updatedAccounts = localAccounts.map((acc) => {
        if (acc.id === target.accountId) {
          return {
            ...acc,
            cashBalance: acc.cashBalance + result.cashCreditCad,
          };
        }
        return acc;
      });
      setLocalAccounts(updatedAccounts);
      if (onUpdateAccounts) {
        onUpdateAccounts(updatedAccounts);
      }
    }

    playExecutionChime();

    if (result.actionTaken === 'ROLLED_FULL') {
      setToastMessage({
        text: `[ROLLOVER EXECUTED]: Compounded C$${result.updatedGIC.principalCad.toLocaleString()} into new ${result.updatedGIC.termLabel} GIC (${result.updatedGIC.certificateNumber}) at ${result.updatedGIC.annualRatePct}% APY.`,
        type: 'success',
      });
    } else if (result.actionTaken === 'ROLLED_PRINCIPAL') {
      setToastMessage({
        text: `[ROLLOVER EXECUTED]: Renewed principal C$${result.updatedGIC.principalCad.toLocaleString()}. +C$${result.cashCreditCad.toLocaleString('en-US', { minimumFractionDigits: 2 })} interest deposited to ${target.accountCode} cash balance.`,
        type: 'success',
      });
    } else {
      setToastMessage({
        text: `[MATURITY PAYOUT]: +C$${result.cashCreditCad.toLocaleString('en-US', { minimumFractionDigits: 2 })} deposited to ${target.accountCode} cash balance. Certificate matured.`,
        type: 'success',
      });
    }
  };

  // Early Redemption Handler
  const handleEarlyRedeemCertificate = (gicId: string) => {
    playKeyClick();
    const target = purchasedGICs.find((g) => g.id === gicId);
    if (!target) return;

    const result = earlyRedeemGIC(gicId);
    setPurchasedGICs(result.allGICs);

    // Credit payout to account cash balance
    const updatedAccounts = localAccounts.map((acc) => {
      if (acc.id === target.accountId) {
        return {
          ...acc,
          cashBalance: acc.cashBalance + result.payoutCad,
        };
      }
      return acc;
    });
    setLocalAccounts(updatedAccounts);
    if (onUpdateAccounts) {
      onUpdateAccounts(updatedAccounts);
    }

    playExecutionChime();
    setToastMessage({
      text: `[EARLY REDEMPTION PROCESSED]: +C$${result.payoutCad.toLocaleString('en-US', { minimumFractionDigits: 2 })} credited to ${target.accountCode} cash balance.`,
      type: 'info',
    });
  };

  // Confirm Purchase 5-Year GIC Ladder
  const handleConfirmPurchaseLadder = () => {
    const targetAccount = localAccounts.find((a) => a.id === ladderOrderAccountId) || localAccounts[0];
    if (targetAccount.cashBalance < ladderCapital) {
      setToastMessage({
        text: `Insufficient cash in ${targetAccount.name}. Ladder requires C$${ladderCapital.toLocaleString()}. Available: C$${targetAccount.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        type: 'warn',
      });
      return;
    }

    // Deduct total ladder capital
    const updatedAccounts = localAccounts.map((acc) => {
      if (acc.id === targetAccount.id) {
        return {
          ...acc,
          cashBalance: Math.max(0, acc.cashBalance - ladderCapital),
        };
      }
      return acc;
    });
    setLocalAccounts(updatedAccounts);
    if (onUpdateAccounts) {
      onUpdateAccounts(updatedAccounts);
    }

    // Buy 5 tranches
    const trancheAmt = ladderCapital / 5;
    const tranches = [
      { months: 12, rate: 4.35, issuer: 'EQ Bank (Equitable Bank)', issuerShort: 'EQ Bank', logo: '🏦' },
      { months: 24, rate: 4.25, issuer: 'Oaken Financial', issuerShort: 'Oaken', logo: '🛡️' },
      { months: 36, rate: 4.15, issuer: 'National Bank', issuerShort: 'National Bank', logo: '🏛️' },
      { months: 48, rate: 4.10, issuer: 'Royal Bank of Canada', issuerShort: 'RBC Royal Bank', logo: '🦁' },
      { months: 60, rate: 4.15, issuer: 'TD Canada Trust', issuerShort: 'TD Bank', logo: '🌲' },
    ];

    tranches.forEach((t) => {
      executeGICPurchase({
        rateItem: {
          id: `ladder-rate-${t.months}`,
          issuer: t.issuer,
          issuerShort: t.issuerShort,
          logo: t.logo,
          cdicMember: true,
          type: 'fixed',
          termMonths: t.months,
          termLabel: `${t.months / 12} Year Fixed`,
          rateAnnualPct: t.rate,
          minInvestmentCad: 100,
          compoundingFrequency: 'Annual',
          registeredEligible: ['TFSA', 'RRSP', 'FHSA', 'RESP', 'NON_REG'],
          features: ['CDIC Insured', 'Staggered Ladder Tranche'],
        },
        accountId: targetAccount.id,
        accountName: targetAccount.name,
        accountCode: targetAccount.code as any,
        principalCad: trancheAmt,
        rolloverInstruction: 'ROLLOVER_FULL', // Staggered auto-rollover
        compoundingFrequency: 'Annual',
      });
    });

    setPurchasedGICs(getPurchasedGICs());
    setIsLadderOrderOpen(false);
    playExecutionChime();

    setToastMessage({
      text: `5-YEAR GIC LADDER ACTIVE: 5 Tranches totaling C$${ladderCapital.toLocaleString()} issued into ${targetAccount.code}. Annual rolling liquidity configured.`,
      type: 'success',
    });

    setSubTab('holdings');
  };

  const handleExportRatesCSV = () => {
    playExecutionChime();
    const headers = ['Issuer,Type,Term,AnnualRatePct,MinInvestmentCAD,Compounding,RegisteredEligibility\n'];
    const rows = filteredRates.map((r) =>
      `"${r.issuer}","${r.type}","${r.termLabel}",${r.rateAnnualPct},${r.minInvestmentCad},"${r.compoundingFrequency}","${r.registeredEligible.join(';')}"`
    );
    const blob = new Blob([headers.join('') + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Canadian_GIC_Rates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-3 font-mono text-xs select-none">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg border shadow-lg animate-in fade-in slide-in-from-top-1 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-[#00e676]/15 border-[#00e676]/40 text-[#00e676]'
              : toastMessage.type === 'warn'
              ? 'bg-[#ff9900]/15 border-[#ff9900]/40 text-[#ff9900]'
              : 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-[#38bdf8]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-bold text-xs">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-current hover:opacity-75 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bloomberg Intelligence Header */}
      <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-2.5 sm:p-3 shadow-md flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182338] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-white flex items-center gap-1.5 tracking-wider">
              <span>🇨🇦</span>
              <span className="text-[#ff9900]">GUARANTEED INVESTMENT CERTIFICATES (GIC)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 font-mono font-bold">
                PURCHASABLE · AUTO-ROLLOVER · CDIC INSURED
              </span>
            </span>
            <span className="text-[10px] text-[#64748b] hidden xl:inline">
              Big 6 Banks &amp; Digital Issuers · Real Settlement, Maturity Radar &amp; Automated Rollover Engine
            </span>
          </div>

          {/* Quick External & Launcher Actions */}
          <div className="flex items-center gap-1.5">
            {/* Quick Maturity Alerts Bell Pill */}
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setSubTab('alerts');
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeAlerts.length > 0
                  ? hasCriticalAlerts
                    ? 'bg-[#ff1744]/20 hover:bg-[#ff1744]/30 text-[#ff1744] border border-[#ff1744]/60 shadow-[0_0_12px_rgba(255,23,68,0.3)] font-black'
                    : 'bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/60 shadow-[0_0_8px_rgba(255,153,0,0.3)] font-black'
                  : 'bg-[#1e293b] text-[#8b9bb4] hover:text-white border border-[#334155]'
              }`}
              title="View GIC maturity alerts, grace periods, and rollover eligibility"
            >
              <BellRing className={`w-3.5 h-3.5 ${hasCriticalAlerts ? 'animate-bounce' : ''}`} />
              <span>MATURITY ALERTS ({activeAlerts.length})</span>
              {hasCriticalAlerts && <span className="w-1.5 h-1.5 rounded-full bg-[#ff1744] animate-ping" />}
            </button>

            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setSubTab('holdings');
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                subTab === 'holdings'
                  ? 'bg-[#00e676] text-black font-extrabold shadow-[0_0_10px_rgba(0,230,118,0.3)]'
                  : 'bg-[#00e676]/15 hover:bg-[#00e676]/25 text-[#00e676] border border-[#00e676]/40'
              }`}
              title="View your active purchased GIC holdings and rollover instructions"
            >
              <RefreshCw className="w-3 h-3" />
              <span>ACTIVE GIC PORTFOLIO ({activeGICs.length})</span>
            </button>

            {onOpenCanadianSuite && (
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  onOpenCanadianSuite();
                }}
                className="px-2.5 py-1 rounded bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Launch TFSA, RRSP, FHSA & CRA Contribution Rules"
              >
                <span>🇨🇦 CRA TAX SUITE</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportRatesCSV}
              className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#27354d] text-white border border-[#334155] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Download GIC rates comparison table as CSV"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">EXPORT RATES</span>
            </button>
          </div>
        </div>

        {/* Real-time Rate Benchmarks & Portfolio Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[10px]">
          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">My Active GIC Capital</span>
            <span className="text-[#00e676] font-black text-sm">
              C${holdingsMetrics.totalPrincipal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[8.5px] text-[#8b9bb4]">
              {holdingsMetrics.activeCount} Certificate{holdingsMetrics.activeCount !== 1 ? 's' : ''} Active
            </span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">Weighted Yield (APY)</span>
            <span className="text-[#ff9900] font-black text-sm">
              {holdingsMetrics.weightedYield > 0 ? `${holdingsMetrics.weightedYield.toFixed(2)}%` : '4.35%'}
            </span>
            <span className="text-[8.5px] text-[#00e676]">Over BoC Policy Rate (3.75%)</span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">Total Projected Interest</span>
            <span className="text-[#38bdf8] font-black text-sm">
              +C${holdingsMetrics.totalProjectedInterest.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[8.5px] text-[#64748b]">
              Accrued: C${holdingsMetrics.totalAccrued.toFixed(0)}
            </span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">Maturity Alerts Pending</span>
            <span className={`font-black text-sm ${hasCriticalAlerts ? 'text-[#ff1744]' : activeAlerts.length > 0 ? 'text-[#ff9900]' : 'text-[#00e676]'}`}>
              {activeAlerts.length} Eligible Rollover{activeAlerts.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[8.5px] text-[#8b9bb4]">
              {criticalAlerts.length} Imminent (≤15d)
            </span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">CDIC Deposit Protection</span>
            <span className="text-[#00e5ff] font-extrabold text-sm">100% Insured</span>
            <span className="text-[8.5px] text-[#8b9bb4]">C$100k / Category / Bank</span>
          </div>

          <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
            <span className="text-[#64748b] text-[8.5px] uppercase">USD/CAD Settlement FX</span>
            <span className="text-white font-mono font-bold text-sm">{USDCAD_EXCHANGE_RATE.toFixed(4)}</span>
            <span className="text-[8.5px] text-[#8b9bb4]">1 USD = 1.3650 CAD</span>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#162238]">
          {[
            { id: 'rates', label: 'RATES & ISSUERS MATRIX', icon: Percent },
            { id: 'holdings', label: `MY GIC PORTFOLIO (${activeGICs.length})`, icon: RefreshCw },
            {
              id: 'alerts',
              label: `MATURITY ALERTS & NOTIFICATIONS (${activeAlerts.length})`,
              icon: BellRing,
              badgeColor: hasCriticalAlerts ? 'bg-[#ff1744] text-white' : activeAlerts.length > 0 ? 'bg-[#ff9900] text-black' : null,
            },
            { id: 'calculator', label: 'COMPOUND CALCULATOR', icon: Calculator },
            { id: 'ladder', label: '5-YEAR GIC LADDER', icon: Layers },
            { id: 'issuers', label: 'CANADIAN ISSUERS (BIG 6)', icon: Building },
            { id: 'cdic', label: 'CDIC PROTECTION RULES', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playKeyClick();
                  setSubTab(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ff9900] text-black shadow-[0_0_10px_rgba(255,153,0,0.3)] font-black'
                    : 'bg-[#101726] text-[#8b9bb4] hover:text-white hover:bg-[#18233a] border border-[#1e2a44]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badgeColor && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${tab.badgeColor}`}>
                    {activeAlerts.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Persistent Critical Maturity Warning Banner */}
      {activeAlerts.length > 0 && !isBannerDismissed && subTab !== 'alerts' && (
        <div className="bg-[#1c080d] border border-[#ff1744]/60 rounded-lg p-2.5 sm:p-3 shadow-[0_0_15px_rgba(255,23,68,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#ff1744]/20 border border-[#ff1744]/40 text-[#ff1744] shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-xs">
                  🚨 {activeAlerts.length} GIC CERTIFICATE{activeAlerts.length > 1 ? 'S' : ''} NEARING MATURITY — ELIGIBLE FOR ROLLOVER
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#ff1744]/30 text-[#ff1744] text-[9px] font-bold border border-[#ff1744]/50">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-[10.5px] text-[#cbd5e1] mt-0.5">
                {activeAlerts[0].issuer} #{activeAlerts[0].certificateNumber} matures in <strong className="text-[#ff1744]">{activeAlerts[0].daysRemaining} days</strong> ({activeAlerts[0].maturityDate}). Current rule: <span className="text-[#ff9900]">{activeAlerts[0].rolloverInstruction === 'ROLLOVER_FULL' ? 'Auto-Rollover (Full Compound)' : activeAlerts[0].rolloverInstruction === 'ROLLOVER_PRINCIPAL' ? 'Rollover Principal Only' : 'Cash Payout'}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setSubTab('alerts');
              }}
              className="px-3 py-1 rounded bg-[#ff1744] hover:bg-[#d50000] text-white font-extrabold text-[10.5px] cursor-pointer shadow-md transition-all hover:scale-105"
            >
              REVIEW &amp; UPDATE ROLLOVERS &rarr;
            </button>
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="p-1 rounded text-[#8b9bb4] hover:text-white cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB: MATURITY ALERTS & NOTIFICATIONS CENTER */}
      {subTab === 'alerts' && (
        <div className="flex flex-col gap-3">
          {/* Header & Preferences Bar */}
          <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182338] pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#ff1744]/20 border border-[#ff1744]/40 text-[#ff1744]">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs">
                      GIC MATURITY MONITOR &amp; ROLLOVER NOTIFICATION RADAR
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[9.5px] font-bold border border-[#00e676]/30">
                      15-DAY CANADIAN GRACE WINDOW
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748b]">
                    Real-time notifications when your certificates approach expiration. Choose whether to auto-compound, take cash interest, or redeem principal.
                  </span>
                </div>
              </div>

              {/* Alert Configuration Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setIsAlertSettingsOpen(!isAlertSettingsOpen);
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                    isAlertSettingsOpen
                      ? 'bg-[#ff9900] text-black border-[#ff9900] font-black'
                      : 'bg-[#1e293b] text-[#8b9bb4] hover:text-white border-[#334155]'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>ALERT SETTINGS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    const updated = {
                      ...alertSettings,
                      soundAlertEnabled: !alertSettings.soundAlertEnabled,
                    };
                    setAlertSettings(updated);
                    saveGICAlertSettings(updated);
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                    alertSettings.soundAlertEnabled
                      ? 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/30'
                      : 'bg-[#1e293b] text-[#8b9bb4] border-[#334155]'
                  }`}
                  title="Toggle sound alerts on nearing maturity"
                >
                  {alertSettings.soundAlertEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  <span>SOUND {alertSettings.soundAlertEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Alert Settings Accordion Drawer */}
            {isAlertSettingsOpen && (
              <div className="bg-[#070b14] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-2.5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-[#162033] pb-1.5">
                  <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff9900]" />
                    <span>CANADIAN GIC MATURITY NOTIFICATION PREFERENCES</span>
                  </span>
                  <span className="text-[9.5px] text-[#64748b]">
                    Changes persist automatically in terminal profile
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10.5px]">
                  {/* Warning Threshold */}
                  <div className="flex flex-col gap-1 bg-[#0b101c] p-2.5 rounded border border-[#182338]">
                    <span className="text-[#8b9bb4]">Early Warning Notice Window:</span>
                    <div className="flex items-center gap-1 mt-1">
                      {[15, 30, 45, 60].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            playKeyClick();
                            const updated = { ...alertSettings, warningThresholdDays: days };
                            setAlertSettings(updated);
                            saveGICAlertSettings(updated);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            alertSettings.warningThresholdDays === days
                              ? 'bg-[#ff9900] text-black border-[#ff9900] font-black'
                              : 'bg-[#141d30] text-[#8b9bb4] border-[#1e2a44] hover:text-white'
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] text-[#64748b] mt-1">
                      Generates warning notice {alertSettings.warningThresholdDays} days before maturity.
                    </span>
                  </div>

                  {/* Critical Threshold */}
                  <div className="flex flex-col gap-1 bg-[#0b101c] p-2.5 rounded border border-[#182338]">
                    <span className="text-[#8b9bb4]">Critical Grace Period Window:</span>
                    <div className="flex items-center gap-1 mt-1">
                      {[7, 10, 15, 20].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            playKeyClick();
                            const updated = { ...alertSettings, criticalThresholdDays: days };
                            setAlertSettings(updated);
                            saveGICAlertSettings(updated);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            alertSettings.criticalThresholdDays === days
                              ? 'bg-[#ff1744] text-white border-[#ff1744] font-black'
                              : 'bg-[#141d30] text-[#8b9bb4] border-[#1e2a44] hover:text-white'
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] text-[#64748b] mt-1">
                      Triggers high-priority alerts within {alertSettings.criticalThresholdDays} days.
                    </span>
                  </div>

                  {/* Check on Load */}
                  <div className="flex flex-col justify-between bg-[#0b101c] p-2.5 rounded border border-[#182338]">
                    <span className="text-[#8b9bb4]">Auto-Alert on Terminal Login:</span>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-white text-[10px]">Display Toast on Load</span>
                      <button
                        type="button"
                        onClick={() => {
                          playKeyClick();
                          const updated = { ...alertSettings, autoCheckOnMount: !alertSettings.autoCheckOnMount };
                          setAlertSettings(updated);
                          saveGICAlertSettings(updated);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                          alertSettings.autoCheckOnMount
                            ? 'bg-[#00e676] text-black border-[#00e676]'
                            : 'bg-[#141d30] text-[#8b9bb4] border-[#1e2a44]'
                        }`}
                      >
                        {alertSettings.autoCheckOnMount ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-[#64748b]">FILTER ACCOUNT:</span>
                {['ALL', 'TFSA', 'RRSP', 'FHSA', 'RESP', 'MARGIN_CAD'].map((acc) => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      setAlertsAccountFilter(acc);
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                      alertsAccountFilter === acc
                        ? 'bg-[#38bdf8] text-black font-extrabold'
                        : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[#8b9bb4] cursor-pointer text-[10px]">
                  <input
                    type="checkbox"
                    checked={showSnoozedAlerts}
                    onChange={(e) => setShowSnoozedAlerts(e.target.value === 'true' || e.target.checked)}
                    className="accent-[#ff9900]"
                  />
                  <span>Show Snoozed Alerts</span>
                </label>
              </div>
            </div>
          </div>

          {/* Active Alerts Cards */}
          {filteredAlerts.length === 0 ? (
            <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-8 text-center flex flex-col items-center justify-center gap-3">
              <CheckCircle className="w-12 h-12 text-[#00e676]" />
              <div className="text-white font-bold text-sm">All GIC Certificates Safe &amp; Compounding</div>
              <p className="text-[#8b9bb4] text-xs max-w-md">
                No GICs are currently within the {alertSettings.warningThresholdDays}-day maturity alert window. All certificates are progressing normally under CDIC protection.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('holdings')}
                className="mt-2 px-4 py-2 rounded bg-[#1e293b] text-white hover:bg-[#2b354d] font-bold text-xs cursor-pointer"
              >
                View Full Holdings Blotter &rarr;
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAlerts.map((alert) => {
                const isCritical = alert.urgency === 'CRITICAL';
                return (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-3.5 flex flex-col gap-3 shadow-lg transition-all ${
                      isCritical
                        ? 'bg-[#18080c] border-[#ff1744]/70 shadow-[0_0_20px_rgba(255,23,68,0.2)]'
                        : 'bg-[#140e06] border-[#ff9900]/60 shadow-[0_0_15px_rgba(255,153,0,0.15)]'
                    }`}
                  >
                    {/* Top Alert Card Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#281418] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{alert.logo}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{alert.issuer}</span>
                            <span className="px-1.5 py-0.2 rounded bg-[#38bdf8]/20 text-[#38bdf8] text-[9.5px] font-bold border border-[#38bdf8]/30">
                              {alert.accountCode}
                            </span>
                            <span className="text-[10px] text-[#64748b] font-mono">
                              #{alert.certificateNumber}
                            </span>
                          </div>
                          <span className="text-[10.5px] text-[#8b9bb4]">
                            Locked Rate: <strong className="text-[#00e676]">{alert.annualRatePct.toFixed(2)}% APY</strong> · Holder: {alert.accountName}
                          </span>
                        </div>
                      </div>

                      {/* Alert Priority & Countdown Badge */}
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <span className="px-2.5 py-1 rounded bg-[#ff1744]/25 text-[#ff1744] text-[10.5px] font-black border border-[#ff1744]/60 flex items-center gap-1.5 shadow-sm animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>CRITICAL · MATURES IN {alert.daysRemaining} DAYS</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-[#ff9900]/25 text-[#ff9900] text-[10.5px] font-black border border-[#ff9900]/60 flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>UPCOMING · MATURES IN {alert.daysRemaining} DAYS</span>
                          </span>
                        )}

                        <span className="px-1.5 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] text-[9px] font-bold border border-[#00e5ff]/30">
                          CDIC INSURED
                        </span>
                      </div>
                    </div>

                    {/* Timeline & Instructions Notice */}
                    <div className="bg-[#0b0709] border border-[#261216] rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-[#ff9900] shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-white">
                            Maturity Scheduled for: <span className="text-[#ff9900]">{alert.maturityDate}</span> ({alert.daysRemaining} days away)
                          </span>
                          <span className="text-[10px] text-[#94a3b8]">{alert.actionRequired}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-[10px] text-[#64748b]">Benchmark Renewal:</span>
                        <span className="text-[#00e676] font-bold text-xs">{alert.renewalRateBenchmarkPct.toFixed(2)}% APY</span>
                      </div>
                    </div>

                    {/* Financial Values Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Principal Capital</span>
                        <span className="text-white font-mono font-bold text-xs">
                          C${alert.principalCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Total Payout at Maturity</span>
                        <span className="text-[#ff9900] font-mono font-black text-xs">
                          C${alert.projectedMaturityValueCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Current Rollover Rule</span>
                        <span className="text-[#00e676] font-bold text-xs truncate">
                          {alert.rolloverInstruction === 'ROLLOVER_FULL'
                            ? 'Auto-Rollover (Full Compound)'
                            : alert.rolloverInstruction === 'ROLLOVER_PRINCIPAL'
                            ? 'Rollover Principal Only'
                            : 'Cash Payout on Maturity'}
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Grace Period Protection</span>
                        <span className="text-[#00e5ff] font-bold text-xs">
                          15 Days Post-Maturity
                        </span>
                      </div>
                    </div>

                    {/* Interactive Rollover Selector Buttons & Execution Actions */}
                    <div className="bg-[#070b14] border border-[#1a2334] rounded-lg p-2.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                      {/* Rollover Instruction Radio Strip */}
                      <div className="flex flex-col gap-1 w-full lg:w-auto">
                        <span className="text-[10px] text-[#8b9bb4] font-bold uppercase flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-[#ff9900]" />
                          <span>SCHEDULE MATURITY INSTRUCTION BEFORE {alert.maturityDate}:</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {[
                            {
                              id: 'ROLLOVER_FULL',
                              label: '🔄 AUTO-ROLLOVER (P+I)',
                              desc: 'Reinvest full maturity proceeds',
                            },
                            {
                              id: 'ROLLOVER_PRINCIPAL',
                              label: '🔄 ROLLOVER PRINCIPAL ONLY',
                              desc: 'Reinvest principal, pay interest to cash',
                            },
                            {
                              id: 'PAYOUT_CASH',
                              label: '💵 CASH PAYOUT (NO ROLLOVER)',
                              desc: 'Deposit 100% of proceeds to cash',
                            },
                          ].map((opt) => {
                            const isSelected = alert.rolloverInstruction === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleUpdateRolloverInstruction(alert.gicId, opt.id as any)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all border ${
                                  isSelected
                                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-[0_0_8px_rgba(255,153,0,0.3)]'
                                    : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border-[#1e2a44] hover:bg-[#1a253a]'
                                }`}
                                title={opt.desc}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Direct Execute or Snooze Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          type="button"
                          onClick={() => handleExecuteRolloverSimulation(alert.gicId)}
                          className="px-3 py-1.5 rounded bg-[#00e676]/20 hover:bg-[#00e676] text-[#00e676] hover:text-black border border-[#00e676]/50 font-black text-[10px] flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                          title="Simulate maturity date arrival and execute chosen rollover instruction now"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>EXECUTE ROLLOVER NOW</span>
                        </button>

                        {alert.isSnoozed ? (
                          <button
                            type="button"
                            onClick={() => handleClearSnooze(alert.gicId)}
                            className="px-2.5 py-1.5 rounded bg-[#1e293b] text-[#cbd5e1] hover:text-white text-[10px] font-bold cursor-pointer"
                          >
                            UNSNOOZE
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSnoozeAlert(alert.gicId, 7)}
                            className="px-2.5 py-1.5 rounded bg-[#1e293b] hover:bg-[#334155] text-[#8b9bb4] hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                            title="Snooze this alert for 7 days"
                          >
                            SNOOZE (7D)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Chronological Maturity Horizon Schedule */}
          <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-2.5 shadow-md">
            <div className="flex items-center justify-between border-b border-[#182338] pb-2">
              <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>CHRONOLOGICAL GIC MATURITY TIMELINE &amp; ROLLOVER SCHEDULE</span>
              </span>
              <span className="text-[10px] text-[#64748b]">
                All {purchasedGICs.length} certificates sorted by maturity date
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#070b14] text-[#64748b] text-[9.5px] border-b border-[#162033] uppercase">
                    <th className="py-2 px-3">ISSUER &amp; CERTIFICATE</th>
                    <th className="py-2 px-3">ACCOUNT</th>
                    <th className="py-2 px-3">PRINCIPAL</th>
                    <th className="py-2 px-3">MATURITY DATE</th>
                    <th className="py-2 px-3 text-center">DAYS REMAINING</th>
                    <th className="py-2 px-3">SCHEDULED ROLLOVER INSTRUCTION</th>
                    <th className="py-2 px-3 text-center">STATUS &amp; ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151f33] font-mono">
                  {purchasedGICs
                    .filter((g) => g.status === 'ACTIVE')
                    .sort((a, b) => a.daysToMaturity - b.daysToMaturity)
                    .map((g) => {
                      const isNear = g.daysToMaturity <= 30;
                      const isCrit = g.daysToMaturity <= 15;
                      return (
                        <tr
                          key={g.id}
                          className={`hover:bg-[#0e1628] transition-colors ${
                            isCrit ? 'bg-[#ff1744]/10' : isNear ? 'bg-[#ff9900]/5' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span>{g.logo}</span>
                              <div>
                                <span className="font-bold text-white block">{g.issuer}</span>
                                <span className="text-[9.5px] text-[#64748b]">#{g.certificateNumber}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.2 rounded bg-[#38bdf8]/15 text-[#38bdf8] text-[9.5px] font-bold border border-[#38bdf8]/30">
                              {g.accountCode}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-white font-bold">
                            C${g.principalCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-2 px-3 text-[#cbd5e1] font-bold">
                            {g.maturityDate}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                isCrit
                                  ? 'bg-[#ff1744] text-white animate-pulse'
                                  : isNear
                                  ? 'bg-[#ff9900] text-black font-extrabold'
                                  : 'bg-[#1e293b] text-[#cbd5e1]'
                              }`}
                            >
                              {g.daysToMaturity} Days
                            </span>
                          </td>

                          <td className="py-2 px-3">
                            <span className="text-[#ff9900] font-bold text-[10px]">
                              {g.rolloverInstruction === 'ROLLOVER_FULL'
                                ? '🔄 Auto-Rollover (Full Compound)'
                                : g.rolloverInstruction === 'ROLLOVER_PRINCIPAL'
                                ? '🔄 Rollover Principal Only'
                                : '💵 Cash Payout on Maturity'}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                playKeyClick();
                                setExpandedAuditId(expandedAuditId === g.id ? null : g.id);
                              }}
                              className="px-2 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-white text-[9.5px] font-bold cursor-pointer"
                            >
                              AUDIT LOG
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
      )}

      {/* SUB-TAB 1: RATES MATRIX (PURCHASABLE) */}
      {subTab === 'rates' && (
        <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-3 shadow-md">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b101c] p-2.5 rounded border border-[#182338]">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search issuer (RBC, TD, EQ Bank...), term, or feature..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#050810] border border-[#1e2a44] rounded pl-8 pr-3 py-1.5 text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#ff9900]"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 py-1 bg-[#1e293b] text-white rounded text-[10px] hover:bg-[#334155]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* GIC Type Selector */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[#64748b]">GIC TYPE:</span>
              {(['all', 'fixed', 'cashable', 'escalator', 'market_linked'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setSelectedType(type);
                  }}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    selectedType === type
                      ? 'bg-[#ff9900] text-black font-extrabold'
                      : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                  }`}
                >
                  {type === 'all'
                    ? 'ALL TYPES'
                    : type === 'fixed'
                    ? 'FIXED RATE'
                    : type === 'cashable'
                    ? 'CASHABLE'
                    : type === 'escalator'
                    ? 'STEP-UP'
                    : 'MARKET-LINKED'}
                </button>
              ))}
            </div>

            {/* Term Filter */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[#64748b]">TERM:</span>
              {[
                { label: 'ALL', val: 'all' },
                { label: '1 YR', val: 12 },
                { label: '2 YR', val: 24 },
                { label: '3 YR', val: 36 },
                { label: '5 YR', val: 60 },
              ].map((term) => (
                <button
                  key={term.label}
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setSelectedTerm(term.val as any);
                  }}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    selectedTerm === term.val
                      ? 'bg-[#00e676] text-black font-extrabold'
                      : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                  }`}
                >
                  {term.label}
                </button>
              ))}
            </div>

            {/* Registered Account Filter */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[#64748b]">ACCOUNT:</span>
              {(['ALL', 'TFSA', 'RRSP', 'FHSA', 'NON_REG'] as const).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setAccountFilter(acc);
                  }}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    accountFilter === acc
                      ? 'bg-[#38bdf8] text-black font-extrabold'
                      : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>

          {/* Rates Table with BUY / INVEST Button */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1220] text-[#64748b] border-b border-[#1a253a] text-[10px] uppercase">
                  <th className="py-2.5 px-3">ISSUER &amp; PRODUCT</th>
                  <th className="py-2.5 px-3">TYPE</th>
                  <th className="py-2.5 px-3">TERM</th>
                  <th className="py-2.5 px-3 text-right">ANNUAL RATE (APY)</th>
                  <th className="py-2.5 px-3 text-right">MIN. DEPOSIT</th>
                  <th className="py-2.5 px-3">COMPOUNDING</th>
                  <th className="py-2.5 px-3">REGISTERED ELIGIBLE</th>
                  <th className="py-2.5 px-3">FEATURES &amp; CDIC</th>
                  <th className="py-2.5 px-3 text-center">TRADE / INVEST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151f33] text-[11px]">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#64748b]">
                      No GIC rates found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((r) => {
                    const isTopRate = r.rateAnnualPct >= 4.30;
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#0e1628] transition-colors ${
                          isTopRate ? 'bg-[#00e676]/5' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{r.logo}</span>
                            <div>
                              <div className="font-extrabold text-white flex items-center gap-1.5">
                                <span>{r.issuer}</span>
                                {r.cdicMember && (
                                  <span className="px-1 py-0.2 rounded bg-[#00e5ff]/20 text-[#00e5ff] text-[8.5px] font-bold border border-[#00e5ff]/30">
                                    CDIC
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#64748b]">{r.termLabel}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                              r.type === 'fixed'
                                ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30'
                                : r.type === 'cashable'
                                ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                                : r.type === 'escalator'
                                ? 'bg-[#ff9900]/15 text-[#ff9900] border border-[#ff9900]/40'
                                : 'bg-[#c084fc]/15 text-[#c084fc] border border-[#c084fc]/30'
                            }`}
                          >
                            {r.type === 'fixed'
                              ? 'FIXED'
                              : r.type === 'cashable'
                              ? 'CASHABLE'
                              : r.type === 'escalator'
                              ? 'STEP-UP'
                              : 'MARKET-LINKED'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-white">
                          {r.termMonths < 12 ? `${r.termMonths} Months` : `${r.termMonths / 12} Year${r.termMonths > 12 ? 's' : ''}`}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <span className="text-sm font-black text-[#00e676] tracking-tight">
                            {r.rateAnnualPct.toFixed(2)}%
                          </span>
                          {r.type === 'market_linked' && (
                            <span className="block text-[8.5px] text-[#ff9900]">Max Cap Payout</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[#cbd5e1]">
                          C${r.minInvestmentCad.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-[#94a3b8]">
                          {r.compoundingFrequency}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {r.registeredEligible.map((acc) => (
                              <span
                                key={acc}
                                className="px-1 py-0.2 rounded bg-[#1e293b] text-[#cbd5e1] text-[9px] border border-[#334155]"
                              >
                                {acc}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            {r.features.map((f, i) => (
                              <span key={i} className="text-[10px] text-[#8b9bb4] flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-[#ff9900]" />
                                <span>{f}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenBuyTicket(r)}
                              className="px-2.5 py-1 rounded bg-[#00e676] hover:bg-[#00c853] text-black font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_8px_rgba(0,230,118,0.3)] hover:scale-105"
                              title="Purchase this Guaranteed Investment Certificate"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>BUY GIC</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                playKeyClick();
                                setCalcRate(r.rateAnnualPct);
                                setCalcTermMonths(r.termMonths);
                                setSubTab('calculator');
                              }}
                              className="px-2 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                              title="Load rate into compound calculator"
                            >
                              CALC
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MY GIC PORTFOLIO & ROLLOVER DESK */}
      {subTab === 'holdings' && (
        <div className="flex flex-col gap-3">
          {/* Top Rollover Desk Summary Banner */}
          <div className="bg-gradient-to-r from-[#0c1428] via-[#091020] to-[#0c1428] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider font-bold">
                  CANADIAN GIC ACTIVE HOLDINGS &amp; ROLLOVER DESK
                </span>
                <span className="bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.5 rounded text-[9px] font-black border border-[#00e676]/30">
                  CDIC PROTECTED
                </span>
                <span className="bg-[#ff9900]/20 text-[#ff9900] px-1.5 py-0.5 rounded text-[9px] font-bold border border-[#ff9900]/30">
                  AUTOMATED REINVESTMENT
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1.5">
                <span className="text-2xl font-black text-white font-mono">
                  C${holdingsMetrics.totalPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-bold text-[#00e676]">
                  +C${holdingsMetrics.totalProjectedInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })} Projected Interest
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-1">
                Total Maturity Value:{' '}
                <strong className="text-white">
                  C${holdingsMetrics.totalMaturityValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>{' '}
                across {holdingsMetrics.activeCount} active certificates. Adjust rollover instructions or simulate instant maturity below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('rates')}
                className="px-3 py-1.5 rounded bg-[#00e676] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,230,118,0.3)] hover:scale-105 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>PURCHASE NEW GIC</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setIsLadderOrderOpen(true);
                }}
                className="px-3 py-1.5 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>DEPLOY 5-YR LADDER</span>
              </button>
            </div>
          </div>

          {/* Filter Bar for Holdings */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[#64748b]">FILTER ACCOUNT:</span>
              {['ALL', 'TFSA', 'RRSP', 'FHSA', 'RESP', 'MARGIN_CAD'].map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setHoldingsAccountFilter(acc);
                  }}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    holdingsAccountFilter === acc
                      ? 'bg-[#38bdf8] text-black font-extrabold'
                      : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[#64748b]">STATUS:</span>
              {(['ACTIVE', 'ALL', 'MATURED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setHoldingsStatusFilter(st as any);
                  }}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    holdingsStatusFilter === st
                      ? 'bg-[#00e676] text-black font-extrabold'
                      : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Holdings Cards List */}
          {filteredHoldings.length === 0 ? (
            <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-8 text-center flex flex-col items-center justify-center gap-3">
              <ShieldCheck className="w-12 h-12 text-[#64748b]" />
              <div className="text-white font-bold text-sm">No GIC Certificates in this category</div>
              <p className="text-[#8b9bb4] text-xs max-w-md">
                You haven&apos;t purchased any GICs under this filter yet. Browse current Big 6 bank rates to lock in guaranteed CDIC-insured return.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('rates')}
                className="mt-2 px-4 py-2 rounded bg-[#00e676] text-black font-extrabold text-xs shadow-md cursor-pointer"
              >
                Browse &amp; Purchase GICs &rarr;
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredHoldings.map((gic) => {
                const isMatured = gic.status === 'MATURED';
                const isRedeemed = gic.status === 'REDEEMED';
                const elapsedDays = Math.max(0, gic.totalDays - gic.daysToMaturity);
                const progressPct = Math.min(100, Math.round((elapsedDays / gic.totalDays) * 100));

                return (
                  <div
                    key={gic.id}
                    className={`bg-[#0b101c] border rounded-lg p-3.5 flex flex-col gap-3 transition-all ${
                      isMatured || isRedeemed
                        ? 'border-[#1e293b] opacity-75'
                        : 'border-[#1e2a44] hover:border-[#ff9900]/50 shadow-md'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182338] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{gic.logo}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{gic.issuer}</span>
                            <span className="px-1.5 py-0.2 rounded bg-[#38bdf8]/20 text-[#38bdf8] text-[9.5px] font-bold border border-[#38bdf8]/30">
                              {gic.accountCode}
                            </span>
                            <span className="text-[10px] text-[#64748b] font-mono">
                              #{gic.certificateNumber}
                            </span>
                          </div>
                          <span className="text-[10.5px] text-[#8b9bb4]">
                            {gic.termLabel} · Compounding: {gic.compoundingFrequency} · Subscribed: {gic.purchaseDate}
                          </span>
                        </div>
                      </div>

                      {/* Status & Rollover Badge */}
                      <div className="flex items-center gap-2">
                        {gic.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[10px] font-bold border border-[#00e676]/40 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>ACTIVE · {gic.daysToMaturity} DAYS TO MATURITY</span>
                          </span>
                        ) : gic.status === 'MATURED' ? (
                          <span className="px-2 py-0.5 rounded bg-[#64748b]/20 text-[#94a3b8] text-[10px] font-bold border border-[#64748b]/40">
                            MATURED &amp; PAID OUT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] text-[10px] font-bold border border-[#ef4444]/40">
                            EARLY REDEEMED
                          </span>
                        )}

                        {gic.cdicInsured && (
                          <span className="px-1.5 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] text-[9.5px] font-bold border border-[#00e5ff]/40">
                            CDIC 100%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {gic.status === 'ACTIVE' && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                          <span>
                            Term Progression: <strong className="text-white">{progressPct}%</strong> ({elapsedDays} of {gic.totalDays} Days)
                          </span>
                          <span>
                            Matures on: <strong className="text-[#ff9900]">{gic.maturityDate}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-[#162033] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#00d2ff] via-[#ff9900] to-[#00e676] h-full transition-all duration-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Financial Metrics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Principal Invested</span>
                        <span className="text-white font-mono font-bold text-xs">
                          C${gic.principalCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Locked Annual Yield</span>
                        <span className="text-[#00e676] font-mono font-black text-xs">
                          {gic.annualRatePct.toFixed(2)}% APY
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Accrued to Date</span>
                        <span className="text-[#38bdf8] font-mono font-bold text-xs">
                          +C${gic.accruedInterestCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Projected Total Interest</span>
                        <span className="text-[#ff9900] font-mono font-bold text-xs">
                          +C${gic.projectedTotalInterestCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-[#070b14] p-2 rounded border border-[#162033] flex flex-col">
                        <span className="text-[#64748b] text-[8.5px] uppercase">Maturity Value</span>
                        <span className="text-white font-mono font-black text-xs">
                          C${gic.projectedMaturityValueCad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Rollover Control Desk & Action Buttons */}
                    <div className="bg-[#070b14] border border-[#182338] rounded-lg p-2.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                      {/* Rollover Instruction Selector */}
                      <div className="flex flex-col gap-1.5 w-full lg:w-auto">
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-[#ff9900]" />
                          <span className="text-[10.5px] font-bold text-white uppercase">
                            MATURITY ROLLOVER INSTRUCTION:
                          </span>
                          {gic.rolloverCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-[#c084fc]/20 text-[#c084fc] text-[9px] font-bold">
                              Rolled {gic.rolloverCount}x
                            </span>
                          )}
                        </div>

                        {gic.status === 'ACTIVE' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              {
                                id: 'ROLLOVER_FULL',
                                label: '🔄 AUTO-ROLLOVER (P+I)',
                                desc: 'Reinvest full balance',
                              },
                              {
                                id: 'ROLLOVER_PRINCIPAL',
                                label: '🔄 ROLLOVER PRINCIPAL ONLY',
                                desc: 'Cash out interest',
                              },
                              {
                                id: 'PAYOUT_CASH',
                                label: '💵 CASH PAYOUT (NO ROLLOVER)',
                                desc: 'Deposit all to cash',
                              },
                            ].map((opt) => {
                              const isSelected = gic.rolloverInstruction === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleUpdateRolloverInstruction(gic.id, opt.id as any)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all border ${
                                    isSelected
                                      ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-[0_0_8px_rgba(255,153,0,0.3)]'
                                      : 'bg-[#0f172a] text-[#8b9bb4] hover:text-white border-[#1e2a44] hover:bg-[#1a253a]'
                                  }`}
                                  title={opt.desc}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#64748b]">
                            Final Settlement: {gic.status === 'MATURED' ? 'Matured & paid out to account cash' : 'Redeemed early'}
                          </div>
                        )}
                      </div>

                      {/* Interactive Execution Actions */}
                      {gic.status === 'ACTIVE' && (
                        <div className="flex items-center gap-2 self-end lg:self-center">
                          <button
                            type="button"
                            onClick={() => handleExecuteRolloverSimulation(gic.id)}
                            className="px-3 py-1.5 rounded bg-[#00e676]/20 hover:bg-[#00e676] text-[#00e676] hover:text-black border border-[#00e676]/50 font-black text-[10px] flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:scale-105"
                            title="Simulate maturity date arrival and execute the chosen rollover instruction now"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>EXECUTE ROLLOVER / MATURE</span>
                          </button>

                          {gic.type === 'cashable' ? (
                            <button
                              type="button"
                              onClick={() => handleEarlyRedeemCertificate(gic.id)}
                              className="px-2.5 py-1.5 rounded bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 font-bold text-[10px] cursor-pointer transition-colors"
                              title="Cashable GIC: Redeem principal and accrued interest immediately"
                            >
                              EARLY REDEEM
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEarlyRedeemCertificate(gic.id)}
                              className="px-2.5 py-1.5 rounded bg-[#1e293b] hover:bg-[#ef4444]/20 text-[#8b9bb4] hover:text-[#ef4444] border border-[#334155] font-bold text-[10px] cursor-pointer transition-colors"
                              title="Break fixed term early (forfeits partial interest per Canadian banking rules)"
                            >
                              BREAK TERM
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              playKeyClick();
                              setExpandedAuditId(expandedAuditId === gic.id ? null : gic.id);
                            }}
                            className="px-2 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] text-[#8b9bb4] hover:text-white border border-[#1e2a44] text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="View certificate audit trail and transaction log"
                          >
                            <History className="w-3 h-3" />
                            <span>{expandedAuditId === gic.id ? 'HIDE AUDIT' : 'AUDIT LOG'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Audit Trail Drawer (Expandable) */}
                    {expandedAuditId === gic.id && (
                      <div className="bg-[#050810] border border-[#162033] rounded p-2.5 flex flex-col gap-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-[#141d30] pb-1">
                          <span className="text-[10px] font-bold text-white flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#38bdf8]" />
                            <span>CDIC AUDIT LOG &amp; TRANSACTION HISTORY</span>
                          </span>
                          <span className="text-[9px] text-[#64748b]">
                            Registered Holder Account: {gic.accountName}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 mt-1 font-mono text-[9.5px]">
                          {gic.history.map((h, i) => (
                            <div key={i} className="flex items-start gap-2 text-[#94a3b8] py-0.5">
                              <span className="text-[#64748b] shrink-0">[{h.timestamp}]</span>
                              <span className="px-1 py-0.2 rounded bg-[#1e293b] text-white text-[8.5px] font-bold shrink-0">
                                {h.event}
                              </span>
                              <span className="text-[#cbd5e1]">{h.note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: COMPOUND INTEREST CALCULATOR */}
      {subTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Controls Column */}
          <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#182338] pb-2">
              <Calculator className="w-4 h-4 text-[#ff9900]" />
              <span className="font-extrabold text-white text-xs">GIC MATURITY PARAMETERS</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8b9bb4]">Principal Investment (CAD):</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[#64748b] text-xs">C$</span>
                <input
                  type="number"
                  value={calcPrincipal}
                  onChange={(e) => setCalcPrincipal(Math.max(100, Number(e.target.value)))}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#050810] border border-[#22304c] rounded text-white text-xs font-mono focus:outline-none focus:border-[#ff9900]"
                />
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      setCalcPrincipal(amt);
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[#cbd5e1] text-[9.5px] hover:text-white cursor-pointer"
                  >
                    ${amt / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8b9bb4]">Annual Interest Rate (% APY):</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={calcRate}
                  onChange={(e) => setCalcRate(Math.max(0.1, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 bg-[#050810] border border-[#22304c] rounded text-white text-xs font-mono focus:outline-none focus:border-[#ff9900]"
                />
                <span className="absolute right-3 top-2 text-[#64748b] text-xs">%</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8b9bb4]">Term Duration:</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '6 Mo', m: 6 },
                  { label: '1 Yr', m: 12 },
                  { label: '2 Yr', m: 24 },
                  { label: '3 Yr', m: 36 },
                  { label: '4 Yr', m: 48 },
                  { label: '5 Yr', m: 60 },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      setCalcTermMonths(t.m);
                    }}
                    className={`py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      calcTermMonths === t.m
                        ? 'bg-[#ff9900] text-black border-[#ff9900] font-black'
                        : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e2a44] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8b9bb4]">Compounding / Payout Frequency:</label>
              <div className="grid grid-cols-2 gap-1">
                {(['Annual', 'Semi-Annual', 'Monthly', 'At Maturity'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      setCalcFrequency(freq);
                    }}
                    className={`py-1 px-2 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      calcFrequency === freq
                        ? 'bg-[#00e676] text-black border-[#00e676] font-black'
                        : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e2a44] hover:text-white'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Buy Button from Calculator */}
            <button
              type="button"
              onClick={handleOpenBuyFromCalculator}
              className="mt-2 w-full py-2 rounded bg-[#00e676] hover:bg-[#00c853] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,230,118,0.3)] cursor-pointer transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>PURCHASE GIC WITH THESE PARAMETERS</span>
            </button>

            <div className="mt-auto p-2 rounded bg-[#070b14] border border-[#172236] text-[10px] text-[#64748b]">
              💡 <em>Tax Note:</em> In a <strong>TFSA</strong>, 100% of interest is tax-free. In an <strong>RRSP</strong>, it compounds tax-deferred. In non-registered accounts, interest is taxed as regular income.
            </div>
          </div>

          {/* Maturity & Payout Overview */}
          <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[#182338] pb-2">
              <span className="font-extrabold text-white text-xs">PROJECTED PROCEEDS &amp; YIELD</span>
              <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[10px] font-bold border border-[#00e676]/30">
                100% Principal Guaranteed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#070b14] p-2.5 rounded border border-[#162033] flex flex-col">
                <span className="text-[#64748b] text-[9px] uppercase">Starting Capital</span>
                <span className="text-white font-extrabold text-sm font-mono">
                  C${calcPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-[#070b14] p-2.5 rounded border border-[#162033] flex flex-col">
                <span className="text-[#64748b] text-[9px] uppercase">Total Interest Earned</span>
                <span className="text-[#00e676] font-extrabold text-sm font-mono">
                  +C${maturityResult.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-[#070b14] p-2.5 rounded border border-[#162033] flex flex-col">
                <span className="text-[#64748b] text-[9px] uppercase">Value at Maturity</span>
                <span className="text-[#ff9900] font-black text-sm font-mono">
                  C${maturityResult.maturityValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-[#070b14] p-2.5 rounded border border-[#162033] flex flex-col">
                <span className="text-[#64748b] text-[9px] uppercase">Effective Annual Yield</span>
                <span className="text-[#38bdf8] font-extrabold text-sm font-mono">
                  {maturityResult.effectiveAnnualYield.toFixed(2)}% APY
                </span>
              </div>
            </div>

            {/* Year-by-Year Growth Schedule */}
            <div className="flex-1 flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-[#8b9bb4]">ANNUAL BALANCE &amp; INTEREST PROGRESSION</span>
              <div className="overflow-x-auto border border-[#162033] rounded">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#070b14] text-[#64748b] text-[9.5px] border-b border-[#162033]">
                      <th className="py-1.5 px-3">PERIOD</th>
                      <th className="py-1.5 px-3 text-right">OPENING BALANCE</th>
                      <th className="py-1.5 px-3 text-right">INTEREST EARNED</th>
                      <th className="py-1.5 px-3 text-right">CLOSING BALANCE</th>
                      <th className="py-1.5 px-3 text-right">CUMULATIVE RETURN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151f33] font-mono">
                    {maturityResult.breakdownYears.map((row) => {
                      const cumGain = row.endBal - calcPrincipal;
                      const cumPct = (cumGain / calcPrincipal) * 100;
                      return (
                        <tr key={row.year} className="hover:bg-[#0d1424]">
                          <td className="py-2 px-3 text-white font-bold">Year {row.year}</td>
                          <td className="py-2 px-3 text-right text-[#94a3b8]">
                            C${row.startBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right text-[#00e676] font-bold">
                            +C${row.interestEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right text-white font-black">
                            C${row.endBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right text-[#ff9900]">
                            +{cumPct.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: 5-YEAR GIC LADDER STRATEGY */}
      {subTab === 'ladder' && (
        <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182338] pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff9900]" />
                <span className="font-extrabold text-white text-xs">
                  5-YEAR GIC LADDERING ARCHITECTURE
                </span>
                <span className="px-2 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] text-[9.5px] font-bold border border-[#38bdf8]/30">
                  ANNUAL ROLLING LIQUIDITY
                </span>
              </div>
              <p className="text-[10px] text-[#64748b]">
                Splits capital equally across 1, 2, 3, 4, and 5-year terms. Every 12 months, 20% matures and automatically rolls into the highest 5-year rate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8b9bb4]">Total Ladder Capital:</span>
              <div className="relative">
                <span className="absolute left-2 top-1.5 text-[#64748b] text-[10px]">C$</span>
                <input
                  type="number"
                  value={ladderCapital}
                  onChange={(e) => setLadderCapital(Math.max(5000, Number(e.target.value)))}
                  className="w-28 pl-6 pr-2 py-1 bg-[#050810] border border-[#22304c] rounded text-white text-xs font-mono focus:outline-none focus:border-[#ff9900]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setIsLadderOrderOpen(true);
                }}
                className="px-3 py-1.5 rounded bg-[#00e676] hover:bg-[#00c853] text-black font-black text-xs flex items-center gap-1 shadow-[0_0_10px_rgba(0,230,118,0.3)] cursor-pointer transition-all"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>PURCHASE 5-YEAR LADDER</span>
              </button>
            </div>
          </div>

          {/* Ladder Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-[#0b101c] p-2.5 rounded border border-[#172236] flex flex-col">
              <span className="text-[#64748b] text-[9px] uppercase">Blended Average Yield</span>
              <span className="text-[#00e676] font-black text-sm">
                {ladderResult.blendedAverageYield.toFixed(2)}% APY
              </span>
            </div>

            <div className="bg-[#0b101c] p-2.5 rounded border border-[#172236] flex flex-col">
              <span className="text-[#64748b] text-[9px] uppercase">Annual Capital Freed</span>
              <span className="text-[#38bdf8] font-bold text-sm font-mono">
                C${ladderResult.annualLiquidityFreed.toLocaleString()} / year
              </span>
            </div>

            <div className="bg-[#0b101c] p-2.5 rounded border border-[#172236] flex flex-col">
              <span className="text-[#64748b] text-[9px] uppercase">Total Interest Earned</span>
              <span className="text-[#ff9900] font-black text-sm font-mono">
                +C${ladderResult.totalInterestEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-[#0b101c] p-2.5 rounded border border-[#172236] flex flex-col">
              <span className="text-[#64748b] text-[9px] uppercase">Maturity Reinvestment</span>
              <span className="text-white font-bold text-sm">
                Rolling 5-Year High Rate
              </span>
            </div>
          </div>

          {/* 5 Tranches Visualization */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-1">
            {ladderResult.calculatedTranches.map((tranche) => (
              <div
                key={tranche.year}
                className="bg-[#0b101c] border border-[#1e2a44] rounded p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between border-b border-[#182338] pb-1">
                  <span className="font-extrabold text-white text-[11px]">TRANCHE {tranche.year}</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#ff9900]/20 text-[#ff9900] text-[9px] font-bold">
                    {tranche.term}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-[#64748b]">Allocated Principal:</span>
                  <span className="text-white font-mono font-bold text-xs">
                    C${tranche.principal.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-[#64748b]">Locked APY:</span>
                  <span className="text-[#00e676] font-mono font-extrabold text-xs">
                    {tranche.rate.toFixed(2)}%
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-[#64748b]">Total Interest:</span>
                  <span className="text-[#ff9900] font-mono font-bold text-xs">
                    +C${tranche.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="mt-auto pt-1 border-t border-[#182338] flex items-center justify-between text-[9px]">
                  <span className="text-[#8b9bb4]">Annual Payout:</span>
                  <span className="text-[#38bdf8] font-mono font-bold">
                    C${tranche.annualIncome.toFixed(0)}/yr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CANADIAN ISSUERS & CREDIT TIERS */}
      {subTab === 'issuers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CANADIAN_GIC_ISSUERS.map((issuer) => (
            <div
              key={issuer.name}
              className="bg-[#0b101c] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between border-b border-[#182338] pb-1.5">
                <div>
                  <span className="font-extrabold text-white text-xs block">{issuer.name}</span>
                  <span className="text-[9.5px] text-[#8b9bb4]">{issuer.tier}</span>
                </div>
                {issuer.cdicInsured && (
                  <span className="px-2 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] text-[9.5px] font-bold border border-[#00e5ff]/40">
                    CDIC MEMBER
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
                  <span className="text-[#64748b] text-[8.5px]">Credit Rating</span>
                  <span className="text-white font-bold">{issuer.rating}</span>
                </div>

                <div className="bg-[#070b14] p-1.5 rounded border border-[#162033] flex flex-col">
                  <span className="text-[#64748b] text-[8.5px]">Best 1-Yr / 5-Yr</span>
                  <span className="text-[#00e676] font-bold">
                    {issuer.bestRate1Yr.toFixed(2)}% / {issuer.bestRate5Yr.toFixed(2)}%
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#94a3b8] mt-1">{issuer.highlight}</p>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 6: CDIC DEPOSIT PROTECTION GUIDE */}
      {subTab === 'cdic' && (
        <div className="bg-[#080d18] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center gap-2 border-b border-[#182338] pb-2">
            <ShieldCheck className="w-5 h-5 text-[#00e5ff]" />
            <div>
              <span className="font-extrabold text-white text-xs">
                CANADIAN DEPOSIT INSURANCE CORPORATION (CDIC) RULES
              </span>
              <p className="text-[10px] text-[#64748b]">
                Federal Crown Corporation protecting Canadian savings &amp; GIC deposits up to C$100,000 per insured category per member institution.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {CDIC_COVERAGE_RULES.map((rule) => (
              <div
                key={rule.category}
                className="bg-[#0b101c] border border-[#18243c] rounded p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{rule.category}</span>
                  <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[10px] font-black border border-[#00e676]/40">
                    C${rule.limitCad.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-[#94a3b8]">{rule.description}</p>
                <div className="text-[9.5px] text-[#38bdf8] bg-[#070b14] p-1.5 rounded border border-[#141d30]">
                  📌 {rule.examples[0]}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded bg-[#0f172a] border border-[#1e2a44] text-[10px] text-[#94a3b8] flex items-center justify-between gap-3">
            <span>
              <strong>Strategic Multi-Institution Stacking:</strong> By splitting deposits across separate CDIC member issuers (e.g. RBC, TD, BMO, EQ Bank), an investor can insure unlimited millions of dollars in 100% risk-free GICs with sovereign backing.
            </span>
            {onOpenCanadianSuite && (
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  onOpenCanadianSuite();
                }}
                className="px-3 py-1 rounded bg-[#ff9900] text-black font-extrabold text-[10px] shrink-0 cursor-pointer"
              >
                Open Canadian Accounts &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: PURCHASE GIC ORDER TICKET */}
      {isOrderTicketOpen && ticketRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b101e] border-2 border-[#ff9900] rounded-xl w-full max-w-xl shadow-[0_0_40px_rgba(255,153,0,0.25)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#101726] border-b border-[#1e2a44] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{ticketRate.logo}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">
                      ORDER TICKET: {ticketRate.issuer}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#00e676]/20 text-[#00e676] text-[9px] font-bold border border-[#00e676]/30">
                      CDIC INSURED
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8b9bb4]">
                    {ticketRate.termLabel} · Locked Yield: <strong className="text-[#00e676]">{ticketRate.rateAnnualPct.toFixed(2)}% APY</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderTicketOpen(false)}
                className="p-1 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1e293b] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto">
              {/* Account Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8b9bb4] flex items-center justify-between">
                  <span>SELECT SETTLEMENT ACCOUNT:</span>
                  <span className="text-[#00e676] font-mono">
                    Available Cash: C${currentOrderAccount.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </label>
                <select
                  value={orderAccountId}
                  onChange={(e) => setOrderAccountId(e.target.value)}
                  className="w-full bg-[#050810] border border-[#22304c] rounded p-2 text-white text-xs font-mono focus:outline-none focus:border-[#ff9900]"
                >
                  {localAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.badge} — {acc.name} (Cash: C${acc.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
                {currentOrderAccount.isRegistered && (
                  <div className="text-[9.5px] text-[#38bdf8] flex items-center gap-1 mt-0.5">
                    <Info className="w-3 h-3" />
                    <span>Registered Account: 100% Tax-Free growth in TFSA or tax-deferred in RRSP.</span>
                  </div>
                )}
              </div>

              {/* Principal Amount Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8b9bb4] flex items-center justify-between">
                  <span>PRINCIPAL INVESTMENT (CAD):</span>
                  <span className="text-[#64748b]">Min Deposit: C${ticketRate.minInvestmentCad.toLocaleString()}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#64748b] text-sm font-mono">C$</span>
                  <input
                    type="number"
                    min={ticketRate.minInvestmentCad}
                    step={500}
                    value={orderPrincipal}
                    onChange={(e) => setOrderPrincipal(Math.max(1, Number(e.target.value)))}
                    className="w-full pl-9 pr-3 py-2 bg-[#050810] border border-[#22304c] rounded text-white text-sm font-mono font-bold focus:outline-none focus:border-[#ff9900]"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {[2500, 5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOrderPrincipal(amt)}
                      className="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] text-[10px] cursor-pointer"
                    >
                      ${amt / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOrderPrincipal(Math.floor(currentOrderAccount.cashBalance))}
                    className="px-2 py-0.5 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] text-[10px] font-bold cursor-pointer"
                  >
                    MAX CASH
                  </button>
                </div>
              </div>

              {/* Compounding Frequency */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-[#8b9bb4]">
                  COMPOUNDING &amp; PAYOUT FREQUENCY:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Annual', 'Semi-Annual', 'Monthly', 'At Maturity'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setOrderFrequency(freq)}
                      className={`py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        orderFrequency === freq
                          ? 'bg-[#00e676] text-black border-[#00e676] font-black'
                          : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e2a44] hover:text-white'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rollover Instruction Selection */}
              <div className="flex flex-col gap-1.5 bg-[#070b14] border border-[#162033] rounded-lg p-2.5">
                <label className="text-[10.5px] font-black text-white flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#ff9900]" />
                  <span>MATURITY ROLLOVER INSTRUCTION (CANADIAN BANKING RULE):</span>
                </label>
                <p className="text-[9.5px] text-[#64748b]">
                  Choose how your principal and accumulated interest should be treated upon maturity. You can adjust this anytime during the term.
                </p>

                <div className="flex flex-col gap-1.5 mt-1">
                  {[
                    {
                      id: 'ROLLOVER_FULL',
                      title: '🔄 Auto-Rollover Principal + Interest (Full Compound Growth)',
                      sub: 'Reinvest entire maturity balance into identical term at current posted rate.',
                    },
                    {
                      id: 'ROLLOVER_PRINCIPAL',
                      title: '🔄 Auto-Rollover Principal Only (Regular Cash Flow)',
                      sub: 'Renew initial principal; deposit earned interest directly into account cash balance.',
                    },
                    {
                      id: 'PAYOUT_CASH',
                      title: '💵 Cash Payout at Maturity (No Rollover)',
                      sub: 'Deposit 100% of principal plus interest into settlement account on maturity date.',
                    },
                  ].map((item) => {
                    const isSelected = orderRollover === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setOrderRollover(item.id as any)}
                        className={`p-2 rounded border cursor-pointer transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-[#ff9900]/15 border-[#ff9900] text-white shadow-sm'
                            : 'bg-[#0a0f1d] border-[#182338] text-[#8b9bb4] hover:border-[#334155]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rollover"
                          checked={isSelected}
                          onChange={() => setOrderRollover(item.id as any)}
                          className="mt-1 accent-[#ff9900]"
                        />
                        <div className="flex flex-col">
                          <span className={`text-[10.5px] font-bold ${isSelected ? 'text-[#ff9900]' : 'text-white'}`}>
                            {item.title}
                          </span>
                          <span className="text-[9px] text-[#8b9bb4]">{item.sub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Confirmation Summary Box */}
              <div className="bg-[#050810] border border-[#1e2a44] rounded-lg p-2.5 flex flex-col gap-1.5 text-[10.5px]">
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Locked Annual APY:</span>
                  <span className="text-[#00e676] font-bold">{ticketRate.rateAnnualPct.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Projected Interest Earned:</span>
                  <span className="text-[#00e676] font-bold">
                    +C${orderMaturityResult.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white font-bold border-t border-[#182338] pt-1">
                  <span>Total Value at Maturity:</span>
                  <span className="text-[#ff9900] text-sm font-black font-mono">
                    C${orderMaturityResult.maturityValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9.5px] text-[#00e5ff]">
                  <span>CDIC Insurance Guarantee:</span>
                  <span>100% Backed (Up to C$100,000)</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#101726] border-t border-[#1e2a44] p-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOrderTicketOpen(false)}
                className="px-3 py-1.5 rounded bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="px-4 py-1.5 rounded bg-[#00e676] hover:bg-[#00c853] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,230,118,0.3)] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRM &amp; ISSUE GIC CERTIFICATE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 5-YEAR LADDER DEPLOYMENT ORDER */}
      {isLadderOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b101e] border-2 border-[#00e676] rounded-xl w-full max-w-lg shadow-[0_0_40px_rgba(0,230,118,0.25)] flex flex-col overflow-hidden">
            <div className="bg-[#101726] border-b border-[#1e2a44] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#00e676]" />
                <div>
                  <span className="font-black text-white text-sm">
                    DEPLOY 5-YEAR GIC LADDER (5 TRANCHES)
                  </span>
                  <span className="block text-[10px] text-[#8b9bb4]">
                    Total Capital: C${ladderCapital.toLocaleString()} · Staggered Annual Maturities
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLadderOrderOpen(false)}
                className="p-1 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1e293b] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b9bb4]">DELEGATE CAPITAL FROM ACCOUNT:</label>
                <select
                  value={ladderOrderAccountId}
                  onChange={(e) => setLadderOrderAccountId(e.target.value)}
                  className="w-full bg-[#050810] border border-[#22304c] rounded p-2 text-white text-xs font-mono"
                >
                  {localAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.badge} — Cash: C${acc.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[#070b14] p-2.5 rounded border border-[#162033] flex flex-col gap-1 text-[10px]">
                <span className="font-bold text-white">5 TRANCHE ALLOCATION (C${(ladderCapital / 5).toLocaleString()} EACH):</span>
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Tranche 1 (1-Yr): EQ Bank 4.35% APY</span>
                  <span className="text-[#00e676] font-bold">Auto-Roll 5-Yr</span>
                </div>
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Tranche 2 (2-Yr): Oaken 4.25% APY</span>
                  <span className="text-[#00e676] font-bold">Auto-Roll 5-Yr</span>
                </div>
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Tranche 3 (3-Yr): National Bank 4.15% APY</span>
                  <span className="text-[#00e676] font-bold">Auto-Roll 5-Yr</span>
                </div>
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Tranche 4 (4-Yr): RBC 4.10% APY</span>
                  <span className="text-[#00e676] font-bold">Auto-Roll 5-Yr</span>
                </div>
                <div className="flex items-center justify-between text-[#8b9bb4]">
                  <span>Tranche 5 (5-Yr): TD 4.15% APY</span>
                  <span className="text-[#00e676] font-bold">Auto-Roll 5-Yr</span>
                </div>
              </div>

              <div className="p-2 rounded bg-[#050810] border border-[#1e2a44] text-[10px] text-[#00e5ff]">
                🛡️ All 5 tranches are individually CDIC protected under separate or eligible member institution categories.
              </div>
            </div>

            <div className="bg-[#101726] border-t border-[#1e2a44] p-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLadderOrderOpen(false)}
                className="px-3 py-1.5 rounded bg-[#1e293b] text-white font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchaseLadder}
                className="px-4 py-1.5 rounded bg-[#00e676] text-black font-black text-xs cursor-pointer"
              >
                DEPLOY 5-YEAR LADDER &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
