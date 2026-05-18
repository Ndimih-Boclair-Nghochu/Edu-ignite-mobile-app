export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  next_cursor?: string | null;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  limit?: number;
  cursor?: string | null;
  search?: string;
  ordering?: string;
  school_id?: string;
  status?: string;
  [key: string]: unknown;
}

export type PaginationParams = ListParams;

export type UserRole =
  | "SUPER_ADMIN"
  | "CEO"
  | "CTO"
  | "COO"
  | "INV"
  | "DESIGNER"
  | "SCHOOL_ADMIN"
  | "SUB_ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "BURSAR"
  | "LIBRARIAN";

export interface SchoolSettings {
  school: string;
  academic_year: string;
  term: string;
  max_students: number;
  max_teachers: number;
  allow_ai_features: boolean;
  ai_request_limit: number;
  licence_expiry?: string;
  sections?: string[];
  class_levels?: string[];
  departments?: string[];
  streams?: string[];
}

export interface School {
  id: string;
  name: string;
  short_name?: string;
  shortName?: string;
  principal: string;
  motto: string;
  logo?: string;
  banner?: string;
  description: string;
  location: string;
  region: string;
  division: string;
  sub_division?: string;
  subDivision?: string;
  city_village?: string;
  cityVillage?: string;
  address: string;
  postal_code?: string;
  postalCode?: string;
  phone: string;
  email: string;
  status: "Active" | "Suspended" | "Pending" | string;
  student_count?: number;
  studentCount?: number;
  teacher_count?: number;
  teacherCount?: number;
  settings?: SchoolSettings;
}

export interface HierarchySubSchool {
  id: string;
  school: string;
  name: string;
  vice_principal?: string | null;
  vice_principal_name?: string;
  vice_principal_avatar?: string;
  total_classes: number;
  total_staff: number;
  total_subjects: number;
}

export interface HierarchySubAdmin {
  id: string;
  staff: string;
  name: string;
  matricule: string;
  profile_image?: string;
  sub_school?: string | null;
  assigned_sub_school_name?: string | null;
}

export interface HierarchyClass {
  id: string;
  school: string;
  name: string;
  sub_school?: string | null;
  sub_school_name?: string;
  class_master?: string | null;
  class_master_name?: string;
  total_subjects: number;
  total_teachers: number;
  total_students: number;
}

export interface HierarchyClassSubject {
  id: string;
  school_class: string;
  class_name?: string;
  sub_school?: { id: string; name: string } | null;
  subject?: string | null;
  subject_name?: string;
  subject_code?: string;
  coefficient?: number | string;
  teacher?: string | null;
  teacher_name?: string;
  type: "mandatory" | "optional";
}

export interface HierarchyClassExplore extends HierarchyClass {
  teachers: Array<{
    id: string;
    name: string;
    matricule: string;
    profile_image?: string;
    role: UserRole;
  }>;
  students: Array<{
    id: string;
    name: string;
    matricule: string;
    admission_number: string;
  }>;
  subjects: Array<{
    id: string;
    subject_id: string;
    subject_name: string;
    teacher_id?: string | null;
    teacher_name?: string | null;
    type: "mandatory" | "optional";
  }>;
}

export interface User {
  id: string;
  uid?: string;
  matricule?: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  school?: School;
  sub_school?: { id: string; name: string } | null;
  school_id?: string | null;
  schoolId?: string | null;
  avatar?: string;
  is_license_paid?: boolean;
  isLicensePaid?: boolean;
  ai_request_count?: number;
  aiRequestCount?: number;
  annual_avg?: number;
  annualAvg?: number;
  student_class?: string;
  class?: string;
  is_active?: boolean;
  date_joined?: string;
  is_platform_executive?: boolean;
  isPlatformExecutive?: boolean;
  is_school_admin?: boolean;
  isSchoolAdmin?: boolean;
}

export type FounderAccessLevel = "READ_ONLY" | "FULL";

