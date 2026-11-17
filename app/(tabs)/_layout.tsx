import { Tabs } from "expo-router";
import React from "react";
import { isTab, OnderBalk } from "../../components/OnderBalk";
import { GlasProvider } from "../../components/Glas";
import { useApp } from "../../context/AppProvider";

export default function TabsLayout() {
  const { colors, instellingen, t } = useApp();
  return (
    <GlasProvider>
    <Tabs
      initialRouteName={instellingen.startscherm}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background }, tabBarHideOnKeyboard: true }}
      tabBar={(props) => {
        const naam = props.state.routes[props.state.index]?.name;
        return <OnderBalk zwevend actief={isTab(naam) ? naam : "index"} onKies={(k) => props.navigation.navigate(k)} />;
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("Dichtbij") }} />
      <Tabs.Screen name="favorieten" options={{ title: t("Favorieten") }} />
      <Tabs.Screen name="storingen" options={{ title: t("Storingen") }} />
      <Tabs.Screen name="instellingen" options={{ title: t("Instellingen") }} />
    </Tabs>
    </GlasProvider>
  );
}
