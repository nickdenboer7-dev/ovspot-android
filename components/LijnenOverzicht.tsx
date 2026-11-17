import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./LocalizedText";
import { LijnBadge } from "./ui";
import { useApp } from "../context/AppProvider";
import { bestemmingVoorWeergave } from "../lib/format";
import type { Vertrek } from "../lib/types";

export type RichtingKeuze = { lijn: string; richting: string; modus: string; vervoerder: string };

const sleutel = (x: unknown) => String(x ?? "").trim().toLowerCase();

/** Per lijn en richting de eerstvolgende tijden, zoals het Lijnen-overzicht van OVinfo. */
export function groepeerPerRichting(vertrekken: Vertrek[], nu: number, aantal = 3) {
  const groepen = new Map<string, { keuze: RichtingKeuze; eerste: Vertrek; tijden: string[]; totaal: number; ms: number }>();
  for (const v of vertrekken) {
    if (v.vervallen || (typeof v.vertrek_ms === "number" && v.vertrek_ms < nu - 60_000)) continue;
    const richting = bestemmingVoorWeergave(v.lijn, v.bestemming);
    const k = [v.lijn, v.modus, v.vervoerder, richting].map(sleutel).join("|");
    const tijd = String(v.verwacht || v.gepland || "").trim();
    const g = groepen.get(k);
    if (g) { g.totaal++; if (g.tijden.length < aantal && tijd) g.tijden.push(tijd); }
    else groepen.set(k, {
      keuze: { lijn: v.lijn, richting, modus: v.modus, vervoerder: v.vervoerder },
      eerste: v, tijden: tijd ? [tijd] : [], totaal: 1,
      ms: typeof v.vertrek_ms === "number" ? v.vertrek_ms : Number.MAX_SAFE_INTEGER
    });
  }
  const num = (l: string) => { const n = parseInt(l, 10); return Number.isFinite(n) ? n : 1e9; };
  return [...groepen.values()].sort((a, b) =>
    num(a.keuze.lijn) - num(b.keuze.lijn) || a.keuze.lijn.localeCompare(b.keuze.lijn) || a.ms - b.ms);
}

export function LijnenOverzicht({ vertrekken, nu, onKies }: {
  vertrekken: Vertrek[]; nu: number; onKies: (k: RichtingKeuze) => void;
}) {
  const { colors } = useApp();
  const groepen = useMemo(() => groepeerPerRichting(vertrekken, nu), [vertrekken, nu]);
  if (!groepen.length) return <Text style={[s.leeg, { color: colors.sub }]}>Geen lijnen met vertrekken gevonden.</Text>;
  return (
    <View style={[s.lijst, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {groepen.map(g => (
        <Pressable key={`${g.keuze.modus}|${g.keuze.lijn}|${g.keuze.vervoerder}|${g.keuze.richting}`}
          accessibilityRole="button"
          accessibilityLabel={`Lijn ${g.keuze.lijn} naar ${g.keuze.richting}`}
          onPress={() => onKies(g.keuze)}
          style={[s.blok, { borderTopColor: colors.divider }]}>
          <View style={s.kop}>
            <LijnBadge lijn={g.eerste.lijn} modus={g.eerste.modus} vervoerder={g.eerste.vervoerder}
              kleur={g.eerste.kleur || g.eerste.lijn_kleur} tekstkleur={g.eerste.tekstkleur || g.eerste.lijn_tekstkleur} />
            <Text style={[s.dest, { color: colors.text }]}>{g.keuze.richting}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
          <View style={s.tijden}>
            {g.tijden.map((t, i) => (
              <Text key={`${t}-${i}`} style={[s.tijd, { color: colors.text }]}>{t}</Text>
            ))}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  lijst: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  blok: { paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
  kop: { flexDirection: "row", alignItems: "center", gap: 10 },
  dest: { flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  tijden: { flexDirection: "row", gap: 16, paddingLeft: 2 },
  tijd: { fontSize: 15, fontWeight: "600" },
  leeg: { fontSize: 14, padding: 14 }
});
