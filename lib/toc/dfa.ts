import { AutomatonStateId, AutomatonEvent, AutomatonState, DFAEvaluationResult } from '@/types';

export const DFA_STATES: Record<AutomatonStateId, AutomatonState> = {
  Q0_OPTIMAL: {
    id: 'Q0_OPTIMAL',
    label: 'Healthy Stock',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Stock levels are within target operating bounds. Current inventory comfortably covers lead-time demand plus safety buffers without tying up idle capital.',
    actionGuidance: 'No purchase action needed. Routine monitoring.',
    isAcceptingOrAlert: false,
  },
  Q1_WATCHLIST: {
    id: 'Q1_WATCHLIST',
    label: 'Watchlist',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Stock is adequate but approaching reorder threshold (within 20% of ROP). At current sales velocity, an order trigger will fire soon.',
    actionGuidance: 'Review supplier lead-times and prepare draft PO.',
    isAcceptingOrAlert: false,
  },
  Q2_REORDER: {
    id: 'Q2_REORDER',
    label: 'Reorder Due',
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    description: 'Stock has reached or dropped below the calculated Reorder Point. An order must be placed to ensure delivery before safety buffer depletion.',
    actionGuidance: 'Approve and dispatch replenishment purchase order.',
    isAcceptingOrAlert: true,
  },
  Q3_CRITICAL: {
    id: 'Q3_CRITICAL',
    label: 'Critical Risk',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse',
    description: 'Stock is at or below safety stock threshold, or remaining days of inventory will deplete before standard delivery can arrive.',
    actionGuidance: 'Expedite purchase order or arrange priority shipment.',
    isAcceptingOrAlert: true,
  },
  Q4_EXCESS: {
    id: 'Q4_EXCESS',
    label: 'Overstocked',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    description: 'Inventory exceeds 90 days of forward demand, locking up working capital and increasing storage holding costs.',
    actionGuidance: 'Pause reordering. Plan promotional campaigns or vendor return.',
    isAcceptingOrAlert: false,
  },
  Q5_INCOMING_BUFFER: {
    id: 'Q5_INCOMING_BUFFER',
    label: 'On Order / In Transit',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    description: 'On-hand stock is low, but an approved purchase order is actively in transit to replenish inventory.',
    actionGuidance: 'Track carrier shipping milestones and prepare warehouse receiving.',
    isAcceptingOrAlert: false,
  },
};

export interface ProductInventoryMetrics {
  currentStock: number;
  reservedStock: number;
  incomingStock: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  averageDailyDemand: number;
}

/**
 * Finite-State Inventory Evaluator
 * Operates on mathematical supply chain thresholds
 */
