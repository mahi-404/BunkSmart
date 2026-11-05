// ============================================================
//  logic.js – Attendance Calculation Engine (The Brain 🧠)
//  Person 2 owns this file.
//  Used by Person 1 (dialogue), Person 2 (tracker), Person 3 (timetable/dashboard).
// ============================================================

import { getRecord, setRecord, postAttendanceMark, syncFromServer, loadRecords } from "./storage.js";
import { getCourse } from "./data.js";

// ──────────────────────────────────────────────────────────────
// Public API (agreed function names from the project spec)
// ──────────────────────────────────────────────────────────────

/**
 * getAttendance(courseId)
 * Returns { attended, total, percent }
 * Uses Math.floor to never show false rounded 75% when raw ratio < 0.75
 */
export function getAttendance(courseId) {
  const { attended, total } = getRecord(courseId);
  const percent = total === 0 ? 0 : Math.floor((attended / total) * 100);
  return { attended, total, percent };
}

/**
 * getStatus(courseId)
 * Returns "safe" (>= requiredPercent) | "warning" (60–74%) | "danger" (<60%)
 * Evaluates raw mathematical ratio to prevent near-threshold rounding errors
 */
export function getStatus(courseId) {
  const { attended, total } = getRecord(courseId);
  if (total === 0) return "safe";
  const rawRatio = attended / total;
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  if (rawRatio >= requiredRate) return "safe";
  if (rawRatio >= 0.6) return "warning";
  return "danger";
}

/**
 * getSafeSkips(courseId)
 * Calculates how many more classes you can skip while staying >= required rate.
 * Formula: attended / (total + x) >= requiredRate  →  x <= (attended / requiredRate) - total
 */
export function getSafeSkips(courseId) {
  const { attended, total } = getRecord(courseId);
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  if (total === 0) return 0;
  return Math.max(0, Math.floor((attended / requiredRate) - total));
}

/**
 * predictSkip(courseId)
 * Returns the attendance % if you skip the very next class.
 */
export function predictSkip(courseId) {
  const { attended, total } = getRecord(courseId);
  const newTotal = total + 1;
  return newTotal === 0 ? 0 : Math.floor((attended / newTotal) * 100);
}

/**
 * markAttendance(courseId, present)
 * Synchronously updates local state and fires asynchronous server sync.
 * Automatically rolls back the optimistic update if server rejects the change.
 */
export async function markAttendance(courseId, present) {
  if (!getCourse(courseId)) throw new Error(`Course ${courseId} was not found.`);
  if (typeof present !== "boolean") throw new TypeError("Attendance must be marked present or absent.");

  const previous = getRecord(courseId);

  // 1. Optimistic synchronous update for instant UI feedback
  setRecord(courseId, {
    attended: present ? previous.attended + 1 : previous.attended,
    total: previous.total + 1,
  });

  // 2. Synchronize with backend server validation
  const result = await postAttendanceMark(courseId, present);

  // Revert optimistic update if server rejected the request
  if (!result.success) {
    setRecord(courseId, previous);
  }

  return result;
}

/**
 * classesNeeded(courseId)
 * How many consecutive classes you must attend to climb back to target.
 * Formula: (attended + x) / (total + x) >= requiredRate  →  x >= (requiredRate*total - attended) / (1 - requiredRate)
 */
export function classesNeeded(courseId) {
  const { attended, total } = getRecord(courseId);
  if (total === 0) return 0;
  const rawRatio = attended / total;
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  if (rawRatio >= requiredRate) return 0;
  return Math.ceil((requiredRate * total - attended) / (1 - requiredRate));
}

/**
 * syncState()
 * Fetches latest attendance records from the server to guarantee fresh state.
 */
export async function syncState() {
  return await syncFromServer();
}
