import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ovspot.uitstap-wekkers.v1";
/** Een wekker is nutteloos na een paar uur; zo blijft de lijst klein. */
const BEWAAR_MS = 6 * 3600_000;

export type OpgeslagenWekker = { id: string; label: string; opgeslagen: number };
type Lijst = Record<string, OpgeslagenWekker>;

export const wekkerSleutel = (ritKey: string, datum: string, haltId: string) => `${ritKey}:${datum}:${haltId}`;

async function lees(): Promise<Lijst> {
  try {
    const ruw = await AsyncStorage.getItem(KEY);
    const lijst = ruw ? (JSON.parse(ruw) as Lijst) : {};
    const nu = Date.now();
    return Object.fromEntries(Object.entries(lijst).filter(([, w]) => nu - w.opgeslagen < BEWAAR_MS));
  } catch {
    return {};
  }
}

async function schrijf(lijst: Lijst): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(lijst)); } catch { /* opslag niet beschikbaar */ }
}

export const leesUitstapWekkers = lees;

export async function bewaarUitstapWekker(sleutel: string, id: string, label: string): Promise<Lijst> {
  const lijst = await lees();
  lijst[sleutel] = { id, label, opgeslagen: Date.now() };
  await schrijf(lijst);
  return lijst;
}

export async function verwijderUitstapWekker(sleutel: string): Promise<Lijst> {
  const lijst = await lees();
  delete lijst[sleutel];
  await schrijf(lijst);
  return lijst;
}
