import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "./LocalizedText";
import { LijnBadge } from "./ui";
import { useApp } from "../context/AppProvider";
import { maakLijnFavoriet } from "../lib/favorieten";
import { bestemmingVoorWeergave } from "../lib/format";
import { dagenTekst, maakVasteRit, VENSTER_NA_MIN, VENSTER_VOOR_MIN, vasteRitTijd, WERKDAGEN } from "../lib/vasteRitten";
import type { FavHalte, Vertrek } from "../lib/types";

const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export function VasteRitBlad({ v, halte, onSluit }: { v: Vertrek | null; halte: FavHalte; onSluit: () => void }) {
  const { colors, t, voegVasteRitToe } = useApp();
  const [dagen, setDagen] = useState<number[]>(WERKDAGEN);
  const [naam, setNaam] = useState("");
  const [fout, setFout] = useState("");
  useEffect(() => { if (v) { setDagen(WERKDAGEN); setNaam(""); setFout(""); } }, [v]);
  if (!v) return <Modal visible={false} transparent />;
  const tijd = vasteRitTijd(v);
  const bestemming = bestemmingVoorWeergave(v.lijn, v.bestemming);
  const wissel = (d: number) => { setFout(""); setDagen((o) => (o.includes(d) ? o.filter((x) => x !== d) : [...o, d].sort((a, b) => a - b))); };
  const opslaan = () => {
    const lijn = maakLijnFavoriet({
      halte, lijn: v.lijn, richting: v.bestemming, modus: v.modus, vervoerder: v.vervoerder,
      ...(v.kleur || v.lijn_kleur ? { kleur: v.kleur || v.lijn_kleur } : {}),
      ...(v.tekstkleur || v.lijn_tekstkleur ? { tekstkleur: v.tekstkleur || v.lijn_tekstkleur } : {})
    });
    const rit = lijn && tijd ? maakVasteRit({ lijn, vertrek: tijd, dagen, naam, push: false }) : null;
    if (!rit) { setFout(dagen.length ? "Deze rit kan niet worden opgeslagen." : "Kies minstens één dag."); return; }
    const uitkomst = voegVasteRitToe(rit);
    if (uitkomst === "dubbel") { setFout("Deze rit staat er al."); return; }
    if (uitkomst === "maximum") { setFout("Je hebt het maximum van 10 vaste ritten bereikt. Verwijder eerst een rit."); return; }
    onSluit();
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onSluit}>
      <View style={s.achter}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onSluit} accessibilityRole="button" accessibilityLabel={t("Keuzemenu sluiten")} />
        <View style={[s.blad, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.titel, { color: colors.text }]}>Maak dit mijn vaste rit</Text>
          <View style={[s.rit, { backgroundColor: colors.surface2 }]}>
            <LijnBadge lijn={v.lijn} modus={v.modus} vervoerder={v.vervoerder} kleur={v.kleur || v.lijn_kleur} tekstkleur={v.tekstkleur || v.lijn_tekstkleur} />
            <View style={{ flex: 1 }}>
              <Text style={[s.ritTekst, { color: colors.text }]} numberOfLines={1}>{`${bestemming} · ${tijd ?? "?"}`}</Text>
              <Text style={[s.sub, { color: colors.sub }]} numberOfLines={1}>{`Vanaf ${halte.naam}`}</Text>
            </View>
          </View>
          <Text style={[s.label, { color: colors.sub }]}>Welke dagen</Text>
          <View style={s.dagen}>
            {DAGEN.map((d, i) => {
              const aan = dagen.includes(i + 1);
              return (
                <Pressable key={d} onPress={() => wissel(i + 1)} accessibilityRole="button" accessibilityState={{ selected: aan }}
                  style={[s.dag, aan ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.border }]}>
                  <Text style={[s.dagTekst, { color: aan ? colors.onAccent : colors.sub }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[s.label, { color: colors.sub }]}>Naam</Text>
          <TextInput value={naam} onChangeText={setNaam} placeholder={`${v.lijn} ${tijd ?? ""}`.trim()} placeholderTextColor={colors.muted}
            style={[s.invoer, { color: colors.text, borderColor: colors.border }]} maxLength={30} />
          <Text style={[s.sub, { color: colors.sub }]}>
            {`${dagenTekst(dagen)}. Storingen verschijnen bij Favorieten vanaf ${VENSTER_VOOR_MIN} minuten voor tot ${VENSTER_NA_MIN} minuten na vertrek.`}
          </Text>
          {fout ? <Text accessibilityLiveRegion="polite" style={[s.fout, { color: colors.red }]}>{fout}</Text> : null}
          <Pressable onPress={opslaan} accessibilityRole="button" style={[s.knop, { backgroundColor: colors.accent }]}>
            <Text style={[s.knopTekst, { color: colors.onAccent }]}>Rit opslaan</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  achter: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  blad: { padding: 18, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  titel: { fontSize: 18, fontWeight: "700" },
  rit: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  ritTekst: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, marginTop: 4 },
  dagen: { flexDirection: "row", gap: 5 },
  dag: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dagTekst: { fontSize: 14, fontWeight: "600" },
  invoer: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  fout: { fontSize: 13 },
  knop: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  knopTekst: { fontSize: 16, fontWeight: "700" }
});
