import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

const EMPTY_PLAYERS: never[] = [];
import { emitHostStartGame } from '../services/socket';
import { PlayerList } from '../components/PlayerList';
import './LobbyPage.css';

export function LobbyPage() {
  const roomCode = useAppStore((s) => s.roomCode);
  const isHost = useAppStore((s) => s.isHost);
  const phase = useAppStore((s) => s.game?.phase);
  const players = useAppStore((s) => s.game?.players ?? EMPTY_PLAYERS);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (phase && phase !== 'LOBBY') {
      navigate('/game');
    }
  }, [phase, navigate]);

  const handleStart = () => {
    if (roomCode) {
      emitHostStartGame(roomCode);
    }
  };

  const handleCopy = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: clipboard API might not be available
    }
  };

  return (
    <div className="lobby">
      <h1 className="lobby__title">Game Lobby</h1>
      {roomCode && (
        <div className="lobby__code-block">
          <span className="lobby__code-label">Room Code</span>
          <span className="lobby__code">{roomCode}</span>
          <p className="lobby__code-hint">
            Share this code with players to join
          </p>
          <button
            className={`lobby__copy-btn ${copied ? 'lobby__copy-btn--copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      )}

      <PlayerList />

      {isHost && (
        <button
          className="btn btn--large lobby__start"
          onClick={handleStart}
          disabled={players.length < 1}
        >
          Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
        </button>
      )}

      {!isHost && (
        <p className="lobby__waiting">Waiting for the host to start...</p>
      )}
    </div>
  );
}
