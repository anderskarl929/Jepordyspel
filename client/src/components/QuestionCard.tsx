import './QuestionCard.css';

interface Props {
  points: number;
  revealed: boolean;
  onClick: () => void;
  disabled: boolean;
}

export function QuestionCard({ points, revealed, onClick, disabled }: Props) {
  return (
    <button
      className={`qcard ${revealed ? 'qcard--revealed' : ''}`}
      onClick={onClick}
      disabled={disabled || revealed}
      aria-label={revealed ? 'Already answered' : `${points} points`}
    >
      <div className="qcard__inner">
        <div className="qcard__front">
          <span className="qcard__points">{points}</span>
        </div>
        <div className="qcard__back" />
      </div>
    </button>
  );
}
