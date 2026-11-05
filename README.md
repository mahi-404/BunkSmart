# 🌸 BunkSmart — Smart Attendance Forecasting & Timetable

> **BunkSmart** is a cute, pastel-themed attendance forecasting web app designed for college students to track attendance, forecast the impact of bunking, and stay safely above the mandatory 75% university detention threshold.

---

## 🎯 1. Problem Scope & Solution

### The Problem
Universities enforce a strict **75% minimum attendance rule**. Falling below 75% leads to **detention from semester examinations**, loss of credits, and academic year back. Students frequently struggle with:
- "Can I afford to bunk this lecture today?"
- Mental math is inaccurate and fails to project future percentage drops.
- By the time students notice their attendance has slipped into danger (<60%), it is often mathematically impossible to recover before end-semester.

### The BunkSmart Solution
BunkSmart gives immediate mathematical certainty:
- **`getSafeSkips(courseId)`**: Calculates exactly how many classes you can skip while remaining $\ge 75\%$.
- **`predictSkip(courseId)`**: Simulates the exact attendance drop *before* you decide to bunk.
- **`classesNeeded(courseId)`**: Calculates how many consecutive classes you must attend to climb out of the danger zone.
- **Interactive Character Stage**: Alex (Student), Trace (AI Tracker), and Prof. Maya (Faculty) react to your attendance choices in real time.

---

## 🛠️ 2. Project Architecture & Code Structure

A clean, modular client–server architecture built with pure vanilla HTML, modern CSS, modular ES JavaScript, and a zero-dependency Node.js HTTP backend.

```
BunkSmart/
├── server.js               # Node.js backend server with strict input validation
├── package.json            # Start & test scripts ("npm start", "npm test")
├── index.html              # Home & Interactive Character Dialogue Stage
├── timetable.html          # 5-Day Timetable Grid & Schedule View
├── tracker.html            # Attendance Cards, Progress Rings & Bunk Simulator
├── dashboard.html          # Overview Analytics & Chart.js Doughnut Chart
├── css/
│   ├── variables.css       # Solid pastel design tokens & theme variables (no gradients)
│   ├── base.css            # Shared UI kit (buttons, navbar, badges, cards, progress bars)
│   ├── characters.css      # Animated character stage (idle, enter, exit, angry-shake)
│   ├── timetable.css       # Timetable grid & day schedule styling
│   ├── tracker.css         # Tracker cards, SVG rings, and bunk prediction modal
│   ├── dashboard.css       # Overview analytics metrics & doughnut chart container
│   └── index.css           # Landing page hero & squad presentation styles
├── data/
│   ├── attendance.json     # JSON database (survives browser refresh & server restarts)
│   └── defaultData.js      # Realistic B.Tech mid-semester seed data
├── js/
│   ├── data.js             # Course list & weekly timetable schedule
│   ├── logic.js            # Core attendance calculation formulas (The Brain)
│   ├── storage.js          # Persistence layer & server REST API client
│   ├── dialogue.js         # Typewriter dialogue stage & character animations
│   ├── timetable.js        # Timetable renderer & day schedule controller
│   ├── tracker.js          # Tracker UI controller & skip prediction modal
│   ├── dashboard.js        # Analytics metrics & Chart.js renderer
│   ├── clock.js            # Real-time navbar live clock
│   └── notify.js           # Pre-class smart alerts & notifications
└── test/
    └── server.test.js      # Automated test suite (16 passing tests)
```

### Realistic Engineering Dataset
| Course Code | Course Name | Credits | Attended / Total | Initial % | Status | Safe Bunks Left | Recovery Path |
|---|---|---|---|---|---|---|---|
| **CS301** | Data Structures & Algorithms | 4 | 18 / 22 | 81% | `SAFE` | **2 bunks** | Above 75% target |
| **CS302** | Database Management Systems | 3 | 14 / 20 | 70% | `WARNING` | 0 bunks | Need 4 classes to recover |
| **CS303** | Operating Systems | 4 | 10 / 18 | 55% | `DANGER` | 0 bunks | Need 14 classes to recover |
| **CS304** | Computer Networks | 3 | 16 / 20 | 80% | `SAFE` | **1 bunk** | Above 75% target |
| **MA201** | Engineering Mathematics III | 4 | 12 / 16 | 75% | `SAFE` | **0 bunks** | Borderline (0 bunks) |
| **CS305** | Software Engineering | 3 | 9 / 14 | 64% | `WARNING` | 0 bunks | Need 6 classes to recover |

