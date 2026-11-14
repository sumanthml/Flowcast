'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { DFA_STATES } from '@/lib/toc/dfa';
import { AutomatonStateId } from '@/types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  TrendingDown, 
  Package, 
  Truck, 
  Layers, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateToTab: (tab: string) => void;
  onSelectProductForToc: (productId: string) => void;
}

export function DashboardOverview({ onNavigateToTab, onSelectProductForToc }: DashboardOverviewProps) {
  const { 
    currentBusiness, 
    products, 
    recommendations, 
    purchaseOrders,
    updateRecommendationStatus,
    createPurchaseOrder,
    suppliers
  } = useInventory();

  const [insightLoading, setInsightLoading] = useState(false);
  const [executiveInsight, setExecutiveInsight] = useState<any>(null);
  const [activeDfaFilter, setActiveDfaFilter] = useState<AutomatonStateId | 'ALL'>('ALL');

  // Distribution of products across DFA Automaton states
  const dfaCounts: Record<AutomatonStateId, number> = {
    Q0_OPTIMAL: 0,
    Q1_WATCHLIST: 0,
    Q2_REORDER: 0,
    Q3_CRITICAL: 0,
    Q4_EXCESS: 0,
    Q5_INCOMING_BUFFER: 0,
  };

  recommendations.forEach(r => {
    if (dfaCounts[r.dfaStateId as AutomatonStateId] !== undefined) {
      dfaCounts[r.dfaStateId as AutomatonStateId]++;
    }
  });

  const criticalRecs = recommendations.filter(r => r.urgency === 'critical');
  const urgentRecs = recommendations.filter(r => r.urgency === 'urgent');
  const excessRecs = recommendations.filter(r => r.urgency === 'excess');
  
  const totalStockoutCapitalRisk = criticalRecs.reduce((acc, r) => acc + r.estimatedCost, 0);
  const totalExcessHoldingCapital = excessRecs.reduce((acc, r) => {
    const prod = products.find(p => p.id === r.productId);
    return acc + (r.currentStock * (prod?.unitCost || 0));
  }, 0);

  const openPOs = purchaseOrders.filter(po => po.status === 'sent' || po.status === 'partially_received');

  // Filter recommendations based on selected DFA tile
  const displayedRecs = activeDfaFilter === 'ALL'
    ? recommendations
    : recommendations.filter(r => r.dfaStateId === activeDfaFilter);

  // Quick Action: Accept recommendation into a Draft PO
  const handleQuickOrder = (rec: typeof recommendations[0]) => {
    const prod = products.find(p => p.id === rec.productId);
    if (!prod) return;

    const targetSupplier = suppliers.find(s => s.id === rec.supplierId) || {
      id: rec.supplierId,
      name: rec.supplierName,
      leadTimeDays: rec.leadTimeDays,
    };

    const orderQty = rec.suggestedQuantity;
    const packs = Math.ceil(orderQty / rec.packSize);

    const now = new Date();
    const expDel = new Date(now);
    expDel.setDate(expDel.getDate() + rec.leadTimeDays);

    createPurchaseOrder({
      poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: rec.supplierId,
      supplierName: rec.supplierName,
      status: 'draft',
      totalAmount: Number((orderQty * prod.unitCost).toFixed(2)),
      currency: currentBusiness.currency,
      orderDate: now.toISOString().split('T')[0],
      expectedDeliveryDate: expDel.toISOString().split('T')[0],
      notes: `Generated from ${rec.urgency} stockout recommendation for SKU ${rec.productSku}.`,
      items: [
        {
          id: `poi_${Date.now()}`,
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          unitOfMeasure: prod.unitOfMeasure,
          packSize: rec.packSize,
          packsOrdered: packs,
          totalQuantity: orderQty,
          unitCost: prod.unitCost,
          totalCost: Number((orderQty * prod.unitCost).toFixed(2)),
          quantityReceived: 0,
        }
      ]
    });

    updateRecommendationStatus(rec.id, 'accepted');
    onNavigateToTab('purchase_orders');
  };

  // Fetch Executive Risk Insights using server route
  const handleRunExecutiveAudit = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/groq/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessContext: {
            businessName: currentBusiness.name,
            currency: currentBusiness.currency,
            currencySymbol: currentBusiness.currencySymbol,
            products,
            recommendations,
            openPOCount: openPOs.length,
          }
        })
      });
      const data = await res.json();
      setExecutiveInsight(data);
    } catch (e) {
      console.error('Audit failed:', e);
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">
              Inventory Command Center
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold uppercase rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live State
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic Finite Automaton (DFA) tracking {products.length} catalog items for {currentBusiness.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunExecutiveAudit}
            disabled={insightLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {insightLoading ? 'Synthesizing...' : 'Executive Risk Audit'}
          </button>
          <button
            onClick={() => onNavigateToTab('recommendations')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <span>View All Reorders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Executive Risk Briefing Modal / Banner */}
      {executiveInsight && (
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-slate-200 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-300">
                Strategic Working Capital & Risk Exposure Memorandum
              </span>
              {executiveInsight.isRuleBasedFallback && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Deterministic Audit Rule Mode
                </span>
              )}
            </div>
            <button
              onClick={() => setExecutiveInsight(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Dismiss
            </button>
          </div>
          {executiveInsight.aiExecutiveReport ? (
            <div className="text-xs space-y-2 whitespace-pre-wrap leading-relaxed text-slate-300">
              {executiveInsight.aiExecutiveReport}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-slate-200">{executiveInsight.executiveSummary}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-rose-400 block mb-1">Key Findings</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {executiveInsight.keyFindings?.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-indigo-400 block mb-1">Actionable Directives</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {executiveInsight.recommendedActions?.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {executiveInsight.notice && (
            <p className="text-[10px] text-purple-400/80 mt-2 italic">
              💡 {executiveInsight.notice}
            </p>
          )}
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Critical Stockout Imminent */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 shadow-lg group hover:border-rose-500/60 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Stockout Imminent (Q3)
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{criticalRecs.length}</span>
            <span className="text-xs text-rose-300/80">SKU(s) below safety</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Estimated capital required: <span className="font-semibold text-rose-300">{currentBusiness.currencySymbol}{totalStockoutCapitalRisk.toLocaleString()}</span>
          </p>
        </div>

        {/* Card 2: Reorder Point Triggered */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 shadow-lg group hover:border-indigo-500/60 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Reorder Triggered (Q2)
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{urgentRecs.length}</span>
            <span className="text-xs text-indigo-300/80">order(s) recommended</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Lead times: 5–14 days. Place soon to prevent slip.
          </p>
        </div>

        {/* Card 3: Excess Dormant Inventory */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-slate-900/80 border border-fuchsia-500/30 shadow-lg group hover:border-fuchsia-500/60 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400">
              Excess Overstock (Q4)
            </span>
            <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{excessRecs.length}</span>
            <span className="text-xs text-fuchsia-300/80">SKU(s) &gt; 90 days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Dormant capital tied up: <span className="font-semibold text-fuchsia-300">{currentBusiness.currencySymbol}{totalExcessHoldingCapital.toLocaleString()}</span>
          </p>
        </div>

        {/* Card 4: Open Inbound Shipments */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-lg group hover:border-cyan-500/60 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Inbound Buffer (Q5)
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{openPOs.length}</span>
            <span className="text-xs text-cyan-300/80">POs in transit</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Buffered against stockout via open orders.
          </p>
        </div>
      </div>

      {/* Theory of Computation State Distribution Matrix */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Automaton State Matrix (M = (Q, Σ, δ, q₀, F))
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any state to filter products and view formal state transitions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDfaFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeDfaFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              All States ({recommendations.length})
            </button>
            <button
              onClick={() => onNavigateToTab('toc_lab')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium ml-2"
            >
              <span>Explore TOC Lab</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 State Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.keys(DFA_STATES) as AutomatonStateId[]).map(stateId => {
            const state = DFA_STATES[stateId];
            const count = dfaCounts[stateId];
            const isSelected = activeDfaFilter === stateId;

            return (
              <button
                key={stateId}
                onClick={() => setActiveDfaFilter(isSelected ? 'ALL' : stateId)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isSelected 
                    ? 'ring-2 ring-indigo-500 bg-slate-850 border-indigo-400 shadow-md' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-300">
                    {stateId.split('_')[0]}
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    count > 0 ? state.badgeColor : 'bg-slate-800 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white mt-1.5 truncate">
                  {state.label.split(': ')[1] || state.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {state.actionGuidance}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Table: Products Requiring Attention */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Prioritized Replenishment Action Queue</span>
            </h3>
            <p className="text-xs text-slate-400">
              Sorted by stockout urgency. Advisory recommendations never auto-order.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Showing {displayedRecs.length} items
          </span>
        </div>

        {displayedRecs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            No products match the selected criteria. All inventory is stable.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">DFA State</th>
                  <th className="py-2.5 px-3">Usable Stock</th>
                  <th className="py-2.5 px-3">Burn Rate</th>
                  <th className="py-2.5 px-3">Stockout In</th>
                  <th className="py-2.5 px-3">Lead Time</th>
                  <th className="py-2.5 px-3">Recommended Order</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedRecs.map(rec => {
                  const stateMeta = DFA_STATES[rec.dfaStateId as AutomatonStateId] || DFA_STATES.Q0_OPTIMAL;
                  const isCritical = rec.urgency === 'critical';
                  const isUrgent = rec.urgency === 'urgent';

                  return (
                    <tr 
                      key={rec.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCritical ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{rec.productName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{rec.productSku} • {rec.supplierName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stateMeta.badgeColor}`}>
                          {stateMeta.id.split('_')[0]}: {stateMeta.label.split(': ')[1]}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{rec.currentStock}</div>
                        {rec.incomingStock > 0 && (
                          <div className="text-[10px] text-cyan-400">+{rec.incomingStock} on PO</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {rec.leadTimeDemand > 0 ? (rec.leadTimeDemand / rec.leadTimeDays).toFixed(1) : '0'}/day
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          rec.daysOfStockRemaining <= rec.leadTimeDays
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : rec.daysOfStockRemaining <= rec.leadTimeDays * 1.5
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'text-slate-300'
                        }`}>
                          {rec.daysOfStockRemaining} days
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {rec.leadTimeDays} days
                      </td>
                      <td className="py-3 px-3">
                        {rec.suggestedQuantity > 0 ? (
                          <div>
                            <span className="font-bold text-indigo-300">
                              {rec.suggestedQuantity} units
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({currentBusiness.currencySymbol}{rec.estimatedCost})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None required</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              onSelectProductForToc(rec.productId);
                              onNavigateToTab('toc_lab');
                            }}
                            title="Trace DFA State Machine transitions for this SKU"
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                          >
                            TOC Proof
                          </button>
                          {rec.suggestedQuantity > 0 && (
                            <button
                              onClick={() => handleQuickOrder(rec)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-sm transition-colors"
                            >
                              Draft PO
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
