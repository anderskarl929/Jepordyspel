import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store';
import { fetchGame } from './api';
import type { Category, BoardCell } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
    setupListeners(socket);
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function setupListeners(s: Socket): void {
  const store = useAppStore.getState;
  const set = useAppStore.setState;

  s.on('connect', () => {
    set({ connected: true });
  });

  s.on('disconnect', () => {
    set({ connected: false });
  });

  // Backend emits 'game:state' with full game state
  s.on('game:state', (data: {
    phase: string;
    players: Array<{ id: string; nickname: string; avatar?: string; score: number; is_connected: number }>;
    answeredQuestions: string[];
    roomCode: string;
    sessionId: string;
  }) => {
    const state = store();
    const mappedPlayers = data.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      isConnected: Boolean(p.is_connected),
    }));
    const phase = mapBackendPhase(data.phase);
    if (state.game) {
      state.updatePlayers(mappedPlayers);
      state.updatePhase(phase);
    } else {
      state.setGameState({
        roomCode: data.roomCode,
        phase,
        players: mappedPlayers,
        categories: [],
        board: [],
        currentQuestion: null,
        currentPlayerId: null,
        buzzedPlayerId: null,
        answerResult: null,
        timerSeconds: 0,
        timerRunning: false,
        hostId: '',
      });
    }

    // Load board data if we're already past lobby
    if (phase !== 'LOBBY') {
      loadBoardData(data.roomCode, data.answeredQuestions ?? []);
    }
  });

  // Backend emits 'game:phase-change'
  s.on('game:phase-change', (data: { phase: string; answeredQuestions?: string[] }) => {
    store().updatePhase(mapBackendPhase(data.phase));
    if (data.phase === 'board') {
      store().updateCurrentQuestion(null);
      store().updateBuzzedPlayer(null);
      store().updateAnswerResult(null);

      // Fetch board data via REST when game moves to board phase
      const roomCode = store().roomCode;
      if (roomCode) {
        loadBoardData(roomCode, data.answeredQuestions ?? []);
      }
    }
  });

  // Backend emits 'player:joined'
  s.on('player:joined', (data: { id: string; nickname: string; avatar?: string; score: number }) => {
    const state = store();
    if (!state.game) return;
    const exists = state.game.players.some((p) => p.id === data.id);
    if (exists) {
      state.updatePlayers(
        state.game.players.map((p) =>
          p.id === data.id ? { ...p, isConnected: true } : p
        )
      );
    } else {
      state.updatePlayers([
        ...state.game.players,
        { id: data.id, nickname: data.nickname, score: data.score, isConnected: true },
      ]);
    }
  });

  // Backend emits 'player:disconnected'
  s.on('player:disconnected', (data: { playerId: string }) => {
    const state = store();
    if (!state.game) return;
    state.updatePlayers(
      state.game.players.map((p) =>
        p.id === data.playerId ? { ...p, isConnected: false } : p
      )
    );
  });

  // Backend emits 'game:question' (question text to all players, no answer)
  s.on('game:question', (data: {
    questionId: string;
    question_text: string;
    points: number;
    category_id: string;
  }) => {
    store().updateCurrentQuestion({
      id: data.questionId,
      categoryId: data.category_id,
      questionText: data.question_text,
      correctAnswer: '',
      wrongAnswers: [],
      points: data.points,
    });
    store().updatePhase('QUESTION_DISPLAY');
    store().updateBuzzedPlayer(null);
    store().updateAnswerResult(null);
  });

  // Backend emits 'host:question-answer' (correct answer to host only)
  s.on('host:question-answer', (data: {
    questionId: string;
    correct_answer: string;
    wrong_answers: string[];
  }) => {
    const state = store();
    if (state.game?.currentQuestion?.id === data.questionId) {
      state.updateCurrentQuestion({
        ...state.game.currentQuestion,
        correctAnswer: data.correct_answer,
        wrongAnswers: data.wrong_answers,
      });
    }
  });

  // Backend emits 'game:buzzer-open'
  s.on('game:buzzer-open', (data: { timeout: number }) => {
    store().updatePhase('BUZZER_OPEN');
    store().updateTimer(Math.ceil(data.timeout / 1000), true);
  });

  // Backend emits 'game:buzzer-winner'
  s.on('game:buzzer-winner', (data: {
    playerId: string;
    nickname: string;
    timeout: number;
  }) => {
    store().updateBuzzedPlayer(data.playerId);
    store().updatePhase('ANSWER_PHASE');
    store().updateTimer(Math.ceil(data.timeout / 1000), true);
  });

  // Backend emits 'game:buzzer-timeout'
  s.on('game:buzzer-timeout', () => {
    store().updateTimer(0, false);
  });

  // Backend emits 'game:reveal-answer'
  s.on('game:reveal-answer', (data: {
    questionId: string;
    correct_answer: string;
    answeredBy: { id: string; nickname: string } | null;
    wasCorrect: boolean;
    pointsEarned?: number;
  }) => {
    store().updateAnswerResult({
      playerId: data.answeredBy?.id ?? '',
      playerName: data.answeredBy?.nickname ?? 'No one',
      answer: data.wasCorrect ? data.correct_answer : '',
      correct: data.wasCorrect,
      correctAnswer: data.correct_answer,
      pointsAwarded: data.pointsEarned ?? 0,
    });
    store().updatePhase('REVEAL_ANSWER');
    store().updateTimer(0, false);

    // Mark the question as revealed on the board
    const currentBoard = store().game?.board;
    if (currentBoard) {
      const newBoard = currentBoard.map((row) =>
        row.map((cell) =>
          cell.questionId === data.questionId ? { ...cell, revealed: true } : cell
        )
      );
      store().updateBoard(newBoard);
    }
  });

  // Backend emits 'game:wrong-answer'
  s.on('game:wrong-answer', (data: {
    playerId: string;
    nickname: string;
    pointsLost: number;
  }) => {
    const state = store();
    if (!state.game) return;
    state.updatePlayers(
      state.game.players.map((p) =>
        p.id === data.playerId ? { ...p, score: p.score - data.pointsLost } : p
      )
    );
    store().updateBuzzedPlayer(null);
    store().updatePhase('BUZZER_OPEN');
  });

  // Backend emits 'player:answered'
  s.on('player:answered', (data: {
    playerId: string;
    nickname: string;
    answer: string;
    isCorrect: boolean;
    pointsEarned: number;
  }) => {
    const state = store();
    if (!state.game) return;
    state.updatePlayers(
      state.game.players.map((p) =>
        p.id === data.playerId ? { ...p, score: p.score + data.pointsEarned } : p
      )
    );
  });

  // Backend emits 'game:scoreboard'
  s.on('game:scoreboard', (data: {
    players: Array<{ id: string; nickname: string; avatar?: string; score: number }>;
  }) => {
    store().updatePlayers(
      data.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        isConnected: true,
      }))
    );
    store().updatePhase('SCOREBOARD');
  });

  // Backend emits 'game:finished'
  s.on('game:finished', (data: {
    players: Array<{ id: string; nickname: string; avatar?: string; score: number }>;
  }) => {
    store().updatePlayers(
      data.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        isConnected: true,
      }))
    );
    store().updatePhase('FINAL_RESULTS');
  });

  // Backend emits 'host:disconnected'
  s.on('host:disconnected', () => {
    // Could show a warning to players
  });

  // Backend emits 'player:buzz-queued'
  s.on('player:buzz-queued', () => {
    // Player is in queue, buzz was accepted
  });

  // Error handling
  s.on('error', (data: { message: string }) => {
    console.error('Socket error:', data.message);
  });
}

