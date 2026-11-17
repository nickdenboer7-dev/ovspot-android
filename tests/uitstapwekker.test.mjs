import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bron = p => readFileSync(new URL(p, import.meta.url), "utf8");
const push = bron("../lib/push.ts");
const scherm = bron("../components/RitverloopV2Screen.tsx");
const stop = bron("../components/RitverloopStop.tsx");

test("Uitstapwekker gebruikt het serverendpoint met de drie afgesproken triggers", () => {
  assert.match(push, /post<\{ id\?: string \}>\("uitstap"/);
  assert.match(push, /post\("uitstap\/annuleer", \{ id \}\)/);
  assert.match(push, /type: "haltes_ervoor", n: 1/);
  assert.match(push, /type: "haltes_ervoor", n: 2/);
  assert.match(push, /type: "minuten_ervoor", n: 2/);
  for (const veld of ["rit_key", "datum", "stop_id", "stop_naam", "lijn", "modus", "trigger"]) {
    assert.ok(push.includes(veld), veld);
  }
});

test("Ritscherm toont een belletje per halte en laat de wekker ook uitzetten", () => {
  assert.match(stop, /onWekker && !gepasseerd && !h\.vervalt/);
  assert.match(scherm, /onWekker=\{ritSleutel && !rit\?\.vervallen/);
  assert.match(scherm, /UITSTAP_KEUZES\.map/);
  assert.match(scherm, /annuleerUitstapWekker\(bestaand\.id\)/);
});
