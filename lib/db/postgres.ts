import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase hosted SSL PostgreSQL
    },
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

export async function queryDatabase(text: string, params?: any[]) {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured on server.');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return { ...res, duration };
}

export function isDatabaseConnected(): boolean {
  return Boolean(pool);
}
