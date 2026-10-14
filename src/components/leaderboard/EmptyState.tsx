import { useLingui } from '@lingui/react/macro';
import type { Locale } from '../../i18n/config';
import { Icon } from '../Icon';

export function EmptyState({ lang }: { lang: Locale }) {
  const { t } = useLingui();

  return (
    <div className="lb-empty">
      <span className="lb-empty-icon">
        <Icon name="trophy" />
      </span>
      <h2>{t`No times yet`}</h2>
      <a className="button button-primary" href={`/${lang}`}>
        {t`Let’s play`}
        <Icon name="arrow" />
      </a>
    </div>
  );
}

export function UnavailableState({ href }: { href: string }) {
  const { t } = useLingui();

  return (
    <div className="lb-empty" role="status">
      <h2>{t`The board is unavailable right now`}</h2>
      <a className="button button-outline" href={href}>
        {t`Try again`}
      </a>
    </div>
  );
}
