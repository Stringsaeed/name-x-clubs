import type { ReactNode } from 'react';

const paths = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6M12 2v3m6 1 2-2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01" />
    </>
  ),
  shuffle: (
    <path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c1.5 0 3-1 4-3m4-6c1-2 2-3 4-3h3m-4-4 4 4-4 4" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  share: <path d="M12 16V3m-4 4 4-4 4 4M5 12H3v9h18v-9h-2" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m12 7 5 3-2 5H9l-2-5 5-3Zm0 0V2.5m5 7.5 4.5-1m-6.5 6 3.5 5M9 15l-3.5 5M7 10l-4.5-1" />
    </>
  ),
  moon: <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trophy: (
    <path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v5m-4 1h8" />
  ),
} satisfies Record<string, ReactNode>;
export function Icon({
  name,
  className = '',
  size,
}: {
  name: keyof typeof paths;
  className?: string | undefined;
  size?: number | undefined;
}) {
  return (
    <svg
      className={`icon ${className}`}
      style={size === undefined ? undefined : { width: size, height: size }}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
