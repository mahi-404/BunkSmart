// ============================================================
//  notify.js  –  Pre-class alert system 🔔
//  Person 3 owns this file.
//  Checks every 30 seconds if a low-attendance class is
//  starting in 5–10 minutes and fires a browser notification
//  + in-app toast as fallback.
// ============================================================

import { TIMETABLE, getCourse }  from "./data.js";
import { getStatus }             from "./logic.js";

let notifPermission = Notification.permission;

// ── Request permission once ────────────────────────────────────
export async function requestNotifPermission() {
  if (notifPermission === "default") {
    notifPermission = await Notification.requestPermission();
  }
  return notifPermission;
}

// ── Toast helper (fallback / always shown in-app) ─────────────
function showToast(title, body, type = "warning") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const colors = {
    warning: "var(--clr-warning)",
    danger:  "var(--clr-danger)",
    safe:    "var(--clr-safe)",
    info:    "var(--clr-primary)",
  };

  const t = document.createElement("div");
  t.className = "toast";
  t.style.cssText = `border-left: 3px solid ${colors[type]};`;
  t.innerHTML = `
    <div style="font-size:1.4rem;flex-shrink:0">${type === "danger" ? "🚨" : "⚠️"}</div>
    <div style="flex:1">
      <div style="font-size:var(--fs-sm);font-weight:700;color:var(--clr-text)">${title}</div>
      <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:2px">${body}</div>
    </div>
    <button onclick="this.parentElement.remove()"
            style="background:none;border:none;color:var(--clr-text-muted);cursor:pointer;font-size:1rem;padding:0 0 0 8px">✕</button>
  `;
  container.appendChild(t);

  // Auto-dismiss after 8 s
  setTimeout(() => {
    t.style.transition = "opacity 0.4s";
    t.style.opacity    = "0";
    setTimeout(() => t.remove(), 450);
  }, 8000);
}

// ── Core check ────────────────────────────────────────────────
const alreadyNotified = new Set(); // "dayIdx-startTime-courseId"

function checkUpcoming() {
  const now     = new Date();
  const dayIdx  = now.getDay() === 0 ? -1 : now.getDay() - 1; // Mon=0…Fri=4
  if (dayIdx < 0 || dayIdx > 4) return;                        // weekend → skip

  const nowMins = now.getHours() * 60 + now.getMinutes();

  TIMETABLE.forEach(slot => {
    if (slot.day !== dayIdx) return;

    const [sh, sm]  = slot.startTime.split(":").map(Number);
    const slotMins  = sh * 60 + sm;
    const diff      = slotMins - nowMins;              // minutes until class

    // Fire if class is 5–10 min away
    if (diff < 5 || diff > 10) return;

    const status = getStatus(slot.courseId);
    if (status === "safe") return;                     // only warn/danger

    const key = `${dayIdx}-${slot.startTime}-${slot.courseId}`;
    if (alreadyNotified.has(key)) return;
    alreadyNotified.add(key);

    const course = getCourse(slot.courseId);
    const title  = status === "danger"
      ? `🚨 ${course.code} starts in ~${diff} min — DON'T SKIP!`
      : `⚠️ ${course.code} in ~${diff} min — attendance is low`;
    const body   = `Room ${slot.room} · ${slot.startTime}–${slot.endTime} · Attend to stay safe.`;

    // Browser notification
    if (notifPermission === "granted") {
      new Notification(title, {
        body,
        icon:  "assets/icon.png",
        badge: "assets/badge.png",
        tag:   key,
        silent: false,
      });
    }

    // Always show in-app toast too
    showToast(title, body, status);
  });
}

// ── Start the 30-second loop ───────────────────────────────────
export function startNotifications() {
  requestNotifPermission();
  checkUpcoming();                       // immediate first check
  setInterval(checkUpcoming, 30_000);   // then every 30 s
}
