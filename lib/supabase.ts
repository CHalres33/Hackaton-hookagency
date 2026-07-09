import { createClient } from "@supabase/supabase-js";

// Client server-side (service role) — utilisé par les API routes de l'agent.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // RLS désactivé sur les tables du hackathon : la clé anon suffit en fallback.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE env manquant (.env)");
  return createClient(url, key, { auth: { persistSession: false } });
}
