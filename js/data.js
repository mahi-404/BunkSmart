// ============================================================
//  data.js  –  Shared data model
//  Person 2 (logic.js) and Person 3 (timetable / dashboard)
//  both import this file.
// ============================================================

import { loadCourses, removeRecord, saveCourses } from "./storage.js";

const DEFAULT_COURSES = [
  {
    id: "CS301",
    name: "Data Structures & Algorithms",
    code: "CS301",
    instructor: "Dr. Ramesh Kumar",
    credits: 4,
    totalClasses: 0,   // updated by markAttendance()
    attended: 0,       // updated by markAttendance()
    requiredPercent: 75,
    color: "#a78bfa",  // soft lavender
  },
  {
    id: "CS302",
    name: "Database Management Systems",
    code: "CS302",
    instructor: "Prof. Anitha Rao",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#34d399",  // emerald
  },
  {
    id: "CS303",
    name: "Operating Systems",
    code: "CS303",
    instructor: "Dr. Suresh Patel",
    credits: 4,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#fb923c",  // orange
  },
  {
    id: "CS304",
    name: "Computer Networks",
    code: "CS304",
    instructor: "Prof. Meena Iyer",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#f87171",  // rose
  },
  {
    id: "MA201",
    name: "Engineering Mathematics III",
    code: "MA201",
    instructor: "Dr. Priya Sharma",
    credits: 4,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#a78bfa",  // purple
  },
  {
    id: "CS305",
    name: "Software Engineering",
    code: "CS305",
    instructor: "Prof. Vikram Singh",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#2dd4bf",  // teal
  },
];

export const COURSES = loadCourses(DEFAULT_COURSES);

function validateCourse(course) {
  if (!course || !/^[A-Z0-9-]{2,12}$/.test(course.id) ||
      typeof course.name !== "string" || !course.name.trim() || course.name.length > 80 ||
      typeof course.code !== "string" || !course.code.trim() || course.code.length > 16 ||
      typeof course.instructor !== "string" || !course.instructor.trim() || course.instructor.length > 80 ||
      !Number.isInteger(course.credits) || course.credits < 1 || course.credits > 30 ||
      typeof course.color !== "string" || !/^#[0-9a-f]{6}$/i.test(course.color)) {
    throw new TypeError("Course details are invalid. Check the ID, name, instructor, credits, and color.");
  }
}

if (!Array.isArray(COURSES)) {
  throw new TypeError("Saved courses must be a list.");
}
COURSES.forEach(validateCourse);
if (new Set(COURSES.map(course => course.id)).size !== COURSES.length) {
  throw new Error("Saved courses contain duplicate IDs.");
}

export function addCourse(course) {
  validateCourse(course);
  if (COURSES.some(existing => existing.id === course.id)) {
    throw new Error(`A course with ID ${course.id} already exists.`);
  }
  const nextCourses = [...COURSES, { ...course, requiredPercent: 75 }];
  saveCourses(nextCourses);
  COURSES.push(nextCourses[nextCourses.length - 1]);
}

export function updateCourse(courseId, updates) {
  const index = COURSES.findIndex(course => course.id === courseId);
  if (index < 0) throw new Error(`Course ${courseId} was not found.`);

  const updatedCourse = { ...COURSES[index], ...updates, id: courseId, requiredPercent: 75 };
  validateCourse(updatedCourse);
  const nextCourses = COURSES.map((course, i) => i === index ? updatedCourse : course);
  saveCourses(nextCourses);
  COURSES[index] = updatedCourse;
}

export function deleteCourse(courseId) {
  const index = COURSES.findIndex(course => course.id === courseId);
  if (index < 0) throw new Error(`Course ${courseId} was not found.`);

  const nextCourses = COURSES.filter(course => course.id !== courseId);
  saveCourses(nextCourses);
  COURSES.splice(index, 1);
  removeRecord(courseId);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

// Weekly timetable: each entry = one class slot
// days: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
const DEFAULT_TIMETABLE = [
  // ── Monday ─────────────────────────────────────────────────
  { day: 0, startTime: "09:00", endTime: "10:00", courseId: "CS301", room: "A-101" },
  { day: 0, startTime: "10:00", endTime: "11:00", courseId: "MA201", room: "B-201" },
  { day: 0, startTime: "11:15", endTime: "12:15", courseId: "CS303", room: "A-201" },
  { day: 0, startTime: "14:00", endTime: "15:00", courseId: "CS305", room: "C-301" },

  // ── Tuesday ─────────────────────────────────────────────────
  { day: 1, startTime: "09:00", endTime: "10:00", courseId: "CS302", room: "B-102" },
  { day: 1, startTime: "10:00", endTime: "11:00", courseId: "CS304", room: "A-301" },
  { day: 1, startTime: "11:15", endTime: "12:15", courseId: "MA201", room: "B-201" },
  { day: 1, startTime: "14:00", endTime: "16:00", courseId: "CS301", room: "Lab-1" }, // 2-hr lab

  // ── Wednesday ────────────────────────────────────────────────
  { day: 2, startTime: "09:00", endTime: "10:00", courseId: "CS303", room: "A-201" },
  { day: 2, startTime: "10:00", endTime: "11:00", courseId: "CS301", room: "A-101" },
  { day: 2, startTime: "11:15", endTime: "12:15", courseId: "CS302", room: "B-102" },
  { day: 2, startTime: "14:00", endTime: "16:00", courseId: "CS304", room: "Lab-2" }, // 2-hr lab

  // ── Thursday ─────────────────────────────────────────────────
  { day: 3, startTime: "09:00", endTime: "10:00", courseId: "MA201", room: "B-201" },
  { day: 3, startTime: "10:00", endTime: "11:00", courseId: "CS305", room: "C-301" },
  { day: 3, startTime: "11:15", endTime: "12:15", courseId: "CS304", room: "A-301" },
  { day: 3, startTime: "14:00", endTime: "15:00", courseId: "CS302", room: "B-102" },

  // ── Friday ───────────────────────────────────────────────────
  { day: 4, startTime: "09:00", endTime: "10:00", courseId: "CS303", room: "A-201" },
  { day: 4, startTime: "10:00", endTime: "11:00", courseId: "CS305", room: "C-301" },
  { day: 4, startTime: "11:15", endTime: "12:15", courseId: "CS301", room: "A-101" },
  { day: 4, startTime: "14:00", endTime: "16:00", courseId: "CS302", room: "Lab-3" }, // 2-hr lab
];

export const TIMETABLE = DEFAULT_TIMETABLE.filter(slot =>
  COURSES.some(course => course.id === slot.courseId)
);

// Day labels
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Time slots displayed in the timetable grid
export const TIME_SLOTS = [
  "09:00", "10:00", "11:15", "12:15",
  "13:00", "14:00", "15:00", "16:00",
];

// Helper: get course object by id
export function getCourse(courseId) {
  return COURSES.find(c => c.id === courseId) || null;
}
