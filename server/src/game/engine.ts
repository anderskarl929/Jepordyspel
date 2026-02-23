import { Server, Socket } from "socket.io";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";

// Game phases matching the state machine
type GamePhase =
  | "lobby"
  | "board"
  | "question_display"
  | "buzzer_open"
  | "answer_phase"
  | "reveal_answer"
  | "scoreboard"
  | "final_jeopardy"
  | "finished";

interface ActiveGame {
  sessionId: string;
  roomCode: string;
  boardId: string;
  phase: GamePhase;
  currentQuestionId: string | null;
  currentBuzzerId: string | null; // player who buzzed in
  buzzerQueue: { playerId: string; timestamp: number }[];
  buzzerOpen: boolean;
  answeredQuestions: Set<string>;
  timer: NodeJS.Timeout | null;
  timerEnd: number | null;
  hostSocketId: string | null;
}

// In-memory store for active games
const activeGames = new Map<string, ActiveGame>();

// Rate limiting for buzz events: track last buzz time per socket
const buzzRateLimit = new Map<string, number>();
const BUZZ_RATE_LIMIT_MS = 500; // Minimum 500ms between buzz attempts

const BUZZER_TIMEOUT_MS = 15000; // 15 seconds to buzz in
const ANSWER_TIMEOUT_MS = 20000; // 20 seconds to answer

function isValidRoomCode(code: unknown): code is string {
  return typeof code === "string" && /^[0-9]{6}$/.test(code);
}

function isValidUUID(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
}

