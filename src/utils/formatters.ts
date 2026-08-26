import { CustomerTier, FailureCategory, PaymentMethod, RecoveryLikelihood, TransactionStatus } from "../types.ts";

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

export function getStatusBadgeStyle(status: TransactionStatus): { label: string; bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'failed':
      return {
        label: 'Failed (New)',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'ai_analyzed':
      return {
        label: 'AI Diagnosed',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500'
      };
    case 'approval_required':
      return {
        label: 'Awaiting Approval',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'in_recovery':
      return {
        label: 'In Recovery (Link Sent)',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'recovered':
      return {
        label: 'Recovered (Settled)',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'permanently_failed':
      return {
        label: 'Permanent Decline',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-400'
      };
    case 'policy_blocked':
      return {
        label: 'Policy Blocked',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-500'
      };
    default:
      return {
        label: status,
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
        dot: 'bg-gray-400'
      };
  }
}

export function getLikelihoodBadgeStyle(likelihood: RecoveryLikelihood): { bg: string; text: string; border: string } {
  switch (likelihood) {
    case 'HIGH':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'MEDIUM':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'LOW':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'NONE':
      return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

export function getTierBadge(tier: CustomerTier): { bg: string; text: string } {
  switch (tier) {
    case 'VIP':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'Enterprise':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'Growth':
      return { bg: 'bg-teal-100', text: 'text-teal-800' };
    case 'Starter':
      return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
}

export function getCategoryLabel(category: FailureCategory): string {
  switch (category) {
    case 'bank_downtime': return 'Bank Downtime';
    case 'authentication_3ds': return '3DS Authentication';
    case 'insufficient_funds': return 'Insufficient Balance';
    case 'card_expired': return 'Card Expired';
    case 'network_timeout': return 'Network Timeout';
    case 'mandate_issue': return 'Mandate Limit';
    case 'fraud_risk_flag': return 'Fraud / Stolen Card';
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'upi': return 'UPI / QR';
    case 'card_credit': return 'Credit Card';
    case 'card_debit': return 'Debit Card';
    case 'netbanking': return 'Net Banking';
    case 'wallet': return 'Wallet';
    case 'mandate': return 'e-Mandate';
  }
}
