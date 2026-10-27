// ============================================================
//  timetable.js  ✨ Aesthetic Edition
//  Person 3 · Depends on data.js + clock.js
// ============================================================

import { COURSES, TIMETABLE, DAYS, escapeHtml, getCourse } from "./data.js";
import { getAttendance, getStatus, getSafeSkips } from "./logic.js";
import { startClock }                          from "./clock.js";
import { startNotifications }                  from "./notify.js";

// ── State ──────────────────────────────────────────────────────
const today      = new Date();
const rawDay     = today.getDay();             // 0=Sun,1=Mon…6=Sat
const todayIdx   = rawDay === 0 ? -1 : rawDay - 1; // Mon=0 … Fri=4, weekend=-1
let   selectedDay = todayIdx >= 0 && todayIdx <= 4 ? todayIdx : 0;

// Course emoji map (fun!)
const COURSE_EMOJI = {
  CS301: "🧩", CS302: "🗃️", CS303: "⚙️",
  CS304: "🌐", MA201: "📐", CS305: "🛠️",
};

// Status emoji
const STATUS_EMOJI = { safe: "✅", warning: "⚠️", danger: "🚨" };

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Live clock
  startClock("navbar-clock");
  startNotifications();

  // Date chip
  const dt = document.getElementById("date-text");
  if (dt) dt.textContent = today.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  renderStats();
  renderWeekNav();
  renderGrid();
  renderDaySchedule(selectedDay);
  bindPanel();

  // Stagger-in animation for schedule items
  animateIn(".schedule-item");
});

// ── Stats ──────────────────────────────────────────────────────
function renderStats() {
  const el = document.getElementById("stats-bar");
  if (!el) return;

  const weekTotal  = TIMETABLE.length;
  const todayCls   = TIMETABLE.filter(s => s.day === todayIdx).length;
  const safeCount  = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const dangerCount= COURSES.filter(c => getStatus(c.id) === "danger").length;

  const stats = [
    { icon: "📚", value: weekTotal,   label: "Classes/Week",  color: "var(--clr-primary)" },
    { icon: "☀️", value: todayCls,    label: "Today",         color: "var(--clr-gold)" },
    { icon: "✅", value: safeCount,   label: "Safe Subjects", color: "var(--clr-safe)" },
    { icon: "🚨", value: dangerCount, label: "Need Rescue",   color: "var(--clr-danger)" },
  ];

  el.innerHTML = stats.map(s => `
    <div class="stat-card" style="--stat-color:${s.color}">
      <div class="stat-card__icon">${s.icon}</div>
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
    const d        = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday  = i === todayIdx;
    const isSel    = i === selectedDay;

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
        const course = getCourse(sess.courseId);
        const status = getStatus(sess.courseId);
        const { percent } = getAttendance(sess.courseId);
        const isLab = mins(sess.endTime) - mins(sess.startTime) >= 90;
        const emoji = COURSE_EMOJI[sess.courseId] || "📖";

        html += `
          <div class="grid-cell${isToday ? " today-col" : ""}">
            <div class="class-card"
                 style="background:${course.color}18; border-color:${course.color}35;"
                 onclick="window.openDetail('${sess.courseId}')">
              <div>
                <div class="cc-code" style="color:${course.color}">${emoji} ${escapeHtml(course.code)}</div>
                <div class="cc-name">${escapeHtml(course.name)}</div>
              </div>
              <div class="cc-foot">
                <span class="cc-time">${sess.startTime}–${sess.endTime}</span>
                <div style="display:flex;align-items:center;gap:4px">
                  ${isLab ? '<span class="lab-tag" style="background:'+course.color+'40">LAB</span>' : ""}
                  <span class="status-dot status-dot--${status}" title="${status} · ${percent}%"></span>
                </div>
              </div>
            </div>
          </div>`;
      } else {
        html += `
          <div class="grid-cell${isToday ? " today-col" : ""}">
            <div class="free-cell"><span>✦</span></div>
          </div>`;
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
        <div class="empty-day__emoji">🎉</div>
        <div class="empty-day__title">No classes on ${DAYS[dayIdx]}!</div>
        <div class="empty-day__sub">Enjoy your break — you've earned it ✨</div>
      </div>`;
    return;
  }

  listEl.innerHTML = sessions.map(s => buildItem(s)).join("");
}

