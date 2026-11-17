import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Over OVspot heropent de uitleg", () => {
  assert.match(readFileSync(new URL("../app/info.tsx", import.meta.url), "utf8"), /toonUitleg\(\)/);
});

test("Haltebord 'Alles' toont de komende 1,5 uur zonder extra verzoeken per lijn", () => {
  const halte = readFileSync(new URL("../app/halte/[id].tsx", import.meta.url), "utf8");
  assert.match(halte, /90 \* 60_000/);
  assert.match(halte, /start \+ 90 \* 60_000/);
  assert.doesNotMatch(halte, /alles-hele-dag|Promise\.allSettled/);
});

test("Haltekaartje verbergt een vertrokken rit na een minuut, net als het haltebord", () => {
  const kaart = readFileSync(new URL("../components/HalteKaart.tsx", import.meta.url), "utf8");
  assert.match(kaart, /vertrek_ms >= nu - 60_000/);
});

test("haltebord toont geen dagdeelkoppen", () => {
  const halte = readFileSync(new URL("../app/halte/[id].tsx", import.meta.url), "utf8");
  assert.doesNotMatch(halte, /dagdeelKop/);
});

test("Lijnen-overzicht, richting en tijdkiezer zitten op het haltebord", () => {
  const halte = readFileSync(new URL("../app/halte/[id].tsx", import.meta.url), "utf8");
  const ov = readFileSync(new URL("../components/LijnenOverzicht.tsx", import.meta.url), "utf8");
  assert.match(halte, /weergave === "lijnen" && !geselecteerdeLijn/);
  assert.match(halte, /lokaleRichting \?\? \(richtingActief \? lijnFavoriet : null\)/);
  assert.match(halte, /Kies een starttijd/);
  assert.match(ov, /groepeerPerRichting/);
  assert.match(ov, /bestemmingVoorWeergave/);
});
