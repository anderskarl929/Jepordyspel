import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { connectSocket, emitPlayerJoin, emitHostJoin } from '../services/socket';
import { fetchBoards, createGame, joinGame, type GameBoard } from '../services/api';
import './HomePage.css';

const NICKNAME_MAX = 20;
const ROOM_CODE_LENGTH = 6;

function sanitizeNickname(name: string): string {
  return name.replace(/[<>"'&]/g, '').trim().slice(0, NICKNAME_MAX);
}

export function HomePage() {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<'join' | 'host' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Board selection state for host flow
  const [boards, setBoards] = useState<GameBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [hostStep, setHostStep] = useState<'name' | 'board'>('name');

  const store = useAppStore();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeNickname(nickname);
    const cleanCode = roomCode.trim().toUpperCase();

    if (!cleanCode || cleanCode.length !== ROOM_CODE_LENGTH) {
      setError('Please enter a valid 6-character room code.');
      return;
    }
    if (!cleanName || cleanName.length < 1) {
      setError('Please enter a nickname.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const result = await joinGame(cleanCode, cleanName);
      connectSocket();
      store.setPlayer(result.player.id, cleanName);
      store.setRoomCode(result.game.room_code);
      store.setHost(false);
      emitPlayerJoin(result.game.room_code, result.player.id);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.message || 'Failed to join game.');
    } finally {
      setLoading(false);
    }
  };

  const handleHostNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeNickname(nickname);
    if (!cleanName || cleanName.length < 1) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const bds = await fetchBoards();
      if (bds.length === 0) {
        setError('No game boards available. Create one in the Admin page first.');
        return;
      }
      setBoards(bds);
      setSelectedBoardId(bds[0]!.id);
      setHostStep('board');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch boards.');
    } finally {
      setLoading(false);
    }
  };

  const handleHostCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoardId) {
      setError('Please select a board.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const cleanName = sanitizeNickname(nickname);
      const game = await createGame(selectedBoardId);
      connectSocket();
      store.setPlayer('', cleanName);
      store.setHost(true);
      store.setRoomCode(game.room_code);
      emitHostJoin(game.id);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.message || 'Failed to create game.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="home__hero">
        <h1 className="home__title">JEOPARDY!</h1>
        <p className="home__subtitle">Educational Quiz Game</p>
      </div>

      {!mode && (
        <div className="home__actions">
          <button className="btn btn--large" onClick={() => setMode('join')}>
            Join Game
          </button>
          <button
            className="btn btn--large btn--outline"
            onClick={() => setMode('host')}
          >
            Host Game
          </button>
          <button
            className="home__admin-link"
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
        </div>
      )}

      {mode === 'join' && (
        <form className="home__form" onSubmit={handleJoin}>
          <button
            type="button"
            className="home__back"
            onClick={() => setMode(null)}
            aria-label="Go back"
          >
            &larr; Back
          </button>
          <label className="home__label">
            Room Code
            <input
              className="home__input"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
              placeholder="e.g. 482917"
              maxLength={ROOM_CODE_LENGTH}
              autoFocus
              autoComplete="off"
            />
          </label>
          <label className="home__label">
            Your Name
            <input
              className="home__input"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter nickname"
              maxLength={NICKNAME_MAX}
              autoComplete="off"
            />
          </label>
          {error && <p className="home__error" role="alert">{error}</p>}
          <button className="btn btn--large" type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join'}
          </button>
        </form>
      )}

      {mode === 'host' && hostStep === 'name' && (
        <form className="home__form" onSubmit={handleHostNameSubmit}>
          <button
            type="button"
            className="home__back"
            onClick={() => setMode(null)}
            aria-label="Go back"
          >
            &larr; Back
          </button>
          <label className="home__label">
            Your Name
            <input
              className="home__input"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Teacher name"
              maxLength={NICKNAME_MAX}
              autoFocus
              autoComplete="off"
            />
          </label>
          {error && <p className="home__error" role="alert">{error}</p>}
          <button className="btn btn--large" type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Next'}
          </button>
        </form>
      )}

      {mode === 'host' && hostStep === 'board' && (
        <form className="home__form" onSubmit={handleHostCreateGame}>
          <button
            type="button"
            className="home__back"
            onClick={() => setHostStep('name')}
            aria-label="Go back"
          >
            &larr; Back
          </button>
          <p className="home__label">Select a Board</p>
          <div className="home__board-list">
            {boards.map((board) => (
              <label
                key={board.id}
                className={`home__board-option${selectedBoardId === board.id ? ' home__board-option--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="board"
                  value={board.id}
                  checked={selectedBoardId === board.id}
                  onChange={() => setSelectedBoardId(board.id)}
                  className="home__board-radio"
                />
                <span className="home__board-name">{board.name}</span>
              </label>
            ))}
          </div>
          {error && <p className="home__error" role="alert">{error}</p>}
          <button className="btn btn--large" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
      )}
    </div>
  );
}
