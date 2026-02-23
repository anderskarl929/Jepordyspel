import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { emitHostBackToBoard, emitHostShowScoreboard } from '../services/socket';
import { GameBoard } from '../components/GameBoard';
import { QuestionView } from '../components/QuestionView';
import { AnswerReveal } from '../components/AnswerReveal';
import { Scoreboard } from '../components/Scoreboard';
import './GamePage.css';

export function GamePage() {
  const phase = useAppStore((s) => s.game?.phase);
  const roomCode = useAppStore((s) => s.roomCode);
  const isHost = useAppStore((s) => s.isHost);
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
    }
  }, [roomCode, navigate]);

  useEffect(() => {
    if (phase === 'FINAL_RESULTS') {
      navigate('/results');
    }
  }, [phase, navigate]);

  const handleShowScoreboard = () => {
    if (roomCode) emitHostShowScoreboard(roomCode);
  };

  const handleBackToBoard = () => {
    if (roomCode) emitHostBackToBoard(roomCode);
  };

  return (
    <div className="game-page">
      <header className="game-page__header">
        <h1 className="game-page__logo">JEOPARDY!</h1>
        <div className="game-page__scores">
          <Scoreboard compact />
        </div>
      </header>

      <main className="game-page__main">
        <div className="game-page__phase" key={phase}>
          {phase === 'BOARD' && <GameBoard />}

          {(phase === 'QUESTION_DISPLAY' || phase === 'BUZZER_OPEN' || phase === 'ANSWER_PHASE') && (
            <QuestionView />
          )}

          {phase === 'REVEAL_ANSWER' && <AnswerReveal onNext={handleShowScoreboard} />}

          {phase === 'SCOREBOARD' && (
            <div className="game-page__scoreboard-view">
              <Scoreboard />
              {isHost && roomCode && (
                <button
                  className="btn btn--large"
                  onClick={handleBackToBoard}
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
