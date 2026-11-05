// ============================================================
//  test/logic.test.js – Mathematical Engine Unit Tests
// ============================================================

import assert from 'node:assert';

function calculateSafeSkips(attended, total, required = 75) {
  const rate = required / 100;
  if (total === 0 || attended === 0) return 0;
  if (attended / total < rate) return 0;
  return Math.max(0, Math.floor((attended / rate) - total));
}

function calculateClassesNeeded(attended, total, required = 75) {
  const rate = required / 100;
  if (total === 0 || attended / total >= rate) return 0;
  return Math.ceil(((rate * total) - attended) / (1 - rate));
}

function calculatePredictSkip(attended, total, skips = 1) {
  const newTotal = total + skips;
  const percent = newTotal === 0 ? 0 : Math.round((attended / newTotal) * 100);
  const current = total === 0 ? 0 : Math.round((attended / total) * 100);
  return {
    percent,
    drop: current - percent,
    isSafe: (attended / newTotal) >= 0.75
  };
}

console.log("🧪 Running BunkSmart Logic Mathematical Precision Tests...\n");

// Test 1: Border case 75.0%
const borderSkips = calculateSafeSkips(12, 16, 75);
assert.strictEqual(borderSkips, 0, "At exact 75.0% (12/16), safe skips must be 0");
console.log("  ✅ PASS: Exact 75% boundary yields 0 safe skips (cannot skip without dropping below 75%)");

// Test 2: Safe margin (16/20 = 80%)
const safeSkips = calculateSafeSkips(16, 20, 75);
assert.strictEqual(safeSkips, 1, "At 80.0% (16/20), safe skips must be 1");
console.log("  ✅ PASS: 80% attendance (16/20) correctly calculates 1 safe skip");

// Test 3: Danger zone (10/18 = 55.6%)
const dangerSkips = calculateSafeSkips(10, 18, 75);
assert.strictEqual(dangerSkips, 0, "In danger zone, safe skips must be 0");
const recoveryNeeded = calculateClassesNeeded(10, 18, 75);
assert.strictEqual(recoveryNeeded, 14, "Needs 14 consecutive classes to climb from 55.6% to 75%");
console.log("  ✅ PASS: Recovery calculator accurately predicts 14 consecutive classes needed for 55.6% (CS303)");

// Test 4: Skip prediction drop
const pred = calculatePredictSkip(14, 20, 1);
assert.strictEqual(pred.percent, 67, "14/21 is 66.67% -> rounds to 67%");
assert.strictEqual(pred.isSafe, false, "66.67% is unsafe (< 75%)");
console.log("  ✅ PASS: Skip prediction accurately calculates drop from 70% to 67% and marks unsafe");

console.log("\n========================================");
console.log("📊 Logic Tests: 4 Passed, 0 Failed");
console.log("========================================\n");