async function loadBoardData(roomCode: string, answeredQuestions: string[]): Promise<void> {
  try {
    const gameData = await fetchGame(roomCode);
    const state = useAppStore.getState();
    const answeredSet = new Set(answeredQuestions);

    // Parse categories
    const categories: Category[] = gameData.board.categories.map(
      (cat: { name: string; color: string; questions: any[] }, idx: number) => ({
        id: `cat-${idx}`,
        name: cat.name,
      })
    );

    // Parse board cells (rows = point levels, cols = categories)
    const numRows = gameData.board.categories[0]?.questions?.length ?? 0;
    const numCols = gameData.board.categories.length;
    const board: BoardCell[][] = [];
    for (let row = 0; row < numRows; row++) {
      const boardRow: BoardCell[] = [];
      for (let col = 0; col < numCols; col++) {
        const q = gameData.board.categories[col]?.questions?.[row];
        if (q) {
          boardRow.push({
            questionId: q.id,
            categoryId: `cat-${col}`,
            points: q.points,
            revealed: answeredSet.has(q.id) || q.answered === true,
          });
        }
      }
      board.push(boardRow);
    }

    state.updateCategories(categories);
    state.updateBoard(board);
  } catch (err) {
    console.error('Failed to load board data:', err);
  }
}

function mapBackendPhase(phase: string): import('../types').GamePhase {
  const phaseMap: Record<string, import('../types').GamePhase> = {
    lobby: 'LOBBY',
    board: 'BOARD',
    question_display: 'QUESTION_DISPLAY',
    buzzer_open: 'BUZZER_OPEN',
    answer_phase: 'ANSWER_PHASE',
    reveal_answer: 'REVEAL_ANSWER',
    scoreboard: 'SCOREBOARD',
    final_jeopardy: 'FINAL_RESULTS',
    finished: 'FINAL_RESULTS',
  };
  return phaseMap[phase] ?? 'LOBBY';
}

// --- Emit functions matching backend event names ---

export function emitHostJoin(sessionId: string): void {
  getSocket().emit('host:join', { sessionId });
}

export function emitHostStartGame(roomCode: string): void {
  getSocket().emit('host:start-game', { roomCode });
}

export function emitHostSelectQuestion(roomCode: string, questionId: string): void {
  getSocket().emit('host:select-question', { roomCode, questionId });
}

export function emitHostOpenBuzzer(roomCode: string): void {
  getSocket().emit('host:open-buzzer', { roomCode });
}

export function emitHostJudgeAnswer(roomCode: string, correct: boolean): void {
  getSocket().emit('host:judge-answer', { roomCode, correct });
}

export function emitHostShowScoreboard(roomCode: string): void {
  getSocket().emit('host:show-scoreboard', { roomCode });
}

export function emitHostBackToBoard(roomCode: string): void {
  getSocket().emit('host:back-to-board', { roomCode });
}

export function emitHostEndGame(roomCode: string): void {
  getSocket().emit('host:end-game', { roomCode });
}

export function emitPlayerJoin(roomCode: string, playerId: string): void {
  getSocket().emit('player:join', { roomCode, playerId });
}

export function emitPlayerBuzz(roomCode: string): void {
  getSocket().emit('player:buzz', { roomCode });
}

export function emitPlayerAnswer(roomCode: string, answer: string): void {
  getSocket().emit('player:answer', { roomCode, answer });
}
