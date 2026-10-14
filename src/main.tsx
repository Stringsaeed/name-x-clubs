import { Component, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isLocale } from './i18n/config';
import { GameScreen } from './screens/GameScreen';
import './styles/game.css';

class GameBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="error-screen">
        <h1>The game needs a quick restart.</h1>
        <p>Reload the game to try again.</p>
        <button
          className="button button-primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload game
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function storedLocale() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem('nxc-language') ?? 'null');
    return isLocale(value) ? value : 'en';
  } catch {
    return 'en';
  }
}
const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing application root');
}
createRoot(root).render(
  <StrictMode>
    <GameBoundary>
      <GameScreen lang={storedLocale()} />
    </GameBoundary>
  </StrictMode>,
);
