export type CustomerTier = 'VIP' | 'Enterprise' | 'Growth' | 'Starter';

export type PaymentMethod = 
  | 'upi' 
  | 'card_credit' 
  | 'card_debit' 
  | 'netbanking' 
  | 'wallet' 
  | 'mandate';

export type FailureCategory = 
  | 'bank_downtime' 
  | 'authentication_3ds' 
  | 'insufficient_funds' 
  | 'card_expired' 
  | 'network_timeout' 
  | 'fraud_risk_flag' 
  | 'mandate_issue';

export type TransactionStatus = 
  | 'failed' 
  | 'ai_analyzed' 
  | 'approval_required' 
  | 'in_recovery' 
  | 'recovered' 
  | 'permanently_failed' 
  | 'policy_blocked';

export type RecoveryLikelihood = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type RecommendedActionType = 
  | 'smart_retry_alternate_gateway' 
  | 'create_razorpay_payment_link' 
  | 'request_alternative_payment_method' 
  | 'delayed_retry_salaried_window' 
  | 'escalate_merchant_concierge' 
  | 'mark_permanent_decline';

export interface AIDiagnosis {
  rootCause: string;
  confidence: number;
  likelihood: RecoveryLikelihood;
  factors: string[];
  recommendedAction: RecommendedActionType;
  recommendedActionLabel: string;
  explanation: string;
  customerMessageDraft: string;
  stoppingCondition: string;
  suggestedDiscountBps?: number;
  analyzedAt: string;
  modelUsed: string;
}

export interface PolicyCheckResult {
  passed: boolean;
  violations: string[];
  requiresApproval: boolean;
  maxAttemptsAllowed: number;
  currentAttempts: number;
  amountThreshold: number;
  isPermanentlyFailed: boolean;
  timestamp: string;
}

export interface RecoveryActionExecution {
  actionType: RecommendedActionType;
  approvedBy?: string;
  approvedAt?: string;
  razorpayPaymentLinkId?: string;
  razorpayPaymentLinkUrl?: string;
  razorpayPaymentId?: string;
  executedAt?: string;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'skipped';
  recoveredAt?: string;
  recoveredAmount?: number;
  errorMessage?: string;
}

export interface PaymentHistoryItem {
  id: string;
  timestamp: string;
  event: string;
  gatewayStatus: string;
  details: string;
  paymentId?: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTier: CustomerTier;
  customerLtv: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  cardNetwork?: string;
  bankName?: string;
  vpa?: string;
  timestamp: string;
  failureCode: string;
  failureReason: string;
  failureCategory: FailureCategory;
  failureDetails: {
    gatewayResponseCode: string;
    errorDescription: string;
    rawError: string;
    attemptsCount: number;
    maxAttempts: number;
  };
  status: TransactionStatus;
  recoveryScore: number;
  recoveryLikelihood: RecoveryLikelihood;
  aiDiagnosis?: AIDiagnosis;
  policyCheck?: PolicyCheckResult;
  recoveryAction?: RecoveryActionExecution;
  paymentHistory: PaymentHistoryItem[];
}

export type AuditEventType = 
  | 'failure_detected' 
  | 'ai_analysis' 
  | 'policy_evaluated' 
  | 'merchant_approval' 
  | 'merchant_rejection' 
  | 'razorpay_api_dispatched' 
  | 'payment_link_created' 
  | 'webhook_received' 
  | 'recovery_success' 
  | 'recovery_failed' 
  | 'policy_blocked';

export type AuditActor = 
  | 'SYSTEM' 
  | 'GEMINI_AI' 
  | 'POLICY_ENGINE' 
  | 'MERCHANT' 
  | 'RAZORPAY_GATEWAY';

