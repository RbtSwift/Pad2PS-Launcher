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

export async function fetchIgdbMetadata(title: string): Promise<IgdbGameMetadata | null> {
  const response = await fetch(`/api/igdb/game?title=${encodeURIComponent(title)}`);
  const result = await response.json() as {available?: boolean; data?: IgdbGameMetadata; reason?: string};
  if (!response.ok || !result.available || !result.data) throw new Error(result.reason || 'Metadados IGDB indisponíveis.');
  return result.data;
}
