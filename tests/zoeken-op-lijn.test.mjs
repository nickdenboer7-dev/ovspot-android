import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lees = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("zoeken op lijn: api, schermen en haltebord zijn gekoppeld", () => {
  const api = lees("../lib/api.ts"), zoek = lees("../app/zoek.tsx"), lijn = lees("../app/lijn.tsx");
  const halte = lees("../app/halte/[id].tsx"), layout = lees("../app/_layout.tsx");
  assert.match(api, /\/lijn\/\$\{encodeURIComponent\(routeKey\)\}\/haltes\?richting=/);
  assert.match(zoek, /lijn_resultaten/);
  assert.match(zoek, /pathname: "\/lijn"/);
  assert.match(lijn, /api\.lijnHaltes\(routeKey, richtingId\)/);
  assert.match(lijn, /kieslijn: lijn/);
  assert.match(lijn, /kiesrichting:/);
  assert.match(layout, /Stack\.Screen name="lijn"/);
  assert.match(halte, /kieslijn\?: string; kiesrichting\?: string/);
  assert.match(halte, /if \(kiesLijnParam && !lijnFavoriet\) setSelectedLine\(kiesLijnParam\)/);
  assert.match(halte, /setLokaleRichting\(\{ lijn: m\.lijn/);
  assert.match(halte, /return; \}\s*richtingGekozenVoor\.current = sleutel/);
});

test("zoekresultaten tonen geen lege melding als er lijnroutes zijn", () => {
  const zoek = lees("../app/zoek.tsx");
  assert.match(zoek, /lijnRoutes\.length \? null : q\.trim\(\)\.length < 2/);
  assert.match(zoek, /!voorThuis && !voorFavorieten && gevonden\.term === term/);
});

test("bord toont geen gemengde richtingen terwijl de gevraagde richting nog wordt bepaald", () => {
  const halte = lees("../app/halte/[id].tsx");
  assert.match(halte, /const wachtOpRichting = /);
  assert.match(halte, /if \(wachtOpRichting\) lijst = <Laden \/>/);
  assert.match(halte, /setTimeout\(\(\) => setRichtingKlaar\(true\), 6000\)/);
});
