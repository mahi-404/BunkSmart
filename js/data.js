// ============================================================
//  data.js  –  Shared data model
//  Person 2 (logic.js) and Person 3 (timetable / dashboard)
//  both import this file.
// ============================================================

import { loadCourses, removeRecord, saveCourses } from "./storage.js";

const DEFAULT_COURSES = [
  {
    id: "CS301",
    name: "Advanced Algorithms",
    code: "CS301",
    instructor: "Course Instructor",
    credits: 4,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#a78bfa",
  },
  {
    id: "DS365",
    name: "Full Stack Development",
    code: "DS365",
    instructor: "Course Instructor",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#34d399",
  },
  {
    id: "CS351",
    name: "Software Design",
    code: "CS351",
    instructor: "Course Instructor",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#fb923c",
  },
  {
    id: "DS304",
    name: "Explainable AI",
    code: "DS304",
    instructor: "Course Instructor",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#f87171",
  },
  {
    id: "EC354",
    name: "Tensor Multimodal",
    code: "EC354",
    instructor: "Course Instructor",
    credits: 3,
    totalClasses: 0,
    attended: 0,
    requiredPercent: 75,
    color: "#2dd4bf",
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
  { day: 0, startTime: "10:00", endTime: "11:00", courseId: "EC354", room: "B-201" },
  { day: 0, startTime: "11:15", endTime: "12:15", courseId: "CS351", room: "A-201" },
  { day: 0, startTime: "14:00", endTime: "15:00", courseId: "DS304", room: "C-301" },

  // ── Tuesday ─────────────────────────────────────────────────
  { day: 1, startTime: "09:00", endTime: "10:00", courseId: "DS365", room: "B-102" },
  { day: 1, startTime: "10:00", endTime: "11:00", courseId: "DS304", room: "A-301" },
  { day: 1, startTime: "11:15", endTime: "12:15", courseId: "EC354", room: "B-201" },
  { day: 1, startTime: "14:00", endTime: "16:00", courseId: "CS301", room: "Lab-1" },

  // ── Wednesday ────────────────────────────────────────────────
  { day: 2, startTime: "09:00", endTime: "10:00", courseId: "CS351", room: "A-201" },
  { day: 2, startTime: "10:00", endTime: "11:00", courseId: "CS301", room: "A-101" },
  { day: 2, startTime: "11:15", endTime: "12:15", courseId: "DS365", room: "B-102" },
  { day: 2, startTime: "14:00", endTime: "16:00", courseId: "DS304", room: "Lab-2" },

  // ── Thursday ─────────────────────────────────────────────────
  { day: 3, startTime: "09:00", endTime: "10:00", courseId: "EC354", room: "B-201" },
  { day: 3, startTime: "10:00", endTime: "11:00", courseId: "DS304", room: "C-301" },
  { day: 3, startTime: "11:15", endTime: "12:15", courseId: "DS304", room: "A-301" },
  { day: 3, startTime: "14:00", endTime: "15:00", courseId: "DS365", room: "B-102" },

  // ── Friday ───────────────────────────────────────────────────
  { day: 4, startTime: "09:00", endTime: "10:00", courseId: "CS351", room: "A-201" },
  { day: 4, startTime: "10:00", endTime: "11:00", courseId: "DS304", room: "C-301" },
  { day: 4, startTime: "11:15", endTime: "12:15", courseId: "CS301", room: "A-101" },
  { day: 4, startTime: "14:00", endTime: "16:00", courseId: "DS365", room: "Lab-3" },
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
