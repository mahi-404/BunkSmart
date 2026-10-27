// ============================================================
//  dashboard.js  –  ✨ Aesthetic Edition
//  Person 3 owns this file.
//  Depends on: data.js, clock.js, logic.js
// ============================================================

import { COURSES, escapeHtml, getCourse, TIMETABLE } from "./data.js";
import { getAttendance, getStatus,
         getSafeSkips }                    from "./logic.js";
import { startClock }                      from "./clock.js";
import { startNotifications }              from "./notify.js";

const EMOJI = {
  CS301:"🧩", CS302:"🗃️", CS303:"⚙️",
  CS304:"🌐", MA201:"📐", CS305:"🛠️",
};

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  startClock("navbar-clock");
  startNotifications();
  checkAlerts();
  renderMetrics();
  renderStatusBlocks();
  renderCourseList();
  renderChart();
});

// ── Alert banner ───────────────────────────────────────────────
function checkAlerts() {
  const danger = COURSES.filter(c => getStatus(c.id) === "danger");
  if (danger.length > 0) {
    const el   = document.getElementById("alert-banner");
    const text = document.getElementById("alert-text");
    if (el && text) {
      text.textContent =
        `⚠ ${danger.length} subject${danger.length > 1 ? "s are" : " is"} in danger zone: ` +
        danger.map(c => c.code).join(", ") +
        ". Attend every class immediately!";
      el.style.display = "flex";
    }
  }
}

// ── Top metrics ────────────────────────────────────────────────
function renderMetrics() {
  const el = document.getElementById("metrics-row");
  if (!el) return;

  const totalClasses = COURSES.reduce((s, c) => s + getAttendance(c.id).total, 0);
  const totalPresent = COURSES.reduce((s, c) => s + getAttendance(c.id).attended, 0);
  const avg          = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);
  const weekClasses  = TIMETABLE.length;
  const maxSkips     = COURSES.reduce((s, c) => s + getSafeSkips(c.id), 0);

  const cards = [
    { icon:"📊", val:`${avg}%`,        lbl:"Overall Attendance",  color:"var(--clr-primary)" },
    { icon:"✅", val: totalPresent,    lbl:"Classes Attended",    color:"var(--clr-safe)" },
    { icon:"🗓", val: weekClasses,     lbl:"Classes This Week",   color:"var(--clr-gold)" },
    { icon:"🎯", val: maxSkips,        lbl:"Total Safe Skips",    color:"var(--clr-accent)" },
  ];

  el.innerHTML = cards.map(c => `
    <div class="stat-card" style="--stat-color:${c.color}">
      <div class="stat-card__icon">${c.icon}</div>
      <div class="stat-card__value">${c.val}</div>
      <div class="stat-card__label">${c.lbl}</div>
    </div>`).join("");

  // Update chart centre
  const ctr = document.getElementById("chart-avg");
  if (ctr) ctr.textContent = `${avg}%`;
}

// ── Status blocks ──────────────────────────────────────────────
function renderStatusBlocks() {
  const el = document.getElementById("status-breakdown");
  if (!el) return;

  const safe    = COURSES.filter(c => getStatus(c.id) === "safe").length;
  const warning = COURSES.filter(c => getStatus(c.id) === "warning").length;
  const danger  = COURSES.filter(c => getStatus(c.id) === "danger").length;

  el.innerHTML = `
    <div class="status-block" style="--sb-clr:var(--clr-safe)">
      <div class="sb-emoji">✅</div>
      <div class="sb-val" style="color:var(--clr-safe)">${safe}</div>
      <div class="sb-lbl">Safe</div>
    </div>
    <div class="status-block" style="--sb-clr:var(--clr-warning)">
      <div class="sb-emoji">⚠️</div>
      <div class="sb-val" style="color:var(--clr-warning)">${warning}</div>
      <div class="sb-lbl">Warning</div>
    </div>
    <div class="status-block" style="--sb-clr:var(--clr-danger)">
      <div class="sb-emoji">🚨</div>
      <div class="sb-val" style="color:var(--clr-danger)">${danger}</div>
      <div class="sb-lbl">Danger</div>
    </div>`;
}

// ── Course list ────────────────────────────────────────────────
function renderCourseList() {
  const el = document.getElementById("course-list");
  if (!el) return;

  // Sort: danger first, then warning, then safe
  const order = { danger:0, warning:1, safe:2 };
  const sorted = [...COURSES].sort((a, b) =>
    order[getStatus(a.id)] - order[getStatus(b.id)]
  );

  el.innerHTML = sorted.map(course => {
    const { percent, attended, total } = getAttendance(course.id);
    const status = getStatus(course.id);
    const skips  = getSafeSkips(course.id);
    const emoji  = EMOJI[course.id] || "📖";
    const statusClr = {
      safe:"var(--clr-safe)", warning:"var(--clr-warning)", danger:"var(--clr-danger)"
    }[status];

    return `
      <div class="dash-course-card" style="--card-clr:${course.color}"
           onclick="location.href='tracker.html?course=${course.id}'">
        <div class="dcc-icon">${emoji}</div>

        <div class="dcc-body">
          <div class="dcc-name">${escapeHtml(course.name)}</div>
          <div class="dcc-meta">
            ${escapeHtml(course.code)} · ${escapeHtml(course.instructor)} · ${course.credits} cr
          </div>
          <div class="dcc-bar-wrap">
            <div class="progress" style="margin-top:6px">
              <div class="progress__bar progress__bar--${status}" style="width:${percent}%"></div>
            </div>
          </div>
          <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:4px">
            ${attended}/${total} classes ·
            ${skips > 0
              ? `<span style="color:var(--clr-safe)">✓ ${skips} skip${skips>1?"s":""} left</span>`
              : `<span style="color:var(--clr-danger)">⚠ No skips!</span>`}
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

  const labels  = COURSES.map(c => c.code);
  const data    = COURSES.map(c => getAttendance(c.id).percent);
  const colors  = COURSES.map(c => c.color);
  const borders = COURSES.map(c => c.color + "80");

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

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + "33"),
        borderColor: colors,
        borderWidth: 2,
        hoverBackgroundColor: colors.map(c => c + "66"),
        hoverBorderWidth: 3,
      }]
    },
    options: {
      cutout: "68%",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(26,26,46,0.95)",
          borderColor: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}%`
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 900,
        easing: "easeInOutQuart",
      }
    }
  });
}
