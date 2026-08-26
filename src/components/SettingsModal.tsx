import React, { useState } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  ShieldCheck, 
  RotateCcw, 
  CheckCircle2, 
  Zap, 
  Layers, 
  Play, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { PolicyConfig, Transaction, RazorpayStatus } from '../types.ts';
import { formatINR } from '../utils/formatters.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyConfig: PolicyConfig | null;
  razorpayStatus?: RazorpayStatus | null;
  onUpdatePolicy: (config: Partial<PolicyConfig>) => void;
  transactions: Transaction[];
  onSimulateWebhook: (txnId: string, event: string) => void;
  onReseedData: () => void;
  isSaving: boolean;
  isReseeding: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  policyConfig,
  razorpayStatus,
  onUpdatePolicy,
  transactions,
  onSimulateWebhook,
  onReseedData,
  isSaving,
  isReseeding
}) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'sandbox' | 'dataset'>('policy');
  const [maxAttempts, setMaxAttempts] = useState<number>(policyConfig?.maxRecoveryAttempts || 2);
  const [amountThreshold, setAmountThreshold] = useState<number>(policyConfig?.maxAmountThreshold || 50000);
  const [requireApprovalAlways, setRequireApprovalAlways] = useState<boolean>(policyConfig?.requireApprovalForMoneyMovement ?? true);
  const [allowDiscount, setAllowDiscount] = useState<boolean>(policyConfig?.allowDiscountIncentives ?? false);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(policyConfig?.maxDiscountPercent || 5);
  const [selectedTxnId, setSelectedTxnId] = useState<string>(transactions[0]?.id || '');
  const [webhookEvent, setWebhookEvent] = useState<string>('payment_link.paid');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Settings & Guardrails</h3>
              <p className="text-slate-500 text-xs">Deterministic safeguards, policy controls, and developer sandbox</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 px-6 bg-white gap-6">
          <button
            onClick={() => setActiveTab('policy')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'policy' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Policy Engine Rules
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sandbox' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Razorpay Webhook Sandbox
          </button>
          <button
            onClick={() => setActiveTab('dataset')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'dataset' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Data Scenarios
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {activeTab === 'policy' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-indigo-900 leading-relaxed">
                  Deterministic safeguards restrict the AI from executing hazardous financial operations without human approval, bounded discount parameters, and strict retry limits.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <label className="font-bold text-slate-800 block">Max Recovery Retries</label>
                  <p className="text-slate-500 text-[11px]">Hard boundary on total link dispatches per transaction.</p>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <label className="font-bold text-slate-800 block">High-Value Approval Limit (INR)</label>
                  <p className="text-slate-500 text-[11px]">Transactions above this amount require human sign-off.</p>
                  <input
                    type="number"
                    step="5000"
                    min="1000"
                    value={amountThreshold}
                    onChange={(e) => setAmountThreshold(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Strict Merchant Sign-off</span>
                    <span className="text-slate-500 text-[11px]">Require 1-click confirmation before creating live payment links</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireApprovalAlways}
                    onChange={(e) => setRequireApprovalAlways(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Allow Smart Discount Incentives</span>
                    <span className="text-slate-500 text-[11px]">Allow AI to offer bounded discount codes for high drop-off likelihood</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDiscount}
                    onChange={(e) => setAllowDiscount(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {allowDiscount && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4">
                    <span className="text-slate-600 font-medium text-xs">Max Discount Cap (%)</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={maxDiscountPercent}
                      onChange={(e) => setMaxDiscountPercent(Number(e.target.value))}
                      className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs text-right"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Policies updated successfully
                  </span>
                ) : <div />}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Apply Policy Rules'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              {/* Razorpay Test Mode Status Banner */}
              <div className={`p-4 rounded-xl border ${
                razorpayStatus?.isConfigured 
                  ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950' 
                  : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
              }`}>
                <div className="flex items-center justify-between font-bold text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${razorpayStatus?.isConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <span>{razorpayStatus?.statusText || 'Razorpay Test Sandbox'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    razorpayStatus?.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {razorpayStatus?.mode ? `${razorpayStatus.mode.toUpperCase()} MODE` : 'TEST MODE'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {razorpayStatus?.message || "Razorpay Test Mode is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the secure Secrets configuration."}
                </p>
                {razorpayStatus?.features && (
                  <div className="mt-2.5 pt-2 border-t border-current/10 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium opacity-85">
                    {razorpayStatus.features.map((feat, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {feat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-600 text-xs leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  Simulating synthetic webhooks updates transaction states and triggers real-time audit logging without affecting live payments.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Target Transaction</label>
                  <select
                    value={selectedTxnId}
                    onChange={(e) => setSelectedTxnId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {transactions.slice(0, 15).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.id} • {t.customerName} ({formatINR(t.amount)}) • {t.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Webhook Event</label>
                  <select
                    value={webhookEvent}
                    onChange={(e) => setWebhookEvent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="payment_link.paid">payment_link.paid (Simulate Customer Payment Settle)</option>
                    <option value="payment_link.expired">payment_link.expired (Simulate Recovery Link Expiry)</option>
                    <option value="payment.failed">payment.failed (Simulate Secondary Payment Failure)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (selectedTxnId) {
                        onSimulateWebhook(selectedTxnId, webhookEvent);
                      }
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 text-emerald-400" />
                    Dispatch Synthetic Webhook Payload
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dataset' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  Reset Hackathon Demo Dataset
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Reseed 100+ realistic Indian fintech transaction records with UPI timeouts, OTP bank gateway drops, card 3DS failures, and dynamic recovery simulations.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onReseedData}
                    disabled={isReseeding}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
                    {isReseeding ? 'Generating Synthetic Records...' : 'Generate Fresh 100+ Records'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
