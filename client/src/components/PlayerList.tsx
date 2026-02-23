import { useAppStore } from '../store';
import './PlayerList.css';

const EMPTY_PLAYERS: never[] = [];

export function PlayerList() {
  const players = useAppStore((s) => s.game?.players ?? EMPTY_PLAYERS);

  return (
    <div className="player-list">
      <h3 className="player-list__title">
        Players ({players.length})
      </h3>
      <ul className="player-list__items">
        {players.map((p) => (
          <li
            key={p.id}
            className={`player-list__item ${p.isConnected ? '' : 'player-list__item--offline'}`}
          >
            <span className="player-list__avatar">{p.nickname.charAt(0)}</span>
            <span
              className={`player-list__dot ${p.isConnected ? 'player-list__dot--online' : ''}`}
              aria-label={p.isConnected ? 'Connected' : 'Disconnected'}
            />
            {p.nickname}
          </li>
        ))}
        {players.length === 0 && (
          <li className="player-list__empty">Waiting for players...</li>
        )}
      </ul>
    </div>
  );
}
