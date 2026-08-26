import { 
  Transaction, 
  AuditEvent, 
  MerchantPolicyConfig, 
  AnalyticsSummary, 
  FailureCategory, 
  PaymentMethod, 
  CustomerTier,
  TransactionStatus,
  RecoveryLikelihood,
  RecommendedActionType,
  PolicyCheckResult
} from '../src/types.ts';

// Default Merchant Policy Configuration
export let policyConfig: MerchantPolicyConfig = {
  maxRecoveryAttempts: 2,
  maxAmountThreshold: 200000, // ₹2,00,000 (~$2,400)
  requireApprovalForMoneyMovement: true,
  blockPermanentlyFailed: true,
  autoSendPaymentLinksOnApproval: true,
  allowDiscountIncentives: true,
  maxDiscountPercent: 5
};

export function evaluateTransactionPolicy(
  transaction: Transaction,
  config: MerchantPolicyConfig = policyConfig
): PolicyCheckResult {
  const isPermanent = 
    transaction.failureCategory === 'fraud_risk_flag' || 
    transaction.failureCode.includes('STOLEN') || 
    transaction.failureCode.includes('FRAUD') ||
    transaction.failureCode.includes('LOST_CARD') ||
    transaction.failureCode.includes('PICKUP_CARD');

  const attempts = transaction.failureDetails?.attemptsCount || 0;
  const isAmountExceeded = transaction.amount > config.maxAmountThreshold;
  const isAttemptsExceeded = attempts >= config.maxRecoveryAttempts;
  const violations: string[] = [];

  if (isPermanent && config.blockPermanentlyFailed) {
    violations.push('Permanently declined: Instrument flagged for fraud/compromise (Zero Tolerance Guard)');
  }
  if (isAmountExceeded) {
    violations.push(`Amount ₹${transaction.amount.toLocaleString('en-IN')} exceeds threshold ceiling ₹${config.maxAmountThreshold.toLocaleString('en-IN')}`);
  }
  if (isAttemptsExceeded) {
    violations.push(`Max retry attempts exhausted (${attempts} of allowed ${config.maxRecoveryAttempts})`);
  }

  const passed = violations.length === 0;

  return {
    passed,
    violations,
    requiresApproval: config.requireApprovalForMoneyMovement,
    maxAttemptsAllowed: config.maxRecoveryAttempts,
    currentAttempts: attempts,
    amountThreshold: config.maxAmountThreshold,
    isPermanentlyFailed: isPermanent,
    timestamp: new Date().toISOString()
  };
}

export function updatePolicyConfig(newConfig: Partial<MerchantPolicyConfig>): MerchantPolicyConfig {
  policyConfig = { ...policyConfig, ...newConfig };
  
  // Dynamically re-evaluate policy checks across all transactions
  transactions = transactions.map(t => {
    const updatedCheck = evaluateTransactionPolicy(t, policyConfig);
    let updatedStatus = t.status;

    if (t.status === 'policy_blocked' && updatedCheck.passed) {
      updatedStatus = 'approval_required';
    } else if (!updatedCheck.passed && t.status !== 'recovered' && t.status !== 'in_recovery') {
      updatedStatus = updatedCheck.isPermanentlyFailed ? 'permanently_failed' : 'policy_blocked';
    }

    return {
      ...t,
      policyCheck: updatedCheck,
      status: updatedStatus
    };
  });

  return policyConfig;
}

// In-Memory Storage
let transactions: Transaction[] = [];
let auditLogs: AuditEvent[] = [];

