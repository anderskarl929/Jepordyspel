import { Router } from "express";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";
import { parse } from "csv-parse/sync";

const router = Router();

// GET /api/questions - List/filter questions
router.get("/", (req, res) => {
  const db = getDb();
  const { category_id, difficulty, min_points, max_points } = req.query;

  let sql =
    "SELECT q.*, c.name as category_name FROM questions q LEFT JOIN categories c ON c.id = q.category_id WHERE q.is_active = 1";
  const params: any[] = [];

  if (category_id) {
    sql += " AND q.category_id = ?";
    params.push(category_id);
  }
  if (difficulty) {
    sql += " AND q.difficulty = ?";
    params.push(difficulty);
  }
  if (min_points) {
    sql += " AND q.points >= ?";
    params.push(Number(min_points));
  }
  if (max_points) {
    sql += " AND q.points <= ?";
    params.push(Number(max_points));
  }

  sql += " ORDER BY q.points ASC";

  const questions = db.prepare(sql).all(...params);
  res.json(
    questions.map((q: any) => ({
      ...q,
      wrong_answers: JSON.parse(q.wrong_answers),
    }))
  );
});

// POST /api/questions - Create a question
router.post("/", (req, res) => {
  const db = getDb();
  const {
    category_id,
    question_text,
    correct_answer,
    wrong_answers,
    points,
    difficulty,
    bloom_level,
    media_url,
  } = req.body;

  if (!category_id || !question_text || !correct_answer || !wrong_answers) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const category = db
    .prepare("SELECT id FROM categories WHERE id = ?")
    .get(category_id);
  if (!category) {
    return res.status(400).json({ error: "Invalid category_id" });
  }

  const id = uuid();
  const validBloomLevels = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
  const resolvedBloom = validBloomLevels.includes(bloom_level) ? bloom_level : "remember";

  db.prepare(
    `INSERT INTO questions (id, category_id, question_text, correct_answer, wrong_answers, points, difficulty, bloom_level, media_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    category_id,
    question_text,
    correct_answer,
    JSON.stringify(wrong_answers),
    points || 200,
    difficulty || "medium",
    resolvedBloom,
    media_url || null
  );

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as any;
  res.status(201).json({
    ...question,
    wrong_answers: JSON.parse(question.wrong_answers),
  });
});

// POST /api/questions/import - Import questions from JSON
router.post("/import", (req, res) => {
  const db = getDb();
  const { questions } = req.body;

  if (!Array.isArray(questions)) {
    return res
      .status(400)
      .json({ error: "Body must contain a 'questions' array" });
  }

  const validBloomLevels = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
  const insertQuestion = db.prepare(
    `INSERT INTO questions (id, category_id, question_text, correct_answer, wrong_answers, points, difficulty, bloom_level, media_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const results = { imported: 0, errors: [] as string[] };

  const transaction = db.transaction(() => {
    for (const q of questions) {
      if (!q.category_id || !q.question_text || !q.correct_answer || !q.wrong_answers) {
        results.errors.push(
          `Skipped question "${q.question_text || "unknown"}": missing required fields`
        );
        continue;
      }
      const id = uuid();
      const bloom = validBloomLevels.includes(q.bloom_level) ? q.bloom_level : "remember";
      insertQuestion.run(
        id,
        q.category_id,
        q.question_text,
        q.correct_answer,
        JSON.stringify(q.wrong_answers),
        q.points || 200,
        q.difficulty || "medium",
        bloom,
        q.media_url || null
      );
      results.imported++;
    }
  });

  transaction();
  res.json(results);
});

// POST /api/questions/import-csv - Import questions from CSV text
router.post("/import-csv", (req, res) => {
  const db = getDb();
  const { csv } = req.body;

  if (!csv || typeof csv !== "string") {
    return res.status(400).json({ error: "Body must contain a 'csv' string" });
  }

  let records: any[];
  try {
    records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err: any) {
    return res.status(400).json({ error: `CSV parse error: ${err.message}` });
  }

  const validBloomLevels = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
  const results = {
    imported: 0,
    categories_created: [] as string[],
    errors: [] as string[],
  };

  const findCategory = db.prepare(
    "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)"
  );
  const insertCategory = db.prepare(
    "INSERT INTO categories (id, name) VALUES (?, ?)"
  );
  const insertQuestion = db.prepare(
    `INSERT INTO questions (id, category_id, question_text, correct_answer, wrong_answers, points, difficulty, bloom_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  function bloomFromPoints(pts: number): string {
    if (pts <= 200) return "remember";
    if (pts <= 400) return "understand";
    if (pts <= 600) return "apply";
    if (pts <= 800) return "analyze";
    return "evaluate";
  }

  function difficultyFromPoints(pts: number): string {
    if (pts <= 200) return "easy";
    if (pts <= 600) return "medium";
    return "hard";
  }

  const transaction = db.transaction(() => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-indexed + header

      const categoryName = row.category?.trim();
      const questionText = row.question_text?.trim();
      const correctAnswer = row.correct_answer?.trim();
      const wrong1 = row.wrong_answer1?.trim();
      const wrong2 = row.wrong_answer2?.trim();
      const wrong3 = row.wrong_answer3?.trim();
      const points = parseInt(row.points, 10);

      if (!categoryName || !questionText || !correctAnswer || !wrong1 || !wrong2 || !wrong3) {
        results.errors.push(`Row ${rowNum}: missing required fields`);
        continue;
      }
      if (isNaN(points) || points <= 0) {
        results.errors.push(`Row ${rowNum}: invalid points value "${row.points}"`);
        continue;
      }

      // Find or create category
      let category = findCategory.get(categoryName) as any;
      if (!category) {
        const catId = uuid();
        insertCategory.run(catId, categoryName);
        category = { id: catId };
        results.categories_created.push(categoryName);
      }

      const wrongAnswers = [wrong1, wrong2, wrong3];

      insertQuestion.run(
        uuid(),
        category.id,
        questionText,
        correctAnswer,
        JSON.stringify(wrongAnswers),
        points,
        difficultyFromPoints(points),
        bloomFromPoints(points)
      );
      results.imported++;
    }
  });

  try {
    transaction();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

// GET /api/questions/export - Export all questions as JSON
router.get("/export", (_req, res) => {
  const db = getDb();
  const questions = db
    .prepare(
      `SELECT q.*, c.name as category_name
       FROM questions q
       LEFT JOIN categories c ON c.id = q.category_id
       WHERE q.is_active = 1
       ORDER BY c.name, q.points`
    )
    .all();

  res.json({
    exported_at: new Date().toISOString(),
    count: questions.length,
    questions: questions.map((q: any) => ({
      ...q,
      wrong_answers: JSON.parse(q.wrong_answers),
    })),
  });
});

export default router;
