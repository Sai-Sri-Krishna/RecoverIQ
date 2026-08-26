import React from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { AssistantRecoveryResultData } from '../../types.ts';

interface AssistantRecoveryResultProps {
  data: AssistantRecoveryResultData;
  onNavigateToAudit?: () => void;
  onSelectTransaction?: (id: string) => void;
}

export const AssistantRecoveryResult: React.FC<AssistantRecoveryResultProps> = ({
  data,
  onNavigateToAudit,
  onSelectTransaction
}) => {
  return (
    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950">Recovery Action Dispatched Successfully</h4>
            <span className="text-[10px] text-emerald-700 font-medium">
              Razorpay API execution acknowledged • Webhook listening active
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-900">
            ₹{data.recoveredAmount.toLocaleString('en-IN')}
          </span>
          <div className="text-[10px] text-emerald-700">Amount Secured</div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/70 p-2.5 rounded-lg border border-emerald-100">
        <div>
          <span className="text-[10px] text-slate-500 block">Customer</span>
          <span className="font-bold text-slate-800 text-xs truncate block">{data.customerName}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block">Transaction</span>
          <span className="font-mono text-xs text-slate-800 truncate block">{data.transactionId}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block">Action Executed</span>
          <span className="font-medium text-slate-800 text-xs truncate block">{data.actionTaken}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block">Response Time</span>
          <span className="font-medium text-slate-800 text-xs">{data.durationLabel || '1.8s'}</span>
        </div>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        {data.razorpayPaymentLinkId && (
          <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
            Link ID: {data.razorpayPaymentLinkId}
          </span>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {onSelectTransaction && (
            <button
              onClick={() => onSelectTransaction(data.transactionId)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline transition-colors"
            >
              View In Sandbox
            </button>
          )}

          {onNavigateToAudit && (
            <button
              onClick={onNavigateToAudit}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors"
            >
              <span>View Audit Trail</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
