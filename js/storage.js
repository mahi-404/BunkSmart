// ============================================================
//  storage.js – Browser persistence and roll-number-scoped student data.
// ============================================================

const BASE_KEY = "bunksmart_records";
const BASE_COURSES_KEY = "bunksmart_courses";
const BASE_LOG_KEY = "bunksmart_attendance_log";
const BASE_SESSIONS_KEY = "bunksmart_class_sessions";
const BASE_PLANS_KEY = "bunksmart_attendance_plans";
const BASE_TRACKING_START_KEY = "bunksmart_tracking_start";
const PROFILE_KEY = "bunksmart_student_profile";

export const SEED_RECORDS = {
CS301: { attended: 19, total: 23 },
EC303: { attended: 10, total: 18 },
CS304: { attended: 16, total: 20 },
DS301: { attended: 12, total: 16 },
CS305: { attended: 9, total: 14 }
};

// ── Student Profile Management ──────────────────────────────
export function getStudentProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (profile && typeof profile === "object" &&
        typeof profile.name === "string" && profile.name.trim().length > 0 &&
        typeof profile.rollNumber === "string" &&
        /^[0-9]{2}B(?:CS|DS|EC)[0-9]{3}$/.test(profile.rollNumber)) {
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

  if (!name || name.length > 80) {
    throw new Error("Name must contain between 1 and 80 characters.");
  }
  if (!/^[0-9]{2}B(?:CS|DS|EC)[0-9]{3}$/.test(rollNumber)) {
    throw new Error("Roll number must match the format 24BCS123.");
  }

  const previousProfile = getStudentProfile();
  const clean = {
    name,
    rollNumber,
    createdAt: previousProfile?.rollNumber === rollNumber
      ? previousProfile.createdAt || new Date().toISOString()
      : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));

  const studentKey = getScopedKey(BASE_KEY, rollNumber);
  if (!localStorage.getItem(studentKey)) {
    localStorage.setItem(studentKey, JSON.stringify(SEED_RECORDS));
  }
  const trackingStartKey = getScopedKey(BASE_TRACKING_START_KEY, rollNumber);
  if (!localStorage.getItem(trackingStartKey)) {
    localStorage.setItem(trackingStartKey, new Date().toISOString());
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
  const stored = localStorage.getItem(key);

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
  } catch (error) {
    console.warn("[Storage] Invalid attendance data; restoring the starting records.", error);
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
    throw new Error("Attendance could not be saved in this browser. Check available storage space and browser settings.", { cause: err });
  }
}

// ── Courses ─────────────────────────────────────────────────
export function loadCourses(defaultCourses) {
  const key = getScopedKey(BASE_COURSES_KEY);
  const stored = localStorage.getItem(key);
  if (!stored) return defaultCourses.map(course => ({ ...course }));
  const courses = JSON.parse(stored);
  if (!Array.isArray(courses)) {
    throw new TypeError("Saved courses must be a list.");
  }
  return courses;
}

export function saveCourses(courses) {
  const key = getScopedKey(BASE_COURSES_KEY);
  localStorage.setItem(key, JSON.stringify(courses));
}

