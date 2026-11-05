// ============================================================
//  server.js – BunkSmart Backend Server
//  Zero-dependency, production-clean Node.js HTTP Server.
//  Strictly checks and validates every input. Survives refreshes.
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COURSES, SEED_ATTENDANCE } from './data/defaultData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

function getDbFile() {
  return process.env.BUNKSMART_DB || path.join(DATA_DIR, 'attendance.json');
}

function getCoursesFile() {
  return process.env.BUNKSMART_COURSES || path.join(DATA_DIR, 'courses.json');
}

// ── Ensure Data Directory Exists ─────────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Courses Storage ─────────────────────────────────────────
function loadCourses() {
  const filePath = getCoursesFile();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Server] Error loading courses file, restoring defaults:', err.message);
  }
  const defaults = DEFAULT_COURSES.map(c => ({ ...c }));
  saveCourses(defaults);
  return defaults;
}

function saveCourses(courses) {
  const filePath = getCoursesFile();
  try {
    fs.writeFileSync(filePath, JSON.stringify(courses, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server] Failed to write courses to disk:', err.message);
    return false;
  }
}

// ── Attendance Database Storage ─────────────────────────────
function loadDatabase() {
  const filePath = getDbFile();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Ensure all current courses have attendance records
      const currentCourses = loadCourses();
      let missing = false;
      for (const c of currentCourses) {
        if (!parsed[c.id] || typeof parsed[c.id].attended !== 'number' || typeof parsed[c.id].total !== 'number') {
          parsed[c.id] = SEED_ATTENDANCE[c.id] ? { ...SEED_ATTENDANCE[c.id] } : { attended: 0, total: 0 };
          missing = true;
        }
      }
      if (missing) saveDatabase(parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('[Server] Error loading database file, restoring defaults:', err.message);
  }
  // Initialize with seed mid-semester progress
  const initial = { ...SEED_ATTENDANCE };
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data) {
  const filePath = getDbFile();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server] Failed to write database to disk:', err.message);
    return false;
  }
}

let db = loadDatabase();
let coursesList = loadCourses();

// ── Business Logic Calculations ─────────────────────────────
function calculateStats(attended, total, required = 75) {
  const rawRatio = total === 0 ? 0 : attended / total;
  const requiredRatio = required / 100;

  // Use raw mathematical ratio for status to prevent near-threshold rounding errors
  // E.g. 56/75 (74.67%) and 149/200 (74.5%) are strictly below 75% -> NOT safe!
  let status = 'danger';
  if (rawRatio >= requiredRatio) {
    status = 'safe';
  } else if (rawRatio >= 0.6) {
    status = 'warning';
  }

  // Show percent floored so 74.67% displays as 74%, never misleadingly showing 75%
  const percent = total === 0 ? 0 : Math.floor(rawRatio * 100);

  // Safe skips: attended / (total + x) >= requiredRatio  ->  x <= (attended / requiredRatio) - total
  const safeSkips = total === 0 ? 0 : Math.max(0, Math.floor((attended / requiredRatio) - total));

  // Classes needed: if below requiredRatio, how many consecutive classes to attend to reach target?
  let classesNeeded = 0;
  if (rawRatio < requiredRatio) {
    classesNeeded = Math.ceil((requiredRatio * total - attended) / (1 - requiredRatio));
  }

  return { attended, total, percent, status, safeSkips, classesNeeded };
}

// ── Strict Input Validation Helpers ─────────────────────────
function validateCourseId(courseId) {
  if (typeof courseId !== 'string') {
    return 'Field "courseId" must be a string.';
  }
  const cleanId = courseId.trim().toUpperCase();
  const validIds = coursesList.map(c => c.id.toUpperCase());
  if (!validIds.includes(cleanId)) {
    return `Unknown courseId "${courseId}". Valid course IDs are: ${validIds.join(', ')}`;
  }
  return null;
}

function validateCoursePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Course payload must be an object.';
  }
  if (typeof data.id !== 'string' || !/^[A-Z0-9-]{2,12}$/.test(data.id.trim().toUpperCase())) {
    return 'Field "id" must be 2-12 uppercase alphanumeric characters or dashes.';
  }
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80) {
    return 'Field "name" must be a non-empty string under 80 characters.';
  }
  if (typeof data.code !== 'string' || !data.code.trim() || data.code.length > 16) {
    return 'Field "code" must be a non-empty string under 16 characters.';
  }
  if (typeof data.instructor !== 'string' || !data.instructor.trim() || data.instructor.length > 80) {
    return 'Field "instructor" must be a non-empty string under 80 characters.';
  }
  if (!Number.isInteger(data.credits) || data.credits < 1 || data.credits > 30) {
    return 'Field "credits" must be an integer between 1 and 30.';
  }
  if (typeof data.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(data.color)) {
    return 'Field "color" must be a 6-digit hex color code (e.g. #a78bfa).';
  }
  return null;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024) { // 50KB limit
        reject({ status: 413, message: 'Payload Too Large: max 50KB' });
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return reject({ status: 400, message: 'JSON body must be a key-value object.' });
        }
        resolve(parsed);
      } catch (err) {
        reject({ status: 400, message: `Malformed JSON: ${err.message}` });
      }
    });
    req.on('error', err => reject({ status: 500, message: err.message }));
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload, null, 2));
}

// ── Static MIME Types ───────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

