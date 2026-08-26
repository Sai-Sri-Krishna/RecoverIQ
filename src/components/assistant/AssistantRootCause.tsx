import React from 'react';
import { Activity, AlertCircle, CheckCircle, ArrowUpRight, HelpCircle } from 'lucide-react';
import { AssistantRootCauseData } from '../../types.ts';

interface AssistantRootCauseProps {
  data: AssistantRootCauseData;
  onNavigateToQueue?: (filter?: string) => void;
}

export const AssistantRootCause: React.FC<AssistantRootCauseProps> = ({
  data,
  onNavigateToQueue
}) => {
  const causes = data.causes || [];
  const totalAtRisk = data.totalRevenueAtRisk || 1;

  return (
    <div className="space-y-3 pt-1">
      {/* Header Summary */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          <span>Failure Category Decomposition</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Total At Risk: <strong className="text-slate-900">₹{(totalAtRisk / 100000).toFixed(2)}L</strong>
        </span>
      </div>

      {/* Visual Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {causes.slice(0, 4).map((cause, index) => {
          const isHigh = cause.recoveryLikelihood === 'HIGH';
          const isLow = cause.recoveryLikelihood === 'LOW' || cause.recoveryLikelihood === 'NONE';

          return (
            <div
              key={cause.category}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-slate-900 text-xs">
                    {index + 1}. {cause.label}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isHigh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    isLow ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {cause.recoveryLikelihood} Recovery
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {cause.description}
                </p>
              </div>

              {/* Amount and Progress Bar */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    ₹{(cause.amount / 100000).toFixed(2)}L
                  </span>
                  <span className="font-semibold text-slate-600 text-[11px]">
                    {cause.percentage}% of losses ({cause.count} txns)
                  </span>
                </div>

                {/* Progress Meter Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isHigh ? 'bg-indigo-600' : isLow ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(8, cause.percentage))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actionable Insight Box */}
      {data.keyInsight && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-2 text-slate-700">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <div className="font-bold text-slate-900">Key Diagnostic Insight:</div>
            <div className="text-slate-600 text-[11px] leading-relaxed">{data.keyInsight}</div>
          </div>
          {onNavigateToQueue && (
            <button
              onClick={() => onNavigateToQueue()}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline shrink-0 self-center"
            >
              Filter Queue →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
