import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendHandwrittenCard } from "@/lib/handwrytten";

// POST /api/actions/send  body: { action_id }
// Appelé après approbation d'une carte manuscrite : envoi réel via Handwrytten.
export async function POST(req: NextRequest) {
  const { action_id } = await req.json();
  const db = supabaseAdmin();
  const { data: action } = await db
    .from("actions")
    .select("*, contacts(*)")
    .eq("id", action_id)
    .single();
  if (!action) return NextResponse.json({ error: "action introuvable" }, { status: 404 });

  const c = action.contacts;
  const result = await sendHandwrittenCard({
    message: action.message,
    recipientName: `${c.firstname} ${c.lastname}`,
    address1: c.postal_address ?? "adresse en attente",
    city: c.city ?? "Paris",
    zip: "75000",
  });

  if ("orderId" in result) {
    await db
      .from("actions")
      .update({ status: "sent", handwrytten_order_id: result.orderId })
      .eq("id", action_id);
    return NextResponse.json({ sent: true, orderId: result.orderId });
  }
  return NextResponse.json({ sent: false, simulated: true, reason: result.error });
}
