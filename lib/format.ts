import type { Palette } from "../constants/theme";
import type { Modus, Vertrek } from "./types";
import { bepaalRitStatus } from "./ritStatus.ts";

/** "Nu", "1 min", "12 min", of de kloktijd als het langer dan een uur duurt. */
export function aftellen(ms: number | null, now: number, klok: string): string {
  if (ms == null) return klok || "—";
  const diff = ms - now;
  if (diff <= 30_000) return "Nu";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "1 min";
  if (min >= 60) return klok;
  return `${min} min`;
}

export function afstand(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function klokSec(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function klok(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function datumKort(ms: number, taal: "nl" | "en" = "nl"): string {
  const d = new Date(ms);
  return `${d.getDate()} ${(taal === "en" ? MONTHS_EN : MAANDEN)[d.getMonth()]}`;
}

/** Tekst voor wanneer een storing geldt: "Sinds 06:00 · t/m 12 dec". */
export function periode(vanaf: number | null, tot: number | null, now = Date.now(), taal: "nl" | "en" = "nl"): string {
  const delen: string[] = [];
  if (vanaf) {
    const zelfdeDag = new Date(vanaf).toDateString() === new Date(now).toDateString();
    delen.push(vanaf <= now ? `Sinds ${zelfdeDag ? klok(new Date(vanaf)) : datumKort(vanaf, taal)}` : `Vanaf ${datumKort(vanaf, taal)} ${klok(new Date(vanaf))}`);
  }
  if (tot) {
    const zelfdeDag = new Date(tot).toDateString() === new Date(now).toDateString();
    delen.push(zelfdeDag ? `tot ${klok(new Date(tot))}` : `t/m ${datumKort(tot, taal)}`);
  }
  return delen.join(" · ");
}

export type Status = { text: string; color: string; dot: boolean };

/** Vertrekrijen gebruiken dezelfde statussen als ritverloop. */
export function status(v: Pick<Vertrek, "vervallen" | "live" | "vertraging_min">, c: Palette): Status {
  const st = bepaalRitStatus({ live: v.live, vervallen: v.vervallen, afwijkingMin: v.vertraging_min });
  const kleur = st.soort === "vervallen" ? c.red : st.soort === "gepland" ? c.sub
    : st.soort === "vertraagd" ? c.delay : st.soort === "te_vroeg" ? "#A855F7" : c.live;
  return { text: st.tekst, color: kleur, dot: st.heeftLive };
}

export function isTrein(m: Modus): boolean {
  return m === "train";
}

/** Aantal tekenwijzigingen tussen twee korte woorden (voor bron-data met vreemde tekens). */
function afstandTussen(a: string, b: string): number {
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const rij = [i];
    for (let j = 1; j <= b.length; j++) {
      rij[j] = Math.min(vorige[j] + 1, rij[j - 1] + 1, vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    vorige = rij;
  }
  return vorige[b.length];
}

export function bestemmingVoorWeergave(lijn: Vertrek["lijn"], bestemming: string): string {
  // Ook bij hoofdletters, spaties, onzichtbare of afwijkende tekens in de bron-data.
  const kaal = (x: unknown) => String(x ?? "").replace(/[^0-9A-Za-z]/g, "").toLowerCase();
  const b = kaal(bestemming);
  const isAmsterdam = b === "amsterdam" || (b.length >= 7 && b.length <= 11 && afstandTussen(b, "amsterdam") <= 2);
  return kaal(lijn) === "395" && isAmsterdam ? "Amsterdam Sloterdijk" : bestemming;
}

export function spoorLabel(modus: Modus, spoor: string): string {
  if (!spoor) return "";
  return isTrein(modus) ? `Spoor ${spoor}` : `Perron ${spoor}`;
}

export function ritNummer(id: string): string {
  const m = /[:/](\d{2,6})$/.exec(id || "");
  return m ? `rit ${m[1]}` : "";
}

type Tijden = Pick<Vertrek, "vervallen" | "vertrek_ms" | "gepland" | "verwacht" | "vertraging_min">;

/** Bewaar de echte kloktijd naast de afteltijd, ook voor geplande ritten en kleine schermen. */
export function vertrekTijden(v: Tijden, nu: number) {
  const vertrokken = !v.vervallen && typeof v.vertrek_ms === "number" && Number.isFinite(v.vertrek_ms) && v.vertrek_ms < nu;
  const vertraagd = !v.vervallen && !vertrokken && v.vertraging_min > 0;
  const kloktijd = String(v.verwacht || v.gepland || "").trim();
  const tijd = v.vervallen ? "–" : vertrokken ? "Vertrokken" : aftellen(v.vertrek_ms, nu, kloktijd);
  // Bij >=60 min geeft aftellen zelf de kloktijd; die niet dubbel afdrukken.
  const tweedeTijd = kloktijd && tijd !== kloktijd && !v.vervallen && !vertrokken ? kloktijd : "";
  const oorspronkelijk = vertraagd && v.gepland && v.gepland !== kloktijd ? v.gepland : "";
  return { vertrokken, vertraagd, tijd, kloktijd, tweedeTijd, oorspronkelijk };
}


const WEEKDAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

/** Subkop voor vertrekken die pas uren later gaan; null als het vertrek dichtbij is. */
export function dagdeelKop(ms: number | null | undefined, nu: number): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms - nu < 90 * 60_000) return null;
  const d = new Date(ms);
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(d) - dag(new Date(nu))) / 86_400_000);
  const deel = (u: number) => (u < 5 ? "Vannacht" : u < 12 ? "Vanochtend" : u < 18 ? "Vanmiddag" : "Vanavond");
  if (verschil === 0) {
    const mijn = deel(new Date(nu).getHours());
    const dit = deel(d.getHours());
    // Zit je er al middenin (bijv. 's nachts), dan geen losse kop voor het huidige dagdeel.
    return dit === mijn ? null : dit;
  }
  if (verschil === 1) return "Morgen";
  return WEEKDAGEN[d.getDay()].replace(/^./, (c) => c.toUpperCase());
}

/** Een vertrek pas als live tonen als het binnen een half uur gaat, of als er echt een afwijking bekend is. */
export function toonAlsLive(v: Pick<Vertrek, "live" | "vertrek_ms" | "vertraging_min">, nu: number): boolean {
  if (!v.live) return false;
  if (typeof v.vertrek_ms !== "number" || !Number.isFinite(v.vertrek_ms)) return true;
  return v.vertrek_ms - nu <= 30 * 60_000 || v.vertraging_min !== 0;
}