export interface FounderShareAdjustment {
  id: string;
  percentage: string;
  note?: string;
  /** ISO 8601 datetime when this share allocation expires and is auto-removed */
  expires_at: string | null;
  /** True if the expiry date has already passed */
  is_expired: boolean;
  /** True if the time frame has NOT yet passed — share is locked/uneditable */
  is_locked: boolean;
  /** Days remaining until expiry (0 means expired today, null means no expiry) */
  days_until_expiry: number | null;
  created_at: string;
  added_by_name?: string;
}

export interface FounderProfile {
  id: string;
  user_id: string;
  matricule: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  avatar?: string;
  founder_title: string;
  primary_share_percentage: string;
  additional_share_percentage: string;
  total_share_percentage: string;
  is_primary_founder: boolean;
  can_be_removed: boolean;
  is_active: boolean;
  /** Whether this founder's board participation must be periodically renewed */
  has_renewable_shares: boolean;
  /** Number of days per renewal period */
  share_renewal_period_days: number;
  /** ISO 8601 datetime when the founder's renewable shares expire */
  shares_expire_at: string | null;
  /** True when renewable shares have passed their expiry date */
  is_share_expired: boolean;
  /** Days remaining until the founder's shares expire (null = not renewable) */
  days_until_share_expiry: number | null;
  /** READ_ONLY: can only view; FULL: can perform operations (default) */
  access_level: FounderAccessLevel;
  share_adjustments: FounderShareAdjustment[];
  created_at: string;
  updated_at: string;
}

export interface CreateFounderRequest {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  role: Extract<UserRole, "SUPER_ADMIN" | "COO" | "INV" | "DESIGNER">;
  founder_title: string;
  primary_share_percentage: string;
  /** CEO/CTO sets whether this founder's shares are renewable */
  has_renewable_shares?: boolean;
  /** Days in the renewal period (required when has_renewable_shares=true) */
  share_renewal_period_days?: number;
  /** Activity permission level granted by CEO/CTO */
  access_level?: FounderAccessLevel;
}

export type UpdateFounderRequest = Partial<CreateFounderRequest> & {
  is_active?: boolean;
  access_level?: FounderAccessLevel;
};

export interface AddFounderSharesRequest {
  percentage: string;
  note?: string;
  /** Number of days until this share allocation expires and is auto-removed */
  duration_days: number;
}

export interface LoginRequest {
  matricule: string;
  password?: string;
}

export interface LogoutRequest {
  refreshToken?: string;
  refresh?: string;
}

export interface TokenRefreshResponse {
  access: string;
  access_token?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  access_token?: string;
  refresh_token?: string;
}

