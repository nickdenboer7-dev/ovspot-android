import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./LocalizedText";
import { useApp } from "../context/AppProvider";
import type { SpoorIncident } from "../lib/types";
import { spoorLeeftijdMin, spoorOrigineel, spoorPlek, spoorTijd } from "../lib/spoor";
import { leeftijdTekst } from "./P2000Kaart";
import { Kaart } from "./ui";

export function SpoorIncidentKaart({ i }: { i: SpoorIncident }) {
  const { colors, t } = useApp();
  const plek = spoorPlek(i);
  const origineel = spoorOrigineel(i);
  const landelijk = i.tis_code === "1.4";
  return (
    <Kaart style={s.kaart}>
      <View style={s.kopRij}>
        <View style={[s.label, { backgroundColor: landelijk ? colors.warnBg : colors.infoBg }]}>
          <Ionicons name="train-outline" size={14} color={landelijk ? colors.warnText : colors.infoText} />
          <Text style={[s.labelText, { color: landelijk ? colors.warnText : colors.infoText }]}>{t("ProRail")}</Text>
        </View>
        <Text style={[s.wanneer, { color: colors.sub }]} numberOfLines={1}>
          {`${spoorTijd(i.meldingstijd)} · ${t(leeftijdTekst(spoorLeeftijdMin(i.meldingstijd)))}`}
        </Text>
      </View>
      <Text style={[s.titel, { color: colors.text }]}>{t(i.label)}</Text>
      {i.gevolgen ? <Text style={[s.gevolgen, { color: colors.body }]}>{t(i.gevolgen)}</Text> : null}
      {plek ? <Text style={[s.plek, { color: colors.sub }]} numberOfLines={2}>{plek}</Text> : null}
      {origineel ? (
        <Text style={[s.origineel, { color: colors.sub }]} numberOfLines={3}>{`${t("Melding")}: ${origineel}`}</Text>
      ) : null}
    </Kaart>
  );
}

export function SpoorUitleg() {
  const { colors, t } = useApp();
  return (
    <Text style={[s.uitleg, { color: colors.sub }]}>
      {t("Meldingen van ProRail over grotere spoorincidenten. Ze bevestigen niet altijd of er treinen uitvallen. Kleine verstoringen worden hier niet getoond.")}
    </Text>
  );
}

const s = StyleSheet.create({
  kaart: { padding: 14, paddingHorizontal: 16 },
  kopRij: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  label: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, height: 24, borderRadius: 6 },
  labelText: { fontSize: 12, fontWeight: "700" },
  wanneer: { flex: 1, fontSize: 13 },
  titel: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  gevolgen: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  plek: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  origineel: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  uitleg: { fontSize: 12, lineHeight: 17, textAlign: "center", paddingHorizontal: 8, paddingTop: 4 }
});
