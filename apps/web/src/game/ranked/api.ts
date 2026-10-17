/**
 * The browser side of the ranked rounds API (`/api/rounds`). Every call resolves, never throws:
 * a network failure comes back as `status: 0`, so callers handle one result shape.
 */
import type { Locale } from '../../i18n/config';
import type { RankedMode } from '../../server/rounds/modes';
import type {
  AnswerEntry,
  AnswersResponse,
  Finished,
  RoundView,
  Started,
} from '../../server/rounds/types';

export type { AnswerEntry, AnswersResponse, Finished, RankedMode, RoundView };

export type StartedBody = Omit<Started, 'sessionToken'>;

/** The error body the server sends next to a 4xx or 5xx, such as `{ error: 'SeqGap', expectedSeq }`. */
export type ApiErrorBody = Readonly<{ error?: string; expectedSeq?: number; roundId?: string }>;

export type ApiResult<T> =
  | Readonly<{ ok: true; body: T }>
  | Readonly<{ ok: false; status: number; body: ApiErrorBody | null }>;

export type RankedApi = Readonly<{
  start: (mode: RankedMode, lang: Locale) => Promise<ApiResult<StartedBody>>;
  answers: (
    roundId: string,
    seq: number,
    entries: readonly AnswerEntry[],
  ) => Promise<ApiResult<AnswersResponse>>;
  resume: (roundId: string, lang: Locale) => Promise<ApiResult<RoundView>>;
  finish: (roundId: string, lang: Locale) => Promise<ApiResult<Finished>>;
}>;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const networkFailure = { ok: false, status: 0, body: null } as const;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function postInit(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  };
}

const getInit: RequestInit = { credentials: 'same-origin', cache: 'no-store' };

export function createRankedApi(fetchImpl: FetchLike): RankedApi {
  async function call<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
    let response: Response;

    try {
      response = await fetchImpl(path, init);
    } catch {
      return networkFailure;
    }

    const body = await readJson(response);

    if (response.ok) {
      return { ok: true, body: body as T };
    }

    return { ok: false, status: response.status, body: body as ApiErrorBody | null };
  }

  const roundPath = (roundId: string) => `/api/rounds/${encodeURIComponent(roundId)}`;

  return {
    start: (mode, lang) => call('/api/rounds', postInit({ mode, lang })),
    answers: (roundId, seq, entries) =>
      call(`${roundPath(roundId)}/answers`, postInit({ seq, entries })),
    resume: (roundId, lang) => call(`${roundPath(roundId)}?lang=${lang}`, getInit),
    finish: (roundId, lang) => call(`${roundPath(roundId)}/finish`, postInit({ lang })),
  };
}
