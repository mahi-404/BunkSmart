// ============================================================
//  timetable.js – Timetable & Live Schedule Engine
//  Person 3 owns this file.
//  Fully integrated with logic.js and backend server.
// ============================================================
import { COURSES, TIMETABLE, DAYS, escapeHtml, getCourse } from "./data.js";
import { getAttendance, getStatus, getSafeSkips, predictSkip, classesNeeded, getSessionId, markAttendance, syncState } from "./logic.js";
import { startClock }                          from "./clock.js";
import { startNotifications }                  from "./notify.js";
import {
  getAttendancePlan, getScheduledClass, getStudentProfile, removeAttendancePlan,
  saveAttendancePlan,
} from "./storage.js";

// ── State ──────────────────────────────────────────────────────
const today       = new Date();
const rawDay      = today.getDay();             // 0=Sun, 1=Mon … 6=Sat
const todayIdx    = rawDay === 0 ? -1 : rawDay - 1; // Mon=0 … Fri=4, weekend=-1
let   selectedDay = todayIdx >= 0 && todayIdx <= 4 ? todayIdx : 0;

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  if (!getStudentProfile()) {
    window.location.replace("index.html");
    return;
  }
  // Live clock
  startClock("navbar-clock");
  startNotifications();

  // Date chip
  const dt = document.getElementById("date-text");
  if (dt) dt.textContent = today.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  // Initial render (optimistic / cached seed)
  renderAll();
  bindPanel();
  animateIn(".schedule-item");
  await syncState();
  renderAll();

  const profile = getStudentProfile();
  document.getElementById("timetable-student-name").textContent = profile.name;
  document.getElementById("timetable-student-roll").textContent = profile.rollNumber;
  document.getElementById("refresh-attendance")?.addEventListener("click", () => window.location.reload());
  const requestedCourse = new URLSearchParams(window.location.search).get("course");
  if (requestedCourse) {
    const slot = TIMETABLE.find(item => item.courseId === requestedCourse);
    if (slot) {
      selectedDay = slot.day;
      renderAll();
      const sessionId = getSessionId(getMondayOf(today).setDate(getMondayOf(today).getDate() + slot.day), slot);
      window.openDetail(slot.courseId, sessionId);
    }
  }
  setInterval(async () => {
    await syncState();
    renderAll();
  }, 30_000);
});

function renderAll() {
  renderStats();
  renderWeekNav();
  renderGrid();
  renderDaySchedule(selectedDay);
}

// ── Stats Bar ──────────────────────────────────────────────────
function renderStats() {
  const el = document.getElementById("stats-bar");
  if (!el) return;

  const weekTotal   = TIMETABLE.length;
  const now = new Date();
  const todayCls = TIMETABLE.filter(slot => slot.day === todayIdx &&
    makeDateTime(now, slot.endTime) <= now).length;
  const safeCount   = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const dangerCount = COURSES.filter(c => getStatus(c.id) === "danger").length;

  const stats = [
    { value: weekTotal,   label: "Classes/week",  color: "var(--clr-primary-dark)" },
    { value: todayCls,    label: "Classes finished today", color: "var(--clr-accent-dark)" },
    { value: safeCount,   label: "Safe subjects", color: "var(--clr-safe-text)" },
    { value: dangerCount, label: "At risk",       color: "var(--clr-danger-text)" },
  ];

  el.innerHTML = stats.map(s => `
    <div class="stat-card" style="--stat-color:${s.color}">
      <div class="stat-card__value">${s.value}</div>
      <div class="stat-card__label">${s.label}</div>
    </div>
  `).join("");
}

// ── Week nav ───────────────────────────────────────────────────
function renderWeekNav() {
  const el = document.getElementById("week-nav-days");
  if (!el) return;

  const monday = getMondayOf(today);

  el.innerHTML = DAYS.map((name, i) => {
    const d       = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = i === todayIdx;
    const isSel   = i === selectedDay;

    return `
      <button class="day-chip${isSel ? " active" : ""}${isToday ? " today-chip" : ""}"
              data-day="${i}" aria-label="${name} ${d.getDate()}">
        <span class="day-chip__name">${name.slice(0,3)}</span>
        <span class="day-chip__date">${d.getDate()}</span>
      </button>`;
  }).join("");

  el.querySelectorAll(".day-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDay = +btn.dataset.day;
      renderWeekNav();
      renderDaySchedule(selectedDay);
      animateIn(".schedule-item");
    });
  });
}

// ── Full grid ──────────────────────────────────────────────────
const TIME_SLOTS = ["09:00","10:00","11:15","12:15","13:00","14:00","15:00","16:00"];

