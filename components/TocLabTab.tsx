'use client';

import React, { useState, useEffect } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { DFA_STATES, evaluateInventoryDFA } from '@/lib/toc/dfa';
import { simulateInventoryDeciderTM } from '@/lib/toc/turing-machine';
import { AutomatonStateId, TuringSimulationResult } from '@/types';
import { 
  Cpu, 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Info,
  Sliders,
  Terminal,
  Zap
} from 'lucide-react';

interface TocLabTabProps {
  initialProductId?: string;
}

export function TocLabTab({ initialProductId }: TocLabTabProps) {
  const { products, suppliers, sales } = useInventory();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || (products[0]?.id || '')
  );

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Interactive DFA Simulation Overrides
  const [simStock, setSimStock] = useState<number>(activeProduct ? activeProduct.currentStock : 20);
  const [simIncoming, setSimIncoming] = useState<number>(activeProduct ? activeProduct.incomingStock : 0);
  const [simROP, setSimROP] = useState<number>(activeProduct ? activeProduct.reorderPoint : 30);
  const [simSafety, setSimSafety] = useState<number>(activeProduct ? activeProduct.safetyStock : 10);

  // Sync simulation sliders when active product changes
  useEffect(() => {
    if (activeProduct) {
      setSimStock(activeProduct.currentStock);
      setSimIncoming(activeProduct.incomingStock);
      setSimROP(activeProduct.reorderPoint);
      setSimSafety(activeProduct.safetyStock);
    }
  }, [selectedProductId]);

  // Evaluate Live DFA
  const dfaResult = evaluateInventoryDFA({
    currentStock: simStock,
    reservedStock: activeProduct ? activeProduct.reservedStock : 0,
    incomingStock: simIncoming,
    reorderPoint: simROP,
    safetyStock: simSafety,
    leadTimeDays: activeProduct ? activeProduct.leadTimeDays : 7,
    averageDailyDemand: 2.5,
  });

  // Turing Machine Decider State
  const [tmSimulation, setTmSimulation] = useState<TuringSimulationResult>(() => 
    simulateInventoryDeciderTM(simStock, simROP)
  );
  const [tmCurrentStepIndex, setTmCurrentStepIndex] = useState<number>(0);
  const [tmIsPlaying, setTmIsPlaying] = useState<boolean>(false);

  // Re-run TM simulation when stock or ROP values change
  const handleRunTMSimulation = () => {
    const sim = simulateInventoryDeciderTM(simStock, simROP);
    setTmSimulation(sim);
    setTmCurrentStepIndex(0);
    setTmIsPlaying(false);
  };

  // Playback timer for Turing Machine animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (tmIsPlaying) {
      timer = setInterval(() => {
        setTmCurrentStepIndex(prev => {
          if (prev >= tmSimulation.steps.length - 1) {
            setTmIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(timer);
  }, [tmIsPlaying, tmSimulation.steps.length]);

  const currentStep = tmSimulation.steps[tmCurrentStepIndex] || tmSimulation.steps[0];

  // SVG DFA State Nodes Coordinates
  const stateNodes: Record<AutomatonStateId, { x: number; y: number; label: string; sub: string }> = {
    Q0_OPTIMAL: { x: 200, y: 80, label: 'Q0', sub: 'Optimal' },
    Q1_WATCHLIST: { x: 380, y: 80, label: 'Q1', sub: 'Watchlist' },
    Q2_REORDER: { x: 500, y: 220, label: 'Q2', sub: 'ROP Trigger' },
    Q3_CRITICAL: { x: 380, y: 340, label: 'Q3', sub: 'Critical' },
    Q4_EXCESS: { x: 80, y: 220, label: 'Q4', sub: 'Excess' },
    Q5_INCOMING_BUFFER: { x: 240, y: 220, label: 'Q5', sub: 'Inbound' },
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Theory of Computation Automata & Turing Machine Lab</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Formal inventory state classification via Deterministic Finite Automaton (DFA) and educational decider Turing Machine.
          </p>
        </div>

        {/* Product Picker */}
        <div className="flex items-center gap-3">
          <label className="text-slate-400">Target Product:</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Part 1: Deterministic Finite Automaton (DFA) Interactive Engine */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Inventory State DFA: M = (Q, Σ, δ, q₀, F)</span>
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Active state is computed deterministically from usable stock, burn rate, ROP, and inbound POs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Automaton State:</span>
            <span className={`px-2.5 py-1 rounded-full font-bold text-xs uppercase border ${dfaResult.stateDetails.badgeColor}`}>
              {dfaResult.currentState} ({dfaResult.stateDetails.label.split(': ')[1]})
            </span>
          </div>
        </div>

        {/* Interactive SVG Automaton State Graph */}
        <div className="relative w-full overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-4 flex justify-center">
          <svg viewBox="0 0 600 420" className="w-full max-w-2xl h-80">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Transition Arcs */}
            <path d="M 200 80 L 380 80" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 380 80 L 500 220" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 500 220 L 380 340" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 380 340 L 240 220" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 240 220 L 200 80" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 200 80 L 80 220" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 80 220 L 200 80" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Arc Labels */}
            <text x="290" y="70" fill="#94a3b8" fontSize="10" textAnchor="middle">sales_burn</text>
            <text x="455" y="145" fill="#94a3b8" fontSize="10" textAnchor="middle">usable ≤ ROP</text>
            <text x="460" y="295" fill="#f43f5e" fontSize="10" textAnchor="middle">usable ≤ SS</text>
            <text x="295" y="295" fill="#06b6d4" fontSize="10" textAnchor="middle">po_placed</text>
            <text x="205" y="155" fill="#10b981" fontSize="10" textAnchor="middle">po_received</text>
            <text x="110" y="145" fill="#ec4899" fontSize="10" textAnchor="middle">doir &gt; 90d</text>

            {/* State Nodes */}
            {(Object.keys(stateNodes) as AutomatonStateId[]).map(sId => {
              const node = stateNodes[sId];
              const isActive = dfaResult.currentState === sId;
              const isAlertState = sId === 'Q2_REORDER' || sId === 'Q3_CRITICAL';

              return (
                <g key={sId} className="cursor-pointer">
                  {/* Glow ring for active state */}
                  {isActive && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="36"
                      fill="none"
                      stroke={sId === 'Q3_CRITICAL' ? '#f43f5e' : '#6366f1'}
                      strokeWidth="3"
                      className="animate-ping opacity-60"
                    />
                  )}
                  {/* Outer circle (double circle for accepting/alert states) */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isAlertState ? "30" : "26"}
                    fill={isActive ? (sId === 'Q3_CRITICAL' ? '#881337' : '#312e81') : '#0f172a'}
                    stroke={isActive ? (sId === 'Q3_CRITICAL' ? '#f43f5e' : '#818cf8') : '#334155'}
                    strokeWidth={isActive ? "3" : "1.5"}
                  />
                  {isAlertState && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="24"
                      fill="none"
                      stroke={isActive ? '#818cf8' : '#334155'}
                      strokeWidth="1"
                    />
                  )}
                  <text
                    x={node.x}
                    y={node.y + 4}
                    fill={isActive ? '#ffffff' : '#cbd5e1'}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 44}
                    fill={isActive ? '#ffffff' : '#64748b'}
                    fontSize="10"
                    fontWeight={isActive ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {node.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* State Derivation & Formal Proof Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>State Transition Justification</span>
            </span>
            <p className="text-slate-300 leading-relaxed">
              {dfaResult.explanation}
            </p>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300">
              δ({dfaResult.transitionHistory[0]?.fromState || 'q0'}, {dfaResult.transitionHistory[0]?.event || 'EVENT'}) = {dfaResult.currentState}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Info className="w-3.5 h-3.5" />
              <span>Formal Propositional Proof</span>
            </span>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 leading-relaxed">
              {dfaResult.formalProof}
            </div>
            <p className="text-[10px] text-slate-400">
              Guidance: {dfaResult.stateDetails.actionGuidance}
            </p>
          </div>
        </div>

        {/* Live Interactive Sliders: Test DFA State Transitions */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simulate Inventory Values (Live DFA Playground)</span>
            </span>
            <button
              onClick={() => {
                if (activeProduct) {
                  setSimStock(activeProduct.currentStock);
                  setSimIncoming(activeProduct.incomingStock);
                  setSimROP(activeProduct.reorderPoint);
                  setSimSafety(activeProduct.safetyStock);
                }
              }}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Actual SKU
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">On-Hand Stock:</span>
                <span className="font-bold text-white">{simStock}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simStock}
                onChange={(e) => setSimStock(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Incoming POs:</span>
                <span className="font-bold text-white">{simIncoming}</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={simIncoming}
                onChange={(e) => setSimIncoming(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Reorder Point (ROP):</span>
                <span className="font-bold text-white">{simROP}</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={simROP}
                onChange={(e) => setSimROP(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Safety Buffer:</span>
                <span className="font-bold text-white">{simSafety}</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={simSafety}
                onChange={(e) => setSimSafety(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Part 2: Educational Turing Machine Tape Decider Simulator */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Educational Turing Machine Decider: L = &#123; ▷ 1ˢ # 1ʳ ◁ | s ≤ r &#125;</span>
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Formal step-by-step trace of a 7-tuple Turing Machine verifying inventory deficit.
            </p>
          </div>

          <button
            onClick={handleRunTMSimulation}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Re-encode Tape with Current Stock
          </button>
        </div>

        {/* Academic Honest Disclaimer */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-slate-300 space-y-1">
          <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Academic Specification & Transparency Note</span>
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This module provides an exact, rigorous interactive trace of a formal Turing Machine decider over tape-encoded inventory states.
            As documented in product specifications, empirical statistical demand forecasting is implemented via our dedicated statistical time-series engine (SMA, Holt-Winters, Croston's), and not fabricated via a Turing Machine.
          </p>
        </div>

        {/* Turing Machine Tape Visualizer */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tape State</span>
              <span className="text-sm font-mono font-bold text-indigo-400">{currentStep.currentState}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Head Position</span>
              <span className="text-sm font-mono font-bold text-cyan-400">Cell #{currentStep.headPosition}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Step Counter</span>
              <span className="text-sm font-mono font-bold text-white">
                {currentStep.stepIndex} / {tmSimulation.steps.length - 1}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Halting Decision</span>
              {currentStep.currentState === 'q_accept' ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Accepted (Reorder Needed)
                </span>
              ) : currentStep.currentState === 'q_reject' ? (
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Rejected (Stock Sufficient)
                </span>
              ) : (
                <span className="text-xs font-mono text-amber-400">Computing...</span>
              )}
            </div>
          </div>

          {/* Tape Cells Horizontal Strip */}
          <div className="overflow-x-auto py-4">
            <div className="flex items-center justify-center gap-1 min-w-max">
              {currentStep.tapeSnapshot.map((sym, idx) => {
                const isHead = idx === currentStep.headPosition;
                return (
                  <div key={idx} className="flex flex-col items-center">
                    {/* Head Arrow */}
                    <div className="h-4 flex items-center">
                      {isHead && <span className="text-indigo-400 text-xs font-bold">▼</span>}
                    </div>
                    {/* Cell Box */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition-all ${
                      isHead
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/50 scale-105 shadow-md'
                        : sym === 'X' || sym === 'Y'
                        ? 'bg-slate-900 text-slate-500 border-slate-800'
                        : 'bg-slate-900/90 text-white border-slate-700'
                    }`}>
                      {sym}
                    </div>
                    {/* Cell Index */}
                    <span className="text-[9px] font-mono text-slate-500 mt-1">{idx}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Action Description */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs">
            👉 {currentStep.actionDescription}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setTmCurrentStepIndex(0)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset tape"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTmIsPlaying(!tmIsPlaying)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              {tmIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{tmIsPlaying ? 'Pause' : 'Play Simulation'}</span>
            </button>
            <button
              onClick={() => setTmCurrentStepIndex(prev => Math.min(tmSimulation.steps.length - 1, prev + 1))}
              disabled={tmCurrentStepIndex >= tmSimulation.steps.length - 1}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              title="Step forward"
            >
              <StepForward className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
