export enum Belt {
  Participante = "Participante",
  Amarilla = "Cinta Amarilla",
  Naranja = "Cinta Naranja",
  Verde = "Cinta Verde",
  VerdeMorada = "Cinta Verde - Morada",
  Morada = "Cinta Morada",
  Marron = "Cinta Marrón",
  Negra = "Cinta Negra"
}

export type AgeGroup = "Infantil" | "Cadete" | "Juvenil/Adulto";

export interface Student {
  id: string;
  name: string;
  age: number;
  currentBelt: Belt;
  phone: string;
  enrollmentDate: string;
  status: "active" | "inactive";
  katasMastered: string[];
  sparringHours: number;
  attendanceCount: number;
  notes: string;
}

export interface AttendanceRecord {
  sessionId: string;
  studentId: string;
  present: boolean;
}

export interface AttendanceSession {
  id: string;
  date: string; // ISO String or YYYY-MM-DD
  className: string;
  ageGroupFilter: "All" | AgeGroup;
  attendedStudentIds: string[];
}

export interface PromotionRecord {
  id: string;
  studentId: string;
  studentName: string;
  oldBelt: Belt;
  newBelt: Belt;
  date: string;
  notes: string;
}
