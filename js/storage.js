// ============================================================
//  storage.js  –  localStorage helpers
//  Person 2 owns this file.
// ============================================================

const KEY = "attendai_records"; // { [courseId]: { attended, total } }

export function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function saveRecords(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function getRecord(courseId) {
  const records = loadRecords();
  return records[courseId] || { attended: 0, total: 0 };
}

export function setRecord(courseId, data) {
  const records = loadRecords();
  records[courseId] = data;
  saveRecords(records);
}

export function clearAll() {
  localStorage.removeItem(KEY);
}
