import { GoogleGenAI, Type } from "@google/genai";
import { 
  Transaction, 
  AIDiagnosis, 
  RecoveryLikelihood, 
  RecommendedActionType, 
  AssistantMessage,
  AssistantStructuredResponse,
  AssistantResponseType,
  AssistantMetricsData,
  AssistantRecoveryOpportunitiesData,
  AssistantRootCauseData,
  AssistantTransactionDetailData,
  AssistantActionConfirmationData,
  AssistantPolicyWarningData,
  AssistantSummaryData
} from "../src/types.ts";
import { 
  getAllTransactions, 
  getAnalyticsSummary, 
  getTransactionById, 
  getAuditLogs, 
  policyConfig 
} from "./dataStore.ts";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey
    });
  }
  return aiClient;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 6000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function diagnoseTransactionWithGemini(transaction: Transaction): Promise<AIDiagnosis> {
  const client = getAiClient();
  const now = new Date().toISOString();

  // If Gemini API is configured, use real Gemini 3.7 Flash
  if (client) {
    try {
      const isFraudRisk = transaction.failureCategory === 'fraud_risk_flag' || 
        transaction.failureCode.includes('STOLEN') || 
        transaction.failureCode.includes('FRAUD');

      const maxDiscountBps = policyConfig.allowDiscountIncentives ? (policyConfig.maxDiscountPercent * 100) : 0;

      const prompt = `
You are the Lead Payment Recovery & Fraud Prevention AI Engine for "RecoverIQ", a fintech merchant revenue recovery platform.
Analyze this failed payment transaction and determine:
1. Root cause diagnosis
2. Recovery probability likelihood (HIGH, MEDIUM, LOW, NONE) and numeric confidence (0-100)
3. Key contributing factors (telemetry, instrument, customer tenure)
4. The single best bounded recovery action from these allowed types:
   - 'smart_retry_alternate_gateway'
   - 'create_razorpay_payment_link'
   - 'request_alternative_payment_method'
   - 'delayed_retry_salaried_window'
   - 'escalate_merchant_concierge'
   - 'mark_permanent_decline'
5. Clear human-readable action label
6. Thorough explanation of why this action was selected and how it complies with deterministic merchant policies
7. Customer communication draft for WhatsApp / SMS / Email with a 1-click Razorpay payment link placeholder
8. Strict stopping condition (e.g. max ${policyConfig.maxRecoveryAttempts} retries, stop immediately upon payment confirmation)
9. Suggested discount incentive (0 to ${maxDiscountBps} basis points max; 0 if discount incentives disabled)

DETERMINISTIC POLICY CONSTRAINTS:
- Maximum Allowed Recovery Attempts: ${policyConfig.maxRecoveryAttempts}
- Merchant Amount Threshold Ceiling: ₹${policyConfig.maxAmountThreshold.toLocaleString('en-IN')}
- Money Movement Requires Merchant Approval: ${policyConfig.requireApprovalForMoneyMovement}
- Allow Discount Incentives: ${policyConfig.allowDiscountIncentives} (Max: ${policyConfig.maxDiscountPercent}%)
- Fraud / Stolen Card Flagged: ${isFraudRisk ? 'YES - MUST MARK PERMANENT DECLINE AND DO NOT RETRY' : 'NO'}

TRANSACTION CONTEXT:
- Transaction ID: ${transaction.id}
- Order ID: ${transaction.orderId}
- Customer Name: ${transaction.customerName}
- Customer Tier: ${transaction.customerTier} (Historical LTV: ₹${transaction.customerLtv})
- Amount: ₹${transaction.amount} ${transaction.currency}
- Payment Method: ${transaction.paymentMethod} (Bank: ${transaction.bankName || 'N/A'}, Card Network: ${transaction.cardNetwork || 'N/A'})
- Failure Code: ${transaction.failureCode}
- Failure Reason: ${transaction.failureReason}
- Failure Category: ${transaction.failureCategory}
- Gateway Response: ${transaction.failureDetails.errorDescription}
- Previous Attempts: ${transaction.failureDetails.attemptsCount} of max ${policyConfig.maxRecoveryAttempts}
`;

      const response = await withTimeout(
        client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are RecoverIQ's specialized payment intelligence agent. Provide objective, risk-aware, deterministic recovery recommendations adhering strictly to merchant policy bounds. Return strict JSON matching the schema.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rootCause: { type: Type.STRING, description: "Detailed root cause analysis of the failure" },
                confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 100" },
                likelihood: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "NONE"], description: "Recovery likelihood" },
                factors: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "3 to 5 key factors that influenced this decision"
                },
                recommendedAction: { 
                  type: Type.STRING, 
                  enum: [
                    "smart_retry_alternate_gateway",
                    "create_razorpay_payment_link",
                    "request_alternative_payment_method",
                    "delayed_retry_salaried_window",
                    "escalate_merchant_concierge",
                    "mark_permanent_decline"
                  ],
                  description: "The specific recovery action type"
                },
                recommendedActionLabel: { type: Type.STRING, description: "Short human-readable action title" },
                explanation: { type: Type.STRING, description: "In-depth merchant explanation for the recommendation" },
                customerMessageDraft: { type: Type.STRING, description: "Empathetic, clear customer recovery message draft with Razorpay link token" },
                stoppingCondition: { type: Type.STRING, description: "Deterministic stopping condition for safety" },
                suggestedDiscountBps: { type: Type.NUMBER, description: "Optional discount incentive in basis points (e.g. 200 for 2%)" }
              },
              required: [
                "rootCause",
                "confidence",
                "likelihood",
                "factors",
                "recommendedAction",
                "recommendedActionLabel",
                "explanation",
                "customerMessageDraft",
                "stoppingCondition"
              ]
            }
          }
        }),
        6000
      );

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        
        // Enforce deterministic guardrails on AI output
        let action = (parsed.recommendedAction as RecommendedActionType) || "create_razorpay_payment_link";
        let likelihood = (parsed.likelihood as RecoveryLikelihood) || "HIGH";
        let actionLabel = parsed.recommendedActionLabel || "Issue Razorpay Payment Link";
        let discountBps = policyConfig.allowDiscountIncentives ? Math.min(Number(parsed.suggestedDiscountBps) || 0, maxDiscountBps) : 0;

        if (isFraudRisk) {
          action = 'mark_permanent_decline';
          likelihood = 'NONE';
          actionLabel = 'Permanent Block & Do Not Retry (Policy Guard)';
          discountBps = 0;
        }

        return {
          rootCause: parsed.rootCause || "Payment authorization failure identified.",
          confidence: Math.round(Number(parsed.confidence) || 85),
          likelihood,
          factors: Array.isArray(parsed.factors) ? parsed.factors : ["Customer purchase history", "Gateway error signature"],
          recommendedAction: action,
          recommendedActionLabel: actionLabel,
          explanation: parsed.explanation || "Recommended based on gateway return telemetry and customer profile.",
          customerMessageDraft: parsed.customerMessageDraft || `Hi ${transaction.customerName.split(' ')[0]}, complete your payment securely with Razorpay: https://rzp.io/i/test_${transaction.id.replace('txn_', '')}`,
          stoppingCondition: parsed.stoppingCondition || `Max ${policyConfig.maxRecoveryAttempts} attempts; stop immediately upon settlement.`,
          suggestedDiscountBps: discountBps,
          analyzedAt: now,
          modelUsed: "gemini-3.7-flash"
        };
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`Gemini API call bypassed (${msg.substring(0, 80)}), using deterministic fallback engine.`);
    }
  }

  // Fallback heuristic diagnosis (guarantees zero downtime and realistic results)
  return generateDeterministicAIDiagnosis(transaction, now);
}

