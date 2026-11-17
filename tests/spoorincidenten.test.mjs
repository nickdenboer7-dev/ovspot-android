import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spoorTijd, spoorLeeftijdMin, spoorPlek, spoorOrigineel, sorteerSpoor, spoorWeergave } from "../lib/spoor.ts";

const inc = (extra = {}) => ({
  id: "prorail:1", tis_code: "1.2", label: "Grote verstoring", bron: "ProRail Meldingen",
  meldingstijd: "2026-11-17T14:48:50+00:00", locatie: "Stationsplein 3 C 2312 AJ Leiden", plaats: "Leiden", station: "",
  oorspronkelijke_omschrijving: "ass hulpdst", regio_icb: "Rotterdam", status: "actief",
  verloopt_op: "2026-11-17T17:48:50+00:00", zekerheid: "bevestigd_door_bericht",
  gevolgen: "Mogelijk gevolgen voor het treinverkeer.", presentatietekst: "x", ...extra
});

test("Tijd wordt in Nederlandse tijd getoond (UTC+1 in november)", () => {
  assert.equal(spoorTijd("2026-11-17T14:48:50+00:00"), "15:48");
  assert.equal(spoorTijd("onzin"), "");
});

test("Leeftijd in minuten, nooit negatief", () => {
  const nu = new Date("2026-11-17T15:00:00+00:00").getTime();
  assert.equal(spoorLeeftijdMin("2026-11-17T14:48:50+00:00", nu), 11);
  assert.equal(spoorLeeftijdMin("2026-11-17T16:00:00+00:00", nu), 0);
});

test("Plek zonder dubbelen", () => {
  assert.equal(spoorPlek(inc()), "Stationsplein 3 C 2312 AJ Leiden");
  assert.equal(spoorPlek(inc({ plaats: "Arnhem", locatie: "Schavenmolenstraat 23 6824 AA" })), "Schavenmolenstraat 23 6824 AA, Arnhem");
  assert.equal(spoorPlek(inc({ locatie: "", plaats: "" })), "");
});

test("Oorspronkelijke tekst alleen als die iets toevoegt", () => {
  assert.equal(spoorOrigineel(inc()), "ass hulpdst");
  assert.equal(spoorOrigineel(inc({ oorspronkelijke_omschrijving: "" })), "");
  assert.equal(spoorOrigineel(inc({ oorspronkelijke_omschrijving: "Grote verstoring" })), "");
});

test("Landelijke verstoring (1.4) staat altijd bovenaan, rest nieuwste eerst", () => {
  const a = inc({ id: "a", meldingstijd: "2026-11-17T10:00:00+00:00" });
  const b = inc({ id: "b", meldingstijd: "2026-11-17T12:00:00+00:00" });
  const c = inc({ id: "c", tis_code: "1.4", meldingstijd: "2026-11-17T08:00:00+00:00" });
  assert.deepEqual(sorteerSpoor([a, b, c]).map(i => i.id), ["c", "b", "a"]);
});

test("Verouderde bron toont nooit oude incidenten als actueel", () => {
  const w = spoorWeergave({ bijgewerkt: "x", bron_laatste_bericht: null, status: "bron_verouderd", statusmelding: "Bron niet actueel", incidenten: [inc()] });
  assert.equal(w.soort, "verouderd");
  assert.equal(w.melding, "Bron niet actueel");
  assert.equal(spoorWeergave({ bijgewerkt: "x", bron_laatste_bericht: null, status: "actueel", statusmelding: "", incidenten: [] }).soort, "leeg");
  assert.equal(spoorWeergave({ bijgewerkt: "x", bron_laatste_bericht: null, status: "actueel", statusmelding: "", incidenten: [inc()] }).soort, "lijst");
});

test("Storingen-tab heeft ProRail-chip, haalt data via de api en laat P2000 en haltes ongemoeid", () => {
  const tab = readFileSync(new URL("../app/(tabs)/storingen.tsx", import.meta.url), "utf8");
  assert.match(tab, /key: "spoor", label: "ProRail"/);
  assert.match(tab, /api\.spoorIncidenten\(\)/);
  assert.match(tab, /key: "p2000", label: "P2000"/);
  assert.match(tab, /api\.p2000\(/);
  const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(api, /spoorIncidenten: \(\) => get<SpoorAntwoord>\("\/storingen\/spoor"/);
});

test("Alle labels en teksten van Spoorincidenten hebben een Engelse vertaling", () => {
  const i18n = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");
  for (const k of ["Grote verstoring", "Spoor geblokkeerd", "Landelijke verstoring", "Brand bij spoor/station", "Aanrijding op het spoor", "Incident met gevaarlijke stoffen", "Veiligheidsincident", "Mogelijk gevolgen voor het treinverkeer.", "Geen grote spoorincidenten", "Spoormeldingen niet actueel"]) {
    assert.ok(i18n.includes(`"${k}":`), k);
  }
});

test("Relatieve tijd heeft Engelse vorm (min, uur, zojuist)", () => {
  const i18n = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");
  assert.match(i18n, /\^\(\\d\+\) min geleden\$/);
  assert.match(i18n, /\^\(\\d\+\) uur geleden\$/);
  assert.ok(i18n.includes('"zojuist":'));
});
