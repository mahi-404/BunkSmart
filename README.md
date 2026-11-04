# 🌸 BunkSmart — Smart Attendance Forecasting & Timetable

> **BunkSmart** is an interactive, pastel-themed attendance forecasting web application designed for university students to track, plan, and forecast attendance while navigating mandatory 75% attendance detention thresholds. Built with pure vanilla HTML, modern CSS, modular JavaScript (ES Modules), and a zero-dependency input-validated Node.js backend.

---

## 🎯 1. Problem Scope & Solution (15 Marks)

### The Problem
Universities enforce a strict **75% minimum attendance rule**. Falling below this threshold leads to **detention from semester exams**, debarment, and mandatory repeats. However, students struggle with:
1. **Uncertainty**: "Can I afford to miss lecture tomorrow without being barred?"
2. **Poor Planning**: Calculating attendance mentally is error-prone and ignores future impacts.
3. **No Early Warnings**: Students often realize they are in the detention danger zone when it is too late to recover.

### The BunkSmart Solution
BunkSmart provides clear, mathematical clarity:
- **`getSafeSkips(courseId)`**: Calculates exactly how many classes you can skip while remaining $\ge 75\%$.
- **`predictSkip(courseId)`**: Simulates the mathematical impact on your percentage *before* you decide to miss.
- **`classesNeeded(courseId)`**: Informs students exactly how many consecutive classes they must attend to climb back out of the detention zone.
- **Interactive Character Stage**: Alex (Student), Trace (AI Tracker), and Prof. Maya (Faculty) react to student choices, illustrating real academic consequences through gamified dialogue.

---

## 🛠️ 2. Code Structure & Server Architecture (40 Marks)

### Clean Directory Structure
```
BunkSmart/
├── server.js               # Node.js backend server with strict input validation
├── package.json            # Project metadata, "npm start", "npm test"
├── index.html              # Landing page & Interactive 3-Character Dialogue Stage
├── timetable.html          # Full 5-day timetable grid & day schedule
├── tracker.html            # Attendance tracker cards with SVG progress rings
├── dashboard.html          # Overview metrics & Chart.js doughnut chart
├── data/
│   ├── defaultData.js      # Realistic B.Tech mid-semester course & seed attendance model
│   └── attendance.json     # Disk-persisted database (survives refreshes & restarts)
├── css/
│   ├── variables.css       # Clean solid pastel design tokens (no gradients)
│   ├── base.css            # Shared UI kit (buttons, navbar, cards, progress bars)
│   ├── characters.css      # Character animations (idle, enter, exit, angry-shake)
│   ├── timetable.css       # Timetable grid & bottom-sheet styling
│   ├── tracker.css         # Tracker cards, SVG rings, and modal styling
│   └── dashboard.css       # Dashboard metrics, chart container, alert banners
├── js/
│   ├── data.js             # Shared course list & weekly timetable slot definitions
│   ├── logic.js            # Business logic engine (getAttendance, getStatus, getSafeSkips, etc.)
│   ├── storage.js          # Persistence layer, local caching & API client
│   ├── dialogue.js         # Typewriter conversation engine & decision handler
│   ├── timetable.js        # Timetable renderer & quick-mark modal
│   ├── tracker.js          # Tracker UI controller, course management & skip prediction
│   ├── dashboard.js        # Dashboard metrics & Chart.js renderer
│   ├── clock.js            # Real-time navbar live clock
│   └── notify.js           # Smart 30-second low-attendance class alerts & toasts
└── test/
    └── server.test.js      # Automated test suite for input validation (11/11 tests pass)
```

### Real Data (No AI Slop / No All-Zero Placeholders)
The app is pre-seeded with realistic mid-semester engineering course data:
| Course Code | Course Name | Credits | Attended / Total | Initial % | Status | Safe Skips Left | Recovery Path |
|---|---|---|---|---|---|---|---|
| **CS301** | Data Structures & Algorithms | 4 | 18 / 22 | 82% | `SAFE` | **2 skips** | Above 75% target |
| **CS302** | Database Management Systems | 3 | 14 / 20 | 70% | `WARNING` | 0 skips | Need 4 consecutive classes |
| **CS303** | Operating Systems | 4 | 10 / 18 | 56% | `DANGER` | 0 skips | Need 14 consecutive classes |
| **CS304** | Computer Networks | 3 | 16 / 20 | 80% | `SAFE` | **1 skip** | Above 75% target |
| **MA201** | Engineering Mathematics III | 4 | 12 / 16 | 75% | `SAFE` | **0 skips** | On border; 0 skips |
| **CS305** | Software Engineering | 3 | 9 / 14 | 64% | `WARNING` | 0 skips | Need 6 consecutive classes |

### Server Input Validation ("A Server That Checks Its Input")
The backend server (`server.js`) strictly validates all incoming payloads and rejects invalid inputs with descriptive HTTP 400 errors:
1. **JSON Syntax Integrity**: Rejects malformed JSON with `400 Bad Request: Malformed JSON`.
2. **Whitelisted Course IDs**: Rejects unknown or spoofed course IDs (e.g. `INVALID_999`) with `400 Bad Request: Unknown courseId`.
3. **Type Strictness**: Enforces that `present` is strictly a boolean (`true`/`false`), rejecting `"yes"`, integers, objects, or null.
4. **Logical Bounds**: In the direct update endpoint, enforces that `attended` and `total` are non-negative integers and that **`attended <= total`** (rejects `attended: 25, total: 20` with `400 Logical Constraint Error`).
5. **Path Traversal Protection**: Sanitizes all file paths to prevent directory traversal attacks.

