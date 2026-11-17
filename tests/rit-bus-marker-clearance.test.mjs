import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  veiligeVoertuigPositie,
  VOERTUIG_DIAMETER,
  HALTE_DIAMETER,
  MIN_TUSSENRUIMTE_DP
} from "../lib/ritverloopV2.ts";

const marker = readFileSync(new URL("../components/RijdendVoertuig.tsx", import.meta.url), "utf8");
const stop = readFileSync(new URL("../components/RitverloopStop.tsx", import.meta.url), "utf8");
const screen = readFileSync(new URL("../components/RitverloopV2Screen.tsx", import.meta.url), "utf8");
const clearance = (VOERTUIG_DIAMETER + HALTE_DIAMETER) / 2 + MIN_TUSSENRUIMTE_DP;

test("28dp bus stays at least 2dp clear of both 12dp stop circles", () => {
  assert.equal(MIN_TUSSENRUIMTE_DP, 2);
  assert.equal(clearance, 22);
  for (const [previous, current] of [[48, 48], [48, 64], [54, 64], [64, 64], [48, 90]]) {
    for (const gpsProgress of [-5, 0, 0.01, 0.05, 0.2, 0.5, 0.8, 0.95, 1, 9]) {
      const v = veiligeVoertuigPositie(gpsProgress, previous, current);
      assert.ok(v, "Layout " + previous + "/" + current + " should fit");
      const center = v.minCentrum + v.normaal * (v.maxCentrum - v.minCentrum);
      assert.ok(center >= clearance - 1e-7,
        "Touches previous stop " + previous + "/" + current + " (" + gpsProgress + ")");
      assert.ok(v.lengte - center >= clearance - 1e-7,
        "Touches next stop " + previous + "/" + current + " (" + gpsProgress + ")");
      assert.ok(v.normaal >= 0 && v.normaal <= 1);
    }
  }
});

test("Do not draw vehicle when there is physically no space between two dots", () => {
  assert.equal(veiligeVoertuigPositie(0.5, 40, 40), null);
  assert.equal(veiligeVoertuigPositie(0.5, 0, 48), null);
  assert.equal(veiligeVoertuigPositie(NaN, 48, 64), null);
  assert.equal(veiligeVoertuigPositie(Infinity, 48, 64), null);
});

test("Animated bus and traveled segment share exactly the same clamped position", () => {
  assert.match(marker, /const veilig = veiligeVoertuigPositie\(voortgang, vorigeHoogte, huidigeHoogte\)/);
  assert.match(marker, /if \(!veilig\) return null/);
  assert.match(marker, /inputRange: \[0, 1\]/);
  assert.match(marker, /outputRange: \[minCentrum, maxCentrum\]/);
  assert.match(marker, /minCentrum - VOERTUIG_DIAMETER \/ 2/);
  assert.match(marker, /maxCentrum - VOERTUIG_DIAMETER \/ 2/);
  assert.match(marker, /extrapolate: "clamp"/);
  assert.doesNotMatch(marker, /Date\.now\(\)|volgendeMs|duration: \d{4,}/);
});

test("Quiet centered 2dp line, gray above GPS vehicle and blue below", () => {
  assert.match(marker, /backgroundColor: teRijdenKleur/);
  assert.match(marker, /backgroundColor: geredenKleur/);
  assert.match(marker, /height: centrum/);
  assert.match(marker, /lijn: \{ position: "absolute", left: 13, top: 0, width: 2 \}/);
  assert.match(stop, /topLine: \{ position: "absolute", left: 13, top: 0, width: 2/);
  assert.match(stop, /bottomLine: \{ position: "absolute", left: 13, bottom: 0, width: 2/);
});

test("Next-stop information exists only in the stop row, never in an extra banner", () => {
  assert.doesNotMatch(screen, /Volgende halte · GPS|<VolgendeHalteKaart|<NextStopBanner/);
  assert.match(screen, /<StatusStrook[\s\S]*?<ScrollView ref=\{lijstRef\}/);
  assert.match(stop, /t\("Volgende halte"\)/);
  assert.match(stop, /<RijdendVoertuig/);
});

test("Bus past in de echte rijhoogtes van de haltelijst (was 40/54 = te krap, bus verdween)", () => {
  assert.match(screen, /const height = r.index === volgendeIndex && rijdend \? 60 : 40/);
  assert.match(screen, /const prevHeight = r.index - 1 === volgendeIndex && rijdend \? 60 : 40/);
  assert.ok(veiligeVoertuigPositie(0.5, 40, 60), "gewone rij gevolgd door de volgende halte");
  assert.ok(veiligeVoertuigPositie(0.5, 40, 82), "volgende halte is Jouw halte");
  assert.equal(veiligeVoertuigPositie(0.5, 40, 40), null);
  assert.match(stop, /huidigeHoogte=\{echteHoogte\}/);
});
