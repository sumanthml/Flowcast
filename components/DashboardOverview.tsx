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
  Zap,
  DollarSign,
  BarChart3
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
  const [activeHealthFilter, setActiveHealthFilter] = useState<AutomatonStateId | 'ALL'>('ALL');

  // Distribution counts across business inventory states
  const stateCounts: Record<AutomatonStateId, number> = {
    Q0_OPTIMAL: 0,
    Q1_WATCHLIST: 0,
    Q2_REORDER: 0,
    Q3_CRITICAL: 0,
    Q4_EXCESS: 0,
    Q5_INCOMING_BUFFER: 0,
  };

  recommendations.forEach(r => {
    if (stateCounts[r.dfaStateId as AutomatonStateId] !== undefined) {
      stateCounts[r.dfaStateId as AutomatonStateId]++;
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

  // Filter recommendations based on selected state card
  const displayedRecs = activeHealthFilter === 'ALL'
    ? recommendations
    : recommendations.filter(r => r.dfaStateId === activeHealthFilter);

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
      notes: `Reorder generated for ${rec.productName} (${rec.productSku}).`,
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

  // Run Executive Risk Audit using Groq server route
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

  // Calculate percentages for visual health bar
  const totalCatalog = recommendations.length || 1;
  const pctOptimal = Math.round((stateCounts.Q0_OPTIMAL / totalCatalog) * 100);
  const pctWatchlist = Math.round((stateCounts.Q1_WATCHLIST / totalCatalog) * 100);
  const pctReorder = Math.round((stateCounts.Q2_REORDER / totalCatalog) * 100);
  const pctCritical = Math.round((stateCounts.Q3_CRITICAL / totalCatalog) * 100);
  const pctExcess = Math.round((stateCounts.Q4_EXCESS / totalCatalog) * 100);
  const pctIncoming = Math.round((stateCounts.Q5_INCOMING_BUFFER / totalCatalog) * 100);

  return (
    <div className="space-y-6">
      
      {/* Executive Command Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Inventory Planning Dashboard
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time replenishment planning & stock risk analytics for <strong className="text-slate-200">{currentBusiness.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunExecutiveAudit}
            disabled={insightLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{insightLoading ? 'Synthesizing Audit...' : 'Executive Risk Audit'}</span>
          </button>
          
          <button
            onClick={() => onNavigateToTab('recommendations')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <span>Review Reorders</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Executive Risk Briefing Output */}
      {executiveInsight && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-slate-200 animate-in fade-in duration-200 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white">
                Working Capital & Stockout Risk Briefing (Groq LLaMA-3.3)
              </span>
            </div>
            <button
              onClick={() => setExecutiveInsight(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              ✕ Close
            </button>
          </div>
          {executiveInsight.aiExecutiveReport ? (
            <div className="text-xs space-y-2 whitespace-pre-wrap leading-relaxed text-slate-300">
              {executiveInsight.aiExecutiveReport}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <p className="font-medium text-slate-200 leading-relaxed">{executiveInsight.executiveSummary}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-rose-400 block mb-1.5">Key Findings</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {executiveInsight.keyFindings?.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-indigo-400 block mb-1.5">Recommended Managerial Actions</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {executiveInsight.recommendedActions?.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Stat Cards (Clean Enterprise Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Critical Stockout Risk */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 hover:border-rose-500/60 shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Stockout Risk
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{criticalRecs.length}</span>
            <span className="text-xs text-rose-300 font-medium">SKU(s) below safety stock</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Estimated capital to restock: <span className="font-bold text-rose-300">{currentBusiness.currencySymbol}{totalStockoutCapitalRisk.toLocaleString()}</span>
          </p>
        </div>

        {/* Card 2: Reorders Needed */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 hover:border-indigo-500/60 shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Reorders Required
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{urgentRecs.length}</span>
            <span className="text-xs text-indigo-300 font-medium">order(s) recommended</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Items at or below calculated Reorder Point.
          </p>
        </div>

        {/* Card 3: Excess Inventory */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-500/60 shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Excess Inventory
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{excessRecs.length}</span>
            <span className="text-xs text-purple-300 font-medium">SKU(s) &gt; 90 days demand</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Dormant capital tied up: <span className="font-bold text-purple-300">{currentBusiness.currencySymbol}{totalExcessHoldingCapital.toLocaleString()}</span>
          </p>
        </div>

        {/* Card 4: Inbound Shipments */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-500/60 shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Inbound Orders
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{openPOs.length}</span>
            <span className="text-xs text-cyan-300 font-medium">open PO(s) in transit</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Shipments buffered against future stockouts.
          </p>
        </div>
      </div>

      {/* Executive Inventory Health Pipeline */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Catalog Inventory Health Pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any status segment to filter products and review replenishment priority
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveHealthFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeHealthFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              All Items ({recommendations.length})
            </button>
            <button
              onClick={() => onNavigateToTab('toc_lab')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold ml-2"
            >
              <span>Logic Engine Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Segmented Health Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-950 p-0.5 border border-slate-800">
          {pctOptimal > 0 && <div style={{ width: `${pctOptimal}%` }} className="h-full bg-emerald-500 rounded-l-full" title={`Healthy: ${pctOptimal}%`}></div>}
          {pctWatchlist > 0 && <div style={{ width: `${pctWatchlist}%` }} className="h-full bg-amber-400" title={`Watchlist: ${pctWatchlist}%`}></div>}
          {pctReorder > 0 && <div style={{ width: `${pctReorder}%` }} className="h-full bg-indigo-500" title={`Reorder Due: ${pctReorder}%`}></div>}
          {pctCritical > 0 && <div style={{ width: `${pctCritical}%` }} className="h-full bg-rose-500" title={`Critical: ${pctCritical}%`}></div>}
          {pctExcess > 0 && <div style={{ width: `${pctExcess}%` }} className="h-full bg-purple-500" title={`Overstocked: ${pctExcess}%`}></div>}
          {pctIncoming > 0 && <div style={{ width: `${pctIncoming}%` }} className="h-full bg-cyan-400 rounded-r-full" title={`In Transit: ${pctIncoming}%`}></div>}
        </div>

        {/* 6 Clean Status Segment Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.keys(DFA_STATES) as AutomatonStateId[]).map(stateId => {
            const stateMeta = DFA_STATES[stateId];
            const count = stateCounts[stateId];
            const isSelected = activeHealthFilter === stateId;

            return (
              <button
                key={stateId}
                onClick={() => setActiveHealthFilter(isSelected ? 'ALL' : stateId)}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  isSelected 
                    ? 'ring-2 ring-indigo-500 bg-slate-800/90 border-indigo-400 shadow-md' 
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate pr-1">
                    {stateMeta.label}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    count > 0 ? stateMeta.badgeColor : 'bg-slate-800 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {stateMeta.actionGuidance}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Priority Action Queue Table */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Prioritized Replenishment Action Queue</span>
            </h3>
            <p className="text-xs text-slate-400">
              Sorted by stockout timeline. Advisory recommendations remain under user control.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {displayedRecs.length} items
          </span>
        </div>

        {displayedRecs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            No products match the selected filter. Inventory positions are stable.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5">Product / SKU</th>
                  <th className="py-3 px-3.5">Stock Status</th>
                  <th className="py-3 px-3.5">On-Hand Stock</th>
                  <th className="py-3 px-3.5">Sales Velocity</th>
                  <th className="py-3 px-3.5">Coverage Runway</th>
                  <th className="py-3 px-3.5">Supplier Lead Time</th>
                  <th className="py-3 px-3.5">Recommended Order</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedRecs.map(rec => {
                  const stateMeta = DFA_STATES[rec.dfaStateId as AutomatonStateId] || DFA_STATES.Q0_OPTIMAL;
                  const isCritical = rec.urgency === 'critical';

                  return (
                    <tr 
                      key={rec.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCritical ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-white text-xs">{rec.productName}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{rec.productSku} • {rec.supplierName}</div>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stateMeta.badgeColor}`}>
                          {stateMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-slate-200 text-sm">{rec.currentStock}</div>
                        {rec.incomingStock > 0 && (
                          <div className="text-[10px] text-cyan-400 font-medium">+{rec.incomingStock} on PO</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-300 font-mono">
                        {rec.leadTimeDemand > 0 ? (rec.leadTimeDemand / rec.leadTimeDays).toFixed(1) : '0'}/day
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          rec.daysOfStockRemaining <= rec.leadTimeDays
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : rec.daysOfStockRemaining <= rec.leadTimeDays * 1.5
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'text-slate-300'
                        }`}>
                          {rec.daysOfStockRemaining} days left
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-300">
                        {rec.leadTimeDays} days
                      </td>
                      <td className="py-3.5 px-3.5">
                        {rec.suggestedQuantity > 0 ? (
                          <div>
                            <span className="font-bold text-indigo-300">
                              {rec.suggestedQuantity} units
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({currentBusiness.currencySymbol}{rec.estimatedCost})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Adequate</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              onSelectProductForToc(rec.productId);
                              onNavigateToTab('recommendations');
                            }}
                            title="Review mathematical breakdown and assumptions"
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                          >
                            Breakdown
                          </button>
                          {rec.suggestedQuantity > 0 && (
                            <button
                              onClick={() => handleQuickOrder(rec)}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm transition-all"
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
