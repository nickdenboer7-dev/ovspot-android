import type { SpoorAntwoord, SpoorIncident } from "./types";

/** Kleine, pure hulpfuncties voor Spoorincidenten (testbaar zonder React). */

export function spoorTijd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" }).format(d);
}

export function spoorLeeftijdMin(iso: string, nu = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((nu - t) / 60000));
}

/** Plaats en adres zonder dubbelen, bijv. "Stationsplein 1 5683 BD Best". */
export function spoorPlek(i: Pick<SpoorIncident, "locatie" | "plaats" | "station">): string {
  const delen = [i.station, i.locatie, i.plaats].map((v) => (v ?? "").trim()).filter(Boolean);
  const uniek: string[] = [];
  for (const d of delen) {
    if (uniek.some((u) => u.toLowerCase().includes(d.toLowerCase()))) continue;
    uniek.push(d);
  }
  return uniek.join(", ");
}

/** Oorspronkelijke tekst alleen tonen als hij iets toevoegt en niet gelijk is aan de titel. */
export function spoorOrigineel(i: Pick<SpoorIncident, "oorspronkelijke_omschrijving" | "label">): string {
  const t = (i.oorspronkelijke_omschrijving ?? "").trim();
  if (!t || t.toLowerCase() === (i.label ?? "").trim().toLowerCase()) return "";
  return t;
}

/** Landelijke verstoring (TIS 1.4) altijd bovenaan, daarna nieuwste eerst; ook als de API iets anders levert. */
export function sorteerSpoor(lijst: SpoorIncident[]): SpoorIncident[] {
  const rang = (i: SpoorIncident) => (i.tis_code === "1.4" ? 0 : 1);
  return [...lijst].sort((a, b) => rang(a) - rang(b) || new Date(b.meldingstijd).getTime() - new Date(a.meldingstijd).getTime());
}

export type SpoorWeergave =
  | { soort: "lijst"; incidenten: SpoorIncident[] }
  | { soort: "leeg" }
  | { soort: "verouderd"; melding: string };

/** Verouderde bron = nooit oude incidenten tonen als actueel. */
export function spoorWeergave(a: SpoorAntwoord): SpoorWeergave {
  if (a.status && a.status !== "actueel") {
    return { soort: "verouderd", melding: a.statusmelding || "De bron van de spoormeldingen is nu niet actueel." };
  }
  const lijst = sorteerSpoor(a.incidenten ?? []);
  return lijst.length ? { soort: "lijst", incidenten: lijst } : { soort: "leeg" };
}