export interface AuditEvent {
  id: string;
  transactionId: string;
  customerName: string;
  amount: number;
  eventType: AuditEventType;
  eventTitle: string;
  description: string;
  actor: AuditActor;
  timestamp: string;
  status: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export interface PolicyConfig {
  maxRecoveryAttempts: number;
  maxAmountThreshold: number;
  requireApprovalForMoneyMovement: boolean;
  blockPermanentlyFailed: boolean;
  autoSendPaymentLinksOnApproval: boolean;
  allowDiscountIncentives: boolean;
  maxDiscountPercent: number;
  requireApprovalAboveAmount?: number;
  requireApprovalAlways?: boolean;
}

export type MerchantPolicyConfig = PolicyConfig;

export interface RazorpayStatus {
  isConfigured: boolean;
  mode: 'test';
  statusText: string;
  keyIdPrefix: string | null;
  message: string;
  features: string[];
}

export interface AnalyticsSummary {
  totalTransactions: number;
  failedTransactions: number;
  eligibleOpportunities: number;
  pendingApprovalCount: number;
  inRecoveryCount: number;
  recoveredCount: number;
  permanentlyFailedCount: number;
  policyBlockedCount: number;
  revenueAtRisk: number;
  revenueRecovered: number;
  recoverableRevenue: number;
  recoveryRate: number;
  roiMultiplier: number;
  averageRecoveryTimeMinutes: number;
  syntheticMetadata?: {
    isSynthetic: boolean;
    batchSize: number;
    scenario: string;
    scenarioLabel: string;
    datasetGeneratedAt: string;
    environment: string;
    disclaimer: string;
  };
  tierDistribution?: {
    tier: CustomerTier;
    label: string;
    count: number;
    amount: number;
    recoveredCount: number;
    recoveredAmount: number;
    recoveryRate: number;
    ltvPreserved: number;
  }[];
  channelDistribution?: {
    actionType: RecommendedActionType;
    label: string;
    count: number;
    amount: number;
    recoveredCount: number;
    recoveredAmount: number;
    conversionRate: number;
  }[];
  timeDistribution?: {
    rangeLabel: string;
    count: number;
    recoveredAmount: number;
    percentage: number;
  }[];
  policySafetyMetrics?: {
    zeroToleranceFraudBlockRate: number;
    fraudBlockedCount: number;
    fraudPreventedRiskAmount: number;
    thresholdGatedCount: number;
    retryLimitsEnforcedCount: number;
    autoApprovalSafetyRatio: number;
  };
  categoryDistribution: {
    category: FailureCategory;
    label: string;
    count: number;
    amount: number;
    recoveredCount: number;
    recoveredAmount: number;
    recoveryRate: number;
  }[];
  methodDistribution: {
    method: PaymentMethod;
    label: string;
    count: number;
    amount: number;
    recoveredAmount: number;
    recoveryRate: number;
  }[];
  trendData: {
    date: string;
    failedAmount: number;
    recoveredAmount: number;
    recoveriesCount: number;
    failuresCount: number;
  }[];
}

export type AssistantResponseType = 
  | 'SUMMARY'
  | 'METRICS'
  | 'RECOVERY_OPPORTUNITIES'
  | 'ROOT_CAUSE_ANALYSIS'
  | 'TRANSACTION_DETAIL'
  | 'RECOVERY_RESULT'
  | 'POLICY_WARNING'
  | 'ERROR'
  | 'ACTION_CONFIRMATION';

export interface AssistantMetricsData {
  revenueAtRisk: number;
  recoverableRevenue: number;
  alreadyRecovered: number;
  pendingApproval: number;
  totalTransactions?: number;
  recoveryRate?: number;
  roiMultiplier?: number;
  eligibleOpportunities?: number;
}

export interface AssistantRecoveryOpportunityItem {
  transactionId: string;
  orderId?: string;
  customerName: string;
  customerTier: CustomerTier;
  amount: number;
  failureReason: string;
  failureCategory: FailureCategory;
  paymentMethod?: PaymentMethod;
  bankName?: string;
  recoveryScore: number;
  recoveryProbability: number;
  recoveryLikelihood: RecoveryLikelihood;
  recommendedAction: RecommendedActionType;
  recommendedActionLabel: string;
  stoppingCondition: string;
  maxAttempts: number;
  whyRecommended: string;
  policyApproved: boolean;
}

export interface AssistantRecoveryOpportunitiesData {
  opportunities: AssistantRecoveryOpportunityItem[];
  totalOpportunityAmount: number;
  summaryNote?: string;
}

export interface AssistantRootCauseCategory {
  category: FailureCategory;
  label: string;
  amount: number;
  percentage: number;
  count: number;
  recoveryLikelihood: string;
  description: string;
}

export interface AssistantRootCauseData {
  totalRevenueAtRisk: number;
  causes: AssistantRootCauseCategory[];
  keyInsight?: string;
  suggestedNextStep?: string;
}

export interface AssistantTransactionDetailData {
  transaction: Transaction;
  aiDiagnosis?: AIDiagnosis;
  policyCheck?: PolicyCheckResult;
  auditTrailExcerpt?: {
    eventTitle: string;
    timestamp: string;
    actor: string;
  }[];
}

export interface AssistantRecoveryResultData {
  success: boolean;
  recoveredAmount: number;
  customerName: string;
  transactionId: string;
  actionTaken: string;
  durationLabel: string;
  razorpayPaymentId?: string;
  razorpayPaymentLinkId?: string;
  timestamp: string;
}

export interface AssistantPolicyWarningData {
  transactionId?: string;
  customerName?: string;
  amount?: number;
  policyLimit?: number;
  reason: string;
  requiredAction: string;
  isBlocked: boolean;
}

export interface AssistantErrorData {
  title: string;
  reason: string;
  actionTaken: string;
  statusNote?: string;
  canRetry: boolean;
}

export interface AssistantActionConfirmationData {
  transactionId: string;
  customerName: string;
  amount: number;
  failureReason: string;
  failureCode: string;
  recommendedAction: string;
  recoveryProbability: number;
  whyRecommended: string;
  maxAttempts: number;
  stoppingCondition: string;
  policyLimit: number;
  requiresMerchantApproval: boolean;
}

export interface AssistantSummaryData {
  headline: string;
  keyPoints: string[];
  metricsSnapshot?: {
    revenueAtRisk: number;
    recoverableRevenue: number;
    pendingApproval: number;
  };
  recommendedNextActions?: {
    label: string;
    actionType: string;
    filter?: string;
    transactionId?: string;
  }[];
}

export interface AssistantStructuredResponse {
  responseType: AssistantResponseType;
  message: string;
  data: any;
  actions?: {
    label: string;
    actionType: string;
    payload?: any;
    transactionId?: string;
    filter?: string;
  }[];
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  structuredResponse?: AssistantStructuredResponse;
  timestamp: string;
  suggestedActions?: {
    label: string;
    actionType: string;
    transactionId?: string;
  }[];
}
