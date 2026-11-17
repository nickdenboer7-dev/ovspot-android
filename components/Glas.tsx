import { BlurTargetView, BlurView } from "expo-blur";
import { useFocusEffect } from "expo-router";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../context/AppProvider";

type Doel = React.RefObject<View | null>;
type Ctx = { doel: Doel | null; zetDoel: (d: Doel) => void };
const GlasCtx = createContext<Ctx>({ doel: null, zetDoel: () => {} });

/** Hoogte van de zwevende onderbalk, zodat lijsten er onderdoor kunnen scrollen en toch volledig bereikbaar blijven. */
export const ONDERBALK_HOOGTE = 62;

export function useOnderRuimte(): number {
  const insets = useSafeAreaInsets();
  return ONDERBALK_HOOGTE + Math.max(insets.bottom, 6) + 12 + 6;
}

/** Zet om de tabs heen: houdt bij welk scherm nu de inhoud levert die vervaagd wordt. */
export function GlasProvider({ children }: { children: React.ReactNode }) {
  const [doel, setDoel] = useState<Doel | null>(null);
  const zetDoel = useCallback((d: Doel) => setDoel(prev => (prev === d ? prev : d)), []);
  return <GlasCtx.Provider value={{ doel, zetDoel }}>{children}</GlasCtx.Provider>;
}

/** Om de scrollbare inhoud van een tabscherm: het actieve scherm wordt het blur-doel. */
export function GlasDoel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const { zetDoel } = useContext(GlasCtx);
  useFocusEffect(useCallback(() => { zetDoel(ref); }, [zetDoel]));
  return <BlurTargetView ref={ref} style={style}>{children}</BlurTargetView>;
}

/** Echte blur achter een half doorzichtig vlak. Bij hoog contrast of zonder doel blijft het vlak effen. */
export function GlasVlak({ style, children, intensiteit = 55 }: {
  style?: StyleProp<ViewStyle>; children?: React.ReactNode; intensiteit?: number;
}) {
  const { colors, instellingen, scheme } = useApp();
  const { doel } = useContext(GlasCtx);
  const effen = instellingen.hoogContrast || !doel;
  const wasKleur = scheme === "dark" ? "rgba(21,31,47,0.62)" : "rgba(255,255,255,0.62)";
  return (
    <View style={[{ overflow: "hidden", backgroundColor: effen ? colors.glassSterk : "transparent" }, style]}>
      {effen ? null : (
        <>
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={intensiteit}
            tint={scheme === "dark" ? "dark" : "light"}
            blurTarget={doel}
            blurMethod={Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : undefined}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wasKleur }]} />
        </>
      )}
      {children}
    </View>
  );
}
