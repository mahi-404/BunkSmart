// ============================================================
//  dashboard.js – Analytics & Bird's-Eye Dashboard
//  Person 3 owns this file.
//  Depends on: data.js, clock.js, logic.js
// ============================================================

import { COURSES, escapeHtml, getCourse, TIMETABLE } from "./data.js";
import { getAttendance, getStatus, getSafeSkips, syncState } from "./logic.js";
import { startClock } from "./clock.js";
import { startNotifications } from "./notify.js";

const EMOJI = {
  CS301: "🧩", CS302: "🗃️", CS303: "⚙️",
  CS304: "🌐", MA201: "📐", CS305: "🛠️",
};

let chartInstance = null;

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  startClock("navbar-clock");
  startNotifications();

  // Optimistic initial render with local seed/cached data
  renderAll();

  // Fresh sync with backend server (survives refreshes)
  await syncState();
  renderAll();
});

function renderAll() {
  checkAlerts();
  renderMetrics();
  renderStatusBlocks();
  renderCourseList();
  renderChart();
}

// ── Alert banner ───────────────────────────────────────────────
function checkAlerts() {
  const el = document.getElementById("alert-banner");
  const text = document.getElementById("alert-text");
  if (!el || !text) return;

  const danger = COURSES.filter(c => getStatus(c.id) === "danger");
  if (danger.length > 0) {
    text.textContent =
      `⚠ ${danger.length} subject${danger.length > 1 ? "s are" : " is"} in danger zone: ` +
      danger.map(c => c.code).join(", ") +
      ". Mandatory 75% target breached — attend every upcoming class!";
    el.style.display = "flex";
  } else {
    el.style.display = "none";
  }
}

// ── Top metrics ────────────────────────────────────────────────
function renderMetrics() {
  const el = document.getElementById("metrics-row");
  if (!el) return;

  const totalClasses = COURSES.reduce((s, c) => s + getAttendance(c.id).total, 0);
  const totalPresent = COURSES.reduce((s, c) => s + getAttendance(c.id).attended, 0);
  const avg = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);
  const weekClasses = TIMETABLE.length;
  const maxSkips = COURSES.reduce((s, c) => s + getSafeSkips(c.id), 0);

  const cards = [
    { icon: "📊", val: `${avg}%`, lbl: "Overall Attendance", color: "var(--clr-primary-dark)" },
    { icon: "✅", val: totalPresent, lbl: "Classes Attended", color: "var(--clr-safe-text)" },
    { icon: "🗓", val: weekClasses, lbl: "Weekly Slots", color: "var(--clr-accent-dark)" },
    { icon: "🎯", val: maxSkips, lbl: "Total Safe Skips", color: "var(--clr-lavender-dark)" },
  ];

  el.innerHTML = cards.map(c => `
    <div class="stat-card" style="--stat-color:${c.color}">
      <div class="stat-card__icon">${c.icon}</div>
      <div class="stat-card__value">${c.val}</div>
      <div class="stat-card__label">${c.lbl}</div>
    </div>`).join("");

  // Update chart centre label
  const ctr = document.getElementById("chart-avg");
  if (ctr) ctr.textContent = `${avg}%`;
}

// ── Status blocks ──────────────────────────────────────────────
function renderStatusBlocks() {
  const el = document.getElementById("status-breakdown");
  if (!el) return;

  const safe = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const warning = COURSES.filter(c => getStatus(c.id) === "warning").length;
  const danger = COURSES.filter(c => getStatus(c.id) === "danger").length;

  el.innerHTML = `
    <div class="status-block" style="--sb-clr:var(--clr-safe)">
      <div class="sb-emoji">✅</div>
      <div class="sb-val" style="color:var(--clr-safe-text)">${safe}</div>
      <div class="sb-lbl">Safe (≥75%)</div>
    </div>
    <div class="status-block" style="--sb-clr:var(--clr-warning)">
      <div class="sb-emoji">⚠️</div>
      <div class="sb-val" style="color:var(--clr-warning-text)">${warning}</div>
      <div class="sb-lbl">Warning (60–74%)</div>
    </div>
    <div class="status-block" style="--sb-clr:var(--clr-danger)">
      <div class="sb-emoji">🚨</div>
      <div class="sb-val" style="color:var(--clr-danger-text)">${danger}</div>
      <div class="sb-lbl">Danger (<60%)</div>
    </div>`;
}

// ── Course list ────────────────────────────────────────────────
function renderCourseList() {
  const el = document.getElementById("course-list");
  if (!el) return;

  // Sort: danger first, then warning, then safe
  const order = { danger: 0, warning: 1, safe: 2 };
  const sorted = [...COURSES].sort((a, b) =>
    order[getStatus(a.id)] - order[getStatus(b.id)]
  );

  el.innerHTML = sorted.map(course => {
    const { percent, attended, total } = getAttendance(course.id);
    const status = getStatus(course.id);
    const skips = getSafeSkips(course.id);
    const emoji = EMOJI[course.id] || "📖";
    const statusClr = {
      safe: "var(--clr-safe-text)",
      warning: "var(--clr-warning-text)",
      danger: "var(--clr-danger-text)"
    }[status];

    return `
      <div class="dash-course-card" style="--card-clr:${course.color}"
           onclick="location.href='tracker.html?course=${course.id}'">
        <div class="dcc-icon">${emoji}</div>

        <div class="dcc-body">
          <div class="dcc-name">${escapeHtml(course.name)}</div>
          <div class="dcc-meta">
            ${escapeHtml(course.code)} · ${escapeHtml(course.instructor)} · ${course.credits} Credits
          </div>
          <div class="dcc-bar-wrap">
            <div class="progress" style="margin-top:6px">
              <div class="progress__bar progress__bar--${status}" style="width:${percent}%"></div>
            </div>
          </div>
          <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:4px">
            ${attended}/${total} classes attended ·
            ${skips > 0
              ? `<span style="color:var(--clr-safe-text);font-weight:600">✓ ${skips} safe skip${skips>1?"s":""} left</span>`
              : `<span style="color:var(--clr-danger-text);font-weight:600">⚠ No skips allowed</span>`}
          </div>
        </div>

        <div class="dcc-right">
          <div class="dcc-pct" style="color:${statusClr}">${percent}%</div>
          <span class="badge badge--${status}">${status}</span>
        </div>
      </div>`;
  }).join("");
}

// ── Doughnut chart (Chart.js) ──────────────────────────────────
function renderChart() {
  const canvas = document.getElementById("att-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = COURSES.map(c => c.code);
  const data = COURSES.map(c => getAttendance(c.id).percent);
  const colors = COURSES.map(c => c.color);

  // Build chart legend
  const legendEl = document.getElementById("chart-legend");
  if (legendEl) {
    legendEl.innerHTML = COURSES.map((c, i) => `
      <div class="cl-item">
        <div class="cl-dot" style="background:${c.color};box-shadow:0 0 5px ${c.color}88"></div>
        <span class="cl-name">${escapeHtml(c.code)}</span>
        <span class="cl-pct" style="color:${c.color}">${data[i]}%</span>
      </div>`).join("");
  }

  // Destroy previous chart instance to avoid canvas memory leak or stutter
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: "#ffffff",
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: "68%",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#ffffff",
          borderColor: "#e9d5ff",
          borderWidth: 1.5,
          titleColor: "#3b1f6e",
          bodyColor: "#6d4899",
          padding: 10,
          cornerRadius: 12,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}% Attendance`
          }
        }
      },
      animation: {
        duration: 400
      }
    }
  });
}
