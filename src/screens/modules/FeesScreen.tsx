import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  HeroCard,
  LoadingState,
  ModalSheet,
  OptionChips,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { feesService } from "@/lib/api/services/fees.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { queryKeys } from "@/lib/queryKeys";
import { downloadSchoolFeeReportPdf } from "@/lib/utils/download";
import { formatMoney } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Incomplete", value: "incomplete" },
  { label: "Unpaid", value: "unpaid" },
];

const defaultAssignmentForm = {
  academic_year: "2026/2027",
  amount: "",
  currency: "XAF",
  notes: "",
};

export function FeesScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(defaultAssignmentForm);
  const [assignmentClassId, setAssignmentClassId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingAmountPaid, setEditingAmountPaid] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  const canManage = ["SCHOOL_ADMIN", "SUB_ADMIN", "BURSAR"].includes(user?.role ?? "");

  const summaryQuery = useQuery({
    queryKey: queryKeys.fees.summary(),
    queryFn: () => feesService.getSchoolFeeSummary(),
  });

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.fees.assignments({ limit: 200 }),
    queryFn: () => feesService.getSchoolFeeAssignments({ limit: 200 }),
  });

  const recordsQuery = useQuery({
    queryKey: queryKeys.fees.records({ limit: 400 }),
    queryFn: () => feesService.getStudentSchoolFees({ limit: 400 }),
  });

  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes(),
    queryFn: () => schoolsService.getHierarchyClasses(),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (payload: Parameters<typeof feesService.createSchoolFeeAssignment>[0]) =>
      feesService.createSchoolFeeAssignment(payload),
    onSuccess: async () => {
      setAssignmentForm(defaultAssignmentForm);
      setAssignmentClassId(null);
      setAssignmentOpen(false);
      await Promise.all([summaryQuery.refetch(), assignmentsQuery.refetch(), recordsQuery.refetch()]);
      Alert.alert("Fee assigned", "The class fee assignment has been recorded.");
    },
    onError: (error) => Alert.alert("Assignment failed", getApiErrorMessage(error)),
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, amount_paid, notes }: { id: string; amount_paid: string; notes?: string }) =>
      feesService.updateStudentSchoolFeeRecord(id, { amount_paid, notes }),
    onSuccess: async () => {
      setEditOpen(false);
      setEditingRecordId(null);
      setEditingAmountPaid("");
      setEditingNotes("");
      await Promise.all([summaryQuery.refetch(), recordsQuery.refetch(), assignmentsQuery.refetch()]);
      Alert.alert("Fee updated", "The learner fee status has been recalculated by the backend.");
    },
    onError: (error) => Alert.alert("Update failed", getApiErrorMessage(error)),
  });

  const classOptions = useMemo(
    () => [
      { label: "All classes", value: "all" },
      ...(classesQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })),
    ],
    [classesQuery.data]
  );

  const filteredRecords = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return (recordsQuery.data?.results ?? []).filter((record) => {
      const classMatch =
        selectedClassId === "all" ||
        record.class_id === selectedClassId ||
        record.fee_assignment === selectedClassId;
      const statusMatch = selectedStatus === "all" || record.status === selectedStatus;
      const searchMatch =
        !keyword ||
        `${record.student_name ?? ""} ${record.student_email ?? ""} ${record.student_matricule ?? ""} ${record.admission_number ?? ""}`
          .toLowerCase()
          .includes(keyword);
      return classMatch && statusMatch && searchMatch;
    });
  }, [deferredSearch, recordsQuery.data?.results, selectedClassId, selectedStatus]);

  const filteredTotals = useMemo(() => {
    return filteredRecords.reduce(
      (accumulator, record) => {
        const total = Number(record.total_amount || 0);
        const paid = Number(record.amount_paid || 0);
        const balance = Number(record.balance || 0);
        accumulator.students += 1;
        accumulator.expected += total;
        accumulator.collected += paid;
        accumulator.outstanding += balance;
        if (record.status === "paid") accumulator.paid += 1;
        if (record.status === "incomplete") accumulator.incomplete += 1;
        if (record.status === "unpaid") accumulator.unpaid += 1;
        return accumulator;
      },
      { students: 0, expected: 0, collected: 0, outstanding: 0, paid: 0, incomplete: 0, unpaid: 0 }
    );
  }, [filteredRecords]);

  const editingRecord = useMemo(
    () => filteredRecords.find((record) => record.id === editingRecordId) ?? null,
    [editingRecordId, filteredRecords]
  );

  async function handleCreateAssignment() {
    if (!assignmentClassId || !assignmentForm.amount.trim()) {
      Alert.alert("Missing details", "Select a class and enter the total school-fee amount.");
      return;
    }

    const payload = {
      school_class: assignmentClassId,
      academic_year: assignmentForm.academic_year,
      amount: assignmentForm.amount,
      currency: assignmentForm.currency || "XAF",
      notes: assignmentForm.notes,
    };

    if (!isOnline) {
      await enqueue(
        "CREATE_SCHOOL_FEE_ASSIGNMENT",
        payload,
        `Assign class fee to ${(classesQuery.data ?? []).find((item) => item.id === assignmentClassId)?.name ?? "selected class"}`
      );
      setAssignmentForm(defaultAssignmentForm);
      setAssignmentClassId(null);
      setAssignmentOpen(false);
      Alert.alert("Fee saved", "The class fee assignment has been recorded.");
      return;
    }

    createAssignmentMutation.mutate(payload);
  }

  async function handleUpdateRecord() {
    if (!editingRecordId || !editingAmountPaid.trim()) {
      Alert.alert("Missing amount", "Enter the amount paid by the student.");
      return;
    }

    if (!isOnline) {
      await enqueue(
        "UPDATE_STUDENT_SCHOOL_FEE_RECORD",
        { id: editingRecordId, data: { amount_paid: editingAmountPaid, notes: editingNotes } },
        `Update fee record for ${editingRecord?.student_name ?? "student"}`
      );
      setEditOpen(false);
      setEditingRecordId(null);
      setEditingAmountPaid("");
      setEditingNotes("");
      Alert.alert("Fee saved", "The learner fee update has been recorded.");
      return;
    }

    updateRecordMutation.mutate({
      id: editingRecordId,
      amount_paid: editingAmountPaid,
      notes: editingNotes,
    });
  }

  return (
    <Screen
      title="Fees Portal"
      subtitle="Class allocations, learner balances, PDF reporting, and bursar-led payment status control."
      rightAction={
        canManage ? (
          <AppButton compact label="Assign Fee" onPress={() => setAssignmentOpen(true)} />
        ) : undefined
      }
    >
      <HeroCard
        eyebrow="School Fee Ledger"
        title={user?.role === "BURSAR" ? "Bursar Control Desk" : "School Fee Registry"}
        description="No actual fee is paid inside the mobile app. The bursar records total class fees, updates learner payment amounts, and the backend calculates the status automatically."
      />

      <View style={{ gap: 12 }}>
        <StatCard
          label="Expected"
          value={formatMoney(filteredTotals.expected)}
          helper="Amount expected from the filtered learner group."
        />
        <StatCard
          label="Collected"
          value={formatMoney(filteredTotals.collected)}
          helper="Amount already recorded as paid."
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(filteredTotals.outstanding)}
          helper="Balance left to recover from the filtered group."
          tone="warning"
        />
        <StatCard
          label="Students"
          value={filteredTotals.students}
          helper={`${filteredTotals.paid} paid • ${filteredTotals.incomplete} incomplete • ${filteredTotals.unpaid} unpaid`}
        />
      </View>

      <Card>
        <SectionTitle
          title="Filters"
          subtitle="Search by student, then narrow by class and fee status."
          rightAction={
            <AppButton
              compact
              variant="ghost"
              label="Download PDF"
              onPress={async () => {
                if (!isOnline) {
                  Alert.alert("Offline", "PDF export needs a live backend connection.");
                  return;
                }
                try {
                  await downloadSchoolFeeReportPdf({
                    school_class: selectedClassId === "all" ? undefined : selectedClassId,
                    status: selectedStatus === "all" ? undefined : selectedStatus,
                  });
                } catch (error) {
                  Alert.alert(
                    "Download failed",
                    error instanceof Error ? error.message : "Could not download the PDF report."
                  );
                }
              }}
            />
          }
        />
        <Field
          label="Search Student"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, matricule, or admission number"
        />
        <OptionChips
          label="Class"
          options={classOptions}
          value={selectedClassId}
          onChange={setSelectedClassId}
        />
        <OptionChips
          label="Status"
          options={statusOptions}
          value={selectedStatus}
          onChange={setSelectedStatus}
        />
        {summaryQuery.data?.platform_fee_controls_locked ? (
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            Platform fee status is locked. Only real backend payment events can change it.
          </Text>
        ) : null}
      </Card>

      <SectionTitle
        title="Class Collection Targets"
        subtitle="Expected and collected school fees summarized per class assignment."
      />
      {assignmentsQuery.isLoading && !assignmentsQuery.data ? (
        <LoadingState label="Loading fee assignments..." />
      ) : (assignmentsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(assignmentsQuery.data?.results ?? []).map((assignment) => (
            <Card key={assignment.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {assignment.school_class_name ?? "Assigned class"}
              </Text>
              <Text style={{ color: "#667085" }}>
                {assignment.academic_year} • {formatMoney(assignment.amount, assignment.currency)}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Students: {assignment.student_count ?? 0} • Expected:{" "}
                {formatMoney(assignment.total_expected, assignment.currency)} • Collected:{" "}
                {formatMoney(assignment.total_collected, assignment.currency)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No class fee assignments yet"
          description="Assign a total school-fee amount to a class so the backend can generate student records."
        />
      )}

      <SectionTitle
        title="Learner Fee Records"
        subtitle="Search or update a student's school-fee payment progress."
      />
      {recordsQuery.isLoading && !recordsQuery.data ? (
        <LoadingState label="Loading student fee records..." />
      ) : filteredRecords.length ? (
        <View style={{ gap: 12 }}>
          {filteredRecords.map((record) => (
            <Card key={record.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {record.student_name ?? "Student"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {record.class_name || "Class pending"} • {record.admission_number || record.student_matricule}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    Total: {formatMoney(record.total_amount)} • Paid: {formatMoney(record.amount_paid)} • Left:{" "}
                    {formatMoney(record.balance)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Tag
                    label={record.status}
                    tone={
                      record.status === "paid"
                        ? "success"
                        : record.status === "incomplete"
                          ? "warning"
                          : "danger"
                    }
                  />
                  {canManage ? (
                    <AppButton
                      compact
                      label="Update"
                      variant="ghost"
                      onPress={() => {
                        setEditingRecordId(record.id);
                        setEditingAmountPaid(record.amount_paid);
                        setEditingNotes(record.notes ?? "");
                        setEditOpen(true);
                      }}
                    />
                  ) : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No learner fee records"
          description="The current filters do not match any school-fee record."
        />
      )}

      <ModalSheet visible={assignmentOpen} title="Assign Class Fee" onClose={() => setAssignmentOpen(false)}>
        <View style={{ gap: 16 }}>
          <OptionChips
            label="Class"
            options={(classesQuery.data ?? []).map((item) => ({
              label: item.name,
              value: item.id,
            }))}
            value={assignmentClassId}
            onChange={setAssignmentClassId}
          />
          <Field
            label="Academic Year"
            value={assignmentForm.academic_year}
            onChangeText={(value) =>
              setAssignmentForm((current) => ({ ...current, academic_year: value }))
            }
            placeholder="e.g. 2026/2027"
          />
          <Field
            label="Total School Fee Amount"
            value={assignmentForm.amount}
            keyboardType="numeric"
            onChangeText={(value) => setAssignmentForm((current) => ({ ...current, amount: value }))}
            placeholder="Enter total amount for the class"
          />
          <Field
            label="Currency"
            value={assignmentForm.currency}
            onChangeText={(value) =>
              setAssignmentForm((current) => ({ ...current, currency: value || "XAF" }))
            }
            placeholder="XAF"
          />
          <Field
            label="Notes"
            value={assignmentForm.notes}
            onChangeText={(value) => setAssignmentForm((current) => ({ ...current, notes: value }))}
            placeholder="Optional internal note"
            multiline
          />
          <AppButton
            label="Save Fee Assignment"
            onPress={() => void handleCreateAssignment()}
            loading={createAssignmentMutation.isPending}
          />
        </View>
      </ModalSheet>

      <ModalSheet visible={editOpen} title="Update Learner Fee" onClose={() => setEditOpen(false)}>
        <View style={{ gap: 16 }}>
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            Change only the amount paid. The backend will calculate whether the learner is paid,
            incomplete, or unpaid based on the class total.
          </Text>
          <Field
            label="Amount Paid"
            value={editingAmountPaid}
            keyboardType="numeric"
            onChangeText={setEditingAmountPaid}
            placeholder="Enter amount paid"
          />
          <Field
            label="Notes"
            value={editingNotes}
            onChangeText={setEditingNotes}
            placeholder="Optional bursar note"
            multiline
          />
          <AppButton
            label="Save Payment Status"
            onPress={() => void handleUpdateRecord()}
            loading={updateRecordMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
