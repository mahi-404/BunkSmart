// ============================================================
//  tracker.js – Attendance Tracker Page
//  Person 2 owns this file.
//  Depends on: logic.js, storage.js, data.js, clock.js
// ============================================================

import {
  COURSES, addCourse, deleteCourse, escapeHtml, getCourse, updateCourse,
} from "./data.js";
import {
  getAttendance, getStatus, getSafeSkips, predictSkip,
  classesNeeded, syncState
} from "./logic.js";
import {
 clearAll as clearStorage, loadAttendanceLog, saveAttendanceLog,
 getScheduledClasses, getStudentProfile, exportAttendanceCSV
} from "./storage.js";
import { startClock } from "./clock.js";
import { initDailyFlow, openDailyFlow } from "./dailyFlow.js";

// ── Emoji map ──────────────────────────────────────────────────
const STATUS_MSG = {
  safe: "Attendance is at or above the required threshold.",
  warning: "Attendance is below the required threshold. Avoid further absences.",
  danger: "Attendance is low. Attend upcoming classes to recover.",
};

// Log store
const logEntries = [];
let editingCourseId = null;

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  startClock("navbar-clock");

  // Load student profile
  const profile = getStudentProfile();
  const nameEl = document.getElementById("student-name-display");
  const rollEl = document.getElementById("student-roll-display");
  if (!profile) {
    window.location.replace("index.html");
    return;
  }
  if (nameEl) nameEl.textContent = profile.name;
  if (rollEl) rollEl.textContent = profile.rollNumber;
  document.getElementById("refresh-attendance")?.addEventListener("click", () => window.location.reload());
  const storyNameEl = document.getElementById("story-student-name");
  if (storyNameEl) storyNameEl.textContent = profile.name;

  // Initialize Daily Flow
  initDailyFlow(() => {
    showToast("Plan saved", "Your plan is on the timetable. Mark each completed class to update attendance.", "info");
  });
  window.addEventListener("storage", event => {
    if (event.key?.endsWith(`_${profile.rollNumber}`)) refreshAll();
  });

  try {
    logEntries.push(...loadAttendanceLog());
    renderLog();
  } catch (error) {
    showToast("Couldn't load attendance history", error.message, "danger");
  }
  renderSummary();
  renderCards();
  renderStory();
  bindCourseForm();

  await syncState();
  renderSummary();
  renderCards();
  renderStory();
  setInterval(async () => {
    await syncState();
    refreshAll();
  }, 30_000);

  // Pre-select course from URL ?course=CS301
  const params = new URLSearchParams(window.location.search);
  const preload = params.get("course");
  if (preload) {
    const el = document.getElementById(`card-${preload}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.boxShadow = `0 0 0 3px var(--clr-lavender-dark), var(--shadow-lg)`;
      setTimeout(() => (el.style.boxShadow = ""), 2500);
    }
  }
});

function refreshAll() {
  logEntries.length = 0;
  logEntries.push(...loadAttendanceLog());
  renderSummary();
  renderCards();
  renderStory();
  renderLog();
}

// ── Summary bar ────────────────────────────────────────────────
function renderSummary() {
  const el = document.getElementById("summary-bar");
  if (!el) return;

  const safe    = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const warning = COURSES.filter(c => getStatus(c.id) === "warning").length;
  const danger  = COURSES.filter(c => getStatus(c.id) === "danger").length;
  const total   = COURSES.reduce((s, c) => s + getAttendance(c.id).total, 0);

  el.innerHTML = [
    { val: COURSES.length, lbl: "Subjects",     color: "var(--clr-primary-dark)" },
    { val: safe,           lbl: "Safe",         color: "var(--clr-safe-text)" },
    { val: warning,        lbl: "Warning",      color: "var(--clr-warning-text)" },
    { val: danger,         lbl: "Danger",       color: "var(--clr-danger-text)" },
    { val: total,          lbl: "Total marked", color: "var(--clr-primary-dark)" },
  ].map(s => `
    <div class="stat-card" style="--stat-color:${s.color}">
      <div class="stat-card__value">${s.val}</div>
      <div class="stat-card__label">${s.lbl}</div>
    </div>`).join("");
}

// ── Course cards ───────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById("course-grid");
  if (!grid) return;
  grid.innerHTML = COURSES.length
    ? COURSES.map(c => buildCard(c)).join("")
    : `<div class="course-empty">No subjects yet. Add your first course above to start tracking.</div>`;
}

function buildCard(course) {
  const { attended, total, percent } = getAttendance(course.id);
  const status  = getStatus(course.id);
  const skips   = getSafeSkips(course.id);
  const needed  = classesNeeded(course.id);
  // SVG ring
  const r  = 28;
  const circ = 2 * Math.PI * r;
  const offset = total === 0 ? circ : circ - (percent / 100) * circ;
  const statusClr = {
    safe: "var(--clr-safe)", warning: "var(--clr-warning)", danger: "var(--clr-danger)"
  }[status];

  const skipInfo = skips > 0
    ? `<span style="color:var(--clr-safe-text);font-weight:700">✓ ${skips} skip${skips > 1 ? "s" : ""} left</span>`
    : `<span style="color:var(--clr-danger-text);font-weight:700">No skips available</span>`;

  const needInfo = needed > 0
    ? `Need <strong style="color:var(--clr-${status}-text)">${needed}</strong> to reach 75%`
    : total === 0
      ? `<span style="color:var(--clr-text-muted)">Start attending to build your record</span>`
      : `<span style="color:var(--clr-safe-text);font-weight:700">At or above 75%</span>`;

  const statusMessage = STATUS_MSG[status];
  const isDanger = status === "danger";

  return `
    <div class="course-card ${isDanger ? 'danger-card' : ''}" id="card-${course.id}" style="--card-color:${course.color}">

      <div class="cc-header">
        <div class="cc-header-left">
          <div class="cc-title">${escapeHtml(course.name)}</div>
          <div class="cc-meta">
            <span>${escapeHtml(course.code)}</span>
            <span>${course.credits} credits</span>
            ${isDanger ? '<span class="danger-tag">DANGER</span>' : ''}
          </div>
          <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:var(--space-1)">
            ${escapeHtml(course.instructor)}
          </div>
        </div>

        <!-- Ring -->
        <div class="ring-wrap">
          <svg class="ring-svg" width="72" height="72" viewBox="0 0 72 72">
            <circle class="ring-bg" cx="36" cy="36" r="${r}" />
            <circle class="ring-fill"
              cx="36" cy="36" r="${r}"
              stroke="${statusClr}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"
            />
          </svg>
          <div class="ring-text">
            <span class="ring-pct" style="color:var(--clr-${status}-text)">${percent}%</span>
            <span class="ring-label">attend</span>
          </div>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="cc-stats">
        <div class="cc-stat">
          <div class="cc-stat-val">${attended}</div>
          <div class="cc-stat-lbl">Present</div>
        </div>
        <div class="cc-stat">
          <div class="cc-stat-val">${total - attended}</div>
          <div class="cc-stat-lbl">Absent</div>
        </div>
        <div class="cc-stat">
          <div class="cc-stat-val">${total}</div>
          <div class="cc-stat-lbl">Total</div>
        </div>
      </div>

      <!-- Skip info -->
      <div class="cc-predict">
        <span>${skipInfo}</span>
        <span style="margin-left:auto;font-size:var(--fs-xs);color:var(--clr-text-muted)">${needInfo}</span>
      </div>

      <!-- Status advisory -->
      <div style="padding:0 var(--space-5) var(--space-3);font-size:var(--fs-xs);color:var(--clr-text-muted);font-style:italic">
        ${statusMessage}
      </div>

      <div style="padding:0 var(--space-5) var(--space-4)">
        <button class="skip-predict-btn"
                onclick="window.openPredict('${course.id}')">
          Preview an absence
        </button>
      </div>

      <div class="cc-manage">
        <button type="button" onclick="window.editCourse('${course.id}')">Edit</button>
          <button type="button" onclick="window.removeCourse('${course.id}')">Delete</button>
      </div>

    </div>`;
}

// ── Storyline ──────────────────────────────────────────────────
function renderStory(outcome = "") {
  const select = document.getElementById("story-course");
  if (!select) return;

  const selectedId = select.value || COURSES[0]?.id;
  select.innerHTML = COURSES.map(course =>
    `<option value="${course.id}">${escapeHtml(course.code)} · ${escapeHtml(course.name)}</option>`
  ).join("");
  if (!COURSES.some(course => course.id === selectedId)) {
    select.value = COURSES[0]?.id || "";
  } else {
    select.value = selectedId;
  }

  const course = getCourse(select.value);
  if (!course) return;

  const { percent } = getAttendance(course.id);
  const status = getStatus(course.id);
  const skips = getSafeSkips(course.id);
  const afterSkip = predictSkip(course.id);
  const student = document.getElementById("story-alex");
  const trace = document.getElementById("story-trace");
  const maya = document.getElementById("story-maya");
  if (!student || !trace || !maya) return;
  const studentName = getStudentProfile()?.name || "Student";

  if (outcome === "ask") {
    student.textContent = `${studentName}: Should I skip ${course.name}? I could really use a break.`;
    trace.textContent = skips > 0
      ? `You have ${skips} safe skip${skips === 1 ? "" : "s"} left. Your attendance will become ${afterSkip}%.`
      : `No skips left. Skipping drops you to ${afterSkip}%, which is risky.`;
    maya.textContent = status === "safe"
      ? "You are safe, but staying consistent protects you against surprise quizzes."
      : "You are already walking a thin line. I expect to see you in the lecture hall.";
  } else if (outcome === "predict") {
    student.textContent = `${studentName}: If I miss ${course.code}, what happens to my record?`;
    trace.textContent = `Attendance moves from ${percent}% down to ${afterSkip}%. Status will be ${afterSkip >= 75 ? "SAFE" : afterSkip >= 60 ? "WARNING" : "DANGER"}.`;
    maya.textContent = afterSkip >= 75
      ? "Mathematically acceptable, but don't make skipping a habit."
      : "That choice pushes you directly toward attendance detention.";
  } else if (outcome === "present") {
    student.textContent = `${studentName}: Marked present for ${course.code}.`;
    trace.textContent = `Record logged! Attendance updated to ${percent}%.`;
    maya.textContent = status === "safe"
      ? "Good discipline. Keep this standard until end of semester."
      : `Good recovery step. You still need more regular attendance to become fully safe.`;
  } else if (outcome === "absent") {
    student.textContent = `${studentName}: Marked absent for ${course.code}.`;
    trace.textContent = `Down to ${percent}%. Safe skips remaining: ${skips}.`;
    maya.textContent = status === "safe"
      ? "An absence recorded. Keep track of your buffer before it disappears."
      : `You're in danger at ${percent}%. Attend every class until you recover.`;
  } else {
    student.textContent = status === "safe"
      ? `${studentName}: I've got ${course.code} next. Is one skip harmless?`
      : `${studentName}: I want to miss ${course.code}, but I'm not sure I can afford it.`;
    trace.textContent = `${percent}% attendance. ${skips} safe skip${skips === 1 ? "" : "s"} left; one skip would make it ${afterSkip}%.`;
    maya.textContent = status === "safe"
      ? "You're above the line for now. I still recommend showing up."
      : status === "warning"
        ? "You're close to the limit. One more absence could change everything."
        : "Your attendance needs rescuing. Please come to class.";
  }
}

