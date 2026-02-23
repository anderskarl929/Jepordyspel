# Research: Jeopardy-spel for utbildning

> Sammanstallning av research for utveckling av en webbaserad Jeopardy-applikation for undervisningsbruk.
> Datum: 2026-02-21

---

## Frontend-research

### 1. Ramverksrekommendationer

Tre ramverk sticker ut som de basta valen for en spelliknande Jeopardy-applikation:

**React**
- **Fordelar:** Storst ekosystem och community (44,7% av utvecklare). Enklast att hitta utvecklare. Enormt utbud av tredjepartsbibliotek for animationer, state management och UI-komponenter. Mogen och stabil med stod fran Meta.
- **Nackdelar:** Storre bundle-storlek an Svelte. Virtual DOM-overheaden kan paverka prestanda i animationstunga applikationer. Konfiguration kan vara komplex (Next.js, Vite, etc.).
- **Bast for:** Team som vill ha maximalt ekosystemstod och enkel rekrytering.

**Vue 3**
- **Fordelar:** Enkel inlarningskurva och ren syntax. Bra balans mellan flexibilitet och struktur. Composition API ger kraftfull reaktivitet. Vallampad for bade sma och stora projekt.
- **Nackdelar:** Mindre ekosystem an React. Farre tredjepartsbibliotek att valja bland. Mindre arbetsmarknad for Vue-utvecklare.
- **Bast for:** Sma team eller enskilda utvecklare som vill leverera snabbt.

**Svelte / SvelteKit**
- **Fordelar:** Kompilerar till vanilla JavaScript utan virtual DOM -- extremt snabb prestanda och minimal bundle-storlek. Svelte 5:s "Runes" ger effektiv reaktivitet. SvelteKit erbjuder fullstack-kapacitet med filbaserad routing, SSR och offlinestod. Bast prestanda pa lagprestandaenheter.
- **Nackdelar:** Minst ekosystem av de tre. Farre tillgangliga utvecklare. Snabb utveckling innebar att API:er kan forandra sig.
- **Bast for:** Projekt dar prestanda ar kritiskt, t.ex. klassrumsanvandning pa aldre enheter.

**Rekommendation for Jeopardy-spel:** Svelte/SvelteKit ar ett starkt val tack vare prestanda och enkelhet, men React ger mest flexibilitet for framtida utbyggnad. For ett utbildningsprojekt med begransad tid ar Vue ett bra mellanting.

---

### 2. Spelbrade-UI

**CSS Grid for spelbradet:**
CSS Grid ar det naturliga valet for att bygga Jeopardy-bradets layout med kategorier som kolumner och poangvarden som rader. Exempel pa grundlaggande struktur:

```css
.jeopardy-board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);  /* 6 kategorier */
  grid-template-rows: auto repeat(5, 1fr); /* rubrikrad + 5 poangnivaer */
  gap: 4px;
  aspect-ratio: 16/9;
}
```

