// ============================================================
//  notify.js: pre-class alerts (Person 3)
//  Test without waiting: timetable.html?day=Mon&time=08:52
// ============================================================
import { TIMETABLE, getCourse } from "./data.js";
import { getStatus } from "./logic.js";

const HAS_NOTIFY = typeof Notification !== "undefined";   // false on some phones
const SEEN_KEY = "bunksmart_alerted";                     // survives page changes

const toMins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

function loadSeen() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
const seen = loadSeen();
function markSeen(key) {
  seen.add(key);
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
}

export const notificationState = () => (HAS_NOTIFY ? Notification.permission : "unsupported");

export async function requestNotifPermission() {
  if (!HAS_NOTIFY || Notification.permission !== "default") return notificationState();
  try { return await Notification.requestPermission(); } catch { return notificationState(); }
}

// Real time, or ?day=Mon&time=08:52 for testing
function getNow() {
  const q = new URLSearchParams(location.search);
  const now = new Date();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(q.get("day") ?? names[now.getDay()]);
  const t = q.get("time");
  const mins = /^\d{1,2}:\d{2}$/.test(t ?? "") ? toMins(t) : now.getHours() * 60 + now.getMinutes();
  return { dayIdx, mins };                                 // dayIdx -1 on weekends
}

function showToast(title, body, type = "warning") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const colors = { warning: "var(--clr-warning)", danger: "var(--clr-danger)", safe: "var(--clr-safe)", info: "var(--clr-primary)" };

  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "alert");
  t.style.borderLeft = `3px solid ${colors[type] ?? colors.info}`;

  const copy = document.createElement("div");
  copy.style.flex = "1";
  const h = document.createElement("div");
  h.style.cssText = "font-size:var(--fs-sm);font-weight:700;color:var(--clr-text)";
  h.textContent = title;
  const p = document.createElement("div");
  p.style.cssText = "font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:2px";
  p.textContent = body;
  copy.append(h, p);

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss alert");
  close.textContent = "✕";
  close.style.cssText = "background:none;border:none;color:var(--clr-text-muted);cursor:pointer;font-size:1rem;padding:0 0 0 8px";
  close.onclick = () => t.remove();

  t.append(copy, close);
  container.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity 0.4s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 450);
  }, 8000);
}

function fireAlert(slot, diff, status, key) {
  const course = getCourse(slot.courseId);
  const title = status === "danger"
    ? `${course.code} starts in ~${diff} min. Don't skip!`
    : `${course.code} in ~${diff} min. Your attendance is low`;
  const body = `Room ${slot.room} · ${slot.startTime}–${slot.endTime}`;

  if (HAS_NOTIFY && Notification.permission === "granted") {
    try { new Notification(title, { body, tag: key }); } catch {}   // Android Chrome throws here
  }
  showToast(title, body, status);                                   // always works
}

export function checkUpcoming() {
  const { dayIdx, mins } = getNow();
  if (dayIdx < 0) return;

  TIMETABLE.forEach(slot => {
    if (slot.day !== dayIdx) return;
    const diff = toMins(slot.startTime) - mins;
    if (diff < 5 || diff > 10) return;

    const status = getStatus(slot.courseId);
    if (status === "safe") return;

    const key = `${new Date().toDateString()}|${dayIdx}-${slot.startTime}-${slot.courseId}`;
    if (seen.has(key)) return;
    markSeen(key);
    fireAlert(slot, diff, status, key);
  });
}

export function testAlert() {                       // for demo day
  const slot = TIMETABLE.find(s => getStatus(s.courseId) !== "safe") ?? TIMETABLE[0];
  if (!slot) return;
  const st = getStatus(slot.courseId);
  fireAlert(slot, 7, st === "safe" ? "warning" : st, "test");
}

function wireButtons() {
  const enable = document.getElementById("enable-alerts");
  if (enable) {
    const refresh = () => {
      const s = notificationState();
      enable.textContent = { granted: "Alerts on", denied: "Blocked in browser",
        unsupported: "In-app alerts only", default: "Enable alerts" }[s];
      enable.disabled = s !== "default";
    };
    refresh();
    enable.addEventListener("click", async () => { await requestNotifPermission(); refresh(); });
  }
  document.getElementById("test-alert")?.addEventListener("click", testAlert);
}

export function startNotifications() {
  wireButtons();
  checkUpcoming();
  setInterval(checkUpcoming, 30_000);
}
 