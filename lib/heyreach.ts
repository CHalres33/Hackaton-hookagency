// HeyReach — inbox LinkedIn -> chaleur de relation.
const BASE = "https://api.heyreach.io/api/public";

export type HeyReachConversation = {
  id: string;
  lastMessageAt?: string;
  lastMessageSender?: "CORRESPONDENT" | "ME" | string;
  totalMessages?: number;
  correspondentProfile?: {
    profileUrl?: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
  };
};

export async function getConversations(offset = 0, limit = 100) {
  const res = await fetch(`${BASE}/inbox/GetConversationsV2`, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.HEYREACH_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters: {}, offset, limit }),
  });
  if (!res.ok) throw new Error(`HeyReach ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<{ totalCount: number; items: HeyReachConversation[] }>;
}

// Normalise une URL LinkedIn pour le matching (slug en minuscule, sans trailing slash)
export function linkedinSlug(url?: string | null): string | null {
  if (!url) return null;
  const m = url.toLowerCase().match(/linkedin\.com\/in\/([^/?#]+)/);
  return m ? m[1] : null;
}
