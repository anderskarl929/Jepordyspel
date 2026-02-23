import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

const EMPTY_PLAYERS: never[] = [];
import { disconnectSocket } from '../services/socket';
import { Scoreboard } from '../components/Scoreboard';
import './ResultsPage.css';

const CONFETTI_COUNT = 20;

export function ResultsPage() {
  const players = useAppStore((s) => s.game?.players ?? EMPTY_PLAYERS);
  const resetGame = useAppStore((s) => s.resetGame);
  const navigate = useNavigate();

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);

  const handlePlayAgain = () => {
    resetGame();
    disconnectSocket();
    navigate('/');
  };

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="results">
      {/* Confetti */}
      <div className="results__confetti" aria-hidden="true">
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <h1 className="results__title">Game Over!</h1>

      {/* Trophy SVG */}
      <svg
        className="results__trophy"
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
      >
        <path d="M24 16h32v4c0 12-6 22-16 26-10-4-16-14-16-26v-4z" fill="#ffcc00" />
        <path d="M24 16h32v4c0 12-6 22-16 26-10-4-16-14-16-26v-4z" fill="url(#trophy-shine)" />
        <path d="M56 16h6c2 0 4 2 4 4v4c0 6-4 10-10 10v-4c3 0 6-2 6-6v-4h-6v-4z" fill="#d4a017" />
        <path d="M24 16h-6c-2 0-4 2-4 4v4c0 6 4 10 10 10v-4c-3 0-6-2-6-6v-4h6v-4z" fill="#d4a017" />
        <rect x="32" y="46" width="16" height="6" rx="1" fill="#b8860b" />
        <rect x="26" y="52" width="28" height="8" rx="3" fill="#d4a017" />
        <rect x="28" y="54" width="24" height="4" rx="2" fill="#ffcc00" />
        <defs>
          <linearGradient id="trophy-shine" x1="40" y1="16" x2="40" y2="46">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Podium */}
      {podiumOrder.length > 0 && (
        <div className="results__podium">
          {podiumOrder.map((player, i) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            return (
              <div key={player!.id} className="results__podium-spot">
                <span className="results__podium-name">{player!.nickname}</span>
                <span className="results__podium-score">
                  {player!.score.toLocaleString()} pts
                </span>
                <div className="results__podium-bar">
                  <span className="results__podium-rank">{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="results__scoreboard">
        <Scoreboard />
      </div>

      <div className="results__play-again">
        <button className="btn btn--large" onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
