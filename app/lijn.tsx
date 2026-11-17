import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/LocalizedText";
import { OnderBalk } from "../components/OnderBalk";
import { Leeg, LijnBadge } from "../components/ui";
import { useApp } from "../context/AppProvider";
import { api } from "../lib/api";
import type { LijnHaltes, Modus } from "../lib/types";

/** Haltes van één route en richting, in rijvolgorde. Een tik opent het haltebord met die lijn gekozen. */
export default function LijnHaltesScherm() {
  const { colors, t } = useApp();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{
    route_key?: string; richting_id?: string; lijn?: string; modus?: string; vervoerder?: string;
    kleur?: string; tekstkleur?: string; naam?: string; bestemming?: string;
  }>();
  const routeKey = String(p.route_key || "");
  const richtingId = Number(p.richting_id ?? 0);
  const lijn = String(p.lijn || "");
  const modus = String(p.modus || "bus");
  const bestemming = String(p.bestemming || "");
  const [data, setData] = useState<LijnHaltes | null>(null);
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(true);
  const [poging, setPoging] = useState(0);

  useEffect(() => {
    let weg = false;
    setLaden(true); setFout("");
    api.lijnHaltes(routeKey, richtingId)
      .then(r => { if (!weg) setData(r); })
      .catch(e => { if (!weg) setFout(e?.message || "Haltes laden lukt nu niet"); })
      .finally(() => { if (!weg) setLaden(false); });
    return () => { weg = true; };
  }, [routeKey, richtingId, poging]);

  const openHalte = (h: LijnHaltes["haltes"][number]) => {
    router.push({
      pathname: "/halte/[id]",
      params: { id: h.halte_id, van: "index", naam: h.naam, plaats: h.plaats, modus,
        kieslijn: lijn, kiesrichting: data?.bestemming || bestemming }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.kop, { backgroundColor: colors.header, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("Terug")} style={s.terug} hitSlop={8}>
          <Ionicons name="arrow-back" size={26} color={colors.headerText} />
        </Pressable>
        <LijnBadge lijn={lijn} modus={modus as Modus} vervoerder={String(p.vervoerder || "")}
          kleur={p.kleur || undefined} tekstkleur={p.tekstkleur || undefined} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.titel, { color: colors.headerText }]} numberOfLines={2}>{bestemming}</Text>
          {p.naam ? <Text style={[s.sub, { color: colors.headerText }]} numberOfLines={1}>{String(p.naam)}</Text> : null}
        </View>
      </View>
      <FlatList
        data={data?.haltes ?? []}
        keyExtractor={(h) => `${h.volgorde}:${h.halte_id}`}
        contentContainerStyle={s.lijst}
        ListHeaderComponent={data?.haltes.length ? (
          <Text style={[s.sectie, { color: colors.sub }]}>KIES JE HALTE</Text>
        ) : null}
        ListEmptyComponent={laden ? (
          <View style={s.laden}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.sub }}>Haltes laden…</Text></View>
        ) : fout ? (
          <Leeg icoon="cloud-offline-outline" titel="Haltes laden lukt nu niet" tekst={fout}
            knop={{ label: "Opnieuw", onPress: () => setPoging(x => x + 1) }} />
        ) : (
          <Leeg icoon="help-circle-outline" titel="Geen haltes gevonden" tekst="Voor deze richting zijn geen haltes bekend." />
        )}
        renderItem={({ item: h, index }) => (
          <Pressable onPress={() => openHalte(h)} accessibilityRole="button"
            accessibilityLabel={`${h.naam}, ${t("halte")} ${index + 1}`}
            android_ripple={{ color: colors.divider }}
            style={[s.rij, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.nr, { color: colors.sub }]}>{index + 1}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.naam, { color: colors.text }]} numberOfLines={2}>{h.naam}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.sub} />
          </Pressable>
        )}
      />
      <OnderBalk actief="index" />
    </View>
  );
}

const s = StyleSheet.create({
  kop: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 14, borderBottomWidth: 1 },
  terug: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  titel: { fontSize: 18, fontWeight: "800", lineHeight: 22 },
  sub: { fontSize: 12, marginTop: 1 },
  lijst: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24, flexGrow: 1 },
  sectie: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, paddingHorizontal: 5, paddingBottom: 10 },
  laden: { alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 25 },
  rij: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderRadius: 14, marginBottom: 8 },
  nr: { width: 24, fontSize: 13, fontWeight: "700", textAlign: "right" },
  naam: { fontSize: 16, fontWeight: "700", lineHeight: 20 }
});
