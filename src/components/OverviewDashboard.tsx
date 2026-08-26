import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Bot, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Search,
  Activity
} from 'lucide-react';
import { AnalyticsSummary, Transaction, AuditEvent } from '../types.ts';
import { formatINR, formatTimeAgo, getCategoryLabel, getStatusBadgeStyle } from '../utils/formatters.ts';
import { MetricCardSkeleton, ChartSkeleton } from './CommonUI.tsx';

interface OverviewDashboardProps {
  analytics: AnalyticsSummary | null;
  recentTransactions: Transaction[];
  auditLogs: AuditEvent[];
  onSelectTransaction: (id: string) => void;
  onNavigateToQueue: (filter?: string) => void;
  onNavigateToAssistant: (initialQuery?: string) => void;
  onNavigateToAudit: () => void;
  onBatchDiagnose: () => void;
  isDiagnosing: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  analytics,
  recentTransactions,
  auditLogs,
  onSelectTransaction,
  onNavigateToQueue,
  onNavigateToAssistant,
  onNavigateToAudit,
  onBatchDiagnose,
  isDiagnosing
}) => {
  const [askQuery, setAskQuery] = useState('');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <div><MetricCardSkeleton /></div>
        </div>
      </div>
    );
  }

  const txList = Array.isArray(recentTransactions) ? recentTransactions : [];
  const trendData = Array.isArray(analytics.trendData) ? analytics.trendData : [];
  const logsList = Array.isArray(auditLogs) ? auditLogs : [];

  // Top 3 Priority Recovery Opportunities
  const priorityOpportunities = [...txList]
    .filter(t => t.status === 'approval_required' || t.status === 'diagnosed')
    .sort((a, b) => {
      const scoreA = (a.aiDiagnosis?.recoveryScore || 0) * (a.amount || 0);
      const scoreB = (b.aiDiagnosis?.recoveryScore || 0) * (b.amount || 0);
      return scoreB - scoreA;
    })
    .slice(0, 3);

  // Latest 4-5 Activity Events
  const recentActivities = logsList.slice(0, 5);

  const handleAskSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (askQuery.trim()) {
      onNavigateToAssistant(askQuery.trim());
    } else {
      onNavigateToAssistant();
    }
  };

  // SVG Chart calculation for Trend (Revenue at Risk vs Revenue Recovered)
  const maxVal = Math.max(...trendData.map(d => Math.max(d.failedAmount, d.recoveredAmount)), 10000);
  const chartHeight = 180;
  const chartWidth = 580;
  const paddingX = 40;
  const paddingY = 24;

  const pointsRisk = trendData.length > 1 ? trendData.map((d, i) => {
    const x = paddingX + (i / (trendData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.failedAmount / (maxVal || 1)) * (chartHeight - paddingY * 2);
    return `${x},${y}`;
  }).join(' ') : '';

  const pointsRecovered = trendData.length > 1 ? trendData.map((d, i) => {
    const x = paddingX + (i / (trendData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.recoveredAmount / (maxVal || 1)) * (chartHeight - paddingY * 2);
    return `${x},${y}`;
  }).join(' ') : '';

  return (
    <div className="space-y-7 pb-10">
      
      {/* 1. Top Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Good morning, Merchant
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Revenue Recovery Overview
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Monitor revenue at risk, recovery opportunities, and money recovered.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBatchDiagnose}
            disabled={isDiagnosing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? 'Analyzing Pipeline...' : 'Run AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* 2. Four Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Revenue at Risk */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Revenue at Risk</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              {formatINR(analytics.revenueAtRisk)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-rose-600 font-medium">
            <span>{analytics.failedTransactions} failed transactions</span>
          </div>
        </div>

        {/* Metric 2: Recoverable Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Recoverable Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight mt-3">
              {formatINR(analytics.recoverableRevenue)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-indigo-600 font-medium">
            <span>89% AI recovery feasibility</span>
          </div>
        </div>

        {/* Metric 3: Revenue Recovered */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Revenue Recovered</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight mt-3">
              {formatINR(analytics.revenueRecovered)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-emerald-600 font-medium">
            <span>+{analytics.recoveryRate}% capture rate</span>
          </div>
        </div>

        {/* Metric 4: Pending Approval */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pending Approval</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              {analytics.pendingApprovalCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Requires 1-click sign-off</span>
            <button 
              onClick={() => onNavigateToQueue('approval_required')}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Review
            </button>
          </div>
        </div>

      </div>

      {/* 3. Main Analytics Section: Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left: Revenue Recovery Trend (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Revenue Recovery Trend</h3>
              <p className="text-slate-500 text-xs mt-0.5">Failed revenue at risk vs successful AI recoveries over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Revenue at Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Revenue Recovered</span>
              </div>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full overflow-hidden">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-44 sm:h-52 overflow-visible"
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingY + ratio * (chartHeight - paddingY * 2);
                const val = maxVal * (1 - ratio);
                return (
                  <g key={idx}>
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={chartWidth - paddingX} 
                      y2={y} 
                      stroke="#F1F5F9" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={paddingX - 6} 
                      y={y + 3} 
                      textAnchor="end" 
                      className="text-[9px] fill-slate-400 font-mono font-medium"
                    >
                      {formatINR(val).replace('.00', '')}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill under Recovered */}
              {trendData.length > 1 && (
                <polygon
                  points={`${paddingX},${chartHeight - paddingY} ${pointsRecovered} ${chartWidth - paddingX},${chartHeight - paddingY}`}
                  fill="rgba(16, 185, 129, 0.08)"
                />
              )}

              {/* Line 1: Revenue at Risk */}
              {pointsRisk && (
                <polyline
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsRisk}
                />
              )}

              {/* Line 2: Revenue Recovered */}
              {pointsRecovered && (
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsRecovered}
                />
              )}

              {/* Interactive Data Points */}
              {trendData.map((d, i) => {
                const x = paddingX + (i / (trendData.length - 1)) * (chartWidth - paddingX * 2);
                const yRisk = chartHeight - paddingY - (d.failedAmount / (maxVal || 1)) * (chartHeight - paddingY * 2);
                const yRec = chartHeight - paddingY - (d.recoveredAmount / (maxVal || 1)) * (chartHeight - paddingY * 2);
                const isHovered = hoveredPointIdx === i;

                return (
                  <g 
                    key={i} 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIdx(i)}
                    onMouseLeave={() => setHoveredPointIdx(null)}
                  >
                    {/* Hover guide line */}
                    {isHovered && (
                      <line 
                        x1={x} 
                        y1={paddingY} 
                        x2={x} 
                        y2={chartHeight - paddingY} 
                        stroke="#CBD5E1" 
                        strokeDasharray="3,3" 
                        strokeWidth="1" 
                      />
                    )}

                    <circle 
                      cx={x} 
                      cy={yRisk} 
                      r={isHovered ? 4.5 : 3} 
                      fill="#F43F5E" 
                      className="transition-all"
                    />
                    <circle 
                      cx={x} 
                      cy={yRec} 
                      r={isHovered ? 4.5 : 3} 
                      fill="#10B981" 
                      className="transition-all"
                    />

                    {/* Date label at bottom */}
                    <text 
                      x={x} 
                      y={chartHeight - 4} 
                      textAnchor="middle" 
                      className="text-[10px] fill-slate-400 font-medium"
                    >
                      {d.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPointIdx !== null && trendData[hoveredPointIdx] && (
              <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-lg space-y-1 animate-fadeIn pointer-events-none">
                <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
                  Date: {trendData[hoveredPointIdx].date}
                </div>
                <div className="flex justify-between gap-3 text-rose-300">
                  <span>At Risk:</span>
                  <span className="font-mono font-bold">{formatINR(trendData[hoveredPointIdx].failedAmount)}</span>
                </div>
                <div className="flex justify-between gap-3 text-emerald-300">
                  <span>Recovered:</span>
                  <span className="font-mono font-bold">{formatINR(trendData[hoveredPointIdx].recoveredAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Recovery Health */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">AI Recovery Health</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ACTIVE
              </span>
            </div>

            <div className="space-y-4">
              {/* Metric Row 1: Opportunity Score */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Recovery Opportunity Score</span>
                  <span className="text-indigo-600 font-bold">91%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '91%' }} />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">High recoverable potential in active backlog</span>
              </div>

              {/* Metric Row 2: Success Rate */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Recovery Success Rate</span>
                  <span className="text-emerald-600 font-bold">{analytics.recoveryRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics.recoveryRate}%` }} />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">{analytics.recoveredCount} of {analytics.totalTransactions} transactions successfully salvaged</span>
              </div>

              {/* Metric Row 3: Pending Actions */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Pending Actions</div>
                  <div className="text-[11px] text-slate-500">{analytics.pendingApprovalCount} awaiting merchant sign-off</div>
                </div>
                <button
                  onClick={() => onNavigateToQueue('approval_required')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Review
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Autonomous ROI Multiplier</span>
            <span className="font-extrabold text-slate-900 text-sm">{analytics.roiMultiplier}x ROI</span>
          </div>
        </div>

      </div>

      {/* 4. Priority Recovery Opportunities (Top 3) & Recent Recovery Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Priority Recovery Opportunities (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Priority Recovery Opportunities</h3>
              <p className="text-slate-500 text-xs mt-0.5">Top high-value failed payments ready for 1-click recovery</p>
            </div>
            <button
              onClick={() => onNavigateToQueue('approval_required')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {priorityOpportunities.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs">
                No high-priority recovery items pending review.
              </div>
            ) : (
              priorityOpportunities.map((txn) => {
                const badgeStyle = getStatusBadgeStyle(txn.status);
                const score = txn.aiDiagnosis?.recoveryScore || 85;

                return (
                  <div
                    key={txn.id}
                    className="p-4 rounded-xl border border-slate-200/90 hover:border-indigo-300 bg-white hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {txn.customerName}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {formatINR(txn.amount)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                          {txn.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="text-rose-600 font-medium">{txn.failureReason}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">{score}% recovery probability</span>
                        <span>•</span>
                        <span className="text-slate-600">{txn.aiDiagnosis?.recommendedStrategy || 'Instant Payment Link'}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => onSelectTransaction(txn.id)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateToQueue()}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>View All Recovery Opportunities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Recovery Activity (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Recent Recovery Activity</h3>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No recent recovery activity logged.
                </div>
              ) : (
                recentActivities.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isWarning = log.status === 'warning' || log.status === 'error';

                  return (
                    <div 
                      key={log.id}
                      onClick={() => {
                        if (log.transactionId) onSelectTransaction(log.transactionId);
                      }}
                      className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors cursor-pointer flex items-start gap-2.5"
                    >
                      <div className="mt-0.5 shrink-0">
                        {isSuccess ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        ) : isWarning ? (
                          <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Clock className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate">{log.eventTitle}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{formatTimeAgo(log.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{log.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={onNavigateToAudit}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 5. Clean AI Assistant Entry Point */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-indigo-500/20">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Ask RecoverIQ Copilot</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-3">
            Ask about revenue leaks, drop-off root causes, or recovery decisions.
          </h2>

          <form onSubmit={handleAskSubmit} className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder="Ask about revenue, failed payments or recovery..."
              className="w-full pl-11 pr-28 py-3 bg-white/10 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Ask AI
            </button>
          </form>

          {/* Quick suggestions chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-300">
            <span className="text-slate-400 text-[11px]">Suggestions:</span>
            <button
              onClick={() => onNavigateToAssistant("Where did we lose the most revenue this week?")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] transition-colors cursor-pointer"
            >
              "Where did we lose the most revenue?"
            </button>
            <button
              onClick={() => onNavigateToAssistant("Show me top high-value recovery opportunities")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] transition-colors cursor-pointer"
            >
              "Show top recovery opportunities"
            </button>
            <button
              onClick={() => onNavigateToAssistant("Why did UPI payments fail most often?")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] transition-colors cursor-pointer"
            >
              "Why did UPI payments fail?"
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
