import { createClient } from "@supabase/supabase-js";

// Client server-side (service role) — utilisé par les API routes de l'agent.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE env manquant (.env)");
  return createClient(url, key, { auth: { persistSession: false } });
}
