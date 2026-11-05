// ============================================================
//  storage.js – Persistence, LocalStorage, Profiles & Server Sync
//  Handles student profile isolation, local storage caching,
//  undo history, and server synchronization.
// ============================================================

const BASE_KEY = "bunksmart_records";
const BASE_COURSES_KEY = "bunksmart_courses";
const BASE_LOG_KEY = "bunksmart_attendance_log";
const PROFILE_KEY = "bunksmart_student_profile";

export const SEED_RECORDS = {
  CS301: { attended: 18, total: 22 }, // 81.8% -> Safe (can skip 2)
  CS302: { attended: 14, total: 20 }, // 70.0% -> Warning (needs 4 classes)
  CS303: { attended: 10, total: 18 }, // 55.6% -> Danger (needs 14 classes)
  CS304: { attended: 16, total: 20 }, // 80.0% -> Safe (can skip 1)
  MA201: { attended: 12, total: 16 }, // 75.0% -> Safe on border (can skip 0)
  CS305: { attended: 9,  total: 14 }, // 64.3% -> Warning (needs 6 classes)
};

// ── Student Profile Management ──────────────────────────────
export function getStudentProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (profile && typeof profile === "object" && profile.name && profile.rollNumber) {
      return profile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStudentProfile(profile) {
  if (!profile || typeof profile !== "object") {
    throw new TypeError("Profile must be an object.");
  }
  const name = String(profile.name || "").trim();
  const rollNumber = String(profile.rollNumber || "").trim().toUpperCase();

  if (!name || !rollNumber) {
    throw new Error("Both name and roll number are required.");
  }

  const clean = {
    name,
    rollNumber,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));

  // If this student does not have records yet, initialize them with SEED_RECORDS
  const studentKey = getScopedKey(BASE_KEY, rollNumber);
  if (!localStorage.getItem(studentKey)) {
    localStorage.setItem(studentKey, JSON.stringify(SEED_RECORDS));
  }

  return clean;
}

export function clearStudentProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

// Helper to scope storage keys by roll number for student data isolation
function getScopedKey(base, specificRoll = null) {
  const roll = specificRoll || getStudentProfile()?.rollNumber;
  return roll ? `${base}_${roll.replace(/[^A-Z0-9_-]/gi, "_")}` : base;
}

// ── Attendance Records ──────────────────────────────────────
export function loadRecords() {
  const key = getScopedKey(BASE_KEY);
  const stored = localStorage.getItem(key) || localStorage.getItem(BASE_KEY) || localStorage.getItem("attendai_records");

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
    const key = getScopedKey(BASE_KEY);
    localStorage.setItem(key, JSON.stringify(records));
  } catch (err) {
    console.error("[Storage] Failed to save records to localStorage:", err);
  }
}

// ── Courses ─────────────────────────────────────────────────
export function loadCourses(defaultCourses) {
  const key = getScopedKey(BASE_COURSES_KEY);
  const stored = localStorage.getItem(key) || localStorage.getItem(BASE_COURSES_KEY);
  return stored ? JSON.parse(stored) : defaultCourses.map(course => ({ ...course }));
}

export function saveCourses(courses) {
  const key = getScopedKey(BASE_COURSES_KEY);
  localStorage.setItem(key, JSON.stringify(courses));
}

// ── Attendance Log & History ────────────────────────────────
export function loadAttendanceLog() {
  const key = getScopedKey(BASE_LOG_KEY);
  const stored = localStorage.getItem(key) || localStorage.getItem(BASE_LOG_KEY);
  if (!stored) return [];

  try {
    const entries = JSON.parse(stored);
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, 50);
  } catch {
    return [];
  }
}

export function saveAttendanceLog(entries) {
  const key = getScopedKey(BASE_LOG_KEY);
  localStorage.setItem(key, JSON.stringify(entries));
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

// ── Undo Last Attendance Mark ───────────────────────────────
export function undoLastAttendanceMark() {
  const log = loadAttendanceLog();
  if (!log.length) {
    throw new Error("No recent attendance actions to undo.");
  }

  const lastEntry = log.shift(); // remove most recent
  const { courseId, present } = lastEntry;

  const records = loadRecords();
  const current = records[courseId] || { attended: 0, total: 0 };

  const newAttended = present ? Math.max(0, current.attended - 1) : current.attended;
  const newTotal = Math.max(0, current.total - 1);

  records[courseId] = {
    attended: Math.min(newAttended, newTotal),
    total: newTotal
  };

  saveRecords(records);
  saveAttendanceLog(log);

  return {
    success: true,
    undoneEntry: lastEntry,
    updatedRecord: records[courseId]
  };
}

// ── Export to CSV ───────────────────────────────────────────
export function exportAttendanceCSV(courses) {
  const profile = getStudentProfile();
  const records = loadRecords();
  const lines = [
    `BunkSmart Attendance Report`,
    `Student: ${profile ? profile.name : "Guest"}`,
    `Roll Number: ${profile ? profile.rollNumber : "N/A"}`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
    `Course Code,Course Name,Instructor,Attended,Total,Percentage,Status,Safe Skips Left`
  ];

  for (const c of courses) {
    const rec = records[c.id] || { attended: 0, total: 0 };
    const pct = rec.total === 0 ? 0 : Math.round((rec.attended / rec.total) * 100);
    const status = pct >= 75 ? "SAFE" : pct >= 60 ? "WARNING" : "DANGER";
    const skips = rec.total === 0 ? 0 : Math.max(0, Math.floor((rec.attended / 0.75) - rec.total));
    lines.push(`"${c.code}","${c.name}","${c.instructor}",${rec.attended},${rec.total},${pct}%,${status},${skips}`);
  }

  const csvContent = "data:text/csv;charset=utf-8," + lines.map(e => e).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `BunkSmart_Attendance_${profile ? profile.rollNumber : "Export"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function clearAll() {
  const key = getScopedKey(BASE_KEY);
  const logKey = getScopedKey(BASE_LOG_KEY);
  localStorage.removeItem(key);
  localStorage.removeItem(logKey);
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
