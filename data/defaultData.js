// ============================================================
//  defaultData.js – Realistic B.Tech Seed Dataset
//  No AI slop or zeros: realistic semester progress
// ============================================================

export const DEFAULT_COURSES = [
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

// Seed attendance state representing mid-semester progress
export const SEED_ATTENDANCE = {
  CS301: { attended: 18, total: 22 }, // 81.8% -> Safe (can skip 2)
  DS365: { attended: 15, total: 20 }, // 75.0% -> Safe on border (can skip 0)
  CS351: { attended: 14, total: 20 }, // 70.0% -> Warning (needs 4 classes)
  DS304: { attended: 10, total: 18 }, // 55.6% -> Danger (needs 14 classes)
  EC354: { attended: 16, total: 20 }, // 80.0% -> Safe (can skip 1)
};

export const VALID_COURSE_IDS = DEFAULT_COURSES.map(c => c.id);
