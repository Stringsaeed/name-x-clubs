'use client';

import { useLingui } from '@lingui/react/macro';

export default function GameError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLingui();

  return (
    <main className="error-screen">
      <h1>{t`The game needs a quick restart.`}</h1>
      <p>{t`Reload the game to try again.`}</p>
      <button className="button button-primary" type="button" onClick={() => reset()}>
        {t`Reload game`}
      </button>
    </main>
  );
}
