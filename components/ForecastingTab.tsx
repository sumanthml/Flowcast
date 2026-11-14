'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { generateDemandForecast, buildDailyTimeSeries } from '@/lib/forecasting/engine';
import { ForecastMethod } from '@/types';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart2, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';

interface ForecastingTabProps {
  selectedProductId?: string;
}

export function ForecastingTab({ selectedProductId }: ForecastingTabProps) {
  const { products, sales, currentBusiness } = useInventory();
  
  const [activeProductId, setActiveProductId] = useState<string>(
    selectedProductId || (products[0] ? products[0].id : '')
  );
  const [selectedMethod, setSelectedMethod] = useState<ForecastMethod | 'auto'>('auto');
  const [horizonDays, setHorizonDays] = useState<number>(30);

  const activeProduct = products.find(p => p.id === activeProductId) || products[0];

  if (!activeProduct) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        No products available in current catalog. Add a product to run forecasts.
      </div>
    );
  }

  // Filter sales for this product
  const productSales = sales.filter(s => s.productId === activeProduct.id);
  const forecast = generateDemandForecast(activeProduct.id, productSales, selectedMethod, horizonDays);
  const historySeries = buildDailyTimeSeries(productSales, 45);

  // Combine historical and forecast points for continuous chart visualization
  const chartData = [
    ...historySeries.map(h => ({
      date: h.date.slice(5), // MM-DD
      actualSales: h.quantity,
      forecastDemand: null,
      confidence80Upper: null,
      confidence80Lower: null,
      confidence95Upper: null,
      confidence95Lower: null,
    })),
    ...forecast.forecastPoints.map(f => ({
      date: f.date.slice(5),
      actualSales: null,
      forecastDemand: f.expectedDemand,
      confidence80Upper: f.upperConfidence80,
      confidence80Lower: f.lowerConfidence80,
      confidence95Upper: f.upperConfidence95,
      confidence95Lower: f.lowerConfidence95,
    }))
  ];

  return (
    <div className="space-y-6">
      
      {/* Header & SKU Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span>Statistical Demand Forecasting</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real time-series algorithms with rolling backtesting and confidence intervals.
          </p>
        </div>

        {/* Product Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Select Product:</label>
          <select
            value={activeProduct.id}
            onChange={(e) => setActiveProductId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Model Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        
        {/* Method Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Algorithm:</span>
          {[
            { id: 'auto', label: 'Auto-Select (Lowest RMSE)' },
            { id: 'sma', label: 'Simple Moving Avg' },
            { id: 'wma', label: 'Weighted Moving Avg' },
            { id: 'ses', label: 'Single Exponential (SES)' },
            { id: 'holt', label: "Holt's Linear Trend" },
            { id: 'croston', label: "Croston's Intermittent" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMethod(m.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedMethod === m.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Horizon selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Horizon:</span>
          {[14, 30, 60].map(days => (
            <button
              key={days}
              onClick={() => setHorizonDays(days)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                horizonDays === days
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Active Model Label & Disclaimer */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-indigo-400">Active Formulation:</span>
          <span className="text-slate-200">{forecast.methodLabel}</span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Statistical Estimate
          </span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Based on {forecast.historicalDaysCount} days history ({forecast.totalHistoricalVolume} units sold)
        </div>
      </div>

      {/* Main Interactive Time-Series Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Daily Historical Demand & Forward Projection Horizon
            </h3>
            <p className="text-xs text-slate-400">
              Blue bars represent actual daily transactions; Indigo line is the projected mean; Shaded band is the 80% confidence interval.
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="ci80Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#f8fafc' 
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
              
              {/* Actual Sales */}
              <Line 
                type="monotone" 
                dataKey="actualSales" 
                stroke="#06b6d4" 
                strokeWidth={2} 
                dot={{ r: 2, fill: '#06b6d4' }} 
                name="Actual Daily Sales" 
              />
              
              {/* Confidence Interval 80% */}
              <Area 
                type="monotone" 
                dataKey="confidence80Upper" 
                stroke="transparent" 
                fill="url(#ci80Grad)" 
                name="80% Confidence Band" 
              />
              <Area 
                type="monotone" 
                dataKey="confidence80Lower" 
                stroke="transparent" 
                fill="#0f172a" 
              />

              {/* Point Forecast */}
              <Line 
                type="monotone" 
                dataKey="forecastDemand" 
                stroke="#818cf8" 
                strokeWidth={3} 
                strokeDasharray="4 4" 
                dot={false} 
                name="Forecast Demand" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Backtesting Accuracy Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400 block">MAE (Mean Absolute Error)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {forecast.backtestMetrics ? `${forecast.backtestMetrics.mae} units` : 'N/A'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Average absolute difference between actual & predicted.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400 block">MAPE (Accuracy % Error)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-400">
              {forecast.backtestMetrics ? `${forecast.backtestMetrics.mape}%` : 'N/A'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Mean percentage error across active sales days.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400 block">RMSE (Root Mean Square)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {forecast.backtestMetrics ? `${forecast.backtestMetrics.rmse}` : 'N/A'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Penalizes large outlier forecast errors heavily.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400 block">Tracking Signal (Bias)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-indigo-400">
              {forecast.backtestMetrics ? `${forecast.backtestMetrics.trackingSignal}` : 'N/A'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Values between -4 and +4 indicate unbiased forecasting.</p>
        </div>

      </div>

      {/* Honest Limitations & Model Documentation */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          <span>Model Assumptions, Data Coverage & Limitations</span>
        </h4>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 leading-relaxed">
          {forecast.limitations.map((lim, idx) => (
            <li key={idx}>{lim}</li>
          ))}
          <li>
            <strong>Data Privacy:</strong> Historical sales records are evaluated strictly locally on the client/application server. Private sales data is never shared with external AI services without explicit user initiation.
          </li>
        </ul>
      </div>

    </div>
  );
}
