'use client';

import dynamic from 'next/dynamic';

// Temporary bridge: the existing game still runs client-only until the hydration-safe store lands.
const GameScreen = dynamic(() => import('../../screens/GameScreen').then((m) => m.GameScreen), {
  ssr: false,
});

export function GameClient() {
  return <GameScreen />;
}
