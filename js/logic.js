// Attendance calculations and browser-local updates.

import {
  getRecord, setRecord, syncFromServer, undoLastAttendanceMark,
  reconcileScheduledClasses, recordScheduledClass
} from "./storage.js";
import { getCourse, TIMETABLE, DAYS } from "./data.js";

function getRequiredRate(courseId) {
  return (getCourse(courseId)?.requiredPercent ?? 75) / 100;
}

export function getAttendance(courseId) {
  const { attended, total } = getRecord(courseId);
  const exactFraction = total === 0 ? 0 : attended / total;
  return {
    attended,
    total,
    percent: total === 0 ? 0 : Math.floor(exactFraction * 100),
    exactFraction,
  };
}

export function getStatus(courseId) {
  const { total, exactFraction } = getAttendance(courseId);
  if (total === 0) return "safe";
  if (exactFraction >= getRequiredRate(courseId)) return "safe";
  return exactFraction >= 0.6 ? "warning" : "danger";
}

export function getSafeSkips(courseId) {
  const { attended, total } = getRecord(courseId);
  const requiredRate = getRequiredRate(courseId);
  if (total === 0 || attended === 0 || requiredRate <= 0 ||
      attended / total < requiredRate) return 0;
  return Math.max(0, Math.floor((attended / requiredRate) - total));
}

export function predictSkip(courseId, skips = 1) {
  if (!Number.isInteger(skips) || skips < 0) {
    throw new RangeError("The number of skipped classes must be a non-negative integer.");
  }
  const { attended, total, percent: currentPercent } = getAttendance(courseId);
  const requiredRate = getRequiredRate(courseId);
  const newTotal = total + skips;
  const exactFraction = newTotal === 0 ? 0 : attended / newTotal;
  const percent = newTotal === 0 ? 0 : Math.floor(exactFraction * 100);
  const isSafe = exactFraction >= requiredRate;

  return {
    percent,
    exactFraction,
    currentPercent,
    drop: currentPercent - percent,
    status: isSafe ? "safe" : percent >= 60 ? "warning" : "danger",
    isSafe,
    safeSkipsAfter: requiredRate <= 0
      ? 0
      : Math.max(0, Math.floor((attended / requiredRate) - newTotal)),
    valueOf() { return percent; },
    toString() { return String(percent); },
  };
}

export function classesNeeded(courseId) {
  const { attended, total } = getRecord(courseId);
  const requiredRate = getRequiredRate(courseId);
  if (total === 0 || attended / total >= requiredRate || requiredRate <= 0) return 0;
  if (requiredRate >= 1) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.ceil(
    ((requiredRate * total) - attended) / (1 - requiredRate)
  ));
}

export async function markAttendance(courseId, present, session = null) {
  if (!getCourse(courseId)) throw new Error(`Course ${courseId} was not found.`);
  if (typeof present !== "boolean") {
    throw new TypeError("Attendance must be marked present or absent.");
  }

  if (session) {
    if (session.courseId !== courseId) {
      throw new Error("Scheduled class does not match the selected course.");
    }
    return {
      success: true,
      offline: true,
      ...recordScheduledClass(session, present),
    };
  }

  const previous = getRecord(courseId);
  setRecord(courseId, {
    attended: previous.attended + (present ? 1 : 0),
    total: previous.total + 1,
  });
  return { success: true, offline: true, record: getRecord(courseId) };
}

export function undoAttendance() {
  return undoLastAttendanceMark();
}

export function getTodayClasses() {
  const rawDay = new Date().getDay();
  const dayIdx = rawDay >= 1 && rawDay <= 5 ? rawDay - 1 : 0;
  const sessions = TIMETABLE
    .filter(slot => slot.day === dayIdx)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    dayName: DAYS[dayIdx],
    isWeekend: rawDay === 0 || rawDay === 6,
    sessions: sessions.map(slot => ({
      ...slot,
      course: getCourse(slot.courseId),
    })),
  };
}

export async function syncState() {
  reconcileScheduledClasses(TIMETABLE);
  return syncFromServer();
}

export function getSessionId(date, slot) {
  const localDate = date instanceof Date ? date : new Date(date);
  const dateKey = [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, "0"),
    String(localDate.getDate()).padStart(2, "0"),
  ].join("-");
  return `${dateKey}_${slot.startTime}_${slot.courseId}`;
}