### Strict Server Input Validation
The Node.js backend server (`server.js`) uses zero external dependencies and enforces strict validation on all incoming data:
1. **JSON Syntax Integrity**: Rejects malformed JSON with `400 Bad Request`.
2. **Whitelisted Course IDs**: Rejects unknown course IDs (e.g. `INVALID_999`) with `400 Bad Request: Unknown courseId`.
3. **Dynamic Course Support**: Accepts validated `POST /api/courses` and `DELETE /api/courses` to dynamically add/remove courses across both frontend and server.
4. **Type Strictness**: Enforces that `present` is strictly a boolean (`true`/`false`), rejecting strings like `"yes"` or numbers.
5. **Logical Bounds**: Rejects invalid values like `attended > total` (e.g. 25/20) or negative numbers with `400 Logical Constraint Error`.
6. **Path Traversal Protection**: Sanitizes file paths to prevent directory traversal.

---

## 🚀 3. Quick Start & Test Suite

### Running the Server
```bash
npm start
```
Open **http://localhost:3000** in your browser.

### Running the Test Suite
```bash
npm test
```
The test suite isolates test data to temporary files via `BUNKSMART_DB` so live database records are never wiped or corrupted.

**Test Results**:
```
🧪 Running BunkSmart Server Input Validation & Integration Tests...

  ✅ PASS: GET /api/health returns 200 with status ok
  ✅ PASS: GET /api/courses returns semester courses
  ✅ PASS: Server rejects missing courseId with 400 Bad Request
  ✅ PASS: Server rejects invalid/spoofed courseId with 400 Bad Request
  ✅ PASS: Server rejects non-boolean present ("yes") with 400 Bad Request
  ✅ PASS: Server rejects malformed JSON payload with 400 Bad Request
  ✅ PASS: Server rejects attended > total with 400 Logical Constraint Error
  ✅ PASS: Server rejects negative attendance values with 400 Validation Error
  ✅ PASS: Valid markAttendance updates attended count and recalculates percent
  ✅ PASS: Predict skip calculates drop and returns safety verdict
  ✅ PASS: Server returns 404 for non-existent API routes
  ✅ PASS: Threshold check: 56/75 (74.67%) correctly reports "warning", percent 74, and 1 class needed
  ✅ PASS: POST /api/courses dynamically adds and validates new course
  ✅ PASS: Server recognizes dynamically added course and updates attendance
  ✅ PASS: Server rejects duplicate course ID with 409 Conflict
  ✅ PASS: DELETE /api/courses cleanly deletes course and associated record

========================================
📊 Test Results: 16 Passed, 0 Failed
========================================
```

---

## 👥 4. Team Roles & Git Workflow

| Member | Role | Files Owned | Responsibilities |
|---|---|---|---|
| **S Divya** | Person 1 | `tracker.html`, `js/tracker.js`, `js/storage.js` | Course management forms, storyline integration, character assets |
| **Mahitha** | Person 2 | `server.js`, `test/server.test.js`, `js/logic.js`, `js/dialogue.js`, `index.html` | Backend server & input validation, automated test suite, core attendance math, dialogue engine |
| **Swetha** | Person 3 | `timetable.html`, `dashboard.html`, `js/timetable.js`, `js/dashboard.js`, `js/clock.js`, `js/notify.js` | Weekly timetable grid, live clock, pre-class alerts, Chart.js dashboard |

### Git Workflow Rules
- `main`: Production-ready, verified release.
- Feature branches merged through Pull Requests (`feature/characters`, `feature/logic`, `feature/timetable-dashboard`, `feature/attendance-storyline`).
