import { getDb } from "./schema";
import { v4 as uuid } from "uuid";

interface SeedQuestion {
  question_text: string;
  correct_answer: string;
  wrong_answers: string[];
  points: number;
  difficulty: string;
  bloom_level?: string;
}

// Map Jeopardy point values to Bloom's taxonomy levels (per Research.md)
function bloomLevelFromPoints(points: number): string {
  if (points <= 200) return "remember";
  if (points <= 400) return "understand";
  if (points <= 600) return "apply";
  if (points <= 800) return "analyze";
  return "evaluate";
}

interface SeedCategory {
  name: string;
  description: string;
  color: string;
  questions: SeedQuestion[];
}

const seedCategories: SeedCategory[] = [
  {
    name: "Svensk Historia",
    description: "Fragor om Sveriges historia fran vikingatiden till modern tid",
    color: "#1a3a7a",
    questions: [
      {
        question_text: "Vilken kung grundade Stockholm enligt traditionen?",
        correct_answer: "Birger Jarl",
        wrong_answers: ["Gustav Vasa", "Karl XII", "Erik Segersall"],
        points: 200,
        difficulty: "easy",
        bloom_level: "remember",
      },
      {
        question_text: "Vilket ar blev Sverige officiellt kristnat?",
        correct_answer: "Omkring 1100-talet under kung Inge den aldre",
        wrong_answers: [
          "Under 800-talet med Ansgar",
          "1523 med Gustav Vasa",
          "Under 900-talet med Olof Skotkonung",
        ],
        points: 400,
        difficulty: "medium",
      },
      {
        question_text:
          "Vad hette det krig dar Sverige folorade Finland till Ryssland?",
        correct_answer: "Finska kriget 1808-1809",
        wrong_answers: [
          "Stora nordiska kriget",
          "Kalmarkriget",
          "Trettioariga kriget",
        ],
        points: 600,
        difficulty: "medium",
      },
      {
        question_text:
          "Vilken svensk kung stupade i slaget vid Lutzen 1632?",
        correct_answer: "Gustav II Adolf",
        wrong_answers: ["Karl XII", "Karl X Gustav", "Gustav III"],
        points: 800,
        difficulty: "hard",
      },
      {
        question_text:
          "Vilket ar fick kvinnor i Sverige allman rostratt pa samma villkor som man?",
        correct_answer: "1921",
        wrong_answers: ["1919", "1909", "1932"],
        points: 1000,
        difficulty: "hard",
      },
    ],
  },
  {
    name: "Naturvetenskap",
    description: "Fragor om fysik, kemi och biologi",
    color: "#2d7d46",
    questions: [
      {
        question_text: "Vad ar den kemiska beteckningen for vatten?",
        correct_answer: "H2O",
        wrong_answers: ["CO2", "NaCl", "O2"],
        points: 200,
        difficulty: "easy",
      },
      {
        question_text: "Vilken planet ar narmast solen?",
        correct_answer: "Merkurius",
        wrong_answers: ["Venus", "Mars", "Jorden"],
        points: 400,
        difficulty: "easy",
      },
      {
        question_text: "Vad heter processen dar vaxter omvandlar solljus till energi?",
        correct_answer: "Fotosyntes",
        wrong_answers: ["Cellandning", "Osmos", "Fermentering"],
        points: 600,
        difficulty: "medium",
      },
      {
        question_text: "Vad ar Newtons andra lag?",
        correct_answer: "F = m * a (kraft ar lika med massa gangar acceleration)",
        wrong_answers: [
          "Varje kraft har en lika stor motriktad kraft",
          "Ett foremal i vila forblir i vila",
          "Energi kan varken skapas eller forstoras",
        ],
        points: 800,
        difficulty: "hard",
      },
      {
        question_text:
          "Vilken svensk vetenskapsman skapade det periodiska systemet?",
        correct_answer: "Ingen - det var ryssen Dmitrij Mendelejev. Men Jons Jacob Berzelius utvecklade kemiska symboler.",
        wrong_answers: [
          "Carl von Linne",
          "Alfred Nobel",
          "Anders Celsius",
        ],
        points: 1000,
        difficulty: "hard",
      },
    ],
  },
  {
    name: "Svenska Spraket",
    description: "Fragor om svenska spraket, grammatik och litteratur",
    color: "#7a1a3a",
    questions: [
      {
        question_text: "Vad ar en synonym?",
        correct_answer: "Ett ord med samma eller liknande betydelse som ett annat ord",
        wrong_answers: [
          "Ett ord med motsatt betydelse",
          "Ett ord som later likadant men stavas annorlunda",
          "Ett ord som kan ha flera betydelser",
        ],
        points: 200,
        difficulty: "easy",
      },
      {
        question_text: "Vem skrev barnboken Pippi Langstrump?",
        correct_answer: "Astrid Lindgren",
        wrong_answers: ["Selma Lagerlof", "Elsa Beskow", "Tove Jansson"],
        points: 400,
        difficulty: "easy",
      },
      {
        question_text: "Vad ar ett predikat i en mening?",
        correct_answer: "Verbdelen som beskriver vad subjektet gor eller ar",
        wrong_answers: [
          "Den som utfor handlingen",
          "Den som tar emot handlingen",
          "Ett beskrivande ord",
        ],
        points: 600,
        difficulty: "medium",
      },
      {
        question_text:
          "Vilken stilfigur innebar att man tillskriver doda ting manskliga egenskaper?",
        correct_answer: "Personifikation",
        wrong_answers: ["Metafor", "Allegori", "Ironi"],
        points: 800,
        difficulty: "hard",
      },
      {
        question_text:
          "Vem var den forsta svenska forfattaren att vinna Nobelpriset i litteratur?",
        correct_answer: "Selma Lagerlof (1909)",
        wrong_answers: [
          "August Strindberg",
          "Verner von Heidenstam",
          "Par Lagerkvist",
        ],
        points: 1000,
        difficulty: "hard",
      },
    ],
  },
  {
    name: "Matematik",
    description: "Fragor om matematik och logik",
    color: "#7a5a1a",
    questions: [
      {
        question_text: "Vad ar 15% av 200?",
        correct_answer: "30",
        wrong_answers: ["25", "35", "20"],
        points: 200,
        difficulty: "easy",
      },
      {
        question_text: "Vad ar arean av en triangel med basen 10 cm och hojden 6 cm?",
        correct_answer: "30 kvadratcentimeter",
        wrong_answers: [
          "60 kvadratcentimeter",
          "16 kvadratcentimeter",
          "36 kvadratcentimeter",
        ],
        points: 400,
        difficulty: "easy",
      },
      {
        question_text: "Vad ar Pythagoras sats?",
        correct_answer: "a^2 + b^2 = c^2 (i en ratvinkling triangel)",
        wrong_answers: [
          "a + b = c",
          "a * b = c^2",
          "2a + 2b = c",
        ],
        points: 600,
        difficulty: "medium",
      },
      {
        question_text: "Vad ar derivatan av f(x) = x^3?",
        correct_answer: "f'(x) = 3x^2",
        wrong_answers: ["f'(x) = x^2", "f'(x) = 3x", "f'(x) = x^3/3"],
        points: 800,
        difficulty: "hard",
      },
      {
        question_text: "Vad ar ett primtal?",
        correct_answer: "Ett heltal storre an 1 som bara ar delbart med 1 och sig sjalvt",
        wrong_answers: [
          "Ett tal som ar delbart med 2",
          "Det forsta talet i en talfoldjd",
          "Ett tal som kan skrivas som en brak",
        ],
        points: 1000,
        difficulty: "medium",
      },
    ],
  },
  {
    name: "Geografi",
    description: "Fragor om Sverige och varldens geografi",
    color: "#1a6a7a",
    questions: [
      {
        question_text: "Vad heter Sveriges langsta alv?",
        correct_answer: "Torneaalven",
        wrong_answers: ["Dalaalven", "Gota alv", "Klaaraalven"],
        points: 200,
        difficulty: "easy",
      },
      {
        question_text: "Hur manga lan har Sverige?",
        correct_answer: "21",
        wrong_answers: ["18", "25", "23"],
        points: 400,
        difficulty: "medium",
      },
      {
        question_text: "Vilken ar Sveriges hogsta berg?",
        correct_answer: "Kebnekaise",
        wrong_answers: ["Sarek", "Akka", "Sarektjakka"],
        points: 600,
        difficulty: "easy",
      },
      {
        question_text:
          "Vilken ar varldens storsta ocean?",
        correct_answer: "Stilla havet",
        wrong_answers: ["Atlantiska oceanen", "Indiska oceanen", "Sodra ishavet"],
        points: 800,
        difficulty: "medium",
      },
      {
        question_text: "Vilken svensk stad kallas 'Nordens Venedig'?",
        correct_answer: "Stockholm",
        wrong_answers: ["Goteborg", "Karlstad", "Uppsala"],
        points: 1000,
        difficulty: "medium",
      },
    ],
  },
  {
    name: "Samhallskunskap",
    description: "Fragor om samhalle, politik och demokrati",
    color: "#5a1a7a",
    questions: [
      {
        question_text: "Hur manga ledamoter sitter i Sveriges riksdag?",
        correct_answer: "349",
        wrong_answers: ["365", "300", "400"],
        points: 200,
        difficulty: "medium",
      },
      {
        question_text: "Vad heter Sveriges grundlagar? (Namn en av dem)",
        correct_answer: "Regeringsformen, Successionsordningen, Tryckfrihetsforordningen och Yttrandefrihetsgrundlagen",
        wrong_answers: [
          "Grundlagen och Forfatningslagen",
          "Rikslagen och Statslagen",
          "Konstitutionen och Medborgarlagen",
        ],
        points: 400,
        difficulty: "hard",
      },
      {
        question_text: "Vad innebar allmanna val i Sverige?",
        correct_answer: "Alla medborgare over 18 ar har ratt att rosta",
        wrong_answers: [
          "Bara de som betalar skatt far rosta",
          "Man maste ha bott i Sverige i minst 5 ar",
          "Bara de med hogskoleexamen far rosta",
        ],
        points: 600,
        difficulty: "easy",
      },
      {
        question_text: "Vad ar FN:s barnkonvention?",
        correct_answer: "En internationell overenskommelse om barns rattigheter som blev svensk lag 2020",
        wrong_answers: [
          "En svensk lag fran 1950",
          "En EU-forordning om utbildning",
          "En overenskommelse om barns skyldigheter",
        ],
        points: 800,
        difficulty: "medium",
      },
      {
        question_text: "Vilken princip innebar att all offentlig makt i Sverige utgar fran folket?",
        correct_answer: "Folksuveranitetsprincipen",
        wrong_answers: [
          "Offentlighetsprincipen",
          "Legalitetsprincipen",
          "Parlamentarismen",
        ],
        points: 1000,
        difficulty: "hard",
      },
    ],
  },
];

