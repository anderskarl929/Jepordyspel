import { useAppStore } from '../store';
import { useSound } from '../hooks/useSound';
import { useEffect } from 'react';
import './AnswerReveal.css';

interface Props {
  onNext?: () => void;
}

export function AnswerReveal({ onNext }: Props) {
  const isHost = useAppStore((s) => s.isHost);
  const result = useAppStore((s) => s.game?.answerResult);
  const playSound = useSound();

  useEffect(() => {
    if (result) {
      playSound(result.correct ? 'correct' : 'incorrect');
    }
  }, [result, playSound]);

  if (!result) return null;

  return (
    <div className={`answer-reveal ${result.correct ? 'answer-reveal--correct' : 'answer-reveal--wrong'}`} aria-live="polite">
      <div
        className={`answer-reveal__badge ${result.correct ? 'answer-reveal__badge--correct' : 'answer-reveal__badge--wrong'}`}
      >
        {result.correct ? 'CORRECT!' : 'WRONG!'}
      </div>
      {result.playerName && result.playerName !== 'No one' && (
        <p className="answer-reveal__player">
          {result.playerName} answered: <strong>{result.answer}</strong>
        </p>
      )}
      {!result.correct && (
        <p className="answer-reveal__correct-answer">
          Correct answer: <strong>{result.correctAnswer}</strong>
        </p>
      )}
      <p
        className={`answer-reveal__points ${result.pointsAwarded >= 0 ? 'answer-reveal__points--positive' : 'answer-reveal__points--negative'}`}
      >
        {result.pointsAwarded >= 0 ? '+' : ''}
        {result.pointsAwarded} points
      </p>
      {isHost && onNext && (
        <button
          className="answer-reveal__next btn"
          onClick={onNext}
        >
          Show Scoreboard
        </button>
      )}
    </div>
  );
}
