import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  ShieldCheck, 
  CreditCard, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Sparkles, 
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';
import { PolicyConfig, Transaction } from '../types.ts';
import { formatINR } from '../utils/formatters.ts';

interface PolicySandboxViewProps {
  policyConfig: PolicyConfig | null;
  onUpdatePolicy: (config: Partial<PolicyConfig>) => void;
  transactions: Transaction[];
  onSimulateWebhook: (txnId: string, event: string) => void;
  onReseedData: () => void;
  isSaving: boolean;
  isReseeding: boolean;
}

export const PolicySandboxView: React.FC<PolicySandboxViewProps> = ({
  policyConfig,
  onUpdatePolicy,
  transactions,
  onSimulateWebhook,
  onReseedData,
  isSaving,
  isReseeding
}) => {
  const txList = Array.isArray(transactions) ? transactions : [];
  const [maxAttempts, setMaxAttempts] = useState<number>(policyConfig?.maxRecoveryAttempts || 2);
  const [amountThreshold, setAmountThreshold] = useState<number>(policyConfig?.maxAmountThreshold || 50000);
  const [requireApprovalAlways, setRequireApprovalAlways] = useState<boolean>(policyConfig?.requireApprovalForMoneyMovement ?? true);
  const [allowDiscount, setAllowDiscount] = useState<boolean>(policyConfig?.allowDiscountIncentives ?? false);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(policyConfig?.maxDiscountPercent || 5);
  const [selectedTxnId, setSelectedTxnId] = useState<string>(txList[0]?.id || '');
  const [webhookEvent, setWebhookEvent] = useState<string>('payment_link.paid');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSavePolicy = () => {
    onUpdatePolicy({
      maxRecoveryAttempts: Number(maxAttempts),
      maxAmountThreshold: Number(amountThreshold),
      requireApprovalForMoneyMovement: requireApprovalAlways,
      allowDiscountIncentives: allowDiscount,
      maxDiscountPercent: Number(maxDiscountPercent)
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const selectedTxn = txList.find(t => t.id === selectedTxnId) || txList[0] || null;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Policy Engine & Razorpay Sandbox</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
            Deterministic Safeguards
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure safety bounding rules and simulate Razorpay Test Mode checkout interactions with webhook callbacks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left Column: Deterministic Policy Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Policy Guardrails Configuration</h3>
                <span className="text-[11px] text-slate-400">Deterministic checks applied before Razorpay API calls</span>
              </div>
            </div>
            {saveSuccess && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {/* Rule 1: Always Require Merchant Approval */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <label className="font-bold text-slate-800 block">Require Merchant Approval for All Interventions</label>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  When enabled, no payment link or charge retry can be dispatched without explicit merchant authorization.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireApprovalAlways}
                onChange={(e) => setRequireApprovalAlways(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
            </div>

            {/* Rule 2: Max Recovery Attempts Bound */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <label className="font-bold text-slate-800 block">Max Recovery Attempts Ceiling</label>
              <p className="text-slate-500 text-[11px]">
                Stop all interventions once this number of attempts is reached for any customer transaction.
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <span className="font-bold text-slate-900 px-2.5 py-0.5 bg-white border border-slate-200 rounded-md shrink-0 text-xs">
                  {maxAttempts} max
                </span>
              </div>
            </div>

            {/* Rule 3: High-Value Amount Threshold */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <label className="font-bold text-slate-800 block">Mandatory Review Amount Threshold</label>
              <p className="text-slate-500 text-[11px]">
                Transactions exceeding this value must undergo secondary merchant review.
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  value={amountThreshold}
                  onChange={(e) => setAmountThreshold(Number(e.target.value))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-bold text-xs focus:ring-1 focus:ring-purple-500 w-32"
                />
              </div>
            </div>

            {/* Rule 4: Discount Incentive Policy */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <label className="font-bold text-slate-800 block">Allow AI-Generated Recovery Discount Incentives</label>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Permit Gemini to attach limited discount coupons (capped at {maxDiscountPercent}%) to VIP customer recovery links.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowDiscount}
                onChange={(e) => setAllowDiscount(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSavePolicy}
              disabled={isSaving}
              className="w-full py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Deterministic Policy Rules</span>
            </button>
          </div>
        </div>

        {/* Right Column: Razorpay Test Mode Simulator */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Razorpay Test Mode Sandbox Simulator</h3>
                <span className="text-[11px] text-slate-400">Trigger test webhook callbacks & verify status transitions</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Transaction Picker */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Target Transaction:</label>
              <select
                value={selectedTxnId}
                onChange={(e) => setSelectedTxnId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono"
              >
                {txList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id} - {t.customerName} ({formatINR(t.amount)}) - [{t.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Transaction Snapshot */}
            {selectedTxn && (
              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-white font-sans font-bold">{selectedTxn.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-emerald-400 font-bold">{formatINR(selectedTxn.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Status:</span>
                  <span className="text-amber-300 font-bold uppercase">{selectedTxn.status}</span>
                </div>
                {selectedTxn.recoveryAction?.razorpayPaymentLinkId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Link ID:</span>
                    <span className="text-blue-400">{selectedTxn.recoveryAction.razorpayPaymentLinkId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Webhook Event Type */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Simulate Razorpay Webhook Event:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setWebhookEvent('payment_link.paid')}
                  className={`p-2 rounded-lg border text-left font-medium transition-all ${
                    webhookEvent === 'payment_link.paid' 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-mono text-[11px]">payment_link.paid</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Simulate customer successful payment capture</div>
                </button>

                <button
                  onClick={() => setWebhookEvent('payment_link.expired')}
                  className={`p-2 rounded-lg border text-left font-medium transition-all ${
                    webhookEvent === 'payment_link.expired' 
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-mono text-[11px]">payment_link.expired</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Simulate link expiration without payment</div>
                </button>
              </div>
            </div>

            {/* Trigger Webhook Button */}
            <button
              onClick={() => onSimulateWebhook(selectedTxnId, webhookEvent)}
              disabled={!selectedTxnId}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Dispatch Razorpay Test Webhook Callback</span>
            </button>
          </div>

          {/* Reseed Batch Dataset */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Reset batch with 125 realistic records:
            </span>
            <button
              onClick={onReseedData}
              disabled={isReseeding}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
              <span>Reseed Data</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
