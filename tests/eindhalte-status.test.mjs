import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../lib/ritStatus.ts", import.meta.url), "utf8");
const body = src.slice(src.indexOf("export function eindhalteStatus"))
  .replace(/export function/, "function")
  .replace(/opts: \{[\s\S]*?\}\): EindhalteStatus/, "opts)");
const eindhalteStatus = new Function(body + "; return eindhalteStatus;")();
const basis = { ritStatus: "RUNNING", vervallen: false, aantalHaltes: 10, volgendeIndex: 3, laatsteGepasseerd: false, eersteGepasseerd: true, rijdend: true };

test("eindhalte: onderweg geeft niets", () => assert.equal(eindhalteStatus(basis), null));
test("eindhalte: volgende halte is de laatste -> bijna", () =>
  assert.equal(eindhalteStatus({ ...basis, volgendeIndex: 9 }), "bijna"));
test("eindhalte: aangekomen -> bereikt", () => {
  assert.equal(eindhalteStatus({ ...basis, laatsteGepasseerd: true }), "bereikt");
});
test("eindhalte: vervallen rit of niet rijdend geeft niets", () => {
  assert.equal(eindhalteStatus({ ...basis, vervallen: true, volgendeIndex: 9 }), null);
  assert.equal(eindhalteStatus({ ...basis, rijdend: false, volgendeIndex: 9 }), null);
});

test("eindhalte: ARRIVED zegt niets zolang de laatste halte niet gepasseerd is", () => {
  assert.equal(eindhalteStatus({ ...basis, ritStatus: "ARRIVED", eersteGepasseerd: false, volgendeIndex: 0 }), null);
  assert.equal(eindhalteStatus({ ...basis, ritStatus: "ARRIVED", eersteGepasseerd: true, volgendeIndex: 1 }), null);
});
