// ============================================================
//  defaultData.js – Realistic B.Tech Seed Dataset
//  No AI slop or zeros: realistic semester progress
// ============================================================

export const DEFAULT_COURSES = [
  {
    id: "CS301",
    name: "Data Structures & Algorithms",
    code: "CS301",
    instructor: "Dr. Ramesh Kumar",
    credits: 4,
    requiredPercent: 0,
    color: "#a78bfa"
  },
  {
    id: "EC303",
    name: "Tensor Multimodal data",
    code: "CS303",
    instructor: "Dr. Suresh Patel",
    credits: 4,
    requiredPercent: 75,
    color: "#fb923c"
  },
  {
    id: "CS304",
    name: "Full Stack Development",
    code: "CS304",
    instructor: "Prof. Meena Iyer",
    credits: 3,
    requiredPercent: 75,
    color: "#f87171"
  },
  {
    id: "DS301",
    name: "Explainable AI",
    code: "MA201",
    instructor: "Dr. Priya Sharma",
    credits: 4,
    requiredPercent: 75,
    color: "#f9a8d4"
  },
  {
    id: "CS305",
    name: "Software Engineering",
    code: "CS305",
    instructor: "Prof. Vikram Singh",
    credits: 3,
    requiredPercent: 75,
    color: "#2dd4bf"
  }
];

// Seed attendance state representing mid-semester progress
export const SEED_ATTENDANCE = {
  CS301: { attended: 18, total: 22 }, // 81.8% -> Safe (can skip 2)
  CS302: { attended: 14, total: 20 }, // 70.0% -> Warning (needs 4 classes)
  CS303: { attended: 10, total: 18 }, // 55.6% -> Danger (needs 14 classes)
  CS304: { attended: 16, total: 20 }, // 80.0% -> Safe (can skip 1)
  MA201: { attended: 12, total: 16 }, // 75.0% -> Safe on border (can skip 0)
  CS305: { attended: 9,  total: 14 }  // 64.3% -> Warning (needs 6 classes)
};

export const VALID_COURSE_IDS = DEFAULT_COURSES.map(c => c.id);
