import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

import { 
  getAllTransactions, 
  getTransactionById, 
  updateTransaction, 
  getAnalyticsSummary, 
  getAuditLogs, 
  policyConfig, 
  updatePolicyConfig, 
  generateSyntheticDataset,
  addAuditEvent
} from "./server/dataStore.ts";
import { diagnoseTransactionWithGemini, askRecoveryAssistant } from "./server/geminiService.ts";
import { 
  executeRecoveryWorkflow, 
  simulateCustomerPaymentCompletion, 
  getRazorpayStatus,
  processRazorpayWebhookEvent 
} from "./server/razorpayService.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      service: "RecoverIQ Revenue Recovery Engine",
      timestamp: new Date().toISOString() 
    });
  });

  // Razorpay Config / Health Status
  const handleRazorpayStatus = (req: express.Request, res: express.Response) => {
    res.json(getRazorpayStatus());
  };
  app.get("/api/razorpay/config", handleRazorpayStatus);
  app.get("/api/razorpay/status", handleRazorpayStatus);

  // Get Transactions (with filtering & search)
  app.get("/api/transactions", (req, res) => {
    const { status, category, method, likelihood, search } = req.query;
    const items = getAllTransactions({
      status: status as string,
      category: category as string,
      method: method as string,
      likelihood: likelihood as string,
      search: search as string
    });
    res.json({ transactions: items, count: items.length });
  });

  // Get Transaction by ID
  app.get("/api/transactions/:id", (req, res) => {
    const txn = getTransactionById(req.params.id);
    if (!txn) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ transaction: txn });
  });

  // Trigger Gemini AI Diagnosis on single transaction
  app.post("/api/transactions/:id/diagnose", async (req, res) => {
    const txn = getTransactionById(req.params.id);
    if (!txn) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    try {
      const diagnosis = await diagnoseTransactionWithGemini(txn);
      
      const updated = updateTransaction(txn.id, (t) => ({
        ...t,
        status: t.status === 'failed' ? 'approval_required' : t.status,
        recoveryScore: diagnosis.confidence,
        recoveryLikelihood: diagnosis.likelihood,
        aiDiagnosis: diagnosis
      }));

      addAuditEvent({
        transactionId: txn.id,
        customerName: txn.customerName,
        amount: txn.amount,
        eventType: 'ai_analysis',
        eventTitle: `Gemini AI Diagnostic Generated (${diagnosis.likelihood} - ${diagnosis.confidence}%)`,
        description: `Diagnosed root cause: "${diagnosis.rootCause.substring(0, 80)}...". Recommended: ${diagnosis.recommendedActionLabel}`,
        actor: 'GEMINI_AI',
        status: 'info',
        metadata: { likelihood: diagnosis.likelihood, confidence: diagnosis.confidence, action: diagnosis.recommendedAction }
      });

      res.json({ success: true, transaction: updated });
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      res.status(500).json({ error: "Diagnosis failed", details: err.message });
    }
  });

  // Batch Gemini AI Diagnosis
  app.post("/api/transactions/batch-diagnose", async (req, res) => {
    const { transactionIds, ids } = req.body;
    const targetIds = Array.isArray(transactionIds) ? transactionIds : (Array.isArray(ids) ? ids : []);
    const all = getAllTransactions();
    const targetTxns = targetIds.length > 0
      ? all.filter(t => targetIds.includes(t.id))
      : all.filter(t => t.status === 'failed' || !t.aiDiagnosis);

    const results = [];
    for (const txn of targetTxns.slice(0, 15)) { // batch limit per request
      const diagnosis = await diagnoseTransactionWithGemini(txn);
      const updated = updateTransaction(txn.id, (t) => ({
        ...t,
        status: t.status === 'failed' ? 'approval_required' : t.status,
        recoveryScore: diagnosis.confidence,
        recoveryLikelihood: diagnosis.likelihood,
        aiDiagnosis: diagnosis
      }));
      results.push(updated);
    }

    res.json({ success: true, diagnosedCount: results.length, transactions: results });
  });

  // Merchant Approval & Recovery Execution via Razorpay
  app.post("/api/transactions/:id/approve", async (req, res) => {
    const { actor } = req.body;
    const result = await executeRecoveryWorkflow(req.params.id, actor || "Merchant Admin");
    if (!result.success) {
      return res.status(400).json({ error: result.error, transaction: result.transaction });
    }
    res.json({ success: true, transaction: result.transaction, recoveryAction: result.transaction?.recoveryAction });
  });

  // Merchant Rejection / Permanent Mark
  app.post("/api/transactions/:id/reject", (req, res) => {
    const { reason, actor } = req.body;
    const txn = getTransactionById(req.params.id);
    if (!txn) return res.status(404).json({ error: "Transaction not found" });

    const updated = updateTransaction(txn.id, (t) => ({
      ...t,
      status: 'permanently_failed',
      policyCheck: {
        passed: false,
        violations: [reason || 'Merchant manually rejected recovery and marked as non-recoverable'],
        requiresApproval: true,
        maxAttemptsAllowed: policyConfig.maxRecoveryAttempts,
        currentAttempts: t.failureDetails.attemptsCount,
        amountThreshold: policyConfig.maxAmountThreshold,
        isPermanentlyFailed: true,
        timestamp: new Date().toISOString()
      }
    }));

    addAuditEvent({
      transactionId: txn.id,
      customerName: txn.customerName,
      amount: txn.amount,
      eventType: 'merchant_rejection',
      eventTitle: 'Merchant Rejected Recovery Action',
      description: `${actor || 'Merchant Admin'} rejected recovery: "${reason || 'Marked non-recoverable'}"`,
      actor: 'MERCHANT',
      status: 'warning',
      metadata: { reason }
    });

    res.json({ success: true, transaction: updated });
  });

  // Simulate Customer Payment (Instant Settlement Callback)
  app.post("/api/transactions/:id/simulate-payment", async (req, res) => {
    const { method } = req.body;
    const result = await simulateCustomerPaymentCompletion(req.params.id, method || "UPI (Google Pay / PhonePe)");
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, transaction: result.transaction });
  });

  // Batch Approval
  app.post("/api/transactions/batch-approve", async (req, res) => {
    const { transactionIds, ids, actor } = req.body;
    const targetIds = Array.isArray(transactionIds) ? transactionIds : (Array.isArray(ids) ? ids : []);
    const all = getAllTransactions();
    const targets = targetIds.length > 0
      ? all.filter(t => targetIds.includes(t.id) && t.status !== 'recovered' && t.status !== 'permanently_failed')
      : all.filter(t => t.status === 'approval_required' || (t.status === 'ai_analyzed' && t.recoveryLikelihood === 'HIGH'));

    const processed = [];
    for (const t of targets.slice(0, 20)) {
      const outcome = await executeRecoveryWorkflow(t.id, actor || "Merchant Batch System");
      if (outcome.success && outcome.transaction) {
        processed.push(outcome.transaction);
      }
    }

    res.json({ success: true, approvedCount: processed.length, transactions: processed });
  });

  // Batch Simulate Recoveries (simulate settlement for all in_recovery)
  app.post("/api/transactions/batch-recover", async (req, res) => {
    const { transactionIds, ids } = req.body;
    const targetIds = Array.isArray(transactionIds) ? transactionIds : (Array.isArray(ids) ? ids : []);
    const all = getAllTransactions();
    const inRecov = targetIds.length > 0
      ? all.filter(t => targetIds.includes(t.id) && t.status === 'in_recovery')
      : all.filter(t => t.status === 'in_recovery');

    const recovered = [];
    for (const t of inRecov.slice(0, 15)) {
      const outcome = await simulateCustomerPaymentCompletion(t.id, "Razorpay 1-Click Pay Link");
      if (outcome.success && outcome.transaction) {
        recovered.push(outcome.transaction);
      }
    }

    res.json({ success: true, recoveredCount: recovered.length, transactions: recovered });
  });

  // Analytics
  app.get("/api/analytics", (req, res) => {
    res.json({ analytics: getAnalyticsSummary() });
  });

  // Audit Trail & Logs Handler
  const handleAuditLogs = (req: express.Request, res: express.Response) => {
    const { transactionId, actor, eventType } = req.query;
    const logs = getAuditLogs({
      transactionId: transactionId as string,
      actor: actor as string,
      eventType: eventType as string
    });
    res.json({ auditLogs: logs, count: logs.length });
  };
  app.get("/api/audit-trail", handleAuditLogs);
  app.get("/api/audit-logs", handleAuditLogs);

  // Policy Config Handlers
  const handleGetPolicy = (req: express.Request, res: express.Response) => {
    res.json({ policyConfig });
  };
  const handleUpdatePolicyReq = (req: express.Request, res: express.Response) => {
    const updated = updatePolicyConfig(req.body);
    addAuditEvent({
      transactionId: 'GLOBAL_CONFIG',
      customerName: 'System Settings',
      amount: 0,
      eventType: 'policy_evaluated',
      eventTitle: 'Merchant Policy Configuration Updated',
      description: `Updated recovery policy: Max attempts = ${updated.maxRecoveryAttempts}, Threshold = ₹${updated.maxAmountThreshold.toLocaleString('en-IN')}`,
      actor: 'MERCHANT',
      status: 'info',
      metadata: updated
    });
    res.json({ success: true, policyConfig: updated });
  };
  app.get("/api/policy-config", handleGetPolicy);
  app.get("/api/policy", handleGetPolicy);
  app.post("/api/policy-config", handleUpdatePolicyReq);
  app.put("/api/policy", handleUpdatePolicyReq);
  app.post("/api/policy", handleUpdatePolicyReq);

  // AI Conversational Recovery Assistant
  app.post("/api/assistant/chat", async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const response = await askRecoveryAssistant(message, history || []);
      res.json(response);
    } catch (err: any) {
      console.error("Assistant chat error:", err);
      res.status(500).json({ error: "Assistant request failed", details: err.message });
    }
  });

  // Reseed Dataset Handler
  const handleReseed = (req: express.Request, res: express.Response) => {
    const count = Number(req.body?.count) || 125;
    const scenario = String(req.body?.scenario || 'balanced');
    generateSyntheticDataset(count, scenario);
    res.json({ 
      success: true, 
      message: `Successfully reseeded dataset with ${count} synthetic transactions under '${scenario}' scenario (Razorpay Test Mode).` 
    });
  };
  app.post("/api/transactions/reset", handleReseed);
  app.post("/api/reseed", handleReseed);

  // Razorpay Webhook Simulation & Ingestion Endpoint
  app.post("/api/webhook/razorpay", async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string | undefined;
      const rawText = JSON.stringify(req.body);
      const result = await processRazorpayWebhookEvent(req.body, signature, rawText);
      res.json(result);
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ success: false, error: "Internal webhook handler error", details: err.message });
    }
  });

  // Vite middleware for development & static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RecoverIQ Server listening on port ${PORT}`);
  });
}

startServer();
