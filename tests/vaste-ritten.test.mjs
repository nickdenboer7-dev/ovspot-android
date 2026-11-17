import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { maakVasteRit, normaliseerVasteRitten, ritVenster, dagenTekst, tijdTekst, MAX_VASTE_RITTEN, naarStatusVraag, vasteRitTijd, ritKaartStaat } from "../lib/vasteRitten.ts";

const lijn = { id: "L1", halte: { id: "h1", naam: "Barkstraat", plaats: "Zaandam" }, lijn: "395", richting: "Zaandam", modus: "bus", vervoerder: "Connexxion" };
// 2026-11-16 is een maandag
const ma = (u, m) => new Date(2026, 10, 16, u, m);
const za = (u, m) => new Date(2026, 10, 21, u, m);

test("Rit maken: tijd en dagen worden gecontroleerd, standaard ma–vr", () => {
  const r = maakVasteRit({ lijn, vertrek: "07:40" });
  assert.deepEqual(r.dagen, [1, 2, 3, 4, 5]);
  assert.equal(r.push, true);
  assert.equal(maakVasteRit({ lijn, vertrek: "7:40" }), null);
  assert.equal(maakVasteRit({ lijn, vertrek: "25:00" }), null);
  assert.equal(maakVasteRit({ lijn, vertrek: "07:40", dagen: [] }), null);
  assert.deepEqual(maakVasteRit({ lijn, vertrek: "07:40", dagen: [5, 1, 1, 9] }).dagen, [1, 5]);
});

test("Venster: 60 min voor tot 30 min na vertrek", () => {
  const r = maakVasteRit({ lijn, vertrek: "07:40" });
  assert.equal(ritVenster(r, ma(6, 39)).staat, "voor");
  assert.equal(ritVenster(r, ma(6, 40)).staat, "binnen");
  assert.equal(ritVenster(r, ma(8, 10)).staat, "binnen");
  assert.equal(ritVenster(r, ma(8, 11)).staat, "na");
  const v = ritVenster(r, ma(6, 0));
  assert.equal(tijdTekst(v.start), "06:40");
});

test("Op een niet gekozen dag is er geen venster", () => {
  const r = maakVasteRit({ lijn, vertrek: "07:40" });
  assert.equal(ritVenster(r, za(7, 40)).staat, "geen_dag");
});

test("Venster loopt niet voorbij middernacht", () => {
  const r = maakVasteRit({ lijn, vertrek: "23:50" });
  assert.equal(ritVenster(r, ma(23, 55)).staat, "binnen");
  assert.equal(tijdTekst(ritVenster(r, ma(23, 55)).eind), "00:00");
});

test("Normaliseren: ongeldig weg, dubbelen weg, maximum", () => {
  const goed = { lijn, vertrek: "07:40", dagen: [1, 2], naam: "Werk", push: false };
  assert.equal(normaliseerVasteRitten([goed, goed, null, { vertrek: "07:40" }, { lijn, vertrek: "x" }]).length, 1);
  assert.equal(normaliseerVasteRitten("nope").length, 0);
  const veel = Array.from({ length: 15 }, (_, i) => ({ lijn, vertrek: `${String(i).padStart(2, "0")}:00` }));
  assert.equal(normaliseerVasteRitten(veel).length, MAX_VASTE_RITTEN);
  assert.equal(normaliseerVasteRitten([goed])[0].push, false);
});

test("Dagen leesbaar", () => {
  assert.equal(dagenTekst([1, 2, 3, 4, 5]), "ma–vr");
  assert.equal(dagenTekst([1, 2, 3, 4, 5, 6, 7]), "elke dag");
  assert.equal(dagenTekst([1, 3, 5]), "ma, wo, vr");
  assert.equal(dagenTekst([6, 7]), "za–zo");
});

test("Statusvraag: korte id's, servermodus, geen persoonlijke gegevens", () => {
  const r = maakVasteRit({ lijn: { ...lijn, modus: "train" }, vertrek: "07:40", naam: "Mijn geheime naam" });
  const q = naarStatusVraag([r, maakVasteRit({ lijn, vertrek: "16:45" })]);
  assert.equal(q[0].id, "r0");
  assert.equal(q[1].id, "r1");
  assert.equal(q[0].modus, "trein");
  assert.equal(q[1].modus, "bus");
  assert.equal(q[0].halte_id, "h1");
  assert.deepEqual(q[0].dagen, [1, 2, 3, 4, 5]);
  assert.ok(!JSON.stringify(q).includes("geheime"));
});