export function evaluateInventoryDFA(metrics: ProductInventoryMetrics): DFAEvaluationResult {
  const usableOnShelf = Math.max(0, metrics.currentStock - metrics.reservedStock);
  const totalUsableWithIncoming = usableOnShelf + metrics.incomingStock;
  const burnRate = metrics.averageDailyDemand > 0 ? metrics.averageDailyDemand : 0.001;
  const daysRemaining = usableOnShelf / burnRate;
  const hasIncoming = metrics.incomingStock > 0;
  const excessThresholdDays = 90;
  const excessQuantityThreshold = Math.max(metrics.reorderPoint * 2.8, metrics.safetyStock * 4);

  let state: AutomatonStateId = 'Q0_OPTIMAL';
  let event: AutomatonEvent = 'DEMAND_CONSUMED';
  let reason = '';
  let formalProof = '';

  if (usableOnShelf <= 0 || (usableOnShelf <= metrics.safetyStock && daysRemaining < metrics.leadTimeDays)) {
    if (hasIncoming && totalUsableWithIncoming >= metrics.reorderPoint) {
      state = 'Q5_INCOMING_BUFFER';
      event = 'PO_PLACED';
      reason = `On-hand stock (${usableOnShelf}) is low, but ${metrics.incomingStock} units are on an approved PO in transit.`;
      formalProof = `Usable (${usableOnShelf}) <= SafetyStock (${metrics.safetyStock}) ∧ Inbound (${metrics.incomingStock}) >= Deficit ⇒ In Transit Buffer`;
    } else {
      state = 'Q3_CRITICAL';
      event = 'STOCKOUT_IMMINENT';
      reason = `Usable stock (${usableOnShelf}) is below safety threshold (${metrics.safetyStock}) with ${daysRemaining.toFixed(1)} days of coverage (lead time is ${metrics.leadTimeDays}d).`;
      formalProof = `Usable (${usableOnShelf}) <= SafetyStock (${metrics.safetyStock}) ∧ No Active Inbound ⇒ Critical Stockout Risk`;
    }
  } else if (usableOnShelf <= metrics.reorderPoint) {
    if (hasIncoming && totalUsableWithIncoming >= metrics.reorderPoint) {
      state = 'Q5_INCOMING_BUFFER';
      event = 'PO_PLACED';
      reason = `Stock (${usableOnShelf}) is below reorder point (${metrics.reorderPoint}), but replenishment of ${metrics.incomingStock} is in transit.`;
      formalProof = `Usable (${usableOnShelf}) <= ROP (${metrics.reorderPoint}) ∧ Inbound covers deficit ⇒ In Transit Buffer`;
    } else {
      state = 'Q2_REORDER';
      event = 'BELOW_ROP';
      reason = `Usable stock (${usableOnShelf}) crossed below Reorder Point (${metrics.reorderPoint}). Order placement required.`;
      formalProof = `SafetyStock < Usable (${usableOnShelf}) <= ROP (${metrics.reorderPoint}) ∧ Inbound = 0 ⇒ Reorder Due`;
    }
  } else if (usableOnShelf <= metrics.reorderPoint * 1.25) {
    state = 'Q1_WATCHLIST';
    event = 'DEMAND_CONSUMED';
    reason = `Usable stock (${usableOnShelf}) is within 25% of reorder threshold (${metrics.reorderPoint}).`;
    formalProof = `ROP (${metrics.reorderPoint}) < Usable (${usableOnShelf}) <= 1.25 * ROP ⇒ Watchlist Alert`;
  } else if (daysRemaining > excessThresholdDays || usableOnShelf > excessQuantityThreshold) {
    state = 'Q4_EXCESS';
    event = 'EXCESS_ACCUMULATED';
    reason = `On-hand inventory (${usableOnShelf}) represents ${daysRemaining.toFixed(0)} days of forward demand (> ${excessThresholdDays}d).`;
    formalProof = `Days Remaining (${daysRemaining.toFixed(1)}) > 90d ∨ Usable (${usableOnShelf}) > ${excessQuantityThreshold} ⇒ Overstocked`;
  } else {
    state = 'Q0_OPTIMAL';
    event = 'DEMAND_CONSUMED';
    reason = `Inventory (${usableOnShelf}) comfortably covers lead-time demand + safety buffer (${metrics.reorderPoint}).`;
    formalProof = `ROP < Usable (${usableOnShelf}) <= Excess Threshold ⇒ Healthy Stock`;
  }

  return {
    currentState: state,
    stateDetails: DFA_STATES[state],
    inputMetrics: {
      usableStock: usableOnShelf,
      reorderPoint: metrics.reorderPoint,
      safetyStock: metrics.safetyStock,
      daysRemaining: Number(daysRemaining.toFixed(1)),
      hasIncomingOrder: hasIncoming,
      excessThreshold: Math.round(excessQuantityThreshold),
    },
    transitionHistory: [
      {
        fromState: state === 'Q0_OPTIMAL' ? 'Q1_WATCHLIST' : 'Q0_OPTIMAL',
        event,
        toState: state,
        reason,
        timestamp: new Date().toISOString(),
      }
    ],
    explanation: reason,
    formalProof,
  };
}
