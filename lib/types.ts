export type Account = {
  id: number;
  name: string;
  domain: string;
  linkedin_url: string | null;
  logo_url: string | null;
  tier: number;
};

export type EnrichStatus = "pending" | "found" | "failed";

export type Contact = {
  id: number;
  account_id: number | null;
  firstname: string;
  lastname: string;
  job_title: string | null;
  linkedin_url: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  email_status: EnrichStatus;
  phone: string | null;
  phone_status: EnrichStatus;
  postal_address: string | null;
  address_status: EnrichStatus;
  enrichment_confidence: number | null;
  photo_url: string | null;
  origin: string | null;
  pipedrive_deal_id: number | null;
  deal_stage: string | null;
  deal_value_eur: number | null;
  accounts?: Account | null;
};

export type Signal = {
  id: number;
  type: string;
  source: string;
  payload: Record<string, unknown> & { summary?: string };
  score: number | null;
  confidence: number | null;
  rarity: "commun" | "rare" | "legendaire" | null;
  account_id: number | null;
  contact_id: number | null;
  status: "new" | "processing" | "treated" | "ignored";
  created_at: string;
  accounts?: Account | null;
  contacts?: Contact | null;
};

export type Passion = {
  id: number;
  contact_id: number;
  category: string;
  value: string;
  proof: string | null;
  source_url: string | null;
  source_context: "pro_public" | "hors_pro" | "prive";
  date_source: string | null;
  confidence: number | null;
  giftability: number | null;
};

export type Relationship = {
  contact_id: number;
  warmth: number;
  level: "inconnu" | "contact" | "connexion" | "champion" | "ambassadeur";
  xp: number;
  warmth_reason: string | null;
  conversation_summary: string | null;
  opportunity: number | null;
  opportunity_reason: string | null;
};

export type Channel = "email" | "linkedin" | "carte_manuscrite" | "cadeau" | "cadeau_legendaire";

export type Action = {
  id: number;
  signal_id: number | null;
  contact_id: number;
  channel: Channel;
  gift_name: string | null;
  gift_url: string | null;
  gift_price_eur: number | null;
  passion_id: number | null;
  message: string;
  justification: string;
  cost_estimate_eur: number | null;
  status: "proposed" | "approved" | "rejected" | "sent";
  handwrytten_order_id: string | null;
  sequence_order: number;
  gift_alternatives: { name: string; url?: string; price_eur?: number; passion?: string }[];
  created_at: string;
  contacts?: Contact | null;
  signals?: Signal | null;
  passions?: Passion | null;
};

export type GameState = {
  id: number;
  team_xp: number;
  streak: number;
  badges: string[];
};

export const CHANNEL_META: Record<Channel, { label: string; emoji: string; rank: number }> = {
  email: { label: "Email", emoji: "✉️", rank: 0 },
  linkedin: { label: "LinkedIn", emoji: "💬", rank: 1 },
  carte_manuscrite: { label: "Carte manuscrite", emoji: "✍️", rank: 2 },
  cadeau: { label: "Cadeau passion", emoji: "🎁", rank: 3 },
  cadeau_legendaire: { label: "Cadeau légendaire", emoji: "🏆", rank: 4 },
};

export const SIGNAL_LABELS: Record<string, { label: string; emoji: string }> = {
  job_change: { label: "Changement de poste", emoji: "🧭" },
  promotion: { label: "Promotion", emoji: "📈" },
  keyword: { label: "Moment de fierté", emoji: "✨" },
  hiring_intent: { label: "Recrute des sales", emoji: "🧲" },
  fundraise: { label: "Levée de fonds", emoji: "💰" },
  champion_move: { label: "Champion en mouvement", emoji: "🦸" },
};

export const LEVELS = ["inconnu", "contact", "connexion", "champion", "ambassadeur"] as const;
