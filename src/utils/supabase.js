import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Returns null if env vars are missing (app still works via localStorage)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = () => !!supabase

const TABLE = 'app_state'
const ROW_ID = 1

/** Load full app state from Supabase. Returns null on error or if unconfigured. */
export async function loadFromSupabase() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('id', ROW_ID)
      .maybeSingle()

    if (error) { console.warn('[Supabase] load error:', error.message); return null }
    return data?.data ?? null
  } catch (e) {
    console.warn('[Supabase] load exception:', e)
    return null
  }
}

/** Upsert full app state to Supabase. Returns true on success. */
export async function saveToSupabase(state) {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: ROW_ID, data: state, updated_at: new Date().toISOString() })

    if (error) { console.warn('[Supabase] save error:', error.message); return false }
    return true
  } catch (e) {
    console.warn('[Supabase] save exception:', e)
    return false
  }
}

/** SQL to run in the Supabase SQL editor to create the required table */
export const SUPABASE_SETUP_SQL = `
-- Run once in Supabase > SQL Editor
CREATE TABLE IF NOT EXISTS app_state (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  data  JSONB   NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_state (id, data)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon"
  ON app_state FOR ALL
  USING (true)
  WITH CHECK (true);
`.trim()
