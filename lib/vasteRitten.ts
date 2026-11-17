import type { FavLijn } from "./types";

/** Vaste rit = een favoriete lijn/richting/halte met een vertrektijd en dagen. */
export type VasteRit = {
  id: string;
  naam: string;
  /** "HH:MM" lokale tijd. */
  vertrek: string;
  /** ISO-weekdagen: 1 = maandag … 7 = zondag. */
  dagen: number[];
  push: boolean;
  lijn: FavLijn;
};

export const MAX_VASTE_RITTEN = 10;
export const VENSTER_VOOR_MIN = 60;
export const VENSTER_NA_MIN = 30;
export const WERKDAGEN = [1, 2, 3, 4, 5];

export function geldigeTijd(t: unknown): t is string {
  return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function minutenVanTijd(t: string): number {
  const [u, m] = t.split(":").map(Number);
  return u * 60 + m;
}

export function maakVasteRit(data: { lijn: FavLijn; vertrek: string; dagen?: number[]; naam?: string; push?: boolean }): VasteRit | null {
  if (!geldigeTijd(data.vertrek)) return null;
  const dagen = [...new Set((data.dagen ?? WERKDAGEN).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
  if (!dagen.length) return null;
  const naam = (data.naam ?? "").trim() || `${data.lijn.lijn} ${data.vertrek}`;
  return { id: JSON.stringify([data.lijn.id, data.vertrek]), naam, vertrek: data.vertrek, dagen, push: data.push ?? true, lijn: data.lijn };
}

export function normaliseerVasteRitten(data: unknown): VasteRit[] {
  if (!Array.isArray(data)) return [];
  const uit = new Map<string, VasteRit>();
  for (const i of data) {
    if (!i || typeof i !== "object" || !i.lijn || typeof i.lijn.id !== "string") continue;
    const rit = maakVasteRit({ lijn: i.lijn, vertrek: i.vertrek, dagen: Array.isArray(i.dagen) ? i.dagen : undefined, naam: typeof i.naam === "string" ? i.naam : undefined, push: typeof i.push === "boolean" ? i.push : true });
    if (rit && !uit.has(rit.id)) uit.set(rit.id, rit);
    if (uit.size === MAX_VASTE_RITTEN) break;
  }
  return [...uit.values()];
}

export function isoWeekdag(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

export type RitVenster =
  | { staat: "binnen"; start: number; eind: number }
  | { staat: "voor"; start: number; eind: number }
  | { staat: "na"; start: number; eind: number }
  | { staat: "geen_dag" };

/** Venster: 60 min voor tot 30 min na vertrek, alleen op gekozen dagen. Tijden in minuten sinds middernacht. */
export function ritVenster(rit: Pick<VasteRit, "vertrek" | "dagen">, nu: Date): RitVenster {
  if (!rit.dagen.includes(isoWeekdag(nu))) return { staat: "geen_dag" };
  const v = minutenVanTijd(rit.vertrek);
  const start = Math.max(0, v - VENSTER_VOOR_MIN);
  const eind = Math.min(24 * 60, v + VENSTER_NA_MIN);
  const n = nu.getHours() * 60 + nu.getMinutes();
  if (n < start) return { staat: "voor", start, eind };
  if (n > eind) return { staat: "na", start, eind };
  return { staat: "binnen", start, eind };
}

export function tijdTekst(min: number): string {
  const u = Math.floor(min / 60) % 24;
  return `${String(u).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

const DAG_NAMEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
export function dagenTekst(dagen: number[]): string {
  const d = [...dagen].sort((a, b) => a - b);
  if (d.length === 7) return "elke dag";
  if (d.join() === WERKDAGEN.join()) return "ma–vr";
  if (d.length > 1 && d.every((x, i) => i === 0 || x === d[i - 1] + 1)) return `${DAG_NAMEN[d[0] - 1]}–${DAG_NAMEN[d[d.length - 1] - 1]}`;
  return d.map((x) => DAG_NAMEN[x - 1]).join(", ");
}

const SERVER_MODUS: Record<string, string> = { train: "trein", ferry: "veer" };

/** Vraag voor /ritten/status. Korte id's (r0, r1, …) houden de aanvraag kort. */
export function naarStatusVraag(ritten: VasteRit[]) {
  return ritten.map((r, i) => ({
    id: `r${i}`,
    lijn: r.lijn.lijn,
    vervoerder: r.lijn.vervoerder,
    modus: SERVER_MODUS[r.lijn.modus] ?? r.lijn.modus,
    richting: r.lijn.richting,
    halte_id: r.lijn.halte.id,
    vertrek: r.vertrek,
    dagen: r.dagen
  }));
}

/** Kloktijd van een vertrek, bij voorkeur de geplande (blijft stabiel als het vertrek vertraagt). */
export function vasteRitTijd(v: { gepland?: string; verwacht?: string }): string | null {
  const kandidaat = [v.gepland, v.verwacht].map((x) => (x ?? "").trim().slice(0, 5)).find((x) => geldigeTijd(x));
  return kandidaat ?? null;
}

export type RitKaartStaat =
  | { soort: "geen_dag" }
  | { soort: "voor"; vanaf: string }
  | { soort: "na" }
  | { soort: "laden" }
  | { soort: "onbekend" }
  | { soort: "ok" }
  | { soort: "storing"; storingen: { id: string; titel: string; omschrijving: string; onzeker: boolean }[] };

/** Wat de kaart toont. Bij een fout of ontbrekend antwoord nooit "geen storingen" (status onbekend). */
export function ritKaartStaat(
  rit: Pick<VasteRit, "vertrek" | "dagen">,
  nu: Date,
  server: { status: string; storingen: { id: string; titel: string; omschrijving: string; zekerheid?: string }[] } | undefined,
  laden: boolean,
  fout: boolean
): RitKaartStaat {
  const w = ritVenster(rit, nu);
  if (w.staat === "geen_dag") return { soort: "geen_dag" };
  if (w.staat === "voor") return { soort: "voor", vanaf: tijdTekst(w.start) };
  if (w.staat === "na") return { soort: "na" };
  if (!server) return laden && !fout ? { soort: "laden" } : { soort: "onbekend" };
  if (server.status === "storing" && server.storingen.length)
    return { soort: "storing", storingen: server.storingen.map((s) => ({ id: s.id, titel: s.titel, omschrijving: s.omschrijving, onzeker: s.zekerheid === "onzeker" })) };
  if (server.status === "ok") return { soort: "ok" };
  return { soort: "onbekend" };
}
