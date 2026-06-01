// Standalone entry for the portfolio: mounts Jordan's real Board3DScene
// (the board3d module - procedural neon board, FBX pieces, bloom post-fx,
// lightning/capture/jump animations) with no backend. Bundled by esbuild
// into ../app.js.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chess } from 'chess.js';
import { Board3DScene } from './Board3DScene';
import type { Board3DGameState, Board3DHandle } from './board3d/types';
import { chooseAiMove, type AiProfileId, type PlayerColor } from './ai';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const OPPONENTS: Array<{
  id: AiProfileId;
  name: string;
  difficulty: string;
  avatar: string;
  tagline: string;
  bio: string;
  speed: number;
  delay: number;
}> = [
  {
    id: 'goop',
    name: 'Goop',
    difficulty: 'EASY',
    avatar: 'avatars/goop.png',
    tagline: 'Mostly legal. Frequently sticky.',
    bio: 'A training-room nuisance that values chaos, trades material for vibes, and occasionally stumbles into real tactics.',
    speed: 1.7,
    delay: 760,
  },
  {
    id: 'frostd4d',
    name: 'Frostd4d',
    difficulty: 'MED',
    avatar: 'avatars/frostd4d.png',
    tagline: 'Cold reads, colder captures.',
    bio: 'A mid-depth board reader built for pressure: it hunts loose pieces, likes checks, and punishes autopilot openings.',
    speed: 2.1,
    delay: 520,
  },
  {
    id: 'razorblade',
    name: 'Razorblade',
    difficulty: 'HARD',
    avatar: 'avatars/razorblade.png',
    tagline: 'Depth search with bad intentions.',
    bio: 'The sharpest Cyber Chess agent in the cabinet. Razorblade searches deeper, converts captures hard, and turns slow mistakes into endgame problems.',
    speed: 2.45,
    delay: 320,
  },
];

const INTRO_MP4_SRC = 'media/chessagent-intro.mp4';
const HEADER_IMAGE_SRC = 'media/cyber-chess-header.png';

declare global { interface Window { __chess: any } }
window.__chess = { mounted: false };

function turnFromFen(fen: string) {
  try {
    return new Chess(fen).turn();
  } catch (_) {
    return 'w';
  }
}

