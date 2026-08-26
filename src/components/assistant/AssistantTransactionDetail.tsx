import React from 'react';
import { ShieldCheck, ArrowRight, User, AlertTriangle, CheckCircle2, Clock, Zap, CreditCard } from 'lucide-react';
import { AssistantTransactionDetailData } from '../../types.ts';

interface AssistantTransactionDetailProps {
  data: AssistantTransactionDetailData;
  onSelectTransaction: (id: string) => void;
  onApproveRecovery: (transactionId: string) => void;
  isProcessingId?: string | null;
}

export const AssistantTransactionDetail: React.FC<AssistantTransactionDetailProps> = ({
  data,
  onSelectTransaction,
  onApproveRecovery,
  isProcessingId
}) => {
  const txn = data.transaction;
  const diag = data.aiDiagnosis || txn.aiDiagnosis;
  const policy = data.policyCheck || txn.policyCheck;
  const isProcessing = isProcessingId === txn.id;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 space-y-3">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{txn.customerName}</span>
            <span className="font-mono text-xs text-slate-500">{txn.id}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {txn.customerTier} Tier (LTV ₹{txn.customerLtv.toLocaleString('en-IN')})
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {txn.customerEmail} • {txn.paymentMethod.toUpperCase()} ({txn.bankName || txn.cardNetwork || 'Primary Gateway'})
          </div>
        </div>

        <div className="text-right">
          <div className="text-base font-bold text-slate-900">
            ₹{txn.amount.toLocaleString('en-IN')}
          </div>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
            txn.status === 'recovered' ? 'bg-emerald-100 text-emerald-800' :
            txn.status === 'in_recovery' ? 'bg-indigo-100 text-indigo-800' :
            'bg-amber-100 text-amber-800'
          }`}>
            {txn.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Failure & Diagnostic Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-lg space-y-1">
          <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Failure Signature</span>
          </div>
          <div className="font-semibold text-rose-950">{txn.failureReason}</div>
          <div className="text-[10px] text-rose-700 font-mono">Code: {txn.failureCode}</div>
        </div>

        <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-1">
          <div className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-600" />
            <span>AI Recommended Action ({diag?.confidence || txn.recoveryScore}% prob)</span>
          </div>
          <div className="font-semibold text-indigo-950">{diag?.recommendedActionLabel || 'Razorpay 1-Click Link'}</div>
          <div className="text-[10px] text-indigo-700">{diag?.stoppingCondition || 'Max 2 attempts; stop upon settlement.'}</div>
        </div>
      </div>

      {/* AI Explanation Quote */}
      {diag?.explanation && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
          <span className="font-bold text-slate-900 block mb-0.5">Gemini Reasoning:</span>
          <p className="text-[11px] leading-relaxed text-slate-600 italic">
            "{diag.explanation}"
          </p>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          onClick={() => onSelectTransaction(txn.id)}
          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors underline"
        >
          <span>Open Full 5-Step Lifecycle Modal</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {txn.status !== 'recovered' && (
          <button
            onClick={() => onApproveRecovery(txn.id)}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Executing...' : 'Approve Recovery Action'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
