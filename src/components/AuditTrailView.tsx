import React, { useState, useMemo } from 'react';
import { 
  ListTree, 
  Search, 
  Filter, 
  ShieldCheck, 
  Sparkles, 
  User, 
  CreditCard, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  RotateCcw
} from 'lucide-react';
import { AuditEvent, AuditActor, AuditEventType } from '../types.ts';
import { formatINR, formatDate, formatTimeAgo } from '../utils/formatters.ts';

interface AuditTrailViewProps {
  auditLogs: AuditEvent[];
  onSelectTransaction: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  auditLogs,
  onSelectTransaction,
  onRefresh,
  isLoading
}) => {
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);

  const filteredLogs = useMemo(() => {
    let list = [...auditLogs];

    if (selectedActor !== 'all') {
      list = list.filter(l => l.actor === selectedActor);
    }

    if (selectedEventType !== 'all') {
      list = list.filter(l => l.eventType === selectedEventType);
    }

    if (selectedStatusFilter === 'issues') {
      list = list.filter(l => l.status === 'error' || l.status === 'warning');
    } else if (selectedStatusFilter === 'success') {
      list = list.filter(l => l.status === 'success');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l => 
        l.transactionId.toLowerCase().includes(q) ||
        l.customerName.toLowerCase().includes(q) ||
        l.eventTitle.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [auditLogs, selectedActor, selectedEventType, selectedStatusFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSelectedActor('all');
    setSelectedEventType('all');
    setSelectedStatusFilter('all');
    setSearchQuery('');
  };

  const exportAuditLogsAsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `recoveriq_audit_trail_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAuditLogsAsCSV = () => {
    const headers = ["Timestamp", "TransactionID", "Customer", "Amount", "Actor", "EventType", "Status", "Title", "Description"];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.transactionId,
      `"${(l.customerName || '').replace(/"/g, '""')}"`,
      l.amount,
      l.actor,
      l.eventType,
      l.status,
      `"${(l.eventTitle || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `recoveriq_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActorBadge = (actor: AuditActor) => {
    switch (actor) {
      case 'GEMINI_AI':
        return { label: 'Gemini AI', icon: Sparkles, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'POLICY_ENGINE':
        return { label: 'Policy Guard', icon: ShieldCheck, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'MERCHANT':
        return { label: 'Merchant Admin', icon: User, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'RAZORPAY_GATEWAY':
        return { label: 'Razorpay Gateway', icon: CreditCard, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SYSTEM':
      default:
        return { label: 'System Core', icon: Cpu, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const hasActiveFilters = selectedActor !== 'all' || selectedEventType !== 'all' || selectedStatusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Immutable Audit Trail</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
              {filteredLogs.length} Events
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete chronological event log tracking failure detection, AI reasoning, deterministic policy evaluations, approvals, and Razorpay settlements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export options */}
          <button
            onClick={exportAuditLogsAsCSV}
            title="Download CSV report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
        <button
          onClick={() => { setSelectedActor('all'); setSelectedEventType('all'); setSelectedStatusFilter('all'); }}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            !hasActiveFilters
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Activity
        </button>

        <button
          onClick={() => { setSelectedActor('GEMINI_AI'); setSelectedEventType('all'); }}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1 ${
            selectedActor === 'GEMINI_AI'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Gemini AI</span>
        </button>

        <button
          onClick={() => { setSelectedActor('POLICY_ENGINE'); setSelectedEventType('all'); }}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1 ${
            selectedActor === 'POLICY_ENGINE'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Policy Guard</span>
        </button>

        <button
          onClick={() => { setSelectedActor('RAZORPAY_GATEWAY'); setSelectedEventType('all'); }}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1 ${
            selectedActor === 'RAZORPAY_GATEWAY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Razorpay Gateway</span>
        </button>

        <button
          onClick={() => { setSelectedStatusFilter('issues'); setSelectedActor('all'); }}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1 ${
            selectedStatusFilter === 'issues'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Warnings & Failures</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by transaction ID, customer name, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 text-xs"
          />
        </div>

        {/* Actor Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Actor:</span>
          <select
            value={selectedActor}
            onChange={(e) => setSelectedActor(e.target.value)}
            className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Actors</option>
            <option value="GEMINI_AI">Gemini AI</option>
            <option value="POLICY_ENGINE">Policy Guard</option>
            <option value="MERCHANT">Merchant Admin</option>
            <option value="RAZORPAY_GATEWAY">Razorpay Gateway</option>
            <option value="SYSTEM">System Core</option>
          </select>
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Event Type:</span>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Event Types</option>
            <option value="failure_detected">Payment Failure Detected</option>
            <option value="ai_analysis">AI Diagnostic Computed</option>
            <option value="policy_evaluated">Policy Evaluation</option>
            <option value="merchant_approval">Merchant Approval</option>
            <option value="merchant_rejection">Merchant Rejection</option>
            <option value="razorpay_api_dispatched">Razorpay API Action</option>
            <option value="webhook_received">Webhook Received</option>
            <option value="recovery_success">Recovery Success</option>
            <option value="recovery_failed">Recovery Attempt Failed</option>
            <option value="policy_blocked">Policy Blocked</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="font-semibold text-slate-700">No audit events found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing filters or search parameters</p>
            <button
              onClick={resetFilters}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredLogs.map((log) => {
              const actorInfo = getActorBadge(log.actor);
              const ActorIcon = actorInfo.icon;
              const isExpanded = expandedLogIds.includes(log.id);

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Point Icon */}
                  <div className="absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 group-hover:border-indigo-500 flex items-center justify-center transition-colors shadow-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover:bg-indigo-600" />
                  </div>

                  {/* Log Card */}
                  <div className="bg-slate-50/70 hover:bg-slate-50 rounded-lg border border-slate-200 p-3 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className="font-bold text-slate-900 text-xs">
                          {log.eventTitle}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold border ${actorInfo.bg}`}>
                          <ActorIcon className="w-3 h-3" />
                          <span>{actorInfo.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <span>{formatTimeAgo(log.timestamp)}</span>
                        <span>•</span>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </div>

                    <p className="text-slate-700 text-xs mt-1.5 leading-relaxed">
                      {log.description}
                    </p>

                    {/* Footer Row: Transaction link & metadata accordion */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Txn:</span>
                        <button
                          onClick={() => onSelectTransaction(log.transactionId)}
                          className="font-mono text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-0.5"
                        >
                          <span>{log.transactionId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-700 font-semibold">{log.customerName}</span>
                        {log.amount > 0 && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-slate-900">{formatINR(log.amount)}</span>
                          </>
                        )}
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-slate-500 hover:text-slate-800 text-[11px] font-bold flex items-center gap-0.5"
                        >
                          <span>{isExpanded ? 'Hide Payload' : 'View Payload Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Metadata JSON Drawer */}
                    {isExpanded && log.metadata && (
                      <pre className="mt-2.5 p-2.5 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
