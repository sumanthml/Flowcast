# FlowCast TOC: Explainable Inventory Planning Platform

FlowCast TOC is a full-featured, secure, explainable inventory planning platform designed for small and midsize retail businesses across multiple currencies and jurisdictions. It combines statistical demand forecasting, mathematical reorder optimization, and formal **Theory of Computation (TOC)** Deterministic Finite Automaton (DFA) state classification.

---

## Quick Start (Zero-Config Local Mode)

The platform runs 100% locally out of the box with rich sample retail data across multiple sectors (Electronics, Perishable Groceries, Lifestyle Apparel). No external cloud accounts are required to evaluate all core features.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Configuration

Copy the example environment configuration:
```bash
cp .env.example .env.local
```

### Supported Environment Variables:

| Variable | Description | Requirement |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Optional (local storage fallback active if omitted) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | Optional (for browser client operations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Optional (server-side administrative operations) |
| `GROQ_CHATBOT_API_KEY` | Server-side secret for conversational assistant | Optional (local deterministic rule engine active if omitted) |
| `GROQ_INSIGHTS_API_KEY` | Server-side secret for executive working capital audit | Optional (local deterministic risk scorecard active if omitted) |

> **Security Note**: Never expose `GROQ_CHATBOT_API_KEY`, `GROQ_INSIGHTS_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in frontend code or client bundles. All LLM calls pass through secure server-side route handlers (`/api/groq/chat` and `/api/groq/insights`).

---

## Supabase Database Setup & Migrations

When you are ready to connect a live Supabase PostgreSQL database:

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration script in `supabase/migrations/20260101000000_inventory_schema.sql` via the Supabase SQL Editor.
   - Includes full schema for `businesses`, `suppliers`, `products`, `inventory_movements`, `sales_records`, `purchase_orders`, and `purchase_order_items`.
   - Establishes **Row-Level Security (RLS)** policies guaranteeing strict multi-tenant business data isolation.
3. (Optional) Run `supabase/seed.sql` to populate sample multi-business data.
4. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.

---

## Core Capabilities & Features

1. **Multi-Business Storefront Isolation & Roles**:
   - Switch between stores (e.g., Apex Audio USD, Verde Organics EUR).
   - Role switcher (`Owner`, `Staff`, `Viewer`) enforcing operation permissions.
   - Guided onboarding flow for setting up location, currency, timezone, and initial stock.
2. **Explainable Reorder Planning**:
   - Computes Lead Time Demand, Statistical Safety Stock (at 95% service level), and Reorder Points (ROP).
   - Enforces supplier pack sizes (carton rounding) and Minimum Order Quantities (MOQ).
   - Provides plain-language explanations with full mathematical derivations for every advisory recommendation.
   - User control: Accept, Edit Quantity, Snooze (7 days), or Dismiss.
3. **Statistical Demand Forecasting**:
   - Implements Simple Moving Average (SMA), Weighted Moving Average (WMA), Single Exponential Smoothing (SES), Holt's Linear Trend, and Croston's Intermittent Demand Method.
   - Rolling origin out-of-sample backtesting (MAE, MAPE, RMSE, Tracking Signal).
   - Dynamic 80% and 95% confidence bands based on residual standard deviation.
   - Transparent limitation disclosures; labels all forecasts as estimates.
4. **Traceable Inventory Movements (Audit Log)**:
   - Immutably records every stock change (`sale`, `purchase_received`, `manual_correction`, `waste_expired`, `customer_return`).
   - Requires audit justifications and attributes changes to active user roles.
5. **Purchase Order Replenishment Workflow**:
   - Consolidated 1-click PO generator grouping approved items by supplier.
   - Status lifecycle (`draft` → `sent` → `received`).
   - Receiving an order automatically updates inventory balances and logs traceable movements.
6. **Guided CSV Data Import & Export**:
   - Interactive column mapping, validation error logs, duplicate row detection, and outlier flags.
   - 1-click export of Products, Sales History, and Audit Logs.
7. **Theory of Computation Automata Lab**:
   - **Deterministic Finite Automaton (DFA)**: Evaluates stock status across 6 states ($Q_0$: Optimal, $Q_1$: Watchlist, $Q_2$: Reorder Point, $Q_3$: Critical Stockout Imminent, $Q_4$: Capital Overstock, $Q_5$: Inbound Buffer).
   - Interactive SVG node-link graph with glowing active state indicators and formal propositional transition proofs.
   - **Educational Turing Machine Decider**: Step-by-step interactive tape simulator tracing $L = \{ ▷ 1^s \sharp 1^r ◁ \mid s \le r \}$.
8. **Groq AI Assistant with Offline Fallback**:
   - Answers natural language questions regarding stockout risks, safety buffer formulas, and DFA state transitions.
   - Runs deterministically if Groq keys are not yet configured.

---

## What External Account Setup You Must Do Yourself

Before deploying to production, configure:
1. **Supabase**: Create a project, execute `supabase/migrations/20260101000000_inventory_schema.sql`, and configure credentials.
2. **Groq**: Obtain API keys from [console.groq.com](https://console.groq.com) for `GROQ_CHATBOT_API_KEY` and `GROQ_INSIGHTS_API_KEY`.

---

## Status & Limitations

- **Fully Working**: Complete end-to-end interface, multi-store state management, forecasting algorithms, backtesting, reorder engine, PO management, CSV importer/exporter, DFA state machine, Turing Machine simulator, and server-side Groq routes with deterministic fallbacks.
- **Real Limitations**: The statistical forecasting models reflect historical time-series patterns and do not account for external macroeconomic shocks or unrecorded competitor actions unless reviewed by human planners.
