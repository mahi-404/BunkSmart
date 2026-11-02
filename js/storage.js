// ============================================================
//  storage.js – Persistence, LocalStorage & Server Sync
//  Person 2 owns this file.
//  Handles local storage caching, course management & API sync.
// ============================================================

const KEY = "attendai_records"; // { [courseId]: { attended, total } }
const COURSES_KEY = "bunksmart_courses";
const LOG_KEY = "bunksmart_attendance_log";

export const SEED_RECORDS = {
  CS301: { attended: 18, total: 22 }, // 81.8% -> Safe (can skip 2)
  CS302: { attended: 14, total: 20 }, // 70.0% -> Warning (needs 4 classes)
  CS303: { attended: 10, total: 18 }, // 55.6% -> Danger (needs 14 classes)
  CS304: { attended: 16, total: 20 }, // 80.0% -> Safe (can skip 1)
  MA201: { attended: 12, total: 16 }, // 75.0% -> Safe on border (can skip 0)
  CS305: { attended: 9,  total: 14 }, // 64.3% -> Warning (needs 6 classes)
};

export function loadRecords() {
  const stored = localStorage.getItem(KEY);
  if (!stored) {
    saveRecords(SEED_RECORDS);
    return { ...SEED_RECORDS };
  }

  try {
    const records = JSON.parse(stored);
    if (!records || typeof records !== "object" || Array.isArray(records)) {
      throw new Error("Saved attendance data is invalid.");
    }
    return records;
  } catch {
    saveRecords(SEED_RECORDS);
    return { ...SEED_RECORDS };
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch (err) {
    console.error("[Storage] Failed to save to localStorage:", err);
  }
}

export function loadCourses(defaultCourses) {
  const stored = localStorage.getItem(COURSES_KEY);
  return stored ? JSON.parse(stored) : defaultCourses.map(course => ({ ...course }));
}

export function saveCourses(courses) {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

export function loadAttendanceLog() {
  const stored = localStorage.getItem(LOG_KEY);
  if (!stored) return [];

  try {
    const entries = JSON.parse(stored);
    if (!Array.isArray(entries) || entries.some(entry =>
      !entry || typeof entry.courseId !== "string" ||
      typeof entry.name !== "string" || typeof entry.present !== "boolean" ||
      !Number.isInteger(entry.percent) || typeof entry.timestamp !== "string"
    )) {
      return [];
    }
    return entries.slice(0, 30);
  } catch {
    return [];
  }
}

export function saveAttendanceLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}

export function getRecord(courseId) {
  const records = loadRecords();
  const record = records[courseId] || { attended: 0, total: 0 };
  if (!Number.isInteger(record.attended) || !Number.isInteger(record.total) ||
      record.attended < 0 || record.total < record.attended) {
    return { attended: 0, total: 0 };
  }
  return record;
}

export function setRecord(courseId, data) {
  if (!Number.isInteger(data.attended) || !Number.isInteger(data.total) ||
      data.attended < 0 || data.total < data.attended) {
    throw new RangeError("Attendance counts must be non-negative integers.");
  }
  const records = loadRecords();
  records[courseId] = data;
  saveRecords(records);
}

export function removeRecord(courseId) {
  const records = loadRecords();
  delete records[courseId];
  saveRecords(records);
}

export function clearAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LOG_KEY);
}

// ── Backend Server Synchronization ──────────────────────────

export async function syncFromServer() {
  try {
    const res = await fetch("/api/attendance", {
      headers: { "Cache-Control": "no-cache" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.records) {
      const records = loadRecords();
      for (const [id, rec] of Object.entries(data.records)) {
        records[id] = { attended: rec.attended, total: rec.total };
      }
      saveRecords(records);
      return { online: true, records };
    }
  } catch {
    // Offline / running without backend server
  }
  return { online: false, records: loadRecords() };
}

export async function postAttendanceMark(courseId, present) {
  try {
    const res = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, present })
    });
    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.message || result.error || "Failed to mark attendance" };
    }
    const records = loadRecords();
    records[courseId] = {
      attended: result.record.attended,
      total: result.record.total
    };
    saveRecords(records);
    return { success: true, record: result.record };
  } catch (err) {
    const records = loadRecords();
    const current = records[courseId] || { attended: 0, total: 0 };
    records[courseId] = {
      attended: present ? current.attended + 1 : current.attended,
      total: current.total + 1
    };
    saveRecords(records);
    return { success: true, offline: true, error: err.message };
  }
}
