# BunkSmart 🎓✨

> A smart, cute pastel attendance tracker and timetable companion for college students.

---

## 👥 Team Work Split & Repository Architecture

### 1. Shared Foundation (Days 1–3)
Files shared across all members:
- `css/variables.css` — Global pastel design tokens (colors, typography, spacing, border-radius)
- `css/base.css` — Shared UI kit (buttons, navbar, cards, progress bars, badges)
- `js/data.js` — Core course definitions and weekly timetable slots

---

### 2. Feature Areas

#### 📅 Timetable & Dashboard (Person 3)
- `timetable.html` & `css/timetable.css` — Weekly timetable grid with today's highlighted column
- `dashboard.html` & `css/dashboard.css` — Overview cards & Chart.js doughnut chart
- `js/timetable.js` — Timetable rendering and detail sheets
- `js/dashboard.js` — Dashboard analytics and status counters
- `js/clock.js` — Real-time live clock for navbar
- `js/notify.js` — Smart pre-class notifications & toasts

#### 📋 Attendance Logic & Tracker (Person 2)
- `tracker.html` & `css/tracker.css` — Interactive subject attendance cards with circular rings
- `js/logic.js` — Attendance brain (`getAttendance`, `getStatus`, `getSafeSkips`, `predictSkip`, `markAttendance`)
- `js/storage.js` — LocalStorage persistence
- `js/tracker.js` — Interactive tracker card logic & prediction modal

#### 🎭 Character & Dialogue (Person 1)
- `index.html` & `css/index.css` — Landing page with student, tracker, and instructor cards
- *(Person 1 will add `characters.css` & `dialogue.js` on their branch)*

---

## 🌿 Git Workflow Rules

- **`main` branch**: Always production-ready; never push directly to `main`.
- **Feature branches**:
  - `feature/common-design` (Shared foundation: `variables.css`, `base.css`, `data.js`)
  - `feature/logic` (Person 2: `tracker.html`, `logic.js`, `storage.js`, `tracker.js`, `tracker.css`)
  - `feature/timetable-dashboard` (Person 3: `timetable.html`, `dashboard.html`, `timetable.js`, etc.)
  - `feature/characters` (Person 1: `characters.css`, `dialogue.js`, etc.)
- Open a Pull Request (PR) to merge features into `main`.
