// ============================================================
//  storage.js  –  localStorage helpers
//  Person 2 owns this file.
// ============================================================

const KEY = "attendai_records"; // { [courseId]: { attended, total } }
const COURSES_KEY = "bunksmart_courses";
const LOG_KEY = "bunksmart_attendance_log";

export function loadRecords() {
  const stored = localStorage.getItem(KEY);
  if (!stored) return {};

  const records = JSON.parse(stored);
  if (!records || typeof records !== "object" || Array.isArray(records)) {
    throw new Error("Saved attendance data is invalid.");
  }
  return records;
}

export function saveRecords(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
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

  const entries = JSON.parse(stored);
  if (!Array.isArray(entries) || entries.some(entry =>
    !entry || typeof entry.courseId !== "string" ||
    typeof entry.name !== "string" || typeof entry.present !== "boolean" ||
    !Number.isInteger(entry.percent) || typeof entry.timestamp !== "string"
  )) {
    throw new Error("Saved attendance history is invalid.");
  }
  return entries.slice(0, 30);
}

export function saveAttendanceLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}

export function getRecord(courseId) {
  const records = loadRecords();
  const record = records[courseId] || { attended: 0, total: 0 };
  if (!Number.isInteger(record.attended) || !Number.isInteger(record.total) ||
      record.attended < 0 || record.total < record.attended) {
    throw new Error(`Saved attendance data for ${courseId} is invalid.`);
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
