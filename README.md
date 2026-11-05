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
- **Interactive Daily BunkSmart Flow (`dailyFlow.js`)**: Step-by-step morning check-in where Trace calculates safe skips and Prof. Maya shakes her head angrily if you try to bunk into the danger zone!
- **Attendance Analytics & Trend Line**: Interactive Chart.js trend line with the mandatory 75% dashed reference threshold.
- **Student Profile Isolation**: Profiles require a name and a roll number in the format `24BCS123`. Attendance, courses, and logs are stored separately per roll number in browser `localStorage`.
- **Scheduled Attendance Tracking**: Only classes explicitly marked present or absent on the timetable affect attendance totals. Marks can be changed without double-counting, and browser-saved records survive refreshes.
- **Daily and Upcoming Class Plans**: Save an advisory Attend/Skip plan in browser storage. Plans do not affect attendance totals; record the actual result separately after class.
- **CSV Export**: Download a CSV attendance report from the tracker.
- **Interactive Character Stage**: The student's name appears in the attendance check-in and decision flow.

---

## 🛠️ 2. Project Architecture & Code Structure

A modular web app built with vanilla HTML, CSS, ES modules, and a zero-dependency Node.js server. Student profiles and attendance are saved in browser storage and do not sync between browsers or devices.

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
│   ├── attendance.json     # Server-side demo/test data
│   └── defaultData.js      # Realistic B.Tech mid-semester seed data
├── js/
│   ├── data.js             # Course list & weekly timetable schedule
│   ├── logic.js            # Core attendance calculation formulas (The Brain)
│   ├── storage.js          # Browser-local profile and attendance persistence
│   ├── dialogue.js         # Typewriter dialogue stage & character animations
│   ├── timetable.js        # Timetable renderer & day schedule controller
│   ├── tracker.js          # Tracker UI controller & skip prediction modal
│   ├── dashboard.js        # Analytics metrics & Chart.js renderer
│   ├── clock.js            # Real-time navbar live clock
│   └── notify.js           # Pre-class smart alerts & notifications
└── test/
    ├── server.test.js      # Server API tests
    └── attendance-local.test.js # Browser storage and profile isolation tests
```

### Server API Seed Dataset

The following mid-semester records seed the standalone server API demo (`data/attendance.json`). The browser app starts each new local student profile with empty attendance records and stores marks per roll number in that browser; the browser UI currently does not sync its records to the server.

| Course Code | Course Name | Credits | Attended / Total | Initial % | Status | Safe Bunks Left | Recovery Path |
|---|---|---|---|---|---|---|---|
| **CS301** | Advanced Algorithms | 4 | 18 / 22 | 82% | `SAFE` | **2 bunks** | Above 75% target |
| **DS365** | Full Stack Development | 3 | 15 / 20 | 75% | `SAFE` | **0 bunks** | Borderline (0 bunks) |
| **CS351** | Software Design | 3 | 14 / 20 | 70% | `WARNING` | 0 bunks | Need 4 classes to recover |
| **DS304** | Explainable AI | 3 | 10 / 18 | 56% | `DANGER` | 0 bunks | Need 14 classes to recover |
| **EC354** | Tensor Multimodal | 3 | 16 / 20 | 80% | `SAFE` | **1 bunk** | Above 75% target |


### Strict Server Input Validation
The Node.js backend server (`server.js`) uses zero external dependencies and enforces strict validation on all incoming data:
1. **JSON Syntax Integrity**: Rejects malformed JSON with `400 Bad Request`.
2. **Whitelisted Course IDs**: Rejects unknown course IDs (e.g. `INVALID_999`) with `400 Bad Request: Unknown courseId`.
3. **Dynamic Course Support**: The server accepts validated `POST /api/courses` and `DELETE /api/courses` requests. Browser-managed courses are stored locally and are not synchronized to the server.
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

Enter your name and roll number (two year digits, `B`, `CS`, `DS`, or `EC`, then three digits; for example, `24BCS123`). Your attendance and profile are saved per roll number in this browser's `localStorage`, so they survive refreshes. Clearing browser site data or using a different browser/device removes or does not carry over those records.

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

🧪 Running BunkSmart Logic Mathematical Precision Tests...

  ✅ PASS: Exact 75% boundary yields 0 safe skips (cannot skip without dropping below 75%)
  ✅ PASS: 80% attendance (16/20) correctly calculates 1 safe skip
  ✅ PASS: Recovery calculator accurately predicts 14 consecutive classes needed for 55.6% (CS303)
  ✅ PASS: Skip prediction accurately calculates drop from 70% to 67% and marks unsafe

========================================
📊 Total Tests: 15 Passed, 0 Failed
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
