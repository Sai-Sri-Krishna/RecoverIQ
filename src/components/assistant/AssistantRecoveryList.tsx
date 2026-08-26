import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Shield, Eye, Send } from 'lucide-react';
import { AssistantRecoveryOpportunitiesData, AssistantRecoveryOpportunityItem } from '../../types.ts';

interface AssistantRecoveryListProps {
  data: AssistantRecoveryOpportunitiesData;
  onSelectTransaction: (id: string) => void;
  onApproveOpportunity: (item: AssistantRecoveryOpportunityItem) => void;
  isProcessingId?: string | null;
}

export const AssistantRecoveryList: React.FC<AssistantRecoveryListProps> = ({
  data,
  onSelectTransaction,
  onApproveOpportunity,
  isProcessingId
}) => {
  const opportunities = data.opportunities || [];
  const totalAmount = data.totalOpportunityAmount || opportunities.reduce((acc, curr) => acc + curr.amount, 0);

  if (opportunities.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
        No active high-priority recovery opportunities found. All high-risk transactions are either settled or under review.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Top Recovery Candidates</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
            {opportunities.length} Items
          </span>
        </div>
        <div className="text-[11px] font-semibold text-slate-500">
          Total Opportunity: <span className="font-bold text-slate-900">₹{(totalAmount / 100000).toFixed(2)}L</span>
        </div>
      </div>

      {/* List of compact opportunity cards */}
      <div className="grid grid-cols-1 gap-2">
        {opportunities.map((item) => {
          const isProcessing = isProcessingId === item.transactionId;
          const probColor = 
            item.recoveryProbability >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
            item.recoveryProbability >= 65 ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
            'text-amber-700 bg-amber-50 border-amber-200';

          return (
            <div
              key={item.transactionId}
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Left Column: Customer, Amount, Details */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {item.customerName}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {item.transactionId}
                  </span>
                  {item.customerTier && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.customerTier}
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-900 sm:hidden ml-auto">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 border border-rose-200 text-rose-700">
                    {item.failureReason}
                  </span>

                  <span className="text-slate-400">•</span>

                  <span className="text-slate-600 text-[11px] font-medium truncate max-w-[200px]">
                    {item.recommendedActionLabel}
                  </span>
                </div>
              </div>

              {/* Right Column: Amount, Probability badge, Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-900">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.paymentMethod || 'Card / UPI'}
                  </div>
                </div>

                <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${probColor}`}>
                  <span>{item.recoveryProbability}%</span>
                  <span className="text-[10px] font-normal opacity-80">prob</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectTransaction(item.transactionId)}
                    title="Review full transaction telemetry"
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Review</span>
                  </button>

                  <button
                    onClick={() => onApproveOpportunity(item)}
                    disabled={isProcessing}
                    title="Approve recovery action"
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
