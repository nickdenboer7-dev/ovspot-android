import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dagdeelKop, toonAlsLive } from "../lib/format.ts";
import { materieelRegel } from "../lib/ritverloopV2.ts";

const op = (u, m, dag = 17) => new Date(2026, 10, dag, u, m).getTime();

test("Dagdeel-kop: ochtend begint om 05:00 en het huidige dagdeel krijgt geen losse kop", () => {
  const nacht = op(1, 53);
  assert.equal(dagdeelKop(op(5, 38), nacht), "Vanochtend");
  assert.equal(dagdeelKop(op(2, 9), nacht), null);
  assert.equal(dagdeelKop(op(3, 35), nacht), null);
  assert.equal(dagdeelKop(op(4, 35), nacht), null);
  assert.equal(dagdeelKop(op(12, 4), nacht), "Vanmiddag");
  assert.equal(dagdeelKop(op(18, 3), nacht), "Vanavond");
  assert.equal(dagdeelKop(op(0, 30, 18), op(22, 0)), "Morgen");
  assert.equal(dagdeelKop(null, nacht), null);
});

test("Vertrek telt pas als live binnen 30 minuten, of als er echt een afwijking is", () => {
  const nu = op(1, 53);
  assert.equal(toonAlsLive({ live: true, vertrek_ms: op(5, 7), vertraging_min: 0 }, nu), false);
  assert.equal(toonAlsLive({ live: true, vertrek_ms: op(2, 13), vertraging_min: 0 }, nu), true);
  assert.equal(toonAlsLive({ live: true, vertrek_ms: op(2, 43), vertraging_min: 2 }, nu), true);
  assert.equal(toonAlsLive({ live: false, vertrek_ms: op(2, 0), vertraging_min: 0 }, nu), false);
  const regel = readFileSync(new URL("../components/VertrekRegel.tsx", import.meta.url), "utf8");
  const bord = readFileSync(new URL("../app/halte/[id].tsx", import.meta.url), "utf8");
  assert.match(regel, /statusKleur=\{toonAlsLive\(v, nu\)\}/);
  assert.match(regel, /!v\.vervallen && toonAlsLive\(v, nu\) \? <View style=\{s\.detailRij\}>/);
  assert.match(bord, /vertrekken\.some\(v => toonAlsLive\(v, nu\)\)/);
});

test("Treinstel 0 is een lege plek in de bron en wordt niet getoond", () => {
  assert.equal(materieelRegel({ type: "ICM", bakken: 6, stel: ["0", "0"] }), "ICM · 6 bakken");
  assert.equal(materieelRegel({ type: "VIRM", bakken: 6, stel: ["8740", "0"] }), "VIRM · 6 bakken · stel 8740");
});

test("Gewijzigde tijd: kloktijd met afwijking en planning, zonder aftelling als derde tijd", () => {
  const cel = readFileSync(new URL("../components/RitTijdcel.tsx", import.meta.url), "utf8");
  assert.match(cel, /const toonAftel = !!aftel && !vervallen && !gewijzigd;/);
  assert.match(cel, /\{toonAftel \? \(/);
});

test("Ritscherm: geen 'Gepland' of 'Geen voertuig-GPS' zolang de rit laadt; knop naar het voertuig", () => {
  const rit = readFileSync(new URL("../components/RitverloopV2Screen.tsx", import.meta.url), "utf8");
  assert.match(rit, /const ladenStatus = !rit && poll\.laden \? "Laden…" : undefined;/);
  assert.match(rit, /laden: gpsPoll\.laden \|\| \(!rit && poll\.laden\)/);
  assert.match(rit, /actie=\{toonVoertuigKnop \?/);
  assert.match(rit, /const toonVoertuigKnop = voertuigIndex >= 0 && voertuigBuitenBeeld;/);
});

test("Lijn 395 naar Amsterdam toont Sloterdijk, ook bij afwijkende schrijfwijze", async () => {
  const { bestemmingVoorWeergave } = await import("../lib/format.ts");
  for (const b of ["Amsterdam", "Amsterdam ", "AMSTERDAM", "Amsterdam​"]) {
    assert.equal(bestemmingVoorWeergave("395", b), "Amsterdam Sloterdijk", JSON.stringify(b));
  }
  assert.equal(bestemmingVoorWeergave(" 395​", "Amsterdam"), "Amsterdam Sloterdijk");
  assert.equal(bestemmingVoorWeergave("394", "Amsterdam Noorderpark"), "Amsterdam Noorderpark");
  assert.equal(bestemmingVoorWeergave("395", "Amsterdam Centraal"), "Amsterdam Centraal");
  assert.equal(bestemmingVoorWeergave("395", "Haarlem"), "Haarlem");
});
