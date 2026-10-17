import { useLingui } from '@lingui/react/macro';
import type { Locale } from '@nxc/game/i18n/config';
import { Button } from '@/components/ui/button';
import { ArrowGameIcon } from '../fluidGameIcons';
import { Icon } from '../Icon';

export function EmptyState({ lang }: { lang: Locale }) {
  const { t } = useLingui();

  return (
    <div className="lb-empty">
      <span className="lb-empty-icon">
        <Icon name="trophy" />
      </span>
      <h2>{t`No times yet`}</h2>
      <Button
        className="lb-play-button"
        render={<a href={`/${lang}`} />}
        trailingIcon={ArrowGameIcon}
      >
        {t`Let’s play`}
      </Button>
    </div>
  );
}

export function UnavailableState({ href }: { href: string }) {
  const { t } = useLingui();

  return (
    <div className="lb-empty" role="status">
      <h2>{t`The board is unavailable right now`}</h2>
      <Button asChild variant="tertiary">
        <a href={href}>{t`Try again`}</a>
      </Button>
    </div>
  );
}
