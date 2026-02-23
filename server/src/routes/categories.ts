import { Router } from "express";
import { getDb } from "../db/schema";

const router = Router();

// GET /api/categories - List all categories
router.get("/", (_req, res) => {
  const db = getDb();
  const categories = db
    .prepare(
      `SELECT c.*, COUNT(q.id) as question_count
       FROM categories c
       LEFT JOIN questions q ON q.category_id = c.id AND q.is_active = 1
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all();
  res.json(categories);
});

// GET /api/categories/:id - Get single category with its questions
router.get("/:id", (req, res) => {
  const db = getDb();
  const category = db
    .prepare("SELECT * FROM categories WHERE id = ?")
    .get(req.params.id);

  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }

  const questions = db
    .prepare(
      "SELECT * FROM questions WHERE category_id = ? AND is_active = 1 ORDER BY points"
    )
    .all(req.params.id);

  res.json({
    ...category,
    questions: questions.map((q: any) => ({
      ...q,
      wrong_answers: JSON.parse(q.wrong_answers),
    })),
  });
});

// DELETE /api/categories/:id - Delete category and its questions
router.delete("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const category = db
    .prepare("SELECT * FROM categories WHERE id = ?")
    .get(id);

  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }

  // Check if any questions from this category are used in active boards
  const usedInBoards = db
    .prepare(
      `SELECT DISTINCT gb.name FROM board_questions bq
       JOIN questions q ON q.id = bq.question_id
       JOIN game_boards gb ON gb.id = bq.board_id
       WHERE q.category_id = ?`
    )
    .all(id) as any[];

  if (usedInBoards.length > 0) {
    const boardNames = usedInBoards.map((b) => b.name).join(", ");
    return res.status(409).json({
      error: `Cannot delete: questions are used in boards: ${boardNames}`,
    });
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM questions WHERE category_id = ?").run(id);
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  });

  transaction();
  res.json({ deleted: true });
});

export default router;
