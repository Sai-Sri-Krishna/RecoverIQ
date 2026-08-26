import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import { AssistantPolicyWarningData } from '../../types.ts';

interface AssistantPolicyWarningProps {
  data: AssistantPolicyWarningData;
  onSelectTransaction?: (id: string) => void;
  onNavigateToPolicy?: () => void;
}

export const AssistantPolicyWarning: React.FC<AssistantPolicyWarningProps> = ({
  data,
  onSelectTransaction,
  onNavigateToPolicy
}) => {
  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <span>Deterministic Policy Safeguard Enforced</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900">
              Gated Action
            </span>
          </h4>
          <p className="text-xs text-amber-900 mt-1 leading-relaxed">
            {data.reason}
          </p>
        </div>
      </div>

      {/* Numerical and Requirement Bounds */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/80 p-2.5 rounded-lg border border-amber-100">
        {data.amount !== undefined && (
          <div>
            <span className="text-[10px] text-slate-500 block">Transaction Value</span>
            <span className="font-bold text-slate-800 text-xs">₹{data.amount.toLocaleString('en-IN')}</span>
          </div>
        )}

        {data.policyLimit !== undefined && (
          <div>
            <span className="text-[10px] text-slate-500 block">Policy Threshold</span>
            <span className="font-bold text-slate-800 text-xs">₹{data.policyLimit.toLocaleString('en-IN')}</span>
          </div>
        )}

        <div>
          <span className="text-[10px] text-slate-500 block">Requirement</span>
          <span className="font-semibold text-amber-900 text-xs truncate block">{data.requiredAction}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        {onNavigateToPolicy && (
          <button
            onClick={onNavigateToPolicy}
            className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>Policy Sandbox</span>
          </button>
        )}

        {data.transactionId && onSelectTransaction && (
          <button
            onClick={() => onSelectTransaction(data.transactionId!)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors ml-auto"
          >
            <span>Review Transaction</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
