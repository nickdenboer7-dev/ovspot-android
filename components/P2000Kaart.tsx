import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./LocalizedText";
import { useApp } from "../context/AppProvider";
import type { P2000Melding } from "../lib/types";
import { Kaart } from "./ui";

const SOORT: Record<string, { label: string; icoon: keyof typeof Ionicons.glyphMap }> = {
  spoor: { label: "Spoor", icoon: "train-outline" },
  tram: { label: "Tram", icoon: "bus-outline" },
  metro: { label: "Metro", icoon: "subway-outline" },
  bus: { label: "Bus", icoon: "bus-outline" },
  brug: { label: "Brug", icoon: "git-compare-outline" },
  weg: { label: "Weg", icoon: "car-outline" }
};

export function leeftijdTekst(min: number): string {
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const u = Math.floor(min / 60);
  return `${u} uur geleden`;
}

export function P2000Kaart({ m }: { m: P2000Melding }) {
  const { colors, t } = useApp();
  const soort = SOORT[m.soort] ?? { label: "Melding", icoon: "megaphone-outline" as const };
  const plek = [m.locatie, m.plaats].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  const afstand = m.afstand_m != null ? `${m.afstand_m} m` : null;
  return (
    <Kaart style={s.kaart}>
      <View style={s.kopRij}>
        <View style={[s.label, { backgroundColor: colors.infoBg }]}>
          <Ionicons name={soort.icoon} size={14} color={colors.infoText} />
          <Text style={[s.labelText, { color: colors.infoText }]}>{t(soort.label)}</Text>
        </View>
        <Text style={[s.wanneer, { color: colors.sub }]} numberOfLines={1}>
          {`P2000 · ${m.tijd} · ${t(leeftijdTekst(m.leeftijd_min))}`}
        </Text>
      </View>
      <Text style={[s.tekst, { color: colors.text }]}>{m.tekst}</Text>
      <Text style={[s.plek, { color: colors.sub }]} numberOfLines={2}>
        {[plek, afstand ? `${afstand} ${t("van deze halte")}` : null, m.indicatief ? t("locatie bij benadering") : null, m.aantal > 1 ? `${m.aantal} ${t("berichten")}` : null].filter(Boolean).join(" · ")}
      </Text>
    </Kaart>
  );
}

export function P2000Uitleg() {
  const { colors, t } = useApp();
  return (
    <Text style={[s.uitleg, { color: colors.sub }]}>
      {t("P2000 zijn openbare hulpdienstberichten. Ze kunnen vertraagd of onvolledig zijn en zeggen niet zeker dat het openbaar vervoer hinder heeft.")}
    </Text>
  );
}

const s = StyleSheet.create({
  kaart: { padding: 14, paddingHorizontal: 16 },
  kopRij: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  label: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, height: 24, borderRadius: 6 },
  labelText: { fontSize: 12, fontWeight: "700" },
  wanneer: { flex: 1, fontSize: 13 },
  tekst: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  plek: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  uitleg: { fontSize: 12, lineHeight: 17, textAlign: "center", paddingHorizontal: 8, paddingTop: 4 }
});
