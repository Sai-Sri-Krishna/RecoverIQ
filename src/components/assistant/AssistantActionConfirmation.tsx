import React from 'react';
import { ShieldCheck, AlertTriangle, Send, X, Clock, HelpCircle, Check } from 'lucide-react';
import { AssistantActionConfirmationData } from '../../types.ts';

interface AssistantActionConfirmationProps {
  data: AssistantActionConfirmationData;
  onConfirm: (transactionId: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const AssistantActionConfirmation: React.FC<AssistantActionConfirmationProps> = ({
  data,
  onConfirm,
  onCancel,
  isProcessing
}) => {
  return (
    <div className="bg-white border-2 border-indigo-500/80 rounded-xl p-4 space-y-3.5 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Confirm Merchant Authorization
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Deterministic bounding parameters verified
            </span>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Sign-Off Required
        </span>
      </div>

      {/* Primary Key Data Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Customer</span>
          <span className="font-bold text-slate-900 text-xs truncate block">{data.customerName}</span>
          <span className="font-mono text-[10px] text-slate-400">{data.transactionId}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Amount</span>
          <span className="font-bold text-slate-900 text-sm">₹{data.amount.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-500 block">INR (Razorpay Test)</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 font-semibold block">Failure Cause</span>
          <span className="font-semibold text-rose-700 text-xs truncate block">{data.failureReason}</span>
          <span className="font-mono text-[10px] text-slate-400">Code: {data.failureCode}</span>
        </div>
      </div>

      {/* AI Recommendation & Probability */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
            <span>AI Recommendation:</span>
            <span className="text-indigo-700">{data.recommendedAction}</span>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-200/80 text-indigo-900 font-bold text-[10px]">
            {data.recoveryProbability}% Probability
          </span>
        </div>

        {data.whyRecommended && (
          <div className="text-[11px] text-slate-600 leading-relaxed italic">
            "{data.whyRecommended}"
          </div>
        )}
      </div>

      {/* Safety Safeguards Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-slate-700">
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Max retry budget: <strong>{data.maxAttempts || 2} attempts</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Stopping condition: <strong>{data.stoppingCondition || 'Stop upon payment capture'}</strong></span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        <button
          type="button"
          onClick={() => onConfirm(data.transactionId)}
          disabled={isProcessing}
          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isProcessing ? 'Executing via Razorpay...' : 'Approve Recovery Action'}</span>
        </button>
      </div>
    </div>
  );
};