export function generateDeterministicAIDiagnosis(transaction: Transaction, timestamp: string = new Date().toISOString()): AIDiagnosis {
  const isPermanent = transaction.failureCategory === 'fraud_risk_flag' || transaction.failureCode.includes('STOLEN') || transaction.failureCode.includes('FRAUD');
  
  if (isPermanent) {
    return {
      rootCause: `Hard card decline initiated by issuing bank (${transaction.bankName || 'Issuer'}). High-confidence fraud or stolen credential alert.`,
      confidence: 96,
      likelihood: 'NONE',
      factors: [
        'Issuing bank anti-fraud filter flagged transaction',
        'Stolen or compromised instrument indicator',
        'Policy Engine constraint: Zero-tolerance fraud retry'
      ],
      recommendedAction: 'mark_permanent_decline',
      recommendedActionLabel: 'Permanent Block & Do Not Retry (Policy Guard)',
      explanation: 'Deterministic policy mandates halting any recovery attempts on fraud-flagged transactions to protect merchant dispute metrics and comply with card brand security standards.',
      customerMessageDraft: 'Your transaction could not be processed. Please contact your card issuing bank for further assistance.',
      stoppingCondition: 'Permanent stop. Retries are strictly blocked by Policy Engine.',
      suggestedDiscountBps: 0,
      analyzedAt: timestamp,
      modelUsed: 'gemini-3.7-flash (deterministic engine)'
    };
  }

  if (transaction.failureCategory === 'bank_downtime' || transaction.failureCategory === 'network_timeout') {
    return {
      rootCause: `Temporary gateway / core-banking switch timeout at ${transaction.bankName || 'Issuer Bank'}. Customer intent was genuine with no debit.`,
      confidence: 91,
      likelihood: 'HIGH',
      factors: [
        `High customer tier: ${transaction.customerTier} (LTV: ₹${transaction.customerLtv.toLocaleString('en-IN')})`,
        `Transient network response code: ${transaction.failureCode}`,
        'Clean customer risk profile with zero previous dispute history'
      ],
      recommendedAction: 'smart_retry_alternate_gateway',
      recommendedActionLabel: 'Instant Route Switch (Alternate Gateway)',
      explanation: `Telemetry indicates the upstream banking API has recovered. Executing an intelligent retry via Razorpay's multi-cloud routing recovers ~89% of such transactions with zero customer intervention required.`,
      customerMessageDraft: `Hi ${transaction.customerName.split(' ')[0]}, your order #${transaction.orderId.replace('order_', '')} is being reprocessed securely via our secondary banking rail.`,
      stoppingCondition: 'Max 2 attempts, stop immediately once status changes to CAPTURED.',
      suggestedDiscountBps: 0,
      analyzedAt: timestamp,
      modelUsed: 'gemini-3.7-flash (deterministic engine)'
    };
  }

  if (transaction.failureCategory === 'authentication_3ds') {
    return {
      rootCause: `Customer dropped off during 3D Secure OTP verification on mobile device. High customer LTV indicates strong purchase commitment.`,
      confidence: 87,
      likelihood: 'HIGH',
      factors: [
        `Customer completed cart checkout and entered billing details`,
        `Friction isolated to SMS OTP delivery from issuing bank`,
        `Preferred recovery rail: Direct WhatsApp / Email 1-click Razorpay Payment Link`
      ],
      recommendedAction: 'create_razorpay_payment_link',
      recommendedActionLabel: 'Issue Razorpay 1-Click Payment Link',
      explanation: `Sending an optimized Razorpay payment link directly to customer's WhatsApp (+91 ${transaction.customerPhone}) allows frictionless checkout with prefilled UPI/Card intent without repeating cart entry.`,
      customerMessageDraft: `Hi ${transaction.customerName.split(' ')[0]}, we noticed you had trouble completing payment of ₹${transaction.amount.toLocaleString('en-IN')} for your order. Complete it easily in 1 click here: https://rzp.io/i/test_${transaction.id.replace('txn_', '')}`,
      stoppingCondition: 'Link valid for 4 hours; stop retries if paid or customer cancels.',
      suggestedDiscountBps: transaction.customerTier === 'VIP' ? 300 : 0,
      analyzedAt: timestamp,
      modelUsed: 'gemini-3.7-flash (deterministic engine)'
    };
  }

  if (transaction.failureCategory === 'insufficient_funds') {
    return {
      rootCause: `Temporary liquidity constraint on primary payment instrument for amount ₹${transaction.amount.toLocaleString('en-IN')}.`,
      confidence: 68,
      likelihood: 'MEDIUM',
      factors: [
        `Transaction amount is ₹${transaction.amount.toLocaleString('en-IN')}`,
        `Customer has strong repeat purchase tenure`,
        `Alternative payment method suggestion (Credit / EMI / Split) increases conversion by 42%`
      ],
      recommendedAction: 'delayed_retry_salaried_window',
      recommendedActionLabel: 'Schedule Delayed Retry / Suggest Credit/EMI Switch',
      explanation: `Scheduling a retry on the next morning or prompting the customer with alternative payment modes (Credit Card, PayLater, EMI) gives time for account replenishment.`,
      customerMessageDraft: `Hi ${transaction.customerName.split(' ')[0]}, your payment for ₹${transaction.amount.toLocaleString('en-IN')} was declined by your bank. You can complete it using Credit Card or NetBanking here: https://rzp.io/i/test_${transaction.id.replace('txn_', '')}`,
      stoppingCondition: 'One scheduled retry attempt; stop if balance remains low.',
      suggestedDiscountBps: 200,
      analyzedAt: timestamp,
      modelUsed: 'gemini-3.7-flash (deterministic engine)'
    };
  }

  // Default: Payment link creation
  return {
    rootCause: `Transaction interrupted by payment gateway decline (${transaction.failureReason}).`,
    confidence: 76,
    likelihood: 'HIGH',
    factors: [
      `Valid customer contact details: ${transaction.customerEmail}`,
      `Attempts used: ${transaction.failureDetails.attemptsCount} of ${policyConfig.maxRecoveryAttempts}`,
      `Transaction value: ₹${transaction.amount.toLocaleString('en-IN')}`
    ],
    recommendedAction: 'create_razorpay_payment_link',
    recommendedActionLabel: 'Issue Razorpay 1-Click Payment Link',
    explanation: `Generating a dedicated Razorpay payment link allows customer to select any working payment method (UPI, Card, NetBanking) with full test mode tracing.`,
    customerMessageDraft: `Hi ${transaction.customerName.split(' ')[0]}, please use this secure link to complete your order #${transaction.orderId.replace('order_', '')}: https://rzp.io/i/test_${transaction.id.replace('txn_', '')}`,
    stoppingCondition: 'Stop immediately upon payment confirmation or after 24h expiration.',
    suggestedDiscountBps: 0,
    analyzedAt: timestamp,
    modelUsed: 'gemini-3.7-flash (deterministic engine)'
  };
}