---

## 🎨 3. Design System & Aesthetics
- **Solid Pastel Palette**: Carefully selected soft pastel tones (blush pink, mint green, powder blue, gentle lavender, soft peach) with **zero gradients** as specified.
- **Readable Typography**: High-contrast, legible headings (`Plus Jakarta Sans`), body copy (`Inter`), and code badges (`JetBrains Mono`).
- **Interactive Micro-Interactions**: Typewriter dialogue animations, bouncy button pops, smooth SVG ring transitions, and animated alerts.

---

## 🚀 4. Quick Start & Verification

### Running the Server
```bash
# Start the backend server
npm start
```
The server will start at **http://localhost:3000** (or custom `PORT`).
Open `http://localhost:3000` in any web browser.

### Running the Automated Tests
```bash
# Run server input validation & logic test suite
npm test
```
**Test Results**:
```
🧪 Running BunkSmart Server Input Validation & Integration Tests...

  ✅ PASS: GET /api/health returns 200 with status ok
  ✅ PASS: GET /api/courses returns 6 real semester courses
  ✅ PASS: Server rejects missing courseId with 400 Bad Request
  ✅ PASS: Server rejects invalid/spoofed courseId with 400 Bad Request
  ✅ PASS: Server rejects non-boolean present ("yes") with 400 Bad Request
  ✅ PASS: Server rejects malformed JSON payload with 400 Bad Request
  ✅ PASS: Server rejects attended > total with 400 Logical Constraint Error
  ✅ PASS: Server rejects negative attendance values with 400 Validation Error
  ✅ PASS: Valid markAttendance updates attended count and recalculates percent
  ✅ PASS: Predict skip calculates drop and returns safety verdict
  ✅ PASS: Server returns 404 for non-existent API routes

========================================
📊 Test Results: 11 Passed, 0 Failed
========================================
```

---

## 🎬 5. Live Demo Walkthrough (Presentation - 30 Marks)

Follow this complete flow to demonstrate real data survival across page refreshes:

1. **Start the App**: Run `npm start` and visit `http://localhost:3000`.
2. **Interactive Character Stage**:
   - On the homepage, select **CS303 (Operating Systems, Danger, 56%)**.
   - Watch the typewriter conversation: Alex asks, Trace AI tracker triggers the **angry-shake animation** warning of detention, and Prof. Maya warns of debarment.
   - Click **"✅ Go to Class (Mark Present)"**.
   - Notice the attendance immediately updates from 10/18 (56%) to 11/19 (58%).
3. **Survives a Refresh (F5)**:
   - Hit **Refresh (F5)** in the browser.
   - The data is **still 11/19 (58%)** because it was persisted to `data/attendance.json`!
4. **Inspect in Timetable (`timetable.html`)**:
   - Navigate to **Timetable**.
   - Observe CS303 now reflects the updated percentage.
   - Click on the CS303 class card to open the bottom sheet modal.
   - Click **"✅ Mark Present"** right inside the modal.
5. **Inspect in Tracker (`tracker.html`)**:
   - Open **Tracker**.
   - Click **"🔮 What if I skip next class?"** on CS301 (DSA).
   - View the simulated impact: attendance drops from 82% to 78%, with the safe verdict displayed.
   - Test adding, editing, or deleting a custom course via the Course Manager.
6. **Inspect in Dashboard (`dashboard.html`)**:
   - Open **Dashboard**.
   - Notice the Chart.js doughnut chart, status badges (Safe / Warning / Danger), and attendance breakdown automatically reflect the updated figures.

---

## 👥 6. Team Work Split & Git Workflow (15 Marks)

### Team Roles & Contributions
- **Person 1 (Characters & Conversation Engine)**:
  - `index.html` (Hero, character stage)
  - `css/characters.css` (Animations: idle, enter, exit, angry-shake)
  - `js/dialogue.js` (Typewriter dialogue system, character reactions, user choices)
- **Person 2 (Attendance Logic & Tracker)**:
  - `tracker.html` & `css/tracker.css` (Interactive cards, SVG percentage rings, course manager)
  - `js/logic.js` & `js/storage.js` (Core calculation formulas, server communication, offline caching)
  - `server.js` & `test/server.test.js` (Backend server, input validation, automated test suite)
- **Person 3 (Timetable, Dashboard & Alerts)**:
  - `timetable.html` & `css/timetable.css` (5-day timetable grid, day view, bottom-sheet detail modal)
  - `dashboard.html` & `css/dashboard.css` (Metrics, Chart.js doughnut chart, status blocks)
  - `js/timetable.js`, `js/dashboard.js`, `js/clock.js`, `js/notify.js` (Live clock, 30s notifications)

### Git Branch Structure & Collaboration
- **`main`**: Clean, stable, verified release.
- **`feature/characters`**: Character animations & interactive dialogue.
- **`feature/logic`**: Mathematical formulas, state persistence & backend server.
- **`feature/timetable-dashboard`**: Timetable grid, dashboard analytics & notifications.
- **`feature/attendance-storyline`**: Course management & character storyline assets (PR #1 reviewed and merged).
