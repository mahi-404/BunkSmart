// ============================================================
//  logic.js  –  Attendance brain  🧠
//  Person 2 owns this file.
//  All other pages import from here on integration day.
// ============================================================

import { getRecord, setRecord } from "./storage.js";

// ──────────────────────────────────────────────────────────────
// Public API  (agreed function names from the project spec)
// ──────────────────────────────────────────────────────────────

/**
 * getAttendance(courseId)
 * Returns { attended, total, percent }
 */
export function getAttendance(courseId) {
  const { attended, total } = getRecord(courseId);
  const percent = total === 0 ? 0 : Math.round((attended / total) * 100);
  return { attended, total, percent };
}

/**
 * getStatus(courseId)
 * Returns "safe" | "warning" | "danger"
 */
export function getStatus(courseId) {
  const { percent } = getAttendance(courseId);
  if (percent >= 75) return "safe";
  if (percent >= 60) return "warning";
  return "danger";
}

/**
 * getSafeSkips(courseId)
 * How many more classes can you skip and still stay ≥ 75%?
 */
export function getSafeSkips(courseId) {
  const { attended, total } = getAttendance(courseId);
  // attended / (total + x) >= 0.75  →  x <= attended/0.75 - total
  return Math.max(0, Math.floor(attended / 0.75 - total));
}

/**
 * predictSkip(courseId)
 * Returns the attendance % if you skip the very next class.
 */
export function predictSkip(courseId) {
  const { attended, total } = getAttendance(courseId);
  const newTotal = total + 1;
  return newTotal === 0 ? 0 : Math.round((attended / newTotal) * 100);
}

/**
 * markAttendance(courseId, present)
 * present = true → attended; false → absent
 */
export function markAttendance(courseId, present) {
  const { attended, total } = getRecord(courseId);
  setRecord(courseId, {
    attended: present ? attended + 1 : attended,
    total: total + 1,
  });
}

/**
 * classesNeeded(courseId)
 * How many consecutive classes to attend to reach 75%?
 */
export function classesNeeded(courseId) {
  const { attended, total } = getAttendance(courseId);
  if (attended / Math.max(total, 1) >= 0.75) return 0;
  // attended + x / (total + x) >= 0.75
  // x >= (0.75*total - attended) / 0.25
  return Math.ceil((0.75 * total - attended) / 0.25);
}
