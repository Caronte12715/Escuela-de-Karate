import { Student, Belt } from "../types";

export const initialStudents: Student[] = [];

export const initialSessionsList = [
  {
    id: "sess-1",
    date: "2026-06-15",
    className: "Clase 1 - Segundo Semestre",
    ageGroupFilter: "All" as const,
    attendedStudentIds: []
  }
];

export const initialPromotionHistoryList = [];