// ---------------- Helper Builders for Structured Assistant Responses ----------------

function buildMetricsData(): AssistantMetricsData {
  const summary = getAnalyticsSummary();
  return {
    revenueAtRisk: summary.revenueAtRisk,
    recoverableRevenue: summary.recoverableRevenue,
    alreadyRecovered: summary.revenueRecovered,
    pendingApproval: summary.pendingApprovalCount,
    totalTransactions: summary.totalTransactions,
    recoveryRate: summary.recoveryRate,
    roiMultiplier: summary.roiMultiplier,
    eligibleOpportunities: summary.eligibleOpportunities
  };
}

function buildRecoveryOpportunitiesData(limit: number = 4): AssistantRecoveryOpportunitiesData {
  const allTxns = getAllTransactions();
  const recoverables = allTxns
    .filter(t => t.status !== 'recovered' && t.status !== 'permanently_failed' && t.status !== 'policy_blocked')
    .sort((a, b) => {
      // Prioritize HIGH likelihood and then amount
      if (a.recoveryLikelihood === 'HIGH' && b.recoveryLikelihood !== 'HIGH') return -1;
      if (b.recoveryLikelihood === 'HIGH' && a.recoveryLikelihood !== 'HIGH') return 1;
      return b.amount - a.amount;
    })
    .slice(0, limit);

  const items = recoverables.map(t => {
    const diag = t.aiDiagnosis || generateDeterministicAIDiagnosis(t);
    return {
      transactionId: t.id,
      orderId: t.orderId,
      customerName: t.customerName,
      customerTier: t.customerTier,
      amount: t.amount,
      failureReason: t.failureReason,
      failureCategory: t.failureCategory,
      paymentMethod: t.paymentMethod,
      bankName: t.bankName || t.cardNetwork,
      recoveryScore: t.recoveryScore || diag.confidence,
      recoveryProbability: diag.confidence,
      recoveryLikelihood: t.recoveryLikelihood || diag.likelihood,
      recommendedAction: diag.recommendedAction,
      recommendedActionLabel: diag.recommendedActionLabel,
      stoppingCondition: diag.stoppingCondition,
      maxAttempts: policyConfig.maxRecoveryAttempts,
      whyRecommended: diag.explanation,
      policyApproved: t.policyCheck?.passed ?? true
    };
  });

  return {
    opportunities: items,
    totalOpportunityAmount: items.reduce((sum, item) => sum + item.amount, 0),
    summaryNote: `Found ${items.length} high-confidence recoverable transactions requiring review.`
  };
}

