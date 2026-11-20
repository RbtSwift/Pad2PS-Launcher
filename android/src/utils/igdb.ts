import { registerPlugin } from '@capacitor/core';

export interface IgdbGameMetadata {
  id: number; name: string; summary: string; year: number | null;
  genres: string[]; developers: string[]; screenshots: string[]; rating: number | null;
}
interface IgdbPlugin {
  config(): Promise<{configured: boolean; clientId: string}>;
  saveCredentials(options: {clientId: string; clientSecret: string}): Promise<{configured: boolean}>;
  clear(): Promise<{ok: boolean}>;
  game(options: {title: string; appId?: string; refresh?: boolean}): Promise<{available: boolean; data?: IgdbGameMetadata; reason?: string}>;
}
export const IgdbNative = registerPlugin<IgdbPlugin>('Igdb');

export async function fetchIgdbMetadata(title: string, appId?: string, refresh = false): Promise<IgdbGameMetadata | null> {
  const result = await IgdbNative.game({title, appId, refresh});
  if (!result.available || !result.data) throw new Error(result.reason || 'Metadados IGDB indisponíveis.');
  return result.data;
}
export async function igdbConfig(): Promise<{configured: boolean; clientId: string}> { return IgdbNative.config(); }
export async function saveIgdbCredentials(clientId: string, clientSecret: string): Promise<void> { await IgdbNative.saveCredentials({clientId, clientSecret}); }
export async function clearIgdbCredentials(): Promise<void> { await IgdbNative.clear(); }
