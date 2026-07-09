import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/signals/simulate — injecte un signal (défaut : légendaire) pour la démo live.
// Le fil realtime le fait apparaître instantanément à l'écran.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("signals")
    .insert({
      type: body.type ?? "champion_move",
      source: "sillage",
      payload: {
        detail:
          body.detail ??
          "🏆 Champion move : votre champion vient de prendre un poste de VP Sales chez Doctolib — nouvelle porte chaude",
        sillage_id: `demo-${body.seed ?? "live"}`,
      },
      score: body.score ?? 92,
      confidence: 0.95,
      account_id: body.account_id ?? null,
      contact_id: body.contact_id ?? null,
      status: "new",
    })
    .select("id, rarity")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
