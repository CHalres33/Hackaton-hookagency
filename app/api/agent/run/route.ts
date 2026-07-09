import { NextRequest, NextResponse } from "next/server";
import { runMadeleine } from "@/lib/agent/madeleine";

export const maxDuration = 300; // le scan passions + web_search peut prendre plusieurs minutes

// POST /api/agent/run
// body: { task?: string, signal_id?: number, contact_id?: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let task: string = body.task ?? "";
  if (!task && body.signal_id) {
    task = `Traite le signal ${body.signal_id} : lis-le via get_signals, charge le contact concerné, enrichis-le si nécessaire, scanne ses passions (web_search), puis propose la bonne action sur l'échelle d'escalade.`;
  }
  if (!task && body.contact_id) {
    task = `Scanne le prospect ${body.contact_id} (get_contact puis web_search pour ses passions avec preuves), sauvegarde les passions trouvées via save_passion, puis propose une action adaptée à sa chaleur de relation.`;
  }
  if (!task) {
    return NextResponse.json({ error: "task, signal_id ou contact_id requis" }, { status: 400 });
  }
  try {
    const result = await runMadeleine(task);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
