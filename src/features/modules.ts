import {
  Award,
  Bot,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Crown,
  FileBadge,
  FileCog,
  FileStack,
  GraduationCap,
  HeartHandshake,
  Heart,
  IdCard,
  Library,
  LucideIcon,
  MessagesSquare,
  MessageCircleWarning,
  NotebookPen,
  Quote,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  UserRoundCheck,
  Wallet,
  BarChart3,
  Globe,
} from "lucide-react-native";
import { EXECUTIVE_ROLES, RECOGNITION_ROLES, SCHOOL_ADMIN_ROLES } from "@/features/roles";
import { UserRole } from "@/lib/api/types";

export type ModuleRoute =
  | "Founders"
  | "Schools"
  | "Support"
  | "Testimonials"
  | "PlatformSettings"
  | "SchoolSettings"
  | "Insights"
  | "Rewards"
  | "Subscription"
  | "Students"
  | "Children"
  | "IDCards"
  | "Transcripts"
  | "Grades"
  | "Staff"
  | "Subjects"
  | "Fees"
  | "Announcements"
  | "Feedback"
  | "Attendance"
  | "Library"
  | "Structure"
  | "Exams"
  | "Assignments"
  | "LiveClasses"
  | "Community"
  | "AI"
  | "Schedule";

export type AppModule = {
  key: ModuleRoute;
  title: string;
  description: string;
  route: ModuleRoute;
  icon: LucideIcon;
  roles: UserRole[];
  group: "platform" | "governance" | "registry" | "academics" | "operations" | "engagement";
};

