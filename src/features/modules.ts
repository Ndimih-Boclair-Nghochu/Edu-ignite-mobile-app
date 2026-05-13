import {
  Bell,
  BookOpen,
  Building2,
  CreditCard,
  GraduationCap,
  Library,
  MessagesSquare,
  UserRoundCheck,
} from "lucide-react-native";
import { UserRole } from "@/lib/api/types";

export type ModuleRoute =
  | "Students"
  | "Fees"
  | "Announcements"
  | "Attendance"
  | "Library"
  | "Structure";

export type AppModule = {
  key: ModuleRoute;
  title: string;
  description: string;
  route: ModuleRoute;
  icon: typeof GraduationCap;
  roles: UserRole[];
};

export const APP_MODULES: AppModule[] = [
  {
    key: "Students",
    title: "Student Registry",
    description: "Admissions, guardians, parent links, and honour-roll tracking.",
    route: "Students",
    icon: GraduationCap,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"],
  },
  {
    key: "Fees",
    title: "Fees Portal",
    description: "Class fee allocation, student balances, and PDF fee reports.",
    route: "Fees",
    icon: CreditCard,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "BURSAR"],
  },
  {
    key: "Announcements",
    title: "Announcements",
    description: "School notices, pinned information, and role-targeted updates.",
    route: "Announcements",
    icon: Bell,
    roles: [
      "SCHOOL_ADMIN",
      "SUB_ADMIN",
      "TEACHER",
      "STUDENT",
      "PARENT",
      "BURSAR",
      "LIBRARIAN",
    ],
  },
  {
    key: "Attendance",
    title: "Attendance",
    description: "Live class attendance, daily tracking, and offline roll calls.",
    route: "Attendance",
    icon: UserRoundCheck,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "STUDENT", "PARENT"],
  },
  {
    key: "Library",
    title: "Library",
    description: "Books, stock visibility, requests, and borrower follow-up.",
    route: "Library",
    icon: Library,
    roles: [
      "SCHOOL_ADMIN",
      "SUB_ADMIN",
      "TEACHER",
      "STUDENT",
      "PARENT",
      "LIBRARIAN",
    ],
  },
  {
    key: "Structure",
    title: "School Structure",
    description: "Sub-schools, sections, staff allocation, and class hierarchy.",
    route: "Structure",
    icon: Building2,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN"],
  },
];

export function getModulesForRole(role?: UserRole | null) {
  if (!role) {
    return [];
  }

  return APP_MODULES.filter((module) => module.roles.includes(role));
}

export const MESSAGE_ICON = MessagesSquare;
export const PROFILE_ICON = BookOpen;