// Realistic Synthetic Data Generator
const CUSTOMER_NAMES = [
  'Rahul Sharma', 'Priya Patel', 'Ananya Iyer', 'Vikram Malhotra', 'Siddharth Rao',
  'Deepika Sen', 'Aarav Mehta', 'Sneha Kulkarni', 'Rohan Gupta', 'Kavita Nair',
  'Aditya Deshmukh', 'Pooja Verma', 'Manish Bansal', 'Neha Kapoor', 'Arjun Saxena',
  'Divya Menon', 'Rajesh Singhania', 'Meera Joshi', 'Kunal Trivedi', 'Shreya Agarwal',
  'Varun Khanna', 'Tanvi Bhat', 'Nikhil Reddy', 'Ritu Choudhury', 'Gaurav Jain',
  'Ishaan Mukherjee', 'Swati Hegde', 'Harish Chandra', 'Zoya Khan', 'Kabir Bedi'
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank'];
const CARD_NETWORKS = ['VISA', 'Mastercard', 'RuPay', 'Amex'];

const FAILURE_TEMPLATES: Array<{
  category: FailureCategory;
  code: string;
  reason: string;
  errorDescription: string;
  defaultLikelihood: RecoveryLikelihood;
  scoreBase: number;
  recommendedAction: RecommendedActionType;
  actionLabel: string;
  stoppingCondition: string;
  rootCauseTemplate: (t: any) => string;
  explanationTemplate: (t: any) => string;
}> = [
  {
    category: 'bank_downtime',
    code: 'GATEWAY_ERROR_ISSUER_DOWN',
    reason: 'Issuer Bank core banking system is temporarily experiencing downtime',
    errorDescription: 'The issuing bank server returned 504 Gateway Timeout during UPI/Netbanking processing.',
    defaultLikelihood: 'HIGH',
    scoreBase: 88,
    recommendedAction: 'smart_retry_alternate_gateway',
    actionLabel: 'Smart Retry via Secondary Gateway / UPI Rail',
    stoppingCondition: 'Max 2 attempts, stop immediately once bank confirms 200 OK',
    rootCauseTemplate: (t) => `Transient core-banking network failure at ${t.bankName || 'Issuer Bank'}. Customer intent was genuine with valid credentials.`,
    explanationTemplate: (t) => `Issuer bank health telemetry indicates temporary degradation resolved. Retrying automatically or sending instant 1-click Razorpay payment link has 92% historical recovery rate.`
  },
  {
    category: 'authentication_3ds',
    code: 'PAYMENT_AUTHENTICATION_FAILED',
    reason: '3D Secure OTP authentication timed out or canceled by user on phone',
    errorDescription: 'Customer did not enter the OTP within 180s on the bank ACS page.',
    defaultLikelihood: 'HIGH',
    scoreBase: 84,
    recommendedAction: 'create_razorpay_payment_link',
    actionLabel: 'Issue Razorpay 1-Click Pay Link (WhatsApp + Email)',
    stoppingCondition: 'Link expires in 4 hours; stop retries if paid or customer cancels',
    rootCauseTemplate: (t) => `Friction during 3DS OTP verification on mobile device. High customer LTV (₹${t.customerLtv.toLocaleString('en-IN')}) indicates strong purchase intent.`,
    explanationTemplate: (t) => `Sending an optimized Razorpay payment link directly to customer's WhatsApp (+91 ${t.customerPhone}) allows frictionless checkout with prefilled UPI/Card intent.`
  },
  {
    category: 'insufficient_funds',
    code: 'INSUFFICIENT_FUNDS_BALANCE',
    reason: 'Transaction declined due to insufficient balance in primary account',
    errorDescription: 'Decline code 51: Not sufficient funds in customer debit/checking account.',
    defaultLikelihood: 'MEDIUM',
    scoreBase: 65,
    recommendedAction: 'delayed_retry_salaried_window',
    actionLabel: 'Schedule Delayed Retry / Request Split Payment',
    stoppingCondition: 'Retry once on next calendar business morning; stop if balance low',
    rootCauseTemplate: (t) => `Temporary liquidity shortfall for amount ₹${t.amount.toLocaleString('en-IN')}. Historical loyalty shows 94% on-time settlement.`,
    explanationTemplate: (t) => `Customer frequently transacts around month-end. Prompting with alternative payment method (Credit Card / EMI) or scheduling morning retry captures recovery.`
  },
  {
    category: 'card_expired',
    code: 'CARD_EXPIRED_OR_REISSUED',
    reason: 'Stored card credential expired or replaced by issuing bank',
    errorDescription: 'Expiry MM/YY is invalid or tokenized network mandate expired.',
    defaultLikelihood: 'HIGH',
    scoreBase: 78,
    recommendedAction: 'request_alternative_payment_method',
    actionLabel: 'Prompt Customer for Updated Card / UPI Mandate',
    stoppingCondition: 'Send 1 update reminder; stop if customer removes billing method',
    rootCauseTemplate: (t) => `Tokenized card expired in previous billing cycle. Recurring subscription mandate was interrupted.`,
    explanationTemplate: (t) => `Customer has active subscription status. A secure Razorpay card update link will seamlessly re-tokenize without subscription cancellation.`
  },
  {
    category: 'network_timeout',
    code: 'TRANSACTION_TIMEOUT_NETWORK',
    reason: 'Network handshake dropped during payment gateway authorization',
    errorDescription: 'TCP connection reset between payment aggregator and merchant switch.',
    defaultLikelihood: 'HIGH',
    scoreBase: 91,
    recommendedAction: 'smart_retry_alternate_gateway',
    actionLabel: 'Instant Route Switch & Re-query',
    stoppingCondition: 'Query Razorpay order status first to prevent double debit; retry once',
    rootCauseTemplate: (t) => `Packet loss on mobile network during webhook roundtrip. No financial debit occurred on customer side.`,
    explanationTemplate: (t) => `Safe to retry immediately on alternate low-latency node. Zero risk of duplicate charge.`
  },
  {
    category: 'mandate_issue',
    code: 'E_MANDATE_EXECUTION_LIMIT',
    reason: 'Recurring e-mandate daily transaction limit exceeded',
    errorDescription: 'Decline code 93: Bank mandate limit ceiling of ₹15,000 reached for today.',
    defaultLikelihood: 'MEDIUM',
    scoreBase: 60,
    recommendedAction: 'create_razorpay_payment_link',
    actionLabel: 'Generate One-Time Ad-Hoc Razorpay Invoice Link',
    stoppingCondition: 'One-time payment link; do not trigger automated mandate retry today',
    rootCauseTemplate: (t) => `Transaction amount of ₹${t.amount.toLocaleString('en-IN')} exceeded recurring auto-debit cap set by RBI mandate guidelines.`,
    explanationTemplate: (t) => `Issuing a direct one-time Razorpay payment link bypasses the recurring auto-debit cap safely with full merchant compliance.`
  },
  {
    category: 'fraud_risk_flag',
    code: 'HARD_DECLINE_STOLEN_CARD',
    reason: 'Permanent bank decline: Card flagged as lost/stolen or fraudulent',
    errorDescription: 'Decline code 04 / 43: Pick up card / fraudulent account indicator.',
    defaultLikelihood: 'NONE',
    scoreBase: 8,
    recommendedAction: 'mark_permanent_decline',
    actionLabel: 'Permanent Block & Do Not Retry (Policy Guard)',
    stoppingCondition: 'Hard permanent stop. Never retry.',
    rootCauseTemplate: (t) => `Bank anti-fraud filter raised permanent security block. Hard card decline.`,
    explanationTemplate: (t) => `Deterministic policy strictly forbids retrying permanently failed / fraud-flagged transactions to protect merchant chargeback ratio and gateway compliance.`
  }
];

// Dataset Generation & Metadata State
let currentDatasetMetadata = {
  isSynthetic: true,
  batchSize: 125,
  scenario: 'balanced',
  scenarioLabel: 'Standard Production Mix (125 Synthetic Records)',
  datasetGeneratedAt: new Date().toISOString(),
  environment: 'Razorpay Test Mode (Simulated Sandbox)',
  disclaimer: 'All transaction records, customer personas, card tokens, and bank responses are synthetic test-mode artifacts for demonstration and verification.'
};

export function generateSyntheticDataset(count: number = 125, scenario: string = 'balanced'): void {
  transactions = [];
  auditLogs = [];

  const now = Date.now();
  const paymentMethods: PaymentMethod[] = ['upi', 'card_credit', 'card_debit', 'netbanking', 'wallet', 'mandate'];
  const tiers: CustomerTier[] = ['Starter', 'Growth', 'Enterprise', 'VIP'];

  let scenarioLabel = 'Standard Production Mix';
  if (scenario === 'upi_spike') scenarioLabel = 'Diwali / Flash Sale UPI Traffic Spike';
  else if (scenario === 'bank_outage') scenarioLabel = 'Major Bank Core Outage Cascade';
  else if (scenario === 'mandate_wave') scenarioLabel = 'SaaS Subscription Renewal Wave';
  else if (scenario === 'enterprise_stress') scenarioLabel = 'High-Value Enterprise B2B Stress Test';

  currentDatasetMetadata = {
    isSynthetic: true,
    batchSize: count,
    scenario,
    scenarioLabel: `${scenarioLabel} (${count} Synthetic Records)`,
    datasetGeneratedAt: new Date().toISOString(),
    environment: 'Razorpay Test Mode (Simulated Sandbox)',
    disclaimer: 'All transaction records, customer personas, card tokens, and bank responses are synthetic test-mode artifacts for demonstration and verification.'
  };

  for (let i = 0; i < count; i++) {
    const custName = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length] + (i >= CUSTOMER_NAMES.length ? ` ${Math.floor(i / CUSTOMER_NAMES.length) + 1}` : '');
    const cleanName = custName.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const customerEmail = `${cleanName}@example.com`;
    const customerPhone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const ltv = tier === 'VIP' ? 120000 + Math.floor(Math.random() * 350000)
              : tier === 'Enterprise' ? 80000 + Math.floor(Math.random() * 150000)
              : tier === 'Growth' ? 25000 + Math.floor(Math.random() * 60000)
              : 5000 + Math.floor(Math.random() * 20000);

    let method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const bank = BANKS[Math.floor(Math.random() * BANKS.length)];
    const cardNet = CARD_NETWORKS[Math.floor(Math.random() * CARD_NETWORKS.length)];

    // Failure template selection based on scenario
    let failureTemplate = FAILURE_TEMPLATES[i % 6];
    if (scenario === 'upi_spike') {
      method = (i % 5 === 0) ? 'card_credit' : 'upi';
      failureTemplate = (i % 3 === 0) ? FAILURE_TEMPLATES[1] : (i % 3 === 1) ? FAILURE_TEMPLATES[4] : FAILURE_TEMPLATES[0];
    } else if (scenario === 'bank_outage') {
      failureTemplate = (i % 2 === 0) ? FAILURE_TEMPLATES[0] : (i % 4 === 1) ? FAILURE_TEMPLATES[4] : FAILURE_TEMPLATES[i % 6];
    } else if (scenario === 'mandate_wave') {
      method = (i % 2 === 0) ? 'mandate' : 'card_credit';
      failureTemplate = (i % 2 === 0) ? FAILURE_TEMPLATES[5] : FAILURE_TEMPLATES[3];
    } else {
      // Balanced standard
      if (i % 14 === 0) {
        failureTemplate = FAILURE_TEMPLATES[6]; // Hard fraud/stolen card ~7%
      } else {
        failureTemplate = FAILURE_TEMPLATES[i % 6];
      }
    }

    // Amount distribution
    let amount = 1499;
    const amtRoll = Math.random();
    if (scenario === 'enterprise_stress') {
      amount = Math.round((45000 + Math.random() * 220000) / 500) * 500;
    } else if (amtRoll < 0.4) {
      amount = Math.round((499 + Math.random() * 3500) / 10) * 10;
    } else if (amtRoll < 0.8) {
      amount = Math.round((3500 + Math.random() * 21500) / 50) * 50;
    } else {
      amount = Math.round((22000 + Math.random() * 75000) / 100) * 100;
    }

    // Time offset over past 7 days
    const hoursAgo = Math.floor(Math.random() * (7 * 24));
    const txnDate = new Date(now - hoursAgo * 3600 * 1000 - Math.floor(Math.random() * 3600 * 1000));
    const timestamp = txnDate.toISOString();

    const txnId = `txn_${100000 + i}`;
    const orderId = `order_RCV_${700000 + i}`;

    const scoreNoise = Math.floor(Math.random() * 11) - 5;
    const recoveryScore = Math.max(0, Math.min(99, failureTemplate.scoreBase + scoreNoise));
    const likelihood: RecoveryLikelihood = recoveryScore >= 75 ? 'HIGH' : recoveryScore >= 45 ? 'MEDIUM' : recoveryScore > 15 ? 'LOW' : 'NONE';

    // Status distribution across dataset:
    // Some are newly failed, some AI analyzed, some waiting approval, some recovered, some permanently failed
    let status: TransactionStatus = 'failed';
    const isPermanent = failureTemplate.category === 'fraud_risk_flag';

    if (isPermanent) {
      status = i % 2 === 0 ? 'permanently_failed' : 'policy_blocked';
    } else {
      const statusRoll = i % 5;
      if (statusRoll === 0) status = 'failed';
      else if (statusRoll === 1) status = 'ai_analyzed';
      else if (statusRoll === 2) status = 'approval_required';
      else if (statusRoll === 3) status = 'in_recovery';
      else status = 'recovered';
    }

    const currentAttempts = status === 'recovered' ? 1 : status === 'in_recovery' ? 1 : status === 'permanently_failed' ? 2 : 1;

    const baseTxn: Transaction = {
      id: txnId,
      orderId,
      customerId: `cust_${20000 + (i % 40)}`,
      customerName: custName,
      customerEmail,
      customerPhone,
      customerTier: tier,
      customerLtv: ltv,
      amount,
      currency: 'INR',
      paymentMethod: method,
      bankName: bank,
      cardNetwork: method.includes('card') ? cardNet : undefined,
      vpa: method === 'upi' ? `${cleanName.split('.')[0]}@okhdfcbank` : undefined,
      timestamp,
      failureCode: failureTemplate.code,
      failureReason: failureTemplate.reason,
      failureCategory: failureTemplate.category,
      failureDetails: {
        gatewayResponseCode: failureTemplate.code,
        errorDescription: failureTemplate.errorDescription,
        rawError: JSON.stringify({
          error: {
            code: failureTemplate.code,
            description: failureTemplate.errorDescription,
            source: 'gateway',
            step: 'payment_authorization',
            reason: failureTemplate.reason
          }
        }),
        attemptsCount: currentAttempts,
        maxAttempts: policyConfig.maxRecoveryAttempts
      },
      status,
      recoveryScore,
      recoveryLikelihood: likelihood,
      paymentHistory: [
        {
          id: `hist_init_${txnId}`,
          timestamp,
          event: 'Initial Payment Attempt',
          gatewayStatus: 'FAILED',
          details: `Declined with code ${failureTemplate.code}: ${failureTemplate.reason}`,
          paymentId: `pay_test_${Math.random().toString(36).substring(2, 10)}`
        }
      ]
    };

    // Attach AI Diagnosis
    const aiDiag = {
      rootCause: failureTemplate.rootCauseTemplate(baseTxn),
      confidence: Math.min(98, 70 + Math.floor(Math.random() * 26)),
      likelihood,
      factors: [
        `Historical Customer LTV is high (₹${ltv.toLocaleString('en-IN')})`,
        `Payment Method: ${method.toUpperCase()} with ${bank}`,
        `Failure Category: ${failureTemplate.category.replace('_', ' ').toUpperCase()}`,
        `Attempts so far: ${currentAttempts} of ${policyConfig.maxRecoveryAttempts}`
      ],
      recommendedAction: failureTemplate.recommendedAction,
      recommendedActionLabel: failureTemplate.actionLabel,
      explanation: failureTemplate.explanationTemplate(baseTxn),
      customerMessageDraft: `Hi ${custName.split(' ')[0]}, your payment of ₹${amount.toLocaleString('en-IN')} for Order #${orderId.replace('order_', '')} couldn't be completed due to ${failureTemplate.category.replace('_', ' ')}. Tap here to complete securely with 1-click Razorpay: https://rzp.io/i/test_${txnId.replace('txn_', '')}`,
      stoppingCondition: failureTemplate.stoppingCondition,
      suggestedDiscountBps: tier === 'VIP' || tier === 'Enterprise' ? 300 : 0,
      analyzedAt: new Date(txnDate.getTime() + 120000).toISOString(),
      modelUsed: 'gemini-3.7-flash'
    };

    baseTxn.aiDiagnosis = aiDiag;

    // Attach Policy Check
    const isAmountExceeded = amount > policyConfig.maxAmountThreshold;
    const isAttemptsExceeded = currentAttempts > policyConfig.maxRecoveryAttempts;
    const violations: string[] = [];

    if (isPermanent) violations.push('Permanently declined payment method flagged for fraud/lost card');
    if (isAmountExceeded) violations.push(`Amount ₹${amount.toLocaleString('en-IN')} exceeds threshold ₹${policyConfig.maxAmountThreshold.toLocaleString('en-IN')}`);
    if (isAttemptsExceeded) violations.push(`Max retry attempts (${policyConfig.maxRecoveryAttempts}) exceeded`);

    const policyPassed = violations.length === 0;

    baseTxn.policyCheck = {
      passed: policyPassed,
      violations,
      requiresApproval: policyConfig.requireApprovalForMoneyMovement,
      maxAttemptsAllowed: policyConfig.maxRecoveryAttempts,
      currentAttempts,
      amountThreshold: policyConfig.maxAmountThreshold,
      isPermanentlyFailed: isPermanent,
      timestamp: new Date(txnDate.getTime() + 180000).toISOString()
    };

    // Attach Recovery Action Details for in_recovery and recovered states
    if (status === 'in_recovery' || status === 'recovered') {
      const pLinkId = `plink_test_${Math.random().toString(36).substring(2, 11)}`;
      baseTxn.recoveryAction = {
        actionType: failureTemplate.recommendedAction,
        approvedBy: 'Merchant Admin (Dashboard)',
        approvedAt: new Date(txnDate.getTime() + 300000).toISOString(),
        razorpayPaymentLinkId: pLinkId,
        razorpayPaymentLinkUrl: `https://rzp.io/i/${pLinkId}`,
        razorpayPaymentId: status === 'recovered' ? `pay_rcv_${Math.random().toString(36).substring(2, 10)}` : undefined,
        executedAt: new Date(txnDate.getTime() + 310000).toISOString(),
        status: status === 'recovered' ? 'success' : 'executing',
        recoveredAt: status === 'recovered' ? new Date(txnDate.getTime() + 1800000).toISOString() : undefined,
        recoveredAmount: status === 'recovered' ? amount : undefined
      };

      if (status === 'recovered') {
        baseTxn.paymentHistory.push({
          id: `hist_rcv_${txnId}`,
          timestamp: new Date(txnDate.getTime() + 1800000).toISOString(),
          event: 'Razorpay Payment Link Settled (Recovered)',
          gatewayStatus: 'CAPTURED',
          details: `Customer completed payment via Razorpay Payment Link (${pLinkId}). Revenue recovered: ₹${amount.toLocaleString('en-IN')}`,
          paymentId: baseTxn.recoveryAction.razorpayPaymentId
        });
      } else {
        baseTxn.paymentHistory.push({
          id: `hist_exec_${txnId}`,
          timestamp: new Date(txnDate.getTime() + 310000).toISOString(),
          event: 'Razorpay Payment Link Dispatched',
          gatewayStatus: 'LINK_ISSUED',
          details: `Test payment link ${pLinkId} sent to ${customerPhone} (WhatsApp) & ${customerEmail}`,
          paymentId: undefined
        });
      }
    }

    transactions.push(baseTxn);

    // Initial Audit logs for seed data
    auditLogs.push({
      id: `audit_fail_${txnId}`,
      transactionId: txnId,
      customerName: custName,
      amount,
      eventType: 'failure_detected',
      eventTitle: `Payment Failure Detected: ${failureTemplate.code}`,
      description: `Payment of ₹${amount.toLocaleString('en-IN')} failed for customer ${custName} on method ${method}. Gateway code: ${failureTemplate.code}`,
      actor: 'SYSTEM',
      timestamp,
      status: 'warning',
      metadata: { gatewayResponseCode: failureTemplate.code, amount, customerTier: tier }
    });

    if (baseTxn.aiDiagnosis) {
      auditLogs.push({
        id: `audit_ai_${txnId}`,
        transactionId: txnId,
        customerName: custName,
        amount,
        eventType: 'ai_analysis',
        eventTitle: `Gemini AI Diagnostic Computed (${recoveryScore}% Likelihood)`,
        description: `Diagnosed root cause: "${failureTemplate.reason}". Recommended: ${failureTemplate.actionLabel}`,
        actor: 'GEMINI_AI',
        timestamp: baseTxn.aiDiagnosis.analyzedAt,
        status: 'info',
        metadata: { likelihood, recoveryScore, recommendedAction: failureTemplate.recommendedAction }
      });
    }

    if (baseTxn.policyCheck) {
      auditLogs.push({
        id: `audit_pol_${txnId}`,
        transactionId: txnId,
        customerName: custName,
        amount,
        eventType: 'policy_evaluated',
        eventTitle: `Policy Guard Check: ${policyPassed ? 'PASSED' : 'BLOCKED'}`,
        description: policyPassed 
          ? `Validated against limits: Under ₹${policyConfig.maxAmountThreshold.toLocaleString('en-IN')}, max attempts ${policyConfig.maxRecoveryAttempts}, non-fraud.` 
          : `Blocked: ${violations.join('; ')}`,
        actor: 'POLICY_ENGINE',
        timestamp: baseTxn.policyCheck.timestamp,
        status: policyPassed ? 'success' : 'error',
        metadata: { passed: policyPassed, violations }
      });
    }

    if (baseTxn.recoveryAction?.approvedAt) {
      auditLogs.push({
        id: `audit_appr_${txnId}`,
        transactionId: txnId,
        customerName: custName,
        amount,
        eventType: 'merchant_approval',
        eventTitle: 'Merchant Approved Recovery Action',
        description: `Merchant authorized execution of "${failureTemplate.actionLabel}" via Razorpay Test Mode.`,
        actor: 'MERCHANT',
        timestamp: baseTxn.recoveryAction.approvedAt,
        status: 'success',
        metadata: { approvedBy: baseTxn.recoveryAction.approvedBy }
      });

      auditLogs.push({
        id: `audit_rzp_${txnId}`,
        transactionId: txnId,
        customerName: custName,
        amount,
        eventType: 'payment_link_created',
        eventTitle: 'Razorpay Test Payment Link Created',
        description: `Generated Razorpay Payment Link ${baseTxn.recoveryAction.razorpayPaymentLinkId} (Amount: ₹${amount.toLocaleString('en-IN')}).`,
        actor: 'RAZORPAY_GATEWAY',
        timestamp: baseTxn.recoveryAction.executedAt || timestamp,
        status: 'info',
        metadata: { linkId: baseTxn.recoveryAction.razorpayPaymentLinkId, url: baseTxn.recoveryAction.razorpayPaymentLinkUrl }
      });
    }

    if (status === 'recovered' && baseTxn.recoveryAction?.recoveredAt) {
      auditLogs.push({
        id: `audit_rcv_${txnId}`,
        transactionId: txnId,
        customerName: custName,
        amount,
        eventType: 'recovery_success',
        eventTitle: 'Revenue Successfully Recovered!',
        description: `Customer completed payment of ₹${amount.toLocaleString('en-IN')}. Razorpay Payment ID: ${baseTxn.recoveryAction.razorpayPaymentId}`,
        actor: 'RAZORPAY_GATEWAY',
        timestamp: baseTxn.recoveryAction.recoveredAt,
        status: 'success',
        metadata: { paymentId: baseTxn.recoveryAction.razorpayPaymentId, recoveredAmount: amount }
      });
    }
  }

  // Sort audit logs chronologically descending
  auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Initial seed on module load
generateSyntheticDataset(125);

// Storage Access Methods
export function getAllTransactions(filters?: {
  status?: string;
  category?: string;
  method?: string;
  search?: string;
  likelihood?: string;
}): Transaction[] {
  let result = [...transactions];

  if (filters?.status && filters.status !== 'all') {
    result = result.filter(t => t.status === filters.status);
  }

  if (filters?.category && filters.category !== 'all') {
    result = result.filter(t => t.failureCategory === filters.category);
  }

  if (filters?.method && filters.method !== 'all') {
    result = result.filter(t => t.paymentMethod === filters.method);
  }

  if (filters?.likelihood && filters.likelihood !== 'all') {
    result = result.filter(t => t.recoveryLikelihood === filters.likelihood);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(t => 
      t.customerName.toLowerCase().includes(q) ||
      t.customerEmail.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.orderId.toLowerCase().includes(q) ||
      t.failureReason.toLowerCase().includes(q)
    );
  }

  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getTransactionById(id: string): Transaction | undefined {
  return transactions.find(t => t.id === id);
}

export function updateTransaction(id: string, updater: (t: Transaction) => Transaction): Transaction | undefined {
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return undefined;
  transactions[index] = updater({ ...transactions[index] });
  return transactions[index];
}

export function addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const newEvent: AuditEvent = {
    ...event,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(newEvent);
  return newEvent;
}

export function getAuditLogs(filter?: { transactionId?: string; actor?: string; eventType?: string }): AuditEvent[] {
  let logs = [...auditLogs];
  if (filter?.transactionId) {
    logs = logs.filter(l => l.transactionId === filter.transactionId);
  }
  if (filter?.actor && filter.actor !== 'all') {
    logs = logs.filter(l => l.actor === filter.actor);
  }
  if (filter?.eventType && filter.eventType !== 'all') {
    logs = logs.filter(l => l.eventType === filter.eventType);
  }
  return logs;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const totalTransactions = transactions.length;
  const failedTransactions = transactions.filter(t => t.status !== 'recovered').length;
  const eligibleOpportunities = transactions.filter(t => 
    t.status !== 'permanently_failed' && 
    t.status !== 'policy_blocked' && 
    t.recoveryLikelihood !== 'NONE'
  ).length;

  const pendingApprovalCount = transactions.filter(t => t.status === 'approval_required' || t.status === 'ai_analyzed').length;
  const inRecoveryCount = transactions.filter(t => t.status === 'in_recovery').length;
  const recoveredCount = transactions.filter(t => t.status === 'recovered').length;
  const permanentlyFailedCount = transactions.filter(t => t.status === 'permanently_failed').length;
  const policyBlockedCount = transactions.filter(t => t.status === 'policy_blocked').length;

  const revenueAtRisk = transactions
    .filter(t => t.status !== 'recovered')
    .reduce((sum, t) => sum + t.amount, 0);

  const revenueRecovered = transactions
    .filter(t => t.status === 'recovered')
    .reduce((sum, t) => sum + (t.recoveryAction?.recoveredAmount || t.amount), 0);

  const recoverableRevenue = transactions
    .filter(t => t.status !== 'recovered' && t.recoveryLikelihood !== 'NONE' && t.status !== 'permanently_failed' && t.status !== 'policy_blocked')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalClosed = recoveredCount + permanentlyFailedCount + policyBlockedCount;
  const recoveryRate = totalClosed > 0 
    ? Math.round((recoveredCount / (recoveredCount + permanentlyFailedCount + policyBlockedCount)) * 100)
    : 0;

  // Category breakdown
  const catMap: Record<FailureCategory, { label: string; count: number; amount: number; recoveredCount: number; recoveredAmount: number }> = {
    bank_downtime: { label: 'Bank Core Downtime', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    authentication_3ds: { label: '3DS OTP Authentication', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    insufficient_funds: { label: 'Insufficient Funds', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    card_expired: { label: 'Expired / Changed Card', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    network_timeout: { label: 'Network Timeout / Drop', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    mandate_issue: { label: 'e-Mandate Limit Cap', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    fraud_risk_flag: { label: 'Fraud / Stolen Card (Hard Decline)', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 }
  };

  transactions.forEach(t => {
    if (catMap[t.failureCategory]) {
      catMap[t.failureCategory].count += 1;
      catMap[t.failureCategory].amount += t.amount;
      if (t.status === 'recovered') {
        catMap[t.failureCategory].recoveredCount += 1;
        catMap[t.failureCategory].recoveredAmount += (t.recoveryAction?.recoveredAmount || t.amount);
      }
    }
  });

  const categoryDistribution = (Object.keys(catMap) as FailureCategory[]).map(cat => {
    const data = catMap[cat];
    return {
      category: cat,
      label: data.label,
      count: data.count,
      amount: data.amount,
      recoveredCount: data.recoveredCount,
      recoveredAmount: data.recoveredAmount,
      recoveryRate: data.count > 0 ? Math.round((data.recoveredCount / data.count) * 100) : 0
    };
  });

  // Method breakdown
  const methodMap: Record<PaymentMethod, { label: string; count: number; amount: number; recoveredAmount: number; recoveredCount: number }> = {
    upi: { label: 'UPI / QR', count: 0, amount: 0, recoveredAmount: 0, recoveredCount: 0 },
    card_credit: { label: 'Credit Card', count: 0, amount: 0, recoveredAmount: 0, recoveredCount: 0 },
    card_debit: { label: 'Debit Card', count: 0, amount: 0, recoveredAmount: 0, recoveredCount: 0 },
    netbanking: { label: 'Net Banking', count: 0, amount: 0, recoveredAmount: 0, recoveredCount: 0 },
    wallet: { label: 'Prepaid Wallet', count: 0, amount: 0, recoveredAmount: 0, recoveredCount: 0 },
    mandate: { label: 'e-Mandate / Recurring', count: 0, amount: 0, recoveredAmount: 0, recoveredCount: 0 }
  };

  transactions.forEach(t => {
    if (methodMap[t.paymentMethod]) {
      methodMap[t.paymentMethod].count += 1;
      methodMap[t.paymentMethod].amount += t.amount;
      if (t.status === 'recovered') {
        methodMap[t.paymentMethod].recoveredCount += 1;
        methodMap[t.paymentMethod].recoveredAmount += (t.recoveryAction?.recoveredAmount || t.amount);
      }
    }
  });

  const methodDistribution = (Object.keys(methodMap) as PaymentMethod[]).map(m => {
    const data = methodMap[m];
    return {
      method: m,
      label: data.label,
      count: data.count,
      amount: data.amount,
      recoveredAmount: data.recoveredAmount,
      recoveryRate: data.count > 0 ? Math.round((data.recoveredCount / data.count) * 100) : 0
    };
  });

  // Trend Data (past 7 days)
  const trendMap: Record<string, { failedAmount: number; recoveredAmount: number; recoveriesCount: number; failuresCount: number }> = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();

  for (let d = 6; d >= 0; d--) {
    const dateObj = new Date(now.getTime() - d * 86400000);
    const key = `${dayNames[dateObj.getDay()]} (${dateObj.getMonth() + 1}/${dateObj.getDate()})`;
    trendMap[key] = { failedAmount: 0, recoveredAmount: 0, recoveriesCount: 0, failuresCount: 0 };
  }

  transactions.forEach(t => {
    const d = new Date(t.timestamp);
    const key = `${dayNames[d.getDay()]} (${d.getMonth() + 1}/${d.getDate()})`;
    if (trendMap[key]) {
      trendMap[key].failedAmount += t.amount;
      trendMap[key].failuresCount += 1;
      if (t.status === 'recovered') {
        trendMap[key].recoveredAmount += (t.recoveryAction?.recoveredAmount || t.amount);
        trendMap[key].recoveriesCount += 1;
      }
    }
  });

  const trendData = Object.keys(trendMap).map(k => ({
    date: k,
    failedAmount: trendMap[k].failedAmount,
    recoveredAmount: trendMap[k].recoveredAmount,
    recoveriesCount: trendMap[k].recoveriesCount,
    failuresCount: trendMap[k].failuresCount
  }));

  // Customer Tier Cohort breakdown
  const tierMap: Record<CustomerTier, { label: string; count: number; amount: number; recoveredCount: number; recoveredAmount: number; ltvSum: number }> = {
    VIP: { label: 'VIP Priority', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0, ltvSum: 0 },
    Enterprise: { label: 'Enterprise Accounts', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0, ltvSum: 0 },
    Growth: { label: 'Growth Mid-Market', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0, ltvSum: 0 },
    Starter: { label: 'Starter / Standard', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0, ltvSum: 0 }
  };

  transactions.forEach(t => {
    const tTier = t.customerTier || 'Starter';
    if (tierMap[tTier]) {
      tierMap[tTier].count += 1;
      tierMap[tTier].amount += t.amount;
      tierMap[tTier].ltvSum += (t.customerLtv || 0);
      if (t.status === 'recovered') {
        tierMap[tTier].recoveredCount += 1;
        tierMap[tTier].recoveredAmount += (t.recoveryAction?.recoveredAmount || t.amount);
      }
    }
  });

  const tierDistribution = (Object.keys(tierMap) as CustomerTier[]).map(tier => {
    const d = tierMap[tier];
    const avgLtv = d.count > 0 ? Math.round(d.ltvSum / d.count) : 0;
    const ltvPreserved = d.recoveredCount * avgLtv;
    return {
      tier,
      label: d.label,
      count: d.count,
      amount: d.amount,
      recoveredCount: d.recoveredCount,
      recoveredAmount: d.recoveredAmount,
      recoveryRate: d.count > 0 ? Math.round((d.recoveredCount / d.count) * 100) : 0,
      ltvPreserved
    };
  });

  // Action Channel Distribution
  const channelMap: Record<RecommendedActionType, { label: string; count: number; amount: number; recoveredCount: number; recoveredAmount: number }> = {
    create_razorpay_payment_link: { label: 'Razorpay 1-Click Pay Links', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    smart_retry_alternate_gateway: { label: 'Smart Retry / Alternate Gateway', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    request_alternative_payment_method: { label: 'Payment Method Update Prompt', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    delayed_retry_salaried_window: { label: 'Delayed Salaried Window Retry', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    escalate_merchant_concierge: { label: 'VIP Merchant Concierge', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 },
    mark_permanent_decline: { label: 'Zero-Tolerance Fraud Hard Block', count: 0, amount: 0, recoveredCount: 0, recoveredAmount: 0 }
  };

  transactions.forEach(t => {
    const action = t.aiDiagnosis?.recommendedAction || (t.failureCategory === 'fraud_risk_flag' ? 'mark_permanent_decline' : 'create_razorpay_payment_link');
    if (channelMap[action]) {
      channelMap[action].count += 1;
      channelMap[action].amount += t.amount;
      if (t.status === 'recovered') {
        channelMap[action].recoveredCount += 1;
        channelMap[action].recoveredAmount += (t.recoveryAction?.recoveredAmount || t.amount);
      }
    }
  });

  const channelDistribution = (Object.keys(channelMap) as RecommendedActionType[]).map(a => {
    const c = channelMap[a];
    return {
      actionType: a,
      label: c.label,
      count: c.count,
      amount: c.amount,
      recoveredCount: c.recoveredCount,
      recoveredAmount: c.recoveredAmount,
      conversionRate: c.count > 0 ? Math.round((c.recoveredCount / c.count) * 100) : 0
    };
  });

  // Time-to-Recovery Distribution
  const timeDistribution = [
    { rangeLabel: '< 15 mins (Instant Pay Link / Auto Retry)', count: Math.round(recoveredCount * 0.42), recoveredAmount: Math.round(revenueRecovered * 0.38), percentage: 42 },
    { rangeLabel: '15 - 60 mins (Customer Mobile Checkout)', count: Math.round(recoveredCount * 0.35), recoveredAmount: Math.round(revenueRecovered * 0.36), percentage: 35 },
    { rangeLabel: '1 - 4 hours (WhatsApp Reminder Window)', count: Math.round(recoveredCount * 0.16), recoveredAmount: Math.round(revenueRecovered * 0.18), percentage: 16 },
    { rangeLabel: '4 - 24 hours (Delayed Salaried Retry)', count: Math.max(0, recoveredCount - Math.round(recoveredCount * 0.93)), recoveredAmount: Math.round(revenueRecovered * 0.08), percentage: 7 }
  ];

  // Policy Guard Compliance
  const fraudTxns = transactions.filter(t => t.failureCategory === 'fraud_risk_flag');
  const fraudBlockedCount = fraudTxns.filter(t => t.status === 'permanently_failed' || t.status === 'policy_blocked').length;
  const fraudPreventedRiskAmount = fraudTxns.reduce((s, t) => s + t.amount, 0);
  const thresholdGatedCount = transactions.filter(t => t.amount > policyConfig.maxAmountThreshold).length;
  const retryLimitsEnforcedCount = transactions.filter(t => (t.failureDetails?.attemptsCount || 0) >= policyConfig.maxRecoveryAttempts).length;
  const autoApprovalSafetyRatio = totalTransactions > 0 ? Math.round(((totalTransactions - fraudBlockedCount) / totalTransactions) * 100) : 100;

  // ROI multiplier: Recovered revenue / estimated recovered agent cost
  const estimatedCost = Math.max(500, transactions.length * 4.5);
  const roiMultiplier = estimatedCost > 0 ? Math.round((revenueRecovered / estimatedCost) * 10) / 10 : 0;

  return {
    totalTransactions,
    failedTransactions,
    eligibleOpportunities,
    pendingApprovalCount,
    inRecoveryCount,
    recoveredCount,
    permanentlyFailedCount,
    policyBlockedCount,
    revenueAtRisk,
    revenueRecovered,
    recoverableRevenue,
    recoveryRate,
    roiMultiplier,
    averageRecoveryTimeMinutes: 34,
    syntheticMetadata: currentDatasetMetadata,
    tierDistribution,
    channelDistribution,
    timeDistribution,
    policySafetyMetrics: {
      zeroToleranceFraudBlockRate: 100,
      fraudBlockedCount,
      fraudPreventedRiskAmount,
      thresholdGatedCount,
      retryLimitsEnforcedCount,
      autoApprovalSafetyRatio
    },
    categoryDistribution,
    methodDistribution,
    trendData
  };
}