function renderGrid() {
  const grid = document.getElementById("timetable-grid");
  if (!grid) return;

  const monday = getMondayOf(today);
  let html = "";

  // ── Header row ──
  html += `<div class="grid-corner"></div>`;
  DAYS.forEach((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = i === todayIdx;
    html += `
      <div class="grid-day-header${isToday ? " today-col" : ""}">
        <span class="dh-name">${name.slice(0,3)}</span>
        <span class="dh-date">${d.getDate()}</span>
        ${isToday ? '<span class="dh-today-pill">Today</span>' : ""}
      </div>`;
  });

  // ── Body rows ──
  TIME_SLOTS.forEach(slot => {
    html += `<div class="grid-time">${slot}</div>`;
    DAYS.forEach((_, dayIdx) => {
      const sess   = TIMETABLE.find(s => s.day === dayIdx && s.startTime === slot);
      const isToday = dayIdx === todayIdx;

      if (sess) {
        const classDate = new Date(monday);
        classDate.setDate(monday.getDate() + dayIdx);
        const sessionId = getSessionId(classDate, sess);
        const course = getCourse(sess.courseId);
        const status = getStatus(sess.courseId);
        const { percent } = getAttendance(sess.courseId);
        const isLab = mins(sess.endTime) - mins(sess.startTime) >= 90;
        html += `
          <div class="grid-cell${isToday ? " today-col" : ""}">
            <div class="class-card"
                 style="background:${course.color}20; border-color:${course.color}60;"
                 onclick="window.openDetail('${sess.courseId}', '${sessionId}')">
              <div>
                <div class="cc-code" style="color:${course.color}">${escapeHtml(course.code)}</div>
                <div class="cc-name">${escapeHtml(course.name)}</div>
              </div>
              <div class="cc-foot">
                <span class="cc-time">${sess.startTime}–${sess.endTime}</span>
                <div style="display:flex;align-items:center;gap:4px">
                  ${isLab ? '<span class="lab-tag" style="background:'+course.color+'40">LAB</span>' : ""}
                  <span class="status-dot status-dot--${status}" title="${status.toUpperCase()} · ${percent}% attendance"></span>
                </div>
              </div>
            </div>
          </div>`;
            } else {
        const running = TIMETABLE.find(s =>
          s.day === dayIdx && mins(s.startTime) < mins(slot) && mins(s.endTime) > mins(slot));

        if (running) {
          const c = getCourse(running.courseId);
          html += `
            <div class="grid-cell${isToday ? " today-col" : ""}">
              <div class="class-card" style="background:${c.color}10;border:1.5px dashed ${c.color}66"
                   onclick="window.openDetail('${running.courseId}')">
                <div class="cc-code" style="color:${c.color}">↑ ${escapeHtml(c.code)} continues</div>
              </div>
            </div>`;
        } else {
          html += `
            <div class="grid-cell${isToday ? " today-col" : ""}">
              <div class="free-cell"><span>✦</span></div>
            </div>`;
        }
      }
    });
  });

  grid.innerHTML = html;
}

// ── Day schedule list ──────────────────────────────────────────
function renderDaySchedule(dayIdx) {
  const listEl  = document.getElementById("schedule-list");
  const titleEl = document.getElementById("day-schedule-title");
  if (!listEl) return;

  const label = dayIdx === todayIdx ? "Today" : DAYS[dayIdx];
  if (titleEl) titleEl.textContent = `${label}'s Schedule`;

  const sessions = TIMETABLE
    .filter(s => s.day === dayIdx)
    .sort((a, b) => mins(a.startTime) - mins(b.startTime));

  if (!sessions.length) {
    listEl.innerHTML = `
      <div class="empty-day">
        <div class="empty-day__title">No classes scheduled on ${DAYS[dayIdx]}.</div>
        <div class="empty-day__sub">Use the time to rest or catch up on revision.</div>
      </div>`;
    return;
  }

  const monday = getMondayOf(today);
  const classDate = new Date(monday);
  classDate.setDate(monday.getDate() + dayIdx);
  listEl.innerHTML = sessions.map(s => buildItem(s, classDate)).join("");
}