test("Tijd van een vertrek: geplande tijd eerst, ongeldig = geen rit", () => {
  assert.equal(vasteRitTijd({ gepland: "07:40", verwacht: "07:45" }), "07:40");
  assert.equal(vasteRitTijd({ gepland: "", verwacht: "07:45" }), "07:45");
  assert.equal(vasteRitTijd({ gepland: "07:40:00" }), "07:40");
  assert.equal(vasteRitTijd({ gepland: "morgen" }), null);
});

test("Kaartstaat: buiten het venster geen serverdata nodig, fouten worden nooit 'geen storingen'", () => {
  const r = maakVasteRit({ lijn, vertrek: "07:40" });
  assert.equal(ritKaartStaat(r, za(7, 40), undefined, false, false).soort, "geen_dag");
  const voor = ritKaartStaat(r, ma(5, 0), undefined, false, false);
  assert.equal(voor.soort, "voor");
  assert.equal(voor.vanaf, "06:40");
  assert.equal(ritKaartStaat(r, ma(9, 0), undefined, false, false).soort, "na");
  assert.equal(ritKaartStaat(r, ma(7, 0), undefined, true, false).soort, "laden");
  assert.equal(ritKaartStaat(r, ma(7, 0), undefined, false, true).soort, "onbekend");
  assert.equal(ritKaartStaat(r, ma(7, 0), { status: "ok", storingen: [] }, false, false).soort, "ok");
  assert.equal(ritKaartStaat(r, ma(7, 0), { status: "iets_anders", storingen: [] }, false, false).soort, "onbekend");
  const st = ritKaartStaat(r, ma(7, 0), { status: "storing", storingen: [{ id: "1", titel: "Omleiding", omschrijving: "x", zekerheid: "onzeker" }] }, false, false);
  assert.equal(st.soort, "storing");
  assert.equal(st.storingen[0].onzeker, true);
});

test("Schermen en opslag zijn aangesloten, bestaande favorieten blijven", () => {
  const fav = readFileSync(new URL("../app/(tabs)/favorieten.tsx", import.meta.url), "utf8");
  assert.match(fav, /Mijn ritten/);
  assert.match(fav, /api\.rittenStatus\(naarStatusVraag\(binnenRitten\)\)/);
  assert.match(fav, /Mijn lijnen/);
  const reg = readFileSync(new URL("../components/VertrekRegel.tsx", import.meta.url), "utf8");
  assert.match(reg, /onVasteRit/);
  assert.match(reg, /onWekker/);
  const api = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(api, /\/ritten\/status\?ritten=/);
  const storage = readFileSync(new URL("../lib/storage.ts", import.meta.url), "utf8");
  assert.match(storage, /ovspot\.vasteRitten\.v1/);
});

test("Engelse teksten voor vaste ritten", () => {
  const i18n = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");
  for (const k of ["Maak dit mijn vaste rit", "Rit opslaan", "Welke dagen", "Mijn ritten", "Status onbekend", "ma–vr", "elke dag", "Naam", "Geen storingen"]) assert.ok(i18n.includes(`"${k}":`), k);
  assert.match(i18n, /Storingen verschijnen hier vanaf/);
});

test("Dubbele rit en maximum geven aparte meldingen; P2000-leegtekst is vertaald", () => {
  const blad = readFileSync(new URL("../components/VasteRitBlad.tsx", import.meta.url), "utf8");
  assert.match(blad, /uitkomst === "dubbel"/);
  assert.match(blad, /uitkomst === "maximum"/);
  const prov = readFileSync(new URL("../context/AppProvider.tsx", import.meta.url), "utf8");
  assert.match(prov, /"ok" \| "dubbel" \| "maximum"/);
  const i18n = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");
  assert.ok(i18n.includes('"Deze rit staat er al.":'));
  assert.ok(i18n.includes('"Geen P2000-meldingen voor het OV":'));
});
