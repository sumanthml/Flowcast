import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  try {
    const { businessContext } = await req.json();

    const apiKey = process.env.GROQ_INSIGHTS_API_KEY;

    // Distinct Task: Strategic Working Capital & Risk Exposure Audit
    const totalInventoryValue = businessContext?.products?.reduce((acc: number, p: any) => acc + (p.currentStock * p.unitCost), 0) || 0;
    const criticalRecs = businessContext?.recommendations?.filter((r: any) => r.urgency === 'critical') || [];
    const excessRecs = businessContext?.recommendations?.filter((r: any) => r.urgency === 'excess') || [];
    
    // Capital tied up in excess
    const excessCapitalTiedUp = excessRecs.reduce((acc: number, r: any) => acc + (r.currentStock * (r.unitCost || 0)), 0);

    if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('gsk_placeholder')) {
      // Deterministic Executive Scorecard Fallback
      const report = {
        executiveSummary: `Working Capital Audit for ${businessContext?.businessName || 'Enterprise'}. Total inventory assets on balance sheet: ${businessContext?.currencySymbol || '$'}${totalInventoryValue.toLocaleString()}. Currently, ${criticalRecs.length} SKU(s) present active stockout threats requiring immediate cash allocation of ${businessContext?.currencySymbol || '$'}${criticalRecs.reduce((a: number, c: any) => a + c.estimatedCost, 0).toLocaleString()}.`,
        keyFindings: [
          `Stockout Exposure: ${criticalRecs.length} product(s) below safety stock buffer, representing immediate revenue loss risk within supplier lead-time.`,
          `Excess Capital: ${excessRecs.length} product(s) holding over 90 days of demand, tying up an estimated ${businessContext?.currencySymbol || '$'}${excessCapitalTiedUp.toLocaleString()} in dormant inventory.`,
          `Replenishment Pipeline: ${businessContext?.openPOCount || 0} purchase orders actively in transit.`,
        ],
        recommendedActions: [
          'Approve draft purchase orders for top critical SKUs to avoid immediate stockouts.',
          'Review lead time variances with high-exposure suppliers.',
          'Institute promotional bundle or return-to-vendor protocols for excess items.',
        ],
        isRuleBasedFallback: true,
        notice: 'Strategic insights generated via deterministic audit rules. Configure GROQ_INSIGHTS_API_KEY to unlock AI-synthesized executive briefings.',
      };

      return NextResponse.json(report);
    }

    // Call Groq Insights API
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert supply-chain financial analyst preparing an executive briefing for the Chief Operating Officer of ${businessContext?.businessName}.
Analyze the provided inventory metrics and deliver:
1. An objective 2-sentence executive summary.
2. 3 bulleted Key Findings focused on working capital velocity and stockout risks.
3. 3 concrete prioritized managerial actions.
Do NOT fabricate figures. Stick strictly to the numerical context provided.`
        },
        {
          role: 'user',
          content: `Here is the current business inventory context:
- Total On-Hand Inventory Value: ${businessContext?.currencySymbol}${totalInventoryValue}
- Critical Stockout Risk SKUs: ${criticalRecs.map((r: any) => `${r.productName} (${r.daysOfStockRemaining} days left)`).join(', ') || 'None'}
- Excess Stock SKUs: ${excessRecs.map((r: any) => `${r.productName} (${r.daysOfStockRemaining} days)`).join(', ') || 'None'}
- Open Purchase Orders: ${businessContext?.openPOCount || 0}
Generate the executive audit report.`
        }
      ],
      temperature: 0.25,
      max_tokens: 800,
    });

    const summaryText = completion.choices[0]?.message?.content || 'No insights produced.';

    return NextResponse.json({
      aiExecutiveReport: summaryText,
      totalInventoryValue,
      criticalCount: criticalRecs.length,
      excessCapitalTiedUp,
      isRuleBasedFallback: false,
    });
  } catch (err: any) {
    console.error('Groq Insights API error:', err);
    return NextResponse.json(
      { error: err.message || 'Error generating inventory insights' },
      { status: 500 }
    );
  }
}
