'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { Product, MovementType } from '@/types';
import { AlertCircle, History, X } from 'lucide-react';

interface StockMovementModalProps {
  product: Product | null;
  onClose: () => void;
}

export function StockMovementModal({ product, onClose }: StockMovementModalProps) {
  const { recordMovement, userRole } = useInventory();

  const [type, setType] = useState<MovementType>('manual_correction');
  const [quantity, setQuantity] = useState<number>(1);
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');

  if (!product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const delta = direction === 'increase' ? Math.abs(quantity) : -Math.abs(quantity);
    recordMovement(product.id, type, delta, reason.trim(), referenceId.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">
              Record Traceable Movement
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-4">
          <p className="font-bold text-white">{product.name}</p>
          <p className="text-slate-400 font-mono mt-0.5">
            {product.sku} • Current On-Hand: <span className="text-emerald-400 font-bold">{product.currentStock} {product.unitOfMeasure}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="text-slate-400 block mb-1">Movement Classification *</label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as MovementType;
                setType(newType);
                if (newType === 'waste_expired' || newType === 'sale') {
                  setDirection('decrease');
                } else if (newType === 'purchase_received' || newType === 'customer_return') {
                  setDirection('increase');
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium"
            >
              <option value="manual_correction">Manual Count Correction (Cycle Count)</option>
              <option value="purchase_received">Purchase Received (Inbound Receiving)</option>
              <option value="waste_expired">Waste / Damaged / Expired</option>
              <option value="customer_return">Customer Return to Stock</option>
              <option value="sale">Manual Direct Sale</option>
              <option value="transfer_in">Store Transfer In</option>
              <option value="transfer_out">Store Transfer Out</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Adjustment Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium"
              >
                <option value="increase">+ Increase Stock</option>
                <option value="decrease">- Decrease Stock</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Quantity ({product.unitOfMeasure}) *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Audit Reason / Justification *</label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Physical inventory discrepancy identified during Friday warehouse cycle count"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Reference ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. AUDIT-BATCH-2026, PO-1049"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <span>
              All movements are written immutably to the audit log and attributed to <strong className="text-slate-200 capitalize">{userRole} user</strong>.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
            >
              Commit Traceable Movement
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
