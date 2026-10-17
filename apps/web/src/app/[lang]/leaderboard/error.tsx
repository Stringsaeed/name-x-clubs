'use client';

import { useLingui } from '@lingui/react/macro';
import { Button } from '@/components/ui/button';

export default function LeaderboardError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLingui();

  return (
    <main className="error-screen">
      <h1>{t`The board is unavailable right now`}</h1>
      <Button type="button" variant="tertiary" onClick={() => reset()}>
        {t`Try again`}
      </Button>
    </main>
  );
}
