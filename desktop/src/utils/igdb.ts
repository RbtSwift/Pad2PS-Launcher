export interface IgdbGameMetadata {
  id: number;
  name: string;
  summary: string;
  year: number | null;
  genres: string[];
  developers: string[];
  screenshots: string[];
  rating: number | null;
}

export async function fetchIgdbMetadata(title: string, appId?: string, refresh = false): Promise<IgdbGameMetadata | null> {
  const params = new URLSearchParams({ title });
  if (appId) params.set('appId', appId);
  if (refresh) params.set('refresh', '1');
  const response = await fetch(`/api/igdb/game?${params}`);
  const result = await response.json() as {available?: boolean; data?: IgdbGameMetadata; reason?: string};
  if (!response.ok || !result.available || !result.data) throw new Error(result.reason || 'Metadados IGDB indisponíveis.');
  return result.data;
}
