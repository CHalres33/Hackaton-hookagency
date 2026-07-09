import { NextRequest, NextResponse } from "next/server";
import { scanMarket } from "@/lib/prospection";

export const maxDuration = 120;

// POST /api/prospection/scan-market
// body: { titles?: string[], domains?: string[], locations?: string[], limit?: number }
// FullEnrich trouve les décideurs → CRM (accounts+contacts) → watchlist champions Sillage.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await scanMarket(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
