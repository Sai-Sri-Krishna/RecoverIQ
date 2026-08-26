import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Play, 
  Ban, 
  RotateCw,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  QrCode,
  Smartphone,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Transaction } from '../types.ts';
import { formatINR, formatDate, formatTimeAgo, getCategoryLabel, getPaymentMethodLabel, getStatusBadgeStyle, getTierBadge } from '../utils/formatters.ts';
import { CopyableBadge } from './CommonUI.tsx';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onSimulatePayment: (id: string) => void;
  onDiagnose: (id: string) => void;
  isProcessing: boolean;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onApprove,
  onReject,
  onSimulatePayment,
  onDiagnose,
  isProcessing
}) => {
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [activeSandboxTab, setActiveSandboxTab] = useState<'upi' | 'card'>('upi');

  if (!transaction) return null;

  const statusBadge = getStatusBadgeStyle(transaction.status);
  const tierStyle = getTierBadge(transaction.customerTier);
  const diag = transaction.aiDiagnosis;
  const policy = transaction.policyCheck;
  const recoveryAction = transaction.recoveryAction;

  const handleCopyCustomerMessage = () => {
    if (diag?.customerMessageDraft) {
      navigator.clipboard.writeText(diag.customerMessageDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (recoveryAction?.razorpayPaymentLinkUrl) {
      navigator.clipboard.writeText(recoveryAction.razorpayPaymentLinkUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Determine stage in lifecycle
  const currentStep = 
    transaction.status === 'recovered' ? 5 :
    transaction.status === 'in_recovery' ? 4 :
    transaction.status === 'approval_required' ? 3 :
    transaction.status === 'ai_analyzed' ? 2 :
    transaction.status === 'policy_blocked' || transaction.status === 'permanently_failed' ? 3 : 1;

  const steps = [
    { num: 1, title: 'Failure Caught', desc: 'Gateway drop-off detected' },
    { num: 2, title: 'AI Diagnosis', desc: 'Gemini root cause & score' },
    { num: 3, title: 'Policy Check', desc: 'Deterministic safe bounding' },
    { num: 4, title: 'Razorpay Link', desc: 'Dispatched in Test Mode' },
    { num: 5, title: 'Revenue Settled', desc: 'Captured & ROI preserved' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-white font-bold">{transaction.id}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-xs text-slate-400">{transaction.orderId}</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                  <span>{statusBadge.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Drop-off occurred {formatTimeAgo(transaction.timestamp)} ({formatDate(transaction.timestamp)})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step-by-Step Lifecycle Visual Progress Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white">
          <div className="grid grid-cols-5 gap-1 text-center">
            {steps.map((step) => {
              const isCompleted = step.num < currentStep || (step.num === 5 && transaction.status === 'recovered');
              const isCurrent = step.num === currentStep && transaction.status !== 'recovered';
              const isFailed = (step.num === 3 && (transaction.status === 'policy_blocked' || transaction.status === 'permanently_failed'));

              return (
                <div key={step.num} className="flex flex-col items-center">
                  <div className="flex items-center w-full">
                    <div className={`h-0.5 w-full ${step.num === 1 ? 'invisible' : isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isFailed ? 'bg-rose-500 text-white ring-4 ring-rose-500/20' :
                      isCompleted ? 'bg-emerald-500 text-white' :
                      isCurrent ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20' :
                      'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3" /> : step.num}
                    </div>
                    <div className={`h-0.5 w-full ${step.num === 5 ? 'invisible' : isCompleted ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  </div>
                  <span className={`text-[10px] font-bold mt-1.5 truncate max-w-full ${
                    isFailed ? 'text-rose-400' :
                    isCurrent ? 'text-indigo-300' : 
                    isCompleted ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

          {/* Top Grid: Customer & Transaction Basics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Customer Profile Card */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Profile</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tierStyle.bg} ${tierStyle.text}`}>
                  {transaction.customerTier} Tier
                </span>
              </div>

              <div className="font-bold text-slate-900 text-sm">{transaction.customerName}</div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Email</span>
                  <span className="font-semibold text-slate-800 truncate block">{transaction.customerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Phone (WhatsApp)</span>
                  <span className="font-semibold text-slate-800">+91 {transaction.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Preserved LTV</span>
                  <span className="font-bold text-emerald-700">{formatINR(transaction.customerLtv)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Customer ID</span>
                  <CopyableBadge text={transaction.customerId} className="text-slate-700 text-xs" />
                </div>
              </div>
            </div>

            {/* Transaction & Failure Details Card */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transaction Breakdown</span>
                <span className="font-extrabold text-slate-900 text-lg">{formatINR(transaction.amount)}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Payment Rail:</span>
                  <span className="font-semibold text-slate-800">
                    {getPaymentMethodLabel(transaction.paymentMethod)} ({transaction.bankName || transaction.cardNetwork || 'Standard'})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Failure Root Cause:</span>
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                    {getCategoryLabel(transaction.failureCategory)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Gateway Code:</span>
                  <span className="font-mono text-rose-600 font-bold">{transaction.failureCode}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 text-xs text-rose-950 font-medium">
                {transaction.failureReason}
              </div>
            </div>
          </div>

          {/* AI Diagnosis & Recommendation Section (Gemini Powered) */}
          <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Gemini AI Diagnostic & Recovery Strategy</h3>
                  <span className="text-[10px] text-indigo-700 font-bold">Powered by Gemini 3.7 Flash</span>
                </div>
              </div>

              {diag && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Likelihood:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    diag.likelihood === 'HIGH' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    diag.likelihood === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {diag.likelihood} ({diag.confidence}% Confidence)
                  </span>
                </div>
              )}
            </div>

            {diag ? (
              <div className="space-y-3 text-xs">
                {/* Root Cause */}
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
                    Telemetry Root Cause Diagnosis
                  </span>
                  <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                    {diag.rootCause}
                  </p>
                </div>

                {/* Contributing Decision Factors */}
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">
                    Evaluated AI Decision Telemetry
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {diag.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 bg-white p-2.5 rounded-lg border border-indigo-100 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Action & Explanation */}
                <div className="bg-white p-3.5 rounded-lg border border-indigo-200 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                      Recommended Bounded Action
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {diag.recommendedAction}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {diag.recommendedActionLabel}
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {diag.explanation}
                  </p>
                </div>

                {/* Stopping Condition & Bounded Constraints */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Attempts Bound</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {transaction.failureDetails.attemptsCount} of {transaction.failureDetails.maxAttempts} max retries
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Deterministic Stopping Condition</span>
                    <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                      {diag.stoppingCondition}
                    </span>
                  </div>
                </div>

                {/* Customer Recovery Communication Draft */}
                <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>Automated Customer Communication Draft</span>
                    </div>
                    <button
                      onClick={handleCopyCustomerMessage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold transition-colors"
                    >
                      {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDraft ? 'Copied to Clipboard' : 'Copy Message'}</span>
                    </button>
                  </div>
                  <p className="text-slate-200 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-sans leading-relaxed">
                    {diag.customerMessageDraft}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">
                <p className="mb-3">This transaction has not yet been processed by the Gemini AI diagnostic engine.</p>
                <button
                  onClick={() => onDiagnose(transaction.id)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
                >
                  Run Gemini 3.7 Flash Diagnosis Now
                </button>
              </div>
            )}
          </div>

          {/* Deterministic Policy Check Compliance Matrix */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${policy?.passed ? 'text-emerald-600' : 'text-rose-600'}`} />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Deterministic Policy Compliance Guardrails
                </h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                policy?.passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {policy?.passed ? 'ALL CHECKS PASSED' : 'POLICY BLOCKED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Merchant Approval</span>
                <span className="font-bold text-slate-800">
                  {policy?.requiresApproval ? 'Required (Safeguard ON)' : 'Not Required'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Max Threshold Ceiling</span>
                <span className="font-bold text-slate-800">
                  {formatINR(transaction.amount)} ≤ {formatINR(policy?.amountThreshold || 200000)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Attempts Bound</span>
                <span className="font-bold text-slate-800">
                  {transaction.failureDetails.attemptsCount} / {transaction.failureDetails.maxAttempts} Attempts
                </span>
              </div>
            </div>

            {policy && !policy.passed && policy.violations.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
                <strong>Policy Violation:</strong> {policy.violations.join('; ')}
              </div>
            )}
          </div>

          {/* Interactive Razorpay Test Sandbox Checkout Preview (When Link is Active or Settled) */}
          {recoveryAction?.razorpayPaymentLinkId && (
            <div className="bg-blue-50/40 border border-blue-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    Razorpay Test Mode Sandbox Link
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                    {recoveryAction.razorpayPaymentLinkId}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1 rounded bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold"
                    title="Copy direct payment link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Sandbox Checkout Simulator Card */}
              <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Simulated Customer Checkout Experience</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    TEST_MODE=TRUE
                  </span>
                </div>

                <div className="bg-slate-900 text-white rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400">Total Payable</div>
                    <div className="text-base font-extrabold text-white">{formatINR(transaction.amount)}</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate max-w-xs">
                      {recoveryAction.razorpayPaymentLinkUrl}
                    </div>
                  </div>

                  {transaction.status === 'in_recovery' && (
                    <button
                      onClick={() => onSimulatePayment(transaction.id)}
                      disabled={isProcessing}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Simulate Customer Payment</span>
                    </button>
                  )}

                  {transaction.status === 'recovered' && (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Settled via Test Mode</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment History & Event Timeline */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Gateway Event Timeline</span>
            </h4>
            <div className="space-y-1.5">
              {transaction.paymentHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.event}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{item.details}</p>
                    {item.paymentId && (
                      <span className="font-mono text-[10px] text-emerald-700 font-bold block mt-0.5">
                        Payment ID: {item.paymentId}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Error Inspectable Accordion */}
          <div className="border-t border-slate-200 pt-3">
            <button
              onClick={() => setShowRawPayload(!showRawPayload)}
              className="flex items-center justify-between w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 transition-colors"
            >
              <span>Inspect Raw Gateway Telemetry Payload</span>
              {showRawPayload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showRawPayload && (
              <pre className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed">
                {JSON.stringify(JSON.parse(transaction.failureDetails.rawError || '{}'), null, 2)}
              </pre>
            )}
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {transaction.status === 'recovered' ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Revenue Recovered Successfully ({formatINR(transaction.amount)})
              </span>
            ) : transaction.status === 'permanently_failed' ? (
              <span className="text-slate-600 font-semibold">
                Permanently Declined / Blocked by Deterministic Policy
              </span>
            ) : (
              <span className="font-medium">Deterministic Policy: Merchant approval required before dispatch</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {transaction.status !== 'recovered' && transaction.status !== 'permanently_failed' && (
              <>
                {!showRejectBox ? (
                  <button
                    onClick={() => setShowRejectBox(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 font-bold text-xs transition-colors"
                  >
                    Reject / Decline
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="px-2 py-1 bg-white border border-rose-300 rounded-lg text-xs"
                    />
                    <button
                      onClick={() => {
                        onReject(transaction.id, rejectionReason);
                        setShowRejectBox(false);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowRejectBox(false)}
                      className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {transaction.status === 'in_recovery' ? (
                  <button
                    onClick={() => onSimulatePayment(transaction.id)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Simulate Settlement (Test Mode)</span>
                  </button>
                ) : (
                  <button
                    id="modal-approve-action-btn"
                    onClick={() => onApprove(transaction.id)}
                    disabled={isProcessing || !policy?.passed}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Issue Razorpay Link ({formatINR(transaction.amount)})</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
