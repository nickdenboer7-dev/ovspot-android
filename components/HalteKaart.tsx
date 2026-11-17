import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./LocalizedText";
import { useApp } from "../context/AppProvider";
import { bestemmingVoorWeergave } from "../lib/format";
import type { Modus, Vertrek } from "../lib/types";
import type { VertrekBijPaal } from "../lib/dichtbijClusters";
import type { TabKey } from "./OnderBalk";
import { Kaart } from "./ui";
import { VertrekRegel } from "./VertrekRegel";

/** Kaartje met halte + eerstvolgende vertrekken (Dichtbij en Favorieten). Tik = haltebord. */
export function HalteKaart({
  id,
  naam,
  plaats,
  sub,
  modi,
  vertrekken: alleVertrekken,
  gecombineerdeVertrekken: alleGecombineerd,
  aantalHaltepalen = 1,
  storingen,
  fout,
  nu,
  van,
  ster,
  laden,
  toonVertrekken = true,
  verbergPlaats
}: {
  id: string;
  naam: string;
  plaats?: string;
  sub?: string;
  modi?: Modus[];
  vertrekken: Vertrek[];
  gecombineerdeVertrekken?: VertrekBijPaal[];
  aantalHaltepalen?: number;
  storingen?: number;
  fout?: string | null;
  nu: number;
  van: TabKey;
  ster?: boolean;
  laden?: boolean;
  toonVertrekken?: boolean;
  /** Plaats die al bovenaan het scherm staat; 'Leeuwarden, Julianalaan' wordt dan 'Julianalaan'. */
  verbergPlaats?: string;
}) {
  const { colors, t } = useApp();
  // Dichtbij komt uit een server-cache van enkele minuten; een vertrokken rit na een minuut verbergen,
  // zodat dit overeenkomt met het haltebord.
  const nogRelevant = (v: Vertrek) => typeof v.vertrek_ms !== "number" || v.vertrek_ms >= nu - 60_000;
  const vertrekken = alleVertrekken.filter(nogRelevant);
  const gecombineerdeVertrekken = alleGecombineerd?.filter(x => nogRelevant(x.vertrek));
  const trein = (modi || []).includes("train");
  const openHalte = (halteId: string) => router.push({
    pathname: "/halte/[id]", params: { id: halteId, van, naam, plaats: plaats || "" }
  });
  const gecombineerd = aantalHaltepalen > 1 && !!gecombineerdeVertrekken;
  const toonPlaats = plaats && (ster
    ? naam.trim().toLocaleLowerCase("nl") !== plaats.trim().toLocaleLowerCase("nl")
    : !naam.toLowerCase().includes(plaats.toLowerCase()));
  const open = () => openHalte(id);
  const toonNaam = verbergPlaats && naam.startsWith(verbergPlaats + ", ") && naam.length > verbergPlaats.length + 2
    ? naam.slice(verbergPlaats.length + 2) : naam;
  return (
    <Kaart>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={t(`Vertrektijden ${naam}${sub ? `, ${sub}` : ""}`)} android_ripple={{ color: colors.divider }} style={[s.binnen, gecombineerd && toonVertrekken ? s.gecombineerdeKop : null]}>
        <View style={s.kop}>
          {ster ? (
            <Ionicons name="star" size={24} color={colors.star} />
          ) : (
            <View style={[s.icoon, { backgroundColor: colors.surface2 }]}>
              <Ionicons name={trein ? "train-outline" : "bus-outline"} size={22} color={colors.accent} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.naamRij}>
              <Text style={[s.naam, { color: colors.text }]} numberOfLines={2}>
                {toonNaam}
              </Text>
              {storingen ? <Ionicons name="warning-outline" size={16} color={colors.delay} accessibilityLabel={t("Er is een storing")} /> : null}
            </View>
            {sub ? (
              <View style={[s.afstandChip, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="walk-outline" size={12} color={colors.sub} />
                <Text style={[s.afstandText, { color: colors.sub }]} numberOfLines={1}>{sub} lopen</Text>
              </View>
            ) : null}
            {gecombineerd ? (
              <Text style={[s.sub, { color: colors.sub }]}>{aantalHaltepalen} haltepalen · beide richtingen</Text>
            ) : !sub && toonPlaats ? (
              <Text style={[s.sub, { color: colors.sub }]} numberOfLines={1}>{plaats}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.sub} />
        </View>
        {toonVertrekken && !gecombineerd ? vertrekken.slice(0, 2).map((v, i) => (
          <VertrekRegel key={`${v.lijn}-${v.vertrek_ms}-${i}`} v={v} nu={nu} compact eerste={false} />
        )) : null}
        {toonVertrekken && !gecombineerd && !vertrekken.length ? (
          <Text style={[s.geen, { color: colors.sub, borderTopColor: colors.divider }]}>
            {laden ? "Laden…" : fout ? fout : "Geen vertrekken in de komende tijd"}
          </Text>
        ) : null}
      </Pressable>
      {toonVertrekken && gecombineerd ? (
        <View style={s.gecombineerdeLijst}>
          {gecombineerdeVertrekken?.map(({ halteId, vertrek: v }, i) => (
            <Pressable key={`${halteId}-${v.lijn}-${v.vertrek_ms}-${i}`}
              onPress={() => openHalte(halteId)}
              accessibilityRole="button"
              accessibilityLabel={t(`Haltebord ${naam}, richting ${bestemmingVoorWeergave(v.lijn, v.bestemming)}, lijn ${v.lijn}`)}
              android_ripple={{ color: colors.divider }}
              style={s.richtingRegel}>
              <VertrekRegel v={v} nu={nu} compact eerste={false} />
            </Pressable>
          ))}
          {!vertrekken.length ? (
            <Text style={[s.geen, { color: colors.sub, borderTopColor: colors.divider }]}>
              {laden ? "Laden…" : fout ? fout : "Geen vertrekken in de komende tijd"}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Kaart>
  );
}

const s = StyleSheet.create({
  binnen: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 7 },
  gecombineerdeKop: { paddingBottom: 0 },
  gecombineerdeLijst: { paddingHorizontal: 15, paddingBottom: 7 },
  richtingRegel: { minHeight: 46 },
  kop: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10 },
  icoon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  naamRij: { flexDirection: "row", alignItems: "flex-start", gap: 6, flexWrap: "wrap" },
  afstandChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderRadius: 8, gap: 3, paddingHorizontal: 6, paddingVertical: 3, maxWidth: 116, marginTop: 3 },
  afstandText: { fontSize: 11, fontWeight: "600" },
  naam: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2, flex: 1, minWidth: 0, flexWrap: "wrap" },
  sub: { fontSize: 13, marginTop: 2 },
  geen: { fontSize: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 }
});