**Interaktiva funktioner:**
- Klickbara rutor som avsllojar fragor med flip-animation (se avsnitt 7)
- Visuell indikering av redan besvarade fragor (t.ex. nedtonade eller dolda rutor)
- Tvafonstervyer: en operatorvy (med svar synliga) och en presentationsvy (for spelare/projektor), som i projektet [pfroud/jeopardy](https://github.com/pfroud/jeopardy)

**Befintliga implementationer att studera:**
- [jesseoverright/jeopardy](https://github.com/jesseoverright/jeopardy) -- Interaktivt Jeopardy-brade byggt i React
- [airbr/webdev-jeopardy](https://github.com/airbr/webdev-jeopardy) -- HTML/CSS/JS Jeopardy-spel
- [JeopardyLabs](https://jeopardylabs.com/) -- Kommersiell losning for anpassade Jeopardy-spel

---

### 3. Timer/buzzer-funktionalitet

**Realtids-buzzersystem:**
For multiplayer-funktionalitet behovs WebSocket-baserad kommunikation. Flera open-source-losningar finns:

- [Buffer/buzzer](https://github.com/bufferapp/buzzer) -- En buzzer-app for fragesporter och spelshower med WebSocket-stod
- [BuzzerWebApp](https://github.com/nohehf/BuzzerWebApp) -- Python Flask-SocketIO-baserad med frontend i HTML/CSS/JS, inkluderar aven Discord-bot
- [WsBuzzer](https://github.com/TomCan/WsBuzzer) -- PHP-baserat buzzer-system med WebSocket
- [Buzzonk](https://buzzonk.com/) -- Kommersiell online-buzzer med pausfunktion och nedrakningstimer

**Kommersiella plattformar (for inspiration):**
- [BuzzIn.live](https://buzzin.live/) -- Enkel online-buzzer
- [Multibuzzer](https://www.multibuzz.app/) -- Gratis multiplayer-buzzer for klassrum och fragesporter

**Teknisk implementation:**
- **Socket.IO** eller **nativa WebSockets** for realtidskommunikation
- Serversidan hanterar tidsstamplar for att avgora vem som buzzade forst (klientklockor ar oppalitliga)
- Nedrakningstimer bor synkroniseras fran servern for att undvika fusk
- Latenshantering ar kritisk -- servern maste vara auktoritativ for buzzordning

---

### 4. Responsiv design

**Malenheter att stodja:**
- **Projektor/klassrumsskarmar:** 1920x1080 eller hogre (fullskarmslage)
- **Surfplattor:** 768px-1024px (landskap och portratt)
- **Mobiltelefoner:** Under 768px

**Strategier:**
- **Mobile-first approach:** Designa for minsta skarmen forst, lagg sedan till funktioner for storre skarmar via media queries
- **CSS Grid + Flexbox:** Grid for bradet, Flexbox for inre layouter
- **Relativa enheter:** Anvand `vw`, `vh`, `rem` och `clamp()` for typografi och avstand som skalar med skarmstorlek
- **`aspect-ratio`:** Haller bradets proportioner konsekventa over enheter

**CSS-breakpoints:**
```css
/* Mobil (standard) */
.board { grid-template-columns: repeat(3, 1fr); font-size: clamp(0.8rem, 2vw, 1.2rem); }

/* Surfplatta */
@media (min-width: 768px) {
  .board { grid-template-columns: repeat(6, 1fr); }
}

/* Projektor/desktop */
@media (min-width: 1024px) {
  .board { max-width: 1400px; margin: 0 auto; }
}
```

**Projektorsarskilt:** Hog kontrast, stor text, och fulskarmslage (Fullscreen API) for att maximera synlighet i klassrum.

---

### 5. Tillganglighet

**WCAG 2.1 AA-riktlinjer for spelet:**

- **Fargkontrast:** Minst 4.5:1 kontrastforhallande for normal text och 3:1 for stor text. Jeopardy-bradets bla farg maste testas mot vit/gul text.
- **Tangentbordsnavigering:** Alla interaktiva element (rutor, knappar, buzzer) maste vara narbara med Tab-tangenten. Fokusindikatorer maste vara tydligt synliga. `Enter` och `Space` for att valja rutor.
- **Skarmlas are:** ARIA-roller (`role="grid"`, `role="gridcell"`) for bradet. `aria-label` for att beskriva varje rutas kategori och poangvarde. `aria-live="polite"` for poanguppdateringar och fragor. Annonser via skarmlas are nar en fraga visas eller besvaras.
- **Rorelsekanslighet:** Respektera `prefers-reduced-motion` for anvandare som ar kanslinga for animationer. Erbjud alternativ till flip-animationer.
- **Fokushantering:** Nar en fraga oppnas ska fokus flyttas till fragedialoggen. Nar dialogen stangs ska fokus aterstallas till bradet.

**Verktyg for testning:**
- [WebAIMs WCAG 2 Checklista](https://webaim.org/standards/wcag/checklist)
- [Silktide Toolbar](https://silktide.com/toolbar/) for att simulera skarmlas are och tangentbordsnavigering

---

### 6. State management

**Rekommendation: Zustand (for React) eller inbyggd store (for Svelte)**

**Zustand (React):**
- Minimal boilerplate, hookbaserat API
- Ingen Provider-wrapper behovs
- Extremt liten bundle-storlek (~1KB)
- Utmarkt prestanda -- minimerar re-renders, perfekt for realtids-poanguppdateringar
- Enkel att debugga med devtools

**Svelte stores (Svelte):**
- Inbyggt i Svelte -- inget extra bibliotek behovs
- Reaktiv `$store`-syntax for automatiska uppdateringar
- Writable stores for poang, spelstatus, etc.

**Spelstatus som maste hanteras:**
```typescript
interface GameState {
  categories: Category[];          // Kategorier med fragor
  revealedCells: Set<string>;     // Vilka rutor som har visats
  players: Player[];               // Spelare med namn och poang
  currentPlayer: number;           // Vems tur det ar
  currentQuestion: Question|null;  // Aktuell fraga (eller null)
  gamePhase: 'board'|'question'|'answer'|'final'|'finished';
  dailyDoubleLocations: string[]; // Positioner for Daily Doubles
}
```

---

### 7. Animationsbibliotek

**Toppval for spelanimationer:**

**Motion (tidigare Framer Motion) -- for React:**
- Deklarativ API, perfekt for UI-overgangar
- `AnimatePresence` for enter/exit-animationer av fragor
- Layout-animationer for poanguppdateringar
- [motion.dev](https://motion.dev)

**GSAP (GreenSock) -- ramverksoberoende:**
- Industristandard for avancerade animationer
- Hanterar tusentals samtidiga tweens utan prestandaforlust
- Utmarkt for komplexa tidslinjer (t.ex. Final Jeopardy-sekvens)

**Svelte transitions -- for Svelte:**
- Inbyggda `transition:`, `in:`, `out:` direktiv
- `fly`, `fade`, `slide`, `scale` ur ladan
- Anpassade transitions for kortflip

**CSS-baserad flip-animation for spelrutor:**
```css
.card {
  perspective: 1000px;
}
.card-inner {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.card.flipped .card-inner {
  transform: rotateY(180deg);
}
.card-front, .card-back {
  backface-visibility: hidden;
}
.card-back {
  transform: rotateY(180deg);
}
```

---

### 8. Ljud

**Web Audio API:**
Webblasarens inbyggda [Web Audio API](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) ger precis kontroll over ljuduppspelning, timing och 3D-positionering -- perfekt for spel.

**Ljudeffekter som behovs:**
- **Ratt svar:** Positiv "ding"-ljud
- **Fel svar:** Buzzer/fel-ljud
- **Daily Double:** Dramatisk fanfare
- **Valj fraga:** Klick/reveal-ljud
- **Timer:** Tickande ljud under nedrakning
- **Final Jeopardy:** Tema-musik (30 sekunder)
- **Buzzer:** Snabbt ljud nar en spelare buzzer

**Kallor for gratis ljudeffekter:**
- [Uppbeat](https://uppbeat.io/sfx/category/answer/wrong-answer) -- Royalty-fria ljudeffekter
- [ElevenLabs Sound Effects](https://elevenlabs.io/sound-effects/wrong-answer) -- AI-genererade ljudeffekter

**Viktig hantering:**
- Webblasare kraver anvandareinteraktion innan ljud kan spelas (autoplay-policy)
- Forladdning av ljudfiler for att undvika fordrojning
- Implementera volymkontroll och mute-knapp (viktigt i klassrum)

---

### 9. Befintliga open-source Jeopardy-projekt

| Projekt | Teknikstack | Funktioner | Lank |
|---------|-------------|------------|------|
| **pfroud/jeopardy** | JavaScript | Tva fonster (operator + presentation), klickbart brade | [GitHub](https://github.com/pfroud/jeopardy) |
| **theGrue/jeopardy** | Angular, Socket.IO, Express | Riktiga Jeopardy-fragor fran J-Archive, multiplayer med buzzer | [GitHub](https://github.com/theGrue/jeopardy) |
| **tpavlek/Jeopardy** | ReactPHP, WebSockets | Fullstandigt spel med websocket-stod for multiplayer | [GitHub](https://github.com/tpavlek/Jeopardy) |
| **EricKarschner37/Jeopardy** | React (statisk) | Statisk React-frontend for Jeopardy | [GitHub](https://github.com/EricKarschner37/Jeopardy) |
| **ezrichards/jeopardy** | Django | Webbaserad buzzer, adminpanel, kategoriredigering | [GitHub](https://github.com/ezrichards/jeopardy) |
| **stegro/jeopardyML** | Ren HTML | Offline, ingen server, oppna en fil i webblasaren | [GitHub](https://github.com/stegro/jeopardyML) |
| **andygrunwald/things-with-buzzers-jeopardy** | JavaScript | Stod for fysiska buzzer-knappar (GPIO) | [GitHub](https://github.com/andygrunwald/things-with-buzzers-jeopardy) |

**Mest relevanta for inspiration:**
1. **theGrue/jeopardy** -- Bast for multiplayer med buzzer (Socket.IO)
2. **pfroud/jeopardy** -- Bast for klassrumsanvandning (operator/presentationslage)
3. **ezrichards/jeopardy** -- Bast for adminhantering av fragor och kategorier

---

### Frontend - Sammanfattning

| Omrade | Rekommendation | Motivering |
|--------|---------------|------------|
| Ramverk | **SvelteKit** eller **React + Vite** | Svelte for prestanda, React for ekosystem |
| Styling | **CSS Grid + CSS Custom Properties** | Inbyggt, ingen extra dependency |
| State | **Zustand** (React) / **Svelte stores** | Minimal boilerplate, bra prestanda |
| Animationer | **Motion** (React) / **Svelte transitions** + CSS | Deklarativ, lagpresterande |
| Realtid | **Socket.IO** | Mest mogna WebSocket-biblioteket |
| Ljud | **Web Audio API** + **Howler.js** | Palitlig uppspelning over alla webblasare |
| Tillganglighet | **WCAG 2.1 AA** | Krav for utbildningsmiljoer |

---

## Backend-research

### 1. Backend-ramverk

**Rekommendation: Node.js med Express/Fastify + Socket.IO**

| Ramverk | Fordelar | Nackdelar |
|---------|----------|-----------|
| **Node.js/Express** | Enormt ekosystem, enkel att lara sig, JavaScript pa bade frontend och backend, utmarkt Socket.IO-integration | Lagre prestanda an Fastify, callback-baserat kan bli rorigt |
| **Node.js/Fastify** | 30-40% hogre genomstromning an Express, modern design, TypeScript-stod | Mindre ekosystem an Express |
| **Node.js/NestJS** | Strukturerat, TypeScript-forst, modulart, foretagsklass | Brantare inlarningskurva, mer overhead for sma projekt |
| **Python/FastAPI** | Snabb utveckling, automatisk API-dokumentation, async-stod | Samre prestanda an Node.js for I/O-tunga applikationer, WebSocket-stod mindre moget |
| **Elixir/Phoenix** | Extremt bra realtidsprestanda, BEAM VM ar superstabil, LiveView | Liten utvecklarpool, nytt sprak att lara sig |
| **Go** | Hogsta prestanda, inbyggd concurrency | Mer kod kravs, saknar samma niva av realtidsbibliotek |

**Motivering:** For ett flerpelarspel i Jeopardy-stil ar Node.js det basta valet tack vare:
- Samma sprak (JavaScript/TypeScript) pa bade klient och server
- Socket.IO:s utmarkta stod for rum, namespaces och automatisk aterkoppling
- Stort ekosystem av quiz/spel-relaterade paket och exempel

### 2. Databas

**Rekommendation: PostgreSQL (primar) med Redis (cache/realtidstillstand)**

| Databas | Fordelar | Nackdelar | Bast for |
|---------|----------|-----------|----------|
| **PostgreSQL** | Stark relationsintegritet, JSONB-stod, gratis | Konfiguration kravs, tyngre an SQLite | Fragor, kategorier, anvandare, poanghistorik |
| **SQLite** | Noll konfiguration, enkel fil, portabel | Begransad concurrency, svart att skala | Utveckling/testning, sma installationer |
| **MongoDB** | Flexibelt schema, bra for snabbt prototypande | Svagare relationsintegritet | Logg-data, ostrukturerade fragor |
| **Redis** | Extremt snabb (in-memory), pub/sub, TTL | Flyktigt minne | Spelstatus i realtid, sessionshantering, leaderboards |

### 3. Realtidskommunikation

**Rekommendation: Socket.IO**

| Teknologi | Kommunikationsmodell | Fordelar | Nackdelar |
|-----------|---------------------|----------|-----------|
| **Socket.IO** | Tvavags (bidirektionell) | Rum och namespaces inbyggt, automatisk aterkoppling, fallback till long-polling | Hogre message-overhead an ren WebSocket |
| **WebSocket (rent)** | Tvavags | Lagsta latens, minst overhead | Krav pa egen implementation av rum, aterkoppling, felhantering |
| **SSE (Server-Sent Events)** | Envags (server -> klient) | Enkel, HTTP-baserad | Kan bara skicka fran server till klient, olampligt for spelsvar |

**Motivering:** Socket.IO ar det klara valet for ett quiz-spel:
- **Rum (rooms):** Varje spelsession ar ett rum
- **Namespaces:** Separera spellogik fran t.ex. chat eller admin
- **Presence:** Spar vilka spelare som ar anslutna/frankopplade
- **Automatisk aterkoppling:** Kritiskt i klassrumsmiljoer med instabilt WiFi

### 4. Autentisering

**Rekommendation: Google OAuth 2.0 + enkel rumskod for elever**

| Metod | Fordelar | Nackdelar | Bast for |
|-------|----------|-----------|----------|
| **Google OAuth 2.0 / SSO** | De flesta skolor anvander Google Workspace for Education, sakert | Krav pa Google-konto | Larare/administratorer |
| **Enkel rumskod (Kahoot-modell)** | Noll friktionsinloggning, elever anger bara namn + kod | Ingen bestandig identitet | Elever i live-spel |
| **JWT-tokens** | Stateless, skalbart | Tokens maste hanteras sakert | Alla autentiseringsscenarier |

**Motivering:** En tvanivamodell ar bast for skolmiljon:
1. **Larare:** Loggar in med Google for att skapa och hantera fragor/spel
2. **Elever:** Gar med via rumskod + valfritt nickname (som Kahoot) -- noll friktion

### 5. API-design

**Rekommendation: REST API**

**Foreslagen API-struktur:**
```
POST   /api/auth/login          -- Google OAuth
GET    /api/questions            -- Lista fragor (filtrering, paginering)
POST   /api/questions            -- Skapa fraga
PUT    /api/questions/:id        -- Uppdatera fraga
DELETE /api/questions/:id        -- Ta bort fraga
POST   /api/questions/import     -- Importera fran CSV/JSON
GET    /api/questions/export     -- Exportera till CSV/JSON
GET    /api/categories           -- Lista kategorier
POST   /api/games                -- Skapa nytt spel
GET    /api/games/:id            -- Hamta speldata
GET    /api/games/:id/scores     -- Hamta poangstallning
POST   /api/games/:id/join       -- Ga med i spel (via rumskod)
```

### 6. Hantering av spelsessioner

**Rekommendation: Socket.IO-rum med Redis-backed tillstand**

**Arkitekturmonster (inspirerat av Kahoot):**

1. **Skapa spel:** Lararen skapar ett spel via REST API -> unikt rum-ID genereras (t.ex. 6-siffrig kod som "482917")
2. **Anslut till spel:** Elever anger rumskoden -> Socket.IO `join(roomId)` -> servern emittar `player-joined`
3. **Spelstatus i Redis:** `gameState:{roomId}` lagrar aktuellt tillstand
4. **Statemaskin for spelflode:**
   ```
   LOBBY -> QUESTION_DISPLAY -> ANSWER_PHASE -> REVEAL_ANSWER -> SCOREBOARD -> (nasta fraga eller) FINAL_RESULTS
   ```
5. **Aterkoppling:** Om en spelare tappar anslutning kan de ateransluta via samma rumskod

### 7. Fragebankhantering

**Rekommendation: CRUD API + CSV/JSON import/export**

**Import/Export:**
- **CSV-import:** Enkelt for larare att skapa fragor i Excel/Google Sheets och importera
  ```csv
  kategori,fraga,ratt_svar,fel_svar_1,fel_svar_2,fel_svar_3,poang,svarighet
  Historia,Vem var Sveriges forsta kung?,Erik Segersall,Gustav Vasa,Karl XII,Birger Jarl,200,medel
  ```
- **JSON-import/export:** For programmatisk anvandning och backup
- **Mallnedladdning:** Tomma CSV/JSON-mallar for att hjalpa larare komma igang
- **Validering:** Kontrollera att alla obligatoriska falt finns, inga dubbletter, korrekta datatyper

**Kategorisering:**
- Hierarkisk kategorisering (amne -> delomrade)
- Tagg-system for flexibel filtrering
- Svarighetsnivaer (latt/medel/svar eller Jeopardy-poang: 200/400/600/800/1000)

### 8. Multiplayer-arkitektur

**Rekommendation: Vardstyrd modell med serverauktoritet**

```
[Lararens enhet (Vard)]  <--Socket.IO-->  [Server]  <--Socket.IO-->  [Elev 1]
                                             |                        [Elev 2]
                                             |                        [Elev N]
                                          [Redis]
                                        (spelstatus)
```

**Nyckelkomponenter:**

1. **Vardstyrt flode:** Lararen styr spelets takt
2. **Serverauktoritet:** Servern validerar alla svar, beraknar poang, hanterar timer
3. **Poangberakning:** `poang = baspoang * (kvarvarande_tid / total_tid)`
4. **Turordning:** Buzz-in system -- forsta spelare att trycka far svara
5. **Leaderboard:** Uppdateras efter varje fraga
6. **Presence-tracking:** Servern spar alla anslutna spelare

### 9. Hosting/deployment

**Rekommendation: Railway (primar) eller Docker self-hosted**

| Platform | Kostnad | Fordelar | Bast for |
|----------|---------|----------|----------|
| **Railway** | Fran ~$5/manad | Automatisk deploy fran GitHub, auto-detect Node.js | Snabb deployment |
| **Render** | Gratis-tier finns | Enkel, gratis for sma projekt | Prototyp/test |
| **Fly.io** | Fran ~$5/manad | Kantservrar, Docker-stod, bra for WebSockets | Prestanda-kritiskt |
| **Docker self-hosted** | Servarkostnad | Full kontroll, GDPR-vanligt | Kommuner/skolor med egna servrar |
| **Coolify/Dokploy** | ~$4.50/manad | Self-hosted PaaS, enkel Docker-management | Kontroll + enkel deployment |

**Docker-strategi for self-hosted:**
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
```

### 10. Datamodell

**Foreslagt databasschema (PostgreSQL):**

```sql
-- Anvandare (larare)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'teacher',
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Kategorier
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fragor
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    wrong_answers JSONB NOT NULL,
    points INTEGER NOT NULL DEFAULT 200,
    difficulty VARCHAR(20) DEFAULT 'medium',
    media_url TEXT,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Spelbrador (samling av fragor for ett specifikt spel)
CREATE TABLE game_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Koppling: vilka fragor finns pa vilken spelbrada
CREATE TABLE board_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES game_boards(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    position_row INTEGER NOT NULL,
    position_col INTEGER NOT NULL,
    UNIQUE(board_id, position_row, position_col)
);

-- Spelsessioner (aktiva/avslutade spel)
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES game_boards(id),
    host_id UUID REFERENCES users(id),
    room_code VARCHAR(6) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'lobby',
    current_question_id UUID REFERENCES questions(id),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Spelare i en session
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    nickname VARCHAR(100) NOT NULL,
    avatar VARCHAR(50),
    is_connected BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT NOW()
);

-- Svar och poang
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id),
    player_id UUID REFERENCES players(id),
    question_id UUID REFERENCES questions(id),
    given_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INTEGER,
    points_earned INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMP DEFAULT NOW()
);

-- Index for prestanda
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_active ON questions(is_active);
CREATE INDEX idx_board_questions_board ON board_questions(board_id);
CREATE INDEX idx_game_sessions_room ON game_sessions(room_code);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_answers_player ON answers(player_id);
```

**Redis-struktur for realtidsdata:**
```
game:{roomCode}:state     -> { status, currentQuestion, timerEnd, ... }
game:{roomCode}:players   -> Set av spelar-ID:n
game:{roomCode}:scores    -> Sorted Set { spelarId: totalPoang }
game:{roomCode}:buzzer    -> Lista av buzz-in ordning
```

**Relationsdiagram (forenklat):**
```
users 1--* game_boards 1--* board_questions *--1 questions *--1 categories
users 1--* game_sessions 1--* players
game_sessions 1--* answers *--1 players
game_sessions *--1 game_boards
answers *--1 questions
```

---

### Backend - Sammanfattning

| Komponent | Rekommendation |
|-----------|---------------|
| **Backend-ramverk** | Node.js + Express/Fastify + TypeScript |
| **Databas** | PostgreSQL + Redis |
| **ORM** | Prisma (typsaker, migrationer, bra DX) |
| **Realtid** | Socket.IO |
| **Autentisering** | Google OAuth 2.0 (larare) + rumskod (elever) |
| **API** | REST (eventuellt tRPC) |
| **Hosting** | Railway (moln) eller Docker + Coolify (self-hosted) |
| **Containrar** | Docker + docker-compose |

---

## Pedagogisk research

### 1. Spelbaserat larande (Game-Based Learning)

Forskning visar att spelbaserat larande (GBL) har en mattlig till stor effekt pa kognitiva, sociala, emotionella och motivationsrelaterade utfall. En metaanalys visade en signifikant stor effektstorlek (g = 0.822) for spelifiering i utbildning.

**Varfor det fungerar:**
- Spel aktiverar flera kognitiva processer samtidigt: problemlosning, kritiskt tankande, samarbete och kreativitet
- Spelmekaniker som poang, marken och leaderboards forstarker larandeupplevelsen betydligt
- GBL framjar aktivt larande snarare an passivt mottagande av information
- Spelbaserade miljoer erbjuder dynamiska feedback-loopar som gor att elever kan utvardera sina egna framsteg

**Utmaningar:**
- Langsiktig paverkan av spelifiering behover mer forskning
- Likvardighet i tekniktillgang maste sakerstallas
- Anpassning till laroplaner kvarstar som utmaning
- Larare behover strukturerade fortbildningsprogram for att implementera GBL effektivt

**Specifik forskning om Jeopardy i klassrummet:**
Simkins empiriska studie (2013) i *Journal of Information Systems Education* visade att aven om begransad forbattring i matbara laranderesultat pavisades, var elevernas upplevelser och attityder mycket positiva. Webbaserade review-verktyg i spelformat har visat sig framja hogre ordningens larande som meningsfull dialog och identifiering av missuppfattningar.

---

### 2. Blooms taxonomi och fragedesign

Blooms taxonomi ar ett ramverk som kategoriserar kognitiva fardigheter i sex nivaer. Den reviderade versionen (2001) anvands for att designa fragor som progressivt utvecklar elevers tankande.

**De sex nivaerna med exempelfragor for Jeopardy:**

| Niva | Beskrivning | Poang i Jeopardy | Exempelverb |
|------|------------|-------------------|-------------|
| **Minnas** | Aterkalla fakta och grundlaggande begrepp | 100-200 | Definiera, lista, namnge, upprepa |
| **Forsta** | Forklara ideer och begrepp | 200-400 | Beskriv, forklara, sammanfatta, tolka |
| **Tillampa** | Anvanda kunskap i nya situationer | 400-600 | Anvand, los, demonstrera, berakna |
| **Analysera** | Dra kopplingar mellan ideer | 600-800 | Jamfor, klassificera, undersok, urskilj |
| **Vardera** | Motivera stallningstaganden | 800-1000 | Bedom, argumentera, kritisera, forsvara |
| **Skapa** | Producera nytt eller originellt arbete | Daily Double | Designa, konstruera, utveckla, formulera |

**Koppling till speldesign:**
Poangsystemet i Jeopardy (100-1000) kan mappas direkt mot Blooms nivaer, dar lagre poang = enklare kognitiv niva och hogre poang = mer komplex kognitiv niva.

---

### 3. Formativ bedomning

Jeopardy kan anvandas som ett kraftfullt formativt bedomningsverktyg:

**Anvandningsomraden:**
- **Forkunskapskontroll:** Anvand Jeopardy i borjan av ett arbetsomrade for att kartlagga elevers forkunskaper
- **Processbedomning:** Spela under pagaende arbetsomrade for att identifiera kunskapsluckor
- **Summativ repetition:** Anvand som repetitionsverktyg infor prov
- **Exit tickets:** Korta Jeopardy-rundor som avslutning pa lektioner for att mata forstaelse

**Fordelar som bedomningsverktyg:**
- Ger lararen omedelbar insikt i elevers kunskapsniva
- Identifierar missuppfattningar i realtid
- Skapar en trygg miljo for att visa kunskap (lagspel minskar press)
- Data fran spelet kan analyseras for att planera fortsatt undervisning
- Framjar aktivt larande snarare an traditionella bedomningsformer

---

### 4. Motivation och engagemang

**Forskning om tavlingsmoment:**
- Leaderboards identifierades som en stark motivator; 53,09% av elever instammer helt eller delvis att det okar motivationen
- Spelifiering forbattrar engagemang med 48% och akademiska prestationer med 40%
- Poang och ranking ar de mest konkurrensinriktade spelelementen

**Positiva effekter:**
- Tavling bland kamrater, lagarbete och dashboards framjar effektivt inlarning av ny information
- Spelifiering ar en mangfacetterad strategi som kan forbattra motivation, akademiska prestationer, samarbete och den emotionella miljon i klassrummet
- Utmaningsbaserad spelifiering har visat positiv paverkan pa elevers akademiska prestation, motivation och flow-upplevelse

**Risker och varningar:**
- Kritiker menar att spelifiering kan hindra larande genom att hoja tavlingsstressen over nodvandiga nivaer
- Overdrivtig fokus pa poangsamling kan sabotera elevers engagemang och motivation
- Olampligt satta poangmal kan undergrava larandemotivationen

**Balansering:** Effektiviteten beror pa korrekt implementering och kontextkanslig design. En blandning av individuella och lagbaserade moment kan minska negativa tavlingseffekter.

---

### 5. Differentiering

**Poangsystem som svarighetsgrad:**
Jeopardys inbyggda poangsystem (100-1000) fungerar naturligt som differentiering:
- **Laga poang (100-200):** Grundlaggande faktafragor - tillgangliga for alla elever
- **Medelhoga poang (300-500):** Forstaelse- och tillampningsfragor - mellansvaara
- **Hoga poang (600-800):** Analys- och varderings-fragor - utmanande
- **Toppniva (900-1000):** Skapande och syntes - for elever som behover extra utmaning

**Praktiska strategier for Jeopardy:**
- Lag kan sammansattas heterogent (blandade formagor) sa att starkare elever stottar svagare
- Lararen kan styra vilka kategorier/poangnivaer som valjs
- "Daily Double" kan riktas mot specifika lag/elever
- Hjalpmedel (ledtradar, "50/50") kan erbjudas differentierat

---

### 6. Samarbetslarande

**Lagspel vs individuellt:**
Forskning visar att elever som arbetar tillsammans generellt gor storre akademiska och sociala framsteg an nar de tavlar mot varandra individuellt.

**Optimala gruppstorlekar:**
- 3-4 elever per lag har visat sig vara den mest effektiva gruppstorleken
- Heterogena grupper (blandade formagor) rekommenderas
- Teams-Games-Tournaments (TGT) ar en beprovad modell som anvander lagbaserade turneringar

**Fem grundlaggande element for kooperativt larande:**
1. **Positivt omsesidigt beroende** - alla behover bidra for att laget ska lyckas
2. **Direkt interaktion** - ansikte mot ansikte/aktiv kommunikation
3. **Individuellt och gruppansvar** - varje medlem har ansvar
4. **Sociala fardigheter** - ovning i samarbete och kommunikation
5. **Grupprocesser** - reflektion over hur gruppen fungerar

**Roller i lag (for Jeopardy):**
- **Lagkapten:** Tar slutgiltigt beslut om svar
- **Tidshallare:** Bevakar svarstiden
- **Researcher:** Diskuterar och foreslar svar
- **Poangforvaltare:** Haller koll pa lagets poang och strategi

---

### 7. Frageformulering - Best practices

**Grundprinciper:**
- Stammen (fragan) maste vara tydlig och entydig
- Undvik vaga termer som "vanligtvis", "mojligtvis", "kanske"
- Hall fragan koncis -- malet ar att bedoma amneskunskap, inte lasforstaelse
- Formulera stammen som en direkt fraga snarare an ett ofullstandigt pastaende
- Stammen ska vara meningsfull i sig sjalv

**Koppling till larandemal:**
- Varje fraga bor kopplas till specifika larandemal
- Anvand handlingsverb fran Blooms taxonomi for att sakerstalla ratt kognitiv niva
- Skriv svarsmall/bedomningsanvisningar samtidigt som fragorna skapas

**Vanliga fallgropar att undvika:**
- Dubbla negationer
- Absoluta termer ("alltid", "aldrig")
- Tvetydiga formuleringar som kan tolkas pa flera satt
- Fragor som testar mer an en sak at gangen
- Vokabular som inte ar anpassat till elevernas utvecklingsniva

**Jeopardy-specifikt:**
- Jeopardy-formatet ("svaret" ges, eleven formulerar "fragan") uppmuntrar omvant tankande
- Kategorier bor vara tydligt tematiskt avgransade
- Progression inom kategori bor folja Blooms taxonomi (enklast till svarast)

---

### 8. Befintliga verktyg - Jamforelse och luckor

| Verktyg | Styrkor | Svagheter |
|---------|---------|-----------|
| **Kahoot** | Intuitivt granssnitt, bra integrationer, detaljerad dataanalys | Max 120 tecken per fraga, dyrt for skolor |
| **Gimkit** | Kreativa spellagen, strategi och ekonomi integrerat | Ingen funktionell gratisniva, 1000 kr/ar per skola |
| **Quizlet** | Miljontals fardiga studiesets, flashcards | Quizlet Live begransat, primart repetitionsverktyg |
| **Quizizz** | Battre feedback an Kahoot, ljud/video i fragor | Begransad gratisniva |
| **Blooket** | Spelcentrerat, engagerande spellagen | Mindre pedagogisk djup |
| **Mentimeter** | Ordmoln, oppna fragor, omrostningar | Inte primart ett spelverktyg |

**Vad saknas i befintliga verktyg:**
- **Jeopardy-format specifikt:** Inget verktyg erbjuder ett autentiskt Jeopardy-upplagg med kategorier, poangval och omvand fragelogik
- **Pedagogisk koppling:** Svagt stod for att koppla fragor till specifika larandemal och Blooms nivaer
- **Differentiering:** Begransade mojligheter att anpassa svarighetsgrad systematiskt
- **Lararverktyg:** Saknar avancerade analysverktyg som visar kunskapsluckor per elev/grupp
- **Laroplanskoppling:** Inga verktyg integrerar med svenska laroplaner (Lgr22/Gy11)
- **Kostnad:** Manga verktyg kraver dyra prenumerationer
- **Offline-stod:** De flesta kraver standig internetuppkoppling

---

### 9. Tillganglighet och inkludering

**Universal Design for Learning (UDL):**
UDL ar ett ramverk som syftar till att gora larande tillgangligt for alla elever fran borjan, snarare an att anpassa i efterhand.

**Tillganglighetsprinciper for Jeopardy-spel:**
- **Visuell tillganglighet:** Hog kontrast, anpassningsbara textstorlekar, skarmlas arkompatibilitet
- **Auditiv tillganglighet:** Textbaserade alternativ till ljud, visuella signaler
- **Motorisk tillganglighet:** Tangentbordsnavigering, touchskarmsanpassning, tillracklig tid
- **Kognitiv tillganglighet:** Tydlig layout, begransad visuell belastning, forutsagbar navigering
- **Spraklig tillganglighet:** Anpassat sprak, mojlighet till oversattning, bildstod

**Inkluderande design:**
- UDL mojliggor att elever med varierande formagor och funktionsnedsattningar arbetar tillsammans som jamlikar
- Flexibla svarstider for elever som behover mer tid
- Lagspel kan naturligt inkludera alla elever genom att olika roller utnyttjar olika styrkor

---

### 10. Laroplanskoppling (Lgr22/Gy11)

**Lgr22 - Grundskolan:**
Laroplanen for grundskolan (Lgr22) tradde i kraft hosten 2022 och innehaller kursplaner dar centralt innehall har anpassats gallande omfattning, konkretionsniva och progression. Digitala verktyg namns i flera kursplaner.

**Gy11 - Gymnasiet:**
Gymnasiets laroplan innehaller overgripande mal och riktlinjer samt amnesplaner med amnets syfte, centralt innehall per kurs och kunskapskrav (betygskriterier).

**Praktisk implementering:**
- Fragor i Jeopardy kan taggas med centralt innehall fran specifika kursplaner
- Kategorier kan mappas mot amnens centrala innehall
- Poangnivaer kan kopplas till kunskapskravens nivaer (E, C, A)
- Verktyget bor stodja export av resultat kopplat till larandemal

**Notering:** Sverige har nyligen borjat skala ner anvandningen av digitala enheter i skolan. Detta innebar att digitala verktyg maste kunna motiveras pedagogiskt.

---

### 11. Feedback-loopar

**Forskning om direkt feedback:**
- Spelifierad feedback okar engagemang med 48% och akademiska prestationer med 40%
- Realtidsfeedback kan forbattra kunskapsretention med upp till 36%
- Omedelbara svar minskar fel med 30%
- 65% av elever vill ha mer feedback

**Tva typer av feedback-loopar:**
1. **Positiva feedback-loopar:** Forstarker beteende - korrekt svar ger poang, uppmuntran och framsteg
2. **Negativa feedback-loopar:** Korrigerar beteende - felaktigt svar ger forklaring, mojlighet till omprovning

**Feedback i Jeopardy-kontext:**
- **Omedelbar ratt/fel-indikation:** Eleven vet direkt om svaret var korrekt
- **Poangforandring:** Visuell feedback genom poangtavlan
- **Forklaringar:** Efter felaktigt svar kan korrekt svar med forklaring visas
- **Progressionsoversikt:** Elever och larare ser utveckling over tid
- **Lagfeedback:** Teammedlemmar ger varandra stod och feedback

---

### 12. Unika funktioner - Differentiering fran befintliga verktyg

**Pedagogiskt unika funktioner:**
1. **Blooms-kopplad fragedesign:** Inbyggt stod for att tagga fragor enligt Blooms taxonomi-niva, med automatisk mappning till poangniva
2. **Laroplanskoppling (Lgr22/Gy11):** Direkt koppling mellan fragor och centralt innehall i svenska kursplaner - unikt for den svenska marknaden
3. **Formativ bedomningsanalys:** Dashboard som visar kunskapsluckor per elev, per larandemal och per Bloom-niva
4. **Adaptiv svarighetsgrad:** Mojlighet att automatiskt justera fragornas svarighetsgrad baserat pa elevers prestation
5. **Omvand fragelogik:** Autentiskt Jeopardy-format dar "svaret" presenteras och eleven formulerar "fragan"

**Tillganglighet och inkludering:**
6. **UDL-integrerad design:** Inbyggt stod for skarmlas are, hog kontrast, anpassningsbara textstorlekar och flexibla svarstider
7. **Flersprakighetsstod:** Fragor kan visas pa flera sprak for nyanlanda elever
8. **Bildstod:** Mojlighet att lagga till bilder/symboler som stod i fragor

**Samarbete och differentiering:**
9. **Flexibla lagkonfigurationer:** Stod for individuellt spel, par, och lag (3-5 elever) med rollfordelning
10. **Heterogen lagsammansattning:** AI-assisterad lagindelning baserat pa tidigare prestationer
11. **"Strategi-lage":** Lag maste diskutera och enas innan svar ges - tidsfordrojning som uppmuntrar samtal

**Lararverktyg:**
12. **Fragebank med delning:** Larare kan dela och importera fragebanker inom skola/kommun
13. **AI-assisterad fragegenerering:** Forslag pa fragor baserat pa amne, niva och larandemal
14. **Exportfunktion:** Resultat kan exporteras och kopplas till dokumentationsverktyg
15. **Repetitionsmodus:** Fragor som manga elever svarade fel pa kan automatiskt aterkomma

**Spelmekanik:**
16. **"Daily Double" med twist:** Lararen kan rikta speciella fragor mot specifika lag/elever som differentiering
17. **"Final Jeopardy" som reflektion:** Avslutande fraga som kraver skriftligt svar - framjar metakognition
18. **Poanghistorik over tid:** Elever kan folja sin egen utveckling (inte bara jamfora med andra)
19. **"Second chance"-mekanism:** Elever som svarat fel far en forenklad foldjfraga for att stodja larande
20. **Offline-lage:** Fungerar utan internet - viktigt i svenska skolor med varierande infrastruktur
