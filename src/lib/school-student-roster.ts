import { Student, User } from "@/lib/api/types";

export type SchoolStudentRosterRow = {
  key: string;
  id: string;
  profileId?: string;
  user: User;
  name: string;
  avatar?: string;
  matricule: string;
  admissionNumber: string;
  studentClass: string;
  classLevel: string;
  section: string;
  guardianName: string;
  guardianPhone: string;
  admissionDate?: string;
  parentCount: number;
  isOnHonourRoll: boolean;
  hasProfile: boolean;
  profile?: Student;
};

export function buildSchoolStudentRoster(
  profiles: Student[] = [],
  studentUsers: User[] = []
): SchoolStudentRosterRow[] {
  const profileByUserId = new Map(
    profiles
      .filter((entry) => entry.user?.id)
      .map((entry) => [entry.user.id, entry] as const)
  );

  const rows: SchoolStudentRosterRow[] = profiles.map((student) => ({
    key: student.id,
    id: student.id,
    profileId: student.id,
    user: student.user,
    name: student.user?.name || "Student",
    avatar: student.user?.avatar,
    matricule: student.user?.matricule || "",
    admissionNumber: student.admission_number || "",
    studentClass: student.school_class_name || student.student_class || "Class pending",
    classLevel: student.class_level || student.school_class_name || student.student_class || "Class pending",
    section: student.section || "General",
    guardianName: student.guardian_name || "",
    guardianPhone: student.guardian_phone || "",
    admissionDate: student.admission_date,
    parentCount: student.parent_count ?? student.parent_links?.length ?? 0,
    isOnHonourRoll: Boolean(student.is_on_honour_roll),
    hasProfile: true,
    profile: student,
  }));

  for (const entry of studentUsers) {
    if (profileByUserId.has(entry.id)) {
      continue;
    }

    rows.push({
      key: `user-${entry.id}`,
      id: entry.id,
      user: entry,
      name: entry.name || "Student",
      avatar: entry.avatar,
      matricule: entry.matricule || "",
      admissionNumber: entry.matricule || "Profile pending",
      studentClass: entry.student_class || entry.class || "Profile pending",
      classLevel: entry.student_class || entry.class || "Profile pending",
      section: "Profile pending",
      guardianName: "",
      guardianPhone: "",
      admissionDate: entry.date_joined,
      parentCount: 0,
      isOnHonourRoll: false,
      hasProfile: false,
    });
  }

  return rows.sort((first, second) => first.name.localeCompare(second.name));
}

export function studentRosterMatchesClass(
  row: SchoolStudentRosterRow,
  classId?: string | null,
  className?: string | null
) {
  if (!classId && !className) {
    return true;
  }

  const normalizedClassName = (className || "").trim().toLowerCase();
  const profile = row.profile;

  return Boolean(
    (classId && (profile?.school_class_id === classId || profile?.school_class === classId)) ||
      (normalizedClassName &&
        [
          row.studentClass,
          row.classLevel,
          profile?.school_class_name,
          profile?.student_class,
        ]
          .filter(Boolean)
          .some((value) => String(value).trim().toLowerCase() === normalizedClassName))
  );
}
