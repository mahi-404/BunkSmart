// ============================================================
//  dialogue.js – Character Conversation Engine
//  Person 1 owns this file.
//  Brings the 3 characters to life with real attendance data.
// ============================================================

import { COURSES, getCourse } from "./data.js";
import { getAttendance, getStatus, getSafeSkips, predictSkip, classesNeeded, syncState } from "./logic.js";
import { getStudentProfile } from "./storage.js";

// Characters
const ACTORS = {
  student: {
    id: "student",
    name: "Student",
    role: "The Student",
    title: "Student",
    elementId: "actor-student"
  },
  tracker: {
    id: "tracker",
    name: "Trace",
    role: "The Tracker",
    title: "Trace (Attendance tracker)",
    elementId: "actor-tracker"
  },
  instructor: {
    id: "instructor",
    name: "Prof. Maya",
    role: "The Instructor",
    title: "Prof. Maya (Faculty)",
    elementId: "actor-instructor"
  }
};

let currentCourseId = "CS351"; // default to Software Design (Warning state)
let typeInterval = null;

// ── Typewriter Text Effect ──────────────────────────────────
function typeWriter(text, onComplete = null) {
  const textEl = document.getElementById("dialogue-text");
  if (!textEl) return;

  if (typeInterval) clearInterval(typeInterval);

  textEl.textContent = "";
  let i = 0;
  typeInterval = setInterval(() => {
    if (i < text.length) {
      textEl.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(typeInterval);
      typeInterval = null;
      if (onComplete) onComplete();
    }
  }, 18);
}

// ── Active Speaker Highlighting & Animations ────────────────
function setSpeaker(actorKey, animClass = "anim-idle") {
  const speakerEl = document.getElementById("dialogue-speaker");
  const actor = ACTORS[actorKey];
  if (speakerEl && actor) {
    const name = actorKey === "student"
      ? getStudentProfile()?.name || "Student"
      : actor.title;
    speakerEl.textContent = actorKey === "student" ? name : actor.title;
  }

  // Update visual states
  Object.keys(ACTORS).forEach(key => {
    const el = document.getElementById(ACTORS[key].elementId);
    if (!el) return;

    el.classList.remove("speaking", "inactive", "anim-angry", "anim-idle");

    if (key === actorKey) {
      el.classList.add("speaking", animClass);
    } else {
      el.classList.add("inactive", "anim-idle");
    }
  });
}

// ── Run Scene for Selected Course ───────────────────────────
export function playScenario(courseId) {
  currentCourseId = courseId;
  const course = getCourse(courseId);
  if (!course) return;

  const { percent, attended, total } = getAttendance(courseId);
  const status = getStatus(courseId);
  const skips = getSafeSkips(courseId);
  const nextPct = predictSkip(courseId);
  const needed = classesNeeded(courseId);

  // Update active pill button
  document.querySelectorAll(".stage-course-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.course === courseId);
  });

  const actionsEl = document.getElementById("dialogue-actions");
  if (actionsEl) actionsEl.innerHTML = ""; // clear old choices

  const profile = getStudentProfile();
  const studentName = profile?.name || "Student";

  // Step 1: Student speaks
  setSpeaker("student", "anim-idle");
  const studentLine = `${studentName}, your ${course.code} record is ${attended}/${total} classes (${percent}%). Should you attend today?`;

  typeWriter(studentLine, () => {
    // Step 2: Tracker speaks after short pause
    setTimeout(() => {
      let trackerLine = "";
      let trackerAnim = "anim-idle";

      if (status === "safe") {
        trackerLine = `Data check complete. You're at ${percent}% with ${skips} safe skip${skips > 1 ? "s" : ""} left. Skipping drops you to ${nextPct}%, still above the 75% target.`;
      } else if (status === "warning") {
        trackerLine = `Warning! Attendance is ${percent}%. Skipping drops you to ${nextPct}%! You must attend ${needed} more class${needed > 1 ? "es" : ""} to secure your safe zone.`;
      } else {
        trackerLine = `CRITICAL ALERT! Attendance is ${percent}%! You are below the 60% detention threshold! You need ${needed} consecutive classes to recover!`;
        trackerAnim = "anim-angry"; // angry shake on danger!
      }

      setSpeaker("tracker", trackerAnim);
      typeWriter(trackerLine, () => {
        // Step 3: Instructor responds
        setTimeout(() => {
          let instructorLine = "";
          let instructorAnim = "anim-idle";
          if (status === "safe") {
            instructorLine = `Good consistency so far, ${studentName}. Keep attending so you don't fall behind on upcoming lab assignments.`;
          } else if (status === "warning") {
            instructorLine = `${studentName}, your attendance has been slipping lately. Do not miss today's lecture.`;
          } else {
            instructorLine = `Unacceptable attendance record, ${studentName}! Attendance is at ${percent}%. One more unexcused absence and I will escalate this to the Academic Dean! 😠`;
            instructorAnim = "anim-angry";
          }

          setSpeaker("instructor", instructorAnim);
          typeWriter(instructorLine, () => {
            renderDecisionButtons(courseId);
          });
        }, 1100);
      });
    }, 900);
  });
}

// ── Render Decision Buttons (Calls into Logic) ───────────────
function renderDecisionButtons(courseId) {
  const actionsEl = document.getElementById("dialogue-actions");
  if (!actionsEl) return;

  actionsEl.innerHTML = `
    <a class="decision-btn decision-btn--attend" href="timetable.html?course=${encodeURIComponent(courseId)}">
      Review this class in the timetable
    </a>
  `;
}

// ── Initialize Dialogue Stage ───────────────────────────────
export async function initDialogueStage() {
  const profile = getStudentProfile();
  const studentNameEl = document.getElementById("actor-student-name");
  if (studentNameEl) studentNameEl.textContent = profile?.name || "Student";
  const pickerEl = document.getElementById("stage-course-picker");
  if (pickerEl) {
    pickerEl.innerHTML = COURSES.map(c => `
      <button class="stage-course-btn${c.id === currentCourseId ? " active" : ""}"
              data-course="${c.id}">
        ${c.code} · ${getStatus(c.id).toUpperCase()}
      </button>
    `).join("");

    pickerEl.querySelectorAll(".stage-course-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        playScenario(btn.dataset.course);
      });
    });
  }

  // Sync state first, then start scene
  await syncState();
  playScenario(currentCourseId);
}