export interface ActivateAccountRequest {
  matricule: string;
  new_password?: string;
  confirm_password?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface ChangePasswordRequest {
  old_password?: string;
  new_password?: string;
  confirm_password?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface UpdatePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface PlatformFees {
  [key: string]: string;
}

export interface TutorialLinkTargets {
  web: string;
  mobile: string;
}

export interface PlatformSettings {
  name: string;
  logo?: string;
  payment_deadline?: string;
  paymentDeadline?: string;
  honour_roll_threshold?: number;
  honourRollThreshold?: number;
  fees: Record<string, string>;
  tutorial_links?: Record<string, TutorialLinkTargets>;
  tutorialLinks?: Record<string, TutorialLinkTargets>;
  maintenance_mode?: boolean;
  contact_email?: string;
  contact_phone?: string;
}

export type UpdatePlatformSettingsRequest = Partial<PlatformSettings>;

export interface PublicEvent {
  id: string;
  type: "video" | "image";
  title: string;
  description: string;
  url: string;
  is_active?: boolean;
  order?: number;
}

export type CreatePublicEventRequest = Omit<PublicEvent, "id">;

export interface Student {
  id: string;
  user: User;
  school: string;
  school_class?: string | null;
  school_class_id?: string | null;
  school_class_name?: string;
  student_class: string;
  class_level: string;
  section: string;
  date_of_birth?: string;
  gender: "Male" | "Female" | string;
  guardian_name: string;
  guardian_phone: string;
  guardian_whatsapp?: string;
  guardian?: string;
  guardianPhone?: string;
  address?: string;
  admission_number: string;
  admission_date: string;
  annual_average?: number;
  is_on_honour_roll: boolean;
  parent_count?: number;
  parent_links?: ParentStudentLink[];
}

export interface ParentStudentLink {
  id: string;
  parent: string;
  parent_name: string;
  student: string;
  student_name: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
}

export interface StudentRegistrySummary {
  active_enrollment: number;
  student_profiles: number;
  student_accounts: number;
  parent_accounts: number;
  students_linked: number;
  honour_roll_count: number;
}

export interface Subject {
  id: string;
  school: string;
  name: string;
  code: string;
  level: string;
  coefficient: number;
  teacher?: string;
  teacher_name?: string;
}

export interface StudentSubjectEnrollment {
  id: string;
  student: string;
  class_subject: string;
  school_class: string;
  class_name?: string;
  subject: string;
  subject_name: string;
  subject_code?: string;
  coefficient: number | string;
  teacher?: string | null;
  teacher_name?: string;
  type: "mandatory" | "optional";
  is_active: boolean;
  can_remove: boolean;
  created?: string;
  modified?: string;
}

export interface SubjectMaterial {
  id: string;
  school: string;
  subject: string;
  title: string;
  description?: string;
  material_type: "pdf" | "video" | "image" | "document" | "link";
  external_url?: string;
  file_name?: string;
  mime_type?: string;
  file_size_bytes?: number | null;
  file_data?: string;
  source_url: string;
  size_label?: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string;
  created: string;
  modified: string;
}

export interface CreateSubjectMaterialRequest {
  subject: string;
  title: string;
  description?: string;
  material_type: "pdf" | "video" | "image" | "document" | "link";
  external_url?: string;
  upload?: File | null;
}

export interface Assignment {
  id: string;
  school: string;
  subject: string;
  subject_name?: string;
  subject_code?: string;
  teacher?: string;
  teacher_name?: string;
  school_class?: string | null;
  school_class_name?: string;
  title: string;
  instructions?: string;
  target_class: string;
  due_date: string;
  max_marks: number | string;
  submission_type: 'text' | 'file' | 'both';
  status: 'draft' | 'published' | 'cancelled';
  created?: string;
  modified?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment: string;
  assignment_title?: string;
  assignment_max_marks?: number | string;
  subject_name?: string;
  target_class?: string;
  student?: string;
  student_name?: string;
  student_admission?: string;
  content?: string;
  attachment_name?: string;
  attachment_data?: string;
  status: 'submitted' | 'graded';
  score?: number | string | null;
  feedback?: string;
  graded_by?: string | null;
  graded_by_name?: string;
  graded_at?: string | null;
  created?: string;
  modified?: string;
}

export interface CreateAssignmentRequest {
  subject: string;
  teacher?: string;
  school_class?: string | null;
  title: string;
  instructions?: string;
  target_class: string;
  due_date: string;
  max_marks: number;
  submission_type: 'text' | 'file' | 'both';
  status: 'draft' | 'published' | 'cancelled';
}

export interface CreateAssignmentSubmissionRequest {
  assignment: string;
  content?: string;
  attachment_name?: string;
  attachment_data?: string;
}

export interface GradeAssignmentSubmissionRequest {
  score: number;
  feedback?: string;
}

export type ExamMode = 'ONLINE' | 'ONSITE';
export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export interface ExamQuestion {
  id?: string;
  order: number;
  text: string;
  image_url?: string;
  options: string[];
  correct_option?: number;
  marks: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  school: string;
  subject?: string | null;
  subject_name?: string;
  sequence?: string | null;
  sequence_name?: string;
  teacher?: string | null;
  teacher_name?: string;
  school_class?: string | null;
  school_class_name?: string;
  title: string;
  exam_type: string;
  mode: ExamMode;
  target_class: string;
  instructions?: string;
  venue?: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  status: ExamStatus;
  pass_mark?: number | string;
  allow_review?: boolean;
  is_live_now?: boolean;
  total_questions?: number;
  questions?: ExamQuestion[];
  created?: string;
  modified?: string;
}

export interface CreateExamRequest {
  subject?: string | null;
  sequence?: string | null;
  teacher?: string | null;
  school_class?: string | null;
  title: string;
  exam_type: string;
  mode: ExamMode;
  target_class: string;
  instructions?: string;
  venue?: string;
  start_time: string;
  duration_minutes: number;
  status?: ExamStatus;
  pass_mark?: number;
  allow_review?: boolean;
  questions?: ExamQuestion[];
}

export interface ExamSubmission {
  id: string;
  exam: Exam;
  exam_title?: string;
  subject_name?: string;
  target_class?: string;
  student?: string;
  student_name?: string;
  student_admission?: string;
  answers?: Record<string, number>;
  score?: number | string | null;
  total_marks?: number | string | null;
  percentage?: number | string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'ABSENT';
  started_at?: string;
  submitted_at?: string | null;
  graded_at?: string | null;
  created?: string;
  modified?: string;
}

export interface CreateExamSubmissionRequest {
  exam: string;
  answers: Record<string, number>;
}

export interface Sequence {
  id: string;
  school: string;
  name: string;
  academic_year: string;
  term: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Grade {
  id: string;
  student: string;
  subject: Subject;
  sequence: Sequence;
  score: number;
  teacher: string;
  comment: string;
  created_at: string;
}

export interface ReportCard {
  student: Student;
  sequence: Sequence;
  grades: Grade[];
  average: number;
  rank: number;
  total_students: number;
}

export interface ClassResults {
  results: Array<Record<string, unknown>>;
}

export interface TermResults {
  results: Array<Record<string, unknown>>;
}

export interface AnnualResultItem {
  annual_average?: number;
  annual_avg?: number;
  is_on_honour_roll?: boolean;
}

export interface AnnualResults {
  results: AnnualResultItem[];
}

export interface AttendanceRecord {
  id: string;
  session: string;
  student: Student;
  student_name?: string;
  student_admission?: string;
  status: "Present" | "Absent" | "Late" | "Excused" | "present" | "absent" | "late" | "excused" | string;
  excuse_note?: string;
  notified_parent?: boolean;
  session_date?: string;
  session_period?: string;
  session_student_class?: string;
  session_subject_name?: string;
  session_teacher_name?: string;
}

export interface AttendanceSummary {
  student: Student;
  total_days: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface AttendanceSession {
  id: string;
  school: string;
  school_class?: string | null;
  school_class_name?: string;
  date: string;
  class_name?: string;
  student_class?: string;
  subject?: string;
  subject_name?: string;
  teacher?: string;
  teacher_name?: string;
  period?: string;
  notes?: string;
  total_present?: number;
  total_absent?: number;
  created?: string;
  modified?: string;
}

export interface AttendanceReport {
  results?: AttendanceRecord[];
  summary?: AttendanceSummary;
  [key: string]: unknown;
}

export interface BulkRecordAttendanceRequest {
  sessionId: string;
  records: Array<{
    student: string;
    status: "Present" | "Absent" | "Late" | "Excused";
    excuse_note?: string;
  }>;
}

export type CreateAttendanceSessionRequest = Partial<AttendanceSession>;

export interface RecordTeacherAttendanceRequest {
  date: string;
  status: "Present" | "Absent" | "Late";
  note?: string;
}

export interface FeeStructure {
  id: string;
  school: string;
  name: string;
  amount: string;
  currency: string;
  academic_year: string;
  due_date?: string;
  is_mandatory: boolean;
}

export interface Payment {
  id: string;
  school: string;
  payer?: User;
  payer_name?: string;
  fee_structure?: FeeStructure;
  fee_structure_detail?: FeeStructure;
  fee_name?: string;
  bursar?: User;
  bursar_name?: string;
  amount: string;
  currency: string;
  payment_method: "Cash" | "Mobile Money" | "Bank Transfer" | "Cheque" | string;
  reference_number: string;
  status: "Pending" | "Confirmed" | "Rejected" | "Refunded" | string;
  payment_date: string;
  confirmed_at?: string;
  notes?: string;
  receipt_number?: string;
  created?: string;
  modified?: string;
}

export interface Invoice {
  id: string;
  school: string;
  student: string;
  amount: string;
  due_date: string;
  paid_date?: string;
  status: "Pending" | "Paid" | "Overdue" | string;
  created_at: string;
}

export interface RevenueReport {
  total_collected?: number | string;
  total_pending?: number | string;
  total_rejected?: number | string;
  period?: string;
  by_method?: Record<string, number | string>;
  by_fee_type?: Record<string, number | string>;
  payment_count?: number;
  monthly_trend?: Array<{
    month: string;
    amount: number | string;
  }>;
}

export type Receipt = Blob;

export type CreateFeeStructureRequest = Partial<FeeStructure>;

export interface SchoolFeeAssignment {
  id: string;
  school: string;
  school_class: string;
  school_class_name?: string;
  sub_school_id?: string | null;
  sub_school_name?: string;
  academic_year: string;
  amount: string;
  currency: string;
  notes?: string;
  is_active: boolean;
  student_count?: number;
  total_expected?: number | string;
  total_collected?: number | string;
  total_outstanding?: number | string;
  paid_students?: number;
  incomplete_students?: number;
  unpaid_students?: number;
  created?: string;
  modified?: string;
}

export interface StudentSchoolFeeRecord {
  id: string;
  school: string;
  fee_assignment: string;
  student: string;
  student_name?: string;
  student_email?: string;
  student_matricule?: string;
  admission_number?: string;
  class_id?: string;
  class_name?: string;
  sub_school_name?: string;
  total_amount: string;
  amount_paid: string;
  balance: string;
  status: "paid" | "incomplete" | "unpaid" | string;
  notes?: string;
  is_active: boolean;
  last_recorded_at?: string;
  updated_by?: string | null;
  updated_by_name?: string;
  parent_count?: number;
  created?: string;
  modified?: string;
}

export interface SchoolFeeSummaryTotals {
  class_count: number;
  student_count: number;
  total_expected: number | string;
  total_collected: number | string;
  total_outstanding: number | string;
  paid_students: number;
  incomplete_students: number;
  unpaid_students: number;
  collection_rate: number | string;
}

export interface SchoolFeeClassSummary {
  id: string;
  school_class: string;
  class_name: string;
  sub_school_name?: string;
  academic_year: string;
  fee_amount: number | string;
  currency: string;
  student_count: number;
  total_expected: number | string;
  total_collected: number | string;
  total_outstanding: number | string;
  paid_students: number;
  incomplete_students: number;
  unpaid_students: number;
}

export interface SchoolFeeSummary {
  school_totals: SchoolFeeSummaryTotals;
  filtered_totals: SchoolFeeSummaryTotals;
  classes: SchoolFeeClassSummary[];
  platform_fee_controls_locked?: boolean;
}

export interface CreateSchoolFeeAssignmentRequest {
  school_class: string;
  academic_year: string;
  amount: string;
  currency?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateStudentSchoolFeeRecordRequest {
  amount_paid: string;
  notes?: string;
}

export interface CreatePaymentRequest {
  payer?: string;
  fee_structure?: string;
  amount: string;
  currency?: string;
  payment_method: "Cash" | "Mobile Money" | "Bank Transfer" | "Cheque";
  payment_date?: string;
  notes?: string;
  license_beneficiary?: string;
  mark_license_paid?: boolean;
}

export interface ConfirmPaymentRequest {
  id: string;
}

export interface RejectPaymentRequest {
  id: string;
  reason?: string;
}

export interface BookCategory {
  id: string;
  name: string;
  color: string;
}

export interface Book {
  id: string;
  school: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string | BookCategory | null;
  category_name?: string;
  publisher?: string;
  publication_year?: number | null;
  total_copies: number;
  available_copies: number;
  description?: string;
  cover_image?: string;
  digital_copy_url?: string;
  location?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BookLoan {
  id: string;
  book: Book;
  borrower: User;
  issued_date: string;
  due_date: string;
  returned_date?: string;
  status: "Active" | "Returned" | "Overdue" | "Lost" | string;
  fine_amount: string;
}

export type Loan = BookLoan;

export interface LibraryStats {
  [key: string]: unknown;
  pending_requests?: number;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  publication_year?: number | null;
  total_copies: number;
  available_copies?: number;
  description?: string;
  cover_image?: string;
  cover_file?: File | null;
  remove_cover_image?: boolean;
  digital_copy_url?: string;
  location?: string;
  is_active?: boolean;
}

export type UpdateBookRequest = Partial<CreateBookRequest>;

export interface IssueBookRequest {
  bookId: string;
  borrowerId: string;
  dueDate: string;
}

export interface ReturnBookRequest {
  loanId: string;
  notes?: string;
}

export interface BookRequest {
  id: string;
  book: string | Book;
  book_title?: string;
  requester: string | User;
  requester_name?: string;
  requester_role?: UserRole | string;
  request_type: "loan" | "soft_copy";
  status: "pending" | "approved" | "fulfilled" | "rejected" | "cancelled" | string;
  note?: string;
  review_note?: string;
  reviewed_by?: string | User | null;
  reviewer_name?: string;
  approved_at?: string | null;
  fulfilled_at?: string | null;
  loan?: string | BookLoan | null;
  digital_copy_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBookRequestTicket {
  book: string;
  request_type: "loan" | "soft_copy";
  note?: string;
}

export interface ReviewBookRequestPayload {
  review_note?: string;
  due_date?: string;
}

export interface Announcement {
  id: string;
  school?: string;
  sender?: User;
  title: string;
  content: string;
  target: string;
  target_user?: string;
  targetUid?: string;
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string;
  senderUid?: string;
  is_pinned?: boolean;
  expires_at?: string;
  view_count?: number;
  is_read?: boolean;
  created_at?: string;
  createdAt?: Date;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  target: "all" | "students" | "teachers" | "parents" | "specific_user" | string;
  target_user?: string;
  expires_at?: string;
}

export interface Testimony {
  id: string;
  user?: User;
  userId?: string;
  name?: string;
  profileImage?: string;
  school_name?: string;
  schoolName?: string;
  role_display?: string;
  role?: string;
  message: string;
  content?: string;
  author?: User;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  createdAt?: Date;
}

export interface CommunityBlog {
  id: string;
  author?: User;
  title: string;
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string;
  image?: string;
  paragraphs: string[];
  is_published?: boolean;
  slug?: string;
  view_count?: number;
  created_at?: string;
  createdAt?: Date;
}

export type Blog = CommunityBlog;

export interface BlogComment {
  id: string;
  blog: string;
  author: User;
  content: string;
  created_at: string;
}

export type CreateTestimonyRequest = Partial<Testimony>;

export interface ApproveTestimonyRequest {
  id: string;
}

export interface RejectTestimonyRequest {
  id: string;
  reason?: string;
}

export type CreateBlogRequest = Partial<CommunityBlog>;

export interface PublishBlogRequest {
  id: string;
  slug: string;
}

export interface CreateBlogCommentRequest {
  blog_id: string;
  content: string;
}

export interface Feedback {
  id: string;
  school?: string;
  sender?: User;
  subject: string;
  message: string;
  status: "New" | "In_Progress" | "Resolved" | "Closed" | string;
  priority?: "Low" | "Medium" | "High" | "Critical" | string;
  created_at?: string;
}

export interface FeedbackStats {
  [key: string]: unknown;
}

export interface CreateFeedbackRequest {
  subject: string;
  message: string;
  priority: "Low" | "Medium" | "High" | "Critical";
}

export interface ResolveFeedbackRequest {
  id: string;
  note?: string;
}

export interface RespondToFeedbackRequest {
  id: string;
  message: string;
}

export interface Order {
  id: string;
  full_name?: string;
  fullName?: string;
  occupation: string;
  school_name?: string;
  schoolName?: string;
  whatsapp_number?: string;
  whatsappNumber?: string;
  email: string;
  region: string;
  division?: string;
  subDivision?: string;
  status: "pending" | "contacted" | "processed" | "rejected" | string;
  created_at?: string;
  createdAt?: Date;
}

export type OrderStats = PlatformStats;

export interface CreateOrderRequest {
  full_name: string;
  occupation: string;
  school_name: string;
  whatsapp_number: string;
  email: string;
  region: string;
}

export interface ProcessOrderRequest {
  id: string;
}

export interface SupportContribution {
  id: string;
  user?: User;
  uid?: string;
  school?: string;
  schoolName?: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  amount: string | number;
  payment_method?: string;
  method?: string;
  phone: string;
  message: string;
  status: "New" | "Verified" | "Rejected" | string;
  created_at?: string;
  createdAt?: Date;
}

export type SupportStats = PlatformStats;
export type CreateSupportRequest = Partial<SupportContribution>;

export interface VerifySupportRequest {
  id: string;
}

export interface RejectSupportRequest {
  id: string;
  reason?: string;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  conversation_type: "direct" | "group" | "official" | "support" | string;
  name?: string;
  last_message?: string;
  last_message_at?: string;
  school_class?: string | null;
  school_class_name?: string;
  subject?: string | null;
  subject_name?: string;
  only_admins_can_send?: boolean;
  admin_participant_ids?: string[];
  is_current_user_admin?: boolean;
  unread_count?: number;
  participant_count?: number;
  recent_messages?: Message[];
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatar?: string | null;
  email?: string;
  role?: string;
}

export interface MessageSender {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface Message {
  id: string;
  conversation: string;
  sender: MessageSender;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string | null;
  text: string;
  message_type: string;
  is_official: boolean;
  is_read: boolean;
  reply_to?: string;
  reply_to_text?: string | null;
  attachment?: string | null;
  read_at?: string | null;
  created_at: string;
  is_deleted: boolean;
}

export interface GetOrCreateDirectRequest {
  userId: string;
}

export interface RelatedChatUser extends User {
  relationship_labels?: string[];
  school_name?: string;
  sub_school_name?: string | null;
}

export interface TeacherGroupSubjectOption {
  id: string;
  name: string;
  type: "mandatory" | "optional";
}

export interface TeacherGroupClassOption {
  id: string;
  name: string;
  sub_school_name?: string | null;
  student_count: number;
  subjects: TeacherGroupSubjectOption[];
}

export interface CreateTeacherGroupRequest {
  name?: string;
  school_class: string;
  subject: string;
  only_admins_can_send?: boolean;
  participant_ids?: string[];
}

export interface SendMessageRequest {
  conversation_id?: string;
  conversationId?: string;
  text: string;
  reply_to?: string;
}

export interface MarkConversationReadRequest {
  id: string;
}

export interface StaffRemark {
  id: string;
  staff?: User;
  admin?: User;
  school?: string;
  text: string;
  remark_type?: "Commendation" | "Warning" | "Observation" | "Disciplinary" | string;
  is_confidential?: boolean;
  acknowledged?: boolean;
  created_at?: string;
  staffId?: string;
  adminName?: string;
  date?: string;
}

export type CreateRemarkRequest = Partial<StaffRemark>;

export interface AcknowledgeRemarkRequest {
  id: string;
}

export interface CreateUserRequest {
  matricule?: string;
  name: string;
  email?: string;
  password?: string;
  password_confirm?: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  school?: string;
  school_id?: string;
  sub_school?: string;
  class_master_for?: string;
  teaching_assignments?: string[];
}

export type UpdateUserRequest = Partial<User>;
export type UpdateProfileRequest = Partial<User>;

export interface UpdateRoleRequest {
  role: UserRole | string;
}

export interface ToggleLicenseRequest {
  paid?: boolean;
}

export interface CreateSchoolRequest {
  name: string;
  short_name: string;
  principal: string;
  motto: string;
  description: string;
  location: string;
  region: string;
  division: string;
  sub_division: string;
  city_village: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  banner?: string;
}

export type UpdateSchoolRequest = Partial<CreateSchoolRequest>;

export interface ToggleSchoolStatusRequest {
  status?: string;
}

export type UpdateSchoolSettingsRequest = Partial<SchoolSettings>;

export interface CreateStudentRequest {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  password?: string;
  school?: string;
  school_class?: string | null;
  student_class: string;
  class_level?: string;
  section?: string;
  date_of_birth?: string;
  gender: "male" | "female" | "other";
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  admission_number?: string;
  admission_date?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  parent_whatsapp?: string;
  parent_relationship?: string;
  create_parent_account?: boolean;
}

export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export interface BulkStudentUploadRequest {
  sub_school?: string;
  school_class?: string;
  student_class: string;
  generation_count?: number;
  class_level?: string;
  section?: string;
  department?: string;
  stream?: string;
  batch_name?: string;
  admission_date?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  file?: File;
}

export interface LinkParentRequest {
  parentId?: string;
  relationship: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  parent_whatsapp?: string;
  is_primary?: boolean;
}

export interface CreateGradeRequest {
  student: string;
  subject: string;
  sequence: string;
  score: number;
  comment?: string;
}

export interface BulkCreateGradesRequest {
  grades: CreateGradeRequest[];
}

export interface AIRequest {
  id: string;
  request_type: string;
  prompt: string;
  response: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  target_role: string;
  expires_at?: string;
}

export type AIInsights = PaginatedResponse<AIInsight>;
export type StudyPlan = AIRequest;
export type GradeAnalysis = AIRequest;
export type AttendanceInsight = AIRequest;
export type ExamPrepPlan = AIRequest;
export type ParentReport = AIRequest;
export type PlatformInsight = AIRequest;

export interface GenerateInsightsRequest {
  force?: boolean;
}

export interface CreateAIRequestRequest {
  request_type: string;
  prompt: string;
}

export interface PlatformStats {
  total_schools: number;
  active_schools: number;
  total_users: number;
  users_by_role: Record<string, number>;
  total_students: number;
  total_teachers: number;
  total_parents?: number;
  new_orders: number;
  total_revenue: string;
  schools_by_status?: Array<{ status: string; count: number }>;
  schools_by_region?: Array<{ region: string; count: number }>;
  active_users?: number;
  license_paid_count?: number;
  license_unpaid_count?: number;
  founder_count?: number;
  executive_count?: number;
  total_orders?: number;
  total_student_enrollments?: number;
  total_teachers_employed?: number;
}

export type LiveClassStatus = "upcoming" | "live" | "ended" | "cancelled";
export type LiveClassPlatform = "jitsi" | "zoom" | "google_meet" | "teams";

export interface LiveClassParticipant {
  id: string;
  live_class: string;
  student: string;
  student_name: string;
  student_avatar?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  duration_attended?: number;
  created?: string;
}

export interface LiveClass {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  subject_name?: string;
  subject_display: string;
  teacher: string;
  teacher_name: string;
  teacher_avatar?: string;
  school_class?: string | null;
  target_class: string;
  meeting_url?: string;
  meeting_id?: string;
  meeting_password?: string;
  platform: LiveClassPlatform;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: LiveClassStatus;
  is_live_now: boolean;
  max_participants: number;
  enrolled_count: number;
  is_recorded: boolean;
  recording_url?: string;
  participants?: LiveClassParticipant[];
  created: string;
  modified: string;
}

export interface CreateLiveClassRequest {
  title: string;
  description?: string;
  subject?: string;
  subject_name?: string;
  school_class?: string | null;
  target_class: string;
  meeting_url?: string;
  meeting_id?: string;
  meeting_password?: string;
  platform?: LiveClassPlatform;
  start_time: string;
  duration_minutes?: number;
  max_participants?: number;
}

export interface LiveClassStats {
  total: number;
  live_now: number;
  upcoming: number;
  ended_today: number;
  cancelled: number;
}
