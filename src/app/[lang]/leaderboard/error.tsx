'use client';

import { useLingui } from '@lingui/react/macro';

export default function LeaderboardError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLingui();

  return (
    <main className="error-screen">
      <h1>{t`The board is unavailable right now`}</h1>
      <button className="button button-outline" type="button" onClick={() => reset()}>
        {t`Try again`}
      </button>
    </main>
  );
}
