import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Modal, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../../components/LocalizedText";
import { isTab, OnderBalk } from "../../components/OnderBalk";
import { StoringKaart } from "../../components/StoringKaart";
import { P2000Kaart } from "../../components/P2000Kaart";
import { Chips, FoutBalk, Kaart, Laden, Leeg } from "../../components/ui";
import { bestemmingVoorWeergave, toonAlsLive } from "../../lib/format";
import { VertrekRegel } from "../../components/VertrekRegel";
import { HalteKop } from "../../components/HalteKop";
import { compacteHalteNaam } from "../../lib/ritverloopV2";
import { LijnenOverzicht, type RichtingKeuze } from "../../components/LijnenOverzicht";
import { LiveBalk } from "../../components/LiveBalk";
import { VasteRitBlad } from "../../components/VasteRitBlad";
import { vasteRitTijd } from "../../lib/vasteRitten";
import { useApp } from "../../context/AppProvider";
import { api } from "../../lib/api";
import { zetWekker } from "../../lib/push";
import { lijnBadgeHeeftRand, lijnKleur } from "../../constants/wayfinding";
import { geldigeLijnen } from "../../lib/wayfindingV2";
import { storingPastBijModus } from "../../lib/storingPerModus";
import { vertrekBijLijnFavoriet } from "../../lib/favorieten";
import { combineerStatischeLijnen, filterHalteVertrekken, zoekStatischeLijnen, zichtbareStatischeLijnen } from "../../lib/halteLijnFilter";
import { voegStationVertrektijdenToe } from "../../lib/stationGroups";
import { useNu, usePolling } from "../../lib/hooks";
import type { Vertrek } from "../../lib/types";

type ModusChip = { key: string; label: string; icoon?: keyof typeof Ionicons.glyphMap };

function modaliteitChip(modus: string): ModusChip {
  switch (modus) {
    case "alles": return { key: modus, label: "Alles", icoon: "layers-outline" };
    case "train": return { key: modus, label: "Trein", icoon: "train-outline" };
    case "bus": return { key: modus, label: "Bus", icoon: "bus-outline" };
    case "tram": return { key: modus, label: "Tram", icoon: "subway-outline" };
    case "metro": return { key: modus, label: "Metro", icoon: "subway-outline" };
    case "ferry": return { key: modus, label: "Veerboot", icoon: "boat-outline" };
    default: return { key: modus, label: modus.charAt(0).toUpperCase() + modus.slice(1), icoon: "ellipse-outline" };
  }
}


