// ============================================================
//  timetable.js – Timetable & Live Schedule Engine
//  Person 3 owns this file.
//  Fully integrated with logic.js and backend server.
// ============================================================
import { COURSES, TIMETABLE, DAYS, escapeHtml, getCourse } from "./data.js";
import { getAttendance, getStatus, getSafeSkips, predictSkip, classesNeeded, markAttendance, syncState } from "./logic.js";
import { startClock }                          from "./clock.js";
import { startNotifications }                  from "./notify.js";

// ── State ──────────────────────────────────────────────────────
const today       = new Date();
const rawDay      = today.getDay();             // 0=Sun, 1=Mon … 6=Sat
const todayIdx    = rawDay === 0 ? -1 : rawDay - 1; // Mon=0 … Fri=4, weekend=-1
let   selectedDay = todayIdx >= 0 && todayIdx <= 4 ? todayIdx : 0;

// Course emoji map
const COURSE_EMOJI = {
  CS301: "🧩", CS302: "🗃️", CS303: "⚙️",
  CS304: "🌐", MA201: "📐", CS305: "🛠️",
};

// Status emoji
const STATUS_EMOJI = { safe: "✅", warning: "⚠️", danger: "🚨" };

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
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

  // Sync with backend server (survives refreshes & multi-tab)
  await syncState();
  renderAll();
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
  const todayCls    = TIMETABLE.filter(s => s.day === todayIdx).length;
  const safeCount   = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const dangerCount = COURSES.filter(c => getStatus(c.id) === "danger").length;

  const stats = [
    { icon: "📚", value: weekTotal,   label: "Classes/Week",  color: "var(--clr-primary-dark)" },
    { icon: "☀️", value: todayCls,    label: "Today",         color: "var(--clr-accent-dark)" },
    { icon: "✅", value: safeCount,   label: "Safe Subjects", color: "var(--clr-safe-text)" },
    { icon: "🚨", value: dangerCount, label: "Need Rescue",   color: "var(--clr-danger-text)" },
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
        const course = getCourse(sess.courseId);
        const status = getStatus(sess.courseId);
        const { percent } = getAttendance(sess.courseId);
        const isLab = mins(sess.endTime) - mins(sess.startTime) >= 90;
        const emoji = COURSE_EMOJI[sess.courseId] || "📖";

        html += `
          <div class="grid-cell${isToday ? " today-col" : ""}">
            <div class="class-card"
                 style="background:${course.color}20; border-color:${course.color}60;"
                 onclick="window.openDetail('${sess.courseId}')">
              <div>
                <div class="cc-code" style="color:${course.color}">${emoji} ${escapeHtml(course.code)}</div>
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
        <div class="empty-day__emoji">🎉</div>
        <div class="empty-day__title">No classes scheduled on ${DAYS[dayIdx]}!</div>
        <div class="empty-day__sub">Enjoy your free time or catch up on revision ✨</div>
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
    ? `<span style="color:var(--clr-safe-text)">✓ ${skips} safe skip${skips>1?"s":""} remaining</span>`
    : `<span style="color:var(--clr-danger-text)">⚠ Cannot skip any class</span>`;

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
          <span>💎 ${course.credits} Credits</span>
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

window.openDetail = function(courseId) {
  const course  = getCourse(courseId);
  if (!course) return;

  const status  = getStatus(courseId);
  const { percent, attended, total } = getAttendance(courseId);
  const skips   = getSafeSkips(courseId);
  const emoji   = COURSE_EMOJI[courseId] || "📖";

  const statusClr = {
    safe: "var(--clr-safe-text)",
    warning: "var(--clr-warning-text)",
    danger: "var(--clr-danger-text)"
  }[status];

  const se = STATUS_EMOJI[status];

  const skipText = skips > 0
    ? `<span style="color:var(--clr-safe-text);font-weight:700">✓ ${skips} class${skips>1?"es":""}</span>`
    : `<span style="color:var(--clr-danger-text);font-weight:700">None — attend every class!</span>`;

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
          ${classesNeeded(courseId) === 0 ? "Already safe 🎉" : `Attend next ${classesNeeded(courseId)} consecutive class${classesNeeded(courseId) > 1 ? "es" : ""}`}
        </span>
      </div>
    </div>

    <!-- Skip Predictor for this class -->
    <div style="background:var(--clr-surface-2);border:1.5px solid var(--clr-border-soft);border-radius:var(--radius-xl);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)">
      <div style="font-size:var(--fs-xs)">
        <span style="font-weight:700;color:var(--clr-text);display:block">🔮 What if I skip this class?</span>
        <span style="color:var(--clr-text-muted)">Drops from ${percent}% to <strong style="color:var(--clr-${predictSkip(courseId, 1).status}-text)">${predictSkip(courseId, 1).percent}%</strong></span>
      </div>
      <span class="badge badge--${predictSkip(courseId, 1).isSafe ? 'safe' : 'danger'}" style="font-size:10px">
        ${predictSkip(courseId, 1).isSafe ? '✓ Safe to skip' : '⚠ Danger'}
      </span>
    </div>

    <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4)">
      <button class="btn btn--mint btn--sm" style="flex:1" onclick="window.quickMark('${courseId}', true)">
        ✅ Mark Present
      </button>
      <button class="btn btn--danger btn--sm" style="flex:1" onclick="window.quickMark('${courseId}', false)">
        ❌ Mark Absent
      </button>
    </div>

    <div class="sheet-actions">
      <a href="tracker.html?course=${courseId}" class="btn btn--primary" style="flex:1">
        📋 Open in Tracker
      </a>
      <button class="btn btn--ghost" style="flex:0 0 auto" onclick="window.closeDetail()">Close</button>
    </div>
  `;

  document.getElementById("detail-panel").classList.add("open");
};

window.quickMark = async function(courseId, present) {
  await markAttendance(courseId, present);
  renderAll();
  window.openDetail(courseId); // refresh open sheet
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
