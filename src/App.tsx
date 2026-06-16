import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  Calendar,
  Users,
  Search,
  Plus,
  PlusCircle,
  Trash2,
  Edit,
  TrendingUp,
  UserCheck,
  RotateCcw,
  Filter,
  Check,
  BookOpen,
  Flame,
  X,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  CalendarDays,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Undo2,
  CheckSquare,
  AlertCircle,
  Printer,
  Download,
  Save,
  UserPlus,
  Lock,
  LogOut,
  LogIn,
  Shield,
  ExternalLink
} from "lucide-react";
import { Student, Belt, AgeGroup, AttendanceSession, PromotionRecord } from "./types";
import { initialStudents, initialSessionsList, initialPromotionHistoryList } from "./data/seedData";
import { 
  auth, 
  db, 
  googleProvider, 
  isUserAuthorized, 
  OperationType, 
  handleFirestoreError,
  ALLOWED_EMAILS
} from "./lib/firebase";
import { 
  signInWithPopup, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";

// Minimalist representation of the Kyudai Kai Dojo visual seal
const KyudaiKaiLogo = ({ size = 48 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 drop-shadow-md hover:rotate-3 transition-transform duration-300 pointer-events-auto"
  >
    {/* Outer circle with gold border */}
    <circle cx="60" cy="60" r="56" fill="#0f172a" stroke="#b45309" strokeWidth="4" />
    <circle cx="60" cy="60" r="51" fill="none" stroke="#f59e0b" strokeWidth="1" />
    
    {/* Clean sand/beige background matching the classic patch */}
    <circle cx="60" cy="60" r="48" fill="#f5f0e6" />
    
    {/* Rising Sun (Crimson Circle) in back */}
    <circle cx="60" cy="56" r="23" fill="#dc2626" />
    
    {/* Elegant Mount Fuji Peak */}
    {/* Main body of the volcanic mountain (Green slopes representing the embroidered threads of Fuji) */}
    <path d="M26 86 C 45 68, 52 50, 60 48 C 68 50, 75 68, 94 86 Z" fill="#15803d" stroke="#166534" strokeWidth="0.5" />
    
    {/* Snowcap on top of Fuji */}
    <path d="M51 61 C 56 55, 57 51, 60 48 C 63 51, 64 55, 69 61 C 65 64, 62 62, 60 63 C 58 62, 55 64, 51 61 Z" fill="#ffffff" />
    
    {/* Black Belt running as physical wrap across base of Mount Fuji */}
    <path d="M32 80 C 45 83, 75 83, 88 80 L 87 86 C 75 89, 45 89, 33 86 Z" fill="#020617" />
    {/* Gold Knot/Buckle element in center of the belt */}
    <rect x="55" y="79" width="10" height="8" rx="1" fill="#020617" stroke="#fbbf24" strokeWidth="1.5" />
    
    {/* Tiny golden accent dots on extreme outer edges */}
    <circle cx="20" cy="60" r="2" fill="#fbbf24" />
    <circle cx="100" cy="60" r="2" fill="#fbbf24" />
  </svg>
);

export default function App() {
  // Firebase Authentication States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState<boolean>(() => {
    try {
      return window.self !== window.top;
    } catch (_) {
      return true;
    }
  });

  // Core App State collections synced in real-time with Firestore
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);

  // Selected Tab state
  const [activeTab, setActiveTab] = useState<"dashboard" | "roster" | "register" | "progress" | "attendance" | "reports">("dashboard");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [beltFilter, setBeltFilter] = useState<string>("All");
  const [ageGroupFilter, setAgeGroupFilter] = useState<"All" | AgeGroup>("All");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // New Student Draft State
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAge, setNewStudentAge] = useState<number>(10);
  const [newStudentBelt, setNewStudentBelt] = useState<Belt>(Belt.Participante);
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");

  // Edit Student Draft State (controlled)
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState(10);
  const [editBelt, setEditBelt] = useState<Belt>(Belt.Participante);
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editNotes, setEditNotes] = useState("");

  // Attendance Tracker States
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return sessions.length > 0 ? sessions[0].id : "";
  });
  const [newClassName, setNewClassName] = useState("");
  const [newClassDate, setNewClassDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newClassAgeGroup, setNewClassAgeGroup] = useState<"All" | AgeGroup>("All");

  // Promotion Evaluator state
  const [selectedPromoStudentId, setSelectedPromoStudentId] = useState<string>(() => {
    return students.length > 0 ? students[0].id : "";
  });
  const [evaluatorNotes, setEvaluatorNotes] = useState("");
  const [promoSuccessMessage, setPromoSuccessMessage] = useState<string | null>(null);

  // Astro AI Assistant states
  const [astroMessage, setAstroMessage] = useState<string>(
    "¡Oss! Soy Astro, el Asistente de Asistencia de Kyudai Kai. Estoy listo para ayudarte a analizar la consistencia de tus alumnos y generar plantillas de seguimiento. Pregúntame sobre alumnos con asistencia perfecta, alertas de riesgo de deserción o selecciona opciones."
  );
  const [astroTitle, setAstroTitle] = useState<string>("Mensaje del Asistente Astro");
  const [astroSelectedAbsentStudentId, setAstroSelectedAbsentStudentId] = useState<string>("");
  const [copiedAstroText, setCopiedAstroText] = useState<boolean>(false);

  // Reports page states
  const [reportAgeFilter, setReportAgeFilter] = useState<"All" | AgeGroup>("All");
  const [reportBeltFilter, setReportBeltFilter] = useState<string>("All");
  const [reportSearch, setReportSearch] = useState("");
  const [selectedReportSessionId, setSelectedReportSessionId] = useState<string>("All");
  const [editingSessionId, setEditingSessionId] = useState<string>("");
  const [editingSessionName, setEditingSessionName] = useState("");
  const [editingSessionDate, setEditingSessionDate] = useState("");

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAstroText(true);
    setTimeout(() => setCopiedAstroText(false), 2000);
  };

  const handleAstroQuery = (queryType: string) => {
    if (queryType === "asistencia-perfecta") {
      const topStudents = [...students]
        .filter(s => s.status === "active")
        .sort((a, b) => b.attendanceCount - a.attendanceCount)
        .slice(0, 3);
      
      const namesList = topStudents.map(s => `🥋 **${s.name}** (${s.attendanceCount} clases, ${s.currentBelt})`).join("\n");
      setAstroTitle("🏆 Alumnos Más Constantes");
      setAstroMessage(
        `¡Excelente consistencia! Los alumnos con mayor asistencia registrada en Kyudai Kai actualmente son:\n\n${namesList}\n\nSu disciplina es ejemplar. Considera darles una mención de honor en la próxima sesión.`
      );
    } else if (queryType === "alertas-desercion") {
      const atRiskStudents = [...students]
        .filter(s => s.status === "active")
        .sort((a, b) => a.attendanceCount - b.attendanceCount)
        .slice(0, 3);
      
      const namesList = atRiskStudents.map(s => `⚠️ **${s.name}** (Solo ${s.attendanceCount} clases registradas, ${s.currentBelt})`).join("\n");
      setAstroTitle("⚠️ Alertas de Deserción y Baja Asistencia");
      setAstroMessage(
        `He analizado la matrícula activa y detecté que estos alumnos registran la menor cantidad de asistencia acumulada:\n\n${namesList}\n\nTe recomiendo generarles un mensaje de seguimiento con mi herramienta personalizada de WhatsApp que se encuentra abajo de esta ventana.`
      );
    } else if (queryType === "comparar-grupos") {
      const infantilList = students.filter(s => s.status === "active" && s.age < 10);
      const infantilAvg = infantilList.length > 0 ? (infantilList.reduce((acc, s) => acc + s.attendanceCount, 0) / infantilList.length) : 0;
      
      const cadeteList = students.filter(s => s.status === "active" && s.age >= 10 && s.age <= 14);
      const cadeteAvg = cadeteList.length > 0 ? (cadeteList.reduce((acc, s) => acc + s.attendanceCount, 0) / cadeteList.length) : 0;
      
      const adultoList = students.filter(s => s.status === "active" && s.age >= 15);
      const adultoAvg = adultoList.length > 0 ? (adultoList.reduce((acc, s) => acc + s.attendanceCount, 0) / adultoList.length) : 0;
      
      setAstroTitle("📊 Desglose de Promedios por Edades");
      setAstroMessage(
        `Aquí tienes el promedio de clases asistidas por categoría de edad pedagógica en Kyudai Kai:\n\n👶 **Infantil (< 10 años)**: ${infantilAvg.toFixed(1)} clases de promedio.\n👦 **Cadete (10-14 años)**: ${cadeteAvg.toFixed(1)} clases de promedio.\n **Adultos y Padres (15+ años)**: ${adultoAvg.toFixed(1)} clases de promedio.\n\n*Nota: El grupo infantil suele requerir dinámicas más lúdicas para conservar su tasa de adherencia al tatami.*`
      );
    } else if (queryType === "consejos-retencion") {
      setAstroTitle("💡 4 Reglas de Retención de Kyudai Kai");
      setAstroMessage(
        `Para maximizar la asistencia, te sugiero aplicar estas 4 políticas deportivas de Kyudai Kai:\n\n1️⃣ **Regla de la Ausencia Dual**: Si un alumno falta a 2 clases consecutivas, genera un mensaje de WhatsApp hoy mismo desde mi herramienta.\n2️⃣ **Gamificación de Calentamientos**: Introduce juegos lúdicos (como atrapar cinturones) de 5 minutos en el grupo infantil.\n3️⃣ **Cuadro de Honor Mensual**: Exhibe la fotografía o el nombre del alumno más regular del mes en un lugar visible.\n4️⃣ **Integración Familiar**: Invita a las madres y padres a entrenar en clases de iniciación conjunta para fomentar el hábito.`
      );
    }
  };

  const handleGenerateWhatsAppForStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const activeSess = sessions.find(s => s.id === selectedSessionId) || sessions[0];
    const classNameText = activeSess ? activeSess.className : "su entrenamiento de Karate";
    const classDateText = activeSess ? activeSess.date : "la última sesión";
    
    const message = `Estimada familia de *${student.name}*, 🥋\n\nLe saludamos con mucho respeto de parte de la Escuela de Karate Kyudai Kai.\n\nNotamos que ${student.name} no pudo acompañarnos hoy en nuestra clase de *"${classNameText}"* (${classDateText}). ¡Le extrañamos mucho en el tatami! 🌟\n\nLa disciplina y la regularidad son las claves del Karate Do para seguir progresando en su desarrollo físico y mental hacia su próximo cinturón. Esperamos contar con su entusiasmo en la siguiente clase.\n\n¡Que tengan un excelente día! ¡Oss! 🥋🔥`;
    
    setAstroTitle(`📱 WhatsApp para ${student.name}`);
    setAstroMessage(message);
  };

  // Listen for user authentication changes and update states
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setIsAuthorized(isUserAuthorized(currentUser.email));
      } else {
        setIsAuthorized(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  // Sync with Firestore collections in real-time when authenticated and authorized
  useEffect(() => {
    if (!user || !isAuthorized) {
      setStudents([]);
      setSessions([]);
      setPromotions([]);
      return;
    }

    // Subscribe to students collection
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const list = snapshot.docs.map((docVal) => docVal.data() as Student);
        // Sort students primarily alphabetically by name
        const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "students");
      }
    );

    // Subscribe to sessions collection
    const unsubSessions = onSnapshot(
      collection(db, "sessions"),
      (snapshot) => {
        const list = snapshot.docs.map((docVal) => docVal.data() as AttendanceSession);
        // Sort sessions by date descending
        const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
        setSessions(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "sessions");
      }
    );

    // Subscribe to promotions collection
    const unsubPromotions = onSnapshot(
      collection(db, "promotions"),
      (snapshot) => {
        const list = snapshot.docs.map((docVal) => docVal.data() as PromotionRecord);
        // Sort promotions by date descending
        const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
        setPromotions(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "promotions");
      }
    );

    return () => {
      unsubStudents();
      unsubSessions();
      unsubPromotions();
    };
  }, [user, isAuthorized]);

  // Auto-selection of active session and student IDs once data fetches dynamically
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    if (students.length > 0 && !selectedPromoStudentId) {
      setSelectedPromoStudentId(students[0].id);
    }
  }, [students, selectedPromoStudentId]);

  // Helper: Get Age Group categorizer
  const getAgeGroup = (age: number): AgeGroup => {
    if (age < 10) return "Infantil";
    if (age <= 14) return "Cadete";
    return "Juvenil/Adulto";
  };

  // Clear / Reset Database to clean slate in Firestore
  const handleResetData = async () => {
    if (window.confirm("¿Está seguro que desea reiniciar la base de datos a un estado limpio? Esto eliminará todos los alumnos y sesiones actuales de forma permanente.")) {
      try {
        const batch = writeBatch(db);
        students.forEach((student) => {
          batch.delete(doc(db, "students", student.id));
        });
        sessions.forEach((session) => {
          batch.delete(doc(db, "sessions", session.id));
        });
        promotions.forEach((promo) => {
          batch.delete(doc(db, "promotions", promo.id));
        });
        await batch.commit();
        setSelectedPromoStudentId("");
        setSelectedSessionId("");
        alert("¡Base de datos restablecida con éxito!");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, "clear_data");
      }
    }
  };

  // ----------------------------------------------------
  // ENROLLMENT (MATRÍCULA) ACTIONS
  // ----------------------------------------------------
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const studentId = `stu-${Date.now()}`;
    const studentToAdd: Student = {
      id: studentId,
      name: newStudentName.trim(),
      age: Number(newStudentAge),
      currentBelt: newStudentBelt,
      phone: newStudentPhone.trim() || "+503 7000-0000",
      enrollmentDate: new Date().toISOString().split("T")[0],
      status: "active",
      katasMastered: newStudentBelt !== Belt.Participante ? ["Taikyoku Shodan"] : [],
      sparringHours: 0,
      attendanceCount: 0,
      notes: newStudentNotes.trim() || "Inscrito recientemente."
    };

    try {
      await setDoc(doc(db, "students", studentId), studentToAdd);
      setIsAddModalOpen(false);

      // Reset draft fields
      setNewStudentName("");
      setNewStudentAge(10);
      setNewStudentBelt(Belt.Participante);
      setNewStudentPhone("");
      setNewStudentNotes("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `students/${studentId}`);
    }
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditAge(student.age);
    setEditBelt(student.currentBelt);
    setEditPhone(student.phone);
    setEditStatus(student.status);
    setEditNotes(student.notes);
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updatedStudent: Student = {
      ...editingStudent,
      name: editName.trim(),
      age: Number(editAge),
      currentBelt: editBelt,
      phone: editPhone.trim(),
      status: editStatus,
      notes: editNotes.trim()
    };

    try {
      await setDoc(doc(db, "students", editingStudent.id), updatedStudent);
      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${editingStudent.id}`);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`¿Realmente desea eliminar a ${name} de los registros del Dojo? Esta acción no se puede deshacer de forma directa.`)) {
      try {
        await deleteDoc(doc(db, "students", id));
        if (selectedPromoStudentId === id) {
          const remaining = students.filter((s) => s.id !== id);
          setSelectedPromoStudentId(remaining.length > 0 ? remaining[0].id : "");
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  // ----------------------------------------------------
  // ATTENDANCE (ASISTENCIA) ACTIONS
  // ----------------------------------------------------
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const sessionId = `sess-${Date.now()}`;
    const newSession: AttendanceSession = {
      id: sessionId,
      date: newClassDate,
      className: newClassName.trim(),
      ageGroupFilter: newClassAgeGroup,
      attendedStudentIds: []
    };

    try {
      await setDoc(doc(db, "sessions", sessionId), newSession);
      setSelectedSessionId(sessionId);
      setNewClassName("");
      setNewClassAgeGroup("All");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sessions/${sessionId}`);
    }
  };

  const toggleAttendance = async (sessionId: string, studentId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const isAttending = session.attendedStudentIds.includes(studentId);
    const newAttendees = isAttending
      ? session.attendedStudentIds.filter((id) => id !== studentId)
      : [...session.attendedStudentIds, studentId];

    try {
      const batch = writeBatch(db);
      
      // Update session attendees list
      batch.update(doc(db, "sessions", sessionId), {
        attendedStudentIds: newAttendees
      });

      // Update student attendance count
      const student = students.find((s) => s.id === studentId);
      if (student) {
        batch.update(doc(db, "students", studentId), {
          attendanceCount: Math.max(0, student.attendanceCount + (isAttending ? -1 : 1))
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm("¿Desea eliminar este registro de clase? Los totales de asistencia de los alumnos se recalcularán correspondientemente.")) {
      const targetSession = sessions.find((s) => s.id === id);
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "sessions", id));

        if (targetSession) {
          targetSession.attendedStudentIds.forEach((stuId) => {
            const student = students.find((s) => s.id === stuId);
            if (student) {
              batch.update(doc(db, "students", stuId), {
                attendanceCount: Math.max(0, student.attendanceCount - 1)
              });
            }
          });
        }

        await batch.commit();

        const updatedSessions = sessions.filter((s) => s.id !== id);
        if (selectedSessionId === id && updatedSessions.length > 0) {
          setSelectedSessionId(updatedSessions[0].id);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `sessions/${id}`);
      }
    }
  };

  const handleUpdateClassSession = async (id: string, updatedName: string, updatedDate: string) => {
    if (!updatedName.trim()) return;
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    try {
      await setDoc(doc(db, "sessions", id), {
        ...session,
        className: updatedName.trim(),
        date: updatedDate
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sessions/${id}`);
    }
  };

  // ----------------------------------------------------
  // PROMOTION (ASCENSOS) ACTIONS
  // ----------------------------------------------------
  const getNextBelt = (current: Belt): Belt | null => {
    const beltOrder = [
      Belt.Participante,
      Belt.Amarilla,
      Belt.Naranja,
      Belt.Verde,
      Belt.VerdeMorada,
      Belt.Morada,
      Belt.Marron,
      Belt.Negra
    ];
    const index = beltOrder.indexOf(current);
    if (index !== -1 && index < beltOrder.length - 1) {
      return beltOrder[index + 1];
    }
    return null;
  };

  const toggleKata = async (studentId: string, kata: string) => {
    const student = students.find((st) => st.id === studentId);
    if (!student) return;

    const mastered = student.katasMastered.includes(kata);
    const newList = mastered
      ? student.katasMastered.filter((k) => k !== kata)
      : [...student.katasMastered, kata];

    try {
      await setDoc(doc(db, "students", studentId), {
        ...student,
        katasMastered: newList
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const adjustSparringHours = async (studentId: string, delta: number) => {
    const student = students.find((st) => st.id === studentId);
    if (!student) return;

    try {
      await setDoc(doc(db, "students", studentId), {
        ...student,
        sparringHours: Math.max(0, student.sparringHours + delta)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const handlePromoteStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const nextBelt = getNextBelt(student.currentBelt);
    if (!nextBelt) {
      alert("El alumno ya ha alcanzado la Cinta Negra, el grado máximo del dojo.");
      return;
    }

    const promotionId = `prom-${Date.now()}`;
    const promotionLog: PromotionRecord = {
      id: promotionId,
      studentId: student.id,
      studentName: student.name,
      oldBelt: student.currentBelt,
      newBelt: nextBelt,
      date: new Date().toISOString().split("T")[0],
      notes: evaluatorNotes.trim() || `Ascendido con mérito académico y práctico a ${nextBelt}.`
    };

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "students", studentId), {
        currentBelt: nextBelt
      });
      batch.set(doc(db, "promotions", promotionId), promotionLog);

      await batch.commit();

      setPromoSuccessMessage(`¡Felicitaciones! ${student.name} ha sido promovido exitosamente a ${nextBelt}!`);
      setEvaluatorNotes("");

      // Timeout toast message
      setTimeout(() => {
        setPromoSuccessMessage(null);
      }, 6000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "promotions");
    }
  };

  const handleRevertPromotion = async (record: PromotionRecord) => {
    if (window.confirm(`¿Desea revertir el ascenso de ${record.studentName} devuelta a ${record.oldBelt}?`)) {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "students", record.studentId), {
          currentBelt: record.oldBelt
        });
        batch.delete(doc(db, "promotions", record.id));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `promotions/${record.id}`);
      }
    }
  };

  // ----------------------------------------------------
  // COMPUTED ANALYTICS DATA
  // ----------------------------------------------------
  const activeStudents = students.filter((s) => s.status === "active");
  const totalCount = students.length;

  const countByAgeGroup = students.reduce(
    (acc, s) => {
      const grp = getAgeGroup(s.age);
      acc[grp] = (acc[grp] || 0) + 1;
      return acc;
    },
    { Infantil: 0, Cadete: 0, "Juvenil/Adulto": 0 }
  );

  const beltCounts = students.reduce((acc, s) => {
    acc[s.currentBelt] = (acc[s.currentBelt] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute average attendance rate per age group
  // To make it fully genuine: scanning class records
  const computeAgeGroupAttendanceRate = (grp: AgeGroup) => {
    const studentIdsInGroup = students.filter((s) => getAgeGroup(s.age) === grp).map((s) => s.id);
    if (studentIdsInGroup.length === 0) return 0;

    let possibleAttends = 0;
    let actualAttends = 0;

    sessions.forEach((sess) => {
      // If session class filter matches or is general
      if (sess.ageGroupFilter === "All" || sess.ageGroupFilter === grp) {
        // Safe estimate: Every active student in this age group should ideally participate
        possibleAttends += studentIdsInGroup.length;
        // Count how many actually did attend
        const attendeesInGroup = sess.attendedStudentIds.filter((id) => studentIdsInGroup.includes(id));
        actualAttends += attendeesInGroup.length;
      }
    });

    if (possibleAttends === 0) return 65; // realistic sandbox default
    return Math.round((actualAttends / possibleAttends) * 100);
  };

  const attendanceRateKids = computeAgeGroupAttendanceRate("Infantil");
  const attendanceRateCadets = computeAgeGroupAttendanceRate("Cadete");
  const attendanceRateAdults = computeAgeGroupAttendanceRate("Juvenil/Adulto");

  // Filter students for UI views
  const filteredStudents = students.filter((stu) => {
    const matchesSearch = stu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          stu.phone.includes(searchQuery) ||
                          stu.currentBelt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBelt = beltFilter === "All" || stu.currentBelt === beltFilter;
    const matchesAge = ageGroupFilter === "All" || getAgeGroup(stu.age) === ageGroupFilter;
    return matchesSearch && matchesBelt && matchesAge;
  });

  // Color mapper for Belt visualizer
  const getBeltStyles = (belt: Belt) => {
    switch (belt) {
      case Belt.Participante:
        return {
          bg: "bg-slate-100",
          text: "text-slate-800",
          border: "border-slate-300",
          accent: "bg-slate-400",
          hex: "#f1f5f9",
          borderHex: "#cbd5e1"
        };
      case Belt.Amarilla:
        return {
          bg: "bg-amber-100",
          text: "text-amber-800",
          border: "border-amber-400",
          accent: "bg-amber-400",
          hex: "#fef3c7",
          borderHex: "#fbbf24"
        };
      case Belt.Naranja:
        return {
          bg: "bg-orange-500/10",
          text: "text-orange-700",
          border: "border-orange-500",
          accent: "bg-orange-500",
          hex: "#fff7ed",
          borderHex: "#f97316"
        };
      case Belt.Verde:
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-600",
          accent: "bg-emerald-600",
          hex: "#ecfdf5",
          borderHex: "#059669"
        };
      case Belt.VerdeMorada:
        return {
          bg: "bg-gradient-to-r from-emerald-500/10 to-purple-500/10",
          text: "text-indigo-800 font-medium",
          border: "border-dashed border-purple-500/80",
          accent: "bg-indigo-600",
          hex: "#f5f3ff",
          borderHex: "#8b5cf6"
        };
      case Belt.Morada:
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          border: "border-purple-500",
          accent: "bg-purple-600",
          hex: "#f3e8ff",
          borderHex: "#a855f7"
        };
      case Belt.Marron:
        return {
          bg: "bg-amber-900/10",
          text: "text-amber-900",
          border: "border-amber-900",
          accent: "bg-amber-900",
          hex: "#78350f",
          borderHex: "#78350f"
        };
      case Belt.Negra:
        return {
          bg: "bg-slate-950 text-white",
          text: "text-yellow-400 font-bold tracking-wider",
          border: "border-yellow-500 border-2 shadow-sm",
          accent: "bg-yellow-500",
          hex: "#020617",
          borderHex: "#eab308"
        };
      default:
        return {
          bg: "bg-white",
          text: "text-slate-700",
          border: "border-slate-200",
          accent: "bg-slate-500",
          hex: "#ffffff",
          borderHex: "#e2e8f0"
        };
    }
  };

  const getAgeGroupBadgeColors = (group: AgeGroup) => {
    switch (group) {
      case "Infantil": return "bg-green-100 text-green-800 border-green-200";
      case "Cadete": return "bg-violet-100 text-violet-800 border-violet-200";
      case "Juvenil/Adulto": return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Selected class session data helper
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // Shotokan Katas options list
  const shotokanKatasList = [
    "Taikyoku Shodan",
    "Heian Shodan",
    "Heian Nidan",
    "Heian Sandan",
    "Heian Yondan",
    "Heian Godan",
    "Tekki Shodan",
    "Bassai Dai"
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <KyudaiKaiLogo size={100} />
          <div className="space-y-2 mt-4">
            <h2 className="text-white font-display font-bold text-xl tracking-wide">Kyudai Kai Dojo</h2>
            <p className="text-slate-400 text-sm">Cargando tatami virtual y sincronizando registros...</p>
          </div>
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mt-4"></div>
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden" id="auth-portal">
        {/* Background decorative Dojo circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full relative z-10 text-center"
        >
          {/* Logo container */}
          <div className="flex justify-center mb-6">
            <KyudaiKaiLogo size={80} />
          </div>

          <h1 className="text-white font-display text-2xl font-extrabold tracking-tight mb-2">
            KYUDAI KAI DOJO
          </h1>
          <p className="text-amber-500 font-mono text-xs tracking-widest uppercase mb-6">
            PROGRESO & ASISTENCIA • PORTAL PRIVADO
          </p>

          {!user ? (
            <div className="space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-left">
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Este portal es privado y está regulado por listas de control de acceso para proteger la confidencialidad de la matrícula, asistencia y bitácora de ascenso de los alumnos.
                  </p>
                </div>
              </div>

              {isInIframe && (
                <div className="bg-[#fbbf24]/5 border border-[#fbbf24]/10 rounded-xl p-3 text-left">
                  <div className="flex gap-2.5 items-start">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Ejecutando en modo integrado. Los navegadores modernos a veces restringen ventanas de acceso Google dentro de iframes. Si experimentas problemas, abre la app en una pestaña independiente.
                    </p>
                  </div>
                </div>
              )}

              {authError && (
                <div className="bg-red-950/30 p-4 rounded-xl border border-red-900/45 text-left space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-[12px] font-bold text-red-400">
                        {authError === "UNAUTHORIZED_DOMAIN" 
                          ? "Dominio No Autorizado en Firebase" 
                          : "Error de Verificación Requerida"}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {authError === "UNAUTHORIZED_DOMAIN" ? (
                          <>
                            Tu dominio de GitHub Pages <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded font-mono text-[10px]">caronte12715.github.io</code> no está autorizado en tu consola de Firebase Auth.
                          </>
                        ) : authError === "POPUP_CLOSED_OR_BLOCKED" ? (
                          "La ventana de autenticación fue cerrada o bloqueada por la política de seguridad del navegador o un bloqueador de ventanas emergentes (popup blocker)."
                        ) : (
                          `Detalle del error: ${authError}`
                        )}
                      </p>
                    </div>
                  </div>

                  {authError === "UNAUTHORIZED_DOMAIN" && (
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-[11px] text-slate-400 space-y-2 mt-2 leading-normal">
                      <p className="font-semibold text-slate-300">Solución rápida en Firebase Console (1 Minuto):</p>
                      <ol className="list-decimal list-inside space-y-1.5 pl-1">
                        <li>Abre tu consola de <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Firebase Console ↗</a>.</li>
                        <li>Entra a la sección de <strong className="text-slate-300">Authentication</strong> (Menú lateral izquierdo).</li>
                        <li>Haz clic en la pestaña de <strong className="text-slate-300">Settings</strong> (Configuración) arriba.</li>
                        <li>En la barra izquierda de opciones, selecciona <strong className="text-slate-300">Authorized domains</strong> (Dominios autorizados).</li>
                        <li>Haz clic en el botón <strong className="text-slate-300">Add domain</strong> (Añadir dominio).</li>
                        <li>Escribe exactamente: <code className="bg-slate-900 text-white px-1 py-0.5 rounded font-mono select-all font-bold">caronte12715.github.io</code></li>
                        <li>Presiona <strong className="text-slate-300">Add</strong> para guardar. ¡Y listo! Recarga esta página e intenta iniciar sesión nuevamente.</li>
                      </ol>
                    </div>
                  )}

                  {authError === "POPUP_CLOSED_OR_BLOCKED" && (
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          try {
                            window.open(window.location.href, "_blank");
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700/80 hover:text-white transition-colors duration-150 py-1.5 px-3 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-2 cursor-pointer pointer-events-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Reintentar en Pestaña Nueva
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setAuthError(null);
                    try {
                      await signInWithPopup(auth, googleProvider);
                    } catch (err: any) {
                      console.error("Error signing in:", err);
                      const errMsg = err?.message || String(err);
                      if (errMsg.includes("unauthorized-domain") || errMsg.includes("unauthorized_domain") || errMsg.includes("unauthorized domain") || err?.code === "auth/unauthorized-domain") {
                        setAuthError("UNAUTHORIZED_DOMAIN");
                      } else if (errMsg.includes("popup-closed-by-user") || errMsg.includes("cancelled-popup-request")) {
                        setAuthError("POPUP_CLOSED_OR_BLOCKED");
                      } else {
                        setAuthError(errMsg);
                      }
                    }
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 transition-colors font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 shadow-lg cursor-pointer pointer-events-auto"
                >
                  <LogIn className="w-5 h-5" />
                  Iniciar sesión con Google
                </button>

                {isInIframe && (
                  <button
                    onClick={() => {
                      try {
                        window.open(window.location.href, "_blank");
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="w-full bg-slate-805 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-800/80 cursor-pointer pointer-events-auto mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en pestaña independiente ↗
                  </button>
                )}

                <p className="text-[10px] text-slate-500">
                  Solo se permite el ingreso a correos de instructores autorizados.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-red-950/30 p-4 rounded-xl border border-red-900/50 text-left">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-red-400 mb-1">Acceso Denegado</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      El correo <strong className="text-white">{user.email}</strong> no figura en la nómina de administradores autorizados.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed text-left max-w-xs mx-auto">
                Por favor, cierra sesión e ingresa utilizando la cuenta oficial del dojo o solicita la habilitación de tu cuenta actual.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={async () => {
                    try {
                      await signOut(auth);
                    } catch (err) {
                      console.error("Error signing out:", err);
                    }
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white transition-colors font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer pointer-events-auto"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  Cerrar Sesión e Intentar de Nuevo
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-slate-800/80 mt-8 pt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-600 tracking-wider">
            <Lock className="w-3 h-3" /> CONEXIÓN SSL ENCRIPTADA
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 selection:bg-rose-500 selection:text-white" id="main-container">
      {/* Dynamic Promotion Toast Event */}
      <AnimatePresence>
        {promoSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4"
          >
            <div className="bg-slate-900 border-2 border-amber-400 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 shrink-0 animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-yellow-400 text-sm tracking-wide">¡ASCENSO HISTÓRICO!</h4>
                <p className="text-xs text-slate-200 pr-4 mt-0.5">{promoSuccessMessage}</p>
              </div>
              <button
                onClick={() => setPromoSuccessMessage(null)}
                className="ml-auto text-slate-400 hover:text-white pointer-events-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <KyudaiKaiLogo size={52} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-900 uppercase">
                    Kyudai Kai
                  </h1>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Dojo Manager
                  </span>
                </div>
                <p className="text-xs text-slate-500">Escuela de Karate • San Miguel, El Salvador</p>
              </div>
            </div>

            {/* Quick Metrics ticker */}
            <div className="flex items-center flex-wrap gap-4 text-xs">
              <div className="bg-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>
                  Alumnos: <strong className="text-slate-900">{totalCount}</strong>
                </span>
                <span className="text-emerald-600 font-semibold">• {activeStudents.length} Activos</span>
              </div>

              <div className="bg-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>
                  Clases: <strong className="text-slate-900">{sessions.length}</strong>
                </span>
              </div>

              <button
                onClick={handleResetData}
                className="bg-slate-900 hover:bg-amber-600 text-white cursor-pointer transition-colors duration-200 font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                title="Sincronizar base de datos y limpiar todos los datos"
              >
                <RotateCcw className="w-3.5 h-3.5 opacity-80" />
                <span>Limpiar Datos</span>
              </button>

              {user && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-1.5 flex items-center gap-2" id="user-profile-badge">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || "Admin"} 
                      className="w-5 h-5 rounded-full object-cover shrink-0" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  )}
                  <span className="font-semibold text-xs tracking-wide hidden sm:inline truncate max-w-[100px]">
                    {user.displayName?.split(" ")[0] || "Admin"}
                  </span>
                  <button
                    onClick={async () => {
                      if (window.confirm("¿Desea cerrar sesión en Dojo Manager?")) {
                        try {
                          await signOut(auth);
                        } catch (err) {
                          console.error("Error signing out:", err);
                        }
                      }
                    }}
                    className="text-amber-800 hover:text-red-500 cursor-pointer transition-colors ml-1"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS BAR */}
      <div className="bg-white border-b border-slate-200 sticky top-[77px] z-30 shadow-sm" id="tabs-navigation">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <nav className="flex space-x-2 overflow-x-auto">
             <button
               onClick={() => setActiveTab("dashboard")}
               className={`px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                 activeTab === "dashboard"
                   ? "border-blue-700 text-blue-700"
                   : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
               }`}
             >
               <TrendingUp className="w-4 h-4" />
               <span>Dashboard & Analíticas</span>
             </button>
 
             <button
               onClick={() => setActiveTab("roster")}
               className={`px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                 activeTab === "roster"
                   ? "border-blue-700 text-blue-700"
                   : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
               }`}
             >
               <Users className="w-4 h-4" />
               <span>Matrícula y Alumnos</span>
             </button>
 
             <button
               onClick={() => setActiveTab("register")}
               className={`px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                 activeTab === "register"
                   ? "border-blue-700 text-blue-700"
                   : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
               }`}
             >
               <UserPlus className="w-4 h-4" />
               <span>Ficha de Registro</span>
             </button>
 
             <button
               onClick={() => setActiveTab("attendance")}
               className={`px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                 activeTab === "attendance"
                   ? "border-blue-700 text-blue-700"
                   : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-200"
               }`}
             >
               <UserCheck className="w-4 h-4" />
               <span>Asistencia Diaria</span>
             </button>
 
             <button
               onClick={() => setActiveTab("progress")}
               className={`px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                 activeTab === "progress"
                   ? "border-blue-700 text-blue-700"
                   : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
               }`}
             >
               <Award className="w-4 h-4" />
               <span>Progreso y Ascensos</span>
             </button>
 
             <button
               onClick={() => setActiveTab("reports")}
               className={`px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
                 activeTab === "reports"
                   ? "border-blue-700 text-blue-700"
                   : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
               }`}
             >
               <FileText className="w-4 h-4" />
               <span>Libros y Reportes</span>
             </button>
          </nav>
        </div>
      </div>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="workspace-container">
        <AnimatePresence mode="wait">
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 p-6 md:p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-blue-900/40">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kyudai Kai Resumen de Actividad</span>
                  </div>
                  <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-white mb-1">
                    Panel de Operaciones de Kyudai Kai
                  </h2>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Monitoreo en tiempo real de progresos por cinturón, tasas de permanencia y control de asistencia segmentado por edades pedagógicas.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActiveTab("roster");
                      setIsAddModalOpen(true);
                    }}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-950/20"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Matricular Alumno</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("attendance")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-705 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    Tomar Clases Hoy
                  </button>
                </div>
              </div>

              {/* STAT CARDS BENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 border-t-4 border-t-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Matrícula General</span>
                    <Users className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-slate-900">{totalCount}</span>
                    <span className="text-sm text-slate-400">registrados</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-1 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-medium text-emerald-700">{activeStudents.length} alumnos activos actualmente</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 border-t-4 border-t-emerald-600 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Grupo Kids (Infantil)</span>
                    <span className="text-[10px] font-bold text-emerald-700 rounded bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">{"< 10 años"}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-slate-900">{countByAgeGroup["Infantil"]}</span>
                    <span className="text-xs text-slate-400 font-mono">({Math.round((countByAgeGroup["Infantil"] / totalCount) * 100)}%)</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-1">
                    <span>Sesiones adaptadas para psicomotricidad básica.</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 border-t-4 border-t-violet-600 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Grupo Cadete (Teens)</span>
                    <span className="text-[10px] font-bold text-violet-700 rounded bg-violet-50 px-1.5 py-0.5 border border-violet-200">{"10 - 14 años"}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-slate-900">{countByAgeGroup["Cadete"]}</span>
                    <span className="text-xs text-slate-400 font-mono">({Math.round((countByAgeGroup["Cadete"] / totalCount) * 100)}%)</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-1">
                    <span>Enfoque en Katas y autodisciplina.</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 border-t-4 border-t-blue-600 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Adultos y Padres</span>
                    <span className="text-[10px] font-bold text-blue-700 rounded bg-blue-50 px-1.5 py-0.5 border border-blue-200">{"15+ años"}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-slate-900">{countByAgeGroup["Juvenil/Adulto"]}</span>
                    <span className="text-xs text-slate-400 font-mono">({Math.round((countByAgeGroup["Juvenil/Adulto"] / totalCount) * 100)}%)</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-1">
                    <span>Condicionamiento y defensa práctica.</span>
                  </div>
                </div>
              </div>

              {/* CHARTS GRAPHIC ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Bar Chart Attendance by Age Group */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base">Asistencia por Grupo de Edad</h3>
                    <p className="text-xs text-slate-500">Porcentaje de asistencia en relación con clases convocadas.</p>
                  </div>

                  <div className="space-y-6 pt-4">
                    {/* Kid bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Grupo Infantil (Pequeños)</span>
                        <strong className="text-slate-900 font-mono text-sm">{attendanceRateKids}%</strong>
                      </div>
                      <div className="w-full h-8 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative flex items-center shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl transition-all duration-1000"
                          style={{ width: `${attendanceRateKids}%` }}
                        ></div>
                        <span className="absolute left-3 text-[11px] font-bold text-slate-900">
                          {attendanceRateKids >= 70 ? "🔥 Excelente Consistencia" : "Asistencia regular"}
                        </span>
                      </div>
                    </div>

                    {/* Cadete bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Grupo Cadete (Pre-Teens)</span>
                        <strong className="text-slate-900 font-mono text-sm">{attendanceRateCadets}%</strong>
                      </div>
                      <div className="w-full h-8 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative flex items-center shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-xl transition-all duration-1000"
                          style={{ width: `${attendanceRateCadets}%` }}
                        ></div>
                        <span className="absolute left-3 text-[11px] font-bold text-slate-900">
                          {attendanceRateCadets >= 80 ? "⚡ Rendimiento Deportivo Alto" : "Buen progreso"}
                        </span>
                      </div>
                    </div>

                    {/* Adult bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Grupo Juvenil y Adultos</span>
                        <strong className="text-slate-900 font-mono text-sm">{attendanceRateAdults}%</strong>
                      </div>
                      <div className="w-full h-8 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative flex items-center shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl transition-all duration-1000"
                          style={{ width: `${attendanceRateAdults}%` }}
                        ></div>
                        <span className="absolute left-3 text-[11px] font-bold text-slate-900">
                          {attendanceRateAdults >= 75 ? "🥋 Compromiso Ejemplar" : "Estable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] bg-slate-50 text-slate-500 p-3 rounded-xl border border-slate-150 italic leading-normal">
                    *Las tasas se calculan a partir de {sessions.length} clases almacenadas y {students.length} alumnos matriculados representados.
                  </div>
                </div>

                {/* 2. Belt Distribution Horizontal Bars */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base">Distribución de Cinturones actual</h3>
                    <p className="text-xs text-slate-500">Cantidad de practicantes por cada jerarquía de grado color en el Dojo.</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {Object.values(Belt).map((beltValue) => {
                      const count = beltCounts[beltValue] || 0;
                      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                      const style = getBeltStyles(beltValue);

                      return (
                        <div key={beltValue} className="flex items-center gap-3">
                          {/* Belt Label */}
                          <div className="w-36 text-xs text-right font-semibold pr-1 flex items-center justify-end gap-2 text-slate-700">
                            <span>{beltValue}</span>
                            <div className={`w-3.5 h-3.5 rounded-full border ${style.border} ${style.bg} shrink-0 shadow-xs`}></div>
                          </div>

                          {/* Horizontal Bar Graphic */}
                          <div className="flex-grow bg-slate-50 border border-slate-100 h-7 rounded-lg overflow-hidden relative flex items-center shadow-inner">
                            <div
                              className={`h-full ${style.accent} opacity-85 transition-all duration-800`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                            <span className="absolute left-3.5 font-mono text-[11px] font-extrabold text-slate-900 drop-shadow-xs">
                              {count} {count === 1 ? "alumno" : "alumnos"}
                            </span>
                          </div>

                          {/* Percentage Badge */}
                          <div className="w-10 text-right">
                            <span className="text-xs text-slate-400 font-mono font-bold">{Math.round(percentage)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RECENT HISTORIC PROMOTIONS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base">Últimos Ascensos Registrados</h3>
                    <p className="text-xs text-slate-500">Historial reciente de certificaciones realizadas por los profesores.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("progress")}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <span>Gestionar Grados</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {promotions.slice(0, 3).map((record) => {
                    const oldStyle = getBeltStyles(record.oldBelt);
                    const newStyle = getBeltStyles(record.newBelt);

                    return (
                      <div key={record.id} className="border border-slate-200/60 bg-slate-50/60 p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden transition-all hover:bg-slate-50">
                         <div className="space-y-1.5">
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] font-mono text-slate-400 font-bold">{record.date}</span>
                             <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                           </div>
                          <h4 className="font-display font-extrabold text-sm text-slate-900">{record.studentName}</h4>
                          <p className="text-xs text-slate-500 leading-normal line-clamp-2 italic pr-2">"{record.notes}"</p>
                        </div>

                        {/* Progression Arrow */}
                        <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-200/50 text-xs text-slate-600">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${oldStyle.bg} ${oldStyle.text} ${oldStyle.border}`}>
                            {record.oldBelt.replace("Cinta ", "")}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold ${newStyle.bg} ${newStyle.text} ${newStyle.border}`}>
                            {record.newBelt.replace("Cinta ", "")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ROSTER & ENROLLMENT (MATRÍCULA Y DIRECTORIO) */}
          {activeTab === "roster" && (
            <motion.div
              key="tab-roster"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* FILTERS & SEARCH ACTIONS RAIL */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-grow max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar alumno por nombre, teléfono, cinturón..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-700 focus:bg-white text-slate-850 transition-all font-medium"
                  />
                </div>

                {/* Filters Options Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Age Group select filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-100/50 transition-all">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline font-semibold">Edad:</span>
                    <select
                      value={ageGroupFilter}
                      onChange={(e) => setAgeGroupFilter(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-900 outline-hidden pointer-events-auto cursor-pointer"
                    >
                      <option value="All">Todas las Edades</option>
                      <option value="Infantil">Infantil (menos de 10 años)</option>
                      <option value="Cadete">Cadete (10-14 años)</option>
                      <option value="Juvenil/Adulto">Juvenil/Adulto (15+ años)</option>
                    </select>
                  </div>

                  {/* Belt Filter select */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-100/50 transition-all">
                    <Award className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline font-semibold">Cinturón:</span>
                    <select
                      value={beltFilter}
                      onChange={(e) => setBeltFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 outline-hidden pointer-events-auto cursor-pointer"
                    >
                      <option value="All">Todos los Cinturones</option>
                      {Object.values(Belt).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Matricular Alumno Trigger */}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-700/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-white" />
                    <span>Inscripción Nueva</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE FILTER PRESETS CHIPS */}
              {(searchQuery || beltFilter !== "All" || ageGroupFilter !== "All") && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700">Filtros activos:</span>
                  {searchQuery && (
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                      Búsqueda: {searchQuery}
                      <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-blue-500">×</button>
                    </span>
                  )}
                  {beltFilter !== "All" && (
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                      Cinturón: {beltFilter}
                      <button onClick={() => setBeltFilter("All")} className="text-slate-400 hover:text-blue-500">×</button>
                    </span>
                  )}
                  {ageGroupFilter !== "All" && (
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                      Grupo: {ageGroupFilter}
                      <button onClick={() => setAgeGroupFilter("All")} className="text-slate-400 hover:text-blue-500">×</button>
                    </span>
                  )}
                  <span className="text-slate-400 font-mono ml-auto">Encontrados: {filteredStudents.length}</span>
                </div>
              )}

              {/* STUDENTS DIRECTORY GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student) => {
                  const style = getBeltStyles(student.currentBelt);
                  const isSectActive = student.status === "active";
                  const studentAgeGroup = getAgeGroup(student.age);

                  return (
                    <div
                      key={student.id}
                      className={`bg-white rounded-2xl border ${
                        isSectActive ? "border-slate-200" : "border-slate-200/40 opacity-70"
                      } shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between`}
                    >
                      {/* Card Header details */}
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="font-display font-extrabold text-base text-slate-905 line-clamp-1 group-hover:text-blue-750 transition-colors">
                              {student.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {/* Age category tag */}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border uppercase ${getAgeGroupBadgeColors(studentAgeGroup)} shadow-2xs`}>
                                {studentAgeGroup} ({student.age} años)
                              </span>
                              {/* Active status indicator */}
                              {!isSectActive && (
                                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border border-slate-300">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Styled Belt Badge representation */}
                        <div className={`p-3.5 rounded-xl border ${style.bg} ${style.border} flex items-center justify-between shadow-2xs`}>
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Cinturón Oficial</span>
                            <span className={`font-display text-sm font-extrabold uppercase tracking-wide tracking-tight ${style.text}`}>
                              {student.currentBelt}
                            </span>
                          </div>
                          {/* Visual decorative belt strip */}
                          <div className={`w-14 h-4 rounded-md ${style.accent} border border-slate-950/25 relative shadow-inner overflow-hidden shrink-0`}>
                            {/* Belt core stitching effect */}
                            <div className="absolute inset-y-0.5 left-0 right-0 border-y border-dashed border-white/40"></div>
                          </div>
                        </div>

                        {/* Student Metrics */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Clases</span>
                            <strong className="text-slate-800 font-mono text-base block">{student.attendanceCount}</strong>
                          </div>
                          <div className="space-y-1 border-x border-slate-150">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sparring</span>
                            <strong className="text-slate-800 font-mono text-base block">{student.sparringHours}h</strong>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Katas</span>
                            <strong className="text-slate-800 font-mono text-base block">{student.katasMastered.length}</strong>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-2 pt-1 text-xs text-slate-600">
                          <p className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Contacto: <strong className="text-slate-800 font-semibold">{student.phone}</strong></span>
                          </p>
                          <p className="flex items-center gap-2">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Matrícula: <strong className="text-slate-800 font-semibold">{student.enrollmentDate}</strong></span>
                          </p>
                          {student.notes && (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                              {student.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="text-slate-700 hover:text-blue-700 transition-colors font-bold px-2 py-1 rounded inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                          <span>Ficha / Editar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="text-slate-400 hover:text-amber-600 transition-colors px-2 py-1 rounded cursor-pointer"
                          title="Dar de baja o remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <p className="text-slate-400 font-medium">No se encontraron alumnos con los filtros seleccionados.</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setBeltFilter("All");
                        setAgeGroupFilter("All");
                      }}
                      className="mt-3 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: PROGRESS & BELT EXAMINER TIMELINE (PROGRESO Y ASCENSOS) */}
          {activeTab === "progress" && (
            <motion.div
              key="tab-progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* EVALUATOR PANEL AND PROMOTION MANAGER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Selector Column & Eligibility Scorecard */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <h2 className="font-display font-extrabold text-slate-900 text-lg">Evaluador de Candidatos para Ascensos</h2>
                      <p className="text-xs text-slate-500">Seleccione un alumno para evaluar el cumplimiento de requisitos previos y autorizar su ascenso.</p>
                    </div>

                    {/* Selector Select Box */}
                    <div className="shrink-0 font-sans">
                      <select
                        value={selectedPromoStudentId}
                        onChange={(e) => setSelectedPromoStudentId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-700 pointer-events-auto cursor-pointer transition-all"
                      >
                        {activeStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.currentBelt.replace("Cinta ", "")})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const student = students.find((s) => s.id === selectedPromoStudentId);
                    if (!student) {
                      return <p className="text-slate-400 text-sm italic">Seleccione un alumno válido.</p>;
                    }

                    const next = getNextBelt(student.currentBelt);
                    const currentStyle = getBeltStyles(student.currentBelt);
                    const nextStyle = next ? getBeltStyles(next) : null;

                    // Compute promotion scores check
                    const hasMinAttends = student.attendanceCount >= 5;
                    const hasKatas = student.katasMastered.length >= (student.currentBelt === Belt.Participante ? 0 : 2);
                    const hasSparring = student.sparringHours >= (student.currentBelt === Belt.Participante ? 0 : 4);

                    return (
                      <div className="space-y-6">
                        {/* Student visual headers */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-150/80 shadow-2xs">
                          <div>
                            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider font-mono">Candidato Actual</div>
                            <h3 className="font-display font-extrabold text-base text-slate-900 mt-0.5">{student.name}</h3>
                            <span className="text-xs text-slate-500 font-medium">Edad: {student.age} años | Categoría: {getAgeGroup(student.age)}</span>
                          </div>

                          {/* Progression Flow Display */}
                          <div className="flex items-center gap-2">
                            <div className="text-center font-mono">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold">Actual</span>
                              <span className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold shadow-2xs ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}>
                                {student.currentBelt}
                              </span>
                            </div>

                            <ChevronRight className="w-5 h-5 text-blue-700 mt-3 animate-pulse" />

                            <div className="text-center font-mono">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold">Siguiente</span>
                              {next ? (
                                <span className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold shadow-2xs ${nextStyle?.bg} ${nextStyle?.text} ${nextStyle?.border}`}>
                                  {next}
                                </span>
                              ) : (
                                <span className="inline-block bg-slate-900 border-2 border-yellow-500 text-yellow-400 px-3 py-1 rounded-lg text-xs font-black shadow-2xs">
                                  Máximo Grado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* REQUIREMENTS SCORECARD */}
                        <div className="space-y-4">
                          <h4 className="font-display font-extrabold text-xs text-slate-500 uppercase tracking-widest">Fórmula Evaluativa del Dojo</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* 1. Attendances count checker */}
                            <div className="border border-slate-200 bg-white p-4 rounded-xl space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">1. Asistencia</span>
                                {hasMinAttends ? (
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" /> APTO
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" /> FALTA
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal">Exige al menos 5 clases registradas en el Dojo.</p>
                              <div className="flex items-baseline gap-1.5 pt-1">
                                <span className="font-mono text-3xl font-extrabold text-slate-900">{student.attendanceCount}</span>
                                <span className="text-xs text-slate-400 font-bold">/ 5 asistidas</span>
                              </div>
                            </div>

                            {/* 2. Sparring hours updater */}
                            <div className="border border-slate-200 bg-white p-4 rounded-xl space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">2. Sparring (Combate)</span>
                                {hasSparring ? (
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" /> APTO
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" /> FALTA
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal">Exige 4 horas de práctica para promover cintas de color.</p>
                              
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-baseline gap-1">
                                  <span className="font-mono text-3xl font-extrabold text-slate-900">{student.sparringHours}h</span>
                                  <span className="text-xs text-slate-400 font-bold">practicadas</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => adjustSparringHours(student.id, -1)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black w-6.5 h-6.5 rounded-lg flex items-center justify-center text-xs cursor-pointer transition-colors border border-slate-250"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => adjustSparringHours(student.id, 1)}
                                    className="bg-slate-900 hover:bg-red-700 text-white font-black w-6.5 h-6.5 rounded-lg flex items-center justify-center text-xs cursor-pointer transition-colors border border-slate-950"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 3. Katas list */}
                            <div className="border border-slate-200 bg-white p-4 rounded-xl space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">3. Katas Dominados</span>
                                {hasKatas ? (
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" /> APTO
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" /> FALTA
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal">Exige mínimo 2 formas de Shotokan dominadas.</p>
                              <div className="flex items-baseline gap-1.5 pt-1">
                                <span className="font-mono text-3xl font-extrabold text-slate-900">{student.katasMastered.length}</span>
                                <span className="text-xs text-slate-400 font-bold">katas aprobados</span>
                              </div>
                            </div>
                            
                          </div>
                        </div>

                        {/* SHOTOKAN TECHNICAL CHECKBOXES */}
                        <div className="space-y-3">
                          <h4 className="font-display font-semibold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-blue-700" />
                            <span>Plan de Habilidades Técnicas (Habilitar Katas)</span>
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {shotokanKatasList.map((kata) => {
                              const mastered = student.katasMastered.includes(kata);
                              return (
                                <label
                                  key={kata}
                                  onClick={() => toggleKata(student.id, kata)}
                                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-150 ${
                                    mastered
                                      ? "bg-white border-blue-700 text-blue-800 font-bold shadow-2xs"
                                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <div className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 border transition-all ${
                                    mastered ? "bg-blue-700 border-blue-700 text-white" : "bg-white border-slate-300"
                                  }`}>
                                    {mastered && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{kata}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* SUBMIT ASCENSO FORM ACTION */}
                        <div className="pt-4 border-t border-slate-150 flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-grow w-full space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 block">
                              Libro de Observaciones del Maestro (Opcional)
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. 'Muestra un equilibrio brillante tras corregir la posición de zancada en Heian Nidan.'"
                              value={evaluatorNotes}
                              onChange={(e) => setEvaluatorNotes(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-700 transition-all font-medium"
                            />
                          </div>

                          <button
                            onClick={() => handlePromoteStudent(student.id)}
                            disabled={!next}
                            className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 block shadow-sm ${
                              next
                                ? "bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/10"
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            <Award className="w-4 h-4 text-yellow-300" />
                            <span>{next ? "Otorgar Siguiente Cinturón" : "Grado Máximo Logrado"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* HISTORIC REGISTRY TIMELINE */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-base">Timeline de Evaluaciones</h3>
                    <p className="text-xs text-slate-500">Historial histórico oficial de exámenes del dojo.</p>
                  </div>

                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {promotions.map((p) => (
                      <div key={p.id} className="p-3.5 border-l-2 border-slate-200 hover:border-red-700 transition-colors bg-slate-50/50 rounded-r-xl text-xs space-y-2.5 relative border border-slate-100">
                        {/* Undo action button */}
                        <button
                          onClick={() => handleRevertPromotion(p)}
                          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-700 hover:border-red-400 rounded bg-white border border-slate-200/80 cursor-pointer transition-all"
                          title="Anular ascenso"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 block font-mono font-bold">{p.date}</span>
                          <strong className="text-slate-900 pr-4 block text-sm font-extrabold">{p.studentName}</strong>
                        </div>

                        {/* Grade transition visuals */}
                        <div className="flex items-center gap-1.5 py-1 text-[11px]">
                          <span className="text-slate-400 font-semibold font-mono">Paso de</span>
                          <span className="font-bold text-slate-700">{p.oldBelt.replace("Cinta ", "")}</span>
                          <span className="text-red-700">➔</span>
                          <span className="font-black text-red-800">{p.newBelt.replace("Cinta ", "")}</span>
                        </div>

                        {p.notes && (
                          <div className="text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-150 line-clamp-3 leading-relaxed">
                            "{p.notes}"
                          </div>
                        )}
                        
                        <div className="text-[9px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-400">Aprobado por el Tribunal Examinador</span>
                        </div>
                      </div>
                    ))}

                    {promotions.length === 0 && (
                      <p className="text-slate-400 text-xs italic text-center py-6">Ningún ascenso registrado todavía.</p>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 4: ACCURATE ATTENDANCE PROCESSOR (REGISTRO DE ASISTENCIA) */}
          {activeTab === "attendance" && (
            <motion.div
              key="tab-attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. Left hand: Select Session or Create Session */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Create Class Section Form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div>
                      <h3 className="font-display font-extrabold text-slate-950 text-base">Crear Nueva Clase</h3>
                      <p className="text-xs text-slate-500">Inicie un libro de asistencia para registrar alumnos el día de hoy.</p>
                    </div>

                    <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">Nombre de la Clase / Evento</label>
                        <input
                          type="text"
                          placeholder="Ej. 'Sparring y Kumite los Sábados'"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 block">Fecha</label>
                          <input
                            type="date"
                            value={newClassDate}
                            onChange={(e) => setNewClassDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 block">Filtrar Edad</label>
                          <select
                            value={newClassAgeGroup}
                            onChange={(e) => setNewClassAgeGroup(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-250 rounded-xl px-2 py-2 focus:bg-white pointer-events-auto cursor-pointer"
                          >
                            <option value="All">Todos (Convocatoria General)</option>
                            <option value="Infantil">Infantil (Kids)</option>
                            <option value="Cadete">Cadete (Pre-teens)</option>
                            <option value="Juvenil/Adulto">Juvenil/Adulto</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-950 hover:bg-slate-850 text-white font-semibold py-2 rounded-xl text-center self-stretch inline-flex items-center justify-center gap-1 transition-colors duration-150 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Abrir Libro de Clase</span>
                      </button>
                    </form>
                  </div>

                  {/* Sessions Lists panel */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div>
                      <h4 className="font-display font-extrabold text-slate-950 text-sm">Libros de Asistencia Disponibles</h4>
                      <p className="text-[10px] text-slate-400">Presione una clase para cargar su lista de asistencia.</p>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {sessions.map((sess) => (
                        <div
                          key={sess.id}
                          onClick={() => setSelectedSessionId(sess.id)}
                          className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-1.5 ${
                            selectedSessionId === sess.id
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div className="space-y-0.5 text-xs truncate">
                            <div className="flex items-center gap-1.5 leading-none">
                              <span className="font-mono text-[9px] text-slate-400 block">{sess.date}</span>
                              {sess.ageGroupFilter !== "All" && (
                                <span className="bg-amber-100/10 text-yellow-400 font-bold text-[8px] px-1 rounded">
                                  {sess.ageGroupFilter}
                                </span>
                              )}
                            </div>
                            <strong className="block truncate font-display font-semibold text-sm">{sess.className}</strong>
                            <span className="text-[10px] text-slate-400">
                              {sess.attendedStudentIds.length} presentes
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(sess.id);
                            }}
                            className={`p-1 rounded cursor-pointer ${
                              selectedSessionId === sess.id
                                ? "text-slate-400 hover:text-red-400 hover:bg-slate-800"
                                : "text-slate-400 hover:text-red-600 hover:bg-slate-200/80"
                            }`}
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Astro Smart Assistant Board */}
                  <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
                    {/* Atmospheric subtle radial glow background */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>

                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-display font-extrabold text-sm tracking-wide text-white">Asistente de Asistencia Astro</h4>
                        <p className="text-[10px] text-slate-400">Consejero Inteligente de Kyudai Kai</p>
                      </div>
                    </div>

                    {/* Astro Speech bubble */}
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block">{astroTitle}</span>
                      <p className="text-slate-200 leading-relaxed whitespace-pre-line">{astroMessage}</p>
                      
                      {/* Clipboard copy helper if message looks like a WhatsApp template */}
                      {astroTitle.includes("WhatsApp") && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleCopyToClipboard(astroMessage)}
                            className="bg-red-700 hover:bg-red-650 text-white font-semibold text-[10px] px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Smartphone className="w-3 h-3 text-white" />
                            <span>{copiedAstroText ? "¡Mensaje Copiado!" : "Copiar para WhatsApp"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interactive analytics actions */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Análisis de Asistencia</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <button
                          onClick={() => handleAstroQuery("asistencia-perfecta")}
                          className="bg-slate-800 hover:bg-slate-750 text-left px-2.5 py-1.5 rounded-lg border border-slate-750 hover:border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-slate-200 font-medium"
                        >
                          <Award className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                          <span className="truncate">Candidatos Constantes</span>
                        </button>
                        <button
                          onClick={() => handleAstroQuery("alertas-desercion")}
                          className="bg-slate-800 hover:bg-slate-750 text-left px-2.5 py-1.5 rounded-lg border border-slate-750 hover:border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-slate-200 font-medium"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="truncate">Alertas de Ausencias</span>
                        </button>
                        <button
                          onClick={() => handleAstroQuery("comparar-grupos")}
                          className="bg-slate-800 hover:bg-slate-750 text-left px-2.5 py-1.5 rounded-lg border border-slate-750 hover:border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-slate-200 font-medium"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">Promedio de Edades</span>
                        </button>
                        <button
                          onClick={() => handleAstroQuery("consejos-retencion")}
                          className="bg-slate-800 hover:bg-slate-750 text-left px-2.5 py-1.5 rounded-lg border border-slate-750 hover:border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-slate-200 font-medium"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">Guía de Retención</span>
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp followup selection for currently absent students */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Seguimiento de Ausencias</span>
                        <span className="bg-red-500/20 text-red-400 font-semibold text-[8px] px-1 py-0.2 rounded uppercase block">
                          Clase Activa
                        </span>
                      </div>
                      
                      {selectedSession ? (
                        (() => {
                          const absentStudents = students.filter(
                            (s) =>
                              s.status === "active" &&
                              (selectedSession.ageGroupFilter === "All" || getAgeGroup(s.age) === selectedSession.ageGroupFilter) &&
                              !selectedSession.attendedStudentIds.includes(s.id)
                          );

                          if (absentStudents.length === 0) {
                            return <p className="text-[10px] text-slate-400 italic">¡Asistencia completa hoy! Ningún practicante ausente.</p>;
                          }

                          return (
                            <div className="flex flex-col gap-2">
                              <select
                                value={astroSelectedAbsentStudentId}
                                onChange={(e) => setAstroSelectedAbsentStudentId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 pointer-events-auto cursor-pointer focus:border-red-500 outline-none"
                              >
                                <option value="">-- Seleccionar alumno ausente --</option>
                                {absentStudents.map((absent) => (
                                  <option key={absent.id} value={absent.id}>
                                    {absent.name} ({absent.age} años)
                                  </option>
                                ))}
                              </select>
                              
                              <button
                                onClick={() => {
                                  if (astroSelectedAbsentStudentId) {
                                    handleGenerateWhatsAppForStudent(astroSelectedAbsentStudentId);
                                  }
                                }}
                                disabled={!astroSelectedAbsentStudentId}
                                className={`w-full font-bold py-1.5 rounded-lg text-xs tracking-wide cursor-pointer transition-colors text-center inline-flex items-center justify-center gap-1.5 ${
                                  astroSelectedAbsentStudentId
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : "bg-slate-800 text-slate-500 pointer-events-none"
                                }`}
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>Redactar Mensaje Astro</span>
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">Por favor, selecciona una clase de hoy para habilitar el seguimiento rápido.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* 2. Right hand: TAKING LIST WITH AGE GROUP BLOCKS */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                  {selectedSession ? (
                    <>
                      {/* Active Book details headers */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <div className="inline-flex items-center gap-1 bg-red-50 text-red-700 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded">
                            Asistencia en curso
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-950 mt-1">{selectedSession.className}</h3>
                          <p className="text-xs text-slate-500">
                            Fecha de clase: {selectedSession.date} | Convocatoria:{" "}
                            <strong>{selectedSession.ageGroupFilter === "All" ? "Ficha General" : selectedSession.ageGroupFilter}</strong>
                          </p>
                        </div>

                        {/* Attendance summary percentage circle/text */}
                        <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tight">Presencia</span>
                          <span className="font-mono font-bold text-lg text-slate-900">
                            {selectedSession.attendedStudentIds.length} /{" "}
                            {
                              students.filter(
                                (s) =>
                                  s.status === "active" &&
                                  (selectedSession.ageGroupFilter === "All" ||
                                    getAgeGroup(s.age) === selectedSession.ageGroupFilter)
                              ).length
                            }
                          </span>
                        </div>
                      </div>

                      {/* SEGMENTED WORKSPACE: GROUPS MAP BY AGES */}
                      <div className="space-y-8">
                        {(["Infantil", "Cadete", "Juvenil/Adulto"] as AgeGroup[]).map((ageGrp) => {
                          // Filter out students appropriate for this specific age category block
                          const studentsInGroup = activeStudents.filter((s) => getAgeGroup(s.age) === ageGrp);
                          const isGroupConvocated = selectedSession.ageGroupFilter === "All" || selectedSession.ageGroupFilter === ageGrp;

                          if (studentsInGroup.length === 0) return null;

                          return (
                            <div
                              key={ageGrp}
                              className={`space-y-3 ${
                                isGroupConvocated ? "" : "opacity-40 select-none bg-slate-50/50 p-4 rounded-xl border border-slate-200/50"
                              }`}
                            >
                              {/* Group title card */}
                              <div className="flex items-center justify-between">
                                <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${
                                    ageGrp === "Infantil" ? "bg-green-500" : ageGrp === "Cadete" ? "bg-purple-500" : "bg-blue-500"
                                  }`}></span>
                                  <span>Grupo {ageGrp === "Infantil" ? "Infantil (Kids <10)" : ageGrp === "Cadete" ? "Cadete (Teens 10-14)" : "Juvenil/Adulto (15+)"}</span>
                                </h4>

                                <span className="text-xs text-slate-400 font-mono">
                                  {studentsInGroup.length} practicantes activos
                                </span>
                              </div>

                              {!isGroupConvocated && (
                                <div className="text-[11px] text-slate-400 italic">
                                  *Este grupo de edad no está convocado para esta clase específica.
                                </div>
                              )}

                              {/* Student row selection buttons */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {studentsInGroup.map((stu) => {
                                  const beltStyle = getBeltStyles(stu.currentBelt);
                                  const isChecked = selectedSession.attendedStudentIds.includes(stu.id);

                                  return (
                                    <button
                                      key={stu.id}
                                      disabled={!isGroupConvocated}
                                      onClick={() => toggleAttendance(selectedSession.id, stu.id)}
                                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 relative ${
                                        isChecked
                                          ? "bg-slate-100 border-slate-900 shadow-2xs"
                                          : "bg-white border-slate-200 hover:border-slate-300"
                                      }`}
                                    >
                                      {/* Student info */}
                                      <div className="space-y-1 text-xs truncate">
                                        <span className="font-semibold text-slate-900 block truncate leading-tight">
                                          {stu.name}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px]">
                                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${beltStyle.bg} ${beltStyle.text} border ${beltStyle.border}`}>
                                            {stu.currentBelt.replace("Cinta ", "")}
                                          </span>
                                          <span className="text-slate-400 font-mono">({stu.age} años)</span>
                                        </div>
                                      </div>

                                      {/* Check Indicator element */}
                                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border transition-all ${
                                        isChecked
                                          ? "bg-slate-900 border-slate-900 text-white"
                                          : "bg-white border-slate-300 text-transparent"
                                      }`}>
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                      <p className="font-medium">No hay libros de asistencia abiertos o creados.</p>
                      <p className="text-xs">Utilice el panel izquierdo para crear su primera clase.</p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 4B: NEW STUDENT REGISTRATION PAGE (FICHA DE REGISTRO) */}
          {activeTab === "register" && (
            <motion.div
              key="tab-register"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs no-print">
                <h2 className="font-display font-extrabold text-xl md:text-2xl text-slate-900">Ficha de Registro Profesional</h2>
                <p className="text-slate-500 text-xs mt-1">
                  Ingrese la información personal del practicante para su alta oficial en la base oficial de Karate. Se emitirá una credencial con código único.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start no-print">
                {/* Registration Form */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-display font-bold text-slate-950 text-sm">Formulario de Matrícula</h3>
                      <p className="text-[10px] text-slate-400">Campos obligatorios marcados con asterisco (*)</p>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddStudent(e);
                      alert("¡Matrícula guardada exitosamente y carnet emitido!");
                    }}
                    className="space-y-4 text-xs"
                  >
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Somer Betsabé Segovia Lazo"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block gap-1">Edad Actual *</label>
                        <input
                          type="number"
                          required
                          min="4"
                          max="95"
                          value={newStudentAge}
                          onChange={(e) => setNewStudentAge(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block font-sans">Cinturón Inicial *</label>
                        <select
                          value={newStudentBelt}
                          onChange={(e) => setNewStudentBelt(e.target.value as Belt)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 cursor-pointer text-xs"
                        >
                          {Object.values(Belt).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Teléfono de Contacto / Encargado</label>
                      <input
                        type="text"
                        placeholder="Ej. +503 7012-3245"
                        value={newStudentPhone}
                        onChange={(e) => setNewStudentPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Observaciones Generales o Clínicas</label>
                      <textarea
                        rows={3}
                        placeholder="Ej. Hermana de Zabdi Segovia. Alumna muy enfocada en kumite..."
                        value={newStudentNotes}
                        onChange={(e) => setNewStudentNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                      ></textarea>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full bg-slate-950 hover:bg-slate-850 text-white font-bold py-3 rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4 text-white" />
                        <span>Confirmar Matrícula y Guardar</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Previsualizador Credencial */}
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 block">Credencial Kyudai Kai Emitida</span>
                  <div className="bg-amber-50/15 p-1 rounded-2xl border border-slate-200 overflow-hidden relative shadow-lg">
                    {/* Dark gradient visual layer */}
                    <div className="absolute inset-0 bg-slate-950 pointer-events-none"></div>
                    
                    {/* Header */}
                    <div className="relative p-4 flex items-center justify-between gap-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <KyudaiKaiLogo size={36} />
                        <div>
                          <h4 className="font-display font-extrabold text-xs tracking-wider uppercase text-white leading-none">Kyudai Kai</h4>
                          <p className="text-[7px] text-amber-500 tracking-widest font-mono uppercase mt-1">Dojo Registros</p>
                        </div>
                      </div>
                      <span className="text-[7.5px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">MATRÍCULA</span>
                    </div>

                    {/* Content */}
                    <div className="relative p-4 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2">
                          <div>
                            <span className="text-[7px] text-slate-400 block uppercase font-mono">Nombre Completo</span>
                            <span className="font-display font-extrabold text-sm text-white tracking-wide block uppercase truncate max-w-[200px]">
                              {newStudentName.trim() || "(Vacío / Escriba Nombre)"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[7px] text-slate-400 block uppercase font-mono">Categoría</span>
                              <span className="font-bold text-xs text-slate-200 block truncate">
                                {newStudentAge < 10 ? "👦 Infantil" : newStudentAge <= 14 ? "👦 Cadete" : "🧑 Juv/Adulto"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[7px] text-slate-400 block uppercase font-mono">Contacto</span>
                              <span className="font-bold text-[10px] text-slate-200 block truncate">
                                {newStudentPhone.trim() || "+503 ---- ----"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Foto placeholder */}
                        <div className="w-16 h-20 rounded bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-1 font-sans shadow-inner shrink-0 relative overflow-hidden">
                          <Users className="w-7 h-7 text-slate-600 mb-1" />
                          <div className="absolute bottom-0 inset-x-0 bg-blue-700/90 text-[6.5px] text-white font-bold uppercase text-center py-0.5">
                            FOTO
                          </div>
                        </div>
                      </div>

                      {/* Belt badge bar */}
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                        <div>
                          <span className="text-[7px] text-slate-400 block uppercase font-mono font-sans ">Cinturón</span>
                          <span className="text-[10px] text-white font-bold block">{newStudentBelt}</span>
                        </div>
                        {/* Custom belt representation indicator */}
                        <div className="h-2 w-16 rounded bg-slate-900 border border-slate-700 overflow-hidden flex">
                          <div className="h-full bg-amber-500 w-1/3"></div>
                          <div className="h-full bg-blue-600 w-1/3"></div>
                          <div className="h-full bg-slate-950 w-1/3"></div>
                        </div>
                      </div>

                      {/* Codification bar */}
                      <div className="pt-2 border-t border-white/5 text-center">
                        <div className="font-mono text-center text-[10px] text-slate-500 tracking-widest leading-none select-none">
                          || | |||| | | ||| | ||| || | ||
                        </div>
                        <p className="text-[6px] text-slate-400 font-mono mt-1">ID: KYUDAI-2026-NUEVO29</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[10.5px] text-slate-500 leading-normal flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>Esta ficha de registro guarda directamente la nueva matrícula y actualiza el listado. Puede imprimir credenciales oficiales para sus alumnos directamente desde el sistema.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4C: REPORTS & CLASS LOGS EXPORT PAGE (CENTRO DE REPORTES, IMPRESIÓN Y EDICIÓN) */}
          {activeTab === "reports" && (
            <motion.div
              key="tab-reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Header Box */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div>
                  <h2 className="font-display font-extrabold text-xl md:text-2xl text-slate-900">Libro Oficial de Clases y Reportes</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Exporte datos oficiales en CSV, realice adaptaciones o ediciones de fechas de libros de firmas y prepare listados físicos de control.
                  </p>
                </div>
                
                {/* Save backup trigger */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ students, sessions, promotions }));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `KyudaiKai_DojoBackup_${new Date().toISOString().split('T')[0]}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-1.5 rounded-lg border border-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer text-center"
                    title="Exportar base completa"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Guardar Respaldos</span>
                  </button>
                  
                  <button
                    onClick={() => window.print()}
                    className="bg-blue-700 hover:bg-blue-650 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg border border-blue-700 transition inline-flex items-center gap-1.5 cursor-pointer text-center shadow-xs"
                    title="Imprimir vista seleccionada"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Todo</span>
                  </button>
                </div>
              </div>

              {/* REPORT CONTROLS (ROSTER STATS VS ATTENDANCE LISTS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* SIDEBAR: SELECTION SCREEN FOR PRINTS AND REPORTS */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 no-print">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">1. Seleccionar Reporte</span>
                  <div className="flex flex-col gap-1.5 font-sans">
                    <button
                      onClick={() => setSelectedReportSessionId("All")}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-xs flex items-center justify-between font-medium cursor-pointer ${
                        selectedReportSessionId === "All"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Roster de Matrícula General</span>
                      </div>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {sessions.map((sess) => (
                      <button
                        key={sess.id}
                        onClick={() => setSelectedReportSessionId(sess.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-xs flex items-center justify-between font-medium cursor-pointer ${
                          selectedReportSessionId === sess.id
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate max-w-[200px]">
                          <CalendarDays className="w-4 h-4 shrink-0" />
                          <span className="truncate">{sess.className} ({sess.date})</span>
                        </div>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-3.5 space-y-3 font-sans">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">2. Filtros Adicionales</span>
                    
                    {/* Only show student filters when entire Roster is selected */}
                    {selectedReportSessionId === "All" ? (
                      <div className="space-y-2 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 block">Edad Pedagógica</label>
                          <select
                            value={reportAgeFilter}
                            onChange={(e) => setReportAgeFilter(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 pointer-events-auto cursor-pointer"
                          >
                            <option value="All">Todas las Edades</option>
                            <option value="Infantil">👦 Infantil (&lt; 10 años)</option>
                            <option value="Cadete">👦 Cadete (10-14 años)</option>
                            <option value="Juvenil/Adulto">🧑 Juv/Adulto (&gt;= 15 años)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 block">Cinturón / Grado</label>
                          <select
                            value={reportBeltFilter}
                            onChange={(e) => setReportBeltFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 pointer-events-auto cursor-pointer"
                          >
                            <option value="All">Todos los Cinturones</option>
                            {Object.values(Belt).map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-900 leading-normal">
                        Filtros desactivados: Se visualiza el libro de asistencia de la clase convocada seleccionada.
                      </div>
                    )}
                  </div>

                  {/* Print Action Instructions Card */}
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10.5px] text-indigo-900 leading-relaxed space-y-1 font-sans">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>¿Cómo se imprime?</span>
                    </span>
                    <p>Seleccione el reporte deseado y haga clic en <strong>Imprimir Todo</strong>. La hoja física excluirá menús, botones y barras laterales automáticamente.</p>
                  </div>
                </div>

                {/* MAIN AREA: CONTENT DISPLAY CONSECUTIVE PRINT CARD PREVIEW */}
                <div className="lg:col-span-8 space-y-6">
                  {selectedReportSessionId === "All" ? (
                    /* VIEW DE ROSTER GENERAL */
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs print-container space-y-6">
                      {/* Logo and official title in print layout */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <KyudaiKaiLogo size={42} />
                          <div>
                            <h3 className="font-display font-extrabold text-base tracking-wide text-slate-950 uppercase">Kyudai Kai</h3>
                            <p className="text-[10px] text-slate-500 font-medium">Libro Oficial de Matrícula General (Roster)</p>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 font-mono">
                          <p>Dojo: San Miguel, SV</p>
                          <p>Fecha de emisión: {new Date().toISOString().split('T')[0]}</p>
                        </div>
                      </div>

                      {/* STATS BREAKDOWN BANNER */}
                      <div className="grid grid-cols-3 gap-2 no-print text-center font-sans">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 block uppercase font-mono">Alumnos Activos</span>
                          <span className="text-sm font-bold text-slate-900">{students.filter(s => s.status === 'active').length}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 block uppercase font-mono">Tasa Asistencia Promedio</span>
                          <span className="text-sm font-bold text-slate-900">
                            {(() => {
                              const activeSessStudents = students.filter(s => s.status === 'active');
                              if (activeSessStudents.length === 0 || sessions.length === 0) return "0.0%";
                              const avg = activeSessStudents.reduce((acc, s) => acc + s.attendanceCount, 0) / activeSessStudents.length;
                              return `${((avg / sessions.length) * 100).toFixed(1)}%`;
                            })()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] text-slate-400 block uppercase font-mono">Clases Hechas</span>
                          <span className="text-sm font-bold text-slate-900">{sessions.length} clases</span>
                        </div>
                      </div>

                      {/* STUDENT TABLE */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                              <th className="py-2.5 px-2">Cod./ID</th>
                              <th className="py-2.5 px-2">Nombre Completo del Practicante</th>
                              <th className="py-2.5 px-2">Categoría</th>
                              <th className="py-2.5 px-2">Cinturón</th>
                              <th className="py-2.5 px-2 text-center">Faltas/Asistencias</th>
                              <th className="py-2.5 px-2 text-right">Porcentaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filtered = students.filter((s) => {
                                const matchAge = reportAgeFilter === "All" || getAgeGroup(s.age) === reportAgeFilter;
                                const matchBelt = reportBeltFilter === "All" || s.currentBelt === reportBeltFilter;
                                return matchAge && matchBelt;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                      Ningún alumno coincide con los filtros establecidos.
                                    </td>
                                  </tr>
                                );
                              }

                              return filtered.map((stu, index) => {
                                const pct = sessions.length > 0 ? (stu.attendanceCount / sessions.length) * 100 : 0;
                                return (
                                  <tr key={stu.id} className="border-b border-slate-100 hover:bg-slate-50/45 transition">
                                    <td className="py-2.5 px-2 font-mono text-[9px] text-slate-400">KYU-{stu.id.toUpperCase()}</td>
                                    <td className="py-2.5 px-2 font-semibold text-slate-900">{stu.name}</td>
                                    <td className="py-2.5 px-2 text-slate-600">{getAgeGroup(stu.age)}</td>
                                    <td className="py-2.5 px-2">
                                      <span className="font-medium text-slate-700">{stu.currentBelt.replace("Cinta ", "")}</span>
                                    </td>
                                    <td className="py-2.5 px-2 text-center text-slate-600 font-mono">
                                      {stu.attendanceCount} / {sessions.length}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-bold text-slate-950 font-mono">
                                      {pct.toFixed(0)}%
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Save Excel / CSV downloader block */}
                      <div className="pt-4 border-t border-slate-200 flex justify-between items-center no-print text-[10.5px]">
                        <span className="text-slate-400 italic">Alumnos cargados actualmente</span>
                        <button
                          onClick={() => {
                            // Generate CSV content
                            const headers = ["ID", "Nombre", "Edad", "Rango", "Asistencias", "Porcentaje"];
                            const rows = students.map(s => [
                              `KYU-${s.id.toUpperCase()}`,
                              `"${s.name}"`,
                              `${s.age} anos`,
                              s.currentBelt,
                              s.attendanceCount,
                              `${sessions.length > 0 ? ((s.attendanceCount / sessions.length) * 100).toFixed(0) : 0}%`
                            ]);
                            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                              + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                            const link = document.createElement("a");
                            link.setAttribute("href", encodeURI(csvContent));
                            link.setAttribute("download", `Reporte_Matricula_KyudaiKai_${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          }}
                          className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer transition font-sans"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                          <span>Descargar Hoja CSV</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW DE CLASE INDIVIDUAL SELECCIONADA CON FIRMAS */
                    (() => {
                      const selectedSess = sessions.find(s => s.id === selectedReportSessionId);
                      if (!selectedSess) return null;

                      const convocationFilter = selectedSess.ageGroupFilter;
                      const candidateStudents = students.filter(
                        (s) => s.status === "active" && (convocationFilter === "All" || getAgeGroup(s.age) === convocationFilter)
                      );

                      return (
                        <div className="bg-white border-slate-200 rounded-2xl p-6 shadow-xs print-container space-y-6">
                          
                          {/* Main info header */}
                          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                              <KyudaiKaiLogo size={42} />
                              <div>
                                <h3 className="font-display font-extrabold text-base text-slate-950 uppercase">{selectedSess.className}</h3>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Hojas de Asistencia Físicas | Fecha de Clase: <strong>{selectedSess.date}</strong>
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-400 font-mono leading-relaxed">
                              <p>Asistieron: {selectedSess.attendedStudentIds.length} / {candidateStudents.length}</p>
                              <p>Convocatoria: {convocationFilter === "All" ? "General" : convocationFilter}</p>
                            </div>
                          </div>

                          <span className="no-print text-slate-500 text-xs leading-normal block font-sans">
                            Esta plantilla de reporte muestra el listado de deportistas convocados para esta fecha. Imprímala para utilizarla como libro de asistencia y firmas físico en el tatami.
                          </span>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b-2 border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                                  <th className="py-2 px-1">Atleta</th>
                                  <th className="py-2 px-1">Cinturón</th>
                                  <th className="py-2 px-1">Categoría</th>
                                  <th className="py-2 px-1 text-center">Estado Oficial</th>
                                  <th className="py-2 px-1 text-right">Firma / Aprobación Física</th>
                                </tr>
                              </thead>
                              <tbody>
                                {candidateStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">No hay alumnos convocados para esta categoría.</td>
                                  </tr>
                                ) : (
                                  candidateStudents.map((athlete) => {
                                    const wasPresent = selectedSess.attendedStudentIds.includes(athlete.id);
                                    return (
                                      <tr key={athlete.id} className="border-b border-slate-100">
                                        <td className="py-3 px-1 font-bold text-slate-900">{athlete.name}</td>
                                        <td className="py-3 px-1 text-slate-600">{athlete.currentBelt}</td>
                                        <td className="py-3 px-1 text-[11px] text-slate-500">{getAgeGroup(athlete.age)}</td>
                                        <td className="py-3 px-1 text-center font-mono">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                                            wasPresent 
                                              ? 'bg-emerald-100 text-emerald-800' 
                                              : 'bg-amber-100 text-amber-800'
                                          }`}>
                                            {wasPresent ? "✓ PRESENTE" : "✕ AUSENTE"}
                                          </span>
                                        </td>
                                        <td className="py-3 px-1 text-right">
                                          {/* physical line for paper signing */}
                                          <span className="inline-block w-24 border-b border-slate-300 h-4"></span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Close individual layout actions */}
                          <div className="pt-4 border-t border-slate-200 flex justify-between items-center no-print">
                            <button
                              onClick={() => setSelectedReportSessionId("All")}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition font-sans"
                            >
                              Volver a Matrícula
                            </button>
                            <button
                              onClick={() => window.print()}
                              className="bg-blue-700 hover:bg-blue-650 text-white font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xs font-sans"
                            >
                              <Printer className="w-3.5 h-3.5 text-white" />
                              <span>Imprimir Lista de Firmas</span>
                            </button>
                          </div>

                        </div>
                      );
                    })()
                  )}

                  {/* EDIT SESSIONS TABLE (CLASS MANAGER MODULE) - "Save and Edit Classes" */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs no-print space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="font-display font-bold text-slate-950 text-sm">Organizador de Clases y Fechas (Editar/Borrar)</h4>
                        <p className="text-[10px] text-slate-400">Modifique la información o elimine sesiones directamente.</p>
                      </div>
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2">Clase / Evento</th>
                            <th className="py-2">Fecha Registrada</th>
                            <th className="py-2">Categoría Convocada</th>
                            <th className="py-2 text-right">Acciones de Edición</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sessions.map((sess) => {
                            const isEditing = editingSessionId === sess.id;
                            return (
                              <tr key={sess.id}>
                                <td className="py-3">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingSessionName}
                                      onChange={(e) => setEditingSessionName(e.target.value)}
                                      className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-950 w-full max-w-[200px]"
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-800">{sess.className}</span>
                                  )}
                                </td>
                                <td className="py-3">
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={editingSessionDate}
                                      onChange={(e) => setEditingSessionDate(e.target.value)}
                                      className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-950"
                                    />
                                  ) : (
                                    <span className="text-slate-500 font-mono">{sess.date}</span>
                                  )}
                                </td>
                                <td className="py-3 text-slate-600 font-mono text-[10px] uppercase">
                                  {sess.ageGroupFilter === "All" ? "General" : sess.ageGroupFilter}
                                </td>
                                <td className="py-3 text-right">
                                  {isEditing ? (
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => {
                                          handleUpdateClassSession(sess.id, editingSessionName, editingSessionDate);
                                          setEditingSessionId("");
                                          alert("¡Datos de clase guardados correctamente!");
                                        }}
                                        className="bg-emerald-600 text-white px-2.5 py-1 rounded text-[10px] font-bold hover:bg-emerald-500 cursor-pointer transition"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        onClick={() => setEditingSessionId("")}
                                        className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold hover:bg-slate-300 cursor-pointer transition"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 justify-end font-sans">
                                      <button
                                        onClick={() => {
                                          setEditingSessionId(sess.id);
                                          setEditingSessionName(sess.className);
                                          setEditingSessionDate(sess.date);
                                        }}
                                        className="text-slate-600 hover:text-slate-900 font-semibold text-[10px] flex items-center bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
                                      >
                                        <Edit className="w-3 h-3 text-slate-500 mr-1" />
                                        <span>Editar</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSession(sess.id)}
                                        className="text-red-700 hover:text-red-900 font-bold text-[10px] flex items-center bg-red-50 hover:bg-red-100 px-2 py-1 rounded cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-650 mr-1" />
                                        <span>Borrar</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER ACCENTS */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6" id="app-footer-brand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 Escuela de Karate Kyudai Kai. Todos los derechos reservados.</p>
          <p className="font-mono text-[10px]">Coded for Karate Instructors | 29 Active Seed Records Loaded</p>
        </div>
      </footer>

      {/* MODAL 1: ADD NEW MATRÍCULA (NUEVO ALUMNO) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-slate-100"
            >
              {/* Close button */}
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="font-display font-extrabold text-slate-950 text-lg">Nueva Inscripción (Matrícula)</h3>
                <p className="text-xs text-slate-500">Registre un nuevo practicante en los registros oficiales del Dojo.</p>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan de Dios Lazo"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Age */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Edad Actual</label>
                    <input
                      type="number"
                      required
                      min="4"
                      max="90"
                      value={newStudentAge}
                      onChange={(e) => setNewStudentAge(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                    />
                  </div>

                  {/* Belt Initial */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Grado (Cinturón)</label>
                    <select
                      value={newStudentBelt}
                      onChange={(e) => setNewStudentBelt(e.target.value as Belt)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 pointer-events-auto cursor-pointer"
                    >
                      {Object.values(Belt).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Teléfono / Contacto de Familiar</label>
                  <input
                    type="text"
                    placeholder="Ej. +503 7122-3849"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Notas, Alergias u Observaciones Médicas</label>
                  <textarea
                    rows={3}
                    placeholder="Escriba condiciones médicas o indicaciones de conducta..."
                    value={newStudentNotes}
                    onChange={(e) => setNewStudentNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-950 text-slate-800"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-grow bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-grow bg-slate-950 hover:bg-slate-850 text-white font-semibold py-2 rounded-xl text-center cursor-pointer"
                  >
                    Confirmar Matrícula
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT STUDENT (COMPLETA FICHA DEL ALUMNO) */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-slate-100"
            >
              {/* Close */}
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="font-display font-extrabold text-slate-950 text-lg">Actualizar Ficha de Deportista</h3>
                <p className="text-xs text-slate-500">Realice ajustes o cargue notas médicas/disciplinarias del alumno.</p>
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Age */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Edad</label>
                    <input
                      type="number"
                      required
                      value={editAge}
                      onChange={(e) => setEditAge(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                    />
                  </div>

                  {/* Belt */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Cinturón Actual</label>
                    <select
                      value={editBelt}
                      onChange={(e) => setEditBelt(e.target.value as Belt)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 pointer-events-auto cursor-pointer"
                    >
                      {Object.values(Belt).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Teléfono de Emergencia</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                    />
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Estado del Alumno</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 pointer-events-auto cursor-pointer"
                    >
                      <option value="active">Activo (Asiste a clases)</option>
                      <option value="inactive">Inactivo (Suspendido/Inactivo)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Observaciones y Resumen Técnico</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-grow bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-center cursor-pointer"
                  >
                    Salir sin Guardar
                  </button>
                  <button
                    type="submit"
                    className="flex-grow bg-slate-950 hover:bg-slate-850 text-white font-semibold py-2 rounded-xl text-center cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
