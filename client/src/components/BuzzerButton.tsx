import { useAppStore } from '../store';
import { emitPlayerBuzz } from '../services/socket';
import { useSound } from '../hooks/useSound';
import './BuzzerButton.css';

export function BuzzerButton() {
  const roomCode = useAppStore((s) => s.roomCode);
  const playerId = useAppStore((s) => s.playerId);
  const buzzedPlayerId = useAppStore((s) => s.game?.buzzedPlayerId);
  const phase = useAppStore((s) => s.game?.phase);
  const playSound = useSound();

  const canBuzz =
    phase === 'BUZZER_OPEN' && !buzzedPlayerId && roomCode && playerId;

  const handleBuzz = () => {
    if (!canBuzz || !roomCode) return;
    playSound('buzz');
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    emitPlayerBuzz(roomCode);
  };

  const isMeBuzzed = buzzedPlayerId === playerId;

  return (
    <button
      className={`buzzer ${canBuzz ? 'buzzer--active' : ''} ${isMeBuzzed ? 'buzzer--mine' : ''}`}
      onClick={handleBuzz}
      disabled={!canBuzz}
      aria-label="Buzz in to answer"
    >
      {isMeBuzzed ? 'YOU BUZZED!' : buzzedPlayerId ? 'WAIT...' : 'BUZZ!'}
    </button>
  );
}
