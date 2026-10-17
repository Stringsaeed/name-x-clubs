import type { CSSProperties } from 'react';

const palette = ['#244f3b', '#c4553d', '#4f77b8', '#b8873d', '#7b5db0', '#3f8f86'];

const anonymousColor = '#9aa58b';

function colorFor(name: string): string {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 997;
  }

  return palette[hash % palette.length] ?? anonymousColor;
}

export function initialOf(name: string): string {
  const [first] = Array.from(name.trim());

  return (first ?? '?').toUpperCase();
}

type AvatarProps = { name: string; anonymous: boolean; className?: string };

export function Avatar({ name, anonymous, className = '' }: AvatarProps) {
  const color = anonymous ? anonymousColor : colorFor(name);

  return (
    <span
      className={`lb-avatar ${className}`}
      style={{ '--avatar-color': color } as CSSProperties}
      aria-hidden="true"
    >
      {initialOf(name)}
    </span>
  );
}