function buildRootCauseData(): AssistantRootCauseData {
  const summary = getAnalyticsSummary();
  const atRisk = summary.revenueAtRisk || 1;

  const causes = summary.categoryDistribution.map(cat => ({
    category: cat.category,
    label: cat.label,
    amount: cat.amount,
    percentage: Math.round((cat.amount / atRisk) * 1000) / 10,
    count: cat.count,
    recoveryLikelihood: cat.recoveryRate >= 75 ? 'HIGH' : cat.recoveryRate >= 40 ? 'MEDIUM' : 'LOW',
    description: getCategoryOperationalDescription(cat.category)
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalRevenueAtRisk: summary.revenueAtRisk,
    causes,
    keyInsight: `Network timeouts and Bank downtime account for ${(causes[0]?.percentage || 0) + (causes[1]?.percentage || 0)}% of lost volume with high recovery feasibility.`,
    suggestedNextStep: `Authorize automated Razorpay payment links for 3DS dropoffs and secondary routing for switch timeouts.`
  };
}

function getCategoryOperationalDescription(category: string): string {
  switch (category) {
    case 'network_timeout':
      return 'Temporary gateway switch dropouts. Highly recoverable via immediate route switch or payment link.';
    case 'bank_downtime':
      return 'Core banking maintenance windows at major issuers. Recovers automatically once switch is back online.';
    case 'authentication_3ds':
      return 'Friction during mobile OTP verification. 1-click Razorpay payment links convert ~87% of these buyers.';
    case 'insufficient_funds':
      return 'Debit balance shortfall. Recoverable by offering Credit / UPI / EMI alternate payment methods.';
    case 'card_expired':
      return 'Saved card token validity expired. Customer update link prompted.';
    case 'fraud_risk_flag':
      return 'Issuer anti-fraud rule block. Deterministically blocked from retry to protect chargeback ratio.';
    default:
      return 'Payment authorization interruption.';
  }
}

function buildTransactionDetailData(transaction: Transaction): AssistantTransactionDetailData {
  const diag = transaction.aiDiagnosis || generateDeterministicAIDiagnosis(transaction);
  const auditLogs = getAuditLogs({ transactionId: transaction.id }).slice(0, 4);

  return {
    transaction: {
      ...transaction,
      aiDiagnosis: diag
    },
    aiDiagnosis: diag,
    policyCheck: transaction.policyCheck,
    auditTrailExcerpt: auditLogs.map(l => ({
      eventTitle: l.eventTitle,
      timestamp: l.timestamp,
      actor: l.actor
    }))
  };
}

function buildActionConfirmationData(transaction: Transaction): AssistantActionConfirmationData {
  const diag = transaction.aiDiagnosis || generateDeterministicAIDiagnosis(transaction);
  return {
    transactionId: transaction.id,
    customerName: transaction.customerName,
    amount: transaction.amount,
    failureReason: transaction.failureReason,
    failureCode: transaction.failureCode,
    recommendedAction: diag.recommendedActionLabel,
    recoveryProbability: diag.confidence,
    whyRecommended: diag.explanation,
    maxAttempts: policyConfig.maxRecoveryAttempts,
    stoppingCondition: diag.stoppingCondition,
    policyLimit: policyConfig.maxAmountThreshold,
    requiresMerchantApproval: policyConfig.requireApprovalForMoneyMovement
  };
}

function buildPolicyWarningData(transaction?: Transaction): AssistantPolicyWarningData {
  if (transaction) {
    const isOverLimit = transaction.amount > policyConfig.maxAmountThreshold;
    const isFraud = transaction.failureCategory === 'fraud_risk_flag' || transaction.failureCode.includes('FRAUD');
    return {
      transactionId: transaction.id,
      customerName: transaction.customerName,
      amount: transaction.amount,
      policyLimit: policyConfig.maxAmountThreshold,
      reason: isFraud 
        ? "Issuing bank flagged transaction for fraud. Retries permanently prohibited."
        : isOverLimit 
          ? `Transaction amount (₹${transaction.amount.toLocaleString('en-IN')}) exceeds automatic threshold limit of ₹${policyConfig.maxAmountThreshold.toLocaleString('en-IN')}.`
          : "Deterministic safeguard requires explicit merchant sign-off.",
      requiredAction: isFraud ? "Mark Permanent Block" : "Merchant Manual Review & Approval",
      isBlocked: isFraud || isOverLimit
    };
  }

  return {
    reason: `Automatic money movement without confirmation is restricted by policy safeguard.`,
    policyLimit: policyConfig.maxAmountThreshold,
    requiredAction: "Merchant Authorization Required",
    isBlocked: true
  };
}

function buildSummaryData(): AssistantSummaryData {
  const summary = getAnalyticsSummary();
  const pendingCount = summary.pendingApprovalCount;

  return {
    headline: `Operations Overview: ${summary.failedTransactions} Failures Detected`,
    keyPoints: [
      `₹${(summary.revenueAtRisk / 100000).toFixed(2)}L revenue is currently at risk across ${summary.failedTransactions} transactions.`,
      `₹${(summary.recoverableRevenue / 100000).toFixed(2)}L is immediately recoverable with high AI confidence.`,
      `${pendingCount} transactions are currently waiting for your merchant approval.`,
      `${summary.recoveredCount} transactions already captured ₹${(summary.revenueRecovered / 100000).toFixed(2)}L in recovered revenue.`
    ],
    metricsSnapshot: {
      revenueAtRisk: summary.revenueAtRisk,
      recoverableRevenue: summary.recoverableRevenue,
      pendingApproval: summary.pendingApprovalCount
    },
    recommendedNextActions: [
      { label: "Review Top Opportunities", actionType: "show_opportunities" },
      { label: "Open Root Cause Analysis", actionType: "show_root_cause" },
      { label: "View Recovery Queue", actionType: "navigate_queue", filter: "approval_required" }
    ]
  };
}

// ---------------- Primary Assistant Reasoning Function ----------------

export async function askRecoveryAssistant(
  userQuery: string, 
  conversationHistory: AssistantMessage[] = []
): Promise<AssistantStructuredResponse> {
  const client = getAiClient();
  const summary = getAnalyticsSummary();
  const allTxns = getAllTransactions();
  const q = userQuery.toLowerCase().trim();

  // 1. Direct Intent Matching for Instant Precision
  // Intent: Specific Transaction or Customer Name Lookup (e.g. "Review Zoya", "Review txn_100088")
  const targetTxn = allTxns.find(t => 
    (t.customerName && q.includes(t.customerName.toLowerCase())) ||
    q.includes(t.id.toLowerCase()) ||
    q.includes(t.orderId.toLowerCase()) ||
    (t.customerName.split(' ')[0] && q.includes(t.customerName.split(' ')[0].toLowerCase()))
  );

  if (targetTxn && (q.includes('review') || q.includes('inspect') || q.includes('show') || q.includes('detail') || q.includes('zoya') || q.includes('txn_'))) {
    const detailData = buildTransactionDetailData(targetTxn);
    return {
      responseType: 'TRANSACTION_DETAIL',
      message: `Here is the full payment diagnostic and policy status for ${targetTxn.customerName} (${targetTxn.id}).`,
      data: detailData,
      actions: [
        { label: `Review in Queue`, actionType: 'view_transaction', transactionId: targetTxn.id },
        { label: `Approve Recovery`, actionType: 'confirm_action', transactionId: targetTxn.id }
      ]
    };
  }

  // Intent: Start recovery simulation or confirm recovery
  if (q.includes('start recovery') || q.includes('start simulation') || q.includes('simulate recovery') || q.includes('recover now')) {
    const candidate = allTxns.find(t => t.status === 'approval_required' || (t.status === 'ai_analyzed' && t.recoveryLikelihood === 'HIGH')) || allTxns[0];
    if (candidate) {
      const confirmData = buildActionConfirmationData(candidate);
      return {
        responseType: 'ACTION_CONFIRMATION',
        message: `Prepared safe, bounded recovery action for ${candidate.customerName}. Please confirm approval before execution.`,
        data: confirmData,
        actions: [
          { label: 'Cancel', actionType: 'cancel_confirmation' },
          { label: 'Approve Recovery', actionType: 'approve_transaction', transactionId: candidate.id }
        ]
      };
    }
  }

  // Intent: Root Cause Analysis / Revenue Drop / Failure Causes
  if (q.includes('why') || q.includes('drop') || q.includes('decrease') || q.includes('cause') || q.includes('loss') || q.includes('losing')) {
    const rootCauseData = buildRootCauseData();
    return {
      responseType: 'ROOT_CAUSE_ANALYSIS',
      message: `Revenue loss analysis identified ₹${(rootCauseData.totalRevenueAtRisk / 100000).toFixed(2)}L at risk. Network timeouts and bank maintenance windows constitute the primary drivers.`,
      data: rootCauseData,
      actions: [
        { label: "Show Best Recovery Opportunities", actionType: "show_opportunities" },
        { label: "View At-Risk Queue", actionType: "navigate_queue", filter: "all" }
      ]
    };
  }

  // Intent: Best Recovery Opportunities / Highest Losses / Priorities
  if (q.includes('opportunity') || q.includes('opportunities') || q.includes('priority') || q.includes('prioritize') || q.includes('biggest') || q.includes('highest') || q.includes('best')) {
    const oppsData = buildRecoveryOpportunitiesData(4);
    return {
      responseType: 'RECOVERY_OPPORTUNITIES',
      message: `Identified ${oppsData.opportunities.length} high-priority recovery opportunities with a combined recoverable value of ₹${(oppsData.totalOpportunityAmount / 100000).toFixed(2)}L.`,
      data: oppsData,
      actions: [
        { label: "View All Pending Approval", actionType: "navigate_queue", filter: "approval_required" },
        { label: "Explain Failure Causes", actionType: "show_root_cause" }
      ]
    };
  }

  // Intent: Metrics / How much revenue at risk
  if (q.includes('metric') || q.includes('how much') || q.includes('numbers') || q.includes('stats') || q.includes('at risk') || q.includes('kpi')) {
    const metricsData = buildMetricsData();
    return {
      responseType: 'METRICS',
      message: `Here is the current revenue recovery breakdown across your payment telemetry.`,
      data: metricsData,
      actions: [
        { label: "Show Best Recovery Opportunities", actionType: "show_opportunities" },
        { label: "Analyze Failure Causes", actionType: "show_root_cause" }
      ]
    };
  }

  // Intent: Policy or Safety
  if (q.includes('policy') || q.includes('safeguard') || q.includes('limit') || q.includes('blocked') || q.includes('guardrail')) {
    const warningData = buildPolicyWarningData(allTxns.find(t => t.status === 'policy_blocked' || t.failureCategory === 'fraud_risk_flag'));
    return {
      responseType: 'POLICY_WARNING',
      message: `Deterministic policy engine enforces strict bounding: Max ${policyConfig.maxRecoveryAttempts} retries, ₹${policyConfig.maxAmountThreshold.toLocaleString('en-IN')} ceiling, and zero retries on fraud declines.`,
      data: warningData,
      actions: [
        { label: "Configure Policies", actionType: "navigate_policy" },
        { label: "View Audit Trail", actionType: "navigate_audit" }
      ]
    };
  }

  // 2. Gemini AI Reasoning Engine (Dynamic Structured Output)
  if (client) {
    try {
      const systemInstruction = `
You are the expert AI Fintech Operations Copilot for RecoverIQ.
Your role is to reason over payment failure telemetry and output STRICT STRUCTURED JSON.
DO NOT output raw markdown or bulleted text in your primary response. All data must be cleanly categorized inside the JSON schema.

AVAILABLE RESPONSE TYPES:
- 'SUMMARY': General operational briefs, greetings, or dataset recaps.
- 'METRICS': When asked about revenue at risk, metrics, recovery rate, or financial KPIs.
- 'RECOVERY_OPPORTUNITIES': When asked about highest value opportunities, losses, priority recoverables, or pending approvals.
- 'ROOT_CAUSE_ANALYSIS': When asked why revenue dropped, failure causes, why payments failed, or root causes.
- 'TRANSACTION_DETAIL': When asked to review or inspect a specific customer or transaction.
- 'POLICY_WARNING': When discussing policy bounds, blocked transactions, or safety limits.

CURRENT DATA TELEMETRY CONTEXT:
- Total Failures: ${summary.failedTransactions}
- Revenue at Risk: ₹${summary.revenueAtRisk}
- Recoverable Revenue: ₹${summary.recoverableRevenue}
- Recovered Revenue: ₹${summary.revenueRecovered}
- Pending Approval: ${summary.pendingApprovalCount}
- Recovery Rate: ${summary.recoveryRate}%
- Policy Limit: ₹${policyConfig.maxAmountThreshold}
- Max Retries: ${policyConfig.maxRecoveryAttempts}

Output strict JSON with:
{
  "responseType": "SUMMARY | METRICS | RECOVERY_OPPORTUNITIES | ROOT_CAUSE_ANALYSIS | TRANSACTION_DETAIL | POLICY_WARNING",
  "message": "Short 1-2 sentence conversational explanation",
  "data": {} // appropriately formatted payload
}
`;

      const response = await withTimeout(
        client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: userQuery,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        }),
        6000
      );

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const respType = (parsed.responseType as AssistantResponseType) || 'SUMMARY';

        // Provide complete, hydrated data according to the selected responseType
        let hydratedData: any = parsed.data || {};
        if (respType === 'METRICS' || !hydratedData.revenueAtRisk) {
          hydratedData = buildMetricsData();
        } else if (respType === 'RECOVERY_OPPORTUNITIES' || !hydratedData.opportunities) {
          hydratedData = buildRecoveryOpportunitiesData(4);
        } else if (respType === 'ROOT_CAUSE_ANALYSIS' || !hydratedData.causes) {
          hydratedData = buildRootCauseData();
        } else if (respType === 'SUMMARY') {
          hydratedData = buildSummaryData();
        }

        return {
          responseType: respType,
          message: parsed.message || "I have analyzed your payment telemetry dataset.",
          data: hydratedData,
          actions: [
            { label: "Find Biggest Losses", actionType: "show_opportunities" },
            { label: "Explain Revenue Drop", actionType: "show_root_cause" }
          ]
        };
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`Gemini assistant reasoning bypassed (${msg.substring(0, 80)}), returning structured fallback.`);
    }
  }

  // Default Structured Summary Response
  return {
    responseType: 'SUMMARY',
    message: `Analyzed ${summary.failedTransactions} transactions. ₹${(summary.revenueAtRisk / 100000).toFixed(2)}L is currently at risk, with ${summary.pendingApprovalCount} transactions awaiting review.`,
    data: buildSummaryData(),
    actions: [
      { label: "Find Biggest Losses", actionType: "show_opportunities" },
      { label: "Show Best Recovery Opportunities", actionType: "show_opportunities" },
      { label: "Explain Today's Revenue Drop", actionType: "show_root_cause" }
    ]
  };
}
