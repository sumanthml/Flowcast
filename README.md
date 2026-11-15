# FlowCast Enterprise: Intelligent Retail Inventory Planning & Replenishment

FlowCast Enterprise is an explainable, secure inventory planning web platform designed for retailers. It turns historical sales, supplier lead times, and incoming purchase orders into high-precision demand forecasts and automated reorder advisories while ensuring human planners remain in full control.

---

## Key Capabilities

1. **Authentication & Multi-Tenant Store Isolation**:
   - Secured with **Firebase Authentication** supporting Google Sign-In and email/password accounts.
   - Isolated retail workspaces per business owner/staff.
   - Role-based permissions (`Owner`, `Staff`, `Viewer`).

2. **100% Dynamic Catalog & Movements**:
   - Clean dynamic start with zero hardcoded dummy data.
   - Comprehensive SKU tracking: Cost, Selling Price, Lead Times, Pack Sizes, Reorder Points, and Safety Buffers.
   - Audit-grade traceable movements (`sale`, `purchase_received`, `manual_correction`, `waste_expired`, `customer_return`).

3. **Multi-Model Demand Forecasting**:
   - Simple Moving Average (SMA), Weighted Moving Average (WMA), Single Exponential Smoothing (SES), Holt's Linear Trend, and Croston's Intermittent Demand.
   - Rolling origin out-of-sample backtesting metrics: MAE, MAPE, RMSE, and Tracking Signal.
   - Dynamic 80% and 95% confidence bands with transparent limitation disclosures.

4. **Explainable Reorder Planning & PO Lifecycle**:
   - Calculates Lead Time Demand, Safety Stock, and Reorder Points (ROP) with carton pack rounding and MOQ enforcement.
   - Full mathematical derivation and constraint disclosures for every suggestion.
   - One-click consolidated Purchase Order drafting by supplier with full receiving dock workflow.

5. **Decision Engine & Verification**:
   - Discrete operational stock classifier verifying inventory risk stages (Optimal, Watchlist, Reorder Due, Critical Stockout, Surplus Stock, and Inbound Buffer).
   - Educational deterministic decision verification and auditable rule traces.

6. **AI Assistant & Strategic Insights**:
   - Powered by server-side Groq LLaMA 3.3 for real-time inventory queries and executive capital audit briefings.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack
- **Framework**: Next.js 14 (App Router) with React 18 & TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Auth**: Firebase Authentication (v13)
- **Database**: Supabase PostgreSQL 17 with Row-Level Security
- **Analytics & AI**: Recharts, Groq SDK (LLaMA 3.3 70B), PapaParse CSV Engine
