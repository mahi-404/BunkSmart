// ============================================================
//  storage.js – Persistence & Server Sync
//  Person 2 owns this file.
//  Syncs with backend server and persists to localStorage.
// ============================================================

const KEY = "bunksmart_records";

export const SEED_RECORDS = {
  CS301: { attended: 18, total: 22 }, // 81.8% -> Safe (can skip 2)
  CS302: { attended: 14, total: 20 }, // 70.0% -> Warning (needs 4 classes)
  CS303: { attended: 10, total: 18 }, // 55.6% -> Danger (needs 14 classes)
  CS304: { attended: 16, total: 20 }, // 80.0% -> Safe (can skip 1)
  MA201: { attended: 12, total: 16 }, // 75.0% -> Safe on border (can skip 0)
  CS305: { attended: 9,  total: 14 }, // 64.3% -> Warning (needs 6 classes)
};

/**
 * Loads records from localStorage, or initializes with realistic mid-semester seed data.
 */
export function loadRecords() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all seed courses exist
      let missing = false;
      for (const id of Object.keys(SEED_RECORDS)) {
        if (!parsed[id] || typeof parsed[id].attended !== "number" || typeof parsed[id].total !== "number") {
          parsed[id] = { ...SEED_RECORDS[id] };
          missing = true;
        }
      }
      if (missing) saveRecords(parsed);
      return parsed;
    }
  } catch (err) {
    console.warn("[Storage] Corrupt localStorage, resetting to seed data:", err);
  }
  saveRecords(SEED_RECORDS);
  return { ...SEED_RECORDS };
}

export function saveRecords(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch (err) {
    console.error("[Storage] Failed to save to localStorage:", err);
  }
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

// ── Backend Server Synchronization ──────────────────────────

/**
 * Attempts to sync attendance records from the Node backend server.
 * Returns true if server responded, false if offline/fallback.
 */
export async function syncFromServer() {
  try {
    const res = await fetch("/api/attendance", {
      headers: { "Cache-Control": "no-cache" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.records) {
      const records = {};
      for (const [id, rec] of Object.entries(data.records)) {
        records[id] = { attended: rec.attended, total: rec.total };
      }
      saveRecords(records);
      return { online: true, records };
    }
  } catch {
    // Offline / running from static server - seamless fallback
  }
  return { online: false, records: loadRecords() };
}

/**
 * Sends attendance mark to server with strict input validation.
 */
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
    // Update local cache with verified server record
    const records = loadRecords();
    records[courseId] = {
      attended: result.record.attended,
      total: result.record.total
    };
    saveRecords(records);
    return { success: true, record: result.record };
  } catch (err) {
    // Fallback locally if server unreachable
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
