import React, { useState, useEffect, useCallback } from 'react';
import { 
  AnalyticsSummary, 
  AuditEvent, 
  PolicyConfig, 
  Transaction,
  RazorpayStatus
} from './types.ts';
import { Header } from './components/Header.tsx';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import { RecoveryQueue } from './components/RecoveryQueue.tsx';
import { TransactionDetailModal } from './components/TransactionDetailModal.tsx';
import { AIAssistantView } from './components/AIAssistantView.tsx';
import { AuditTrailView } from './components/AuditTrailView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { PolicySandboxView } from './components/PolicySandboxView.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { formatINR } from './utils/formatters.ts';

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'assistant' | 'audit' | 'analytics' | 'policy'>('overview');
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig | null>(null);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayStatus | null>(null);
  
  // UI interaction states
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | undefined>(undefined);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: Toast['type'], title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch all core datasets
  const fetchData = useCallback(async () => {
    try {
      const [txnsRes, analyticsRes, auditRes, policyRes, rzpRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/analytics'),
        fetch('/api/audit-logs'),
        fetch('/api/policy'),
        fetch('/api/razorpay/status')
      ]);

      if (txnsRes.ok) {
        const data = await txnsRes.json();
        setTransactions(Array.isArray(data) ? data : data.transactions || []);
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.analytics || data);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(Array.isArray(data) ? data : data.auditLogs || []);
      }
      if (policyRes.ok) {
        const data = await policyRes.json();
        setPolicyConfig(data.policyConfig || data);
      }
      if (rzpRes.ok) {
        const data = await rzpRes.json();
        setRazorpayStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch initial datasets:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler: Reseed Dataset with Synthetic Records & Scenarios
  const handleReseedData = async (count: number = 125, scenario: string = 'balanced') => {
    setIsReseeding(true);
    try {
      const res = await fetch('/api/reseed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, scenario })
      });
      if (res.ok) {
        await fetchData();
        addToast('success', 'Synthetic Batch Generated', `Generated ${count} synthetic records under '${scenario}' simulation (Razorpay Test Mode).`);
      } else {
        throw new Error('Failed to reset dataset');
      }
    } catch (err: any) {
      addToast('error', 'Reset Failed', err.message);
    } finally {
      setIsReseeding(false);
    }
  };

  // Handler: Run Single AI Diagnosis
  const handleDiagnoseTransaction = async (id: string) => {
    setIsProcessingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/diagnose`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
        addToast('success', 'AI Diagnosis Ready', `Gemini completed root-cause analysis for ${id}.`);
      } else {
        throw new Error('Diagnosis call failed');
      }
    } catch (err: any) {
      addToast('error', 'Diagnosis Error', err.message);
    } finally {
      setIsProcessingId(undefined);
    }
  };

  // Handler: Run Batch AI Diagnosis
  const handleBatchDiagnose = async (ids?: string[]) => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/transactions/batch-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();
        addToast('success', 'Batch AI Diagnosis Completed', `Evaluated ${result.diagnosedCount} failed transactions.`);
      } else {
        throw new Error('Batch diagnosis failed');
      }
    } catch (err: any) {
      addToast('error', 'Batch Diagnosis Failed', err.message);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Handler: Single Transaction Approval & Razorpay Link Generation
  const handleApproveTransaction = async (id: string) => {
    setIsProcessingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantNotes: 'Approved by merchant admin from RecoverIQ console' })
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();
        addToast('success', 'Recovery Approved & Dispatched', `Issued Razorpay Link ${result.recoveryAction?.razorpayPaymentLinkId || ''}`);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Approval failed');
      }
    } catch (err: any) {
      addToast('error', 'Approval Blocked', err.message);
    } finally {
      setIsProcessingId(undefined);
    }
  };

  // Handler: Batch Approval
  const handleBatchApprove = async (ids?: string[]) => {
    setIsApproving(true);
    try {
      const res = await fetch('/api/transactions/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();
        addToast('success', 'Batch Approvals Executed', `Authorized & generated Razorpay links for ${result.approvedCount} cases.`);
      } else {
        throw new Error('Batch approve failed');
      }
    } catch (err: any) {
      addToast('error', 'Batch Approval Error', err.message);
    } finally {
      setIsApproving(false);
    }
  };

  // Handler: Single Payment Settlement Simulation
  const handleSimulatePayment = async (id: string) => {
    setIsProcessingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/simulate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'captured' })
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();
        addToast('success', 'Revenue Recovered!', `Captured ${formatINR(result.transaction.amount)} for ${result.transaction.customerName}`);
      } else {
        throw new Error('Payment simulation failed');
      }
    } catch (err: any) {
      addToast('error', 'Simulation Failed', err.message);
    } finally {
      setIsProcessingId(undefined);
    }
  };

  // Handler: Batch Settle Simulation
  const handleBatchSimulateRecover = async (ids?: string[]) => {
    setIsRecovering(true);
    try {
      const res = await fetch('/api/transactions/batch-recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();
        addToast('success', 'Batch Settlement Complete', `Successfully recovered ${result.recoveredCount} transactions.`);
      } else {
        throw new Error('Batch recover failed');
      }
    } catch (err: any) {
      addToast('error', 'Batch Recover Error', err.message);
    } finally {
      setIsRecovering(false);
    }
  };

  // Handler: Reject / Mark Permanently Failed
  const handleRejectTransaction = async (id: string, reason?: string) => {
    setIsProcessingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        await fetchData();
        addToast('info', 'Case Closed', `Marked ${id} as permanently unrecoverable.`);
      }
    } catch (err: any) {
      addToast('error', 'Reject Failed', err.message);
    } finally {
      setIsProcessingId(undefined);
    }
  };

  // Handler: Update Policy Config
  const handleUpdatePolicy = async (config: Partial<PolicyConfig>) => {
    setIsSavingPolicy(true);
    try {
      const res = await fetch('/api/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        setPolicyConfig(data.policyConfig);
        addToast('success', 'Policy Rules Updated', 'Deterministic bounding parameters refreshed.');
      }
    } catch (err: any) {
      addToast('error', 'Failed to Update Policy', err.message);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Handler: Simulate Webhook
  const handleSimulateWebhook = async (txnId: string, event: string) => {
    try {
      const txList = Array.isArray(transactions) ? transactions : [];
      const target = txList.find(t => t.id === txnId);
      const res = await fetch('/api/webhook/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          payload: {
            payment_link: {
              entity: {
                id: target?.recoveryAction?.razorpayPaymentLinkId || `plink_test_${txnId.replace(/[^a-zA-Z0-9]/g, '')}`,
                reference_id: txnId,
                amount: (target?.amount || 1000) * 100,
                status: event === 'payment_link.paid' ? 'paid' : 'expired'
              }
            }
          }
        })
      });
      if (res.ok) {
        await fetchData();
        addToast('success', 'Webhook Processed', `Dispatched and processed event: ${event}`);
      }
    } catch (err: any) {
      addToast('error', 'Webhook Error', err.message);
    }
  };

  // Helper for tab navigation from dashboard
  const handleNavigateToQueueWithFilter = (filter?: string) => {
    setQueueFilter(filter || 'all');
    setActiveTab('queue');
  };

  const selectedTransaction = (Array.isArray(transactions) ? transactions.find(t => t.id === selectedTxnId) : null) || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* Top Fixed Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        analytics={analytics}
        auditLogs={auditLogs}
        razorpayStatus={razorpayStatus}
        onSelectTransaction={(id) => setSelectedTxnId(id)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewDashboard
            analytics={analytics}
            recentTransactions={transactions}
            auditLogs={auditLogs}
            onSelectTransaction={(id) => setSelectedTxnId(id)}
            onNavigateToQueue={handleNavigateToQueueWithFilter}
            onNavigateToAssistant={(query) => {
              if (query) setAssistantInitialQuery(query);
              setActiveTab('assistant');
            }}
            onNavigateToAudit={() => setActiveTab('audit')}
            onBatchDiagnose={() => handleBatchDiagnose()}
            isDiagnosing={isDiagnosing}
          />
        )}

        {activeTab === 'queue' && (
          <RecoveryQueue
            transactions={transactions}
            onSelectTransaction={(id) => setSelectedTxnId(id)}
            onApproveTransaction={handleApproveTransaction}
            onSimulatePayment={handleSimulatePayment}
            onDiagnoseTransaction={handleDiagnoseTransaction}
            onBatchApprove={(ids) => handleBatchApprove(ids)}
            onBatchDiagnose={(ids) => handleBatchDiagnose(ids)}
            onBatchSimulateRecover={(ids) => handleBatchSimulateRecover(ids)}
            isProcessingId={isProcessingId}
            initialFilter={queueFilter}
          />
        )}

        {activeTab === 'assistant' && (
          <AIAssistantView
            onSelectTransaction={(id) => setSelectedTxnId(id)}
            onNavigateToQueue={handleNavigateToQueueWithFilter}
            onNavigateToAudit={() => setActiveTab('audit')}
            onNavigateToPolicy={() => setIsSettingsOpen(true)}
            onApproveTransaction={handleApproveTransaction}
            onRefreshData={fetchData}
            initialQuery={assistantInitialQuery}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView
            auditLogs={auditLogs}
            onSelectTransaction={(id) => setSelectedTxnId(id)}
            onRefresh={fetchData}
            isLoading={isLoadingLogs}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            analytics={analytics}
            transactions={transactions}
            onNavigateToQueue={handleNavigateToQueueWithFilter}
            onReseedData={handleReseedData}
            isReseeding={isReseeding}
          />
        )}

        {activeTab === 'policy' && (
          <PolicySandboxView
            policyConfig={policyConfig}
            onUpdatePolicy={handleUpdatePolicy}
            transactions={transactions}
            onSimulateWebhook={handleSimulateWebhook}
            onReseedData={handleReseedData}
            isSaving={isSavingPolicy}
            isReseeding={isReseeding}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        policyConfig={policyConfig}
        razorpayStatus={razorpayStatus}
        onUpdatePolicy={handleUpdatePolicy}
        transactions={transactions}
        onSimulateWebhook={handleSimulateWebhook}
        onReseedData={handleReseedData}
        isSaving={isSavingPolicy}
        isReseeding={isReseeding}
      />

      {/* High Density Status Footer */}
      <footer className="bg-white border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Autonomous Agent: ACTIVE</span>
          </div>
          <span className="text-slate-300">•</span>
          <span>Razorpay Test Sandbox Enabled</span>
          <span className="text-slate-300">•</span>
          <span>125 Synthetic Records</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Gemini 3.7 Flash Reasoning Engine</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-600">Deterministic Policy Bound: v2.4</span>
        </div>
      </footer>

      {/* Transaction Detail Modal */}
      {selectedTxnId && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTxnId(null)}
          onApprove={handleApproveTransaction}
          onReject={handleRejectTransaction}
          onSimulatePayment={handleSimulatePayment}
          onDiagnose={handleDiagnoseTransaction}
          isProcessing={isProcessingId === selectedTxnId}
        />
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl shadow-xl border flex items-start gap-3 transition-all animate-fadeIn ${
                isSuccess ? 'bg-slate-900 text-white border-emerald-500/50' :
                isError ? 'bg-slate-900 text-white border-rose-500/50' :
                isWarning ? 'bg-slate-900 text-white border-amber-500/50' :
                'bg-slate-900 text-white border-slate-700'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {isError && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

              <div className="flex-1 text-xs">
                <div className="font-bold">{toast.title}</div>
                <p className="text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
