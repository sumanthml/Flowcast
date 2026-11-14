import { NextResponse } from 'next/server';
import { queryDatabase, isDatabaseConnected } from '@/lib/db/postgres';
import Groq from 'groq-sdk';

export async function GET() {
  const statusReport: {
    groqChat: { configured: boolean; working: boolean; model?: string; error?: string };
    groqInsights: { configured: boolean; working: boolean; model?: string; error?: string };
    gemini: { configured: boolean };
    supabasePostgres: { configured: boolean; working: boolean; tableCount?: number; error?: string };
    firebase: { configured: boolean; projectId?: string };
  } = {
    groqChat: { configured: false, working: false },
    groqInsights: { configured: false, working: false },
    gemini: { configured: false },
    supabasePostgres: { configured: false, working: false },
    firebase: { configured: false },
  };

  // 1. Groq Chat Key
  const groqChatKey = process.env.GROQ_CHATBOT_API_KEY;
  if (groqChatKey && !groqChatKey.startsWith('gsk_placeholder')) {
    statusReport.groqChat.configured = true;
    try {
      const groq = new Groq({ apiKey: groqChatKey });
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5,
      });
      statusReport.groqChat.working = Boolean(res.choices[0]?.message);
      statusReport.groqChat.model = 'llama-3.3-70b-versatile';
    } catch (e: any) {
      statusReport.groqChat.error = e.message;
    }
  }

  // 2. Groq Insights Key
  const groqInsightsKey = process.env.GROQ_INSIGHTS_API_KEY;
  if (groqInsightsKey && !groqInsightsKey.startsWith('gsk_placeholder')) {
    statusReport.groqInsights.configured = true;
    try {
      const groq = new Groq({ apiKey: groqInsightsKey });
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5,
      });
      statusReport.groqInsights.working = Boolean(res.choices[0]?.message);
      statusReport.groqInsights.model = 'llama-3.3-70b-versatile';
    } catch (e: any) {
      statusReport.groqInsights.error = e.message;
    }
  }

  // 3. Gemini API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('AIza_placeholder')) {
    statusReport.gemini.configured = true;
  }

  // 4. Supabase PostgreSQL
  if (isDatabaseConnected()) {
    statusReport.supabasePostgres.configured = true;
    try {
      const result = await queryDatabase(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
      );
      statusReport.supabasePostgres.working = true;
      statusReport.supabasePostgres.tableCount = Number(result.rows[0]?.count || 0);
    } catch (e: any) {
      statusReport.supabasePostgres.error = e.message;
    }
  }

  // 5. Firebase
  const fbProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (fbProject) {
    statusReport.firebase = {
      configured: true,
      projectId: fbProject,
    };
  }

  return NextResponse.json(statusReport);
}
