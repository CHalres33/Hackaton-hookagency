"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import type { Contact, Relationship } from "@/lib/types";

export default function Prospects() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [rels, setRels] = useState<Record<number, Relationship>>({});

  useEffect(() => {
    supabase
      .from("contacts")
      .select("*, accounts(*)")
      .order("id")
      .then(({ data }) => setContacts((data as Contact[]) ?? []));
    supabase.from("relationships").select("*").then(({ data }) => {
      const m: Record<number, Relationship> = {};
      (data ?? []).forEach((r) => (m[r.contact_id] = r as Relationship));
      setRels(m);
    });
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Prospects</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {contacts.map((c) => {
          const rel = rels[c.id];
          return (
            <Link
              key={c.id}
              href={`/prospect/${c.id}`}
              className="flex items-center gap-4 rounded-2xl border border-bdr bg-panel p-4 hover:border-pink/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-panel2 text-sm font-semibold">
                {c.firstname[0]}
                {c.lastname[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {c.firstname} {c.lastname}
                </div>
                <div className="truncate text-sm text-muted">
                  {c.job_title} · {c.accounts?.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs capitalize text-gold">{rel?.level ?? "inconnu"}</div>
                <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-panel2">
                  <div
                    className="h-full bg-gradient-to-r from-pink to-gold"
                    style={{ width: `${rel?.warmth ?? 0}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
