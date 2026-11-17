import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
const dichtbij = readFileSync(new URL("../app/(tabs)/index.tsx", import.meta.url), "utf8");
const instellingen = readFileSync(new URL("../app/(tabs)/instellingen.tsx", import.meta.url), "utf8");
const rit = readFileSync(new URL("../components/RitverloopV2Screen.tsx", import.meta.url), "utf8");

test("geen zwevende feedbackknop meer over de schermen heen", () => {
  assert.equal(existsSync(new URL("../components/FeedbackKnop.tsx", import.meta.url)), false);
  assert.doesNotMatch(layout, /FeedbackKnop/);
});

test("feedback zit in de kop van Dichtbij en opent het bestaande formulier", () => {
  assert.match(dichtbij, /icoon="chatbubble-ellipses-outline" label="Feedback sturen" onPress=\{\(\) => setFeedbackOpen\(true\)\}/);
  assert.match(dichtbij, /<FeedbackModal zichtbaar=\{feedbackOpen\}/);
  // De losse locatieknop staat niet meer naast de plaats-chip.
  assert.doesNotMatch(dichtbij, /label="Locatie vernieuwen"/);
});

test("feedback blijft bereikbaar via Instellingen en het menu van het ritscherm", () => {
  assert.match(instellingen, /titel="Stuur feedback"/);
  assert.match(instellingen, /<FeedbackModal/);
  assert.match(rit, /setMenuOpen\(false\); setFeedbackOpen\(true\);/);
  assert.match(rit, /view: "rit"/);
});
