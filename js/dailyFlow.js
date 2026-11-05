// ============================================================
//  dailyFlow.js – Daily BunkSmart Interactive Flow Engine
//  Features:
//  - Trace greets student with today's timetable
//  - Step-by-step class decisions (Attend vs Skip)
//  - Instant mathematical consequence preview
//  - Safe bunk recommendation from Trace
//  - Prof. Maya angry head-shake and red alert on unsafe skips
//  - End-of-day attendance summary plan
// ============================================================

import { getTodayClasses, getAttendance, getStatus, getSafeSkips, predictSkip } from "./logic.js";
import { getStudentProfile } from "./storage.js";
import { escapeHtml } from "./data.js";

let dailyOverlay = null;
let currentStep = 0; // 0 = welcome, 1..N = classes, N+1 = summary
let todaySessions = [];
let plannedDecisions = {}; // { [classIndex]: boolean } (true=attend, false=skip)
let onPlanCompleteCallback = null;

export function initDailyFlow(onComplete = null) {
  onPlanCompleteCallback = onComplete;
  ensureModalExists();
}

function ensureModalExists() {
  if (document.getElementById("daily-flow-overlay")) {
    dailyOverlay = document.getElementById("daily-flow-overlay");
    return;
  }

  dailyOverlay = document.createElement("div");
  dailyOverlay.id = "daily-flow-overlay";
  dailyOverlay.className = "daily-flow-overlay";
  dailyOverlay.innerHTML = `<div class="daily-flow-card" id="daily-flow-card"></div>`;
  document.body.appendChild(dailyOverlay);

  // Close when clicking backdrop
  dailyOverlay.addEventListener("click", (e) => {
    if (e.target.id === "daily-flow-overlay") {
      closeDailyFlow();
    }
  });
}

export function openDailyFlow() {
  ensureModalExists();
  const todayData = getTodayClasses();
  todaySessions = todayData.sessions;
  plannedDecisions = {};
  currentStep = 0;

  renderCurrentStep();
  dailyOverlay.classList.add("open");
}

export function closeDailyFlow() {
  if (dailyOverlay) {
    dailyOverlay.classList.remove("open");
  }
}