function App() {
  const ref = useRef<Board3DHandle>(null);
  const aiBusyRef = useRef(false);
  const lastAiFenRef = useRef('');
  const [screen, setScreen] = useState<'intro' | 'playing'>('intro');
  const [menuStep, setMenuStep] = useState<'video' | 'side' | 'opponent'>('video');
  const [selectedId, setSelectedId] = useState<AiProfileId>('goop');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [introVideoReady, setIntroVideoReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [gameState, setGameState] = useState<Board3DGameState>({
    status: 'Loading pieces',
    fen: START,
    selectedSquare: null,
  });

  const selected = OPPONENTS.find((opponent) => opponent.id === selectedId) ?? OPPONENTS[0];
  const turn = turnFromFen(gameState.fen);
  const aiColor: PlayerColor = playerColor === 'w' ? 'b' : 'w';
  const inputEnabled = screen === 'playing' && turn === playerColor && !thinking;
  const whiteName = playerColor === 'w' ? 'YOU' : selected.name;
  const blackName = playerColor === 'b' ? 'YOU' : selected.name;
  const playerSideName = playerColor === 'w' ? 'White' : 'Black';
  const agentSideName = aiColor === 'w' ? 'White' : 'Black';

  const updateGameState = (state: Board3DGameState) => {
    window.__chess.state = state;
    if (turnFromFen(state.fen) !== aiColor) {
      aiBusyRef.current = false;
      setThinking(false);
    }
    setGameState(state);
  };

  useEffect(() => {
    window.__chess.handle = ref.current;
    window.__chess.mounted = true;
    window.__chess.state = gameState;
    document.body.setAttribute('data-chess-mounted', '1');
    // FBX pieces load async inside the hook; nudge to the start position once.
    const id = window.setTimeout(() => {
      try { ref.current?.resetToPosition(START); } catch (_) {}
    }, 400);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (screen !== 'playing') return;

    const game = new Chess(gameState.fen);
    if (game.isGameOver() || game.turn() !== aiColor) {
      aiBusyRef.current = false;
      setThinking(false);
      return;
    }
    if (aiBusyRef.current || lastAiFenRef.current === gameState.fen) return;

    aiBusyRef.current = true;
    lastAiFenRef.current = gameState.fen;
    setThinking(true);

    const id = window.setTimeout(() => {
      const move = chooseAiMove(gameState.fen, selected.id, aiColor);
      if (!move) {
        aiBusyRef.current = false;
        setThinking(false);
        return;
      }
      ref.current?.applyMove(
        move.from,
        move.to,
        Boolean(move.captured) || move.flags.includes('c') || move.flags.includes('e'),
        move.flags,
        move.promotion ?? (move.piece === 'p' && (move.to[1] === '1' || move.to[1] === '8') ? 'q' : undefined),
        selected.speed
      );
    }, selected.delay);

    return () => window.clearTimeout(id);
  }, [aiColor, gameState.fen, screen, selected]);

  const resetGame = () => {
    aiBusyRef.current = false;
    lastAiFenRef.current = '';
    setThinking(false);
    ref.current?.resetToPosition(START);
  };

  const startGame = () => {
    setScreen('playing');
    resetGame();
  };

  const openMenu = () => {
    setMenuStep('video');
    setScreen('intro');
  };

  return (
    <>
      <Board3DScene
        key={`${selected.id}-${playerColor}`}
        ref={ref}
        whiteName={whiteName}
        blackName={blackName}
        inputEnabled={inputEnabled}
        onGameStateChange={updateGameState}
      />

      {screen === 'intro' && (
        <div className="cyber-menu">
          <div className="cyber-panel">
            {menuStep === 'video' && (
              <div className="menu-step menu-step-video">
                <div className={'intro-video-shell' + (introVideoReady ? ' ready' : '')}>
                  <video
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    onCanPlay={() => setIntroVideoReady(true)}
                    onError={() => setIntroVideoReady(false)}
                  >
                    <source src={INTRO_MP4_SRC} type="video/mp4" />
                  </video>
                  {!introVideoReady && <span>INTRO MP4 SLOT</span>}
                </div>
                <button type="button" className="cyber-start" onClick={() => setMenuStep('side')}>
                  CLICK TO ENTER
                </button>
              </div>
            )}

            {menuStep === 'side' && (
              <div className="menu-step">
                <div className="cyber-hero">
                  <img className="cyber-hero-bg" src={HEADER_IMAGE_SRC} alt="" />
                  <div className="hero-color-overlay">
                    <div className="color-picker" role="group" aria-label="Choose your color">
                      <button
                        type="button"
                        className={playerColor === 'w' ? 'selected' : ''}
                        onClick={() => setPlayerColor('w')}
                      >
                        Play White
                      </button>
                      <button
                        type="button"
                        className={playerColor === 'b' ? 'selected' : ''}
                        onClick={() => setPlayerColor('b')}
                      >
                        Play Black
                      </button>
                    </div>
                  </div>
                </div>
                <div className="intro-copy">
                  <p>
                    Cyber Chess is a neon board duel against local machine personalities. Claim white or black, then
                    play directly on the 3D board while the agent answers with its own tempo, search style, and appetite
                    for risk.
                  </p>
                </div>
                <button type="button" className="cyber-start" onClick={() => setMenuStep('opponent')}>
                  CONTINUE
                </button>
              </div>
            )}

            {menuStep === 'opponent' && (
              <div className="menu-step">
                <div className="matchup-line">
                  YOU: {playerSideName} / {selected.name}: {agentSideName}
                </div>
                <div className="opponent-grid">
                  {OPPONENTS.map((opponent) => (
                    <button
                      key={opponent.id}
                      type="button"
                      className={'opponent-card' + (selectedId === opponent.id ? ' selected' : '')}
                      onClick={() => setSelectedId(opponent.id)}
                    >
                      <img src={opponent.avatar} alt="" />
                      <span className="opponent-name">{opponent.name}</span>
                      <span className="opponent-difficulty">{opponent.difficulty}</span>
                      <span className="opponent-tagline">{opponent.tagline}</span>
                      <span className="opponent-bio">{opponent.bio}</span>
                    </button>
                  ))}
                </div>
                <div className="intro-copy">
                  <p>
                    Goop is loose and messy, Frostd4d is controlled and tactical, and Razorblade is built to punish slow
                    plans. The board labels update to the matchup, so the side you choose is the side you command.
                  </p>
                </div>
                <div className="color-picker" role="group" aria-label="Choose your color">
                  <button type="button" onClick={() => setMenuStep('side')}>Back</button>
                  <button type="button" className="selected" onClick={startGame}>BEGIN</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === 'playing' && (
        <div className="cyber-hud">
          <img src={selected.avatar} alt="" />
          <div>
            <strong>{selected.name}</strong>
            <span>{thinking ? `${selected.name} (${agentSideName}) is thinking...` : gameState.status}</span>
          </div>
          <button type="button" onClick={resetGame}>Reset</button>
          <button type="button" onClick={openMenu}>Menu</button>
        </div>
      )}
    </>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);
