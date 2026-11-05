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

await logic.syncState();
assert.deepEqual(storage.getRecord("CS301"), { attended: 0, total: 0 });
assert.equal(storage.getScheduledClasses().length, 0);
assert.equal(storage.getAttendancePlan(planId), true);

const scheduledSession = {
  id: planId,
  courseId: "CS301",
  date: "2024-01-01",
  startTime: "09:00",
  endTime: "10:00",
};
await logic.markAttendance("CS301", true, scheduledSession);
assert.deepEqual(storage.getRecord("CS301"), { attended: 1, total: 1 });
assert.equal(logic.getAttendance("CS301").percent, 100);
assert.equal(storage.getScheduledClasses().length, 1);
assert.equal(storage.getAttendancePlan(planId), null);

await logic.markAttendance("CS301", false, scheduledSession);
assert.deepEqual(storage.getRecord("CS301"), { attended: 0, total: 1 });
assert.equal(logic.getAttendance("CS301").percent, 0);
await logic.markAttendance("CS301", true, scheduledSession);
assert.deepEqual(storage.getRecord("CS301"), { attended: 1, total: 1 });
assert.equal(logic.getAttendance("CS301").percent, 100);

storage.saveStudentProfile({ name: "Reset Test", rollNumber: "20BDS000" });
storage.clearAll();
assert.equal(storage.getScheduledClasses().length, 0);

console.log("Local attendance tests passed: profile isolation, advisory plans, explicit scheduled marks, and updates.");
