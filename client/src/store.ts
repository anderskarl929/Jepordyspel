import { create } from 'zustand';
import type { GameState, GamePhase, Player, Category, BoardCell, Question, AnswerResult } from './types';

interface AppState {
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  roomCode: string | null;
  connected: boolean;

  game: GameState | null;

  setPlayer: (id: string, name: string) => void;
  setHost: (isHost: boolean) => void;
  setRoomCode: (code: string) => void;
  setConnected: (connected: boolean) => void;
  setGameState: (state: GameState) => void;
  updatePhase: (phase: GamePhase) => void;
  updatePlayers: (players: Player[]) => void;
  updateBoard: (board: BoardCell[][]) => void;
  updateCurrentQuestion: (question: Question | null) => void;
  updateBuzzedPlayer: (playerId: string | null) => void;
  updateAnswerResult: (result: AnswerResult | null) => void;
  updateTimer: (seconds: number, running: boolean) => void;
  updateCategories: (categories: Category[]) => void;
  resetGame: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  playerId: null,
  playerName: null,
  isHost: false,
  roomCode: null,
  connected: false,
  game: null,

  setPlayer: (id, name) => set({ playerId: id, playerName: name }),
  setHost: (isHost) => set({ isHost }),
  setRoomCode: (code) => set({ roomCode: code }),
  setConnected: (connected) => set({ connected }),

  setGameState: (state) => set({ game: state }),

  updatePhase: (phase) =>
    set((s) => (s.game ? { game: { ...s.game, phase } } : {})),

  updatePlayers: (players) =>
    set((s) => (s.game ? { game: { ...s.game, players } } : {})),

  updateBoard: (board) =>
    set((s) => (s.game ? { game: { ...s.game, board } } : {})),

  updateCurrentQuestion: (question) =>
    set((s) =>
      s.game ? { game: { ...s.game, currentQuestion: question } } : {}
    ),

  updateBuzzedPlayer: (playerId) =>
    set((s) =>
      s.game ? { game: { ...s.game, buzzedPlayerId: playerId } } : {}
    ),

  updateAnswerResult: (result) =>
    set((s) =>
      s.game ? { game: { ...s.game, answerResult: result } } : {}
    ),

  updateTimer: (seconds, running) =>
    set((s) =>
      s.game
        ? { game: { ...s.game, timerSeconds: seconds, timerRunning: running } }
        : {}
    ),

  updateCategories: (categories) =>
    set((s) => (s.game ? { game: { ...s.game, categories } } : {})),

  resetGame: () =>
    set({
      playerId: null,
      playerName: null,
      isHost: false,
      roomCode: null,
      game: null,
    }),
}));