export const APP_MODULES: AppModule[] = [
  {
    key: "Founders",
    title: "Founders",
    description: "Founder registry, share positions, and executive board participation.",
    route: "Founders",
    icon: Crown,
    roles: EXECUTIVE_ROLES,
    group: "platform",
  },
  {
    key: "Schools",
    title: "Schools",
    description: "School nodes, regional spread, and institutional registration activity.",
    route: "Schools",
    icon: Globe,
    roles: ["SUPER_ADMIN", "CEO", "CTO", "COO"],
    group: "platform",
  },
  {
    key: "Support",
    title: "Support Registry",
    description: "Support ledger, contribution verification, and platform backing.",
    route: "Support",
    icon: HeartHandshake,
    roles: ["SUPER_ADMIN", "CEO", "CTO", "COO"],
    group: "platform",
  },
  {
    key: "Testimonials",
    title: "Testimonials",
    description: "Community testimonies received by the central platform board.",
    route: "Testimonials",
    icon: Quote,
    roles: ["SUPER_ADMIN", "CEO", "CTO"],
    group: "platform",
  },
  {
    key: "PlatformSettings",
    title: "Portfolio & Policy",
    description: "Platform identity, logo, fee policy, and founder-defined settings.",
    route: "PlatformSettings",
    icon: Settings2,
    roles: ["SUPER_ADMIN", "CEO", "DESIGNER", "CTO", "COO", "INV"],
    group: "platform",
  },
  {
    key: "SchoolSettings",
    title: "Manage Settings",
    description: "School identity, principal data, and institutional settings.",
    route: "SchoolSettings",
    icon: FileCog,
    roles: ["SCHOOL_ADMIN"],
    group: "governance",
  },
  {
    key: "Structure",
    title: "Hierarchy & Sections",
    description: "Sub-schools, classes, sections, and allocation hierarchy.",
    route: "Structure",
    icon: Building2,
    roles: ["SCHOOL_ADMIN"],
    group: "governance",
  },
  {
    key: "Insights",
    title: "Strategic Insights",
    description: "School-wide trends, attendance health, and revenue visibility.",
    route: "Insights",
    icon: BarChart3,
    roles: ["SCHOOL_ADMIN"],
    group: "governance",
  },
  {
    key: "Rewards",
    title: "Academic Reward",
    description: "Honour-roll and recognition records for learners and staff.",
    route: "Rewards",
    icon: Trophy,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "STUDENT", ...RECOGNITION_ROLES],
    group: "governance",
  },
  {
    key: "Feedback",
    title: "Feedback",
    description: "Executive and institutional feedback tickets and response history.",
    route: "Feedback",
    icon: MessageCircleWarning,
    roles: ["SUPER_ADMIN", "CEO", "CTO", "COO", "SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"],
    group: "engagement",
  },
  {
    key: "Subscription",
    title: "Subscription",
    description: "Role-based license status, platform dues, and payment history.",
    route: "Subscription",
    icon: Wallet,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "STUDENT", "PARENT", "BURSAR", "LIBRARIAN"],
    group: "governance",
  },
  {
    key: "Students",
    title: "Student Registry",
    description: "Admissions, guardians, parent links, and honour-roll tracking.",
    route: "Students",
    icon: GraduationCap,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"],
    group: "registry",
  },
  {
    key: "Children",
    title: "My Children",
    description: "Family-linked learners, academic standing, and parent visibility.",
    route: "Children",
    icon: Heart,
    roles: ["PARENT"],
    group: "registry",
  },
  {
    key: "IDCards",
    title: "ID Cards",
    description: "Student card visibility and institutional identity records.",
    route: "IDCards",
    icon: IdCard,
    roles: SCHOOL_ADMIN_ROLES,
    group: "registry",
  },
  {
    key: "Transcripts",
    title: "Transcripts",
    description: "Academic report access across student profiles and sequences.",
    route: "Transcripts",
    icon: FileBadge,
    roles: SCHOOL_ADMIN_ROLES,
    group: "registry",
  },
  {
    key: "Staff",
    title: "Staff",
    description: "Leadership, teachers, bursars, librarians, and staff remarks.",
    route: "Staff",
    icon: Users,
    roles: SCHOOL_ADMIN_ROLES,
    group: "registry",
  },
  {
    key: "Subjects",
    title: "Institutional Subjects",
    description: "Academic subjects, class allocations, sequences, and enrolments.",
    route: "Subjects",
    icon: NotebookPen,
    roles: ["SCHOOL_ADMIN", "SUB_ADMIN", "STUDENT", "TEACHER"],
    group: "academics",
  },
  {
    key: "Fees",
    title: "Fees Portal",
    description: "Class fee allocation, student balances, and PDF fee reports.",
    route: "Fees",
    icon: CreditCard,
    roles: ["BURSAR", "SCHOOL_ADMIN", "SUB_ADMIN"],
    group: "operations",
  },
  {
    key: "Announcements",
    title: "Announcements",
    description: "School notices, pinned information, and role-targeted updates.",
    route: "Announcements",
    icon: Bell,
    roles: ["SUPER_ADMIN", "CEO", "CTO", "COO", "INV", "DESIGNER", "SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "STUDENT", "PARENT", "BURSAR", "LIBRARIAN"],
    group: "operations",
  },
  {
    key: "Attendance",
    title: "Attendance",
    description: "Live class attendance, daily tracking, and school attendance history.",
    route: "Attendance",
    icon: UserRoundCheck,
    roles: ["TEACHER", "STUDENT", "SCHOOL_ADMIN", "SUB_ADMIN"],
    group: "operations",
  },
  {
    key: "Library",
    title: "Library",
    description: "Books, stock visibility, requests, and borrower follow-up.",
    route: "Library",
    icon: Library,
    roles: ["STUDENT", "TEACHER", "BURSAR", "LIBRARIAN", "SCHOOL_ADMIN", "SUB_ADMIN"],
    group: "operations",
  },
  {
    key: "Exams",
    title: "Exams & Schedules",
    description: "Exam sessions, submissions, and timetable visibility.",
    route: "Exams",
    icon: CalendarDays,
    roles: ["TEACHER", "STUDENT", "SCHOOL_ADMIN", "SUB_ADMIN"],
    group: "academics",
  },
  {
    key: "Assignments",
    title: "Assignments",
    description: "Assignments, submissions, and grading snapshots.",
    route: "Assignments",
    icon: ClipboardList,
    roles: ["TEACHER", "STUDENT"],
    group: "academics",
  },
  {
    key: "LiveClasses",
    title: "Live Classes",
    description: "Live sessions, upcoming classes, and meeting access points.",
    route: "LiveClasses",
    icon: MessagesSquare,
    roles: ["TEACHER", "STUDENT"],
    group: "academics",
  },
  {
    key: "Grades",
    title: "Report Card",
    description: "Recorded marks, results, report-card data, and academic standing.",
    route: "Grades",
    icon: Award,
    roles: ["TEACHER", "STUDENT", "SCHOOL_ADMIN", "SUB_ADMIN"],
    group: "academics",
  },
  {
    key: "Schedule",
    title: "Schedule",
    description: "Teaching timetable, live classes, exams, and attendance periods.",
    route: "Schedule",
    icon: ScrollText,
    roles: ["TEACHER"],
    group: "academics",
  },
  {
    key: "Community",
    title: "Community & Support",
    description: "Blogs, feedback, testimonies, and support contributions.",
    route: "Community",
    icon: BookOpen,
    roles: [...EXECUTIVE_ROLES, "SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "STUDENT", "PARENT", "BURSAR", "LIBRARIAN"],
    group: "engagement",
  },
  {
    key: "AI",
    title: "AI Assistant",
    description: "Platform insights, AI requests, and direct assistant conversations.",
    route: "AI",
    icon: Bot,
    roles: [...EXECUTIVE_ROLES, "SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "STUDENT", "PARENT", "BURSAR", "LIBRARIAN"],
    group: "engagement",
  },
];

export function getModulesForRole(role?: UserRole | null) {
  if (!role) {
    return [];
  }
  return APP_MODULES.filter((module) => module.roles.includes(role));
}

export const MESSAGE_ICON = MessagesSquare;
export const PROFILE_ICON = ShieldCheck;
export const WORKSPACE_ICON = Sparkles;
