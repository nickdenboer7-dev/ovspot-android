import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./LocalizedText";
import { useApp } from "../context/AppProvider";

const MIN_TUSSENTIJD_MS = 5 * 60 * 1000;

/**
 * Controleert bij het openen van de app en bij terugkeren naar de app of er een nieuwe
 * versie (OTA-update) is, haalt die op en vraagt om te herstarten. Zo hoeven testers de app
 * niet twee keer te openen en te sluiten om de nieuwste versie te krijgen.
 */
export function UpdateMelding() {
  const { colors, t } = useApp();
  const insets = useSafeAreaInsets();
  const [klaar, setKlaar] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [verborgen, setVerborgen] = useState(false);
  const laatste = useRef(0);
  const loopt = useRef(false);

  const controleer = useCallback(async () => {
    if (!Updates.isEnabled || loopt.current) return;
    if (Date.now() - laatste.current < MIN_TUSSENTIJD_MS) return;
    loopt.current = true;
    laatste.current = Date.now();
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return;
      const opgehaald = await Updates.fetchUpdateAsync();
      if (opgehaald.isNew) {
        setVerborgen(false);
        setKlaar(true);
      }
    } catch {
      // Geen internet of server weg: stil negeren, volgende keer opnieuw proberen.
    } finally {
      loopt.current = false;
    }
  }, []);

  useEffect(() => {
    void controleer();
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") void controleer();
    });
    return () => sub.remove();
  }, [controleer]);

  if (!klaar || verborgen) return null;

  return (
    <View pointerEvents="box-none" style={[s.omhulsel, { top: insets.top + 8 }]}>
      <View style={[s.balk, { backgroundColor: colors.accent }]} accessibilityRole="alert">
        <Text style={[s.tekst, { color: colors.onAccent }]}>{t("Nieuwe versie van OVspot is klaar")}</Text>
        <View style={s.knoppen}>
          <Pressable onPress={() => setVerborgen(true)} accessibilityRole="button" hitSlop={8} style={s.later}>
            <Text style={[s.laterTekst, { color: colors.onAccent }]}>{t("Later")}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (bezig) return;
              setBezig(true);
              Updates.reloadAsync().catch(() => setBezig(false));
            }}
            accessibilityRole="button"
            style={[s.nu, { backgroundColor: colors.onAccent }]}
          >
            <Text style={[s.nuTekst, { color: colors.accent }]}>{bezig ? t("Bezig…") : t("Nu herstarten")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  omhulsel: { position: "absolute", left: 12, right: 12, zIndex: 1000, elevation: 12 },
  balk: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  tekst: { fontSize: 15, fontWeight: "700" },
  knoppen: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 14 },
  later: { paddingVertical: 8, paddingHorizontal: 6 },
  laterTekst: { fontSize: 15, fontWeight: "600" },
  nu: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  nuTekst: { fontSize: 15, fontWeight: "700" }
});
