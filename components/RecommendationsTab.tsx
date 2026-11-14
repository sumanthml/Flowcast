'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { ReorderRecommendation, AutomatonStateId } from '@/types';
import { DFA_STATES } from '@/lib/toc/dfa';
import { 
  ShieldAlert, 
  HelpCircle, 
  Check, 
  Clock, 
  X, 
  Edit3, 
  ShoppingCart, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface RecommendationsTabProps {
  onNavigateToTab: (tab: string) => void;
}

export function RecommendationsTab({ onNavigateToTab }: RecommendationsTabProps) {
  const { 
    currentBusiness, 
    recommendations, 
    updateRecommendationStatus,
    createPurchaseOrder,
    products,
    suppliers 
  } = useInventory();

  const [filterUrgency, setFilterUrgency] = useState<'all' | 'critical' | 'urgent' | 'upcoming' | 'excess'>('all');
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [editQtyInput, setEditQtyInput] = useState<number>(0);

  const filteredRecs = recommendations.filter(r => {
    if (filterUrgency === 'all') return true;
    return r.urgency === filterUrgency;
  });

  const acceptedRecs = recommendations.filter(r => r.status === 'accepted' && r.suggestedQuantity > 0);

  const handleStartEdit = (rec: ReorderRecommendation) => {
    setEditingRecId(rec.id);
    setEditQtyInput(rec.userModifiedQuantity || rec.suggestedQuantity);
  };

  const handleSaveEdit = (recId: string) => {
    updateRecommendationStatus(recId, 'edited', editQtyInput);
    setEditingRecId(null);
  };

  // Group accepted recommendations by supplier to build POs
  const handleGenerateConsolidatedPOs = () => {
    if (acceptedRecs.length === 0) return;

    // Group by supplier
    const supplierGroups = new Map<string, typeof acceptedRecs>();
    acceptedRecs.forEach(r => {
      const list = supplierGroups.get(r.supplierId) || [];
      list.push(r);
      supplierGroups.set(r.supplierId, list);
    });

    supplierGroups.forEach((recs, supId) => {
      const sup = suppliers.find(s => s.id === supId);
      const supplierName = sup ? sup.name : recs[0].supplierName;
      const leadTime = sup ? sup.leadTimeDays : recs[0].leadTimeDays;

      const now = new Date();
      const expDate = new Date(now);
      expDate.setDate(expDate.getDate() + leadTime);

      const items = recs.map(r => {
        const prod = products.find(p => p.id === r.productId);
        const qty = r.userModifiedQuantity || r.suggestedQuantity;
        const unitCost = prod ? prod.unitCost : 0;
        return {
          id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          productId: r.productId,
          productSku: r.productSku,
          productName: r.productName,
          unitOfMeasure: prod?.unitOfMeasure || 'pcs',
          packSize: r.packSize,
          packsOrdered: Math.ceil(qty / r.packSize),
          totalQuantity: qty,
          unitCost,
          totalCost: Number((qty * unitCost).toFixed(2)),
          quantityReceived: 0,
        };
      });

      const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

      createPurchaseOrder({
        poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierId: supId,
        supplierName,
        status: 'draft',
        items,
        totalAmount: Number(totalAmount.toFixed(2)),
        currency: currentBusiness.currency,
        orderDate: now.toISOString().split('T')[0],
        expectedDeliveryDate: expDate.toISOString().split('T')[0],
        notes: `Consolidated PO generated from approved inventory replenishment recommendations.`,
      });
    });

    onNavigateToTab('purchase_orders');
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Consolidated PO Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <span>Explainable Reorder Recommendations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data-backed reorder recommendations with mathematical derivations and pack-size alignment.
          </p>
        </div>

        {acceptedRecs.length > 0 && (
          <button
            onClick={handleGenerateConsolidatedPOs}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all animate-bounce"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Generate POs ({acceptedRecs.length} Accepted Items)</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All Items', count: recommendations.length },
          { id: 'critical', label: 'Critical Imminent', count: recommendations.filter(r => r.urgency === 'critical').length, color: 'text-rose-400' },
          { id: 'urgent', label: 'Reorder Triggered', count: recommendations.filter(r => r.urgency === 'urgent').length, color: 'text-indigo-400' },
          { id: 'upcoming', label: 'Watchlist', count: recommendations.filter(r => r.urgency === 'upcoming').length, color: 'text-amber-400' },
          { id: 'excess', label: 'Excess Overstock', count: recommendations.filter(r => r.urgency === 'excess').length, color: 'text-fuchsia-400' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterUrgency(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterUrgency === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className={tab.color}>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Recommendations Cards Grid */}
      <div className="space-y-4">
        {filteredRecs.map(rec => {
          const stateMeta = DFA_STATES[rec.dfaStateId as AutomatonStateId] || DFA_STATES.Q0_OPTIMAL;
          const isExpanded = expandedRecId === rec.id;
          const isEditing = editingRecId === rec.id;
          const isAccepted = rec.status === 'accepted';
          const isDismissed = rec.status === 'dismissed';
          const isSnoozed = rec.status === 'snoozed';

          let borderAccent = 'border-slate-800';
          if (rec.urgency === 'critical') borderAccent = 'border-rose-500/50 hover:border-rose-500';
          if (rec.urgency === 'urgent') borderAccent = 'border-indigo-500/50 hover:border-indigo-500';
          if (rec.urgency === 'excess') borderAccent = 'border-fuchsia-500/40';

          return (
            <div
              key={rec.id}
              className={`rounded-2xl bg-slate-900/80 border ${borderAccent} transition-all shadow-md overflow-hidden ${
                isDismissed ? 'opacity-40' : ''
              }`}
            >
              {/* Card Top Row */}
              <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* SKU Info & State */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-white">{rec.productName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rec.productSku}
                    </span>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${stateMeta.badgeColor}`}>
                      {stateMeta.id.split('_')[0]}: {stateMeta.label.split(': ')[1]}
                    </span>
                    {rec.dataReliability === 'cautious_insufficient_data' && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Cautious Baseline
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Supplier: <span className="text-slate-300 font-medium">{rec.supplierName}</span> • Lead Time: <span className="text-slate-300 font-medium">{rec.leadTimeDays} days</span>
                  </p>
                  
                  {/* Stock Position Indicators */}
                  <div className="flex items-center gap-4 text-xs mt-3 text-slate-400">
                    <div>
                      Usable Stock: <span className="font-semibold text-slate-200">{rec.netUsableStock}</span>
                    </div>
                    <div>
                      Safety Stock: <span className="font-semibold text-slate-200">{rec.safetyStockRecommended}</span>
                    </div>
                    <div>
                      Reorder Point: <span className="font-semibold text-slate-200">{rec.reorderPointCalculated}</span>
                    </div>
                    <div>
                      Burn Rate: <span className="font-semibold text-slate-200">{rec.leadTimeDemand > 0 ? (rec.leadTimeDemand / rec.leadTimeDays).toFixed(1) : '0'}/day</span>
                    </div>
                  </div>
                </div>

                {/* Stockout Countdown & Suggested Quantity */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-medium text-slate-400 block">Stockout In</span>
                    <span className={`text-sm font-black ${
                      rec.daysOfStockRemaining <= rec.leadTimeDays ? 'text-rose-400' : 'text-slate-200'
                    }`}>
                      {rec.daysOfStockRemaining} days
                    </span>
                    <span className="text-[10px] text-slate-500 block">Deadline: {rec.orderDeadlineDate}</span>
                  </div>

                  <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                  <div>
                    <span className="text-[10px] uppercase font-medium text-slate-400 block">Suggested Order</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="number"
                          value={editQtyInput}
                          onChange={(e) => setEditQtyInput(Math.max(1, Number(e.target.value)))}
                          className="w-20 px-2 py-1 text-xs rounded bg-slate-900 border border-indigo-500 text-white font-mono"
                        />
                        <button
                          onClick={() => handleSaveEdit(rec.id)}
                          className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-indigo-400">
                          {rec.userModifiedQuantity || rec.suggestedQuantity} units
                        </span>
                        {rec.suggestedQuantity > 0 && (
                          <button
                            onClick={() => handleStartEdit(rec)}
                            title="Override quantity"
                            className="text-slate-500 hover:text-indigo-400 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      {rec.suggestedQuantity > 0 ? `${currentBusiness.currencySymbol}${rec.estimatedCost} • Pack of ${rec.packSize}` : 'No purchase needed'}
                    </span>
                  </div>
                </div>

                {/* User Control Action Buttons */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  {rec.suggestedQuantity > 0 && (
                    <button
                      onClick={() => updateRecommendationStatus(rec.id, isAccepted ? 'pending' : 'accepted')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isAccepted
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAccepted ? 'Accepted' : 'Accept'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => updateRecommendationStatus(rec.id, isSnoozed ? 'pending' : 'snoozed')}
                    title="Snooze recommendation for 7 days"
                    className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => updateRecommendationStatus(rec.id, isDismissed ? 'pending' : 'dismissed')}
                    title="Dismiss recommendation"
                    className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Explain</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expandable Plain-Language Explanation & Derivation */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-800 bg-slate-950/70 space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>{rec.explanationTitle}</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {rec.plainLanguageExplanation}
                    </p>
                  </div>

                  {/* Mathematical Step-by-Step Breakdown */}
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block mb-2">
                      Mathematical Inputs & Formula Derivation
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {rec.calculationBreakdown.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{item.label}</span>
                          <span className="text-xs font-mono font-bold text-white block mt-0.5">{item.value}</span>
                          <span className="text-[10px] text-slate-400 block mt-1">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assumptions List */}
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block mb-1.5">
                      Documented Assumptions & Constraints
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                      {rec.assumptions.map((assump, idx) => (
                        <li key={idx}>{assump}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
