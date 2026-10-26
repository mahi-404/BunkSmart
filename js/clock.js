// ============================================================
//  clock.js  –  Live date/time clock for the navbar
//  Person 3 owns this file.
//  Usage: <span id="navbar-clock"></span>  →  import this script
// ============================================================

export function startClock(elementId = "navbar-clock") {
  const el = document.getElementById(elementId);
  if (!el) return;

  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateStr = now.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
    el.textContent = `${dateStr}  ${timeStr}`;
  }

  tick();
  setInterval(tick, 1000);
}
