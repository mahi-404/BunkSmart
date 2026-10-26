// ============================================================
//  tracker.js  –  ✨ Aesthetic Edition
//  Person 2 owns this file.
//  Depends on: logic.js, storage.js, data.js, clock.js
// ============================================================

import { COURSES, getCourse }              from "./data.js";
import { getAttendance, getStatus,
         getSafeSkips, predictSkip,
         markAttendance, classesNeeded }   from "./logic.js";
import { clearAll as clearStorage }        from "./storage.js";
import { startClock }                      from "./clock.js";

// ── Emoji map ──────────────────────────────────────────────────
const EMOJI = {
  CS301:"🧩", CS302:"🗃️", CS303:"⚙️",
  CS304:"🌐", MA201:"📐", CS305:"🛠️",
};

const STATUS_MSG = {
  safe:    ["You're safe! 🎉", "All good — keep it up!", "Attendance on point ✅"],
  warning: ["Getting close ⚠️", "Don't skip anymore!", "Tread carefully 🚶"],
  danger:  ["SOS mode 🚨", "Attend EVERY class!", "Call your parents jk... but attend class"],
};

// Log store (session-only)
const logEntries = [];

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  startClock("navbar-clock");
  renderSummary();
  renderCards();
  // Pre-select course from URL ?course=CS301
  const params  = new URLSearchParams(window.location.search);
  const preload = params.get("course");
  if (preload) {
    const el = document.getElementById(`card-${preload}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.boxShadow = `0 0 0 2px var(--clr-primary), var(--shadow-lg)`;
      setTimeout(() => el.style.boxShadow = "", 2000);
    }
  }
});

// ── Summary bar ────────────────────────────────────────────────
function renderSummary() {
  const el = document.getElementById("summary-bar");
  if (!el) return;

  const safe    = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const warning = COURSES.filter(c => getStatus(c.id) === "warning").length;
  const danger  = COURSES.filter(c => getStatus(c.id) === "danger").length;
  const total   = COURSES.reduce((s, c) => s + getAttendance(c.id).total, 0);

  el.innerHTML = [
    { icon:"📚", val: COURSES.length, lbl:"Subjects",     color:"var(--clr-primary)" },
    { icon:"✅", val: safe,           lbl:"Safe",         color:"var(--clr-safe)" },
    { icon:"⚠️", val: warning,        lbl:"Warning",      color:"var(--clr-warning)" },
    { icon:"🚨", val: danger,         lbl:"Danger",       color:"var(--clr-danger)" },
    { icon:"🗓", val: total,          lbl:"Total Marked", color:"var(--clr-primary)" },
  ].map(s => `
    <div class="stat-card" style="--stat-color:${s.color}">
      <div class="stat-card__icon">${s.icon}</div>
      <div class="stat-card__value">${s.val}</div>
      <div class="stat-card__label">${s.lbl}</div>
    </div>`).join("");
}

// ── Course cards ───────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById("course-grid");
  if (!grid) return;
  grid.innerHTML = COURSES.map(c => buildCard(c)).join("");
}

function buildCard(course) {
  const { attended, total, percent } = getAttendance(course.id);
  const status  = getStatus(course.id);
  const skips   = getSafeSkips(course.id);
  const needed  = classesNeeded(course.id);
  const emoji   = EMOJI[course.id] || "📖";

  // SVG ring
  const r  = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const statusClr = {
    safe: "var(--clr-safe)", warning: "var(--clr-warning)", danger: "var(--clr-danger)"
  }[status];

  const skipInfo = skips > 0
    ? `<span style="color:var(--clr-safe)">✓ ${skips} skip${skips>1?"s":""} left</span>`
    : `<span style="color:var(--clr-danger)">⚠ No skips allowed</span>`;

  const needInfo = needed > 0
    ? `Need <strong style="color:${statusClr}">${needed}</strong> more to reach 75%`
    : `<span style="color:var(--clr-safe)">Already at 75%+ 🎉</span>`;

  const msgs = STATUS_MSG[status];
  const funMsg = msgs[Math.floor(Math.random() * msgs.length)];

  return `
    <div class="course-card" id="card-${course.id}" style="--card-color:${course.color}">

      <div class="cc-header">
        <div class="cc-header-left">
          <div class="cc-emoji">${emoji}</div>
          <div class="cc-title">${course.name}</div>
          <div class="cc-meta">
            <span>🏷 ${course.code}</span>
            <span>💎 ${course.credits} cr</span>
          </div>
          <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:var(--space-1)">
            👤 ${course.instructor}
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
              style="filter:drop-shadow(0 0 4px ${statusClr})"
            />
          </svg>
          <div class="ring-text">
            <span class="ring-pct" style="color:${statusClr}">${percent}%</span>
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
        <span style="margin-left:auto;font-size:var(--fs-xs);color:var(--clr-text-dim)">${needInfo}</span>
      </div>

      <!-- Fun status message -->
      <div style="padding:0 var(--space-5) var(--space-3);font-size:var(--fs-xs);color:var(--clr-text-dim);font-style:italic">
        ${funMsg}
      </div>

      <!-- Mark buttons -->
      <div class="cc-actions">
        <button class="mark-btn mark-btn--present"
                onclick="window.mark('${course.id}', true)">
          ✅ Present
        </button>
        <button class="mark-btn mark-btn--absent"
                onclick="window.mark('${course.id}', false)">
          ❌ Absent
        </button>
      </div>

      <!-- "What if I skip?" -->
      <div style="padding:0 var(--space-5) var(--space-4)">
        <button class="skip-predict-btn"
                onclick="window.openPredict('${course.id}')">
          🔮 What if I skip next class?
        </button>
      </div>

    </div>`;
}

// ── Mark attendance ────────────────────────────────────────────
window.mark = function(courseId, present) {
  markAttendance(courseId, present);

  // Animate button
  const btn = document.querySelector(`#card-${courseId} .mark-btn--${present ? "present" : "absent"}`);
  btn?.classList.add("popped");
  setTimeout(() => btn?.classList.remove("popped"), 350);

  // Refresh card
  const card = document.getElementById(`card-${courseId}`);
  if (card) {
    const course = getCourse(courseId);
    card.outerHTML = buildCard(course);
  }

  // Update summary
  renderSummary();

  // Log entry
  addLog(courseId, present);

  // Toast
  const course = getCourse(courseId);
  const { percent } = getAttendance(courseId);
  showToast(
    present ? `✅ Marked present for ${course.code}` : `❌ Marked absent for ${course.code}`,
    `Attendance now: ${percent}%`,
    getStatus(courseId)
  );
};

// ── Predict modal ──────────────────────────────────────────────
window.openPredict = function(courseId) {
  const course   = getCourse(courseId);
  const after    = predictSkip(courseId);
  const current  = getAttendance(courseId).percent;
  const newStatus = after >= 75 ? "safe" : after >= 60 ? "warning" : "danger";
  const emoji = EMOJI[courseId] || "📖";
  const verdict = after >= 75
    ? `<span style="color:var(--clr-safe)">✅ Still safe! Go ahead.</span>`
    : after >= 60
    ? `<span style="color:var(--clr-warning)">⚠️ Risky, but survivable.</span>`
    : `<span style="color:var(--clr-danger)">🚨 DON'T skip this one!</span>`;

  const statusClr = { safe:"var(--clr-safe)", warning:"var(--clr-warning)", danger:"var(--clr-danger)" }[newStatus];

  document.getElementById("predict-box-content").innerHTML = `
    <div style="text-align:center;margin-bottom:var(--space-5)">
      <div style="font-size:2.5rem;margin-bottom:var(--space-3)">${emoji}</div>
      <div style="font-size:var(--fs-lg);font-weight:800;color:var(--clr-text);letter-spacing:-0.02em">
        What if you skip ${course.code}?
      </div>
      <div style="font-size:var(--fs-sm);color:var(--clr-text-muted);margin-top:var(--space-1)">
        ${course.name}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-8);margin-bottom:var(--space-6)">
      <div style="text-align:center">
        <div style="font-size:var(--fs-3xl);font-weight:800;color:var(--clr-text)">${current}%</div>
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:4px">Current</div>
      </div>
      <div style="font-size:2rem">→</div>
      <div style="text-align:center">
        <div style="font-size:var(--fs-3xl);font-weight:800;color:${statusClr}">${after}%</div>
        <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:4px">After skip</div>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center;margin-bottom:var(--space-5);font-size:var(--fs-base);font-weight:600">
      ${verdict}
    </div>

    <div class="progress" style="height:10px;margin-bottom:var(--space-5)">
      <div class="progress__bar progress__bar--${newStatus}" style="width:${after}%"></div>
    </div>

    <div style="display:flex;gap:var(--space-3)">
      <button class="btn btn--ghost" style="flex:1" onclick="window.closePredict()">← Go back</button>
      <button class="btn btn--${newStatus === 'safe' ? 'accent' : 'danger'}" style="flex:1"
              onclick="window.mark('${courseId}', false); window.closePredict()">
        ${newStatus === 'safe' ? "Skip anyway 😈" : "Attend class 📚"}
      </button>
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
function addLog(courseId, present) {
  const course = getCourse(courseId);
  const { percent } = getAttendance(courseId);
  const now = new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

  logEntries.unshift({ courseId, present, percent, name: course.name, time: now });
  if (logEntries.length > 30) logEntries.pop();

  const logEl = document.getElementById("history-log");
  if (!logEl) return;

  logEl.innerHTML = logEntries.map(e => `
    <div class="log-entry">
      <div class="log-dot" style="background:${e.present ? "var(--clr-safe)" : "var(--clr-danger)"}"></div>
      <span style="color:var(--clr-text-muted);font-family:var(--font-mono);font-size:var(--fs-xs)">${e.time}</span>
      <span style="flex:1;font-weight:600">${e.present ? "✅ Present" : "❌ Absent"}</span>
      <span style="color:var(--clr-text-muted)">${e.name}</span>
      <span class="badge badge--${e.percent>=75?"safe":e.percent>=60?"warning":"danger"}">${e.percent}%</span>
    </div>`).join("");
}

// ── Reset all ──────────────────────────────────────────────────
window.clearAll = function() {
  if (!confirm("Reset ALL attendance records? This cannot be undone.")) return;
  clearStorage();
  renderSummary();
  renderCards();
  document.getElementById("history-log").innerHTML =
    `<div style="text-align:center;padding:var(--space-8);color:var(--clr-text-dim);font-size:var(--fs-sm)">All records cleared ✨</div>`;
};

// ── Toast ──────────────────────────────────────────────────────
function showToast(title, sub, status = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const colors = {
    safe:"var(--clr-safe)", warning:"var(--clr-warning)",
    danger:"var(--clr-danger)", info:"var(--clr-primary)",
  };

  const t = document.createElement("div");
  t.className = "toast";
  t.style.borderLeft = `3px solid ${colors[status]}`;
  t.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:2px;flex:1">
      <div style="font-size:var(--fs-sm);font-weight:700;color:var(--clr-text)">${title}</div>
      <div style="font-size:var(--fs-xs);color:var(--clr-text-muted)">${sub}</div>
    </div>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity 0.3s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 350);
  }, 3000);
}
