'use client';

export default function GameError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="error-screen">
      <h1>The game needs a quick restart.</h1>
      <p>Reload the game to try again.</p>
      <button className="button button-primary" type="button" onClick={() => reset()}>
        Reload game
      </button>
    </main>
  );
}
