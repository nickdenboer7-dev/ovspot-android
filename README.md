# OVspot

Android-app met live posities en vertrektijden van het Nederlandse openbaar vervoer (bus, tram, metro, trein), gemaakt met Expo / React Native en TypeScript. Website: [ovspot.nl](https://ovspot.nl).

Dit is een persoonlijk project. Een deel van de code is geschreven met hulp van AI; de ideeën, keuzes en het testen zijn van mij.

## Wat de app doet
- **Dichtbij**: haltes in de buurt met de eerstvolgende vertrekken.
- **Favorieten**: favoriete haltes en lijnen.
- **Haltebord**: live en geplande vertrekken, vertraging, spoor/perron, vervallen ritten en storingen.
- **Ritverloop**: tijdlijn van een rit die vanzelf ververst.
- **Storingen**: storingen bij je haltes, P2000-meldingen die het OV raken en grote spoorincidenten (bron: ProRail).
- **Mijn ritten**: sla een rit op die je vaak neemt, zodat je alleen storingen ziet die voor die rit tellen.
- Donkere modus, Nederlands en Engels.

## Techniek
- Expo (React Native) met TypeScript, Expo Router.
- Gegevens komen van een eigen API (`ovspot.nl`) met open OV-data. De server is niet onderdeel van deze repo.
- Verbindingen met de API zijn versleuteld per apparaat (zie `lib/deviceSecureApi.ts`).
- Kleine updates gaan via Expo Updates (OTA).

## Ontwikkelen
```bash
npm install
npx expo start
npm run typecheck
node --experimental-strip-types --test tests/*.mjs
```

De app praat met de live API van ovspot.nl. Zonder toegang tot die API werkt de app niet volledig.

## Testversie
Een testversie voor Android (geen Play Store) staat op https://ovspot.nl/static/ovspot-app-test.html

## Feedback
Opmerkingen, bugs en ideeën zijn welkom, via de feedbackknop in de app of via [ovspot.nl/contact](https://ovspot.nl/contact).
