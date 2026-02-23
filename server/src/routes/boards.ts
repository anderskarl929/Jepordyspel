import { Router } from "express";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";

const router = Router();

// POST /api/boards - Create board from selected categories
router.post("/", (req, res) => {
  const db = getDb();
  const { name, category_ids } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Board name is required" });
  }
  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    return res.status(400).json({ error: "At least one category is required" });
  }

  // Validate each category has at least 5 active questions
  const categoryQuestions: Array<{ categoryId: string; questions: any[] }> = [];
  for (const catId of category_ids) {
    const questions = db
      .prepare(
        "SELECT id FROM questions WHERE category_id = ? AND is_active = 1 ORDER BY points ASC"
      )
      .all(catId);

    if (questions.length < 5) {
      const cat = db
        .prepare("SELECT name FROM categories WHERE id = ?")
        .get(catId) as any;
      return res.status(400).json({
        error: `Category "${cat?.name || catId}" has only ${questions.length} questions (need at least 5)`,
      });
    }
    categoryQuestions.push({ categoryId: catId, questions });
  }

  const boardId = uuid();

  const transaction = db.transaction(() => {
    db.prepare(
      "INSERT INTO game_boards (id, name) VALUES (?, ?)"
    ).run(boardId, name.trim());

    const insertBQ = db.prepare(
      "INSERT INTO board_questions (id, board_id, question_id, position_row, position_col) VALUES (?, ?, ?, ?, ?)"
    );

    categoryQuestions.forEach(({ questions }, col) => {
      // Take first 5 questions (ordered by points) for rows 0-4
      for (let row = 0; row < 5; row++) {
        insertBQ.run(uuid(), boardId, (questions[row] as any).id, row, col);
      }
    });
  });

  transaction();

  const board = db
    .prepare("SELECT * FROM game_boards WHERE id = ?")
    .get(boardId);
  res.status(201).json(board);
});

// DELETE /api/boards/:id - Delete a board
router.delete("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const board = db
    .prepare("SELECT * FROM game_boards WHERE id = ?")
    .get(id);

  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }

  // Check if any active game sessions use this board
  const activeSessions = db
    .prepare(
      "SELECT id FROM game_sessions WHERE board_id = ? AND status != 'finished'"
    )
    .all(id);

  if (activeSessions.length > 0) {
    return res.status(409).json({
      error: "Cannot delete board while it has active game sessions",
    });
  }

  // CASCADE will handle board_questions
  db.prepare("DELETE FROM game_boards WHERE id = ?").run(id);
  res.json({ deleted: true });
});

export default router;
