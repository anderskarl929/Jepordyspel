export interface Player {
  id: string;
  nickname: string;
  score: number;
  isConnected: boolean;
}

export interface Question {
  id: string;
  categoryId: string;
  questionText: string;
  correctAnswer: string;
  wrongAnswers: string[];
  points: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface BoardCell {
  questionId: string;
  categoryId: string;
  points: number;
  revealed: boolean;
}

export type GamePhase =
  | 'LOBBY'
  | 'BOARD'
  | 'QUESTION_DISPLAY'
  | 'BUZZER_OPEN'
  | 'ANSWER_PHASE'
  | 'REVEAL_ANSWER'
  | 'SCOREBOARD'
  | 'FINAL_RESULTS';

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  categories: Category[];
  board: BoardCell[][];
  currentQuestion: Question | null;
  currentPlayerId: string | null;
  buzzedPlayerId: string | null;
  answerResult: AnswerResult | null;
  timerSeconds: number;
  timerRunning: boolean;
  hostId: string;
}

export interface AnswerResult {
  playerId: string;
  playerName: string;
  answer: string;
  correct: boolean;
  correctAnswer: string;
  pointsAwarded: number;
}

export interface JoinGamePayload {
  roomCode: string;
  nickname: string;
}

export interface BuzzPayload {
  roomCode: string;
  playerId: string;
}

export interface SubmitAnswerPayload {
  roomCode: string;
  playerId: string;
  answer: string;
}

export interface SelectQuestionPayload {
  roomCode: string;
  row: number;
  col: number;
}
