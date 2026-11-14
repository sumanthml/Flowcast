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
  Zap,
  Activity
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

  // Interactive Simulation Overrides
  const [simStock, setSimStock] = useState<number>(activeProduct ? activeProduct.currentStock : 20);
  const [simIncoming, setSimIncoming] = useState<number>(activeProduct ? activeProduct.incomingStock : 0);
  const [simROP, setSimROP] = useState<number>(activeProduct ? activeProduct.reorderPoint : 30);
  const [simSafety, setSimSafety] = useState<number>(activeProduct ? activeProduct.safetyStock : 10);

  useEffect(() => {
    if (activeProduct) {
      setSimStock(activeProduct.currentStock);
      setSimIncoming(activeProduct.incomingStock);
      setSimROP(activeProduct.reorderPoint);
      setSimSafety(activeProduct.safetyStock);
    }
  }, [selectedProductId]);

  // Evaluate State Machine
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

  const handleRunTMSimulation = () => {
    const sim = simulateInventoryDeciderTM(simStock, simROP);
    setTmSimulation(sim);
    setTmCurrentStepIndex(0);
    setTmIsPlaying(false);
  };

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

  // Clean SVG Node Layout
  const stateNodes: Record<AutomatonStateId, { x: number; y: number; label: string; sub: string }> = {
    Q0_OPTIMAL: { x: 200, y: 75, label: 'Healthy', sub: 'Optimal Range' },
    Q1_WATCHLIST: { x: 400, y: 75, label: 'Watchlist', sub: 'Near Threshold' },
    Q2_REORDER: { x: 500, y: 210, label: 'Reorder', sub: 'Order Required' },
    Q3_CRITICAL: { x: 400, y: 340, label: 'Critical', sub: 'Stockout Risk' },
    Q4_EXCESS: { x: 80, y: 210, label: 'Excess', sub: 'Overstocked' },
    Q5_INCOMING_BUFFER: { x: 230, y: 210, label: 'Inbound', sub: 'Shipment En Route' },
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Logic Engine & State Diagnostics</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Automated finite-state classification engine and deterministic decision-verification procedures.
          </p>
        </div>

        {/* Product Picker */}
        <div className="flex items-center gap-3">
          <label className="text-slate-400">Inspected Product:</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Part 1: Automated Inventory State Machine */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Automated Inventory State Classifier</span>
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Live status transitions evaluated deterministically from usable stock, burn rate, and inbound buffers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Status:</span>
            <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase border ${dfaResult.stateDetails.badgeColor}`}>
              {dfaResult.stateDetails.label}
            </span>
          </div>
        </div>

        {/* SVG State Transition Graph */}
        <div className="relative w-full overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-4 flex justify-center">
          <svg viewBox="0 0 600 400" className="w-full max-w-2xl h-80">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Transition Lines */}
            <path d="M 200 75 L 400 75" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 400 75 L 500 210" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 500 210 L 400 340" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 400 340 L 230 210" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 230 210 L 200 75" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 200 75 L 80 210" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 80 210 L 200 75" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Transition Labels */}
            <text x="300" y="65" fill="#94a3b8" fontSize="10" textAnchor="middle">sales burn</text>
            <text x="465" y="140" fill="#94a3b8" fontSize="10" textAnchor="middle">stock ≤ ROP</text>
            <text x="460" y="290" fill="#f43f5e" fontSize="10" textAnchor="middle">stock ≤ safety buffer</text>
            <text x="300" y="290" fill="#06b6d4" fontSize="10" textAnchor="middle">PO placed</text>
            <text x="200" y="150" fill="#10b981" fontSize="10" textAnchor="middle">PO received</text>
            <text x="110" y="140" fill="#c084fc" fontSize="10" textAnchor="middle">coverage &gt; 90d</text>

            {/* State Nodes */}
            {(Object.keys(stateNodes) as AutomatonStateId[]).map(sId => {
              const node = stateNodes[sId];
              const isActive = dfaResult.currentState === sId;
              const isAlert = sId === 'Q2_REORDER' || sId === 'Q3_CRITICAL';

              return (
                <g key={sId} className="cursor-pointer">
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
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isAlert ? "30" : "26"}
                    fill={isActive ? (sId === 'Q3_CRITICAL' ? '#881337' : '#312e81') : '#0f172a'}
                    stroke={isActive ? (sId === 'Q3_CRITICAL' ? '#f43f5e' : '#818cf8') : '#334155'}
                    strokeWidth={isActive ? "3" : "1.5"}
                  />
                  {isAlert && (
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
                    fill={isActive ? '#ffffff' : '#e2e8f0'}
                    fontSize="11"
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

        {/* Transition Rationale Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Zap className="w-3.5 h-3.5" />
              <span>Current Status Assessment</span>
            </span>
            <p className="text-slate-300 leading-relaxed">
              {dfaResult.explanation}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Info className="w-3.5 h-3.5" />
              <span>Operational Action Directive</span>
            </span>
            <p className="text-emerald-300 leading-relaxed font-medium">
              {dfaResult.stateDetails.actionGuidance}
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
              Evaluated: Usable On-Hand {dfaResult.inputMetrics.usableStock} | ROP {dfaResult.inputMetrics.reorderPoint} | Safety Buffer {dfaResult.inputMetrics.safetyStock}
            </div>
          </div>
        </div>

        {/* Live Simulation Controls */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Interactive Threshold Simulation</span>
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
              <RotateCcw className="w-3 h-3" /> Reset Values
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
                <span className="text-slate-400">Inbound Orders:</span>
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
                <span className="text-slate-400">Reorder Threshold (ROP):</span>
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
                <span className="text-slate-400">Safety Reserve:</span>
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

      {/* Part 2: Computational Decision Verification Simulator */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Computational Decision Verification Simulator</span>
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Demonstrating formal step-by-step decision procedures for automated inventory deficit evaluation.
            </p>
          </div>

          <button
            onClick={handleRunTMSimulation}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md"
          >
            Re-run Verification Trace
          </button>
        </div>

        {/* Verification Tape Strip */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Execution State</span>
              <span className="text-sm font-mono font-bold text-indigo-400">{currentStep.currentState}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pointer Index</span>
              <span className="text-sm font-mono font-bold text-cyan-400">Cell #{currentStep.headPosition}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Execution Step</span>
              <span className="text-sm font-mono font-bold text-white">
                {currentStep.stepIndex} / {tmSimulation.steps.length - 1}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Outcome</span>
              {currentStep.currentState === 'q_accept' ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Order Deficit Verified
                </span>
              ) : currentStep.currentState === 'q_reject' ? (
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Stock Sufficient
                </span>
              ) : (
                <span className="text-xs font-mono text-amber-400">Evaluating...</span>
              )}
            </div>
          </div>

          {/* Visual Tape Cells */}
          <div className="overflow-x-auto py-3">
            <div className="flex items-center justify-center gap-1 min-w-max">
              {currentStep.tapeSnapshot.map((sym, idx) => {
                const isHead = idx === currentStep.headPosition;
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="h-4 flex items-center">
                      {isHead && <span className="text-indigo-400 text-xs font-bold">▼</span>}
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition-all ${
                      isHead
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/50 scale-105 shadow-md'
                        : sym === 'X' || sym === 'Y'
                        ? 'bg-slate-900 text-slate-500 border-slate-800'
                        : 'bg-slate-900/90 text-white border-slate-700'
                    }`}>
                      {sym}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1">{idx}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs">
            👉 {currentStep.actionDescription}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setTmCurrentStepIndex(0)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTmIsPlaying(!tmIsPlaying)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              {tmIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{tmIsPlaying ? 'Pause' : 'Play Trace'}</span>
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
