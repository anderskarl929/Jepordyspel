import { useState } from 'react';
import { useAppStore } from '../store';

const EMPTY_PLAYERS: never[] = [];
import { emitPlayerAnswer, emitHostOpenBuzzer, emitHostJudgeAnswer } from '../services/socket';
import { Timer } from './Timer';
import { BuzzerButton } from './BuzzerButton';
import './QuestionView.css';

export function QuestionView() {
  const roomCode = useAppStore((s) => s.roomCode);
  const playerId = useAppStore((s) => s.playerId);
  const isHost = useAppStore((s) => s.isHost);
  const question = useAppStore((s) => s.game?.currentQuestion);
  const buzzedPlayerId = useAppStore((s) => s.game?.buzzedPlayerId);
  const phase = useAppStore((s) => s.game?.phase);
  const players = useAppStore((s) => s.game?.players ?? EMPTY_PLAYERS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  if (!question) return null;

  const isBuzzedPlayer = buzzedPlayerId === playerId;
  const buzzedPlayer = players.find((p) => p.id === buzzedPlayerId);

  const handleOpenBuzzer = () => {
    if (!roomCode || !isHost) return;
    emitHostOpenBuzzer(roomCode);
  };

  const handleSubmitAnswer = (answer: string) => {
    if (!roomCode || !isBuzzedPlayer) return;
    setSelectedAnswer(answer);
    emitPlayerAnswer(roomCode, answer);
  };

  const handleJudge = (correct: boolean) => {
    if (!roomCode || !isHost) return;
    emitHostJudgeAnswer(roomCode, correct);
  };

  return (
    <div className="question-view" role="dialog" aria-label="Current question">
      <div className="question-view__points">{question.points} points</div>
      <Timer />
      <p className="question-view__text">{question.questionText}</p>

      {/* Host sees the question and can open the buzzer */}
      {phase === 'QUESTION_DISPLAY' && isHost && (
        <div className="question-view__host-controls">
          <button className="btn btn--large" onClick={handleOpenBuzzer}>
            Open Buzzer
          </button>
        </div>
      )}

      {/* Players see the buzzer when it's open */}
      {phase === 'BUZZER_OPEN' && !isHost && (
        <div className="question-view__buzzer-area">
          <BuzzerButton />
        </div>
      )}

      {/* Host waits for buzzes */}
      {phase === 'BUZZER_OPEN' && isHost && !buzzedPlayerId && (
        <p className="question-view__waiting">
          Buzzer is open -- waiting for players...
        </p>
      )}

      {/* Someone buzzed in */}
      {buzzedPlayerId && phase === 'ANSWER_PHASE' && (
        <div className="question-view__answer-area">
          <p className="question-view__buzzed">
            {buzzedPlayer?.nickname ?? 'Unknown'} buzzed in!
          </p>

          {/* The buzzed player answers (if we have answer choices) */}
          {isBuzzedPlayer && question.wrongAnswers.length > 0 && (
            <div className="question-view__choices">
              {[...question.wrongAnswers, question.correctAnswer]
                .sort()
                .map((a) => (
                  <button
                    key={a}
                    className={`question-view__choice ${selectedAnswer === a ? 'question-view__choice--selected' : ''}`}
                    onClick={() => handleSubmitAnswer(a)}
                    disabled={selectedAnswer !== null}
                  >
                    {a}
                  </button>
                ))}
            </div>
          )}

          {/* Host can judge the answer */}
          {isHost && (
            <div className="question-view__judge">
              <p className="question-view__judge-hint">
                Correct answer: <strong>{question.correctAnswer}</strong>
              </p>
              <div className="question-view__judge-buttons">
                <button className="btn" onClick={() => handleJudge(true)}>
                  Correct
                </button>
                <button className="btn btn--outline" onClick={() => handleJudge(false)}>
                  Wrong
                </button>
              </div>
            </div>
          )}

          {!isBuzzedPlayer && !isHost && (
            <p className="question-view__wait-turn">
              Waiting for {buzzedPlayer?.nickname} to answer...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
