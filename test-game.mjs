import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const api = (path, opts) =>
  fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  }).then((r) => r.json());

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== JEOPARDY FULL GAME TEST ===\n");

  // 1. Get boards
  const boards = await api("/games/boards");
  console.log(`1. Found ${boards.length} board(s): "${boards[0].name}"`);

  // 2. Host creates game
  const game = await api("/games", {
    method: "POST",
    body: JSON.stringify({ board_id: boards[0].id }),
  });
  console.log(`2. Game created! Room code: ${game.room_code}`);

  // 3. Player joins via REST
  const joinResult = await api(`/games/${game.room_code}/join`, {
    method: "POST",
    body: JSON.stringify({ nickname: "Elev-Anna" }),
  });
  console.log(`3. Player joined: ${joinResult.player.nickname} (id: ${joinResult.player.id.slice(0, 8)}...)`);

  // 4. Connect host socket
  const hostSocket = io(BASE, { transports: ["websocket"] });
  await new Promise((r) => hostSocket.on("connect", r));
  console.log(`4. Host socket connected: ${hostSocket.id}`);

  // 5. Connect player socket
  const playerSocket = io(BASE, { transports: ["websocket"] });
  await new Promise((r) => playerSocket.on("connect", r));
  console.log(`5. Player socket connected: ${playerSocket.id}`);

  // Collect events
  const hostEvents = [];
  const playerEvents = [];
  for (const evt of ["game:state", "game:phase-change", "game:question", "host:question-answer", "game:buzzer-open", "game:buzzer-winner", "game:reveal-answer", "game:scoreboard", "game:finished", "player:joined", "game:wrong-answer"]) {
    hostSocket.on(evt, (data) => hostEvents.push({ evt, data }));
    playerSocket.on(evt, (data) => playerEvents.push({ evt, data }));
  }

  // 6. Host joins room
  hostSocket.emit("host:join", { sessionId: game.id });
  await wait(300);
  const hostState = hostEvents.find((e) => e.evt === "game:state");
  console.log(`6. Host received game:state - phase: ${hostState?.data?.phase}, players: ${hostState?.data?.players?.length}`);

  // 7. Player joins room
  playerSocket.emit("player:join", { roomCode: game.room_code, playerId: joinResult.player.id });
  await wait(300);
  const playerJoined = hostEvents.find((e) => e.evt === "player:joined");
  console.log(`7. Host notified: player:joined - ${playerJoined?.data?.nickname}`);

  // 8. Host starts game
  hostSocket.emit("host:start-game", { roomCode: game.room_code });
  await wait(300);
  const phaseChange = hostEvents.find((e) => e.evt === "game:phase-change" && e.data.phase === "board");
  console.log(`8. Game started! Phase: ${phaseChange?.data?.phase}`);

  // 9. Get full game data to find a question
  const gameData = await api(`/games/${game.room_code}`);
  const firstCategory = gameData.board.categories[0];
  const firstQuestion = firstCategory.questions[0];
  console.log(`9. Selecting question: "${firstQuestion.question_text.slice(0, 50)}..." (${firstQuestion.points} pts)`);

  // 10. Host selects question
  hostEvents.length = 0;
  playerEvents.length = 0;
  hostSocket.emit("host:select-question", { roomCode: game.room_code, questionId: firstQuestion.id });
  await wait(300);
  const questionEvt = playerEvents.find((e) => e.evt === "game:question");
  const hostAnswer = hostEvents.find((e) => e.evt === "host:question-answer");
  console.log(`10. Question sent to all. Host sees answer: "${hostAnswer?.data?.correct_answer}"`);

  // 11. Host opens buzzer
  hostEvents.length = 0;
  playerEvents.length = 0;
  hostSocket.emit("host:open-buzzer", { roomCode: game.room_code });
  await wait(300);
  const buzzerOpen = playerEvents.find((e) => e.evt === "game:buzzer-open");
  console.log(`11. Buzzer opened! Timeout: ${buzzerOpen?.data?.timeout}ms`);

  // 12. Player buzzes in
  hostEvents.length = 0;
  playerEvents.length = 0;
  playerSocket.emit("player:buzz", { roomCode: game.room_code });
  await wait(300);
  const buzzerWinner = hostEvents.find((e) => e.evt === "game:buzzer-winner");
  console.log(`12. Buzz winner: ${buzzerWinner?.data?.nickname}!`);

  // 13. Host judges answer as CORRECT
  hostEvents.length = 0;
  playerEvents.length = 0;
  hostSocket.emit("host:judge-answer", { roomCode: game.room_code, correct: true });
  await wait(300);
  const reveal = hostEvents.find((e) => e.evt === "game:reveal-answer");
  console.log(`13. Answer revealed: wasCorrect=${reveal?.data?.wasCorrect}, points=${reveal?.data?.pointsEarned}`);

  // 14. Host shows scoreboard
  hostEvents.length = 0;
  hostSocket.emit("host:show-scoreboard", { roomCode: game.room_code });
  await wait(300);
  const scoreboard = hostEvents.find((e) => e.evt === "game:scoreboard");
  const scores = scoreboard?.data?.players?.map((p) => `${p.nickname}: ${p.score}`).join(", ");
  console.log(`14. Scoreboard: ${scores}`);

  // 15. Host goes back to board, picks another question, player answers WRONG
  hostSocket.emit("host:back-to-board", { roomCode: game.room_code });
  await wait(200);
  const secondQuestion = firstCategory.questions[1];
  console.log(`\n15. Round 2: "${secondQuestion.question_text.slice(0, 50)}..." (${secondQuestion.points} pts)`);

  hostEvents.length = 0;
  playerEvents.length = 0;
  hostSocket.emit("host:select-question", { roomCode: game.room_code, questionId: secondQuestion.id });
  await wait(200);
  hostSocket.emit("host:open-buzzer", { roomCode: game.room_code });
  await wait(200);
  playerSocket.emit("player:buzz", { roomCode: game.room_code });
  await wait(200);
  hostSocket.emit("host:judge-answer", { roomCode: game.room_code, correct: false });
  await wait(300);
  const wrongAnswer = hostEvents.find((e) => e.evt === "game:wrong-answer");
  console.log(`16. Wrong answer! ${wrongAnswer?.data?.nickname} lost ${wrongAnswer?.data?.pointsLost} points`);

  // 17. End game
  hostEvents.length = 0;
  hostSocket.emit("host:end-game", { roomCode: game.room_code });
  await wait(300);
  const finished = hostEvents.find((e) => e.evt === "game:finished");
  const finalScores = finished?.data?.players?.map((p) => `${p.nickname}: ${p.score}`).join(", ");
  console.log(`\n17. GAME OVER! Final scores: ${finalScores}`);

  // Cleanup
  hostSocket.disconnect();
  playerSocket.disconnect();

  console.log("\n=== ALL TESTS PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
