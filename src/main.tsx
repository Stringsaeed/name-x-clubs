import { Component, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing application root');
}
createRoot(root).render(
  <StrictMode>
    <GameBoundary>
      <GameScreen />
    </GameBoundary>
  </StrictMode>,
);
