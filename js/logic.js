// ============================================================
//  logic.js  –  Attendance brain  🧠
//  Person 2 owns this file.
//  All other pages import from here on integration day.
// ============================================================

import { getRecord, setRecord } from "./storage.js";
import { getCourse } from "./data.js";

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
  const requiredPercent = getCourse(courseId)?.requiredPercent ?? 75;
  if (percent >= requiredPercent) return "safe";
  if (percent >= 60) return "warning";
  return "danger";
}

/**
 * getSafeSkips(courseId)
 * How many more classes can you skip and still stay ≥ 75%?
 */
export function getSafeSkips(courseId) {
  const { attended, total } = getAttendance(courseId);
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  return Math.max(0, Math.floor(attended / requiredRate - total));
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
  if (!getCourse(courseId)) throw new Error(`Course ${courseId} was not found.`);
  if (typeof present !== "boolean") throw new TypeError("Attendance must be marked present or absent.");
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
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  if (total > 0 && attended / total >= requiredRate) return 0;
  return Math.ceil((requiredRate * total - attended) / (1 - requiredRate));
}