// ── Main Request Handler ────────────────────────────────────
export async function handleRequest(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // ── REST API ROUTES ───────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Health check
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'BunkSmart API',
          timestamp: new Date().toISOString(),
          uptime: Math.round(process.uptime())
        });
      }

      // 2. Courses metadata list with combined stats
      if (pathname === '/api/courses' && method === 'GET') {
        const enriched = coursesList.map(course => {
          const rec = db[course.id] || { attended: 0, total: 0 };
          const stats = calculateStats(rec.attended, rec.total, course.requiredPercent);
          return { ...course, ...stats };
        });
        return sendJson(res, 200, { courses: enriched });
      }

      // 2b. Add a new course (Validated POST /api/courses)
      if (pathname === '/api/courses' && method === 'POST') {
        const body = await parseJsonBody(req);
        const valErr = validateCoursePayload(body);
        if (valErr) {
          return sendJson(res, 400, { error: 'Validation Error', message: valErr });
        }
        const cleanId = body.id.trim().toUpperCase();
        if (coursesList.some(c => c.id.toUpperCase() === cleanId)) {
          return sendJson(res, 409, { error: 'Conflict', message: `Course "${cleanId}" already exists.` });
        }
        const newCourse = {
          id: cleanId,
          name: body.name.trim(),
          code: body.code.trim().toUpperCase(),
          instructor: body.instructor.trim(),
          credits: body.credits,
          color: body.color,
          requiredPercent: 75
        };
        coursesList.push(newCourse);
        saveCourses(coursesList);

        if (!db[cleanId]) {
          db[cleanId] = { attended: 0, total: 0 };
          saveDatabase(db);
        }

        const stats = calculateStats(0, 0, newCourse.requiredPercent);
        return sendJson(res, 201, {
          success: true,
          course: { ...newCourse, ...stats }
        });
      }

      // 2c. Delete a course (DELETE /api/courses?id=...)
      if (pathname === '/api/courses' && (method === 'DELETE' || method === 'POST') && (urlObj.searchParams.has('id') || req.headers['content-type']?.includes('json'))) {
        let courseId = urlObj.searchParams.get('id');
        if (!courseId) {
          const body = await parseJsonBody(req);
          courseId = body.courseId || body.id;
        }
        if (!courseId) {
          return sendJson(res, 400, { error: 'Validation Error', message: 'Parameter "id" is required.' });
        }
        const cleanId = courseId.trim().toUpperCase();
        const index = coursesList.findIndex(c => c.id.toUpperCase() === cleanId);
        if (index < 0) {
          return sendJson(res, 404, { error: 'Not Found', message: `Course "${cleanId}" not found.` });
        }
        coursesList.splice(index, 1);
        saveCourses(coursesList);
        delete db[cleanId];
        saveDatabase(db);
        return sendJson(res, 200, { success: true, message: `Course "${cleanId}" removed.` });
      }

      // 3. Complete attendance records
      if (pathname === '/api/attendance' && method === 'GET') {
        const records = {};
        for (const [id, rec] of Object.entries(db)) {
          records[id] = calculateStats(rec.attended, rec.total);
        }
        return sendJson(res, 200, { records });
      }

      // 4. Mark attendance (Strict input checks)
      if (pathname === '/api/attendance/mark' && method === 'POST') {
        const body = await parseJsonBody(req);

        // Validation Check 1: courseId exists & is valid string
        const idErr = validateCourseId(body.courseId);
        if (idErr) {
          return sendJson(res, 400, { error: 'Validation Error', message: idErr });
        }
        const courseId = body.courseId.trim().toUpperCase();

        // Validation Check 2: 'present' must be explicitly boolean
        if (typeof body.present !== 'boolean') {
          return sendJson(res, 400, {
            error: 'Validation Error',
            message: 'Field "present" is required and must be a boolean (true or false).'
          });
        }

        // Apply mark
        const current = db[courseId] || { attended: 0, total: 0 };
        const updated = {
          attended: body.present ? current.attended + 1 : current.attended,
          total: current.total + 1
        };

        db[courseId] = updated;
        saveDatabase(db);

        const stats = calculateStats(updated.attended, updated.total);
        return sendJson(res, 200, {
          success: true,
          action: body.present ? 'marked_present' : 'marked_absent',
          courseId,
          record: stats
        });
      }

      // 5. Update attendance directly (e.g. edit form / sync)
      if (pathname === '/api/attendance/update' && method === 'POST') {
        const body = await parseJsonBody(req);

        const idErr = validateCourseId(body.courseId);
        if (idErr) {
          return sendJson(res, 400, { error: 'Validation Error', message: idErr });
        }
        const courseId = body.courseId.trim().toUpperCase();

        // Check integer types
        if (!Number.isInteger(body.attended) || body.attended < 0) {
          return sendJson(res, 400, {
            error: 'Validation Error',
            message: 'Field "attended" must be a non-negative integer.'
          });
        }
        if (!Number.isInteger(body.total) || body.total < 0) {
          return sendJson(res, 400, {
            error: 'Validation Error',
            message: 'Field "total" must be a non-negative integer.'
          });
        }

        // Logical constraint: attended <= total
        if (body.attended > body.total) {
          return sendJson(res, 400, {
            error: 'Logical Constraint Error',
            message: `Attended classes (${body.attended}) cannot exceed total classes (${body.total}).`
          });
        }

        db[courseId] = { attended: body.attended, total: body.total };
        saveDatabase(db);

        return sendJson(res, 200, {
          success: true,
          courseId,
          record: calculateStats(body.attended, body.total)
        });
      }

      // 6. Predict skip impact
      if (pathname === '/api/attendance/predict' && method === 'POST') {
        const body = await parseJsonBody(req);
        const idErr = validateCourseId(body.courseId);
        if (idErr) {
          return sendJson(res, 400, { error: 'Validation Error', message: idErr });
        }
        const courseId = body.courseId.trim().toUpperCase();
        const current = db[courseId] || { attended: 0, total: 0 };

        const currentStats = calculateStats(current.attended, current.total);
        const afterSkip = calculateStats(current.attended, current.total + 1);

        return sendJson(res, 200, {
          courseId,
          current: currentStats,
          afterSkip: {
            percent: afterSkip.percent,
            status: afterSkip.status,
            safeSkips: afterSkip.safeSkips,
            classesNeeded: afterSkip.classesNeeded
          },
          drop: currentStats.percent - afterSkip.percent,
          verdict: afterSkip.status === 'safe' ? 'Safe to skip' : 'Danger: Do not skip'
        });
      }

      // 7. Reset to semester seed data
      if (pathname === '/api/attendance/reset' && method === 'POST') {
        db = { ...SEED_ATTENDANCE };
        saveDatabase(db);
        coursesList = DEFAULT_COURSES.map(c => ({ ...c }));
        saveCourses(coursesList);
        return sendJson(res, 200, {
          success: true,
          message: 'Database reset to semester seed data.',
          records: db
        });
      }

      // If no API endpoint matched
      return sendJson(res, 404, {
        error: 'Not Found',
        message: `API endpoint "${pathname}" does not exist.`
      });

    } catch (err) {
      const status = err.status || 500;
      return sendJson(res, status, {
        error: 'Bad Request',
        message: err.message || 'Internal Server Error'
      });
    }
  }

  // ── STATIC FILE SERVING ───────────────────────────────────
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  // Security check: ensure path stays inside root directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Invalid file path');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2>404 - Page Not Found</h2>
        <p>The requested file <code>${pathname}</code> was not found on this server.</p>
        <a href="/">← Return to BunkSmart Home</a>
      </body></html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

export const server = http.createServer(handleRequest);

// Auto-listen when run directly (node server.js)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(PORT, () => {
    console.log(`🌸 BunkSmart Server running at http://localhost:${PORT}/`);
    console.log(`   Strict input validation active. Survives refreshes.`);
  });
}