export default function Haltebord() {
  const p = useLocalSearchParams<{
    id: string; van?: string; naam?: string; plaats?: string; groep?: string; lijnen?: string; modus?: string;
    lijn?: string; richting?: string; vervoerder?: string; kieslijn?: string; kiesrichting?: string;
  }>();
  const id = String(p.id || "");
  const van = isTab(p.van) ? p.van : "index";
  const { colors, instellingen, isFavoriet, wisselFavoriet, zetFeedbackContext, favorietenLijnen, t, taal } = useApp();
  // De opgeslagen instelling blijft een voorkeur; op haltes zonder die modus tonen we alles.
  const gevraagdeModus = ["train", "metro", "tram", "bus", "ferry"].includes(String(p.modus))
    ? String(p.modus) : null;
  const favorietLijn = typeof p.lijn === "string" ? p.lijn.trim() : "";
  const favorietRichting = typeof p.richting === "string" ? p.richting.trim() : "";
  const favorietVervoerder = typeof p.vervoerder === "string" ? p.vervoerder.trim() : "";
  const lijnFavoriet = useMemo(() => favorietLijn && favorietRichting && gevraagdeModus ? {
    lijn: favorietLijn, richting: favorietRichting, modus: gevraagdeModus, vervoerder: favorietVervoerder
  } : null, [favorietLijn, favorietRichting, gevraagdeModus, favorietVervoerder]);
  const [gekozenModus, setGekozenModus] = useState<string>(
    gevraagdeModus || (instellingen.filter === "trein" ? "train" : instellingen.filter)
  );
  // Vanuit Zoeken op lijnnummer: open het bord met die lijn al gekozen (richting volgt zodra de dag geladen is).
  const kiesLijnParam = typeof p.kieslijn === "string" ? p.kieslijn.trim() : "";
  const kiesRichtingParam = typeof p.kiesrichting === "string" ? p.kiesrichting.trim() : "";
  const [selectedLine, setSelectedLine] = useState<string | null>(lijnFavoriet?.lijn ?? null);
  const [richtingActief, setRichtingActief] = useState(!!lijnFavoriet);
  const [lijnZoektekst, setLijnZoektekst] = useState("");
  // Lijnen-overzicht (per lijn en richting), een tik opent de hele dag van die richting.
  const [weergave, setWeergave] = useState<"bord" | "lijnen">("bord");
  const [lokaleRichting, setLokaleRichting] = useState<RichtingKeuze | null>(null);
  const [startUur, setStartUur] = useState<number | null>(null);
  const [tijdkiezerOpen, setTijdkiezerOpen] = useState(false);
  const [zoekveldOpen, setZoekveldOpen] = useState(false);
  const [handmatigeModus, setHandmatigeModus] = useState(false);
  const richtingGekozenVoor = React.useRef("");
  const [richtingKlaar, setRichtingKlaar] = useState(false);
  React.useEffect(() => {
    richtingGekozenVoor.current = "";
    setRichtingKlaar(false);
    setSelectedLine(lijnFavoriet?.lijn ?? null);
    if (kiesLijnParam && !lijnFavoriet) setSelectedLine(kiesLijnParam);
    setRichtingActief(!!lijnFavoriet);
    setHandmatigeModus(false);
    setLijnZoektekst("");
    setZoekveldOpen(false);
    setWeergave("bord");
    setLokaleRichting(null);
    setStartUur(null);
    setTijdkiezerOpen(false);
  }, [id, lijnFavoriet, kiesLijnParam]);
  const [storingenOpen, setStoringenOpen] = useState(false);
  const [p2000Open, setP2000Open] = useState(false);
  // OV-relevante P2000-meldingen bij deze halte (laatste 2 uur); mislukken mag het bord nooit blokkeren.
  const p2000Poll = usePolling(`p2000:halte:${id}`, () => api.p2000({ halteId: id, uren: 2, max: 5 }).catch(() => null),
    instellingen.databesparing ? 180_000 : 90_000);
  const p2000Meldingen = p2000Poll.data?.meldingen ?? [];
  const [ververst, setVervers] = useState(false);
  const nu = useNu(10_000);

  // Houd de bestaande /halte-data voor meldingen, metro/ferry en compatibiliteit.
  // Bij een station komen de vertrekregels zelf direct van /app/v2/vertrektijden.
  const poll = usePolling(`halte:${id}`, () => api.halte(id, "alles", 60),
    instellingen.databesparing ? 45_000 : 15_000, { bewaar: true });
  const hoofd = poll.data;
  // Ook vanaf een afzonderlijke haltepaal met naam "Station"/"Busstation"
  // dezelfde fysieke 350m-cluster openen, niet uitsluitend vanaf het treinparent.
  const isStation = !!hoofd && (hoofd.modi.includes("train")
    || /\b(?:station|busstation)\b/i.test(hoofd.naam));
  const stationPoll = usePolling(
    `station-350m:${id}:${isStation ? "station" : "geen-station"}`,
    () => isStation ? api.stationVertrektijden(id, 60) : Promise.resolve(null),
    instellingen.databesparing ? 45_000 : 15_000
  );
  const h = useMemo(() => {
    const samen = hoofd ? voegStationVertrektijdenToe(hoofd, stationPoll.data) : null;
    if (!samen || !poll.uitCache) return samen;
    // Opgeslagen bord van de vorige keer: laten zien als dienstregeling, nooit als live.
    return { ...samen, vertrekken: samen.vertrekken.map(v => ({ ...v, live: false })) };
  }, [hoofd, stationPoll.data, poll.uitCache]);
  const naam = h?.naam || String(p.naam || "Halte");
  const plaats = h?.plaats || String(p.plaats || "");
  React.useEffect(() => {
    if (id) zetFeedbackContext({ view: "halte", stop_id: id, stop_name: naam });
  }, [id, naam, zetFeedbackContext]);
  const fav = isFavoriet(id);
  // Een zoekkaart levert alvast de statische GTFS-routelijst mee;
  // de live API levert de volledige halte-/350m-stationscatalogus.
  const lijnCatalogus = useMemo(() => {
    try { return geldigeLijnen(JSON.parse(String(p.lijnen || "[]")), 250); }
    catch { return []; }
  }, [p.lijnen]);
  const statischeLijnen = useMemo(
    () => combineerStatischeLijnen(
      stationPoll.data?.lijncatalogus, h?.lijncatalogus, lijnCatalogus,
      lijnFavoriet ? [lijnFavoriet] : []
    ),
    [stationPoll.data?.lijncatalogus, h?.lijncatalogus, lijnCatalogus, lijnFavoriet]
  );
  // De gekozen zoekkaart blijft filterbaar, zelfs als die modus momenteel
  // geen vertrektijden in het API-tijdvenster heeft (bijv. laatste pont).
  const modi = [...new Set([...(h?.modi || []), ...statischeLijnen.map(v => v.modus),
    ...(h?.vertrekken || []).map(v => v.modus),
    ...(gevraagdeModus ? [gevraagdeModus] : [])].filter((m): m is string =>
      typeof m === "string" && m.trim().length > 0))]
    .sort((a, b) => {
      const volgorde = ["train", "metro", "tram", "bus", "ferry"];
      const aIndex = volgorde.indexOf(a), bIndex = volgorde.indexOf(b);
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
    });
  // Voor een multimodaal station staan Trein + Bus chronologisch bij elkaar.
  // Expliciete keuzes via de chips blijven daarna gerespecteerd.
  const meerdereModi = modi.length >= 2;
  const multimodaalStation = modi.includes("train") && (modi.includes("bus") || modi.includes("tram"));
  const tabModi = multimodaalStation ? ["alles", ...modi] : modi;
  const actieveModus = richtingActief && lijnFavoriet ? lijnFavoriet.modus
    : multimodaalStation && !handmatigeModus ? "alles"
    : meerdereModi
      ? (tabModi.includes(gekozenModus) ? gekozenModus
        : gevraagdeModus && tabModi.includes(gevraagdeModus) ? gevraagdeModus
        : modi.includes("train") ? "train" : modi[0])
      : "alles";
  const chips: ModusChip[] = tabModi.map(modaliteitChip);
  const uniekeLijnen = useMemo(
    () => zichtbareStatischeLijnen(statischeLijnen, actieveModus),
    [statischeLijnen, actieveModus]
  );
  // Zoeken beïnvloedt alleen welke chips zichtbaar zijn, nooit de statische databron.
  const getoondeLijnChips = useMemo(
    () => zoekStatischeLijnen(uniekeLijnen, lijnZoektekst),
    [uniekeLijnen, lijnZoektekst]
  );
  // Na een GTFS-refresh kan een lijn verdwijnen: voorkom een verouderd leeg filter.
  const geselecteerdeLijn = selectedLine && uniekeLijnen.some(v => v.lijn === selectedLine)
    ? selectedLine : null;
  // Een geselecteerde chip krijgt een eigen GTFS-opvraag voor de volledige
  // resterende dienstdag. Het normale stationsbord behoudt zijn snelle 2u-venster.
  const lijnPoll = usePolling(
    `lijn-hele-dag:${id}:${geselecteerdeLijn || "alles"}:${actieveModus}:${isStation}`,
    () => geselecteerdeLijn
      ? api.lijnVertrekken(id, geselecteerdeLijn, actieveModus, isStation)
      : Promise.resolve(null),
    instellingen.databesparing ? 90_000 : 45_000
  );
  // Bij snel wisselen tussen chips geen oude API-respons van een andere lijn tonen.
  const lijnData = geselecteerdeLijn && lijnPoll.data?.lijn === geselecteerdeLijn
    && lijnPoll.data?.modus === actieveModus && lijnPoll.data?.halte_id === id
    ? lijnPoll.data : null;
  // Vanuit Zoeken op lijn: kies de richting zodra er een passend vertrek bekend is (dagdienst of bord).
  // Pas als er echt een match is, wordt de keuze vastgelegd; eerder lege of andere lijsten tellen niet.
  const richtingBron = lijnData?.vertrekken ?? h?.vertrekken;
  React.useEffect(() => {
    if (!kiesRichtingParam || !kiesLijnParam || geselecteerdeLijn !== kiesLijnParam || !richtingBron?.length) return;
    if (richtingKlaar) return;
    const sleutel = `${id}|${kiesLijnParam}|${kiesRichtingParam}`;
    if (richtingGekozenVoor.current === sleutel) return;
    const kaal = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hint = kaal(kiesRichtingParam);
    const m = richtingBron.find(v => {
      if (v.lijn !== kiesLijnParam) return false;
      const b = kaal(bestemmingVoorWeergave(v.lijn, v.bestemming));
      return !!b && !!hint && (b === hint || b.includes(hint) || hint.includes(b));
    });
    if (!m) { if (lijnData) setRichtingKlaar(true); return; }
    richtingGekozenVoor.current = sleutel;
    setRichtingKlaar(true);
    setLokaleRichting({ lijn: m.lijn, richting: bestemmingVoorWeergave(m.lijn, m.bestemming),
      modus: m.modus, vervoerder: m.vervoerder });
  }, [richtingBron, geselecteerdeLijn, kiesLijnParam, kiesRichtingParam, id, richtingKlaar, lijnData]);
  // Nooit lang op de richting wachten: na 6 seconden tonen we gewoon de hele lijn.
  React.useEffect(() => {
    if (!kiesRichtingParam || !kiesLijnParam) return;
    const timer = setTimeout(() => setRichtingKlaar(true), 6000);
    return () => clearTimeout(timer);
  }, [id, kiesLijnParam, kiesRichtingParam]);
  // Zolang de gevraagde richting nog niet bekend is, geen gemengde lijst laten flitsen.
  const wachtOpRichting = !!kiesRichtingParam && !!kiesLijnParam && geselecteerdeLijn === kiesLijnParam
    && !lokaleRichting && !richtingActief && !richtingKlaar;
  // Zonder lijnchip: zoals bij OVinfo de komende 1,5 uur voor alle vervoerswijzen.
  // Een lijnchip toont via lijnPoll de hele dag.
  const basisVertrekken = useMemo(() => {
    const kort = filterHalteVertrekken(h?.vertrekken ?? [], actieveModus, geselecteerdeLijn);
    if (geselecteerdeLijn) return kort;
    // Net als OVinfo: binnen 1,5 uur, maar nooit een leeg bord. Is het stil (nacht, laatste rit
    // geweest), dan loopt de lijst door tot de eerstvolgende vertrekken, ook de eerste van morgen.
    // 90 minuten gerekend vanaf het eerstvolgende vertrek (bij nacht: vanaf de eerste van de dag).
    const eerste = kort.find(v => typeof v.vertrek_ms === "number")?.vertrek_ms;
    const start = Math.max(nu, eerste ?? nu);
    return kort.filter(v => typeof v.vertrek_ms !== "number" || v.vertrek_ms <= start + 90 * 60_000);
  }, [h?.vertrekken, actieveModus, geselecteerdeLijn, nu]);
  const richting = lokaleRichting ?? (richtingActief ? lijnFavoriet : null);
  // Filter de reeds geladen vertrekken meteen. De volledige dienstdag vult deze aan zodra die binnen is.
  const bordVertrekken = lijnData?.vertrekken ?? basisVertrekken;
  const opRichting = richting ? bordVertrekken.filter(v => vertrekBijLijnFavoriet(v, richting)) : bordVertrekken;
  // Tijdkiezer: alleen op een lijnpagina, "Nu" laat alles vanaf nu zien.
  const startMs = startUur === null ? null : new Date(new Date(nu).setHours(startUur, 0, 0, 0)).getTime();
  const vertrekken = geselecteerdeLijn && startMs !== null
    ? opRichting.filter(v => typeof v.vertrek_ms !== "number" || v.vertrek_ms >= startMs) : opRichting;
  const uurKeuzes = [9, 12, 15, 18, 21].filter(u => u > new Date(nu).getHours());
  // Overzicht gebruikt het hele geladen bord van de gekozen modus, niet het 90-minutenvenster.
  const overzichtVertrekken = useMemo(
    () => filterHalteVertrekken(h?.vertrekken ?? [], actieveModus, null),
    [h?.vertrekken, actieveModus]);
  const volgendeRit = lijnData?.volgende_rit;
  const volgendeInRichting = volgendeRit && (!richting || vertrekBijLijnFavoriet(volgendeRit, richting)) ? volgendeRit : null;

  const kiesLijn = (lijn: string | null) => {
    // Chips zijn al gefilterd op de actieve modaliteit.
    // Nogmaals op dezelfde chip tikken brengt 'Alles' terug.
    setSelectedLine(lijn === geselecteerdeLijn && !richtingActief ? null : lijn);
    setRichtingActief(false);
    setLokaleRichting(null);
    setStartUur(null);
    setTijdkiezerOpen(false);
    if (lijn === null) setLijnZoektekst("");
  };
  const wisselModus = (modus: string) => {
    setHandmatigeModus(true);
    setGekozenModus(modus);
    setSelectedLine(null);
    setLijnZoektekst("");
    setRichtingActief(false);
    setLokaleRichting(null);
    setStartUur(null);
  };
  const kiesRichting = (k: RichtingKeuze) => {
    setSelectedLine(k.lijn);
    setLokaleRichting(k);
    setRichtingActief(false);
    setStartUur(null);
    setTijdkiezerOpen(false);
  };
  const terugNaarLijnen = () => {
    setSelectedLine(null);
    setLokaleRichting(null);
    setStartUur(null);
    setTijdkiezerOpen(false);
    setWeergave("lijnen");
  };

  // Alleen horizontale gebaren (geen verticale scroll) wisselen het tabblad.
  const swipeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      meerdereModi && Math.abs(gesture.dx) > 25 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderRelease: (_event, gesture) => {
      if (!meerdereModi || Math.abs(gesture.dx) < 65
        || Math.abs(gesture.dx) < Math.abs(gesture.dy) * 1.4) return;
      const huidig = tabModi.indexOf(actieveModus);
      const volgende = huidig + (gesture.dx < 0 ? 1 : -1);
      if (volgende >= 0 && volgende < tabModi.length) {
        wisselModus(tabModi[volgende]);
      }
    }
  }), [meerdereModi, actieveModus, tabModi.join("|")]);
  // Kop: korte haltenaam, met de plaats één keer op de regel eronder.
  const titel = compacteHalteNaam(naam, plaats);
  const haltegroep = String(p.groep || "").trim();
  const kort = titel !== naam;
  const plaatsSub = plaats && (kort || !naam.toLowerCase().includes(plaats.toLowerCase())) ? plaats : "";
  const groepExtra = haltegroep && haltegroep.toLowerCase() !== plaats.toLowerCase()
    && haltegroep.toLowerCase() !== titel.toLowerCase() ? haltegroep : "";
  const groepSub = [plaatsSub, groepExtra].filter(Boolean).join(" · ");
  const [wekkerV, setWekkerV] = useState<Vertrek | null>(null);
  const [vasteRitV, setVasteRitV] = useState<Vertrek | null>(null);
  const kiesWekker = async (minuten: number) => {
    const v = wekkerV;
    setWekkerV(null);
    if (!v) return;
    try {
      await zetWekker(String(id), v, minuten, favorietenLijnen, instellingen.storingenPush);
      Alert.alert(t("Wekker gezet"), `${t("Je krijgt een melding")} ${minuten} ${t("min voor vertrek van lijn")} ${v.lijn}.`);
    } catch (e) {
      Alert.alert(t("Wekker niet gezet"), e instanceof Error ? t(e.message) : "");
    }
  };
  const openRit = (v: Vertrek) => {
    if (!v.rit) return;
    const fysiekeHalte = "stop_id" in v && typeof v.stop_id === "string" ? v.stop_id : "";
    const fysiekeNaam = "halte" in v && typeof v.halte === "string" ? v.halte : "";
    router.push({
      pathname: "/rit",
      params: {
        ...v.rit, van, lijn: v.lijn, bestemming: v.bestemming, vervoerder: v.vervoerder, modus: v.modus,
        kleur: v.kleur || v.lijn_kleur || "", tekstkleur: v.tekstkleur || v.lijn_tekstkleur || "",
        instap_halte: v.rit.instap_halte || fysiekeHalte || id,
        instap_naam: v.rit.instap_naam || fysiekeNaam || naam,
        instap_plaats: plaats, instap_ms: v.vertrek_ms ? String(v.vertrek_ms) : "",
        richting: v.bestemming
      }
    });
  };

  // Filter waarschuwingen op GTFS-modus; een busomleiding zoals N89 mag
  // niet op het Metro- of Tram-tabblad worden getoond.
  const storingen = (h?.storingen ?? []).filter(st =>
    storingPastBijModus(st, actieveModus, lijnCatalogus, h?.vertrekken ?? [])
  );

  let lijst: React.ReactNode;
  if (wachtOpRichting) lijst = <Laden />;
  else if (poll.laden && !h && !lijnData) lijst = <Laden />;
  else if (!h && poll.fout && !lijnData)
    lijst = <Leeg icoon="cloud-offline-outline" titel="Kan vertrektijden niet laden" tekst={poll.fout} knop={{ label: "Opnieuw", onPress: () => void poll.verversen() }} />;
  else if (geselecteerdeLijn && !lijnData && !vertrekken.length && !lijnPoll.fout)
    lijst = <Laden />;
  else if (geselecteerdeLijn && !lijnData && !vertrekken.length && lijnPoll.fout)
    lijst = <Leeg icoon="cloud-offline-outline" titel="Volledige dienstregeling niet bereikbaar" tekst={lijnPoll.fout} knop={{ label: "Opnieuw", onPress: () => void lijnPoll.verversen() }} />;
  else if ((h || lijnData) && !vertrekken.length)
    lijst = (
      <Kaart style={s.geenVertrekken}>
        {lijnCatalogus.length > 0 && actieveModus === "alles" ? (
          <View style={s.lijnenCatalogus}>
            <Text style={[s.catalogusTitel, { color: colors.text }]}>Lijnen op deze halte</Text>
            <View style={s.lijnRij}>
              {lijnCatalogus.slice(0, 8).map((line, i) => {
                const k = lijnKleur(line.lijn, line.modus, line.vervoerder, line.kleur, line.tekstkleur);
                return (
                  <View key={`${line.lijn}-${line.vervoerder}-${i}`} style={[s.lijnBadge, { backgroundColor: k.bg }, lijnBadgeHeeftRand(k) && { borderWidth: 1, borderColor: "#CBD5E1" }]}>
                    <Text style={[s.lijnBadgeTekst, { color: k.fg }]}>{line.lijn}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={[s.geenInformatie, { backgroundColor: colors.infoBg }]}>
          <Ionicons name="information-circle-outline" size={22} color={colors.infoText} />
          <Text style={[s.geenTekst, { color: colors.infoText }]}>
            {geselecteerdeLijn
              ? volgendeInRichting?.rit?.datum
                ? `Geen vertrekken meer vandaag voor lijn ${geselecteerdeLijn}. Volgende rit: ${new Date(`${volgendeInRichting.rit.datum}T12:00:00`).toLocaleDateString(taal === "en" ? "en-GB" : "nl-NL", { weekday: "long", day: "numeric", month: "long" })} om ${volgendeInRichting.gepland}.`
                : richting ? "Geen vertrekken meer vandaag in deze richting." : `Geen vertrekken meer vandaag voor lijn ${geselecteerdeLijn}. Misschien rijdt deze lijn niet elke dag.`
              : actieveModus === "alles"
                ? "Geen vertrekken in het komende anderhalf uur. Kies een lijn voor de hele dag."
                : `Geen ${modaliteitChip(actieveModus).label.toLowerCase()}vertrekken in het komende anderhalf uur. Kies een lijn voor de hele dag.`}
          </Text>
        </View>
      </Kaart>
    );
  else if (vertrekken.length)
    lijst = (
      <View style={[s.vertrekLijst, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {vertrekken.map((v, i) => (
          <VertrekRegel key={`${v.lijn}-${v.vertrek_ms}-${i}`} v={v} nu={nu} onPress={v.rit ? () => openRit(v) : undefined}
            onWekker={v.rit?.trip ? () => setWekkerV(v) : undefined}
            onVasteRit={vasteRitTijd(v) && v.vertrek_ms !== null ? () => setVasteRitV(v) : undefined} />
        ))}
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HalteKop naam={titel} detail={groepSub || undefined} favoriet={fav}
        onFavoriet={() => wisselFavoriet({ id, naam, plaats })} />
      {!geselecteerdeLijn ? (
        <View style={[s.weergaveKeuze, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {(["bord", "lijnen"] as const).map(w => (
            <Pressable key={w} accessibilityRole="tab" accessibilityState={{ selected: weergave === w }}
              onPress={() => setWeergave(w)}
              style={[s.weergaveKnop, { backgroundColor: weergave === w ? colors.surface : "transparent",
                borderColor: weergave === w ? colors.border : "transparent" }]}>
              <Text style={[s.weergaveTekst, { color: weergave === w ? colors.text : colors.sub,
                fontWeight: weergave === w ? "700" : "500" }]}>{w === "bord" ? "Vertrektijden" : "Lijnen"}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {meerdereModi ? (
        <View style={[s.chips, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {tabModi.length <= 3 ? (
            <Chips<string> opties={chips} waarde={actieveModus}
              onKies={wisselModus} vol />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chips<string> opties={chips} waarde={actieveModus}
                onKies={wisselModus} />
            </ScrollView>
          )}
        </View>
      ) : null}
      {uniekeLijnen.length >= 1 ? (
        <View style={[s.lijnFilterBalk, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {uniekeLijnen.length > 7 ? (
            <View style={s.lijnFilterKop}>
              <Text style={[s.lijnFilterHint, { color: colors.sub }]}>
                {`${uniekeLijnen.length} lijnen · veeg voor meer`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(zoekveldOpen ? "Lijn zoeken sluiten" : "Lijnnummer zoeken")}
                onPress={() => {
                  setZoekveldOpen(v => !v);
                  setLijnZoektekst("");
                }}
                style={[s.lijnZoekKnop, { borderColor: colors.border }]}>
                <Ionicons name={zoekveldOpen ? "close" : "search-outline"} size={18} color={colors.accent} />
              </Pressable>
            </View>
          ) : null}
          {zoekveldOpen ? (
            <TextInput
              value={lijnZoektekst}
              onChangeText={setLijnZoektekst}
              placeholder={t("Zoek lijnnummer, bijvoorbeeld 97")}
              placeholderTextColor={colors.muted}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t("Zoek in alle lijnen van deze halte")}
              style={[s.lijnZoekveld, {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border
              }]}
            />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.lijnFilterInhoud} accessibilityRole="tablist">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: geselecteerdeLijn === null }}
              accessibilityLabel={t("Alle lijnen")}
              onPress={() => kiesLijn(null)}
              style={[s.lijnFilterChip, {
                backgroundColor: geselecteerdeLijn === null ? colors.accent : "transparent",
                borderColor: geselecteerdeLijn === null ? colors.accent : colors.border
              }]}>
              <Text style={[s.lijnFilterAlles, {
                color: geselecteerdeLijn === null ? colors.onAccent : colors.sub
              }]}>Alles</Text>
            </Pressable>
            {getoondeLijnChips.map(lijn => {
              const actief = geselecteerdeLijn === lijn.lijn;
              const palet = lijnKleur(
                lijn.lijn, lijn.modus, lijn.vervoerder,
                lijn.kleur, lijn.tekstkleur
              );
              return (
                <Pressable key={`${lijn.modus}:${lijn.lijn}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: actief }}
                  accessibilityLabel={t(`Filter op lijn ${lijn.lijn}`)}
                  onPress={() => kiesLijn(lijn.lijn)}
                  style={[s.lijnFilterChip, {
                    backgroundColor: actief ? colors.accent : "transparent",
                    // Niet-actieve chip zonder eigen rand: de gekleurde lijnbadge is de knop.
                    borderColor: actief ? colors.accent : "transparent"
                  }]}>
                  <View style={[s.lijnFilterBadge, { backgroundColor: palet.bg },
                    lijnBadgeHeeftRand(palet) && { borderWidth: 1, borderColor: colors.border }]}>
                    <Text style={[s.lijnFilterNummer, { color: palet.fg }]} numberOfLines={1}>
                      {lijn.lijn}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {getoondeLijnChips.length === 0 ? (
              <Text style={[s.lijnFilterHint, { color: colors.sub }]}>Geen lijnen gevonden</Text>
            ) : null}
          </ScrollView>
          {richting ? <Text style={[s.richtingLabel, { color: colors.accent }]}>
            Richting {richting.richting}
          </Text> : null}
        </View>
      ) : null}
      <ScrollView
        {...swipeResponder.panHandlers}
        contentContainerStyle={s.inhoud}
        refreshControl={<RefreshControl refreshing={ververst} onRefresh={() => {
          if (ververst) return;
          setVervers(true);
          void Promise.all([
            poll.verversen(),
            isStation ? stationPoll.verversen() : Promise.resolve(),
            geselecteerdeLijn ? lijnPoll.verversen() : Promise.resolve()
          ]).finally(() => setVervers(false));
        }} colors={[colors.accent]} />}
      >
        {storingen.length ? (
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => setStoringenOpen((o) => !o)}
              style={[s.storing, { backgroundColor: colors.warnBg, borderColor: colors.warnBorder }]}
              accessibilityRole="button"
              accessibilityHint={t(storingenOpen ? "Inklappen" : "Toon storingen")}
            >
              <Ionicons name="alert-circle-outline" size={20} color={colors.delay} />
              <Text style={[s.storingText, { color: colors.warnText }]} numberOfLines={storingenOpen ? undefined : 1}>
                {storingen[0].titel}
                {storingen.length > 1 ? ` · +${storingen.length - 1}` : ""}
              </Text>
              <Ionicons name={storingenOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.delay} />
            </Pressable>
            {storingenOpen ? storingen.map((st) => <StoringKaart key={st.id} st={st} />) : null}
          </View>
        ) : null}
        {p2000Meldingen.length ? (
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => setP2000Open((o) => !o)}
              style={[s.storing, { backgroundColor: colors.infoBg, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityHint={t(p2000Open ? "Inklappen" : "Toon P2000-meldingen")}
            >
              <Ionicons name="megaphone-outline" size={20} color={colors.infoText} />
              <Text style={[s.storingText, { color: colors.infoText }]} numberOfLines={p2000Open ? undefined : 1}>
                {t("Mogelijk hinder (P2000)")}: {p2000Meldingen[0].tekst}
                {p2000Meldingen.length > 1 ? ` · +${p2000Meldingen.length - 1}` : ""}
              </Text>
              <Ionicons name={p2000Open ? "chevron-up" : "chevron-down"} size={18} color={colors.infoText} />
            </Pressable>
            {p2000Open ? p2000Meldingen.map((m) => <P2000Kaart key={m.uid} m={m} />) : null}
          </View>
        ) : null}
        {poll.fout && h ? <FoutBalk tekst={poll.fout} /> : null}
        {geselecteerdeLijn ? (
          <View style={s.lijnKopRij}>
            {lokaleRichting ? (
              <Pressable accessibilityRole="button" onPress={terugNaarLijnen} style={s.terugKnop}>
                <Ionicons name="arrow-back" size={18} color={colors.accent} />
                <Text style={[s.terugTekst, { color: colors.accent }]}>Lijnen</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Kies een starttijd"
              onPress={() => setTijdkiezerOpen(o => !o)}
              style={[s.tijdKnop, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="time-outline" size={18} color={colors.sub} />
              <Text style={[s.tijdTekst, { color: colors.text }]}>{startUur === null ? "Nu" : `Vanaf ${String(startUur).padStart(2, "0")}:00`}</Text>
              <Ionicons name={tijdkiezerOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.sub} />
            </Pressable>
          </View>
        ) : null}
        {geselecteerdeLijn && tijdkiezerOpen ? (
          <View style={[s.vertrekLijst, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[null, ...uurKeuzes].map(u => (
              <Pressable key={String(u)} accessibilityRole="button"
                onPress={() => { setStartUur(u); setTijdkiezerOpen(false); }}
                style={[s.tijdOptie, { borderTopColor: colors.divider }]}>
                <Text style={[s.tijdTekst, { color: colors.text, flex: 1 }]}>{u === null ? "Nu" : `Vanaf ${String(u).padStart(2, "0")}:00`}</Text>
                {startUur === u ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
        {weergave === "lijnen" && !geselecteerdeLijn
          ? <LijnenOverzicht vertrekken={overzichtVertrekken} nu={nu} onKies={kiesRichting} />
          : lijst}
        {geselecteerdeLijn && !lijnData && vertrekken.length > 0 ? (
          lijnPoll.fout ? <FoutBalk tekst={t("Volledige dienstregeling niet bereikbaar")} /> :
            <Text style={[s.lijnFilterHint, { color: colors.sub }]}>Volledige dienstregeling wordt geladen…</Text>
        ) : null}
      </ScrollView>
      <LiveBalk live={!!h && !poll.uitCache && vertrekken.some(v => toonAlsLive(v, nu))}
        bijgewerktMs={h && Number.isFinite(Date.parse(h.bijgewerkt))
          ? Date.parse(h.bijgewerkt) : null} nu={nu} />
      <OnderBalk actief={van} />
      <VasteRitBlad v={vasteRitV} halte={{ id, naam, plaats }} onSluit={() => setVasteRitV(null)} />
      <Modal visible={wekkerV !== null} transparent animationType="fade" onRequestClose={() => setWekkerV(null)}>
        <View style={s.wekkerAchter}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWekkerV(null)}
            accessibilityRole="button" accessibilityLabel={t("Keuzemenu sluiten")} />
          <View style={[s.wekkerKaart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.wekkerTitel, { color: colors.text }]}>{t("Wekker voor dit vertrek")}</Text>
            <Text style={[s.wekkerUitleg, { color: colors.sub }]}>
              {wekkerV ? `${t("Lijn")} ${wekkerV.lijn} ${t("naar")} ${wekkerV.bestemming}. ${t("Je krijgt een melding vlak voor vertrek, op basis van de live tijd.")}` : ""}
            </Text>
            {[3, 5, 10, 15].map(m => (
              <Pressable key={m} onPress={() => void kiesWekker(m)} accessibilityRole="button"
                style={[s.wekkerOptie, { borderColor: colors.border }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.accent} />
                <Text style={[s.wekkerOptieTekst, { color: colors.text }]}>{m} {t("minuten voor vertrek")}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  weergaveKeuze: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  weergaveKnop: { flex: 1, minHeight: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  weergaveTekst: { fontSize: 14 },
  lijnKopRij: { flexDirection: "row", alignItems: "center", gap: 10 },
  terugKnop: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingRight: 6 },
  terugTekst: { fontSize: 15, fontWeight: "700" },
  tijdKnop: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  tijdTekst: { fontSize: 15, fontWeight: "600" },
  tijdOptie: { flexDirection: "row", alignItems: "center", minHeight: 46, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth },
  wekkerAchter: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  wekkerKaart: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  wekkerTitel: { fontSize: 17, fontWeight: "800" },
  wekkerUitleg: { fontSize: 13, lineHeight: 19 },
  wekkerOptie: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth },
  wekkerOptieTekst: { fontSize: 15, fontWeight: "600" },
  lijnFilterBalk: { borderBottomWidth: StyleSheet.hairlineWidth },
  richtingLabel: { paddingHorizontal: 14, paddingBottom: 8, fontSize: 13, fontWeight: "700" },
  lijnFilterKop: { paddingHorizontal: 14, paddingTop: 7, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between", gap: 12 },
  lijnFilterHint: { fontSize: 12, fontWeight: "600" },
  lijnZoekKnop: { width: 34, height: 30, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center" },
  lijnZoekveld: { marginHorizontal: 14, marginTop: 7, height: 43, borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  lijnFilterInhoud: { paddingHorizontal: 14, paddingVertical: 9, alignItems: "center", gap: 8 },
  lijnFilterChip: {
    minHeight: 37, minWidth: 49, paddingHorizontal: 10,
    borderRadius: 19, borderWidth: 1,
    alignItems: "center", justifyContent: "center"
  },
  lijnFilterAlles: { fontSize: 13, fontWeight: "800" },
  lijnFilterBadge: {
    minWidth: 29, minHeight: 23, borderRadius: 7,
    paddingHorizontal: 6, justifyContent: "center", alignItems: "center"
  },
  lijnFilterNummer: { fontSize: 13, fontWeight: "800", maxWidth: 75 },
  chips: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  inhoud: { padding: 14, gap: 13, paddingBottom: 28 },
  vertrekLijst: { marginHorizontal: -14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  storing: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, minHeight: 46, paddingVertical: 10 },
  storingText: { flex: 1, fontSize: 15, fontWeight: "600" },
  geenVertrekken: { padding: 16, gap: 15 },
  lijnenCatalogus: { gap: 11 },
  catalogusTitel: { fontSize: 15, fontWeight: "800" },
  lijnRij: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lijnBadge: { minWidth: 39, minHeight: 29, paddingHorizontal: 9, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  lijnBadgeTekst: { fontSize: 13, fontWeight: "800" },
  geenInformatie: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  geenTekst: { flex: 1, fontSize: 13, fontWeight: "600" }
});
