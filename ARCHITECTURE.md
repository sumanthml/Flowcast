# FlowCast TOC: System Architecture & Technical Specifications

FlowCast TOC is an explainable inventory planning platform designed for small-to-midsize retail enterprises. It couples statistical time-series demand forecasting with a formal **Theory of Computation Deterministic Finite Automaton (DFA)** to classify stockout risk and generate advisory reorder recommendations.

---

## 1. Demand Forecasting Engine

The platform implements real, documented statistical models in `lib/forecasting/engine.ts`:

- **Simple Moving Average (SMA)**: Unweighted moving window average over past $k$ days.
- **Weighted Moving Average (WMA)**: Linearly decaying weights favoring recent sales periods.
- **Single Exponential Smoothing (SES)**: $\hat{y}_{t+1} = \alpha y_t + (1 - \alpha) \hat{y}_t$, where $\alpha = 0.3$.
- **Holt's Linear Exponential Smoothing (Holt-Winters with Trend)**: Double exponential smoothing tracking level $L_t$ and additive trend $T_t$:
  $$\hat{y}_{t+m} = L_t + m \cdot T_t$$
- **Croston's Method for Intermittent / Sparse Demand**: Decomposes sales history into non-zero transaction magnitude $z_t$ and elapsed inter-arrival intervals $p_t$:
  $$\hat{y} = \frac{z_t}{p_t}$$
  Auto-selected when zero-sales frequency exceeds 45%.
- **Backtesting & Accuracy Scorecard**: Rolling-origin out-of-sample backtesting over historical test windows computing **MAE** (Mean Absolute Error), **MAPE** (Mean Absolute Percentage Error), **RMSE** (Root Mean Square Error), and **Tracking Signal** (cumulative forecast error divided by MAD to detect persistent bias).
- **Confidence Intervals**: Residual variance $\sigma_e$ generates 80% ($z = 1.28$) and 95% ($z = 1.96$) bounds expanding with horizon distance $\sqrt{1 + \frac{h}{2H}}$.
- **Honest Limitations**: If fewer than 7 days of sales are available, the platform refuses to fabricate complex models and reverts to a cautious baseline with explicit notifications. Private sales data is kept strictly client-side and never forwarded to external AI APIs.

---

## 2. Reorder Planning Formulation

Recommendations are advisory only and never place external orders automatically (`lib/planning/reorder-engine.ts`):

1. **Lead Time Demand (LTD)**:
   $$LTD = \bar{d} \times L$$
   where $\bar{d}$ is the average daily demand from the forecast engine and $L$ is supplier lead time in days.
2. **Statistical Safety Stock (SS)**:
   $$SS = Z \times \sigma_d \times \sqrt{L}$$
   where $Z = 1.65$ represents a 95% cycle service level.
3. **Reorder Point (ROP)**:
   $$ROP = LTD + SS$$
4. **Net Usable Inventory Position**:
   $$\text{Usable} = \text{CurrentStock} - \text{ReservedStock} + \text{IncomingPOs}$$
5. **Pack Size & Minimum Order Quantity (MOQ) Alignment**:
   $$\text{Raw Deficit} = \max(0, \text{TargetInventory} - \text{Usable})$$
   $$\text{Order Qty} = \max\left(\text{MOQ}, \; \left\lceil \frac{\text{Raw Deficit}}{\text{PackSize}} \right\rceil \times \text{PackSize}\right)$$

---

## 3. Theory of Computation Component

The platform's inventory state classification is modeled as a formal **Deterministic Finite Automaton (DFA)**:

$$M = (Q, \Sigma, \delta, q_0, F)$$

- **States $Q$**:
  - $Q_0$: `Q0_OPTIMAL` — Usable stock covers ROP and forward demand without excess.
  - $Q_1$: `Q1_WATCHLIST` — Usable stock is within 25% of ROP ($ROP < \text{Usable} \le 1.25 \times ROP$).
  - $Q_2$: `Q2_REORDER` — Reorder condition triggered ($\text{Usable} \le ROP$), no inbound order placed.
  - $Q_3$: `Q3_CRITICAL` — Stockout imminent ($\text{Usable} \le \text{SafetyStock}$ or Days of Stock $\le \text{LeadTime}$).
  - $Q_4$: `Q4_EXCESS` — Capital overstock ($DOIR > 90\text{ days}$ or $\text{Usable} > 2.8 \times ROP$).
  - $Q_5$: `Q5_INCOMING_BUFFER` — Replenishment order active in transit ($\text{Usable} \le ROP \land \text{Incoming} \ge \text{Deficit}$).
- **Accepting / Action States $F$**: $\{ Q_2, Q_3 \}$ requiring managerial purchase order intervention.
- **Alphabet $\Sigma$**: $\{\text{sales\_burn}, \text{below\_rop}, \text{below\_safety}, \text{po\_placed}, \text{po\_received}, \text{excess\_accumulated}, \text{correction}\}$.
- **Transition Function $\delta(q, \sigma)$**: Executed in real application alert logic (`lib/toc/dfa.ts`).
- **Educational Turing Machine Decider**: An accurate 7-tuple Turing Machine simulator ($M = (Q, \Sigma, \Gamma, \delta, q_0, q_{accept}, q_{reject})$) deciding $L = \{ ▷ 1^s \sharp 1^r ◁ \mid s \le r \}$ with visual tape head movements, step-by-step state changes, and rewinding. Time-series forecasting is clearly distinguished and handled by the statistical engine.

---

## 4. Groq Integration & Server-Side Security

The app supports two distinct Groq credentials stored strictly in server-side environment variables:

1. `GROQ_CHATBOT_API_KEY`: Powering `/api/groq/chat` for conversational Q&A about current inventory risks, formula explanations, and DFA state rationales.
2. `GROQ_INSIGHTS_API_KEY`: Powering `/api/groq/insights` for a distinct C-level Working Capital & Risk Exposure Audit Memorandum.

### Security Guarantees:
- **Zero Client Exposure**: API keys are never bundled into client JavaScript, local storage, or transmitted in client headers.
- **Zero Hallucination Guardrail**: The system prompts explicitly bind Groq to authorized business-scoped context. If data is not present, the model states it is missing.
- **Deterministic Offline Fallback**: If keys are blank or unconfigured, the system automatically runs on local deterministic rule engines, providing instant, accurate answers without failing.
