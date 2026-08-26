import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Layers, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  RotateCcw,
  ArrowUpDown,
  Play,
  Zap,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Transaction, TransactionStatus, FailureCategory, PaymentMethod, RecoveryLikelihood } from '../types.ts';
import { formatINR, formatTimeAgo, getCategoryLabel, getPaymentMethodLabel, getStatusBadgeStyle, getTierBadge } from '../utils/formatters.ts';
import { EmptyState, TableRowSkeleton, CopyableBadge } from './CommonUI.tsx';

interface RecoveryQueueProps {
  transactions: Transaction[];
  onSelectTransaction: (id: string) => void;
  onApproveTransaction: (id: string) => void;
  onSimulatePayment: (id: string) => void;
  onDiagnoseTransaction: (id: string) => void;
  onBatchApprove: (ids: string[]) => void;
  onBatchDiagnose: (ids: string[]) => void;
  onBatchSimulateRecover: (ids: string[]) => void;
  isProcessingId?: string;
  initialFilter?: string;
}

export const RecoveryQueue: React.FC<RecoveryQueueProps> = ({
  transactions,
  onSelectTransaction,
  onApproveTransaction,
  onSimulatePayment,
  onDiagnoseTransaction,
  onBatchApprove,
  onBatchDiagnose,
  onBatchSimulateRecover,
  isProcessingId,
  initialFilter
}) => {
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedLikelihood, setSelectedLikelihood] = useState<string>('all');
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'timestamp' | 'amount' | 'recoveryScore'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const txList = Array.isArray(transactions) ? transactions : [];

  const counts = useMemo(() => {
    return {
      all: txList.length,
      approval_required: txList.filter(t => t.status === 'approval_required').length,
      in_recovery: txList.filter(t => t.status === 'in_recovery').length,
      recovered: txList.filter(t => t.status === 'recovered').length,
      ai_analyzed: txList.filter(t => t.status === 'ai_analyzed').length,
      failed: txList.filter(t => t.status === 'failed').length,
      permanently_failed: txList.filter(t => t.status === 'permanently_failed' || t.status === 'policy_blocked').length
    };
  }, [txList]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...txList];

    // Status Tab Filter
    if (selectedStatusTab !== 'all') {
      if (selectedStatusTab === 'permanently_failed') {
        list = list.filter(t => t.status === 'permanently_failed' || t.status === 'policy_blocked');
      } else {
        list = list.filter(t => t.status === selectedStatusTab);
      }
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(t => t.failureCategory === selectedCategory);
    }

    // Payment Method Filter
    if (selectedMethod !== 'all') {
      list = list.filter(t => t.paymentMethod === selectedMethod);
    }

    // Recovery Likelihood Filter
    if (selectedLikelihood !== 'all') {
      list = list.filter(t => t.recoveryLikelihood === selectedLikelihood);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.customerName.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.orderId.toLowerCase().includes(q) ||
        t.failureReason.toLowerCase().includes(q) ||
        t.failureCode.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'timestamp') {
        diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'amount') {
        diff = a.amount - b.amount;
      } else if (sortBy === 'recoveryScore') {
        diff = a.recoveryScore - b.recoveryScore;
      }
      return sortOrder === 'desc' ? -diff : diff;
    });

    return list;
  }, [txList, selectedStatusTab, selectedCategory, selectedMethod, selectedLikelihood, searchQuery, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selected value sum
  const selectedTotalAmount = useMemo(() => {
    return txList
      .filter(t => selectedTxnIds.includes(t.id))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [txList, selectedTxnIds]);

  const handleResetFilters = () => {
    setSelectedStatusTab('all');
    setSelectedCategory('all');
    setSelectedMethod('all');
    setSelectedLikelihood('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleToggleSelectAll = () => {
    if (selectedTxnIds.length === paginatedTransactions.length && paginatedTransactions.length > 0) {
      setSelectedTxnIds([]);
    } else {
      setSelectedTxnIds(paginatedTransactions.map(t => t.id));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTxnIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isFilterActive = selectedStatusTab !== 'all' || selectedCategory !== 'all' || selectedMethod !== 'all' || selectedLikelihood !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-4">
      {/* Title & Batch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Recovery Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredTransactions.length} of {txList.length} Transactions
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage failed payment interventions, approve AI recovery recommendations, and dispatch Razorpay links.
          </p>
        </div>

        {/* Selected Batch Actions Bar */}
        {selectedTxnIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs shadow-lg animate-fadeIn border border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <span>{selectedTxnIds.length} Selected</span>
              <span className="text-emerald-400 font-bold">({formatINR(selectedTotalAmount)})</span>
            </div>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button
              onClick={() => {
                onBatchApprove(selectedTxnIds);
                setSelectedTxnIds([]);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>
            <button
              onClick={() => {
                onBatchDiagnose(selectedTxnIds);
                setSelectedTxnIds([]);
              }}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Diagnose</span>
            </button>
            <button
              onClick={() => {
                onBatchSimulateRecover(selectedTxnIds);
                setSelectedTxnIds([]);
              }}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Settle</span>
            </button>
            <button
              onClick={() => setSelectedTxnIds([])}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 text-xs rounded hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        {[
          { id: 'all', label: 'All Transactions', count: counts.all },
          { id: 'approval_required', label: 'Awaiting Approval', count: counts.approval_required, color: 'text-amber-800 bg-amber-50 border-amber-200' },
          { id: 'in_recovery', label: 'In Recovery', count: counts.in_recovery, color: 'text-blue-800 bg-blue-50 border-blue-200' },
          { id: 'recovered', label: 'Recovered (Settled)', count: counts.recovered, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
          { id: 'ai_analyzed', label: 'AI Diagnosed', count: counts.ai_analyzed, color: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
          { id: 'failed', label: 'New Failures', count: counts.failed, color: 'text-rose-800 bg-rose-50 border-rose-200' },
          { id: 'permanently_failed', label: 'Declined / Blocked', count: counts.permanently_failed, color: 'text-slate-700 bg-slate-100 border-slate-200' }
        ].map(tab => {
          const isActive = selectedStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedStatusTab(tab.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap border ${
                isActive 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-slate-700 text-white' : (tab.color || 'bg-slate-100 text-slate-700')
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer, email, txn ID, order ID, failure reason..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:bg-white text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Categories</option>
              <option value="bank_downtime">Bank Downtime</option>
              <option value="authentication_3ds">3DS Authentication</option>
              <option value="insufficient_funds">Insufficient Balance</option>
              <option value="card_expired">Expired Card</option>
              <option value="network_timeout">Network Timeout</option>
              <option value="mandate_issue">Mandate Issue</option>
              <option value="fraud_risk_flag">Fraud Risk / Decline</option>
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Method:</span>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Methods</option>
              <option value="upi">UPI / QR</option>
              <option value="card_credit">Credit Card</option>
              <option value="card_debit">Debit Card</option>
              <option value="netbanking">Net Banking</option>
              <option value="wallet">Wallet</option>
              <option value="mandate">e-Mandate</option>
            </select>
          </div>

          {/* Recovery Likelihood */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Likelihood:</span>
            <select
              value={selectedLikelihood}
              onChange={(e) => {
                setSelectedLikelihood(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Likelihood</option>
              <option value="HIGH">High (75%+)</option>
              <option value="MEDIUM">Medium (45-74%)</option>
              <option value="LOW">Low (1-44%)</option>
              <option value="NONE">None (0%)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Sort:</span>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_') as [any, any];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="timestamp_desc">Newest First</option>
              <option value="timestamp_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
              <option value="recoveryScore_desc">Highest Score</option>
            </select>
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
              title="Reset all active filters"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <EmptyState
            title="No Transactions Match Filters"
            description={
              isFilterActive 
                ? "No payment records match your specific combination of filters and search keywords."
                : "The recovery queue is currently empty."
            }
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
            filterActive={true}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <button 
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {selectedTxnIds.length > 0 && selectedTxnIds.length === paginatedTransactions.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Transaction</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Failure Reason</th>
                  <th className="py-3 px-3">AI Score</th>
                  <th className="py-3 px-3">AI Strategy</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map(txn => {
                  const badge = getStatusBadgeStyle(txn.status);
                  const tierStyle = getTierBadge(txn.customerTier);
                  const isSelected = selectedTxnIds.includes(txn.id);
                  const isBusy = isProcessingId === txn.id;
                  const initials = txn.customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                  return (
                    <tr
                      key={txn.id}
                      onClick={() => onSelectTransaction(txn.id)}
                      className={`hover:bg-slate-50/90 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3" onClick={(e) => handleToggleSelectOne(txn.id, e)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                        )}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{txn.customerName}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${tierStyle.bg} ${tierStyle.text}`}>
                                {txn.customerTier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[130px]">{txn.customerEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Transaction IDs */}
                      <td className="py-3 px-3">
                        <CopyableBadge text={txn.id} className="text-slate-700 font-semibold" />
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{txn.orderId}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(txn.timestamp)}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{formatINR(txn.amount)}</div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{getPaymentMethodLabel(txn.paymentMethod)}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[110px]">{txn.bankName || txn.cardNetwork || 'Standard Rail'}</div>
                      </td>

                      {/* Failure Reason */}
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="font-medium text-slate-800 truncate" title={txn.failureReason}>
                          {txn.failureReason}
                        </div>
                        <div className="text-[10px] text-rose-600 font-mono flex items-center gap-1">
                          <span>{txn.failureCode}</span>
                          <span>({getCategoryLabel(txn.failureCategory)})</span>
                        </div>
                      </td>

                      {/* Recovery Score */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            txn.recoveryScore >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            txn.recoveryScore >= 45 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {txn.recoveryScore}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">{txn.recoveryLikelihood}</span>
                        </div>
                      </td>

                      {/* AI Recommendation */}
                      <td className="py-3 px-3 max-w-[180px]">
                        {txn.aiDiagnosis ? (
                          <div>
                            <div className="font-semibold text-indigo-900 text-[11px] truncate flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{txn.aiDiagnosis.recommendedActionLabel}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {txn.aiDiagnosis.confidence}% AI Confidence
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending Diagnosis</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span className="whitespace-nowrap">{badge.label}</span>
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {txn.status === 'approval_required' || (txn.status === 'ai_analyzed' && txn.recoveryLikelihood === 'HIGH') ? (
                          <button
                            onClick={() => onApproveTransaction(txn.id)}
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs transition-colors whitespace-nowrap"
                          >
                            Approve
                          </button>
                        ) : txn.status === 'in_recovery' ? (
                          <button
                            onClick={() => onSimulatePayment(txn.id)}
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-xs transition-colors whitespace-nowrap flex items-center gap-1 ml-auto"
                            title="Simulate customer paying Razorpay link"
                          >
                            <Play className="w-3 h-3" />
                            <span>Simulate</span>
                          </button>
                        ) : txn.status === 'failed' ? (
                          <button
                            onClick={() => onDiagnoseTransaction(txn.id)}
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs transition-colors whitespace-nowrap flex items-center gap-1 ml-auto"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Diagnose</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectTransaction(txn.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors whitespace-nowrap"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredTransactions.length > 0 && (
          <div className="bg-slate-50/80 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</strong> of <strong>{filteredTransactions.length}</strong> transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 shadow-xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
