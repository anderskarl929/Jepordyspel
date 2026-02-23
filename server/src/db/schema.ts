import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../data/jeopardy.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#1a3a7a',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      question_text TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      wrong_answers TEXT NOT NULL, -- JSON array of strings
      points INTEGER NOT NULL DEFAULT 200,
      difficulty TEXT DEFAULT 'medium',
      bloom_level TEXT DEFAULT 'remember', -- remember, understand, apply, analyze, evaluate, create
      media_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_questions (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES game_boards(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      position_row INTEGER NOT NULL,
      position_col INTEGER NOT NULL,
      UNIQUE(board_id, position_row, position_col)
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES game_boards(id),
      room_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'lobby',
      current_question_id TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      avatar TEXT,
      score INTEGER DEFAULT 0,
      is_connected INTEGER DEFAULT 1,
      socket_id TEXT,
      joined_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES game_sessions(id),
      player_id TEXT NOT NULL REFERENCES players(id),
      question_id TEXT NOT NULL REFERENCES questions(id),
      given_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      time_taken_ms INTEGER,
      points_earned INTEGER NOT NULL DEFAULT 0,
      answered_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
    CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);
    CREATE INDEX IF NOT EXISTS idx_board_questions_board ON board_questions(board_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_room ON game_sessions(room_code);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);
    CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_answers_player ON answers(player_id);
  `);
}
