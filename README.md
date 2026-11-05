# BunkSmart: Smart Attendance Forecasting & Timetable

> A web app that tells college students exactly how many classes they can safely skip, and how many they must attend to recover, so they never fall below the 75% detention threshold.

## Table of Contents

1. [The Problem](#-the-problem)
2. [The Solution](#-the-solution)
3. [Features](#-features)
4. [How the Math Works](#-how-the-math-works)
5. [Project Structure](#-project-structure)
6. [Sample Dataset](#-sample-dataset)
7. [Server Input Validation](#-server-input-validation)
8. [Getting Started](#-getting-started)
9. [Testing](#-testing)
10. [Data Storage Notes](#-data-storage-notes)
11. [Team & Contributions](#-team--contributions)
12. [Git Workflow](#-git-workflow)

---

## The Problem

Universities enforce a strict **75% minimum attendance** rule. Falling below it can mean detention from semester exams, loss of credits, or even losing the academic year. Students commonly struggle with:

<<<<<<< HEAD
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
=======
- **"Can I afford to bunk this lecture today?"** has no quick, reliable answer.
- **Mental math is inaccurate** and fails to project future percentage drops.
- **Late discovery.** By the time attendance slips into the danger zone (below 60%), it is often mathematically impossible to recover before the end of the semester.
>>>>>>> origin/main

## The Solution

BunkSmart gives immediate mathematical certainty through three core functions:

| Function | What it does |
|---|---|
| `getSafeSkips(courseId)` | Calculates exactly how many classes you can skip while staying at **≥ 75%** |
| `predictSkip(courseId)` | Simulates the exact attendance drop *before* you decide to bunk |
| `classesNeeded(courseId)` | Calculates how many consecutive classes you must attend to climb out of the danger zone |

## Features

- **Interactive Daily BunkSmart Flow** (`dailyFlow.js`): a step-by-step morning check-in where *Trace* calculates your safe skips, and *Prof. Maya* shakes her head angrily if you try to bunk into the danger zone.
- **Attendance Analytics & Trend Line**: an interactive Chart.js trend line with the mandatory 75% dashed reference threshold.
- **Student Profile Isolation**: profiles require a name and a roll number (format `24BCS123`). Attendance, courses, and logs are stored separately per roll number in browser `localStorage`.
- **Scheduled Attendance Tracking**: classes are counted after their timetable end time, and an unmarked class is recorded as absent. Use the timetable to correct an ended class. Refreshes preserve all browser-saved records.
- **Upcoming Class Plans**: save or change an *Attend / Skip* plan on each upcoming timetable class. Plans are stored per student in browser storage and **do not** affect attendance totals.
- **Undo Marking & CSV Export**: one-click reversal of an accidental mark, plus a CSV report download.
- **Interactive Character Stage**: the student's name appears in the attendance check-in and decision flow.
- **Pre-class Smart Alerts & Live Clock**: notifications before class and a real-time navbar clock.

## How the Math Works

Let `a` = classes attended, `t` = total classes held, and the threshold = 75%.

| Question | Formula |
|---|---|
| Current attendance | `a / t` |
| Safe skips | `floor(a / 0.75 − t)` (never below 0) |
| Attendance if you skip the next class | `a / (t + 1)` |
| Consecutive classes needed to recover | `ceil(3t − 4a)` (0 if already ≥ 75%) |

**Example:** DS304 (Explainable AI) at 10/18 needs `3×18 − 4×10 = 14` consecutive classes to get back to 75%.

## Project Structure

Built with vanilla HTML, CSS, ES modules, and a zero-dependency Node.js server.

```
BunkSmart/
├── server.js               # Node.js backend server with strict input validation
├── package.json            # Start & test scripts ("npm start", "npm test")
├── index.html              # Home & interactive character dialogue stage
├── timetable.html          # 5-day timetable grid & schedule view
├── tracker.html            # Attendance cards, progress rings & bunk simulator
├── dashboard.html          # Overview analytics & Chart.js doughnut chart
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
│   ├── logic.js            # Core attendance calculation formulas (the brain)
│   ├── storage.js          # Browser-local profile and attendance persistence
│   ├── dialogue.js         # Typewriter dialogue stage & character animations
│   ├── timetable.js        # Timetable renderer & day schedule controller
│   ├── tracker.js          # Tracker UI controller & skip prediction modal
│   ├── dashboard.js        # Analytics metrics & Chart.js renderer
│   ├── clock.js            # Real-time navbar live clock
│   └── notify.js           # Pre-class smart alerts & notifications
└── test/
    ├── server.test.js            # Server API tests
    └── attendance-local.test.js  # Browser storage & profile isolation tests
```

<<<<<<< HEAD
### Server API Seed Dataset

The following mid-semester records seed the standalone server API demo (`data/attendance.json`). The browser app starts each new local student profile with empty attendance records and stores marks per roll number in that browser; the browser UI currently does not sync its records to the server.

| Course Code | Course Name | Credits | Attended / Total | Initial % | Status | Safe Bunks Left | Recovery Path |
|---|---|---|---|---|---|---|---|
| **CS301** | Advanced Algorithms | 4 | 18 / 22 | 82% | `SAFE` | **2 bunks** | Above 75% target |
| **DS365** | Full Stack Development | 3 | 15 / 20 | 75% | `SAFE` | **0 bunks** | Borderline (0 bunks) |
| **CS351** | Software Design | 3 | 14 / 20 | 70% | `WARNING` | 0 bunks | Need 4 classes to recover |
| **DS304** | Explainable AI | 3 | 10 / 18 | 56% | `DANGER` | 0 bunks | Need 14 classes to recover |
| **EC354** | Tensor Multimodal | 3 | 16 / 20 | 80% | `SAFE` | **1 bunk** | Above 75% target |
=======
## Sample Dataset
>>>>>>> origin/main

BunkSmart ships with realistic B.Tech mid-semester seed data:

<<<<<<< HEAD
### Strict Server Input Validation
The Node.js backend server (`server.js`) uses zero external dependencies and enforces strict validation on all incoming data:
1. **JSON Syntax Integrity**: Rejects malformed JSON with `400 Bad Request`.
2. **Whitelisted Course IDs**: Rejects unknown course IDs (e.g. `INVALID_999`) with `400 Bad Request: Unknown courseId`.
3. **Dynamic Course Support**: The server accepts validated `POST /api/courses` and `DELETE /api/courses` requests. Browser-managed courses are stored locally and are not synchronized to the server.
4. **Type Strictness**: Enforces that `present` is strictly a boolean (`true`/`false`), rejecting strings like `"yes"` or numbers.
5. **Logical Bounds**: Rejects invalid values like `attended > total` (e.g. 25/20) or negative numbers with `400 Logical Constraint Error`.
6. **Path Traversal Protection**: Sanitizes file paths to prevent directory traversal.
=======
| **Course Code** | **Course Name** | **Credits** | **Attended / Total** | **Initial %** | **Status** | **Safe Bunks Left** | **Recovery Path** |
|-----------------|-----------------|-------------|---------------------|---------------|------------|-------------------|------------------|
| CS301 | Advanced Algorithms | 4 | 19 / 23 | 83% | 🟢 SAFE | 2 | Above 75% target |
| CS304 | Full Stack Development | 3 | 16 / 20 | 80% | 🟢 SAFE | 1 | Above 75% target |
| CS305 | Software Engineering | 3 | 9 / 14 | 64% | 🔴 DANGER | 0 | Need 8 consecutive classes to recover |
| DS301 | Explainable AI | 3 | 12 / 16 | 75% | 🟢 SAFE | 0 | Borderline (0 bunks) |
| EC354 | Tensor Multimodal Data | 3 | 10 / 18 | 56% | 🔴 DANGER | 0 | Need 14 consecutive classes to recover |
>>>>>>> origin/main

## Server Input Validation

The Node.js backend (`server.js`) uses **zero external dependencies** and strictly validates all incoming data:

| Check | Behavior |
|---|---|
| **JSON syntax integrity** | Malformed JSON is rejected with `400 Bad Request` |
| **Whitelisted course IDs** | Unknown IDs (e.g. `INVALID_999`) are rejected with `400 Bad Request: Unknown courseId` |
| **Dynamic course support** | Validated `POST /api/courses` and `DELETE /api/courses` add or remove courses across frontend and server |
| **Type strictness** | `present` must be a real boolean; strings like `"yes"` or numbers are rejected |
| **Logical bounds** | `attended > total` (e.g. 25/20) or negative numbers return `400 Logical Constraint Error` |
| **Duplicate protection** | Duplicate course IDs return `409 Conflict` |
| **Path traversal protection** | File paths are sanitized to prevent directory traversal |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (no other dependencies required)

### Run locally

```bash
# 1. Clone the repository
git clone https://github.com/mahi-404/BunkSmart.git
cd BunkSmart

# 2. Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

### First-time login

Enter your **name** and **roll number**. The roll number format is:

```
<2 year digits> + B + <CS | DS | EC> + <3 digits>
e.g.  24BCS123
```

Your profile and attendance are saved per roll number in this browser's `localStorage`, so they survive refreshes.

## Testing

```bash
npm test
```

The test suite isolates its data in temporary files via the `BUNKSMART_DB` environment variable, so live database records are never wiped or corrupted.

**Coverage includes:**

- **Server API:** health check, course listing, missing/spoofed `courseId`, non-boolean `present`, malformed JSON, `attended > total`, negative values, valid attendance updates, skip prediction, unknown routes (404), dynamic course add/delete, and duplicate course rejection (409).
- **Logic precision:** exact 75% boundary yields 0 safe skips, 80% (16/20) yields 1 safe skip, recovery calculation for low-attendance courses, and skip-prediction drop with unsafe verdict.
- **Browser storage:** profile isolation between roll numbers.

## Data Storage Notes

- Student profiles and attendance live in **browser storage** (`localStorage`).
- Data **does not sync** between browsers or devices.
- Clearing browser site data removes saved records.

## Team & Contributions

| Member | Role | Files Owned | Responsibilities |
|---|---|---|---|
| **S Divya** | Person 1 | `tracker.html`, `js/tracker.js`, `js/storage.js` | Course management forms, storyline integration, character assets |
| **Mahitha** | Person 2 | `server.js`, `test/server.test.js`, `js/logic.js`, `js/dialogue.js`, `index.html` | Backend server & input validation, automated test suite, core attendance math, dialogue engine |
| **Swetha** | Person 3 | `timetable.html`, `dashboard.html`, `js/timetable.js`, `js/dashboard.js`, `js/clock.js`, `js/notify.js` | Weekly timetable grid, live clock, pre-class alerts, Chart.js dashboard |

## Git Workflow

- `main`: production-ready, verified release.
- Feature branches merged through Pull Requests:
  - `feature/characters`
  - `feature/logic`
  - `feature/timetable-dashboard`
  - `feature/attendance-storyline`

---

