import React, { useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { AuditEvent } from '../types.ts';
import { formatTimeAgo, formatINR } from '../utils/formatters.ts';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditEvent[];
  onSelectTransaction: (id: string) => void;
  onViewAllAudit: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  auditLogs,
  onSelectTransaction,
  onViewAllAudit
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const recentLogs = auditLogs.slice(0, 5);

  return (
    <div 
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 text-slate-800 overflow-hidden animate-fadeIn"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-xs text-slate-900">System Notifications</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
            {recentLogs.length} New
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {recentLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No recent recovery notifications.
          </div>
        ) : (
          recentLogs.map((log) => {
            const isSuccess = log.status === 'success';
            const isWarning = log.status === 'warning' || log.status === 'error';

            return (
              <div 
                key={log.id}
                onClick={() => {
                  if (log.transactionId) {
                    onSelectTransaction(log.transactionId);
                    onClose();
                  }
                }}
                className="p-3 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-2.5"
              >
                <div className="mt-0.5 shrink-0">
                  {isSuccess ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : isWarning ? (
                    <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {log.eventTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                    {log.description}
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-500">{log.actor}</span>
                    {log.amount && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700">{formatINR(log.amount)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
        <button
          onClick={() => {
            onViewAllAudit();
            onClose();
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <span>View Full Audit Trail</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
