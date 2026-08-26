import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react';
import { AssistantMetricsData } from '../../types.ts';

interface AssistantMetricsProps {
  data: AssistantMetricsData;
  onNavigateToQueue?: (filter?: string) => void;
}

export const AssistantMetrics: React.FC<AssistantMetricsProps> = ({ data, onNavigateToQueue }) => {
  const atRisk = data.revenueAtRisk || 0;
  const recoverable = data.recoverableRevenue || 0;
  const recovered = data.alreadyRecovered || 0;
  const pending = data.pendingApproval || 0;
  const recoveryRate = data.recoveryRate || (atRisk > 0 ? Math.round((recovered / atRisk) * 100) : 0);
  const roi = data.roiMultiplier || 12.4;

  return (
    <div className="space-y-3 pt-1">
      {/* Top Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* Revenue at Risk */}
        <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Revenue at Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1.5 text-lg font-bold text-slate-900 tracking-tight">
            ₹{(atRisk / 100000).toFixed(2)}L
          </div>
          <div className="mt-0.5 text-[10px] text-rose-600 font-medium flex items-center gap-1">
            <span>{data.totalTransactions || 102} failed txns</span>
          </div>
        </div>

        {/* Recoverable Revenue */}
        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700">Recoverable Now</span>
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1.5 text-lg font-bold text-indigo-900 tracking-tight">
            ₹{(recoverable / 100000).toFixed(2)}L
          </div>
          <div className="mt-0.5 text-[10px] text-indigo-600 font-medium">
            High AI Feasibility
          </div>
        </div>

        {/* Already Recovered */}
        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700">Recovered</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-lg font-bold text-emerald-900 tracking-tight">
            ₹{(recovered / 100000).toFixed(2)}L
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>{recoveryRate}% capture rate</span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700">Awaiting Review</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1.5 text-lg font-bold text-amber-900 tracking-tight">
            {pending}
          </div>
          <div className="mt-0.5 text-[10px] text-amber-600 font-medium">
            Requires 1-click sign-off
          </div>
        </div>

      </div>

      {/* ROI & Safety Highlights */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs">
        <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>RecoverIQ Engine Performance:</span>
          <span className="bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded text-[11px] font-bold">
            {roi}x ROI Multiplier
          </span>
        </div>

        {onNavigateToQueue && (
          <button
            onClick={() => onNavigateToQueue('approval_required')}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors underline cursor-pointer"
          >
            Review {pending} Pending Items →
          </button>
        )}
      </div>
    </div>
  );
};
