// Scraping réseaux sociaux via Apify (run-sync, résultats en direct).
const BASE = "https://api.apify.com/v2/acts";

async function runActor(actorId: string, input: unknown, timeoutSec = 90) {
  const res = await fetch(
    `${BASE}/${actorId}/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}&timeout=${timeoutSec}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout((timeoutSec + 10) * 1000),
    },
  );
  if (!res.ok) throw new Error(`Apify ${actorId} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function scrapeLinkedinPosts(profileUrl: string, maxPosts = 8) {
  const items = (await runActor("harvestapi~linkedin-profile-posts", {
    targetUrls: [profileUrl],
    maxPosts,
  })) as Array<{ author?: { name?: string }; postedAt?: { date?: string }; content?: string; text?: string }>;
  return items.map((p) => ({
    author: p.author?.name,
    date: p.postedAt?.date,
    text: String(p.content ?? p.text ?? "").slice(0, 500),
  }));
}

export async function scrapeInstagramProfile(username: string) {
  const items = (await runActor("apify~instagram-profile-scraper", {
    usernames: [username],
  })) as Array<{ username?: string; biography?: string; latestPosts?: Array<{ caption?: string; timestamp?: string }> }>;
  const p = items[0];
  if (!p) return null;
  return {
    username: p.username,
    bio: p.biography,
    recent_posts: (p.latestPosts ?? []).slice(0, 8).map((x) => ({ caption: String(x.caption ?? "").slice(0, 300), date: x.timestamp })),
  };
}
