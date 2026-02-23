import { Router } from "express";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";

const router = Router();

function generateRoomCode(): string {
  const crypto = require("crypto");
  const bytes = crypto.randomBytes(3);
  const num = (bytes[0] * 65536 + bytes[1] * 256 + bytes[2]) % 900000 + 100000;
  return num.toString();
}

// GET /api/games - List active games
router.get("/", (_req, res) => {
  const db = getDb();
  const games = db
    .prepare(
      `SELECT gs.*, gb.name as board_name, COUNT(p.id) as player_count
       FROM game_sessions gs
       JOIN game_boards gb ON gb.id = gs.board_id
       LEFT JOIN players p ON p.session_id = gs.id
       WHERE gs.status != 'finished'
       GROUP BY gs.id
       ORDER BY gs.created_at DESC`
    )
    .all();
  res.json(games);
});

// GET /api/games/boards - List available game boards
router.get("/boards", (_req, res) => {
  const db = getDb();
  const boards = db
    .prepare(
      `SELECT gb.*,
         (SELECT COUNT(*) FROM board_questions bq WHERE bq.board_id = gb.id) as question_count
       FROM game_boards gb
       ORDER BY gb.name`
    )
    .all();
  res.json(boards);
});

// POST /api/games - Create a new game
router.post("/", (req, res) => {
  const db = getDb();
  const { board_id } = req.body;

  if (!board_id) {
    return res.status(400).json({ error: "board_id is required" });
  }

  const board = db
    .prepare("SELECT * FROM game_boards WHERE id = ?")
    .get(board_id);
  if (!board) {
    return res.status(400).json({ error: "Invalid board_id" });
  }

  const id = uuid();
  let roomCode = generateRoomCode();

  // Ensure unique room code
  while (
    db
      .prepare(
        "SELECT id FROM game_sessions WHERE room_code = ? AND status != 'finished'"
      )
      .get(roomCode)
  ) {
    roomCode = generateRoomCode();
  }

  db.prepare(
    `INSERT INTO game_sessions (id, board_id, room_code, status)
     VALUES (?, ?, ?, 'lobby')`
  ).run(id, board_id, roomCode);

  const session = db
    .prepare("SELECT * FROM game_sessions WHERE id = ?")
    .get(id);
  res.status(201).json(session);
});

// GET /api/games/:id - Get game data
router.get("/:id", (req, res) => {
  const db = getDb();
  const session = db
    .prepare("SELECT * FROM game_sessions WHERE id = ? OR room_code = ?")
    .get(req.params.id, req.params.id) as any;

  if (!session) {
    return res.status(404).json({ error: "Game not found" });
  }

  const players = db
    .prepare(
      "SELECT id, nickname, avatar, score, is_connected FROM players WHERE session_id = ? ORDER BY score DESC"
    )
    .all(session.id);

  // Get board with questions
  const boardQuestions = db
    .prepare(
      `SELECT bq.position_row, bq.position_col, q.*, c.name as category_name, c.color as category_color
       FROM board_questions bq
       JOIN questions q ON q.id = bq.question_id
       JOIN categories c ON c.id = q.category_id
       WHERE bq.board_id = ?
       ORDER BY bq.position_col, bq.position_row`
    )
    .all(session.board_id);

  // Get answered question IDs for this session
  const answeredQuestions = db
    .prepare(
      "SELECT DISTINCT question_id FROM answers WHERE session_id = ?"
    )
    .all(session.id)
    .map((a: any) => a.question_id);

  // Organize into categories/columns
  const categoriesMap = new Map<
    number,
    { name: string; color: string; questions: any[] }
  >();
  for (const bq of boardQuestions as any[]) {
    if (!categoriesMap.has(bq.position_col)) {
      categoriesMap.set(bq.position_col, {
        name: bq.category_name,
        color: bq.category_color,
        questions: [],
      });
    }
    categoriesMap.get(bq.position_col)!.questions.push({
      id: bq.id,
      question_text: bq.question_text,
      correct_answer: bq.correct_answer,
      wrong_answers: JSON.parse(bq.wrong_answers),
      points: bq.points,
      difficulty: bq.difficulty,
      position_row: bq.position_row,
      position_col: bq.position_col,
      answered: answeredQuestions.includes(bq.id),
    });
  }

  const categories = Array.from(categoriesMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([_col, data]) => data);

  res.json({
    ...session,
    players,
    board: { categories },
  });
});

// POST /api/games/:id/join - Join game via room code
router.post("/:id/join", (req, res) => {
  const db = getDb();
  const { nickname, avatar } = req.body;

  if (!nickname || typeof nickname !== "string") {
    return res.status(400).json({ error: "nickname is required" });
  }

  // Sanitize nickname: strip HTML/script tags, limit length
  const sanitizedNickname = nickname
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, "")
    .trim()
    .slice(0, 20);

  if (sanitizedNickname.length < 1) {
    return res.status(400).json({ error: "nickname must be at least 1 character" });
  }

  // The :id parameter can be either the game id or the room code
  const session = db
    .prepare("SELECT * FROM game_sessions WHERE id = ? OR room_code = ?")
    .get(req.params.id, req.params.id) as any;

  if (!session) {
    return res.status(404).json({ error: "Game not found" });
  }

  if (session.status === "finished") {
    return res.status(400).json({ error: "Game has already finished" });
  }

  // Limit players per game to prevent abuse
  const playerCount = db
    .prepare("SELECT COUNT(*) as count FROM players WHERE session_id = ?")
    .get(session.id) as { count: number };
  if (playerCount.count >= 40) {
    return res.status(400).json({ error: "Game is full (max 40 players)" });
  }

  const playerId = uuid();
  db.prepare(
    `INSERT INTO players (id, session_id, nickname, avatar)
     VALUES (?, ?, ?, ?)`
  ).run(playerId, session.id, sanitizedNickname, avatar || null);

  const player = db
    .prepare("SELECT * FROM players WHERE id = ?")
    .get(playerId);

  res.status(201).json({
    player,
    game: {
      id: session.id,
      room_code: session.room_code,
      status: session.status,
    },
  });
});

export default router;