function buildItem(sess, classDate) {
  const course  = getCourse(sess.courseId);
  const sessionId = getSessionId(classDate, sess);
  const plannedAttendance = getAttendancePlan(sessionId);
  const status  = getStatus(sess.courseId);
  const { percent, attended, total } = getAttendance(sess.courseId);
  const skips   = getSafeSkips(sess.courseId);
  const isLab   = mins(sess.endTime) - mins(sess.startTime) >= 90;

  const skipMsg = skips > 0
    ? `<span style="color:var(--clr-safe-text)">✓ ${skips} safe skip${skips>1?"s":""} remaining</span>`
    : `<span style="color:var(--clr-danger-text)">No skips available</span>`;

  return `
    <div class="schedule-item"
         style="--item-color:${course.color}"
         onclick="window.openDetail('${sess.courseId}', '${sessionId}')">

      <!-- Time column -->
      <div class="si-time">
        <span class="si-time-start">${sess.startTime}</span>
        <span class="si-time-end">${sess.endTime}</span>
      </div>

      <!-- Info -->
      <div class="si-body">
        <div class="si-top">
          <div class="si-name">
            ${escapeHtml(course.name)}
            ${isLab ? '<span class="badge badge--info" style="font-size:9px">LAB</span>' : ""}
          </div>
          <span class="badge badge--${status}">${status}</span>
        </div>

        <div class="si-meta">
          <span>${escapeHtml(course.code)}</span>
          <span>${escapeHtml(course.instructor)}</span>
          <span>Room ${escapeHtml(sess.room)}</span>
          <span>${course.credits} credits</span>
          ${plannedAttendance === null ? "" : `<span>Plan: ${plannedAttendance ? "Attend" : "Skip"}</span>`}
        </div>

        <div class="si-attendance">
          <div class="si-att-row">
            <span>Attendance Progress</span>
            <span class="si-att-pct">${attended}/${total} classes · <strong style="color:var(--clr-${status})">${percent}%</strong></span>
          </div>
          <div class="progress">
            <div class="progress__bar progress__bar--${status}" style="width:${percent}%"></div>
          </div>
          <div class="si-skip-info">${skipMsg}</div>
        </div>
      </div>
    </div>`;
}

// ── Detail bottom sheet ────────────────────────────────────────
function bindPanel() {
  document.getElementById("detail-panel")?.addEventListener("click", e => {
    if (e.target.id === "detail-panel") window.closeDetail();
  });
}

