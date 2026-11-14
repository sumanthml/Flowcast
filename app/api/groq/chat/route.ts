import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  try {
    const { messages, businessContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_CHATBOT_API_KEY;

    // Deterministic Rule-Based Fallback when Groq key is not yet configured
    if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('gsk_placeholder')) {
      const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      let reply = '';

      if (lastUserMsg.includes('at risk') || lastUserMsg.includes('risk') || lastUserMsg.includes('critical')) {
        const criticalItems = businessContext?.recommendations?.filter((r: any) => r.urgency === 'critical' || r.urgency === 'urgent') || [];
        if (criticalItems.length > 0) {
          reply = `### ⚠️ Products Requiring Immediate Attention\n\nThere are **${criticalItems.length} products** with urgent replenishment alerts:\n\n` +
            criticalItems.map((item: any) => 
              `- **${item.productName}** (${item.productSku}): Current stock is **${item.currentStock} units**, with only **${item.daysOfStockRemaining} days** of stock remaining before projected stockout. Supplier lead time is **${item.leadTimeDays} days**. Recommended order: **${item.suggestedQuantity} units** (cost: ${businessContext?.currencySymbol || '$'}${item.estimatedCost}). Automaton state: \`${item.dfaStateId}\`.`
            ).join('\n') +
            `\n\n*Explanation:* Stock has dipped below safety threshold. Without placing an order immediately, standard delivery lead-time will exceed remaining stock.`;
        } else {
          reply = `### ✅ Inventory Risk Status\n\nAll current inventory positions are within safe operational limits. No items are currently in critical stockout status.`;
        }
      } else if (lastUserMsg.includes('attention') || lastUserMsg.includes('this week') || lastUserMsg.includes('reorder')) {
        const pendingRecs = businessContext?.recommendations?.filter((r: any) => r.suggestedQuantity > 0) || [];
        reply = `### 📋 Priority Reorder Plan\n\n` +
          (pendingRecs.length > 0
            ? pendingRecs.map((r: any) => `- **${r.productName}** (${r.productSku}): Need **${r.suggestedQuantity} units** by **${r.orderDeadlineDate}** from **${r.supplierName}**. Estimated investment: ${businessContext?.currencySymbol || '$'}${r.estimatedCost}.`).join('\n')
            : `No pending orders required this week. All items maintain adequate coverage.`);
      } else if (lastUserMsg.includes('formula') || lastUserMsg.includes('calculation') || lastUserMsg.includes('explain')) {
        reply = `### 📐 Reorder & Forecasting Math Breakdown\n\nRecommendations are calculated deterministically using standard supply chain mathematics:\n\n` +
          `1. **Average Daily Demand (d̄)**: Historical sales volume divided by active days.\n` +
          `2. **Lead Time Demand (LTD)**: $LTD = \\bar{d} \\times L$ (where $L$ is supplier lead time in days).\n` +
          `3. **Safety Stock (SS)**: $SS = Z \\times \\sigma_d \\times \\sqrt{L}$ (absorbs demand and supplier variance at 95% service level).\n` +
          `4. **Reorder Point (ROP)**: $ROP = LTD + SS$.\n` +
          `5. **Net Usable Stock**: $\\text{Usable} = \\text{Current} - \\text{Reserved} + \\text{Incoming POs}$.\n` +
          `6. **Order Quantity**: $\\lceil \\max(0, ROP - \\text{Usable}) / \\text{PackSize} \\rceil \\times \\text{PackSize}$, constrained by supplier Minimum Order Quantity (MOQ).`;
      } else {
        reply = `I am your **FlowCast Inventory Assistant**. Based on your business data for **${businessContext?.businessName || 'your store'}**:\n\n` +
          `- Active Catalog: **${businessContext?.totalProducts || 0} SKUs**\n` +
          `- Products at Risk: **${businessContext?.criticalCount || 0} SKUs**\n` +
          `- Open Purchase Orders: **${businessContext?.openPOCount || 0}**\n\n` +
          `You can ask me questions such as:\n` +
          `- *"Why is APX-HD-700 at risk?"*\n` +
          `- *"Which products need attention this week?"*\n` +
          `- *"Explain the safety stock formula in simple terms."*\n` +
          `- *"What is the Theory of Computation DFA state for my headphones?"*`;
      }

      return NextResponse.json({
        message: reply,
        isRuleBasedFallback: true,
        notice: 'Running on local deterministic rules. Configure GROQ_CHATBOT_API_KEY in .env to enable Groq AI conversational synthesis.',
      });
    }

    // Call Groq API securely server-side
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an expert, objective, explainable inventory planning assistant for "${businessContext?.businessName || 'the business'}".
Your responsibility:
1. Explain inventory calculations, stockout risks, safety stocks, lead times, and Theory of Computation DFA states using ONLY the authorized business context provided below.
2. NEVER hallucinate or invent inventory levels, forecasts, suppliers, or purchase orders. If data is not present in the context, explicitly say you do not have that data.
3. Keep business arithmetic truthful to application logic. You are an explanatory advisor, not an autonomous ordering authority.
4. Currency: ${businessContext?.currency || 'USD'} (${businessContext?.currencySymbol || '$'}).

Authorized Business Context:
- Active Catalog Products: ${JSON.stringify(businessContext?.products || [])}
- Reorder Recommendations & DFA Statuses: ${JSON.stringify(businessContext?.recommendations || [])}
- Open Purchase Orders: ${JSON.stringify(businessContext?.purchaseOrders || [])}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.2, // low temperature for factual explainability
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({
      message: reply,
      isRuleBasedFallback: false,
    });
  } catch (err: any) {
    console.error('Groq Chat API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing inventory chat' },
      { status: 500 }
    );
  }
}
