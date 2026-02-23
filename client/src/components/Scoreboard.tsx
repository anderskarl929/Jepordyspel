import { useAppStore } from '../store';
import './Scoreboard.css';

const EMPTY_PLAYERS: never[] = [];

interface Props {
  compact?: boolean;
}

export function Scoreboard({ compact = false }: Props) {
  const players = useAppStore((s) => s.game?.players ?? EMPTY_PLAYERS);
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className={`scoreboard ${compact ? 'scoreboard--compact' : ''}`}>
      {!compact && <h2 className="scoreboard__title">Scoreboard</h2>}
      <ol className="scoreboard__list">
        {sorted.map((player, i) => (
          <li
            key={player.id}
            className={`scoreboard__item ${!player.isConnected ? 'scoreboard__item--offline' : ''}`}
          >
            <span className="scoreboard__rank">{i + 1}</span>
            <span className="scoreboard__name">{player.nickname}</span>
            <span className="scoreboard__score" key={player.score}>
              {player.score.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
