import { useLingui } from '@lingui/react/macro';
import { memo } from 'react';

export const Hero = memo(function HeroView() {
  const { t } = useLingui();

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          {t`Know your clubs?`}
          <br />
          <span className="highlight">{t`Prove it.`}</span>
          <svg className="hero-spark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 2v10m0 16v10M2 20h10m16 0h10M7 7l7 7m12 12 7 7M7 33l7-7m12-12 7-7" />
          </svg>
        </h1>
      </div>
      <div className="hero-art">
        {/* biome-ignore lint/performance/noImgElement: static SVG; the app does not use next/image */}
        <img
          src="/assets/pitch.svg"
          width="560"
          height="360"
          alt={t`An illustrated football pitch with shirts and a football`}
        />
      </div>
    </section>
  );
});
