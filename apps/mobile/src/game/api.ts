import { createRankedApi } from '../../../web/src/game/ranked/api';

const configured = process.env.EXPO_PUBLIC_API_URL ?? 'https://clubs.saeed.sh';

export const apiBaseUrl = configured.replace(/\/+$/, '');

/** The server rejects a POST without an `Origin`, which a phone does not send by itself. */
export function appFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { ...init?.headers, Origin: apiBaseUrl, Accept: 'application/json' },
  });
}

export const rankedApi = createRankedApi(appFetch);
