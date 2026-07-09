"use client";

import { createClient } from "@supabase/supabase-js";

// Client navigateur (anon). RLS désactivé pour le hackathon : lecture/écriture directes.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
