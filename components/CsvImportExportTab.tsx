'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import Papa from 'papaparse';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  RotateCcw,
  Plus
} from 'lucide-react';

interface ParsedRow {
  [key: string]: any;
}

interface ColumnMapping {
  sku: string;
  date: string;
  quantity: string;
  price: string;
  location: string;
}

export function CsvImportExportTab() {
  const { 
    currentBusiness, 
    products, 
    sales, 
    movements, 
    importSalesCSV, 
    recordSale 
  } = useInventory();

  // Wizard Steps: 1: Upload, 2: Map Columns, 3: Preview & Validate, 4: Complete
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    sku: '',
    date: '',
    quantity: '',
    price: '',
    location: '',
  });

  const [validationReport, setValidationReport] = useState<{
    validRows: any[];
    errors: { rowIndex: number; error: string; rawRow: any }[];
    duplicatesCount: number;
    suspiciousOutliers: number;
  }>({
    validRows: [],
    errors: [],
    duplicatesCount: 0,
    suspiciousOutliers: 0,
  });

  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  // Manual Sale Form State
  const [manualSku, setManualSku] = useState(products[0]?.sku || '');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualQty, setManualQty] = useState(1);
  const [manualPrice, setManualPrice] = useState(products[0]?.sellingPrice || 50);
  const [manualChannel, setManualChannel] = useState('In-Store POS');
  const [manualSaleSuccess, setManualSaleSuccess] = useState(false);

  // Handle CSV file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const parsedHeaders = results.meta.fields || (results.data[0] ? Object.keys(results.data[0] as object) : []);
          setHeaders(parsedHeaders);
          setRawRows(results.data as ParsedRow[]);

          // Auto-guess column mappings
          const guessMap: ColumnMapping = {
            sku: parsedHeaders.find(h => /sku|product_id|item_code|product/i.test(h)) || parsedHeaders[0] || '',
            date: parsedHeaders.find(h => /date|timestamp|time|sold_at/i.test(h)) || '',
            quantity: parsedHeaders.find(h => /qty|quantity|units|count/i.test(h)) || '',
            price: parsedHeaders.find(h => /price|amount|revenue|cost/i.test(h)) || '',
            location: parsedHeaders.find(h => /location|store|warehouse|channel/i.test(h)) || '',
          };
          setMapping(guessMap);
          setStep(2);
        }
      },
      error: (err) => {
        alert('Failed to parse CSV file: ' + err.message);
      }
    });
  };

  // Load sample CSV text for easy demonstration
  const handleLoadSampleCSV = () => {
    const sampleCSV = `SKU,Date,Quantity,Unit_Price,Channel
APX-HD-700,2026-11-10,4,249.99,Online Web
APX-HD-700,2026-11-11,2,249.99,Showroom
APX-MIC-PRO,2026-11-11,5,139.99,Direct POS
APX-CBL-10FT,2026-11-12,14,24.99,Online Web
APX-CBL-10FT,2026-11-12,14,24.99,Online Web
UNKNOWN-SKU-999,2026-11-12,3,50.00,Test Channel
APX-HD-700,2026-11-13,-2,249.99,Return
APX-DAC-M1,2026-11-13,1,219.00,Showroom`;

    Papa.parse(sampleCSV, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setRawRows(results.data as ParsedRow[]);
        setMapping({
          sku: 'SKU',
          date: 'Date',
          quantity: 'Quantity',
          price: 'Unit_Price',
          location: 'Channel',
        });
        setStep(2);
      }
    });
  };

  // Run validation and duplicate checking
  const handleProceedToPreview = () => {
    const valid: any[] = [];
    const errors: { rowIndex: number; error: string; rawRow: any }[] = [];
    const seenRowSignatures = new Set<string>();
    let duplicates = 0;
    let suspicious = 0;

    rawRows.forEach((row, idx) => {
      const rawSku = String(row[mapping.sku] || '').trim();
      const rawDate = String(row[mapping.date] || '').trim();
      const rawQty = Number(row[mapping.quantity]);
      const rawPrice = Number(row[mapping.price] || 0);
      const rawLocation = String(row[mapping.location] || '');

      // Duplicate check
      const signature = `${rawSku}_${rawDate}_${rawQty}`;
      if (seenRowSignatures.has(signature)) {
        duplicates++;
      } else {
        seenRowSignatures.add(signature);
      }

      // Check product existence
      const matchedProd = products.find(p => p.sku.toLowerCase() === rawSku.toLowerCase());
      if (!matchedProd) {
        errors.push({
          rowIndex: idx + 1,
          error: `Unrecognized SKU '${rawSku}'. Product must exist in catalog prior to sales mapping.`,
          rawRow: row,
        });
        return;
      }

      // Quantity validation
      if (isNaN(rawQty) || rawQty <= 0) {
        errors.push({
          rowIndex: idx + 1,
          error: `Invalid quantity '${row[mapping.quantity]}'. Sales quantity must be a strictly positive integer.`,
          rawRow: row,
        });
        return;
      }

      // Suspicious outlier check: > 10x normal product pack or > 100 units
      if (rawQty > Math.max(100, matchedProd.packSize * 15)) {
        suspicious++;
      }

      // Date check
      if (!rawDate || isNaN(Date.parse(rawDate))) {
        errors.push({
          rowIndex: idx + 1,
          error: `Invalid date format '${rawDate}'. Expected ISO YYYY-MM-DD.`,
          rawRow: row,
        });
        return;
      }

      valid.push({
        productId: matchedProd.id,
        productSku: matchedProd.sku,
        date: rawDate.split('T')[0],
        quantitySold: rawQty,
        unitPrice: rawPrice > 0 ? rawPrice : matchedProd.sellingPrice,
        channel: rawLocation || 'CSV Import',
      });
    });

    setValidationReport({
      validRows: valid,
      errors,
      duplicatesCount: duplicates,
      suspiciousOutliers: suspicious,
    });
    setStep(3);
  };

  // Commit valid rows
  const handleCommitImport = () => {
    const result = importSalesCSV(validationReport.validRows);
    setImportResult(result);
    setStep(4);
  };

  // Manual sale record submit
  const handleManualSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.sku === manualSku);
    if (!prod) return;

    recordSale({
      productId: prod.id,
      productSku: prod.sku,
      date: manualDate,
      quantitySold: manualQty,
      unitPrice: manualPrice,
      channel: manualChannel,
      location: 'Main Storefront',
    });

    setManualSaleSuccess(true);
    setTimeout(() => setManualSaleSuccess(false), 3000);
  };

  // Export functions
  const handleExportProducts = () => {
    const csv = Papa.unparse(products);
    downloadBlob(csv, `products_catalog_${currentBusiness.id}.csv`);
  };

  const handleExportSales = () => {
    const csv = Papa.unparse(sales);
    downloadBlob(csv, `sales_history_${currentBusiness.id}.csv`);
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Data Ingestion & CSV Import Wizard</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Guided column mapping, schema validation, outlier detection, and data export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProducts}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Products</span>
          </button>
          <button
            onClick={handleExportSales}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Sales</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: CSV Import Wizard (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          
          {/* Wizard Step Indicator */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            {[
              { num: 1, label: 'Upload CSV' },
              { num: 2, label: 'Map Columns' },
              { num: 3, label: 'Validate & Preview' },
              { num: 4, label: 'Commit' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  step === s.num
                    ? 'bg-indigo-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className={`hidden sm:inline ${step === s.num ? 'text-white font-bold' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-2xl p-8 text-center transition-colors">
                <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <p className="font-bold text-white text-sm">Select Sales or Inventory CSV</p>
                <p className="text-slate-400 text-xs mt-1">Supports UTF-8 comma-separated files</p>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="mt-4 inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer shadow-md transition-all"
                >
                  Browse Files
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">Want to test with sample CSV data?</span>
                  <p className="text-slate-400 text-[11px]">Loads a test batch with valid rows, deliberate duplicates, and errors.</p>
                </div>
                <button
                  onClick={handleLoadSampleCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold border border-indigo-500/20"
                >
                  Load Sample CSV
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Found <strong className="text-white">{rawRows.length} rows</strong> with headers: {headers.join(', ')}.
                Map each required field to your spreadsheet columns:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-slate-400 block mb-1">Product SKU Column *</label>
                  <select
                    value={mapping.sku}
                    onChange={(e) => setMapping({ ...mapping, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Transaction Date Column *</label>
                  <select
                    value={mapping.date}
                    onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Quantity Sold Column *</label>
                  <select
                    value={mapping.quantity}
                    onChange={(e) => setMapping({ ...mapping, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Unit Price Column (Optional)</label>
                  <select
                    value={mapping.price}
                    onChange={(e) => setMapping({ ...mapping, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="">-- Use Catalog Selling Price --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Back
                </button>
                <button
                  onClick={handleProceedToPreview}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Validate & Preview Data
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Validate & Preview */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Validation Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                  <span className="block text-[10px] uppercase font-semibold">Valid Clean Rows</span>
                  <span className="text-lg font-black">{validationReport.validRows.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300">
                  <span className="block text-[10px] uppercase font-semibold">Validation Errors</span>
                  <span className="text-lg font-black">{validationReport.errors.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300">
                  <span className="block text-[10px] uppercase font-semibold">Duplicate Alerts</span>
                  <span className="text-lg font-black">{validationReport.duplicatesCount}</span>
                </div>
              </div>

              {/* Error Detail Log */}
              {validationReport.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Unclean Data Identified ({validationReport.errors.length} rows excluded)</span>
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {validationReport.errors.map((err, i) => (
                      <p key={i} className="text-[11px] text-rose-200/90 font-mono">
                        Row #{err.rowIndex}: {err.error}
                      </p>
                    ))}
                  </div>
                  <p className="text-[10px] text-rose-300/70 italic">
                    Note: Unclean rows will be safely excluded from recommendation engine ingestion.
                  </p>
                </div>
              )}

              {/* Clean Rows Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-slate-950 font-semibold text-slate-300 border-b border-slate-800">
                  Valid Ingestion Preview (First 5 rows)
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[10px]">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Quantity</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {validationReport.validRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="text-slate-200">
                        <td className="p-2 font-bold text-indigo-400">{r.productSku}</td>
                        <td className="p-2">{r.date}</td>
                        <td className="p-2 font-bold text-emerald-400">+{r.quantitySold}</td>
                        <td className="p-2">{currentBusiness.currencySymbol}{r.unitPrice}</td>
                        <td className="p-2 text-slate-400">{r.channel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button onClick={() => setStep(2)} className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300">
                  Back to Mapping
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={validationReport.validRows.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  Commit {validationReport.validRows.length} Rows to Catalog
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Finished */}
          {step === 4 && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Import Complete!</h3>
              <p className="text-slate-300">
                Successfully ingested <strong className="text-emerald-400">{importResult?.imported} sales transactions</strong> into the business database.
              </p>
              <p className="text-slate-400 text-[11px]">
                Forecasts, safety stocks, and automaton state matrices have automatically recalculated.
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Import Another File
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Manual Quick Sales Entry */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Record Single Transaction</span>
            </h3>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Enter individual in-store or phone orders manually.
            </p>
          </div>

          {manualSaleSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Transaction recorded and stock adjusted!</span>
            </div>
          )}

          <form onSubmit={handleManualSaleSubmit} className="space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Product SKU *</label>
              <select
                value={manualSku}
                onChange={e => {
                  setManualSku(e.target.value);
                  const p = products.find(prod => prod.sku === e.target.value);
                  if (p) setManualPrice(p.sellingPrice);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.sku}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Quantity Sold *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualQty}
                  onChange={e => setManualQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Unit Price ({currentBusiness.currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualPrice}
                  onChange={e => setManualPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={e => setManualDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Sales Channel</label>
              <input
                type="text"
                value={manualChannel}
                onChange={e => setManualChannel(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md mt-2"
            >
              Record Sale & Deduct Stock
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
