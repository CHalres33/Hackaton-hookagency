import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/instantly";

// GET /api/instantly/campaigns — liste des campagnes pour le sélecteur d'envoi email.
export async function GET() {
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
