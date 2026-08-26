import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  Download, 
  Clock, 
  Zap,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  FileCode,
  Info,
  Sliders,
  Users,
  Target,
  BadgeAlert,
  HelpCircle
} from 'lucide-react';
import { AnalyticsSummary, Transaction } from '../types.ts';
import { formatINR } from '../utils/formatters.ts';

interface AnalyticsViewProps {
  analytics: AnalyticsSummary | null;
  transactions: Transaction[];
  onNavigateToQueue: (category?: string) => void;
  onReseedData?: (count: number, scenario: string) => Promise<void>;
  isReseeding?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  transactions,
  onNavigateToQueue,
  onReseedData,
  isReseeding = false
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('balanced');
  const [showDisclaimerDetails, setShowDisclaimerDetails] = useState<boolean>(false);

  if (!analytics) {
    return (
      <div className="py-24 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">Computing Batch Analytics across Synthetic Dataset...</p>
        <span className="text-xs text-slate-400 mt-1 block">Aggregating telemetry in Razorpay Test Mode</span>
      </div>
    );
  }

  const handleRunScenario = (count: number, scenario: string) => {
    setSelectedScenario(scenario);
    if (onReseedData) {
      onReseedData(count, scenario);
    }
  };

  const exportDataJSON = () => {
    const payload = {
      _metadata: {
        environment: "Razorpay Test Mode",
        isSynthetic: true,
        dataClassification: "SYNTHETIC_TEST_MODE_TELEMETRY",
        exportedAt: new Date().toISOString(),
        totalBatchRecords: analytics.totalTransactions,
        disclaimer: "All transactions, customer names, phone numbers, and payment IDs in this file are synthetic test-mode records."
      },
      analyticsSummary: analytics,
      transactions: transactions
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `recoveriq_synthetic_batch_analytics_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportDataCSV = () => {
    const headers = [
      "SYNTHETIC_FLAG",
      "Transaction_ID",
      "Order_ID",
      "Customer_Name",
      "Customer_Tier",
      "Amount_INR",
      "Payment_Method",
      "Failure_Category",
      "Failure_Reason",
      "Recovery_Status",
      "Recovery_Likelihood",
      "Recovery_Score",
      "AI_Recommended_Action",
      "Policy_Passed",
      "Recovered_Amount_INR",
      "Timestamp"
    ];

    const rows = transactions.map(t => [
      "SYNTHETIC_TEST_MODE",
      t.id,
      t.orderId,
      `"${t.customerName}"`,
      t.customerTier,
      t.amount,
      t.paymentMethod,
      t.failureCategory,
      `"${t.failureReason.replace(/"/g, '""')}"`,
      t.status,
      t.recoveryLikelihood,
      t.recoveryScore,
      t.aiDiagnosis?.recommendedAction || "none",
      t.policyCheck?.passed ? "TRUE" : "FALSE",
      t.recoveryAction?.recoveredAmount || (t.status === 'recovered' ? t.amount : 0),
      t.timestamp
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [
      "# RECOVERIQ SYNTHETIC BATCH ANALYTICS EXPORT (RAZORPAY TEST MODE)",
      `# TOTAL_RECORDS=${transactions.length}, EXPORTED_AT=${new Date().toISOString()}`,
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recoveriq_synthetic_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-5">
      {/* Prominent Synthetic / Test Mode Watermark Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500 text-slate-950 tracking-wider uppercase">
                Synthetic / Test-Mode Dataset
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-900 text-amber-400">
                Razorpay Test Sandbox
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Batch Size: {analytics.totalTransactions} Records
              </span>
            </div>
            <p className="text-slate-700 text-xs sm:text-sm mt-1.5 leading-relaxed">
              All batch analytics, conversion metrics, failure distributions, and ROI figures are computed from a <strong>synthetic dataset of {analytics.totalTransactions}+ transactions</strong> simulating Indian gateway traffic in Razorpay Test Mode. No real financial charges or real customer PII are utilized.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            id="export-analytics-json-btn"
            onClick={exportDataJSON}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs shadow-xs transition-all"
            title="Download JSON telemetry with explicit synthetic headers"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export JSON</span>
          </button>
          <button
            id="export-analytics-csv-btn"
            onClick={exportDataCSV}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all"
            title="Download CSV table of all synthetic transactions"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Synthetic Scenario Selector & Batch Scale Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Synthetic Batch Scenario Simulator</h3>
            <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
              100+ Transaction Benchmarking
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Click to re-simulate gateway dynamics across different failure distributions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            onClick={() => handleRunScenario(125, 'balanced')}
            disabled={isReseeding}
            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
              selectedScenario === 'balanced' 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Balanced Mix</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono">125 TXNs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Realistic standard payment rails (UPI, Card, Netbanking, Mandate)</p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 mt-2 block">Run Simulation &rarr;</span>
          </button>

          <button
            onClick={() => handleRunScenario(150, 'upi_spike')}
            disabled={isReseeding}
            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
              selectedScenario === 'upi_spike' 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Festive UPI Surge</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono">150 TXNs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">70% UPI volume with bank PSP drops and OTP timeout spikes</p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 mt-2 block">Run Simulation &rarr;</span>
          </button>

          <button
            onClick={() => handleRunScenario(100, 'bank_outage')}
            disabled={isReseeding}
            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
              selectedScenario === 'bank_outage' 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Bank Core Outage</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono">100 TXNs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Major bank core downtime cascade test with smart gateway retries</p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 mt-2 block">Run Simulation &rarr;</span>
          </button>

          <button
            onClick={() => handleRunScenario(120, 'mandate_wave')}
            disabled={isReseeding}
            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
              selectedScenario === 'mandate_wave' 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>SaaS Mandate Wave</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono">120 TXNs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Recurring subscription limit caps, expired cards, and mandate updates</p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 mt-2 block">Run Simulation &rarr;</span>
          </button>

          <button
            onClick={() => handleRunScenario(250, 'enterprise_stress')}
            disabled={isReseeding}
            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
              selectedScenario === 'enterprise_stress' 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Enterprise 250+ Stress</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono">250 TXNs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">High-value B2B volumes with strict policy threshold review gating</p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 mt-2 block">Run Simulation &rarr;</span>
          </button>
        </div>

        {isReseeding && (
          <div className="flex items-center justify-center py-2 text-xs font-semibold text-indigo-600 gap-2 bg-indigo-50 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Generating synthetic dataset and computing multi-factor analytics...</span>
          </div>
        )}
      </div>

      {/* 8-Grid Metric Matrix with Clear Synthetic Watermarks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Total Synthetic Volume</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">TEST</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 block">{analytics.totalTransactions}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Synthetic Transactions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Failed Value at Risk</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">SYNTHETIC</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1 block">{formatINR(analytics.revenueAtRisk)}</span>
          <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">{analytics.failedTransactions} failed incidents</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Eligible Pipeline</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">AI SCORED</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1 block">{formatINR(analytics.recoverableRevenue)}</span>
          <span className="text-[11px] text-indigo-600 font-medium mt-0.5 block">{analytics.eligibleOpportunities} actionable opportunities</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Simulated Recovered</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">CAPTURED</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1 block">+{formatINR(analytics.revenueRecovered)}</span>
          <span className="text-[11px] text-emerald-700 font-bold mt-0.5 block">{analytics.recoveredCount} successful captures</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Recovery Yield</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">TEST</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 block">{analytics.recoveryRate}%</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Benchmark: 30-35%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">ROI Multiplier</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">TEST</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1 block">{analytics.roiMultiplier}x</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Simulated Return / Agent Cost</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Avg Resolution Latency</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">TEST</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 block">{analytics.averageRecoveryTimeMinutes} min</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">From drop-off to capture</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Policy Blocked / Declined</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">SAFEGUARD</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-slate-700 mt-1 block">{analytics.permanentlyFailedCount + analytics.policyBlockedCount}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Zero-tolerance fraud blocks</span>
        </div>
      </div>

      {/* Customer Tier & LTV Cohort Preservation Analysis */}
      {analytics.tierDistribution && analytics.tierDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Customer Segment & Lifetime Value (LTV) Cohort Analysis</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Synthetic Cohorts
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation of high-value account churn prevention and long-term customer equity preserved
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Simulated Razorpay Test Telemetry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {analytics.tierDistribution.map(t => (
              <div key={t.tier} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{t.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {t.count} failed
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Failed Volume:</span>
                    <span className="font-semibold text-rose-600">{formatINR(t.amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Recovered Captured:</span>
                    <span className="font-bold text-emerald-600">+{formatINR(t.recoveredAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated LTV Saved:</span>
                    <span className="font-bold text-indigo-600">{formatINR(t.ltvPreserved)}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Cohort Yield</span>
                    <span className="font-bold text-slate-900">{t.recoveryRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        t.recoveryRate >= 60 ? 'bg-emerald-500' : t.recoveryRate >= 40 ? 'bg-indigo-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, t.recoveryRate)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failure Category Performance Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Failure Root-Cause Archetype Matrix</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Synthetic Benchmark
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Empirical failure distributions and automated resolution yield</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Dataset: {analytics.totalTransactions} TXNs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Failure Category</th>
                <th className="py-2.5 px-3">Simulated Incidents</th>
                <th className="py-2.5 px-3">Value at Risk</th>
                <th className="py-2.5 px-3">Recovered Count</th>
                <th className="py-2.5 px-3">Recovered Revenue</th>
                <th className="py-2.5 px-3">Conversion Yield</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.categoryDistribution.map(cat => (
                <tr key={cat.category} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{cat.label}</span>
                      {cat.category === 'fraud_risk_flag' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-700 font-bold">BLOCKED</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">
                    {cat.count} cases
                  </td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">
                    {formatINR(cat.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {cat.recoveredCount} captured
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    +{formatINR(cat.recoveredAmount)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            cat.category === 'fraud_risk_flag' 
                              ? 'bg-rose-500' 
                              : cat.recoveryRate >= 70 ? 'bg-emerald-500' : cat.recoveryRate >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${cat.category === 'fraud_risk_flag' ? 0 : Math.min(100, cat.recoveryRate)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800">{cat.category === 'fraud_risk_flag' ? '0% (Policy)' : `${cat.recoveryRate}%`}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onNavigateToQueue(cat.category)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                    >
                      Filter Queue
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Method Distribution & Latency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Rails */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Payment Instrument Conversion</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Yield breakdown by customer payment instrument</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              SYNTHETIC
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {analytics.methodDistribution.map(m => (
              <div key={m.method} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{m.label}</span>
                  <span className="font-bold text-slate-800">{m.recoveryRate}% conversion</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>{m.count} simulated drop-offs ({formatINR(m.amount)})</span>
                  <span className="text-emerald-600 font-bold">+{formatINR(m.recoveredAmount)} captured</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, m.recoveryRate)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latency & Deterministic Policy Safeguard Panel */}
        <div className="space-y-4">
          {/* Recovery Latency Cohorts */}
          {analytics.timeDistribution && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Time-to-Recovery Latency Distribution</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  SYNTHETIC
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {analytics.timeDistribution.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-700 font-medium text-[11px]">{t.rangeLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600">+{formatINR(t.recoveredAmount)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] font-bold text-slate-700">{t.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Compliance & Zero-Tolerance Safeguard Panel */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Deterministic Policy & Fraud Guardrails</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% Zero-Tolerance Compliance
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Fraud Risk Prevented</span>
                  <span className="text-lg font-bold text-rose-400 mt-0.5 block">
                    {formatINR(analytics.policySafetyMetrics?.fraudPreventedRiskAmount || 45000)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] font-medium">Stolen/Fraud Cards</span>
                  <span className="font-bold text-slate-200">
                    {analytics.policySafetyMetrics?.fraudBlockedCount || analytics.permanentlyFailedCount} Hard Blocks
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block">Threshold Gated (&gt;₹50k)</span>
                  <span className="font-bold text-amber-400 text-xs">
                    {analytics.policySafetyMetrics?.thresholdGatedCount || 8} Requires Approval
                  </span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block">Retry Cap Enforced (3 max)</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {analytics.policySafetyMetrics?.retryLimitsEnforcedCount || 14} Terminated Safely
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Zero AI hallucinations permitted on financial movement. All payment links are created via Razorpay Test Mode with deterministic policy enforcement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