function renderCurrentStep() {
  const card = document.getElementById("daily-flow-card");
  if (!card) return;

  const profile = getStudentProfile();
  const studentName = profile?.name ? escapeHtml(profile.name) : "Student";
  const todayData = getTodayClasses();

  // ── Step 0: Welcome / Day Overview ──
  if (currentStep === 0) {
    card.innerHTML = `
      <div class="daily-flow-header">
        <div>
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#7c3aed;letter-spacing:0.05em">
            Daily Attendance Planner
          </div>
          <h2 style="font-size:20px;font-weight:800;color:#2e1065;margin:4px 0 0">
            Good morning, ${studentName}.
          </h2>
        </div>
        <button class="btn btn--ghost btn--sm" onclick="window.closeDailyFlowModal()" style="font-size:18px">✕</button>
      </div>

      <div class="daily-flow-body">
        <p style="font-size:14px;color:#6b5b95;margin:0">
          ${todayData.isWeekend ? "<em>Weekend schedule preview: showing Monday's classes.</em>" : `You have <strong>${todaySessions.length} classes</strong> scheduled today (${todayData.dayName}). Let's plan your day.`}
        </p>

        <div style="display:flex;flex-direction:column;gap:10px">
          ${todaySessions.length ? todaySessions.map((s, idx) => {
            const course = s.course;
            const { percent } = getAttendance(s.courseId);
            const status = getStatus(s.courseId);
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f9f6ff;border:1.5px solid #ede9fe;border-radius:14px">
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-size:14px;font-weight:700">${idx + 1}</span>
                  <div>
                    <div style="font-weight:700;font-size:14px;color:#2e1065">${escapeHtml(course.name)}</div>
                    <div style="font-size:12px;color:#7c6999">${s.startTime}–${s.endTime} · Room ${s.room}</div>
                  </div>
                </div>
                <span class="badge badge--${status}">${percent}%</span>
              </div>
            `;
          }).join("") : `<div style="text-align:center;padding:24px;color:#7c6999">No classes scheduled today.</div>`}
        </div>

        <div class="daily-characters-row">
          <img src="mahitha.png" class="daily-char-avatar" alt="Trace" />
          <div class="daily-speech-bubble">
            <strong>Trace:</strong> I'll calculate whether skipping is mathematically safe before you decide! Let's go through each class.
          </div>
        </div>
      </div>

      <div class="daily-flow-footer">
        <button class="btn btn--ghost" onclick="window.closeDailyFlowModal()">Maybe Later</button>
        <button class="btn btn--primary" onclick="window.dailyFlowNext()" ${!todaySessions.length ? "disabled" : ""}>
          Let's Plan Today →
        </button>
      </div>
    `;
    return;
  }

  // ── Step 1..N: Individual Class Decision ──
  const classIndex = currentStep - 1;
  if (classIndex >= 0 && classIndex < todaySessions.length) {
    const session = todaySessions[classIndex];
    const course = session.course;
    const { percent } = getAttendance(session.courseId);
    const status = getStatus(session.courseId);
    const skips = getSafeSkips(session.courseId);
    const prediction = predictSkip(session.courseId, 1);

    card.innerHTML = `
      <div class="daily-flow-header">
        <div>
          <div style="font-size:12px;font-weight:800;color:#7c3aed;text-transform:uppercase">
            Class ${classIndex + 1} of ${todaySessions.length}
          </div>
          <h2 style="font-size:18px;font-weight:800;color:#2e1065;margin:4px 0 0">
            ${escapeHtml(course.code)} · ${escapeHtml(course.name)}
          </h2>
        </div>
        <span class="badge badge--${status}">${percent}% ATTENDANCE</span>
      </div>

      <div class="daily-flow-body">
        <div class="daily-class-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-size:13px;color:#7c6999">${session.startTime} – ${session.endTime} · ${escapeHtml(session.room)}</div>
              <div style="font-size:13px;color:#7c6999">${escapeHtml(course.instructor)} · ${course.credits} credits</div>
            </div>
            <div style="text-align:right">
              <span style="font-size:12px;font-weight:700;color:${skips > 0 ? '#10b981' : '#ef4444'}">
                ${skips > 0 ? `${skips} safe skip${skips > 1 ? 's' : ''} left` : 'No skips left'}
              </span>
            </div>
          </div>

          <div style="font-size:15px;font-weight:700;color:#2e1065;margin-bottom:16px;text-align:center">
            Do you want to attend this class today?
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" id="daily-choice-buttons">
            <button class="btn btn--mint btn--lg" onclick="window.dailyChoose(${classIndex}, true)">
              Yes, attend
            </button>
            <button class="btn btn--danger btn--lg" onclick="window.dailyChoose(${classIndex}, false)">
              No, skip
            </button>
          </div>
        </div>

        <!-- Consequence & Character reaction zone (populated on click) -->
        <div id="daily-reaction-zone">
          <div class="daily-characters-row">
            <img src="mahitha.png" class="daily-char-avatar" alt="Trace" />
            <div class="daily-speech-bubble">
              <strong>Trace:</strong> Make your call! If you're thinking of skipping, I'll calculate the exact impact before confirming.
            </div>
          </div>
        </div>
      </div>

      <div class="daily-flow-footer">
        <button class="btn btn--ghost" onclick="window.dailyFlowPrev()">← Back</button>
        <button class="btn btn--ghost" onclick="window.closeDailyFlowModal()">Cancel</button>
      </div>
    `;
    return;
  }

  // ── Step N+1: End-of-Day Plan Summary ──
  const totalClasses = todaySessions.length;
  const attendingCount = Object.values(plannedDecisions).filter(Boolean).length;
  const skippingCount = totalClasses - attendingCount;

  card.innerHTML = `
    <div class="daily-flow-header">
      <div>
        <div style="font-size:12px;font-weight:800;color:#7c3aed;text-transform:uppercase">
          Today's Attendance Plan
        </div>
        <h2 style="font-size:20px;font-weight:800;color:#2e1065;margin:4px 0 0">
          Review your plan, ${studentName}.
        </h2>
      </div>
      <button class="btn btn--ghost btn--sm" onclick="window.closeDailyFlowModal()">✕</button>
    </div>

    <div class="daily-flow-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:16px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#047857">${attendingCount}</div>
          <div style="font-size:12px;font-weight:700;color:#065f46">Attending</div>
        </div>
        <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:16px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#be123c">${skippingCount}</div>
          <div style="font-size:12px;font-weight:700;color:#9f1239">Skipping</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
        ${todaySessions.map((s, index) => {
          const course = s.course;
          const isAttending = plannedDecisions[index] !== false;
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#ffffff;border:1px solid #e9d5ff;border-radius:12px">
              <div>
                <span style="font-weight:700;font-size:13px;color:#2e1065">${escapeHtml(course.code)} · ${escapeHtml(course.name)}</span>
                <span style="font-size:11px;color:#7c6999;display:block">${s.startTime}–${s.endTime}</span>
              </div>
              <span class="badge badge--${isAttending ? 'safe' : 'danger'}">
                ${isAttending ? 'Attending' : 'Skipping'}
              </span>
            </div>
          `;
        }).join("")}
      </div>

      <div class="daily-characters-row">
        <img src="swetha.png" class="daily-char-avatar" alt="Prof. Maya" />
        <div class="daily-speech-bubble">
          <strong>Prof. Maya:</strong> This is only a plan. Attendance is recorded automatically after each scheduled class ends.
        </div>
      </div>
    </div>

    <div class="daily-flow-footer">
      <button class="btn btn--ghost" onclick="window.dailyFlowPrev()">← Review Plan</button>
      <button class="btn btn--primary btn--lg" onclick="window.dailyCommitPlan()">
        Finish today's plan
      </button>
    </div>
  `;
}

// ── Interactive Choice Handler ──────────────────────────────
window.dailyChoose = function(classIndex, willAttend) {
  const session = todaySessions[classIndex];
  if (!session) return;

  const course = session.course;
  const { percent } = getAttendance(session.courseId);
  const prediction = predictSkip(session.courseId, 1);
  const reactionZone = document.getElementById("daily-reaction-zone");
  const buttonsZone = document.getElementById("daily-choice-buttons");

  if (willAttend) {
    plannedDecisions[classIndex] = true;

    if (reactionZone) {
      reactionZone.innerHTML = `
        <div class="daily-characters-row" style="background:#f0fdf4;border-color:#bbf7d0">
          <img src="swetha.png" class="daily-char-avatar" alt="Prof. Maya" />
          <div class="daily-speech-bubble" style="border-color:#bbf7d0">
            <strong style="color:#15803d">Prof. Maya:</strong> Excellent discipline! Staying consistent in ${course.code} keeps you safe from attendance shortages.
          </div>
        </div>
      `;
    }

    if (buttonsZone) {
      buttonsZone.innerHTML = `
        <button class="btn btn--mint btn--lg" style="grid-column:1 / -1" onclick="window.dailyFlowNext()">
          Plan set. Next class →
        </button>
      `;
    }
  } else {
    // Student clicked SKIP! Run prediction calculation!
    if (prediction.isSafe) {
      // SAFE SKIP RECOMMENDATION
      reactionZone.innerHTML = `
        <div class="daily-characters-row" style="background:#f0fdf4;border-color:#86efac">
          <img src="mahitha.png" class="daily-char-avatar" alt="Trace" />
          <div class="daily-speech-bubble" style="border-color:#86efac">
            <strong style="color:#15803d">Trace (Safe Bunk Verified!):</strong>
            Skipping ${course.code} drops attendance from <strong>${percent}%</strong> to <strong>${prediction.percent}%</strong> (-${prediction.drop}%).
            You remain above the 75% target with ${prediction.safeSkipsAfter} safe skips left. Enjoy your break!
          </div>
        </div>
      `;

      buttonsZone.innerHTML = `
        <button class="btn btn--accent" onclick="window.dailyConfirmSkip(${classIndex})">
          Add skip to plan
        </button>
        <button class="btn btn--mint" onclick="window.dailyChoose(${classIndex}, true)">
          I'll attend instead
        </button>
      `;
    } else {
      // DANGER SKIP: PROF MAYA ANGRY SHAKE!
      reactionZone.innerHTML = `
        <div class="daily-characters-row actor-angry" style="background:#fef2f2;border:2px solid #ef4444">
          <img src="swetha.png" class="daily-char-avatar shaking" alt="Prof. Maya Angry" style="border-color:#ef4444" />
          <div class="daily-speech-bubble" style="border-color:#fca5a5;background:#fff5f5">
            <strong style="color:#b91c1c">Prof. Maya:</strong>
            <span style="font-size:15px;font-weight:800;display:block;margin:4px 0;color:#991b1b">
              Attendance would fall below the required 75%.
            </span>
            Skipping drops your attendance to <strong style="color:#dc2626">${prediction.percent}%</strong>, which is <em>BELOW</em> the mandatory 75% requirement!
            You will face attendance detention. ATTEND THIS CLASS!
          </div>
        </div>
      `;

      buttonsZone.innerHTML = `
        <button class="btn btn--mint btn--lg" onclick="window.dailyChoose(${classIndex}, true)">
          I'll attend
        </button>
        <button class="btn btn--ghost btn--sm" style="color:#dc2626" onclick="window.dailyConfirmSkip(${classIndex})">
          Add skip to plan anyway
        </button>
      `;
    }
  }
};

window.dailyConfirmSkip = function(classIndex) {
  plannedDecisions[classIndex] = false;
  window.dailyFlowNext();
};

window.dailyFlowNext = function() {
  currentStep++;
  renderCurrentStep();
};

window.dailyFlowPrev = function() {
  if (currentStep > 0) {
    currentStep--;
    renderCurrentStep();
  }
};

window.closeDailyFlowModal = function() {
  closeDailyFlow();
};

window.dailyCommitPlan = function() {
  closeDailyFlow();
  if (typeof onPlanCompleteCallback === "function") {
    onPlanCompleteCallback(plannedDecisions);
  }
};
