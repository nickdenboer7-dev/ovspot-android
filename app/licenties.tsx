import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/LocalizedText";
import { Kop } from "../components/ui";
import { useApp } from "../context/AppProvider";

// Alle onderstaande pakketten zijn MIT-gelicenseerd; de pagina op npm toont de volledige licentietekst.
const PAKKETTEN = [
  "expo", "expo-router", "expo-updates", "expo-location", "expo-notifications", "expo-blur",
  "expo-constants", "expo-crypto", "expo-font", "expo-keep-awake", "expo-linking",
  "expo-secure-store", "expo-splash-screen", "expo-status-bar", "expo-system-ui",
  "@expo/vector-icons", "react", "react-native", "react-native-maps",
  "react-native-safe-area-context", "react-native-screens",
  "@react-native-async-storage/async-storage", "@noble/ciphers", "@noble/curves", "@noble/hashes"
];

export default function Licenties() {
  const { colors } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Kop terug titel="Open-sourcelicenties" />
      <ScrollView contentContainerStyle={s.inhoud}>
        <Text style={[s.intro, { color: colors.body }]}>
          OVspot is gebouwd met open-sourcesoftware onder de MIT-licentie. Tik op een pakket voor de
          volledige licentietekst. Vervoersdata komt van open bronnen zoals GTFS en NDOV.
        </Text>
        <View style={[s.kaart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PAKKETTEN.map((naam, i) => (
            <Pressable key={naam} accessibilityRole="link" accessibilityLabel={`${naam}, MIT`}
              onPress={() => void Linking.openURL("https://www.npmjs.com/package/" + naam)}
              style={[s.rij, i < PAKKETTEN.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <Text style={[s.naam, { color: colors.text }]}>{naam}</Text>
              <Text style={[s.licentie, { color: colors.sub }]}>MIT</Text>
              <Ionicons name="open-outline" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  inhoud: { padding: 16, gap: 14, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 21 },
  kaart: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  rij: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  naam: { flex: 1, fontSize: 14, fontWeight: "600" },
  licentie: { fontSize: 12, fontWeight: "700" }
});
