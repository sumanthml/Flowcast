'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { InventoryMovement, MovementType } from '@/types';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  AlertTriangle,
  User
} from 'lucide-react';

export function MovementsTab() {
  const { movements, currentBusiness } = useInventory();
  
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMovements = movements.filter(m => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesSearch = 
      (m.productName && m.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.productSku && m.productSku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'SKU', 'Product Name', 'Movement Type', 'Qty Change', 'Previous Stock', 'New Stock', 'Reason', 'Reference ID', 'Performed By'];
    const rows = filteredMovements.map(m => [
      `"${m.timestamp}"`,
      `"${m.productSku || ''}"`,
      `"${m.productName || ''}"`,
      `"${m.type}"`,
      m.quantityChange,
      m.previousStock,
      m.newStock,
      `"${m.reason.replace(/"/g, '""')}"`,
      `"${m.referenceId || ''}"`,
      `"${m.performedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_movements_${currentBusiness.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'purchase_received':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[10px]">Purchase Received</span>;
      case 'sale':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium text-[10px]">Sale</span>;
      case 'manual_correction':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium text-[10px]">Manual Correction</span>;
      case 'waste_expired':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-[10px]">Waste / Expired</span>;
      case 'customer_return':
        return <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium text-[10px]">Customer Return</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium text-[10px]">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Traceable Movement History & Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Every inventory change is cryptographically traceable with user attribution, timestamp, and audit reason.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU, reason, or reference ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
          >
            <option value="all">All Movement Types ({movements.length})</option>
            <option value="purchase_received">Purchase Received</option>
            <option value="sale">Sale Dispatched</option>
            <option value="manual_correction">Manual Count Correction</option>
            <option value="waste_expired">Waste / Expired</option>
            <option value="customer_return">Customer Return</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date / Time (UTC)</th>
                <th className="py-3 px-4">SKU / Product</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Quantity Change</th>
                <th className="py-3 px-4">Stock Balance</th>
                <th className="py-3 px-4">Audit Reason & Reference</th>
                <th className="py-3 px-4">Attributed User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMovements.map(m => {
                const isPositive = m.quantityChange > 0;

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{m.productName || 'Product'}</div>
                      <div className="text-[11px] font-mono text-slate-400">{m.productSku}</div>
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(m.type)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-mono font-bold">
                        {isPositive ? (
                          <span className="text-emerald-400 flex items-center">
                            <ArrowUpRight className="w-3.5 h-3.5" /> +{m.quantityChange}
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> {m.quantityChange}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <span className="text-slate-500">{m.previousStock}</span>
                      <span className="mx-1.5 text-slate-600">→</span>
                      <span className="font-bold text-white">{m.newStock}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs">
                      <div>{m.reason}</div>
                      {m.referenceId && (
                        <div className="text-[10px] font-mono text-indigo-400 mt-0.5">
                          Ref: {m.referenceId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{m.performedBy}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
