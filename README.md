# BunkSmart 🎓✨

> A smart, pastel attendance companion and timetable navigator for college students that calculates safe skips, predicts detention risk, and persists state across refreshes.

---

## 🎯 1. Scope: The Problem We Are Solving (15 Marks)

### The Problem
In most Indian and global engineering universities (e.g., VTU, Anna University, JNTU, BCA/B.Tech colleges), students face a **mandatory 75% attendance rule**. Falling below 75% results in detention, debarment from semester final exams, or heavy fines.
However, existing university portals:
1. **Only show retrospective counts** (e.g., "14 attended out of 20") days after classes occur.
2. **Never answer the student's real forward-looking question**: *"Can I safely take tomorrow off without dropping below 75%?"*
3. **Fail to calculate recovery**: *"If I am at 56%, how many consecutive classes must I attend to get back to safety?"*
4. **Lack proactive warnings**: Students only realize they are detained at the end of the semester when it is too late.

### The Solution: BunkSmart
BunkSmart addresses this with:
- **Exact Mathematical Forecasting**:
  - `getSafeSkips(courseId)`: Computes maximum permissible skips while maintaining $\ge 75\%$.
  - `predictSkip(courseId)`: Simulates the exact percentage drop if the next session or 2-hour lab is missed.
  - `classesNeeded(courseId)`: Calculates the minimum consecutive sessions required to climb out of the danger zone.
- **Visual Timetable Integration**: A weekly 5-day grid highlighting current sessions, today's schedule, and class details.
- **Interactive Character Stage**: 3 animated characters (Alex the Student, Trace the AI Tracker, and Prof. Maya the Faculty) that react dynamically to attendance safety levels.
- **Input-Validated Backend Server**: Persistent, disk-backed storage that **survives page refreshes** and rejects invalid, malformed, or out-of-bounds input with HTTP 400 Bad Request.

---

## 🛠️ 2. Code Structure & Server Architecture (40 Marks)

### Clean Directory Structure
```
FSD/
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
│   ├── storage.js          # Persistence layer & /api client with offline fallback
│   ├── dialogue.js         # Typewriter conversation engine & decision handler
│   ├── timetable.js        # Timetable renderer & quick-mark modal
│   ├── tracker.js          # Tracker UI controller & skip prediction modal
│   ├── dashboard.js        # Dashboard metrics & Chart.js renderer
│   ├── clock.js            # Real-time navbar live clock
│   └── notify.js           # Smart 30-second low-attendance class alerts & toasts
└── test/
    └── server.test.js      # Automated test suite for input validation (11/11 tests pass)
```

### Real Data (No AI Slop / No All-Zero Placeholders)
The app is pre-seeded with realistic mid-semester engineering data:
| Course Code | Course Name | Credits | Attended / Total | Initial % | Status | Safe Skips Left |
|---|---|---|---|---|---|---|
| **CS301** | Data Structures & Algorithms | 4 | 18 / 22 | 82% | `SAFE` | **2 skips** |
| **CS302** | Database Management Systems | 3 | 14 / 20 | 70% | `WARNING` | 0 skips (Need 4) |
| **CS303** | Operating Systems | 4 | 10 / 18 | 56% | `DANGER` | 0 skips (Need 14) |
| **CS304** | Computer Networks | 3 | 16 / 20 | 80% | `SAFE` | **1 skip** |
| **MA201** | Engineering Mathematics III | 4 | 12 / 16 | 75% | `SAFE` | **0 skips** |
| **CS305** | Software Engineering | 3 | 9 / 14 | 64% | `WARNING` | 0 skips (Need 6) |

### Server Input Validation ("A Server That Checks Its Input")
The backend server (`server.js`) strictly validates all incoming payloads and rejects invalid inputs with descriptive HTTP 400 errors:
1. **JSON Syntax Integrity**: Rejects malformed JSON with `400 Bad Request: Malformed JSON`.
2. **Whitelisted Course IDs**: Rejects unknown course IDs (e.g. `INVALID_999`) with `400 Bad Request: Unknown courseId`.
3. **Type Strictness**: Enforces that `present` is strictly a boolean (`true`/`false`), rejecting `"yes"`, numbers, or null.
4. **Logical Bounds**: In the direct update endpoint, enforces that `attended` and `total` are non-negative integers and that **`attended <= total`** (rejects `attended: 25, total: 20` with `400 Logical Constraint Error`).
5. **Path Traversal Protection**: Sanitizes all file paths to prevent directory traversal attacks.

---

## 🚀 3. Quick Start & Verification

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
**Expected Output**:
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

## 🎬 4. Live Demo Walkthrough (Presentation - 30 Marks)

Follow this complete flow to demonstrate real data survival across page refreshes:

1. **Start the App**: Run `npm start` and visit `http://localhost:3000`.
2. **Interactive Character Stage**:
   - On the homepage, select **CS303 (Danger, 56%)**.
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
6. **Inspect in Dashboard (`dashboard.html`)**:
   - Open **Dashboard**.
   - Notice the Chart.js doughnut chart, status badges (Safe / Warning / Danger), and attendance breakdown automatically reflect the updated figures.

---

## 👥 5. Team Work Split & Git Workflow (15 Marks)

### Team Roles
- **Person 1 (Characters & Conversation Engine)**:
  - `index.html` (Hero, character stage)
  - `css/characters.css` (Animations: idle, enter, exit, angry-shake)
  - `js/dialogue.js` (Typewriter dialogue system, character reactions, user choices)
- **Person 2 (Attendance Logic & Tracker)**:
  - `tracker.html` & `css/tracker.css` (Interactive cards, SVG percentage rings)
  - `js/logic.js` & `js/storage.js` (Core calculation formulas, server communication)
  - `server.js` & `test/server.test.js` (Backend server, input validation, automated test suite)
- **Person 3 (Timetable, Dashboard & Alerts)**:
  - `timetable.html` & `css/timetable.css` (5-day timetable grid, day view, bottom-sheet detail modal)
  - `dashboard.html` & `css/dashboard.css` (Metrics, Chart.js doughnut chart, status blocks)
  - `js/timetable.js`, `js/dashboard.js`, `js/clock.js`, `js/notify.js` (Live clock, 30s notifications)

### Git Branch Structure
- `main`: Clean, stable, verified release.
- `feature/characters`: Person 1 feature work.
- `feature/logic`: Person 2 feature work.
- `feature/timetable-dashboard`: Person 3 feature work.
- `feature/common-design`: Shared pastel foundation.