function buildItem(sess) {
  const course  = getCourse(sess.courseId);
  const status  = getStatus(sess.courseId);
  const { percent, attended, total } = getAttendance(sess.courseId);
  const skips   = getSafeSkips(sess.courseId);
  const isLab   = mins(sess.endTime) - mins(sess.startTime) >= 90;
  const emoji   = COURSE_EMOJI[sess.courseId] || "📖";
  const se      = STATUS_EMOJI[status];

  const skipMsg = skips > 0
    ? `<span style="color:var(--clr-safe)">✓ ${skips} safe skip${skips>1?"s":""} left</span>`
    : `<span style="color:var(--clr-danger)">⚠ Cannot skip any class</span>`;

  return `
    <div class="schedule-item"
         style="--item-color:${course.color}"
         onclick="window.openDetail('${sess.courseId}')">

      <!-- Time column -->
      <div class="si-time">
        <span class="si-time-start">${sess.startTime}</span>
        <span class="si-time-end">${sess.endTime}</span>
      </div>

      <!-- Info -->
      <div class="si-body">
        <div class="si-top">
          <div class="si-name">
            ${emoji} ${escapeHtml(course.name)}
            ${isLab ? '<span class="badge badge--info" style="font-size:9px">LAB</span>' : ""}
          </div>
          <span class="badge badge--${status}">${se} ${status}</span>
        </div>

        <div class="si-meta">
          <span>🏷 ${escapeHtml(course.code)}</span>
          <span>👤 ${escapeHtml(course.instructor)}</span>
          <span>📍 ${sess.room}</span>
          <span>💎 ${course.credits} cr</span>
        </div>

        <div class="si-attendance">
          <div class="si-att-row">
            <span>Attendance</span>
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

window.openDetail = function(courseId) {
  const course  = getCourse(courseId);
  const status  = getStatus(courseId);
  const { percent, attended, total } = getAttendance(courseId);
  const skips   = getSafeSkips(courseId);
  const emoji   = COURSE_EMOJI[courseId] || "📖";

  const statusClr = { safe: "var(--clr-safe)", warning: "var(--clr-warning)", danger: "var(--clr-danger)" }[status];
  const se = STATUS_EMOJI[status];

  const skipText = skips > 0
    ? `<span style="color:var(--clr-safe);font-weight:700">✓ ${skips} class${skips>1?"es":""}</span>`
    : `<span style="color:var(--clr-danger);font-weight:700">None — attend every class!</span>`;

  document.getElementById("detail-sheet-content").innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-color-bar" style="background:${course.color}"></div>

    <div style="font-size:2.5rem;margin-bottom:var(--space-2)">${emoji}</div>
    <div class="sheet-title">${escapeHtml(course.name)}</div>
    <div class="sheet-code">${escapeHtml(course.code)} · ${course.credits} Credits · ${escapeHtml(course.instructor)}</div>

    <!-- Attendance box -->
    <div class="sheet-att-box">
      <div class="sheet-att-top">
        <div class="sheet-att-pct" style="color:${statusClr}">${percent}%</div>
        <span class="badge badge--${status}" style="font-size:var(--fs-sm)">${se} ${status.toUpperCase()}</span>
      </div>
      <div class="progress" style="height:10px;margin-bottom:var(--space-3)">
        <div class="progress__bar progress__bar--${status}" style="width:${percent}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);color:var(--clr-text-muted)">
        <span>${attended} attended of ${total} total</span>
        <span>Min. 75% required</span>
      </div>
    </div>

    <!-- Rows -->
    <div class="sheet-rows">
      <div class="sheet-row">
        <span class="sheet-row-key">Safe Skips Left</span>
        <span class="sheet-row-val">${skipText}</span>
      </div>
      <div class="sheet-row">
        <span class="sheet-row-key">Required</span>
        <span class="sheet-row-val">${course.requiredPercent}%</span>
      </div>
      <div class="sheet-row">
        <span class="sheet-row-key">Classes needed to reach 75%</span>
        <span class="sheet-row-val" style="color:${statusClr}">
          ${percent >= 75 ? "Already safe 🎉" : Math.ceil((0.75*total - attended)/0.25) + " more"}
        </span>
      </div>
    </div>

    <div class="sheet-actions">
      <a href="tracker.html?course=${courseId}" class="btn btn--primary" style="flex:1">
        📋 Mark Attendance
      </a>
      <button class="btn btn--ghost" style="flex:0 0 auto" onclick="window.closeDetail()">Close</button>
    </div>
  `;

  document.getElementById("detail-panel").classList.add("open");
};

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
        el.style.transition = `opacity 0.35s ease ${i*60}ms, transform 0.35s ease ${i*60}ms`;
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
