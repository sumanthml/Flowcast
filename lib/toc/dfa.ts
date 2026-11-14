import { AutomatonStateId, AutomatonEvent, AutomatonState, DFAEvaluationResult } from '@/types';

export const DFA_STATES: Record<AutomatonStateId, AutomatonState> = {
  Q0_OPTIMAL: {
    id: 'Q0_OPTIMAL',
    label: 'Q0: Optimal Stock',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Inventory levels are within the target operating corridor. Stock covers lead-time demand plus safety cushion without tying up excess capital.',
    actionGuidance: 'No immediate purchase action needed. Continue routine monitoring.',
    isAcceptingOrAlert: false,
  },
  Q1_WATCHLIST: {
    id: 'Q1_WATCHLIST',
    label: 'Q1: Approaching Threshold',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Stock is currently sufficient, but within 20% of the Reorder Point. At current burn rates, order trigger will fire soon.',
    actionGuidance: 'Review supplier lead-times and prepare draft requisition.',
    isAcceptingOrAlert: false,
  },
  Q2_REORDER: {
    id: 'Q2_REORDER',
    label: 'Q2: Reorder Triggered (ROP)',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    description: 'Usable stock has crossed at or below the calculated Reorder Point. Without a placed PO, stockout will occur during supplier lead time.',
    actionGuidance: 'Place replenishment purchase order up to target maximum inventory.',
    isAcceptingOrAlert: true,
  },
  Q3_CRITICAL: {
    id: 'Q3_CRITICAL',
    label: 'Q3: Stockout Imminent',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
    description: 'Stock is below Safety Stock threshold or will deplete before standard supplier lead-time delivery can arrive.',
    actionGuidance: 'Expedite purchase order or request emergency air freight/supplier priority.',
    isAcceptingOrAlert: true,
  },
  Q4_EXCESS: {
    id: 'Q4_EXCESS',
    label: 'Q4: Capital Overstock',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    description: 'Inventory exceeds 90 days of forward demand or 3x the economic order threshold, locking up working capital and risking obsolescence.',
    actionGuidance: 'Halt replenishment. Consider promotional discount, bundle, or vendor return.',
    isAcceptingOrAlert: false,
  },
  Q5_INCOMING_BUFFER: {
    id: 'Q5_INCOMING_BUFFER',
    label: 'Q5: Replenishment In Transit',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'On-hand stock is low, but an active Purchase Order is in transit covering the lead-time deficit.',
    actionGuidance: 'Track PO delivery milestone with supplier. Await receiving dock scan.',
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
 * Deterministic Finite Automaton (DFA) Evaluator
 * M = (Q, Σ, δ, q0, F)
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

  // Formal transition rules δ(q, σ):
  if (usableOnShelf <= 0 || (usableOnShelf <= metrics.safetyStock && daysRemaining < metrics.leadTimeDays)) {
    // Critical state: depleted safety buffer or depleted shelf
    if (hasIncoming && totalUsableWithIncoming >= metrics.reorderPoint) {
      state = 'Q5_INCOMING_BUFFER';
      event = 'PO_PLACED';
      reason = `On-hand stock (${usableOnShelf}) is critically low, but ${metrics.incomingStock} units are on an approved PO en route.`;
      formalProof = `usableOnShelf (${usableOnShelf}) <= SafetyStock (${metrics.safetyStock}) ∧ incomingStock (${metrics.incomingStock}) >= deficit ⇒ Transition to Q5`;
    } else {
      state = 'Q3_CRITICAL';
      event = 'STOCKOUT_IMMINENT';
      reason = `On-hand usable stock (${usableOnShelf}) is below safety threshold (${metrics.safetyStock}) or days remaining (${daysRemaining.toFixed(1)}d) < lead time (${metrics.leadTimeDays}d).`;
      formalProof = `usableOnShelf (${usableOnShelf}) <= SafetyStock (${metrics.safetyStock}) ∧ ¬PO_IN_TRANSIT ⇒ Transition to Q3 [ALERT STATE]`;
    }
  } else if (usableOnShelf <= metrics.reorderPoint) {
    // Reorder Point triggered
    if (hasIncoming && totalUsableWithIncoming >= metrics.reorderPoint) {
      state = 'Q5_INCOMING_BUFFER';
      event = 'PO_PLACED';
      reason = `Stock (${usableOnShelf}) is at/below ROP (${metrics.reorderPoint}), but order of ${metrics.incomingStock} is already in transit.`;
      formalProof = `usableOnShelf (${usableOnShelf}) <= ROP (${metrics.reorderPoint}) ∧ totalWithIncoming (${totalUsableWithIncoming}) >= ROP ⇒ Q5`;
    } else {
      state = 'Q2_REORDER';
      event = 'BELOW_ROP';
      reason = `Usable stock (${usableOnShelf}) dropped below Reorder Point (${metrics.reorderPoint}). Order placement required.`;
      formalProof = `SafetyStock < usableOnShelf (${usableOnShelf}) <= ROP (${metrics.reorderPoint}) ∧ incomingStock = 0 ⇒ Q2 [ACTION STATE]`;
    }
  } else if (usableOnShelf <= metrics.reorderPoint * 1.25) {
    // Watchlist buffer
    state = 'Q1_WATCHLIST';
    event = 'DEMAND_CONSUMED';
    reason = `Usable stock (${usableOnShelf}) is within 25% of ROP (${metrics.reorderPoint}). Approaching trigger condition.`;
    formalProof = `ROP (${metrics.reorderPoint}) < usableOnShelf (${usableOnShelf}) <= 1.25 * ROP ⇒ Q1`;
  } else if (daysRemaining > excessThresholdDays || usableOnShelf > excessQuantityThreshold) {
    // Excess stock
    state = 'Q4_EXCESS';
    event = 'EXCESS_ACCUMULATED';
    reason = `Inventory on-hand (${usableOnShelf}) represents ${daysRemaining.toFixed(0)} days of forward demand (threshold: ${excessThresholdDays}d).`;
    formalProof = `daysRemaining (${daysRemaining.toFixed(1)}) > ${excessThresholdDays} ∨ usableOnShelf (${usableOnShelf}) > ${excessQuantityThreshold} ⇒ Q4`;
  } else {
    // Optimal
    state = 'Q0_OPTIMAL';
    event = 'DEMAND_CONSUMED';
    reason = `Usable stock (${usableOnShelf}) comfortably covers lead-time demand + safety buffer (${metrics.reorderPoint}) without excess.`;
    formalProof = `ROP (${metrics.reorderPoint}) * 1.25 < usableOnShelf (${usableOnShelf}) <= ExcessThreshold ⇒ Q0`;
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
