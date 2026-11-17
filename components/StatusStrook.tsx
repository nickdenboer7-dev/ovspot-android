import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./LocalizedText";
import { useApp } from "../context/AppProvider";
import { RitStatusLabel } from "./RitStatusLabel";

/** Dezelfde statusstrook op bord en ritpagina, zonder onjuiste GPS-aannames. */
export function StatusStrook({ live, vervallen, afwijkingMin, tekst, chip, tussen, voertuig, snelheid, plat, actie }: {
  live: boolean; vervallen: boolean; afwijkingMin: number;
  tekst?: string; chip?: string; tussen?: string; voertuig?: string; snelheid?: string; plat?: boolean;
  /** Kleine knop rechts onderin de strook, bijv. 'Naar de bus'. */
  actie?: { label: string; icoon: keyof typeof Ionicons.glyphMap; onPress: () => void };
}) {
  const { colors, t } = useApp();
  return (
    <View style={[s.strook, { backgroundColor: colors.surface, borderColor: colors.border },
      plat && [s.plat, { backgroundColor: colors.surface2 }]]}>
      <View style={s.regel}>
        {tekst ? <Text style={[s.titel, { color: colors.text }]}>{t(tekst)}</Text>
          : <RitStatusLabel live={live} vervallen={vervallen} afwijkingMin={afwijkingMin} />}
        {chip ? <View style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.chipTekst, { color: colors.sub }]}>{t(chip)}</Text>
        </View> : null}
        {snelheid ? <Text style={[s.snelheid, { color: colors.text }]}>{snelheid}</Text> : null}
      </View>
      {tussen ? <Text style={[s.tussen, { color: colors.body }]} numberOfLines={2}>{t(tussen)}</Text> : null}
      {voertuig || actie ? (
        <View style={s.onderRij}>
          <Text style={[s.voertuig, { color: colors.sub }]} numberOfLines={1}>{voertuig || ""}</Text>
          {actie ? (
            <Pressable onPress={actie.onPress} accessibilityRole="button" accessibilityLabel={t(actie.label)}
              hitSlop={8} style={[s.actie, { backgroundColor: colors.infoBg, borderColor: colors.accent }]}>
              <Ionicons name={actie.icoon} size={14} color={colors.infoText} />
              <Text style={[s.actieTekst, { color: colors.infoText }]}>{t(actie.label)}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  strook: { borderWidth: 1, borderRadius: 16, marginHorizontal: 14, marginTop: 10,
    paddingVertical: 10, paddingHorizontal: 13, gap: 5, minHeight: 47 },
  regel: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  titel: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  chipTekst: { fontSize: 10, fontWeight: "700" },
  tussen: { fontSize: 12, lineHeight: 17 },
  plat: { borderRadius: 0, marginHorizontal: 0, marginTop: 0, borderLeftWidth: 0, borderRightWidth: 0,
    paddingHorizontal: 16 },
  snelheid: { fontSize: 13, fontWeight: "700", marginLeft: "auto" },
  voertuig: { fontSize: 12, fontWeight: "600", lineHeight: 17, flex: 1, minWidth: 0 },
  onderRij: { flexDirection: "row", alignItems: "center", gap: 8 },
  actie: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 5 },
  actieTekst: { fontSize: 12, fontWeight: "700" }
});
