// ============================================================
//  server.js – BunkSmart Backend Server
//  Zero-dependency, production-clean Node.js HTTP Server.
//  Strictly checks and validates every input. Survives refreshes.
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COURSES, SEED_ATTENDANCE, VALID_COURSE_IDS } from './data/defaultData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'attendance.json');

// ── Ensure Data Directory & Database File Exist ─────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      // Ensure all valid courses are present
      for (const id of VALID_COURSE_IDS) {
        if (!parsed[id] || typeof parsed[id].attended !== 'number' || typeof parsed[id].total !== 'number') {
          parsed[id] = { ...SEED_ATTENDANCE[id] };
        }
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[Server] Error loading database file, restoring defaults:', err.message);
  }
  // Initialize with seed mid-semester progress
  saveDatabase(SEED_ATTENDANCE);
  return { ...SEED_ATTENDANCE };
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server] Failed to write to disk:', err.message);
    return false;
  }
}

let db = loadDatabase();

// ── Business Logic Calculations ─────────────────────────────
function calculateStats(attended, total, required = 75) {
  const percent = total === 0 ? 0 : Math.round((attended / total) * 100);
  let status = 'danger';
  if (percent >= required) status = 'safe';
  else if (percent >= 60) status = 'warning';

  // Safe skips: how many more classes can you miss while staying >= required?
  // attended / (total + x) >= required / 100
  // x <= (attended * 100 / required) - total
  const safeSkips = Math.max(0, Math.floor((attended / (required / 100)) - total));

  // Classes needed: if below required, how many consecutive classes to attend to reach required?
  // (attended + x) / (total + x) >= required / 100
  // x >= (required*total - 100*attended) / (100 - required)
  let classesNeeded = 0;
  if (percent < required) {
    const numerator = (required * total) - (100 * attended);
    const denominator = 100 - required;
    classesNeeded = Math.max(0, Math.ceil(numerator / denominator));
  }

  return { attended, total, percent, status, safeSkips, classesNeeded };
}

// ── Strict Input Validation Helpers ─────────────────────────
function validateCourseId(courseId) {
  if (typeof courseId !== 'string') {
    return 'Field "courseId" must be a string.';
  }
  const cleanId = courseId.trim().toUpperCase();
  if (!VALID_COURSE_IDS.includes(cleanId)) {
    return `Unknown courseId "${courseId}". Valid course IDs are: ${VALID_COURSE_IDS.join(', ')}`;
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        const enriched = DEFAULT_COURSES.map(course => {
          const rec = db[course.id] || { attended: 0, total: 0 };
          const stats = calculateStats(rec.attended, rec.total, course.requiredPercent);
          return { ...course, ...stats };
        });
        return sendJson(res, 200, { courses: enriched });
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
          verdict: afterSkip.percent >= 75 ? 'Safe to skip' : 'Danger: Do not skip'
        });
      }

      // 7. Reset to semester seed data
      if (pathname === '/api/attendance/reset' && method === 'POST') {
        db = { ...SEED_ATTENDANCE };
        saveDatabase(db);
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

// Run server if called directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, () => {
    console.log(`[BunkSmart Server] Running at http://localhost:${PORT}`);
    console.log(`[BunkSmart Server] Serving fullstack app with strict input validation.`);
  });
}