export function seedDatabase() {
  const db = getDb();

  const existingCategories = db
    .prepare("SELECT COUNT(*) as count FROM categories")
    .get() as { count: number };

  if (existingCategories.count > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with Swedish educational questions...");

  const insertCategory = db.prepare(
    "INSERT INTO categories (id, name, description, color) VALUES (?, ?, ?, ?)"
  );
  const insertQuestion = db.prepare(
    "INSERT INTO questions (id, category_id, question_text, correct_answer, wrong_answers, points, difficulty, bloom_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertBoard = db.prepare(
    "INSERT INTO game_boards (id, name, description) VALUES (?, ?, ?)"
  );
  const insertBoardQuestion = db.prepare(
    "INSERT INTO board_questions (id, board_id, question_id, position_row, position_col) VALUES (?, ?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    const boardId = uuid();
    insertBoard.run(
      boardId,
      "Allmanbildning",
      "En blandning av fragor fran olika amnesomraden for grundskola och gymnasium"
    );

    seedCategories.forEach((cat, colIndex) => {
      const categoryId = uuid();
      insertCategory.run(categoryId, cat.name, cat.description, cat.color);

      cat.questions.forEach((q, rowIndex) => {
        const questionId = uuid();
        insertQuestion.run(
          questionId,
          categoryId,
          q.question_text,
          q.correct_answer,
          JSON.stringify(q.wrong_answers),
          q.points,
          q.difficulty,
          q.bloom_level || bloomLevelFromPoints(q.points)
        );
        insertBoardQuestion.run(
          uuid(),
          boardId,
          questionId,
          rowIndex,
          colIndex
        );
      });
    });
  });

  transaction();
  console.log(
    `Seeded ${seedCategories.length} categories with ${seedCategories.reduce((sum, c) => sum + c.questions.length, 0)} questions.`
  );
}

if (require.main === module) {
  seedDatabase();
  console.log("Seeding complete.");
}
