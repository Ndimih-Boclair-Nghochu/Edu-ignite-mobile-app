import {
  Bot,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Cpu,
  CreditCard,
  GraduationCap,
  Library,
  LucideIcon,
  MessagesSquare,
  NotebookPen,
  Users,
  UserRoundCheck,
} from "lucide-react-native";

export type ModuleRoute =
  | "Students"
  | "Staff"
  | "Subjects"
  | "Fees"
  | "Announcements"
  | "Attendance"
  | "Library"
  | "Structure"
  | "Exams"
  | "Assignments"
  | "LiveClasses"
  | "Community"
  | "AI";

export type AppModule = {
  key: ModuleRoute;
  title: string;
  description: string;
  route: ModuleRoute;
  icon: LucideIcon;
  group: "registry" | "academics" | "operations" | "insights";
};

export const APP_MODULES: AppModule[] = [
  {
    key: "Students",
    title: "Student Registry",
    description: "Admissions, guardians, parent links, and honour-roll tracking.",
    route: "Students",
    icon: GraduationCap,
    group: "registry",
  },
  {
    key: "Staff",
    title: "Staff",
    description: "Leadership, teachers, bursars, librarians, and staff remarks.",
    route: "Staff",
    icon: Users,
    group: "registry",
  },
  {
    key: "Subjects",
    title: "Institutional Subjects",
    description: "Academic subjects, class allocations, sequences, and enrolments.",
    route: "Subjects",
    icon: NotebookPen,
    group: "academics",
  },
  {
    key: "Fees",
    title: "Fees Portal",
    description: "Class fee allocation, student balances, and PDF fee reports.",
    route: "Fees",
    icon: CreditCard,
    group: "operations",
  },
  {
    key: "Announcements",
    title: "Announcements",
    description: "School notices, pinned information, and role-targeted updates.",
    route: "Announcements",
    icon: Bell,
    group: "operations",
  },
  {
    key: "Attendance",
    title: "Attendance",
    description: "Live class attendance, daily tracking, and school attendance history.",
    route: "Attendance",
    icon: UserRoundCheck,
    group: "operations",
  },
  {
    key: "Library",
    title: "Library",
    description: "Books, stock visibility, requests, and borrower follow-up.",
    route: "Library",
    icon: Library,
    group: "operations",
  },
  {
    key: "Structure",
    title: "Hierarchy & Sections",
    description: "Sub-schools, sections, staff allocation, and class hierarchy.",
    route: "Structure",
    icon: Building2,
    group: "registry",
  },
  {
    key: "Exams",
    title: "Exams & Schedules",
    description: "Exam sessions, submissions, and timetable visibility.",
    route: "Exams",
    icon: CalendarDays,
    group: "academics",
  },
  {
    key: "Assignments",
    title: "Assignments",
    description: "Assignments, submissions, and grading snapshots.",
    route: "Assignments",
    icon: ClipboardList,
    group: "academics",
  },
  {
    key: "LiveClasses",
    title: "Live Classes",
    description: "Live sessions, upcoming classes, and meeting access points.",
    route: "LiveClasses",
    icon: MessagesSquare,
    group: "academics",
  },
  {
    key: "Community",
    title: "Community & Support",
    description: "Blogs, feedback, testimonies, and support contributions.",
    route: "Community",
    icon: BookOpen,
    group: "insights",
  },
  {
    key: "AI",
    title: "AI Assistant",
    description: "Platform insights, AI requests, and direct assistant conversations.",
    route: "AI",
    icon: Bot,
    group: "insights",
  },
];

export function getModulesForRole() {
  return APP_MODULES;
}

export const MESSAGE_ICON = MessagesSquare;
export const PROFILE_ICON = BookOpen;