export function setupGameEngine(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // --- HOST EVENTS ---

    // Host creates/starts managing a game session
    socket.on("host:join", ({ sessionId }: { sessionId: string }) => {
      if (!isValidUUID(sessionId)) {
        socket.emit("error", { message: "Invalid session ID" });
        return;
      }

      const db = getDb();
      const session = db
        .prepare("SELECT * FROM game_sessions WHERE id = ?")
        .get(sessionId) as any;

      if (!session) {
        socket.emit("error", { message: "Game session not found" });
        return;
      }

      const roomCode = session.room_code;
      socket.join(roomCode);

      let game = activeGames.get(roomCode);
      if (!game) {
        game = {
          sessionId: session.id,
          roomCode,
          boardId: session.board_id,
          phase: session.status as GamePhase,
          currentQuestionId: null,
          currentBuzzerId: null,
          buzzerQueue: [],
          buzzerOpen: false,
          answeredQuestions: new Set(),
          timer: null,
          timerEnd: null,
          hostSocketId: socket.id,
        };

        // Load already-answered questions
        const answered = db
          .prepare(
            "SELECT DISTINCT question_id FROM answers WHERE session_id = ?"
          )
          .all(session.id) as any[];
        answered.forEach((a) => game!.answeredQuestions.add(a.question_id));

        activeGames.set(roomCode, game);
      } else {
        game.hostSocketId = socket.id;
      }

      const players = db
        .prepare(
          "SELECT id, nickname, avatar, score, is_connected FROM players WHERE session_id = ?"
        )
        .all(session.id);

      socket.emit("game:state", {
        phase: game.phase,
        players,
        answeredQuestions: Array.from(game.answeredQuestions),
        roomCode,
        sessionId: session.id,
      });
    });

    // Host starts the game (moves from lobby to board)
    socket.on("host:start-game", ({ roomCode }: { roomCode: string }) => {
      const game = activeGames.get(roomCode);
      if (!game || game.hostSocketId !== socket.id) return;

      const db = getDb();
      game.phase = "board";
      db.prepare("UPDATE game_sessions SET status = 'active', started_at = datetime('now') WHERE id = ?").run(
        game.sessionId
      );

      io.to(roomCode).emit("game:phase-change", {
        phase: "board",
      });
    });

    // Host selects a question
    socket.on(
      "host:select-question",
      ({
        roomCode,
        questionId,
      }: {
        roomCode: string;
        questionId: string;
      }) => {
        const game = activeGames.get(roomCode);
        if (!game || game.hostSocketId !== socket.id) return;
        if (game.answeredQuestions.has(questionId)) return;

        const db = getDb();
        const question = db
          .prepare("SELECT * FROM questions WHERE id = ?")
          .get(questionId) as any;

        if (!question) return;

        game.phase = "question_display";
        game.currentQuestionId = questionId;
        game.currentBuzzerId = null;
        game.buzzerQueue = [];
        game.buzzerOpen = false;

        db.prepare(
          "UPDATE game_sessions SET current_question_id = ? WHERE id = ?"
        ).run(questionId, game.sessionId);

        // Send question to all (without correct answer to players)
        io.to(roomCode).emit("game:question", {
          questionId: question.id,
          question_text: question.question_text,
          points: question.points,
          category_id: question.category_id,
        });

        // Send correct answer only to host
        socket.emit("host:question-answer", {
          questionId: question.id,
          correct_answer: question.correct_answer,
          wrong_answers: JSON.parse(question.wrong_answers),
        });
      }
    );

    // Host opens the buzzer
    socket.on("host:open-buzzer", ({ roomCode }: { roomCode: string }) => {
      const game = activeGames.get(roomCode);
      if (!game || game.hostSocketId !== socket.id) return;

      game.phase = "buzzer_open";
      game.buzzerOpen = true;
      game.buzzerQueue = [];
      game.timerEnd = Date.now() + BUZZER_TIMEOUT_MS;

      io.to(roomCode).emit("game:buzzer-open", {
        timeout: BUZZER_TIMEOUT_MS,
      });

      // Auto-close buzzer after timeout
      if (game.timer) clearTimeout(game.timer);
      game.timer = setTimeout(() => {
        if (game.buzzerOpen) {
          game.buzzerOpen = false;
          game.phase = "reveal_answer";
          io.to(roomCode).emit("game:buzzer-timeout");

          // Reveal the answer
          const db = getDb();
          const question = db
            .prepare("SELECT * FROM questions WHERE id = ?")
            .get(game.currentQuestionId!) as any;

          if (question) {
            game.answeredQuestions.add(question.id);
            io.to(roomCode).emit("game:reveal-answer", {
              questionId: question.id,
              correct_answer: question.correct_answer,
              answeredBy: null,
              wasCorrect: false,
            });
          }
        }
      }, BUZZER_TIMEOUT_MS);
    });

    // Host judges an answer (correct/incorrect)
    socket.on(
      "host:judge-answer",
      ({
        roomCode,
        correct,
      }: {
        roomCode: string;
        correct: boolean;
      }) => {
        const game = activeGames.get(roomCode);
        if (!game || game.hostSocketId !== socket.id) return;
        if (!game.currentBuzzerId || !game.currentQuestionId) return;

        const db = getDb();
        const question = db
          .prepare("SELECT * FROM questions WHERE id = ?")
          .get(game.currentQuestionId) as any;

        if (!question) return;

        const pointsEarned = correct ? question.points : -question.points;

        // Update player score
        db.prepare("UPDATE players SET score = score + ? WHERE id = ?").run(
          pointsEarned,
          game.currentBuzzerId
        );

        // Record the answer
        db.prepare(
          `INSERT INTO answers (id, session_id, player_id, question_id, given_answer, is_correct, points_earned)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuid(),
          game.sessionId,
          game.currentBuzzerId,
          game.currentQuestionId,
          correct ? "correct" : "incorrect",
          correct ? 1 : 0,
          pointsEarned
        );

        const player = db
          .prepare("SELECT * FROM players WHERE id = ?")
          .get(game.currentBuzzerId) as any;

        if (correct) {
          // Mark question as answered and go to scoreboard
          game.answeredQuestions.add(game.currentQuestionId);
          game.phase = "reveal_answer";

          io.to(roomCode).emit("game:reveal-answer", {
            questionId: game.currentQuestionId,
            correct_answer: question.correct_answer,
            answeredBy: player
              ? { id: player.id, nickname: player.nickname }
              : null,
            wasCorrect: true,
            pointsEarned,
          });
        } else {
          // Wrong answer -- allow others to buzz in
          game.currentBuzzerId = null;
          game.buzzerOpen = true;
          game.phase = "buzzer_open";

          io.to(roomCode).emit("game:wrong-answer", {
            playerId: player?.id,
            nickname: player?.nickname,
            pointsLost: question.points,
          });

          // Check if someone else is in the queue
          const nextBuzzer = game.buzzerQueue.shift();
          if (nextBuzzer) {
            game.currentBuzzerId = nextBuzzer.playerId;
            game.buzzerOpen = false;
            game.phase = "answer_phase";

            const nextPlayer = db
              .prepare("SELECT * FROM players WHERE id = ?")
              .get(nextBuzzer.playerId) as any;

            io.to(roomCode).emit("game:buzzer-winner", {
              playerId: nextBuzzer.playerId,
              nickname: nextPlayer?.nickname,
              timeout: ANSWER_TIMEOUT_MS,
            });
          }
        }
      }
    );

    // Host moves to scoreboard
    socket.on("host:show-scoreboard", ({ roomCode }: { roomCode: string }) => {
      const game = activeGames.get(roomCode);
      if (!game || game.hostSocketId !== socket.id) return;

      game.phase = "scoreboard";
      game.currentQuestionId = null;
      game.currentBuzzerId = null;

      const db = getDb();
      const players = db
        .prepare(
          "SELECT id, nickname, avatar, score FROM players WHERE session_id = ? ORDER BY score DESC"
        )
        .all(game.sessionId);

      io.to(roomCode).emit("game:scoreboard", { players });
    });

    // Host returns to the board
    socket.on("host:back-to-board", ({ roomCode }: { roomCode: string }) => {
      const game = activeGames.get(roomCode);
      if (!game || game.hostSocketId !== socket.id) return;

      game.phase = "board";
      io.to(roomCode).emit("game:phase-change", {
        phase: "board",
        answeredQuestions: Array.from(game.answeredQuestions),
      });
    });

    // Host ends the game
    socket.on("host:end-game", ({ roomCode }: { roomCode: string }) => {
      const game = activeGames.get(roomCode);
      if (!game || game.hostSocketId !== socket.id) return;

      const db = getDb();
      game.phase = "finished";
      if (game.timer) clearTimeout(game.timer);

      db.prepare(
        "UPDATE game_sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ?"
      ).run(game.sessionId);

      const players = db
        .prepare(
          "SELECT id, nickname, avatar, score FROM players WHERE session_id = ? ORDER BY score DESC"
        )
        .all(game.sessionId);

      io.to(roomCode).emit("game:finished", { players });
      activeGames.delete(roomCode);
    });

    // --- PLAYER EVENTS ---

    // Player joins a game room
    socket.on(
      "player:join",
      ({
        roomCode,
        playerId,
      }: {
        roomCode: string;
        playerId: string;
      }) => {
        const game = activeGames.get(roomCode);
        if (!game) {
          socket.emit("error", { message: "Game not found or not started" });
          return;
        }

        const db = getDb();
        const player = db
          .prepare("SELECT * FROM players WHERE id = ? AND session_id = ?")
          .get(playerId, game.sessionId) as any;

        if (!player) {
          socket.emit("error", { message: "Player not found in this game" });
          return;
        }

        // Update player connection state
        db.prepare(
          "UPDATE players SET is_connected = 1, socket_id = ? WHERE id = ?"
        ).run(socket.id, playerId);

        socket.join(roomCode);
        socket.data.playerId = playerId;
        socket.data.roomCode = roomCode;

        // Notify everyone
        io.to(roomCode).emit("player:joined", {
          id: player.id,
          nickname: player.nickname,
          avatar: player.avatar,
          score: player.score,
        });

        // Send current game state to the joining player
        const players = db
          .prepare(
            "SELECT id, nickname, avatar, score, is_connected FROM players WHERE session_id = ?"
          )
          .all(game.sessionId);

        socket.emit("game:state", {
          phase: game.phase,
          players,
          answeredQuestions: Array.from(game.answeredQuestions),
          roomCode,
          sessionId: game.sessionId,
        });
      }
    );

    // Player buzzes in
    socket.on("player:buzz", ({ roomCode }: { roomCode: string }) => {
      if (!isValidRoomCode(roomCode)) return;

      const game = activeGames.get(roomCode);
      if (!game || !game.buzzerOpen) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Rate limit: prevent buzz spam
      const now = Date.now();
      const lastBuzz = buzzRateLimit.get(socket.id) ?? 0;
      if (now - lastBuzz < BUZZ_RATE_LIMIT_MS) return;
      buzzRateLimit.set(socket.id, now);

      // Check if this player already buzzed
      if (
        game.currentBuzzerId === playerId ||
        game.buzzerQueue.some((b) => b.playerId === playerId)
      ) {
        return;
      }

      const timestamp = Date.now();

      if (!game.currentBuzzerId) {
        // First buzzer -- they get to answer
        game.currentBuzzerId = playerId;
        game.buzzerOpen = false;
        game.phase = "answer_phase";
        if (game.timer) clearTimeout(game.timer);

        const db = getDb();
        const player = db
          .prepare("SELECT * FROM players WHERE id = ?")
          .get(playerId) as any;

        io.to(roomCode).emit("game:buzzer-winner", {
          playerId,
          nickname: player?.nickname,
          timeout: ANSWER_TIMEOUT_MS,
        });
      } else {
        // Queue up for potential second chance
        game.buzzerQueue.push({ playerId, timestamp });
        socket.emit("player:buzz-queued");
      }
    });

    // Player submits an answer (for multiple-choice mode)
    socket.on(
      "player:answer",
      ({
        roomCode,
        answer,
      }: {
        roomCode: string;
        answer: string;
      }) => {
        const game = activeGames.get(roomCode);
        if (!game) return;

        const playerId = socket.data.playerId;
        if (!playerId || game.currentBuzzerId !== playerId) return;
        if (!game.currentQuestionId) return;

        const db = getDb();
        const question = db
          .prepare("SELECT * FROM questions WHERE id = ?")
          .get(game.currentQuestionId) as any;

        if (!question) return;

        const isCorrect =
          answer.toLowerCase().trim() ===
          question.correct_answer.toLowerCase().trim();
        const pointsEarned = isCorrect ? question.points : -question.points;

        // Update player score
        db.prepare("UPDATE players SET score = score + ? WHERE id = ?").run(
          pointsEarned,
          playerId
        );

        // Record the answer
        db.prepare(
          `INSERT INTO answers (id, session_id, player_id, question_id, given_answer, is_correct, points_earned)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuid(),
          game.sessionId,
          playerId,
          game.currentQuestionId,
          answer,
          isCorrect ? 1 : 0,
          pointsEarned
        );

        const player = db
          .prepare("SELECT * FROM players WHERE id = ?")
          .get(playerId) as any;

        // Emit answer result to the host
        io.to(roomCode).emit("player:answered", {
          playerId,
          nickname: player?.nickname,
          answer,
          isCorrect,
          pointsEarned,
        });
      }
    );

    // --- DISCONNECT ---

    socket.on("disconnect", () => {
      buzzRateLimit.delete(socket.id);
      const { playerId, roomCode } = socket.data;

      if (playerId && roomCode) {
        const db = getDb();
        db.prepare(
          "UPDATE players SET is_connected = 0, socket_id = NULL WHERE id = ?"
        ).run(playerId);

        io.to(roomCode).emit("player:disconnected", { playerId });
      }

      // If host disconnects, mark it
      for (const [code, game] of activeGames.entries()) {
        if (game.hostSocketId === socket.id) {
          game.hostSocketId = null;
          io.to(code).emit("host:disconnected");
        }
      }

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
