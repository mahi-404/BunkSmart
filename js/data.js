// ============================================================
//  data.js  –  Shared data model
//  Person 2 (logic.js) and Person 3 (timetable / dashboard)
//  both import this file.
// ============================================================

export const COURSES = [
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

// Weekly timetable: each entry = one class slot
// days: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
export const TIMETABLE = [
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