document.getElementById("story-course")?.addEventListener("change", () => renderStory());
window.storyAsk = () => renderStory("ask");
window.storyPredict = () => {
  const course = getCourse(document.getElementById("story-course")?.value);
  if (course) {
    renderStory("predict");
    window.openPredict(course.id);
  }
};

// ── Predict modal ──────────────────────────────────────────────
window.openPredict = function(courseId) {
  const course   = getCourse(courseId);
  if (!course) return;
  const after    = predictSkip(courseId);
  const current  = getAttendance(courseId).percent;
  const newStatus = after >= 75 ? "safe" : after >= 60 ? "warning" : "danger";
  const drop      = current - after;

  const verdict = after >= 75
    ? `<span style="color:var(--clr-safe-text)">Safe to skip. You will stay above 75%.</span>`
    : after >= 60
    ? `<span style="color:var(--clr-warning-text)">Warning: attendance drops to ${after}%. Avoid skipping.</span>`
    : `<span style="color:var(--clr-danger-text)">Danger: attendance drops to ${after}%. Attend this class.</span>`;

  document.getElementById("predict-box-content").innerHTML = `
    <div style="text-align:center;margin-bottom:var(--space-5)">
      <div style="font-size:var(--fs-lg);font-weight:800;color:var(--clr-text);letter-spacing:-0.02em">
        What if you skip ${escapeHtml(course.code)}?
      </div>
      <div style="font-size:var(--fs-sm);color:var(--clr-text-muted);margin-top:var(--space-1)">
        ${escapeHtml(course.name)}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-8);margin-bottom:var(--space-6)">
      <div style="text-align:center">
        <div style="font-size:var(--fs-3xl);font-weight:800;color:var(--clr-text)">${current}%</div>
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:4px">Current</div>
      </div>
      <div style="font-size:1.5rem;color:var(--clr-text-muted)">→</div>
      <div style="text-align:center">
        <div style="font-size:var(--fs-3xl);font-weight:800;color:var(--clr-${newStatus}-text)">${after}%</div>
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:4px">After Skip (-${drop}%)</div>
      </div>
    </div>

    <div style="background:var(--clr-surface-2);border:1.5px solid var(--clr-border-soft);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center;margin-bottom:var(--space-5);font-size:var(--fs-sm);font-weight:600">
      ${verdict}
    </div>

    <div class="progress" style="height:10px;margin-bottom:var(--space-5)">
      <div class="progress__bar progress__bar--${newStatus}" style="width:${after}%"></div>
    </div>

    <div style="display:flex;gap:var(--space-3)">
      <button class="btn btn--ghost" style="flex:1" onclick="window.closePredict()">← Go back</button>
      <a class="btn btn--primary" style="flex:1;text-align:center" href="timetable.html">
        Open timetable
      </a>
    </div>
  `;

  document.getElementById("predict-modal").classList.add("open");
};

