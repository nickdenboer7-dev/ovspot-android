import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StoringKaart } from "../../components/StoringKaart";
import { P2000Kaart, P2000Uitleg } from "../../components/P2000Kaart";
import { SpoorIncidentKaart, SpoorUitleg } from "../../components/SpoorIncidentKaart";
import { spoorWeergave } from "../../lib/spoor";
import { Chips, FoutBalk, Kop, Laden, Leeg } from "../../components/ui";
import { useApp } from "../../context/AppProvider";
import { GlasDoel, useOnderRuimte } from "../../components/Glas";
import { api } from "../../lib/api";
import { usePolling } from "../../lib/hooks";

type Bereik = "mijn" | "alles" | "spoor" | "p2000";

export default function Storingen() {
  const { colors, favorieten, dichtbijIds, storingenMijn, instellingen } = useApp();
  const onderRuimte = useOnderRuimte();
  const [bereik, setBereik] = useState<Bereik>("mijn");

  // "Mijn haltes" = favorieten. "Alles" = favorieten + haltes onder Dichtbij.
  const ids = useMemo(() => {
    const fav = favorieten.map((f) => f.id);
    if (bereik === "p2000" || bereik === "spoor") return [];
    return bereik === "mijn" ? fav : Array.from(new Set([...fav, ...dichtbijIds])).slice(0, 30);
  }, [bereik, favorieten, dichtbijIds]);

  const key = `${bereik}:${ids.join(",")}`;
  const poll = usePolling(key, () => (ids.length ? api.storingen(ids) : Promise.resolve(null)), instellingen.databesparing ? 180_000 : 60_000);
  const p2000Poll = usePolling(`p2000:${bereik === "p2000" ? "aan" : "uit"}`, () => (bereik === "p2000" ? api.p2000({ uren: 6, max: 40 }) : Promise.resolve(null)), instellingen.databesparing ? 180_000 : 60_000);
  const spoorPoll = usePolling(`spoor:${bereik === "spoor" ? "aan" : "uit"}`, () => (bereik === "spoor" ? api.spoorIncidenten() : Promise.resolve(null)), instellingen.databesparing ? 180_000 : 60_000);
  const spoorStaat = spoorPoll.data ? spoorWeergave(spoorPoll.data) : null;
  const p2000Lijst = p2000Poll.data?.meldingen ?? [];
  const lijst = poll.data?.storingen ?? [];
  const mislukt = poll.data?.niet_geladen ?? 0;
  const gecontroleerd = poll.data?.gecontroleerd ?? Math.max(0, ids.length - mislukt);

  let inhoud: React.ReactNode;
  if (bereik === "spoor") {
    if (spoorPoll.laden && !spoorPoll.data) inhoud = <Laden />;
    else if (!spoorPoll.data && spoorPoll.fout)
      inhoud = <Leeg icoon="cloud-offline-outline" titel="Kan spoormeldingen niet laden" tekst={spoorPoll.fout} knop={{ label: "Opnieuw", onPress: () => void spoorPoll.verversen() }} />;
    else if (spoorStaat?.soort === "verouderd")
      inhoud = <Leeg icoon="alert-circle-outline" titel="Spoormeldingen niet actueel" tekst={spoorStaat.melding} knop={{ label: "Opnieuw", onPress: () => void spoorPoll.verversen() }} />;
    else if (spoorStaat?.soort === "lijst")
      inhoud = (<>{spoorStaat.incidenten.map((i) => <SpoorIncidentKaart key={i.id} i={i} />)}<SpoorUitleg /></>);
    else inhoud = (<><Leeg icoon="checkmark-circle" icoonKleur={colors.live} titel="Geen grote spoorincidenten" tekst="ProRail meldt nu geen grotere verstoringen, branden of aanrijdingen." /><SpoorUitleg /></>);
  } else if (bereik === "p2000") {
    if (p2000Poll.laden && !p2000Poll.data) inhoud = <Laden />;
    else if (!p2000Poll.data && p2000Poll.fout)
      inhoud = <Leeg icoon="cloud-offline-outline" titel="Kan P2000-meldingen niet laden" tekst={p2000Poll.fout} knop={{ label: "Opnieuw", onPress: () => void p2000Poll.verversen() }} />;
    else if (p2000Poll.data && !p2000Poll.data.bron_beschikbaar)
      inhoud = <Leeg icoon="alert-circle-outline" titel="P2000 tijdelijk niet beschikbaar" tekst="De bron van de meldingen is nu niet bereikbaar." knop={{ label: "Opnieuw", onPress: () => void p2000Poll.verversen() }} />;
    else if (!p2000Lijst.length)
      inhoud = <Leeg icoon="checkmark-circle-outline" titel="Geen P2000-meldingen voor het OV" tekst="In de laatste 6 uur zijn er geen hulpdienstmeldingen gevonden die over trein, tram, metro of bus gaan." />;
    else inhoud = (<>{p2000Lijst.map((m) => <P2000Kaart key={m.uid} m={m} />)}<P2000Uitleg /></>);
  } else if (!ids.length) {
    inhoud =
      bereik === "mijn" ? (
        <Leeg icoon="star-outline" titel="Nog geen favorieten" tekst="Storingen bij je favoriete haltes verschijnen hier. Kies 'Alles' voor haltes dichtbij." />
      ) : (
        <Leeg icoon="location-outline" titel="Nog geen haltes" tekst="Open eerst Dichtbij, dan zie je hier de storingen bij haltes om je heen." />
      );
  } else if (poll.laden && !poll.data) {
    inhoud = <Laden />;
  } else if (!poll.data && poll.fout) {
    inhoud = <Leeg icoon="cloud-offline-outline" titel="Kan storingen niet laden" tekst={poll.fout} knop={{ label: "Opnieuw", onPress: () => void poll.verversen() }} />;
  } else if (!lijst.length && poll.fout) {
    inhoud = (
      <Leeg icoon="cloud-offline-outline" titel="Storingsstatus niet bevestigd"
        tekst="De nieuwste controle is mislukt. Eerdere resultaten kunnen verouderd zijn."
        knop={{ label: "Opnieuw controleren", onPress: () => void poll.verversen() }} />
    );
  } else if (!lijst.length && mislukt > 0) {
    inhoud = (
      <Leeg icoon="alert-circle-outline" titel="Storingsoverzicht onvolledig"
        tekst={`Gecontroleerd: ${gecontroleerd} van ${ids.length} haltes. Een deel van de storingsbron is niet bereikbaar.`}
        knop={{ label: "Opnieuw controleren", onPress: () => void poll.verversen() }} />
    );
  } else if (!lijst.length) {
    const namen = favorieten.filter((f) => ids.includes(f.id)).map((f) => f.naam);
    const getoond = namen.slice(0, 4).join(", ");
    const rest = Math.max(0, gecontroleerd - Math.min(4, namen.length));
    inhoud = <Leeg icoon="checkmark-circle" icoonKleur={colors.live} titel="Geen gemelde storingen"
      tekst={`Gecontroleerd: ${getoond ? getoond + (rest > 0 ? ` en ${rest} andere` : "") : `${gecontroleerd} halte${gecontroleerd === 1 ? "" : "s"}`}. Dit betekent niet automatisch dat alle ritten op tijd rijden.`} />;
  } else {
    inhoud = lijst.map((st) => <StoringKaart key={st.id} st={st} />);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Kop groot titel="Storingen" />
      <View style={[s.chips, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Chips<Bereik>
          opties={[
            { key: "mijn", label: storingenMijn ? `Mijn haltes · ${storingenMijn}` : "Mijn haltes" },
            { key: "alles", label: "Alles" },
            { key: "spoor", label: "ProRail" },
            { key: "p2000", label: "P2000" }
          ]}
          waarde={bereik}
          onKies={setBereik}
        />
      </View>
      <GlasDoel style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.lijst, { paddingBottom: onderRuimte + 16 }]} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void (bereik === "p2000" ? p2000Poll.verversen() : bereik === "spoor" ? spoorPoll.verversen() : poll.verversen())} colors={[colors.accent]} />}>
        {bereik !== "p2000" && bereik !== "spoor" && poll.fout && poll.data ? <FoutBalk tekst={poll.fout} /> : null}
        {bereik !== "p2000" && bereik !== "spoor" && mislukt > 0 && lijst.length > 0 ? (
          <FoutBalk tekst={`Storingen onvolledig: ${mislukt} van ${ids.length} haltes niet gecontroleerd`} />
        ) : null}
        {inhoud}
      </ScrollView>
      </GlasDoel>
    </View>
  );
}

const s = StyleSheet.create({
  chips: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  lijst: { padding: 14, gap: 12, paddingBottom: 28 }
});
