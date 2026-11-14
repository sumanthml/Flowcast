'use client';

import React, { useState, useEffect } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { initAnalytics } from '@/lib/firebase/client';
import { 
  Boxes, 
  Building2, 
  Plus, 
  UserCheck, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  ShieldAlert, 
  TrendingUp, 
  History, 
  CheckCircle2,
  Database,
  Flame,
  Activity,
  X,
  FileSpreadsheet,
  ChevronDown,
  ShoppingCart
} from 'lucide-react';

interface NavbarProps {
  onOpenOnboarding: () => void;
  onOpenGroqChat: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navbar({ onOpenOnboarding, onOpenGroqChat, activeTab, setActiveTab }: NavbarProps) {
  const { 
    businesses, 
    currentBusiness, 
    setCurrentBusinessId, 
    userRole, 
    setUserRole, 
    isSampleData, 
    resetToSampleData,
    recommendations 
  } = useInventory();

  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isCloudStatusModalOpen, setIsCloudStatusModalOpen] = useState(false);

  const criticalCount = recommendations.filter(r => r.urgency === 'critical').length;
  const urgentCount = recommendations.filter(r => r.urgency === 'urgent').length;
  const totalActionCount = criticalCount + urgentCount;

  // Initialize Firebase Analytics client-side
  useEffect(() => {
    initAnalytics().catch(() => {});
  }, []);

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: Boxes },
    { 
      id: 'recommendations', 
      label: 'Reorder Planning', 
      icon: ShieldAlert,
      badge: totalActionCount > 0 ? totalActionCount : undefined,
      badgeColor: criticalCount > 0 ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'
    },
    { id: 'forecasting', label: 'Demand Forecasting', icon: TrendingUp },
    { id: 'products', label: 'Products & Stock', icon: Building2 },
    { id: 'movements', label: 'Movement Audit', icon: History },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'csv_import', label: 'Data Import / Export', icon: FileSpreadsheet },
    { id: 'toc_lab', label: 'Logic Engine & Diagnostics', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Boxes className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  FlowCast
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Enterprise
                </span>
                {isSampleData && (
                  <span className="hidden md:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Sample Data
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block leading-none mt-0.5">
                Intelligent Retail Demand & Replenishment
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live System Status Pill */}
            <button
              onClick={() => setIsCloudStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[11px] font-medium transition-all shadow-sm"
              title="Cloud & AI Integrations Status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Cloud & AI Active</span>
              <span className="sm:hidden">Active</span>
            </button>

            {/* Business / Storefront Selector */}
            <div className="relative">
              <button
                onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-[120px] sm:max-w-[160px] truncate">{currentBusiness.name}</span>
                <span className="text-slate-400 text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 border border-slate-700/60">
                  {currentBusiness.currency} ({currentBusiness.currencySymbol})
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {bizDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setBizDropdownOpen(false)}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Storefront
                  </div>
                  <div className="space-y-1">
                    {businesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => {
                          setCurrentBusinessId(biz.id);
                          setBizDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                          biz.id === currentBusiness.id
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate font-semibold">{biz.name}</p>
                          <p className="text-[10px] text-slate-400">{biz.timezone} • Unit: {biz.defaultUnit}</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          {biz.currencySymbol}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setBizDropdownOpen(false);
                        onOpenOnboarding();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Store Setup Wizard</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="capitalize">{userRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">Account Role</div>
                  {(['owner', 'staff', 'viewer'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        setUserRole(role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                        userRole === role ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {role === 'owner' && 'Owner (Full Admin)'}
                      {role === 'staff' && 'Staff (Floor Ops)'}
                      {role === 'viewer' && 'Viewer (Read-Only)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Sample Data Button */}
            {isSampleData && (
              <button
                onClick={resetToSampleData}
                title="Reset sample retail store data"
                className="p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Groq AI Copilot Button */}
            <button
              onClick={onOpenGroqChat}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Copilot</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-800/60">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-indigo-700' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Cloud & AI Diagnostic Status Modal */}
      {isCloudStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Active Cloud & AI Integrations
                </h3>
              </div>
              <button onClick={() => setIsCloudStatusModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Groq AI Assistant</span>
                    <span className="text-[10px] text-slate-400 font-mono">LLaMA 3.3 70B Versatile</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Groq Strategic Insights</span>
                    <span className="text-[10px] text-slate-400 font-mono">Executive Capital Audit</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Supabase PostgreSQL 17</span>
                    <span className="text-[10px] text-slate-400 font-mono">db.ceenvnrmnwogbhxggwsl...</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Schema Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Firebase Analytics</span>
                    <span className="text-[10px] text-slate-400 font-mono">toc1-d8f54.firebaseapp.com</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Initialized
                </span>
              </div>

            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsCloudStatusModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
