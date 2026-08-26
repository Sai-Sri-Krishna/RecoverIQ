import React, { useState } from 'react';
import { 
  BarChart3, 
  Layers, 
  Bot, 
  Bell, 
  Settings, 
  Info, 
  Menu, 
  X,
  Sparkles,
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { AnalyticsSummary, AuditEvent, RazorpayStatus } from '../types.ts';
import { NotificationsPopover } from './NotificationsPopover.tsx';

interface HeaderProps {
  activeTab: 'overview' | 'queue' | 'analytics' | 'assistant' | 'audit' | 'policy';
  onSelectTab: (tab: 'overview' | 'queue' | 'analytics' | 'assistant' | 'audit' | 'policy') => void;
  analytics: AnalyticsSummary | null;
  auditLogs: AuditEvent[];
  razorpayStatus?: RazorpayStatus | null;
  onSelectTransaction: (id: string) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  analytics,
  auditLogs,
  razorpayStatus,
  onSelectTransaction,
  onOpenSettings
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTestModeInfo, setShowTestModeInfo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isConfigured = Boolean(razorpayStatus?.isConfigured);

  // 4 Primary Nav Items
  const navItems = [
    { id: 'overview' as const, label: 'Overview' },
    { 
      id: 'queue' as const, 
      label: 'Recovery', 
      badge: analytics?.pendingApprovalCount 
    },
    { id: 'analytics' as const, label: 'Analytics' },
    { id: 'assistant' as const, label: 'AI Assistant', isSpecial: true }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => onSelectTab('overview')}
              className="flex items-center gap-2.5 group text-left transition-opacity hover:opacity-90 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:bg-indigo-700 transition-colors">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                  Recover<span className="text-indigo-600">IQ</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
                  AI Revenue Recovery
                </span>
              </div>
            </button>

            {/* Desktop Navigation Items */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = (item.id === 'queue' && (activeTab === 'queue' || activeTab === 'audit')) 
                  ? activeTab === 'queue' 
                  : activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.isSpecial && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Side Utilities */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Merchant / Test Mode Indicator */}
            <div className="relative">
              <button
                onClick={() => setShowTestModeInfo(!showTestModeInfo)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors text-xs cursor-pointer ${
                  isConfigured 
                    ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800'
                }`}
                title={isConfigured ? "Razorpay Test Mode API Connected" : "Razorpay Test Sandbox Simulation"}
              >
                <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-semibold text-[11px]">
                  {isConfigured ? 'Razorpay Test Mode' : 'Razorpay Test Mode (Simulated)'}
                </span>
              </button>

              {showTestModeInfo && (
                <div className="absolute right-0 mt-2 w-80 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 text-slate-700 text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className={`flex items-center gap-1.5 ${isConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <ShieldCheck className={`w-4 h-4 ${isConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
                      {isConfigured ? 'Test API Connected' : 'Test Mode Simulator'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      TEST MODE
                    </span>
                  </div>

                  {isConfigured ? (
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Connected to Razorpay Test Mode API. Payment links and webhook events run live authenticated test requests via server-side secrets with zero credential exposure.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-amber-900 bg-amber-50/80 border border-amber-200 rounded-lg p-2 text-[11px] leading-relaxed">
                        Razorpay Test Mode is not configured yet. Add <code className="font-mono text-amber-950 font-bold">RAZORPAY_KEY_ID</code> and <code className="font-mono text-amber-950 font-bold">RAZORPAY_KEY_SECRET</code> to the secure Secrets configuration.
                      </p>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        All AI recovery diagnostics, deterministic policy guards, and webhook settlements are functioning seamlessly in test simulation.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Mode: Test Sandbox</span>
                    <button 
                      onClick={() => setShowTestModeInfo(false)} 
                      className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowTestModeInfo(false);
                }}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                {auditLogs && auditLogs.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              <NotificationsPopover
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                auditLogs={auditLogs}
                onSelectTransaction={onSelectTransaction}
                onViewAllAudit={() => onSelectTab('audit')}
              />
            </div>

            {/* Settings Icon */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="System Settings & Policy Controls"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1 animate-fadeIn">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
