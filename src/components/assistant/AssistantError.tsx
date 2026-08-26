import React from 'react';
import { AlertOctagon, ArrowRight, RotateCw } from 'lucide-react';
import { AssistantErrorData } from '../../types.ts';

interface AssistantErrorProps {
  data: AssistantErrorData;
  onNavigateToAudit?: () => void;
  onRetry?: () => void;
}

export const AssistantError: React.FC<AssistantErrorProps> = ({
  data,
  onNavigateToAudit,
  onRetry
}) => {
  return (
    <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <AlertOctagon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-rose-950">
            {data.title || 'Recovery Operation Interrupted'}
          </h4>
          <p className="text-xs text-rose-900 mt-0.5 leading-relaxed">
            {data.reason}
          </p>
        </div>
      </div>

      <div className="p-2.5 bg-white/80 rounded-lg border border-rose-100 text-xs text-slate-700">
        <span className="font-bold text-slate-900 block text-[11px] mb-0.5">Safety Fallback Triggered:</span>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          {data.actionTaken || 'No additional retry initiated. The transaction remains preserved in queue for merchant review.'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-0.5 text-xs">
        {data.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <RotateCw className="w-3 h-3" />
            <span>Retry Operation</span>
          </button>
        )}

        {onNavigateToAudit && (
          <button
            onClick={onNavigateToAudit}
            className="text-[11px] font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 transition-colors ml-auto"
          >
            <span>Check Telemetry Audit Trail</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