// ── Attendance Log & History ────────────────────────────────
export function loadAttendanceLog() {
  const key = getScopedKey(BASE_LOG_KEY);
  const stored = localStorage.getItem(key);
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

function loadScheduledClasses() {
  const stored = localStorage.getItem(getScopedKey(BASE_SESSIONS_KEY));
  if (!stored) return {};
  const sessions = JSON.parse(stored);
  if (!sessions || typeof sessions !== "object" || Array.isArray(sessions)) {
    throw new TypeError("Saved class attendance must be an object.");
  }
  return sessions;
}

export function getScheduledClass(sessionId) {
  return loadScheduledClasses()[sessionId] || null;
}

export function getScheduledClasses() {
  return Object.values(loadScheduledClasses());
}

function loadAttendancePlans() {
  const stored = localStorage.getItem(getScopedKey(BASE_PLANS_KEY));
  if (!stored) return {};
  const plans = JSON.parse(stored);
  if (!plans || typeof plans !== "object" || Array.isArray(plans)) {
    throw new TypeError("Saved attendance plans must be an object.");
  }
  return plans;
}

export function getAttendancePlan(sessionId) {
  const plans = loadAttendancePlans();
  return Object.hasOwn(plans, sessionId) ? plans[sessionId] : null;
}

export function saveAttendancePlan(sessionId, willAttend) {
  if (typeof sessionId !== "string" || !sessionId ||
      typeof willAttend !== "boolean") {
    throw new TypeError("Attendance plan details are invalid.");
  }
  const plans = loadAttendancePlans();
  plans[sessionId] = willAttend;
  localStorage.setItem(getScopedKey(BASE_PLANS_KEY), JSON.stringify(plans));
  return willAttend;
}

export function removeAttendancePlan(sessionId) {
  const plans = loadAttendancePlans();
  if (!Object.hasOwn(plans, sessionId)) return false;
  delete plans[sessionId];
  localStorage.setItem(getScopedKey(BASE_PLANS_KEY), JSON.stringify(plans));
  return true;
}

export function recordScheduledClass(session, present) {
  if (!session || typeof session.id !== "string" || !session.id ||
      typeof session.courseId !== "string" || typeof present !== "boolean") {
    throw new TypeError("Scheduled class attendance details are invalid.");
  }

  const sessions = loadScheduledClasses();
  const previous = sessions[session.id];
  const current = getRecord(session.courseId);
  const attended = current.attended +
    (present ? 1 : 0) - (previous?.present ? 1 : 0);
  const total = current.total + (previous ? 0 : 1);
  const nextRecord = { attended, total };

  if (attended < 0 || attended > total) {
    throw new RangeError("Scheduled attendance counts are inconsistent.");
  }

  sessions[session.id] = { ...session, present };
  removeAttendancePlan(session.id);
  saveRecords({ ...loadRecords(), [session.courseId]: nextRecord });
  localStorage.setItem(getScopedKey(BASE_SESSIONS_KEY), JSON.stringify(sessions));
  return { ...sessions[session.id], record: nextRecord };
}

export function getAttendanceTrackingStart() {
  const profile = getStudentProfile();
  if (!profile) return null;

  const key = getScopedKey(BASE_TRACKING_START_KEY);
  const stored = localStorage.getItem(key);
  if (stored) {
    const parsed = new Date(stored);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const startedAt = new Date();
  localStorage.setItem(key, startedAt.toISOString());

  if (!profile.createdAt) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      ...profile,
      createdAt: startedAt.toISOString(),
    }));
  }
  return startedAt;
}

export function reconcileScheduledClasses(timetable, now = new Date()) {
  const startedAt = getAttendanceTrackingStart();
  if (!startedAt) return 0;

  const cursor = new Date(startedAt);
  cursor.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let added = 0;

  for (; cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = (cursor.getDay() + 6) % 7;
    for (const slot of timetable) {
      if (slot.day !== weekday) continue;

      const [endHour, endMinute] = slot.endTime.split(":").map(Number);
      const endsAt = new Date(cursor);
      endsAt.setHours(endHour, endMinute, 0, 0);
      if (endsAt > now || endsAt < startedAt) continue;

      const date = [
        cursor.getFullYear(),
        String(cursor.getMonth() + 1).padStart(2, "0"),
        String(cursor.getDate()).padStart(2, "0"),
      ].join("-");
      const id = `${date}_${slot.startTime}_${slot.courseId}`;
      if (!getScheduledClass(id)) {
        recordScheduledClass({
          id,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          courseId: slot.courseId,
        }, false);
        added++;
      }
      removeAttendancePlan(id);
    }
  }
  return added;
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
  const sessionsKey = getScopedKey(BASE_SESSIONS_KEY);
  const plansKey = getScopedKey(BASE_PLANS_KEY);
  localStorage.removeItem(key);
  localStorage.removeItem(logKey);
  localStorage.removeItem(sessionsKey);
  localStorage.removeItem(plansKey);
  localStorage.setItem(getScopedKey(BASE_TRACKING_START_KEY), new Date().toISOString());
}

// ── Backend Server Synchronization ──────────────────────────
export async function syncFromServer() {
  return { online: false, records: loadRecords() };
}

export async function postAttendanceMark(courseId, present) {
  return { success: true, offline: true, record: getRecord(courseId), present };
}

// ── Course API Synchronization ──────────────────────────────

export async function syncCoursesFromServer() {
  return { online: false, courses: loadCourses([]) };
}

export async function postCourseToServer(course) {
  return { success: true, course, offline: true };
}

export async function deleteCourseFromServer(courseId) {
  return { success: true, courseId, offline: true };
}
