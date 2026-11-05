// ============================================================
//  logic.js – Attendance Calculation Engine (The Brain 🧠)
//  Handles mathematical modeling, skip predictions, safe buffers,
//  and attendance recovery calculations.
// ============================================================

import {
  getRecord, setRecord, postAttendanceMark,
  syncFromServer, undoLastAttendanceMark
} from "./storage.js";
import { getCourse, TIMETABLE, DAYS } from "./data.js";

// ──────────────────────────────────────────────────────────────
// Public Attendance Calculation API
// ──────────────────────────────────────────────────────────────

/**
 * getAttendance(courseId)
 * Returns { attended, total, percent, exactFraction }
 */
export function getAttendance(courseId) {
  const { attended, total } = getRecord(courseId);
  const exactFraction = total === 0 ? 0 : attended / total;
  const percent = total === 0 ? 0 : Math.round(exactFraction * 100);
  return { attended, total, percent, exactFraction };
}

/**
 * getStatus(courseId)
 * Returns "safe" (>= requiredPercent) | "warning" (60–74%) | "danger" (<60%)
 */
export function getStatus(courseId) {
  const { exactFraction, percent } = getAttendance(courseId);
  const requiredPercent = getCourse(courseId)?.requiredPercent ?? 75;
  const requiredRate = requiredPercent / 100;

  // Real projected fraction takes precedence over rounding
  if (exactFraction >= requiredRate || percent >= requiredPercent) return "safe";
  if (percent >= 60) return "warning";
  return "danger";
}

/**
 * getSafeSkips(courseId)
 * Calculates how many consecutive classes can be skipped while staying >= target.
 * Formula: attended / (total + x) >= requiredRate -> x <= (attended / requiredRate) - total
 */
export function getSafeSkips(courseId) {
  const { attended, total } = getAttendance(courseId);
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  if (total === 0 || attended === 0) return 0;

  const currentRate = attended / total;
  if (currentRate < requiredRate) return 0;

  const maxSkips = Math.floor((attended / requiredRate) - total);
  return Math.max(0, maxSkips);
}

/**
 * predictSkip(courseId, skips = 1)
 * Returns detailed prediction if proposed absences occur.
 */
export function predictSkip(courseId, skips = 1) {
  const { attended, total, percent: currentPercent } = getAttendance(courseId);
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;

  const newTotal = total + skips;
  const exactFraction = newTotal === 0 ? 0 : attended / newTotal;
  const percent = newTotal === 0 ? 0 : Math.round(exactFraction * 100);
  const drop = currentPercent - percent;
  const isSafe = exactFraction >= requiredRate;
  const status = isSafe ? "safe" : percent >= 60 ? "warning" : "danger";

  const res = {
    percent,
    exactFraction,
    currentPercent,
    drop,
    status,
    isSafe,
    safeSkipsAfter: Math.max(0, Math.floor((attended / requiredRate) - newTotal)),
    valueOf() { return percent; },
    toString() { return String(percent); }
  };

  return res;
}

/**
 * classesNeeded(courseId)
 * How many consecutive classes you must attend to climb back to target.
 * Formula: (attended + x) / (total + x) >= requiredRate -> x >= (requiredRate*total - attended) / (1 - requiredRate)
 */
export function classesNeeded(courseId) {
  const { attended, total } = getAttendance(courseId);
  const requiredRate = (getCourse(courseId)?.requiredPercent ?? 75) / 100;
  if (total === 0 || attended / total >= requiredRate) return 0;

  const numerator = (requiredRate * total) - attended;
  const denominator = 1 - requiredRate;
  return Math.max(0, Math.ceil(numerator / denominator));
}

/**
 * markAttendance(courseId, present)
 * Synchronously updates local state and fires server sync.
 */
export async function markAttendance(courseId, present) {
  if (!getCourse(courseId)) throw new Error(`Course ${courseId} was not found.`);
  if (typeof present !== "boolean") throw new TypeError("Attendance must be marked present or absent.");

  // 1. Optimistic synchronous update
  const { attended, total } = getRecord(courseId);
  setRecord(courseId, {
    attended: present ? attended + 1 : attended,
    total: total + 1,
  });

  // 2. Synchronize with backend server validation
  return await postAttendanceMark(courseId, present);
}

/**
 * undoAttendance()
 * Reverts the most recent attendance marking.
 */
export function undoAttendance() {
  return undoLastAttendanceMark();
}

/**
 * getTodayClasses()
 * Returns today's timetable sessions (with fallback to Monday on weekends for easy demo).
 */
export function getTodayClasses() {
  const rawDay = new Date().getDay(); // 0=Sun, 1=Mon ... 6=Sat
  // If weekend (0 or 6), default to Monday (0) so the app can always be demoed!
  const dayIdx = (rawDay >= 1 && rawDay <= 5) ? rawDay - 1 : 0;
  const isDemoFallback = rawDay === 0 || rawDay === 6;

  const sessions = TIMETABLE
    .filter(slot => slot.day === dayIdx)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    dayName: DAYS[dayIdx],
    isWeekend: isDemoFallback,
    sessions: sessions.map(slot => ({
      ...slot,
      course: getCourse(slot.courseId)
    }))
  };
}

/**
 * syncState()
 * Fetches latest attendance records from the server to guarantee fresh state.
 */
export async function syncState() {
  return await syncFromServer();
}