window.openDetail = function(courseId, sessionId = null) {
  const course  = getCourse(courseId);
  if (!course) return;
  const scheduledClass = sessionId ? getScheduledClass(sessionId) : null;
  const plannedAttendance = sessionId ? getAttendancePlan(sessionId) : null;
  const sessionDate = sessionId?.slice(0, 10);
  const scheduledFor = sessionId && sessionDate
    ? makeDateTime(new Date(`${sessionDate}T00:00:00`), getSlotBySessionId(sessionId)?.endTime || "00:00")
    : null;
  const hasEnded = scheduledClass !== null ||
    (scheduledFor !== null && scheduledFor <= new Date());

  const status  = getStatus(courseId);
  const { percent, attended, total } = getAttendance(courseId);
  const skips   = getSafeSkips(courseId);

  const statusClr = {
    safe: "var(--clr-safe-text)",
    warning: "var(--clr-warning-text)",
    danger: "var(--clr-danger-text)"
  }[status];


  const skipText = skips > 0
    ? `<span style="color:var(--clr-safe-text);font-weight:700">✓ ${skips} class${skips>1?"es":""}</span>`
    : `<span style="color:var(--clr-danger-text);font-weight:700">None — attend every class!</span>`;

  document.getElementById("detail-sheet-content").innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-color-bar" style="background:${course.color}"></div>

    <div class="sheet-title">${escapeHtml(course.name)}</div>
    <div class="sheet-code">${escapeHtml(course.code)} · ${course.credits} Credits · ${escapeHtml(course.instructor)}</div>

    <!-- Attendance box -->
    <div class="sheet-att-box">
      <div class="sheet-att-top">
        <div class="sheet-att-pct" style="color:${statusClr}">${percent}%</div>
        <span class="badge badge--${status}" style="font-size:var(--fs-sm)">${status.toUpperCase()}</span>
      </div>
      <div class="progress" style="height:10px;margin-bottom:var(--space-3)">
        <div class="progress__bar progress__bar--${status}" style="width:${percent}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);color:var(--clr-text-muted)">
        <span>${attended} attended of ${total} held</span>
        <span>Min. ${course.requiredPercent}% required</span>
      </div>
    </div>

    <!-- Details -->
    <div class="sheet-rows">
      <div class="sheet-row">
        <span class="sheet-row-key">Safe Skips Left</span>
        <span class="sheet-row-val">${skipText}</span>
      </div>
      <div class="sheet-row">
        <span class="sheet-row-key">Required Minimum</span>
        <span class="sheet-row-val">${course.requiredPercent}%</span>
      </div>
      <div class="sheet-row">
        <span class="sheet-row-key">Recovery Plan</span>
        <span class="sheet-row-val" style="color:${statusClr}">
          ${classesNeeded(courseId) === 0 ? "Already at the required level" : `Attend next ${classesNeeded(courseId)} consecutive class${classesNeeded(courseId) > 1 ? "es" : ""}`}
        </span>
      </div>
    </div>

    <!-- Skip Predictor for this class -->
    <div style="background:var(--clr-surface-2);border:1.5px solid var(--clr-border-soft);border-radius:var(--radius-xl);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)">
      <div style="font-size:var(--fs-xs)">
        <span style="font-weight:700;color:var(--clr-text);display:block">If you miss this class</span>
        <span style="color:var(--clr-text-muted)">Drops from ${percent}% to <strong style="color:var(--clr-${predictSkip(courseId, 1).status}-text)">${predictSkip(courseId, 1).percent}%</strong></span>
      </div>
      <span class="badge badge--${predictSkip(courseId, 1).isSafe ? 'safe' : 'danger'}" style="font-size:10px">
        ${predictSkip(courseId, 1).isSafe ? 'Safe to skip' : 'Attendance risk'}
      </span>
    </div>

    ${hasEnded ? `
      <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4)">
        <button class="btn btn--mint btn--sm" style="flex:1" onclick="window.quickMark('${courseId}', true, '${sessionId}')">
          Mark present
        </button>
        <button class="btn btn--danger btn--sm" style="flex:1" onclick="window.quickMark('${courseId}', false, '${sessionId}')">
          Mark absent
        </button>
      </div>
      <p style="font-size:var(--fs-xs);color:var(--clr-text-muted)">This class has ended. Your mark can be changed without adding another class.</p>
    ` : sessionId ? `
      <div style="margin-bottom:var(--space-4);padding:var(--space-3);border:1px solid var(--clr-border-soft);border-radius:var(--radius-lg)">
        <div style="font-weight:700;font-size:var(--fs-sm);margin-bottom:var(--space-2)">Your plan for this class</div>
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-bottom:var(--space-3)">
          ${plannedAttendance === null
            ? "Choose Attend or Skip. This saves your plan only; attendance is recorded after class ends."
            : `Plan saved: ${plannedAttendance ? "Attend" : "Skip"}. You can change it here.`}
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn--mint btn--sm" style="flex:1" onclick="event.stopPropagation(); window.saveClassPlan('${sessionId}', true)">
            ${plannedAttendance === true ? "Planned: Attend" : "Plan to attend"}
          </button>
          <button class="btn btn--danger btn--sm" style="flex:1" onclick="event.stopPropagation(); window.saveClassPlan('${sessionId}', false)">
            ${plannedAttendance === false ? "Planned: Skip" : "Plan to skip"}
          </button>
        </div>
        ${plannedAttendance === null ? "" : `<button class="btn btn--ghost btn--sm" style="width:100%;margin-top:var(--space-2)" onclick="event.stopPropagation(); window.clearClassPlan('${sessionId}')">Clear plan</button>`}
      </div>
    ` : `
      <p style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-bottom:var(--space-4)">
        Select a scheduled class to plan attendance or mark it after it ends.
      </p>
    `}

    <div class="sheet-actions">
      <a href="tracker.html?course=${courseId}" class="btn btn--primary" style="flex:1">
        Open tracker
      </a>
      <button class="btn btn--ghost" style="flex:0 0 auto" onclick="window.closeDetail()">Close</button>
    </div>
  `;

  document.getElementById("detail-panel").classList.add("open");
};

window.saveClassPlan = function(sessionId, willAttend) {
  saveAttendancePlan(sessionId, willAttend);
  renderAll();
  window.openDetail(sessionId.split("_").at(-1), sessionId);
};

window.clearClassPlan = function(sessionId) {
  removeAttendancePlan(sessionId);
  renderAll();
  window.openDetail(sessionId.split("_").at(-1), sessionId);
};

window.quickMark = async function(courseId, present, sessionId) {
  const session = getScheduledClass(sessionId);
  if (!session) return;
  await markAttendance(courseId, present, session);
  renderAll();
  window.openDetail(courseId, sessionId);
};

function getSlotBySessionId(sessionId) {
  const courseId = sessionId.split("_").at(-1);
  const startTime = sessionId.slice(11, 16);
  return TIMETABLE.find(slot => slot.courseId === courseId && slot.startTime === startTime);
}

window.closeDetail = function() {
  document.getElementById("detail-panel")?.classList.remove("open");
};

// ── Stagger animation ──────────────────────────────────────────
function animateIn(selector) {
  const els = document.querySelectorAll(selector);
  els.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    el.style.transition = "none";
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = `opacity 0.35s ease ${i*40}ms, transform 0.35s ease ${i*40}ms`;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 10);
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────
function mins(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function makeDateTime(date, time) {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
