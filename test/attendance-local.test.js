import assert from "node:assert/strict";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage();

const storage = await import("../js/storage.js");
const logic = await import("../js/logic.js");

assert.throws(
  () => storage.saveStudentProfile({ name: "Student", rollNumber: "24BEE123" }),
  /24BCS123/
);

storage.saveStudentProfile({ name: "Student A", rollNumber: "24bcs123" });
assert.equal(storage.getStudentProfile().rollNumber, "24BCS123");

const originalA = storage.getRecord("DS365");
assert.deepEqual(originalA, { attended: 0, total: 0 });
await logic.markAttendance("DS365", true);
assert.deepEqual(storage.getRecord("DS365"), {
  attended: 1,
  total: 1,
});

storage.saveStudentProfile({ name: "Student B", rollNumber: "23BDS456" });
assert.deepEqual(storage.getRecord("DS365"), { attended: 0, total: 0 });
await logic.markAttendance("DS365", false);
assert.deepEqual(storage.getRecord("DS365"), { attended: 0, total: 1 });

storage.saveStudentProfile({ name: "Student A", rollNumber: "24BCS123" });
assert.deepEqual(storage.getRecord("DS365"), {
  attended: 1,
  total: 1,
});
assert.equal(logic.getAttendance("DS365").percent, 100);
assert.equal(logic.getStatus("CS301"), "safe");
assert.equal(logic.getSafeSkips("CS301"), 0);

const planId = "2024-01-01_09:00_CS301";
assert.equal(storage.getAttendancePlan(planId), null);
storage.saveAttendancePlan(planId, true);
assert.equal(storage.getAttendancePlan(planId), true);
assert.deepEqual(storage.getRecord("CS301"), { attended: 0, total: 0 });
storage.saveStudentProfile({ name: "Student B", rollNumber: "23BDS456" });
assert.equal(storage.getAttendancePlan(planId), null);
storage.saveStudentProfile({ name: "Student A", rollNumber: "24BCS123" });
assert.equal(storage.getAttendancePlan(planId), true);
storage.saveAttendancePlan(planId, false);
assert.equal(storage.getAttendancePlan(planId), false);
storage.removeAttendancePlan(planId);
assert.equal(storage.getAttendancePlan(planId), null);
storage.saveAttendancePlan(planId, true);
assert.deepEqual(storage.getRecord("CS301"), { attended: 0, total: 0 });

localStorage.setItem("bunksmart_tracking_start_24BCS123", new Date(2024, 0, 1, 8).toISOString());
const mondaySlots = [
  { day: 0, startTime: "09:00", endTime: "10:00", courseId: "CS301" },
  { day: 0, startTime: "10:00", endTime: "11:00", courseId: "EC354" },
  { day: 0, startTime: "11:15", endTime: "12:15", courseId: "CS351" },
];
const mondayNoon = new Date(2024, 0, 1, 12, 30);
assert.equal(storage.reconcileScheduledClasses(mondaySlots, mondayNoon), 3);
assert.equal(storage.reconcileScheduledClasses(mondaySlots, mondayNoon), 0);
assert.deepEqual(storage.getRecord("CS301"), { attended: 0, total: 1 });
assert.deepEqual(storage.getRecord("EC354"), { attended: 0, total: 1 });
assert.equal(storage.getScheduledClasses().length, 3);
assert.equal(storage.getAttendancePlan(planId), null);
assert.equal(
  storage.recordScheduledClass({
    id: "2024-01-01_09:00_CS301",
    courseId: "CS301",
    date: "2024-01-01",
    startTime: "09:00",
    endTime: "10:00",
  }, true).record.attended,
  1
);
assert.deepEqual(storage.getRecord("CS301"), { attended: 1, total: 1 });
assert.equal(storage.getScheduledClasses().length, 3);
assert.equal(storage.reconcileScheduledClasses(mondaySlots, mondayNoon), 0);

storage.saveStudentProfile({ name: "Reset Test", rollNumber: "20BDS000" });
localStorage.setItem("bunksmart_tracking_start_20BDS000", new Date(2024, 0, 1, 8).toISOString());
storage.clearAll();
assert.ok(storage.getAttendanceTrackingStart() > new Date(2024, 0, 1, 8));
assert.equal(storage.getScheduledClasses().length, 0);
assert.equal(storage.reconcileScheduledClasses(mondaySlots, mondayNoon), 0);

console.log("Local attendance tests passed: roll validation, profile isolation, persistence, and scheduled sessions.");
