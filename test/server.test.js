// ============================================================
//  server.test.js – Automated Test Suite for BunkSmart Server
//  Evaluates input validation, error handling, and business logic.
//  Run via: npm test
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── ISOLATE TEST DATABASE ────────────────────────────────────
// Tests write to separate test-*.json files so demo data is NEVER wiped!
const TEST_DB = path.join(__dirname, '../data/test-attendance.json');
const TEST_COURSES = path.join(__dirname, '../data/test-courses.json');

process.env.BUNKSMART_DB = TEST_DB;
process.env.BUNKSMART_COURSES = TEST_COURSES;

// Dynamically import server AFTER environment variables are set
const { handleRequest } = await import('../server.js');

class MockRequest extends EventEmitter {
  constructor(method, url, body = null) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: 'localhost:3000' };
    this.body = body;
  }

  send() {
    process.nextTick(() => {
      if (this.body !== null && this.body !== undefined) {
        const payload = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
        this.emit('data', Buffer.from(payload));
      }
      this.emit('end');
    });
  }
}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  end(chunk) {
    if (chunk) {
      this.body += chunk.toString();
    }
    this.emit('finish');
  }
}

function testApi(method, path, body = null) {
  return new Promise(resolve => {
    const req = new MockRequest(method, path, body);
    const res = new MockResponse();

    res.on('finish', () => {
      let data = null;
      try {
        data = res.body ? JSON.parse(res.body) : null;
      } catch {
        data = res.body;
      }
      resolve({ status: res.statusCode, headers: res.headers, data });
    });

    handleRequest(req, res);
    req.send();
  });
}

async function runTests() {
  console.log('🧪 Running BunkSmart Server Input Validation & Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ── Test 1: Health Check ──
    const health = await testApi('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returns 200 with status ok');

    // ── Test 2: Courses API ──
    const courses = await testApi('GET', '/api/courses');
    assert(courses.status === 200 && Array.isArray(courses.data.courses) && courses.data.courses.length >= 6,
      'GET /api/courses returns semester courses');

    // ── Test 3: Input Validation - Missing courseId ──
    const noId = await testApi('POST', '/api/attendance/mark', { present: true });
    assert(noId.status === 400 && noId.data.error === 'Validation Error',
      'Server rejects missing courseId with 400 Bad Request');

    // ── Test 4: Input Validation - Unknown courseId ──
    const fakeId = await testApi('POST', '/api/attendance/mark', { courseId: 'INVALID_999', present: true });
    assert(fakeId.status === 400 && fakeId.data.message.includes('Unknown courseId'),
      'Server rejects invalid/spoofed courseId with 400 Bad Request');

    // ── Test 5: Input Validation - Non-boolean present ──
    const badPresent = await testApi('POST', '/api/attendance/mark', { courseId: 'CS301', present: 'yes' });
    assert(badPresent.status === 400 && badPresent.data.message.includes('must be a boolean'),
      'Server rejects non-boolean present ("yes") with 400 Bad Request');

    // ── Test 6: Input Validation - Malformed JSON ──
    const malformed = await testApi('POST', '/api/attendance/mark', '{ bad-json-payload ');
    assert(malformed.status === 400 && malformed.data.message.includes('Malformed JSON'),
      'Server rejects malformed JSON payload with 400 Bad Request');

    // ── Test 7: Logical Constraint - Attended > Total ──
    const impossibleAttendance = await testApi('POST', '/api/attendance/update', {
      courseId: 'CS302',
      attended: 25,
      total: 20
    });
    assert(impossibleAttendance.status === 400 && impossibleAttendance.data.error === 'Logical Constraint Error',
      'Server rejects attended > total with 400 Logical Constraint Error');

    // ── Test 8: Input Validation - Negative Numbers ──
    const negativeNumbers = await testApi('POST', '/api/attendance/update', {
      courseId: 'CS302',
      attended: -5,
      total: 20
    });
    assert(negativeNumbers.status === 400 && negativeNumbers.data.message.includes('non-negative integer'),
      'Server rejects negative attendance values with 400 Validation Error');

    // ── Test 9: Valid Mark Operation & State Persistence ──
    await testApi('POST', '/api/attendance/reset');
    const beforeMark = await testApi('GET', '/api/attendance');
    const cs301Before = beforeMark.data.records.CS301;

    const markRes = await testApi('POST', '/api/attendance/mark', { courseId: 'CS301', present: true });
    assert(markRes.status === 200 && markRes.data.record.attended === cs301Before.attended + 1,
      'Valid markAttendance updates attended count and recalculates percent');

    // ── Test 10: Skip Prediction Logic ──
    const predictRes = await testApi('POST', '/api/attendance/predict', { courseId: 'CS301' });
    assert(predictRes.status === 200 && typeof predictRes.data.afterSkip.percent === 'number' && predictRes.data.verdict,
      'Predict skip calculates drop and returns safety verdict');

    // ── Test 11: 404 for Unknown Endpoints ──
    const notFound = await testApi('GET', '/api/non-existent-endpoint');
    assert(notFound.status === 404, 'Server returns 404 for non-existent API routes');

    // ── Test 12: Rounding Threshold Check (Near 75% Detention Rule) ──
    // 56/75 is 74.67%. It must NOT falsely report 'safe' (75%)
    const thresholdUpdate = await testApi('POST', '/api/attendance/update', {
      courseId: 'CS302',
      attended: 56,
      total: 75
    });
    assert(thresholdUpdate.status === 200 &&
           thresholdUpdate.data.record.status === 'warning' &&
           thresholdUpdate.data.record.percent === 74 &&
           thresholdUpdate.data.record.classesNeeded === 1,
      'Threshold check: 56/75 (74.67%) correctly reports "warning", percent 74, and 1 class needed');

    // ── Test 13: Dynamic Course Addition (POST /api/courses) ──
    const newCourse = {
      id: 'CS499',
      name: 'Advanced Machine Learning',
      code: 'CS499',
      instructor: 'Dr. Anita Desai',
      credits: 4,
      color: '#6366f1'
    };
    const addCourseRes = await testApi('POST', '/api/courses', newCourse);
    assert(addCourseRes.status === 201 && addCourseRes.data.success && addCourseRes.data.course.id === 'CS499',
      'POST /api/courses dynamically adds and validates new course');

    // ── Test 14: Server Accepts Marks for Dynamically Added Course ──
    const markNew = await testApi('POST', '/api/attendance/mark', { courseId: 'CS499', present: true });
    assert(markNew.status === 200 && markNew.data.record.attended === 1,
      'Server recognizes dynamically added course and updates attendance');

    // ── Test 15: Reject Duplicate Course ID ──
    const dupCourse = await testApi('POST', '/api/courses', newCourse);
    assert(dupCourse.status === 409, 'Server rejects duplicate course ID with 409 Conflict');

    // ── Test 16: Dynamic Course Deletion (DELETE /api/courses) ──
    const delCourse = await testApi('DELETE', '/api/courses?id=CS499');
    assert(delCourse.status === 200 && delCourse.data.success,
      'DELETE /api/courses cleanly deletes course and associated record');

    console.log(`\n========================================`);
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test runner error:', err);
    process.exit(1);
  } finally {
    // Teardown temporary test files so production data is untouched
    try {
      if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
      if (fs.existsSync(TEST_COURSES)) fs.unlinkSync(TEST_COURSES);
    } catch {
      // Ignored
    }
  }
}

runTests();
