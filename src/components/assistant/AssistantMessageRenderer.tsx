import React from 'react';
import { AssistantMessage, AssistantRecoveryOpportunityItem } from '../../types.ts';
import { AssistantMetrics } from './AssistantMetrics.tsx';
import { AssistantRecoveryList } from './AssistantRecoveryList.tsx';
import { AssistantRootCause } from './AssistantRootCause.tsx';
import { AssistantTransactionDetail } from './AssistantTransactionDetail.tsx';
import { AssistantRecoveryResult } from './AssistantRecoveryResult.tsx';
import { AssistantPolicyWarning } from './AssistantPolicyWarning.tsx';
import { AssistantError } from './AssistantError.tsx';
import { AssistantActionConfirmation } from './AssistantActionConfirmation.tsx';
import { AssistantSummary } from './AssistantSummary.tsx';

interface AssistantMessageRendererProps {
  message: AssistantMessage;
  onSelectTransaction: (id: string) => void;
  onNavigateToQueue: (filter?: string) => void;
  onNavigateToAudit?: () => void;
  onNavigateToPolicy?: () => void;
  onApproveOpportunity: (item: AssistantRecoveryOpportunityItem) => void;
  onConfirmAction: (transactionId: string) => void;
  onCancelAction: () => void;
  onQuickAction: (actionType: string) => void;
  isProcessingId?: string | null;
}

export const AssistantMessageRenderer: React.FC<AssistantMessageRendererProps> = ({
  message,
  onSelectTransaction,
  onNavigateToQueue,
  onNavigateToAudit,
  onNavigateToPolicy,
  onApproveOpportunity,
  onConfirmAction,
  onCancelAction,
  onQuickAction,
  isProcessingId
}) => {
  const structured = message.structuredResponse;

  if (!structured) {
    return (
      <div className="space-y-1.5 whitespace-pre-wrap text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
        {message.content}
      </div>
    );
  }

  const { responseType, message: conversationalExplanation, data } = structured;

  return (
    <div className="space-y-2.5 w-full">
      {/* Conversational Explanation */}
      {conversationalExplanation && (
        <div className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
          {conversationalExplanation}
        </div>
      )}

      {/* Structured Payload Renderer */}
      {responseType === 'METRICS' && (
        <AssistantMetrics 
          data={data} 
          onNavigateToQueue={onNavigateToQueue} 
        />
      )}

      {responseType === 'RECOVERY_OPPORTUNITIES' && (
        <AssistantRecoveryList
          data={data}
          onSelectTransaction={onSelectTransaction}
          onApproveOpportunity={onApproveOpportunity}
          isProcessingId={isProcessingId}
        />
      )}

      {responseType === 'ROOT_CAUSE_ANALYSIS' && (
        <AssistantRootCause
          data={data}
          onNavigateToQueue={onNavigateToQueue}
        />
      )}

      {responseType === 'TRANSACTION_DETAIL' && (
        <AssistantTransactionDetail
          data={data}
          onSelectTransaction={onSelectTransaction}
          onApproveRecovery={onConfirmAction}
          isProcessingId={isProcessingId}
        />
      )}

      {responseType === 'RECOVERY_RESULT' && (
        <AssistantRecoveryResult
          data={data}
          onNavigateToAudit={onNavigateToAudit}
          onSelectTransaction={onSelectTransaction}
        />
      )}

      {responseType === 'POLICY_WARNING' && (
        <AssistantPolicyWarning
          data={data}
          onSelectTransaction={onSelectTransaction}
          onNavigateToPolicy={onNavigateToPolicy}
        />
      )}

      {responseType === 'ERROR' && (
        <AssistantError
          data={data}
          onNavigateToAudit={onNavigateToAudit}
          onRetry={() => onQuickAction('show_opportunities')}
        />
      )}

      {responseType === 'ACTION_CONFIRMATION' && (
        <AssistantActionConfirmation
          data={data}
          onConfirm={onConfirmAction}
          onCancel={onCancelAction}
          isProcessing={isProcessingId === data.transactionId}
        />
      )}

      {responseType === 'SUMMARY' && (
        <AssistantSummary
          data={data}
          onNavigateToQueue={onNavigateToQueue}
          onQuickAction={onQuickAction}
        />
      )}
    </div>
  );
};
