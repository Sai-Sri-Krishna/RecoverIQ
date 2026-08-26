import React, { useState } from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Search, 
  FilterX, 
  ArrowRight,
  Database,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

/* ==========================================================================
   Skeleton Loaders (Shimmer Animations for Dashboard & Tables)
   ========================================================================== */

export const MetricCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-3 bg-slate-200 rounded w-28" />
      <div className="w-7 h-7 bg-slate-100 rounded-lg" />
    </div>
    <div className="h-7 bg-slate-200 rounded w-36 mt-1" />
    <div className="space-y-1.5 pt-2">
      <div className="h-1.5 bg-slate-100 rounded-full w-full" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-slate-100 rounded w-16" />
        <div className="h-2.5 bg-slate-100 rounded w-12" />
      </div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs animate-pulse space-y-4">
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <div className="space-y-1">
        <div className="h-4 bg-slate-200 rounded w-48" />
        <div className="h-2.5 bg-slate-100 rounded w-64" />
      </div>
      <div className="flex gap-2">
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-3 bg-slate-200 rounded w-16" />
      </div>
    </div>
    <div className="h-48 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg flex items-end justify-between p-4 gap-2">
      {[40, 65, 30, 85, 55, 90, 70].map((h, i) => (
        <div key={i} className="w-full bg-slate-200/80 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 7 }) => (
  <tr className="animate-pulse border-b border-slate-100">
    <td className="py-3 px-3">
      <div className="space-y-1">
        <div className="h-3.5 bg-slate-200 rounded w-28" />
        <div className="h-2.5 bg-slate-100 rounded w-36" />
      </div>
    </td>
    <td className="py-3 px-3">
      <div className="h-3 bg-slate-200 rounded w-24 font-mono" />
      <div className="h-2 bg-slate-100 rounded w-16 mt-1" />
    </td>
    <td className="py-3 px-3">
      <div className="h-4 bg-slate-200 rounded w-16 font-bold" />
    </td>
    <td className="py-3 px-3">
      <div className="h-3 bg-slate-200 rounded w-32" />
      <div className="h-2 bg-slate-100 rounded w-20 mt-1" />
    </td>
    <td className="py-3 px-3">
      <div className="h-5 bg-slate-200 rounded-full w-14" />
    </td>
    <td className="py-3 px-3">
      <div className="h-5 bg-slate-200 rounded-full w-24" />
    </td>
    <td className="py-3 px-3 text-right">
      <div className="h-6 bg-slate-200 rounded w-14 ml-auto" />
    </td>
  </tr>
);

/* ==========================================================================
   Empty State Component (Polished, Contextual & Actionable)
   ========================================================================== */

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  filterActive?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Search,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  filterActive = false
}) => {
  return (
    <div className="py-12 px-4 text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3.5 text-indigo-600 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
        {description}
      </p>

      {(onAction || onSecondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-all"
            >
              {filterActive ? <FilterX className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{actionLabel}</span>
            </button>
          )}

          {onSecondaryAction && secondaryActionLabel && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   Error State Banner (With Immediate Retry Trigger)
   ========================================================================== */

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = "Connection or Telemetry Error",
  message,
  onRetry,
  onDismiss
}) => {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 shadow-xs flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-rose-950">{title}</h4>
          <p className="text-rose-800 text-[11px] mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-700 text-xs px-1"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   1-Click Copy Badge with Animated Check Feedback
   ========================================================================== */

interface CopyableTextProps {
  text: string;
  label?: string;
  className?: string;
  showIconOnly?: boolean;
}

export const CopyableBadge: React.FC<CopyableTextProps> = ({
  text,
  label,
  className = "",
  showIconOnly = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied to clipboard!" : `Click to copy: ${text}`}
      className={`inline-flex items-center gap-1 font-mono transition-all text-slate-600 hover:text-slate-900 group ${className}`}
    >
      {!showIconOnly && <span>{label || text}</span>}
      <span className="p-0.5 rounded group-hover:bg-slate-200/80 transition-colors">
        {copied ? (
          <Check className="w-3 h-3 text-emerald-600" />
        ) : (
          <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
        )}
      </span>
      {copied && (
        <span className="text-[10px] text-emerald-600 font-sans font-bold animate-fadeIn">
          Copied
        </span>
      )}
    </button>
  );
};
