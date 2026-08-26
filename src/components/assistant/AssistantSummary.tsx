import React from 'react';
import { Bot, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { AssistantSummaryData } from '../../types.ts';

interface AssistantSummaryProps {
  data: AssistantSummaryData;
  onNavigateToQueue?: (filter?: string) => void;
  onQuickAction?: (actionType: string) => void;
}

export const AssistantSummary: React.FC<AssistantSummaryProps> = ({
  data,
  onNavigateToQueue,
  onQuickAction
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 space-y-3">
      {/* Headline */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
          {data.headline || 'Payment Operations Executive Summary'}
        </h4>
      </div>

      {/* Metric Mini-Pills */}
      {data.metricsSnapshot && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-500 block">At Risk</span>
            <span className="font-bold text-slate-900 text-xs">
              ₹{((data.metricsSnapshot.revenueAtRisk || 0) / 100000).toFixed(2)}L
            </span>
          </div>

          <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
            <span className="text-[10px] text-indigo-700 block">Recoverable</span>
            <span className="font-bold text-indigo-950 text-xs">
              ₹{((data.metricsSnapshot.recoverableRevenue || 0) / 100000).toFixed(2)}L
            </span>
          </div>

          <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100">
            <span className="text-[10px] text-amber-700 block">Awaiting Review</span>
            <span className="font-bold text-amber-950 text-xs">
              {data.metricsSnapshot.pendingApproval || 0}
            </span>
          </div>
        </div>
      )}

      {/* Key Takeaways */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          {data.keyPoints.map((pt, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
              <span className="leading-relaxed">{pt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next Actions */}
      {data.recommendedNextActions && data.recommendedNextActions.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
          {data.recommendedNextActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (action.filter && onNavigateToQueue) {
                  onNavigateToQueue(action.filter);
                } else if (onQuickAction) {
                  onQuickAction(action.actionType);
                }
              }}
              className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>{action.label}</span>
              <ArrowRight className="w-3 h-3 text-indigo-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
