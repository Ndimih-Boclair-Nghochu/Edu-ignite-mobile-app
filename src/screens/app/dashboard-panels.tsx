import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Card,
  EmptyState,
  LoadingState,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { EXECUTIVE_ROLES, STAFF_ROLES, isExecutiveRole } from "@/features/roles";
import { announcementsService } from "@/lib/api/services/announcements.service";
import { attendanceService } from "@/lib/api/services/attendance.service";
import { communityService } from "@/lib/api/services/community.service";
import { feesService } from "@/lib/api/services/fees.service";
import { gradesService } from "@/lib/api/services/grades.service";
import { libraryService } from "@/lib/api/services/library.service";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { staffRemarksService } from "@/lib/api/services/staff-remarks.service";
import { studentsService } from "@/lib/api/services/students.service";
import { usersService } from "@/lib/api/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatDate, formatMoney, formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";

function ValueText({ value, helper }: { value: string; helper?: string }) {
  return (
    <>
      <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{value}</Text>
      {helper ? <Text style={{ color: "#667085", lineHeight: 19 }}>{helper}</Text> : null}
    </>
  );
}

export function ExecutiveDashboardPanel() {
  const statsQuery = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: () => platformService.getPlatformStats(),
  });

  const schoolsQuery = useQuery({
    queryKey: ["platform", "schools", "featured"],
    queryFn: () => schoolsService.getSchools({ page_size: 6 }),
  });

  const announcementsQuery = useQuery({
    queryKey: ["platform", "announcements"],
    queryFn: () => announcementsService.getPlatformAnnouncements({ limit: 4 }),
  });

  const blogsQuery = useQuery({
    queryKey: ["platform", "blogs", "featured"],
    queryFn: () => communityService.getBlogs({ page_size: 3 }),
  });

  const stats = statsQuery.data;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Global Users" value={stats?.total_users ?? 0} helper="Live user base across the platform." />
        <StatCard label="Active Schools" value={stats?.active_schools ?? 0} helper={`${stats?.total_schools ?? 0} schools currently registered.`} />
        <StatCard label="Teachers" value={stats?.total_teachers ?? 0} helper={`${stats?.total_students ?? 0} students served on the network.`} />
        <StatCard label="Net Revenue" value={formatMoney(stats?.total_revenue)} helper="Platform-wide confirmed revenue." tone="success" />
      </View>

      <SectionTitle
        title="Regional School Nodes"
        subtitle="Institution nodes registered across the live platform."
      />
      {schoolsQuery.isLoading && !schoolsQuery.data ? (
        <LoadingState label="Loading school nodes..." />
      ) : (schoolsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(schoolsQuery.data?.results ?? []).map((school) => (
            <Card key={school.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={school.status || "Active"} tone={school.status === "Active" ? "success" : "warning"} />
                {school.region ? <Tag label={school.region} /> : null}
              </View>
              <ValueText
                value={school.name}
                helper={`${school.student_count ?? 0} students • ${school.teacher_count ?? 0} staff-linked users`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No schools yet" description="Registered school nodes will appear here." />
      )}

      <SectionTitle
        title="Platform Announcements"
        subtitle="Latest updates reaching executive accounts."
      />
      {announcementsQuery.isLoading && !announcementsQuery.data ? (
        <LoadingState label="Loading platform announcements..." />
      ) : (announcementsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(announcementsQuery.data?.results ?? []).map((item) => (
            <Card key={item.id}>
              <Tag label={item.target || "all"} />
              <ValueText value={item.title} helper={item.content} />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No announcements" description="Platform-wide notices will appear here." />
      )}

      <SectionTitle title="Community Pulse" subtitle="Recent stories from the public platform feed." />
      {blogsQuery.isLoading && !blogsQuery.data ? (
        <LoadingState label="Loading community stories..." />
      ) : (blogsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(blogsQuery.data?.results ?? []).map((blog) => (
            <Card key={blog.id}>
              <ValueText
                value={blog.title}
                helper={`${blog.author?.name || blog.senderName || "Community"} • ${(blog.paragraphs ?? []).slice(0, 1).join(" ").slice(0, 160) || "Open the community portal for the full story."}`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No community stories" description="Published stories will appear here." />
      )}
    </View>
  );
}

export function SchoolAdminDashboardPanel() {
  const { user } = useAuth();

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const registrySummaryQuery = useQuery({
    queryKey: queryKeys.students.summary,
    queryFn: () => studentsService.getRegistrySummary(),
    enabled: Boolean(user),
  });

  const studentsQuery = useQuery({
    queryKey: queryKeys.students.list({ page_size: 500 }),
    queryFn: () => studentsService.getStudents({ page_size: 500 }),
    enabled: Boolean(user),
  });

  const feeSummaryQuery = useQuery({
    queryKey: queryKeys.fees.summary(),
    queryFn: () => feesService.getSchoolFeeSummary(),
    enabled: Boolean(user),
  });

  const usersQuery = useQuery({
    queryKey: ["users", "school", schoolId, "staff"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: STAFF_ROLES.join(","),
        page_size: 500,
      }),
    enabled: Boolean(user && schoolId),
  });

  const studentUsersQuery = useQuery({
    queryKey: ["users", "school", schoolId, "students", "dashboard"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: "STUDENT",
        page_size: 500,
      }),
    enabled: Boolean(user && schoolId),
  });

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.records({ limit: 500 }),
    queryFn: () => attendanceService.getAttendanceRecords({ limit: 500 }),
    enabled: Boolean(user),
  });

  const announcementsQuery = useQuery({
    queryKey: queryKeys.announcements.feed({ limit: 5 }),
    queryFn: () => announcementsService.getMyAnnouncementFeed({ limit: 5 }),
    enabled: Boolean(user),
  });

  const staffCount = useMemo(
    () =>
      Math.max(
        (usersQuery.data?.results ?? []).filter((staff) => STAFF_ROLES.includes(staff.role)).length,
        usersQuery.data?.count ?? 0,
        Number(schoolQuery.data?.teacher_count || 0)
      ),
    [schoolQuery.data?.teacher_count, usersQuery.data?.count, usersQuery.data?.results]
  );

  const totalStudents = useMemo(
    () =>
      Math.max(
        Number(registrySummaryQuery.data?.active_enrollment || 0),
        Number(registrySummaryQuery.data?.student_profiles || 0),
        Number(registrySummaryQuery.data?.student_accounts || 0),
        studentsQuery.data?.count ?? 0,
        studentsQuery.data?.results?.length ?? 0,
        studentUsersQuery.data?.count ?? 0,
        studentUsersQuery.data?.results?.length ?? 0,
        Number(schoolQuery.data?.student_count || 0)
      ),
    [registrySummaryQuery.data, schoolQuery.data?.student_count, studentUsersQuery.data, studentsQuery.data]
  );

  const attendanceHealth = useMemo(() => {
    const rows = attendanceQuery.data?.results ?? [];
    if (!rows.length) {
      return 0;
    }

    const present = rows.filter((row) =>
      ["Present", "Late", "present", "late"].includes(row.status)
    ).length;

    return Math.round((present / rows.length) * 100);
  }, [attendanceQuery.data?.results]);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Active Enrollment" value={totalStudents} helper="Learners linked to this school." />
        <StatCard label="Staff Registry" value={staffCount} helper="Admins, teachers, bursars, and librarians in scope." />
        <StatCard label="Total Revenue" value={formatMoney(feeSummaryQuery.data?.school_totals?.total_collected)} helper="Recorded school-fee collections." tone="success" />
        <StatCard label="Attendance Health" value={`${attendanceHealth}%`} helper="Average attendance from recorded class activity." />
      </View>

      <SectionTitle title="Institution Snapshot" subtitle="Core school identity pulled from the shared backend." />
      <Card>
        <ValueText
          value={schoolQuery.data?.name ?? user?.school?.name ?? "School account in use"}
          helper={schoolQuery.data?.motto || "Dedicated to secure academic operations across web and mobile."}
        />
        <Text style={{ color: "#667085", lineHeight: 20 }}>
          Principal: {schoolQuery.data?.principal ?? user?.school?.principal ?? "Not recorded"}
        </Text>
      </Card>

      <SectionTitle title="Recent Announcements" subtitle="Latest notices reaching this school account." />
      {announcementsQuery.isLoading && !announcementsQuery.data ? (
        <LoadingState label="Loading school announcements..." />
      ) : (announcementsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(announcementsQuery.data?.results ?? []).map((announcement) => (
            <Card key={announcement.id}>
              <Tag label={announcement.target ?? "general"} />
              <ValueText value={announcement.title} helper={announcement.content} />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No announcements yet" description="School notices will appear here once published." />
      )}
    </View>
  );
}

export function TeacherDashboardPanel() {
  const { user } = useAuth();

  const studentsQuery = useQuery({
    queryKey: ["teacher", "students"],
    queryFn: () => studentsService.getStudents({ page_size: 400 }),
    enabled: Boolean(user),
  });

  const gradesQuery = useQuery({
    queryKey: ["teacher", "grades"],
    queryFn: () => gradesService.getGrades({ page_size: 400 }),
    enabled: Boolean(user),
  });

  const sessionsQuery = useQuery({
    queryKey: ["teacher", "attendance-sessions"],
    queryFn: () => attendanceService.getAttendanceSessions({ page_size: 200 }),
    enabled: Boolean(user),
  });

  const remarksQuery = useQuery({
    queryKey: ["teacher", "remarks"],
    queryFn: () => staffRemarksService.getMyRemarks({ page_size: 50 }),
    enabled: Boolean(user),
  });

  const recentGrade = gradesQuery.data?.results?.[0];
  const latestRemark = remarksQuery.data?.results?.[0];

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Learners" value={studentsQuery.data?.count ?? 0} helper="Students visible to this teaching account." />
        <StatCard label="Grades Entered" value={gradesQuery.data?.count ?? 0} helper="Recorded marks already in the gradebook." />
        <StatCard label="Sessions Held" value={sessionsQuery.data?.count ?? 0} helper="Attendance sessions linked to the school." />
        <StatCard label="Admin Remarks" value={remarksQuery.data?.count ?? 0} helper="Official notes in your staff dossier." />
      </View>

      <SectionTitle title="Teaching Snapshot" subtitle="Latest assessment and staff-record activity." />
      <Card>
        <ValueText
          value={recentGrade?.subject?.name || "No recorded subject yet"}
          helper={
            recentGrade
              ? `${recentGrade.score}/20 for ${recentGrade.student || "student"}`
              : "Marks will appear here once assessments are recorded."
          }
        />
      </Card>
      <Card>
        <ValueText
          value={latestRemark?.text || "No administrative remark yet"}
          helper={latestRemark ? `Recorded on ${formatDate(latestRemark.created_at || latestRemark.date)}` : "Your professional remarks dossier is currently clear."}
        />
      </Card>
    </View>
  );
}

export function StudentDashboardPanel() {
  const { user } = useAuth();

  const gradesQuery = useQuery({
    queryKey: ["student", "grades"],
    queryFn: () => gradesService.getGrades({ page_size: 200 }),
    enabled: Boolean(user),
  });

  const annualQuery = useQuery({
    queryKey: ["student", "annual-results"],
    queryFn: () => gradesService.getAnnualResults({}),
    enabled: Boolean(user),
  });

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.mine({}),
    queryFn: () => attendanceService.getMyAttendance({ page_size: 200 }),
    enabled: Boolean(user),
  });

  const loansQuery = useQuery({
    queryKey: ["student", "loans"],
    queryFn: () => libraryService.getMyLoans({ page_size: 50 }),
    enabled: Boolean(user),
  });

  const attendanceRecords = attendanceQuery.data?.results ?? [];
  const presentCount = attendanceRecords.filter((record) =>
    ["Present", "Late", "present", "late"].includes(record.status)
  ).length;
  const attendanceRate = attendanceRecords.length
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : 0;
  const annualAverage =
    Number(user?.annual_avg ?? user?.annualAvg ?? annualQuery.data?.results?.[0]?.annual_average ?? annualQuery.data?.results?.[0]?.annual_avg ?? 0).toFixed(2);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Term Average" value={`${annualAverage} / 20`} helper="Latest annual or term average available to the mobile app." />
        <StatCard label="Attendance Integrity" value={`${attendanceRate}%`} helper="Computed from your recorded attendance history." />
        <StatCard label="Results Recorded" value={gradesQuery.data?.count ?? 0} helper="Marks published by teachers so far." />
        <StatCard label="Library Loans" value={loansQuery.data?.count ?? 0} helper="Active book loans linked to this learner." />
      </View>

      <SectionTitle title="Recent Results" subtitle="Latest marks published in your dossier." />
      {(gradesQuery.data?.results ?? []).slice(0, 4).length ? (
        <View style={{ gap: 12 }}>
          {(gradesQuery.data?.results ?? []).slice(0, 4).map((grade) => (
            <Card key={grade.id}>
              <ValueText
                value={grade.subject?.name || "Subject"}
                helper={`${grade.score}/20 • ${grade.sequence?.name || "Sequence"} • ${formatDate(grade.created_at)}`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No marks yet" description="Your results will appear here once teachers publish them." />
      )}
    </View>
  );
}

export function ParentDashboardPanel() {
  const { user } = useAuth();

  const childrenQuery = useQuery({
    queryKey: queryKeys.students.children,
    queryFn: () => studentsService.getMyChildren({ page_size: 50 }),
    enabled: Boolean(user),
  });

  const gradesQuery = useQuery({
    queryKey: ["parent", "grades"],
    queryFn: () => gradesService.getGrades({ page_size: 200 }),
    enabled: Boolean(user),
  });

  const children = childrenQuery.data?.results ?? [];
  const honourRollCount = children.filter((child) => child.is_on_honour_roll).length;
  const average =
    children.length > 0
      ? (
          children.reduce((sum, child) => sum + Number(child.annual_average ?? 0), 0) /
          children.length
        ).toFixed(2)
      : "0.00";

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Children Enrolled" value={children.length} helper="Learners linked to this parent account." />
        <StatCard label="Family GPA Mean" value={`${average} / 20`} helper="Average performance across linked children." />
        <StatCard label="Honour Roll" value={honourRollCount} helper="Linked children currently above the threshold." />
        <StatCard label="Recorded Marks" value={gradesQuery.data?.count ?? 0} helper="Backend grade entries visible to this family account." />
      </View>

      <SectionTitle title="Children Registry" subtitle="Learners linked to this parent profile." />
      {children.length ? (
        <View style={{ gap: 12 }}>
          {children.map((child) => (
            <Card key={child.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={child.student_class || "Student"} />
                {child.is_on_honour_roll ? <Tag label="Honour Roll" tone="success" /> : null}
              </View>
              <ValueText
                value={child.user?.name || "Student"}
                helper={`${Number(child.annual_average ?? 0).toFixed(2)} / 20`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No linked children" description="Linked learner records will appear here once connected by the school." />
      )}
    </View>
  );
}

export function BursarDashboardPanel() {
  const { user } = useAuth();

  const feeSummaryQuery = useQuery({
    queryKey: queryKeys.fees.summary(),
    queryFn: () => feesService.getSchoolFeeSummary(),
    enabled: Boolean(user),
  });

  const recentPaymentsQuery = useQuery({
    queryKey: ["bursar", "payments"],
    queryFn: () => feesService.getPayments({ page_size: 25, ordering: "-payment_date" }),
    enabled: Boolean(user),
  });

  const summary = feeSummaryQuery.data?.filtered_totals;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Classes Covered" value={summary?.class_count ?? 0} helper="Classes with active school-fee allocation." />
        <StatCard label="Total Expected" value={formatMoney(summary?.total_expected)} helper="Expected amount from assigned classes." />
        <StatCard label="Collected" value={formatMoney(summary?.total_collected)} helper="Recorded collections already entered." tone="success" />
        <StatCard label="Outstanding" value={formatMoney(summary?.total_outstanding)} helper="Remaining balance across student fee records." />
      </View>

      <SectionTitle title="Class Fee Coverage" subtitle="Per-class school-fee totals from the live ledger." />
      {(feeSummaryQuery.data?.classes ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(feeSummaryQuery.data?.classes ?? []).slice(0, 6).map((row) => (
            <Card key={row.id}>
              <Tag label={row.sub_school_name || "Class"} />
              <ValueText
                value={row.class_name}
                helper={`${row.student_count} students • ${formatMoney(row.total_collected)} collected`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No class fee coverage yet" description="Class fee allocations will appear here once created." />
      )}

      <SectionTitle title="Recent Payments" subtitle="Latest recorded financial activity." />
      {(recentPaymentsQuery.data?.results ?? []).slice(0, 4).length ? (
        <View style={{ gap: 12 }}>
          {(recentPaymentsQuery.data?.results ?? []).slice(0, 4).map((payment) => (
            <Card key={payment.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={payment.status || "Pending"} tone={payment.status === "Confirmed" ? "success" : "warning"} />
                <Tag label={payment.payment_method || "Method"} />
              </View>
              <ValueText
                value={payment.payer_name || payment.payer?.name || "Student"}
                helper={`${formatMoney(payment.amount)} • ${payment.fee_name || payment.fee_structure_detail?.name || "Fee"}`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No payments yet" description="Recorded fee payments will appear here." />
      )}
    </View>
  );
}

export function LibrarianDashboardPanel() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: queryKeys.library.stats,
    queryFn: () => libraryService.getLibraryStats(),
    enabled: Boolean(user),
  });

  const loansQuery = useQuery({
    queryKey: ["library", "loans", "recent"],
    queryFn: () => libraryService.getLoans({ page_size: 20 }),
    enabled: Boolean(user),
  });

  const lowStockQuery = useQuery({
    queryKey: ["library", "low-stock"],
    queryFn: () => libraryService.getLowStockBooks({ page_size: 10 }),
    enabled: Boolean(user),
  });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <StatCard label="Total Volumes" value={statsQuery.data?.total_books ?? 0} helper="Books currently in the catalog." />
        <StatCard label="Available" value={statsQuery.data?.available_books ?? 0} helper="Volumes ready for borrowing." />
        <StatCard label="Active Loans" value={statsQuery.data?.active_loans ?? 0} helper="Loans currently in circulation." />
        <StatCard label="Overdue" value={statsQuery.data?.overdue_loans ?? 0} helper="Borrowed items past their return date." />
      </View>

      <SectionTitle title="Recent Loan Activity" subtitle="Latest borrowers currently visible in the library registry." />
      {(loansQuery.data?.results ?? []).slice(0, 4).length ? (
        <View style={{ gap: 12 }}>
          {(loansQuery.data?.results ?? []).slice(0, 4).map((loan) => (
            <Card key={loan.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={loan.status} tone={loan.status === "Returned" ? "success" : "warning"} />
                <Tag label={formatRole(loan.borrower?.role)} />
              </View>
              <ValueText
                value={loan.borrower?.name || "Borrower"}
                helper={`${loan.book?.title || "Book"} • due ${formatDate(loan.due_date)}`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No loan activity yet" description="Library loans will appear here once books are issued." />
      )}

      <SectionTitle title="Low Stock Alerts" subtitle="Volumes that are running low in the current school library." />
      {(lowStockQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(lowStockQuery.data?.results ?? []).slice(0, 4).map((book) => (
            <Card key={book.id}>
              <ValueText
                value={book.title}
                helper={`${book.available_copies}/${book.total_copies} copies available`}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No low stock alerts" description="Critical stock notices will appear here when needed." />
      )}
    </View>
  );
}

export function DefaultDashboardPanel() {
  const { user } = useAuth();
  return (
    <Card>
      <ValueText
        value={user?.name || "EduIgnite User"}
        helper="This account is connected and ready. Use the workspace to open the role-specific areas available from the shared backend."
      />
    </Card>
  );
}

export function RoleDashboardPanel() {
  const { user } = useAuth();
  const role = user?.role;

  if (isExecutiveRole(role)) {
    return <ExecutiveDashboardPanel />;
  }

  switch (role) {
    case "SCHOOL_ADMIN":
    case "SUB_ADMIN":
      return <SchoolAdminDashboardPanel />;
    case "TEACHER":
      return <TeacherDashboardPanel />;
    case "STUDENT":
      return <StudentDashboardPanel />;
    case "PARENT":
      return <ParentDashboardPanel />;
    case "BURSAR":
      return <BursarDashboardPanel />;
    case "LIBRARIAN":
      return <LibrarianDashboardPanel />;
    default:
      return <DefaultDashboardPanel />;
  }
}
