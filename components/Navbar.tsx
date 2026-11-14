'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { 
  Boxes, 
  Building2, 
  Plus, 
  UserCheck, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  ShieldAlert, 
  Coins, 
  Globe2 
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

  const criticalCount = recommendations.filter(r => r.urgency === 'critical').length;
  const urgentCount = recommendations.filter(r => r.urgency === 'urgent').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Boxes className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FlowCast <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">TOC</span>
                </span>
                {isSampleData && (
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Sample Retail Data
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Explainable Inventory Planning & Automata Engine
              </p>
            </div>
          </div>

          {/* Business & Multi-Tenant Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-[140px] truncate">{currentBusiness.name}</span>
                <span className="text-slate-400 text-[10px] font-mono px-1 rounded bg-slate-800">
                  {currentBusiness.currency} ({currentBusiness.currencySymbol})
                </span>
              </button>

              {bizDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setBizDropdownOpen(false)}
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Switch Business Storefront
                  </div>
                  <div className="space-y-1">
                    {businesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => {
                          setCurrentBusinessId(biz.id);
                          setBizDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                          biz.id === currentBusiness.id
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-medium truncate">{biz.name}</p>
                          <p className="text-[10px] text-slate-400">{biz.timezone} • {biz.defaultUnit}</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
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
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New Business (Guided Setup)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-medium text-slate-300"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="capitalize">{userRole}</span>
              </button>

              {roleDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-1.5 z-50"
                  onMouseLeave={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-2 py-1 text-[10px] uppercase text-slate-400 font-semibold">Active Role</div>
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
                      {role === 'owner' && 'Owner (Full Access)'}
                      {role === 'staff' && 'Staff (Floor Actions)'}
                      {role === 'viewer' && 'Viewer (Read-only)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Sample Data Button */}
            {isSampleData && (
              <button
                onClick={resetToSampleData}
                title="Reset to initial sample retail catalog"
                className="p-2 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Groq AI Assistant Slide-over trigger */}
            <button
              onClick={onOpenGroqChat}
              className="relative group flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
              <span>AI Assistant</span>
              <span className="hidden sm:inline text-[10px] bg-white/20 px-1 rounded font-mono">Groq</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 no-scrollbar border-t border-slate-800/60">
          {[
            { id: 'overview', label: 'Dashboard', icon: Boxes },
            { 
              id: 'recommendations', 
              label: 'Reorder Planning', 
              icon: ShieldAlert,
              badge: (criticalCount + urgentCount) > 0 ? (criticalCount + urgentCount) : undefined,
              badgeColor: criticalCount > 0 ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'
            },
            { id: 'forecasting', label: 'Demand Forecasting', icon: Coins },
            { id: 'products', label: 'Product Catalog & Stock', icon: Building2 },
            { id: 'movements', label: 'Movement Audit Log', icon: Globe2 },
            { id: 'purchase_orders', label: 'Purchase Orders', icon: UserCheck },
            { id: 'csv_import', label: 'CSV Data Import & Export', icon: Plus },
            { id: 'toc_lab', label: 'TOC Automata Lab', icon: Cpu },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