window.closePredict = function() {
  document.getElementById("predict-modal")?.classList.remove("open");
};

document.getElementById("predict-modal")?.addEventListener("click", e => {
  if (e.target.id === "predict-modal") window.closePredict();
});

// ── Log ────────────────────────────────────────────────────────
function renderLog() {
  const logEl = document.getElementById("history-log");
  if (!logEl) return;

  const entries = [
    ...logEntries,
    ...getScheduledClasses().map(session => ({
      ...session,
      timestamp: `${session.date}T${session.endTime}`,
      name: getCourse(session.courseId)?.name || session.courseId,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

  if (!entries.length) {
    logEl.innerHTML = `<div style="text-align:center;padding:var(--space-8);color:var(--clr-text-muted);font-size:var(--fs-sm)">Completed timetable classes will appear here.</div>`;
    return;
  }
  logEl.innerHTML = entries.map(e => `
    <div class="log-entry">
      <div class="log-dot" style="background:${e.present ? "var(--clr-safe)" : "var(--clr-danger)"}"></div>
      <span style="color:var(--clr-text-muted);font-family:var(--font-mono);font-size:var(--fs-xs)">${new Date(e.timestamp).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
      <span style="flex:1;font-weight:600">${e.present ? "Present" : "Absent"}</span>
      <span style="color:var(--clr-text-muted)">${escapeHtml(e.name)}</span>
      ${Number.isInteger(e.percent) ? `<span class="badge badge--${e.percent>=75?"safe":e.percent>=60?"warning":"danger"}">${e.percent}%</span>` : ""}
    </div>`).join("");
}

// ── Course management ──────────────────────────────────────────
function bindCourseForm() {
  const form = document.getElementById("course-form");
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("course-form-message");
    const course = {
      id: document.getElementById("course-id").value.trim().toUpperCase(),
      name: document.getElementById("course-name").value.trim(),
      code: document.getElementById("course-id").value.trim().toUpperCase(),
      instructor: document.getElementById("course-instructor").value.trim(),
      credits: Number(document.getElementById("course-credits").value),
      color: document.getElementById("course-color").value,
    };

    try {
      if (editingCourseId) {
        updateCourse(editingCourseId, course);
        showToast("Course updated", `${course.code || course.id} is ready.`, "safe");
      } else {
        const res = await addCourse(course);
        const destination = res && res.offline ? "Saved locally (offline)" : "Saved to server";
        showToast("Course added", `${course.name} is ready to track · ${destination}`, "safe");
      }
      resetCourseForm();
      renderSummary();
      renderCards();
      renderStory();
      message.textContent = "";
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("course-form__error");
    }
  });

  document.getElementById("course-form-cancel")?.addEventListener("click", resetCourseForm);
}

function resetCourseForm() {
  const form = document.getElementById("course-form");
  form?.reset();
  document.getElementById("course-id").disabled = false;
  document.getElementById("course-id").value = "";
  document.getElementById("course-credits").value = "3";
  editingCourseId = null;
  document.getElementById("course-form-submit").textContent = "Add course";
  document.getElementById("course-form-cancel").hidden = true;
  const message = document.getElementById("course-form-message");
  message.textContent = "";
  message.classList.remove("course-form__error");
}

window.editCourse = function(courseId) {
  const course = getCourse(courseId);
  if (!course) return;
  editingCourseId = courseId;
  document.getElementById("course-id").value = course.id;
  document.getElementById("course-id").disabled = true;
  document.getElementById("course-name").value = course.name;
  document.getElementById("course-instructor").value = course.instructor;
  document.getElementById("course-credits").value = course.credits;
  document.getElementById("course-color").value = course.color;
  document.getElementById("course-form-submit").textContent = "Save changes";
  document.getElementById("course-form-cancel").hidden = false;
  document.getElementById("course-manager").open = true;
  document.getElementById("course-manager").scrollIntoView({ behavior: "smooth", block: "center" });
};

window.removeCourse = async function(courseId) {
  const course = getCourse(courseId);
  if (!course || !confirm(`Delete ${course.name} and its attendance record? This cannot be undone.`)) return;
  try {
    await deleteCourse(courseId);
    for (let i = logEntries.length - 1; i >= 0; i--) {
      if (logEntries[i].courseId === courseId) logEntries.splice(i, 1);
    }
    saveAttendanceLog(logEntries);
    if (editingCourseId === courseId) resetCourseForm();
    renderSummary();
    renderCards();
    renderStory();
    renderLog();
    showToast("Course deleted", `${course.code} and its attendance record were removed from server.`, "info");
  } catch (error) {
    showToast("Course changes need attention", error.message, "danger");
  }
};

// ── Daily Flow, Undo & CSV Export ──────────────────────────────
window.startDailyPlan = () => openDailyFlow();

window.exportCSV = function() {
  try {
    exportAttendanceCSV(COURSES);
    showToast("Downloaded! 📥", "Attendance CSV downloaded successfully.", "safe");
  } catch (err) {
    showToast("Export Failed", err.message, "danger");
  }
};

// ── Reset all ──────────────────────────────────────────────────
window.clearAll = async function() {
  if (!confirm("Reset this browser's attendance records? This cannot be undone.")) return;
  clearStorage();
  renderSummary();
  renderCards();
  renderStory();
  logEntries.length = 0;
  renderLog();
  document.getElementById("history-log").innerHTML =
    `<div style="text-align:center;padding:var(--space-8);color:var(--clr-text-muted);font-size:var(--fs-sm)">Attendance tracking will resume from now.</div>`;
  showToast("Attendance reset", "Tracking will resume from now; your profile is unchanged.", "info");
};

// ── Toast ──────────────────────────────────────────────────────
function showToast(title, sub, status = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const colors = {
    safe: "var(--clr-safe)", warning: "var(--clr-warning)",
    danger: "var(--clr-danger)", info: "var(--clr-primary-dark)",
  };

  const t = document.createElement("div");
  t.className = "toast";
  t.style.borderLeft = `4px solid ${colors[status] || colors.info}`;
  const copy = document.createElement("div");
  copy.style.cssText = "display:flex;flex-direction:column;gap:2px;flex:1";
  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:var(--fs-sm);font-weight:700;color:var(--clr-text)";
  titleEl.textContent = title;
  const subEl = document.createElement("div");
  subEl.style.cssText = "font-size:var(--fs-xs);color:var(--clr-text-muted)";
  subEl.textContent = sub;
  copy.append(titleEl, subEl);
  t.append(copy);
  container.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity 0.3s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 350);
  }, 3500);
}
