import { useAppStore } from '../store';
import { emitHostSelectQuestion } from '../services/socket';
import { QuestionCard } from './QuestionCard';
import { useSound } from '../hooks/useSound';
import './GameBoard.css';

const EMPTY_CATEGORIES: never[] = [];
const EMPTY_BOARD: never[] = [];

export function GameBoard() {
  const roomCode = useAppStore((s) => s.roomCode);
  const isHost = useAppStore((s) => s.isHost);
  const categories = useAppStore((s) => s.game?.categories ?? EMPTY_CATEGORIES);
  const board = useAppStore((s) => s.game?.board ?? EMPTY_BOARD);
  const phase = useAppStore((s) => s.game?.phase);
  const playSound = useSound();

  const handleSelect = (questionId: string) => {
    if (!roomCode || !isHost || phase !== 'BOARD') return;
    playSound('reveal');
    emitHostSelectQuestion(roomCode, questionId);
  };

  return (
    <div className="game-board" role="grid" aria-label="Jeopardy game board">
      {categories.map((cat, col) => (
        <div
          key={cat.id}
          className="game-board__header"
          role="columnheader"
          style={{ gridColumn: col + 1, gridRow: 1 }}
        >
          {cat.name}
        </div>
      ))}
      {board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <div
            key={`${rowIdx}-${colIdx}`}
            className="game-board__cell"
            role="gridcell"
            style={{
              gridColumn: colIdx + 1,
              gridRow: rowIdx + 2,
              '--cell-delay': `${(rowIdx * 6 + colIdx) * 40 + 500}ms`,
            } as React.CSSProperties}
            aria-label={`${categories[colIdx]?.name ?? ''} for ${cell.points} points${cell.revealed ? ', already answered' : ''}`}
          >
            <QuestionCard
              points={cell.points}
              revealed={cell.revealed}
              disabled={!isHost || phase !== 'BOARD'}
              onClick={() => handleSelect(cell.questionId)}
            />
          </div>
        ))
      )}
    </div>
  );
}
